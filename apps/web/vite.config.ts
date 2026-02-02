import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      // Enable Fast Refresh for instant updates
      fastRefresh: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/features': path.resolve(__dirname, './src/features'),
      '@/shared': path.resolve(__dirname, './src/shared'),
      '@/infrastructure': path.resolve(__dirname, './src/infrastructure'),
      '@/domain': path.resolve(__dirname, './src/domain'),
    },
  },
  optimizeDeps: {
    // Pre-bundle heavy dependencies for faster dev startup
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
    // Exclude packages that cause issues with pre-bundling
    exclude: ['@keycloak/keycloak-admin-client'],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
    // Better source maps for debugging
    sourcemap: true,
  },
  server: {
    port: 5173,
    host: true,
    // Faster HMR with strict port
    strictPort: true,
    // HMR configuration
    hmr: {
      overlay: true, // Show errors as overlay
    },
    // Watch configuration for better file change detection
    watch: {
      usePolling: false, // Use native file system events (faster)
      interval: 100,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/graphql': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true, // Enable WebSocket proxy for subscriptions
      },
    },
  },
  // Preview server (for testing production build locally)
  preview: {
    port: 4173,
    host: true,
  },
  // Enable caching for faster rebuilds
  cacheDir: 'node_modules/.vite',
  // Clear console on each rebuild for cleaner output
  clearScreen: true,
});
