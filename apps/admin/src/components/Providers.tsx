'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AdminProvider } from '@/hooks/useAdmin';
import { ThemeProvider } from '@/hooks/useTheme';
import { KeycloakProvider } from '@/hooks/useKeycloak';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <KeycloakProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AdminProvider>
            {children}
          </AdminProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </KeycloakProvider>
  );
}
