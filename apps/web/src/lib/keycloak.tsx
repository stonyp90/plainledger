import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import Keycloak from 'keycloak-js';

// Check if mock auth is enabled (for development/testing without Keycloak)
// Defaults to true in development mode when VITE_MOCK_AUTH is not explicitly set
// Also check for Storybook-specific flag
const isStorybook = typeof window !== 'undefined' && (window as any).__STORYBOOK_MOCK_AUTH__;
const MOCK_AUTH_ENABLED =
  import.meta.env.VITE_MOCK_AUTH === 'true' ||
  (import.meta.env.DEV && import.meta.env.VITE_MOCK_AUTH !== 'false') ||
  isStorybook;

// Export for use in other modules that need to skip API calls in mock mode
export const isMockAuthEnabled = () => MOCK_AUTH_ENABLED;

// Key for persisting mock auth logout state
const MOCK_AUTH_LOGGED_OUT_KEY = 'plainledger_mock_auth_logged_out';

// Check if Keycloak URL is properly configured (not localhost in production)
const keycloakUrl = import.meta.env.VITE_KEYCLOAK_URL || '';
const isKeycloakConfigured =
  keycloakUrl && !keycloakUrl.includes('localhost') && !keycloakUrl.includes('127.0.0.1');

// If Keycloak is not configured in production, fall back to mock auth to prevent hanging
const KEYCLOAK_AVAILABLE = MOCK_AUTH_ENABLED || isKeycloakConfigured || import.meta.env.DEV;

// Keycloak configuration
const keycloakConfig = {
  url: keycloakUrl || 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'plainledger',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'plainledger-web',
};

// Mock user profiles for development sign-in
// Each profile maps to a Keycloak test user with specific role + subscription tier
export interface MockUserProfile extends UserProfile {
  label: string;
  description: string;
  tier: 'enterprise' | 'professional' | 'free';
  roleLabel: string;
}

export const MOCK_USERS: MockUserProfile[] = [
  {
    id: 'mock-user-enterprise-owner',
    email: 'demo@plainledger.ca',
    name: 'Demo User',
    firstName: 'Demo',
    lastName: 'User',
    organization: 'demo-org',
    roles: ['user', 'plainledger-staff', 'owner'],
    locale: 'en',
    emailVerified: true,
    identityProvider: 'local',
    picture:
      'https://api.dicebear.com/7.x/avataaars/svg?seed=DemoOwner&backgroundColor=b6e3f4&clothesColor=3c4f5c&eyebrows=default&eyes=default&facialHair=blank&hairColor=2c1b18&mouth=smile&skinColor=f8d25c&top=shortHair',
    label: 'Owner',
    description: 'Full access, all features',
    tier: 'enterprise',
    roleLabel: 'Owner',
  },
  {
    id: 'mock-user-admin',
    email: 'admin@plainledger.ca',
    name: 'Admin User',
    firstName: 'Admin',
    lastName: 'User',
    organization: 'demo-org',
    roles: ['user', 'plainledger-staff', 'admin'],
    locale: 'en',
    emailVerified: true,
    identityProvider: 'local',
    picture:
      'https://api.dicebear.com/7.x/avataaars/svg?seed=AdminUser&backgroundColor=c0aede&clothesColor=3c4f5c&eyebrows=default&eyes=default&facialHair=blank&hairColor=4a312c&mouth=smile&skinColor=edb98a&top=shortHair',
    label: 'Admin',
    description: 'Manage team & settings',
    tier: 'enterprise',
    roleLabel: 'Admin',
  },
  {
    id: 'mock-user-accountant',
    email: 'accountant@plainledger.ca',
    name: 'Accountant User',
    firstName: 'Accountant',
    lastName: 'User',
    organization: 'demo-org',
    roles: ['user', 'accountant'],
    locale: 'en',
    emailVerified: true,
    identityProvider: 'local',
    picture:
      'https://api.dicebear.com/7.x/avataaars/svg?seed=AccountantUser&backgroundColor=ffd5dc&clothesColor=3c4f5c&eyebrows=default&eyes=default&facialHair=blank&hairColor=724133&mouth=smile&skinColor=f8d25c&top=longHair',
    label: 'Accountant',
    description: 'Reports & financial data',
    tier: 'professional',
    roleLabel: 'Accountant',
  },
  {
    id: 'mock-user-member',
    email: 'demo-pro@plainledger.ca',
    name: 'Pro Member',
    firstName: 'Pro',
    lastName: 'Member',
    organization: 'demo-org',
    roles: ['user', 'member'],
    locale: 'en',
    emailVerified: true,
    identityProvider: 'local',
    picture:
      'https://api.dicebear.com/7.x/avataaars/svg?seed=ProMember&backgroundColor=d1d4f9&clothesColor=3c4f5c&eyebrows=default&eyes=default&facialHair=blank&hairColor=2c1b18&mouth=smile&skinColor=edb98a&top=shortHair',
    label: 'Member',
    description: 'Standard team access',
    tier: 'professional',
    roleLabel: 'Member',
  },
  {
    id: 'mock-user-viewer-free',
    email: 'demo-free@plainledger.ca',
    name: 'Free Viewer',
    firstName: 'Free',
    lastName: 'Viewer',
    organization: 'demo-org',
    roles: ['user', 'viewer'],
    locale: 'en',
    emailVerified: true,
    identityProvider: 'local',
    picture:
      'https://api.dicebear.com/7.x/avataaars/svg?seed=FreeViewer&backgroundColor=ffdfbf&clothesColor=3c4f5c&eyebrows=default&eyes=default&facialHair=blank&hairColor=a55728&mouth=smile&skinColor=f8d25c&top=shortHair',
    label: 'Viewer',
    description: 'Read-only, free tier',
    tier: 'free',
    roleLabel: 'Viewer',
  },
];

