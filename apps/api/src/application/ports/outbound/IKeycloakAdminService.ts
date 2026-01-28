/**
 * Port (Interface) for Keycloak Admin Service
 * Defines the contract for user management operations
 */

import {
  CreateUserInput,
  UpdateUserAttributesInput,
  InviteTeamMemberInput,
  KeycloakUser,
} from "@infrastructure/auth/keycloak-admin.service";

export interface IKeycloakAdminService {
  /**
   * Check if admin service is configured and available
   */
  isAvailable(): boolean;

  /**
   * Create a new user in Keycloak
   */
  createUser(input: CreateUserInput): Promise<KeycloakUser>;

  /**
   * Update user attributes
   */
  updateUserAttributes(input: UpdateUserAttributesInput): Promise<void>;

  /**
   * Invite a team member
   */
  inviteTeamMember(input: InviteTeamMemberInput): Promise<KeycloakUser>;

  /**
   * Get user by email
   */
  getUserByEmail(email: string): Promise<KeycloakUser | null>;

  /**
   * Get user by ID
   */
  getUserById(userId: string): Promise<KeycloakUser | null>;

  /**
   * Find user by email (internal method, also exposed for compatibility)
   */
  findUserByEmail(email: string): Promise<KeycloakUser | null>;

  /**
   * Find user by ID (internal method, also exposed for compatibility)
   */
  findUserById(userId: string): Promise<KeycloakUser | null>;

  /**
   * Get all users in an organization
   */
  getUsersByOrganization(organizationId: string): Promise<KeycloakUser[]>;

  /**
   * Disable a user
   */
  disableUser(userId: string): Promise<void>;

  /**
   * Send password reset email
   */
  sendPasswordResetEmail(userId: string): Promise<void>;

  /**
   * Send verification email with optional redirect URI
   */
  sendVerificationEmail(userId: string, redirectUri?: string): Promise<void>;

  /**
   * Directly set email as verified for a user (Admin action)
   */
  setEmailVerified(userId: string, verified?: boolean): Promise<void>;
}
