import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Query,
  Logger,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { Public } from "nest-keycloak-connect";
import { QuickBooksService } from "@infrastructure/integrations/quickbooks/quickbooks.service";

// DTO for creating a data source connection
class CreateDataSourceDto {
  provider: string;
  name: string;
  authorizationCode?: string;
  redirectUri?: string;
}

// DTO for OAuth callback
class OAuthCallbackDto {
  code: string;
  state: string;
  realmId?: string; // QuickBooks company ID
}

// Response DTOs
class DataSourceResponseDto {
  id: string;
  provider: string;
  name: string;
  status: string;
  lastSyncAt?: string;
  accountsCount?: number;
  transactionsCount?: number;
  createdAt: string;
  companyName?: string;
}

class OAuthUrlResponseDto {
  url: string;
  state: string;
}

class SyncResultDto {
  accounts: number;
  customers: number;
  vendors: number;
  invoices: number;
  journalEntries: number;
  syncedAt: string;
}

// In-memory store for development (would be database in production)
const mockDataSources: DataSourceResponseDto[] = [];
const tokenStore: Map<string, { accessToken: string; refreshToken: string; realmId: string }> = new Map();

@ApiTags("Data Sources")
@ApiBearerAuth()
@Controller("api/datasources")
export class DataSourceController {
  private readonly logger = new Logger(DataSourceController.name);
  private readonly quickbooksService: QuickBooksService;

  constructor(private readonly configService: ConfigService) {
    this.quickbooksService = new QuickBooksService(configService);
  }

