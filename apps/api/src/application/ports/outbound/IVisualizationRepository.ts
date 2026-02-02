/**
 * Port (Interface) for Visualization Repository
 * 
 * Persistence layer for saved visualizations (charts, dashboards).
 */

import { VisualizationConfig } from "@domain/entities/visualization/types";

/**
 * Saved visualization entity
 */
export interface SavedVisualization {
  id: string;
  organizationId: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  config: VisualizationConfig;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  tags?: string[];
  category?: string;
  thumbnail?: string;
}

export interface IVisualizationRepository {
  /**
   * Find visualization by ID
   */
  findById(
    id: string,
    organizationId: string,
  ): Promise<SavedVisualization | null>;

  /**
   * Find all visualizations for an organization
   */
  findByOrganizationId(
    organizationId: string,
    options?: {
      createdBy?: string;
      category?: string;
      tags?: string[];
      isPublic?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<SavedVisualization[]>;

  /**
   * Find visualizations shared with a user
   */
  findSharedWith(
    userId: string,
    organizationId: string,
  ): Promise<SavedVisualization[]>;

  /**
   * Save a new visualization
   */
  save(visualization: SavedVisualization): Promise<SavedVisualization>;

  /**
   * Update an existing visualization
   */
  update(
    id: string,
    organizationId: string,
    updates: Partial<SavedVisualization>,
  ): Promise<SavedVisualization>;

  /**
   * Delete a visualization
   */
  delete(id: string, organizationId: string): Promise<void>;

  /**
   * Check if visualization exists and user has access
   */
  hasAccess(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<boolean>;

  /**
   * Count visualizations for an organization
   */
  count(organizationId: string, options?: {
    createdBy?: string;
    category?: string;
    isPublic?: boolean;
  }): Promise<number>;
}
