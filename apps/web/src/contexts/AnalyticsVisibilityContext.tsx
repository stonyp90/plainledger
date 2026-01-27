import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTenant } from './TenantContext';
import { useKeycloak } from '../lib/keycloak';
import { api } from '../lib/api';

interface AnalyticsSectionConfig {
  enabled: boolean;
  visibleToRoles: string[];
}

interface OrganizationFeatures {
  id: string;
  organizationId: string;
  analytics: {
    plainledger: AnalyticsSectionConfig;
    powerbi: AnalyticsSectionConfig;
  };
  updatedBy: string;
  updatedAt: string;
}

interface AnalyticsVisibilityContextType {
  features: OrganizationFeatures | null;
  isLoading: boolean;
  isPlainLedgerEnabled: boolean;
  isPowerBIEnabled: boolean;
  canAccessPlainLedger: boolean;
  canAccessPowerBI: boolean;
  refreshFeatures: () => Promise<void>;
}

const AnalyticsVisibilityContext = createContext<AnalyticsVisibilityContextType | undefined>(undefined);

export function AnalyticsVisibilityProvider({ children }: { children: ReactNode }) {
  const { currentTenant } = useTenant();
  const { keycloak } = useKeycloak();
  const [features, setFeatures] = useState<OrganizationFeatures | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const userRoles = keycloak?.tokenParsed?.realm_access?.roles || [];

  const fetchFeatures = async () => {
    if (!currentTenant?.organizationId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // Note: This endpoint doesn't exist yet - using GET for now, will need PUT endpoint
      // For now, return defaults if 404
      try {
        const response = await api.get(`/analytics/org-features`, {
          params: { organizationId: currentTenant.organizationId }
        });
        setFeatures(response.data);
      } catch (error: any) {
        if (error.response?.status === 404) {
          // Use defaults - endpoint not implemented yet
          setFeatures({
            id: '',
            organizationId: currentTenant.organizationId,
            analytics: {
              plainledger: {
                enabled: true,
                visibleToRoles: ['plainledger_user', 'organization_admin', 'business_unit_admin'],
              },
              powerbi: {
                enabled: false,
                visibleToRoles: ['organization_admin', 'business_unit_admin'],
              },
            },
            updatedBy: '',
            updatedAt: new Date().toISOString(),
          });
        } else {
          console.error('Failed to fetch analytics features:', error);
        }
      }
      setFeatures(response.data);
    } catch (error: any) {
      // If features don't exist, use defaults
      if (error.response?.status === 404) {
        setFeatures({
          id: '',
          organizationId: currentTenant.organizationId,
          analytics: {
            plainledger: {
              enabled: true,
              visibleToRoles: ['plainledger_user', 'organization_admin', 'business_unit_admin'],
            },
            powerbi: {
              enabled: false,
              visibleToRoles: ['organization_admin', 'business_unit_admin'],
            },
          },
          updatedBy: '',
          updatedAt: new Date().toISOString(),
        });
      } else {
        console.error('Failed to fetch analytics features:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, [currentTenant?.organizationId]);

  const isPlainLedgerEnabled = features?.analytics.plainledger.enabled ?? true;
  const isPowerBIEnabled = features?.analytics.powerbi.enabled ?? false;

  const canAccessPlainLedger = isPlainLedgerEnabled && 
    (features?.analytics.plainledger.visibleToRoles.some(role => userRoles.includes(role)) ?? true);

  const canAccessPowerBI = isPowerBIEnabled && 
    (features?.analytics.powerbi.visibleToRoles.some(role => userRoles.includes(role)) ?? false);

  return (
    <AnalyticsVisibilityContext.Provider
      value={{
        features,
        isLoading,
        isPlainLedgerEnabled,
        isPowerBIEnabled,
        canAccessPlainLedger,
        canAccessPowerBI,
        refreshFeatures: fetchFeatures,
      }}
    >
      {children}
    </AnalyticsVisibilityContext.Provider>
  );
}

export function useAnalyticsVisibility() {
  const context = useContext(AnalyticsVisibilityContext);
  if (context === undefined) {
    throw new Error('useAnalyticsVisibility must be used within AnalyticsVisibilityProvider');
  }
  return context;
}
