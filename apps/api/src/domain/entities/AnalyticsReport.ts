export interface AnalyticsReportProps {
  id: string;
  workspaceId: string;
  reportId: string;
  reportName: string;
  datasetId?: string;
  embedUrl: string;
  organizationId?: string;
  businessUnitId?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateAnalyticsReportInput {
  workspaceId: string;
  reportId: string;
  reportName: string;
  datasetId?: string;
  embedUrl: string;
  organizationId?: string;
  businessUnitId?: string;
}

export class AnalyticsReport {
  private readonly _id: string;
  private readonly _workspaceId: string;
  private readonly _reportId: string;
  private _reportName: string;
  private _datasetId?: string;
  private readonly _embedUrl: string;
  private _organizationId?: string;
  private _businessUnitId?: string;
  private _isActive: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: AnalyticsReportProps) {
    this._id = props.id;
    this._workspaceId = props.workspaceId;
    this._reportId = props.reportId;
    this._reportName = props.reportName;
    this._datasetId = props.datasetId;
    this._embedUrl = props.embedUrl;
    this._organizationId = props.organizationId;
    this._businessUnitId = props.businessUnitId;
    this._isActive = props.isActive ?? true;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  static create(input: CreateAnalyticsReportInput): AnalyticsReport {
    return new AnalyticsReport({
      id: crypto.randomUUID(),
      workspaceId: input.workspaceId,
      reportId: input.reportId,
      reportName: input.reportName,
      datasetId: input.datasetId,
      embedUrl: input.embedUrl,
      organizationId: input.organizationId,
      businessUnitId: input.businessUnitId,
      isActive: true,
    });
  }

  static fromPersistence(props: AnalyticsReportProps): AnalyticsReport {
    return new AnalyticsReport(props);
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get workspaceId(): string {
    return this._workspaceId;
  }

  get reportId(): string {
    return this._reportId;
  }

  get reportName(): string {
    return this._reportName;
  }

  get datasetId(): string | undefined {
    return this._datasetId;
  }

  get embedUrl(): string {
    return this._embedUrl;
  }

  get organizationId(): string | undefined {
    return this._organizationId;
  }

  get businessUnitId(): string | undefined {
    return this._businessUnitId;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // Business Methods
  updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error("Report name is required");
    }
    this._reportName = name.trim();
    this._updatedAt = new Date();
  }

  assignToOrganization(organizationId: string): void {
    this._organizationId = organizationId;
    this._updatedAt = new Date();
  }

  assignToBusinessUnit(businessUnitId: string): void {
    this._businessUnitId = businessUnitId;
    this._updatedAt = new Date();
  }

  activate(): void {
    this._isActive = true;
    this._updatedAt = new Date();
  }

  deactivate(): void {
    this._isActive = false;
    this._updatedAt = new Date();
  }

  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      workspace_id: this._workspaceId,
      report_id: this._reportId,
      report_name: this._reportName,
      dataset_id: this._datasetId,
      embed_url: this._embedUrl,
      organization_id: this._organizationId,
      business_unit_id: this._businessUnitId,
      is_active: this._isActive,
      created_at: this._createdAt,
      updated_at: this._updatedAt,
    };
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this._id,
      workspaceId: this._workspaceId,
      reportId: this._reportId,
      reportName: this._reportName,
      datasetId: this._datasetId,
      embedUrl: this._embedUrl,
      organizationId: this._organizationId,
      businessUnitId: this._businessUnitId,
      isActive: this._isActive,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
