import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { UserProfileEntity } from "./user-profile.entity";

/**
 * UserSettings Entity
 * Stores user-specific settings and preferences
 * Extends UserProfileEntity with additional settings
 */
@Entity({ name: "user_settings", schema: "accounting" })
export class UserSettingsEntity {
  @PrimaryColumn({ name: "user_id", type: "varchar", length: 100 })
  userId: string; // Keycloak user ID

  @ManyToOne(() => UserProfileEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id", referencedColumnName: "id" })
  user: UserProfileEntity;

  // Notification Preferences (JSONB) - Detailed preferences
  @Column({ name: "notification_preferences", type: "jsonb", nullable: true })
  notificationPreferences?: {
    enabled: boolean;
    channels: {
      [category: string]: {
        in_app: boolean;
        email: boolean;
        push: boolean;
        sms: boolean;
        slack: boolean;
        teams: boolean;
      };
    };
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    emailDigest: "none" | "daily" | "weekly";
    integrations?: {
      slack?: any;
      teams?: any;
    };
  };

  // UI Preferences (JSONB)
  @Column({ name: "ui_preferences", type: "jsonb", nullable: true })
  uiPreferences?: {
    theme?: string;
    language?: string;
    timezone?: string;
    dateFormat?: string;
    currencyFormat?: string;
    sidebarCollapsed?: boolean;
    dashboardLayout?: string;
  };

  // Feature Preferences (JSONB)
  @Column({ name: "feature_preferences", type: "jsonb", nullable: true })
  featurePreferences?: {
    [feature: string]: boolean | any;
  };

  // Dashboard Configuration (JSONB) - Widget layouts per organization
  @Column({ name: "dashboard_config", type: "jsonb", nullable: true })
  dashboardConfig?: {
    // Keyed by organization ID for multi-tenant support
    [orgId: string]: {
      widgets: Array<{
        id: string;
        type: string;
        visible: boolean;
        position: number;
        size?: string;
        customHeight?: number;
        customWidth?: number | 'auto';
        lockSize?: boolean;
        gridSpan?: 1 | 2 | 3;
        chartConfig?: any;
      }>;
      version: number;
      locked?: boolean;
    };
  };

  // Saved Views Configuration (JSONB) - User's saved view configurations
  @Column({ name: "saved_views", type: "jsonb", nullable: true })
  savedViews?: {
    [viewId: string]: {
      id: string;
      name: string;
      nameEn: string;
      type: string;
      config: any;
      createdAt: string;
      updatedAt: string;
      isDefault?: boolean;
    };
  };

  // AI Pin States (JSONB) - Pinned AI suggestions
  @Column({ name: "ai_pins", type: "jsonb", nullable: true })
  aiPins?: {
    [chartId: string]: {
      pinnedAt: string;
      suggestionId: string;
      content: any;
    };
  };

  // Recent Items (JSONB) - Recently accessed reports, views, etc.
  @Column({ name: "recent_items", type: "jsonb", nullable: true })
  recentItems?: {
    reports?: string[];
    views?: string[];
    dashboards?: string[];
    searches?: string[];
  };

  // Chart/Graph Preferences (JSONB)
  @Column({ name: "chart_preferences", type: "jsonb", nullable: true })
  chartPreferences?: {
    // Tooltip/Hover Configuration
    tooltip?: {
      enabled?: boolean;
      delayShow?: number;
      delayHide?: number;
      position?: "auto" | "top" | "bottom" | "left" | "right" | "cursor";
      showValue?: boolean;
      showLabel?: boolean;
      showComparison?: boolean;
      showPercentageChange?: boolean;
      showTrendIndicator?: boolean;
      showStatus?: boolean;
      showMovingAverage?: boolean;
      showBudget?: boolean;
      showCategory?: boolean;
      showCumulative?: boolean;
      showPercentOfTotal?: boolean;
      highlightOnHover?: boolean;
      showCrosshair?: boolean;
      animate?: boolean;
      theme?: "auto" | "light" | "dark";
    };
    // IBCS Configuration
    ibcs?: {
      enabled?: boolean;
      showVariancePins?: boolean;
      showLegend?: boolean;
      showBenchmark?: boolean;
      showVarianceShading?: boolean;
      metricType?: "revenue" | "expense" | "profit" | "ratio";
      showPlan?: boolean;
      showForecast?: boolean;
      showPriorYear?: boolean;
      varianceHighlightThreshold?: number;
      useSemanticColors?: boolean;
    };
    // Display Configuration
    display?: {
      currency?: string;
      currencyNotation?: "standard" | "compact" | "scientific";
      numberFormat?: "thousands" | "millions" | "billions" | "actual";
      currencyDecimals?: number;
      percentageDecimals?: number;
      ratioDecimals?: number;
      showCurrencySymbol?: boolean;
      showZeroValues?: boolean;
      useAccountingFormat?: boolean;
    };
    // Chart Controls Visibility
    controlsMode?: "hover" | "always" | "hidden";
    // Per-chart overrides (chartId -> partial config)
    chartOverrides?: {
      [chartId: string]: any;
    };
  };

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
