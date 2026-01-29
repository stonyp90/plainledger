/**
 * MongoDB Module
 * Handles connection to MongoDB Atlas for analytics and audit logging
 *
 * Why MongoDB for Analytics/Audit?
 * - Schema flexibility for varying event types
 * - Horizontal scaling for high write throughput
 * - Time-series collections for efficient analytics
 * - Free tier (512MB) sufficient for 10K+ daily events
 *
 * Collections:
 * - analytics_events: Product analytics (pageviews, feature usage)
 * - audit_logs: Compliance audit trail (user actions, data access)
 * - customer_journey: GTM funnel tracking
 *
 * @see https://www.mongodb.com/docs/drivers/node/current/
 */

import { Module, Global, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoClient, Db, Collection } from 'mongodb';

// ============================================================================
// Types
// ============================================================================

export interface AnalyticsEvent {
  _id?: string;
  eventName: string;
  userId?: string;
  anonymousId?: string;
  organizationId?: string;
  sessionId?: string;
  properties: Record<string, unknown>;
  context: {
    page?: {
      url?: string;
      path?: string;
      referrer?: string;
      title?: string;
    };
    device?: {
      type?: string;
      browser?: string;
      os?: string;
    };
    location?: {
      ip?: string;
      country?: string;
      region?: string;
      city?: string;
    };
    campaign?: {
      source?: string;
      medium?: string;
      name?: string;
      content?: string;
      term?: string;
    };
  };
  timestamp: Date;
  receivedAt: Date;
}

export interface AuditLog {
  _id?: string;
  action: string;
  actorId: string;
  actorEmail?: string;
  actorRole?: string;
  organizationId?: string;
  resourceType: string;
  resourceId?: string;
  resourceName?: string;
  changes?: {
    field: string;
    oldValue?: unknown;
    newValue?: unknown;
  }[];
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
}

export interface CustomerJourneyEvent {
  _id?: string;
  userId: string;
  organizationId?: string;
  stage: string;
  event: string;
  properties?: Record<string, unknown>;
  previousStage?: string;
  timestamp: Date;
}

// ============================================================================
// MongoDB Service
// ============================================================================

export class MongoDBService implements OnModuleDestroy {
  private readonly logger = new Logger(MongoDBService.name);
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private connecting = false;
  private connected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  // --------------------------------------------------------------------------
  // Connection Management
  // --------------------------------------------------------------------------

  async connect(): Promise<Db | null> {
    if (this.connected && this.db) {
      return this.db;
    }

    if (this.connecting) {
      // Wait for ongoing connection
      await new Promise((resolve) => setTimeout(resolve, 100));
      return this.db;
    }

    const uri = this.configService.get<string>('MONGODB_URI');
    if (!uri) {
      this.logger.warn('MongoDB URI not configured - analytics will be stored in PostgreSQL only');
      return null;
    }

    this.connecting = true;

    try {
      this.client = new MongoClient(uri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 10000,
        retryWrites: true,
        w: 'majority',
      });

      await this.client.connect();

      const dbName = this.configService.get<string>('MONGODB_DATABASE') || 'plainledger_analytics';
      this.db = this.client.db(dbName);

      // Create indexes
      await this.createIndexes();

      this.connected = true;
      this.logger.log(`Connected to MongoDB: ${dbName}`);

      return this.db;
    } catch (error) {
      this.logger.error(`Failed to connect to MongoDB: ${error.message}`);
      this.client = null;
      this.db = null;
      return null;
    } finally {
      this.connecting = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.connected = false;
      this.logger.log('Disconnected from MongoDB');
    }
  }

  private async createIndexes(): Promise<void> {
    if (!this.db) return;

    try {
      // Analytics events indexes
      const analyticsCollection = this.db.collection('analytics_events');
      await analyticsCollection.createIndexes([
        { key: { timestamp: -1 }, name: 'timestamp_desc' },
        { key: { userId: 1, timestamp: -1 }, name: 'user_timestamp' },
        { key: { organizationId: 1, timestamp: -1 }, name: 'org_timestamp' },
        { key: { eventName: 1, timestamp: -1 }, name: 'event_timestamp' },
        { key: { sessionId: 1 }, name: 'session_id' },
        // TTL index to auto-delete old events (365 days for free tier)
        { key: { timestamp: 1 }, name: 'ttl_365_days', expireAfterSeconds: 365 * 24 * 60 * 60 },
      ]);

      // Audit logs indexes
      const auditCollection = this.db.collection('audit_logs');
      await auditCollection.createIndexes([
        { key: { timestamp: -1 }, name: 'timestamp_desc' },
        { key: { actorId: 1, timestamp: -1 }, name: 'actor_timestamp' },
        { key: { organizationId: 1, timestamp: -1 }, name: 'org_timestamp' },
        { key: { resourceType: 1, resourceId: 1 }, name: 'resource' },
        { key: { action: 1, timestamp: -1 }, name: 'action_timestamp' },
        // Keep audit logs for 7 years (compliance requirement)
        { key: { timestamp: 1 }, name: 'ttl_7_years', expireAfterSeconds: 7 * 365 * 24 * 60 * 60 },
      ]);

      // Customer journey indexes
      const journeyCollection = this.db.collection('customer_journey');
      await journeyCollection.createIndexes([
        { key: { userId: 1, timestamp: -1 }, name: 'user_timestamp' },
        { key: { stage: 1, timestamp: -1 }, name: 'stage_timestamp' },
        { key: { organizationId: 1, stage: 1 }, name: 'org_stage' },
      ]);

      this.logger.log('MongoDB indexes created');
    } catch (error) {
      this.logger.error(`Failed to create indexes: ${error.message}`);
    }
  }

  // --------------------------------------------------------------------------
  // Collection Accessors
  // --------------------------------------------------------------------------

  async getAnalyticsCollection(): Promise<Collection<AnalyticsEvent> | null> {
    const db = await this.connect();
    return db?.collection<AnalyticsEvent>('analytics_events') || null;
  }

  async getAuditCollection(): Promise<Collection<AuditLog> | null> {
    const db = await this.connect();
    return db?.collection<AuditLog>('audit_logs') || null;
  }

  async getJourneyCollection(): Promise<Collection<CustomerJourneyEvent> | null> {
    const db = await this.connect();
    return db?.collection<CustomerJourneyEvent>('customer_journey') || null;
  }

  // --------------------------------------------------------------------------
  // Health Check
  // --------------------------------------------------------------------------

  async isHealthy(): Promise<boolean> {
    if (!this.client || !this.connected) {
      return false;
    }

    try {
      await this.client.db().command({ ping: 1 });
      return true;
    } catch {
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // Status
  // --------------------------------------------------------------------------

  isConfigured(): boolean {
    return !!this.configService.get<string>('MONGODB_URI');
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// ============================================================================
// Module Definition
// ============================================================================

@Global()
@Module({
  providers: [
    {
      provide: MongoDBService,
      useFactory: (configService: ConfigService) => {
        return new MongoDBService(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [MongoDBService],
})
export class MongoDBModule {}
