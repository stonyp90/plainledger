/**
 * Credential Rotation Hook
 * 
 * Checks connections for API key and OAuth token rotation needs
 * following security best practices.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useConnections } from '../features/connections/hooks/useConnections';
import {
  checkConnectionsForRotation,
  getRotationNotificationType,
  NotificationType,
} from '../lib/notifications';
import type { Connection } from '../features/connections/types';

/**
 * Hook to check and create notifications for credential rotation
 * Runs checks periodically (daily) and when connections change
 * Following security best practices:
 * - API Keys: Rotate every 90 days (warn at 67 days, require at 81 days)
 * - OAuth Tokens: Rotate every 180 days (warn at 135 days, require at 162 days)
 * 
 * @param addNotification - Function to add notifications (passed from NotificationProvider)
 * @param notifications - Current notifications array (to check for duplicates)
 */
export function useCredentialRotation(
  addNotification: (type: NotificationType, data?: Record<string, unknown>) => void,
  notifications: Array<{ type: string; data?: Record<string, unknown>; read: boolean; archived: boolean }>
) {
  const { connections, isLoading } = useConnections();
  const lastCheckRef = useRef<string>(''); // Track last check to avoid duplicates
  const notificationsRef = useRef(notifications); // Use ref to track notifications without causing re-renders
  const createdNotificationsRef = useRef<Set<string>>(new Set()); // Track which notifications we've created

  // Update notifications ref when it changes
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  const checkAndNotifyRotation = useCallback(() => {
    if (isLoading || !connections || connections.length === 0) {
      return;
    }

    // Create a unique key for this check based on connections
    const connectionsKey = connections.map(c => `${c.id}-${c.createdAt}`).join('|');
    
    // Skip if we just checked these exact connections
    if (lastCheckRef.current === connectionsKey) {
      return;
    }

    // Map connections to the format expected by checkConnectionsForRotation
    const connectionsForCheck = connections.map((conn: Connection) => ({
      id: conn.id,
      provider: conn.provider,
      authMethod: getAuthMethod(conn.provider),
      createdAt: conn.createdAt,
      connectedAt: conn.createdAt, // Use createdAt as fallback
    }));

    const rotationChecks = checkConnectionsForRotation(connectionsForCheck);

    // Get current notifications from ref to avoid dependency issues
    const currentNotifications = notificationsRef.current;

    // Create notifications for connections needing rotation
    for (const check of rotationChecks) {
      const notificationKey = `${check.connectionId}-${check.check.rotationType}`;
      
      // Skip if we already created this notification
      if (createdNotificationsRef.current.has(notificationKey)) {
        // Check if notification still exists (not read/archived)
        const stillExists = currentNotifications.some(
          (n) =>
            (n.type === 'api_key_rotation_recommended' ||
              n.type === 'api_key_rotation_required' ||
              n.type === 'oauth_token_rotation_recommended' ||
              n.type === 'oauth_token_rotation_required') &&
            n.data?.connectionId === check.connectionId &&
            !n.read &&
            !n.archived
        );
        
        if (stillExists) {
          continue; // Skip, notification already exists
        } else {
          // Notification was read/archived, remove from our tracking
          createdNotificationsRef.current.delete(notificationKey);
        }
      }

      // Check if notification already exists for this connection
      const existingNotification = currentNotifications.find(
        (n) =>
          (n.type === 'api_key_rotation_recommended' ||
            n.type === 'api_key_rotation_required' ||
            n.type === 'oauth_token_rotation_recommended' ||
            n.type === 'oauth_token_rotation_required') &&
          n.data?.connectionId === check.connectionId &&
          !n.read &&
          !n.archived
      );

      // Only create notification if it doesn't exist or if status changed
      if (!existingNotification || shouldUpdateNotification(existingNotification, check)) {
        const notificationType = getRotationNotificationType(
          check.credentialType,
          check.check.rotationType!
        );

        const providerName = getProviderDisplayName(check.provider);

        addNotification(notificationType, {
          connectionId: check.connectionId,
          provider: providerName,
          daysOld: check.check.daysOld,
          daysUntilRequired: check.check.daysUntilRequired,
          credentialType: check.credentialType,
        });

        // Track that we created this notification
        createdNotificationsRef.current.add(notificationKey);
      }
    }

    // Update last check reference
    lastCheckRef.current = connectionsKey;
  }, [connections, isLoading, addNotification]); // Removed notifications from deps to prevent infinite loop

  // Check on mount and when connections change
  useEffect(() => {
    checkAndNotifyRotation();
  }, [checkAndNotifyRotation]);

  // Set up daily check (check every 24 hours)
  useEffect(() => {
    const interval = setInterval(() => {
      checkAndNotifyRotation();
    }, 24 * 60 * 60 * 1000); // 24 hours

    return () => clearInterval(interval);
  }, [checkAndNotifyRotation]);

  return {
    checkRotation: checkAndNotifyRotation,
  };
}

/**
 * Determine auth method based on provider
 */
function getAuthMethod(provider: string): 'oauth2' | 'apiKey' | 'basicAuth' {
  const oauthProviders = ['quickbooks', 'xero', 'sage', 'freshbooks'];
  const apiKeyProviders = ['wave', 'api'];

  if (oauthProviders.includes(provider)) {
    return 'oauth2';
  }
  if (apiKeyProviders.includes(provider)) {
    return 'apiKey';
  }
  return 'basicAuth';
}

/**
 * Get display name for provider
 */
function getProviderDisplayName(provider: string): string {
  const providerNames: Record<string, string> = {
    quickbooks: 'QuickBooks',
    xero: 'Xero',
    sage: 'Sage',
    freshbooks: 'FreshBooks',
    wave: 'Wave',
    api: 'API',
  };
  return providerNames[provider] || provider;
}

/**
 * Check if notification should be updated (e.g., moved from recommended to required)
 */
function shouldUpdateNotification(
  existing: { type: string; data?: Record<string, unknown> },
  check: { check: { rotationType: 'recommended' | 'required' | null } }
): boolean {
  if (!existing.data) return true;

  const existingType = existing.type;
  const newType = check.check.rotationType;

  // Update if moved from recommended to required
  if (
    existingType.includes('recommended') &&
    newType === 'required'
  ) {
    return true;
  }

  return false;
}
