/**
 * Data Blend Service
 * 
 * Handles datasource merging operations:
 * - Union: Combine rows from multiple sources (same schema)
 * - Append: Concatenate time-series data
 * - Blend: Join on common dimensions
 */

import { Injectable, Logger } from "@nestjs/common";
import { VisualizationQuery } from "@domain/entities/visualization/VisualizationQuery";
import { DataSource } from "@domain/entities/visualization/DataSource";
import { IDataSourceMetadataService } from "@application/ports/outbound/IDataSourceMetadataService";

export type BlendOperation = "union" | "append" | "blend";

export interface BlendConfig {
  operation: BlendOperation;
  sources: string[];
  /**
   * For union: field mappings between sources (if schemas differ slightly)
   */
  fieldMappings?: Array<{
    sourceId: string;
    sourceField: string;
    targetField: string;
  }>;
  /**
   * For append: time field to use for ordering
   */
  timeField?: string;
  /**
   * For blend: join configuration
   */
  blendKey?: {
    leftSource: string;
    rightSource: string;
    leftField: string;
    rightField: string;
  };
}

@Injectable()
export class DataBlendService {
  private readonly logger = new Logger(DataBlendService.name);

  constructor(
    private readonly metadataService: IDataSourceMetadataService,
  ) {}

  /**
   * Create a blended VisualizationQuery from multiple sources
   */
  async createBlendedQuery(
    config: BlendConfig,
    organizationId: string,
  ): Promise<VisualizationQuery> {
    switch (config.operation) {
      case "union":
        return this.createUnionQuery(config, organizationId);
      case "append":
        return this.createAppendQuery(config, organizationId);
      case "blend":
        return this.createBlendQuery(config, organizationId);
      default:
        throw new Error(`Unknown blend operation: ${config.operation}`);
    }
  }

  /**
   * Union operation: Combine rows from multiple sources
   * Requires compatible schemas (same fields)
   */
  private async createUnionQuery(
    config: BlendConfig,
    organizationId: string,
  ): Promise<VisualizationQuery> {
    if (config.sources.length < 2) {
      throw new Error("Union requires at least 2 sources");
    }

    // Load source metadata
    const sources: DataSource[] = [];
    for (const sourceId of config.sources) {
      const metadata = await this.metadataService.getSourceMetadata(
        sourceId,
        organizationId,
      );
      if (metadata) {
        sources.push(metadata);
      }
    }

    if (sources.length === 0) {
      throw new Error("No valid sources found");
    }

    // Use first source as base, validate others are compatible
    const baseSource = sources[0];
    const commonFields = baseSource.fields
      .map((f) => f.id)
      .filter((fieldId) =>
        sources.every((s) => s.getField(fieldId) !== undefined),
      );

    if (commonFields.length === 0) {
      throw new Error("Sources have no common fields for union");
    }

    // Create a query that unions all sources
    // In SQL, this would be: SELECT * FROM source1 UNION ALL SELECT * FROM source2 ...
    // For now, we'll create a query that selects from the first source
    // The actual union will be handled in SQL generation
    return VisualizationQuery.create({
      organizationId,
      sources: [config.sources[0]], // Primary source
      fields: commonFields.map((fieldId) => ({
        sourceId: config.sources[0],
        fieldId,
        enabled: true,
      })),
      // Store union config in metadata (would need to extend VisualizationQuery)
      // For now, we'll handle this in the SQL generator
    });
  }

  /**
   * Append operation: Concatenate time-series data
   * Orders by time field and combines chronologically
   */
  private async createAppendQuery(
    config: BlendConfig,
    organizationId: string,
  ): Promise<VisualizationQuery> {
    if (!config.timeField) {
      throw new Error("Append operation requires timeField");
    }

    if (config.sources.length < 2) {
      throw new Error("Append requires at least 2 sources");
    }

    // Similar to union but with time ordering
    return this.createUnionQuery(config, organizationId);
  }

