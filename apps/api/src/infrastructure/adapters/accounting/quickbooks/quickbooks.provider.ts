/**
 * QuickBooks Provider Adapter
 *
 * Adapter that wraps QuickBooksService to implement IAccountingProvider interface.
 * This enables QuickBooks to work with the multi-provider architecture.
 */

import { Injectable, Logger, Inject } from "@nestjs/common";
import {
  IAccountingProvider,
  ProviderType,
  Account,
  Contact,
  Transaction,
  Invoice,
  Bill,
  DateRange,
  SyncResult,
} from "@application/ports/outbound/IAccountingProvider";
import { QuickBooksService, QuickBooksTokens } from "./quickbooks.service";
import {
  QuickBooksAccount,
  QuickBooksCustomer,
  QuickBooksVendor,
  QuickBooksInvoice,
  QuickBooksBill,
  QuickBooksJournalEntry,
} from "@domain/datalake/provider-types";
import { shouldUseSandbox } from "./quickbooks-environment.util";

/**
 * Token retrieval interface
 * TODO: Replace with proper DataSourceRepository that stores encrypted tokens
 */
interface ITokenService {
  getQuickBooksTokens(organizationId: string): Promise<QuickBooksTokens | null>;
}

@Injectable()
export class QuickBooksProvider implements IAccountingProvider {
  private readonly logger = new Logger(QuickBooksProvider.name);

  constructor(
    private readonly quickBooksService: QuickBooksService,
    @Inject("ITokenService") private readonly tokenService?: ITokenService,
  ) {}

  /**
   * Get QuickBooks tokens for an organization
   * TODO: Implement proper token retrieval from DataSourceRepository
   * This is a placeholder - in production, tokens should be fetched from encrypted database storage
   */
  private async getTokens(organizationId: string): Promise<QuickBooksTokens> {
    if (this.tokenService) {
      const tokens =
        await this.tokenService.getQuickBooksTokens(organizationId);
      if (tokens) {
        return tokens;
      }
    }

    // Fallback: This should be replaced with proper token repository
    // For now, throw a clear error indicating this needs implementation
    throw new Error(
      `QuickBooksProvider: Token retrieval not implemented for organization ${organizationId}. ` +
        `Please implement ITokenService or DataSourceRepository to store/retrieve QuickBooks tokens.`,
    );
  }

  getProviderType(): ProviderType {
    return ProviderType.QUICKBOOKS;
  }

  getProviderName(): string {
    return "QuickBooks Online";
  }

  async testConnection(organizationId: string): Promise<boolean> {
    try {
      const tokens = await this.getTokens(organizationId);
      await this.quickBooksService.getCompanyInfo(
        tokens.accessToken,
        tokens.realmId,
        shouldUseSandbox(),
      );
      return true;
    } catch (error) {
      this.logger.error(`QuickBooks connection test failed: ${error.message}`);
      return false;
    }
  }

  async getAccounts(organizationId: string): Promise<Account[]> {
    const tokens = await this.getTokens(organizationId);
    const qbAccounts = await this.quickBooksService.getAccounts(
      tokens.accessToken,
      tokens.realmId,
      shouldUseSandbox(),
    );
    return qbAccounts.map(this.mapAccount);
  }

  async getContacts(organizationId: string): Promise<Contact[]> {
    const tokens = await this.getTokens(organizationId);
    const [customers, vendors] = await Promise.all([
      this.quickBooksService.getCustomers(
        tokens.accessToken,
        tokens.realmId,
        shouldUseSandbox(),
      ),
      this.quickBooksService.getVendors(
        tokens.accessToken,
        tokens.realmId,
        shouldUseSandbox(),
      ),
    ]);

    const contacts: Contact[] = [
      ...customers.map(this.mapCustomer),
      ...vendors.map(this.mapVendor),
    ];

    return contacts;
  }

  async getTransactions(
    organizationId: string,
    dateRange: DateRange,
  ): Promise<Transaction[]> {
    const tokens = await this.getTokens(organizationId);
    const startDate = dateRange.startDate.toISOString().split("T")[0];
    const endDate = dateRange.endDate.toISOString().split("T")[0];

    // QuickBooks uses Journal Entries for transactions
    const journalEntries = await this.quickBooksService.getJournalEntries(
      tokens.accessToken,
      tokens.realmId,
      startDate,
      endDate,
      shouldUseSandbox(),
    );

    const transactions: Transaction[] = [];

    for (const entry of journalEntries) {
      const entryDate = new Date(entry.TxnDate);

      // Convert journal entry lines to transactions
      if (entry.Line) {
        for (const line of entry.Line) {
          if (line.JournalEntryLineDetail) {
            const detail = line.JournalEntryLineDetail;
            transactions.push({
              id: `${entry.Id}-${line.Id}`,
              date: entryDate,
              amount:
                line.Amount || detail.PostingType === "Debit"
                  ? Math.abs(line.Amount || 0)
                  : -Math.abs(line.Amount || 0),
              description: line.Description || entry.DocNumber || "",
              accountId: detail.AccountRef?.value || "",
              referenceNumber: entry.DocNumber,
              memo: entry.PrivateNote,
              currencyCode: entry.CurrencyRef?.value || "USD",
            });
          }
        }
      }
    }

    return transactions;
  }

