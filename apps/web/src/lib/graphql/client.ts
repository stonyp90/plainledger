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

// Note: setContext and onError are exported from @apollo/client in v3.8+
// If you get import errors, install: npm i @apollo/client@latest

// Inline implementation of setContext for compatibility
const setContext = (
  setter: (
    request: unknown,
    prevContext: { headers?: Record<string, string> }
  ) => { headers: Record<string, string> }
) => {
  return new ApolloLink((operation, forward) => {
    const context = operation.getContext();
    const newContext = setter(operation, context);
    operation.setContext({
      ...context,
      ...newContext,
    });
    return forward(operation);
  });
};

// Inline implementation of onError for compatibility
interface ErrorHandlerParams {
  graphQLErrors?: readonly { message: string; locations?: unknown; path?: unknown; extensions?: { code?: string } }[];
  networkError?: Error & { statusCode?: number };
  operation: { operationName?: string };
}

const onError = (errorHandler: (params: ErrorHandlerParams) => void) => {
  return new ApolloLink((operation, forward) => {
    return forward(operation).map((result) => {
      if (result.errors) {
        errorHandler({
          graphQLErrors: result.errors,
          operation: { operationName: operation.operationName },
        });
      }
      return result;
    });
  });
};

// Get the GraphQL endpoint from environment or default
const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || "/graphql";

// HTTP Link - handles the actual GraphQL requests
const httpLink = createHttpLink({
  uri: GRAPHQL_URL,
  credentials: "include", // Include cookies for session auth
});

// Auth Link - adds the JWT token to requests
const authLink = setContext((_, { headers }) => {
  // Get the authentication token from localStorage or Keycloak
  const token = localStorage.getItem("kc-token") || 
                sessionStorage.getItem("kc-token");

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

// Error Link - handles GraphQL and network errors
const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      console.error(
        `[GraphQL Error] Operation: ${operation.operationName}`,
        `Message: ${message}`,
        `Path: ${path}`,
        `Code: ${extensions?.code}`,
      );

      // Handle specific error codes
      if (extensions?.code === "UNAUTHENTICATED") {
        // Redirect to login or refresh token
        window.dispatchEvent(new CustomEvent("auth:unauthenticated"));
      }
    });
  }

  if (networkError) {
    console.error(`[Network Error]: ${networkError.message}`);
    
    // Handle network errors (API down, etc.)
    if ("statusCode" in networkError && networkError.statusCode === 401) {
      window.dispatchEvent(new CustomEvent("auth:unauthenticated"));
    }
  }
});

// Logging Link (development only)
const loggingLink = new ApolloLink((operation, forward) => {
  if (import.meta.env.DEV) {
    const startTime = Date.now();
    console.log(`[GraphQL] Starting ${operation.operationName}`);

    return forward(operation).map((result) => {
      const duration = Date.now() - startTime;
      console.log(`[GraphQL] Completed ${operation.operationName} in ${duration}ms`);
      return result;
    });
  }
  return forward(operation);
});

// Create the Apollo Client instance
export const apolloClient = new ApolloClient({
  link: from([loggingLink, errorLink, authLink, httpLink]),
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
