import type { Preview } from '@storybook/react';
import React from 'react';
import { KeycloakProvider } from '../src/lib/keycloak';
import { I18nProvider } from '../src/lib/i18n';
import { StorybookAuthWrapper } from './StorybookAuthWrapper';
import '../src/styles/globals.css';

// Enable mock auth for Storybook by default
if (typeof window !== 'undefined') {
  // Set flag to identify Storybook environment
  (window as any).__STORYBOOK_MOCK_AUTH__ = true;
}

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'centered',
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: 'rgb(var(--color-bg))',
        },
        {
          name: 'dark',
          value: 'rgb(var(--color-gray-900))',
        },
      ],
    },
  },
  decorators: [
    (Story) => (
      <KeycloakProvider>
        <StorybookAuthWrapper>
          <I18nProvider defaultLanguage="en">
            <div style={{ padding: '2rem', minHeight: '100vh' }}>
              <Story />
            </div>
          </I18nProvider>
        </StorybookAuthWrapper>
      </KeycloakProvider>
    ),
  ],
};

export default preview;
