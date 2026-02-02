import { ObjectType, Field, ID } from "@nestjs/graphql";

@ObjectType()
export class TransactionUpdate {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  organizationId: string;

  @Field(() => ID)
  accountId: string;

  @Field()
  accountName: string;

  @Field()
  description: string;

  @Field()
  amount: number;

  @Field()
  date: string;

  @Field()
  transactionType: string;

  @Field()
  createdAt: string;
}
