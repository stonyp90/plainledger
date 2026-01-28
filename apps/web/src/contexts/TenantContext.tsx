import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from '../lib/keycloak';

// Types
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  primaryColor?: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'trial';
  trialEndsAt?: string;
  createdAt: string;
  settings: TenantSettings;
  limits: TenantLimits;
  members: number;
  role: 'owner' | 'admin' | 'member' | 'viewer';
}

export interface TenantSettings {
  locale: string;
  timezone: string;
  currency: string;
  fiscalYearEnd: string; // MM-DD format
  dateFormat: string;
  numberFormat: string;
  features: {
    powerBI: boolean;
    aiInsights: boolean;
    customReports: boolean;
    apiAccess: boolean;
    auditLogs: boolean;
    webhooks: boolean;
    sso: boolean;
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
  | 'use:api';

// Role-based permissions
const ROLE_PERMISSIONS: Record<TenantMember['role'], Permission[]> = {
  owner: [
    'view:dashboard', 'view:reports', 'create:reports', 'delete:reports',
    'view:connections', 'manage:connections',
    'view:settings', 'manage:settings',
    'view:members', 'manage:members', 'manage:billing',
    'view:audit-logs', 'use:api',
  ],
  admin: [
    'view:dashboard', 'view:reports', 'create:reports', 'delete:reports',
    'view:connections', 'manage:connections',
    'view:settings', 'manage:settings',
    'view:members', 'manage:members',
    'view:audit-logs', 'use:api',
  ],
  member: [
    'view:dashboard', 'view:reports', 'create:reports',
    'view:connections',
    'view:settings',
    'view:members',
    'use:api',
  ],
  viewer: [
    'view:dashboard', 'view:reports',
    'view:connections',
    'view:members',
  ],
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
  },
  notifications: {
    emailDigest: 'weekly',
    anomalyAlerts: true,
    reportReady: true,
    syncErrors: true,
  },
};

// Plan-based limits
const PLAN_LIMITS: Record<Tenant['plan'], Omit<TenantLimits, 'currentUsage'>> = {
  free: { users: 1, connections: 1, reports: 5, storage: 100, apiCalls: 100 },
  starter: { users: 3, connections: 3, reports: 25, storage: 1000, apiCalls: 1000 },
  professional: { users: 10, connections: 10, reports: 100, storage: 10000, apiCalls: 10000 },
  enterprise: { users: -1, connections: -1, reports: -1, storage: -1, apiCalls: -1 }, // Unlimited
};

// Storage keys
const STORAGE_KEY = 'plainledger-current-tenant';

// Feature settings for different plans
const FREE_FEATURES: TenantSettings['features'] = {
  powerBI: false,
  aiInsights: false,
  customReports: false,
  apiAccess: false,
  auditLogs: false,
  webhooks: false,
  sso: false,
};

const STARTER_FEATURES: TenantSettings['features'] = {
  powerBI: false,
  aiInsights: false,
  customReports: false,
  apiAccess: false,
  auditLogs: false,
  webhooks: false,
  sso: false,
};

const PROFESSIONAL_FEATURES: TenantSettings['features'] = {
  powerBI: false,
  aiInsights: true,
  customReports: true,
  apiAccess: true,
  auditLogs: false,
  webhooks: false,
  sso: false,
};

const ENTERPRISE_FEATURES: TenantSettings['features'] = {
  powerBI: true,
  aiInsights: true,
  customReports: true,
  apiAccess: true,
  auditLogs: true,
  webhooks: true,
  sso: true,
};

// Mock data for development
const MOCK_TENANTS: Tenant[] = [
  {
    id: 'tenant-1',
    name: 'Demo Corporation',
    slug: 'demo-corp',
    plan: 'free', // Changed to free to test premium gates
    status: 'trial',
    trialEndsAt: '2026-02-15T23:59:59Z',
    createdAt: '2024-01-15T10:00:00Z',
    settings: { ...DEFAULT_SETTINGS, features: FREE_FEATURES },
    limits: {
      ...PLAN_LIMITS.free,
      currentUsage: { users: 1, connections: 1, reports: 3, storage: 50, apiCalls: 100 },
    },
    members: 1,
    role: 'owner',
  },
  {
    id: 'tenant-2',
    name: 'Acme Inc.',
    slug: 'acme-inc',
    plan: 'starter',
    status: 'trial',
    trialEndsAt: '2026-02-15T23:59:59Z',
    createdAt: '2025-01-01T10:00:00Z',
    settings: { ...DEFAULT_SETTINGS, features: STARTER_FEATURES, currency: 'USD' },
    limits: {
      ...PLAN_LIMITS.starter,
      currentUsage: { users: 1, connections: 1, reports: 3, storage: 50, apiCalls: 150 },
    },
    members: 1,
    role: 'admin',
  },
  {
    id: 'tenant-3',
    name: 'Pro Organization',
    slug: 'pro-org',
    plan: 'professional',
    status: 'active',
    createdAt: '2025-12-01T10:00:00Z',
    settings: { ...DEFAULT_SETTINGS, features: PROFESSIONAL_FEATURES },
    limits: {
      ...PLAN_LIMITS.professional,
      currentUsage: { users: 3, connections: 2, reports: 15, storage: 450, apiCalls: 2500 },
    },
    members: 3,
    role: 'owner',
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

export function TenantProvider({ children }: TenantProviderProps) {
  const { authenticated, user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenantState] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load tenants on auth
  useEffect(() => {
    if (authenticated) {
      loadTenants();
    } else {
      setTenants([]);
      setCurrentTenantState(null);
      setIsLoading(false);
    }
  }, [authenticated]);

  // Load tenants from API
  const loadTenants = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In production, fetch from API
      // const response = await api.get('/tenants');
      // const data = response.data;
      
      // For now, use mock data
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      setTenants(MOCK_TENANTS);
      
      // Restore last selected tenant or use first one
      const savedTenantId = localStorage.getItem(STORAGE_KEY);
      const savedTenant = savedTenantId 
        ? MOCK_TENANTS.find(t => t.id === savedTenantId)
        : null;
      
      setCurrentTenantState(savedTenant || MOCK_TENANTS[0] || null);
    } catch (err) {
      setError('Impossible de charger les organisations');
      console.error('Failed to load tenants:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Set current tenant
  const setCurrentTenant = useCallback((tenant: Tenant | null) => {
    setCurrentTenantState(tenant);
    if (tenant) {
      localStorage.setItem(STORAGE_KEY, tenant.id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Switch tenant
  const switchTenant = useCallback(async (tenantId: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
      setCurrentTenant(tenant);
      // In production, you might want to refresh data for the new tenant
      // await refreshTenantData();
    }
  }, [tenants, setCurrentTenant]);

  // Refresh tenants list
  const refreshTenants = useCallback(async () => {
    await loadTenants();
  }, []);

  // Create new tenant
  const createTenant = useCallback(async (data: CreateTenantData): Promise<Tenant> => {
    // In production, call API
    // const response = await api.post('/tenants', data);
    
    const newTenant: Tenant = {
      id: `tenant-${Date.now()}`,
      name: data.name,
      slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
      plan: 'free',
      status: 'trial',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      settings: { ...DEFAULT_SETTINGS, ...data.settings },
      limits: {
        ...PLAN_LIMITS.free,
        currentUsage: { users: 1, connections: 0, reports: 0, storage: 0, apiCalls: 0 },
      },
      members: 1,
      role: 'owner',
    };
    
    setTenants(prev => [...prev, newTenant]);
    setCurrentTenant(newTenant);
    
    return newTenant;
  }, [setCurrentTenant]);

  // Update tenant settings
  const updateTenantSettings = useCallback(async (settings: Partial<TenantSettings>) => {
    if (!currentTenant) throw new Error('No tenant selected');
    
    // In production, call API
    // await api.patch(`/tenants/${currentTenant.id}/settings`, settings);
    
    const updatedTenant = {
      ...currentTenant,
      settings: { ...currentTenant.settings, ...settings },
    };
    
    setTenants(prev => prev.map(t => t.id === currentTenant.id ? updatedTenant : t));
    setCurrentTenantState(updatedTenant);
  }, [currentTenant]);

  // Get members
  const getMembers = useCallback(async (): Promise<TenantMember[]> => {
    if (!currentTenant) return [];
    
    // In production, fetch from API
    // const response = await api.get(`/tenants/${currentTenant.id}/members`);
    
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_MEMBERS;
  }, [currentTenant]);

  // Invite member
  const inviteMember = useCallback(async (email: string, role: TenantMember['role']): Promise<TenantInvitation> => {
    if (!currentTenant) throw new Error('No tenant selected');
    
    // In production, call API
    // const response = await api.post(`/tenants/${currentTenant.id}/invitations`, { email, role });
    
    const invitation: TenantInvitation = {
      id: `inv-${Date.now()}`,
      email,
      role: role as 'admin' | 'member' | 'viewer',
      invitedBy: user?.id || '',
      invitedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
    };
    
    return invitation;
  }, [currentTenant, user]);

  // Update member role
  const updateMemberRole = useCallback(async (memberId: string, role: TenantMember['role']) => {
    if (!currentTenant) throw new Error('No tenant selected');
    
    // In production, call API
    // await api.patch(`/tenants/${currentTenant.id}/members/${memberId}`, { role });
    
    console.log(`Updated member ${memberId} to role ${role}`);
  }, [currentTenant]);

  // Remove member
  const removeMember = useCallback(async (memberId: string) => {
    if (!currentTenant) throw new Error('No tenant selected');
    
    // In production, call API
    // await api.delete(`/tenants/${currentTenant.id}/members/${memberId}`);
    
    console.log(`Removed member ${memberId}`);
  }, [currentTenant]);

  // Get invitations
  const getInvitations = useCallback(async (): Promise<TenantInvitation[]> => {
    if (!currentTenant) return [];
    
    // In production, fetch from API
    // const response = await api.get(`/tenants/${currentTenant.id}/invitations`);
    
    // Mock pending invitations for demo
    return [
      {
        id: 'inv-1',
        email: 'pending@example.com',
        role: 'member',
        invitedBy: user?.id || '',
        invitedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
      },
    ];
  }, [currentTenant, user]);

  // Revoke invitation
  const revokeInvitation = useCallback(async (invitationId: string) => {
    if (!currentTenant) throw new Error('No tenant selected');
    
    // In production, call API
    // await api.delete(`/tenants/${currentTenant.id}/invitations/${invitationId}`);
    
    console.log(`Revoked invitation ${invitationId}`);
  }, [currentTenant]);

  // Resend invitation
  const resendInvitation = useCallback(async (invitationId: string) => {
    if (!currentTenant) throw new Error('No tenant selected');
    
    // In production, call API
    // await api.post(`/tenants/${currentTenant.id}/invitations/${invitationId}/resend`);
    
    console.log(`Resent invitation ${invitationId}`);
  }, [currentTenant]);

  // Check permission
  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!currentTenant) return false;
    return ROLE_PERMISSIONS[currentTenant.role].includes(permission);
  }, [currentTenant]);

  // Computed permissions
  const canManageMembers = currentTenant ? hasPermission('manage:members') : false;
  const canManageSettings = currentTenant ? hasPermission('manage:settings') : false;
  const canManageBilling = currentTenant ? hasPermission('manage:billing') : false;
  const isOwner = currentTenant?.role === 'owner';
  const isAdmin = currentTenant?.role === 'owner' || currentTenant?.role === 'admin';
  
  // Check if user is PlainLedger internal staff
  // Internal staff have special roles assigned in Keycloak
  // This is used to show/hide technical configuration that customers shouldn't see
  const INTERNAL_STAFF_ROLES = [
    'plainledger-admin',    // PlainLedger administrators
    'plainledger-staff',    // PlainLedger support staff
    'plainledger-engineer', // PlainLedger engineers
    'internal',             // Generic internal role
    'realm-admin',          // Keycloak realm admin
  ];
  const isInternalStaff = user?.roles?.some(role => INTERNAL_STAFF_ROLES.includes(role)) ?? false;

  const value: TenantContextType = {
    currentTenant,
    setCurrentTenant,
    tenants,
    isLoading,
    error,
    switchTenant,
    refreshTenants,
    createTenant,
    updateTenantSettings,
    getMembers,
    inviteMember,
    updateMemberRole,
    removeMember,
    getInvitations,
    revokeInvitation,
    resendInvitation,
    hasPermission,
    canManageMembers,
    canManageSettings,
    canManageBilling,
    isOwner,
    isAdmin,
    isInternalStaff,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
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
