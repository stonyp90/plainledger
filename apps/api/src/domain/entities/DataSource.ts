import { TenantId } from "../value-objects/TenantId";

export enum DataSourceProvider {
  QUICKBOOKS = "quickbooks",
  XERO = "xero",
  SAGE = "sage",
  FRESHBOOKS = "freshbooks",
  WAVE = "wave",
  CSV = "csv",
}

export enum DataSourceStatus {
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  SYNCING = "syncing",
  ERROR = "error",
}

export interface DataSourceProps {
  id: string;
  tenantId: TenantId;
  provider: DataSourceProvider;
  name: string;
  status: DataSourceStatus;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  lastSyncAt?: Date;
  accountsCount?: number;
  transactionsCount?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class DataSource {
  private constructor(private readonly props: DataSourceProps) {}

  static create(
    props: Omit<DataSourceProps, "id" | "createdAt" | "updatedAt">,
  ): DataSource {
    return new DataSource({
      ...props,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: DataSourceProps): DataSource {
    return new DataSource(props);
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): TenantId {
    return this.props.tenantId;
  }

  get provider(): DataSourceProvider {
    return this.props.provider;
  }

  get name(): string {
    return this.props.name;
  }

  get status(): DataSourceStatus {
    return this.props.status;
  }

  get lastSyncAt(): Date | undefined {
    return this.props.lastSyncAt;
  }

  get accountsCount(): number | undefined {
    return this.props.accountsCount;
  }

  get transactionsCount(): number | undefined {
    return this.props.transactionsCount;
  }

  get errorMessage(): string | undefined {
    return this.props.errorMessage;
  }

  get metadata(): Record<string, unknown> | undefined {
    return this.props.metadata;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  connect(accessToken: string, refreshToken: string, expiresAt: Date): void {
    this.props.accessToken = accessToken;
    this.props.refreshToken = refreshToken;
    this.props.tokenExpiresAt = expiresAt;
    this.props.status = DataSourceStatus.CONNECTED;
    this.props.errorMessage = undefined;
    this.props.updatedAt = new Date();
  }

  disconnect(): void {
    this.props.accessToken = undefined;
    this.props.refreshToken = undefined;
    this.props.tokenExpiresAt = undefined;
    this.props.status = DataSourceStatus.DISCONNECTED;
    this.props.updatedAt = new Date();
  }

  startSync(): void {
    this.props.status = DataSourceStatus.SYNCING;
    this.props.updatedAt = new Date();
  }

  completeSync(accountsCount: number, transactionsCount: number): void {
    this.props.status = DataSourceStatus.CONNECTED;
    this.props.lastSyncAt = new Date();
    this.props.accountsCount = accountsCount;
    this.props.transactionsCount = transactionsCount;
    this.props.errorMessage = undefined;
    this.props.updatedAt = new Date();
  }

  setError(message: string): void {
    this.props.status = DataSourceStatus.ERROR;
    this.props.errorMessage = message;
    this.props.updatedAt = new Date();
  }

  toJSON(): DataSourceProps {
    return { ...this.props };
  }
}