// Default mock user (first in list)
const MOCK_USER: UserProfile = MOCK_USERS[0];

// Key for persisting selected mock user
const MOCK_USER_SELECTED_KEY = 'plainledger_mock_user_selected';

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
  | 'account' // Personal info
  | 'security' // Security overview
  | 'password' // Change password
  | 'authenticator' // 2FA/MFA setup
  | 'device-activity' // Active sessions
  | 'linked-accounts' // Social/enterprise logins
  | 'applications' // Authorized apps
  | 'log'; // Sign-in history

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
  // Dev sign-in: select a mock user profile
  selectMockUser: (mockUser: MockUserProfile) => void;
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
  const picture =
    (tokenParsed.picture as string) ||
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

// Helper to set mock user on keycloak instance and state
function loginAsMockUser(
  keycloak: Keycloak,
  mockUser: UserProfile,
  setAuthenticated: (v: boolean) => void,
  setUser: (u: UserProfile | null) => void,
  setInitialized: (v: boolean) => void,
) {
  const mockTokenPayload = {
    sub: mockUser.id,
    email: mockUser.email,
    name: mockUser.name,
    given_name: mockUser.firstName,
    family_name: mockUser.lastName,
    organization: mockUser.organization,
    realm_access: { roles: mockUser.roles },
    exp: Math.floor(Date.now() / 1000) + 86400,
    iat: Math.floor(Date.now() / 1000),
  };
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = btoa(JSON.stringify(mockTokenPayload));
  const mockToken = `${header}.${payload}.mock-signature`;

  (keycloak as any).token = mockToken;
  (keycloak as any).authenticated = true;
  (keycloak as any).subject = mockUser.id;
  (keycloak as any).tokenParsed = mockTokenPayload;
  (keycloak as any).realmAccess = mockTokenPayload.realm_access;
  (window as unknown as { keycloak: typeof keycloak }).keycloak = keycloak;

  localStorage.removeItem(MOCK_AUTH_LOGGED_OUT_KEY);
  setAuthenticated(true);
  setUser(mockUser);
  setInitialized(true);
}

interface KeycloakProviderProps {
  children: ReactNode;
}

