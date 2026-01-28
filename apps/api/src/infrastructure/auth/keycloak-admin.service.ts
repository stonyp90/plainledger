/**
 * Keycloak Admin Service
 * Programmatic user management via Keycloak Admin REST API
 *
 * Use cases:
 * - Create users programmatically (admin invite, team invites)
 * - Set user attributes (organization, industry)
 * - Send verification/password reset emails
 * - Manage roles
 */

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import KcAdminClient from "@keycloak/keycloak-admin-client";
import type UserRepresentation from "@keycloak/keycloak-admin-client/lib/defs/userRepresentation";
import type RoleRepresentation from "@keycloak/keycloak-admin-client/lib/defs/roleRepresentation";
import { IKeycloakAdminService } from "@application/ports/outbound/IKeycloakAdminService";

// Re-export interface for convenience
export { IKeycloakAdminService };

export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  password?: string; // If not provided, user will receive password reset email
  temporaryPassword?: boolean;
  emailVerified?: boolean;
  attributes?: Record<string, string[]>;
  roles?: string[];
  sendVerificationEmail?: boolean;
}

export interface UpdateUserAttributesInput {
  userId: string;
  attributes: Record<string, string[]>;
}

export interface InviteTeamMemberInput {
  email: string;
  firstName?: string;
  lastName?: string;
  organizationId: string;
  organizationName: string;
  industry?: string;
  role?: string; // Keycloak realm role
  invitedBy: string; // Email of inviter
}

export interface KeycloakUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  emailVerified: boolean;
  enabled: boolean;
  attributes?: Record<string, string[]>;
  createdTimestamp?: number;
}

