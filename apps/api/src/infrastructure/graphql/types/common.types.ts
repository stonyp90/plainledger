/**
 * Common GraphQL Types
 *
 * Shared types, scalars, and interfaces used across the GraphQL schema.
 * Following clean architecture, these map to domain value objects.
 */
import {
  Field,
  ObjectType,
  Float,
  Int,
  registerEnumType,
} from "@nestjs/graphql";
import { GraphQLISODateTime } from "@nestjs/graphql";

// =====================================================
// ENUMS
// =====================================================

export enum AccountType {
  ASSET = "ASSET",
  LIABILITY = "LIABILITY",
  EQUITY = "EQUITY",
  REVENUE = "REVENUE",
  EXPENSE = "EXPENSE",
}

export enum TransactionType {
  INVOICE = "INVOICE",
  PAYMENT = "PAYMENT",
  EXPENSE = "EXPENSE",
  JOURNAL = "JOURNAL",
  TRANSFER = "TRANSFER",
}

export enum DataSourceStatus {
  CONNECTED = "CONNECTED",
  DISCONNECTED = "DISCONNECTED",
  SYNCING = "SYNCING",
  ERROR = "ERROR",
}

export enum TrendDirection {
  UP = "UP",
  DOWN = "DOWN",
  FLAT = "FLAT",
}

registerEnumType(AccountType, {
  name: "AccountType",
  description: "The type of account in the chart of accounts",
});

registerEnumType(TransactionType, {
  name: "TransactionType",
  description: "The type of financial transaction",
});

registerEnumType(DataSourceStatus, {
  name: "DataSourceStatus",
  description: "Connection status of a data source",
});

registerEnumType(TrendDirection, {
  name: "TrendDirection",
  description: "Direction of a trend",
});

// =====================================================
// VALUE OBJECT TYPES
// =====================================================

@ObjectType({ description: "Monetary value with currency" })
export class Money {
  @Field(() => Float)
  amount: number;

  @Field()
  currency: string;

  @Field(() => String, { nullable: true })
  formatted?: string;
}

@ObjectType({ description: "Date range for filtering" })
export class DateRange {
  @Field(() => GraphQLISODateTime)
  start: Date;

  @Field(() => GraphQLISODateTime)
  end: Date;
}

@ObjectType({ description: "Pagination information" })
export class PageInfo {
  @Field(() => Int)
  totalCount: number;

  @Field(() => Int)
  pageSize: number;

  @Field(() => Int)
  currentPage: number;

  @Field(() => Int)
  totalPages: number;

  @Field()
  hasNextPage: boolean;

  @Field()
  hasPreviousPage: boolean;
}

// =====================================================
// COMMON RESPONSE TYPES
// =====================================================

@ObjectType({ description: "Standard mutation response" })
export class MutationResponse {
  @Field()
  success: boolean;

  @Field({ nullable: true })
  message?: string;

  @Field(() => [String], { nullable: true })
  errors?: string[];
}

@ObjectType({ description: "Trend data point" })
export class TrendPoint {
  @Field()
  period: string;

  @Field(() => Float)
  value: number;

  @Field(() => Float, { nullable: true })
  previousValue?: number;

  @Field(() => Float, { nullable: true })
  changePercent?: number;
}

@ObjectType({ description: "Metric with trend information" })
export class MetricWithTrend {
  @Field()
  name: string;

  @Field(() => Float)
  currentValue: number;

  @Field(() => Float, { nullable: true })
  previousValue?: number;

  @Field(() => TrendDirection, { nullable: true })
  direction?: TrendDirection;

  @Field(() => Float, { nullable: true })
  changePercent?: number;

  @Field(() => [TrendPoint], { nullable: true })
  history?: TrendPoint[];
}
