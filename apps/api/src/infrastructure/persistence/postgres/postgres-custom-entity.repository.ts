/**
 * PostgreSQL Custom Entity Repository
 * 
 * Implements ICustomEntityRepository using TypeORM.
 */

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ICustomEntityRepository } from "@application/ports/outbound/ICustomEntityRepository";
import { CustomEntity } from "@domain/entities/visualization/types";
import { CustomEntityEntity } from "./entities/custom-entity.entity";

@Injectable()
export class PostgresCustomEntityRepository implements ICustomEntityRepository {
  constructor(
    @InjectRepository(CustomEntityEntity)
    private readonly repository: Repository<CustomEntityEntity>,
  ) {}

  async findById(
    id: string,
    organizationId: string,
  ): Promise<CustomEntity | null> {
    const entity = await this.repository.findOne({
      where: { id, organizationId },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByOrganizationId(
    organizationId: string,
    options?: {
      createdBy?: string;
      isPublic?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<CustomEntity[]> {
    const queryBuilder = this.repository
      .createQueryBuilder("entity")
      .where("entity.organization_id = :organizationId", { organizationId });

    if (options?.createdBy) {
      queryBuilder.andWhere("entity.created_by = :createdBy", {
        createdBy: options.createdBy,
      });
    }

    if (options?.isPublic !== undefined) {
      queryBuilder.andWhere("entity.is_public = :isPublic", {
        isPublic: options.isPublic,
      });
    }

    queryBuilder
      .orderBy("entity.created_at", "DESC")
      .take(options?.limit || 100)
      .skip(options?.offset || 0);

    const entities = await queryBuilder.getMany();
    return entities.map((e) => this.toDomain(e));
  }

  async findAvailable(
    userId: string,
    organizationId: string,
  ): Promise<CustomEntity[]> {
    const entities = await this.repository.find({
      where: [
        { organizationId, isPublic: true },
        { organizationId, createdBy: userId },
      ],
      order: { createdAt: "DESC" },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async save(entity: CustomEntity): Promise<CustomEntity> {
    const dbEntity = this.toEntity(entity);
    const saved = await this.repository.save(dbEntity);
    return this.toDomain(saved);
  }

  async update(
    id: string,
    organizationId: string,
    updates: Partial<CustomEntity>,
  ): Promise<CustomEntity> {
    const entity = await this.repository.findOne({
      where: { id, organizationId },
    });

    if (!entity) {
      throw new Error(`Custom entity ${id} not found`);
    }

    if (updates.name !== undefined) entity.name = updates.name;
    if (updates.nameEn !== undefined) entity.nameEn = updates.nameEn;
    if (updates.description !== undefined) entity.description = updates.description;
    if (updates.descriptionEn !== undefined) entity.descriptionEn = updates.descriptionEn;
    if (updates.icon !== undefined) entity.icon = updates.icon;
    if (updates.definition !== undefined) entity.definition = updates.definition as Record<string, unknown>;
    if (updates.isPublic !== undefined) entity.isPublic = updates.isPublic;

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

    return entity.createdBy === userId || entity.isPublic === true;
  }

  async count(
    organizationId: string,
    options?: {
      createdBy?: string;
      isPublic?: boolean;
    },
  ): Promise<number> {
    const queryBuilder = this.repository
      .createQueryBuilder("entity")
      .where("entity.organization_id = :organizationId", { organizationId });

    if (options?.createdBy) {
      queryBuilder.andWhere("entity.created_by = :createdBy", {
        createdBy: options.createdBy,
      });
    }

    if (options?.isPublic !== undefined) {
      queryBuilder.andWhere("entity.is_public = :isPublic", {
        isPublic: options.isPublic,
      });
    }

    return queryBuilder.getCount();
  }

  private toDomain(entity: CustomEntityEntity): CustomEntity {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      name: entity.name,
      nameEn: entity.nameEn,
      description: entity.description,
      descriptionEn: entity.descriptionEn,
      icon: entity.icon,
      definition: entity.definition as any,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      isPublic: entity.isPublic,
    };
  }

  private toEntity(entity: CustomEntity): CustomEntityEntity {
    const dbEntity = new CustomEntityEntity();
    dbEntity.id = entity.id;
    dbEntity.organizationId = entity.organizationId;
    dbEntity.name = entity.name;
    dbEntity.nameEn = entity.nameEn;
    dbEntity.description = entity.description;
    dbEntity.descriptionEn = entity.descriptionEn;
    dbEntity.icon = entity.icon;
    dbEntity.definition = entity.definition as Record<string, unknown>;
    dbEntity.createdBy = entity.createdBy;
    dbEntity.createdAt = new Date(entity.createdAt);
    dbEntity.updatedAt = new Date(entity.updatedAt);
    dbEntity.isPublic = entity.isPublic;
    return dbEntity;
  }
}
