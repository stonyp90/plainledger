/**
 * Integration Provider Entity
 *
 * Represents a configurable accounting software integration.
 * Providers can be added/modified via database without code changes.
 */

export interface OAuthConfig {
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  responseType: "code" | "token";
  pkceRequired?: boolean;
  additionalParams?: Record<string, string>;
}

export interface ApiConfig {
  baseUrl: string;
  sandboxUrl?: string;
  version?: string;
  authHeader: "Bearer" | "Basic" | "Custom";
  rateLimitPerMinute?: number;
  paginationStyle: "offset" | "cursor" | "page" | "link";
  maxPageSize?: number;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: "string" | "number" | "date" | "boolean" | "currency" | "custom";
  customTransform?: string; // JavaScript expression for custom transforms
  required?: boolean;
  defaultValue?: unknown;
}

export interface EntityMapping {
  // API endpoint to fetch this entity
  endpoint: string;
  queryTemplate?: string; // e.g., "SELECT * FROM Account MAXRESULTS {limit}"

  // Field mappings from provider schema to PlainLedger silver schema
  fields: FieldMapping[];

  // How to identify records for deduplication
  idField: string;
  updatedAtField?: string;
}

export interface IntegrationProvider {
  // Unique identifier (e.g., 'quickbooks', 'xero', 'sage')
  id: string;

  // Display information
  name: string;
  nameFr?: string;
  description: string;
  descriptionFr?: string;
  logoUrl?: string;
  websiteUrl?: string;
  documentationUrl?: string;

  // Provider category
  category: "accounting" | "erp" | "banking" | "payroll" | "pos" | "ecommerce";

  // OAuth configuration
  oauth: OAuthConfig;

  // API configuration
  api: ApiConfig;

  // Entity mappings (how to extract and transform data)
  entityMappings: {
    accounts?: EntityMapping;
    contacts?: EntityMapping;
    customers?: EntityMapping;
    vendors?: EntityMapping;
    invoices?: EntityMapping;
    bills?: EntityMapping;
    payments?: EntityMapping;
    journalEntries?: EntityMapping;
    items?: EntityMapping;
    taxRates?: EntityMapping;
  };

  // Account type mappings (provider-specific to PlainLedger standard)
  accountTypeMapping: Record<
    string,
    "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"
  >;

