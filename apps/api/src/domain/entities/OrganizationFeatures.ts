import { DomainError } from "@domain/errors/DomainError";

export interface AnalyticsSectionConfig {
  enabled: boolean;
  visibleToRoles: string[]; // Role names that can see this section
}

export interface OrganizationFeaturesProps {
  id?: string;
  organizationId: string;
  analytics: {
    plainledger: AnalyticsSectionConfig;
    powerbi: AnalyticsSectionConfig;
  };
  updatedBy: string;
  updatedAt?: Date;
  createdAt?: Date;
}

export interface CreateOrganizationFeaturesInput {
  organizationId: string;
  analytics?: {
    plainledger?: Partial<AnalyticsSectionConfig>;
    powerbi?: Partial<AnalyticsSectionConfig>;
  };
  updatedBy: string;
}

export class OrganizationFeatures {
  private readonly _id: string;
  private readonly _organizationId: string;
  private _analytics: {
    plainledger: AnalyticsSectionConfig;
    powerbi: AnalyticsSectionConfig;
  };
  private _updatedBy: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: OrganizationFeaturesProps) {
    this._id = props.id || crypto.randomUUID();
    this._organizationId = props.organizationId;
    this._analytics = props.analytics;
    this._updatedBy = props.updatedBy;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  static create(input: CreateOrganizationFeaturesInput): OrganizationFeatures {
    // Validate organization ID
    if (!input.organizationId || input.organizationId.trim().length === 0) {
      throw new DomainError("Organization ID is required");
    }

    // Validate updatedBy
    if (!input.updatedBy || input.updatedBy.trim().length === 0) {
      throw new DomainError("UpdatedBy is required");
    }

    // Default analytics config
    const defaultPlainLedger: AnalyticsSectionConfig = {
      enabled: true,
      visibleToRoles: [
        "plainledger_user",
        "organization_admin",
        "business_unit_admin",
      ],
    };

    const defaultPowerBI: AnalyticsSectionConfig = {
      enabled: false,
      visibleToRoles: ["organization_admin", "business_unit_admin"],
    };

    return new OrganizationFeatures({
      organizationId: input.organizationId,
      analytics: {
        plainledger: {
          ...defaultPlainLedger,
          ...input.analytics?.plainledger,
        },
        powerbi: {
          ...defaultPowerBI,
          ...input.analytics?.powerbi,
        },
      },
      updatedBy: input.updatedBy,
    });
  }

  static fromPersistence(
    props: OrganizationFeaturesProps,
  ): OrganizationFeatures {
    return new OrganizationFeatures(props);
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get organizationId(): string {
    return this._organizationId;
  }

  get analytics(): {
    plainledger: AnalyticsSectionConfig;
    powerbi: AnalyticsSectionConfig;
  } {
    return { ...this._analytics };
  }

  get updatedBy(): string {
    return this._updatedBy;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // Business Methods
  updateAnalyticsVisibility(
    analyticsType: "plainledger" | "powerbi",
    config: Partial<AnalyticsSectionConfig>,
    updatedBy: string,
  ): void {
    if (!updatedBy || updatedBy.trim().length === 0) {
      throw new DomainError("UpdatedBy is required");
    }

    this._analytics[analyticsType] = {
      ...this._analytics[analyticsType],
      ...config,
    };
    this._updatedBy = updatedBy;
    this._updatedAt = new Date();
  }

  isAnalyticsEnabled(analyticsType: "plainledger" | "powerbi"): boolean {
    return this._analytics[analyticsType].enabled;
  }

  canUserAccessAnalytics(
    analyticsType: "plainledger" | "powerbi",
    userRoles: string[],
  ): boolean {
    if (!this.isAnalyticsEnabled(analyticsType)) {
      return false;
    }

    const visibleRoles = this._analytics[analyticsType].visibleToRoles;
    return userRoles.some((role) => visibleRoles.includes(role));
  }

  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      organization_id: this._organizationId,
      analytics: JSON.stringify(this._analytics),
      updated_by: this._updatedBy,
      created_at: this._createdAt,
      updated_at: this._updatedAt,
    };
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this._id,
      organizationId: this._organizationId,
      analytics: this._analytics,
      updatedBy: this._updatedBy,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
