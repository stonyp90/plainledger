/**
 * Provider Fixtures - Central Export
 *
 * Exports all provider fixtures for parameterized testing.
 */

export * from "./provider-fixture-interface";
export { QUICKBOOKS_REAL_ESTATE_FIXTURE } from "./quickbooks/quickbooks-fixture";
export { XERO_PROFESSIONAL_SERVICES_FIXTURE } from "./xero/xero-fixture";
export { SAGE_RETAIL_FIXTURE } from "./sage/sage-fixture";
export { FRESHBOOKS_FREELANCER_FIXTURE } from "./freshbooks/freshbooks-fixture";

import { QUICKBOOKS_REAL_ESTATE_FIXTURE } from "./quickbooks/quickbooks-fixture";
import { XERO_PROFESSIONAL_SERVICES_FIXTURE } from "./xero/xero-fixture";
import { SAGE_RETAIL_FIXTURE } from "./sage/sage-fixture";
import { FRESHBOOKS_FREELANCER_FIXTURE } from "./freshbooks/freshbooks-fixture";
import { ProviderFixture } from "./provider-fixture-interface";

/**
 * All provider fixtures for parameterized testing
 */
export const ALL_PROVIDER_FIXTURES: Array<{
  name: string;
  fixture: ProviderFixture<unknown, unknown, unknown, unknown>;
}> = [
  { name: "QuickBooks", fixture: QUICKBOOKS_REAL_ESTATE_FIXTURE },
  { name: "Xero", fixture: XERO_PROFESSIONAL_SERVICES_FIXTURE },
  { name: "Sage", fixture: SAGE_RETAIL_FIXTURE },
  { name: "FreshBooks", fixture: FRESHBOOKS_FREELANCER_FIXTURE },
];

/**
 * Fixtures that have full ETL support (Bronze → Silver → Gold)
 */
export const FULL_SUPPORT_FIXTURES: Array<{
  name: string;
  fixture: ProviderFixture<unknown, unknown, unknown, unknown>;
}> = [
  { name: "QuickBooks", fixture: QUICKBOOKS_REAL_ESTATE_FIXTURE },
  { name: "Xero", fixture: XERO_PROFESSIONAL_SERVICES_FIXTURE },
];
