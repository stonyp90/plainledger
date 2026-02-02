import { ObjectType, Field, ID } from "@nestjs/graphql";

@ObjectType()
export class AccountBalanceUpdate {
  @Field(() => ID)
  accountId: string;

  @Field(() => ID)
  organizationId: string;

  @Field()
  accountName: string;

  @Field()
  accountCode: string;

  @Field()
  previousBalance: number;

  @Field()
  newBalance: number;

  @Field()
  change: number;

  @Field()
  updatedAt: string;
}
