import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import Keycloak from 'keycloak-js';

// Mock authentication must be explicitly enabled in a development build.
// URL parameters, saved tokens, and window flags cannot enable it in production.
const MOCK_AUTH_ENABLED = import.meta.env.DEV && import.meta.env.VITE_MOCK_AUTH === 'true';
export const isMockAuthEnabled = () => MOCK_AUTH_ENABLED;
const MOCK_AUTH_LOGGED_OUT_KEY = 'plainledger_mock_auth_logged_out';

const keycloakUrl = import.meta.env.VITE_KEYCLOAK_URL || (import.meta.env.DEV ? 'http://localhost:8080' : '');
const isKeycloakConfigured = (() => {
  try {
    const url = new URL(keycloakUrl);
    const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    return url.protocol === 'https:' || (url.protocol === 'http:' && (import.meta.env.DEV || isLoopback));
  } catch {
    return false;
  }
})();

const keycloakConfig = {
  url: keycloakUrl || window.location.origin,
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'plainledger',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'plainledger-web',
};

/** Only allow a return to this application after sign-in. */
export function getLoginRedirectUri(requested?: string | null): string {
  const fallback = new URL('/app', window.location.origin).href;
  try {
    const target = new URL(requested || '/app', window.location.origin);
    if (target.origin !== window.location.origin || ['/login', '/signin', '/signup', '/register', '/mfa/verify'].includes(target.pathname.replace(/\/+$/, ''))) return fallback;
    return target.href;
  } catch {
    return fallback;
  }
}

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
  authError: string | null;
  login: (idpHint?: string) => Promise<void>; // Optional IDP hint for direct login
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
    roles: [...new Set([...(keycloak.realmAccess?.roles || []), ...(keycloak.resourceAccess?.[keycloakConfig.clientId]?.roles || [])])],
    picture,
    locale: tokenParsed.locale as string,
    emailVerified: tokenParsed.email_verified === true,
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

// The adapter only permits one init call; share it across StrictMode effects/remounts.
let keycloakInitialization: Promise<boolean> | null = null;
function initializeKeycloak(keycloak: Keycloak): Promise<boolean> {
  if (!isKeycloakConfigured) return Promise.reject(new Error('Secure sign-in is not configured.'));
  if (!keycloakInitialization) {
    keycloakInitialization = keycloak.init({
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
      silentCheckSsoFallback: false,
      pkceMethod: 'S256',
      flow: 'standard',
      checkLoginIframe: false,
    });
  }
  return keycloakInitialization;
}

