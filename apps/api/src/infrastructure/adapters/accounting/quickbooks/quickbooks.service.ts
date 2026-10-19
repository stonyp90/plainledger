/**
 * QuickBooks Online Integration Service
 *
 * Handles OAuth 2.0 authentication and API calls to QuickBooks Online.
 * Supports sandbox and production environments.
 *
 * OAuth Flow:
 * 1. Generate authorization URL → User authorizes
 * 2. Exchange authorization code for tokens
 * 3. Use access token for API calls
 * 4. Refresh tokens when expired
 */

import { Injectable, Logger, ServiceUnavailableException, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  QuickBooksAccount,
  QuickBooksCustomer,
  QuickBooksVendor,
  QuickBooksInvoice,
  QuickBooksBill,
  QuickBooksJournalEntry,
} from "@domain/datalake/provider-types";
import { QuickBooksRawReportResponse } from '@domain/datalake/bronze-quickbooks-reports';
import { QuickBooksReportLimitError, validAccountingDate } from './quickbooks-ledger';

export interface QuickBooksAccountingPreferences {
  homeCurrency: string;
  multiCurrency: boolean;
}

export interface QuickBooksTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  realmId: string; // Company ID
}

export interface QuickBooksCompanyInfo {
  companyName: string;
  legalName: string;
  country: string;
  fiscalYearStartMonth: string;
}

@Injectable()
export class QuickBooksService {
  private readonly logger = new Logger(QuickBooksService.name);

  // OAuth endpoints
  private readonly authBaseUrl = "https://appcenter.intuit.com/connect/oauth2";
  private readonly tokenUrl =
    "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

  // API endpoints (sandbox vs production)
  private readonly sandboxApiUrl =
    "https://sandbox-quickbooks.api.intuit.com/v3/company";
  private readonly productionApiUrl =
    "https://quickbooks.api.intuit.com/v3/company";

  constructor(private readonly configService: ConfigService) {}

  // ===========================================================================
  // OAuth Flow
  // ===========================================================================

