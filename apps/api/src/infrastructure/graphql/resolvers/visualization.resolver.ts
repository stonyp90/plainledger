/**
 * Visualization Resolver
 * 
 * GraphQL resolver for visualization queries, mutations, and execution.
 * Handles CRUD operations for visualizations and custom entities.
 */

import { Resolver, Query, Mutation, Args, Context } from "@nestjs/graphql";
import { UseGuards, Logger, Injectable } from "@nestjs/common";
import { Unprotected } from "nest-keycloak-connect";
import { GqlAuthGuard } from "../guards/gql-auth.guard";
import {
  Visualization,
  CustomEntity,
  QueryResult,
  CreateVisualizationInput,
  UpdateVisualizationInput,
  VisualizationQueryInput,
  CreateCustomEntityInput,
} from "../types/visualization.types";
import { IVisualizationRepository } from "@application/ports/outbound/IVisualizationRepository";
import { ICustomEntityRepository } from "@application/ports/outbound/ICustomEntityRepository";
import { VisualizationQueryService } from "@application/services/visualization-query.service";
import { VisualizationQuery } from "@domain/entities/visualization/VisualizationQuery";
import { FieldSelection } from "@domain/entities/visualization/VisualizationQuery";
import { JoinCondition } from "@domain/entities/visualization/VisualizationQuery";
import { FilterCondition } from "@domain/entities/visualization/VisualizationQuery";
import { CalculatedField } from "@domain/entities/visualization/VisualizationQuery";

