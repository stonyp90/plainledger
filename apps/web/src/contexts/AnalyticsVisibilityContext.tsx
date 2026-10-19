import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTenant } from './TenantContext';
import api from '../lib/api';

interface AnalyticsSectionConfig { enabled: boolean; visibleToRoles: string[]; }
interface OrganizationFeatures {
  id: string; organizationId: string;
  analytics: { plainledger: AnalyticsSectionConfig; powerbi: AnalyticsSectionConfig; };
  updatedBy: string; updatedAt: string;
}
interface AnalyticsVisibilityContextType {
  features: OrganizationFeatures | null; isLoading: boolean; error: string | null;
  isPlainLedgerEnabled: boolean; isPowerBIEnabled: boolean;
  canAccessPlainLedger: boolean; canAccessPowerBI: boolean;
  refreshFeatures: () => Promise<void>;
}
const AnalyticsVisibilityContext = createContext<AnalyticsVisibilityContextType | undefined>(undefined);

export function AnalyticsVisibilityProvider({ children }: { children: ReactNode }) {
  const { currentTenant, hasPermission, hasEntitlement } = useTenant();
  const organizationId = currentTenant?.organizationId;
  const [features, setFeatures] = useState<OrganizationFeatures | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const fetchFeatures = useCallback(async () => {
    const currentGeneration = ++generation.current;
    setFeatures(null);
    setError(null);
    if (!organizationId) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const { data } = await api.get<OrganizationFeatures>('/analytics/org-features', { params: { organizationId } });
      if (currentGeneration !== generation.current) return;
      if (data.organizationId !== organizationId || !data.analytics ||
          typeof data.analytics.plainledger?.enabled !== 'boolean' || !Array.isArray(data.analytics.plainledger.visibleToRoles) ||
          typeof data.analytics.powerbi?.enabled !== 'boolean' || !Array.isArray(data.analytics.powerbi.visibleToRoles)) {
        throw new Error('The analytics configuration response is incomplete.');
      }
      setFeatures(data);
    } catch (cause) {
      if (currentGeneration === generation.current) setError(cause instanceof Error ? cause.message : 'Unable to load analytics configuration.');
    } finally { if (currentGeneration === generation.current) setIsLoading(false); }
  }, [organizationId]);
  useEffect(() => { void fetchFeatures(); return () => { generation.current += 1; }; }, [fetchFeatures]);

  const scopedFeatures = features?.organizationId === organizationId ? features : null;
  const isPlainLedgerEnabled = scopedFeatures?.analytics.plainledger.enabled === true;
  const isPowerBIEnabled = scopedFeatures?.analytics.powerbi.enabled === true && hasEntitlement('feature:power-bi');
  // Role is loaded from current membership, so stale token roles cannot grant UI access.
  const roles = currentTenant ? [currentTenant.role, ...(currentTenant.role === 'owner' || currentTenant.role === 'admin' ? ['organization_admin'] : []), 'plainledger_user'] : [];
  const allowed = (section?: AnalyticsSectionConfig) => Boolean(section?.visibleToRoles.some(role => roles.includes(role)));
  return <AnalyticsVisibilityContext.Provider value={{
    features: scopedFeatures, isLoading, error, isPlainLedgerEnabled, isPowerBIEnabled,
    canAccessPlainLedger: isPlainLedgerEnabled && hasPermission('view:dashboard') && allowed(scopedFeatures?.analytics.plainledger),
    canAccessPowerBI: isPowerBIEnabled && hasPermission('view:reports') && allowed(scopedFeatures?.analytics.powerbi),
    refreshFeatures: fetchFeatures,
  }}>{children}</AnalyticsVisibilityContext.Provider>;
}
export function useAnalyticsVisibility() {
  const context = useContext(AnalyticsVisibilityContext);
  if (!context) throw new Error('useAnalyticsVisibility must be used within AnalyticsVisibilityProvider');
  return context;
}