@Injectable()
export class KeycloakAdminService
  implements IKeycloakAdminService, OnModuleInit
{
  private readonly logger = new Logger(KeycloakAdminService.name);
  private adminClient: KcAdminClient;
  private realm: string;
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {
    this.realm = this.configService.get<string>(
      "KEYCLOAK_REALM",
      "plainledger",
    );
  }

  async onModuleInit() {
    await this.initializeClient();
    // Auto-enable Direct Access Grants on plainledger-web client if not already enabled
    // This ensures the custom login UI works properly
    if (this.isConfigured) {
      await this.ensureDirectAccessGrantsEnabled();
    }
  }

  /**
   * Initialize Keycloak Admin Client with service account credentials
   */
  private async initializeClient(): Promise<void> {
    const baseUrl = this.configService.get<string>(
      "KEYCLOAK_URL",
      "http://localhost:8080",
    );
    const clientId = this.configService.get<string>(
      "KEYCLOAK_ADMIN_CLIENT_ID",
      "plainledger-api",
    );
    const clientSecret = this.configService.get<string>(
      "KEYCLOAK_CLIENT_SECRET",
    );

    if (!clientSecret) {
      this.logger.warn(
        "KEYCLOAK_CLIENT_SECRET not configured - Keycloak Admin API disabled",
      );
      return;
    }

    try {
      this.adminClient = new KcAdminClient({
        baseUrl,
        realmName: this.realm,
      });

      // Authenticate with service account (client credentials)
      await this.adminClient.auth({
        grantType: "client_credentials",
        clientId,
        clientSecret,
      });

      this.isConfigured = true;
      this.logger.log(
        `Keycloak Admin Client initialized for realm: ${this.realm}`,
      );

      // Set up token refresh (tokens expire after 5 minutes by default)
      this.scheduleTokenRefresh(clientId, clientSecret);
    } catch (error) {
      this.logger.error(
        `Failed to initialize Keycloak Admin Client: ${error.message}`,
      );
      this.isConfigured = false;
    }
  }

  /**
   * Refresh access token before expiry
   */
  private scheduleTokenRefresh(clientId: string, clientSecret: string): void {
    // Refresh every 4 minutes (before 5 minute expiry)
    setInterval(
      async () => {
        try {
          await this.adminClient.auth({
            grantType: "client_credentials",
            clientId,
            clientSecret,
          });
        } catch (error) {
          this.logger.error(
            `Failed to refresh Keycloak Admin token: ${error.message}`,
          );
        }
      },
      4 * 60 * 1000,
    );
  }

  /**
   * Check if admin service is configured and available
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Create a new user in Keycloak
   */
  async createUser(input: CreateUserInput): Promise<KeycloakUser> {
    if (!this.isConfigured) {
      throw new Error("Keycloak Admin Service not configured");
    }

    this.logger.log(`Creating user: ${input.email}`);

    const userRep: UserRepresentation = {
      email: input.email,
      username: input.email, // Use email as username (registrationEmailAsUsername)
      firstName: input.firstName,
      lastName: input.lastName,
      enabled: true,
      emailVerified: input.emailVerified ?? false,
      attributes: input.attributes || {},
      requiredActions: [],
    };

    // If no password provided, user will need to set password via email
    if (!input.password) {
      userRep.requiredActions = ["UPDATE_PASSWORD"];
    }

    // If email not verified, add verification required action
    if (!input.emailVerified && input.sendVerificationEmail !== false) {
      userRep.requiredActions = userRep.requiredActions || [];
      if (!userRep.requiredActions.includes("VERIFY_EMAIL")) {
        userRep.requiredActions.push("VERIFY_EMAIL");
      }
    }

    try {
      // Create user WITHOUT password first (passwords must be set separately in Keycloak)
      // Including credentials in the create payload doesn't reliably set the password
      const response = await this.adminClient.users.create({
        realm: this.realm,
        ...userRep,
      });

      const userId = response.id;
      this.logger.log(`User created with ID: ${userId}`);

      // Set password separately if provided (this is the correct way in Keycloak)
      if (input.password) {
        await this.adminClient.users.resetPassword({
          realm: this.realm,
          id: userId,
          credential: {
            type: "password",
            value: input.password,
            temporary: input.temporaryPassword ?? false,
          },
        });
        this.logger.log(`Password set for user: ${userId}`);
      }

      // Assign roles if specified
      if (input.roles && input.roles.length > 0) {
        await this.assignRoles(userId, input.roles);
      }

      // Send verification email if requested
      if (input.sendVerificationEmail && !input.emailVerified) {
        await this.sendVerificationEmail(userId);
      }

      // Send password reset email if no password was provided
      if (!input.password) {
        await this.sendPasswordResetEmail(userId);
      }

      return {
        id: userId,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        emailVerified: input.emailVerified ?? false,
        enabled: true,
        attributes: input.attributes,
      };
    } catch (error) {
      // Check if user already exists
      if (error.response?.status === 409) {
        this.logger.warn(`User already exists: ${input.email}`);
        const existingUser = await this.findUserByEmail(input.email);
        if (existingUser) {
          return existingUser;
        }
      }
      this.logger.error(`Failed to create user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user by email (implements interface)
   */
  async getUserByEmail(email: string): Promise<KeycloakUser | null> {
    return this.findUserByEmail(email);
  }

  /**
   * Get user by ID (implements interface)
   */
  async getUserById(userId: string): Promise<KeycloakUser | null> {
    return this.findUserById(userId);
  }

  /**
   * Find user by email (internal method)
   */
  async findUserByEmail(email: string): Promise<KeycloakUser | null> {
    if (!this.isConfigured) {
      throw new Error("Keycloak Admin Service not configured");
    }

    try {
      const users = await this.adminClient.users.find({
        realm: this.realm,
        email,
        exact: true,
      });

      if (users.length === 0) {
        return null;
      }

      const user = users[0];
      return {
        id: user.id!,
        email: user.email!,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified ?? false,
        enabled: user.enabled ?? true,
        attributes: user.attributes as Record<string, string[]>,
        createdTimestamp: user.createdTimestamp,
      };
    } catch (error) {
      this.logger.error(`Failed to find user by email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find user by ID (internal method)
   */
  async findUserById(userId: string): Promise<KeycloakUser | null> {
    if (!this.isConfigured) {
      throw new Error("Keycloak Admin Service not configured");
    }

    try {
      const user = await this.adminClient.users.findOne({
        realm: this.realm,
        id: userId,
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id!,
        email: user.email!,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified ?? false,
        enabled: user.enabled ?? true,
        attributes: user.attributes as Record<string, string[]>,
        createdTimestamp: user.createdTimestamp,
      };
    } catch (error) {
      this.logger.error(`Failed to find user by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user attributes
   */
  async updateUserAttributes(input: UpdateUserAttributesInput): Promise<void> {
    if (!this.isConfigured) {
      throw new Error("Keycloak Admin Service not configured");
    }

    this.logger.log(`Updating attributes for user: ${input.userId}`);

    try {
      const existingUser = await this.adminClient.users.findOne({
        realm: this.realm,
        id: input.userId,
      });

      if (!existingUser) {
        throw new Error(`User not found: ${input.userId}`);
      }

      // Merge existing attributes with new ones
      const mergedAttributes = {
        ...existingUser.attributes,
        ...input.attributes,
      };

      await this.adminClient.users.update(
        { realm: this.realm, id: input.userId },
        { attributes: mergedAttributes },
      );

      this.logger.log(`Attributes updated for user: ${input.userId}`);
    } catch (error) {
      this.logger.error(`Failed to update user attributes: ${error.message}`);
      throw error;
    }
  }

  /**
   * Assign realm roles to user
   */
  async assignRoles(userId: string, roleNames: string[]): Promise<void> {
    if (!this.isConfigured) {
      throw new Error("Keycloak Admin Service not configured");
    }

    this.logger.log(
      `Assigning roles ${roleNames.join(", ")} to user: ${userId}`,
    );

    try {
      // Get all realm roles
      const realmRoles = await this.adminClient.roles.find({
        realm: this.realm,
      });

      // Filter to requested roles that have both id and name
      const rolesToAssign = realmRoles
        .filter(
          (role): role is RoleRepresentation & { id: string; name: string } =>
            Boolean(role.id) &&
            Boolean(role.name) &&
            roleNames.includes(role.name!),
        )
        .map((role) => ({ id: role.id, name: role.name }));

      if (rolesToAssign.length === 0) {
        this.logger.warn(
          `No matching roles found for: ${roleNames.join(", ")}`,
        );
        return;
      }

      // Assign roles to user
      await this.adminClient.users.addRealmRoleMappings({
        realm: this.realm,
        id: userId,
        roles: rolesToAssign,
      });

      this.logger.log(`Roles assigned to user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to assign roles: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send verification email to user
   */
  async sendVerificationEmail(userId: string): Promise<void> {
    if (!this.isConfigured) {
      throw new Error("Keycloak Admin Service not configured");
    }

    try {
      await this.adminClient.users.sendVerifyEmail({
        realm: this.realm,
        id: userId,
      });
      this.logger.log(`Verification email sent to user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send password reset email to user
   */
  async sendPasswordResetEmail(userId: string): Promise<void> {
    if (!this.isConfigured) {
      throw new Error("Keycloak Admin Service not configured");
    }

    try {
      await this.adminClient.users.executeActionsEmail({
        realm: this.realm,
        id: userId,
        actions: ["UPDATE_PASSWORD"],
      });
      this.logger.log(`Password reset email sent to user: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Invite team member - creates user with organization attributes
   */
  async inviteTeamMember(input: InviteTeamMemberInput): Promise<KeycloakUser> {
    this.logger.log(
      `Inviting team member: ${input.email} to organization: ${input.organizationName}`,
    );

    // Check if user already exists
    const existingUser = await this.findUserByEmail(input.email);

    if (existingUser) {
      // User exists - update their attributes to add this organization
      await this.updateUserAttributes({
        userId: existingUser.id,
        attributes: {
          organization: [input.organizationId],
          organizationName: [input.organizationName],
          ...(input.industry ? { industry: [input.industry] } : {}),
          invitedBy: [input.invitedBy],
          invitedAt: [new Date().toISOString()],
        },
      });

      // Send email notification about invitation
      await this.sendPasswordResetEmail(existingUser.id);

      return existingUser;
    }

    // Create new user with organization attributes
    return this.createUser({
      email: input.email,
      firstName: input.firstName || "",
      lastName: input.lastName || "",
      emailVerified: false,
      sendVerificationEmail: true,
      attributes: {
        organization: [input.organizationId],
        organizationName: [input.organizationName],
        ...(input.industry ? { industry: [input.industry] } : {}),
        invitedBy: [input.invitedBy],
        invitedAt: [new Date().toISOString()],
      },
      roles: input.role ? [input.role] : ["viewer"], // Default to viewer role
    });
  }

  /**
   * Get all users in an organization (by attribute)
   */
  async getUsersByOrganization(
    organizationId: string,
  ): Promise<KeycloakUser[]> {
    if (!this.isConfigured) {
      throw new Error("Keycloak Admin Service not configured");
    }

    try {
      // Note: Keycloak doesn't support direct attribute search in the free version
      // This requires either:
      // 1. Keycloak extension for attribute search
      // 2. Custom SPI
      // 3. Query all users and filter (not scalable for large user bases)

      // For now, we'll use a workaround with first/max pagination
      const allUsers = await this.adminClient.users.find({
        realm: this.realm,
        max: 1000, // Limit for performance
      });

      // Filter by organization attribute
      return allUsers
        .filter((user) => {
          const orgAttr = user.attributes?.organization;
          return orgAttr && orgAttr.includes(organizationId);
        })
        .map((user) => ({
          id: user.id!,
          email: user.email!,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: user.emailVerified ?? false,
          enabled: user.enabled ?? true,
          attributes: user.attributes as Record<string, string[]>,
          createdTimestamp: user.createdTimestamp,
        }));
    } catch (error) {
      this.logger.error(
        `Failed to get users by organization: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    if (!this.isConfigured) {
      throw new Error("Keycloak Admin Service not configured");
    }

    try {
      await this.adminClient.users.del({
        realm: this.realm,
        id: userId,
      });
      this.logger.log(`User deleted: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to delete user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Disable user
   */
  async disableUser(userId: string): Promise<void> {
    if (!this.isConfigured) {
      throw new Error("Keycloak Admin Service not configured");
    }

    try {
      await this.adminClient.users.update(
        { realm: this.realm, id: userId },
        { enabled: false },
      );
      this.logger.log(`User disabled: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to disable user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Enable user
   */
  async enableUser(userId: string): Promise<void> {
    if (!this.isConfigured) {
      throw new Error("Keycloak Admin Service not configured");
    }

    try {
      await this.adminClient.users.update(
        { realm: this.realm, id: userId },
        { enabled: true },
      );
      this.logger.log(`User enabled: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to enable user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ensure Direct Access Grants is enabled on plainledger-web client
   * Called automatically on module initialization
   */
  private async ensureDirectAccessGrantsEnabled(): Promise<void> {
    try {
      const clients = await this.adminClient.clients.find({
        realm: this.realm,
        clientId: "plainledger-web",
      });

      if (!clients || clients.length === 0) {
        this.logger.warn(
          "plainledger-web client not found - skipping Direct Access Grants check",
        );
        return;
      }

      const client = clients[0];
      if (client.directAccessGrantsEnabled === true) {
        this.logger.log(
          "Direct Access Grants already enabled on plainledger-web client",
        );
        return;
      }

      this.logger.log(
        "Enabling Direct Access Grants on plainledger-web client...",
      );

      if (!client.id) {
        this.logger.warn("Client ID is missing - cannot update");
        return;
      }

      await this.adminClient.clients.update(
        { realm: this.realm, id: client.id },
        {
          ...client,
          directAccessGrantsEnabled: true,
        },
      );
      this.logger.log(
        "✅ Successfully enabled Direct Access Grants on plainledger-web client",
      );
    } catch (error) {
      // Don't fail startup if this fails - log and continue
      this.logger.warn(
        `Failed to enable Direct Access Grants: ${error.message}. This can be done manually in Keycloak Admin Console.`,
      );
    }
  }
}
