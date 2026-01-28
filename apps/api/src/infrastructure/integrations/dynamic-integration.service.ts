/**
 * Dynamic Integration Service
 *
 * A generic integration service that can connect to ANY accounting provider
 * based on configuration stored in the database.
 *
 * Benefits:
 * - Add new providers without code changes
 * - Update API endpoints/mappings without deployment
 * - Customer-specific OAuth apps (white-label)
 * - A/B testing of different field mappings
 */

import { Injectable, Logger } from "@nestjs/common";
import {
  IntegrationProvider,
  EntityMapping,
  FieldMapping,
  DEFAULT_PROVIDERS,
} from "@domain/entities/IntegrationProvider";

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  refreshExpiresAt?: Date;
  scope?: string;
  tokenType: string;
}

export interface ConnectionCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface TransformedRecord {
  [key: string]: unknown;
  _metadata: {
    sourceSystem: string;
    sourceId: string;
    fetchedAt: Date;
    qualityScore: number;
    qualityIssues: string[];
  };
}

@Injectable()
export class DynamicIntegrationService {
  private readonly logger = new Logger(DynamicIntegrationService.name);

  // In production, this would load from database
  private providers: Map<string, IntegrationProvider> = new Map();

  constructor() {
    // Initialize with default providers
    this.loadDefaultProviders();
  }

  /**
   * Load default providers (would be from database in production)
   */
  private loadDefaultProviders(): void {
    for (const provider of DEFAULT_PROVIDERS) {
      if (provider.id) {
        this.providers.set(provider.id, provider as IntegrationProvider);
      }
    }
    this.logger.log(`Loaded ${this.providers.size} integration providers`);
  }

  /**
   * Get a provider by ID
   */
  getProvider(providerId: string): IntegrationProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * List all active providers
   */
  listProviders(): IntegrationProvider[] {
    return Array.from(this.providers.values()).filter((p) => p.isActive);
  }

  /**
   * Register a new provider dynamically
   */
  registerProvider(provider: IntegrationProvider): void {
    this.providers.set(provider.id, provider);
    this.logger.log(`Registered new provider: ${provider.id}`);
  }

  /**
   * Update an existing provider's configuration
   */
  updateProvider(
    providerId: string,
    updates: Partial<IntegrationProvider>,
  ): void {
    const existing = this.providers.get(providerId);
    if (!existing) {
      throw new Error(`Provider not found: ${providerId}`);
    }
    this.providers.set(providerId, {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    });
    this.logger.log(`Updated provider: ${providerId}`);
  }

  // ===========================================================================
  // OAuth Methods
  // ===========================================================================

  /**
   * Generate OAuth authorization URL for any provider
   */
  generateAuthUrl(
    providerId: string,
    credentials: ConnectionCredentials,
    state: string,
  ): string {
    const provider = this.getProvider(providerId);
    if (!provider) {
      throw new Error(`Unknown provider: ${providerId}`);
    }

    const params = new URLSearchParams({
      client_id: credentials.clientId,
      redirect_uri: credentials.redirectUri,
      response_type: provider.oauth.responseType,
      scope: provider.oauth.scopes.join(" "),
      state,
      ...provider.oauth.additionalParams,
    });

    return `${provider.oauth.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    providerId: string,
    credentials: ConnectionCredentials,
    code: string,
  ): Promise<OAuthTokens> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      throw new Error(`Unknown provider: ${providerId}`);
    }

    const auth = Buffer.from(
      `${credentials.clientId}:${credentials.clientSecret}`,
    ).toString("base64");

    const response = await fetch(provider.oauth.tokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: credentials.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      refreshExpiresAt: data.x_refresh_token_expires_in
        ? new Date(Date.now() + data.x_refresh_token_expires_in * 1000)
        : undefined,
      scope: data.scope,
      tokenType: data.token_type || "Bearer",
    };
  }

  /**
   * Refresh access token
   */
  async refreshTokens(
    providerId: string,
    credentials: ConnectionCredentials,
    refreshToken: string,
  ): Promise<OAuthTokens> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      throw new Error(`Unknown provider: ${providerId}`);
    }

    const auth = Buffer.from(
      `${credentials.clientId}:${credentials.clientSecret}`,
    ).toString("base64");

    const response = await fetch(provider.oauth.tokenUrl, {
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
      throw new Error(`Token refresh failed: ${error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      tokenType: data.token_type || "Bearer",
    };
  }

  // ===========================================================================
  // Data Fetching Methods
  // ===========================================================================

