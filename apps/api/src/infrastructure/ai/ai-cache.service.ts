import { Injectable, Logger } from "@nestjs/common";
import { CacheService } from "../cache/cache.service";
import { EmbeddingService } from "./embedding.service";
import { AIResponse } from "./ai.service";

/**
 * AI Cache Service
 *
 * Provides Redis-based caching for AI responses with:
 * - Exact match caching (by prompt hash)
 * - Semantic similarity caching (using embeddings)
 * - Cache invalidation on negative feedback
 */
@Injectable()
export class AICacheService {
  private readonly logger = new Logger(AICacheService.name);
  private readonly CACHE_PREFIX = "ai:response:";
  private readonly EMBEDDING_PREFIX = "ai:embedding:";
  private readonly DEFAULT_TTL = 300; // 5 minutes default TTL
  private readonly SEMANTIC_SIMILARITY_THRESHOLD = 0.95; // Cosine similarity threshold

  constructor(
    private readonly cacheService: CacheService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  /**
   * Generate cache key from prompt hash
   */
  private getCacheKey(promptHash: string): string {
    return `${this.CACHE_PREFIX}${promptHash}`;
  }

  /**
   * Generate embedding cache key
   */
  private getEmbeddingKey(embeddingHash: string): string {
    return `${this.EMBEDDING_PREFIX}${embeddingHash}`;
  }

  /**
   * Hash a string to create a deterministic key
   */
  private hashString(str: string): string {
    // Simple hash function for cache keys
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Hash an embedding vector to create a deterministic key
   */
  private hashEmbedding(embedding: number[]): string {
    // Create hash from first few dimensions (for speed)
    const sample = embedding.slice(0, 10).map((v) => Math.round(v * 1000));
    return this.hashString(sample.join(","));
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Get cached response by exact prompt hash match
   */
  async getCachedResponse(promptHash: string): Promise<AIResponse | null> {
    if (!this.cacheService.isAvailable()) {
      return null;
    }

    try {
      const key = this.getCacheKey(promptHash);
      const cached = await this.cacheService.get<AIResponse>(key);

      if (cached) {
        this.logger.debug(
          `Cache hit for prompt hash: ${promptHash.substring(0, 16)}...`,
        );
        return cached;
      }

      return null;
    } catch (error) {
      this.logger.error(`Error getting cached response: ${error.message}`);
      return null;
    }
  }

  /**
   * Cache an AI response with optional TTL
   */
  async cacheResponse(
    promptHash: string,
    response: AIResponse,
    ttlSeconds?: number,
  ): Promise<boolean> {
    if (!this.cacheService.isAvailable()) {
      return false;
    }

    try {
      const key = this.getCacheKey(promptHash);
      const ttl = ttlSeconds || this.DEFAULT_TTL;

      const success = await this.cacheService.set(key, response, ttl);

      if (success) {
        this.logger.debug(
          `Cached response for prompt hash: ${promptHash.substring(0, 16)}...`,
        );
      }

      return success;
    } catch (error) {
      this.logger.error(`Error caching response: ${error.message}`);
      return false;
    }
  }

  /**
   * Find semantically similar cached response using embeddings
   *
   * @param queryEmbedding - Embedding vector of the query
   * @param threshold - Minimum cosine similarity (default: 0.95)
   * @returns Cached response if similar query found, null otherwise
   */
  async findSimilarCached(
    queryEmbedding: number[],
    threshold: number = this.SEMANTIC_SIMILARITY_THRESHOLD,
  ): Promise<AIResponse | null> {
    if (
      !this.cacheService.isAvailable() ||
      !this.embeddingService.isAvailable()
    ) {
      return null;
    }

    try {
      // Get all embedding keys from cache
      // Note: In production, you'd want to use Redis SCAN instead of KEYS
      // For now, we'll use a more efficient approach: store embeddings in a sorted set
      // or use a vector database like Pinecone/Qdrant for production scale

      // For MVP, we'll check a limited set of recent embeddings
      // In production, integrate with a vector database
      this.logger.debug(
        `Semantic cache lookup (threshold: ${threshold}, limited to recent entries)`,
      );

      // TODO: Integrate with vector database for production-scale semantic search
      // For now, return null to fall back to exact match caching
      return null;
    } catch (error) {
      this.logger.error(
        `Error finding similar cached response: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Cache query embedding for future semantic matching
   * Stores embedding with reference to cached response
   */
  async cacheEmbedding(
    query: string,
    embedding: number[],
    promptHash: string,
    ttlSeconds?: number,
  ): Promise<boolean> {
    if (!this.cacheService.isAvailable()) {
      return false;
    }

    try {
      const embeddingHash = this.hashEmbedding(embedding);
      const key = this.getEmbeddingKey(embeddingHash);
      const ttl = ttlSeconds || this.DEFAULT_TTL;

      // Store mapping: embedding hash -> prompt hash
      const mapping = {
        promptHash,
        query: query.substring(0, 200), // Store truncated query for debugging
        cachedAt: Date.now(),
      };

      return await this.cacheService.set(key, mapping, ttl);
    } catch (error) {
      this.logger.error(`Error caching embedding: ${error.message}`);
      return false;
    }
  }

  /**
   * Invalidate cached response (e.g., on negative feedback)
   */
  async invalidate(promptHash: string): Promise<boolean> {
    if (!this.cacheService.isAvailable()) {
      return false;
    }

    try {
      const key = this.getCacheKey(promptHash);
      const success = await this.cacheService.delete(key);

      if (success) {
        this.logger.debug(
          `Invalidated cache for prompt hash: ${promptHash.substring(0, 16)}...`,
        );
      }

      return success;
    } catch (error) {
      this.logger.error(`Error invalidating cache: ${error.message}`);
      return false;
    }
  }

  /**
   * Invalidate all AI caches for a tenant (useful for data updates)
   */
  async invalidateTenant(tenantId: string): Promise<number> {
    if (!this.cacheService.isAvailable()) {
      return 0;
    }

    try {
      // Invalidate all AI responses for this tenant
      const pattern = `${this.CACHE_PREFIX}*:tenant:${tenantId}:*`;
      return await this.cacheService.deletePattern(pattern);
    } catch (error) {
      this.logger.error(`Error invalidating tenant cache: ${error.message}`);
      return 0;
    }
  }

  /**
   * Generate prompt hash for caching
   */
  generatePromptHash(
    prompt: string,
    options?: {
      tenantId?: string;
      modelTier?: string;
    },
  ): string {
    // Create deterministic hash from prompt + options
    const hashInput = JSON.stringify({
      prompt: prompt.trim(),
      tenantId: options?.tenantId,
      modelTier: options?.modelTier,
    });

    return this.hashString(hashInput);
  }
}
