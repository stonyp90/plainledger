/**
 * Datalake Domain Module
 *
 * This module contains the standardized schema types for the data lake
 * and provider-specific data types for third-party accounting integrations.
 *
 * Medallion Architecture:
 * - Bronze: Raw data as received from source systems
 * - Silver: Cleansed, standardized, and validated data
 * - Gold: Analytics-ready star schema for Power BI
 */

export * from "./schemas";
export * from "./provider-types";
export * from "./bronze-schema";
export * from "./silver-schema";
