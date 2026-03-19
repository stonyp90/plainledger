import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { CacheService } from '@infrastructure/cache/cache.service';
import { KeycloakAdminService } from '@infrastructure/auth/keycloak-admin.service';
import { alertHealthDegraded } from '@infrastructure/slack/slack-alert';

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  lastChecked: Date;
  error?: string;
  details?: Record<string, unknown>;
}

export interface SystemMetrics {
  requestsPerMinute: number;
  errorRate: number;
  averageResponseTime: number;
  activeConnections: number;
}

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);
  private redis: Redis | null = null;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly cacheService: CacheService,
    private readonly keycloakAdminService: KeycloakAdminService,
    private readonly configService: ConfigService,
  ) {
    this.initializeRedis();
  }

  private initializeRedis() {
    const redisHost = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const redisPort = parseInt(this.configService.get<string>('REDIS_PORT') || '6379', 10);
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');

    try {
      this.redis = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword || undefined,
        retryStrategy: () => null, // Don't retry for health checks
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
      });
    } catch (error) {
      this.logger.warn(`Failed to initialize Redis client: ${error.message}`);
      this.redis = null;
    }
  }

  /**
   * Check PostgreSQL health
   */
  async checkPostgreSQL(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      const result = await this.dataSource.query('SELECT 1 as health');
      const latencyMs = Date.now() - startTime;

      // Check connection pool stats
      const pool = (this.dataSource.driver as any).pool;
      const activeConnections = pool?.totalCount || 0;
      const idleConnections = pool?.idleCount || 0;

      return {
        name: 'PostgreSQL',
        status: latencyMs < 100 ? 'healthy' : latencyMs < 500 ? 'degraded' : 'unhealthy',
        latencyMs,
        lastChecked: new Date(),
        details: {
          activeConnections,
          idleConnections,
          queryResult: result[0],
        },
      };
    } catch (error) {
      return {
        name: 'PostgreSQL',
        status: 'unhealthy',
        latencyMs: Date.now() - startTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check Redis health
   */
  async checkRedis(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      if (!this.redis || this.redis.status !== 'ready') {
        // Try using CacheService if available
        if (this.cacheService.isAvailable()) {
          const testStart = Date.now();
          await this.cacheService.get('health-check-test');
          return {
            name: 'Redis',
            status: 'healthy',
            latencyMs: Date.now() - testStart,
            lastChecked: new Date(),
            details: {
              method: 'CacheService',
            },
          };
        }
        return {
          name: 'Redis',
          status: 'unhealthy',
          latencyMs: Date.now() - startTime,
          lastChecked: new Date(),
          error: 'Redis not connected',
        };
      }

      const pong = await Promise.race([
        this.redis.ping(),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000)),
      ]);

      const latencyMs = Date.now() - startTime;

      // Get Redis info
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const usedMemory = memoryMatch ? parseInt(memoryMatch[1], 10) : 0;

      return {
        name: 'Redis',
        status: latencyMs < 50 ? 'healthy' : latencyMs < 200 ? 'degraded' : 'unhealthy',
        latencyMs,
        lastChecked: new Date(),
        details: {
          pong,
          usedMemoryBytes: usedMemory,
          usedMemoryMB: Math.round(usedMemory / 1024 / 1024),
        },
      };
    } catch (error) {
      return {
        name: 'Redis',
        status: 'unhealthy',
        latencyMs: Date.now() - startTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check Keycloak health
   */
  async checkKeycloak(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      const keycloakUrl = this.configService.get<string>('KEYCLOAK_URL');
      if (!keycloakUrl) {
        return {
          name: 'Keycloak',
          status: 'unhealthy',
          latencyMs: Date.now() - startTime,
          lastChecked: new Date(),
          error: 'KEYCLOAK_URL not configured',
        };
      }

      // Try to get realm info (lightweight check)
      const realm = this.configService.get<string>('KEYCLOAK_REALM') || 'plainledger';
      const healthUrl = `${keycloakUrl}/realms/${realm}/.well-known/openid-configuration`;

      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        return {
          name: 'Keycloak',
          status: 'unhealthy',
          latencyMs,
          lastChecked: new Date(),
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        name: 'Keycloak',
        status: latencyMs < 500 ? 'healthy' : latencyMs < 1500 ? 'degraded' : 'unhealthy',
        latencyMs,
        lastChecked: new Date(),
        details: {
          realm,
          url: keycloakUrl,
        },
      };
    } catch (error) {
      return {
        name: 'Keycloak',
        status: 'unhealthy',
        latencyMs: Date.now() - startTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check external API health (QuickBooks, Xero, etc.)
   */
  async checkExternalAPI(provider: string, testUrl?: string): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      // For now, just check if credentials are configured
      // In production, you might want to make a lightweight API call
      const envKey = `${provider.toUpperCase()}_CLIENT_ID`;
      const clientId = this.configService.get<string>(envKey);

      if (!clientId) {
        return {
          name: `${provider} API`,
          status: 'degraded',
          latencyMs: Date.now() - startTime,
          lastChecked: new Date(),
          error: `${envKey} not configured`,
        };
      }

      // If test URL provided, try to ping it
      if (testUrl) {
        try {
          const response = await fetch(testUrl, {
            method: 'HEAD',
            signal: AbortSignal.timeout(3000),
          });
          const latencyMs = Date.now() - startTime;
          return {
            name: `${provider} API`,
            status: response.ok && latencyMs < 2000 ? 'healthy' : 'degraded',
            latencyMs,
            lastChecked: new Date(),
            details: {
              configured: true,
              statusCode: response.status,
            },
          };
        } catch (fetchError) {
          // If fetch fails, still return degraded (not unhealthy) since credentials exist
          return {
            name: `${provider} API`,
            status: 'degraded',
            latencyMs: Date.now() - startTime,
            lastChecked: new Date(),
            error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
            details: {
              configured: true,
            },
          };
        }
      }

      return {
        name: `${provider} API`,
        status: 'healthy',
        latencyMs: Date.now() - startTime,
        lastChecked: new Date(),
        details: {
          configured: true,
        },
      };
    } catch (error) {
      return {
        name: `${provider} API`,
        status: 'unhealthy',
        latencyMs: Date.now() - startTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check S3/LocalStack health
   * Supports both explicit credentials and IAM role-based access (ECS task roles)
   */
  async checkS3(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      const hasAccessKey = !!this.configService.get<string>('AWS_ACCESS_KEY_ID');
      const hasSecretKey = !!this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
      const endpoint = this.configService.get<string>('S3_ENDPOINT') || 'AWS default';
      const bucket = this.configService.get<string>('S3_BUCKET_UPLOADS');
      
      // Check if running on ECS with task role (metadata endpoint available)
      const isECS = !!process.env.ECS_CONTAINER_METADATA_URI_V4 || !!process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI;
      
      // AWS SDK will automatically use IAM role on ECS, or explicit credentials
      const hasCredentials = hasAccessKey && hasSecretKey;
      const hasIamRole = isECS;
      
      if (!hasCredentials && !hasIamRole) {
        return {
          name: 'S3 Storage',
          status: 'degraded',
          latencyMs: Date.now() - startTime,
          lastChecked: new Date(),
          error: 'No AWS credentials (explicit or IAM role)',
          details: {
            endpoint,
            hasExplicitCredentials: false,
            hasIamRole: false,
          },
        };
      }

      // Try to actually access the bucket to verify credentials work
      try {
        const s3Client = new S3Client({
          region: this.configService.get<string>('AWS_REGION') || 'ca-central-1',
          ...(endpoint && endpoint !== 'AWS default' ? { endpoint, forcePathStyle: true } : {}),
        });
        
        if (bucket) {
          await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
        }
        
        const latencyMs = Date.now() - startTime;
        return {
          name: 'S3 Storage',
          status: latencyMs < 500 ? 'healthy' : 'degraded',
          latencyMs,
          lastChecked: new Date(),
          details: {
            endpoint,
            bucket: bucket || 'not configured',
            authMethod: hasCredentials ? 'explicit' : 'iam-role',
            configured: true,
          },
        };
      } catch (s3Error) {
        const latencyMs = Date.now() - startTime;
        return {
          name: 'S3 Storage',
          status: 'degraded',
          latencyMs,
          lastChecked: new Date(),
          error: s3Error instanceof Error ? s3Error.message : 'S3 access failed',
          details: {
            endpoint,
            bucket: bucket || 'not configured',
            authMethod: hasCredentials ? 'explicit' : 'iam-role',
            configured: true,
          },
        };
      }
    } catch (error) {
      return {
        name: 'S3 Storage',
        status: 'unhealthy',
        latencyMs: Date.now() - startTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check all services
   */
  async checkAllServices(): Promise<ServiceHealth[]> {
    const checks = await Promise.allSettled([
      this.checkPostgreSQL(),
      this.checkRedis(),
      this.checkKeycloak(),
      this.checkS3(),
      this.checkExternalAPI('quickbooks', 'https://sandbox-quickbooks.api.intuit.com'),
      this.checkExternalAPI('xero'),
    ]);

    return checks.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        name: `Service ${index}`,
        status: 'unhealthy' as const,
        latencyMs: 0,
        lastChecked: new Date(),
        error: result.reason?.message || 'Check failed',
      };
    });
  }

  /**
   * Get overall system health status
   */
  async getOverallHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: ServiceHealth[];
    degradedCount: number;
    unhealthyCount: number;
  }> {
    const services = await this.checkAllServices();
    const unhealthyCount = services.filter((s) => s.status === 'unhealthy').length;
    const degradedCount = services.filter((s) => s.status === 'degraded').length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedCount > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    // Alert Slack for unhealthy services
    for (const svc of services) {
      if (svc.status === 'unhealthy') {
        alertHealthDegraded(svc.name, svc.error).catch(() => {});
      }
    }

    return {
      status: overallStatus,
      services,
      degradedCount,
      unhealthyCount,
    };
  }
}
