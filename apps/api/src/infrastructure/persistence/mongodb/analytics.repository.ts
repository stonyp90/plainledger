/**
 * Analytics Repository
 * High-throughput event storage for product analytics
 *
 * Optimized for:
 * - High write throughput (batched inserts)
 * - Fast aggregations (indexed queries)
 * - Funnel analysis (pipeline aggregations)
 *
 * Data flows:
 * Frontend -> PostHog (primary, free)
 * Backend -> MongoDB (secondary, for custom analytics)
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  MongoDBService,
  AnalyticsEvent,
  CustomerJourneyEvent,
} from './mongodb.module';

// ============================================================================
// Types
// ============================================================================

export interface TrackEventInput {
  eventName: string;
  userId?: string;
  anonymousId?: string;
  organizationId?: string;
  sessionId?: string;
  properties?: Record<string, unknown>;
  context?: {
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
    ip?: string;
    userAgent?: string;
    campaign?: {
      source?: string;
      medium?: string;
      name?: string;
    };
  };
  timestamp?: Date;
}

export interface EventQuery {
  eventName?: string | string[];
  userId?: string;
  organizationId?: string;
  sessionId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface EventCount {
  eventName: string;
  count: number;
}

export interface FunnelStep {
  eventName: string;
  count: number;
  conversionRate: number;
}

// ============================================================================
// Analytics Repository
// ============================================================================

@Injectable()
export class AnalyticsRepository implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsRepository.name);
  private eventBuffer: AnalyticsEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL_MS = 5000;

  constructor(private readonly mongoService: MongoDBService) {}

  async onModuleInit(): Promise<void> {
    // Start buffer flush interval
    if (this.mongoService.isConfigured()) {
      this.flushInterval = setInterval(
        () => this.flushBuffer(),
        this.FLUSH_INTERVAL_MS,
      );
      this.logger.log('Analytics repository initialized with MongoDB');
    } else {
      this.logger.warn(
        'MongoDB not configured - using in-memory buffer only (events will not persist)',
      );
    }
  }

  // --------------------------------------------------------------------------
  // Event Tracking
  // --------------------------------------------------------------------------

  /**
   * Track an analytics event (buffered for performance)
   */
  async track(input: TrackEventInput): Promise<void> {
    const event: AnalyticsEvent = {
      eventName: input.eventName,
      userId: input.userId,
      anonymousId: input.anonymousId,
      organizationId: input.organizationId,
      sessionId: input.sessionId,
      properties: input.properties || {},
      context: {
        page: input.context?.page,
        device: input.context?.device,
        location: {
          ip: input.context?.ip,
        },
        campaign: input.context?.campaign,
      },
      timestamp: input.timestamp || new Date(),
      receivedAt: new Date(),
    };

    this.eventBuffer.push(event);

    // Flush if buffer is full
    if (this.eventBuffer.length >= this.BUFFER_SIZE) {
      await this.flushBuffer();
    }
  }

  /**
   * Track multiple events at once
   */
  async trackBatch(events: TrackEventInput[]): Promise<void> {
    for (const event of events) {
      await this.track(event);
    }
  }

  /**
   * Flush buffered events to MongoDB
   */
  private async flushBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      const collection = await this.mongoService.getAnalyticsCollection();
      if (collection) {
        await collection.insertMany(events, { ordered: false });
        this.logger.debug(`Flushed ${events.length} analytics events`);
      }
    } catch (error) {
      this.logger.error(`Failed to flush analytics events: ${error.message}`);
      // Re-add events to buffer on failure (with limit to prevent memory issues)
      this.eventBuffer = [...events.slice(-50), ...this.eventBuffer];
    }
  }

  // --------------------------------------------------------------------------
  // Query Methods
  // --------------------------------------------------------------------------

  /**
   * Get events by query
   */
  async getEvents(query: EventQuery): Promise<AnalyticsEvent[]> {
    const collection = await this.mongoService.getAnalyticsCollection();
    if (!collection) return [];

    const filter: Record<string, unknown> = {};

    if (query.eventName) {
      filter.eventName = Array.isArray(query.eventName)
        ? { $in: query.eventName }
        : query.eventName;
    }
    if (query.userId) filter.userId = query.userId;
    if (query.organizationId) filter.organizationId = query.organizationId;
    if (query.sessionId) filter.sessionId = query.sessionId;

    if (query.startDate || query.endDate) {
      filter.timestamp = {};
      if (query.startDate) {
        (filter.timestamp as Record<string, Date>).$gte = query.startDate;
      }
      if (query.endDate) {
        (filter.timestamp as Record<string, Date>).$lte = query.endDate;
      }
    }

    return collection
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(query.offset || 0)
      .limit(query.limit || 100)
      .toArray();
  }

  /**
   * Count events by type in a time range
   */
  async countEvents(query: {
    organizationId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<EventCount[]> {
    const collection = await this.mongoService.getAnalyticsCollection();
    if (!collection) return [];

    const match: Record<string, unknown> = {};

    if (query.organizationId) match.organizationId = query.organizationId;
    if (query.startDate || query.endDate) {
      match.timestamp = {};
      if (query.startDate) {
        (match.timestamp as Record<string, Date>).$gte = query.startDate;
      }
      if (query.endDate) {
        (match.timestamp as Record<string, Date>).$lte = query.endDate;
      }
    }

    const pipeline = [
      { $match: match },
      { $group: { _id: '$eventName', count: { $sum: 1 } } },
      { $project: { eventName: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 as const } },
    ];

    return collection.aggregate<EventCount>(pipeline).toArray();
  }

  // --------------------------------------------------------------------------
  // Funnel Analysis
  // --------------------------------------------------------------------------

  /**
   * Calculate funnel conversion rates
   */
  async calculateFunnel(params: {
    steps: string[];
    organizationId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<FunnelStep[]> {
    const collection = await this.mongoService.getAnalyticsCollection();
    if (!collection) return [];

    const { steps, organizationId, startDate, endDate } = params;

    const match: Record<string, unknown> = {
      eventName: { $in: steps },
    };

    if (organizationId) match.organizationId = organizationId;
    if (startDate || endDate) {
      match.timestamp = {};
      if (startDate) {
        (match.timestamp as Record<string, Date>).$gte = startDate;
      }
      if (endDate) {
        (match.timestamp as Record<string, Date>).$lte = endDate;
      }
    }

    // Get unique users for each step
    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: '$eventName',
          users: { $addToSet: { $ifNull: ['$userId', '$anonymousId'] } },
        },
      },
      {
        $project: {
          eventName: '$_id',
          count: { $size: '$users' },
          _id: 0,
        },
      },
    ];

    const results = await collection
      .aggregate<{ eventName: string; count: number }>(pipeline)
      .toArray();

    // Build funnel with conversion rates
    const eventCounts = new Map(results.map((r) => [r.eventName, r.count]));
    let previousCount = 0;

    return steps.map((step, index) => {
      const count = eventCounts.get(step) || 0;
      const conversionRate =
        index === 0
          ? 100
          : previousCount > 0
            ? (count / previousCount) * 100
            : 0;
      previousCount = count;

      return {
        eventName: step,
        count,
        conversionRate: Math.round(conversionRate * 100) / 100,
      };
    });
  }

  // --------------------------------------------------------------------------
  // Customer Journey Tracking
  // --------------------------------------------------------------------------

  /**
   * Record a customer journey event
   */
  async recordJourneyEvent(event: CustomerJourneyEvent): Promise<void> {
    const collection = await this.mongoService.getJourneyCollection();
    if (!collection) return;

    try {
      await collection.insertOne(event);
    } catch (error) {
      this.logger.error(
        `Failed to record journey event: ${error.message}`,
      );
    }
  }

  /**
   * Get user's journey timeline
   */
  async getUserJourney(userId: string): Promise<CustomerJourneyEvent[]> {
    const collection = await this.mongoService.getJourneyCollection();
    if (!collection) return [];

    return collection
      .find({ userId })
      .sort({ timestamp: 1 })
      .toArray();
  }

  /**
   * Get users at a specific journey stage
   */
  async getUsersAtStage(
    stage: string,
    limit = 100,
  ): Promise<CustomerJourneyEvent[]> {
    const collection = await this.mongoService.getJourneyCollection();
    if (!collection) return [];

    // Get the latest stage for each user and filter by stage
    const pipeline = [
      { $sort: { timestamp: -1 as const } },
      {
        $group: {
          _id: '$userId',
          latestEvent: { $first: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$latestEvent' } },
      { $match: { stage } },
      { $limit: limit },
    ];

    return collection.aggregate<CustomerJourneyEvent>(pipeline).toArray();
  }

  // --------------------------------------------------------------------------
  // GTM Metrics
  // --------------------------------------------------------------------------

  /**
   * Get GTM funnel metrics (Signup -> Activated -> Converted)
   */
  async getGTMFunnel(params: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    signups: number;
    activated: number;
    converted: number;
    activationRate: number;
    conversionRate: number;
  }> {
    return this.calculateFunnel({
      steps: ['signup_completed', 'first_connection', 'subscription_started'],
      startDate: params.startDate,
      endDate: params.endDate,
    }).then((funnel) => {
      const signups = funnel[0]?.count || 0;
      const activated = funnel[1]?.count || 0;
      const converted = funnel[2]?.count || 0;

      return {
        signups,
        activated,
        converted,
        activationRate: signups > 0 ? (activated / signups) * 100 : 0,
        conversionRate: activated > 0 ? (converted / activated) * 100 : 0,
      };
    });
  }

  // --------------------------------------------------------------------------
  // Cleanup
  // --------------------------------------------------------------------------

  async onModuleDestroy(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flushBuffer();
  }
}
