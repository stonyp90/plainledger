import { Resolver, Subscription, Args, ID } from "@nestjs/graphql";
import { Inject } from "@nestjs/common";
import { PubSub } from "graphql-subscriptions";
import { AccountBalanceUpdate } from "@infrastructure/graphql/types/account-balance.types";

/**
 * Account Balance Subscription Resolver
 * Provides real-time updates for account balance changes
 */

@Resolver(() => AccountBalanceUpdate)
export class AccountBalanceSubscriptionResolver {
  constructor(@Inject("PUB_SUB") private readonly pubSub: PubSub) {}

  @Subscription(() => AccountBalanceUpdate, {
    filter: (
      payload: { accountBalanceUpdates: AccountBalanceUpdate },
      variables: { organizationId: string; accountId?: string },
    ) => {
      const update = payload.accountBalanceUpdates;
      if (update.organizationId !== variables.organizationId) {
        return false;
      }
      if (variables.accountId && update.accountId !== variables.accountId) {
        return false;
      }
      return true;
    },
    resolve: (payload: { accountBalanceUpdates: AccountBalanceUpdate }) =>
      payload.accountBalanceUpdates,
  })
  accountBalanceUpdates(
    @Args("organizationId", { type: () => ID }) organizationId: string,
    @Args("accountId", { type: () => ID, nullable: true }) accountId?: string,
  ) {
    const topic = accountId
      ? `account-balance-${organizationId}-${accountId}`
      : `account-balance-${organizationId}`;
    return (this.pubSub as any).asyncIterator(topic);
  }
}
