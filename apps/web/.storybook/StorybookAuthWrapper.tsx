import React, { useEffect, useState, ReactNode } from 'react';
import { useKeycloak } from '../src/lib/keycloak';

interface StorybookAuthWrapperProps {
  children: ReactNode;
}

/**
 * StorybookAuthWrapper - Protects Storybook with Keycloak authentication and database authorization
 * 
 * Flow:
 * 1. Checks if user is authenticated via Keycloak
 * 2. If authenticated, calls API to verify database permission (storybook:access)
 * 3. Shows loading state while checking
 * 4. Shows "Access Denied" if unauthorized
 * 5. Shows login prompt if not authenticated
 */
export function StorybookAuthWrapper({ children }: StorybookAuthWrapperProps) {
  // In Storybook, always allow access (skip auth checks)
  const isStorybook = typeof window !== 'undefined' && 
    (window.location.href.includes('storybook') || (window as any).__STORYBOOK_MOCK_AUTH__);
  
  if (isStorybook) {
    // Skip all auth checks in Storybook - just render children
    return <>{children}</>;
  }

  const { authenticated, initialized, user, login } = useKeycloak();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // Check if mock auth is enabled (for Storybook development)
  // In Storybook, default to mock auth unless explicitly disabled
  const isMockAuth = import.meta.env.VITE_MOCK_AUTH === 'true' || 
    (import.meta.env.DEV && import.meta.env.VITE_MOCK_AUTH !== 'false');

  useEffect(() => {
    const checkAccess = async () => {
      // Wait for Keycloak to initialize
      if (!initialized) {
        return;
      }

      // In mock auth mode, automatically grant access
      if (isMockAuth && authenticated) {
        setHasAccess(true);
        setIsChecking(false);
        return;
      }

      // If not authenticated, show login prompt
      if (!authenticated) {
        setHasAccess(false);
        setIsChecking(false);
        return;
      }

      // If authenticated, check database permission
      try {
        const token = (window as any).keycloak?.token;
        if (!token) {
          setHasAccess(false);
          setIsChecking(false);
          return;
        }

        // Call API to check storybook access permission
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/permissions/storybook`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setHasAccess(data.allowed === true);
        } else {
          // If API call fails, deny access
          setHasAccess(false);
        }
      } catch (error) {
        console.error('Error checking storybook access:', error);
        // In development with mock auth, allow access
        if (isMockAuth) {
          console.log('Storybook: Mock auth enabled, granting access');
          setHasAccess(true);
        } else {
          setHasAccess(false);
        }
      } finally {
        setIsChecking(false);
      }
    };

    checkAccess();
  }, [authenticated, initialized, user, isMockAuth]);

  // Show loading state
  if (isChecking || !initialized) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgb(var(--color-bg-subtle))',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            className="loading-spinner"
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 1rem',
              border: '4px solid rgb(var(--color-border))',
              borderTopColor: 'rgb(var(--color-primary))',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p style={{ color: 'rgb(var(--color-text-secondary))' }}>
            Checking access...
          </p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!authenticated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgb(var(--color-bg-subtle))',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            padding: '2rem',
            backgroundColor: 'rgb(var(--color-surface))',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            maxWidth: '400px',
          }}
        >
          <h2 style={{ color: 'rgb(var(--color-text))', marginBottom: '1rem' }}>
            Storybook Access Required
          </h2>
          <p style={{ color: 'rgb(var(--color-text-secondary))', marginBottom: '2rem' }}>
            Please log in to access the component library.
          </p>
          <button
            onClick={() => login()}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'rgb(var(--color-primary))',
              color: 'rgb(var(--color-text-inverted))',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  // Show access denied if not authorized
  if (hasAccess === false) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgb(var(--color-bg-subtle))',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            padding: '2rem',
            backgroundColor: 'rgb(var(--color-surface))',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            maxWidth: '400px',
          }}
        >
          <h2 style={{ color: 'rgb(var(--color-error))', marginBottom: '1rem' }}>
            Access Denied
          </h2>
          <p style={{ color: 'rgb(var(--color-text-secondary))', marginBottom: '1rem' }}>
            You don't have permission to access Storybook.
          </p>
          <p style={{ color: 'rgb(var(--color-text-muted))', fontSize: '0.875rem' }}>
            Please contact your administrator to request access.
          </p>
        </div>
      </div>
    );
  }

  // User has access - render children
  return <>{children}</>;
}
