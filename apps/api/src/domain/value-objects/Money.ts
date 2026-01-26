import { DomainError } from '@domain/errors/DomainError';

/**
 * Money Value Object
 * Represents a monetary amount with currency
 * Uses integer cents to avoid floating point issues
 */
export class Money {
  private readonly _cents: number;
  private readonly _currency: string;

  private constructor(cents: number, currency: string) {
    this._cents = cents;
    this._currency = currency;
  }

  /**
   * Create Money from a decimal amount
   */
  static fromDecimal(amount: number, currency: string = 'CAD'): Money {
    if (!Number.isFinite(amount)) {
      throw new DomainError('Amount must be a finite number');
    }

    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new DomainError('Currency must be a valid 3-letter ISO code');
    }

    // Round to nearest cent to avoid floating point issues
    const cents = Math.round(amount * 100);
    return new Money(cents, currency);
  }

  /**
   * Create Money from cents
   */
  static fromCents(cents: number, currency: string = 'CAD'): Money {
    if (!Number.isInteger(cents)) {
      throw new DomainError('Cents must be an integer');
    }

    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new DomainError('Currency must be a valid 3-letter ISO code');
    }

    return new Money(cents, currency);
  }

  /**
   * Create zero money
   */
  static zero(currency: string = 'CAD'): Money {
    return new Money(0, currency);
  }

  get cents(): number {
    return this._cents;
  }

  get currency(): string {
    return this._currency;
  }

  /**
   * Get the decimal amount
   */
  toDecimal(): number {
    return this._cents / 100;
  }

  /**
   * Add two Money values
   */
  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._cents + other._cents, this._currency);
  }

  /**
   * Subtract another Money value
   */
  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._cents - other._cents, this._currency);
  }

  /**
   * Multiply by a factor
   */
  multiply(factor: number): Money {
    return new Money(Math.round(this._cents * factor), this._currency);
  }

  /**
   * Negate the amount
   */
  negate(): Money {
    return new Money(-this._cents, this._currency);
  }

  /**
   * Get absolute value
   */
  abs(): Money {
    return new Money(Math.abs(this._cents), this._currency);
  }

  /**
   * Check if zero
   */
  isZero(): boolean {
    return this._cents === 0;
  }

  /**
   * Check if positive
   */
  isPositive(): boolean {
    return this._cents > 0;
  }

  /**
   * Check if negative
   */
  isNegative(): boolean {
    return this._cents < 0;
  }

  /**
   * Compare to another Money value
   */
  compareTo(other: Money): number {
    this.assertSameCurrency(other);
    return this._cents - other._cents;
  }

  equals(other: Money): boolean {
    return this._cents === other._cents && this._currency === other._currency;
  }

  /**
   * Format for display
   */
  format(locale: string = 'fr-CA'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this._currency,
    }).format(this.toDecimal());
  }

  toString(): string {
    return `${this.toDecimal().toFixed(2)} ${this._currency}`;
  }

  private assertSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new DomainError(
        `Cannot perform operation on different currencies: ${this._currency} vs ${other._currency}`,
      );
    }
  }
}
