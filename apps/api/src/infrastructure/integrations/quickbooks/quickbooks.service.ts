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

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  QuickBooksAccount,
  QuickBooksCustomer,
  QuickBooksVendor,
  QuickBooksInvoice,
  QuickBooksBill,
  QuickBooksJournalEntry,
} from "@domain/datalake/provider-types";

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
      const error = await response.text();
      this.logger.error(`Token exchange failed: ${error}`);
      throw new Error(`Failed to exchange code: ${error}`);
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
      const error = await response.text();
      throw new Error(`Failed to refresh token: ${error}`);
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
    const url = `${this.getApiUrl(realmId, useSandbox)}${endpoint}`;

    this.logger.debug(`QuickBooks API: GET ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`QuickBooks API error: ${response.status} - ${error}`);
      throw new Error(`QuickBooks API error: ${response.status}`);
    }

    return response.json();
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
