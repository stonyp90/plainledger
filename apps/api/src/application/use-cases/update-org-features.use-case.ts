import {
  Injectable,
  Inject,
  UnauthorizedException,
  NotFoundException,
} from "@nestjs/common";
import {
  OrganizationFeatures,
  CreateOrganizationFeaturesInput,
} from "@domain/entities/OrganizationFeatures";
import { IOrganizationFeaturesRepository } from "@application/ports/outbound/IOrganizationFeaturesRepository";

export interface UpdateOrgFeaturesRequest {
  organizationId: string;
  analytics?: {
    plainledger?: {
      enabled?: boolean;
      visibleToRoles?: string[];
    };
    powerbi?: {
      enabled?: boolean;
      visibleToRoles?: string[];
    };
  };
  updatedBy: string;
}

export interface UpdateOrgFeaturesResponse {
  id: string;
  organizationId: string;
  analytics: {
    plainledger: {
      enabled: boolean;
      visibleToRoles: string[];
    };
    powerbi: {
      enabled: boolean;
      visibleToRoles: string[];
    };
  };
  updatedBy: string;
  updatedAt: string;
}

/**
 * Use Case: Update Organization Features
 *
 * Allows PlainLedger CPA Admin to configure which analytics sections
 * are visible to which user roles per organization.
 */
@Injectable()
export class UpdateOrgFeaturesUseCase {
  constructor(
    @Inject("IOrganizationFeaturesRepository")
    private readonly featuresRepository: IOrganizationFeaturesRepository,
  ) {}

  async execute(
    request: UpdateOrgFeaturesRequest,
  ): Promise<UpdateOrgFeaturesResponse> {
    // Find existing features or create new
    let features = await this.featuresRepository.findByOrganizationId(
      request.organizationId,
    );

    if (!features) {
      // Create new features with defaults
      features = OrganizationFeatures.create({
        organizationId: request.organizationId,
        analytics: request.analytics,
        updatedBy: request.updatedBy,
      });
    } else {
      // Update existing features
      if (request.analytics?.plainledger) {
        features.updateAnalyticsVisibility(
          "plainledger",
          request.analytics.plainledger,
          request.updatedBy,
        );
      }

      if (request.analytics?.powerbi) {
        features.updateAnalyticsVisibility(
          "powerbi",
          request.analytics.powerbi,
          request.updatedBy,
        );
      }
    }

    // Save changes
    const saved = await this.featuresRepository.save(features);

    return {
      id: saved.id,
      organizationId: saved.organizationId,
      analytics: saved.analytics,
      updatedBy: saved.updatedBy,
      updatedAt: saved.updatedAt.toISOString(),
    };
  }
}
