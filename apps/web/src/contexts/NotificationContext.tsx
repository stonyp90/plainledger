import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from 'react';
import { NovuProvider, useNotifications as useNovuNotifications, useNovu } from '@novu/react';
import type { Notification as NovuNotification } from '@novu/js';
import { 
  Notification, 
  NotificationPreferences, 
  defaultNotificationPreferences,
  NotificationType,
  notificationTemplates,
  formatNotificationMessage,
} from '../lib/notifications';
import { useCredentialRotation } from '../hooks/useCredentialRotation';
import { useAuth, isMockAuthEnabled } from '../lib/keycloak';
import { userSettingsApi } from '../lib/settings-api';

// ============================================================================
// Types
// ============================================================================

interface NotificationContextType {
  // State
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  isLoading: boolean;
  isPanelOpen: boolean;
  isNovuEnabled: boolean;
  
  // Actions
  addNotification: (type: NotificationType, data?: Record<string, unknown>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  archiveNotification: (id: string) => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => void;
  togglePanel: () => void;
  closePanel: () => void;
  
  // Toast notifications
  showToast: (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => void;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
}

// ============================================================================
// Context
// ============================================================================

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// ============================================================================
// Novu Configuration
// ============================================================================

const NOVU_APP_ID = import.meta.env.VITE_NOVU_APP_ID || '';
const CALENDLY_URL = 'https://calendly.com/anthonypaquet1508';

// ============================================================================
// Novu Provider (uses Novu hooks)
// ============================================================================

function NovuNotificationInner({ children }: { children: ReactNode }) {
  const novuNotifications = useNovuNotifications();
  const novu = useNovu();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultNotificationPreferences);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Map Novu notifications to our format
  const mapNovuNotification = useCallback((novuNotif: NovuNotification): Notification => {
    const payload = novuNotif.data as Record<string, unknown> | undefined;
    return {
      id: novuNotif.id,
      type: (payload?.type as NotificationType) || 'system_maintenance',
      category: (payload?.category as Notification['category']) || 'system',
      priority: (payload?.priority as Notification['priority']) || 'medium',
      title: novuNotif.subject || (payload?.title as string) || 'Notification',
      message: novuNotif.body || (payload?.message as string) || '',
      data: payload,
      read: novuNotif.isRead || false,
      archived: novuNotif.isArchived || false,
      actionUrl: payload?.actionUrl as string | undefined,
      actionLabel: payload?.actionLabel as string | undefined,
      createdAt: novuNotif.createdAt || new Date().toISOString(),
      readAt: novuNotif.readAt || undefined,
    };
  }, []);

  // Get notifications from Novu
  const notifications = useMemo(() => {
    if (novuNotifications?.notifications) {
      return novuNotifications.notifications.map(mapNovuNotification);
    }
    return [];
  }, [novuNotifications?.notifications, mapNovuNotification]);

  // Computed unread count
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read && !n.archived).length;
  }, [notifications]);

  // Load preferences
  useEffect(() => {
    const loadPreferences = async () => {
      // Skip API call in mock auth mode - no valid token to authenticate
      if (!isMockAuthEnabled()) {
        try {
          // Try to load from database first
          const settings = await userSettingsApi.get();
          if (settings?.notificationPreferences) {
            setPreferences({ ...defaultNotificationPreferences, ...settings.notificationPreferences });
            localStorage.setItem('notificationPreferences', JSON.stringify(settings.notificationPreferences));
            return;
          }
        } catch (error) {
          console.error('Failed to load preferences from database:', error);
        }
      }
      
      // Fallback to localStorage (always used in mock auth mode)
      try {
        const stored = localStorage.getItem('notificationPreferences');
        if (stored) {
          setPreferences({ ...defaultNotificationPreferences, ...JSON.parse(stored) });
        }
      } catch (error) {
        console.error('Failed to load preferences from localStorage:', error);
      }
    };
    
    loadPreferences();
  }, []);

  // Add a new notification (not used with Novu)
  const addNotification = useCallback(() => {
    console.warn('addNotification is not available when using Novu - trigger from server');
  }, []);

  // Mark notification as read - this makes it "disappear" from unread
  const markAsRead = useCallback(async (id: string) => {
    try {
      const notif = novuNotifications?.notifications?.find(n => n.id === id);
      if (notif && !notif.isRead) {
        await novu.notifications.read({ notificationId: id });
      }
    } catch (error) {
      console.error('Failed to mark notification as read in Novu:', error);
    }
  }, [novu, novuNotifications?.notifications]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await novuNotifications.readAll();
    } catch (error) {
      console.error('Failed to mark all notifications as read in Novu:', error);
    }
  }, [novuNotifications]);

  // Archive notification - removes from list
  const archiveNotification = useCallback(async (id: string) => {
    try {
      await novu.notifications.archive({ notificationId: id });
    } catch (error) {
      console.error('Failed to archive notification in Novu:', error);
    }
  }, [novu]);

  // Delete notification
  const deleteNotification = useCallback(async (id: string) => {
    try {
      await novu.notifications.delete({ notificationId: id });
    } catch (error) {
      console.error('Failed to delete notification in Novu:', error);
    }
  }, [novu]);

  // Clear all notifications
  const clearAll = useCallback(async () => {
    try {
      await novuNotifications.readAll();
      await novuNotifications.archiveAllRead();
    } catch (error) {
      console.error('Failed to clear notifications in Novu:', error);
    }
  }, [novuNotifications]);

  // Update preferences
  const updatePreferences = useCallback(async (prefs: Partial<NotificationPreferences>) => {
    setPreferences(prev => {
      const updated = { ...prev, ...prefs };
      localStorage.setItem('notificationPreferences', JSON.stringify(updated));
      
      // Skip API call in mock auth mode - no valid token to authenticate
      if (!isMockAuthEnabled()) {
        userSettingsApi.updateNotificationPreferences({
          notificationPreferences: updated,
        }).catch(error => {
          console.error('Failed to save notification preferences to database:', error);
        });
      }
      
      return updated;
    });
  }, []);

  // Panel controls
  const togglePanel = useCallback(() => setIsPanelOpen(prev => !prev), []);
  const closePanel = useCallback(() => setIsPanelOpen(false), []);

  // Toast notifications
  const showToast = useCallback((
    type: 'success' | 'error' | 'warning' | 'info',
    message: string,
    title?: string
  ) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Filter out archived notifications
  const visibleNotifications = notifications.filter(n => !n.archived);

  return (
    <NotificationContext.Provider
      value={{
        notifications: visibleNotifications,
        unreadCount,
        preferences,
        isLoading: novuNotifications?.isLoading || false,
        isPanelOpen,
        isNovuEnabled: true,
        addNotification,
        markAsRead,
        markAllAsRead,
        archiveNotification,
        deleteNotification,
        clearAll,
        updatePreferences,
        togglePanel,
        closePanel,
        showToast,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </NotificationContext.Provider>
  );
}

// ============================================================================
// Local Provider (without Novu - fallback)
// ============================================================================

const NOTIFICATIONS_STORAGE_KEY = 'plainledger-notifications';

function LocalNotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultNotificationPreferences);
  const [isLoading, setIsLoading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const isDemoSignupUser = user?.organization === 'demo-signup';

  // Persist notifications to localStorage whenever they change
  const persistNotifications = useCallback((notifs: Notification[]) => {
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifs));
    } catch (error) {
      console.error('Failed to persist notifications to localStorage:', error);
    }
  }, []);

  // Load notifications on mount
  useEffect(() => {
    loadNotifications();
    loadPreferences();
  }, [isDemoSignupUser, user?.firstName]);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      // First, try to load from localStorage
      const storedNotifications = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (storedNotifications) {
        try {
          const parsed = JSON.parse(storedNotifications) as Notification[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setNotifications(parsed);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.error('Failed to parse stored notifications:', e);
        }
      }

      // No stored notifications - create initial ones based on user type
      if (isDemoSignupUser) {
        const storedLang = localStorage.getItem('plainledger-language') || 'en';
        const isEn = storedLang === 'en';
        
        const welcomeNotification: Notification[] = [
          {
            id: 'welcome-1',
            type: 'welcome',
            category: 'account',
            priority: 'high',
            title: user?.firstName 
              ? (isEn ? `Welcome ${user.firstName}! 👋` : `Bienvenue ${user.firstName}! 👋`)
              : (isEn ? 'Welcome to PlainLedger! 👋' : 'Bienvenue sur PlainLedger! 👋'),
            message: isEn 
              ? 'We\'re excited to have you! Schedule a personalized onboarding session with our Customer Success team to get the most out of PlainLedger and connect your accounting software.'
              : 'Nous sommes ravis de vous accueillir! Planifiez une session d\'intégration personnalisée avec notre équipe pour tirer le meilleur parti de PlainLedger et connecter votre logiciel comptable.',
            read: false,
            archived: false,
            actionUrl: CALENDLY_URL,
            actionLabel: isEn ? 'Schedule Onboarding' : 'Planifier l\'intégration',
            createdAt: new Date().toISOString(),
          },
        ];
        setNotifications(welcomeNotification);
        persistNotifications(welcomeNotification);
      } else {
        // Demo/development notifications - only created on first visit
        const storedLang = localStorage.getItem('plainledger-language') || 'en';
        const isEn = storedLang === 'en';
        
        const mockNotifications: Notification[] = [
          {
            id: '1',
            type: 'sync_completed',
            category: 'data_sync',
            priority: 'low',
            title: isEn ? 'Sync completed' : 'Synchronisation terminée',
            message: isEn 
              ? 'QuickBooks sync completed. 156 transactions updated.'
              : 'La synchronisation avec QuickBooks est terminée. 156 transactions mises à jour.',
            read: false,
            archived: false,
            actionUrl: '/app/connections',
            actionLabel: isEn ? 'View details' : 'Voir les détails',
            createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
          },
          {
            id: '2',
            type: 'usage_limit_warning',
            category: 'billing',
            priority: 'medium',
            title: isEn ? 'Usage limit approaching' : 'Limite d\'utilisation proche',
            message: isEn 
              ? 'You have used 80% of your report quota this month.'
              : 'Vous avez utilisé 80% de votre quota de rapports ce mois-ci.',
            read: false,
            archived: false,
            actionUrl: '/app/settings',
            actionLabel: isEn ? 'Upgrade' : 'Mettre à niveau',
            createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
          },
        ];
        setNotifications(mockNotifications);
        persistNotifications(mockNotifications);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPreferences = async () => {
    // Skip API call in mock auth mode - no valid token to authenticate
    if (!isMockAuthEnabled()) {
      try {
        // Try to load from database first
        const settings = await userSettingsApi.get();
        if (settings?.notificationPreferences) {
          setPreferences({ ...defaultNotificationPreferences, ...settings.notificationPreferences });
          localStorage.setItem('notificationPreferences', JSON.stringify(settings.notificationPreferences));
          return;
        }
      } catch (error) {
        console.error('Failed to load preferences from database:', error);
      }
    }
    
    // Fallback to localStorage (always used in mock auth mode)
    try {
      const stored = localStorage.getItem('notificationPreferences');
      if (stored) {
        setPreferences({ ...defaultNotificationPreferences, ...JSON.parse(stored) });
      }
    } catch (error) {
      console.error('Failed to load preferences from localStorage:', error);
    }
  };

  // Computed values
  const unreadCount = notifications.filter(n => !n.read && !n.archived).length;

  // Add a new notification
  const addNotification = useCallback((type: NotificationType, data?: Record<string, unknown>) => {
    const template = notificationTemplates[type];
    if (!template) return;

    const notification: Notification = {
      id: crypto.randomUUID(),
      type,
      category: template.category,
      priority: template.priority,
      title: formatNotificationMessage(template.title, data || {}),
      message: formatNotificationMessage(template.message, data || {}),
      data,
      read: false,
      archived: false,
      actionUrl: template.actionUrl,
      actionLabel: template.actionLabel,
      createdAt: new Date().toISOString(),
    };

    setNotifications(prev => {
      const updated = [notification, ...prev];
      persistNotifications(updated);
      return updated;
    });

    if (template.priority === 'high' || template.priority === 'urgent') {
      showToast('info', notification.message, notification.title);
    }
  }, [persistNotifications]);

  // Check for credential rotation needs (security best practice)
  // Only runs in local provider, not with Novu (Novu handles notifications server-side)
  // Pass addNotification and notifications directly to avoid circular dependency
  useCredentialRotation(addNotification, notifications);

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n
      );
      persistNotifications(updated);
      return updated;
    });
  }, [persistNotifications]);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() }));
      persistNotifications(updated);
      return updated;
    });
  }, [persistNotifications]);

  // Archive notification
  const archiveNotification = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, archived: true } : n);
      persistNotifications(updated);
      return updated;
    });
  }, [persistNotifications]);

  // Delete notification
  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== id);
      persistNotifications(updated);
      return updated;
    });
  }, [persistNotifications]);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    persistNotifications([]);
  }, [persistNotifications]);

  // Update preferences
  const updatePreferences = useCallback(async (prefs: Partial<NotificationPreferences>) => {
    setPreferences(prev => {
      const updated = { ...prev, ...prefs };
      localStorage.setItem('notificationPreferences', JSON.stringify(updated));
      
      // Skip API call in mock auth mode - no valid token to authenticate
      if (!isMockAuthEnabled()) {
        userSettingsApi.updateNotificationPreferences({
          notificationPreferences: updated,
        }).catch(error => {
          console.error('Failed to save notification preferences to database:', error);
        });
      }
      
      return updated;
    });
  }, []);

  // Panel controls
  const togglePanel = useCallback(() => setIsPanelOpen(prev => !prev), []);
  const closePanel = useCallback(() => setIsPanelOpen(false), []);

  // Toast notifications
  const showToast = useCallback((
    type: 'success' | 'error' | 'warning' | 'info',
    message: string,
    title?: string
  ) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications: notifications.filter(n => !n.archived),
        unreadCount,
        preferences,
        isLoading,
        isPanelOpen,
        isNovuEnabled: false,
        addNotification,
        markAsRead,
        markAllAsRead,
        archiveNotification,
        deleteNotification,
        clearAll,
        updatePreferences,
        togglePanel,
        closePanel,
        showToast,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </NotificationContext.Provider>
  );
}

