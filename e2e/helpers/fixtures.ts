/**
 * E2E Test Fixtures Helper
 * 
 * Provides utilities for using fixtures in E2E tests.
 * Integrates fixtures directory with Playwright tests.
 */

import {
  loadIndustry,
  loadAllIndustries,
  loadTestUser,
  loadTestOrganization,
  loadProviderResponse,
  loadEdgeCase,
  getExpectedKPIs,
  getKPIBenchmark,
  type IndustryFixture,
  type TestUser,
  type TestOrganization,
} from '../../fixtures/loader';

/**
 * Get test data for a specific industry
 */
export function getIndustryTestData(industryId: string): IndustryFixture {
  return loadIndustry(industryId);
}

/**
 * Get test user credentials
 */
export function getTestUser(role: 'admin' | 'user' | 'viewer' = 'user'): TestUser {
  return loadTestUser(role);
}

/**
 * Get test organization data
 */
export function getTestOrganization(
  plan: 'free' | 'professional' | 'enterprise' = 'professional',
): TestOrganization {
  return loadTestOrganization(plan);
}

/**
 * Get expected KPIs for an industry (for assertions)
 */
export function getExpectedKPIsForIndustry(industryId: string) {
  return getExpectedKPIs(industryId);
}

/**
 * Get KPI benchmark range for validation
 */
export function getKPIBenchmarkRange(industryId: string, kpiId: string) {
  return getKPIBenchmark(industryId, kpiId);
}

/**
 * Get provider mock data
 */
export function getProviderMockData(provider: string, entity: string) {
  return loadProviderResponse(provider, entity);
}

/**
 * Get edge case scenario
 */
export function getEdgeCaseScenario(caseName: string) {
  return loadEdgeCase(caseName);
}

/**
 * Common test data helpers
 */
export const TestData = {
  /**
   * Restaurant industry test data
   */
  restaurant: () => getIndustryTestData('restaurant'),

  /**
   * Real estate industry test data
   */
  realEstate: () => getIndustryTestData('real_estate'),

  /**
   * Professional services industry test data
   */
  professionalServices: () => getIndustryTestData('professional_services'),

  /**
   * Admin user credentials
   */
  adminUser: () => getTestUser('admin'),

  /**
   * Regular user credentials
   */
  regularUser: () => getTestUser('user'),

  /**
   * Professional plan organization
   */
  professionalOrg: () => getTestOrganization('professional'),

  /**
   * Enterprise plan organization
   */
  enterpriseOrg: () => getTestOrganization('enterprise'),
};
