import { AccountCode } from "@domain/value-objects/AccountCode";
import { Money } from "@domain/value-objects/Money";
import { DomainError } from "@domain/errors/DomainError";

export enum AccountType {
  ASSET = "ASSET",
  LIABILITY = "LIABILITY",
  EQUITY = "EQUITY",
  REVENUE = "REVENUE",
  EXPENSE = "EXPENSE",
}

export enum AccountSubtype {
  // Assets
  CURRENT = "CURRENT",
  FIXED = "FIXED",
  INTANGIBLE = "INTANGIBLE",
  // Liabilities
  LONG_TERM = "LONG_TERM",
  // Equity
  CAPITAL = "CAPITAL",
  RETAINED = "RETAINED",
  // Revenue
  OPERATING = "OPERATING",
  OTHER = "OTHER",
  // Expenses
  COGS = "COGS",
  TAX = "TAX",
}

export interface AccountProps {
  id?: string;
  organizationId: string;
  code: AccountCode;
  name: string;
  nameFr?: string;
  accountType: AccountType;
  accountSubtype?: AccountSubtype;
  parentAccountId?: string;
  isActive: boolean;
  isSystem: boolean;
  displayOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateAccountInput {
  organizationId: string;
  code: string;
  name: string;
  nameFr?: string;
  accountType: AccountType;
  accountSubtype?: AccountSubtype;
  parentAccountId?: string;
  displayOrder?: number;
}

export class Account {
  private readonly _id: string;
  private readonly _organizationId: string;
  private readonly _code: AccountCode;
  private _name: string;
  private _nameFr?: string;
  private readonly _accountType: AccountType;
  private _accountSubtype?: AccountSubtype;
  private _parentAccountId?: string;
  private _isActive: boolean;
  private readonly _isSystem: boolean;
  private _displayOrder: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: AccountProps) {
    this._id = props.id || crypto.randomUUID();
    this._organizationId = props.organizationId;
    this._code = props.code;
    this._name = props.name;
    this._nameFr = props.nameFr;
    this._accountType = props.accountType;
    this._accountSubtype = props.accountSubtype;
    this._parentAccountId = props.parentAccountId;
    this._isActive = props.isActive;
    this._isSystem = props.isSystem;
    this._displayOrder = props.displayOrder;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  /**
   * Factory method to create a new Account
   */
  static create(input: CreateAccountInput): Account {
    if (!input.name || input.name.trim().length < 2) {
      throw new DomainError("Account name must be at least 2 characters");
    }

    if (!Object.values(AccountType).includes(input.accountType)) {
      throw new DomainError(`Invalid account type: ${input.accountType}`);
    }

    const code = AccountCode.create(input.code);

    return new Account({
      organizationId: input.organizationId,
      code,
      name: input.name.trim(),
      nameFr: input.nameFr?.trim(),
      accountType: input.accountType,
      accountSubtype: input.accountSubtype,
      parentAccountId: input.parentAccountId,
      isActive: true,
      isSystem: false,
      displayOrder: input.displayOrder ?? 0,
    });
  }

  /**
   * Reconstitute from persistence
   */
  static fromPersistence(props: AccountProps): Account {
    return new Account(props);
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get organizationId(): string {
    return this._organizationId;
  }

  get code(): AccountCode {
    return this._code;
  }

  get name(): string {
    return this._name;
  }

  get nameFr(): string | undefined {
    return this._nameFr;
  }

  get accountType(): AccountType {
    return this._accountType;
  }

  get accountSubtype(): AccountSubtype | undefined {
    return this._accountSubtype;
  }

  get parentAccountId(): string | undefined {
    return this._parentAccountId;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get isSystem(): boolean {
    return this._isSystem;
  }

  get displayOrder(): number {
    return this._displayOrder;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // Business Methods

  /**
   * Check if this is a debit-normal account
   * Assets and Expenses increase with debits
   */
  isDebitNormal(): boolean {
    return (
      this._accountType === AccountType.ASSET ||
      this._accountType === AccountType.EXPENSE
    );
  }

  /**
   * Check if this is a credit-normal account
   * Liabilities, Equity, and Revenue increase with credits
   */
  isCreditNormal(): boolean {
    return (
      this._accountType === AccountType.LIABILITY ||
      this._accountType === AccountType.EQUITY ||
      this._accountType === AccountType.REVENUE
    );
  }

  /**
   * Check if this account appears on the Balance Sheet
   */
  isBalanceSheetAccount(): boolean {
    return (
      this._accountType === AccountType.ASSET ||
      this._accountType === AccountType.LIABILITY ||
      this._accountType === AccountType.EQUITY
    );
  }

  /**
   * Check if this account appears on the Income Statement
   */
  isIncomeStatementAccount(): boolean {
    return (
      this._accountType === AccountType.REVENUE ||
      this._accountType === AccountType.EXPENSE
    );
  }

  updateName(name: string, nameFr?: string): void {
    if (!name || name.trim().length < 2) {
      throw new DomainError("Account name must be at least 2 characters");
    }
    this._name = name.trim();
    this._nameFr = nameFr?.trim();
    this._updatedAt = new Date();
  }

  deactivate(): void {
    if (this._isSystem) {
      throw new DomainError("Cannot deactivate system accounts");
    }
    this._isActive = false;
    this._updatedAt = new Date();
  }

  activate(): void {
    this._isActive = true;
    this._updatedAt = new Date();
  }

  setParent(parentAccountId: string | undefined): void {
    if (parentAccountId === this._id) {
      throw new DomainError("Account cannot be its own parent");
    }
    this._parentAccountId = parentAccountId;
    this._updatedAt = new Date();
  }

  /**
   * Get display name based on locale
   */
  getDisplayName(locale: string = "en"): string {
    if (locale === "fr" && this._nameFr) {
      return this._nameFr;
    }
    return this._name;
  }

  /**
   * Serialize for persistence
   */
  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      organization_id: this._organizationId,
      code: this._code.value,
      name: this._name,
      name_fr: this._nameFr,
      account_type: this._accountType,
      account_subtype: this._accountSubtype,
      parent_account_id: this._parentAccountId,
      is_active: this._isActive,
      is_system: this._isSystem,
      display_order: this._displayOrder,
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
      organizationId: this._organizationId,
      code: this._code.value,
      name: this._name,
      nameFr: this._nameFr,
      accountType: this._accountType,
      accountSubtype: this._accountSubtype,
      parentAccountId: this._parentAccountId,
      isActive: this._isActive,
      isSystem: this._isSystem,
      displayOrder: this._displayOrder,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
