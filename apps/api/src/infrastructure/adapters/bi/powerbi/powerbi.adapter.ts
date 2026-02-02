import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ClientSecretCredential } from "@azure/identity";
import { EmbedConfig } from "@domain/value-objects/EmbedConfig";
import { RLSIdentity } from "@domain/value-objects/RLSIdentity";
import axios, { AxiosInstance } from "axios";

export interface IPowerBIAdapter {
  generateEmbedToken(
    workspaceId: string,
    reportId: string,
    datasetId: string | undefined,
    rlsIdentity: RLSIdentity,
  ): Promise<EmbedConfig>;

  listReports(workspaceId: string): Promise<any[]>;

  refreshDataset(workspaceId: string, datasetId: string): Promise<void>;
}

@Injectable()
export class PowerBIAdapter implements IPowerBIAdapter {
  private readonly logger = new Logger(PowerBIAdapter.name);
  private readonly tenantId: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly powerBIBaseUrl = "https://api.powerbi.com";
  private credential: ClientSecretCredential | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(private readonly configService: ConfigService) {
    this.tenantId = this.configService.get<string>("AZURE_TENANT_ID") || "";
    this.clientId = this.configService.get<string>("AZURE_CLIENT_ID") || "";
    this.clientSecret =
      this.configService.get<string>("AZURE_CLIENT_SECRET") || "";

    if (!this.tenantId || !this.clientId || !this.clientSecret) {
      this.logger.warn(
        "Azure AD credentials not configured. Power BI features will be disabled.",
      );
      return;
    }

    // Create Azure AD credential
    this.credential = new ClientSecretCredential(
      this.tenantId,
      this.clientId,
      this.clientSecret,
    );
  }

  /**
   * Get access token for Power BI API
   */
  private async getAccessToken(): Promise<string> {
    if (!this.credential) {
      throw new Error(
        "Power BI client not configured. Check Azure AD credentials.",
      );
    }

    // Return cached token if still valid (with 5 minute buffer)
    if (
      this.accessToken &&
      this.tokenExpiry &&
      this.tokenExpiry > new Date(Date.now() + 5 * 60 * 1000)
    ) {
      return this.accessToken;
    }

    try {
      // Request token for Power BI service
      const tokenResponse = await this.credential.getToken([
        "https://analysis.windows.net/powerbi/api/.default",
      ]);

      this.accessToken = tokenResponse.token;
      this.tokenExpiry = tokenResponse.expiresOnTimestamp
        ? new Date(tokenResponse.expiresOnTimestamp)
        : new Date(Date.now() + 3600 * 1000); // Default 1 hour

      return this.accessToken;
    } catch (error: any) {
      this.logger.error(
        `Failed to get access token: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to authenticate with Azure AD: ${error.message}`);
    }
  }

  /**
   * Create authenticated Axios instance
   */
  private async createApiClient(): Promise<AxiosInstance> {
    const token = await this.getAccessToken();

    return axios.create({
      baseURL: this.powerBIBaseUrl,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  }

  async generateEmbedToken(
    workspaceId: string,
    reportId: string,
    datasetId: string | undefined,
    rlsIdentity: RLSIdentity,
  ): Promise<EmbedConfig> {
    if (!this.credential) {
      throw new Error(
        "Power BI client not configured. Check Azure AD credentials.",
      );
    }

    try {
      const client = await this.createApiClient();

      // Build identities array for RLS
      const identity = rlsIdentity.toPowerBIIdentity();
      const identities = [identity];

      // Build embed token request
      const tokenRequest: any = {
        reports: [{ id: reportId }],
        identities: identities,
      };

      if (datasetId) {
        tokenRequest.datasets = [{ id: datasetId }];
      }

      // Generate embed token using Power BI REST API
      // Endpoint: POST /v1.0/myorg/groups/{groupId}/reports/{reportId}/GenerateToken
      // For reports, we use the report-specific endpoint
      const tokenRequestBody: any = {
        accessLevel: "View",
        allowSaveAs: false,
      };

      // Add identities for RLS (EffectiveIdentity format)
      // Power BI expects identities array with username, roles, and datasets
      if (identities.length > 0) {
        tokenRequestBody.identities = identities.map((identity) => {
          const effectiveIdentity: any = {
            username: identity.username,
            roles: identity.roles,
          };

          // Add customData if provided (for business_unit_id filtering)
          if (identity.customData) {
            effectiveIdentity.customData = identity.customData;
          }

          // Add datasets for RLS to apply to
          if (datasetId) {
            effectiveIdentity.datasets = [datasetId];
          }

          return effectiveIdentity;
        });
      }

      // Add datasets if provided (for report creation scenarios)
      if (
        datasetId &&
        (!tokenRequestBody.identities ||
          tokenRequestBody.identities.length === 0)
      ) {
        tokenRequestBody.datasets = [{ id: datasetId }];
      }

      const response = await client.post(
        `/v1.0/myorg/groups/${workspaceId}/reports/${reportId}/GenerateToken`,
        tokenRequestBody,
      );

      const tokenData = response.data;

      // Calculate expiration (tokens typically expire in 1 hour)
      const expiration = new Date();
      expiration.setHours(expiration.getHours() + 1);

      // Get report details to get embed URL
      const reportResponse = await client.get(
        `/v1.0/myorg/groups/${workspaceId}/reports/${reportId}`,
      );
      const embedUrl = reportResponse.data.embedUrl;

      return EmbedConfig.create({
        embedUrl: embedUrl,
        accessToken: tokenData.token,
        tokenType: "Bearer",
        reportId: reportId,
        datasetId: datasetId,
        expiration: expiration,
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to generate embed token: ${error.message}`,
        error.stack,
      );
      if (error.response) {
        this.logger.error(
          `Power BI API error: ${JSON.stringify(error.response.data)}`,
        );
      }
      throw new Error(
        `Failed to generate Power BI embed token: ${error.message}`,
      );
    }
  }

  async listReports(workspaceId: string): Promise<any[]> {
    if (!this.credential) {
      throw new Error("Power BI client not configured.");
    }

    try {
      const client = await this.createApiClient();
      const response = await client.get(
        `/v1.0/myorg/groups/${workspaceId}/reports`,
      );
      return response.data.value || [];
    } catch (error: any) {
      this.logger.error(
        `Failed to list reports: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to list Power BI reports: ${error.message}`);
    }
  }

  async refreshDataset(workspaceId: string, datasetId: string): Promise<void> {
    if (!this.credential) {
      throw new Error("Power BI client not configured.");
    }

    try {
      const client = await this.createApiClient();
      await client.post(
        `/v1.0/myorg/groups/${workspaceId}/datasets/${datasetId}/refreshes`,
      );
      this.logger.log(`Dataset ${datasetId} refresh triggered`);
    } catch (error: any) {
      this.logger.error(
        `Failed to refresh dataset: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to refresh Power BI dataset: ${error.message}`);
    }
  }
}
