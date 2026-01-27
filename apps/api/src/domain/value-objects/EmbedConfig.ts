export interface EmbedConfigProps {
  embedUrl: string;
  accessToken: string;
  tokenType: string;
  reportId: string;
  datasetId?: string;
  expiration: Date;
}

export class EmbedConfig {
  private readonly _embedUrl: string;
  private readonly _accessToken: string;
  private readonly _tokenType: string;
  private readonly _reportId: string;
  private readonly _datasetId?: string;
  private readonly _expiration: Date;

  private constructor(props: EmbedConfigProps) {
    this._embedUrl = props.embedUrl;
    this._accessToken = props.accessToken;
    this._tokenType = props.tokenType;
    this._reportId = props.reportId;
    this._datasetId = props.datasetId;
    this._expiration = props.expiration;
  }

  static create(props: EmbedConfigProps): EmbedConfig {
    if (!props.embedUrl || props.embedUrl.trim().length === 0) {
      throw new Error("Embed URL is required");
    }

    if (!props.accessToken || props.accessToken.trim().length === 0) {
      throw new Error("Access token is required");
    }

    if (!props.reportId || props.reportId.trim().length === 0) {
      throw new Error("Report ID is required");
    }

    if (props.expiration < new Date()) {
      throw new Error("Token expiration must be in the future");
    }

    return new EmbedConfig(props);
  }

  get embedUrl(): string {
    return this._embedUrl;
  }

  get accessToken(): string {
    return this._accessToken;
  }

  get tokenType(): string {
    return this._tokenType;
  }

  get reportId(): string {
    return this._reportId;
  }

  get datasetId(): string | undefined {
    return this._datasetId;
  }

  get expiration(): Date {
    return this._expiration;
  }

  isExpired(): boolean {
    return this._expiration < new Date();
  }

  toJSON(): Record<string, unknown> {
    return {
      embedUrl: this._embedUrl,
      accessToken: this._accessToken,
      tokenType: this._tokenType,
      reportId: this._reportId,
      datasetId: this._datasetId,
      expiration: this._expiration.toISOString(),
    };
  }
}
