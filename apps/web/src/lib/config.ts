/**
 * PlainLedger Configuration System
 * Centralized configuration for all features and integrations
 */

// Environment-based configuration
export const config = {
  // App Info
  app: {
    name: 'PlainLedger',
    tagline: 'No surprises. Just numbers.',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    environment: import.meta.env.MODE || 'development',
  },

  // API Configuration
  api: {
    baseUrl: import.meta.env.VITE_API_URL || '',
    timeout: 30000,
  },

  // Keycloak/Auth Configuration
  auth: {
    url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
    realm: import.meta.env.VITE_KEYCLOAK_REALM || 'plainledger',
    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'plainledger-web',
  },

  // Power BI Configuration
  powerBI: {
    enabled: import.meta.env.VITE_POWERBI_ENABLED === 'true',
    embedUrl: import.meta.env.VITE_POWERBI_EMBED_URL || '',
    reportId: import.meta.env.VITE_POWERBI_REPORT_ID || '',
    groupId: import.meta.env.VITE_POWERBI_GROUP_ID || '',
    // Azure AD App Registration
    clientId: import.meta.env.VITE_POWERBI_CLIENT_ID || '',
    tenantId: import.meta.env.VITE_POWERBI_TENANT_ID || '',
    // Embedding mode: 'user' for user-owns-data, 'app' for app-owns-data
    embedMode: (import.meta.env.VITE_POWERBI_EMBED_MODE as 'user' | 'app') || 'app',
    // White label settings
    whiteLabel: {
      hideNavigation: import.meta.env.VITE_POWERBI_HIDE_NAV === 'true',
      hideFilterPane: import.meta.env.VITE_POWERBI_HIDE_FILTERS === 'true',
      customTheme: import.meta.env.VITE_POWERBI_CUSTOM_THEME || '',
    },
  },

  // Data Sources Configuration
  dataSources: {
    quickbooks: {
      enabled: import.meta.env.VITE_QUICKBOOKS_ENABLED === 'true',
      clientId: import.meta.env.VITE_QUICKBOOKS_CLIENT_ID || '',
      environment: import.meta.env.VITE_QUICKBOOKS_ENV || 'sandbox',
      scopes: ['com.intuit.quickbooks.accounting'],
    },
    xero: {
      enabled: import.meta.env.VITE_XERO_ENABLED === 'true',
      clientId: import.meta.env.VITE_XERO_CLIENT_ID || '',
      scopes: ['openid', 'profile', 'email', 'accounting.transactions', 'accounting.contacts'],
    },
    sage: {
      enabled: import.meta.env.VITE_SAGE_ENABLED === 'true',
      clientId: import.meta.env.VITE_SAGE_CLIENT_ID || '',
      country: import.meta.env.VITE_SAGE_COUNTRY || 'CA',
    },
    freshbooks: {
      enabled: import.meta.env.VITE_FRESHBOOKS_ENABLED === 'true',
      clientId: import.meta.env.VITE_FRESHBOOKS_CLIENT_ID || '',
    },
    wave: {
      enabled: import.meta.env.VITE_WAVE_ENABLED === 'true',
    },
    csv: {
      enabled: true, // Always enabled
      maxFileSizeMB: 10,
    },
  },

  // Data Lake Configuration
  dataLake: {
    enabled: import.meta.env.VITE_DATALAKE_ENABLED === 'true',
    provider: import.meta.env.VITE_DATALAKE_PROVIDER || 's3', // 's3' | 'azure' | 'gcs'
    bucket: import.meta.env.VITE_DATALAKE_BUCKET || '',
    region: import.meta.env.VITE_DATALAKE_REGION || 'ca-central-1',
  },

  // Feature Flags
  features: {
    anomalyDetection: import.meta.env.VITE_FEATURE_ANOMALY_DETECTION !== 'false',
    aiInsights: import.meta.env.VITE_FEATURE_AI === 'true',
    customReports: import.meta.env.VITE_FEATURE_CUSTOM_REPORTS === 'true',
    multiTenant: import.meta.env.VITE_FEATURE_MULTI_TENANT === 'true',
    auditLogs: import.meta.env.VITE_FEATURE_AUDIT_LOGS === 'true',
    webhooks: import.meta.env.VITE_FEATURE_WEBHOOKS === 'true',
  },

  // Branding Configuration (overridable per tenant)
  branding: {
    logo: import.meta.env.VITE_BRANDING_LOGO || '',
    primaryColor: import.meta.env.VITE_BRANDING_PRIMARY || '#1a1a1a',
    accentColor: import.meta.env.VITE_BRANDING_ACCENT || '#2563eb',
    favicon: import.meta.env.VITE_BRANDING_FAVICON || '/favicon.svg',
  },

  // Analytics & Monitoring
  analytics: {
    enabled: import.meta.env.VITE_ANALYTICS_ENABLED === 'true',
    provider: import.meta.env.VITE_ANALYTICS_PROVIDER || 'none', // 'none' | 'ga4' | 'mixpanel' | 'segment'
    id: import.meta.env.VITE_ANALYTICS_ID || '',
  },

  // Support & Help
  support: {
    email: import.meta.env.VITE_SUPPORT_EMAIL || 'support@plainledger.ca',
    infoEmail: import.meta.env.VITE_INFO_EMAIL || 'info@plainledger.ca',
    phone: import.meta.env.VITE_SUPPORT_PHONE || '418-564-6162',
    phoneTel: import.meta.env.VITE_SUPPORT_PHONE_TEL || '+14185646162',
    docsUrl: import.meta.env.VITE_DOCS_URL || 'https://docs.plainledger.ca',
    statusUrl: import.meta.env.VITE_STATUS_URL || 'https://status.plainledger.ca',
  },

  // Crisp Live Chat
  crisp: {
    enabled: import.meta.env.VITE_CRISP_ENABLED === 'true',
    websiteId: import.meta.env.VITE_CRISP_WEBSITE_ID || '',
  },
};

// Type for organization-specific overrides
export interface OrganizationConfig {
  branding?: {
    logo?: string;
    primaryColor?: string;
    accentColor?: string;
    favicon?: string;
  };
  features?: {
    [key: string]: boolean;
  };
  powerBI?: {
    reportId?: string;
    groupId?: string;
    customTheme?: string;
  };
}

// Merge organization config with base config
export function getOrganizationConfig(orgConfig?: OrganizationConfig) {
  if (!orgConfig) return config;

  return {
    ...config,
    branding: {
      ...config.branding,
      ...orgConfig.branding,
    },
    features: {
      ...config.features,
      ...orgConfig.features,
    },
    powerBI: {
      ...config.powerBI,
      ...orgConfig.powerBI,
    },
  };
}

// Check if a feature is enabled
export function isFeatureEnabled(featureName: keyof typeof config.features): boolean {
  return config.features[featureName] ?? false;
}

// Get data source config
export function getDataSourceConfig(provider: keyof typeof config.dataSources) {
  return config.dataSources[provider];
}

export default config;
