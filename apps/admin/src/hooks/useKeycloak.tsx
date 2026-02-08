'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import Keycloak from 'keycloak-js';
import { setAuthToken } from '@/lib/api';

interface KeycloakContextValue {
  keycloak: Keycloak | null;
  initialized: boolean;
  authenticated: boolean;
  token: string | null;
  login: () => void;
  logout: () => void;
  getToken: () => Promise<string | null>;
}

const KeycloakContext = createContext<KeycloakContextValue | undefined>(undefined);

// Keycloak configuration
const keycloakConfig = {
  url: process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080',
  realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'plainledger',
  clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'plainledger-admin',
};

let keycloakInstance: Keycloak | null = null;

export function KeycloakProvider({ children }: { children: ReactNode }) {
  const [keycloak, setKeycloak] = useState<Keycloak | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = () => {
      // Check if we have a token from sessionStorage (from API login)
      const storedToken = sessionStorage.getItem('admin_token');
      
      if (storedToken) {
        // Set token and mark as authenticated
        setToken(storedToken);
        setAuthenticated(true);
        setInitialized(true);
        setAuthToken(storedToken);
        return;
      }

      // No stored token - user needs to login
      setInitialized(true);
      setAuthenticated(false);
      setToken(null);
    };

    initAuth();
  }, []);

  const login = useCallback(() => {
    // Redirect to login page instead of Keycloak
    window.location.href = '/login';
  }, []);

  const logout = useCallback(() => {
    // Clear token and redirect to login
    sessionStorage.removeItem('admin_token');
    setAuthToken(null);
    window.location.href = '/login';
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    // Get token from sessionStorage
    const storedToken = sessionStorage.getItem('admin_token');
    if (storedToken) {
      return storedToken;
    }
    return token;
  }, [token]);

  return (
    <KeycloakContext.Provider
      value={{
        keycloak,
        initialized,
        authenticated,
        token,
        login,
        logout,
        getToken,
      }}
    >
      {children}
    </KeycloakContext.Provider>
  );
}

export function useKeycloak() {
  const context = useContext(KeycloakContext);
  if (context === undefined) {
    throw new Error('useKeycloak must be used within a KeycloakProvider');
  }
  return context;
}
