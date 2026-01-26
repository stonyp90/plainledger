/**
 * Application Configuration - Infrastructure Layer
 * 
 * Centralized configuration management with environment variable support.
 */

interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
  };
  keycloak: {
    url: string;
    realm: string;
    clientId: string;
  };
  stripe: {
    publishableKey: string;
  };
  features: {
    aiAssistant: boolean;
    multiCurrency: boolean;
    customReports: boolean;
  };
  analytics: {
    enabled: boolean;
    googleAnalyticsId?: string;
  };
}

function getEnvVar(key: string, defaultValue: string = ''): string {
  return import.meta.env[key] ?? defaultValue;
}

function getEnvBool(key: string, defaultValue: boolean = false): boolean {
  const value = import.meta.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
}

export const config: AppConfig = {
  api: {
    baseUrl: getEnvVar('VITE_API_URL', 'http://localhost:3001/api'),
    timeout: parseInt(getEnvVar('VITE_API_TIMEOUT', '30000'), 10),
  },
  keycloak: {
    url: getEnvVar('VITE_KEYCLOAK_URL', 'http://localhost:8080'),
    realm: getEnvVar('VITE_KEYCLOAK_REALM', 'plainledger'),
    clientId: getEnvVar('VITE_KEYCLOAK_CLIENT_ID', 'plainledger-web'),
  },
  stripe: {
    publishableKey: getEnvVar('VITE_STRIPE_PUBLISHABLE_KEY', ''),
  },
  features: {
    aiAssistant: getEnvBool('VITE_FEATURE_AI_ASSISTANT', true),
    multiCurrency: getEnvBool('VITE_FEATURE_MULTI_CURRENCY', true),
    customReports: getEnvBool('VITE_FEATURE_CUSTOM_REPORTS', true),
  },
  analytics: {
    enabled: getEnvBool('VITE_ANALYTICS_ENABLED', false),
    googleAnalyticsId: getEnvVar('VITE_GA_ID'),
  },
};

export default config;
