export interface RLSIdentityProps {
  username: string; // organization_id for RLS
  roles?: string[];
  customData?: Record<string, string>; // business_unit_id, etc.
}

export class RLSIdentity {
  private readonly _username: string;
  private readonly _roles: string[];
  private readonly _customData: Record<string, string>;

  private constructor(props: RLSIdentityProps) {
    this._username = props.username;
    this._roles = props.roles || [];
    this._customData = props.customData || {};
  }

  static create(props: RLSIdentityProps): RLSIdentity {
    if (!props.username || props.username.trim().length === 0) {
      throw new Error("Username (organization_id) is required for RLS");
    }

    return new RLSIdentity(props);
  }

  static fromJWT(
    organizationId: string,
    businessUnitId?: string,
    roles?: string[],
  ): RLSIdentity {
    const customData: Record<string, string> = {};

    if (businessUnitId) {
      customData.business_unit_id = businessUnitId;
    }

    return new RLSIdentity({
      username: organizationId,
      roles: roles || [],
      customData,
    });
  }

  get username(): string {
    return this._username;
  }

  get roles(): string[] {
    return [...this._roles];
  }

  get customData(): Record<string, string> {
    return { ...this._customData };
  }

  get businessUnitId(): string | undefined {
    return this._customData.business_unit_id;
  }

  /**
   * Convert to Power BI embed token identity format
   */
  toPowerBIIdentity(): {
    username: string;
    roles: string[];
    customData?: string;
  } {
    const identity: {
      username: string;
      roles: string[];
      customData?: string;
    } = {
      username: this._username,
      roles: this._roles,
    };

    if (Object.keys(this._customData).length > 0) {
      // Power BI expects customData as a JSON string
      identity.customData = JSON.stringify(this._customData);
    }

    return identity;
  }

  toJSON(): Record<string, unknown> {
    return {
      username: this._username,
      roles: this._roles,
      customData: this._customData,
    };
  }
}
