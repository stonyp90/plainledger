import { Organization } from '@domain/entities/Organization';
import { TenantId } from '@domain/value-objects/TenantId';

/**
 * Port (Interface) for Organization Repository
 * Defines the contract for persistence operations
 */
export interface IOrganizationRepository {
  /**
   * Find an organization by its ID
   */
  findById(id: string): Promise<Organization | null>;

  /**
   * Find an organization by tenant ID
   */
  findByTenantId(tenantId: TenantId): Promise<Organization | null>;

  /**
   * Find all organizations (admin only)
   */
  findAll(options?: {
    limit?: number;
    offset?: number;
  }): Promise<Organization[]>;

  /**
   * Save a new organization
   */
  save(organization: Organization): Promise<void>;

  /**
   * Update an existing organization
   */
  update(organization: Organization): Promise<void>;

  /**
   * Delete an organization (soft delete)
   */
  delete(id: string): Promise<void>;

  /**
   * Check if a tenant ID already exists
   */
  existsByTenantId(tenantId: TenantId): Promise<boolean>;
}
