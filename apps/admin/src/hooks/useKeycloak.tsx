'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import Keycloak from 'keycloak-js';
import { setAuthToken } from '@/lib/api';
import {
  hasKeycloakCallbackParams,
  initKeycloakForCallback,
  startSSOLogin,
  refreshSSOToken,
  getKeycloakLogoutUrl,
} from '@/lib/keycloak-sso';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface KeycloakContextValue {
  keycloak: Keycloak | null;
  initialized: boolean;
  authenticated: boolean;
  token: string | null;
  login: () => void;
  loginWithGoogle: () => void;
  loginWithSSO: () => void;
  logout: () => void;
  getToken: () => Promise<string | null>;
}

const KeycloakContext = createContext<KeycloakContextValue | undefined>(undefined);

// Token refresh via API (for email/password login using plainledger-api client)
async function refreshAccessTokenViaApi(): Promise<{ accessToken: string; expiresIn: number } | null> {
  const refreshToken = sessionStorage.getItem('admin_refresh_token');
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return null;

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

// Unified refresh that routes to the correct method based on auth source
async function refreshAccessToken(): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number } | null> {
  const authSource = sessionStorage.getItem('admin_auth_source');
  const storedRefreshToken = sessionStorage.getItem('admin_refresh_token');

  if (authSource === 'sso' && storedRefreshToken) {
    // SSO tokens must be refreshed directly against Keycloak (different client)
    const result = await refreshSSOToken(storedRefreshToken);
    if (result) {
      // Update the stored refresh token (Keycloak issues a new one on each refresh)
      sessionStorage.setItem('admin_refresh_token', result.refreshToken);
      return result;
    }
    return null;
  }

  // Default: use API refresh endpoint (email/password login)
  return refreshAccessTokenViaApi();
}

function storeTokens(accessToken: string, expiresIn: number, authSource: 'api' | 'sso', refreshToken?: string) {
  sessionStorage.setItem('admin_token', accessToken);
  sessionStorage.setItem('admin_auth_source', authSource);
  if (refreshToken) {
    sessionStorage.setItem('admin_refresh_token', refreshToken);
  }
  const expiryTime = Date.now() + (expiresIn - 60) * 1000;
  sessionStorage.setItem('admin_token_expiry', expiryTime.toString());
}

function clearTokens() {
  sessionStorage.removeItem('admin_token');
  sessionStorage.removeItem('admin_refresh_token');
  sessionStorage.removeItem('admin_token_expiry');
  sessionStorage.removeItem('admin_auth_source');
}

export function KeycloakProvider({ children }: { children: ReactNode }) {
  const [keycloak, setKeycloak] = useState<Keycloak | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isTokenExpired = useCallback(() => {
    const expiryStr = sessionStorage.getItem('admin_token_expiry');
    if (!expiryStr) return true;
    return Date.now() >= parseInt(expiryStr, 10);
  }, []);

  const scheduleRefresh = useCallback((expiresIn: number) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    const nextRefresh = Math.max((expiresIn - 60) * 1000, 60000);
    refreshTimerRef.current = setTimeout(doRefresh, nextRefresh);
  }, []);

  const doRefresh = useCallback(async () => {
    console.log('[Auth] Attempting token refresh...');
    const result = await refreshAccessToken();

    if (result) {
      console.log('[Auth] Token refreshed successfully');
      setToken(result.accessToken);
      setAuthToken(result.accessToken);
      storeTokens(
        result.accessToken,
        result.expiresIn,
        (sessionStorage.getItem('admin_auth_source') as 'api' | 'sso') || 'api',
        result.refreshToken,
      );
      scheduleRefresh(result.expiresIn);
    } else {
      console.log('[Auth] Token refresh failed, logging out');
      clearTokens();
      setAuthToken(null);
      setAuthenticated(false);
      window.location.href = '/login';
    }
  }, [scheduleRefresh]);

  useEffect(() => {
    const initAuth = async () => {
      // 1. Check if this is a Keycloak SSO callback
      if (hasKeycloakCallbackParams()) {
        console.log('[Auth] Detected SSO callback, processing...');
        const result = await initKeycloakForCallback();

        if (result) {
          console.log('[Auth] SSO callback successful');
          storeTokens(result.accessToken, result.expiresIn, 'sso', result.refreshToken);
          setToken(result.accessToken);
          setAuthToken(result.accessToken);
          setAuthenticated(true);
          setInitialized(true);
          scheduleRefresh(result.expiresIn);

          // Clean up URL (remove Keycloak query params)
          window.history.replaceState({}, '', '/login');
          return;
        } else {
          console.log('[Auth] SSO callback failed');
          // Clean URL and fall through to show login form
          window.history.replaceState({}, '', '/login');
        }
      }

      // 2. Check for existing token in sessionStorage
      const storedToken = sessionStorage.getItem('admin_token');

      if (storedToken) {
        if (isTokenExpired()) {
          console.log('[Auth] Token expired, attempting refresh...');
          const result = await refreshAccessToken();

          if (result) {
            setToken(result.accessToken);
            setAuthenticated(true);
            setInitialized(true);
            setAuthToken(result.accessToken);
            storeTokens(
              result.accessToken,
              result.expiresIn,
              (sessionStorage.getItem('admin_auth_source') as 'api' | 'sso') || 'api',
              result.refreshToken,
            );
            scheduleRefresh(result.expiresIn);
          } else {
            clearTokens();
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

      // 3. No stored token - user needs to login
      setInitialized(true);
      setAuthenticated(false);
      setToken(null);
    };

    initAuth();

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [isTokenExpired, doRefresh, scheduleRefresh]);

  const login = useCallback(() => {
    window.location.href = '/login';
  }, []);

  const loginWithGoogle = useCallback(() => {
    startSSOLogin('google');
  }, []);

  const loginWithSSO = useCallback(() => {
    startSSOLogin();
  }, []);

  const logout = useCallback(() => {
    const authSource = sessionStorage.getItem('admin_auth_source');

    clearTokens();
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    setAuthToken(null);

    if (authSource === 'sso') {
      // End Keycloak session as well
      window.location.href = getKeycloakLogoutUrl();
    } else {
      window.location.href = '/login';
    }
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (isTokenExpired()) {
      console.log('[Auth] Token expired in getToken, refreshing...');
      const result = await refreshAccessToken();
      if (result) {
        setToken(result.accessToken);
        setAuthToken(result.accessToken);
        storeTokens(
          result.accessToken,
          result.expiresIn,
          (sessionStorage.getItem('admin_auth_source') as 'api' | 'sso') || 'api',
          result.refreshToken,
        );
        return result.accessToken;
      }
      return null;
    }

    const storedToken = sessionStorage.getItem('admin_token');
    if (storedToken) return storedToken;
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
        loginWithGoogle,
        loginWithSSO,
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
