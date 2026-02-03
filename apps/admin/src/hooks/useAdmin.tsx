'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

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
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // For now, we'll use a simple fetch to get admin info
  // In production, this would use Keycloak authentication
  const { data: adminData, isLoading } = useQuery({
    queryKey: ['admin', 'me'],
    queryFn: async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/admins/me`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          // In production, include the Keycloak token
          // 'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // For development, return mock data
        if (process.env.NODE_ENV === 'development') {
          return {
            user: {
              id: 'dev-admin',
              email: 'admin@plainledger.ca',
              displayName: 'Dev Admin',
              keycloakId: 'dev-admin-id',
              isActive: true,
            },
            permissions: ['*'], // All permissions in dev
            groups: ['Platform Owner'],
            maxTierLevel: 100,
          };
        }
        throw new Error('Not authenticated');
      }

      return response.json();
    },
    enabled: true,
    retry: false,
  });

  const hasPermission = (permission: string): boolean => {
    if (!adminData) return false;
    if (adminData.permissions.includes('*')) return true; // Dev mode
    return adminData.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!adminData) return false;
    if (adminData.permissions.includes('*')) return true; // Dev mode
    return permissions.some((p) => adminData.permissions.includes(p));
  };

  return (
    <AdminContext.Provider
      value={{
        admin: adminData || null,
        isLoading,
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
