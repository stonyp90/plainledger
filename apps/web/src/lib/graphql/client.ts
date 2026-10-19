/**
 * Apollo Client Configuration
 *
 * Sets up the GraphQL client with:
 * - Authentication token injection
 * - Error handling
 * - Caching strategy
 */
import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
  ApolloLink,
  Observable,
} from '@apollo/client';
import { isMockAuthEnabled } from '../keycloak';
import { SetContextLink } from '@apollo/client/link/context';
import { getAuthenticatedRequestHeaders, getRequestScopeRevision, invalidateRequestScope, selectRequestOrganization } from '../authRequestContext';

// Get the GraphQL endpoint from environment or default
const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || '/graphql';

if (!isMockAuthEnabled()) {
  console.log('[Apollo] Initializing with URL:', GRAPHQL_URL);
}

// HTTP Link - handles the actual GraphQL requests
const httpLink = createHttpLink({
  uri: GRAPHQL_URL,
  credentials: 'include', // Include cookies for session auth
});

// Read only adapter-managed, refreshed credentials. Never hydrate browser storage tokens.
const authLink = new SetContextLink(async ({ headers = {} }) => {
  const requestHeaders = await getAuthenticatedRequestHeaders(headers);
  requestHeaders.set('apollo-require-preflight', 'true');
  requestHeaders.set('content-type', 'application/json');
  return { headers: Object.fromEntries(requestHeaders.entries()) };
});

// Do not allow an earlier organization's in-flight result to enter the next cache.
const scopeLink = new ApolloLink((operation, forward) => {
  const requestRevision = getRequestScopeRevision();
  return new Observable(observer => {
    const subscription = forward(operation).subscribe({
      next: result => {
        if (requestRevision !== getRequestScopeRevision()) observer.error(new Error('Organization changed. Refresh the data.'));
        else observer.next(result);
      },
      error: error => observer.error(error),
      complete: () => observer.complete(),
    });
    return () => subscription.unsubscribe();
  });
});

// Mock Link - short-circuits GraphQL requests when mock auth is enabled
// This prevents 500 errors when the API server isn't running in local dev
// Returns an observable that never emits, keeping queries in "loading" state
// which components already handle gracefully
const mockLink = new ApolloLink((operation, forward) => {
  if (isMockAuthEnabled()) {
    return new Observable(() => {
      // Never emit or complete — prevents network requests and cache write warnings
    });
  }
  return forward(operation);
});

// Create the Apollo Client instance
// When mock auth is enabled, mockLink intercepts and returns empty data
// Otherwise, requests flow through authLink → httpLink as normal
export const apolloClient = new ApolloClient({
  link: from([mockLink, scopeLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // Pages are independent query results. Appending on every cache write
          // duplicated page 2 after refetch and reused data across page sizes.
          accounts: { keyArgs: ['filter', 'pagination'], merge: false },
          transactions: { keyArgs: ['filter', 'pagination'], merge: false },
        },
      },
      Organization: {
        // Use id as the cache key
        keyFields: ['id'],
      },
      Account: {
        keyFields: ['id'],
      },
      Transaction: {
        keyFields: ['id'],
      },
      DataSource: {
        keyFields: ['id'],
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
  devtools: { enabled: import.meta.env.DEV },
});

/** Change the request scope and discard cached data from the previous tenant. */
export async function setActiveOrganizationId(organizationId: string | null): Promise<void> {
  if (!selectRequestOrganization(organizationId)) return;
  // TenantProvider disposes the previous page while loading membership. Refetching
  // those observers can abort this bootstrap; the verified page fetches on mount.
  await apolloClient.clearStore();
}

// Tokens remain owned by Keycloak; callers can only invalidate cached authenticated data.
export function updateAuthToken(_token: string | null): void {
  invalidateRequestScope();
  void apolloClient.clearStore();
}

export async function resetApolloClient(): Promise<void> {
  invalidateRequestScope(true);
  await apolloClient.clearStore();
}

window.addEventListener('plainledger:auth-changed', () => { void resetApolloClient(); });
