import { Inject, Injectable } from '@nestjs/common';
import { IOrganizationRepository } from '@application/ports/outbound/IOrganizationRepository';
import { ILedgerReportRepository, LedgerAccountTotal } from '@application/ports/outbound/ILedgerReportRepository';
import { AccountType } from '@domain/entities/Account';
import { EntityNotFoundError } from '@domain/errors/DomainError';
import { TenantId } from '@domain/value-objects/TenantId';
import { normalBalanceCents, requirePostedLedger, sumCents, validateReportDates } from './financial-report-validation';

export interface IncomeStatementReportLine {
  accountCode: string;
  accountName: string;
  accountSubType?: string;
  amount: number;
  level: number;
}

@Injectable()
export class GenerateIncomeStatementUseCase {
  constructor(
    @Inject('IOrganizationRepository') private readonly organizations: IOrganizationRepository,
    @Inject('ILedgerReportRepository') private readonly ledger: ILedgerReportRepository,
  ) {}

  async execute(request: { tenantId: string; startDate: Date; endDate: Date; locale?: 'en' | 'fr' }) {
    validateReportDates(request.endDate, request.startDate);
    const organization = await this.organizations.findByTenantId(TenantId.create(request.tenantId));
    if (!organization) throw new EntityNotFoundError('Organization', request.tenantId);
    const totals = await this.ledger.getTotals(organization.id, request.endDate, request.startDate);
    requirePostedLedger(totals);
    const revenueAccounts = totals.accounts.filter((account) => account.accountType === AccountType.REVENUE);
    const expenseAccounts = totals.accounts.filter((account) => account.accountType === AccountType.EXPENSE);
    const line = (account: LedgerAccountTotal): IncomeStatementReportLine => ({
      accountCode: account.accountCode,
      accountName: request.locale === 'fr' ? account.accountNameFr || account.accountName : account.accountName,
      accountSubType: account.accountSubtype, amount: normalBalanceCents(account) / 100, level: 0,
    });
    const grossRevenueCents = sumCents(revenueAccounts.map(normalBalanceCents));
    const expenseCents = sumCents(expenseAccounts.map(normalBalanceCents));
    return {
      organizationName: organization.name, currency: organization.currency,
      startDate: request.startDate, endDate: request.endDate,
      revenue: revenueAccounts.map(line), expenses: expenseAccounts.map(line),
      grossRevenue: grossRevenueCents / 100, totalExpenses: expenseCents / 100,
      netIncome: sumCents([grossRevenueCents, -expenseCents]) / 100,
    };
  }
}
