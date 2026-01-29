/**
 * HubSpot CRM Integration Service
 * Syncs users, tracks lifecycle stages, and manages deals
 *
 * HubSpot Free Tier:
 * - Unlimited contacts
 * - Contact management
 * - Deal pipeline (1 pipeline)
 * - Email tracking
 * - Forms & live chat
 *
 * Lifecycle Stages (mapped to journey):
 * - subscriber -> signup
 * - lead -> onboarding
 * - marketingqualifiedlead -> activated
 * - salesqualifiedlead -> engaged/trial
 * - opportunity -> trial (considering upgrade)
 * - customer -> converted
 * - other -> churned
 */

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client } from "@hubspot/api-client";
import { FilterOperatorEnum } from "@hubspot/api-client/lib/codegen/crm/contacts";
import { AssociationSpecAssociationCategoryEnum } from "@hubspot/api-client/lib/codegen/crm/associations/v4";
import type { JourneyStage } from "@infrastructure/persistence/postgres/entities/user-profile.entity";

// ============================================================================
// Types
// ============================================================================

export interface HubSpotContact {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  website?: string;
  industry?: string;
  lifecycleStage?: string;
  // Custom properties
  plainledgerId?: string;
  organizationId?: string;
  subscriptionTier?: string;
  signupDate?: string;
  lastActivityDate?: string;
  connectedSources?: number;
  totalReports?: number;
}

export interface HubSpotDeal {
  dealName: string;
  amount?: number;
  dealStage: string;
  pipeline?: string;
  closeDate?: string;
  associatedContactId?: string;
  // Custom properties
  subscriptionTier?: string;
  billingCycle?: "monthly" | "yearly";
}

// ============================================================================
// HubSpot Service
// ============================================================================

@Injectable()
export class HubSpotService implements OnModuleInit {
  private readonly logger = new Logger(HubSpotService.name);
  private client: Client | null = null;
  private enabled = false;

  // Map journey stages to HubSpot lifecycle stages
  private readonly lifecycleMap: Record<JourneyStage, string> = {
    signup: "subscriber",
    onboarding: "lead",
    activated: "marketingqualifiedlead",
    engaged: "salesqualifiedlead",
    trial: "opportunity",
    converted: "customer",
    churned: "other",
  };

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const accessToken = this.configService.get<string>("HUBSPOT_ACCESS_TOKEN");

    if (!accessToken) {
      this.logger.warn("HubSpot not configured - CRM sync disabled");
      return;
    }

