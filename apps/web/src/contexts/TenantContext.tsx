import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from 'react';
import { useAuth, isMockAuthEnabled } from '../lib/keycloak';
import { setActiveOrganizationId } from '../lib/graphql/client';
import api from '../lib/api';

// Types
export interface Tenant {
  /** Stable, verified tenant slug used for request and data-lake scoping. */
  id: string;
  /** Database organization UUID. Never substitute it for the tenant claim. */
  organizationId?: string;
  name: string;
  slug: string;
  logo?: string;
  primaryColor?: string;
  plan: 'free' | 'professional' | 'enterprise';
  status: 'active' | 'suspended';
  createdAt: string;
  settings: TenantSettings;
  limits: TenantLimits;
  members: number;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  // Organization market/industry information
  industry?: string;
  region?: string; // e.g., 'canada', 'quebec', 'ontario'
  province?: string;
}

export interface TenantSettings {
  locale: string;
  timezone: string;
  currency: string;
  fiscalYearEnd: string; // MM-DD format
  dateFormat: string;
  numberFormat: string;
  demoMode?: boolean; // Demo mode enabled
  features: {
    powerBI: boolean;
    aiInsights: boolean;
    customReports: boolean;
    apiAccess: boolean;
    auditLogs: boolean;
    webhooks: boolean;
    sso: boolean;
    /** Decision capture feature - must be manually enabled per organization */
    decisionCapture: boolean;
  };
  notifications: {
    emailDigest: 'daily' | 'weekly' | 'never';
    anomalyAlerts: boolean;
    reportReady: boolean;
    syncErrors: boolean;
  };
  branding?: {
    logo?: string;
    primaryColor?: string;
    accentColor?: string;
  };
}

export interface TenantLimits {
  users: number;
  connections: number;
  reports: number;
  storage: number; // in MB
  apiCalls: number; // per month
  currentUsage: {
    users: number;
    connections: number;
    reports: number;
    storage: number;
    apiCalls: number;
  };
}

export interface TenantMember {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'active' | 'pending' | 'suspended';
  invitedAt?: string;
  joinedAt?: string;
  lastActiveAt?: string;
}

export interface TenantInvitation {
  id: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
}

interface TenantContextType {
  // Current tenant
  currentTenant: Tenant | null;
  setCurrentTenant: (tenant: Tenant | null) => void;

  // Available tenants for user
  tenants: Tenant[];
  isLoading: boolean;
  error: string | null;

  // Tenant operations
  switchTenant: (tenantId: string) => Promise<void>;
  refreshTenants: () => Promise<void>;
  createTenant: (data: CreateTenantData) => Promise<Tenant>;
  updateTenantSettings: (settings: Partial<TenantSettings>) => Promise<void>;

  // Member operations
  getMembers: () => Promise<TenantMember[]>;
  inviteMember: (email: string, role: TenantMember['role']) => Promise<TenantInvitation>;
  updateMemberRole: (memberId: string, role: TenantMember['role']) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;

  // Invitation operations
  getInvitations: () => Promise<TenantInvitation[]>;
  revokeInvitation: (invitationId: string) => Promise<void>;
  resendInvitation: (invitationId: string) => Promise<void>;

  // Permission checks
  hasPermission: (permission: Permission) => boolean;
  hasEntitlement: (entitlement: string) => boolean;
  isWithinLimit: (limitKey: string, currentUsage: number) => boolean;
  canManageMembers: boolean;
  canManageSettings: boolean;
  canManageBilling: boolean;
  isOwner: boolean;
  isAdmin: boolean;

  // Internal staff check - for PlainLedger employees only
  // Used to show/hide technical configuration that customers shouldn't see
  isInternalStaff: boolean;
}

export interface CreateTenantData {
  name: string;
  slug?: string;
  settings?: Partial<TenantSettings>;
}

