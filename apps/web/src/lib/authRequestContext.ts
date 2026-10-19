import type Keycloak from 'keycloak-js';

// A tenant slug is selected from the authenticated session, never browser storage.
let activeOrganizationId: string | null = null;
let scopeRevision = 0;

export function getRequestScopeRevision(): number {
  return scopeRevision;
}

export function selectRequestOrganization(organizationId: string | null): boolean {
  if (organizationId === activeOrganizationId) return false;
  activeOrganizationId = organizationId;
  scopeRevision++;
  return true;
}

export function invalidateRequestScope(clearOrganization = false): void {
  if (clearOrganization) activeOrganizationId = null;
  scopeRevision++;
}

/** Refresh first, then read the adapter's current access token and tenant claim. */
export async function getAuthenticatedRequestHeaders(initialHeaders?: HeadersInit): Promise<Headers> {
  const headers = new Headers(initialHeaders);
  headers.delete('authorization');
  headers.delete('x-tenant-id');
  headers.delete('x-organization-id');

  const keycloak = (window as unknown as { keycloak?: Keycloak }).keycloak;
  if (!keycloak?.authenticated) return headers;
  const revision = scopeRevision;
  await keycloak.updateToken(30);
  if (revision !== scopeRevision) throw new Error('Organization changed. Refresh the data.');
  if (!keycloak.authenticated || !keycloak.token || keycloak.isTokenExpired()) {
    throw new Error('Your session expired. Sign in again.');
  }
  const organizationClaim = keycloak.tokenParsed?.organization;
  if (activeOrganizationId && organizationClaim !== activeOrganizationId) {
    throw new Error('The selected organization is not part of this session.');
  }
  headers.set('authorization', `Bearer ${keycloak.token}`);
  if (activeOrganizationId) headers.set('x-organization-id', activeOrganizationId);
  return headers;
}
