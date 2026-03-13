import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080',
  realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'plainledger',
  clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'plainledger-admin',
};

/**
 * Detect whether the current URL contains Keycloak callback parameters
 * (state, session_state, code query params added by Keycloak after redirect)
 */
export function hasKeycloakCallbackParams(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.has('state') && params.has('session_state') && params.has('code');
}

/**
 * Initialize keycloak-js to handle the redirect callback.
 * Returns tokens on success, null on failure.
 */
export async function initKeycloakForCallback(): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} | null> {
  const kc = new Keycloak(keycloakConfig);

  try {
    const authenticated = await kc.init({
      onLoad: 'check-sso',
      pkceMethod: 'S256',
      silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
    });

    if (authenticated && kc.token && kc.refreshToken) {
      return {
        accessToken: kc.token,
        refreshToken: kc.refreshToken,
        expiresIn: kc.tokenParsed?.exp
          ? kc.tokenParsed.exp - Math.floor(Date.now() / 1000)
          : 300,
      };
    }
  } catch (error) {
    console.error('[SSO] Failed to process callback:', error);
  }

  return null;
}

/**
 * Start SSO login redirect.
 * @param idpHint - Optional identity provider hint (e.g., 'google', 'microsoft')
 */
export async function startSSOLogin(idpHint?: string): Promise<void> {
  const kc = new Keycloak(keycloakConfig);

  try {
    await kc.init({});
    kc.login({
      redirectUri: window.location.origin + '/login',
      ...(idpHint ? { idpHint } : {}),
    });
  } catch (error) {
    console.error('[SSO] Failed to start login:', error);
  }
}

/**
 * Refresh token directly against Keycloak using the public admin client.
 * Needed because the API's /api/auth/refresh uses the confidential plainledger-api client,
 * and tokens are bound to the issuing client.
 */
export async function refreshSSOToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} | null> {
  const tokenUrl = `${keycloakConfig.url}/realms/${keycloakConfig.realm}/protocol/openid-connect/token`;

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: keycloakConfig.clientId,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      console.log('[SSO] Token refresh failed:', response.status);
      return null;
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in || 300,
    };
  } catch (error) {
    console.error('[SSO] Token refresh error:', error);
    return null;
  }
}

/**
 * Get the Keycloak end-session URL for SSO logout.
 */
export function getKeycloakLogoutUrl(): string {
  return `${keycloakConfig.url}/realms/${keycloakConfig.realm}/protocol/openid-connect/logout?post_logout_redirect_uri=${encodeURIComponent(window.location.origin + '/login')}&client_id=${keycloakConfig.clientId}`;
}