  @Get()
  @ApiOperation({ summary: "List all data source connections" })
  @ApiResponse({ status: 200, description: "List of data sources" })
  async listDataSources(
    @Query("tenantId") tenantId?: string,
  ): Promise<DataSourceResponseDto[]> {
    // In production, this would query the database
    return mockDataSources;
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a specific data source" })
  @ApiResponse({ status: 200, description: "Data source details" })
  @ApiResponse({ status: 404, description: "Data source not found" })
  async getDataSource(@Param("id") id: string): Promise<DataSourceResponseDto> {
    const dataSource = mockDataSources.find((ds) => ds.id === id);
    if (!dataSource) {
      throw new Error("Data source not found");
    }
    return dataSource;
  }

  @Public()
  @Post(":provider/oauth/url")
  @ApiOperation({ summary: "Get OAuth authorization URL for a provider" })
  @ApiResponse({ status: 200, description: "OAuth URL generated" })
  async getOAuthUrl(
    @Param("provider") provider: string,
    @Query("redirectUri") redirectUri?: string,
  ): Promise<OAuthUrlResponseDto> {
    const state = crypto.randomUUID();

    // Use configured redirect URI if not provided
    const effectiveRedirectUri = redirectUri || 
      this.configService.get<string>(`${provider.toUpperCase()}_REDIRECT_URI`) ||
      `${this.configService.get<string>('APP_URL')}/api/v1/datasources/oauth/${provider}/callback`;

    // Provider-specific OAuth URL generation
    if (provider === 'quickbooks') {
      const url = this.quickbooksService.getAuthorizationUrl(state);
      this.logger.log(`Generated QuickBooks OAuth URL for state: ${state}`);
      return { url, state };
    }

    // Fallback for other providers
    const clientId = this.configService.get<string>(`${provider.toUpperCase()}_CLIENT_ID`) || 'YOUR_CLIENT_ID';
    
    const oauthUrls: Record<string, string> = {
      xero: `https://login.xero.com/identity/connect/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(effectiveRedirectUri)}&scope=openid profile email accounting.transactions accounting.contacts&state=${state}`,
      sage: `https://www.sageone.com/oauth2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(effectiveRedirectUri)}&scope=full_access&state=${state}`,
      freshbooks: `https://api.freshbooks.com/auth/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(effectiveRedirectUri)}&response_type=code&state=${state}`,
    };

    const url = oauthUrls[provider];
    if (!url) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    return { url, state };
  }

  @Public()
  @Post(":provider/oauth/callback")
  @ApiOperation({ summary: "Handle OAuth callback from provider" })
  @ApiResponse({ status: 201, description: "Connection established" })
  async handleOAuthCallback(
    @Param("provider") provider: string,
    @Body() callback: OAuthCallbackDto,
  ): Promise<DataSourceResponseDto> {
    this.logger.log(`OAuth callback received for ${provider}`);

    let companyName = `${provider.charAt(0).toUpperCase() + provider.slice(1)} Company`;
    const datasourceId = crypto.randomUUID();

    // Handle QuickBooks OAuth callback
    if (provider === 'quickbooks' && callback.realmId) {
      try {
        // Exchange authorization code for tokens
        const tokens = await this.quickbooksService.exchangeCodeForTokens(
          callback.code,
          callback.realmId,
        );

        this.logger.log(`QuickBooks tokens obtained for realm: ${callback.realmId}`);

        // Store tokens (in production, encrypt and save to database)
        tokenStore.set(datasourceId, {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          realmId: callback.realmId,
        });

        // Fetch company info
        try {
          const companyInfo = await this.quickbooksService.getCompanyInfo(
            tokens.accessToken,
            callback.realmId,
            true, // Use sandbox
          );
          companyName = companyInfo.companyName;
          this.logger.log(`Connected to QuickBooks company: ${companyName}`);
        } catch (error) {
          this.logger.warn(`Could not fetch company info: ${error}`);
        }
      } catch (error) {
        this.logger.error(`Failed to exchange QuickBooks tokens: ${error}`);
        throw new Error(`Failed to connect to QuickBooks: ${error}`);
      }
    }

    const newDataSource: DataSourceResponseDto = {
      id: datasourceId,
      provider,
      name: companyName,
      companyName,
      status: "connected",
      accountsCount: 0,
      transactionsCount: 0,
      createdAt: new Date().toISOString(),
    };

    mockDataSources.push(newDataSource);
    return newDataSource;
  }

  @Post(":id/full-sync")
  @ApiOperation({ summary: "Perform full data sync for a QuickBooks connection" })
  @ApiResponse({ status: 200, description: "Sync completed" })
  async fullSync(@Param("id") id: string): Promise<SyncResultDto> {
    const dataSource = mockDataSources.find((ds) => ds.id === id);
    if (!dataSource) {
      throw new Error("Data source not found");
    }

    const tokens = tokenStore.get(id);
    if (!tokens) {
      throw new Error("No tokens found for this connection. Please reconnect.");
    }

    this.logger.log(`Starting full sync for datasource: ${id}`);

    try {
      const syncData = await this.quickbooksService.getFullSync(
        tokens.accessToken,
        tokens.realmId,
        "2020-01-01", // Wide date range
        new Date().toISOString().split("T")[0],
        true, // Use sandbox
      );

      // Update datasource stats
      dataSource.accountsCount = syncData.accounts.length;
      dataSource.transactionsCount = syncData.invoices.length + syncData.journalEntries.length;
      dataSource.lastSyncAt = new Date().toISOString();
      dataSource.status = "connected";

      this.logger.log(
        `Full sync complete: ${syncData.accounts.length} accounts, ` +
        `${syncData.customers.length} customers, ${syncData.vendors.length} vendors, ` +
        `${syncData.invoices.length} invoices, ${syncData.journalEntries.length} journal entries`,
      );

      return {
        accounts: syncData.accounts.length,
        customers: syncData.customers.length,
        vendors: syncData.vendors.length,
        invoices: syncData.invoices.length,
        journalEntries: syncData.journalEntries.length,
        syncedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Sync failed: ${error}`);
      dataSource.status = "error";
      throw new Error(`Sync failed: ${error}`);
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new data source connection" })
  @ApiResponse({ status: 201, description: "Data source created" })
  async createDataSource(
    @Body() dto: CreateDataSourceDto,
  ): Promise<DataSourceResponseDto> {
    const newDataSource: DataSourceResponseDto = {
      id: crypto.randomUUID(),
      provider: dto.provider,
      name: dto.name,
      status: "connected",
      accountsCount: Math.floor(Math.random() * 50) + 10,
      transactionsCount: Math.floor(Math.random() * 5000) + 500,
      lastSyncAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    mockDataSources.push(newDataSource);
    return newDataSource;
  }

  @Post(":id/sync")
  @ApiOperation({ summary: "Trigger sync for a data source" })
  @ApiResponse({ status: 200, description: "Sync initiated" })
  async syncDataSource(
    @Param("id") id: string,
  ): Promise<{ message: string; status: string }> {
    const dataSource = mockDataSources.find((ds) => ds.id === id);
    if (!dataSource) {
      throw new Error("Data source not found");
    }

    // In production, this would queue a sync job
    dataSource.status = "syncing";

    // Simulate sync completion after a delay
    setTimeout(() => {
      dataSource.status = "connected";
      dataSource.lastSyncAt = new Date().toISOString();
      dataSource.accountsCount = Math.floor(Math.random() * 50) + 10;
      dataSource.transactionsCount = Math.floor(Math.random() * 5000) + 500;
    }, 3000);

    return { message: "Sync initiated", status: "syncing" };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Disconnect and remove a data source" })
  @ApiResponse({ status: 204, description: "Data source disconnected" })
  async deleteDataSource(@Param("id") id: string): Promise<void> {
    const index = mockDataSources.findIndex((ds) => ds.id === id);
    if (index === -1) {
      throw new Error("Data source not found");
    }
    mockDataSources.splice(index, 1);
  }

  @Public()
  @Get("providers/available")
  @ApiOperation({ summary: "List available accounting providers" })
  @ApiResponse({ status: 200, description: "List of available providers" })
  async listProviders(): Promise<
    { id: string; name: string; description: string; supported: boolean }[]
  > {
    return [
      {
        id: "quickbooks",
        name: "QuickBooks Online",
        description: "Intuit QuickBooks accounting software",
        supported: true,
      },
      {
        id: "xero",
        name: "Xero",
        description: "Cloud-based accounting platform",
        supported: true,
      },
      {
        id: "sage",
        name: "Sage",
        description: "Sage Business Cloud Accounting",
        supported: true,
      },
      {
        id: "freshbooks",
        name: "FreshBooks",
        description: "Invoice and accounting software",
        supported: true,
      },
      {
        id: "wave",
        name: "Wave",
        description: "Free accounting software",
        supported: false,
      },
      {
        id: "csv",
        name: "CSV Import",
        description: "Import data from CSV files",
        supported: true,
      },
    ];
  }
}
