/**
 * Money Value Object
 * Immutable representation of monetary values with currency support
 */

export type Currency = "CAD" | "USD" | "EUR" | "GBP";

export class Money {
  private readonly _amount: number;
  private readonly _currency: Currency;

  private constructor(amount: number, currency: Currency = "CAD") {
    this._amount = Math.round(amount * 100) / 100; // Round to 2 decimal places
    this._currency = currency;
  }

  static create(amount: number, currency: Currency = "CAD"): Money {
    if (!Number.isFinite(amount)) {
      throw new Error("Amount must be a finite number");
    }
    return new Money(amount, currency);
  }

  static zero(currency: Currency = "CAD"): Money {
    return new Money(0, currency);
  }

  static fromCents(cents: number, currency: Currency = "CAD"): Money {
    return new Money(cents / 100, currency);
  }

  get amount(): number {
    return this._amount;
  }

  get currency(): Currency {
    return this._currency;
  }

  get cents(): number {
    return Math.round(this._amount * 100);
  }

  // Operations
  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._amount + other._amount, this._currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._amount - other._amount, this._currency);
  }

  multiply(factor: number): Money {
    return new Money(this._amount * factor, this._currency);
  }

  divide(divisor: number): Money {
    if (divisor === 0) {
      throw new Error("Cannot divide by zero");
    }
    return new Money(this._amount / divisor, this._currency);
  }

  negate(): Money {
    return new Money(-this._amount, this._currency);
  }

  abs(): Money {
    return new Money(Math.abs(this._amount), this._currency);
  }

  // Comparisons
  equals(other: Money): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }

  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._amount > other._amount;
  }

  isLessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._amount < other._amount;
  }

  isGreaterThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._amount >= other._amount;
  }

  isLessThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._amount <= other._amount;
  }

  isZero(): boolean {
    return this._amount === 0;
  }

  isPositive(): boolean {
    return this._amount > 0;
  }

  isNegative(): boolean {
    return this._amount < 0;
  }

  // Formatting
  format(locale: string = "en-CA"): string {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: this._currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(this._amount);
  }

  formatCompact(locale: string = "en-CA"): string {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: this._currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(this._amount);
  }

  // Helper
  private assertSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new Error(
        `Currency mismatch: ${this._currency} vs ${other._currency}`,
      );
    }
  }

  toString(): string {
    return this.format();
  }

  toJSON(): { amount: number; currency: Currency } {
    return {
      amount: this._amount,
      currency: this._currency,
    };
  }
}