// ============================================================================
// Error Boundary for Novu Provider
// ============================================================================

interface NovuErrorBoundaryState {
  hasError: boolean;
}

class NovuErrorBoundary extends React.Component<
  { children: ReactNode; fallback: ReactNode },
  NovuErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): NovuErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Novu notification error, falling back to local:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// ============================================================================
// Main Provider (chooses between Novu and Local)
// ============================================================================

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user, authenticated } = useAuth();
  
  // Check if Novu is configured and user is authenticated
  const novuEnabled = Boolean(NOVU_APP_ID && authenticated && user?.id);
  
  // Debug logging
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[Notifications] Config:', {
        novuAppId: NOVU_APP_ID ? `${NOVU_APP_ID.substring(0, 6)}...` : 'not set',
        authenticated,
        userId: user?.id ? `${user.id.substring(0, 8)}...` : 'no user',
        novuEnabled,
      });
    }
  }, [authenticated, user?.id, novuEnabled]);
  
  const localFallback = (
    <LocalNotificationProvider>
      {children}
    </LocalNotificationProvider>
  );
  
  if (novuEnabled && user?.id) {
    return (
      <NovuErrorBoundary fallback={localFallback}>
        <NovuProvider
          subscriberId={user.id}
          applicationIdentifier={NOVU_APP_ID}
        >
          <NovuNotificationInner>
            {children}
          </NovuNotificationInner>
        </NovuProvider>
      </NovuErrorBoundary>
    );
  }
  
  // Fallback to local notifications
  return localFallback;
}

// ============================================================================
// Toast Container Component
// ============================================================================

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  const iconMap = {
    success: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'rgb(var(--color-success))' }}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'rgb(var(--color-error))' }}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'rgb(var(--color-warning))' }}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'rgb(var(--color-info))' }}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <div className="flex-shrink-0">{iconMap[toast.type]}</div>
          <div className="flex-1 min-w-0">
            {toast.title && (
              <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>{toast.title}</p>
            )}
            <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{toast.message}</p>
          </div>
          <button
            onClick={() => onRemove(toast.id)}
            className="flex-shrink-0 transition-colors"
            style={{ color: 'rgb(var(--color-text-muted))' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'rgb(var(--color-text-secondary))'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(var(--color-text-muted))'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
