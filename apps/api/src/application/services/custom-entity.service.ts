/**
 * Custom Entity Service
 * 
 * Business logic for managing custom entities (reusable pre-configured joins).
 * Custom entities allow users to create virtual data sources by combining
 * multiple tables with predefined joins.
 */

import { Injectable, Logger } from "@nestjs/common";
import { ICustomEntityRepository } from "@application/ports/outbound/ICustomEntityRepository";
import { IDataSourceMetadataService } from "@application/ports/outbound/IDataSourceMetadataService";
import { CustomEntity } from "@domain/entities/visualization/types";
import { DataSource } from "@domain/entities/visualization/DataSource";
import { JoinType } from "@domain/entities/visualization/DataSource";

@Injectable()
export class CustomEntityService {
  private readonly logger = new Logger(CustomEntityService.name);

  constructor(
    private readonly customEntityRepository: ICustomEntityRepository,
    private readonly metadataService: IDataSourceMetadataService,
  ) {}

  /**
   * Create a custom entity
   */
  async create(
    entity: Omit<CustomEntity, "id" | "createdAt" | "updatedAt">,
  ): Promise<CustomEntity> {
    // Validate that all sources exist
    await this.validateSources(entity.definition.baseSources, entity.organizationId);

    // Validate joins reference valid sources
    await this.validateJoins(entity.definition.joins, entity.definition.baseSources);

    return this.customEntityRepository.save(entity as CustomEntity);
  }

  /**
   * Get custom entity as a virtual data source
   * This allows custom entities to be used in visualizations like regular sources
   */
  async asDataSource(
    entityId: string,
    organizationId: string,
  ): Promise<DataSource | null> {
    const entity = await this.customEntityRepository.findById(
      entityId,
      organizationId,
    );

    if (!entity) {
      return null;
    }

    // Load base source metadata
    const baseSources: DataSource[] = [];
    for (const sourceRef of entity.definition.baseSources) {
      const metadata = await this.metadataService.getSourceMetadata(
        sourceRef.id,
        organizationId,
      );
      if (metadata) {
        baseSources.push(metadata);
      }
    }

    if (baseSources.length === 0) {
      return null;
    }

    // Combine fields from all base sources
    const allFields = baseSources.flatMap((source) =>
      source.fields.map((field) => ({
        ...field.toJSON(),
        sourceId: source.id,
      })),
    );

    // Filter to default fields if specified
    const fields = entity.definition.defaultFields.length > 0
      ? allFields.filter((f) =>
          entity.definition.defaultFields.includes(`${f.sourceId}.${f.id}`),
        )
      : allFields;

    // Create virtual data source
    return DataSource.create({
      id: `custom_${entityId}`,
      name: entity.name,
      nameEn: entity.nameEn || entity.name,
      description: entity.description,
      descriptionEn: entity.descriptionEn,
      type: "fact", // Custom entities are typically fact tables
      icon: entity.icon,
      tableName: `custom_${entityId}`, // Virtual table name
      fields: fields.map((f) => ({
        id: f.id,
        name: f.name,
        nameEn: f.nameEn,
        type: f.type,
        aggregatable: f.aggregatable,
        filterable: f.filterable,
        sortable: f.sortable,
        defaultAggregation: f.defaultAggregation,
      })),
      relationships: entity.definition.joins.map((join: { leftSource: string; rightSource: string; leftField: string; rightField: string; type: JoinType }) => ({
        targetSource: join.rightSource,
        sourceField: join.leftField,
        targetField: join.rightField,
        joinType: join.type,
      })),
    });
  }

  /**
   * Validate that all sources exist
   */
  private async validateSources(
    sourceRefs: Array<{ id: string }>,
    organizationId: string,
  ): Promise<void> {
    for (const sourceRef of sourceRefs) {
      const validation = await this.metadataService.validateSource(
        sourceRef.id,
        organizationId,
      );
      if (!validation.valid) {
        throw new Error(
          `Invalid source ${sourceRef.id}: ${validation.error}`,
        );
      }
    }
  }

  /**
   * Validate that joins reference valid sources
   */
  private async validateJoins(
    joins: Array<{ leftSource: string; rightSource: string; type: JoinType }>,
    baseSources: Array<{ id: string }>,
  ): Promise<void> {
    const sourceIds = new Set(baseSources.map((s) => s.id));

    for (const join of joins) {
      if (!sourceIds.has(join.leftSource)) {
        throw new Error(
          `Join references unknown source: ${join.leftSource}`,
        );
      }
      if (!sourceIds.has(join.rightSource)) {
        throw new Error(
          `Join references unknown source: ${join.rightSource}`,
        );
      }
    }
  }
}