  /**
   * Generate OAuth authorization URL
   */
  getAuthorizationUrl(state: string): string {
    const clientId = this.configService.get<string>("QUICKBOOKS_CLIENT_ID");
    const redirectUri = this.configService.get<string>(
      "QUICKBOOKS_REDIRECT_URI",
    );

    const scopes = [
      "com.intuit.quickbooks.accounting",
      "openid",
      "profile",
      "email",
    ];

    const params = new URLSearchParams({
      client_id: clientId!,
      redirect_uri: redirectUri!,
      response_type: "code",
      scope: scopes.join(" "),
      state,
    });

    return `${this.authBaseUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    code: string,
    realmId: string,
  ): Promise<QuickBooksTokens> {
    const clientId = this.configService.get<string>("QUICKBOOKS_CLIENT_ID");
    const clientSecret = this.configService.get<string>(
      "QUICKBOOKS_CLIENT_SECRET",
    );
    const redirectUri = this.configService.get<string>(
      "QUICKBOOKS_REDIRECT_URI",
    );

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri!,
      }),
    });

    if (!response.ok) {
      await response.body?.cancel();
      throw new ServiceUnavailableException(`QuickBooks authorization failed (HTTP ${response.status})`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      accessTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
      refreshTokenExpiresAt: new Date(
        Date.now() + data.x_refresh_token_expires_in * 1000,
      ),
      realmId,
    };
  }

  /**
   * Refresh access token
   */
  async refreshTokens(refreshToken: string): Promise<QuickBooksTokens> {
    const clientId = this.configService.get<string>("QUICKBOOKS_CLIENT_ID");
    const clientSecret = this.configService.get<string>(
      "QUICKBOOKS_CLIENT_SECRET",
    );

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      await response.body?.cancel();
      throw new ServiceUnavailableException(`QuickBooks token refresh failed (HTTP ${response.status})`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      accessTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
      refreshTokenExpiresAt: new Date(
        Date.now() + data.x_refresh_token_expires_in * 1000,
      ),
      realmId: "", // Will be filled by caller
    };
  }

  // ===========================================================================
  // API Calls
  // ===========================================================================

  /**
   * Get API base URL (sandbox or production)
   */
  private getApiUrl(realmId: string, useSandbox = true): string {
    const baseUrl = useSandbox ? this.sandboxApiUrl : this.productionApiUrl;
    return `${baseUrl}/${realmId}`;
  }

  /**
   * Make authenticated API request
   */
  private async apiRequest<T>(
    accessToken: string,
    realmId: string,
    endpoint: string,
    useSandbox = true,
  ): Promise<T> {
    if (!/^\d{1,32}$/.test(realmId) || !accessToken || accessToken.length > 32768 || !endpoint.startsWith('/')) {
      throw new BadRequestException('Invalid accounting provider request');
    }
    const url = `${this.getApiUrl(realmId, useSandbox)}${endpoint}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(url, {
        method: 'GET', redirect: 'error', signal: controller.signal,
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      });
      if (!response.ok) throw new ServiceUnavailableException(`QuickBooks request failed (HTTP ${response.status}); no snapshot was published`);
      const limit = 32 * 1024 * 1024;
      const length = response.headers.get('content-length');
      if (length && (!/^\d+$/.test(length) || Number(length) > limit)) {
        await response.body?.cancel(); throw new QuickBooksReportLimitError();
      }
      if (!response.body) throw new ServiceUnavailableException('QuickBooks returned an empty response body');
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
        bytes += chunk.byteLength;
        if (bytes > limit) { controller.abort(); throw new QuickBooksReportLimitError(); }
        chunks.push(chunk);
      }
      let data: unknown;
      try { data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))); }
      catch { throw new ServiceUnavailableException('QuickBooks returned malformed JSON'); }
      if (!data || typeof data !== 'object' || Array.isArray(data) || 'Fault' in data) throw new ServiceUnavailableException('QuickBooks did not return the requested accounting data');
      return data as T;
    } catch (error) {
      if (error instanceof ServiceUnavailableException || error instanceof QuickBooksReportLimitError) throw error;
      // Never forward provider response bodies, URLs, credentials or raw transport errors.
      throw new ServiceUnavailableException('QuickBooks is unavailable or timed out; no snapshot was published');
    } finally { clearTimeout(timeout); }
  }

  async getAccountingPreferences(accessToken: string, realmId: string, useSandbox: boolean): Promise<QuickBooksAccountingPreferences> {
    const result = await this.apiRequest<{ Preferences?: { CurrencyPrefs?: { HomeCurrency?: { value?: string }; MultiCurrencyEnabled?: boolean } } }>(accessToken, realmId, '/preferences', useSandbox);
    const currency = result.Preferences?.CurrencyPrefs;
    if (!currency || typeof currency.MultiCurrencyEnabled !== 'boolean' || !/^[A-Z]{3}$/.test(currency.HomeCurrency?.value || '')) {
      throw new ServiceUnavailableException('QuickBooks currency preferences are incomplete');
    }
    return { homeCurrency: currency.HomeCurrency!.value!, multiCurrency: currency.MultiCurrencyEnabled };
  }

  /** Complete name-list query, including inactive accounts used by old postings. */
  async getLedgerAccounts(accessToken: string, realmId: string, useSandbox: boolean): Promise<QuickBooksAccount[]> {
    const records: QuickBooksAccount[] = [];
    const seen = new Set<string>();
    for (let start = 1; start <= 20_001; start += 1000) {
      const query = `SELECT * FROM Account WHERE Active IN (true, false) ORDERBY Id STARTPOSITION ${start} MAXRESULTS 1000`;
      const response = await this.apiRequest<{ QueryResponse?: { Account?: QuickBooksAccount[]; startPosition?: number; maxResults?: number } }>(accessToken, realmId, '/query?query=' + encodeURIComponent(query), useSandbox);
      const page = response.QueryResponse;
      if (!page || (page.Account !== undefined && !Array.isArray(page.Account)) || (page.startPosition !== undefined && page.startPosition !== start)) throw new ServiceUnavailableException('QuickBooks account pagination is invalid');
      const rows = page.Account || [];
      if (rows.length > 1000 || (page.maxResults !== undefined && page.maxResults !== rows.length)) throw new ServiceUnavailableException('QuickBooks account page is inconsistent');
      for (const row of rows) {
        if (!row || typeof row.Id !== 'string' || !row.Id || seen.has(row.Id)) throw new ServiceUnavailableException('QuickBooks account pages contain missing or repeated identifiers');
        seen.add(row.Id); records.push(row);
        if (records.length > 20_000) throw new QuickBooksReportLimitError();
      }
      if (rows.length < 1000) return records;
    }
    throw new QuickBooksReportLimitError();
  }

  async getGeneralLedger(accessToken: string, realmId: string, startDate: string, endDate: string, useSandbox: boolean): Promise<QuickBooksRawReportResponse> {
    return this.getLedgerReport('GeneralLedger', accessToken, realmId, startDate, endDate, useSandbox);
  }

  async getTrialBalance(accessToken: string, realmId: string, startDate: string, endDate: string, useSandbox: boolean): Promise<QuickBooksRawReportResponse> {
    return this.getLedgerReport('TrialBalance', accessToken, realmId, startDate, endDate, useSandbox);
  }

  private getLedgerReport(name: 'GeneralLedger' | 'TrialBalance', accessToken: string, realmId: string, startDate: string, endDate: string, useSandbox: boolean): Promise<QuickBooksRawReportResponse> {
    if (!validAccountingDate(startDate) || !validAccountingDate(endDate) || startDate > endDate) throw new BadRequestException('Invalid accounting report dates');
    const params = new URLSearchParams({ start_date: startDate, end_date: endDate, accounting_method: 'Accrual' });
    if (name === 'GeneralLedger') params.set('columns', 'tx_date,txn_type,doc_num,memo,debt_amt,credit_amt,debt_home_amt,credit_home_amt');
    return this.apiRequest(accessToken, realmId, `/reports/${name}?${params}`, useSandbox);
  }

  /**
   * Get company info
   */
  async getCompanyInfo(
    accessToken: string,
    realmId: string,
    useSandbox = true,
  ): Promise<QuickBooksCompanyInfo> {
    const response = await this.apiRequest<{
      CompanyInfo: {
        CompanyName: string;
        LegalName: string;
        Country: string;
        FiscalYearStartMonth: string;
      };
    }>(accessToken, realmId, "/companyinfo/" + realmId, useSandbox);

    return {
      companyName: response.CompanyInfo.CompanyName,
      legalName: response.CompanyInfo.LegalName,
      country: response.CompanyInfo.Country,
      fiscalYearStartMonth: response.CompanyInfo.FiscalYearStartMonth,
    };
  }

  /**
   * Get all accounts (Chart of Accounts)
   */
  async getAccounts(
    accessToken: string,
    realmId: string,
    useSandbox = true,
  ): Promise<QuickBooksAccount[]> {
    const response = await this.apiRequest<{
      QueryResponse: { Account: QuickBooksAccount[] };
    }>(
      accessToken,
      realmId,
      "/query?query=" +
        encodeURIComponent("SELECT * FROM Account MAXRESULTS 1000"),
      useSandbox,
    );

    return response.QueryResponse.Account || [];
  }

  /**
   * Get all customers
   */
  async getCustomers(
    accessToken: string,
    realmId: string,
    useSandbox = true,
  ): Promise<QuickBooksCustomer[]> {
    const response = await this.apiRequest<{
      QueryResponse: { Customer: QuickBooksCustomer[] };
    }>(
      accessToken,
      realmId,
      "/query?query=" +
        encodeURIComponent("SELECT * FROM Customer MAXRESULTS 1000"),
      useSandbox,
    );

    return response.QueryResponse.Customer || [];
  }

  /**
   * Get all vendors
   */
  async getVendors(
    accessToken: string,
    realmId: string,
    useSandbox = true,
  ): Promise<QuickBooksVendor[]> {
    const response = await this.apiRequest<{
      QueryResponse: { Vendor: QuickBooksVendor[] };
    }>(
      accessToken,
      realmId,
      "/query?query=" +
        encodeURIComponent("SELECT * FROM Vendor MAXRESULTS 1000"),
      useSandbox,
    );

    return response.QueryResponse.Vendor || [];
  }

  /**
   * Get invoices within a date range
   */
  async getInvoices(
    accessToken: string,
    realmId: string,
    startDate: string,
    endDate: string,
    useSandbox = true,
  ): Promise<QuickBooksInvoice[]> {
    const query = `SELECT * FROM Invoice WHERE TxnDate >= '${startDate}' AND TxnDate <= '${endDate}' MAXRESULTS 1000`;

    const response = await this.apiRequest<{
      QueryResponse: { Invoice: QuickBooksInvoice[] };
    }>(
      accessToken,
      realmId,
      "/query?query=" + encodeURIComponent(query),
      useSandbox,
    );

    return response.QueryResponse.Invoice || [];
  }

  /**
   * Get journal entries within a date range
   */
  async getJournalEntries(
    accessToken: string,
    realmId: string,
    startDate: string,
    endDate: string,
    useSandbox = true,
  ): Promise<QuickBooksJournalEntry[]> {
    const query = `SELECT * FROM JournalEntry WHERE TxnDate >= '${startDate}' AND TxnDate <= '${endDate}' MAXRESULTS 1000`;

    const response = await this.apiRequest<{
      QueryResponse: { JournalEntry: QuickBooksJournalEntry[] };
    }>(
      accessToken,
      realmId,
      "/query?query=" + encodeURIComponent(query),
      useSandbox,
    );

    return response.QueryResponse.JournalEntry || [];
  }

  /**
   * Get bills (vendor invoices) within a date range
   */
  async getBills(
    accessToken: string,
    realmId: string,
    startDate: string,
    endDate: string,
    useSandbox = true,
  ): Promise<QuickBooksBill[]> {
    const query = `SELECT * FROM Bill WHERE TxnDate >= '${startDate}' AND TxnDate <= '${endDate}' MAXRESULTS 1000`;

    const response = await this.apiRequest<{
      QueryResponse: { Bill: QuickBooksBill[] };
    }>(
      accessToken,
      realmId,
      "/query?query=" + encodeURIComponent(query),
      useSandbox,
    );

    return response.QueryResponse.Bill || [];
  }

  /**
   * Get all data for full sync
   */
  async getFullSync(
    accessToken: string,
    realmId: string,
    startDate: string,
    endDate: string,
    useSandbox = true,
  ): Promise<{
    companyInfo: QuickBooksCompanyInfo;
    accounts: QuickBooksAccount[];
    customers: QuickBooksCustomer[];
    vendors: QuickBooksVendor[];
    invoices: QuickBooksInvoice[];
    bills: QuickBooksBill[];
    journalEntries: QuickBooksJournalEntry[];
  }> {
    this.logger.log(`Starting full sync for realm ${realmId}`);

    const [
      companyInfo,
      accounts,
      customers,
      vendors,
      invoices,
      bills,
      journalEntries,
    ] = await Promise.all([
      this.getCompanyInfo(accessToken, realmId, useSandbox),
      this.getAccounts(accessToken, realmId, useSandbox),
      this.getCustomers(accessToken, realmId, useSandbox),
      this.getVendors(accessToken, realmId, useSandbox),
      this.getInvoices(accessToken, realmId, startDate, endDate, useSandbox),
      this.getBills(accessToken, realmId, startDate, endDate, useSandbox),
      this.getJournalEntries(
        accessToken,
        realmId,
        startDate,
        endDate,
        useSandbox,
      ),
    ]);

    this.logger.log(
      `Full sync complete: ${accounts.length} accounts, ${customers.length} customers, ${vendors.length} vendors, ${invoices.length} invoices, ${bills.length} bills, ${journalEntries.length} journal entries`,
    );

    return {
      companyInfo,
      accounts,
      customers,
      vendors,
      invoices,
      bills,
      journalEntries,
    };
  }
}
