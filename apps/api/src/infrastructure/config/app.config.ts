/**
 * Application Configuration Constants
 *
 * Centralized configuration for all hardcoded values.
 * All values should be configurable via environment variables with sensible defaults.
 *
 * Exception: Demo data for free users is intentionally hardcoded as per requirements.
 */

import { ConfigService } from "@nestjs/config";

export class AppConfig {
  constructor(private readonly configService: ConfigService) {}

  // ============================================================================
  // ORGANIZATION IDs
  // ============================================================================

  /**
   * Demo organization ID for local development and testing
   * Can be overridden via DEMO_ORG_ID environment variable
   */
  get demoOrgId(): string {
    return this.configService.get<string>("DEMO_ORG_ID") || "demo-org";
  }

  /**
   * E2E test organization ID
   * Can be overridden via E2E_ORG_ID environment variable
   */
  get e2eOrgId(): string {
    return this.configService.get<string>("E2E_ORG_ID") || "e2e-org-123";
  }

  /**
   * Fallback organization ID for testing
   * Can be overridden via FALLBACK_ORG_ID environment variable
   */
  get fallbackOrgId(): string {
    return this.configService.get<string>("FALLBACK_ORG_ID") || "org-123";
  }

  // ============================================================================
  // USER EMAILS (for development/testing only)
  // ============================================================================

  /**
   * Admin user email for development
   * Can be overridden via ADMIN_EMAIL environment variable
   */
  get adminEmail(): string {
    return (
      this.configService.get<string>("ADMIN_EMAIL") || "admin@plainledger.ca"
    );
  }

  /**
   * Demo user email for development
   * Can be overridden via DEMO_EMAIL environment variable
   */
  get demoEmail(): string {
    return (
      this.configService.get<string>("DEMO_EMAIL") || "demo@plainledger.ca"
    );
  }

  /**
   * Accountant user email for development
   * Can be overridden via ACCOUNTANT_EMAIL environment variable
   */
  get accountantEmail(): string {
    return (
      this.configService.get<string>("ACCOUNTANT_EMAIL") ||
      "accountant@plainledger.ca"
    );
  }

  // ============================================================================
  // S3 CONFIGURATION
  // ============================================================================

  /**
   * S3 Gold bucket name
   * Can be overridden via S3_BUCKET_GOLD environment variable
   */
  get s3GoldBucket(): string {
    return (
      this.configService.get<string>("S3_BUCKET_GOLD") || "plainledger-gold"
    );
  }

  /**
   * S3 endpoint URL (for LocalStack or AWS)
   * Can be overridden via S3_ENDPOINT environment variable
   */
  get s3Endpoint(): string | undefined {
    return this.configService.get<string>("S3_ENDPOINT");
  }

  /**
   * S3 region
   * Can be overridden via S3_REGION environment variable
   */
  get s3Region(): string {
    return this.configService.get<string>("S3_REGION") || "us-east-1";
  }

  // ============================================================================
  // QUICKBOOKS CONFIGURATION
  // ============================================================================

  /**
   * QuickBooks Sandbox API URL
   * Can be overridden via QUICKBOOKS_SANDBOX_URL environment variable
   */
  get quickbooksSandboxUrl(): string {
    return (
      this.configService.get<string>("QUICKBOOKS_SANDBOX_URL") ||
      "https://sandbox-quickbooks.api.intuit.com/v3/company"
    );
  }

  /**
   * QuickBooks Production API URL
   * Can be overridden via QUICKBOOKS_PRODUCTION_URL environment variable
   */
  get quickbooksProductionUrl(): string {
    return (
      this.configService.get<string>("QUICKBOOKS_PRODUCTION_URL") ||
      "https://quickbooks.api.intuit.com/v3/company"
    );
  }

  // ============================================================================
  // FINANCIAL CALCULATION CONSTANTS
  // ============================================================================

  /**
   * Accounting tolerance for balance checks (default: 0.01)
   * Can be overridden via ACCOUNTING_TOLERANCE environment variable
   */
  get accountingTolerance(): number {
    return parseFloat(
      this.configService.get<string>("ACCOUNTING_TOLERANCE") || "0.01",
    );
  }

  /**
   * Cash flow calculation: Salary percentage of operating expenses (default: 0.4 = 40%)
   * Can be overridden via CASH_FLOW_SALARY_PCT environment variable
   * Note: This should ideally be calculated from actual account data, but kept as fallback
   */
  get cashFlowSalaryPercentage(): number {
    return parseFloat(
      this.configService.get<string>("CASH_FLOW_SALARY_PCT") || "0.4",
    );
  }

  /**
   * Cash flow calculation: Supplier percentage of operating expenses (default: 0.35 = 35%)
   * Can be overridden via CASH_FLOW_SUPPLIER_PCT environment variable
   */
  get cashFlowSupplierPercentage(): number {
    return parseFloat(
      this.configService.get<string>("CASH_FLOW_SUPPLIER_PCT") || "0.35",
    );
  }

  /**
   * Cash flow calculation: Rent percentage of operating expenses (default: 0.15 = 15%)
   * Can be overridden via CASH_FLOW_RENT_PCT environment variable
   */
  get cashFlowRentPercentage(): number {
    return parseFloat(
      this.configService.get<string>("CASH_FLOW_RENT_PCT") || "0.15",
    );
  }

