/**
 * Keycloak Admin Controller
 * Temporary endpoint to update client configuration
 * TODO: Remove after migration or secure with admin-only access
 */

import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
} from "@nestjs/common";
import { Public } from "nest-keycloak-connect";
import { KeycloakAdminService } from "@infrastructure/auth/keycloak-admin.service";
import { Inject } from "@nestjs/common";
import { IKeycloakAdminService } from "@application/ports/outbound/IKeycloakAdminService";

@Controller("admin/keycloak")
export class KeycloakAdminController {
  private readonly logger = new Logger(KeycloakAdminController.name);

  constructor(
    @Inject("IKeycloakAdminService")
    private readonly keycloakAdminService: KeycloakAdminService,
  ) {}

  /**
   * Update plainledger-web client to enable Direct Access Grants
   * Temporary endpoint for migration
   */
  @Post("enable-direct-access-grants")
  @Public() // TODO: Add admin guard
  @HttpCode(HttpStatus.OK)
  async enableDirectAccessGrants() {
    this.logger.log("Updating plainledger-web client configuration...");

    if (!this.keycloakAdminService.isAvailable()) {
      throw new Error("Keycloak Admin Service not configured");
    }

    try {
      // Access the admin client directly
      const adminClient = (this.keycloakAdminService as any).adminClient;
      if (!adminClient) {
        throw new Error("Keycloak Admin Client not initialized");
      }

      const realm = (this.keycloakAdminService as any).realm || "plainledger";

      // Find the client
      const clients = await adminClient.clients.find({
        realm,
        clientId: "plainledger-web",
      });

      if (!clients || clients.length === 0) {
        throw new Error('Client "plainledger-web" not found');
      }

      const client = clients[0];
      this.logger.log(`Found client: ${client.id}`);

      const currentStatus = client.directAccessGrantsEnabled;
      this.logger.log(`Current Direct Access Grants: ${currentStatus}`);

      if (currentStatus === true) {
        return {
          success: true,
          message: "Direct Access Grants is already enabled",
          clientId: client.id,
        };
      }

      // Update client
      await adminClient.clients.update(
        { realm, id: client.id },
        {
          ...client,
          directAccessGrantsEnabled: true,
        },
      );

      this.logger.log("Successfully enabled Direct Access Grants");

      return {
        success: true,
        message: "Direct Access Grants enabled successfully",
        clientId: client.id,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update client: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
