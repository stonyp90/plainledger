/**
 * Identity Admin Controller
 * Admin endpoints for identity provider operations (Keycloak, Auth0, etc.)
 */

import { Controller, Logger } from "@nestjs/common";

@Controller("admin/identity")
export class IdentityAdminController {
  private readonly logger = new Logger(IdentityAdminController.name);

  constructor() {
    // Reserved for future admin operations
  }
}
