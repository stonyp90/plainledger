/**
 * Account Entity Tests
 */

import { describe, it, expect } from 'vitest';
import { Account, type AccountProps } from '../entities/Account';
import { Money } from '../value-objects/Money';
import { AccountCode } from '../value-objects/AccountCode';

describe('Account Entity', () => {
  const createTestAccount = (overrides: Partial<AccountProps> = {}): Account => {
    const defaultProps: AccountProps = {
      id: 'test-123',
      code: AccountCode.create('1000'),
      name: 'Encaisse',
      nameEn: 'Cash',
      type: 'asset',
      subType: 'current',
      currentBalance: Money.create(10000),
      priorBalance: Money.create(8000),
      budget: Money.create(9500),
      isActive: true,
    };
    return Account.create({ ...defaultProps, ...overrides });
  };

  describe('creation', () => {
    it('should create an Account with valid properties', () => {
      const account = createTestAccount();
      expect(account.id).toBe('test-123');
      expect(account.code.value).toBe('1000');
      expect(account.name).toBe('Encaisse');
      expect(account.type).toBe('asset');
    });

    it('should throw error for empty name', () => {
      expect(() => createTestAccount({ name: '' })).toThrow('Account name is required');
    });

    it('should throw error for missing type', () => {
      expect(() => createTestAccount({ type: undefined as any })).toThrow('Account type is required');
    });
  });

  describe('variance calculations', () => {
    it('should calculate variance correctly', () => {
      const account = createTestAccount({
        currentBalance: Money.create(10000),
        priorBalance: Money.create(8000),
      });
      const variance = account.calculateVariance();
      expect(variance.amount).toBe(2000);
    });

    it('should calculate variance percentage correctly', () => {
      const account = createTestAccount({
        currentBalance: Money.create(10000),
        priorBalance: Money.create(8000),
      });
      const variancePercent = account.calculateVariancePercentage();
      expect(variancePercent).toBe(25); // (10000 - 8000) / 8000 * 100
    });

    it('should handle zero prior balance', () => {
      const account = createTestAccount({
        currentBalance: Money.create(1000),
        priorBalance: Money.create(0),
      });
      const variancePercent = account.calculateVariancePercentage();
      expect(variancePercent).toBe(100);
    });

    it('should handle both zero balances', () => {
      const account = createTestAccount({
        currentBalance: Money.create(0),
        priorBalance: Money.create(0),
      });
      const variancePercent = account.calculateVariancePercentage();
      expect(variancePercent).toBe(0);
    });

    it('should calculate budget variance', () => {
      const account = createTestAccount({
        currentBalance: Money.create(10000),
        budget: Money.create(9500),
      });
      const budgetVariance = account.calculateBudgetVariance();
      expect(budgetVariance?.amount).toBe(500);
    });

    it('should return null for budget variance when no budget', () => {
      const account = createTestAccount({ budget: undefined });
      const budgetVariance = account.calculateBudgetVariance();
      expect(budgetVariance).toBeNull();
    });
  });

  describe('account type checks', () => {
    it('should identify debit accounts', () => {
      const assetAccount = createTestAccount({ type: 'asset' });
      const expenseAccount = createTestAccount({ type: 'expense' });
      const liabilityAccount = createTestAccount({ type: 'liability' });

      expect(assetAccount.isDebitAccount()).toBe(true);
      expect(expenseAccount.isDebitAccount()).toBe(true);
      expect(liabilityAccount.isDebitAccount()).toBe(false);
    });

    it('should identify credit accounts', () => {
      const liabilityAccount = createTestAccount({ type: 'liability' });
      const equityAccount = createTestAccount({ type: 'equity' });
      const revenueAccount = createTestAccount({ type: 'revenue' });
      const assetAccount = createTestAccount({ type: 'asset' });

      expect(liabilityAccount.isCreditAccount()).toBe(true);
      expect(equityAccount.isCreditAccount()).toBe(true);
      expect(revenueAccount.isCreditAccount()).toBe(true);
      expect(assetAccount.isCreditAccount()).toBe(false);
    });

    it('should identify current assets', () => {
      const currentAsset = createTestAccount({ type: 'asset', subType: 'current' });
      const fixedAsset = createTestAccount({ type: 'asset', subType: 'fixed' });

      expect(currentAsset.isCurrentAsset()).toBe(true);
      expect(fixedAsset.isCurrentAsset()).toBe(false);
    });

    it('should identify fixed assets', () => {
      const fixedAsset = createTestAccount({ type: 'asset', subType: 'fixed' });
      const currentAsset = createTestAccount({ type: 'asset', subType: 'current' });

      expect(fixedAsset.isFixedAsset()).toBe(true);
      expect(currentAsset.isFixedAsset()).toBe(false);
    });

    it('should identify current liabilities', () => {
      const currentLiability = createTestAccount({ 
        type: 'liability', 
        subType: 'current',
        code: AccountCode.create('2000'),
      });
      expect(currentLiability.isCurrentLiability()).toBe(true);
    });

    it('should identify long-term liabilities', () => {
      const longTermLiability = createTestAccount({ 
        type: 'liability', 
        subType: 'longTerm',
        code: AccountCode.create('2500'),
      });
      expect(longTermLiability.isLongTermLiability()).toBe(true);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON correctly', () => {
      const account = createTestAccount();
      const json = account.toJSON();

      expect(json).toEqual({
        id: 'test-123',
        code: '1000',
        name: 'Encaisse',
        nameEn: 'Cash',
        type: 'asset',
        subType: 'current',
        currentBalance: 10000,
        priorBalance: 8000,
        budget: 9500,
        isActive: true,
        notes: undefined,
      });
    });
  });
});