// Helper function to generate IDs
function generateId(prefix: string = "viz"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

@Resolver(() => Visualization)
@Unprotected()
@UseGuards(GqlAuthGuard)
@Injectable()
export class VisualizationResolver {
  private readonly logger = new Logger(VisualizationResolver.name);

  constructor(
    private readonly visualizationRepository: IVisualizationRepository,
    private readonly customEntityRepository: ICustomEntityRepository,
    private readonly queryService: VisualizationQueryService,
  ) {}

  // =====================================================
  // QUERIES
  // =====================================================

  @Query(() => [Visualization], {
    name: "visualizations",
    description: "Get all visualizations for the organization",
  })
  async getVisualizations(
    @Context() context: { req: { user: { organizationId: string; userId: string } } },
    @Args("createdBy", { nullable: true }) createdBy?: string,
    @Args("category", { nullable: true }) category?: string,
    @Args("isPublic", { nullable: true }) isPublic?: boolean,
  ): Promise<Visualization[]> {
    const { organizationId, userId } = context.req.user;

    const visualizations = await this.visualizationRepository.findByOrganizationId(
      organizationId,
      {
        createdBy: createdBy || userId,
        category,
        isPublic,
      },
    );

    return visualizations.map((v) => this.toGraphQL(v));
  }

  @Query(() => Visualization, {
    name: "visualization",
    description: "Get a specific visualization by ID",
    nullable: true,
  })
  async getVisualization(
    @Args("id") id: string,
    @Context() context: { req: { user: { organizationId: string; userId: string } } },
  ): Promise<Visualization | null> {
    const { organizationId, userId } = context.req.user;

    const hasAccess = await this.visualizationRepository.hasAccess(
      id,
      userId,
      organizationId,
    );

    if (!hasAccess) {
      return null;
    }

    const visualization = await this.visualizationRepository.findById(
      id,
      organizationId,
    );

    return visualization ? this.toGraphQL(visualization) : null;
  }

  @Query(() => QueryResult, {
    name: "executeVisualizationQuery",
    description: "Execute a visualization query and return results",
  })
  async executeQuery(
    @Args("query") queryInput: VisualizationQueryInput,
    @Args("limit", { nullable: true, defaultValue: 1000 }) limit?: number,
    @Args("offset", { nullable: true, defaultValue: 0 }) offset?: number,
    @Context() context?: { req: { user: { organizationId: string } } },
  ): Promise<QueryResult> {
    const organizationId = context?.req?.user?.organizationId || "default";

    // Convert GraphQL input to domain object
    const query = this.inputToDomainQuery(queryInput, organizationId);

    // Execute query
    const result = await this.queryService.execute(query, organizationId, {
      limit,
      offset,
    });

    // Convert to GraphQL format
    return {
      data: result.data.map((row) =>
        result.columns.map((col) => String(row[col] || "")),
      ),
      columns: result.columns,
      rowCount: result.rowCount,
      executionTimeMs: result.executionTimeMs,
      cached: result.cached,
      truncated: result.truncated,
      maxRows: result.maxRows,
      queryId: result.queryId,
    };
  }

  @Query(() => [CustomEntity], {
    name: "customEntities",
    description: "Get all custom entities for the organization",
  })
  async getCustomEntities(
    @Context() context: { req: { user: { organizationId: string; userId: string } } },
  ): Promise<CustomEntity[]> {
    const { organizationId, userId } = context.req.user;

    const entities = await this.customEntityRepository.findAvailable(
      userId,
      organizationId,
    );

    return entities.map((e) => this.toGraphQLCustomEntity(e));
  }

  @Query(() => CustomEntity, {
    name: "customEntity",
    description: "Get a specific custom entity by ID",
    nullable: true,
  })
  async getCustomEntity(
    @Args("id") id: string,
    @Context() context: { req: { user: { organizationId: string; userId: string } } },
  ): Promise<CustomEntity | null> {
    const { organizationId, userId } = context.req.user;

    const hasAccess = await this.customEntityRepository.hasAccess(
      id,
      userId,
      organizationId,
    );

    if (!hasAccess) {
      return null;
    }

    const entity = await this.customEntityRepository.findById(id, organizationId);
    return entity ? this.toGraphQLCustomEntity(entity) : null;
  }

  // =====================================================
  // MUTATIONS
  // =====================================================

  @Mutation(() => Visualization, {
    name: "createVisualization",
    description: "Create a new visualization",
  })
  async createVisualization(
    @Args("input") input: CreateVisualizationInput,
    @Context() context: { req: { user: { organizationId: string; userId: string } } },
  ): Promise<Visualization> {
    const { organizationId, userId } = context.req.user;

    const query = this.inputToDomainQuery(input.query, organizationId);

    const visualization = await this.visualizationRepository.save({
      id: generateId("viz"),
      organizationId,
      name: input.name,
      nameEn: input.nameEn,
      description: input.description,
      descriptionEn: input.descriptionEn,
      config: {
        chartType: input.chartType,
        query: query.toJSON(),
        category: input.category,
        tags: input.tags,
      } as any,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: input.isPublic || false,
      tags: input.tags,
      category: input.category,
    });

    return this.toGraphQL(visualization);
  }

  @Mutation(() => Visualization, {
    name: "updateVisualization",
    description: "Update an existing visualization",
  })
  async updateVisualization(
    @Args("id") id: string,
    @Args("input") input: UpdateVisualizationInput,
    @Context() context: { req: { user: { organizationId: string; userId: string } } },
  ): Promise<Visualization> {
    const { organizationId, userId } = context.req.user;

    // Check access
    const hasAccess = await this.visualizationRepository.hasAccess(
      id,
      userId,
      organizationId,
    );

    if (!hasAccess) {
      throw new Error("Access denied");
    }

    const updates: any = {};

    if (input.name !== undefined) updates.name = input.name;
    if (input.nameEn !== undefined) updates.nameEn = input.nameEn;
    if (input.description !== undefined) updates.description = input.description;
    if (input.descriptionEn !== undefined) updates.descriptionEn = input.descriptionEn;
    if (input.category !== undefined) updates.category = input.category;
    if (input.tags !== undefined) updates.tags = input.tags;
    if (input.isPublic !== undefined) updates.isPublic = input.isPublic;

    if (input.query) {
      const query = this.inputToDomainQuery(input.query, organizationId);
      updates.config = {
        chartType: input.chartType || "line",
        query: query.toJSON(),
      };
    }

    const updated = await this.visualizationRepository.update(
      id,
      organizationId,
      updates,
    );

    return this.toGraphQL(updated);
  }

  @Mutation(() => Boolean, {
    name: "deleteVisualization",
    description: "Delete a visualization",
  })
  async deleteVisualization(
    @Args("id") id: string,
    @Context() context: { req: { user: { organizationId: string; userId: string } } },
  ): Promise<boolean> {
    const { organizationId, userId } = context.req.user;

    const hasAccess = await this.visualizationRepository.hasAccess(
      id,
      userId,
      organizationId,
    );

    if (!hasAccess) {
      throw new Error("Access denied");
    }

    await this.visualizationRepository.delete(id, organizationId);
    return true;
  }

  @Mutation(() => CustomEntity, {
    name: "createCustomEntity",
    description: "Create a new custom entity",
  })
  async createCustomEntity(
    @Args("input") input: CreateCustomEntityInput,
    @Context() context: { req: { user: { organizationId: string; userId: string } } },
  ): Promise<CustomEntity> {
    const { organizationId, userId } = context.req.user;

    const entity = await this.customEntityRepository.save({
      id: generateId("entity"),
      organizationId,
      name: input.name,
      nameEn: input.nameEn,
      description: input.description,
      descriptionEn: input.descriptionEn,
      icon: input.icon,
      definition: {
        baseSources: input.baseSources as any,
        joins: input.joins as any,
        defaultFields: input.defaultFields,
        calculatedFields: [],
      },
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: input.isPublic || false,
    });

    return this.toGraphQLCustomEntity(entity);
  }

  @Mutation(() => CustomEntity, {
    name: "updateCustomEntity",
    description: "Update an existing custom entity",
  })
  async updateCustomEntity(
    @Args("id") id: string,
    @Args("input") input: Partial<CreateCustomEntityInput>,
    @Context() context: { req: { user: { organizationId: string; userId: string } } },
  ): Promise<CustomEntity> {
    const { organizationId, userId } = context.req.user;

    const hasAccess = await this.customEntityRepository.hasAccess(
      id,
      userId,
      organizationId,
    );

    if (!hasAccess) {
      throw new Error("Access denied");
    }

    const updates: any = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.nameEn !== undefined) updates.nameEn = input.nameEn;
    if (input.description !== undefined) updates.description = input.description;
    if (input.descriptionEn !== undefined) updates.descriptionEn = input.descriptionEn;
    if (input.icon !== undefined) updates.icon = input.icon;
    if (input.isPublic !== undefined) updates.isPublic = input.isPublic;
    if (input.baseSources) updates.baseSources = input.baseSources;
    if (input.joins) updates.joins = input.joins;
    if (input.defaultFields) updates.defaultFields = input.defaultFields;

    const updated = await this.customEntityRepository.update(
      id,
      organizationId,
      updates,
    );

    return this.toGraphQLCustomEntity(updated);
  }

  @Mutation(() => Boolean, {
    name: "deleteCustomEntity",
    description: "Delete a custom entity",
  })
  async deleteCustomEntity(
    @Args("id") id: string,
    @Context() context: { req: { user: { organizationId: string; userId: string } } },
  ): Promise<boolean> {
    const { organizationId, userId } = context.req.user;

    const hasAccess = await this.customEntityRepository.hasAccess(
      id,
      userId,
      organizationId,
    );

    if (!hasAccess) {
      throw new Error("Access denied");
    }

    await this.customEntityRepository.delete(id, organizationId);
    return true;
  }

  // =====================================================
  // HELPERS
  // =====================================================

  private inputToDomainQuery(
    input: VisualizationQueryInput,
    organizationId: string,
  ): VisualizationQuery {
    return VisualizationQuery.create({
      organizationId,
      sources: input.sources,
      fields: input.fields.map((f) => ({
        sourceId: f.sourceId,
        fieldId: f.fieldId,
        alias: f.alias,
        aliasEn: f.aliasEn,
        aggregation: f.aggregation,
        enabled: f.enabled,
      })),
      joins: input.joins?.map((j) => ({
        leftSource: j.leftSource,
        rightSource: j.rightSource,
        leftField: j.leftField,
        rightField: j.rightField,
        type: j.type,
      })),
      filters: input.filters?.map((f) => ({
        id: f.id,
        sourceId: f.sourceId,
        fieldId: f.fieldId,
        operator: f.operator as any,
        value: f.value,
        enabled: f.enabled,
      })),
      calculatedFields: input.calculatedFields?.map((c) => ({
        id: c.id,
        name: c.name,
        nameEn: c.nameEn,
        formula: c.formula,
        returnType: "NUMBER" as any,
      })),
      limit: input.limit,
      offset: input.offset,
    });
  }

  private toGraphQL(visualization: any): Visualization {
    return {
      id: visualization.id,
      organizationId: visualization.organizationId,
      name: visualization.name,
      nameEn: visualization.nameEn,
      description: visualization.description,
      descriptionEn: visualization.descriptionEn,
      chartType: visualization.config?.chartType || "line",
      createdAt: visualization.createdAt,
      updatedAt: visualization.updatedAt,
      isPublic: visualization.isPublic,
      tags: visualization.tags,
      category: visualization.category,
      thumbnail: visualization.thumbnail,
    };
  }

  private toGraphQLCustomEntity(entity: any): CustomEntity {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      name: entity.name,
      nameEn: entity.nameEn,
      description: entity.description,
      descriptionEn: entity.descriptionEn,
      icon: entity.icon,
      createdAt: new Date(entity.createdAt),
      updatedAt: new Date(entity.updatedAt),
      isPublic: entity.isPublic,
    };
  }
}
