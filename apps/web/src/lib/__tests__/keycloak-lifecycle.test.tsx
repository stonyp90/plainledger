import { StrictMode } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { client } = vi.hoisted(() => ({
  client: {
    init: vi.fn(), login: vi.fn(), logout: vi.fn(), updateToken: vi.fn(), clearToken: vi.fn(), isTokenExpired: vi.fn(),
    authenticated: false,
    token: undefined as string | undefined,
    tokenParsed: undefined as Record<string, unknown> | undefined,
    idTokenParsed: undefined as Record<string, unknown> | undefined,
    realmAccess: { roles: ['user'] },
    resourceAccess: {},
    subject: 'user-1',
    onAuthSuccess: undefined as (() => void) | undefined,
    onAuthRefreshSuccess: undefined as (() => void) | undefined,
    onAuthLogout: undefined as (() => void) | undefined,
    onAuthRefreshError: undefined as (() => void) | undefined,
    onTokenExpired: undefined as (() => void) | undefined,
  },
}));

vi.mock('keycloak-js', () => ({ default: vi.fn(function MockKeycloak() { return client; }) }));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('DEV', false);
  vi.stubEnv('VITE_MOCK_AUTH', 'true');
  vi.stubEnv('VITE_KEYCLOAK_URL', 'https://identity.example.test');
  vi.stubEnv('VITE_KEYCLOAK_REALM', 'plainledger');
  vi.stubEnv('VITE_KEYCLOAK_CLIENT_ID', 'plainledger-web');
  sessionStorage.clear();
  client.authenticated = false;
  client.token = undefined;
  client.tokenParsed = undefined;
  client.idTokenParsed = undefined;
  client.realmAccess = { roles: ['user'] };
  client.init.mockReset().mockImplementation(async () => client.authenticated);
  client.login.mockReset().mockResolvedValue(undefined);
  client.logout.mockReset().mockResolvedValue(undefined);
  client.updateToken.mockReset().mockResolvedValue(false);
  client.isTokenExpired.mockReset().mockReturnValue(false);
  client.clearToken.mockReset().mockImplementation(() => {
    client.token = undefined;
    client.authenticated = false;
    client.onAuthLogout?.();
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  delete (window as unknown as Record<string, unknown>).__STORYBOOK_MOCK_AUTH__;
  window.history.replaceState({}, '', '/');
});

async function mountAuth() {
  const auth = await import('../keycloak');
  let context!: ReturnType<typeof auth.useKeycloak>;
  function Probe() {
    context = auth.useKeycloak();
    return <output data-testid="auth">{String(context.authenticated)}:{context.user?.roles.join(',') ?? 'guest'}</output>;
  }
  render(<StrictMode><auth.KeycloakProvider><Probe /></auth.KeycloakProvider></StrictMode>);
  await screen.findByTestId('auth');
  await waitFor(() => expect(context.initialized).toBe(true));
  return { auth, getContext: () => context };
}

