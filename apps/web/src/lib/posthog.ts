/**
 * PostHog Analytics Integration
 * Product analytics, session recording, and feature flags
 *
 * PostHog provides:
 * - Product analytics (1M events/month free)
 * - Session recordings (5K/month free)
 * - Feature flags (1M requests/month free)
 * - Error tracking (100K exceptions/month free)
 *
 * @see https://posthog.com/docs
 */

import posthog from 'posthog-js';

// ============================================================================
// Configuration
// ============================================================================

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || 'phc_2nSLndf5sZu7lXOugOH7g7w3oNwxF24Hewla7X3CT2s';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

// Check if PostHog is available (loaded via script tag)
const isPostHogAvailable = typeof window !== 'undefined' && window.posthog;

// ============================================================================
// Types
// ============================================================================

export interface PostHogUserProperties {
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  organizationId?: string;
  organizationName?: string;
  subscriptionTier?: 'free' | 'pro' | 'premium';
  industry?: string;
  connectedSources?: number;
  signupDate?: string;
  locale?: string;
}

export interface PostHogEventProperties {
  [key: string]: string | number | boolean | null | undefined | string[];
}

// ============================================================================
// PostHog Service
// ============================================================================

class PostHogService {
  private initialized = false;

  /**
   * Initialize PostHog (called from main.tsx if not using script tag)
   */
  init(): void {
    if (this.initialized || !POSTHOG_KEY) return;

    // If not loaded via script tag, initialize here
    if (!isPostHogAvailable) {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        person_profiles: 'identified_only',
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: true,
        session_recording: {
          maskAllInputs: true,
          maskTextSelector: '[data-mask]',
        },
        // Respect Do Not Track
        respect_dnt: true,
        // Disable in development if needed
        loaded: (ph) => {
          if (import.meta.env.DEV) {
            // Optionally disable in dev
            // ph.opt_out_capturing();
          }
        },
      });
    }

    this.initialized = true;
  }

  /**
   * Get PostHog instance
   */
  private get ph() {
    return isPostHogAvailable ? window.posthog : posthog;
  }

  // --------------------------------------------------------------------------
  // User Identification
  // --------------------------------------------------------------------------

  /**
   * Identify a user (call after login)
   */
  identify(userId: string, properties?: PostHogUserProperties): void {
    if (!this.ph) return;

    this.ph.identify(userId, properties);

    // Also set person properties for feature flags
    if (properties) {
      this.ph.setPersonPropertiesForFlags(properties);
    }
  }

  /**
   * Reset user (call on logout)
   */
  reset(): void {
    if (!this.ph) return;
    this.ph.reset();
  }

  /**
   * Update user properties
   */
  setUserProperties(properties: PostHogUserProperties): void {
    if (!this.ph) return;
    this.ph.setPersonProperties(properties);
  }

  // --------------------------------------------------------------------------
  // Event Tracking
  // --------------------------------------------------------------------------

  /**
   * Track a custom event
   */
  track(eventName: string, properties?: PostHogEventProperties): void {
    if (!this.ph) return;
    this.ph.capture(eventName, properties);
  }

  /**
   * Track page view (for SPA navigation)
   */
  trackPageView(path?: string): void {
    if (!this.ph) return;
    this.ph.capture('$pageview', {
      $current_url: path || window.location.href,
    });
  }

  // --------------------------------------------------------------------------
  // Journey Events (GTM)
  // --------------------------------------------------------------------------

  /**
   * Track signup started
   */
  trackSignupStarted(source?: string): void {
    this.track('signup_started', { source });
  }

  /**
   * Track signup completed
   */
  trackSignupCompleted(properties?: {
    method?: 'email' | 'google' | 'microsoft';
    referrer?: string;
  }): void {
    this.track('signup_completed', properties);
  }

  /**
   * Track onboarding step
   */
  trackOnboardingStep(step: string, action: 'viewed' | 'completed' | 'skipped'): void {
    this.track(`onboarding_${action}`, {
      step,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track first connection
   */
  trackFirstConnection(provider: string): void {
    this.track('first_connection', {
      provider,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track first report
   */
  trackFirstReport(reportType: string): void {
    this.track('first_report', {
      report_type: reportType,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track subscription event
   */
  trackSubscription(action: 'started' | 'upgraded' | 'downgraded' | 'cancelled', properties?: {
    plan?: string;
    price?: number;
    billingCycle?: 'monthly' | 'yearly';
  }): void {
    this.track(`subscription_${action}`, properties);
  }

  // --------------------------------------------------------------------------
  // Feature Flags
  // --------------------------------------------------------------------------

  /**
   * Check if a feature flag is enabled
   */
  isFeatureEnabled(flagKey: string): boolean {
    if (!this.ph) return false;
    return this.ph.isFeatureEnabled(flagKey) ?? false;
  }

  /**
   * Get feature flag value
   */
  getFeatureFlag(flagKey: string): string | boolean | undefined {
    if (!this.ph) return undefined;
    return this.ph.getFeatureFlag(flagKey);
  }

  /**
   * Get feature flag payload
   */
  getFeatureFlagPayload(flagKey: string): unknown {
    if (!this.ph) return undefined;
    return this.ph.getFeatureFlagPayload(flagKey);
  }

  /**
   * Reload feature flags
   */
  reloadFeatureFlags(): void {
    if (!this.ph) return;
    this.ph.reloadFeatureFlags();
  }

  // --------------------------------------------------------------------------
  // Session Recording
  // --------------------------------------------------------------------------

  /**
   * Start session recording
   */
  startSessionRecording(): void {
    if (!this.ph) return;
    this.ph.startSessionRecording();
  }

  /**
   * Stop session recording
   */
  stopSessionRecording(): void {
    if (!this.ph) return;
    this.ph.stopSessionRecording();
  }

  /**
   * Get session replay URL (for support)
   */
  getSessionReplayUrl(): string | undefined {
    if (!this.ph) return undefined;
    return this.ph.get_session_replay_url?.();
  }

  // --------------------------------------------------------------------------
  // Error Tracking
  // --------------------------------------------------------------------------

  /**
   * Capture an exception
   */
  captureException(error: Error, properties?: Record<string, unknown>): void {
    if (!this.ph) return;
    this.ph.captureException?.(error, properties);
  }

  // --------------------------------------------------------------------------
  // Groups (for B2B)
  // --------------------------------------------------------------------------

  /**
   * Set organization group (for B2B analytics)
   */
  setOrganization(orgId: string, properties?: {
    name?: string;
    industry?: string;
    size?: string;
    plan?: string;
  }): void {
    if (!this.ph) return;
    this.ph.group('organization', orgId, properties);
  }

  // --------------------------------------------------------------------------
  // Privacy
  // --------------------------------------------------------------------------

  /**
   * Opt user out of tracking
   */
  optOut(): void {
    if (!this.ph) return;
    this.ph.opt_out_capturing();
  }

  /**
   * Opt user back in to tracking
   */
  optIn(): void {
    if (!this.ph) return;
    this.ph.opt_in_capturing();
  }

  /**
   * Check if user has opted out
   */
  hasOptedOut(): boolean {
    if (!this.ph) return false;
    return this.ph.has_opted_out_capturing?.() ?? false;
  }

  // --------------------------------------------------------------------------
  // Debug
  // --------------------------------------------------------------------------

  /**
   * Enable debug mode
   */
  debug(enabled = true): void {
    if (!this.ph) return;
    this.ph.debug(enabled);
  }

  /**
   * Get distinct ID
   */
  getDistinctId(): string | undefined {
    if (!this.ph) return undefined;
    return this.ph.get_distinct_id?.();
  }
}

// ============================================================================
// Exports
// ============================================================================

export const posthogService = new PostHogService();

// Type declaration for window.posthog
declare global {
  interface Window {
    posthog: typeof posthog;
  }
}

export default posthogService;
