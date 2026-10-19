import { Injectable, Inject } from "@nestjs/common";
import { IOrganizationRepository } from "@application/ports/outbound/IOrganizationRepository";
import { ILedgerReportRepository, LedgerAccountTotal } from "@application/ports/outbound/ILedgerReportRepository";
import { normalBalanceCents, requirePostedLedger, sumCents, validateReportDates } from "./financial-report-validation";
import { TenantId } from "@domain/value-objects/TenantId";
import { AccountType } from "@domain/entities/Account";
import { EntityNotFoundError } from "@domain/errors/DomainError";

export interface GenerateBalanceSheetRequest {
  tenantId: string;
  asOfDate: Date;
  comparisonDate?: Date;
  locale?: "en" | "fr";
}

export interface BalanceSheetLineItem {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountSubtype?: string;
  currentBalance: number;
  priorBalance?: number;
  variance?: number;
  variancePercent?: number;
}

export interface BalanceSheetSection {
  title: string;
  items: BalanceSheetLineItem[];
  total: number;
  priorTotal?: number;
}

export interface GenerateBalanceSheetResponse {
  organizationName: string;
  reportTitle: string;
  asOfDate: string;
  comparisonDate?: string;
  currency: string;
  assets: {
    currentAssets: BalanceSheetSection;
    fixedAssets: BalanceSheetSection;
    otherAssets?: BalanceSheetSection;
    totalAssets: number;
    priorTotalAssets?: number;
  };
  liabilities: {
    currentLiabilities: BalanceSheetSection;
    longTermLiabilities: BalanceSheetSection;
    otherLiabilities?: BalanceSheetSection;
    totalLiabilities: number;
    priorTotalLiabilities?: number;
  };
  equity: {
    items: BalanceSheetLineItem[];
    totalEquity: number;
    priorTotalEquity?: number;
  };
  totalLiabilitiesAndEquity: number;
  priorTotalLiabilitiesAndEquity?: number;
  isBalanced: boolean;
  generatedAt: string;
}

/**
 * Use Case: Generate Balance Sheet Report
 *
 * Generates a balance sheet report following IBCS standards
 * for clear financial visualization.
 */
@Injectable()
export class GenerateBalanceSheetUseCase {
  constructor(
    @Inject("IOrganizationRepository")
    private readonly organizationRepository: IOrganizationRepository,
    @Inject("ILedgerReportRepository")
    private readonly ledgerRepository: ILedgerReportRepository,
  ) {}

