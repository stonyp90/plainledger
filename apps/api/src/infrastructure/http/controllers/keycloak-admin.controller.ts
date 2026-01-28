/**
 * Keycloak Admin Controller
 * Admin endpoints for Keycloak operations
 */

import { Controller, Logger } from "@nestjs/common";

@Controller("admin/keycloak")
export class KeycloakAdminController {
  private readonly logger = new Logger(KeycloakAdminController.name);

  constructor() {
    // Reserved for future admin operations
  }
}
