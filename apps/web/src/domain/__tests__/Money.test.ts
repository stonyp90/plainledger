/**
 * Money Value Object Tests
 */

import { describe, it, expect } from 'vitest';
import { Money } from '../value-objects/Money';

describe('Money Value Object', () => {
  describe('creation', () => {
    it('should create a Money instance with valid amount', () => {
      const money = Money.create(100);
      expect(money.amount).toBe(100);
      expect(money.currency).toBe('CAD');
    });

    it('should create Money with specified currency', () => {
      const money = Money.create(100, 'USD');
      expect(money.currency).toBe('USD');
    });

    it('should round to 2 decimal places', () => {
      const money = Money.create(100.456);
      expect(money.amount).toBe(100.46);
    });

    it('should create zero Money', () => {
      const money = Money.zero();
      expect(money.amount).toBe(0);
      expect(money.isZero()).toBe(true);
    });

    it('should create Money from cents', () => {
      const money = Money.fromCents(1050);
      expect(money.amount).toBe(10.50);
    });

    it('should throw error for non-finite numbers', () => {
      expect(() => Money.create(Infinity)).toThrow('Amount must be a finite number');
      expect(() => Money.create(NaN)).toThrow('Amount must be a finite number');
    });
  });

  describe('arithmetic operations', () => {
    it('should add two Money values', () => {
      const a = Money.create(100);
      const b = Money.create(50);
      const result = a.add(b);
      expect(result.amount).toBe(150);
    });

    it('should subtract two Money values', () => {
      const a = Money.create(100);
      const b = Money.create(30);
      const result = a.subtract(b);
      expect(result.amount).toBe(70);
    });

    it('should multiply by a factor', () => {
      const money = Money.create(100);
      const result = money.multiply(1.5);
      expect(result.amount).toBe(150);
    });

    it('should divide by a divisor', () => {
      const money = Money.create(100);
      const result = money.divide(4);
      expect(result.amount).toBe(25);
    });

    it('should throw error when dividing by zero', () => {
      const money = Money.create(100);
      expect(() => money.divide(0)).toThrow('Cannot divide by zero');
    });

    it('should negate the amount', () => {
      const money = Money.create(100);
      const negated = money.negate();
      expect(negated.amount).toBe(-100);
    });

    it('should return absolute value', () => {
      const money = Money.create(-100);
      const abs = money.abs();
      expect(abs.amount).toBe(100);
    });

    it('should throw error when adding different currencies', () => {
      const cad = Money.create(100, 'CAD');
      const usd = Money.create(50, 'USD');
      expect(() => cad.add(usd)).toThrow('Currency mismatch');
    });
  });

  describe('comparisons', () => {
    it('should check equality', () => {
      const a = Money.create(100);
      const b = Money.create(100);
      const c = Money.create(50);
      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
    });

    it('should compare greater than', () => {
      const a = Money.create(100);
      const b = Money.create(50);
      expect(a.isGreaterThan(b)).toBe(true);
      expect(b.isGreaterThan(a)).toBe(false);
    });

    it('should compare less than', () => {
      const a = Money.create(50);
      const b = Money.create(100);
      expect(a.isLessThan(b)).toBe(true);
    });

    it('should check if positive', () => {
      expect(Money.create(100).isPositive()).toBe(true);
      expect(Money.create(-100).isPositive()).toBe(false);
      expect(Money.create(0).isPositive()).toBe(false);
    });

    it('should check if negative', () => {
      expect(Money.create(-100).isNegative()).toBe(true);
      expect(Money.create(100).isNegative()).toBe(false);
    });
  });

  describe('formatting', () => {
    it('should format as currency string', () => {
      const money = Money.create(1234.56, 'CAD');
      const formatted = money.format('en-CA');
      expect(formatted).toContain('1,234');
    });

    it('should format compact for large numbers', () => {
      const money = Money.create(1500000);
      const formatted = money.formatCompact('en-CA');
      expect(formatted).toMatch(/1\.5M|1,5M/);
    });

    it('should serialize to JSON', () => {
      const money = Money.create(100, 'USD');
      const json = money.toJSON();
      expect(json).toEqual({ amount: 100, currency: 'USD' });
    });
  });

  describe('edge cases', () => {
    it('should handle very small amounts', () => {
      const money = Money.create(0.01);
      expect(money.amount).toBe(0.01);
      expect(money.cents).toBe(1);
    });

    it('should handle negative amounts', () => {
      const money = Money.create(-500);
      expect(money.amount).toBe(-500);
      expect(money.isNegative()).toBe(true);
    });

    it('should handle zero correctly', () => {
      const zero = Money.create(0);
      expect(zero.isZero()).toBe(true);
      expect(zero.isPositive()).toBe(false);
      expect(zero.isNegative()).toBe(false);
    });
  });
});
