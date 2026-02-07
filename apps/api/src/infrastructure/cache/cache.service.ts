import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

/**
 * Cache Service
 * Provides Redis-based caching for settings and other frequently accessed data
 */
@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis | null = null;
  private readonly defaultTtl = 3600; // 1 hour default TTL

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.logger.log("[onModuleInit] CacheService starting...");
    const redisHost =
      this.configService.get<string>("REDIS_HOST") || "localhost";
    const redisPort = parseInt(
      this.configService.get<string>("REDIS_PORT") || "6379",
      10,
    );
    const redisPassword = this.configService.get<string>("REDIS_PASSWORD");

    try {
      this.redis = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword || undefined,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      });

      this.redis.on("connect", () => {
        this.logger.log(`Connected to Redis at ${redisHost}:${redisPort}`);
      });

      this.redis.on("error", (error) => {
        this.logger.error(`Redis error: ${error.message}`);
      });

      // Test connection
      await this.redis.ping();
      this.logger.log("Redis cache service initialized");
    } catch (error) {
      this.logger.warn(
        `Failed to connect to Redis: ${error.message}. Caching will be disabled.`,
      );
      this.redis = null;
    }
    this.logger.log("[onModuleInit] CacheService completed");
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log("Redis connection closed");
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.redis !== null && this.redis.status === "ready";
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const value = await this.redis!.get(key);
      if (value === null) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      const ttl = ttlSeconds || this.defaultTtl;
      await this.redis!.setex(key, ttl, serialized);
      return true;
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.redis!.del(key);
      return true;
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      const keys = await this.redis!.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      await this.redis!.del(...keys);
      return keys.length;
    } catch (error) {
      this.logger.error(
        `Cache delete pattern error for ${pattern}: ${error.message}`,
      );
      return 0;
    }
  }

  /**
   * Invalidate cache for organization settings
   */
  async invalidateOrganizationSettings(organizationId: string): Promise<void> {
    await this.deletePattern(`org:settings:${organizationId}:*`);
    await this.delete(`org:settings:${organizationId}`);
  }

  /**
   * Invalidate cache for user settings
   */
  async invalidateUserSettings(userId: string): Promise<void> {
    await this.deletePattern(`user:settings:${userId}:*`);
    await this.delete(`user:settings:${userId}`);
  }

  /**
   * Get cache key for organization settings
   */
  getOrganizationSettingsKey(organizationId: string): string {
    return `org:settings:${organizationId}`;
  }

  /**
   * Get cache key for user settings
   */
  getUserSettingsKey(userId: string): string {
    return `user:settings:${userId}`;
  }

  /**
   * Get cache key for datalake entity
   * Format: datalake:{orgId}:{entity}:{filterHash}
   */
  getDatalakeKey(
    orgId: string,
    entity: string,
    filters?: Record<string, any>,
  ): string {
    const baseKey = `datalake:${orgId}:${entity}`;
    if (!filters || Object.keys(filters).length === 0) {
      return baseKey;
    }
    // Create deterministic hash from filters
    const filterStr = JSON.stringify(
      Object.keys(filters)
        .sort()
        .reduce(
          (acc, key) => {
            acc[key] = filters[key];
            return acc;
          },
          {} as Record<string, any>,
        ),
    );
    const filterHash = Buffer.from(filterStr).toString("base64").slice(0, 16);
    return `${baseKey}:${filterHash}`;
  }

  /**
   * Invalidate all datalake cache for an organization
   * Optionally invalidate specific entity type
   */
  async invalidateDatalake(orgId: string, entity?: string): Promise<number> {
    const pattern = entity
      ? `datalake:${orgId}:${entity}*`
      : `datalake:${orgId}:*`;
    return this.deletePattern(pattern);
  }

  /**
   * Request deduplication: ensures only one request per key is in flight
   * Prevents duplicate concurrent S3 API calls
   */
  private pendingRequests = new Map<string, Promise<any>>();

  /**
   * Get from cache or fetch, with request deduplication
   * If multiple requests come for the same key simultaneously,
   * they share the same fetch promise
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds?: number,
  ): Promise<T> {
    // Check cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Check if request is already in flight
    const pending = this.pendingRequests.get(key);
    if (pending) {
      this.logger.debug(
        `Request deduplication: reusing pending fetch for ${key}`,
      );
      return pending as Promise<T>;
    }

    // Create new fetch promise
    const fetchPromise = (async () => {
      try {
        const value = await fetcher();
        // Cache the result
        await this.set(key, value, ttlSeconds);
        return value;
      } finally {
        // Remove from pending requests
        this.pendingRequests.delete(key);
      }
    })();

    this.pendingRequests.set(key, fetchPromise);
    return fetchPromise;
  }
}
