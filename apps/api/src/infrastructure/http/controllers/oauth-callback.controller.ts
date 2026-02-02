/**
 * OAuth Callback Controller
 *
 * Handles OAuth callbacks at /api/v1/datasources/oauth/:provider/callback
 * This matches the redirect URIs registered with OAuth providers.
 */
import { Controller, Get, Query, Param, Logger, Res } from "@nestjs/common";
import { Response } from "express";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { Public } from "nest-keycloak-connect";
import { QuickBooksService } from "@infrastructure/adapters/accounting/quickbooks/quickbooks.service";

// In-memory storage (shared with datasource controller)
// In production, use database
interface TokenData {
  accessToken: string;
  refreshToken: string;
  realmId: string;
  createdAt: Date;
  expiresAt?: Date;
}

// Export for use in datasource controller
export const oauthTokenStore: Map<string, TokenData> = new Map();
export const connectedDataSources: Array<{
  id: string;
  provider: string;
  name: string;
  companyName: string;
  status: string;
  realmId?: string;
  createdAt: string;
}> = [];

@ApiTags("OAuth")
@Controller("api/v1/datasources/oauth")
export class OAuthCallbackController {
  private readonly logger = new Logger(OAuthCallbackController.name);
  private readonly quickbooksService: QuickBooksService;

  constructor(private readonly configService: ConfigService) {
    this.quickbooksService = new QuickBooksService(configService);
    this.logger.log(`QuickBooks OAuth callback controller initialized`);
  }

  /**
   * Handle OAuth callback from providers
   * This endpoint matches the redirect URI registered with QuickBooks:
   * https://plainledger.ca/api/v1/datasources/oauth/quickbooks/callback
   */
  @Public()
  @Get(":provider/callback")
  @ApiOperation({ summary: "Handle OAuth callback from provider" })
  @ApiResponse({ status: 302, description: "Redirect to frontend" })
  async handleCallback(
    @Param("provider") provider: string,
    @Query("code") code: string,
    @Query("state") state: string,
    @Query("realmId") realmId: string,
    @Query("error") error: string,
    @Query("error_description") errorDescription: string,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl =
      this.configService.get<string>("FRONTEND_URL") ||
      "https://plainledger.ca";

    this.logger.log(
      `OAuth callback for ${provider}: code=${code ? "present" : "missing"}, realmId=${realmId}, state=${state}`,
    );

    // Handle OAuth errors
    if (error) {
      this.logger.error(`OAuth error: ${error} - ${errorDescription}`);
      res.redirect(
        `${frontendUrl}/connections?error=${encodeURIComponent(errorDescription || error)}&provider=${provider}`,
      );
      return;
    }

    // Validate required parameters
    if (!code) {
      this.logger.error("Missing authorization code");
      res.redirect(
        `${frontendUrl}/connections?error=missing_code&provider=${provider}`,
      );
      return;
    }

    try {
      let companyName = `${provider.charAt(0).toUpperCase() + provider.slice(1)} Company`;
      const datasourceId = crypto.randomUUID();

      if (provider === "quickbooks" && realmId) {
        // Exchange authorization code for tokens
        this.logger.log(`Exchanging code for tokens, realmId: ${realmId}`);

        const tokens = await this.quickbooksService.exchangeCodeForTokens(
          code,
          realmId,
        );

        this.logger.log(`Tokens obtained for QuickBooks realm: ${realmId}`);

        // Store tokens
        const expiresAt = tokens.accessTokenExpiresAt
          ? new Date(tokens.accessTokenExpiresAt)
          : new Date(Date.now() + 60 * 60 * 1000);

        oauthTokenStore.set(datasourceId, {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          realmId: realmId,
          createdAt: new Date(),
          expiresAt,
        });

        // Fetch company info
        // Note: OAuth callback is public, so we default to sandbox for safety
        // The actual sync will use the correct environment based on user
        try {
          const companyInfo = await this.quickbooksService.getCompanyInfo(
            tokens.accessToken,
            realmId,
            true, // Default to sandbox during OAuth callback
          );
          companyName = companyInfo.companyName;
          this.logger.log(`Connected to QuickBooks company: ${companyName}`);
        } catch (err) {
          this.logger.warn(`Could not fetch company info: ${err}`);
        }

        // Store datasource connection
        connectedDataSources.push({
          id: datasourceId,
          provider,
          name: companyName,
          companyName,
          status: "connected",
          realmId,
          createdAt: new Date().toISOString(),
        });

        // Trigger initial data sync in background
        this.triggerInitialSync(datasourceId, tokens.accessToken, realmId);
      }

      // Redirect to frontend with success
      this.logger.log(`OAuth successful, redirecting to frontend`);
      res.redirect(
        `${frontendUrl}/connections?success=true&provider=${provider}&datasourceId=${datasourceId}&company=${encodeURIComponent(companyName)}`,
      );
    } catch (err) {
      this.logger.error(`OAuth callback failed: ${err}`);
      res.redirect(
        `${frontendUrl}/connections?error=${encodeURIComponent(String(err))}&provider=${provider}`,
      );
    }
  }

  /**
   * Trigger initial data sync after OAuth connection
   * Note: This runs in background without user context, so defaults to sandbox
   */
  private async triggerInitialSync(
    datasourceId: string,
    accessToken: string,
    realmId: string,
  ): Promise<void> {
    this.logger.log(`Triggering initial sync for datasource: ${datasourceId}`);

    try {
      // Fetch data from QuickBooks
      // Default to sandbox since we don't have user context in background job
      const useSandbox = true;
      const [accounts, customers, vendors] = await Promise.all([
        this.quickbooksService.getAccounts(accessToken, realmId, useSandbox),
        this.quickbooksService.getCustomers(accessToken, realmId, useSandbox),
        this.quickbooksService.getVendors(accessToken, realmId, useSandbox),
      ]);

      this.logger.log(
        `Initial sync data fetched: ${accounts.length} accounts, ${customers.length} customers, ${vendors.length} vendors`,
      );

      // TODO: Send to Bronze layer S3 bucket
      // This would be done by calling the ETL service or directly writing to S3
    } catch (err) {
      this.logger.error(`Initial sync failed: ${err}`);
    }
  }

  /**
   * List connected datasources
   */
  @Public()
  @Get("connections")
  @ApiOperation({ summary: "List connected OAuth datasources" })
  async listConnections() {
    return connectedDataSources;
  }
}
