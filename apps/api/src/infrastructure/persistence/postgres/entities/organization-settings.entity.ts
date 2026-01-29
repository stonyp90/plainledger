import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { OrganizationEntity } from "./organization.entity";

/**
 * OrganizationSettings Entity
 * Stores organization-level settings and configurations
 */
@Entity({ name: "organization_settings", schema: "accounting" })
export class OrganizationSettingsEntity {
  @PrimaryColumn({ type: "uuid" })
  organizationId: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "organization_id" })
  organization: OrganizationEntity;

  // Threshold Settings (JSONB)
  @Column({ name: "threshold_settings", type: "jsonb", nullable: true })
  thresholdSettings?: {
    varianceWarning: number;
    varianceCritical: number;
    currentRatioMin: number;
    currentRatioMax: number;
    quickRatioMin: number;
    debtToEquityMax: number;
    trendConsecutivePeriods: number;
    trendPercentageChange: number;
    receivablesAgingWarning: number;
    receivablesAgingCritical: number;
    payablesAgingWarning: number;
    largeTransactionAmount: number;
    roundNumberThreshold: number;
    negativeBalanceCheck: boolean;
    unusualHoursCheck: boolean;
  };

  // Branding Settings (JSONB)
  @Column({ name: "branding_settings", type: "jsonb", nullable: true })
  brandingSettings?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    customCss?: string;
  };

  // Notification Integration Settings (JSONB)
  @Column({ name: "notification_integrations", type: "jsonb", nullable: true })
  notificationIntegrations?: {
    slack?: {
      connected: boolean;
      webhookUrl?: string;
      channelName?: string;
      workspaceName?: string;
      workspaceId?: string;
      channelId?: string;
      connectedAt?: string;
      connectedBy?: string;
      dailySummary: boolean;
      dailySummaryTime: string;
      alertsEnabled: boolean;
      alertPriorities: string[];
    };
    teams?: {
      connected: boolean;
      webhookUrl?: string;
      channelName?: string;
      tenantName?: string;
      tenantId?: string;
      teamId?: string;
      teamName?: string;
      channelId?: string;
      connectedAt?: string;
      connectedBy?: string;
      dailySummary: boolean;
      dailySummaryTime: string;
      alertsEnabled: boolean;
      alertPriorities: string[];
    };
  };

  // Analytics Configuration (JSONB)
  @Column({ name: "analytics_config", type: "jsonb", nullable: true })
  analyticsConfig?: {
    powerBI?: {
      tenantId?: string;
      clientId?: string;
      workspaceId?: string;
      reportId?: string;
    };
  };

  // General Settings (JSONB)
  @Column({ name: "general_settings", type: "jsonb", nullable: true })
  generalSettings?: {
    fiscalYearEndMonth?: number;
    currency?: string;
    industry?: string;
    timezone?: string;
    dateFormat?: string;
    currencyFormat?: string;
  };

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
