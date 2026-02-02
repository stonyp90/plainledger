/**
 * Port (Interface) for Custom Entity Repository
 * 
 * Persistence layer for custom entities (reusable pre-configured joins).
 */

import { CustomEntity } from "@domain/entities/visualization/types";

export interface ICustomEntityRepository {
  /**
   * Find custom entity by ID
   */
  findById(
    id: string,
    organizationId: string,
  ): Promise<CustomEntity | null>;

  /**
   * Find all custom entities for an organization
   */
  findByOrganizationId(
    organizationId: string,
    options?: {
      createdBy?: string;
      isPublic?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<CustomEntity[]>;

  /**
   * Find custom entities available to a user (public + owned)
   */
  findAvailable(
    userId: string,
    organizationId: string,
  ): Promise<CustomEntity[]>;

  /**
   * Save a new custom entity
   */
  save(entity: CustomEntity): Promise<CustomEntity>;

  /**
   * Update an existing custom entity
   */
  update(
    id: string,
    organizationId: string,
    updates: Partial<CustomEntity>,
  ): Promise<CustomEntity>;

  /**
   * Delete a custom entity
   */
  delete(id: string, organizationId: string): Promise<void>;

  /**
   * Check if custom entity exists and user has access
   */
  hasAccess(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<boolean>;

  /**
   * Count custom entities for an organization
   */
  count(organizationId: string, options?: {
    createdBy?: string;
    isPublic?: boolean;
  }): Promise<number>;
}
