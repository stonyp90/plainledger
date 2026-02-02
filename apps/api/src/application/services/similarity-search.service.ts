import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AccountEntity } from "@infrastructure/persistence/postgres/entities/account.entity";
import { EmbeddingService } from "@infrastructure/ai/embedding.service";

export interface SimilarAccount {
  id: string;
  name: string;
  accountType: string;
  code: string;
  similarity: number;
}

export interface SimilarTransaction {
  id: string;
  description: string;
  amount: number;
  transactionDate: string;
  similarity: number;
}

/**
 * Similarity Search Service
 * Provides semantic search capabilities using pgvector
 */
@Injectable()
export class SimilaritySearchService {
  private readonly logger = new Logger(SimilaritySearchService.name);

  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    private readonly embeddingService: EmbeddingService,
  ) {}

  /**
   * Find similar accounts based on semantic similarity
   * @param organizationId Organization ID
   * @param query Search query text
   * @param limit Maximum number of results (default: 10)
   * @param threshold Minimum similarity threshold (0-1, default: 0.7)
   */
  async findSimilarAccounts(
    organizationId: string,
    query: string,
    limit: number = 10,
    threshold: number = 0.7,
  ): Promise<SimilarAccount[]> {
    if (!this.embeddingService.isAvailable()) {
      this.logger.warn(
        "Embedding service not available, returning empty results",
      );
      return [];
    }

    try {
      // Generate embedding for query
      const queryEmbedding =
        await this.embeddingService.generateEmbedding(query);
      const vectorString =
        this.embeddingService.embeddingToVectorString(queryEmbedding);

      // Use PostgreSQL similarity search function
      const results = await this.accountRepository.query(
        `
        SELECT 
          id,
          name,
          account_type as "accountType",
          code,
          1 - (embedding <=> $1::vector) as similarity
        FROM accounting.accounts
        WHERE 
          organization_id = $2
          AND embedding IS NOT NULL
          AND 1 - (embedding <=> $1::vector) > $3
        ORDER BY embedding <=> $1::vector
        LIMIT $4
      `,
        [vectorString, organizationId, threshold, limit],
      );

      return results.map((row: any) => ({
        id: row.id,
        name: row.name,
        accountType: row.accountType,
        code: row.code,
        similarity: parseFloat(row.similarity),
      }));
    } catch (error) {
      this.logger.error(`Failed to find similar accounts: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find similar transactions based on semantic similarity
   * Note: Requires transactions table with embedding column
   */
  async findSimilarTransactions(
    organizationId: string,
    query: string,
    limit: number = 20,
    threshold: number = 0.5,
  ): Promise<SimilarTransaction[]> {
    if (!this.embeddingService.isAvailable()) {
      this.logger.warn(
        "Embedding service not available, returning empty results",
      );
      return [];
    }

    try {
      // Generate embedding for query
      const queryEmbedding =
        await this.embeddingService.generateEmbedding(query);
      const vectorString =
        this.embeddingService.embeddingToVectorString(queryEmbedding);

      // Use PostgreSQL similarity search function
      // Note: This assumes a transactions table exists with embedding column
      const results = await this.accountRepository.query(
        `
        SELECT 
          id,
          description,
          amount,
          transaction_date as "transactionDate",
          1 - (embedding <=> $1::vector) as similarity
        FROM accounting.transactions
        WHERE 
          organization_id = $2
          AND embedding IS NOT NULL
          AND 1 - (embedding <=> $1::vector) > $3
        ORDER BY embedding <=> $1::vector
        LIMIT $4
      `,
        [vectorString, organizationId, threshold, limit],
      );

      return results.map((row: any) => ({
        id: row.id,
        description: row.description,
        amount: parseFloat(row.amount),
        transactionDate: row.transactionDate,
        similarity: parseFloat(row.similarity),
      }));
    } catch (error) {
      this.logger.error(
        `Failed to find similar transactions: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Suggest account category based on similar accounts
   * @param organizationId Organization ID
   * @param accountName Account name to categorize
   * @returns Suggested category with confidence score
   */
  async suggestAccountCategory(
    organizationId: string,
    accountName: string,
  ): Promise<{ category: string; confidence: number } | null> {
    const similarAccounts = await this.findSimilarAccounts(
      organizationId,
      accountName,
      5,
      0.6,
    );

    if (similarAccounts.length === 0) {
      return null;
    }

    // Find most common account type among similar accounts
    const typeCounts = new Map<
      string,
      { count: number; totalSimilarity: number }
    >();

    for (const account of similarAccounts) {
      const existing = typeCounts.get(account.accountType) || {
        count: 0,
        totalSimilarity: 0,
      };
      typeCounts.set(account.accountType, {
        count: existing.count + 1,
        totalSimilarity: existing.totalSimilarity + account.similarity,
      });
    }

    // Find category with highest average similarity
    let bestCategory: string | null = null;
    let bestConfidence = 0;

    for (const [category, stats] of typeCounts.entries()) {
      const avgSimilarity = stats.totalSimilarity / stats.count;
      if (avgSimilarity > bestConfidence) {
        bestCategory = category;
        bestConfidence = avgSimilarity;
      }
    }

    return bestCategory
      ? { category: bestCategory, confidence: bestConfidence }
      : null;
  }
}
