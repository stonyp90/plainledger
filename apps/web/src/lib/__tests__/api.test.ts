import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api';
import config from '../config';
import { invalidateRequestScope, selectRequestOrganization } from '../authRequestContext';

const fetchMock = vi.fn();
const client = {
  authenticated: true, token: 'old-access-token', tokenParsed: { organization: 'tenant-slug' },
  updateToken: vi.fn(), isTokenExpired: vi.fn(),
};
function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });
}
function requestHeaders() { return new Headers(fetchMock.mock.calls.at(-1)![1].headers); }

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset().mockImplementation(async () => json({ id: 'org-uuid' }));
  config.api.baseUrl = '';
  localStorage.clear(); sessionStorage.clear();
  invalidateRequestScope(true);
  selectRequestOrganization('tenant-slug');
  Object.assign(client, { authenticated: true, token: 'old-access-token', tokenParsed: { organization: 'tenant-slug' } });
  client.updateToken.mockReset().mockImplementation(async () => { client.token = 'fresh-access-token'; return true; });
  client.isTokenExpired.mockReset().mockReturnValue(false);
  Object.assign(window, { keycloak: client });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('REST transport with a mocked Keycloak SDK and HTTP server', () => {
  it('resolves same-origin /api paths, refreshes the token, and sends the verified tenant slug', async () => {
    const result = await api.get('/api/organizations/tenant-slug', { params: { active: false, page: 0, skip: undefined } });
    expect(new URL(fetchMock.mock.calls[0][0]).pathname).toBe('/api/organizations/tenant-slug');
    expect(new URL(fetchMock.mock.calls[0][0]).search).toBe('?active=false&page=0');
    expect(client.updateToken).toHaveBeenCalledWith(30);
    expect(requestHeaders().get('authorization')).toBe('Bearer fresh-access-token');
    expect(requestHeaders().get('x-organization-id')).toBe('tenant-slug');
    expect(requestHeaders().has('x-tenant-id')).toBe(false);
    expect(result.data).toEqual({ id: 'org-uuid' });
  });
  it.each(['https://api.example.test', 'https://api.example.test/api', '/api'])('normalizes the API prefix for base %s', async base => {
    config.api.baseUrl = base;
    await api.get('/reports');
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe('/api/reports');
    if (base.startsWith('https')) expect(url.origin).toBe('https://api.example.test');
  });
  it('never uses forged storage credentials, tenant selections, or caller headers', async () => {
    client.authenticated = false;
    localStorage.setItem('kc_token', 'local-forgery');
    sessionStorage.setItem('kc_token', 'session-forgery');
    localStorage.setItem('plainledger-current-tenant', 'other-tenant');
    await api.get('/organizations/tenant-slug', { headers: { Authorization: 'Bearer caller-token', 'X-Organization-ID': 'other', 'X-Tenant-ID': 'other' } });
    expect(requestHeaders().has('authorization')).toBe(false);
    expect(requestHeaders().has('x-organization-id')).toBe(false);
    expect(requestHeaders().has('x-tenant-id')).toBe(false);
  });
  it('rejects refresh failure, expired tokens, and tenant mismatch before HTTP', async () => {
    client.updateToken.mockRejectedValueOnce(new Error('Refresh rejected'));
    await expect(api.get('/reports')).rejects.toThrow('Refresh rejected');
    client.isTokenExpired.mockReturnValueOnce(true);
    await expect(api.get('/reports')).rejects.toThrow('session expired');
    selectRequestOrganization('unauthorized-slug');
    await expect(api.get('/reports')).rejects.toThrow('not part of this session');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('normalizes arrays and preserves explicit data envelopes', async () => {
    fetchMock.mockResolvedValueOnce(json([{ id: 1 }])).mockResolvedValueOnce(json({ data: [2], meta: { total: 1 } }));
    expect((await api.get('/reports')).data).toEqual([{ id: 1 }]);
    expect(await api.get('/reports')).toEqual({ data: [2], meta: { total: 1 } });
  });
  it.each([false, 0, null])('preserves a JSON body containing %s', async value => {
    await api.post('/reports', value);
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify(value));
  });
  it('handles successful empty responses', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    expect(await api.delete('/reports/1')).toEqual({ data: undefined });
  });
  it('reports malformed successful JSON and readable validation errors', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>upstream error</html>', { status: 200 }));
    await expect(api.get('/reports')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    fetchMock.mockResolvedValueOnce(json({ message: ['Invalid date', 'Amount required'] }, 400));
    await expect(api.post('/reports', {})).rejects.toMatchObject({ statusCode: 400, message: 'Invalid date; Amount required' });
  });
  it('uses the same refreshed authentication for multipart uploads without breaking their boundary', async () => {
    await api.upload('/documents', new File(['hello'], 'report.txt'), 'document');
    expect(fetchMock.mock.calls[0][1].body).toBeInstanceOf(FormData);
    expect(requestHeaders().has('content-type')).toBe(false);
    expect(requestHeaders().get('authorization')).toBe('Bearer fresh-access-token');
  });
  it('honors caller cancellation without relabeling it as a timeout', async () => {
    const controller = new AbortController(); controller.abort();
    await expect(api.get('/reports', { signal: controller.signal })).rejects.toMatchObject({ code: 'ABORTED' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('discards an in-flight response when the authenticated organization changes', async () => {
    let resolve!: (response: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise<Response>(done => { resolve = done; }));
    const pending = api.get('/reports');
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    selectRequestOrganization('next-tenant');
    resolve(json({ private: 'previous organization' }));
    await expect(pending).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
  });
});
