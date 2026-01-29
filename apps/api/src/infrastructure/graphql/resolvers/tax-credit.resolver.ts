/**
 * Tax Credit Resolver
 *
 * GraphQL resolver for tax credit eligibility queries and partner referrals.
 */
import { Resolver, Query, Mutation, Args, Context } from "@nestjs/graphql";
import { UseGuards, Logger, Injectable } from "@nestjs/common";
import { Unprotected } from "nest-keycloak-connect";
import { GqlAuthGuard } from "../guards/gql-auth.guard";
import {
  TaxCredit,
  TaxCreditEligibility,
  TaxCreditEligibilitySummary,
  ContactInfoInput,
} from "../types";
import {
  ALL_TAX_CREDITS,
  getTaxCreditsByIndustry,
  getTaxCreditsByJurisdiction,
  getTaxCreditById,
  CanadianProvince,
} from "@domain/datalake/tax-credits";
import { IndustryId } from "@domain/datalake/industry-account-mapping";
import { TaxCreditEligibilityService } from "@application/services/tax-credit-eligibility.service";

/**
 * SECURITY NOTE: @Unprotected() bypasses the global Keycloak guard to allow
 * the custom GqlAuthGuard to handle authentication.
 */
@Resolver()
@Unprotected()
@UseGuards(GqlAuthGuard)
@Injectable()
export class TaxCreditResolver {
  private readonly logger = new Logger(TaxCreditResolver.name);
  private readonly eligibilityService = new TaxCreditEligibilityService();

  /**
   * Get all available tax credits, optionally filtered by industry and province
   */
  @Query(() => [TaxCredit], {
    description:
      "Get available tax credits, optionally filtered by industry and province",
  })
  async availableTaxCredits(
    @Args("industryId", { nullable: true }) industryId?: string,
    @Args("province", { nullable: true }) province?: string,
  ): Promise<TaxCredit[]> {
    let credits = ALL_TAX_CREDITS;

    // Filter by industry if provided
    if (industryId) {
      credits = getTaxCreditsByIndustry(industryId as IndustryId);
    }

    // Filter by province if provided
    if (province) {
      const federalCredits = getTaxCreditsByJurisdiction("federal");
      const provincialCredits = getTaxCreditsByJurisdiction(
        "provincial",
        province as CanadianProvince,
      );
      credits = credits.filter(
        (credit) =>
          federalCredits.includes(credit) || provincialCredits.includes(credit),
      );
    }

    // Convert to GraphQL format
    return credits.map((credit) => ({
      id: credit.id,
      name: credit.name.en,
      shortName: credit.shortName.en,
      jurisdiction: credit.jurisdiction,
      province: credit.province,
      creditType: credit.creditType,
      applicableIndustries:
        credit.industries === "all" ? ["all"] : (credit.industries as string[]),
      maxBenefitDescription: credit.maxBenefit.description.en,
      documentationUrl: credit.documentationUrl,
      partnerReferralEnabled: credit.partnerReferralEnabled,
      lastUpdated: credit.lastUpdated,
      description: credit.description.en,
    }));
  }

  /**
   * Get tax credit eligibility for an organization
   */
  @Query(() => [TaxCreditEligibility], {
    description:
      "Get tax credit eligibility for the authenticated organization",
  })
  async organizationTaxCreditEligibility(
    @Context() context: any,
    @Args("fiscalYear", { nullable: true }) _fiscalYear?: number,
  ): Promise<TaxCreditEligibility[]> {
    const organizationId = context.req.user?.organizationId;
    if (!organizationId) {
      throw new Error("Organization ID not found in context");
    }

    // TODO: Fetch actual gold metrics from database
    // For now, return empty array - this will be implemented when ETL is integrated
    this.logger.warn(
      `Tax credit eligibility query for org ${organizationId} - not yet fully implemented`,
    );

    return [];
  }

  /**
   * Request consultation with a tax credit specialist partner
   */
  @Mutation(() => Boolean, {
    description: "Request consultation with a tax credit specialist partner",
  })
  async requestTaxCreditConsultation(
    @Context() context: any,
    @Args("taxCreditId") taxCreditId: string,
    @Args("contactInfo") contactInfo: ContactInfoInput,
  ): Promise<boolean> {
    const organizationId = context.req.user?.organizationId;
    if (!organizationId) {
      throw new Error("Organization ID not found in context");
    }

    const taxCredit = getTaxCreditById(taxCreditId);
    if (!taxCredit) {
      throw new Error(`Tax credit ${taxCreditId} not found`);
    }

    if (!taxCredit.partnerReferralEnabled) {
      throw new Error(`Partner referral not enabled for ${taxCreditId}`);
    }

    // TODO: Create lead in database and send notification to partner
    this.logger.log(
      `Tax credit consultation requested: org=${organizationId}, credit=${taxCreditId}, contact=${contactInfo.email}`,
    );

    // For now, just log and return success
    return true;
  }

  /**
   * Get tax credit eligibility summary for an organization
   */
  @Query(() => TaxCreditEligibilitySummary, {
    description: "Get summary of tax credit eligibility",
  })
  async taxCreditEligibilitySummary(
    @Context() context: any,
    @Args("fiscalYear", { nullable: true }) _fiscalYear?: number,
  ): Promise<TaxCreditEligibilitySummary> {
    const organizationId = context.req.user?.organizationId;
    if (!organizationId) {
      throw new Error("Organization ID not found in context");
    }

    // TODO: Fetch actual eligibility data from database
    // For now, return empty summary
    return {
      likelyEligibleCount: 0,
      possiblyEligibleCount: 0,
      needsReviewCount: 0,
      totalEstimatedBenefitMin: 0,
      totalEstimatedBenefitMax: 0,
      credits: [],
    };
  }
}