  async execute(request: GenerateBalanceSheetRequest): Promise<GenerateBalanceSheetResponse> {
    validateReportDates(request.asOfDate, request.comparisonDate);
    const tenantId = TenantId.create(request.tenantId);
    const organization = await this.organizationRepository.findByTenantId(tenantId);
    if (!organization) throw new EntityNotFoundError("Organization", request.tenantId);
    const [current, prior] = await Promise.all([
      this.ledgerRepository.getTotals(organization.id, request.asOfDate),
      request.comparisonDate ? this.ledgerRepository.getTotals(organization.id, request.comparisonDate) : undefined,
    ]);
    requirePostedLedger(current);
    const priorById = new Map(prior?.accounts.map((account) => [account.accountId, account]) ?? []);
    const locale = request.locale || "fr";
    const line = (account: LedgerAccountTotal): BalanceSheetLineItem => {
      const currentBalance = normalBalanceCents(account) / 100;
      const priorAccount = priorById.get(account.accountId);
      const priorBalance = priorAccount ? normalBalanceCents(priorAccount) / 100 : undefined;
      return {
        accountId: account.accountId, accountCode: account.accountCode,
        accountName: locale === "fr" ? account.accountNameFr || account.accountName : account.accountName,
        accountSubtype: account.accountSubtype, currentBalance, priorBalance,
        variance: priorBalance === undefined ? undefined : (Math.round(currentBalance * 100) - Math.round(priorBalance * 100)) / 100,
        variancePercent: priorBalance ? ((currentBalance - priorBalance) / Math.abs(priorBalance)) * 100 : undefined,
      };
    };
    const section = (title: string, accounts: LedgerAccountTotal[]): BalanceSheetSection => ({
      title, items: accounts.map(line), total: sumCents(accounts.map(normalBalanceCents)) / 100,
      priorTotal: prior ? sumCents(accounts.map((account) => {
        const previous = priorById.get(account.accountId);
        return previous ? normalBalanceCents(previous) : 0;
      })) / 100 : undefined,
    });
    const assets = current.accounts.filter((account) => account.accountType === AccountType.ASSET);
    const liabilities = current.accounts.filter((account) => account.accountType === AccountType.LIABILITY);
    const equityAccounts = current.accounts.filter((account) => account.accountType === AccountType.EQUITY);
    const currentAssets = section(locale === "fr" ? "Actifs courants" : "Current Assets", assets.filter((account) => account.accountSubtype === "CURRENT"));
    const fixedAssets = section(locale === "fr" ? "Immobilisations" : "Fixed Assets", assets.filter((account) => account.accountSubtype === "FIXED"));
    const otherAssets = section(locale === "fr" ? "Autres actifs" : "Other Assets", assets.filter((account) => !["CURRENT", "FIXED"].includes(account.accountSubtype || "")));
    const currentLiabilities = section(locale === "fr" ? "Passifs courants" : "Current Liabilities", liabilities.filter((account) => account.accountSubtype === "CURRENT"));
    const longTermLiabilities = section(locale === "fr" ? "Passifs à long terme" : "Long-term Liabilities", liabilities.filter((account) => account.accountSubtype === "LONG_TERM"));
    const otherLiabilities = section(locale === "fr" ? "Autres passifs" : "Other Liabilities", liabilities.filter((account) => !["CURRENT", "LONG_TERM"].includes(account.accountSubtype || "")));
    const equity = section(locale === "fr" ? "Capitaux propres" : "Equity", equityAccounts);
    // Unclosed revenue/expense balances belong in equity. This is derived from
    // posted journal lines; closing entries naturally reduce it back to zero.
    const earnings = (accounts: LedgerAccountTotal[]) => sumCents(accounts.map((account) =>
      account.accountType === AccountType.REVENUE ? normalBalanceCents(account) :
      account.accountType === AccountType.EXPENSE ? -normalBalanceCents(account) : 0));
    const earningsCents = earnings(current.accounts);
    const priorEarningsCents = prior ? earnings(prior.accounts) : undefined;
    if (earningsCents || priorEarningsCents) {
      equity.items.push({
        accountId: "unclosed-earnings", accountCode: "EARNINGS", accountSubtype: "RETAINED",
        accountName: locale === "fr" ? "Résultat non clôturé" : "Unclosed earnings",
        currentBalance: earningsCents / 100, priorBalance: priorEarningsCents === undefined ? undefined : priorEarningsCents / 100,
      });
    }
    const totalAssetsCents = sumCents(assets.map(normalBalanceCents));
    const totalLiabilitiesCents = sumCents(liabilities.map(normalBalanceCents));
    const totalEquityCents = sumCents([...equityAccounts.map(normalBalanceCents), earningsCents]);
    return {
      organizationName: organization.name, reportTitle: locale === "fr" ? "Bilan" : "Balance Sheet",
      asOfDate: request.asOfDate.toISOString().slice(0, 10), comparisonDate: request.comparisonDate?.toISOString().slice(0, 10),
      currency: organization.currency,
      assets: { currentAssets, fixedAssets, otherAssets, totalAssets: totalAssetsCents / 100,
        priorTotalAssets: prior ? sumCents(prior.accounts.filter((account) => account.accountType === AccountType.ASSET).map(normalBalanceCents)) / 100 : undefined },
      liabilities: { currentLiabilities, longTermLiabilities, otherLiabilities, totalLiabilities: totalLiabilitiesCents / 100,
        priorTotalLiabilities: prior ? sumCents(prior.accounts.filter((account) => account.accountType === AccountType.LIABILITY).map(normalBalanceCents)) / 100 : undefined },
      equity: { items: equity.items, totalEquity: totalEquityCents / 100,
        priorTotalEquity: prior ? sumCents([...prior.accounts.filter((account) => account.accountType === AccountType.EQUITY).map(normalBalanceCents), priorEarningsCents || 0]) / 100 : undefined },
      totalLiabilitiesAndEquity: sumCents([totalLiabilitiesCents, totalEquityCents]) / 100,
      isBalanced: totalAssetsCents === sumCents([totalLiabilitiesCents, totalEquityCents]),
      generatedAt: new Date().toISOString(),
    };
  }
}
