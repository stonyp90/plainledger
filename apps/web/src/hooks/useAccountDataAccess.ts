/** Ledger access follows the authenticated organization. Connection setup and premium capabilities remain separate. */

import { useMemo } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useDataSources } from '../lib/graphql/hooks';
import { isMockAuthEnabled } from '../lib/keycloak';

export type AccountAccessType =
  | 'free-real'
  | 'free-demo' // Explicit development sample session
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

  /** External connections must not hide an existing posted ledger. */
  shouldBlockUI: boolean;

  /** Can see explicitly enabled development sample data? */
  canSeeDemoData: boolean;

  /** Can request the authenticated organization’s real data? */
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
      return isMockAuthEnabled() ? 'free-demo' : 'free-real';
    }

    if (isPaidUser && !hasConnection) {
      return 'paid-no-connection';
    }

    return 'paid-with-connection';
  }, [isFreeUser, isPaidUser, hasConnection]);

  // A manual/imported ledger remains usable without an external accounting connection.
  // Authentication and server authorization protect it; pricing does not replace it with samples.
  const shouldBlockUI = false;
  const canSeeDemoData = isMockAuthEnabled();
  const canSeeRealData = !!currentTenant && !canSeeDemoData;
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
