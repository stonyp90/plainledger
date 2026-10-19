/**
 * AI Analytics
 * 
 * Tracks usage metrics and performance for AI features
 */

interface AnalyticsEvent {
  type: 'message_sent' | 'initiative_generated' | 'okr_generated' | 'error' | 'rate_limit' | 'local_query' | 'feedback';
  timestamp: number;
  metadata?: {
    messageLength?: number;
    responseTime?: number;
    tokensUsed?: number;
    errorType?: string;
    messageType?: string;
    handlerType?: string;
    latencyMs?: number;
    costSaved?: number;
    messageId?: string;
    positive?: boolean;
    queryIntent?: string;
    modelTier?: string;
  };
}

class AIAnalytics {
  private events: AnalyticsEvent[] = [];
  private readonly MAX_EVENTS = 1000;
  private readonly FLUSH_INTERVAL = 60000; // 1 minute
  private sessionId: string;
  private flushInProgress = false;
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;

  constructor() {
    // Generate session ID
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Flush events periodically
    setInterval(() => this.flush(), this.FLUSH_INTERVAL);
    
    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush();
      });
    }
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
    if (import.meta.env.DEV) {
      console.log('[AI Analytics]', event.type, event.metadata);
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
   * Track local query (handled without LLM)
   */
  trackLocalQuery(handlerType: string, latencyMs: number): void {
    // Estimate cost saved (average LLM query cost ~$0.01)
    const costSaved = 0.01;
    
    this.track({
      type: 'local_query',
      metadata: {
        handlerType,
        latencyMs,
        costSaved,
        tokensUsed: 0,
      },
    });
  }

  /**
   * Track user feedback on AI response
   */
  trackFeedback(messageId: string, positive: boolean, context?: { queryIntent?: string; modelTier?: string }): void {
    this.track({
      type: 'feedback',
      metadata: {
        messageId,
        positive,
        queryIntent: context?.queryIntent,
        modelTier: context?.modelTier,
      },
    });
    
    // Send feedback to backend immediately for learning
    this.sendFeedbackToBackend(messageId, positive, context);
  }

  /**
   * Send feedback to backend for model improvement
   */
  private async sendFeedbackToBackend(
    messageId: string,
    positive: boolean,
    context?: { queryIntent?: string; modelTier?: string }
  ): Promise<void> {
    try {
      // Import dynamically to avoid circular dependency
      const { apiClient } = await import('../infrastructure/api/client');
      
      await apiClient.post('/ai/feedback', {
        messageId,
        positive,
        timestamp: Date.now(),
        context,
      });
    } catch (error) {
      // Silently fail - feedback is best-effort
      if (import.meta.env.DEV) {
        console.warn('[AI Analytics] Failed to send feedback to backend:', error);
      }
    }
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
   * Flush events to backend
   */
  private async flush(): Promise<void> {
    if (this.events.length === 0 || this.flushInProgress) return;
    
    this.flushInProgress = true;
    const eventsToFlush = [...this.events];
    this.events = []; // Clear immediately to prevent duplicates

    try {
      // Import dynamically to avoid circular dependency
      const { apiClient } = await import('../infrastructure/api/client');
      
      await apiClient.post('/analytics/ai', {
        events: eventsToFlush,
        sessionId: this.sessionId,
        timestamp: Date.now(),
      });
      
      // Reset retry count on success
      this.retryCount = 0;
      
      if (import.meta.env.DEV) {
        console.log(`[AI Analytics] Flushed ${eventsToFlush.length} events to backend`);
      }
    } catch (error) {
      // Restore events for retry
      this.events = [...eventsToFlush, ...this.events];
      
      // Retry with exponential backoff
      if (this.retryCount < this.MAX_RETRIES) {
        this.retryCount++;
        const delay = Math.min(1000 * Math.pow(2, this.retryCount), 10000);
        
        setTimeout(() => {
          this.flush();
        }, delay);
        
        if (import.meta.env.DEV) {
          console.warn(`[AI Analytics] Flush failed, retrying in ${delay}ms (attempt ${this.retryCount}/${this.MAX_RETRIES})`);
        }
      } else {
        // Max retries reached, keep events for next flush
        if (import.meta.env.DEV) {
          console.error('[AI Analytics] Failed to flush events after max retries');
        }
        
        // Keep only last hour of events to prevent memory issues
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        this.events = this.events.filter(e => e.timestamp > oneHourAgo);
        this.retryCount = 0;
      }
    } finally {
      this.flushInProgress = false;
    }
  }

  /**
   * Track AI usage with cost estimation
   */
  trackAIUsage(feature: string, tokens: number, modelTier: 'lite' | 'full'): void {
    // Estimate cost based on tier
    const costPer1KInput = modelTier === 'lite' ? 0.0005 : 0.01;
    const costPer1KOutput = modelTier === 'lite' ? 0.0015 : 0.03;
    
    // Rough estimate: assume 70% input, 30% output tokens
    const inputTokens = Math.floor(tokens * 0.7);
    const outputTokens = Math.floor(tokens * 0.3);
    const cost = (inputTokens / 1000) * costPer1KInput + (outputTokens / 1000) * costPer1KOutput;
    
    this.track({
      type: 'message_sent',
      metadata: {
        messageType: feature,
        tokensUsed: tokens,
        costSaved: 0, // Will be calculated on backend
      },
    });
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
  }
}

export const aiAnalytics = new AIAnalytics();
export default aiAnalytics;
