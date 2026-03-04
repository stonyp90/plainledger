/**
 * Account Data Access Hook
 *
 * Centralized logic for determining data access rules based on:
 * - Account tier (free, professional, enterprise)
 * - Datasource connection status
 *
 * Business Rules:
 * - FREE: Demo data only, cannot connect datasources, upgrade CTA
 * - PAID without connection: Blocked (show connection gate), no data
 * - PAID with connection: Real data only, tier-appropriate features
 */

import { useMemo } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useDataSources } from '../lib/graphql/hooks';
import { isMockAuthEnabled } from '../lib/keycloak';

export type AccountAccessType =
  | 'free-demo' // Free user - sees demo data only
  | 'paid-no-connection' // Paid user without datasource - blocked
  | 'paid-with-connection'; // Paid user with datasource - real data

export interface AccountDataAccessResult {
  /** The type of account access */
  accountType: AccountAccessType;

  /** Current plan (free, professional, enterprise) */
  plan: 'free' | 'professional' | 'enterprise';

  /** Whether user is on free tier */
  isFreeUser: boolean;

  /** Whether user is on paid tier (professional or enterprise) */
  isPaidUser: boolean;

  /** Whether user has a connected datasource */
  hasConnection: boolean;

  /** Whether datasources query is still loading */
  isLoading: boolean;

  // UI Control Flags

  /** Should the UI be blocked with connection gate? (paid users without connection) */
  shouldBlockUI: boolean;

  /** Can see demo/mock data? (free users only) */
  canSeeDemoData: boolean;

  /** Can see real data? (paid users with connection) */
  canSeeRealData: boolean;

  /** Can connect datasources? (paid users only) */
  canConnectDatasources: boolean;

  // CTA Flags

  /** Show upgrade CTA? (free users) */
  showUpgradeCTA: boolean;

  /** Show connection CTA? (paid users without connection) */
  showConnectionCTA: boolean;

  /** Show enterprise upgrade CTA? (pro users with connection) */
  showEnterpriseCTA: boolean;

  /** Show AI features upgrade? (pro users) */
  showAIUpgradeCTA: boolean;
}

/**
 * Hook to determine data access rules based on account tier and connection status
 */
export function useAccountDataAccess(): AccountDataAccessResult {
  const { currentTenant } = useTenant();
  const { data: dataSourcesQueryResult, loading: dataSourcesLoading } = useDataSources();

  // Determine plan
  const plan = (currentTenant?.plan || 'free') as 'free' | 'professional' | 'enterprise';
  const isFreeUser = plan === 'free';
  const isPaidUser = plan === 'professional' || plan === 'enterprise';
  const isEnterpriseUser = plan === 'enterprise';

  // Check if user has a connected datasource
  const hasConnection = useMemo(() => {
    if (dataSourcesLoading) return false;

    const dataSources = dataSourcesQueryResult?.dataSources;
    if (!dataSources || !Array.isArray(dataSources)) return false;

    return dataSources.some((ds: { provider: string; status: string }) => {
      const provider = (ds.provider || '').toLowerCase();
      const status = (ds.status || '').toUpperCase();
      const isConnected = status === 'CONNECTED' || status === 'ACTIVE' || status === 'connected';
      return (
        (provider === 'quickbooks' ||
          provider === 'xero' ||
          provider === 'sage' ||
          provider === 'freshbooks') &&
        isConnected
      );
    });
  }, [dataSourcesQueryResult, dataSourcesLoading]);

  // Determine account type
  const accountType = useMemo((): AccountAccessType => {
    if (isFreeUser) {
      return 'free-demo';
    }

    if (isPaidUser && !hasConnection) {
      return 'paid-no-connection';
    }

    return 'paid-with-connection';
  }, [isFreeUser, isPaidUser, hasConnection]);

  // UI Control flags
  // In mock auth mode (local dev), never block paid users - show demo data instead
  const shouldBlockUI =
    accountType === 'paid-no-connection' && !dataSourcesLoading && !isMockAuthEnabled();
  const canSeeDemoData = isFreeUser || isMockAuthEnabled();
  const canSeeRealData = isPaidUser && hasConnection;
  const canConnectDatasources = isPaidUser;

  // CTA flags
  const showUpgradeCTA = isFreeUser;
  const showConnectionCTA = isPaidUser && !hasConnection;
  const showEnterpriseCTA = plan === 'professional' && hasConnection;
  const showAIUpgradeCTA = plan === 'professional' && hasConnection;

  return {
    accountType,
    plan,
    isFreeUser,
    isPaidUser,
    hasConnection,
    isLoading: dataSourcesLoading,
    shouldBlockUI,
    canSeeDemoData,
    canSeeRealData,
    canConnectDatasources,
    showUpgradeCTA,
    showConnectionCTA,
    showEnterpriseCTA,
    showAIUpgradeCTA,
  };
}

export default useAccountDataAccess;
