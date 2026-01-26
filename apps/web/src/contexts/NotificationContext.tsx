import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { 
  Notification, 
  NotificationPreferences, 
  defaultNotificationPreferences,
  NotificationType,
  notificationTemplates,
  formatNotificationMessage,
} from '../lib/notifications';

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
// Provider
// ============================================================================

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultNotificationPreferences);
  const [isLoading, setIsLoading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Load notifications on mount
  useEffect(() => {
    loadNotifications();
    loadPreferences();
  }, []);

  // Load notifications from API/storage
  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      // Mock data - replace with API call
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'sync_completed',
          category: 'data_sync',
          priority: 'low',
          title: 'Synchronisation terminée',
          message: 'La synchronisation avec QuickBooks est terminée. 156 transactions mises à jour.',
          read: false,
          archived: false,
          actionUrl: '/app/connections',
          actionLabel: 'Voir les détails',
          createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
        },
        {
          id: '2',
          type: 'usage_limit_warning',
          category: 'billing',
          priority: 'medium',
          title: 'Limite d\'utilisation proche',
          message: 'Vous avez utilisé 80% de votre quota de rapports ce mois-ci.',
          read: false,
          archived: false,
          actionUrl: '/app/settings',
          actionLabel: 'Mettre à niveau',
          createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
        },
        {
          id: '3',
          type: 'report_generated',
          category: 'reports',
          priority: 'medium',
          title: 'Rapport généré',
          message: 'Votre rapport "Bilan Q4 2025" a été généré avec succès.',
          read: true,
          archived: false,
          actionUrl: '/app/reports',
          actionLabel: 'Voir le rapport',
          createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
        },
        {
          id: '4',
          type: 'login_new_device',
          category: 'security',
          priority: 'high',
          title: 'Connexion depuis un nouvel appareil',
          message: 'Une connexion a été détectée depuis MacBook Pro - Toronto, ON',
          read: true,
          archived: false,
          createdAt: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
        },
      ];
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load preferences from storage
  const loadPreferences = () => {
    try {
      const stored = localStorage.getItem('notificationPreferences');
      if (stored) {
        setPreferences({ ...defaultNotificationPreferences, ...JSON.parse(stored) });
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
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

    setNotifications(prev => [notification, ...prev]);

    // Show toast for high priority notifications
    if (template.priority === 'high' || template.priority === 'urgent') {
      showToast('info', notification.message, notification.title);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n
      )
    );
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() }))
    );
  }, []);

  // Archive notification
  const archiveNotification = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, archived: true } : n)
    );
  }, []);

  // Delete notification
  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Update preferences
  const updatePreferences = useCallback((prefs: Partial<NotificationPreferences>) => {
    setPreferences(prev => {
      const updated = { ...prev, ...prefs };
      localStorage.setItem('notificationPreferences', JSON.stringify(updated));
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
    
    // Auto remove after 5 seconds
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
      <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <p className="text-sm font-medium text-gray-900">{toast.title}</p>
            )}
            <p className="text-sm text-gray-600">{toast.message}</p>
          </div>
          <button
            onClick={() => onRemove(toast.id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
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