export type Permission =
  | 'view:dashboard'
  | 'view:reports'
  | 'create:reports'
  | 'delete:reports'
  | 'view:connections'
  | 'manage:connections'
  | 'view:settings'
  | 'manage:settings'
  | 'view:members'
  | 'manage:members'
  | 'manage:billing'
  | 'view:audit-logs'
  | 'use:api'
  | 'customize:dashboard';

// Fallback role-based permissions (used if API fails)
const ROLE_PERMISSIONS: Record<TenantMember['role'], Permission[]> = {
  owner: [
    'view:dashboard',
    'view:reports',
    'create:reports',
    'delete:reports',
    'view:connections',
    'manage:connections',
    'view:settings',
    'manage:settings',
    'view:members',
    'manage:members',
    'manage:billing',
    'view:audit-logs',
    'use:api',
    'customize:dashboard',
  ],
  admin: [
    'view:dashboard',
    'view:reports',
    'create:reports',
    'delete:reports',
    'view:connections',
    'manage:connections',
    'view:settings',
    'manage:settings',
    'view:members',
    'manage:members',
    'view:audit-logs',
    'use:api',
    'customize:dashboard',
  ],
  member: [
    'view:dashboard',
    'view:reports',
    'create:reports',
    'view:connections',
    'view:settings',
    'view:members',
    'use:api',
    'customize:dashboard',
  ],
  viewer: ['view:dashboard', 'view:reports', 'view:connections', 'view:members'],
};

// Default tenant settings
const DEFAULT_SETTINGS: TenantSettings = {
  locale: 'fr-CA',
  timezone: 'America/Toronto',
  currency: 'CAD',
  fiscalYearEnd: '12-31',
  dateFormat: 'YYYY-MM-DD',
  numberFormat: '1 234,56',
  features: {
    powerBI: false,
    aiInsights: false,
    customReports: false,
    apiAccess: false,
    auditLogs: false,
    webhooks: false,
    sso: false,
    decisionCapture: false, // Must be manually enabled per organization
  },
  notifications: {
    emailDigest: 'weekly',
    anomalyAlerts: true,
    reportReady: true,
    syncErrors: true,
  },
};

// Plan-based limits
// Note: Free tier has 0 connections - cannot connect datasources
const PLAN_LIMITS: Record<Tenant['plan'], Omit<TenantLimits, 'currentUsage'>> = {
  free: { users: 1, connections: 0, reports: 5, storage: 100, apiCalls: 100 },
  professional: { users: 10, connections: 10, reports: 100, storage: 10000, apiCalls: 10000 },
  enterprise: { users: -1, connections: -1, reports: -1, storage: -1, apiCalls: -1 }, // Unlimited
};

// Storage keys
const STORAGE_KEY = 'plainledger-current-tenant';

// Feature settings for different plans
// Note: decisionCapture is always false by default - must be manually enabled per org
const FREE_FEATURES: TenantSettings['features'] = {
  powerBI: false,
  aiInsights: false,
  customReports: false,
  apiAccess: false,
  auditLogs: false,
  webhooks: false,
  sso: false,
  decisionCapture: false,
};

const PROFESSIONAL_FEATURES: TenantSettings['features'] = {
  powerBI: false,
  aiInsights: true,
  customReports: true,
  apiAccess: true,
  auditLogs: false,
  webhooks: false,
  sso: false,
  decisionCapture: false, // Must be manually enabled even for professional plans
};

const ENTERPRISE_FEATURES: TenantSettings['features'] = {
  powerBI: true,
  aiInsights: true,
  customReports: true,
  apiAccess: true,
  auditLogs: true,
  webhooks: true,
  sso: true,
  decisionCapture: false, // Must be manually enabled even for enterprise plans
};

