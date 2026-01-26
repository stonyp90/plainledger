/**
 * AccountCode Value Object
 * Represents a standard chart of accounts code
 */

export class AccountCode {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value: string): AccountCode {
    if (!value || value.trim().length === 0) {
      throw new Error('Account code is required');
    }
    
    // Validate format (typically 4-6 digits)
    const normalized = value.trim();
    if (!/^\d{4,6}$/.test(normalized)) {
      throw new Error('Account code must be 4-6 digits');
    }
    
    return new AccountCode(normalized);
  }

  get value(): string {
    return this._value;
  }

  // Account type inference based on standard chart of accounts
  inferAccountType(): 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' {
    const firstDigit = parseInt(this._value[0], 10);
    
    switch (firstDigit) {
      case 1:
        return 'asset';
      case 2:
        return 'liability';
      case 3:
        return 'equity';
      case 4:
        return 'revenue';
      case 5:
      case 6:
      case 7:
      case 8:
      case 9:
        return 'expense';
      default:
        return 'asset';
    }
  }

  inferSubType(): 'current' | 'fixed' | 'longTerm' | undefined {
    const code = parseInt(this._value, 10);
    const firstDigit = parseInt(this._value[0], 10);
    
    if (firstDigit === 1) {
      // Assets: 1000-1499 = current, 1500+ = fixed
      return code < 1500 ? 'current' : 'fixed';
    }
    
    if (firstDigit === 2) {
      // Liabilities: 2000-2499 = current, 2500+ = long-term
      return code < 2500 ? 'current' : 'longTerm';
    }
    
    return undefined;
  }

  isBalanceSheetAccount(): boolean {
    const type = this.inferAccountType();
    return type === 'asset' || type === 'liability' || type === 'equity';
  }

  isIncomeStatementAccount(): boolean {
    const type = this.inferAccountType();
    return type === 'revenue' || type === 'expense';
  }

  equals(other: AccountCode): boolean {
    return this._value === other._value;
  }

  compareTo(other: AccountCode): number {
    return this._value.localeCompare(other._value);
  }

  toString(): string {
    return this._value;
  }
}