describe('Keycloak adapter lifecycle (SDK mocked, not an end-to-end login)', () => {
  it('never enables production mock login via build flag, URL, or Storybook globals', async () => {
    window.history.replaceState({}, '', '/login?storybook=true');
    (window as unknown as Record<string, unknown>).__STORYBOOK_MOCK_AUTH__ = true;
    const { auth, getContext } = await mountAuth();
    expect(auth.isMockAuthEnabled()).toBe(false);
    expect(client.init).toHaveBeenCalledTimes(1);
    expect(getContext().authenticated).toBe(false);
    expect(() => getContext().selectMockUser(auth.MOCK_USERS[0])).toThrow('Mock authentication is disabled');
  });

  it('renders public content while the identity provider is pending', async () => {
    client.init.mockImplementationOnce(() => new Promise(() => {}));
    const auth = await import('../keycloak');
    function PublicPage() {
      return <p>{auth.useKeycloak().initialized ? 'Initialized' : 'Public content is available'}</p>;
    }
    render(<auth.KeycloakProvider><PublicPage /></auth.KeycloakProvider>);
    expect(screen.getByText('Public content is available')).toBeVisible();
    expect(client.init).toHaveBeenCalledOnce();
  });

  it.each(['http://localhost:8080', 'http://127.0.0.1:8080', 'http://[::1]:8080'])('allows loopback %s for a production-build integration test', async url => {
    vi.stubEnv('VITE_KEYCLOAK_URL', url);
    const { getContext } = await mountAuth();
    expect(client.init).toHaveBeenCalledOnce();
    expect(getContext().authError).toBeNull();
  });

  it('rejects remote plain HTTP in a production build', async () => {
    vi.stubEnv('VITE_KEYCLOAK_URL', 'http://identity.example.test');
    const { getContext } = await mountAuth();
    expect(client.init).not.toHaveBeenCalled();
    expect(getContext().authError).toMatch(/unavailable/);
  });

  it('requires an explicit development flag before permitting mock auth', async () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_MOCK_AUTH', 'false');
    const { auth } = await mountAuth();
    expect(auth.isMockAuthEnabled()).toBe(false);
    expect(client.init).toHaveBeenCalledTimes(1);
  });

  it('discards malformed/forged stored tokens and still initializes once under StrictMode', async () => {
    sessionStorage.setItem('kc_token', 'malformed');
    sessionStorage.setItem('kc_refresh_token', 'forged-refresh');
    sessionStorage.setItem('kc_id_token', 'forged-id');
    const { getContext } = await mountAuth();
    expect(client.init).toHaveBeenCalledTimes(1);
    expect(client.init).toHaveBeenCalledWith(expect.objectContaining({ pkceMethod: 'S256', flow: 'standard', onLoad: 'check-sso' }));
    expect(sessionStorage.getItem('kc_token')).toBeNull();
    expect(sessionStorage.getItem('kc_refresh_token')).toBeNull();
    expect(sessionStorage.getItem('kc_id_token')).toBeNull();
    expect(getContext().authenticated).toBe(false);
  });

  it('uses the adapter access-token roles and does not treat missing email verification as verified', async () => {
    client.authenticated = true;
    client.token = 'validated-by-adapter';
    client.tokenParsed = { sub: 'user-1', realm_access: { roles: ['user'] } };
    client.idTokenParsed = { email: 'viewer@example.test', realm_access: { roles: ['admin'] } };
    const { getContext } = await mountAuth();
    expect(getContext().user?.roles).toEqual(['user']);
    expect(getContext().user?.emailVerified).toBe(false);
  });

  it('starts a real adapter login and rejects an external return target', async () => {
    window.history.replaceState({}, '', '/login?redirect=https%3A%2F%2Fattacker.example%2Fsteal');
    const { getContext } = await mountAuth();
    await act(async () => getContext().login('viewer@example.test'));
    expect(client.login).toHaveBeenCalledWith({ loginHint: 'viewer@example.test', redirectUri: window.location.origin + '/app' });
  });

  it.each(['//attacker.example/path', 'javascript:alert(1)', '/login', '/signup', '/login/', '/mfa/verify'])('keeps unsafe or looping return %s inside the app', async requested => {
    const { auth } = await mountAuth();
    expect(auth.getLoginRedirectUri(requested)).toBe(window.location.origin + '/app');
    expect(auth.getLoginRedirectUri('/app/settings?tab=security')).toBe(window.location.origin + '/app/settings?tab=security');
  });

  it('updates the profile on token refresh and clears it when refresh fails', async () => {
    client.authenticated = true;
    client.token = 'initial-token';
    client.tokenParsed = { sub: 'user-1', name: 'Initial', email_verified: true };
    const { getContext } = await mountAuth();
    client.token = 'refreshed-token';
    client.tokenParsed = { sub: 'user-1', name: 'Updated', email_verified: true };
    await act(async () => client.onAuthRefreshSuccess?.());
    expect(getContext().user?.name).toBe('Updated');
    expect(getContext().getToken()).toBe('refreshed-token');
    client.updateToken.mockRejectedValueOnce(new Error('invalid_grant'));
    await act(async () => client.onTokenExpired?.());
    await waitFor(() => expect(getContext().authenticated).toBe(false));
    expect(getContext().getToken()).toBeUndefined();
    expect(getContext().user).toBeNull();
    expect(getContext().authError).toMatch(/session expired/);
  });

  it('never hands a known expired token to an API caller', async () => {
    client.authenticated = true;
    client.token = 'expired-token';
    const { getContext } = await mountAuth();
    client.isTokenExpired.mockReturnValue(true);
    expect(getContext().getToken()).toBeUndefined();
  });

  it('uses the SDK server logout with the application return URL', async () => {
    client.authenticated = true;
    client.token = 'live-token';
    const { getContext } = await mountAuth();
    act(() => getContext().logout());
    expect(client.logout).toHaveBeenCalledWith({ redirectUri: window.location.origin });
  });

  it('ends loading and stays unauthenticated when initialization fails', async () => {
    client.init.mockRejectedValue(new Error('network unavailable'));
    const { getContext } = await mountAuth();
    expect(getContext().initialized).toBe(true);
    expect(getContext().authenticated).toBe(false);
    expect(getContext().authError).toMatch(/unavailable/);
  });
});