// Mock data for development - One demo organization per tier
// Login credentials:
//   Free:       demo-free@plainledger.ca / DemoFree123!@#
//   Pro:        demo-pro@plainledger.ca / DemoPro123!@#
//   Enterprise: demo@plainledger.ca / DemoPass123!@#
const MOCK_TENANTS: Tenant[] = [
  {
    id: 'demo-free', // Free tier demo organization
    name: 'Demo Free Co.',
    slug: 'demo-free',
    plan: 'free',
    status: 'active',
    createdAt: '2026-01-01T10:00:00Z',
    settings: { ...DEFAULT_SETTINGS, features: FREE_FEATURES, demoMode: true },
    limits: {
      ...PLAN_LIMITS.free,
      currentUsage: { users: 1, connections: 0, reports: 2, storage: 10, apiCalls: 50 },
    },
    members: 1,
    role: 'owner',
    industry: 'retail',
    region: 'canada',
  },
  {
    id: 'demo-pro', // Professional tier demo organization
    name: 'Demo Professional Corp',
    slug: 'demo-pro',
    plan: 'professional',
    status: 'active',
    createdAt: '2025-06-01T10:00:00Z',
    settings: { ...DEFAULT_SETTINGS, features: PROFESSIONAL_FEATURES, demoMode: false },
    limits: {
      ...PLAN_LIMITS.professional,
      currentUsage: { users: 3, connections: 1, reports: 10, storage: 200, apiCalls: 1500 },
    },
    members: 3,
    role: 'owner',
    industry: 'construction',
    region: 'quebec',
  },
  {
    id: 'demo-org', // Enterprise tier demo organization (main demo with real QuickBooks data)
    name: 'Demo Enterprise Inc.',
    slug: 'demo-enterprise',
    plan: 'enterprise',
    status: 'active',
    createdAt: '2024-01-15T10:00:00Z',
    settings: { ...DEFAULT_SETTINGS, features: ENTERPRISE_FEATURES, demoMode: false },
    limits: {
      ...PLAN_LIMITS.enterprise,
      currentUsage: { users: 5, connections: 2, reports: 25, storage: 500, apiCalls: 5000 },
    },
    members: 5,
    role: 'owner',
    industry: 'real_estate',
    region: 'canada',
  },
];

const MOCK_MEMBERS: TenantMember[] = [
  {
    id: 'member-1',
    userId: 'user-1',
    email: 'owner@demo.com',
    name: 'Jean Tremblay',
    role: 'owner',
    status: 'active',
    joinedAt: '2024-01-15T10:00:00Z',
    lastActiveAt: '2026-01-25T14:30:00Z',
  },
  {
    id: 'member-2',
    userId: 'user-2',
    email: 'admin@demo.com',
    name: 'Marie Lavoie',
    role: 'admin',
    status: 'active',
    joinedAt: '2024-02-01T10:00:00Z',
    lastActiveAt: '2026-01-24T09:15:00Z',
  },
  {
    id: 'member-3',
    userId: 'user-3',
    email: 'viewer@demo.com',
    name: 'Pierre Gagnon',
    role: 'viewer',
    status: 'active',
    joinedAt: '2024-03-15T10:00:00Z',
    lastActiveAt: '2026-01-20T16:45:00Z',
  },
];

const TenantContext = createContext<TenantContextType | null>(null);

interface TenantProviderProps {
  children: ReactNode;
}

interface UserPermissionsData {
  entitlements: string[];
  permissions: string[];
  limits: Record<string, number>;
  overrides: string[];
  role: {
    id: string;
    name: string;
    tierLevel: number;
  };
  plan: {
    id: string;
    name: string;
  };
}

interface OrganizationResponse {
  id: string; tenantId: string; name: string; currency: string;
  fiscalYearEndMonth: number; industry?: string; createdAt: string;
}
interface OrganizationSettingsResponse {
  generalSettings?: Partial<TenantSettings> & { province?: string; industry?: string; fiscalYearEndMonth?: number };
  brandingSettings?: { logo?: string; primaryColor?: string; secondaryColor?: string };
}

