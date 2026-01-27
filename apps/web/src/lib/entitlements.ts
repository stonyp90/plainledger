/**
 * PlainLedger Entitlements System
 * Manages feature access based on subscription tier
 */

// Subscription tiers
export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'enterprise';

// Feature flags
export interface Entitlements {
  // Data Sources
  maxDataSources: number;
  dataSources: {
    quickbooks: boolean;
    xero: boolean;
    sage: boolean;
    freshbooks: boolean;
    wave: boolean;
    csv: boolean;
  };
  
  // Reports
  maxReportsPerMonth: number;
  reportTypes: {
    balanceSheet: boolean;
    incomeStatement: boolean;
    cashFlow: boolean;
    customReports: boolean;
  };
  anomalyDetection: boolean;
  
  // Power BI
  powerBI: {
    enabled: boolean;
    embedded: boolean;
    whiteLabel: boolean;
    customThemes: boolean;
    maxDashboards: number;
  };
  
  // Data Lake
  dataLake: {
    enabled: boolean;
    maxStorageGB: number;
    queryAccess: boolean;
    aiInsights: boolean;
  };
  
  // Security & Compliance
  security: {
    sso: boolean;
    mfa: boolean;
    auditLogs: boolean;
    dataRetentionDays: number;
    customRoles: boolean;
  };
  
  // API Access
  api: {
    enabled: boolean;
    rateLimit: number; // requests per hour
    webhooks: boolean;
  };
  
  // Support
  support: {
    level: 'community' | 'email' | 'priority' | 'dedicated';
    sla: boolean;
    slaDays: number;
  };
  
  // Branding
  branding: {
    customLogo: boolean;
    customColors: boolean;
    customDomain: boolean;
    removeWatermark: boolean;
  };
}

