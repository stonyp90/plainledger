import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../../lib/i18n';
import {
  adminNotificationsApi,
  type AdminNotification,
  type AdminNotificationSegments,
  type CreateAdminNotificationDto,
} from '../../lib/api';
import {
  Bell,
  Send,
  Users,
  Building2,
  Globe,
  Filter,
  Plus,
  X,
  CheckCircle,
  Clock,
  AlertTriangle,
  Mail,
  Smartphone,
  MessageSquare,
  Search,
  MoreVertical,
  RefreshCw,
  XCircle,
} from 'lucide-react';

type TargetType = 'all' | 'organization' | 'user' | 'industry' | 'plan';
type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms';
type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';
type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'cancelled';

// Status Badge Component
function StatusBadge({ status }: { status: NotificationStatus }) {
  const config: Record<NotificationStatus, { color: string; icon: typeof CheckCircle }> = {
    pending: { color: 'warning', icon: Clock },
    sent: { color: 'primary', icon: Send },
    delivered: { color: 'success', icon: CheckCircle },
    failed: { color: 'error', icon: AlertTriangle },
    cancelled: { color: 'text-muted', icon: X },
  };
  
  const { color, icon: Icon } = config[status];
  
  return (
    <span 
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize"
      style={{ 
        backgroundColor: `rgb(var(--color-${color}) / 0.1)`,
        color: `rgb(var(--color-${color}))`,
      }}
    >
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}

// Channel Icon
function ChannelIcon({ channel }: { channel: NotificationChannel }) {
  const icons: Record<NotificationChannel, typeof Bell> = {
    in_app: Bell,
    email: Mail,
    push: Smartphone,
    sms: MessageSquare,
  };
  const Icon = icons[channel];
  return <Icon className="w-4 h-4" />;
}

// Create Notification Modal
function CreateNotificationModal({ 
  isOpen, 
  onClose,
  segments,
  onSuccess,
}: { 
  isOpen: boolean; 
  onClose: () => void;
  segments: AdminNotificationSegments;
  onSuccess: () => void;
}) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [formData, setFormData] = useState<CreateAdminNotificationDto>({
    title: '',
    titleFr: '',
    message: '',
    messageFr: '',
    channel: 'in_app',
    priority: 'medium',
    targetType: 'all',
    targetIds: [],
    actionUrl: '',
    actionLabel: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      await adminNotificationsApi.create(formData);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to create notification:', err);
      setError(isEn ? 'Failed to create notification. Please try again.' : 'Échec de la création de la notification. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-xl"
        style={{ backgroundColor: 'rgb(var(--color-surface))' }}
      >
        {/* Header */}
        <div 
          className="sticky top-0 flex items-center justify-between p-4 border-b"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            borderColor: 'rgb(var(--color-border))' 
          }}
        >
          <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Create Notification' : 'Créer une notification'}
          </h2>
          <button onClick={onClose}>
            <X className="w-5 h-5" style={{ color: 'rgb(var(--color-text-secondary))' }} />
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          {/* Title */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Title (English)' : 'Titre (Anglais)'} *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ 
                  borderColor: 'rgb(var(--color-border))',
                  backgroundColor: 'rgb(var(--color-bg-muted))',
                  color: 'rgb(var(--color-text))',
                }}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Title (French)' : 'Titre (Français)'}
              </label>
              <input
                type="text"
                value={formData.titleFr}
                onChange={(e) => setFormData({ ...formData, titleFr: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ 
                  borderColor: 'rgb(var(--color-border))',
                  backgroundColor: 'rgb(var(--color-bg-muted))',
                  color: 'rgb(var(--color-text))',
                }}
              />
            </div>
          </div>

          {/* Message */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Message (English)' : 'Message (Anglais)'} *
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                style={{ 
                  borderColor: 'rgb(var(--color-border))',
                  backgroundColor: 'rgb(var(--color-bg-muted))',
                  color: 'rgb(var(--color-text))',
                }}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Message (French)' : 'Message (Français)'}
              </label>
              <textarea
                value={formData.messageFr}
                onChange={(e) => setFormData({ ...formData, messageFr: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                style={{ 
                  borderColor: 'rgb(var(--color-border))',
                  backgroundColor: 'rgb(var(--color-bg-muted))',
                  color: 'rgb(var(--color-text))',
                }}
              />
            </div>
          </div>

          {/* Channel & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Channel' : 'Canal'}
              </label>
              <select
                value={formData.channel}
                onChange={(e) => setFormData({ ...formData, channel: e.target.value as NotificationChannel })}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ 
                  borderColor: 'rgb(var(--color-border))',
                  backgroundColor: 'rgb(var(--color-bg-muted))',
                  color: 'rgb(var(--color-text))',
                }}
              >
                <option value="in_app">{isEn ? 'In-App' : 'Dans l\'app'}</option>
                <option value="email">Email</option>
                <option value="push">Push</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Priority' : 'Priorité'}
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as NotificationPriority })}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ 
                  borderColor: 'rgb(var(--color-border))',
                  backgroundColor: 'rgb(var(--color-bg-muted))',
                  color: 'rgb(var(--color-text))',
                }}
              >
                <option value="low">{isEn ? 'Low' : 'Basse'}</option>
                <option value="medium">{isEn ? 'Medium' : 'Moyenne'}</option>
                <option value="high">{isEn ? 'High' : 'Haute'}</option>
                <option value="urgent">{isEn ? 'Urgent' : 'Urgente'}</option>
              </select>
            </div>
          </div>

          {/* Target */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Target Audience' : 'Audience cible'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: 'all', label: isEn ? 'All Users' : 'Tous', icon: Globe },
                { value: 'organization', label: isEn ? 'Organizations' : 'Organisations', icon: Building2 },
                { value: 'industry', label: isEn ? 'Industries' : 'Industries', icon: Filter },
                { value: 'user', label: isEn ? 'Specific Users' : 'Utilisateurs', icon: Users },
              ].map((target) => (
                <button
                  key={target.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, targetType: target.value as TargetType })}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all ${
                    formData.targetType === target.value ? 'ring-2' : ''
                  }`}
                  style={{ 
                    borderColor: formData.targetType === target.value 
                      ? 'rgb(var(--color-primary-500))' 
                      : 'rgb(var(--color-border))',
                    backgroundColor: formData.targetType === target.value 
                      ? 'rgb(var(--color-primary-500) / 0.1)' 
                      : 'transparent',
                    color: formData.targetType === target.value 
                      ? 'rgb(var(--color-primary-600))' 
                      : 'rgb(var(--color-text))',
                    boxShadow: '0 0 0 2px rgb(var(--color-primary-500) / 0.2)',
                  }}
                >
                  <target.icon className="w-4 h-4" />
                  {target.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target Selection (for org/industry/user) */}
          {formData.targetType !== 'all' && (
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgb(var(--color-text))' }}>
                {formData.targetType === 'organization' && (isEn ? 'Select Organizations' : 'Sélectionner les organisations')}
                {formData.targetType === 'industry' && (isEn ? 'Select Industries' : 'Sélectionner les industries')}
                {formData.targetType === 'user' && (isEn ? 'Enter User IDs' : 'Entrer les IDs utilisateurs')}
              </label>
              {formData.targetType === 'organization' && (
                <select
                  multiple
                  className="w-full px-3 py-2 rounded-lg border text-sm h-32"
                  style={{ 
                    borderColor: 'rgb(var(--color-border))',
                    backgroundColor: 'rgb(var(--color-bg-muted))',
                    color: 'rgb(var(--color-text))',
                  }}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    targetIds: Array.from(e.target.selectedOptions, option => option.value)
                  })}
                >
                  {segments.organizations.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              )}
              {formData.targetType === 'industry' && (
                <select
                  multiple
                  className="w-full px-3 py-2 rounded-lg border text-sm h-32"
                  style={{ 
                    borderColor: 'rgb(var(--color-border))',
                    backgroundColor: 'rgb(var(--color-bg-muted))',
                    color: 'rgb(var(--color-text))',
                  }}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    targetIds: Array.from(e.target.selectedOptions, option => option.value)
                  })}
                >
                  {segments.industries.map((industry) => (
                    <option key={industry} value={industry} className="capitalize">{industry.replace('_', ' ')}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Action URL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Action URL (optional)' : 'URL d\'action (optionnel)'}
              </label>
              <input
                type="url"
                value={formData.actionUrl}
                onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ 
                  borderColor: 'rgb(var(--color-border))',
                  backgroundColor: 'rgb(var(--color-bg-muted))',
                  color: 'rgb(var(--color-text))',
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Action Label' : 'Libellé du bouton'}
              </label>
              <input
                type="text"
                value={formData.actionLabel}
                onChange={(e) => setFormData({ ...formData, actionLabel: e.target.value })}
                placeholder={isEn ? 'Learn more' : 'En savoir plus'}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ 
                  borderColor: 'rgb(var(--color-border))',
                  backgroundColor: 'rgb(var(--color-bg-muted))',
                  color: 'rgb(var(--color-text))',
                }}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div 
              className="p-3 rounded-lg text-sm"
              style={{ 
                backgroundColor: 'rgb(var(--color-error) / 0.1)',
                color: 'rgb(var(--color-error))',
              }}
            >
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border transition-colors"
              style={{ 
                borderColor: 'rgb(var(--color-border))',
                color: 'rgb(var(--color-text))',
              }}
            >
              {isEn ? 'Cancel' : 'Annuler'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isEn ? 'Sending...' : 'Envoi...'}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {isEn ? 'Send Notification' : 'Envoyer'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminNotifications() {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [segments, setSegments] = useState<AdminNotificationSegments>({ organizations: [], industries: [], plans: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | 'all'>('all');
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: { status?: string; search?: string } = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;
      
      const response = await adminNotificationsApi.list(params);
      setNotifications(response.data?.notifications || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError(isEn ? 'Failed to load notifications' : 'Échec du chargement des notifications');
      // Fall back to empty array
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery, isEn]);

  // Fetch segments for targeting
  const fetchSegments = useCallback(async () => {
    try {
      const response = await adminNotificationsApi.getSegments();
      setSegments(response.data || { organizations: [], industries: [], plans: [] });
    } catch (err) {
      console.error('Failed to fetch segments:', err);
      // Use default empty segments
      setSegments({ organizations: [], industries: [], plans: [] });
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchNotifications();
    fetchSegments();
  }, [fetchNotifications, fetchSegments]);

  // Cancel notification handler
  const handleCancelNotification = async (id: string) => {
    try {
      await adminNotificationsApi.cancel(id);
      fetchNotifications();
    } catch (err) {
      console.error('Failed to cancel notification:', err);
    }
  };

  // Resend notification handler
  const handleResendNotification = async (id: string) => {
    try {
      await adminNotificationsApi.resend(id);
      fetchNotifications();
    } catch (err) {
      console.error('Failed to resend notification:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Notifications' : 'Notifications'}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn ? 'Send notifications to your users' : 'Envoyer des notifications à vos utilisateurs'}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white font-medium transition-colors"
          style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
        >
          <Plus className="w-4 h-4" />
          {isEn ? 'Create Notification' : 'Créer une notification'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div 
          className="p-4 rounded-lg text-sm flex items-center justify-between"
          style={{ 
            backgroundColor: 'rgb(var(--color-error) / 0.1)',
            color: 'rgb(var(--color-error))',
          }}
        >
          <span>{error}</span>
          <button onClick={fetchNotifications} className="underline">
            {isEn ? 'Retry' : 'Réessayer'}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
            style={{ color: 'rgb(var(--color-text-muted))' }} 
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchNotifications()}
            placeholder={isEn ? 'Search notifications...' : 'Rechercher des notifications...'}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm"
            style={{ 
              borderColor: 'rgb(var(--color-border))',
              backgroundColor: 'rgb(var(--color-surface))',
              color: 'rgb(var(--color-text))',
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as NotificationStatus | 'all')}
          className="px-4 py-2.5 rounded-lg border text-sm"
          style={{ 
            borderColor: 'rgb(var(--color-border))',
            backgroundColor: 'rgb(var(--color-surface))',
            color: 'rgb(var(--color-text))',
          }}
        >
          <option value="all">{isEn ? 'All Status' : 'Tous les statuts'}</option>
          <option value="pending">{isEn ? 'Pending' : 'En attente'}</option>
          <option value="sent">{isEn ? 'Sent' : 'Envoyé'}</option>
          <option value="delivered">{isEn ? 'Delivered' : 'Livré'}</option>
          <option value="failed">{isEn ? 'Failed' : 'Échoué'}</option>
        </select>
        <button
          onClick={fetchNotifications}
          className="p-2.5 rounded-lg border transition-colors"
          style={{ 
            borderColor: 'rgb(var(--color-border))',
            color: 'rgb(var(--color-text-secondary))',
          }}
          title={isEn ? 'Refresh' : 'Actualiser'}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Notifications List */}
      <div 
        className="rounded-xl border overflow-hidden"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          borderColor: 'rgb(var(--color-border))',
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
              <span style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Loading...' : 'Chargement...'}
              </span>
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Bell className="w-12 h-12 mb-3" style={{ color: 'rgb(var(--color-text-muted))' }} />
            <p style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn ? 'No notifications found' : 'Aucune notification trouvée'}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgb(var(--color-border))' }}>
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                className="p-4 transition-colors"
                style={{ backgroundColor: 'transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--color-bg-subtle))'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                    >
                      <ChannelIcon channel={notification.channel} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                          {notification.title}
                        </h3>
                        <StatusBadge status={notification.status} />
                      </div>
                      <p className="text-sm mt-1 line-clamp-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {notification.recipientsCount} {isEn ? 'recipients' : 'destinataires'}
                        </span>
                        <span>
                          {notification.deliveredCount} {isEn ? 'delivered' : 'livrés'}
                        </span>
                        <span>
                          {notification.readCount} {isEn ? 'read' : 'lus'}
                        </span>
                        <span>•</span>
                        <span>{new Date(notification.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {notification.status === 'pending' && (
                      <button 
                        onClick={() => handleCancelNotification(notification.id)}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: 'rgb(var(--color-error))' }}
                        title={isEn ? 'Cancel' : 'Annuler'}
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                    {(notification.status === 'failed' || notification.status === 'cancelled') && (
                      <button 
                        onClick={() => handleResendNotification(notification.id)}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: 'rgb(var(--color-primary-500))' }}
                        title={isEn ? 'Resend' : 'Renvoyer'}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: 'rgb(var(--color-text-muted))' }}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateNotificationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        segments={segments}
        onSuccess={fetchNotifications}
      />
    </div>
  );
}