    try {
      this.client = new Client({ accessToken });
      this.enabled = true;
      this.logger.log("HubSpot CRM integration initialized");
    } catch (error) {
      this.logger.error(`Failed to initialize HubSpot: ${error.message}`);
    }
  }

  // --------------------------------------------------------------------------
  // Status
  // --------------------------------------------------------------------------

  isEnabled(): boolean {
    return this.enabled;
  }

  // --------------------------------------------------------------------------
  // Contact Management
  // --------------------------------------------------------------------------

  /**
   * Create or update a contact in HubSpot
   */
  async upsertContact(contact: HubSpotContact): Promise<string | null> {
    if (!this.client) return null;

    const properties: Record<string, string> = {
      email: contact.email,
    };

    // Map standard properties
    if (contact.firstName) properties.firstname = contact.firstName;
    if (contact.lastName) properties.lastname = contact.lastName;
    if (contact.company) properties.company = contact.company;
    if (contact.phone) properties.phone = contact.phone;
    if (contact.website) properties.website = contact.website;
    if (contact.industry) properties.industry = contact.industry;
    if (contact.lifecycleStage)
      properties.lifecyclestage = contact.lifecycleStage;

    // Map custom properties (must be created in HubSpot first)
    if (contact.plainledgerId)
      properties.plainledger_id = contact.plainledgerId;
    if (contact.organizationId)
      properties.plainledger_org_id = contact.organizationId;
    if (contact.subscriptionTier)
      properties.plainledger_tier = contact.subscriptionTier;
    if (contact.signupDate)
      properties.plainledger_signup_date = contact.signupDate;
    if (contact.lastActivityDate)
      properties.plainledger_last_activity = contact.lastActivityDate;
    if (contact.connectedSources !== undefined) {
      properties.plainledger_connected_sources = String(
        contact.connectedSources,
      );
    }
    if (contact.totalReports !== undefined) {
      properties.plainledger_total_reports = String(contact.totalReports);
    }

    try {
      // Try to find existing contact
      const searchResponse = await this.client.crm.contacts.searchApi.doSearch({
        filterGroups: [
          {
            filters: [
              {
                propertyName: "email",
                operator: FilterOperatorEnum.Eq,
                value: contact.email,
              },
            ],
          },
        ],
        properties: ["email"],
        limit: 1,
      });

      if (searchResponse.results.length > 0) {
        // Update existing contact
        const contactId = searchResponse.results[0].id;
        await this.client.crm.contacts.basicApi.update(contactId, {
          properties,
        });
        this.logger.debug(`Updated HubSpot contact: ${contact.email}`);
        return contactId;
      } else {
        // Create new contact
        const createResponse = await this.client.crm.contacts.basicApi.create({
          properties,
        });
        this.logger.debug(`Created HubSpot contact: ${contact.email}`);
        return createResponse.id;
      }
    } catch (error) {
      this.logger.error(
        `Failed to upsert contact ${contact.email}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Update contact lifecycle stage
   */
  async updateLifecycleStage(
    email: string,
    journeyStage: JourneyStage,
  ): Promise<void> {
    if (!this.client) return;

    const lifecycleStage = this.lifecycleMap[journeyStage];

    try {
      const searchResponse = await this.client.crm.contacts.searchApi.doSearch({
        filterGroups: [
          {
            filters: [
              {
                propertyName: "email",
                operator: FilterOperatorEnum.Eq,
                value: email,
              },
            ],
          },
        ],
        properties: ["email"],
        limit: 1,
      });

      if (searchResponse.results.length > 0) {
        await this.client.crm.contacts.basicApi.update(
          searchResponse.results[0].id,
          {
            properties: {
              lifecyclestage: lifecycleStage,
            },
          },
        );
        this.logger.debug(
          `Updated lifecycle stage for ${email} to ${lifecycleStage}`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to update lifecycle stage: ${error.message}`);
    }
  }

  /**
   * Get contact by email
   */
  async getContact(email: string): Promise<HubSpotContact | null> {
    if (!this.client) return null;

    try {
      const searchResponse = await this.client.crm.contacts.searchApi.doSearch({
        filterGroups: [
          {
            filters: [
              {
                propertyName: "email",
                operator: FilterOperatorEnum.Eq,
                value: email,
              },
            ],
          },
        ],
        properties: [
          "email",
          "firstname",
          "lastname",
          "company",
          "phone",
          "website",
          "industry",
          "lifecyclestage",
        ],
        limit: 1,
      });

      if (searchResponse.results.length === 0) return null;

      const props = searchResponse.results[0].properties;
      return {
        email: props.email || email,
        firstName: props.firstname ?? undefined,
        lastName: props.lastname ?? undefined,
        company: props.company ?? undefined,
        phone: props.phone ?? undefined,
        website: props.website ?? undefined,
        industry: props.industry ?? undefined,
        lifecycleStage: props.lifecyclestage ?? undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to get contact ${email}: ${error.message}`);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Deal Management
  // --------------------------------------------------------------------------

  /**
   * Create a deal (for trial/subscription)
   */
  async createDeal(
    deal: HubSpotDeal,
    contactEmail?: string,
  ): Promise<string | null> {
    if (!this.client) return null;

    const properties: Record<string, string> = {
      dealname: deal.dealName,
      dealstage: deal.dealStage,
    };

    if (deal.amount) properties.amount = String(deal.amount);
    if (deal.pipeline) properties.pipeline = deal.pipeline;
    if (deal.closeDate) properties.closedate = deal.closeDate;
    if (deal.subscriptionTier)
      properties.plainledger_tier = deal.subscriptionTier;
    if (deal.billingCycle)
      properties.plainledger_billing_cycle = deal.billingCycle;

    try {
      const dealResponse = await this.client.crm.deals.basicApi.create({
        properties,
      });

      // Associate with contact if provided
      // In HubSpot API v3/v13+, associations are created via the associations API
      if (contactEmail) {
        const contactId = await this.getContactId(contactEmail);
        if (contactId) {
          try {
            await this.client.crm.associations.v4.basicApi.create(
              "deals",
              dealResponse.id,
              "contacts",
              contactId,
              [{ associationCategory: AssociationSpecAssociationCategoryEnum.HubspotDefined, associationTypeId: 3 }],
            );
          } catch (assocError) {
            // Log but don't fail if association fails
            this.logger.warn(
              `Failed to associate deal ${dealResponse.id} with contact ${contactId}: ${assocError.message}`,
            );
          }
        }
      }

      this.logger.debug(`Created HubSpot deal: ${deal.dealName}`);
      return dealResponse.id;
    } catch (error) {
      this.logger.error(`Failed to create deal: ${error.message}`);
      return null;
    }
  }

  /**
   * Update deal stage
   */
  async updateDealStage(dealId: string, stage: string): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.crm.deals.basicApi.update(dealId, {
        properties: { dealstage: stage },
      });
      this.logger.debug(`Updated deal ${dealId} to stage ${stage}`);
    } catch (error) {
      this.logger.error(`Failed to update deal stage: ${error.message}`);
    }
  }

  // --------------------------------------------------------------------------
  // Journey Integration Helpers
  // --------------------------------------------------------------------------

  /**
   * Sync user signup to HubSpot
   */
  async syncSignup(user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    organizationId?: string;
    organizationName?: string;
  }): Promise<void> {
    await this.upsertContact({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      company: user.organizationName,
      lifecycleStage: "subscriber",
      plainledgerId: user.id,
      organizationId: user.organizationId,
      subscriptionTier: "free",
      signupDate: new Date().toISOString(),
    });
  }

  /**
   * Sync activation (first connection)
   */
  async syncActivation(email: string, connectedSources: number): Promise<void> {
    if (!this.client) return;

    const contactId = await this.getContactId(email);
    if (contactId) {
      await this.client.crm.contacts.basicApi.update(contactId, {
        properties: {
          lifecyclestage: "marketingqualifiedlead",
          plainledger_connected_sources: String(connectedSources),
          plainledger_last_activity: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Sync trial start
   */
  async syncTrialStart(user: {
    email: string;
    firstName?: string;
    lastName?: string;
    tier: string;
    trialEndDate: Date;
  }): Promise<void> {
    // Update contact to opportunity stage
    await this.updateLifecycleStage(user.email, "trial");

    // Create a deal for the trial
    await this.createDeal(
      {
        dealName:
          `${user.firstName || "User"} ${user.lastName || ""} - ${user.tier} Trial`.trim(),
        dealStage: "qualifiedtobuy",
        closeDate: user.trialEndDate.toISOString().split("T")[0],
        subscriptionTier: user.tier,
      },
      user.email,
    );
  }

  /**
   * Sync conversion (paid subscription)
   */
  async syncConversion(user: {
    email: string;
    tier: string;
    amount: number;
    billingCycle: "monthly" | "yearly";
  }): Promise<void> {
    await this.updateLifecycleStage(user.email, "converted");

    // Update contact with subscription info
    const contactId = await this.getContactId(user.email);
    if (contactId) {
      await this.client?.crm.contacts.basicApi.update(contactId, {
        properties: {
          plainledger_tier: user.tier,
        },
      });
    }
  }

  /**
   * Sync churn
   */
  async syncChurn(email: string, reason?: string): Promise<void> {
    await this.updateLifecycleStage(email, "churned");
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private async getContactId(email: string): Promise<string | null> {
    if (!this.client) return null;

    try {
      const searchResponse = await this.client.crm.contacts.searchApi.doSearch({
        filterGroups: [
          {
            filters: [
              {
                propertyName: "email",
                operator: FilterOperatorEnum.Eq,
                value: email,
              },
            ],
          },
        ],
        properties: ["email"],
        limit: 1,
      });

      return searchResponse.results[0]?.id || null;
    } catch {
      return null;
    }
  }
}
