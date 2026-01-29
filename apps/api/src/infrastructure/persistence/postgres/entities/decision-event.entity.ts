import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity({ name: "decision_events", schema: "intelligence" })
@Index(["organizationId"])
@Index(["industry"])
@Index(["createdAt"])
@Index(["industry", "triggerMetric"])
export class DecisionEventEntity {
  @PrimaryColumn({ type: "varchar", length: 255 })
  id: string;

  @Column({ name: "organization_id", type: "uuid" })
  organizationId: string;

  @Column({ type: "varchar", length: 50 })
  industry: string;

  @Column({ name: "business_size", type: "varchar", length: 20 })
  businessSize: string;

  // Trigger fields
  @Column({ name: "trigger_metric", type: "varchar", length: 50 })
  triggerMetric: string;

  @Column({
    name: "trigger_current_value",
    type: "decimal",
    precision: 15,
    scale: 2,
  })
  triggerCurrentValue: number;

  @Column({
    name: "trigger_benchmark_value",
    type: "decimal",
    precision: 15,
    scale: 2,
  })
  triggerBenchmarkValue: number;

  @Column({
    name: "trigger_gap_percentage",
    type: "decimal",
    precision: 5,
    scale: 2,
  })
  triggerGapPercentage: number;

  @Column({ name: "trigger_chart_context", type: "text", nullable: true })
  triggerChartContext?: string;

  // Decision fields
  @Column({ name: "decision_action_type", type: "varchar", length: 50 })
  decisionActionType: string;

  @Column({ name: "decision_description", type: "text" })
  decisionDescription: string;

  @Column({ name: "decision_reasoning", type: "text", nullable: true })
  decisionReasoning?: string;

  @Column({
    name: "decision_expected_impact",
    type: "decimal",
    precision: 15,
    scale: 2,
  })
  decisionExpectedImpact: number;

  @Column({
    name: "decision_expected_impact_currency",
    type: "varchar",
    length: 3,
    default: "CAD",
  })
  decisionExpectedImpactCurrency: string;

  @Column({ name: "decision_confidence", type: "varchar", length: 20 })
  decisionConfidence: string;

  // Outcome fields (nullable)
  @Column({
    name: "outcome_actual_impact",
    type: "decimal",
    precision: 15,
    scale: 2,
    nullable: true,
  })
  outcomeActualImpact?: number;

  @Column({
    name: "outcome_actual_impact_currency",
    type: "varchar",
    length: 3,
    nullable: true,
  })
  outcomeActualImpactCurrency?: string;

  @Column({ name: "outcome_measured_at", type: "timestamptz", nullable: true })
  outcomeMeasuredAt?: Date;

  @Column({ name: "outcome_success", type: "boolean", nullable: true })
  outcomeSuccess?: boolean;

  @Column({
    name: "outcome_variance",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
  })
  outcomeVariance?: number;

  @Column({ name: "outcome_learnings", type: "text", nullable: true })
  outcomeLearnings?: string;

  // Metadata
  @Column({ type: "varchar", length: 20, default: "user" })
  source: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
