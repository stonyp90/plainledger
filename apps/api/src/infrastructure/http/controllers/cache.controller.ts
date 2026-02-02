import {
  Controller,
  Post,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  Headers,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";
import { Public } from "nest-keycloak-connect";
import { CacheService } from "@infrastructure/cache/cache.service";
import { ConfigService } from "@nestjs/config";

/**
 * Cache Controller
 * Internal endpoints for cache invalidation
 * Used by Lambda functions after ETL jobs complete
 */
@Controller("internal/cache")
@ApiTags("internal")
export class CacheController {
  private readonly logger = new Logger(CacheController.name);
  private readonly internalToken: string;

  constructor(
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    this.internalToken =
      this.configService.get<string>("INTERNAL_API_TOKEN") || "change-me";
  }

  /**
   * Validate internal API token
   */
  private validateToken(token: string | undefined): void {
    if (!token || token !== this.internalToken) {
      throw new UnauthorizedException("Invalid internal API token");
    }
  }

  /**
   * Invalidate datalake cache for an organization
   * POST /internal/cache/invalidate/:orgId
   */
  @Post("invalidate/:orgId")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Invalidate datalake cache",
    description:
      "Invalidates all cached datalake data for an organization. Used by ETL Lambda after job completion.",
  })
  @ApiParam({
    name: "orgId",
    description: "Organization ID",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Cache invalidated successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        orgId: { type: "string" },
        keysDeleted: { type: "number" },
      },
    },
  })
  async invalidateDatalakeCache(
    @Param("orgId") orgId: string,
    @Headers("x-internal-token") token?: string,
  ): Promise<{
    success: boolean;
    orgId: string;
    keysDeleted: number;
  }> {
    this.validateToken(token);

    if (!orgId) {
      throw new BadRequestException("Organization ID is required");
    }

    this.logger.log(`Invalidating datalake cache for organization: ${orgId}`);

    const keysDeleted = await this.cacheService.invalidateDatalake(orgId);

    this.logger.log(
      `Invalidated ${keysDeleted} cache keys for organization: ${orgId}`,
    );

    return {
      success: true,
      orgId,
      keysDeleted,
    };
  }

  /**
   * Invalidate specific entity cache for an organization
   * POST /internal/cache/invalidate/:orgId/:entity
   */
  @Post("invalidate/:orgId/:entity")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Invalidate specific entity cache",
    description:
      "Invalidates cached data for a specific entity type (accounts, contacts, transactions) for an organization.",
  })
  @ApiParam({
    name: "orgId",
    description: "Organization ID",
    type: String,
  })
  @ApiParam({
    name: "entity",
    description: "Entity type (accounts, contacts, transactions)",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Entity cache invalidated successfully",
  })
  async invalidateEntityCache(
    @Param("orgId") orgId: string,
    @Param("entity") entity: string,
    @Headers("x-internal-token") token?: string,
  ): Promise<{
    success: boolean;
    orgId: string;
    entity: string;
    keysDeleted: number;
  }> {
    this.validateToken(token);

    if (!orgId || !entity) {
      throw new BadRequestException("Organization ID and entity are required");
    }

    const validEntities = ["accounts", "contacts", "transactions", "balances"];
    if (!validEntities.includes(entity)) {
      throw new BadRequestException(
        `Invalid entity. Must be one of: ${validEntities.join(", ")}`,
      );
    }

    this.logger.log(`Invalidating ${entity} cache for organization: ${orgId}`);

    const keysDeleted = await this.cacheService.invalidateDatalake(
      orgId,
      entity,
    );

    this.logger.log(
      `Invalidated ${keysDeleted} cache keys for ${entity} (org: ${orgId})`,
    );

    return {
      success: true,
      orgId,
      entity,
      keysDeleted,
    };
  }
}
