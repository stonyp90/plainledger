/**
 * User Settings GraphQL Types
 *
 * Types for user preferences including chart/graph configuration.
 * Supports tooltip, IBCS, display, and per-chart overrides.
 */
import {
  Field,
  ObjectType,
  InputType,
  Int,
  Float,
  registerEnumType,
} from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-scalars";

// =====================================================
// ENUMS
// =====================================================

export enum TooltipPosition {
  AUTO = "auto",
  TOP = "top",
  BOTTOM = "bottom",
  LEFT = "left",
  RIGHT = "right",
  CURSOR = "cursor",
}

export enum TooltipTheme {
  AUTO = "auto",
  LIGHT = "light",
  DARK = "dark",
}

export enum ChartControlsMode {
  HOVER = "hover",
  ALWAYS = "always",
  HIDDEN = "hidden",
}

export enum IBCSMetricType {
  REVENUE = "revenue",
  EXPENSE = "expense",
  PROFIT = "profit",
  RATIO = "ratio",
}

export enum CurrencyNotation {
  STANDARD = "standard",
  COMPACT = "compact",
  SCIENTIFIC = "scientific",
}

export enum NumberFormat {
  THOUSANDS = "thousands",
  MILLIONS = "millions",
  BILLIONS = "billions",
  ACTUAL = "actual",
}

registerEnumType(TooltipPosition, {
  name: "TooltipPosition",
  description: "Position of tooltip relative to data point",
});

registerEnumType(TooltipTheme, {
  name: "TooltipTheme",
  description: "Tooltip color theme",
});

registerEnumType(ChartControlsMode, {
  name: "ChartControlsMode",
  description: "When to show chart controls",
});

registerEnumType(IBCSMetricType, {
  name: "IBCSMetricType",
  description: "Metric type for IBCS variance calculations",
});

registerEnumType(CurrencyNotation, {
  name: "CurrencyNotation",
  description: "Currency notation style",
});

registerEnumType(NumberFormat, {
  name: "NumberFormat",
  description: "Number formatting scale",
});

// =====================================================
// TOOLTIP CONFIGURATION
// =====================================================

@ObjectType({ description: "Tooltip/hover configuration" })
export class TooltipConfig {
  @Field({ defaultValue: true })
  enabled: boolean;

  @Field(() => Int, { defaultValue: 150 })
  delayShow: number;

  @Field(() => Int, { defaultValue: 100 })
  delayHide: number;

  @Field(() => TooltipPosition, { defaultValue: TooltipPosition.AUTO })
  position: TooltipPosition;

  @Field({ defaultValue: true })
  showValue: boolean;

  @Field({ defaultValue: true })
  showLabel: boolean;

  @Field({ defaultValue: true })
  showComparison: boolean;

  @Field({ defaultValue: true })
  showPercentageChange: boolean;

  @Field({ defaultValue: true })
  showTrendIndicator: boolean;

  @Field({ defaultValue: true })
  showStatus: boolean;

  @Field({ defaultValue: false })
  showMovingAverage: boolean;

  @Field({ defaultValue: true })
  showBudget: boolean;

  @Field({ defaultValue: true })
  showCategory: boolean;

  @Field({ defaultValue: true })
  showCumulative: boolean;

  @Field({ defaultValue: false })
  showPercentOfTotal: boolean;

  @Field({ defaultValue: true })
  highlightOnHover: boolean;

  @Field({ defaultValue: true })
  showCrosshair: boolean;

  @Field({ defaultValue: true })
  animate: boolean;

  @Field(() => TooltipTheme, { defaultValue: TooltipTheme.AUTO })
  theme: TooltipTheme;
}

@InputType({ description: "Tooltip configuration input" })
export class TooltipConfigInput {
  @Field({ nullable: true })
  enabled?: boolean;

  @Field(() => Int, { nullable: true })
  delayShow?: number;

  @Field(() => Int, { nullable: true })
  delayHide?: number;

  @Field(() => TooltipPosition, { nullable: true })
  position?: TooltipPosition;

  @Field({ nullable: true })
  showValue?: boolean;

  @Field({ nullable: true })
  showLabel?: boolean;

  @Field({ nullable: true })
  showComparison?: boolean;

  @Field({ nullable: true })
  showPercentageChange?: boolean;

  @Field({ nullable: true })
  showTrendIndicator?: boolean;

  @Field({ nullable: true })
  showStatus?: boolean;

  @Field({ nullable: true })
  showMovingAverage?: boolean;

  @Field({ nullable: true })
  showBudget?: boolean;

  @Field({ nullable: true })
  showCategory?: boolean;

  @Field({ nullable: true })
  showCumulative?: boolean;

  @Field({ nullable: true })
  showPercentOfTotal?: boolean;

  @Field({ nullable: true })
  highlightOnHover?: boolean;

  @Field({ nullable: true })
  showCrosshair?: boolean;

  @Field({ nullable: true })
  animate?: boolean;

  @Field(() => TooltipTheme, { nullable: true })
  theme?: TooltipTheme;
}

