import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
  Logger,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { Roles } from "nest-keycloak-connect";
import { SimilaritySearchService } from "@application/services/similarity-search.service";
import { EmbeddingService } from "@infrastructure/ai/embedding.service";

class SimilarAccountsQueryDto {
  query: string;
  limit?: number;
  threshold?: number;
}

class SimilarTransactionsQueryDto {
  query: string;
  limit?: number;
  threshold?: number;
}

class CategorizeAccountDto {
  accountName: string;
}

/**
 * Similarity Search Controller
 * Provides semantic search endpoints using pgvector
 */
@Controller("api/v1/similarity")
@ApiTags("similarity")
@ApiBearerAuth()
export class SimilarityController {
  private readonly logger = new Logger(SimilarityController.name);

  constructor(
    private readonly similarityService: SimilaritySearchService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  /**
   * Search for similar accounts
   * GET /api/v1/similarity/accounts?query=office supplies&limit=10&threshold=0.7
   */
  @Get("accounts")
  @Roles({ roles: ["user"] })
  @ApiOperation({
    summary: "Find similar accounts",
    description:
      "Semantic search for accounts similar to the query text using AI embeddings",
  })
  @ApiQuery({
    name: "query",
    description: "Search query text",
    type: String,
    required: true,
  })
  @ApiQuery({
    name: "limit",
    description: "Maximum number of results",
    type: Number,
    required: false,
    example: 10,
  })
  @ApiQuery({
    name: "threshold",
    description: "Minimum similarity threshold (0-1)",
    type: Number,
    required: false,
    example: 0.7,
  })
  @ApiResponse({
    status: 200,
    description: "List of similar accounts",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          accountType: { type: "string" },
          code: { type: "string" },
          similarity: { type: "number" },
        },
      },
    },
  })
  async findSimilarAccounts(
    @Query("organizationId") organizationId: string,
    @Query("query") query: string,
    @Query("limit") limit?: number,
    @Query("threshold") threshold?: number,
  ) {
    if (!organizationId) {
      throw new Error("Organization ID is required");
    }

    if (!query) {
      throw new Error("Query is required");
    }

    const results = await this.similarityService.findSimilarAccounts(
      organizationId,
      query,
      limit ? parseInt(limit.toString(), 10) : 10,
      threshold ? parseFloat(threshold.toString()) : 0.7,
    );

    return {
      query,
      results,
      count: results.length,
    };
  }

  /**
   * Search for similar transactions
   * GET /api/v1/similarity/transactions?query=office supplies purchase&limit=20
   */
  @Get("transactions")
  @Roles({ roles: ["user"] })
  @ApiOperation({
    summary: "Find similar transactions",
    description:
      "Semantic search for transactions similar to the query text using AI embeddings",
  })
  @ApiQuery({
    name: "query",
    description: "Search query text",
    type: String,
    required: true,
  })
  @ApiQuery({
    name: "limit",
    description: "Maximum number of results",
    type: Number,
    required: false,
    example: 20,
  })
  @ApiQuery({
    name: "threshold",
    description: "Minimum similarity threshold (0-1)",
    type: Number,
    required: false,
    example: 0.5,
  })
  @ApiResponse({
    status: 200,
    description: "List of similar transactions",
  })
  async findSimilarTransactions(
    @Query("organizationId") organizationId: string,
    @Query("query") query: string,
    @Query("limit") limit?: number,
    @Query("threshold") threshold?: number,
  ) {
    if (!organizationId) {
      throw new Error("Organization ID is required");
    }

    if (!query) {
      throw new Error("Query is required");
    }

    const results = await this.similarityService.findSimilarTransactions(
      organizationId,
      query,
      limit ? parseInt(limit.toString(), 10) : 20,
      threshold ? parseFloat(threshold.toString()) : 0.5,
    );

    return {
      query,
      results,
      count: results.length,
    };
  }

  /**
   * Suggest account category based on similar accounts
   * POST /api/v1/similarity/categorize
   */
  @Post("categorize")
  @Roles({ roles: ["user"] })
  @ApiOperation({
    summary: "Suggest account category",
    description:
      "AI-assisted account categorization based on semantic similarity to existing accounts",
  })
  @ApiResponse({
    status: 200,
    description: "Suggested category with confidence score",
    schema: {
      type: "object",
      properties: {
        category: { type: "string" },
        confidence: { type: "number" },
      },
    },
  })
  async categorizeAccount(
    @Query("organizationId") organizationId: string,
    @Body() body: CategorizeAccountDto,
  ) {
    if (!organizationId) {
      throw new Error("Organization ID is required");
    }

    if (!body.accountName) {
      throw new Error("Account name is required");
    }

    const suggestion = await this.similarityService.suggestAccountCategory(
      organizationId,
      body.accountName,
    );

    return {
      accountName: body.accountName,
      suggestion,
    };
  }
}