// Tier configurations
const tierEntitlements: Record<SubscriptionTier, Entitlements> = {
  free: {
    maxDataSources: 1,
    dataSources: {
      quickbooks: true,
      xero: false,
      sage: false,
      freshbooks: false,
      wave: false,
      csv: true,
    },
    maxReportsPerMonth: 5,
    reportTypes: {
      balanceSheet: true,
      incomeStatement: true,
      cashFlow: false,
      customReports: false,
    },
    anomalyDetection: false,
    powerBI: {
      enabled: false,
      embedded: false,
      whiteLabel: false,
      customThemes: false,
      maxDashboards: 0,
    },
    dataLake: {
      enabled: false,
      maxStorageGB: 0,
      queryAccess: false,
      aiInsights: false,
    },
    security: {
      sso: false,
      mfa: true,
      auditLogs: false,
      dataRetentionDays: 30,
      customRoles: false,
    },
    api: {
      enabled: false,
      rateLimit: 0,
      webhooks: false,
    },
    support: {
      level: 'community',
      sla: false,
      slaDays: 0,
    },
    branding: {
      customLogo: false,
      customColors: false,
      customDomain: false,
      removeWatermark: false,
    },
  },
  
  starter: {
    maxDataSources: 2,
    dataSources: {
      quickbooks: true,
      xero: true,
      sage: false,
      freshbooks: false,
      wave: false,
      csv: true,
    },
    maxReportsPerMonth: 25,
    reportTypes: {
      balanceSheet: true,
      incomeStatement: true,
      cashFlow: true,
      customReports: false,
    },
    anomalyDetection: true,
    powerBI: {
      enabled: true,
      embedded: false,
      whiteLabel: false,
      customThemes: false,
      maxDashboards: 3,
    },
    dataLake: {
      enabled: true,
      maxStorageGB: 5,
      queryAccess: false,
      aiInsights: false,
    },
    security: {
      sso: false,
      mfa: true,
      auditLogs: true,
      dataRetentionDays: 90,
      customRoles: false,
    },
    api: {
      enabled: true,
      rateLimit: 100,
      webhooks: false,
    },
    support: {
      level: 'email',
      sla: false,
      slaDays: 0,
    },
    branding: {
      customLogo: false,
      customColors: false,
      customDomain: false,
      removeWatermark: false,
    },
  },
  
  professional: {
    maxDataSources: 10,
    dataSources: {
      quickbooks: true,
      xero: true,
      sage: true,
      freshbooks: true,
      wave: true,
      csv: true,
    },
    maxReportsPerMonth: -1, // unlimited
    reportTypes: {
      balanceSheet: true,
      incomeStatement: true,
      cashFlow: true,
      customReports: true,
    },
    anomalyDetection: true,
    powerBI: {
      enabled: true,
      embedded: true,
      whiteLabel: false,
      customThemes: true,
      maxDashboards: 10,
    },
    dataLake: {
      enabled: true,
      maxStorageGB: 50,
      queryAccess: true,
      aiInsights: true,
    },
    security: {
      sso: true,
      mfa: true,
      auditLogs: true,
      dataRetentionDays: 365,
      customRoles: true,
    },
    api: {
      enabled: true,
      rateLimit: 1000,
      webhooks: true,
    },
    support: {
      level: 'priority',
      sla: true,
      slaDays: 1,
    },
    branding: {
      customLogo: true,
      customColors: true,
      customDomain: false,
      removeWatermark: true,
    },
  },
  
  enterprise: {
    maxDataSources: -1, // unlimited
    dataSources: {
      quickbooks: true,
      xero: true,
      sage: true,
      freshbooks: true,
      wave: true,
      csv: true,
    },
    maxReportsPerMonth: -1,
    reportTypes: {
      balanceSheet: true,
      incomeStatement: true,
      cashFlow: true,
      customReports: true,
    },
    anomalyDetection: true,
    powerBI: {
      enabled: true,
      embedded: true,
      whiteLabel: true,
      customThemes: true,
      maxDashboards: -1,
    },
    dataLake: {
      enabled: true,
      maxStorageGB: -1,
      queryAccess: true,
      aiInsights: true,
    },
    security: {
      sso: true,
      mfa: true,
      auditLogs: true,
      dataRetentionDays: -1, // custom
      customRoles: true,
    },
    api: {
      enabled: true,
      rateLimit: -1,
      webhooks: true,
    },
    support: {
      level: 'dedicated',
      sla: true,
      slaDays: 0.5, // 12 hours
    },
    branding: {
      customLogo: true,
      customColors: true,
      customDomain: true,
      removeWatermark: true,
    },
  },
};

// Get entitlements for a tier
export function getEntitlements(tier: SubscriptionTier): Entitlements {
  return tierEntitlements[tier];
}

// Check if a feature is enabled
export function hasFeature(tier: SubscriptionTier, feature: string): boolean {
  const entitlements = getEntitlements(tier);
  const parts = feature.split('.');
  
  let current: any = entitlements;
  for (const part of parts) {
    if (current === undefined) return false;
    current = current[part];
  }
  
  if (typeof current === 'boolean') return current;
  if (typeof current === 'number') return current !== 0;
  return current !== undefined;
}

// Check if usage is within limits
export function isWithinLimit(tier: SubscriptionTier, limitKey: string, currentUsage: number): boolean {
  const entitlements = getEntitlements(tier);
  const parts = limitKey.split('.');
  
  let current: any = entitlements;
  for (const part of parts) {
    if (current === undefined) return false;
    current = current[part];
  }
  
  if (typeof current !== 'number') return false;
  if (current === -1) return true; // unlimited
  return currentUsage < current;
}

// Get remaining quota
export function getRemainingQuota(tier: SubscriptionTier, limitKey: string, currentUsage: number): number {
  const entitlements = getEntitlements(tier);
  const parts = limitKey.split('.');
  
  let current: any = entitlements;
  for (const part of parts) {
    if (current === undefined) return 0;
    current = current[part];
  }
  
  if (typeof current !== 'number') return 0;
  if (current === -1) return Infinity;
  return Math.max(0, current - currentUsage);
}

// Format limit for display
export function formatLimit(value: number): string {
  if (value === -1) return 'Illimité';
  if (value >= 1000) return `${value / 1000}K`;
  return value.toString();
}
