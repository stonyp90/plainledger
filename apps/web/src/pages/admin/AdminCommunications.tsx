import { useState } from 'react';
import { useI18n } from '../../lib/i18n';
import {
  Mail,
  Bell,
  MessageSquare,
  Send,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react';

export default function AdminCommunications() {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [selectedTab, setSelectedTab] = useState<'notifications' | 'emails' | 'announcements'>('notifications');

  const tabs = [
    { id: 'notifications', label: isEn ? 'Notifications' : 'Notifications', icon: Bell },
    { id: 'emails', label: isEn ? 'Email Templates' : 'Modèles d\'email', icon: Mail },
    { id: 'announcements', label: isEn ? 'Announcements' : 'Annonces', icon: MessageSquare },
  ] as const;

  const recentNotifications = [
    { id: '1', title: 'System maintenance', sent: '2 hours ago', recipients: 156, status: 'delivered' },
    { id: '2', title: 'New feature announcement', sent: '1 day ago', recipients: 243, status: 'delivered' },
    { id: '3', title: 'Security update', sent: '3 days ago', recipients: 189, status: 'delivered' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Communications' : 'Communications'}
        </h1>
        <p className="mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
          {isEn ? 'Manage notifications, emails, and announcements' : 'Gérer les notifications, courriels et annonces'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px"
              style={{
                borderColor: selectedTab === tab.id ? 'rgb(var(--color-primary-600))' : 'transparent',
                color: selectedTab === tab.id ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-secondary))',
              }}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}>
              <Send className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-600))' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{isEn ? 'Sent Today' : 'Envoyés aujourd\'hui'}</p>
              <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>247</p>
            </div>
          </div>
        </div>
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}>
              <CheckCircle2 className="w-5 h-5" style={{ color: 'rgb(var(--color-success))' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{isEn ? 'Delivered' : 'Livrés'}</p>
              <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>98.5%</p>
            </div>
          </div>
        </div>
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-warning) / 0.1)' }}>
              <Clock className="w-5 h-5" style={{ color: 'rgb(var(--color-warning))' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{isEn ? 'Pending' : 'En attente'}</p>
              <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>12</p>
            </div>
          </div>
        </div>
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-info) / 0.1)' }}>
              <Users className="w-5 h-5" style={{ color: 'rgb(var(--color-info))' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{isEn ? 'Recipients' : 'Destinataires'}</p>
              <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>1,234</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Notifications */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}
      >
        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Recent Communications' : 'Communications récentes'}
          </h2>
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
          >
            {isEn ? 'Send New' : 'Envoyer'}
          </button>
        </div>

        <div className="divide-y" style={{ borderColor: 'rgb(var(--color-border))' }}>
          {recentNotifications.map((notif) => (
            <div key={notif.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
                  <Bell className="w-5 h-5" style={{ color: 'rgb(var(--color-text-secondary))' }} />
                </div>
                <div>
                  <div className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{notif.title}</div>
                  <div className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {notif.recipients} {isEn ? 'recipients' : 'destinataires'} • {notif.sent}
                  </div>
                </div>
              </div>
              <span
                className="px-2 py-1 text-xs font-medium rounded-full"
                style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)', color: 'rgb(var(--color-success))' }}
              >
                {isEn ? 'Delivered' : 'Livré'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
