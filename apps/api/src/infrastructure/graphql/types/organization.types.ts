/**
 * Organization GraphQL Types
 *
 * Types related to organizations and their configuration.
 * Maps to domain entities: Organization, OrganizationFeatures
 */
import { Field, ObjectType, ID, InputType, Int } from "@nestjs/graphql";
import { GraphQLISODateTime } from "@nestjs/graphql";
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, Matches, IsTimeZone } from 'class-validator';

// =====================================================
// OBJECT TYPES
// =====================================================

@ObjectType({ description: "Organization subscription plan" })
export class SubscriptionPlan {
  @Field()
  tier: string;

  @Field()
  name: string;

  @Field(() => Int, { nullable: true })
  maxUsers?: number;

  @Field(() => Int, { nullable: true })
  maxConnections?: number;

  @Field(() => [String])
  features: string[];
}

@ObjectType({ description: "Organization entity" })
export class Organization {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  slug?: string;

  @Field({ nullable: true })
  industry?: string;

  @Field(() => SubscriptionPlan, { nullable: true })
  subscription?: SubscriptionPlan;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}

@ObjectType({ description: "Organization feature flags" })
export class OrganizationFeatures {
  @Field(() => ID)
  organizationId: string;

  @Field()
  analyticsEnabled: boolean;

  @Field()
  aiInsightsEnabled: boolean;

  @Field()
  multiCurrencyEnabled: boolean;

  @Field()
  customReportsEnabled: boolean;

  @Field()
  apiAccessEnabled: boolean;

  @Field(() => Int)
  maxDataSources: number;

  @Field(() => Int)
  maxUsers: number;
}

// =====================================================
// INPUT TYPES
// =====================================================

@InputType({ description: "Input for creating an organization" })
export class CreateOrganizationInput {
  @Field()
  @IsString() @MaxLength(255) @Matches(/\S/)
  name: string;

  @Field({ nullable: true })
  @IsOptional() @IsString() @MaxLength(100)
  industry?: string;

  @Field({ nullable: true })
  @IsOptional() @IsTimeZone() @MaxLength(100)
  timezone?: string;
}

@InputType({ description: "Input for updating an organization" })
export class UpdateOrganizationInput {
  @Field({ nullable: true })
  @IsOptional() @IsString() @MaxLength(255) @Matches(/\S/)
  name?: string;

  @Field({ nullable: true })
  @IsOptional() @IsString() @MaxLength(100)
  industry?: string;

  @Field({ nullable: true })
  @IsOptional() @IsTimeZone() @MaxLength(100)
  timezone?: string;
}

@InputType({ description: "Input for updating organization features" })
export class UpdateOrganizationFeaturesInput {
  @Field({ nullable: true })
  @IsOptional() @IsBoolean()
  analyticsEnabled?: boolean;

  @Field({ nullable: true })
  @IsOptional() @IsBoolean()
  aiInsightsEnabled?: boolean;

  @Field({ nullable: true })
  @IsOptional() @IsBoolean()
  multiCurrencyEnabled?: boolean;

  @Field({ nullable: true })
  @IsOptional() @IsBoolean()
  customReportsEnabled?: boolean;

  @Field({ nullable: true })
  @IsOptional() @IsBoolean()
  apiAccessEnabled?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional() @IsInt() @Min(-1)
  maxDataSources?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional() @IsInt() @Min(-1)
  maxUsers?: number;
}
