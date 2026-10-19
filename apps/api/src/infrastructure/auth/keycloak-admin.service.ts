/**
 * Keycloak Admin Service
 * Programmatic user management via Keycloak Admin REST API
 *
 * Use cases:
 * - Create users programmatically (admin invite, team invites)
 * - Set user attributes (organization, industry)
 * - Send verification/password reset emails via AWS SES (branded emails)
 * - Manage roles
 *
 * Email System:
 * - All emails (verification, password reset) are sent via AWS SES using SESAdapter
 * - Custom tokens are generated and links point to PlainLedger's custom UI:
 *   - Password reset: /reset-password?token=...
 *   - Email verification: /verify-email?token=...
 * - This ensures consistent branding and user experience instead of Keycloak's default action pages
 * - Production uses Keycloak action emails via its configured SMTP server.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IKeycloakAdminService } from '@application/ports/outbound/IKeycloakAdminService';
import { SESAdapter } from '@infrastructure/adapters/email/ses/ses.adapter';
import * as crypto from 'crypto';
import { authEmailProvider, issueAuthAction } from './action-token';

// Dynamic import for ESM module compatibility
// The @keycloak/keycloak-admin-client v26+ is ESM-only
type KcAdminClientType = import('@keycloak/keycloak-admin-client').default;
type UserRepresentation =
  import('@keycloak/keycloak-admin-client/lib/defs/userRepresentation').default;
type RoleRepresentation =
  import('@keycloak/keycloak-admin-client/lib/defs/roleRepresentation').default;

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
  requiredActions?: string[];
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
export class KeycloakAdminService implements IKeycloakAdminService, OnModuleInit {
  private readonly logger = new Logger(KeycloakAdminService.name);
  // Use definite assignment assertion since we check isConfigured before any use
  private adminClient!: KcAdminClientType;
  private realm: string;
  private isConfigured = false;
  private initInFlight: Promise<void> | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly sesAdapter: SESAdapter,
  ) {
    this.realm = this.configService.get<string>('KEYCLOAK_REALM', 'plainledger');
  }

  async onModuleInit() {
    this.logger.log('[onModuleInit] KeycloakAdminService starting...');
    await this.initializeClient();
    if (this.isConfigured) {
      await this.ensureDirectAccessGrantsEnabled();
    } else {
      // Keycloak may still be starting (DB migrations, realm import). Schedule background
      // retry so the admin client self-heals once Keycloak becomes reachable.
      this.scheduleBackgroundReinit();
    }
    this.logger.log('[onModuleInit] KeycloakAdminService completed');
  }

  /**
   * Background retry loop with capped backoff. Stops once initialization succeeds.
   */
  private scheduleBackgroundReinit(): void {
    const delays = [10_000, 30_000, 60_000];
    let attempt = 0;
    const tryAgain = async () => {
      if (this.isConfigured) return;
      attempt += 1;
      this.logger.log(`Retrying Keycloak Admin init (attempt ${attempt})...`);
      await this.initializeClient();
      if (this.isConfigured) {
        await this.ensureDirectAccessGrantsEnabled();
        return;
      }
      const delay = delays[Math.min(attempt - 1, delays.length - 1)];
      setTimeout(tryAgain, delay);
    };
    setTimeout(tryAgain, delays[0]);
  }

  /**
   * Best-effort lazy re-init triggered when a caller needs the admin client.
   * Returns true once configured, false if still unavailable. Concurrent callers
   * share a single in-flight init attempt so we don't hammer Keycloak.
   */
  async ensureAvailable(): Promise<boolean> {
    if (this.isConfigured) return true;
    if (!this.initInFlight) {
      this.initInFlight = this.initializeClient().finally(() => {
        this.initInFlight = null;
      });
    }
    await this.initInFlight;
    return this.isConfigured;
  }

  /**
   * Initialize Keycloak Admin Client with service account credentials
   * Uses dynamic import for ESM module compatibility
   */
  private async initializeClient(): Promise<void> {
    const baseUrl = this.configService.get<string>('KEYCLOAK_URL', 'http://localhost:8080');
    const clientId = this.configService.get<string>('KEYCLOAK_ADMIN_CLIENT_ID', 'plainledger-api');
    const clientSecret = this.configService.get<string>('KEYCLOAK_CLIENT_SECRET');

    if (!clientSecret) {
      this.logger.warn('KEYCLOAK_CLIENT_SECRET not configured - Keycloak Admin API disabled');
      return;
    }

    try {
      // Dynamic import for ESM module
      // Use Function constructor to prevent TypeScript from transforming import() to require()
      const dynamicImport = new Function('specifier', 'return import(specifier)');
      const KcAdminClientModule = await dynamicImport('@keycloak/keycloak-admin-client');
      const KcAdminClient = KcAdminClientModule.default;

      this.adminClient = new KcAdminClient({
        baseUrl,
        realmName: this.realm,
      });

      // Authenticate with service account (client credentials)
      await this.adminClient.auth({
        grantType: 'client_credentials',
        clientId,
        clientSecret,
      });

      this.isConfigured = true;
      this.logger.log(`Keycloak Admin Client initialized for realm: ${this.realm}`);

      // Set up token refresh (tokens expire after 5 minutes by default)
      this.scheduleTokenRefresh(clientId, clientSecret);
    } catch (error) {
      this.logger.error(`Failed to initialize Keycloak Admin Client: ${error.message}`);
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
          if (this.adminClient) {
            await this.adminClient.auth({
              grantType: 'client_credentials',
              clientId,
              clientSecret,
            });
          }
        } catch (error) {
          this.logger.error(`Failed to refresh Keycloak Admin token: ${error.message}`);
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
      throw new Error('Keycloak Admin Service not configured');
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
      requiredActions: input.requiredActions || [],
    };

    // If no password provided, user will need to set password via email
    if (!input.password) {
      userRep.requiredActions = [...new Set([...(userRep.requiredActions || []), 'UPDATE_PASSWORD'])];
    }

    // NOTE: We do NOT add VERIFY_EMAIL required action here.
    // Email verification is handled by our custom flow via SES with branded templates.
    // Adding VERIFY_EMAIL would trigger Keycloak's unbranded email on login.

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
        try {
          await this.adminClient.users.resetPassword({
            realm: this.realm,
            id: userId,
            credential: {
              type: 'password',
              value: input.password,
              temporary: input.temporaryPassword ?? false,
            },
          });
          this.logger.log(`Password set for user: ${userId}`);
        } catch (passwordError) {
          // If password setting fails, delete the user to avoid orphaned accounts
          this.logger.error(
            `Failed to set password for user ${userId}: ${passwordError.message}. Cleaning up user.`,
          );
          try {
            await this.adminClient.users.del({
              realm: this.realm,
              id: userId,
            });
            this.logger.log(`Cleaned up user ${userId} after password setting failure`);
          } catch (deleteError) {
            this.logger.error(
              `Failed to clean up user ${userId} after password error: ${deleteError.message}`,
            );
          }
          throw new Error(`Failed to set password: ${passwordError.message}`);
        }
      }

      // Assign roles if specified
      if (input.roles && input.roles.length > 0) {
        await this.assignRoles(userId, input.roles);
      }

      // NOTE: Email sending is now handled by the caller using SES for branded emails.
      // The sendVerificationEmail flag is kept for backward compatibility but emails
      // should be sent via SESAdapter for consistent branding.
      // Legacy Keycloak email sending is deprecated - use SES instead.

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
      throw new Error('Keycloak Admin Service not configured');
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
      throw new Error('Keycloak Admin Service not configured');
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
      throw new Error('Keycloak Admin Service not configured');
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
      throw new Error('Keycloak Admin Service not configured');
    }

    this.logger.log(`Assigning roles ${roleNames.join(', ')} to user: ${userId}`);

    try {
      // Get all realm roles
      const realmRoles = await this.adminClient.roles.find({
        realm: this.realm,
      });

      // Filter to requested roles that have both id and name
      const rolesToAssign = realmRoles
        .filter(
          (role): role is RoleRepresentation & { id: string; name: string } =>
            Boolean(role.id) && Boolean(role.name) && roleNames.includes(role.name!),
        )
        .map((role) => ({ id: role.id, name: role.name }));

      if (rolesToAssign.length === 0) {
        this.logger.warn(`No matching roles found for: ${roleNames.join(', ')}`);
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
   * Get token secret for signing tokens
   */
  private generateVerificationToken(userId: string, email: string): string {
    return issueAuthAction(this.configService, 'verify', userId, email);
  }

  private generateResetToken(userId: string, email: string): string {
    return issueAuthAction(this.configService, 'reset', userId, email);
  }

  /**
   * Send verification email to user
   * Uses SES with custom tokens to ensure links point to custom UI
   * instead of Keycloak's default action pages
   */
  async sendVerificationEmail(userId: string, redirectUri?: string): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('Keycloak Admin Service not configured');
    }

    if (authEmailProvider(this.configService) === 'keycloak') {
      const webUrl = this.configService.get<string>('FRONTEND_URL') || this.configService.get<string>('WEB_URL');
      await this.adminClient.users.executeActionsEmail({
        realm: this.realm, id: userId, clientId: 'plainledger-web', actions: ['VERIFY_EMAIL'], lifespan: 86400,
        ...(redirectUri || webUrl ? { redirectUri: redirectUri || webUrl } : {}),
      });
      return;
    }

    try {
      // Get user details for email personalization
      const user = await this.findUserById(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      if (!user.email) {
        throw new Error(`User ${userId} has no email address`);
      }

      // Generate custom verification token
      const verificationToken = this.generateVerificationToken(userId, user.email);

      // Build verification URL pointing to custom UI
      const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'https://plainledger.ca');
      const verifyUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

      // Send branded email via SES
      const emailSent = await this.sesAdapter.sendVerificationEmail(
        user.email,
        user.firstName || 'there',
        verifyUrl,
        userId,
      );

      if (emailSent) {
        this.logger.log(`Verification email sent via SES to user: ${userId} (${user.email})`);
      } else {
        this.logger.warn(
          `Failed to send verification email via SES to user: ${userId} (${user.email})`,
        );
        throw new Error('Failed to send verification email');
      }
    } catch (error) {
      this.logger.error(`Failed to send verification email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Directly set email as verified for a user (Admin action)
   * Use this for admin-initiated verification or when user verification link fails
   */
  async setEmailVerified(userId: string, verified: boolean = true): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('Keycloak Admin Service not configured');
    }

    try {
      const existingUser = await this.adminClient.users.findOne({
        realm: this.realm,
        id: userId,
      });
      const requiredActions = (existingUser?.requiredActions || []).filter(
        (action) => action !== 'VERIFY_EMAIL',
      );

      await this.adminClient.users.update(
        { realm: this.realm, id: userId },
        { emailVerified: verified, requiredActions },
      );
      this.logger.log(`Email verified status set to ${verified} for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to set email verified status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send password reset email to user
   * Uses SES with custom tokens to ensure links point to custom UI
   * instead of Keycloak's default action pages
   */
  async sendPasswordResetEmail(userId: string, redirectUri?: string): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('Keycloak Admin Service not configured');
    }

    if (authEmailProvider(this.configService) === 'keycloak') {
      const webUrl = this.configService.get<string>('FRONTEND_URL') || this.configService.get<string>('WEB_URL');
      await this.adminClient.users.executeActionsEmail({
        realm: this.realm, id: userId, clientId: 'plainledger-web', actions: ['UPDATE_PASSWORD'], lifespan: 900,
        ...(redirectUri || webUrl ? { redirectUri: redirectUri || webUrl } : {}),
      });
      return;
    }

    try {
      // Get user details for email personalization
      const user = await this.findUserById(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      if (!user.email) {
        throw new Error(`User ${userId} has no email address`);
      }

      // Generate custom password reset token
      const resetToken = this.generateResetToken(userId, user.email);

      // Build reset URL pointing to custom UI
      const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'https://plainledger.ca');
      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

      // Send branded email via SES
      const emailSent = await this.sesAdapter.sendPasswordResetEmail(
        user.email,
        user.firstName || 'there',
        resetUrl,
        userId,
      );

      if (emailSent) {
        this.logger.log(`Password reset email sent via SES to user: ${userId} (${user.email})`);
      } else {
        this.logger.warn(
          `Failed to send password reset email via SES to user: ${userId} (${user.email})`,
        );
        throw new Error('Failed to send password reset email');
      }
    } catch (error) {
      this.logger.error(`Failed to send password reset email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Invite team member - creates user with organization attributes
   * NOTE: This method does NOT send emails - the caller should send branded emails via SES
   * @returns The user (existing or newly created) and whether they already existed
   */
  async inviteTeamMember(
    input: InviteTeamMemberInput,
  ): Promise<KeycloakUser & { isExisting: boolean }> {
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

      // NOTE: Email sending is now handled by caller via SES for branding consistency
      // Do NOT call sendPasswordResetEmail here - let controller send branded email

      return { ...existingUser, isExisting: true };
    }

    // Create new user with organization attributes
    // NOTE: sendVerificationEmail is false - caller will send via SES
    const newUser = await this.createUser({
      email: input.email,
      firstName: input.firstName || '',
      lastName: input.lastName || '',
      emailVerified: false,
      sendVerificationEmail: false, // Caller sends branded email via SES
      attributes: {
        organization: [input.organizationId],
        organizationName: [input.organizationName],
        ...(input.industry ? { industry: [input.industry] } : {}),
        invitedBy: [input.invitedBy],
        invitedAt: [new Date().toISOString()],
      },
      roles: input.role ? [input.role] : ['viewer'], // Default to viewer role
    });

    return { ...newUser, isExisting: false };
  }

  /**
   * Get all users in an organization (by attribute)
   */
  async getUsersByOrganization(organizationId: string): Promise<KeycloakUser[]> {
    if (!this.isConfigured) {
      throw new Error('Keycloak Admin Service not configured');
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
      this.logger.error(`Failed to get users by organization: ${error.message}`);
      throw error;
    }
  }

  /**
   * List all users from Keycloak with pagination and search
   */
  async listUsers(
    options: {
      search?: string;
      first?: number;
      max?: number;
    } = {},
  ): Promise<{ users: KeycloakUser[]; total: number }> {
    if (!this.isConfigured) {
      this.logger.warn('Keycloak Admin Service not configured, returning empty users list');
      return { users: [], total: 0 };
    }

    try {
      const { search, first = 0, max = 50 } = options;

      // Get total count first
      const countResult = await this.adminClient.users.count({
        realm: this.realm,
        ...(search ? { search } : {}),
      });
      const total = typeof countResult === 'number' ? countResult : 0;

      // Get paginated users
      const keycloakUsers = await this.adminClient.users.find({
        realm: this.realm,
        first,
        max,
        ...(search ? { search } : {}),
      });

      const users: KeycloakUser[] = keycloakUsers.map((user) => ({
        id: user.id!,
        email: user.email!,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified ?? false,
        enabled: user.enabled ?? true,
        attributes: user.attributes as Record<string, string[]>,
        createdTimestamp: user.createdTimestamp,
      }));

      return { users, total };
    } catch (error) {
      this.logger.error(`Failed to list users from Keycloak: ${error.message}`);
      return { users: [], total: 0 };
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('Keycloak Admin Service not configured');
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
      throw new Error('Keycloak Admin Service not configured');
    }

    try {
      await this.adminClient.users.update({ realm: this.realm, id: userId }, { enabled: false });
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
      throw new Error('Keycloak Admin Service not configured');
    }

    try {
      await this.adminClient.users.update({ realm: this.realm, id: userId }, { enabled: true });
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
    // Production authentication policy is managed by the realm, never changed at startup.
    if (this.configService.get<string>('NODE_ENV') !== 'development') return;
    try {
      const clients = await this.adminClient.clients.find({
        realm: this.realm,
        clientId: 'plainledger-web',
      });

      if (!clients || clients.length === 0) {
        this.logger.warn('plainledger-web client not found - skipping Direct Access Grants check');
        return;
      }

      const client = clients[0];
      if (client.directAccessGrantsEnabled === true) {
        this.logger.log('Direct Access Grants already enabled on plainledger-web client');
        return;
      }

      this.logger.log('Enabling Direct Access Grants on plainledger-web client...');

      if (!client.id) {
        this.logger.warn('Client ID is missing - cannot update');
        return;
      }

      await this.adminClient.clients.update(
        { realm: this.realm, id: client.id },
        {
          ...client,
          directAccessGrantsEnabled: true,
        },
      );
      this.logger.log('✅ Successfully enabled Direct Access Grants on plainledger-web client');
    } catch (error) {
      // Don't fail startup if this fails - log and continue
      this.logger.warn(
        `Failed to enable Direct Access Grants: ${error.message}. This can be done manually in Keycloak Admin Console.`,
      );
    }
  }
}
