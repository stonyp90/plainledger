/**
 * Journey CTA Hook
 * Checks user state and triggers appropriate in-app CTA notifications
 *
 * This hook monitors:
 * - Whether the user has connected data sources
 * - Days since signup
 * - Features used
 * - Trial status
 *
 * And triggers relevant CTAs to guide users through the journey.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../lib/keycloak';
import { useNotifications } from '../contexts/NotificationContext';
import type { NotificationType } from '../lib/notifications';

// Storage keys
const JOURNEY_STATE_KEY = 'pl_journey_state';
const CTA_SHOWN_KEY = 'pl_cta_shown';

interface JourneyState {
  signupAt: string;
  hasConnections: boolean;
  hasReports: boolean;
  lastCheckedAt: string;
  ctasShown: string[];
}

interface UseJourneyCTAOptions {
  /**
   * Whether to check for connections (requires API call)
   */
  checkConnections?: boolean;
  
  /**
   * Whether to check for reports (requires API call)
   */
  checkReports?: boolean;
  
  /**
   * Minimum hours between showing the same CTA
   */
  ctaCooldownHours?: number;
}

/**
 * Hook to manage journey CTAs
 */
export function useJourneyCTA(options: UseJourneyCTAOptions = {}) {
  const { user, authenticated } = useAuth();
  const { addNotification, notifications } = useNotifications();
  const checkedRef = useRef(false);
  
  const {
    checkConnections = true,
    checkReports = false,
    ctaCooldownHours = 24,
  } = options;

  /**
   * Get journey state from localStorage
   */
  const getJourneyState = useCallback((): JourneyState => {
    try {
      const stored = localStorage.getItem(JOURNEY_STATE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse journey state:', e);
    }
    
    // Default state for new users
    return {
      signupAt: new Date().toISOString(),
      hasConnections: false,
      hasReports: false,
      lastCheckedAt: new Date().toISOString(),
      ctasShown: [],
    };
  }, []);

  /**
   * Save journey state to localStorage
   */
  const saveJourneyState = useCallback((state: JourneyState) => {
    try {
      localStorage.setItem(JOURNEY_STATE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save journey state:', e);
    }
  }, []);

  /**
   * Check if a CTA can be shown (respects cooldown)
   */
  const canShowCTA = useCallback((ctaType: string): boolean => {
    try {
      const shown = localStorage.getItem(CTA_SHOWN_KEY);
      if (!shown) return true;
      
      const ctaRecord = JSON.parse(shown) as Record<string, string>;
      const lastShown = ctaRecord[ctaType];
      if (!lastShown) return true;
      
      const hoursSinceShown = (Date.now() - new Date(lastShown).getTime()) / (1000 * 60 * 60);
      return hoursSinceShown >= ctaCooldownHours;
    } catch (e) {
      return true;
    }
  }, [ctaCooldownHours]);

  /**
   * Mark a CTA as shown
   */
  const markCTAShown = useCallback((ctaType: string) => {
    try {
      const shown = localStorage.getItem(CTA_SHOWN_KEY);
      const ctaRecord = shown ? JSON.parse(shown) : {};
      ctaRecord[ctaType] = new Date().toISOString();
      localStorage.setItem(CTA_SHOWN_KEY, JSON.stringify(ctaRecord));
    } catch (e) {
      console.error('Failed to mark CTA shown:', e);
    }
  }, []);

  /**
   * Show a CTA notification if conditions are met
   */
  const showCTA = useCallback((type: NotificationType) => {
    // Check if CTA already exists in notifications
    const exists = notifications.some(n => n.type === type && !n.archived);
    if (exists) return;
    
    // Check cooldown
    if (!canShowCTA(type)) return;
    
    // Add the notification
    addNotification(type);
    markCTAShown(type);
  }, [notifications, canShowCTA, addNotification, markCTAShown]);

  /**
   * Check for connections via API
   */
  const checkForConnections = useCallback(async (): Promise<boolean> => {
    if (!authenticated) return false;
    
    try {
      // Check localStorage cache first (valid for 5 minutes)
      const state = getJourneyState();
      const cacheAge = (Date.now() - new Date(state.lastCheckedAt).getTime()) / (1000 * 60);
      if (cacheAge < 5 && state.hasConnections) {
        return true;
      }
      
      // Fetch from API - gracefully handle if endpoint not available
      let hasConnections = false;
      try {
        const response = await fetch('/api/datasources', {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          hasConnections = Array.isArray(data) && data.length > 0;
        }
      } catch {
        // Network error or API unavailable - assume no connections
        hasConnections = false;
      }
      
      // Update cache
      saveJourneyState({
        ...state,
        hasConnections,
        lastCheckedAt: new Date().toISOString(),
      });
      
      return hasConnections;
    } catch (e) {
      console.error('Failed to check connections:', e);
      return false;
    }
  }, [authenticated, getJourneyState, saveJourneyState]);

  /**
   * Main effect to check state and show CTAs
   */
  useEffect(() => {
    // Only run once per mount
    if (checkedRef.current) return;
    if (!authenticated || !user?.id) return;
    
    checkedRef.current = true;
    
    const checkAndShowCTAs = async () => {
      const state = getJourneyState();
      const daysSinceSignup = Math.floor(
        (Date.now() - new Date(state.signupAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Check connections if enabled
      let hasConnections = state.hasConnections;
      if (checkConnections) {
        hasConnections = await checkForConnections();
      }
      
      // Determine which CTA to show based on state
      if (!hasConnections) {
        // No connections - show connect CTA
        if (daysSinceSignup === 0) {
          // Day 0: Welcome, don't overwhelm
          // (welcome notification should be shown by NotificationContext)
        } else if (daysSinceSignup >= 1 && daysSinceSignup <= 3) {
          // Days 1-3: Gentle nudge to connect
          showCTA('journey_connect_source');
        } else if (daysSinceSignup >= 4 && daysSinceSignup <= 7) {
          // Days 4-7: Offer onboarding help
          showCTA('journey_schedule_onboarding');
        }
      } else if (hasConnections && !state.hasReports && checkReports) {
        // Has connections but no reports
        showCTA('journey_first_report');
      }
    };
    
    // Small delay to let the app settle
    const timeout = setTimeout(checkAndShowCTAs, 2000);
    return () => clearTimeout(timeout);
  }, [
    authenticated,
    user?.id,
    checkConnections,
    checkReports,
    getJourneyState,
    checkForConnections,
    showCTA,
  ]);

  /**
   * Manually trigger a CTA (for use in components)
   */
  const triggerCTA = useCallback((type: NotificationType, force = false) => {
    if (force || canShowCTA(type)) {
      addNotification(type);
      markCTAShown(type);
    }
  }, [canShowCTA, addNotification, markCTAShown]);

  /**
   * Update journey state (e.g., when user connects a source)
   */
  const updateJourneyState = useCallback((updates: Partial<JourneyState>) => {
    const state = getJourneyState();
    saveJourneyState({ ...state, ...updates });
  }, [getJourneyState, saveJourneyState]);

  return {
    triggerCTA,
    updateJourneyState,
    checkForConnections,
  };
}

export default useJourneyCTA;
