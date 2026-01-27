import { Injectable, Inject } from "@nestjs/common";
import { IOrganizationRepository } from "@application/ports/outbound/IOrganizationRepository";
import { IAccountRepository } from "@application/ports/outbound/IAccountRepository";
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
    totalAssets: number;
    priorTotalAssets?: number;
  };
  liabilities: {
    currentLiabilities: BalanceSheetSection;
    longTermLiabilities: BalanceSheetSection;
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
    @Inject("IAccountRepository")
    private readonly accountRepository: IAccountRepository,
  ) {}

  async execute(
    request: GenerateBalanceSheetRequest,
  ): Promise<GenerateBalanceSheetResponse> {
    const locale = request.locale || "fr";
    const tenantId = TenantId.create(request.tenantId);

    // Get organization
    const organization =
      await this.organizationRepository.findByTenantId(tenantId);
    if (!organization) {
      throw new EntityNotFoundError("Organization", request.tenantId);
    }

    // Get all balance sheet accounts
    const accounts = await this.accountRepository.findByTypes(organization.id, [
      AccountType.ASSET,
      AccountType.LIABILITY,
      AccountType.EQUITY,
    ]);

    // Separate accounts by type
    const assetAccounts = accounts.filter(
      (a) => a.accountType === AccountType.ASSET,
    );
    const liabilityAccounts = accounts.filter(
      (a) => a.accountType === AccountType.LIABILITY,
    );
    const equityAccounts = accounts.filter(
      (a) => a.accountType === AccountType.EQUITY,
    );

    // Build sections (in real implementation, would fetch actual balances)
    const currentAssets = this.buildSection(
      locale === "fr" ? "Actifs courants" : "Current Assets",
      assetAccounts.filter((a) => a.accountSubtype === "CURRENT"),
      locale,
    );

    const fixedAssets = this.buildSection(
      locale === "fr" ? "Immobilisations" : "Fixed Assets",
      assetAccounts.filter((a) => a.accountSubtype === "FIXED"),
      locale,
    );

    const currentLiabilities = this.buildSection(
      locale === "fr" ? "Passifs courants" : "Current Liabilities",
      liabilityAccounts.filter((a) => a.accountSubtype === "CURRENT"),
      locale,
    );

    const longTermLiabilities = this.buildSection(
      locale === "fr" ? "Passifs à long terme" : "Long-term Liabilities",
      liabilityAccounts.filter((a) => a.accountSubtype === "LONG_TERM"),
      locale,
    );

    const equitySection = this.buildSection(
      locale === "fr" ? "Capitaux propres" : "Equity",
      equityAccounts,
      locale,
    );

    // Calculate totals
    const totalAssets = currentAssets.total + fixedAssets.total;
    const totalLiabilities =
      currentLiabilities.total + longTermLiabilities.total;
    const totalEquity = equitySection.total;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    return {
      organizationName: organization.name,
      reportTitle: locale === "fr" ? "Bilan" : "Balance Sheet",
      asOfDate: request.asOfDate.toISOString().split("T")[0],
      comparisonDate: request.comparisonDate?.toISOString().split("T")[0],
      currency: organization.currency,
      assets: {
        currentAssets,
        fixedAssets,
        totalAssets,
      },
      liabilities: {
        currentLiabilities,
        longTermLiabilities,
        totalLiabilities,
      },
      equity: {
        items: equitySection.items,
        totalEquity,
      },
      totalLiabilitiesAndEquity,
      isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01,
      generatedAt: new Date().toISOString(),
    };
  }

  private buildSection(
    title: string,
    accounts: any[],
    locale: string,
  ): BalanceSheetSection {
    const items: BalanceSheetLineItem[] = accounts.map((account) => ({
      accountId: account.id,
      accountCode: account.code.value,
      accountName: account.getDisplayName(locale),
      currentBalance: 0, // Would fetch from account_balances table
    }));

    const total = items.reduce((sum, item) => sum + item.currentBalance, 0);

    return { title, items, total };
  }
}
