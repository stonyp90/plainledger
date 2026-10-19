import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { createHash } from 'crypto';

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
    // Support both REDIS_PASSWORD and REDIS_AUTH_TOKEN (ElastiCache uses AUTH_TOKEN)
    const redisPassword = 
      this.configService.get<string>("REDIS_PASSWORD") ||
      this.configService.get<string>("REDIS_AUTH_TOKEN");
    
    // Enable TLS for production (ElastiCache with transit encryption)
    const isProduction = process.env.NODE_ENV === "production";
    const tlsSetting = this.configService.get<string>("REDIS_TLS");
    const useTls = tlsSetting === undefined
      ? isProduction && !redisHost.includes("localhost")
      : tlsSetting === "true";

    this.logger.log(`[onModuleInit] CacheService connecting to ${redisHost}:${redisPort} (TLS: ${useTls}, auth: ${!!redisPassword})`);

    try {
      this.redis = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword || undefined,
        tls: useTls ? {} : undefined, // Enable TLS for ElastiCache
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        connectTimeout: 10000, // 10 second connection timeout
      });

      this.redis.on("connect", () => {
        this.logger.log(`Connected to Redis at ${redisHost}:${redisPort}`);
      });

      this.redis.on("error", (error) => {
        this.logger.error(`Redis error: ${error.message}`);
      });

      // Test connection with timeout
      this.logger.log("[onModuleInit] CacheService testing connection with ping...");
      const pingPromise = this.redis.ping();
      const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("Redis ping timed out after 10 seconds")), 10000)
      );
      
      try {
        const pingResult = await Promise.race([pingPromise, timeoutPromise]);
        this.logger.log(`Redis cache service initialized (ping response: ${pingResult})`);
      } catch (pingError) {
        this.logger.warn(`Redis ping failed: ${pingError.message}. Cache will be disabled.`);
        await this.redis.quit();
        this.redis = null;
        this.logger.log("[onModuleInit] CacheService completed (disabled due to ping failure)");
        return;
      }
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

  /** Check the actual Redis connection without allowing readiness to hang. */
  async healthCheck(): Promise<boolean> {
    if (!this.isAvailable()) return false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        this.redis!.ping().then((response) => response === "PONG"),
        new Promise<boolean>((resolve) => { timer = setTimeout(() => resolve(false), 2000); }),
      ]);
    } catch {
      return false;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /** Atomically consume a recovery token across API replicas. Fail closed without Redis. */
  async consumeAuthAction(fingerprint: string, ttlSeconds: number): Promise<boolean> {
    if (!this.isAvailable()) throw new ServiceUnavailableException("Authentication recovery storage is unavailable");
    if (!/^[a-f0-9]{64}$/.test(fingerprint) || !Number.isInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 86400) {
      throw new Error("Invalid authentication recovery state");
    }
    return await this.redis!.set(`auth:used:${fingerprint}`, "1", "EX", ttlSeconds, "NX") === "OK";
  }

  async putOAuthState(state: string, value: unknown, ttlSeconds = 600): Promise<void> {
    if (!this.isAvailable()) throw new ServiceUnavailableException("OAuth state storage is unavailable");
    const payload = JSON.stringify(value);
    if (!/^[A-Za-z0-9_-]{43}$/.test(state) || !Number.isInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 600 || payload.length > 8192) {
      throw new Error("Invalid OAuth state");
    }
    const saved = await this.redis!.set(`auth:oauth:${state}`, payload, "EX", ttlSeconds, "NX");
    if (saved !== "OK") throw new ServiceUnavailableException("OAuth state could not be created");
  }

  /** GETDEL makes callback state single-use even across concurrent API replicas. */
  async consumeOAuthState(state: string): Promise<unknown | null> {
    if (!this.isAvailable()) throw new ServiceUnavailableException("OAuth state storage is unavailable");
    if (!/^[A-Za-z0-9_-]{43}$/.test(state)) return null;
    const value = await this.redis!.getdel(`auth:oauth:${state}`);
    if (value === null) return null;
    try { return JSON.parse(value) as unknown; }
    catch { return null; }
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
      return await this.deleteMatchingKeys(pattern);
    } catch (error) {
      this.logger.error(
        `Cache delete pattern error for ${pattern}: ${error.message}`,
      );
      return 0;
    }
  }

  private async deleteMatchingKeys(pattern: string): Promise<number> {
    if (!this.isAvailable()) throw new ServiceUnavailableException('Cache storage is unavailable');
    let cursor = '0';
    let deleted = 0;
    do {
      const [next, keys] = await this.redis!.scan(cursor, 'MATCH', pattern, 'COUNT', 500);
      cursor = next;
      // SCAN may return more than COUNT or repeat keys. DEL's affected count is authoritative.
      for (let offset = 0; offset < keys.length; offset += 500) {
        deleted += await this.redis!.del(...keys.slice(offset, offset + 500));
      }
    } while (cursor !== '0');
    return deleted;
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
    const filterHash = createHash('sha256').update(filterStr).digest('hex');
    return `${baseKey}:${filterHash}`;
  }

  /**
   * Invalidate all datalake cache for an organization
   * Optionally invalidate specific entity type
   */
  async invalidateDatalake(orgId: string, entity?: string): Promise<number> {
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(orgId) || (entity !== undefined && !/^[A-Za-z0-9:_-]{1,100}$/.test(entity))) {
      throw new Error('Invalid data cache scope');
    }
    const pattern = entity
      ? `datalake:${orgId}:${entity}*`
      : `datalake:${orgId}:*`;
    return this.deleteMatchingKeys(pattern);
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
