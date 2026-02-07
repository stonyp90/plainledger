'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import Keycloak from 'keycloak-js';

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
    // Only initialize once
    if (keycloakInstance) {
      setKeycloak(keycloakInstance);
      setInitialized(true);
      setAuthenticated(keycloakInstance.authenticated || false);
      setToken(keycloakInstance.token || null);
      return;
    }

    const initKeycloak = async () => {
      try {
        const kc = new Keycloak(keycloakConfig);
        
        const auth = await kc.init({
          onLoad: 'login-required',
          checkLoginIframe: false,
          pkceMethod: 'S256',
        });

        keycloakInstance = kc;
        setKeycloak(kc);
        setInitialized(true);
        setAuthenticated(auth);
        setToken(kc.token || null);

        // Set up token refresh
        kc.onTokenExpired = () => {
          console.log('Token expired, refreshing...');
          kc.updateToken(30)
            .then((refreshed) => {
              if (refreshed) {
                console.log('Token refreshed');
                setToken(kc.token || null);
              }
            })
            .catch(() => {
              console.error('Failed to refresh token, logging out');
              kc.logout();
            });
        };

        // Refresh token every 60 seconds if needed
        setInterval(() => {
          kc.updateToken(70)
            .then((refreshed) => {
              if (refreshed) {
                setToken(kc.token || null);
              }
            })
            .catch(() => {
              console.error('Failed to refresh token');
            });
        }, 60000);

      } catch (error) {
        console.error('Failed to initialize Keycloak:', error);
        setInitialized(true);
        setAuthenticated(false);
      }
    };

    initKeycloak();
  }, []);

  const login = useCallback(() => {
    keycloak?.login();
  }, [keycloak]);

  const logout = useCallback(() => {
    keycloak?.logout({ redirectUri: window.location.origin });
  }, [keycloak]);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (!keycloak || !keycloak.authenticated) {
      return null;
    }

    try {
      // Refresh token if it expires in the next 30 seconds
      await keycloak.updateToken(30);
      return keycloak.token || null;
    } catch (error) {
      console.error('Failed to get token:', error);
      return null;
    }
  }, [keycloak]);

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
