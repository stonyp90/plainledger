import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity({ name: "industry_patterns", schema: "intelligence" })
@Index(["industry", "triggerMetric"])
@Index(["lastUpdated"])
export class IndustryPatternEntity {
  @PrimaryColumn({ type: "varchar", length: 255 })
  id: string;

  @Column({ type: "varchar", length: 50 })
  @Index()
  industry: string;

  @Column({ name: "trigger_metric", type: "varchar", length: 50 })
  triggerMetric: string;

  @Column({ name: "trigger_operator", type: "varchar", length: 20 })
  triggerOperator: string; // 'above' | 'below' | 'between'

  @Column({ name: "trigger_value", type: "jsonb", nullable: true })
  triggerValue: number | [number, number] | null;

  @Column({
    name: "business_size",
    type: "varchar",
    length: 20,
    nullable: true,
  })
  businessSize?: string;

  // Aggregated data
  @Column({ name: "sample_size", type: "int" })
  sampleSize: number;

  @Column({ name: "common_actions", type: "jsonb" })
  commonActions: Array<{
    action: string;
    frequency: number;
    percentage: number;
    avgExpectedImpact: { amount: number; currency: string };
    avgActualImpact?: { amount: number; currency: string };
  }>;

  @Column({ name: "success_rates", type: "jsonb" })
  successRates: {
    overallSuccessRate: number;
    byAction: Record<string, number>;
    avgVariance: number;
  };

  @Column({ name: "top_performers", type: "jsonb" })
  topPerformers: {
    topActions: string[];
    avgImpact: { amount: number; currency: string };
    successRate: number;
    sampleSize: number;
  };

  @Column({
    name: "statistical_significance",
    type: "decimal",
    precision: 3,
    scale: 2,
  })
  statisticalSignificance: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "last_updated", type: "timestamptz" })
  lastUpdated: Date;
}