export function TenantProvider({ children }: TenantProviderProps) {
  const { authenticated, user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenantState] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermissionsData | null>(null);
  const generation = useRef(0);
  const userId = user?.id;
  const claimedTenant = user?.organization;
  const rolesKey = (user?.roles ?? []).join(',');
  const mockMode = isMockAuthEnabled();

  const loadTenants = useCallback(async () => {
    const requestGeneration = ++generation.current;
    setIsLoading(true);
    setError(null);
    setCurrentTenantState(null);
    setTenants([]);
    setUserPermissions(null);
    try {
      if (!authenticated) {
        await setActiveOrganizationId(null);
        return;
      }
      if (mockMode) {
        const allowed = MOCK_TENANTS.filter(tenant => tenant.id === claimedTenant);
        const selected = allowed[0] ?? null;
        await setActiveOrganizationId(selected?.id ?? null);
        if (requestGeneration !== generation.current) return;
        setTenants(allowed);
        setCurrentTenantState(selected);
        return;
      }
      if (!claimedTenant) throw new Error('No organization is assigned to this account. Complete account setup before continuing.');
      await setActiveOrganizationId(claimedTenant);
      const [organizationResult, settingsResult, permissionsResult] = await Promise.all([
        api.get<OrganizationResponse>(`/api/organizations/${encodeURIComponent(claimedTenant)}`),
        api.get<OrganizationSettingsResponse>('/api/v1/settings/organization'),
        api.get<UserPermissionsData>('/api/users/me/permissions'),
      ]);
      if (requestGeneration !== generation.current) return;
      const organization = organizationResult.data;
      if (!organization || organization.tenantId !== claimedTenant || !organization.id) {
        throw new Error('The organization response does not match this signed-in account.');
      }
      const permissions = permissionsResult.data;
      const sourceSettings = settingsResult.data;
      const general = sourceSettings.generalSettings ?? {};
      const plan: Tenant['plan'] = permissions.plan.id === 'enterprise' ? 'enterprise'
        : ['professional', 'pro'].includes(permissions.plan.id) ? 'professional' : 'free';
      const entitled = (name: string) => permissions.entitlements.includes(name) || permissions.overrides.includes(name);
      const role: Tenant['role'] = ['owner', 'admin', 'member', 'viewer'].includes(permissions.role.id)
        ? permissions.role.id as Tenant['role'] : 'viewer';
      const selected: Tenant = {
        id: organization.tenantId, organizationId: organization.id,
        name: organization.name, slug: organization.tenantId, createdAt: organization.createdAt,
        plan, role, status: 'active', members: 0,
        industry: general.industry || organization.industry,
        province: general.province, region: general.province,
        settings: {
          ...DEFAULT_SETTINGS, ...general,
          currency: general.currency || organization.currency,
          demoMode: false,
          features: {
            powerBI: entitled('powerbi'), aiInsights: entitled('ai:insights'),
            customReports: entitled('reports:custom'), apiAccess: entitled('api:access'),
            auditLogs: entitled('audit:logs'), webhooks: entitled('webhooks'),
            sso: entitled('sso'), decisionCapture: entitled('decision:capture'),
          },
          notifications: { ...DEFAULT_SETTINGS.notifications, ...general.notifications },
          branding: sourceSettings.brandingSettings ? {
            logo: sourceSettings.brandingSettings.logo,
            primaryColor: sourceSettings.brandingSettings.primaryColor,
            accentColor: sourceSettings.brandingSettings.secondaryColor,
          } : undefined,
        },
        limits: {
          ...PLAN_LIMITS[plan],
          users: permissions.limits.maxUsers ?? PLAN_LIMITS[plan].users,
          connections: permissions.limits.maxDataSources ?? PLAN_LIMITS[plan].connections,
          reports: permissions.limits.maxReportsPerMonth ?? PLAN_LIMITS[plan].reports,
          currentUsage: { users: 0, connections: 0, reports: 0, storage: 0, apiCalls: 0 },
        },
      };
      setUserPermissions(permissions);
      setTenants([selected]);
      setCurrentTenantState(selected);
      localStorage.setItem(STORAGE_KEY, selected.id);
    } catch (cause) {
      if (requestGeneration !== generation.current) return;
      setError(cause instanceof Error ? cause.message : 'Unable to load your organization.');
      setCurrentTenantState(null);
      setTenants([]);
      await setActiveOrganizationId(null);
    } finally {
      if (requestGeneration === generation.current) setIsLoading(false);
    }
  }, [authenticated, claimedTenant, mockMode, userId, rolesKey]);

  useEffect(() => {
    void loadTenants();
    return () => { generation.current += 1; };
  }, [loadTenants]);

  const setCurrentTenant = useCallback(async (tenant: Tenant | null) => {
    if (tenant && !tenants.some(allowed => allowed.id === tenant.id)) {
      throw new Error('This organization is not available to your account.');
    }
    await setActiveOrganizationId(tenant?.id ?? null);
    setCurrentTenantState(tenant);
    if (tenant) localStorage.setItem(STORAGE_KEY, tenant.id);
    else localStorage.removeItem(STORAGE_KEY);
  }, [tenants]);
  const switchTenant = useCallback(async (tenantId: string) => {
    const tenant = tenants.find(item => item.id === tenantId);
    if (!tenant) throw new Error('This organization is not available to your account.');
    await setCurrentTenant(tenant);
  }, [tenants, setCurrentTenant]);
  const refreshTenants = useCallback(async () => { await loadTenants(); }, [loadTenants]);

  const createTenant = useCallback(async (data: CreateTenantData): Promise<Tenant> => {
    if (!claimedTenant || currentTenant) throw new Error('A new organization requires an assigned account and completed organization setup.');
    await api.post<OrganizationResponse>('/api/organizations', {
      tenantId: claimedTenant, name: data.name, currency: data.settings?.currency || 'CAD',
    });
    await loadTenants();
    // Organization creation must also establish server-side membership. A saved
    // organization alone cannot be represented as an authenticated tenant here.
    throw new Error('Organization created. Complete membership setup, then reload your account.');
  }, [claimedTenant, currentTenant, loadTenants]);

  const updateTenantSettings = useCallback(async (settings: Partial<TenantSettings>) => {
    if (!currentTenant) throw new Error('No organization selected.');
    if (!mockMode) {
      if (!userPermissions?.permissions.includes('manage:settings')) throw new Error('You do not have permission to manage organization settings.');
      if (settings.features || settings.demoMode !== undefined) throw new Error('Feature access is controlled by your organization subscription.');
      const { branding, ...generalSettings } = settings;
      await api.put('/api/v1/settings/organization', {
        generalSettings: { ...currentTenant.settings, ...generalSettings, features: undefined, branding: undefined, demoMode: undefined },
        ...(branding ? { brandingSettings: { logo: branding.logo, primaryColor: branding.primaryColor, secondaryColor: branding.accentColor } } : {}),
      });
      await loadTenants();
      return;
    }
    const updated = { ...currentTenant, settings: { ...currentTenant.settings, ...settings } };
    setTenants(previous => previous.map(tenant => tenant.id === updated.id ? updated : tenant));
    setCurrentTenantState(updated);
  }, [currentTenant, mockMode, userPermissions, loadTenants]);

  const memberPath = useCallback(() => {
    if (!currentTenant) throw new Error('No organization selected.');
    return `/api/organizations/${encodeURIComponent(currentTenant.id)}`;
  }, [currentTenant]);
  // These methods complete only when the API confirms the durable change.
  const getMembers = useCallback(async (): Promise<TenantMember[]> => mockMode
    ? MOCK_MEMBERS : (await api.get<TenantMember[]>(`${memberPath()}/members`)).data, [memberPath, mockMode]);
  const inviteMember = useCallback(async (email: string, role: TenantMember['role']): Promise<TenantInvitation> =>
    (await api.post<TenantInvitation>(`${memberPath()}/invitations`, { email, role })).data, [memberPath]);
  const updateMemberRole = useCallback(async (memberId: string, role: TenantMember['role']) => {
    await api.patch(`${memberPath()}/members/${encodeURIComponent(memberId)}`, { role });
  }, [memberPath]);
  const removeMember = useCallback(async (memberId: string) => {
    await api.delete(`${memberPath()}/members/${encodeURIComponent(memberId)}`);
  }, [memberPath]);
  const getInvitations = useCallback(async (): Promise<TenantInvitation[]> =>
    (await api.get<TenantInvitation[]>(`${memberPath()}/invitations`)).data, [memberPath]);
  const revokeInvitation = useCallback(async (invitationId: string) => {
    await api.delete(`${memberPath()}/invitations/${encodeURIComponent(invitationId)}`);
  }, [memberPath]);
  const resendInvitation = useCallback(async (invitationId: string) => {
    await api.post(`${memberPath()}/invitations/${encodeURIComponent(invitationId)}/resend`);
  }, [memberPath]);

  const hasPermission = useCallback((permission: Permission) => {
    if (!currentTenant) return false;
    if (mockMode) return ROLE_PERMISSIONS[currentTenant.role].includes(permission);
    return userPermissions?.permissions.includes(permission) === true;
  }, [currentTenant, mockMode, userPermissions]);
  const hasEntitlement = useCallback((entitlement: string) => !!userPermissions &&
    (userPermissions.entitlements.includes(entitlement) || userPermissions.overrides.includes(entitlement)), [userPermissions]);
  const isWithinLimit = useCallback((key: string, usage: number) => {
    const limit = userPermissions?.limits[key];
    return Number.isFinite(usage) && usage >= 0 && limit !== undefined && (limit === -1 || usage < limit);
  }, [userPermissions]);

  const value: TenantContextType = {
    currentTenant, setCurrentTenant, tenants, isLoading, error, switchTenant, refreshTenants,
    createTenant, updateTenantSettings, getMembers, inviteMember, updateMemberRole, removeMember,
    getInvitations, revokeInvitation, resendInvitation, hasPermission, hasEntitlement, isWithinLimit,
    canManageMembers: hasPermission('manage:members'), canManageSettings: hasPermission('manage:settings'),
    canManageBilling: hasPermission('manage:billing'), isOwner: currentTenant?.role === 'owner',
    isAdmin: currentTenant?.role === 'owner' || currentTenant?.role === 'admin',
    isInternalStaff: (user?.roles ?? []).some(role => ['plainledger-admin', 'plainledger-staff', 'plainledger-engineer', 'internal', 'platform-admin', 'super-admin'].includes(role)),
  };
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextType {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

// Hook for permission checks
export function usePermission(permission: Permission): boolean {
  const { hasPermission } = useTenant();
  return hasPermission(permission);
}

// Hook for checking if user can perform action
export function useCanPerform() {
  const { hasPermission, currentTenant } = useTenant();

  return {
    canViewDashboard: hasPermission('view:dashboard'),
    canViewReports: hasPermission('view:reports'),
    canCreateReports: hasPermission('create:reports'),
    canDeleteReports: hasPermission('delete:reports'),
    canViewConnections: hasPermission('view:connections'),
    canManageConnections: hasPermission('manage:connections'),
    canViewSettings: hasPermission('view:settings'),
    canManageSettings: hasPermission('manage:settings'),
    canViewMembers: hasPermission('view:members'),
    canManageMembers: hasPermission('manage:members'),
    canManageBilling: hasPermission('manage:billing'),
    canViewAuditLogs: hasPermission('view:audit-logs'),
    canUseApi: hasPermission('use:api'),
    isWithinLimits: (resource: keyof TenantLimits['currentUsage']) => {
      if (!currentTenant) return false;
      const limit = currentTenant.limits[resource];
      const usage = currentTenant.limits.currentUsage[resource];
      return limit === -1 || usage < limit;
    },
  };
}

export default TenantContext;
