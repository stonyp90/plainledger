import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import Keycloak from 'keycloak-js';

// Check if mock auth is enabled (for development/testing without Keycloak)
// Defaults to true in development mode when VITE_MOCK_AUTH is not explicitly set
const MOCK_AUTH_ENABLED = import.meta.env.VITE_MOCK_AUTH === 'true' || 
  (import.meta.env.DEV && import.meta.env.VITE_MOCK_AUTH !== 'false');

// Key for persisting mock auth logout state
const MOCK_AUTH_LOGGED_OUT_KEY = 'plainledger_mock_auth_logged_out';

// Check if Keycloak URL is properly configured (not localhost in production)
const keycloakUrl = import.meta.env.VITE_KEYCLOAK_URL || '';
const isKeycloakConfigured = keycloakUrl && 
  !keycloakUrl.includes('localhost') && 
  !keycloakUrl.includes('127.0.0.1');

// If Keycloak is not configured in production, fall back to mock auth to prevent hanging
const KEYCLOAK_AVAILABLE = MOCK_AUTH_ENABLED || isKeycloakConfigured || import.meta.env.DEV;

// Keycloak configuration
const keycloakConfig = {
  url: keycloakUrl || 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'plainledger',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'plainledger-web',
};

// Mock user for development
const MOCK_USER: UserProfile = {
  id: 'mock-user-001',
  email: 'admin@plainledger.ca',
  name: 'Admin User',
  firstName: 'Admin',
  lastName: 'User',
  organization: 'PlainLedger Demo',
  roles: ['admin', 'user'],
  locale: 'en',
  emailVerified: true,
  identityProvider: 'local',
  // Professional avatar from DiceBear API
  picture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AdminUser&backgroundColor=b6e3f4&clothesColor=3c4f5c&clothingGraphic=bear&eyebrows=default&eyes=default&facialHair=blank&hairColor=2c1b18&mouth=smile&skinColor=f8d25c&top=shortHair',
};

// Singleton keycloak instance
let keycloakInstance: Keycloak | null = null;

function getKeycloakInstance(): Keycloak {
  if (!keycloakInstance) {
    keycloakInstance = new Keycloak(keycloakConfig);
  }
  return keycloakInstance;
}

export interface UserProfile {
  id?: string;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
  roles: string[];
  picture?: string; // Profile picture URL from IDP
  locale?: string;
  emailVerified?: boolean;
  identityProvider?: string; // Which IDP the user logged in with (e.g., 'google', 'microsoft', 'local')
}

// Keycloak Account Console sections
export type AccountSection = 
  | 'account'           // Personal info
  | 'security'          // Security overview
  | 'password'          // Change password
  | 'authenticator'     // 2FA/MFA setup
  | 'device-activity'   // Active sessions
  | 'linked-accounts'   // Social/enterprise logins
  | 'applications'      // Authorized apps
  | 'log';              // Sign-in history

interface KeycloakContextType {
  keycloak: Keycloak;
  initialized: boolean;
  authenticated: boolean;
  user: UserProfile | null;
  login: (idpHint?: string) => void; // Optional IDP hint for direct login
  register: (redirectUri?: string) => void; // Trigger registration flow
  logout: () => void;
  getToken: () => string | undefined;
  linkAccount: (provider: string) => void; // Link additional IDP accounts
  // Account management - redirects to Keycloak Account Console
  openAccountConsole: (section?: AccountSection) => void;
  getAccountConsoleUrl: (section?: AccountSection) => string;
}

const KeycloakContext = createContext<KeycloakContextType | null>(null);

