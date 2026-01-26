/**
 * Features Layer - Barrel Export
 * 
 * Each feature module encapsulates:
 * - Types: Domain types and interfaces
 * - API: API calls for the feature
 * - Hooks: React hooks for state management
 * - Components: Feature-specific UI components (when moved from pages)
 * 
 * Usage:
 *   import { useAccounts, accountsApi, type Account } from '@/features/accounts';
 *   import { useDashboardData, type DashboardSummary } from '@/features/dashboard';
 */

// Feature modules
export * from './accounts';
export * from './auth';
export * from './connections';
export * from './dashboard';
export * from './reports';