  // Status
  isActive: boolean;
  isBeta?: boolean;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Default providers that come pre-configured
 */
export const DEFAULT_PROVIDERS: Partial<IntegrationProvider>[] = [
  {
    id: "quickbooks",
    name: "QuickBooks Online",
    nameFr: "QuickBooks en ligne",
    description: "Intuit QuickBooks accounting software",
    descriptionFr: "Logiciel comptable Intuit QuickBooks",
    category: "accounting",
    oauth: {
      authorizationUrl: "https://appcenter.intuit.com/connect/oauth2",
      tokenUrl: "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
      scopes: [
        "com.intuit.quickbooks.accounting",
        "openid",
        "profile",
        "email",
      ],
      responseType: "code",
    },
    api: {
      baseUrl: "https://quickbooks.api.intuit.com/v3/company",
      sandboxUrl: "https://sandbox-quickbooks.api.intuit.com/v3/company",
      authHeader: "Bearer",
      rateLimitPerMinute: 500,
      paginationStyle: "offset",
      maxPageSize: 1000,
    },
    entityMappings: {
      accounts: {
        endpoint: "/query",
        queryTemplate: "SELECT * FROM Account MAXRESULTS 1000",
        idField: "Id",
        updatedAtField: "MetaData.LastUpdatedTime",
        fields: [
          {
            sourceField: "Id",
            targetField: "source_account_id",
            required: true,
          },
          { sourceField: "Name", targetField: "account_name", required: true },
          { sourceField: "AcctNum", targetField: "account_code" },
          { sourceField: "AccountType", targetField: "source_account_type" },
          {
            sourceField: "AccountSubType",
            targetField: "source_account_subtype",
          },
          { sourceField: "Classification", targetField: "classification" },
          {
            sourceField: "Active",
            targetField: "is_active",
            transform: "boolean",
          },
          { sourceField: "CurrencyRef.value", targetField: "currency_code" },
          {
            sourceField: "MetaData.CreateTime",
            targetField: "source_created_at",
            transform: "date",
          },
          {
            sourceField: "MetaData.LastUpdatedTime",
            targetField: "source_updated_at",
            transform: "date",
          },
        ],
      },
      customers: {
        endpoint: "/query",
        queryTemplate: "SELECT * FROM Customer MAXRESULTS 1000",
        idField: "Id",
        updatedAtField: "MetaData.LastUpdatedTime",
        fields: [
          {
            sourceField: "Id",
            targetField: "source_contact_id",
            required: true,
          },
          {
            sourceField: "DisplayName",
            targetField: "display_name",
            required: true,
          },
          { sourceField: "CompanyName", targetField: "legal_name" },
          { sourceField: "GivenName", targetField: "first_name" },
          { sourceField: "FamilyName", targetField: "last_name" },
          { sourceField: "PrimaryEmailAddr.Address", targetField: "email" },
          { sourceField: "PrimaryPhone.FreeFormNumber", targetField: "phone" },
          { sourceField: "BillAddr.Line1", targetField: "address_line1" },
          { sourceField: "BillAddr.City", targetField: "address_city" },
          {
            sourceField: "BillAddr.CountrySubDivisionCode",
            targetField: "address_province_code",
          },
          {
            sourceField: "BillAddr.PostalCode",
            targetField: "address_postal_code",
          },
          { sourceField: "BillAddr.Country", targetField: "address_country" },
          {
            sourceField: "Active",
            targetField: "is_active",
            transform: "boolean",
          },
        ],
      },
      invoices: {
        endpoint: "/query",
        queryTemplate:
          "SELECT * FROM Invoice WHERE TxnDate >= '{startDate}' AND TxnDate <= '{endDate}' MAXRESULTS 1000",
        idField: "Id",
        updatedAtField: "MetaData.LastUpdatedTime",
        fields: [
          {
            sourceField: "Id",
            targetField: "source_transaction_id",
            required: true,
          },
          { sourceField: "DocNumber", targetField: "reference_number" },
          {
            sourceField: "TxnDate",
            targetField: "transaction_date",
            transform: "date",
          },
          {
            sourceField: "DueDate",
            targetField: "due_date",
            transform: "date",
          },
          {
            sourceField: "CustomerRef.value",
            targetField: "source_contact_id",
          },
          {
            sourceField: "TotalAmt",
            targetField: "total_amount",
            transform: "currency",
          },
          {
            sourceField: "Balance",
            targetField: "balance",
            transform: "currency",
          },
          { sourceField: "CurrencyRef.value", targetField: "currency_code" },
          {
            sourceField: "ExchangeRate",
            targetField: "exchange_rate",
            transform: "number",
          },
        ],
      },
      journalEntries: {
        endpoint: "/query",
        queryTemplate:
          "SELECT * FROM JournalEntry WHERE TxnDate >= '{startDate}' AND TxnDate <= '{endDate}' MAXRESULTS 1000",
        idField: "Id",
        updatedAtField: "MetaData.LastUpdatedTime",
        fields: [
          {
            sourceField: "Id",
            targetField: "source_transaction_id",
            required: true,
          },
          { sourceField: "DocNumber", targetField: "reference_number" },
          {
            sourceField: "TxnDate",
            targetField: "transaction_date",
            transform: "date",
          },
          { sourceField: "PrivateNote", targetField: "memo" },
          { sourceField: "CurrencyRef.value", targetField: "currency_code" },
        ],
      },
    },
    accountTypeMapping: {
      Asset: "ASSET",
      Liability: "LIABILITY",
      Equity: "EQUITY",
      Revenue: "REVENUE",
      Income: "REVENUE",
      Expense: "EXPENSE",
    },
    isActive: true,
  },
  {
    id: "xero",
    name: "Xero",
    nameFr: "Xero",
    description: "Cloud-based accounting platform",
    descriptionFr: "Plateforme comptable infonuagique",
    category: "accounting",
    oauth: {
      authorizationUrl: "https://login.xero.com/identity/connect/authorize",
      tokenUrl: "https://identity.xero.com/connect/token",
      scopes: [
        "openid",
        "profile",
        "email",
        "accounting.transactions.read",
        "accounting.contacts.read",
        "accounting.settings.read",
      ],
      responseType: "code",
      pkceRequired: true,
    },
    api: {
      baseUrl: "https://api.xero.com/api.xro/2.0",
      authHeader: "Bearer",
      rateLimitPerMinute: 60,
      paginationStyle: "page",
      maxPageSize: 100,
    },
    entityMappings: {
      accounts: {
        endpoint: "/Accounts",
        idField: "AccountID",
        updatedAtField: "UpdatedDateUTC",
        fields: [
          {
            sourceField: "AccountID",
            targetField: "source_account_id",
            required: true,
          },
          { sourceField: "Name", targetField: "account_name", required: true },
          { sourceField: "Code", targetField: "account_code" },
          { sourceField: "Type", targetField: "source_account_type" },
          { sourceField: "Class", targetField: "classification" },
          { sourceField: "Status", targetField: "status" },
          { sourceField: "CurrencyCode", targetField: "currency_code" },
          {
            sourceField: "UpdatedDateUTC",
            targetField: "source_updated_at",
            transform: "date",
          },
        ],
      },
      contacts: {
        endpoint: "/Contacts",
        idField: "ContactID",
        updatedAtField: "UpdatedDateUTC",
        fields: [
          {
            sourceField: "ContactID",
            targetField: "source_contact_id",
            required: true,
          },
          { sourceField: "Name", targetField: "display_name", required: true },
          { sourceField: "FirstName", targetField: "first_name" },
          { sourceField: "LastName", targetField: "last_name" },
          { sourceField: "EmailAddress", targetField: "email" },
          {
            sourceField: "IsCustomer",
            targetField: "is_customer",
            transform: "boolean",
          },
          {
            sourceField: "IsSupplier",
            targetField: "is_vendor",
            transform: "boolean",
          },
        ],
      },
      invoices: {
        endpoint: "/Invoices",
        idField: "InvoiceID",
        updatedAtField: "UpdatedDateUTC",
        fields: [
          {
            sourceField: "InvoiceID",
            targetField: "source_transaction_id",
            required: true,
          },
          { sourceField: "InvoiceNumber", targetField: "reference_number" },
          {
            sourceField: "Date",
            targetField: "transaction_date",
            transform: "date",
          },
          {
            sourceField: "DueDate",
            targetField: "due_date",
            transform: "date",
          },
          {
            sourceField: "Contact.ContactID",
            targetField: "source_contact_id",
          },
          {
            sourceField: "Total",
            targetField: "total_amount",
            transform: "currency",
          },
          {
            sourceField: "AmountDue",
            targetField: "balance",
            transform: "currency",
          },
          { sourceField: "CurrencyCode", targetField: "currency_code" },
        ],
      },
    },
    accountTypeMapping: {
      ASSET: "ASSET",
      BANK: "ASSET",
      CURRENT: "ASSET",
      FIXED: "ASSET",
      LIABILITY: "LIABILITY",
      CURRLIAB: "LIABILITY",
      TERMLIAB: "LIABILITY",
      EQUITY: "EQUITY",
      REVENUE: "REVENUE",
      SALES: "REVENUE",
      OTHERINCOME: "REVENUE",
      EXPENSE: "EXPENSE",
      DIRECTCOSTS: "EXPENSE",
      OVERHEADS: "EXPENSE",
    },
    isActive: true,
  },
];
