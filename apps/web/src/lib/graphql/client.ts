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
} from "@apollo/client";

// Get the GraphQL endpoint from environment or default
const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || "/graphql";

console.log("[Apollo] Initializing with URL:", GRAPHQL_URL);

// HTTP Link - handles the actual GraphQL requests
const httpLink = createHttpLink({
  uri: GRAPHQL_URL,
  credentials: "include", // Include cookies for session auth
});

// Auth Link - adds the JWT token and CSRF prevention headers to requests
const authLink = new ApolloLink((operation, forward) => {
  // Get the authentication token from localStorage or Keycloak
  const token = localStorage.getItem("kc-token") || 
                sessionStorage.getItem("kc-token");

  operation.setContext(({ headers = {} }) => ({
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
      // Required for Apollo Server 4 CSRF protection
      "apollo-require-preflight": "true",
      "content-type": "application/json",
    },
  }));

  return forward(operation);
});

// Create the Apollo Client instance - simplified without logging link
export const apolloClient = new ApolloClient({
  link: from([authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // Configure cache behavior for specific queries
          accounts: {
            // Merge paginated results
            keyArgs: ["filter"],
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
            keyArgs: ["filter"],
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
        keyFields: ["id"],
      },
      Account: {
        keyFields: ["id"],
      },
      Transaction: {
        keyFields: ["id"],
      },
      DataSource: {
        keyFields: ["id"],
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
    },
    query: {
      fetchPolicy: "cache-first",
      errorPolicy: "all",
    },
    mutate: {
      errorPolicy: "all",
    },
  },
  connectToDevTools: import.meta.env.DEV,
});

// Export a function to update the auth token
export function updateAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem("kc-token", token);
  } else {
    localStorage.removeItem("kc-token");
  }
  
  // Clear the Apollo cache to refetch with new auth
  apolloClient.clearStore();
}

// Export a function to reset the client (for logout)
export function resetApolloClient(): Promise<unknown[]> {
  localStorage.removeItem("kc-token");
  return apolloClient.resetStore();
}
