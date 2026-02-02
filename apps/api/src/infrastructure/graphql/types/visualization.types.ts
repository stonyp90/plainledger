/**
 * Visualization GraphQL Types
 * 
 * GraphQL schema types for visualization queries, mutations, and subscriptions.
 */

import {
  ObjectType,
  Field,
  InputType,
  Int,
  Float,
  registerEnumType,
} from "@nestjs/graphql";
import { GraphQLISODateTime } from "@nestjs/graphql";

// =====================================================
// ENUMS
// =====================================================

export enum ChartType {
  LINE = "line",
  BAR = "bar",
  AREA = "area",
  PIE = "pie",
  DONUT = "donut",
  SCATTER = "scatter",
  RADAR = "radar",
  TREEMAP = "treemap",
  HEATMAP = "heatmap",
  WATERFALL = "waterfall",
  GAUGE = "gauge",
  SPARKLINE = "sparkline",
  TABLE = "table",
}

export enum AggregationType {
  SUM = "SUM",
  AVG = "AVG",
  COUNT = "COUNT",
  COUNT_DISTINCT = "COUNT_DISTINCT",
  MIN = "MIN",
  MAX = "MAX",
  NONE = "NONE",
}

export enum JoinType {
  INNER = "inner",
  LEFT = "left",
  RIGHT = "right",
  FULL = "full",
}

export enum FilterOperator {
  EQUALS = "equals",
  NOT_EQUALS = "not_equals",
  CONTAINS = "contains",
  NOT_CONTAINS = "not_contains",
  STARTS_WITH = "starts_with",
  ENDS_WITH = "ends_with",
  GREATER_THAN = "greater_than",
  LESS_THAN = "less_than",
  GREATER_OR_EQUAL = "greater_or_equal",
  LESS_OR_EQUAL = "less_or_equal",
  BETWEEN = "between",
  IN = "in",
  NOT_IN = "not_in",
  IS_NULL = "is_null",
  IS_NOT_NULL = "is_not_null",
}

registerEnumType(ChartType, { name: "ChartType" });
registerEnumType(AggregationType, { name: "AggregationType" });
registerEnumType(JoinType, { name: "JoinType" });
registerEnumType(FilterOperator, { name: "FilterOperator" });

// =====================================================
// INPUT TYPES
// =====================================================

@InputType()
export class DataSourceReferenceInput {
  @Field()
  id: string;

  @Field({ nullable: true })
  alias?: string;
}

@InputType()
export class JoinConfigInput {
  @Field()
  leftSource: string;

  @Field()
  rightSource: string;

  @Field()
  leftField: string;

  @Field()
  rightField: string;

  @Field(() => JoinType)
  type: JoinType;
}

@InputType()
export class FieldConfigInput {
  @Field()
  id: string;

  @Field()
  sourceId: string;

  @Field()
  fieldId: string;

  @Field({ nullable: true })
  alias?: string;

  @Field({ nullable: true })
  aliasEn?: string;

  @Field(() => AggregationType, { nullable: true })
  aggregation?: AggregationType;

  @Field()
  enabled: boolean;
}

@InputType()
export class FilterConfigInput {
  @Field()
  id: string;

  @Field()
  sourceId: string;

  @Field()
  fieldId: string;

  @Field(() => FilterOperator)
  operator: FilterOperator;

  @Field(() => String, { nullable: true })
  value?: string;

  @Field()
  enabled: boolean;
}

@InputType()
export class CalculatedFieldInput {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field()
  nameEn: string;

  @Field()
  formula: string;

  @Field({ nullable: true })
  format?: string;
}

@InputType()
export class VisualizationQueryInput {
  @Field(() => [String])
  sources: string[];

  @Field(() => [FieldConfigInput])
  fields: FieldConfigInput[];

  @Field(() => [JoinConfigInput], { nullable: true })
  joins?: JoinConfigInput[];

  @Field(() => [FilterConfigInput], { nullable: true })
  filters?: FilterConfigInput[];

  @Field(() => [CalculatedFieldInput], { nullable: true })
  calculatedFields?: CalculatedFieldInput[];

  @Field(() => Int, { nullable: true })
  limit?: number;

  @Field(() => Int, { nullable: true })
  offset?: number;
}

@InputType()
export class CreateVisualizationInput {
  @Field()
  name: string;

  @Field({ nullable: true })
  nameEn?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  descriptionEn?: string;

  @Field(() => ChartType)
  chartType: ChartType;

  @Field(() => VisualizationQueryInput)
  query: VisualizationQueryInput;

  @Field({ nullable: true })
  category?: string;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field({ nullable: true, defaultValue: false })
  isPublic?: boolean;
}

@InputType()
export class UpdateVisualizationInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  nameEn?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  descriptionEn?: string;

  @Field(() => ChartType, { nullable: true })
  chartType?: ChartType;

  @Field(() => VisualizationQueryInput, { nullable: true })
  query?: VisualizationQueryInput;

  @Field({ nullable: true })
  category?: string;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field({ nullable: true })
  isPublic?: boolean;
}

@InputType()
export class CreateCustomEntityInput {
  @Field()
  name: string;

  @Field({ nullable: true })
  nameEn?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  descriptionEn?: string;

  @Field({ nullable: true })
  icon?: string;

  @Field(() => [DataSourceReferenceInput])
  baseSources: DataSourceReferenceInput[];

  @Field(() => [JoinConfigInput])
  joins: JoinConfigInput[];

  @Field(() => [String])
  defaultFields: string[];

  @Field({ nullable: true, defaultValue: false })
  isPublic?: boolean;
}

// =====================================================
// OUTPUT TYPES
// =====================================================

@ObjectType()
export class QueryResult {
  @Field(() => [[String]])
  data: string[][];

  @Field(() => [String])
  columns: string[];

  @Field(() => Int)
  rowCount: number;

  @Field(() => Int)
  executionTimeMs: number;

  @Field()
  cached: boolean;

  @Field()
  truncated: boolean;

  @Field(() => Int, { nullable: true })
  maxRows?: number;

  @Field({ nullable: true })
  queryId?: string;
}

@ObjectType()
export class Visualization {
  @Field()
  id: string;

  @Field()
  organizationId: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  nameEn?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  descriptionEn?: string;

  @Field(() => ChartType)
  chartType: ChartType;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;

  @Field()
  isPublic: boolean;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field({ nullable: true })
  category?: string;

  @Field({ nullable: true })
  thumbnail?: string;
}

@ObjectType()
export class CustomEntity {
  @Field()
  id: string;

  @Field()
  organizationId: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  nameEn?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  descriptionEn?: string;

  @Field({ nullable: true })
  icon?: string;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;

  @Field()
  isPublic: boolean;
}
