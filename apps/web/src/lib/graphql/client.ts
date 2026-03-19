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

// Auth Link - adds the JWT token and CSRF prevention headers to requests
const authLink = new ApolloLink((operation, forward) => {
  // Get the authentication token from the Keycloak instance first (primary source),
  // then fall back to sessionStorage/localStorage (during login transition)
  const keycloak = (window as unknown as { keycloak?: { token?: string } }).keycloak;
  const token = keycloak?.token || sessionStorage.getItem('kc_token') || localStorage.getItem('kc_token');

  operation.setContext(({ headers = {} }) => ({
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
      // Required for Apollo Server 4 CSRF protection
      'apollo-require-preflight': 'true',
      'content-type': 'application/json',
    },
  }));

  return forward(operation);
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
  link: from([mockLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // Configure cache behavior for specific queries
          accounts: {
            // Merge paginated results
            keyArgs: ['filter'],
            merge(existing, incoming, { args }) {
              if (!args?.pagination?.page || args.pagination.page === 1) {
                return incoming;
              }
              return {
                ...incoming,
                nodes: [...(existing?.nodes || []), ...incoming.nodes],
              };
            },
          },
          transactions: {
            keyArgs: ['filter'],
            merge(existing, incoming, { args }) {
              if (!args?.pagination?.page || args.pagination.page === 1) {
                return incoming;
              }
              return {
                ...incoming,
                nodes: [...(existing?.nodes || []), ...incoming.nodes],
              };
            },
          },
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
  connectToDevTools: import.meta.env.DEV,
});

// Export a function to update the auth token
export function updateAuthToken(token: string | null): void {
  if (token) {
    sessionStorage.setItem('kc_token', token);
  } else {
    sessionStorage.removeItem('kc_token');
  }

  // Clear the Apollo cache to refetch with new auth
  apolloClient.clearStore();
}

// Export a function to reset the client (for logout)
export function resetApolloClient(): Promise<unknown[]> {
  sessionStorage.removeItem('kc_token');
  sessionStorage.removeItem('kc_refresh_token');
  sessionStorage.removeItem('kc_id_token');
  return apolloClient.resetStore();
}
