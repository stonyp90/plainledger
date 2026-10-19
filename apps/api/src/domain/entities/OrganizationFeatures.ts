import { DomainError } from "@domain/errors/DomainError";

export interface AnalyticsSectionConfig {
  enabled: boolean;
  visibleToRoles: string[]; // Role names that can see this section
}

export interface OrganizationFeatureOverrides {
  aiInsightsEnabled?: boolean;
  multiCurrencyEnabled?: boolean;
  customReportsEnabled?: boolean;
  apiAccessEnabled?: boolean;
  maxDataSources?: number;
  maxUsers?: number;
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
  overrides?: OrganizationFeatureOverrides;
}

export interface CreateOrganizationFeaturesInput {
  organizationId: string;
  analytics?: {
    plainledger?: Partial<AnalyticsSectionConfig>;
    powerbi?: Partial<AnalyticsSectionConfig>;
  };
  updatedBy: string;
  overrides?: OrganizationFeatureOverrides;
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
  private _overrides: OrganizationFeatureOverrides;

  private constructor(props: OrganizationFeaturesProps) {
    this._id = props.id || crypto.randomUUID();
    this._organizationId = props.organizationId;
    this._analytics = props.analytics;
    this._updatedBy = props.updatedBy;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
    this._overrides = props.overrides || {};
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
        "owner", "admin", "member", "accountant", "viewer", "user",
      ],
    };

    const defaultPowerBI: AnalyticsSectionConfig = {
      enabled: false,
      visibleToRoles: ["owner", "admin"],
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
      overrides: input.overrides,
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

  get overrides(): OrganizationFeatureOverrides { return { ...this._overrides }; }

  updateOverrides(overrides: OrganizationFeatureOverrides, updatedBy: string): void {
    if (!updatedBy?.trim()) throw new DomainError('UpdatedBy is required');
    for (const [key, value] of Object.entries(overrides)) {
      if (['maxDataSources', 'maxUsers'].includes(key)) {
        if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < -1) throw new DomainError('Invalid feature usage limit');
      } else if (!['aiInsightsEnabled', 'multiCurrencyEnabled', 'customReportsEnabled', 'apiAccessEnabled'].includes(key) || typeof value !== 'boolean') {
        throw new DomainError('Invalid organization feature override');
      }
    }
    this._overrides = { ...this._overrides, ...overrides };
    this._updatedBy = updatedBy;
    this._updatedAt = new Date();
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
      overrides: this.overrides,
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
      overrides: this.overrides,
      updatedBy: this._updatedBy,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
