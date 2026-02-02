/**
 * PostgreSQL Visualization Repository
 * 
 * Implements IVisualizationRepository using TypeORM.
 */

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { IVisualizationRepository, SavedVisualization } from "@application/ports/outbound/IVisualizationRepository";
import { VisualizationConfig } from "@domain/entities/visualization/types";
import { VisualizationEntity } from "./entities/visualization.entity";

@Injectable()
export class PostgresVisualizationRepository implements IVisualizationRepository {
  constructor(
    @InjectRepository(VisualizationEntity)
    private readonly repository: Repository<VisualizationEntity>,
  ) {}

  async findById(
    id: string,
    organizationId: string,
  ): Promise<SavedVisualization | null> {
    const entity = await this.repository.findOne({
      where: { id, organizationId },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByOrganizationId(
    organizationId: string,
    options?: {
      createdBy?: string;
      category?: string;
      tags?: string[];
      isPublic?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<SavedVisualization[]> {
    const queryBuilder = this.repository
      .createQueryBuilder("viz")
      .where("viz.organization_id = :organizationId", { organizationId });

    if (options?.createdBy) {
      queryBuilder.andWhere("viz.created_by = :createdBy", {
        createdBy: options.createdBy,
      });
    }

    if (options?.category) {
      queryBuilder.andWhere("viz.category = :category", {
        category: options.category,
      });
    }

    if (options?.tags && options.tags.length > 0) {
      queryBuilder.andWhere("viz.tags && :tags", { tags: options.tags });
    }

    if (options?.isPublic !== undefined) {
      queryBuilder.andWhere("viz.is_public = :isPublic", {
        isPublic: options.isPublic,
      });
    }

    queryBuilder
      .orderBy("viz.updated_at", "DESC")
      .take(options?.limit || 100)
      .skip(options?.offset || 0);

    const entities = await queryBuilder.getMany();
    return entities.map((e) => this.toDomain(e));
  }

  async findSharedWith(
    userId: string,
    organizationId: string,
  ): Promise<SavedVisualization[]> {
    const entities = await this.repository.find({
      where: [
        { organizationId, isPublic: true },
        { organizationId, createdBy: userId },
        // TODO: Add shared_with array check when implemented
      ],
      order: { updatedAt: "DESC" },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async save(visualization: SavedVisualization): Promise<SavedVisualization> {
    const entity = this.toEntity(visualization);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async update(
    id: string,
    organizationId: string,
    updates: Partial<SavedVisualization>,
  ): Promise<SavedVisualization> {
    const entity = await this.repository.findOne({
      where: { id, organizationId },
    });

    if (!entity) {
      throw new Error(`Visualization ${id} not found`);
    }

    // Update fields
    if (updates.name !== undefined) entity.name = updates.name;
    if (updates.nameEn !== undefined) entity.nameEn = updates.nameEn;
    if (updates.description !== undefined) entity.description = updates.description;
    if (updates.descriptionEn !== undefined) entity.descriptionEn = updates.descriptionEn;
    if (updates.config !== undefined) entity.config = updates.config as Record<string, unknown>;
    if (updates.isPublic !== undefined) entity.isPublic = updates.isPublic;
    if (updates.tags !== undefined) entity.tags = updates.tags;
    if (updates.category !== undefined) entity.category = updates.category;
    if (updates.thumbnail !== undefined) entity.thumbnail = updates.thumbnail;

    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await this.repository.delete({ id, organizationId });
  }

  async hasAccess(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    const entity = await this.repository.findOne({
      where: { id, organizationId },
    });

    if (!entity) {
      return false;
    }

    // User has access if:
    // 1. They created it
    // 2. It's public within the organization
    return entity.createdBy === userId || entity.isPublic === true;
  }

  async count(
    organizationId: string,
    options?: {
      createdBy?: string;
      category?: string;
      isPublic?: boolean;
    },
  ): Promise<number> {
    const queryBuilder = this.repository
      .createQueryBuilder("viz")
      .where("viz.organization_id = :organizationId", { organizationId });

    if (options?.createdBy) {
      queryBuilder.andWhere("viz.created_by = :createdBy", {
        createdBy: options.createdBy,
      });
    }

    if (options?.category) {
      queryBuilder.andWhere("viz.category = :category", {
        category: options.category,
      });
    }

    if (options?.isPublic !== undefined) {
      queryBuilder.andWhere("viz.is_public = :isPublic", {
        isPublic: options.isPublic,
      });
    }

    return queryBuilder.getCount();
  }

  private toDomain(entity: VisualizationEntity): SavedVisualization {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      name: entity.name,
      nameEn: entity.nameEn,
      description: entity.description,
      descriptionEn: entity.descriptionEn,
      config: entity.config as unknown as VisualizationConfig,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      isPublic: entity.isPublic,
      tags: entity.tags,
      category: entity.category,
      thumbnail: entity.thumbnail,
    };
  }

  private toEntity(visualization: SavedVisualization): VisualizationEntity {
    const entity = new VisualizationEntity();
    entity.id = visualization.id;
    entity.organizationId = visualization.organizationId;
    entity.name = visualization.name;
    entity.nameEn = visualization.nameEn;
    entity.description = visualization.description;
    entity.descriptionEn = visualization.descriptionEn;
    entity.config = visualization.config as Record<string, unknown>;
    entity.createdBy = visualization.createdBy;
    entity.createdAt = visualization.createdAt;
    entity.updatedAt = visualization.updatedAt;
    entity.isPublic = visualization.isPublic;
    entity.tags = visualization.tags;
    entity.category = visualization.category;
    entity.thumbnail = visualization.thumbnail;
    return entity;
  }
}