export function KeycloakProvider({ children }: KeycloakProviderProps) {
  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<KeycloakContextType['user']>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const keycloak = getKeycloakInstance();

  useEffect(() => {
    let active = true;
    // Retire the old password-grant session storage. The adapter owns tokens in memory.
    for (const name of ['kc_token', 'kc_refresh_token', 'kc_id_token', 'kc_user']) {
      sessionStorage.removeItem(name);
    }

    if (MOCK_AUTH_ENABLED) {
      try {
        const selected = JSON.parse(localStorage.getItem(MOCK_USER_SELECTED_KEY) || 'null');
        const savedUser = MOCK_USERS.find(profile => profile.id === selected?.id);
        if (savedUser && !localStorage.getItem(MOCK_AUTH_LOGGED_OUT_KEY)) {
          loginAsMockUser(keycloak, savedUser, setAuthenticated, setUser, setInitialized);
          return;
        }
      } catch {
        localStorage.removeItem(MOCK_USER_SELECTED_KEY);
      }
      setInitialized(true);
      return;
    }

    let sessionIdentity: string | null = null;
    const syncSession = () => {
      if (!active) return;
      const loggedIn = keycloak.authenticated === true && !!keycloak.token;
      const nextIdentity = loggedIn ? JSON.stringify([keycloak.subject, keycloak.tokenParsed?.organization, [...(keycloak.realmAccess?.roles || [])].sort(), keycloak.resourceAccess]) : null;
      if (sessionIdentity !== nextIdentity) {
        sessionIdentity = nextIdentity;
        window.dispatchEvent(new Event('plainledger:auth-changed'));
      }
      setAuthenticated(loggedIn);
      setUser(loggedIn && keycloak.tokenParsed
        ? extractUserProfile(keycloak, { ...keycloak.idTokenParsed, ...keycloak.tokenParsed })
        : null);
      if (loggedIn) setAuthError(null);
    };
    const expireSession = () => {
      keycloak.clearToken();
      syncSession();
      if (active) setAuthError('Your session expired. Sign in again.');
    };
    const refreshSession = async () => {
      if (!keycloak.authenticated) return;
      try {
        await keycloak.updateToken(60);
        syncSession();
      } catch {
        expireSession();
      }
    };
    keycloak.onAuthSuccess = syncSession;
    keycloak.onAuthRefreshSuccess = syncSession;
    keycloak.onAuthLogout = syncSession;
    keycloak.onAuthRefreshError = expireSession;
    keycloak.onTokenExpired = () => { void refreshSession(); };
    (window as unknown as { keycloak: Keycloak }).keycloak = keycloak;

    const timeout = window.setTimeout(() => {
      if (!active) return;
      setAuthError('Secure sign-in is taking too long. Reload the page and try again.');
      setInitialized(true);
    }, 10000);
    initializeKeycloak(keycloak).then(() => {
      if (!active) return;
      window.clearTimeout(timeout);
      syncSession();
      setInitialized(true);
    }).catch(() => {
      if (!active) return;
      window.clearTimeout(timeout);
      setAuthenticated(false);
      setUser(null);
      setAuthError('Secure sign-in is unavailable. Reload the page and try again.');
      setInitialized(true);
    });
    const interval = window.setInterval(() => { void refreshSession(); }, 30000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void refreshSession();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      active = false;
      window.clearTimeout(timeout);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      keycloak.onAuthSuccess = undefined;
      keycloak.onAuthRefreshSuccess = undefined;
      keycloak.onAuthLogout = undefined;
      keycloak.onAuthRefreshError = undefined;
      keycloak.onTokenExpired = undefined;
    };
  }, [keycloak]);

  const login = async (emailOrIdpHint?: string) => {
    if (MOCK_AUTH_ENABLED) {
      window.location.assign('/login');
      return;
    }
    if (authError && !keycloak.authenticated) throw new Error(authError);
    await initializeKeycloak(keycloak);
    const redirect = new URLSearchParams(window.location.search).get('redirect');
    await keycloak.login({
      redirectUri: getLoginRedirectUri(redirect),
      ...(emailOrIdpHint?.includes('@') ? { loginHint: emailOrIdpHint.trim() } : emailOrIdpHint ? { idpHint: emailOrIdpHint } : {}),
    });
  };

  // The existing signup page also collects organization/onboarding information.
  const register = (redirectUri?: string) => {
    window.location.assign('/signup' + (redirectUri ? `?redirect=${encodeURIComponent(getLoginRedirectUri(redirectUri))}` : ''));
  };

  const logout = () => {
    if (MOCK_AUTH_ENABLED) {
      localStorage.setItem(MOCK_AUTH_LOGGED_OUT_KEY, 'true');
      localStorage.removeItem(MOCK_USER_SELECTED_KEY);
      keycloak.token = undefined;
      keycloak.authenticated = false;
      setAuthenticated(false);
      setUser(null);
      window.location.replace(window.location.origin + '/login');
      return;
    }
    if (!keycloak.authenticated) {
      setAuthenticated(false);
      setUser(null);
      return;
    }
    // Preserve the adapter's ID token until it builds the server logout request.
    void keycloak.logout({ redirectUri: window.location.origin }).catch(() => {
      keycloak.clearToken();
      setAuthenticated(false);
      setUser(null);
      setAuthError('Unable to complete sign-out. Reload the page and try again.');
    });
  };

  const getToken = () => {
    if (!keycloak.authenticated || !keycloak.token) return undefined;
    if (MOCK_AUTH_ENABLED) return keycloak.token;
    try {
      return keycloak.isTokenExpired() ? undefined : keycloak.token;
    } catch {
      return undefined;
    }
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
        log: 'Sign-in History',
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
    if (!MOCK_AUTH_ENABLED) throw new Error('Mock authentication is disabled.');
    localStorage.setItem(MOCK_USER_SELECTED_KEY, JSON.stringify(mockUser));
    loginAsMockUser(keycloak, mockUser, setAuthenticated, setUser, setInitialized);
  };

  const value: KeycloakContextType = {
    keycloak: keycloak,
    initialized,
    authenticated,
    user,
    authError,
    login,
    register,
    logout,
    getToken,
    linkAccount,
    openAccountConsole,
    getAccountConsoleUrl,
    selectMockUser,
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
  const { getToken, keycloak } = useKeycloak();

  return async (url: string, options: RequestInit = {}) => {
    if (!MOCK_AUTH_ENABLED && keycloak.authenticated) await keycloak.updateToken(30);
    const token = getToken();
    if (!token) throw new Error('Sign in to continue.');
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

    return response.status === 204 ? undefined : response.json();
  };
}
