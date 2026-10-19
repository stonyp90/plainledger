import { gql } from '@apollo/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apolloClient, resetApolloClient, setActiveOrganizationId } from '../graphql/client';

vi.mock('../keycloak', () => ({ isMockAuthEnabled: () => false }));
const query = gql`query PrivateReport { secret }`;
const fetchMock = vi.fn();
const client = {
  authenticated: true, token: 'old-token', tokenParsed: { organization: 'tenant-slug' },
  updateToken: vi.fn(), isTokenExpired: vi.fn(),
};
function response(secret: string) {
  return new Response(JSON.stringify({ data: { secret } }), { headers: { 'Content-Type': 'application/json' } });
}
async function runQuery() {
  return apolloClient.query({ query, fetchPolicy: 'network-only', errorPolicy: 'none' });
}

beforeEach(async () => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset().mockImplementation(async () => response('only this tenant'));
  localStorage.clear(); sessionStorage.clear();
  Object.assign(client, { authenticated: true, token: 'old-token', tokenParsed: { organization: 'tenant-slug' } });
  client.updateToken.mockReset().mockImplementation(async () => { client.token = 'fresh-token'; return true; });
  client.isTokenExpired.mockReset().mockReturnValue(false);
  Object.assign(window, { keycloak: client });
  await resetApolloClient();
  await setActiveOrganizationId('tenant-slug');
});
afterEach(async () => { await resetApolloClient(); vi.unstubAllGlobals(); });

describe('Apollo authentication and tenant isolation (HTTP and SDK mocked)', () => {
  it('refreshes before injecting the access token and exact tenant slug', async () => {
    expect((await runQuery()).data).toEqual({ secret: 'only this tenant' });
    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(client.updateToken).toHaveBeenCalledWith(30);
    expect(headers.get('authorization')).toBe('Bearer fresh-token');
    expect(headers.get('x-organization-id')).toBe('tenant-slug');
  });
  it('does not trust local/session storage tokens or stale tenant IDs', async () => {
    client.authenticated = false;
    localStorage.setItem('kc_token', 'forged-local'); sessionStorage.setItem('kc_token', 'forged-session');
    localStorage.setItem('plainledger-current-tenant', 'other');
    await runQuery();
    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.has('authorization')).toBe(false);
    expect(headers.has('x-organization-id')).toBe(false);
  });
  it('rejects failed refresh and does not send a stale token', async () => {
    client.updateToken.mockRejectedValueOnce(new Error('Session expired'));
    await expect(runQuery()).rejects.toThrow('Session expired');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('clears private normalized data when an organization or authenticated identity changes', async () => {
    await runQuery();
    expect(apolloClient.cache.readQuery({ query })).toEqual({ secret: 'only this tenant' });
    await setActiveOrganizationId(null);
    expect(apolloClient.cache.readQuery({ query })).toBeNull();
    await setActiveOrganizationId('tenant-slug'); await runQuery();
    window.dispatchEvent(new Event('plainledger:auth-changed'));
    await vi.waitFor(() => expect(apolloClient.cache.readQuery({ query })).toBeNull());
  });
  it('rejects an earlier organization result that completes after the scope changes', async () => {
    let resolve!: (response: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise<Response>(done => { resolve = done; }));
    const pending = runQuery();
    const rejection = expect(pending).rejects.toThrow(/Organization changed|Store reset/);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    await setActiveOrganizationId(null);
    resolve(response('old tenant secret'));
    await rejection;
    expect(apolloClient.cache.readQuery({ query })).toBeNull();
  });
});
