/**
 * Data Source GraphQL Types
 *
 * Types for managing data source connections (QuickBooks, Xero, etc.)
 * Maps to domain entities: DataSource, IntegrationProvider
 */
import { Field, ObjectType, ID, Int, InputType } from "@nestjs/graphql";
import { GraphQLISODateTime } from "@nestjs/graphql";
import { DataSourceStatus } from "./common.types";
import { IsArray, IsBoolean, IsDate, IsOptional, IsString, MaxLength, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

// =====================================================
// OBJECT TYPES
// =====================================================

@ObjectType({ description: "Sync statistics" })
export class SyncStats {
  @Field(() => Int)
  accountsSynced: number;

  @Field(() => Int)
  transactionsSynced: number;

  @Field(() => Int, { nullable: true })
  ledgerLinesSynced?: number;

  @Field(() => Int, { nullable: true })
  contactsSynced?: number;

  @Field(() => Int, { nullable: true })
  invoicesSynced?: number;

  @Field(() => Int, { nullable: true })
  billsSynced?: number;
}

@ObjectType({ description: "Data source connection" })
export class DataSource {
  @Field(() => ID)
  id: string;

  @Field()
  provider: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  companyName?: string;

  @Field(() => DataSourceStatus)
  status: DataSourceStatus;

  @Field(() => GraphQLISODateTime, { nullable: true })
  lastSyncAt?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  nextSyncAt?: Date;

  @Field(() => SyncStats, { nullable: true })
  syncStats?: SyncStats;

  @Field({ nullable: true })
  errorMessage?: string;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}

@ObjectType({ description: "OAuth URL response" })
export class OAuthUrlResponse {
  @Field()
  url: string;

  @Field()
  state: string;

  @Field()
  provider: string;
}

@ObjectType({ description: "Sync result" })
export class SyncResult {
  @Field()
  success: boolean;

  @Field(() => SyncStats)
  stats: SyncStats;

  @Field(() => GraphQLISODateTime)
  syncedAt: Date;

  @Field({ nullable: true })
  message?: string;

  @Field(() => [String], { nullable: true })
  warnings?: string[];
}

@ObjectType({ description: "Available provider" })
export class AvailableProvider {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field()
  description: string;

  @Field()
  logoUrl: string;

  @Field()
  isEnabled: boolean;

  @Field(() => [String])
  supportedFeatures: string[];
}

// =====================================================
// INPUT TYPES
// =====================================================

@InputType({ description: "OAuth callback input" })
export class OAuthCallbackInput {
  @Field()
  @IsString() @MaxLength(4096)
  code: string;

  @Field()
  @IsString() @MaxLength(43)
  state: string;

  @Field({ nullable: true })
  @IsOptional() @IsString() @MaxLength(32)
  realmId?: string;
}

@InputType({ description: "Data source sync options" })
export class SyncOptionsInput {
  @Field({ nullable: true, defaultValue: false })
  @IsOptional() @IsBoolean()
  fullSync?: boolean;

  @Field(() => [String], { nullable: true })
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(100, { each: true })
  entities?: string[];

  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional() @Type(() => Date) @IsDate()
  fromDate?: Date;
}
