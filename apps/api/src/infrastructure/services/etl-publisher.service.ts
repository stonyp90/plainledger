import { Injectable, Inject, Logger } from "@nestjs/common";
import { PubSub } from "graphql-subscriptions";
import {
  ETLJobProgress,
  ETLJobStatus,
} from "@infrastructure/graphql/types/etl.types";

/**
 * ETL Publisher Service
 * Publishes ETL job progress events to GraphQL subscriptions
 */
@Injectable()
export class ETLPublisherService {
  private readonly logger = new Logger(ETLPublisherService.name);

  constructor(@Inject("PUB_SUB") private readonly pubSub: PubSub) {}

  /**
   * Publish ETL job progress update
   */
  async publishJobProgress(progress: ETLJobProgress): Promise<void> {
    try {
      await this.pubSub.publish(`etl-job-progress-${progress.organizationId}`, {
        etlJobProgress: progress,
      });

      // Also publish to completed topic if job finished
      if (
        progress.status === ETLJobStatus.SUCCEEDED ||
        progress.status === ETLJobStatus.FAILED
      ) {
        await this.pubSub.publish(
          `etl-job-completed-${progress.organizationId}`,
          {
            etlJobCompleted: progress,
          },
        );
      }
    } catch (error) {
      this.logger.error(`Failed to publish ETL progress: ${error.message}`);
    }
  }
}
