import { Resolver, Subscription, Args, ID } from "@nestjs/graphql";
import { Inject } from "@nestjs/common";
import { PubSub } from "graphql-subscriptions";
import {
  ETLJobProgress,
  ETLJobStatus,
} from "@infrastructure/graphql/types/etl.types";

/**
 * ETL Subscription Resolver
 * Provides real-time updates for ETL pipeline progress
 */

@Resolver(() => ETLJobProgress)
export class ETLSubscriptionResolver {
  constructor(@Inject("PUB_SUB") private readonly pubSub: PubSub) {}

  @Subscription(() => ETLJobProgress, {
    filter: (
      payload: { etlJobProgress: ETLJobProgress },
      variables: { organizationId: string },
    ) => {
      return payload.etlJobProgress.organizationId === variables.organizationId;
    },
    resolve: (payload: { etlJobProgress: ETLJobProgress }) =>
      payload.etlJobProgress,
  })
  etlJobProgress(
    @Args("organizationId", { type: () => ID }) organizationId: string,
  ) {
    return (this.pubSub as any).asyncIterator(
      `etl-job-progress-${organizationId}`,
    );
  }

  @Subscription(() => ETLJobProgress, {
    filter: (
      payload: { etlJobCompleted: ETLJobProgress },
      variables: { organizationId: string },
    ) => {
      return (
        payload.etlJobCompleted.organizationId === variables.organizationId &&
        (payload.etlJobCompleted.status === ETLJobStatus.SUCCEEDED ||
          payload.etlJobCompleted.status === ETLJobStatus.FAILED)
      );
    },
    resolve: (payload: { etlJobCompleted: ETLJobProgress }) =>
      payload.etlJobCompleted,
  })
  etlJobCompleted(
    @Args("organizationId", { type: () => ID }) organizationId: string,
  ) {
    return (this.pubSub as any).asyncIterator(
      `etl-job-completed-${organizationId}`,
    );
  }
}
