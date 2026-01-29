import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  X,
  Settings, 
  Trash2,
  Link2,
  FileText,
  CreditCard,
  RefreshCw,
  Shield,
  User,
  Megaphone,
  Loader2,
} from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { Notification, NotificationCategory, getRelativeTime } from '../lib/notifications';

// Category icons mapping
const categoryIcons: Record<NotificationCategory, React.ElementType> = {
  account: User,
  security: Shield,
  billing: CreditCard,
  data_sync: RefreshCw,
  reports: FileText,
  connections: Link2,
  system: Bell,
  marketing: Megaphone,
};

// Category colors mapping using CSS variables - Design system colors
const categoryStyles: Record<NotificationCategory, { bg: string; color: string }> = {
  account: { bg: 'rgb(var(--color-info) / 0.1)', color: 'rgb(var(--color-info))' },
  security: { bg: 'rgb(var(--color-error) / 0.1)', color: 'rgb(var(--color-error))' },
  billing: { bg: 'rgb(var(--color-success) / 0.1)', color: 'rgb(var(--color-success))' },
  data_sync: { bg: 'rgb(var(--color-primary-500) / 0.1)', color: 'rgb(var(--color-primary-600))' },
  reports: { bg: 'rgb(var(--color-warning) / 0.1)', color: 'rgb(var(--color-warning))' },
  connections: { bg: 'rgb(var(--color-primary-500) / 0.1)', color: 'rgb(var(--color-primary-600))' },
  system: { bg: 'rgb(var(--color-bg-muted))', color: 'rgb(var(--color-text-secondary))' },
  marketing: { bg: 'rgb(var(--color-accent-500) / 0.1)', color: 'rgb(var(--color-accent-600))' },
};