  /**
   * Cash flow calculation: Debt percentage of financing flows (default: 0.7 = 70%)
   * Can be overridden via CASH_FLOW_DEBT_PCT environment variable
   */
  get cashFlowDebtPercentage(): number {
    return parseFloat(
      this.configService.get<string>("CASH_FLOW_DEBT_PCT") || "0.7",
    );
  }

  /**
   * Cash flow calculation: Dividend percentage of financing outflows (default: 0.3 = 30%)
   * Can be overridden via CASH_FLOW_DIVIDEND_PCT environment variable
   */
  get cashFlowDividendPercentage(): number {
    return parseFloat(
      this.configService.get<string>("CASH_FLOW_DIVIDEND_PCT") || "0.3",
    );
  }

  /**
   * Rounding precision for financial calculations (default: 100 = 2 decimal places)
   * Can be overridden via FINANCIAL_ROUNDING_PRECISION environment variable
   */
  get financialRoundingPrecision(): number {
    return parseInt(
      this.configService.get<string>("FINANCIAL_ROUNDING_PRECISION") || "100",
      10,
    );
  }

  /**
   * Rounding precision for percentage calculations (default: 10000 = 4 decimal places)
   * Can be overridden via PERCENTAGE_ROUNDING_PRECISION environment variable
   */
  get percentageRoundingPrecision(): number {
    return parseInt(
      this.configService.get<string>("PERCENTAGE_ROUNDING_PRECISION") ||
        "10000",
      10,
    );
  }

  // ============================================================================
  // CACHE CONFIGURATION
  // ============================================================================

  /**
   * Cache TTL for Gold layer data in seconds (default: 300 = 5 minutes)
   * Can be overridden via CACHE_TTL_GOLD_SECONDS environment variable
   */
  get cacheTtlGoldSeconds(): number {
    return parseInt(
      this.configService.get<string>("CACHE_TTL_GOLD_SECONDS") || "300",
      10,
    );
  }

  // ============================================================================
  // DATA RECENCY THRESHOLDS
  // ============================================================================

  /**
   * Hours threshold for considering data "recent" (default: 24 hours)
   * Can be overridden via DATA_RECENCY_HOURS environment variable
   */
  get dataRecencyHours(): number {
    return parseInt(
      this.configService.get<string>("DATA_RECENCY_HOURS") || "24",
      10,
    );
  }

  // ============================================================================
  // FILE LIMITS
  // ============================================================================

  /**
   * Maximum number of transaction files to load for trend calculations (default: 5)
   * Can be overridden via MAX_TRANSACTION_FILES environment variable
   */
  get maxTransactionFiles(): number {
    return parseInt(
      this.configService.get<string>("MAX_TRANSACTION_FILES") || "5",
      10,
    );
  }

  // ============================================================================
  // AI SERVICE CONFIGURATION
  // ============================================================================

  /**
   * AI rate limit: requests per window per tenant (default: 30)
   * Can be overridden via AI_RATE_LIMIT_REQUESTS environment variable
   */
  get aiRateLimitRequests(): number {
    return parseInt(
      this.configService.get<string>("AI_RATE_LIMIT_REQUESTS") || "30",
      10,
    );
  }

  /**
   * AI rate limit: window duration in milliseconds (default: 60000 = 1 minute)
   * Can be overridden via AI_RATE_LIMIT_WINDOW_MS environment variable
   */
  get aiRateLimitWindowMs(): number {
    return parseInt(
      this.configService.get<string>("AI_RATE_LIMIT_WINDOW_MS") || "60000",
      10,
    );
  }

  /**
   * AI circuit breaker: failure threshold before opening (default: 5)
   * Can be overridden via AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD environment variable
   */
  get aiCircuitBreakerFailureThreshold(): number {
    return parseInt(
      this.configService.get<string>("AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD") ||
        "5",
      10,
    );
  }

  /**
   * AI circuit breaker: reset timeout in milliseconds (default: 60000 = 1 minute)
   * Can be overridden via AI_CIRCUIT_BREAKER_RESET_TIMEOUT environment variable
   */
  get aiCircuitBreakerResetTimeout(): number {
    return parseInt(
      this.configService.get<string>("AI_CIRCUIT_BREAKER_RESET_TIMEOUT") ||
        "60000",
      10,
    );
  }

  /**
   * AI response cache TTL in milliseconds (default: 300000 = 5 minutes)
   * Can be overridden via AI_CACHE_TTL_MS environment variable
   */
  get aiCacheTtlMs(): number {
    return parseInt(
      this.configService.get<string>("AI_CACHE_TTL_MS") || "300000",
      10,
    );
  }

  // ============================================================================
  // APPLICATION URLS
  // ============================================================================

  /**
   * Application URL for frontend
   * Can be overridden via APP_URL environment variable
   */
  get appUrl(): string {
    return this.configService.get<string>("APP_URL") || "http://localhost:5173";
  }

  /**
   * CORS allowed origins (comma-separated list)
   * Can be overridden via CORS_ORIGIN environment variable
   */
  get corsOrigin(): string {
    return (
      this.configService.get<string>("CORS_ORIGIN") || "http://localhost:5173"
    );
  }

  /**
   * API port
   * Can be overridden via PORT environment variable
   */
  get port(): number {
    return parseInt(this.configService.get<string>("PORT") || "3000", 10);
  }
}

/**
 * Factory function to create AppConfig instance
 */
export function createAppConfig(configService: ConfigService): AppConfig {
  return new AppConfig(configService);
}
