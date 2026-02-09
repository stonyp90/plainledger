'use client';

import { useState, useEffect } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getAuthToken } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Notification {
  id: string;
  title: string;
  message: string;
  channel: string;
  priority: string;
  status: string;
  createdAt: string;
  readAt?: string;
}

export function NotificationsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const token = getAuthToken();

  // Fetch notifications
  const { data: notificationsData, refetch } = useQuery({
    queryKey: ['admin', 'notifications', token],
    queryFn: async () => {
      if (!token) return { notifications: [], unreadCount: 0 };

      try {
        const response = await fetch(`${API_URL}/api/admin/notifications?status=sent&limit=10`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          return { notifications: [], unreadCount: 0 };
        }

        const data = await response.json();
        const notifications = data.notifications || data || [];
        
        // Filter for in-app notifications and calculate unread
        const inAppNotifications = notifications.filter((n: Notification) => 
          n.channel === 'in_app' || !n.channel
        );
        const unreadCount = inAppNotifications.filter((n: Notification) => !n.readAt).length;

        return {
          notifications: inAppNotifications.slice(0, 10),
          unreadCount,
        };
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
        return { notifications: [], unreadCount: 0 };
      }
    },
    enabled: !!token,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unreadCount || 0;

  const markAsRead = async (notificationId: string) => {
    if (!token) return;

    try {
      // In a real implementation, you'd call an API endpoint to mark as read
      // For now, we'll just refetch
      await refetch();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  return (
    <div className="relative flex items-center">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-admin-800/50 border border-admin-700/50 text-admin-400 hover:text-white hover:bg-admin-700/50 transition-all"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-semibold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-80 bg-admin-800 border border-admin-700 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-admin-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Notifications</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-admin-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="w-8 h-8 text-admin-500 mx-auto mb-2" />
                  <p className="text-sm text-admin-400">No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-admin-700">
                  {notifications.map((notification: Notification) => (
                    <div
                      key={notification.id}
                      className={`px-4 py-3 hover:bg-admin-700/50 transition-colors ${
                        !notification.readAt ? 'bg-primary-600/10' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {notification.title}
                          </p>
                          <p className="text-xs text-admin-400 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-admin-500 mt-1">
                            {new Date(notification.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {!notification.readAt && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-primary-400 hover:text-primary-300"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-admin-700">
                <a
                  href="/communications"
                  className="text-xs text-primary-400 hover:text-primary-300 text-center block"
                >
                  View all notifications
                </a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
