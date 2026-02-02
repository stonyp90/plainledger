/**
 * Test Utilities
 * 
 * Provides helper functions and wrappers for testing React components
 */

import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { I18nProvider } from '../lib/i18n';

/**
 * Wrapper component that provides all necessary context providers
 */
function AllTheProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider defaultLanguage="en">
      {children}
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
