import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
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

// Category colors mapping using CSS variables
const categoryStyles: Record<NotificationCategory, { bg: string; color: string }> = {
  account: { bg: 'rgb(var(--color-info) / 0.1)', color: 'rgb(var(--color-info))' },
  security: { bg: 'rgb(var(--color-error) / 0.1)', color: 'rgb(var(--color-error))' },
  billing: { bg: 'rgb(var(--color-success) / 0.1)', color: 'rgb(var(--color-success))' },
  data_sync: { bg: 'rgb(var(--color-accent) / 0.15)', color: 'rgb(var(--color-accent-dark))' },
  reports: { bg: 'rgb(var(--color-warning) / 0.1)', color: 'rgb(var(--color-warning))' },
  connections: { bg: 'rgb(var(--color-primary-500) / 0.1)', color: 'rgb(var(--color-primary-600))' },
  system: { bg: 'rgb(var(--color-bg-muted))', color: 'rgb(var(--color-text-secondary))' },
  marketing: { bg: 'rgb(var(--color-accent) / 0.1)', color: 'rgb(var(--color-accent))' },
};

export default function NotificationPanel() {
  const {
    notifications,
    unreadCount,
    isPanelOpen,
    togglePanel,
    closePanel,
    markAsRead,
    markAllAsRead,
    archiveNotification,
  } = useNotifications();
  
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        closePanel();
      }
    }
    
    if (isPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Icon Button */}
      <button
        onClick={togglePanel}
        className="icon-btn relative"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span 
            className="absolute top-0 right-0 w-5 h-5 text-xs font-medium rounded-full flex items-center justify-center transform translate-x-1 -translate-y-1"
            style={{ backgroundColor: 'rgb(var(--color-error))', color: 'white' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isPanelOpen && (
        <div className="notification-panel">
          {/* Header */}
          <div 
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'rgb(var(--color-border))' }}
          >
            <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs flex items-center gap-1 icon-btn p-1"
                  title="Tout marquer comme lu"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <Link
                to="/app/settings"
                onClick={closePanel}
                className="icon-btn p-1"
                title="Paramètres"
              >
                <Settings className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgb(var(--color-text-subtle))' }} />
                <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>Aucune notification</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={() => markAsRead(notification.id)}
                  onArchive={() => archiveNotification(notification.id)}
                  onClose={closePanel}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div 
              className="px-4 py-3 border-t"
              style={{ 
                borderColor: 'rgb(var(--color-border))',
                backgroundColor: 'rgb(var(--color-bg-subtle))',
              }}
            >
              <Link
                to="/app/settings"
                onClick={closePanel}
                className="text-sm font-medium"
                style={{ color: 'rgb(var(--color-text-secondary))' }}
              >
                Voir toutes les notifications
              </Link>
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
}

function NotificationItem({ notification, onRead, onArchive, onClose }: NotificationItemProps) {
  const Icon = categoryIcons[notification.category];
  const styles = categoryStyles[notification.category];

  const handleClick = () => {
    if (!notification.read) {
      onRead();
    }
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Mark as read when clicking the action
    if (!notification.read) {
      onRead();
    }
    // Close panel after a brief delay to ensure navigation starts
    setTimeout(() => {
      onClose();
    }, 50);
  };

  return (
    <div
      className={`notification-item group ${!notification.read ? 'unread' : ''}`}
      onClick={handleClick}
    >
      {/* Icon */}
      <div 
        className="notification-icon"
        style={{ backgroundColor: styles.bg, color: styles.color }}
      >
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="notification-title">{notification.title}</p>
        <p className="notification-message">{notification.message}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="notification-time">
            {getRelativeTime(notification.createdAt)}
          </span>
          {notification.actionUrl && (
            <Link
              to={notification.actionUrl}
              onClick={handleActionClick}
              className="text-xs font-medium px-2 py-1 rounded-md cursor-pointer transition-all hover:bg-primary-500/10 active:scale-95"
              style={{ color: 'rgb(var(--color-primary-500))' }}
            >
              {notification.actionLabel || 'Voir'}
            </Link>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.read && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRead();
            }}
            className="icon-btn p-1"
            title="Marquer comme lu"
          >
            <Check className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onArchive();
          }}
          className="p-1 rounded transition-colors"
          style={{ color: 'rgb(var(--color-text-muted))' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'rgb(var(--color-error))'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(var(--color-text-muted))'}
          title="Supprimer"
        >
          <Trash2 className="w-4 h-4" />
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
          className="absolute top-0 right-0 w-5 h-5 text-xs font-medium rounded-full flex items-center justify-center transform translate-x-1 -translate-y-1"
          style={{ backgroundColor: 'rgb(var(--color-error))', color: 'white' }}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