  /**
   * Fetch entity data from any provider using configured mapping
   */
  async fetchEntity(
    providerId: string,
    entityType: keyof IntegrationProvider["entityMappings"],
    accessToken: string,
    context: {
      realmId?: string; // QuickBooks company ID
      tenantId?: string; // Xero tenant ID
      startDate?: string;
      endDate?: string;
    },
    useSandbox = false,
  ): Promise<TransformedRecord[]> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      throw new Error(`Unknown provider: ${providerId}`);
    }

    const mapping = provider.entityMappings[entityType];
    if (!mapping) {
      throw new Error(`No mapping for ${entityType} in provider ${providerId}`);
    }

    // Build API URL
    const baseUrl =
      useSandbox && provider.api.sandboxUrl
        ? provider.api.sandboxUrl
        : provider.api.baseUrl;

    let url = baseUrl;

    // Add realm/tenant ID for providers that need it
    if (context.realmId) {
      url = `${url}/${context.realmId}`;
    }

    // Add endpoint
    url = `${url}${mapping.endpoint}`;

    // Add query if template exists
    if (mapping.queryTemplate) {
      const query = mapping.queryTemplate
        .replace("{startDate}", context.startDate || "2020-01-01")
        .replace(
          "{endDate}",
          context.endDate || new Date().toISOString().split("T")[0],
        )
        .replace("{limit}", String(provider.api.maxPageSize || 1000));

      url = `${url}?query=${encodeURIComponent(query)}`;
    }

    this.logger.debug(`Fetching ${entityType} from ${url}`);

    // Make API request
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `${provider.api.authHeader} ${accessToken}`,
        Accept: "application/json",
        ...(context.tenantId ? { "Xero-tenant-id": context.tenantId } : {}),
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API request failed: ${response.status} - ${error}`);
    }

    const data = await response.json();

    // Extract records from response (different providers structure differently)
    const records = this.extractRecordsFromResponse(
      providerId,
      entityType,
      data,
    );

    // Transform records using field mappings
    return records.map((record) =>
      this.transformRecord(providerId, record, mapping),
    );
  }

  /**
   * Extract records from provider-specific response structure
   */
  private extractRecordsFromResponse(
    providerId: string,
    entityType: string,
    data: unknown,
  ): unknown[] {
    // Handle different response structures
    if (providerId === "quickbooks") {
      const qbData = data as { QueryResponse?: Record<string, unknown[]> };
      // QuickBooks returns { QueryResponse: { Account: [...] } }
      const key = this.getQuickBooksResponseKey(entityType);
      return qbData.QueryResponse?.[key] || [];
    }

    if (providerId === "xero") {
      // Xero returns { Accounts: [...] } or { Contacts: [...] }
      const xeroData = data as Record<string, unknown[]>;
      const key = this.getXeroResponseKey(entityType);
      return xeroData[key] || [];
    }

    // Generic: try common patterns
    if (Array.isArray(data)) {
      return data;
    }

    const objData = data as Record<string, unknown>;
    if (objData.data && Array.isArray(objData.data)) {
      return objData.data;
    }

    if (objData.items && Array.isArray(objData.items)) {
      return objData.items;
    }

    return [];
  }

  private getQuickBooksResponseKey(entityType: string): string {
    const mapping: Record<string, string> = {
      accounts: "Account",
      customers: "Customer",
      vendors: "Vendor",
      invoices: "Invoice",
      journalEntries: "JournalEntry",
      items: "Item",
    };
    return mapping[entityType] || entityType;
  }

  private getXeroResponseKey(entityType: string): string {
    const mapping: Record<string, string> = {
      accounts: "Accounts",
      contacts: "Contacts",
      invoices: "Invoices",
      items: "Items",
    };
    return mapping[entityType] || entityType;
  }

  /**
   * Transform a single record using field mappings
   */
  private transformRecord(
    providerId: string,
    record: unknown,
    mapping: EntityMapping,
  ): TransformedRecord {
    const result: TransformedRecord = {
      _metadata: {
        sourceSystem: providerId,
        sourceId: this.getNestedValue(record, mapping.idField) as string,
        fetchedAt: new Date(),
        qualityScore: 100,
        qualityIssues: [],
      },
    };

    for (const field of mapping.fields) {
      const sourceValue = this.getNestedValue(record, field.sourceField);

      // Check required fields
      if (
        field.required &&
        (sourceValue === undefined || sourceValue === null)
      ) {
        result._metadata.qualityIssues.push(
          `Missing required field: ${field.sourceField}`,
        );
        result._metadata.qualityScore -= 10;
      }

      // Transform value
      const transformedValue = this.transformValue(
        sourceValue,
        field.transform,
        field.defaultValue,
      );

      result[field.targetField] = transformedValue;
    }

    return result;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    const parts = path.split(".");
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  /**
   * Transform value based on type
   */
  private transformValue(
    value: unknown,
    transform?: string,
    defaultValue?: unknown,
  ): unknown {
    if (value === undefined || value === null) {
      return defaultValue ?? null;
    }

    switch (transform) {
      case "string":
        return String(value);

      case "number": {
        const num = Number(value);
        return isNaN(num) ? (defaultValue ?? 0) : num;
      }

      case "boolean":
        if (typeof value === "boolean") return value;
        if (typeof value === "string") {
          return value.toLowerCase() === "true" || value === "1";
        }
        return Boolean(value);

      case "date": {
        if (value instanceof Date) return value;
        const parsedDate = new Date(value as string);
        return isNaN(parsedDate.getTime()) ? null : parsedDate;
      }

      case "currency": {
        // Handle currency values (might be string or number)
        if (typeof value === "string") {
          return parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;
        }
        return Number(value) || 0;
      }

      default:
        return value;
    }
  }

  // ===========================================================================
  // Full Sync Method
  // ===========================================================================

  /**
   * Perform a full sync of all entities for a provider
   */
  async fullSync(
    providerId: string,
    accessToken: string,
    context: {
      realmId?: string;
      tenantId?: string;
      startDate?: string;
      endDate?: string;
    },
    useSandbox = false,
  ): Promise<{
    accounts: TransformedRecord[];
    contacts: TransformedRecord[];
    invoices: TransformedRecord[];
    journalEntries: TransformedRecord[];
  }> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      throw new Error(`Unknown provider: ${providerId}`);
    }

    this.logger.log(`Starting full sync for provider: ${providerId}`);

    const results: {
      accounts: TransformedRecord[];
      contacts: TransformedRecord[];
      invoices: TransformedRecord[];
      journalEntries: TransformedRecord[];
    } = {
      accounts: [],
      contacts: [],
      invoices: [],
      journalEntries: [],
    };

    // Fetch accounts
    if (provider.entityMappings.accounts) {
      try {
        results.accounts = await this.fetchEntity(
          providerId,
          "accounts",
          accessToken,
          context,
          useSandbox,
        );
        this.logger.log(`Fetched ${results.accounts.length} accounts`);
      } catch (error) {
        this.logger.error(`Failed to fetch accounts: ${error}`);
      }
    }

    // Fetch contacts (customers + vendors for some providers)
    if (provider.entityMappings.contacts) {
      try {
        results.contacts = await this.fetchEntity(
          providerId,
          "contacts",
          accessToken,
          context,
          useSandbox,
        );
        this.logger.log(`Fetched ${results.contacts.length} contacts`);
      } catch (error) {
        this.logger.error(`Failed to fetch contacts: ${error}`);
      }
    } else {
      // Fetch customers and vendors separately
      if (provider.entityMappings.customers) {
        try {
          const customers = await this.fetchEntity(
            providerId,
            "customers",
            accessToken,
            context,
            useSandbox,
          );
          results.contacts.push(...customers);
          this.logger.log(`Fetched ${customers.length} customers`);
        } catch (error) {
          this.logger.error(`Failed to fetch customers: ${error}`);
        }
      }

      if (provider.entityMappings.vendors) {
        try {
          const vendors = await this.fetchEntity(
            providerId,
            "vendors",
            accessToken,
            context,
            useSandbox,
          );
          results.contacts.push(...vendors);
          this.logger.log(`Fetched ${vendors.length} vendors`);
        } catch (error) {
          this.logger.error(`Failed to fetch vendors: ${error}`);
        }
      }
    }

    // Fetch invoices
    if (provider.entityMappings.invoices) {
      try {
        results.invoices = await this.fetchEntity(
          providerId,
          "invoices",
          accessToken,
          context,
          useSandbox,
        );
        this.logger.log(`Fetched ${results.invoices.length} invoices`);
      } catch (error) {
        this.logger.error(`Failed to fetch invoices: ${error}`);
      }
    }

    // Fetch journal entries
    if (provider.entityMappings.journalEntries) {
      try {
        results.journalEntries = await this.fetchEntity(
          providerId,
          "journalEntries",
          accessToken,
          context,
          useSandbox,
        );
        this.logger.log(
          `Fetched ${results.journalEntries.length} journal entries`,
        );
      } catch (error) {
        this.logger.error(`Failed to fetch journal entries: ${error}`);
      }
    }

    this.logger.log(
      `Full sync complete: ${results.accounts.length} accounts, ` +
        `${results.contacts.length} contacts, ${results.invoices.length} invoices, ` +
        `${results.journalEntries.length} journal entries`,
    );

    return results;
  }
}