  async getInvoices(
    organizationId: string,
    dateRange?: DateRange,
  ): Promise<Invoice[]> {
    const tokens = await this.getTokens(organizationId);
    const useSandbox = shouldUseSandbox();

    let qbInvoices: QuickBooksInvoice[];
    if (dateRange) {
      const startDate = dateRange.startDate.toISOString().split("T")[0];
      const endDate = dateRange.endDate.toISOString().split("T")[0];
      qbInvoices = await this.quickBooksService.getInvoices(
        tokens.accessToken,
        tokens.realmId,
        startDate,
        endDate,
        useSandbox,
      );
    } else {
      // Get last 90 days if no range specified
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);
      qbInvoices = await this.quickBooksService.getInvoices(
        tokens.accessToken,
        tokens.realmId,
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0],
        useSandbox,
      );
    }

    return qbInvoices.map(this.mapInvoice);
  }

  async getBills(
    organizationId: string,
    dateRange?: DateRange,
  ): Promise<Bill[]> {
    const tokens = await this.getTokens(organizationId);
    const useSandbox = shouldUseSandbox();

    let qbBills: QuickBooksBill[];
    if (dateRange) {
      const startDate = dateRange.startDate.toISOString().split("T")[0];
      const endDate = dateRange.endDate.toISOString().split("T")[0];
      qbBills = await this.quickBooksService.getBills(
        tokens.accessToken,
        tokens.realmId,
        startDate,
        endDate,
        useSandbox,
      );
    } else {
      // Get last 90 days if no range specified
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);
      qbBills = await this.quickBooksService.getBills(
        tokens.accessToken,
        tokens.realmId,
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0],
        useSandbox,
      );
    }

    return qbBills.map(this.mapBill);
  }

  async syncToDataLake(organizationId: string): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      const tokens = await this.getTokens(organizationId);
      const useSandbox = shouldUseSandbox();

      // Get last 90 days for sync
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);

      const result = await this.quickBooksService.getFullSync(
        tokens.accessToken,
        tokens.realmId,
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0],
        useSandbox,
      );

      const durationMs = Date.now() - startTime;
      const totalRecords =
        result.accounts.length +
        result.customers.length +
        result.vendors.length +
        result.invoices.length +
        result.bills.length +
        result.journalEntries.length;

      return {
        success: true,
        recordsProcessed: totalRecords,
        recordsSynced: totalRecords,
        errors: errors.length > 0 ? errors : undefined,
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      errors.push(error.message);

      return {
        success: false,
        recordsProcessed: 0,
        recordsSynced: 0,
        errors,
        durationMs,
      };
    }
  }

  // ============================================================================
  // Mapping Functions
  // ============================================================================

  private mapAccount(qbAccount: QuickBooksAccount): Account {
    return {
      id: qbAccount.Id,
      name: qbAccount.Name,
      code: qbAccount.AcctNum,
      type: qbAccount.AccountType,
      subtype: qbAccount.AccountSubType,
      isActive: qbAccount.Active !== false,
      parentId: qbAccount.ParentRef?.value,
    };
  }

  private mapCustomer(qbCustomer: QuickBooksCustomer): Contact {
    return {
      id: qbCustomer.Id,
      displayName: qbCustomer.DisplayName,
      companyName: qbCustomer.CompanyName,
      email: qbCustomer.PrimaryEmailAddr?.Address,
      phone: qbCustomer.PrimaryPhone?.FreeFormNumber,
      isCustomer: true,
      isVendor: false,
      isActive: qbCustomer.Active !== false,
    };
  }

  private mapVendor(qbVendor: QuickBooksVendor): Contact {
    return {
      id: qbVendor.Id,
      displayName: qbVendor.DisplayName,
      companyName: qbVendor.CompanyName,
      email: qbVendor.PrimaryEmailAddr?.Address,
      phone: qbVendor.PrimaryPhone?.FreeFormNumber,
      isCustomer: false,
      isVendor: true,
      isActive: qbVendor.Active !== false,
    };
  }

  private mapInvoice(qbInvoice: QuickBooksInvoice): Invoice {
    return {
      id: qbInvoice.Id,
      number: qbInvoice.DocNumber || "",
      date: new Date(qbInvoice.TxnDate),
      dueDate: qbInvoice.DueDate ? new Date(qbInvoice.DueDate) : undefined,
      customerId: qbInvoice.CustomerRef?.value || "",
      totalAmount: qbInvoice.TotalAmt || 0,
      status: qbInvoice.Balance === 0 ? "PAID" : "UNPAID",
      currencyCode: qbInvoice.CurrencyRef?.value || "USD",
    };
  }

  private mapBill(qbBill: QuickBooksBill): Bill {
    return {
      id: qbBill.Id,
      number: qbBill.DocNumber || "",
      date: new Date(qbBill.TxnDate),
      dueDate: qbBill.DueDate ? new Date(qbBill.DueDate) : undefined,
      vendorId: qbBill.VendorRef?.value || "",
      totalAmount: qbBill.TotalAmt || 0,
      status: qbBill.Balance === 0 ? "PAID" : "UNPAID",
      currencyCode: qbBill.CurrencyRef?.value || "USD",
    };
  }
}