export default function NotificationPanel() {
  const {
    notifications,
    unreadCount,
    isPanelOpen,
    isLoading,
    togglePanel,
    closePanel,
    markAsRead,
    markAllAsRead,
    archiveNotification,
  } = useNotifications();
  
  const panelRef = useRef<HTMLDivElement>(null);
  const isClickInsideRef = useRef(false);
  const navigate = useNavigate();
  const viewedNotificationsRef = useRef<Set<string>>(new Set());

  // Auto-mark notifications as read when panel opens and they become visible
  useEffect(() => {
    if (!isPanelOpen) {
      viewedNotificationsRef.current = new Set();
      return;
    }

    // Mark unread notifications as read after they've been visible for 2 seconds
    const unreadNotifs = notifications.filter(n => !n.read && !viewedNotificationsRef.current.has(n.id));
    
    if (unreadNotifs.length === 0) return;

    const timeoutId = setTimeout(() => {
      unreadNotifs.forEach(notification => {
        markAsRead(notification.id);
        viewedNotificationsRef.current.add(notification.id);
      });
    }, 2000); // 2 second delay before marking as read

    return () => clearTimeout(timeoutId);
  }, [isPanelOpen, notifications, markAsRead]);

  // Track clicks inside the panel
  const handlePanelMouseDown = useCallback(() => {
    isClickInsideRef.current = true;
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    if (!isPanelOpen) return;

    function handleClickOutside(event: MouseEvent) {
      // Skip if click was inside the panel
      if (isClickInsideRef.current) {
        isClickInsideRef.current = false;
        return;
      }
      
      // Check if click is outside the panel ref
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        closePanel();
      }
    }
    
    // Add listener after a short delay to avoid the opening click
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
      isClickInsideRef.current = false;
    };
  }, [isPanelOpen, closePanel]);

  // Close panel on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closePanel();
      }
    }
    
    if (isPanelOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isPanelOpen, closePanel]);

  // Prevent body scroll when panel is open on mobile
  useEffect(() => {
    if (isPanelOpen && window.innerWidth < 640) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isPanelOpen]);

  return (
    <div className="relative" ref={panelRef} onMouseDown={handlePanelMouseDown}>
      {/* Bell Icon Button - Touch-friendly */}
      <button
        onClick={togglePanel}
        className="icon-btn relative"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
        {unreadCount > 0 && (
          <span 
            className="absolute -top-0.5 -right-0.5 sm:top-0 sm:right-0 w-4 h-4 sm:w-5 sm:h-5 text-[10px] sm:text-xs font-semibold rounded-full flex items-center justify-center shadow-sm"
            style={{ 
              backgroundColor: 'rgb(var(--color-primary-600))', 
              color: 'white',
              boxShadow: '0 2px 4px rgb(var(--color-primary-600) / 0.3)'
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Mobile overlay backdrop */}
      {isPanelOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 sm:hidden"
          onClick={(e) => {
            e.stopPropagation();
            closePanel();
          }}
        />
      )}

      {/* Notification Panel - Mobile optimized */}
      {isPanelOpen && (
        <div className="notification-panel z-50">
          {/* Header */}
          <div 
            className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b sticky top-0 backdrop-blur-sm"
            style={{ 
              borderColor: 'rgb(var(--color-border))',
              backgroundColor: 'rgb(var(--color-surface) / 0.95)',
            }}
          >
            <h3 className="font-semibold text-sm sm:text-base" style={{ color: 'rgb(var(--color-text))' }}>
              Notifications
              {unreadCount > 0 && (
                <span 
                  className="ml-2 px-1.5 py-0.5 text-[10px] sm:text-xs rounded-full font-medium"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-primary-500) / 0.1)', 
                    color: 'rgb(var(--color-primary-700))',
                    border: '1px solid rgb(var(--color-primary-500) / 0.2)'
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-1 sm:gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    markAllAsRead();
                  }}
                  className="text-xs flex items-center gap-1 icon-btn p-1.5 sm:p-2"
                  title="Tout marquer comme lu"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  closePanel();
                  setTimeout(() => navigate('/app/settings'), 0);
                }}
                className="icon-btn p-1.5 sm:p-2"
                title="Paramètres"
              >
                <Settings className="w-4 h-4" />
              </button>
              {/* Close button on mobile */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  closePanel();
                }}
                className="sm:hidden icon-btn p-1.5"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification List - Touch-optimized scroll */}
          <div 
            className="max-h-[60vh] sm:max-h-[400px] overflow-y-auto"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {isLoading ? (
              <div className="py-10 sm:py-12 text-center">
                <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 animate-spin" style={{ color: 'rgb(var(--color-primary-600))' }} />
                <p className="text-xs sm:text-sm font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>Chargement...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 sm:py-12 text-center">
                <div 
                  className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 sm:mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                >
                  <Bell className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: 'rgb(var(--color-primary-600))' }} />
                </div>
                <p className="text-sm sm:text-base font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Aucune notification</p>
                <p className="text-xs sm:text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>Vous êtes à jour!</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={() => markAsRead(notification.id)}
                  onArchive={() => archiveNotification(notification.id)}
                  onClose={closePanel}
                  onNavigate={navigate}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div 
              className="px-3 sm:px-4 py-2.5 sm:py-3 border-t"
              style={{ 
                borderColor: 'rgb(var(--color-border))',
                backgroundColor: 'rgb(var(--color-bg-subtle))',
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  closePanel();
                  setTimeout(() => navigate('/app/settings'), 0);
                }}
                className="text-xs sm:text-sm font-semibold block text-center sm:text-left w-full transition-colors"
                style={{ color: 'rgb(var(--color-primary-600))' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'rgb(var(--color-primary-700))'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(var(--color-primary-600))'}
              >
                Voir toutes les notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Notification Item Component
// ============================================================================

interface NotificationItemProps {
  notification: Notification;
  onRead: () => void;
  onArchive: () => void;
  onClose: () => void;
  onNavigate: (url: string) => void;
}

function NotificationItem({ notification, onRead, onArchive, onClose, onNavigate }: NotificationItemProps) {
  const Icon = categoryIcons[notification.category];
  const styles = categoryStyles[notification.category];

  const handleItemClick = (e: React.MouseEvent) => {
    // Don't mark as read if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) {
      return;
    }
    if (!notification.read) {
      onRead();
    }
  };

  const handleActionLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Mark as read when clicking the action
    if (!notification.read) {
      onRead();
    }
    
    // Get the URL and navigate after closing the panel
    const url = notification.actionUrl;
    if (url) {
      onClose();
      // Check if it's an external URL
      if (url.startsWith('http://') || url.startsWith('https://')) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        // Use setTimeout to ensure state updates before navigation
        setTimeout(() => {
          onNavigate(url);
        }, 0);
      }
    }
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onRead();
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onArchive();
  };

  return (
    <div
      className={`notification-item group ${!notification.read ? 'unread' : ''}`}
      onClick={handleItemClick}
      style={{ padding: '0.75rem' }}
    >
      {/* Icon - Smaller on mobile */}
      <div 
        className="notification-icon flex-shrink-0 transition-all"
        style={{ 
          backgroundColor: styles.bg, 
          color: styles.color,
          width: '36px',
          height: '36px',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="notification-title text-xs sm:text-sm">{notification.title}</p>
        <p className="notification-message text-xs line-clamp-2">{notification.message}</p>
        <div className="flex items-center gap-2 mt-1.5 sm:mt-2 flex-wrap">
          <span className="notification-time text-[10px] sm:text-xs">
            {getRelativeTime(notification.createdAt)}
          </span>
          {notification.actionUrl && (
            <button
              onClick={handleActionLinkClick}
              className="text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-md cursor-pointer transition-all active:scale-95"
              style={{ 
                color: 'rgb(var(--color-primary-600))',
                backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-500) / 0.15)';
                e.currentTarget.style.color = 'rgb(var(--color-primary-700))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-500) / 0.1)';
                e.currentTarget.style.color = 'rgb(var(--color-primary-600))';
              }}
            >
              {notification.actionLabel || 'Voir'}
            </button>
          )}
        </div>
      </div>

      {/* Actions - Always visible on mobile for touch */}
      <div className="flex items-center gap-0.5 sm:gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
        {!notification.read && (
          <button
            onClick={handleMarkAsRead}
            className="icon-btn-sm p-1.5"
            title="Marquer comme lu"
          >
            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        )}
        <button
          onClick={handleArchive}
          className="icon-btn-sm p-1.5 transition-colors"
          style={{ color: 'rgb(var(--color-text-muted))' }}
          title="Supprimer"
        >
          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Notification Bell (Standalone)
// ============================================================================

export function NotificationBell() {
  const { unreadCount, togglePanel } = useNotifications();

  return (
    <button
      onClick={togglePanel}
      className="icon-btn relative"
      aria-label="Notifications"
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span 
          className="absolute top-0 right-0 w-5 h-5 text-xs font-semibold rounded-full flex items-center justify-center transform translate-x-1 -translate-y-1 shadow-sm"
          style={{ 
            backgroundColor: 'rgb(var(--color-primary-600))', 
            color: 'white',
            boxShadow: '0 2px 4px rgb(var(--color-primary-600) / 0.3)'
          }}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
