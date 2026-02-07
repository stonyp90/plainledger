'use client';

import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useKeycloak } from './useKeycloak';
import { setAuthToken } from '@/lib/api';

interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  keycloakId: string;
  isActive: boolean;
}

interface AdminContextValue {
  admin: {
    user: AdminUser | null;
    permissions: string[];
    groups: string[];
    maxTierLevel: number;
  } | null;
  isLoading: boolean;
  token: string | null;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { token, authenticated, initialized } = useKeycloak();

  // Sync token to API singleton for all API calls
  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  // Fetch admin info using the Keycloak token
  const { data: adminData, isLoading: queryLoading } = useQuery({
    queryKey: ['admin', 'me', token],
    queryFn: async () => {
      if (!token) {
        throw new Error('No token available');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/admins/me`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Return default admin data from token claims if API fails
        console.warn('Admin API returned non-OK response:', response.status);
        return null;
      }

      return response.json();
    },
    enabled: authenticated && !!token,
    retry: 1,
  });

  // Show loading while Keycloak initializes
  const isLoading = !initialized || (authenticated && queryLoading);

  const hasPermission = (permission: string): boolean => {
    if (!adminData) return false;
    if (adminData.permissions?.includes('*')) return true;
    return adminData.permissions?.includes(permission) || false;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!adminData) return false;
    if (adminData.permissions?.includes('*')) return true;
    return permissions.some((p) => adminData.permissions?.includes(p)) || false;
  };

  return (
    <AdminContext.Provider
      value={{
        admin: adminData || null,
        isLoading,
        token,
        hasPermission,
        hasAnyPermission,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
