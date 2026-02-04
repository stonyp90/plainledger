/**
 * Analytics Service
 * Unified tracking for customer flow monitoring
 * Integrates with Google Analytics, PostHog, and optionally Segment/Mixpanel
 *
 * Primary (FREE):
 * - Google Analytics GA4 (unlimited events)
 * - PostHog (1M events + 5K recordings/month free)
 *
 * Optional (paid):
 * - Segment (data routing)
 * - Mixpanel (product analytics)
 */

import posthogService from './posthog';

// Analytics configuration from environment
const ANALYTICS_CONFIG = {
  // PRIMARY: Free tier analytics
  googleAnalytics: {
    measurementId: import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-85LVG81DY5',
    enabled: true, // Always enabled - free
  },
  posthog: {
    apiKey: import.meta.env.VITE_POSTHOG_KEY || 'phc_2nSLndf5sZu7lXOugOH7g7w3oNwxF24Hewla7X3CT2s',
    enabled: true, // Always enabled - generous free tier
  },
  // OPTIONAL: Paid analytics (enable when needed)
  segment: {
    writeKey: import.meta.env.VITE_SEGMENT_WRITE_KEY || '',
    enabled: !!import.meta.env.VITE_SEGMENT_WRITE_KEY,
  },
  mixpanel: {
    token: import.meta.env.VITE_MIXPANEL_TOKEN || '',
    enabled: !!import.meta.env.VITE_MIXPANEL_TOKEN,
  },
  hotjar: {
    siteId: import.meta.env.VITE_HOTJAR_SITE_ID || '',
    enabled: !!import.meta.env.VITE_HOTJAR_SITE_ID, // Not needed - PostHog has session recording
  },
  debug: import.meta.env.DEV,
};

// =====================================================
// TYPES
// =====================================================

export interface UserTraits {
  id?: string;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  plan?: string;
  createdAt?: string;
  role?: string;
  locale?: string;
  // Custom traits
  organizationId?: string;
  organizationName?: string;
  subscriptionTier?: string;
  connectedSources?: number;
  teamSize?: number;
}

export interface EventProperties {
  [key: string]: string | number | boolean | null | undefined | string[];
}

// Onboarding specific events
export type OnboardingStep = 
  | 'welcome'
  | 'account_type'
  | 'signup'
  | 'company_info'
  | 'industry_preview'
  | 'connect_source'
  | 'invite_team'
  | 'tour'
  | 'complete';

export type OnboardingEvent =
  | 'onboarding_started'
  | 'onboarding_step_viewed'
  | 'onboarding_step_completed'
  | 'onboarding_completed'
  | 'onboarding_skipped'
  | 'onboarding_abandoned';

// Conversion funnel events
export type ConversionEvent =
  | 'landing_page_viewed'
  | 'pricing_viewed'
  | 'signup_started'
  | 'signup_completed'
  | 'first_source_connected'
  | 'first_report_generated'
  | 'subscription_started'
  | 'subscription_upgraded'
  | 'subscription_cancelled';

// Feature usage events
export type FeatureEvent =
  | 'dashboard_viewed'
  | 'report_viewed'
  | 'report_exported'
  | 'anomaly_viewed'
  | 'anomaly_resolved'
  | 'connection_added'
  | 'connection_removed'
  | 'team_member_invited'
  | 'settings_updated';

export type AnalyticsEvent = OnboardingEvent | ConversionEvent | FeatureEvent | string;

// =====================================================
// ANALYTICS CLASS
// =====================================================

class Analytics {
  private initialized = false;
  private userId: string | null = null;
  private anonymousId: string;
  private sessionId: string;
  private queue: Array<() => void> = [];

  constructor() {
    // Generate anonymous ID if not exists
    this.anonymousId = this.getOrCreateAnonymousId();
    this.sessionId = this.generateSessionId();
  }

  // =====================================================
  // INITIALIZATION
  // =====================================================

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize Segment (loads other integrations)
      if (ANALYTICS_CONFIG.segment.enabled) {
        await this.initSegment();
      }

      // Initialize Google Analytics directly if no Segment
      if (ANALYTICS_CONFIG.googleAnalytics.enabled && !ANALYTICS_CONFIG.segment.enabled) {
        this.initGoogleAnalytics();
      }

      // Initialize Hotjar
      if (ANALYTICS_CONFIG.hotjar.enabled) {
        this.initHotjar();
      }

      this.initialized = true;
      this.log('Analytics initialized');