export function KeycloakProvider({ children }: KeycloakProviderProps) {
  // Check for Storybook environment
  const isStorybookEnv =
    typeof window !== 'undefined' &&
    (window.location.href.includes('storybook') || (window as any).__STORYBOOK_MOCK_AUTH__);

  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<KeycloakContextType['user']>(null);
  const initCalled = useRef(false);
  // Track if we used stored tokens (custom login) - Keycloak.init() not called
  const usedStoredTokensRef = useRef(false);
  const keycloak = getKeycloakInstance();

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (initCalled.current) return;
    initCalled.current = true;

    // In Storybook, initialize mock auth immediately
    if (isStorybookEnv) {
      const mockTokenPayload = {
        sub: MOCK_USER.id,
        email: MOCK_USER.email,
        name: MOCK_USER.name,
        given_name: MOCK_USER.firstName,
        family_name: MOCK_USER.lastName,
        organization: MOCK_USER.organization,
        realm_access: { roles: MOCK_USER.roles },
        exp: Math.floor(Date.now() / 1000) + 86400,
        iat: Math.floor(Date.now() / 1000),
      };
      const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
      const payload = btoa(JSON.stringify(mockTokenPayload));
      const mockToken = `${header}.${payload}.mock-signature`;
      (keycloak as any).token = mockToken;
      (keycloak as any).authenticated = true;
      (keycloak as any).subject = MOCK_USER.id;
      (keycloak as any).tokenParsed = mockTokenPayload;
      (keycloak as any).realmAccess = mockTokenPayload.realm_access;
      (window as unknown as { keycloak: typeof keycloak }).keycloak = keycloak;
      setAuthenticated(true);
      setUser(MOCK_USER);
      setInitialized(true);
      return;
    }

    // FIRST: Check for stored tokens from custom login BEFORE any other initialization
    // This ensures we use real tokens even if mock auth is enabled
    const storedToken = sessionStorage.getItem('kc_token');
    const storedRefreshToken = sessionStorage.getItem('kc_refresh_token');
    const storedIdToken = sessionStorage.getItem('kc_id_token');

    // If we have real tokens from login, use them instead of mock auth
    if (storedToken && storedRefreshToken) {
      const initKeycloak = async () => {
        try {
          // We have tokens from custom login - set them in Keycloak client
          // Try to parse the access token first, fall back to id token
          let tokenToParse = storedToken;
          if (storedIdToken) {
            tokenToParse = storedIdToken;
          }

          const tokenParts = tokenToParse.split('.');
          if (tokenParts.length === 3) {
            // Decode base64 token payload
            const base64Url = tokenParts[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join(''),
            );
            const tokenPayload = JSON.parse(jsonPayload);

            // Set tokens in Keycloak client
            (keycloak as any).token = storedToken;
            (keycloak as any).refreshToken = storedRefreshToken;
            (keycloak as any).idToken = storedIdToken || storedToken;
            (keycloak as any).authenticated = true;
            (keycloak as any).tokenParsed = tokenPayload;
            (keycloak as any).subject = tokenPayload.sub;
            (keycloak as any).realmAccess = tokenPayload.realm_access || {};
            (keycloak as any).resourceAccess = tokenPayload.resource_access || {};

            // Mark that we used stored tokens (Keycloak.init() not called)
            usedStoredTokensRef.current = true;

            // Extract user profile
            const tokenParsed = tokenPayload as Record<string, unknown>;
            setAuthenticated(true);
            setInitialized(true);
            setUser(extractUserProfile(keycloak, tokenParsed));

            // Expose keycloak to window for other modules to access token
            (window as unknown as { keycloak: typeof keycloak }).keycloak = keycloak;

            // Set up token refresh - since we didn't call init(), we need to refresh manually
            keycloak.onTokenExpired = async () => {
              try {
                // Refresh token by calling Keycloak token endpoint directly
                const refreshToken = (keycloak as any).refreshToken;
                if (!refreshToken) {
                  throw new Error('No refresh token available');
                }

                const tokenUrl = `${keycloakConfig.url}/realms/${keycloakConfig.realm}/protocol/openid-connect/token`;
                const response = await fetch(tokenUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    client_id: keycloakConfig.clientId,
                    refresh_token: refreshToken,
                  }),
                });

                if (!response.ok) {
                  throw new Error('Token refresh failed');
                }

                const tokens = await response.json();

                // Update keycloak instance with new tokens
                (keycloak as any).token = tokens.access_token;
                (keycloak as any).refreshToken = tokens.refresh_token;
                if (tokens.id_token) {
                  (keycloak as any).idToken = tokens.id_token;
                }

                console.log('✅ Token refreshed successfully');
              } catch (error) {
                console.warn('Failed to refresh token, redirecting to login');
                sessionStorage.removeItem('kc_token');
                sessionStorage.removeItem('kc_refresh_token');
                sessionStorage.removeItem('kc_id_token');
                // Redirect to logout endpoint to clear server session, then back to login
                const logoutUrl = `${keycloakConfig.url}/realms/${keycloakConfig.realm}/protocol/openid-connect/logout?post_logout_redirect_uri=${encodeURIComponent(window.location.origin + '/login')}&client_id=${keycloakConfig.clientId}`;
                window.location.href = logoutUrl;
              }
            };

            // Clear stored tokens after successful initialization (they're now in Keycloak client)
            sessionStorage.removeItem('kc_token');
            sessionStorage.removeItem('kc_refresh_token');
            sessionStorage.removeItem('kc_id_token');
            sessionStorage.removeItem('kc_user');

            console.log('✅ Keycloak initialized with stored tokens from custom login');
            return;
          }
        } catch (e) {
          console.warn('Failed to parse stored token:', e);
          // Clear invalid tokens
          sessionStorage.removeItem('kc_token');
          sessionStorage.removeItem('kc_refresh_token');
          sessionStorage.removeItem('kc_id_token');
          sessionStorage.removeItem('kc_user');
          // Fall through - will continue with normal Keycloak init below
        }
      };

      initKeycloak();
      return; // Exit early - we've handled token-based login
    }

    // Mock authentication mode for development/testing (only if no stored tokens)
    // Also enable in Storybook environment
    if (MOCK_AUTH_ENABLED || isStorybookEnv) {
      // Check if a mock user was previously selected (persists across refreshes)
      const savedMockUser = localStorage.getItem(MOCK_USER_SELECTED_KEY);

      if (savedMockUser && !localStorage.getItem(MOCK_AUTH_LOGGED_OUT_KEY)) {
        try {
          const selectedUser: MockUserProfile = JSON.parse(savedMockUser);
          console.log(`🔓 Mock auth - resuming as ${selectedUser.label} (${selectedUser.email})`);
          loginAsMockUser(keycloak, selectedUser, setAuthenticated, setUser, setInitialized);
          return;
        } catch {
          localStorage.removeItem(MOCK_USER_SELECTED_KEY);
        }
      }

      // No saved user or logged out — show dev sign-in page
      console.log('🔓 Mock authentication enabled - showing dev sign-in');
      setAuthenticated(false);
      setUser(null);
      setInitialized(true);
      return;
    }

    // If Keycloak is not properly configured, use guest mode
    if (!KEYCLOAK_AVAILABLE) {
      console.warn(
        '⚠️ Keycloak not configured - running in guest mode. Set VITE_KEYCLOAK_URL for authentication.',
      );
      setAuthenticated(false);
      setUser(null);
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

        // Expose keycloak to window for other modules to access token
        (window as unknown as { keycloak: typeof keycloak }).keycloak = keycloak;

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
    // Always redirect to custom login page - consistent behavior in all modes
    // This maintains our custom UI/UX while using Keycloak securely via API
    const loginUrl =
      '/login' +
      (emailOrIdpHint && emailOrIdpHint.includes('@')
        ? `?email=${encodeURIComponent(emailOrIdpHint)}`
        : '');
    window.location.href = loginUrl;
  };

  // Register (signup) - navigates to custom registration page that uses Keycloak Admin API
  const register = (redirectUri?: string) => {
    // Always redirect to custom signup page - consistent behavior in all modes
    // This maintains our custom UI/UX instead of redirecting to Keycloak's UI
    const signupUrl =
      '/signup' + (redirectUri ? `?redirect=${encodeURIComponent(redirectUri)}` : '');
    window.location.href = signupUrl;
  };

  const logout = () => {
    // Mock auth mode - just clear state
    if (MOCK_AUTH_ENABLED) {
      // Persist logged out state and clear selected user
      localStorage.setItem(MOCK_AUTH_LOGGED_OUT_KEY, 'true');
      localStorage.removeItem(MOCK_USER_SELECTED_KEY);
      setAuthenticated(false);
      setUser(null);
      // Navigate to dev sign-in instead of full reload
      window.location.replace(window.location.origin + '/login');
      return;
    }

    // If Keycloak isn't properly configured, just redirect to home
    if (!isKeycloakConfigured) {
      setAuthenticated(false);
      setUser(null);
      window.location.replace(window.location.origin);
      return;
    }

    // If we used stored tokens (custom login), Keycloak.init() was never called
    // so the adapter isn't available. Handle logout manually.
    if (usedStoredTokensRef.current) {
      setAuthenticated(false);
      setUser(null);
      // Clear any remaining tokens
      sessionStorage.removeItem('kc_token');
      sessionStorage.removeItem('kc_refresh_token');
      sessionStorage.removeItem('kc_id_token');
      sessionStorage.removeItem('kc_user');
      // Build logout URL manually to end session on Keycloak server
      const logoutUrl = `${keycloakConfig.url}/realms/${keycloakConfig.realm}/protocol/openid-connect/logout?post_logout_redirect_uri=${encodeURIComponent(window.location.origin)}&client_id=${keycloakConfig.clientId}`;
      window.location.href = logoutUrl;
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
      account: '',
      security: '/#/security',
      password: '/#/security/password',
      authenticator: '/#/security/authenticator',
      'device-activity': '/#/security/device-activity',
      'linked-accounts': '/#/security/linked-accounts',
      applications: '/#/applications',
      log: '/#/security/signing-in',
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
        account: 'Account Settings',
        security: 'Security Portal',
        password: 'Password Change',
        authenticator: '2FA Configuration',
        'device-activity': 'Device & Sessions',
        'linked-accounts': 'Linked Accounts',
        applications: 'Applications',
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
          `Note: Mock authentication is enabled for development.`,
      );
      return;
    }

    // Open in new tab for better UX - user can return to app easily
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Dev sign-in: select a mock user and authenticate
  const selectMockUser = (mockUser: MockUserProfile) => {
    localStorage.setItem(MOCK_USER_SELECTED_KEY, JSON.stringify(mockUser));
    loginAsMockUser(keycloak, mockUser, setAuthenticated, setUser, setInitialized);
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
    selectMockUser,
  };

  return <KeycloakContext.Provider value={value}>{children}</KeycloakContext.Provider>;
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
