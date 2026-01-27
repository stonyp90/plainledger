/**
 * Organization GraphQL Types
 *
 * Types related to organizations and their configuration.
 * Maps to domain entities: Organization, OrganizationFeatures
 */
import { Field, ObjectType, ID, InputType, Int } from "@nestjs/graphql";
import { GraphQLISODateTime } from "@nestjs/graphql";

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
  name: string;

  @Field({ nullable: true })
  industry?: string;

  @Field({ nullable: true })
  timezone?: string;
}

@InputType({ description: "Input for updating an organization" })
export class UpdateOrganizationInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  industry?: string;

  @Field({ nullable: true })
  timezone?: string;
}

@InputType({ description: "Input for updating organization features" })
export class UpdateOrganizationFeaturesInput {
  @Field({ nullable: true })
  analyticsEnabled?: boolean;

  @Field({ nullable: true })
  aiInsightsEnabled?: boolean;

  @Field({ nullable: true })
  multiCurrencyEnabled?: boolean;

  @Field({ nullable: true })
  customReportsEnabled?: boolean;

  @Field({ nullable: true })
  apiAccessEnabled?: boolean;

  @Field(() => Int, { nullable: true })
  maxDataSources?: number;

  @Field(() => Int, { nullable: true })
  maxUsers?: number;
}
