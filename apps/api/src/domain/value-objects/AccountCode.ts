import { DomainError } from '@domain/errors/DomainError';

/**
 * AccountCode Value Object
 * Represents an account code in the chart of accounts
 */
export class AccountCode {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /**
   * Create a new AccountCode with validation
   */
  static create(value: string): AccountCode {
    if (!value || value.trim().length === 0) {
      throw new DomainError('AccountCode cannot be empty');
    }

    const trimmed = value.trim();

    // Validate format: 1-20 characters, alphanumeric with dots and hyphens
    if (!/^[A-Za-z0-9][A-Za-z0-9.\-]{0,18}[A-Za-z0-9]?$/.test(trimmed)) {
      throw new DomainError(
        'AccountCode must be 1-20 alphanumeric characters with optional dots and hyphens',
      );
    }

    return new AccountCode(trimmed.toUpperCase());
  }

  /**
   * Reconstitute from persistence (no validation)
   */
  static fromPersistence(value: string): AccountCode {
    return new AccountCode(value);
  }

  get value(): string {
    return this._value;
  }

  /**
   * Get the major category (first digit/character)
   * Typically: 1=Assets, 2=Liabilities, 3=Equity, 4=Revenue, 5-6=Expenses
   */
  getMajorCategory(): string {
    return this._value.charAt(0);
  }

  /**
   * Check if this code is a parent of another code
   */
  isParentOf(other: AccountCode): boolean {
    return (
      other._value.startsWith(this._value) && other._value !== this._value
    );
  }

  equals(other: AccountCode): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  /**
   * Compare for sorting
   */
  compareTo(other: AccountCode): number {
    return this._value.localeCompare(other._value, undefined, { numeric: true });
  }
}