      // Process queued events
      this.processQueue();
    } catch (error) {
      console.error('Failed to initialize analytics:', error);
    }
  }

  private async initSegment(): Promise<void> {
    // Segment analytics.js snippet
    const analytics = (window as any).analytics = (window as any).analytics || [];
    
    if (!analytics.initialize) {
      if (analytics.invoked) {
        console.error('Segment snippet included twice.');
        return;
      }
      
      analytics.invoked = true;
      analytics.methods = [
        'trackSubmit', 'trackClick', 'trackLink', 'trackForm', 'pageview',
        'identify', 'reset', 'group', 'track', 'ready', 'alias', 'debug',
        'page', 'once', 'off', 'on', 'addSourceMiddleware', 'addIntegrationMiddleware',
        'setAnonymousId', 'addDestinationMiddleware'
      ];
      
      analytics.factory = function(method: string) {
        return function(...args: any[]) {
          args.unshift(method);
          analytics.push(args);
          return analytics;
        };
      };
      
      for (const method of analytics.methods) {
        analytics[method] = analytics.factory(method);
      }
      
      analytics.load = function(key: string, options?: any) {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = true;
        script.src = `https://cdn.segment.com/analytics.js/v1/${key}/analytics.min.js`;
        const first = document.getElementsByTagName('script')[0];
        first?.parentNode?.insertBefore(script, first);
        analytics._loadOptions = options;
      };
      
      analytics._writeKey = ANALYTICS_CONFIG.segment.writeKey;
      analytics.SNIPPET_VERSION = '4.15.3';
      analytics.load(ANALYTICS_CONFIG.segment.writeKey);
    }
  }

  private initGoogleAnalytics(): void {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_CONFIG.googleAnalytics.measurementId}`;
    document.head.appendChild(script);

    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: any[]) {
      (window as any).dataLayer.push(args);
    }
    (window as any).gtag = gtag;
    gtag('js', new Date());
    gtag('config', ANALYTICS_CONFIG.googleAnalytics.measurementId);
  }

  private initHotjar(): void {
    (function(h: any, o: any, t: any, j: any, a?: any, r?: any) {
      h.hj = h.hj || function(...args: any[]) { (h.hj.q = h.hj.q || []).push(args); };
      h._hjSettings = { hjid: ANALYTICS_CONFIG.hotjar.siteId, hjsv: 6 };
      a = o.getElementsByTagName('head')[0];
      r = o.createElement('script');
      r.async = 1;
      r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
      a.appendChild(r);
    })(window, document, 'https://static.hotjar.com/c/hotjar-', '.js?sv=');
  }

  // =====================================================
  // CORE METHODS
  // =====================================================

  /**
   * Identify a user with traits
   */
  identify(userId: string, traits?: UserTraits): void {
    this.userId = userId;
    
    const enrichedTraits = {
      ...traits,
      sessionId: this.sessionId,
      identifiedAt: new Date().toISOString(),
    };

    this.execute(() => {
      // PostHog (primary - free)
      if (ANALYTICS_CONFIG.posthog.enabled) {
        posthogService.identify(userId, {
          email: traits?.email,
          name: traits?.name,
          firstName: traits?.firstName,
          lastName: traits?.lastName,
          organizationId: traits?.organizationId,
          organizationName: traits?.organizationName,
          subscriptionTier: traits?.subscriptionTier as 'free' | 'pro' | 'premium',
          signupDate: traits?.createdAt,
          locale: traits?.locale,
        });
        // Set organization for B2B analytics
        if (traits?.organizationId) {
          posthogService.setOrganization(traits.organizationId, {
            name: traits.organizationName,
            plan: traits.subscriptionTier,
          });
        }
      }

      // Segment (optional)
      if ((window as any).analytics?.identify) {
        (window as any).analytics.identify(userId, enrichedTraits);
      }

      // Google Analytics
      if ((window as any).gtag) {
        (window as any).gtag('config', ANALYTICS_CONFIG.googleAnalytics.measurementId, {
          user_id: userId,
        });
        // Set user properties
        (window as any).gtag('set', 'user_properties', {
          subscription_tier: traits?.subscriptionTier || 'free',
          organization_id: traits?.organizationId,
        });
      }

      // Hotjar (optional - PostHog has session recording)
      if ((window as any).hj) {
        (window as any).hj('identify', userId, enrichedTraits);
      }

      this.log('identify', { userId, traits: enrichedTraits });
    });
  }

  /**
   * Track a page view
   */
  page(name?: string, properties?: EventProperties): void {
    const pageProperties = {
      ...properties,
      url: window.location.href,
      path: window.location.pathname,
      referrer: document.referrer,
      title: document.title,
      sessionId: this.sessionId,
    };

    // Use fallback name if not provided
    const pageName = name || document.title || window.location.pathname || 'Unknown Page';

    this.execute(() => {
      // PostHog (primary - free)
      if (ANALYTICS_CONFIG.posthog.enabled) {
        posthogService.trackPageView(window.location.pathname);
      }

      // Segment (optional)
      if ((window as any).analytics?.page) {
        (window as any).analytics.page(pageName, pageProperties);
      }

      // Google Analytics
      if ((window as any).gtag) {
        (window as any).gtag('event', 'page_view', {
          page_title: pageName,
          page_location: window.location.href,
          page_path: window.location.pathname,
        });
      }

      this.log('page', { name: pageName, properties: pageProperties });
    });
  }

  /**
   * Track an event
   */
  track(event: AnalyticsEvent, properties?: EventProperties): void {
    const eventProperties = {
      ...properties,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      path: window.location.pathname,
    };

    this.execute(() => {
      // PostHog (primary - free)
      if (ANALYTICS_CONFIG.posthog.enabled) {
        posthogService.track(event, eventProperties as Record<string, string | number | boolean | null | undefined | string[]>);
      }

      // Segment (optional)
      if ((window as any).analytics?.track) {
        (window as any).analytics.track(event, eventProperties);
      }

      // Google Analytics
      if ((window as any).gtag) {
        (window as any).gtag('event', event, eventProperties);
      }

      this.log('track', { event, properties: eventProperties });
    });
  }

  /**
   * Associate user with a group/organization
   */
  group(groupId: string, traits?: EventProperties): void {
    this.execute(() => {
      // PostHog (primary - free)
      if (ANALYTICS_CONFIG.posthog.enabled) {
        posthogService.setOrganization(groupId, {
          name: traits?.name as string,
          industry: traits?.industry as string,
          size: traits?.size as string,
          plan: traits?.plan as string,
        });
      }

      // Segment (optional)
      if ((window as any).analytics?.group) {
        (window as any).analytics.group(groupId, traits);
      }

      this.log('group', { groupId, traits });
    });
  }

  /**
   * Reset analytics (on logout)
   */
  reset(): void {
    this.userId = null;
    this.anonymousId = this.generateAnonymousId();
    
    this.execute(() => {
      // PostHog (primary - free)
      if (ANALYTICS_CONFIG.posthog.enabled) {
        posthogService.reset();
      }

      // Segment (optional)
      if ((window as any).analytics?.reset) {
        (window as any).analytics.reset();
      }

      this.log('reset');
    });
  }

  // =====================================================
  // ONBOARDING SPECIFIC METHODS
  // =====================================================

  trackOnboardingStarted(source?: string): void {
    this.track('onboarding_started', {
      source: source || 'direct',
      startedAt: new Date().toISOString(),
    });
  }

  trackOnboardingStep(step: OnboardingStep, action: 'viewed' | 'completed' | 'skipped'): void {
    this.track(`onboarding_step_${action}`, {
      step,
      stepNumber: this.getStepNumber(step),
    });
  }

  trackOnboardingCompleted(data: {
    totalTime?: number;
    stepsCompleted?: number;
    sourceConnected?: boolean;
    teamInvited?: boolean;
  }): void {
    this.track('onboarding_completed', {
      ...data,
      completedAt: new Date().toISOString(),
    });
  }

  trackOnboardingAbandoned(lastStep: OnboardingStep, reason?: string): void {
    this.track('onboarding_abandoned', {
      lastStep,
      stepNumber: this.getStepNumber(lastStep),
      reason,
      abandonedAt: new Date().toISOString(),
    });
  }

  private getStepNumber(step: OnboardingStep): number {
    const steps: OnboardingStep[] = ['welcome', 'account_type', 'signup', 'company_info', 'industry_preview', 'connect_source', 'invite_team', 'tour', 'complete'];
    return steps.indexOf(step) + 1;
  }

  // =====================================================
  // CONVERSION TRACKING
  // =====================================================

  trackSignupStarted(method: 'email' | 'google' | 'microsoft' | 'sso'): void {
    this.track('signup_started', { method });
  }

  trackSignupCompleted(userId: string, plan: string): void {
    this.track('signup_completed', { userId, plan });
  }

  trackSubscription(event: 'started' | 'upgraded' | 'downgraded' | 'cancelled', data: {
    plan: string;
    previousPlan?: string;
    mrr?: number;
    billingCycle?: 'monthly' | 'yearly';
  }): void {
    this.track(`subscription_${event}`, data);
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  private execute(fn: () => void): void {
    if (this.initialized) {
      fn();
    } else {
      this.queue.push(fn);
    }
  }

  private processQueue(): void {
    while (this.queue.length > 0) {
      const fn = this.queue.shift();
      fn?.();
    }
  }

  private getOrCreateAnonymousId(): string {
    const key = 'pl_anonymous_id';
    let id = localStorage.getItem(key);
    if (!id) {
      id = this.generateAnonymousId();
      localStorage.setItem(key, id);
    }
    return id;
  }

  private generateAnonymousId(): string {
    return 'anon_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private generateSessionId(): string {
    return 'sess_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  }

  private log(method: string, data?: any): void {
    if (ANALYTICS_CONFIG.debug) {
      console.log(`[Analytics] ${method}`, data || '');
    }
  }

  getAnonymousId(): string {
    return this.anonymousId;
  }

  getUserId(): string | null {
    return this.userId;
  }

  getSessionId(): string {
    return this.sessionId;
  }
}

// Export singleton instance
export const analytics = new Analytics();

// Initialize on module load in browser
if (typeof window !== 'undefined') {
  analytics.init();
}

export default analytics;
