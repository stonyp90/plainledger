/**
 * Data Source Resolver
 *
 * GraphQL resolver for managing accounting data source connections.
 * Handles OAuth flows, sync operations, and connection management.
 *
 * Security:
 * - All operations require authentication
 * - OAuth state validated to prevent CSRF
 * - Tokens stored securely (see datasource.controller.ts)
 */
import { Resolver, Query, Mutation, Args, Context } from "@nestjs/graphql";
import { UseGuards, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import { GqlAuthGuard } from "../guards/gql-auth.guard";
import { Public } from "nest-keycloak-connect";
import {
  DataSource,
  DataSourceStatus,
  OAuthUrlResponse,
  SyncResult,
  AvailableProvider,
  OAuthCallbackInput,
  SyncOptionsInput,
  MutationResponse,
} from "../types";

@Resolver(() => DataSource)
@UseGuards(GqlAuthGuard)
export class DataSourceResolver {
  private readonly logger = new Logger(DataSourceResolver.name);

  // In-memory state store for OAuth CSRF protection
  private static oauthStateStore: Map<string, { 
    organizationId: string; 
    provider: string; 
    expiresAt: Date;
  }> = new Map();

  constructor(private readonly configService: ConfigService) {
    // Clean up expired OAuth states periodically
    setInterval(() => {
      const now = new Date();
      for (const [state, data] of DataSourceResolver.oauthStateStore.entries()) {
        if (data.expiresAt < now) {
          DataSourceResolver.oauthStateStore.delete(state);
        }
      }
    }, 60000);
  }

  // =====================================================
  // QUERIES
  // =====================================================

  @Query(() => [DataSource], {
    name: "dataSources",
    description: "Get all data sources for the organization",
  })
  async getDataSources(
    @Context() context: { req: { user: { organizationId: string } } },
  ): Promise<DataSource[]> {
    const { organizationId } = context.req.user;
    this.logger.log(`Fetching data sources for org: ${organizationId}`);

    // Return mock data - would normally fetch from database
    return [
      {
        id: "ds-1",
        provider: "quickbooks",
        name: "QuickBooks Online",
        companyName: "Sample Company",
        status: DataSourceStatus.CONNECTED,
        lastSyncAt: new Date(),
        syncStats: {
          accountsSynced: 45,
          transactionsSynced: 1250,
          contactsSynced: 89,
          invoicesSynced: 234,
          billsSynced: 156,
        },
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      },
    ];
  }

  @Query(() => DataSource, {
    name: "dataSource",
    description: "Get a specific data source by ID",
    nullable: true,
  })
  async getDataSource(
    @Args("id") id: string,
    @Context() context: { req: { user: { organizationId: string } } },
  ): Promise<DataSource | null> {
    const { organizationId } = context.req.user;
    this.logger.log(`Fetching data source ${id} for org: ${organizationId}`);

    // Would fetch from database
    return null;
  }

  @Query(() => [AvailableProvider], {
    name: "availableProviders",
    description: "List all available accounting providers",
  })
  async getAvailableProviders(): Promise<AvailableProvider[]> {
    return [
      {
        id: "quickbooks",
        name: "QuickBooks Online",
        description: "Connect to QuickBooks Online for comprehensive accounting data sync",
        logoUrl: "/providers/quickbooks.svg",
        isEnabled: true,
        supportedFeatures: ["accounts", "transactions", "invoices", "bills", "contacts", "reports"],
      },
      {
        id: "xero",
        name: "Xero",
        description: "Connect to Xero for cloud accounting integration",
        logoUrl: "/providers/xero.svg",
        isEnabled: true,
        supportedFeatures: ["accounts", "transactions", "invoices", "bills", "contacts"],
      },
      {
        id: "sage",
        name: "Sage Business Cloud",
        description: "Connect to Sage for business accounting data",
        logoUrl: "/providers/sage.svg",
        isEnabled: false,
        supportedFeatures: ["accounts", "transactions", "invoices"],
      },
      {
        id: "freshbooks",
        name: "FreshBooks",
        description: "Connect to FreshBooks for invoice and expense tracking",
        logoUrl: "/providers/freshbooks.svg",
        isEnabled: false,
        supportedFeatures: ["invoices", "expenses", "contacts"],
      },
    ];
  }

  // =====================================================
  // MUTATIONS - OAuth Flow
  // =====================================================

  @Mutation(() => OAuthUrlResponse, {
    name: "initiateOAuth",
    description: "Get OAuth authorization URL for a provider",
  })
  async initiateOAuth(
    @Args("provider") provider: string,
    @Args("redirectUri", { nullable: true }) redirectUri?: string,
    @Context() context?: { req: { user: { organizationId: string } } },
  ): Promise<OAuthUrlResponse> {
    const organizationId = context?.req?.user?.organizationId || "default";
    this.logger.log(`Initiating OAuth for ${provider}, org: ${organizationId}`);

    // Generate secure state for CSRF protection
    const state = crypto.randomUUID();
    
    // Store state with expiration (10 minutes)
    DataSourceResolver.oauthStateStore.set(state, {
      organizationId,
      provider,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Build OAuth URL based on provider
    const baseRedirectUri = redirectUri || 
      this.configService.get<string>(`${provider.toUpperCase()}_REDIRECT_URI`) ||
      `${this.configService.get<string>("APP_URL")}/api/v1/datasources/oauth/${provider}/callback`;

    let url: string;
    
    switch (provider) {
      case "quickbooks": {
        const clientId = this.configService.get<string>("QUICKBOOKS_CLIENT_ID");
        const environment = this.configService.get<string>("QUICKBOOKS_ENVIRONMENT") || "sandbox";
        const baseUrl = environment === "production" 
          ? "https://appcenter.intuit.com"
          : "https://appcenter.intuit.com";
        
        url = `${baseUrl}/connect/oauth2?` +
          `client_id=${clientId}&` +
          `response_type=code&` +
          `scope=com.intuit.quickbooks.accounting&` +
          `redirect_uri=${encodeURIComponent(baseRedirectUri)}&` +
          `state=${state}`;
        break;
      }
      case "xero": {
        const clientId = this.configService.get<string>("XERO_CLIENT_ID");
        url = `https://login.xero.com/identity/connect/authorize?` +
          `response_type=code&` +
          `client_id=${clientId}&` +
          `redirect_uri=${encodeURIComponent(baseRedirectUri)}&` +
          `scope=openid profile email accounting.transactions accounting.contacts&` +
          `state=${state}`;
        break;
      }
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    return { url, state, provider };
  }

  @Mutation(() => DataSource, {
    name: "completeOAuth",
    description: "Complete OAuth flow with callback data",
  })
  async completeOAuth(
    @Args("input") input: OAuthCallbackInput,
    @Context() context: { req: { user: { organizationId: string } } },
  ): Promise<DataSource> {
    const { organizationId } = context.req.user;
    this.logger.log(`Completing OAuth for state: ${input.state.substring(0, 8)}...`);

    // Validate OAuth state (CSRF protection)
    const stateData = DataSourceResolver.oauthStateStore.get(input.state);
    if (!stateData) {
      throw new Error("Invalid or expired OAuth state. Please try again.");
    }
    
    // Verify organization matches
    if (stateData.organizationId !== organizationId) {
      this.logger.warn(`OAuth state mismatch: expected ${stateData.organizationId}, got ${organizationId}`);
      throw new Error("OAuth state mismatch. Please try again.");
    }

    // Clean up used state
    DataSourceResolver.oauthStateStore.delete(input.state);

    // Exchange code for tokens (would call actual OAuth service)
    // For now, return mock success
    const dataSourceId = crypto.randomUUID();

    return {
      id: dataSourceId,
      provider: stateData.provider,
      name: `${stateData.provider.charAt(0).toUpperCase() + stateData.provider.slice(1)} Connection`,
      companyName: input.realmId ? `Company ${input.realmId}` : undefined,
      status: DataSourceStatus.CONNECTED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // =====================================================
  // MUTATIONS - Sync Operations
  // =====================================================

  @Mutation(() => SyncResult, {
    name: "syncDataSource",
    description: "Trigger a sync for a data source",
  })
  async syncDataSource(
    @Args("id") id: string,
    @Args("options", { nullable: true }) options?: SyncOptionsInput,
    @Context() context?: { req: { user: { organizationId: string } } },
  ): Promise<SyncResult> {
    const organizationId = context?.req?.user?.organizationId || "default";
    this.logger.log(`Syncing data source ${id} for org: ${organizationId}`);

    // Would trigger actual sync job
    // For now, return mock result
    return {
      success: true,
      stats: {
        accountsSynced: 45,
        transactionsSynced: 150,
        contactsSynced: 23,
        invoicesSynced: 78,
        billsSynced: 34,
      },
      syncedAt: new Date(),
      message: options?.fullSync ? "Full sync completed" : "Incremental sync completed",
    };
  }

  @Mutation(() => MutationResponse, {
    name: "disconnectDataSource",
    description: "Disconnect a data source",
  })
  async disconnectDataSource(
    @Args("id") id: string,
    @Context() context: { req: { user: { organizationId: string; roles: string[] } } },
  ): Promise<MutationResponse> {
    const { organizationId, roles } = context.req.user;
    
    // Security: Only admins can disconnect
    if (!roles?.includes("admin") && !roles?.includes("owner")) {
      return {
        success: false,
        message: "Insufficient permissions to disconnect data source",
        errors: ["Only administrators can disconnect data sources"],
      };
    }

    this.logger.log(`Disconnecting data source ${id} for org: ${organizationId}`);

    // Would actually disconnect and clean up tokens
    return {
      success: true,
      message: "Data source disconnected successfully",
    };
  }

  @Mutation(() => MutationResponse, {
    name: "deleteDataSource",
    description: "Delete a data source and all associated data",
  })
  async deleteDataSource(
    @Args("id") id: string,
    @Args("confirmDelete") confirmDelete: boolean,
    @Context() context: { req: { user: { organizationId: string; roles: string[] } } },
  ): Promise<MutationResponse> {
    const { organizationId, roles } = context.req.user;
    
    // Security: Require confirmation and admin role
    if (!confirmDelete) {
      return {
        success: false,
        message: "Deletion not confirmed",
        errors: ["Please confirm deletion by setting confirmDelete to true"],
      };
    }

    if (!roles?.includes("admin") && !roles?.includes("owner")) {
      return {
        success: false,
        message: "Insufficient permissions",
        errors: ["Only administrators can delete data sources"],
      };
    }

    this.logger.log(`Deleting data source ${id} for org: ${organizationId}`);

    // Would actually delete data source and associated data
    return {
      success: true,
      message: "Data source and associated data deleted successfully",
    };
  }
}
