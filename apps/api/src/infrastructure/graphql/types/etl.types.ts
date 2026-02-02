import { ObjectType, Field, ID, registerEnumType } from "@nestjs/graphql";

export enum ETLJobStatus {
  RUNNING = "RUNNING",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
  TIMEOUT = "TIMEOUT",
}

registerEnumType(ETLJobStatus, {
  name: "ETLJobStatus",
  description: "Status of an ETL job",
});

@ObjectType()
export class ETLJobProgress {
  @Field(() => ID)
  jobId: string;

  @Field(() => ID)
  organizationId: string;

  @Field()
  jobName: string;

  @Field(() => ETLJobStatus)
  status: ETLJobStatus;

  @Field()
  progress: number; // 0-100

  @Field()
  recordsProcessed: number;

  @Field()
  recordsWritten: number;

  @Field()
  recordsQuarantined: number;

  @Field({ nullable: true })
  error?: string;

  @Field()
  startedAt: string;

  @Field({ nullable: true })
  completedAt?: string;
}
