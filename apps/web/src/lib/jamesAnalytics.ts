/**
 * James AI Analytics
 * 
 * Tracks usage metrics and performance for James AI
 */

interface AnalyticsEvent {
  type: 'message_sent' | 'initiative_generated' | 'okr_generated' | 'error' | 'rate_limit';
  timestamp: number;
  metadata?: {
    messageLength?: number;
    responseTime?: number;
    tokensUsed?: number;
    errorType?: string;
    messageType?: string;
  };
}

class JamesAnalytics {
  private events: AnalyticsEvent[] = [];
  private readonly MAX_EVENTS = 1000;
  private readonly FLUSH_INTERVAL = 60000; // 1 minute

  constructor() {
    // Flush events periodically
    setInterval(() => this.flush(), this.FLUSH_INTERVAL);
  }

  /**
   * Track an event
   */
  track(event: Omit<AnalyticsEvent, 'timestamp'>): void {
    this.events.push({
      ...event,
      timestamp: Date.now(),
    });

    // Keep only recent events
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[James Analytics]', event.type, event.metadata);
    }
  }

  /**
   * Track message sent
   */
  trackMessageSent(messageLength: number, messageType?: string): void {
    this.track({
      type: 'message_sent',
      metadata: {
        messageLength,
        messageType,
      },
    });
  }

  /**
   * Track response received
   */
  trackResponse(responseTime: number, tokensUsed?: number): void {
    // This would be called after receiving a response
    // For now, we'll track it when we have the data
  }

  /**
   * Track initiative generation
   */
  trackInitiativeGenerated(count: number): void {
    this.track({
      type: 'initiative_generated',
      metadata: {
        messageLength: count,
      },
    });
  }

  /**
   * Track OKR generation
   */
  trackOKRGenerated(): void {
    this.track({
      type: 'okr_generated',
    });
  }

  /**
   * Track error
   */
  trackError(errorType: string, errorMessage: string): void {
    this.track({
      type: 'error',
      metadata: {
        errorType,
      },
    });
  }

  /**
   * Track rate limit
   */
  trackRateLimit(): void {
    this.track({
      type: 'rate_limit',
    });
  }

  /**
   * Get analytics summary
   */
  getSummary(): {
    totalMessages: number;
    totalInitiatives: number;
    totalOKRs: number;
    totalErrors: number;
    averageResponseTime?: number;
  } {
    const messages = this.events.filter(e => e.type === 'message_sent');
    const initiatives = this.events.filter(e => e.type === 'initiative_generated');
    const okrs = this.events.filter(e => e.type === 'okr_generated');
    const errors = this.events.filter(e => e.type === 'error');

    const responseTimes = this.events
      .map(e => e.metadata?.responseTime)
      .filter((t): t is number => t !== undefined);

    return {
      totalMessages: messages.length,
      totalInitiatives: initiatives.length,
      totalOKRs: okrs.length,
      totalErrors: errors.length,
      averageResponseTime: responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : undefined,
    };
  }

  /**
   * Flush events to backend (in production)
   */
  private flush(): void {
    if (this.events.length === 0) return;

    // In production, send to analytics endpoint
    if (process.env.NODE_ENV === 'production') {
      // Would send to /api/analytics/james
      // For now, just clear old events
    }

    // Keep only last hour of events
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.events = this.events.filter(e => e.timestamp > oneHourAgo);
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
  }
}

export const jamesAnalytics = new JamesAnalytics();
export default jamesAnalytics;
