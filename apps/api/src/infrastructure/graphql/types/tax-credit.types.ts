/**
 * Tax Credit GraphQL Types
 *
 * Types for tax credit eligibility queries and partner referrals.
 */
import { Field, ObjectType, ID, Float, Int, InputType } from "@nestjs/graphql";
import { GraphQLISODateTime } from "@nestjs/graphql";

@ObjectType({ description: "Tax credit definition" })
export class TaxCredit {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  shortName: string;

  @Field()
  jurisdiction: string; // 'federal' | 'provincial'

  @Field({ nullable: true })
  province?: string;

  @Field()
  creditType: string; // 'refundable' | 'non-refundable' | 'both'

  @Field(() => [String])
  applicableIndustries: string[];

  @Field()
  maxBenefitDescription: string;

  @Field()
  documentationUrl: string;

  @Field()
  partnerReferralEnabled: boolean;

  @Field()
  lastUpdated: string;

  @Field()
  description: string;
}

@ObjectType({ description: "Eligibility criterion result" })
export class EligibilityCriterionResult {
  @Field()
  criterionId: string;

  @Field()
  met: boolean;

  @Field(() => Float, { nullable: true })
  actualValue?: number;

  @Field({ nullable: true })
  expectedValueDescription: string;

  @Field()
  description: string;

  @Field(() => Int)
  weight: number;
}

@ObjectType({ description: "Tax credit eligibility assessment" })
export class TaxCreditEligibility {
  @Field(() => TaxCredit)
  taxCredit: TaxCredit;

  @Field()
  eligibilityStatus: string; // 'likely' | 'possible' | 'unlikely' | 'needs_review'

  @Field(() => Int)
  eligibilityScore: number; // 0-100

  @Field(() => [String])
  criteriaMet: string[];

  @Field(() => [String])
  criteriaNotMet: string[];

  @Field(() => [EligibilityCriterionResult])
  criteriaResults: EligibilityCriterionResult[];

  @Field(() => Float)
  estimatedBenefitMin: number;

  @Field(() => Float)
  estimatedBenefitMax: number;

  @Field(() => GraphQLISODateTime)
  calculationTimestamp: Date;
}

@InputType({ description: "Contact information for partner referral" })
export class ContactInfoInput {
  @Field()
  name: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  companyName?: string;

  @Field({ nullable: true })
  notes?: string;
}

@ObjectType({ description: "Tax credit eligibility summary" })
export class TaxCreditEligibilitySummary {
  @Field(() => Int)
  likelyEligibleCount: number;

  @Field(() => Int)
  possiblyEligibleCount: number;

  @Field(() => Int)
  needsReviewCount: number;

  @Field(() => Float)
  totalEstimatedBenefitMin: number;

  @Field(() => Float)
  totalEstimatedBenefitMax: number;

  @Field(() => [TaxCreditEligibility])
  credits: TaxCreditEligibility[];
}
