import { DomainError } from "@domain/errors/DomainError";

/**
 * TenantId Value Object
 * Represents a unique identifier for a tenant in a multi-tenant system
 */
export class TenantId {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /**
   * Create a new TenantId with validation
   */
  static create(value: string): TenantId {
    if (!value || value.trim().length === 0) {
      throw new DomainError("TenantId cannot be empty");
    }

    const trimmed = value.trim().toLowerCase();

    // Validate format: alphanumeric with hyphens, 3-50 chars
    if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(trimmed)) {
      throw new DomainError(
        "TenantId must be 3-50 characters, alphanumeric with hyphens, cannot start or end with hyphen",
      );
    }

    return new TenantId(trimmed);
  }

  /**
   * Reconstitute from persistence (no validation)
   */
  static fromPersistence(value: string): TenantId {
    return new TenantId(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: TenantId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
