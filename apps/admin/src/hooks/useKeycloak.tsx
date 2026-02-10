'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import Keycloak from 'keycloak-js';
import { setAuthToken } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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

// Token refresh function
async function refreshAccessToken(): Promise<{ accessToken: string; expiresIn: number } | null> {
  const refreshToken = sessionStorage.getItem('admin_refresh_token');
  if (!refreshToken) {
    console.log('[Auth] No refresh token available');
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      console.log('[Auth] Token refresh failed:', response.status);
      return null;
    }

    const data = await response.json();
    return {
      accessToken: data.accessToken,
      expiresIn: data.expiresIn || 300,
    };
  } catch (error) {
    console.error('[Auth] Token refresh error:', error);
    return null;
  }
}

export function KeycloakProvider({ children }: { children: ReactNode }) {
  const [keycloak, setKeycloak] = useState<Keycloak | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if token is expired or about to expire
  const isTokenExpired = useCallback(() => {
    const expiryStr = sessionStorage.getItem('admin_token_expiry');
    if (!expiryStr) return true;
    const expiry = parseInt(expiryStr, 10);
    return Date.now() >= expiry;
  }, []);

  // Refresh token and schedule next refresh
  const doRefresh = useCallback(async () => {
    console.log('[Auth] Attempting token refresh...');
    const result = await refreshAccessToken();
    
    if (result) {
      console.log('[Auth] Token refreshed successfully');
      setToken(result.accessToken);
      setAuthToken(result.accessToken);
      sessionStorage.setItem('admin_token', result.accessToken);
      
      // Schedule next refresh (before expiry)
      const nextRefresh = (result.expiresIn - 60) * 1000; // 60 seconds before expiry
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = setTimeout(doRefresh, Math.max(nextRefresh, 60000));
      
      // Update expiry time
      const expiryTime = Date.now() + (result.expiresIn - 60) * 1000;
      sessionStorage.setItem('admin_token_expiry', expiryTime.toString());
    } else {
      // Refresh failed - logout
      console.log('[Auth] Token refresh failed, logging out');
      sessionStorage.removeItem('admin_token');
      sessionStorage.removeItem('admin_refresh_token');
      sessionStorage.removeItem('admin_token_expiry');
      setAuthToken(null);
      setAuthenticated(false);
      window.location.href = '/login';
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      // Check if we have a token from sessionStorage (from API login)
      const storedToken = sessionStorage.getItem('admin_token');
      
      if (storedToken) {
        // Check if token is expired
        if (isTokenExpired()) {
          console.log('[Auth] Token expired, attempting refresh...');
          const result = await refreshAccessToken();
          
          if (result) {
            setToken(result.accessToken);
            setAuthenticated(true);
            setInitialized(true);
            setAuthToken(result.accessToken);
            sessionStorage.setItem('admin_token', result.accessToken);
            
            // Schedule next refresh
            const nextRefresh = (result.expiresIn - 60) * 1000;
            refreshTimerRef.current = setTimeout(doRefresh, Math.max(nextRefresh, 60000));
            
            const expiryTime = Date.now() + (result.expiresIn - 60) * 1000;
            sessionStorage.setItem('admin_token_expiry', expiryTime.toString());
          } else {
            // Refresh failed - clear and require login
            sessionStorage.removeItem('admin_token');
            sessionStorage.removeItem('admin_refresh_token');
            sessionStorage.removeItem('admin_token_expiry');
            setInitialized(true);
            setAuthenticated(false);
            setToken(null);
          }
        } else {
          // Token still valid
          setToken(storedToken);
          setAuthenticated(true);
          setInitialized(true);
          setAuthToken(storedToken);
          
          // Schedule refresh before expiry
          const expiryStr = sessionStorage.getItem('admin_token_expiry');
          if (expiryStr) {
            const timeUntilExpiry = parseInt(expiryStr, 10) - Date.now();
            if (timeUntilExpiry > 0) {
              refreshTimerRef.current = setTimeout(doRefresh, timeUntilExpiry);
            }
          }
        }
        return;
      }

      // No stored token - user needs to login
      setInitialized(true);
      setAuthenticated(false);
      setToken(null);
    };

    initAuth();

    // Cleanup timer on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [isTokenExpired, doRefresh]);

  const login = useCallback(() => {
    // Redirect to login page instead of Keycloak
    window.location.href = '/login';
  }, []);

  const logout = useCallback(() => {
    // Clear all tokens and redirect to login
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_refresh_token');
    sessionStorage.removeItem('admin_token_expiry');
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    setAuthToken(null);
    window.location.href = '/login';
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    // Check if token needs refresh
    if (isTokenExpired()) {
      console.log('[Auth] Token expired in getToken, refreshing...');
      const result = await refreshAccessToken();
      if (result) {
        setToken(result.accessToken);
        setAuthToken(result.accessToken);
        sessionStorage.setItem('admin_token', result.accessToken);
        return result.accessToken;
      }
      return null;
    }
    
    // Get token from sessionStorage
    const storedToken = sessionStorage.getItem('admin_token');
    if (storedToken) {
      return storedToken;
    }
    return token;
  }, [token, isTokenExpired]);

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
