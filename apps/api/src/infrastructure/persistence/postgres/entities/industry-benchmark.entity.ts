/**
 * Industry Benchmark Entity
 *
 * TypeORM entity for storing industry benchmark data from ISED and Statistics Canada.
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from "typeorm";

@Entity({ name: "industry_benchmarks", schema: "reporting" })
@Unique([
  "industryId",
  "dataSource",
  "referenceYear",
  "referenceQuarter",
  "revenueRange",
])
@Index(["industryId"])
@Index(["naicsCode"])
@Index(["dataSource"])
@Index(["referenceYear"])
export class IndustryBenchmarkEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "industry_id", type: "varchar", length: 50 })
  industryId: string;

  @Column({ name: "naics_code", type: "varchar", length: 10 })
  naicsCode: string;

  @Column({ name: "data_source", type: "varchar", length: 20 })
  dataSource: "ised" | "statscan";

  @Column({ name: "reference_year", type: "int", nullable: true })
  referenceYear: number | null;

  @Column({
    name: "reference_quarter",
    type: "varchar",
    length: 10,
    nullable: true,
  })
  referenceQuarter: string | null;

  @Column({
    name: "revenue_range",
    type: "varchar",
    length: 20,
    nullable: true,
  })
  revenueRange: "30k-5m" | "5m-20m" | "all" | null;

  // Profitability metrics
  @Column({
    name: "gross_margin_q1",
    type: "decimal",
    precision: 5,
    scale: 4,
    nullable: true,
  })
  grossMarginQ1: number | null;

  @Column({
    name: "gross_margin_median",
    type: "decimal",
    precision: 5,
    scale: 4,
    nullable: true,
  })
  grossMarginMedian: number | null;

  @Column({
    name: "gross_margin_q3",
    type: "decimal",
    precision: 5,
    scale: 4,
    nullable: true,
  })
  grossMarginQ3: number | null;

  @Column({
    name: "net_margin_q1",
    type: "decimal",
    precision: 5,
    scale: 4,
    nullable: true,
  })
  netMarginQ1: number | null;

  @Column({
    name: "net_margin_median",
    type: "decimal",
    precision: 5,
    scale: 4,
    nullable: true,
  })
  netMarginMedian: number | null;

  @Column({
    name: "net_margin_q3",
    type: "decimal",
    precision: 5,
    scale: 4,
    nullable: true,
  })
  netMarginQ3: number | null;

  // Operating metrics
  @Column({
    name: "operating_expense_ratio",
    type: "decimal",
    precision: 5,
    scale: 4,
    nullable: true,
  })
  operatingExpenseRatio: number | null;

  @Column({
    name: "wages_to_revenue_ratio",
    type: "decimal",
    precision: 5,
    scale: 4,
    nullable: true,
  })
  wagesToRevenueRatio: number | null;

  @Column({
    name: "rent_to_revenue_ratio",
    type: "decimal",
    precision: 5,
    scale: 4,
    nullable: true,
  })
  rentToRevenueRatio: number | null;

  // Balance sheet ratios
  @Column({
    name: "current_ratio_median",
    type: "decimal",
    precision: 6,
    scale: 2,
    nullable: true,
  })
  currentRatioMedian: number | null;

  @Column({
    name: "debt_to_equity_median",
    type: "decimal",
    precision: 6,
    scale: 2,
    nullable: true,
  })
  debtToEquityMedian: number | null;

  // Growth metrics
  @Column({
    name: "revenue_yoy_growth",
    type: "decimal",
    precision: 5,
    scale: 4,
    nullable: true,
  })
  revenueYoyGrowth: number | null;

  @Column({
    name: "revenue_qoq_growth",
    type: "decimal",
    precision: 5,
    scale: 4,
    nullable: true,
  })
  revenueQoqGrowth: number | null;

  // Metadata
  @Column({ name: "sample_size", type: "int", nullable: true })
  sampleSize: number | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}

/**
 * Benchmark Refresh Log Entity
 */
@Entity({ name: "benchmark_refresh_log", schema: "reporting" })
export class BenchmarkRefreshLogEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "data_source", type: "varchar", length: 20 })
  dataSource: string;

  @Column({ name: "refresh_type", type: "varchar", length: 20 })
  refreshType: "full" | "incremental";

  @Column({ name: "status", type: "varchar", length: 20 })
  status: "started" | "completed" | "failed";

  @Column({ name: "records_processed", type: "int", default: 0 })
  recordsProcessed: number;

  @Column({ name: "records_created", type: "int", default: 0 })
  recordsCreated: number;

  @Column({ name: "records_updated", type: "int", default: 0 })
  recordsUpdated: number;

  @Column({ name: "error_message", type: "text", nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: "started_at", type: "timestamptz" })
  startedAt: Date;

  @Column({ name: "completed_at", type: "timestamptz", nullable: true })
  completedAt: Date | null;
}