// Extract user profile from Keycloak token
function extractUserProfile(keycloak: Keycloak, tokenParsed: Record<string, unknown>): UserProfile {
  // Get identity provider from token (set by Keycloak when using social login)
  const idp = tokenParsed.identity_provider as string | undefined;
  
  // Profile picture can come from different claims depending on the IDP
  // Google: picture
  // Microsoft: picture or photo
  // OIDC: picture
  const picture = (tokenParsed.picture as string) || 
                  (tokenParsed.photo as string) ||
                  (tokenParsed.avatar_url as string) ||
                  undefined;

  return {
    id: keycloak.subject,
    email: tokenParsed.email as string,
    name: tokenParsed.name as string,
    firstName: tokenParsed.given_name as string,
    lastName: tokenParsed.family_name as string,
    organization: tokenParsed.organization as string,
    roles: keycloak.realmAccess?.roles || [],
    picture,
    locale: tokenParsed.locale as string,
    // Default to true if not specified - better UX than blocking users
    emailVerified: tokenParsed.email_verified !== false,
    identityProvider: idp,
  };
}

interface KeycloakProviderProps {
  children: ReactNode;
}

export function KeycloakProvider({ children }: KeycloakProviderProps) {
  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<KeycloakContextType['user']>(null);
  const initCalled = useRef(false);
  const keycloak = getKeycloakInstance();

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (initCalled.current) return;
    initCalled.current = true;

    // Mock authentication mode for development/testing
    if (MOCK_AUTH_ENABLED) {
      // Check if user explicitly logged out - respect that choice
      const isLoggedOut = localStorage.getItem(MOCK_AUTH_LOGGED_OUT_KEY) === 'true';
      if (isLoggedOut) {
        console.log('🔓 Mock authentication enabled - user logged out, staying logged out');
        setAuthenticated(false);
        setUser(null);
        setInitialized(true);
        return;
      }
      console.log('🔓 Mock authentication enabled - bypassing Keycloak');
      setAuthenticated(true);
      setUser(MOCK_USER);
      setInitialized(true);
      return;
    }

    // If Keycloak is not properly configured, use guest mode
    if (!KEYCLOAK_AVAILABLE) {
      console.warn('⚠️ Keycloak not configured - running in guest mode. Set VITE_KEYCLOAK_URL for authentication.');
      setAuthenticated(false);
      setUser(null);
      setInitialized(true);
      return;
    }

    const initKeycloak = async () => {
      try {
        // Check for stored tokens from custom login
        const storedToken = sessionStorage.getItem('kc_token');
        const storedRefreshToken = sessionStorage.getItem('kc_refresh_token');
        
        if (storedToken && storedRefreshToken) {
          // We have tokens from custom login - set them in Keycloak client
          try {
            const tokenParts = storedToken.split('.');
            if (tokenParts.length === 3) {
              const tokenPayload = JSON.parse(atob(tokenParts[1]));
              
              // Set tokens in Keycloak client
              (keycloak as any).token = storedToken;
              (keycloak as any).refreshToken = storedRefreshToken;
              (keycloak as any).idToken = sessionStorage.getItem('kc_id_token') || storedToken;
              (keycloak as any).authenticated = true;
              (keycloak as any).tokenParsed = tokenPayload;
              (keycloak as any).subject = tokenPayload.sub;
              (keycloak as any).realmAccess = tokenPayload.realm_access || {};
              (keycloak as any).resourceAccess = tokenPayload.resource_access || {};
              
              // Extract user profile
              const tokenParsed = tokenPayload as Record<string, unknown>;
              setAuthenticated(true);
              setInitialized(true);
              setUser(extractUserProfile(keycloak, tokenParsed));
              
              // Set up token refresh
              keycloak.onTokenExpired = async () => {
                try {
                  await keycloak.updateToken(30);
                  // Update stored tokens
                  sessionStorage.setItem('kc_token', keycloak.token || '');
                  sessionStorage.setItem('kc_refresh_token', keycloak.refreshToken || '');
                } catch (error) {
                  console.warn('Failed to refresh token, logging out');
                  sessionStorage.removeItem('kc_token');
                  sessionStorage.removeItem('kc_refresh_token');
                  sessionStorage.removeItem('kc_id_token');
                  keycloak.logout();
                }
              };
              
              // Clear stored tokens after successful initialization
              sessionStorage.removeItem('kc_token');
              sessionStorage.removeItem('kc_refresh_token');
              sessionStorage.removeItem('kc_id_token');
              
              return;
            }
          } catch (e) {
            console.warn('Failed to parse stored token:', e);
            // Clear invalid tokens
            sessionStorage.removeItem('kc_token');
            sessionStorage.removeItem('kc_refresh_token');
            sessionStorage.removeItem('kc_id_token');
          }
        }
        
        // Check if already initialized
        if (keycloak.authenticated !== undefined) {
          setAuthenticated(keycloak.authenticated);
          setInitialized(true);
          
          if (keycloak.authenticated && keycloak.tokenParsed) {
            const tokenParsed = keycloak.tokenParsed as Record<string, unknown>;
            setUser(extractUserProfile(keycloak, tokenParsed));
          }
          return;
        }

        // Set a timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          console.warn('⚠️ Keycloak initialization timed out - running in guest mode');
          setAuthenticated(false);
          setUser(null);
          setInitialized(true);
        }, 10000); // 10 second timeout

        const auth = await keycloak.init({
          onLoad: 'check-sso',
          silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
          pkceMethod: 'S256',
        });

        clearTimeout(timeoutId);
        setAuthenticated(auth);
        setInitialized(true);

        if (auth && keycloak.tokenParsed) {
          const tokenParsed = keycloak.tokenParsed as Record<string, unknown>;
          setUser(extractUserProfile(keycloak, tokenParsed));
        }

        // Token refresh
        keycloak.onTokenExpired = () => {
          keycloak.updateToken(30).catch(() => {
            console.warn('Failed to refresh token, logging out');
            keycloak.logout();
          });
        };
      } catch (error) {
        console.error('Keycloak initialization failed:', error);
        // Don't hang - just run without authentication
        setAuthenticated(false);
        setUser(null);
        setInitialized(true);
      }
    };

    initKeycloak();
  }, [keycloak]);

  // Login with optional email/loginHint (for custom login form) or IDP hint (e.g., 'google', 'microsoft', 'saml')
  const login = (emailOrIdpHint?: string) => {
    // Mock auth mode - just set authenticated
    if (MOCK_AUTH_ENABLED) {
      // Check if user explicitly logged out - redirect to landing instead of auto-login
      const isLoggedOut = localStorage.getItem(MOCK_AUTH_LOGGED_OUT_KEY) === 'true';
      if (isLoggedOut) {
        // Don't auto-login, redirect to landing page
        window.location.replace(window.location.origin);
        return;
      }
      // Clear logged out state so user stays logged in on refresh
      localStorage.removeItem(MOCK_AUTH_LOGGED_OUT_KEY);
      setAuthenticated(true);
      setUser(MOCK_USER);
      return;
    }

    // If Keycloak is not available, show a message
    if (!KEYCLOAK_AVAILABLE) {
      console.warn('Keycloak not configured - login unavailable');
      alert('Authentication is not configured. Please contact support.');
      return;
    }
    
    // Redirect to our custom login page instead of Keycloak's UI
    // This maintains our custom UI/UX while using Keycloak securely via API
    const loginUrl = '/login' + (emailOrIdpHint && emailOrIdpHint.includes('@') 
      ? `?email=${encodeURIComponent(emailOrIdpHint)}` 
      : '');
    window.location.href = loginUrl;
  };

  // Register (signup) - navigates to custom registration page that uses Keycloak Admin API
  const register = (redirectUri?: string) => {
    console.log('[Auth] register() called, MOCK_AUTH_ENABLED:', MOCK_AUTH_ENABLED);
    // Mock auth mode - just set authenticated and navigate
    if (MOCK_AUTH_ENABLED) {
      console.log('[Auth] Mock mode - navigating to onboarding');
      // Clear logged out state so user stays logged in on refresh
      localStorage.removeItem(MOCK_AUTH_LOGGED_OUT_KEY);
      setAuthenticated(true);
      setUser(MOCK_USER);
      // Use assign for more reliable navigation
      window.location.assign(redirectUri || '/onboarding');
      return;
    }

    // Navigate to custom signup page that uses Keycloak Admin API
    // This maintains our custom UI/UX instead of redirecting to Keycloak's UI
    const signupUrl = '/signup' + (redirectUri ? `?redirect=${encodeURIComponent(redirectUri)}` : '');
    window.location.href = signupUrl;
  };

  const logout = () => {
    // Mock auth mode - just clear state
    if (MOCK_AUTH_ENABLED) {
      // Persist logged out state so mock auth doesn't auto-login on refresh
      localStorage.setItem(MOCK_AUTH_LOGGED_OUT_KEY, 'true');
      setAuthenticated(false);
      setUser(null);
      // Force full page reload to landing page - use replace to avoid back button issues
      window.location.replace(window.location.origin);
      return;
    }
    
    // If Keycloak isn't properly configured, just redirect to home
    if (!isKeycloakConfigured) {
      setAuthenticated(false);
      setUser(null);
      window.location.replace(window.location.origin);
      return;
    }
    
    keycloak.logout({
      redirectUri: window.location.origin,
    });
  };

  const getToken = () => {
    return keycloak.token;
  };

  // Link an additional identity provider to the current account
  const linkAccount = (provider: string) => {
    openAccountConsole('linked-accounts');
  };

  // Get Keycloak Account Console URL for a specific section
  const getAccountConsoleUrl = (section?: AccountSection): string => {
    const baseUrl = `${keycloakConfig.url}/realms/${keycloakConfig.realm}/account`;
    
    if (!section || section === 'account') {
      return baseUrl;
    }
    
    // Map sections to Keycloak Account Console paths
    const sectionPaths: Record<AccountSection, string> = {
      'account': '',
      'security': '/#/security',
      'password': '/#/security/password',
      'authenticator': '/#/security/authenticator',
      'device-activity': '/#/security/device-activity',
      'linked-accounts': '/#/security/linked-accounts',
      'applications': '/#/applications',
      'log': '/#/security/signing-in',
    };
    
    return `${baseUrl}${sectionPaths[section]}`;
  };

  // Open Keycloak Account Console in a new tab or redirect
  const openAccountConsole = (section?: AccountSection) => {
    const url = getAccountConsoleUrl(section);
    
    // In mock mode, show a message and optionally redirect to a demo page
    if (MOCK_AUTH_ENABLED) {
      console.log(`[Mock Auth] Would open Keycloak Account Console: ${url}`);
      
      // Show user-friendly message
      const sectionLabels: Record<AccountSection, string> = {
        'account': 'Account Settings',
        'security': 'Security Portal',
        'password': 'Password Change',
        'authenticator': '2FA Configuration',
        'device-activity': 'Device & Sessions',
        'linked-accounts': 'Linked Accounts',
        'applications': 'Applications',
        'personal-info': 'Personal Info',
      };
      
      const sectionName = section ? sectionLabels[section] : 'Account Console';
      
      // Show alert with mock mode message
      alert(
        `🔒 ${sectionName}\n\n` +
        `In production, this would open the Keycloak security portal where you can:\n\n` +
        `• Change your password\n` +
        `• Configure two-factor authentication\n` +
        `• Manage active sessions\n` +
        `• Configure enterprise SSO\n\n` +
        `URL: ${url}\n\n` +
        `Note: Mock authentication is enabled for development.`
      );
      return;
    }
    
    // Open in new tab for better UX - user can return to app easily
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const value: KeycloakContextType = {
    keycloak: keycloak,
    initialized,
    authenticated,
    user,
    login,
    register,
    logout,
    getToken,
    linkAccount,
    openAccountConsole,
    getAccountConsoleUrl,
  };

  return (
    <KeycloakContext.Provider value={value}>
      {children}
    </KeycloakContext.Provider>
  );
}

export function useKeycloak(): KeycloakContextType {
  const context = useContext(KeycloakContext);
  if (!context) {
    throw new Error('useKeycloak must be used within a KeycloakProvider');
  }
  return context;
}

export function useAuth() {
  const { authenticated, user, login, logout, register } = useKeycloak();
  return { authenticated, user, login, logout, register };
}

export function useAuthenticatedFetch() {
  const { getToken } = useKeycloak();

  return async (url: string, options: RequestInit = {}) => {
    const token = getToken();
    const headers = new Headers(options.headers);
    
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('Content-Type', 'application/json');

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  };
}