// =====================================================
// IBCS CONFIGURATION
// =====================================================

@ObjectType({ description: "IBCS (International Business Communication Standards) configuration" })
export class IBCSConfig {
  @Field({ defaultValue: true })
  enabled: boolean;

  @Field({ defaultValue: true })
  showVariancePins: boolean;

  @Field({ defaultValue: true })
  showLegend: boolean;

  @Field({ defaultValue: false })
  showBenchmark: boolean;

  @Field({ defaultValue: true })
  showVarianceShading: boolean;

  @Field(() => IBCSMetricType, { defaultValue: IBCSMetricType.REVENUE })
  metricType: IBCSMetricType;

  @Field({ defaultValue: true })
  showPlan: boolean;

  @Field({ defaultValue: false })
  showForecast: boolean;

  @Field({ defaultValue: true })
  showPriorYear: boolean;

  @Field(() => Float, { defaultValue: 10 })
  varianceHighlightThreshold: number;

  @Field({ defaultValue: true })
  useSemanticColors: boolean;
}

@InputType({ description: "IBCS configuration input" })
export class IBCSConfigInput {
  @Field({ nullable: true })
  enabled?: boolean;

  @Field({ nullable: true })
  showVariancePins?: boolean;

  @Field({ nullable: true })
  showLegend?: boolean;

  @Field({ nullable: true })
  showBenchmark?: boolean;

  @Field({ nullable: true })
  showVarianceShading?: boolean;

  @Field(() => IBCSMetricType, { nullable: true })
  metricType?: IBCSMetricType;

  @Field({ nullable: true })
  showPlan?: boolean;

  @Field({ nullable: true })
  showForecast?: boolean;

  @Field({ nullable: true })
  showPriorYear?: boolean;

  @Field(() => Float, { nullable: true })
  varianceHighlightThreshold?: number;

  @Field({ nullable: true })
  useSemanticColors?: boolean;
}

// =====================================================
// DISPLAY CONFIGURATION
// =====================================================

@ObjectType({ description: "Display/formatting configuration" })
export class DisplayConfig {
  @Field({ defaultValue: "CAD" })
  currency: string;

  @Field(() => CurrencyNotation, { defaultValue: CurrencyNotation.STANDARD })
  currencyNotation: CurrencyNotation;

  @Field(() => NumberFormat, { defaultValue: NumberFormat.ACTUAL })
  numberFormat: NumberFormat;

  @Field(() => Int, { defaultValue: 0 })
  currencyDecimals: number;

  @Field(() => Int, { defaultValue: 1 })
  percentageDecimals: number;

  @Field(() => Int, { defaultValue: 2 })
  ratioDecimals: number;

  @Field({ defaultValue: true })
  showCurrencySymbol: boolean;

  @Field({ defaultValue: false })
  showZeroValues: boolean;

  @Field({ defaultValue: false })
  useAccountingFormat: boolean;
}

@InputType({ description: "Display configuration input" })
export class DisplayConfigInput {
  @Field({ nullable: true })
  currency?: string;

  @Field(() => CurrencyNotation, { nullable: true })
  currencyNotation?: CurrencyNotation;

  @Field(() => NumberFormat, { nullable: true })
  numberFormat?: NumberFormat;

  @Field(() => Int, { nullable: true })
  currencyDecimals?: number;

  @Field(() => Int, { nullable: true })
  percentageDecimals?: number;

  @Field(() => Int, { nullable: true })
  ratioDecimals?: number;

  @Field({ nullable: true })
  showCurrencySymbol?: boolean;

  @Field({ nullable: true })
  showZeroValues?: boolean;

  @Field({ nullable: true })
  useAccountingFormat?: boolean;
}

// =====================================================
// CHART LOCK STATUS
// =====================================================

@ObjectType({ description: "Chart lock status information" })
export class ChartLockStatus {
  @Field({ description: "Whether the chart is locked" })
  locked: boolean;

  @Field({ nullable: true, description: "When the chart was locked" })
  lockedAt?: Date;

  @Field({ nullable: true, description: "Who locked the chart" })
  lockedBy?: string;
}

@InputType({ description: "Chart lock status input" })
export class ChartLockStatusInput {
  @Field({ description: "Whether the chart is locked" })
  locked: boolean;

  @Field({ nullable: true, description: "When the chart was locked" })
  lockedAt?: string;
}

// =====================================================
// PER-CHART SETTINGS (with lock support)
// =====================================================

@ObjectType({ description: "Individual chart settings with lock support" })
export class ChartSettings {
  @Field({ description: "Chart identifier" })
  chartId: string;

  @Field({ defaultValue: false, description: "Whether the chart is locked from modifications" })
  locked: boolean;

  @Field({ nullable: true, description: "When the chart was locked" })
  lockedAt?: Date;

  @Field(() => GraphQLJSON, { nullable: true, description: "Chart-specific configuration overrides" })
  config?: Record<string, any>;

  @Field({ nullable: true, description: "Last update timestamp for sync" })
  updatedAt?: Date;
}

