import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import path from 'path';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  core: {
    builder: '@storybook/builder-vite',
  },
  async viteFinal(config) {
    return mergeConfig(config, {
      define: {
        // Enable mock auth by default in Storybook
        'import.meta.env.VITE_MOCK_AUTH': JSON.stringify('true'),
        'import.meta.env.STORYBOOK': JSON.stringify('true'),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '../src'),
          '@/features': path.resolve(__dirname, '../src/features'),
          '@/shared': path.resolve(__dirname, '../src/shared'),
          '@/infrastructure': path.resolve(__dirname, '../src/infrastructure'),
          '@/domain': path.resolve(__dirname, '../src/domain'),
        },
      },
      optimizeDeps: {
        include: [
          '@apollo/client',
          '@apollo/client/core',
          'react',
          'react-dom',
          'react-router-dom',
          '@tanstack/react-query',
          'framer-motion',
          'lucide-react',
        ],
        exclude: ['@keycloak/keycloak-admin-client'],
      },
    });
  },
  docs: {
    autodocs: 'tag',
  },
};

export default config;
