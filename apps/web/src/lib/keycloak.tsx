import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import Keycloak from 'keycloak-js';

// Check if mock auth is enabled (for development/testing without Keycloak)
// Defaults to true in development mode when VITE_MOCK_AUTH is not explicitly set
const MOCK_AUTH_ENABLED = import.meta.env.VITE_MOCK_AUTH === 'true' || 
  (import.meta.env.DEV && import.meta.env.VITE_MOCK_AUTH !== 'false');

// Keycloak configuration
const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'plainledger',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'plainledger-web',
};

// Mock user for development
const MOCK_USER: UserProfile = {
  id: 'mock-user-001',
  email: 'admin@plainledger.com',
  name: 'Admin User',
  firstName: 'Admin',
  lastName: 'User',
  organization: 'PlainLedger Demo',
  roles: ['admin', 'user'],
  locale: 'en',
  emailVerified: true,
  identityProvider: 'local',
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
    emailVerified: tokenParsed.email_verified as boolean,
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
      console.log('🔓 Mock authentication enabled - bypassing Keycloak');
      setAuthenticated(true);
      setUser(MOCK_USER);
      setInitialized(true);
      return;
    }

    const initKeycloak = async () => {
      try {
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

        const auth = await keycloak.init({
          onLoad: 'check-sso',
          silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
          pkceMethod: 'S256',
        });

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
        setInitialized(true);
      }
    };

    initKeycloak();
  }, [keycloak]);

  // Login with optional IDP hint (e.g., 'google', 'microsoft', 'saml')
  const login = (idpHint?: string) => {
    // Mock auth mode - just set authenticated
    if (MOCK_AUTH_ENABLED) {
      setAuthenticated(true);
      setUser(MOCK_USER);
      return;
    }
    
    const options: Keycloak.KeycloakLoginOptions = {
      locale: document.documentElement.lang === 'en' ? 'en' : 'fr',
    };
    
    // If IDP hint provided, redirect directly to that provider
    if (idpHint) {
      options.idpHint = idpHint;
    }
    
    keycloak.login(options);
  };

  // Register (signup) - redirects to Keycloak registration page
  const register = (redirectUri?: string) => {
    // Mock auth mode - just set authenticated
    if (MOCK_AUTH_ENABLED) {
      setAuthenticated(true);
      setUser(MOCK_USER);
      window.location.href = '/onboarding';
      return;
    }
    
    keycloak.register({
      locale: document.documentElement.lang === 'en' ? 'en' : 'fr',
      redirectUri: redirectUri || window.location.origin + '/onboarding',
    });
  };

  const logout = () => {
    // Mock auth mode - just clear state
    if (MOCK_AUTH_ENABLED) {
      setAuthenticated(false);
      setUser(null);
      window.location.href = '/';
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
        `• Link social accounts (Google, Microsoft)\n\n` +
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
  const { authenticated, user, login, logout } = useKeycloak();
  return { authenticated, user, login, logout };
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
