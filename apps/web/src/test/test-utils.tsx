/**
 * Test Utilities
 * 
 * Provides helper functions and wrappers for testing React components
 */

import { ReactElement, createContext, useContext } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { I18nProvider } from '../lib/i18n';
import type { Tenant } from '../contexts/TenantContext';

// Mock tenant context for testing
const MockTenantContext = createContext<{
  currentTenant: Tenant | null;
  tenants: Tenant[];
  isLoading: boolean;
  setCurrentTenant: () => void;
  hasFeature: () => boolean;
  getFeatureLimit: () => number;
  checkLimit: () => boolean;
  isUnlocked: () => boolean;
  getGraphConfig: () => Record<string, unknown>;
} | null>(null);

const mockTenantValue = {
  currentTenant: null,
  tenants: [],
  isLoading: false,
  setCurrentTenant: () => {},
  hasFeature: () => true,
  getFeatureLimit: () => 100,
  checkLimit: () => true,
  isUnlocked: () => true,
  getGraphConfig: () => ({}),
};

function MockTenantProvider({ children }: { children: React.ReactNode }) {
  return (
    <MockTenantContext.Provider value={mockTenantValue}>
      {children}
    </MockTenantContext.Provider>
  );
}

/**
 * Wrapper component that provides all necessary context providers
 */
function AllTheProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider defaultLanguage="en">
      <MockTenantProvider>
        {children}
      </MockTenantProvider>
    </I18nProvider>
  );
}

/**
 * Custom render function that includes all providers
 */
function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

export * from '@testing-library/react';
export { renderWithProviders as render };
export { MockTenantContext, mockTenantValue };
