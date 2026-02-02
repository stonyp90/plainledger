import { Resolver, Subscription, Args, ID } from "@nestjs/graphql";
import { Inject } from "@nestjs/common";
import { PubSub } from "graphql-subscriptions";
import { TransactionUpdate } from "@infrastructure/graphql/types/transaction.types";

/**
 * Transaction Subscription Resolver
 * Provides real-time updates for new transactions
 */

@Resolver(() => TransactionUpdate)
export class TransactionSubscriptionResolver {
  constructor(@Inject("PUB_SUB") private readonly pubSub: PubSub) {}

  @Subscription(() => TransactionUpdate, {
    filter: (
      payload: { transactionUpdates: TransactionUpdate },
      variables: { organizationId: string },
    ) => {
      return (
        payload.transactionUpdates.organizationId === variables.organizationId
      );
    },
    resolve: (payload: { transactionUpdates: TransactionUpdate }) =>
      payload.transactionUpdates,
  })
  transactionUpdates(
    @Args("organizationId", { type: () => ID }) organizationId: string,
  ) {
    return (this.pubSub as any).asyncIterator(
      `transaction-updates-${organizationId}`,
    );
  }
}
