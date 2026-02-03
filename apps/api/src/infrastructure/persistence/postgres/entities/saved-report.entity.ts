/**
 * SavedReport Entity
 * Stores user-created reports with chart configurations
 */
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export type ReportType =
  | "financial-overview"
  | "income-statement"
  | "balance-sheet"
  | "cash-flow"
  | "budget-variance"
  | "ar-aging"
  | "ap-aging"
  | "custom";

@Entity({ name: "saved_reports", schema: "reporting" })
@Index(["organizationId", "createdBy"])
@Index(["organizationId", "type"])
export class SavedReportEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "organization_id", type: "uuid" })
  organizationId: string;

  @Column({ name: "name", type: "varchar", length: 255 })
  name: string;

  @Column({ name: "name_en", type: "varchar", length: 255, nullable: true })
  nameEn?: string;

  @Column({ name: "description", type: "text", nullable: true })
  description?: string;

  @Column({ name: "description_en", type: "text", nullable: true })
  descriptionEn?: string;

  @Column({ name: "type", type: "varchar", length: 50 })
  type: ReportType;

  @Column({ name: "charts", type: "jsonb" })
  charts: Array<{
    id: string;
    chartConfig: any;
    position: { row: number; col: number };
    size: { width: number; height: number };
    title?: string;
    showTitle: boolean;
    showLegend: boolean;
  }>;

  @Column({ name: "filters", type: "jsonb" })
  filters: {
    dateRange: {
      start: string;
      end: string;
      preset?: string;
    };
    accounts?: string[];
    departments?: string[];
    projects?: string[];
    customFilters?: Record<string, string[]>;
  };

  @Column({ name: "layout", type: "jsonb" })
  layout: {
    columns: number;
    pageSize: string;
    orientation: string;
    margins: { top: number; right: number; bottom: number; left: number };
    showHeader: boolean;
    showFooter: boolean;
    showPageNumbers: boolean;
    headerContent?: string;
    footerContent?: string;
  };

  @Column({ name: "schedule", type: "jsonb", nullable: true })
  schedule?: {
    enabled: boolean;
    frequency: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
    timezone: string;
    recipients: string[];
    format: string[];
    lastRun?: string;
    nextRun?: string;
  };

  @Column({ name: "sharing", type: "jsonb", nullable: true })
  sharing?: {
    isPublic: boolean;
    sharedWith: Array<{
      userId: string;
      email: string;
      permission: string;
    }>;
    publicLink?: string;
    expiresAt?: string;
  };

  @Column({ name: "created_by", type: "varchar", length: 100 })
  createdBy: string;

  @Column({ name: "is_template", type: "boolean", default: false })
  isTemplate: boolean;

  @Column({ name: "is_favorite", type: "boolean", default: false })
  isFavorite: boolean;

  @Column({ name: "tags", type: "text", array: true, nullable: true })
  tags?: string[];

  @Column({ name: "version", type: "int", default: 1 })
  version: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
