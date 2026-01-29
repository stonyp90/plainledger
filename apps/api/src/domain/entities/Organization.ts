import { TenantId } from "@domain/value-objects/TenantId";
import { DomainError } from "@domain/errors/DomainError";

export interface OrganizationProps {
  id?: string;
  tenantId: TenantId;
  name: string;
  legalName?: string;
  taxNumber?: string;
  fiscalYearEndMonth: number;
  currency: string;
  industry?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateOrganizationInput {
  tenantId: string;
  name: string;
  legalName?: string;
  taxNumber?: string;
  fiscalYearEndMonth?: number;
  currency?: string;
  industry?: string;
}

export class Organization {
  private readonly _id: string;
  private readonly _tenantId: TenantId;
  private _name: string;
  private _legalName?: string;
  private _taxNumber?: string;
  private _fiscalYearEndMonth: number;
  private _currency: string;
  private _industry?: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: OrganizationProps) {
    this._id = props.id || crypto.randomUUID();
    this._tenantId = props.tenantId;
    this._name = props.name;
    this._legalName = props.legalName;
    this._taxNumber = props.taxNumber;
    this._fiscalYearEndMonth = props.fiscalYearEndMonth;
    this._currency = props.currency;
    this._industry = props.industry;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  /**
   * Factory method to create a new Organization
   * Encapsulates validation logic
   */
  static create(input: CreateOrganizationInput): Organization {
    // Validate name
    if (!input.name || input.name.trim().length < 2) {
      throw new DomainError("Organization name must be at least 2 characters");
    }

    if (input.name.length > 255) {
      throw new DomainError("Organization name must not exceed 255 characters");
    }

    // Validate fiscal year end month
    const fiscalYearEndMonth = input.fiscalYearEndMonth ?? 12;
    if (fiscalYearEndMonth < 1 || fiscalYearEndMonth > 12) {
      throw new DomainError("Fiscal year end month must be between 1 and 12");
    }

    // Validate currency
    const currency = input.currency ?? "CAD";
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new DomainError("Currency must be a valid 3-letter ISO code");
    }

    // Validate tax number format (Canadian format as default)
    if (input.taxNumber && !/^\d{9}[A-Z]{2}\d{4}$/.test(input.taxNumber)) {
      // Allow flexible format, just log warning
      console.warn(`Tax number format may not be standard: ${input.taxNumber}`);
    }

    const tenantId = TenantId.create(input.tenantId);

    return new Organization({
      tenantId,
      name: input.name.trim(),
      legalName: input.legalName?.trim(),
      taxNumber: input.taxNumber,
      fiscalYearEndMonth,
      currency,
      industry: input.industry,
    });
  }

  /**
   * Reconstitute from persistence
   */
  static fromPersistence(props: OrganizationProps): Organization {
    return new Organization(props);
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get tenantId(): TenantId {
    return this._tenantId;
  }

  get name(): string {
    return this._name;
  }

  get legalName(): string | undefined {
    return this._legalName;
  }

  get taxNumber(): string | undefined {
    return this._taxNumber;
  }

  get fiscalYearEndMonth(): number {
    return this._fiscalYearEndMonth;
  }

  get currency(): string {
    return this._currency;
  }

  get industry(): string | undefined {
    return this._industry;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // Business Methods
  updateName(name: string): void {
    if (!name || name.trim().length < 2) {
      throw new DomainError("Organization name must be at least 2 characters");
    }
    this._name = name.trim();
    this._updatedAt = new Date();
  }

  updateLegalInfo(legalName: string, taxNumber?: string): void {
    this._legalName = legalName?.trim();
    this._taxNumber = taxNumber;
    this._updatedAt = new Date();
  }

  changeFiscalYearEnd(month: number): void {
    if (month < 1 || month > 12) {
      throw new DomainError("Fiscal year end month must be between 1 and 12");
    }
    this._fiscalYearEndMonth = month;
    this._updatedAt = new Date();
  }

  /**
   * Get the fiscal year for a given date
   */
  getFiscalYear(date: Date): number {
    const month = date.getMonth() + 1; // JavaScript months are 0-indexed
    const year = date.getFullYear();

    // If the date is after the fiscal year end month, it belongs to the next fiscal year
    if (month > this._fiscalYearEndMonth) {
      return year + 1;
    }
    return year;
  }

  /**
   * Get the fiscal period (month) for a given date
   */
  getFiscalPeriod(date: Date): number {
    const month = date.getMonth() + 1;
    let period = month - this._fiscalYearEndMonth;
    if (period <= 0) {
      period += 12;
    }
    return period;
  }

  /**
   * Serialize for persistence
   */
  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      tenant_id: this._tenantId.value,
      name: this._name,
      legal_name: this._legalName,
      tax_number: this._taxNumber,
      fiscal_year_end_month: this._fiscalYearEndMonth,
      currency: this._currency,
      industry: this._industry,
      created_at: this._createdAt,
      updated_at: this._updatedAt,
    };
  }

  /**
   * Serialize for API response
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this._id,
      tenantId: this._tenantId.value,
      name: this._name,
      legalName: this._legalName,
      taxNumber: this._taxNumber,
      fiscalYearEndMonth: this._fiscalYearEndMonth,
      currency: this._currency,
      industry: this._industry,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