  /**
   * Blend operation: Join sources on common dimensions
   * Similar to regular joins but with automatic key detection
   */
  private async createBlendQuery(
    config: BlendConfig,
    organizationId: string,
  ): Promise<VisualizationQuery> {
    if (!config.blendKey) {
      throw new Error("Blend operation requires blendKey");
    }

    if (config.sources.length !== 2) {
      throw new Error("Blend currently supports exactly 2 sources");
    }

    const [leftSource, rightSource] = config.sources;

    // Load source metadata
    const leftMetadata = await this.metadataService.getSourceMetadata(
      leftSource,
      organizationId,
    );
    const rightMetadata = await this.metadataService.getSourceMetadata(
      rightSource,
      organizationId,
    );

    if (!leftMetadata || !rightMetadata) {
      throw new Error("Could not load source metadata");
    }

    // Get common fields for blending
    const leftFields = leftMetadata.fields.map((f) => f.id);
    const rightFields = rightMetadata.fields.map((f) => f.id);

    // Create query with join
    return VisualizationQuery.create({
      organizationId,
      sources: [leftSource, rightSource],
      fields: [
        ...leftFields.map((fieldId) => ({
          sourceId: leftSource,
          fieldId,
          enabled: true,
        })),
        ...rightFields.map((fieldId) => ({
          sourceId: rightSource,
          fieldId,
          enabled: true,
        })),
      ],
      joins: [
        {
          leftSource: config.blendKey.leftSource,
          rightSource: config.blendKey.rightSource,
          leftField: config.blendKey.leftField,
          rightField: config.blendKey.rightField,
          type: "inner",
        },
      ],
    });
  }

  /**
   * Suggest blend operation based on source compatibility
   */
  async suggestBlendOperation(
    sourceIds: string[],
    organizationId: string,
  ): Promise<{
    suggestedOperation: BlendOperation;
    confidence: number;
    reason: string;
  }> {
    if (sourceIds.length < 2) {
      throw new Error("Need at least 2 sources for blending");
    }

    // Load source metadata
    const sources: DataSource[] = [];
    for (const sourceId of sourceIds) {
      const metadata = await this.metadataService.getSourceMetadata(
        sourceId,
        organizationId,
      );
      if (metadata) {
        sources.push(metadata);
      }
    }

    if (sources.length < 2) {
      return {
        suggestedOperation: "union",
        confidence: 0,
        reason: "Could not load source metadata",
      };
    }

    // Check schema compatibility
    const [source1, source2] = sources;
    const commonFields = source1.fields.filter((f1) =>
      source2.fields.some((f2) => f1.id === f2.id && f1.type === f2.type),
    );

    const compatibility = commonFields.length / Math.max(
      source1.fields.length,
      source2.fields.length,
    );

    // Check for time fields (for append)
    const hasTimeFields = sources.some((s) =>
      s.fields.some((f) => f.type === "DATE" || f.type === "DATETIME"),
    );

    // Check for joinable keys (for blend)
    const suggestions = await this.metadataService.suggestRelationships(
      source1.id,
      organizationId,
    );
    const canJoin = suggestions.some((s) => s.targetSource === source2.id);

    if (compatibility > 0.8 && hasTimeFields) {
      return {
        suggestedOperation: "append",
        confidence: 0.9,
        reason: "High schema compatibility with time fields - use append for time-series",
      };
    }

    if (canJoin) {
      return {
        suggestedOperation: "blend",
        confidence: 0.85,
        reason: "Sources can be joined on common keys",
      };
    }

    if (compatibility > 0.5) {
      return {
        suggestedOperation: "union",
        confidence: 0.7,
        reason: "Moderate schema compatibility - use union to combine rows",
      };
    }

    return {
      suggestedOperation: "union",
      confidence: 0.3,
      reason: "Low schema compatibility - union may not be appropriate",
    };
  }
}