@InputType({ description: "Individual chart settings input" })
export class ChartSettingsInput {
  @Field({ description: "Chart identifier" })
  chartId: string;

  @Field({ nullable: true, description: "Whether the chart is locked" })
  locked?: boolean;

  @Field({ nullable: true, description: "When the chart was locked (ISO string)" })
  lockedAt?: string;

  @Field(() => GraphQLJSON, { nullable: true, description: "Chart-specific configuration overrides" })
  config?: Record<string, any>;
}

// =====================================================
// CHART PREFERENCES (AGGREGATE)
// =====================================================

@ObjectType({ description: "Complete chart preferences configuration" })
export class ChartPreferences {
  @Field(() => TooltipConfig, { nullable: true })
  tooltip?: TooltipConfig;

  @Field(() => IBCSConfig, { nullable: true })
  ibcs?: IBCSConfig;

  @Field(() => DisplayConfig, { nullable: true })
  display?: DisplayConfig;

  @Field(() => ChartControlsMode, { nullable: true })
  controlsMode?: ChartControlsMode;

  @Field(() => GraphQLJSON, { nullable: true, description: "Per-chart overrides keyed by chart ID" })
  chartOverrides?: Record<string, any>;
}

@InputType({ description: "Chart preferences input" })
export class ChartPreferencesInput {
  @Field(() => TooltipConfigInput, { nullable: true })
  tooltip?: TooltipConfigInput;

  @Field(() => IBCSConfigInput, { nullable: true })
  ibcs?: IBCSConfigInput;

  @Field(() => DisplayConfigInput, { nullable: true })
  display?: DisplayConfigInput;

  @Field(() => ChartControlsMode, { nullable: true })
  controlsMode?: ChartControlsMode;

  @Field(() => GraphQLJSON, { nullable: true, description: "Per-chart overrides keyed by chart ID" })
  chartOverrides?: Record<string, any>;
}

// =====================================================
// USER SETTINGS (COMPLETE)
// =====================================================

@ObjectType({ description: "User settings including all preferences" })
export class UserSettings {
  @Field()
  userId: string;

  @Field(() => GraphQLJSON, { nullable: true })
  notificationPreferences?: any;

  @Field(() => GraphQLJSON, { nullable: true })
  uiPreferences?: any;

  @Field(() => GraphQLJSON, { nullable: true })
  featurePreferences?: any;

  @Field(() => ChartPreferences, { nullable: true })
  chartPreferences?: ChartPreferences;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@InputType({ description: "Update user settings input" })
export class UpdateUserSettingsInput {
  @Field(() => GraphQLJSON, { nullable: true })
  notificationPreferences?: any;

  @Field(() => GraphQLJSON, { nullable: true })
  uiPreferences?: any;

  @Field(() => GraphQLJSON, { nullable: true })
  featurePreferences?: any;

  @Field(() => ChartPreferencesInput, { nullable: true })
  chartPreferences?: ChartPreferencesInput;
}

// =====================================================
// BATCH SYNC TYPES
// =====================================================

@InputType({ description: "Batch sync input for all user settings" })
export class BatchSyncSettingsInput {
  @Field(() => GraphQLJSON, { nullable: true, description: "Notification preferences" })
  notificationPreferences?: any;

  @Field(() => GraphQLJSON, { nullable: true, description: "UI preferences" })
  uiPreferences?: any;

  @Field(() => GraphQLJSON, { nullable: true, description: "Feature preferences" })
  featurePreferences?: any;

  @Field(() => ChartPreferencesInput, { nullable: true, description: "Global chart preferences" })
  chartPreferences?: ChartPreferencesInput;

  @Field(() => [ChartSettingsInput], { nullable: true, description: "Per-chart settings with lock status" })
  chartSettings?: ChartSettingsInput[];

  @Field({ description: "Client-side timestamp for conflict resolution (ISO string)" })
  clientTimestamp: string;

  @Field({ nullable: true, description: "Last known server timestamp for conflict detection" })
  lastSyncTimestamp?: string;
}

@ObjectType({ description: "Result of batch sync operation" })
export class BatchSyncResult {
  @Field({ description: "Whether the sync was successful" })
  success: boolean;

  @Field({ description: "Server timestamp after sync (ISO string)" })
  serverTimestamp: string;

  @Field({ nullable: true, description: "Error message if sync failed" })
  error?: string;

  @Field(() => [String], { nullable: true, description: "List of chart IDs that had conflicts" })
  conflicts?: string[];

  @Field(() => UserSettings, { nullable: true, description: "Merged settings after sync" })
  settings?: UserSettings;
}

@ObjectType({ description: "Chart lock operation result" })
export class ChartLockResult {
  @Field({ description: "Whether the operation was successful" })
  success: boolean;

  @Field({ description: "The chart ID" })
  chartId: string;

  @Field({ description: "Current lock status" })
  locked: boolean;

  @Field({ nullable: true, description: "When the chart was locked" })
  lockedAt?: Date;

  @Field({ nullable: true, description: "Error message if operation failed" })
  error?: string;
}
