import { Injectable, Inject, Logger } from "@nestjs/common";
import { PubSub } from "graphql-subscriptions";
import { AccountBalanceUpdate } from "@infrastructure/graphql/types/account-balance.types";

/**
 * Account Balance Publisher Service
 * Publishes account balance changes to GraphQL subscriptions
 */
@Injectable()
export class AccountBalancePublisherService {
  private readonly logger = new Logger(AccountBalancePublisherService.name);

  constructor(@Inject("PUB_SUB") private readonly pubSub: PubSub) {}

  /**
   * Publish account balance update
   */
  async publishBalanceUpdate(update: AccountBalanceUpdate): Promise<void> {
    try {
      // Publish to organization-wide topic
      await this.pubSub.publish(`account-balance-${update.organizationId}`, {
        accountBalanceUpdates: update,
      });

      // Also publish to account-specific topic
      await this.pubSub.publish(
        `account-balance-${update.organizationId}-${update.accountId}`,
        {
          accountBalanceUpdates: update,
        },
      );
    } catch (error) {
      this.logger.error(`Failed to publish balance update: ${error.message}`);
    }
  }
}
