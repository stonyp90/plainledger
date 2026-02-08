'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useKeycloak } from '@/hooks/useKeycloak';
import { useEffect } from 'react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { authenticated, initialized } = useKeycloak();
  const isLoading = !initialized;

  useEffect(() => {
    // Don't redirect on login page or if still loading
    if (pathname === '/login' || isLoading) {
      return;
    }

    // Redirect to login if not authenticated
    if (!authenticated) {
      router.push('/login');
    }
  }, [authenticated, isLoading, pathname, router]);

  // Show loading state
  if (isLoading && pathname !== '/login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-admin-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Allow login page without auth
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Require auth for other pages
  if (!authenticated) {
    return null;
  }

  return <>{children}</>;
}
