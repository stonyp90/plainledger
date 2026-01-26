/**
 * Account Entity
 * Core domain entity representing a financial account
 */

import { Money } from '../value-objects/Money';
import { AccountCode } from '../value-objects/AccountCode';

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type AccountSubType = 'current' | 'fixed' | 'longTerm' | 'operating' | 'nonOperating';

export interface AccountProps {
  id: string;
  code: AccountCode;
  name: string;
  nameEn: string;
  type: AccountType;
  subType?: AccountSubType;
  currentBalance: Money;
  priorBalance: Money;
  budget?: Money;
  isActive: boolean;
  notes?: string;
}

export class Account {
  private readonly props: AccountProps;

  private constructor(props: AccountProps) {
    this.props = props;
  }

  static create(props: AccountProps): Account {
    // Validation
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Account name is required');
    }
    if (!props.type) {
      throw new Error('Account type is required');
    }
    return new Account(props);
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get code(): AccountCode {
    return this.props.code;
  }

  get name(): string {
    return this.props.name;
  }

  get nameEn(): string {
    return this.props.nameEn;
  }

  get type(): AccountType {
    return this.props.type;
  }

  get subType(): AccountSubType | undefined {
    return this.props.subType;
  }

  get currentBalance(): Money {
    return this.props.currentBalance;
  }

  get priorBalance(): Money {
    return this.props.priorBalance;
  }

  get budget(): Money | undefined {
    return this.props.budget;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get notes(): string | undefined {
    return this.props.notes;
  }

  // Domain methods
  calculateVariance(): Money {
    return this.props.currentBalance.subtract(this.props.priorBalance);
  }

  calculateVariancePercentage(): number {
    if (this.props.priorBalance.isZero()) {
      return this.props.currentBalance.isZero() ? 0 : 100;
    }
    const variance = this.calculateVariance();
    return (variance.amount / Math.abs(this.props.priorBalance.amount)) * 100;
  }

  calculateBudgetVariance(): Money | null {
    if (!this.props.budget) return null;
    return this.props.currentBalance.subtract(this.props.budget);
  }

  isDebitAccount(): boolean {
    return this.props.type === 'asset' || this.props.type === 'expense';
  }

  isCreditAccount(): boolean {
    return this.props.type === 'liability' || this.props.type === 'equity' || this.props.type === 'revenue';
  }

  isCurrentAsset(): boolean {
    return this.props.type === 'asset' && this.props.subType === 'current';
  }

  isFixedAsset(): boolean {
    return this.props.type === 'asset' && this.props.subType === 'fixed';
  }

  isCurrentLiability(): boolean {
    return this.props.type === 'liability' && this.props.subType === 'current';
  }

  isLongTermLiability(): boolean {
    return this.props.type === 'liability' && this.props.subType === 'longTerm';
  }

  // Serialization
  toJSON(): Record<string, unknown> {
    return {
      id: this.props.id,
      code: this.props.code.value,
      name: this.props.name,
      nameEn: this.props.nameEn,
      type: this.props.type,
      subType: this.props.subType,
      currentBalance: this.props.currentBalance.amount,
      priorBalance: this.props.priorBalance.amount,
      budget: this.props.budget?.amount,
      isActive: this.props.isActive,
      notes: this.props.notes,
    };
  }
}
