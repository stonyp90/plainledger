/**
 * Fixtures Loader - TypeScript
 *
 * Provides functions to load test fixtures for E2E and API tests.
 *
 * Usage:
 *   import { loadIndustry, loadAllIndustries } from '../fixtures/loader';
 *
 *   const restaurant = loadIndustry('restaurant');
 *   const industries = loadAllIndustries();
 */

import * as fs from 'fs';
import * as path from 'path';

// Base path for fixtures
const FIXTURES_DIR = __dirname;

// =============================================================================
// Types
// =============================================================================

export interface IndustryAccount {
  name: string;
  type: string;
  subtype: string;
  category: string;
}

export interface IndustryCustomer {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface IndustryVendor {
  name: string;
  email?: string;
  category?: string;
}

export interface IndustryKPI {
  id: string;
  name: string;
  name_fr: string;
  formula: string;
  benchmark_min: number;
  benchmark_max: number;
  format: 'percent' | 'currency' | 'number' | 'days' | 'ratio';
  inverse?: boolean;
}

export interface IndustryTransactions {
  revenue_range: [number, number];
  expense_ratio: number;
  months_of_data: number;
  revenue_distribution?: Record<string, number>;
  expense_distribution?: Record<string, number>;
}

export interface IndustryFixture {
  id: string;
  name: string;
  name_fr: string;
  accounts: IndustryAccount[];
  customers?: IndustryCustomer[];
  vendors?: IndustryVendor[];
  kpis: IndustryKPI[];
  transactions?: IndustryTransactions;
  expected_gold?: {
    total_revenue: number;
    total_expenses: number;
    net_income: number;
  };
}

export interface IndustryIndex {
  industries: Array<{
    id: string;
    name: string;
    name_fr: string;
    file: string;
  }>;
}

export interface TestUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'viewer';
  organization_id: string;
}

export interface TestOrganization {
  id: string;
  name: string;
  industry: string;
  plan: 'free' | 'professional' | 'enterprise';
}

export interface GraphQLFixture {
  query?: string;
  variables?: Record<string, any>;
  response: Record<string, any>;
}

export interface EdgeCaseFixture {
  name: string;
  description: string;
  data: any;
  expected_error?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function loadJson<T>(filepath: string): T {
  const fullPath = path.join(FIXTURES_DIR, filepath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Fixture not found: ${filepath}`);
  }
  const content = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(content) as T;
}

// =============================================================================
// Industry Fixtures
// =============================================================================

/**
 * Load a single industry fixture by ID.
 */
export function loadIndustry(industryId: string): IndustryFixture {
  return loadJson<IndustryFixture>(`industries/${industryId}.json`);
}

/**
 * Load all industry fixtures.
 */
export function loadAllIndustries(): IndustryFixture[] {
  const index = loadJson<IndustryIndex>('industries/index.json');
  const industries: IndustryFixture[] = [];

  for (const item of index.industries) {
    try {
      const industry = loadIndustry(item.id);
      industries.push(industry);
    } catch {
      // Skip missing fixtures
    }
  }

  return industries;
}

/**
 * Get list of all industry IDs.
 */
export function getIndustryIds(): string[] {
  const index = loadJson<IndustryIndex>('industries/index.json');
  return index.industries.map((item) => item.id);
}

/**
 * Get expected KPIs for an industry (for test assertions).
 */
export function getExpectedKPIs(industryId: string): IndustryKPI[] {
  const industry = loadIndustry(industryId);
  return industry.kpis;
}

/**
 * Get KPI benchmark range for validation.
 */
export function getKPIBenchmark(
  industryId: string,
  kpiId: string
): { min: number; max: number } | null {
  const industry = loadIndustry(industryId);
  const kpi = industry.kpis.find((k) => k.id === kpiId);
  if (!kpi) return null;
  return { min: kpi.benchmark_min, max: kpi.benchmark_max };
}

// =============================================================================
// Provider Fixtures
// =============================================================================

/**
 * Load a provider API response fixture.
 */
export function loadProviderResponse(
  provider: string,
  entity: string
): Record<string, any> {
  return loadJson(`providers/${provider}/${entity}.json`);
}

/**
 * Load a provider error response fixture.
 */
export function loadProviderError(
  provider: string,
  errorType: string
): Record<string, any> {
  return loadJson(`providers/${provider}/errors/${errorType}.json`);
}

// =============================================================================
// GraphQL Fixtures
// =============================================================================

/**
 * Load a GraphQL response fixture.
 */
export function loadGraphQLResponse(queryName: string): GraphQLFixture {
  return loadJson<GraphQLFixture>(`graphql/queries/${queryName}.json`);
}

/**
 * Load a GraphQL mutation fixture.
 */
export function loadGraphQLMutation(mutationName: string): GraphQLFixture {
  return loadJson<GraphQLFixture>(`graphql/mutations/${mutationName}.json`);
}

// =============================================================================
// Auth Fixtures
// =============================================================================

/**
 * Load a test user fixture.
 */
export function loadTestUser(role: 'admin' | 'user' | 'viewer' = 'user'): TestUser {
  const users = loadJson<{ users: TestUser[] }>('auth/users.json');
  const user = users.users.find((u) => u.role === role);
  if (!user) {
    throw new Error(`No test user found with role: ${role}`);
  }
  return user;
}

/**
 * Load a test organization fixture.
 */
export function loadTestOrganization(
  plan: 'free' | 'professional' | 'enterprise' = 'professional'
): TestOrganization {
  const orgs = loadJson<{ organizations: TestOrganization[] }>(
    'auth/organizations.json'
  );
  const org = orgs.organizations.find((o) => o.plan === plan);
  if (!org) {
    throw new Error(`No test organization found with plan: ${plan}`);
  }
  return org;
}

// =============================================================================
// Edge Case Fixtures
// =============================================================================

/**
 * Load an edge case fixture for testing error handling.
 */
export function loadEdgeCase(caseName: string): EdgeCaseFixture {
  return loadJson<EdgeCaseFixture>(`edge_cases/${caseName}.json`);
}

// =============================================================================
// Datalake Fixtures
// =============================================================================

/**
 * Load a Bronze layer sample fixture.
 */
export function loadBronzeSample(
  provider: string,
  entity: string
): Record<string, any> {
  return loadJson(`datalake/bronze/${provider}_${entity}.json`);
}

/**
 * Load a Silver layer sample fixture.
 */
export function loadSilverSample(entity: string): Record<string, any> {
  return loadJson(`datalake/silver/${entity}.json`);
}

/**
 * Load a Gold layer sample fixture.
 */
export function loadGoldSample(table: string): Record<string, any> {
  return loadJson(`datalake/gold/${table}.json`);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * List available fixtures in a category.
 */
export function listFixtures(category: string): string[] {
  const categoryDir = path.join(FIXTURES_DIR, category);
  if (!fs.existsSync(categoryDir)) {
    return [];
  }

  return fs
    .readdirSync(categoryDir)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .map((f) => f.replace('.json', ''));
}

/**
 * Check if a fixture exists.
 */
export function fixtureExists(filepath: string): boolean {
  return fs.existsSync(path.join(FIXTURES_DIR, filepath));
}
