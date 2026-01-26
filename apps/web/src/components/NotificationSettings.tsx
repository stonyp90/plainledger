import { useState } from 'react';
import { 
  Bell, 
  Mail, 
  Smartphone, 
  MessageSquare,
  Moon,
  Save,
  Check,
  Info,
  Link2,
  Unlink,
  ExternalLink,
  Clock,
  AlertTriangle,
  CheckCircle,
  Hash,
  Settings2,
  Zap,
} from 'lucide-react';
import Toggle from './Toggle';
import { useNotifications } from '../contexts/NotificationContext';
import type { NotificationCategory, SlackIntegration, TeamsIntegration, NotificationPriority } from '../lib/notifications';

// Category labels in French with icons
const categoryLabels: Record<NotificationCategory, { 
  name: string; 
  nameEn: string;
  description: string;
  descriptionEn: string;
  icon: typeof Bell;
  color: string;
}> = {
  account: {
    name: 'Compte',
    nameEn: 'Account',
    description: 'Modifications de profil, invitations d\'équipe',
    descriptionEn: 'Profile changes, team invitations',
    icon: Bell,
    color: 'rgb(var(--color-primary-500))',
  },
  security: {
    name: 'Sécurité',
    nameEn: 'Security',
    description: 'Connexions, alertes de sécurité, 2FA',
    descriptionEn: 'Sign-ins, security alerts, 2FA',
    icon: Bell,
    color: 'rgb(var(--color-error))',
  },
  billing: {
    name: 'Facturation',
    nameEn: 'Billing',
    description: 'Paiements, factures, abonnements',
    descriptionEn: 'Payments, invoices, subscriptions',
    icon: Bell,
    color: 'rgb(var(--color-success))',
  },
  data_sync: {
    name: 'Synchronisation',
    nameEn: 'Data Sync',
    description: 'État des synchronisations de données',
    descriptionEn: 'Data sync status',
    icon: Bell,
    color: 'rgb(var(--color-info))',
  },
  reports: {
    name: 'Rapports',
    nameEn: 'Reports',
    description: 'Génération et partage de rapports',
    descriptionEn: 'Report generation and sharing',
    icon: Bell,
    color: 'rgb(var(--color-accent))',
  },
  connections: {
    name: 'Connexions',
    nameEn: 'Connections',
    description: 'État des intégrations comptables',
    descriptionEn: 'Accounting integration status',
    icon: Bell,
    color: 'rgb(var(--color-warning))',
  },
  system: {
    name: 'Système',
    nameEn: 'System',
    description: 'Maintenance, mises à jour',
    descriptionEn: 'Maintenance, updates',
    icon: Bell,
    color: 'rgb(var(--color-text-secondary))',
  },
  marketing: {
    name: 'Marketing',
    nameEn: 'Marketing',
    description: 'Nouveautés, offres spéciales',
    descriptionEn: 'News, special offers',
    icon: Bell,
    color: 'rgb(var(--color-primary-400))',
  },
};

// Channel configuration
const channels = [
  { id: 'in_app' as const, icon: Bell, label: 'In-app', labelFr: 'In-app' },
  { id: 'email' as const, icon: Mail, label: 'Email', labelFr: 'Courriel' },
  { id: 'push' as const, icon: Smartphone, label: 'Push', labelFr: 'Push' },
  { id: 'sms' as const, icon: MessageSquare, label: 'SMS', labelFr: 'SMS' },
  { id: 'slack' as const, icon: SlackIcon, label: 'Slack', labelFr: 'Slack' },
  { id: 'teams' as const, icon: TeamsIcon, label: 'Teams', labelFr: 'Teams' },
];

// Slack Icon Component
function SlackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
    </svg>
  );
}

// Microsoft Teams Icon Component
function TeamsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.625 8.073c.574 0 1.125.228 1.531.634.407.407.636.958.636 1.534v5.166c0 .575-.229 1.127-.636 1.533a2.166 2.166 0 0 1-1.531.635h-4.87v-9.5h4.87v-.002zm-7.578-3.166c0-.575.229-1.127.636-1.534a2.166 2.166 0 0 1 1.531-.634h1.59c.575 0 1.126.228 1.532.634.406.407.635.959.635 1.534v.917a2.167 2.167 0 0 1 1.72.898 2.176 2.176 0 0 1 .422 1.28h-6.066V4.907zM8.25 5.823h6.75v11.844a2.167 2.167 0 0 1-.635 1.534 2.166 2.166 0 0 1-1.531.634H8.25V5.823zm-.75 0v13.927a.083.083 0 0 1-.083.083H2.333a.083.083 0 0 1-.083-.083V8.073c0-.576.229-1.127.636-1.534a2.166 2.166 0 0 1 1.531-.634H7.5v-.082zm5.125-3.157a1.333 1.333 0 1 0 0 2.667 1.333 1.333 0 0 0 0-2.667z"/>
    </svg>
  );
}

// Custom Checkbox Component
function NotificationCheckbox({ 
  checked, 
  onChange,
  disabled = false,
}: { 
  checked: boolean; 
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`
        w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${checked 
          ? 'shadow-sm' 
          : 'hover:scale-105'
        }
      `}
      style={{
        backgroundColor: checked 
          ? 'rgb(var(--color-primary-500))' 
          : 'rgb(var(--color-bg-muted))',
        border: checked 
          ? 'none' 
          : '2px solid rgb(var(--color-border))',
      }}
    >
      {checked && (
        <Check className="w-4 h-4 text-white" />
      )}
    </button>
  );
}

export default function NotificationSettings() {
  const { preferences, updatePreferences, showToast } = useNotifications();
  const [localPrefs, setLocalPrefs] = useState(preferences);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleChannel = (
    category: NotificationCategory,
    channel: 'in_app' | 'email' | 'push' | 'sms' | 'slack' | 'teams'
  ) => {
    setLocalPrefs(prev => ({
      ...prev,
      channels: {
        ...prev.channels,
        [category]: {
          ...prev.channels[category],
          [channel]: !prev.channels[category][channel],
        },
      },
    }));
  };

  const handleToggleGlobal = () => {
    setLocalPrefs(prev => ({
      ...prev,
      enabled: !prev.enabled,
    }));
  };

  const handleToggleQuietHours = () => {
    setLocalPrefs(prev => ({
      ...prev,
      quietHoursEnabled: !prev.quietHoursEnabled,
    }));
  };

  const handleEmailDigestChange = (value: 'none' | 'daily' | 'weekly') => {
    setLocalPrefs(prev => ({
      ...prev,
      emailDigest: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      updatePreferences(localPrefs);
      showToast('success', 'Vos préférences de notifications ont été enregistrées.');
    } catch (error) {
      showToast('error', 'Erreur lors de l\'enregistrement des préférences.');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle all in a category
  const handleToggleCategory = (category: NotificationCategory, enable: boolean) => {
    setLocalPrefs(prev => ({
      ...prev,
      channels: {
        ...prev.channels,
        [category]: {
          in_app: enable,
          email: enable,
          push: enable,
          sms: enable,
          slack: enable && !!localPrefs.integrations?.slack?.connected,
          teams: enable && !!localPrefs.integrations?.teams?.connected,
        },
      },
    }));
  };

  // Check if all channels are enabled for a category
  const isCategoryAllEnabled = (category: NotificationCategory) => {
    const cat = localPrefs.channels[category];
    return cat.in_app && cat.email && cat.push && cat.sms;
  };

  // Check if Slack/Teams are connected
  const isSlackConnected = !!localPrefs.integrations?.slack?.connected;
  const isTeamsConnected = !!localPrefs.integrations?.teams?.connected;

  // Handle Slack connection
  const handleConnectSlack = async () => {
    // In production, this would initiate OAuth flow
    // For demo, we simulate a successful connection
    const mockSlackIntegration: SlackIntegration = {
      connected: true,
      workspaceName: 'Demo Workspace',
      workspaceId: 'T01234567',
      channelId: 'C01234567',
      channelName: 'finance-alerts',
      connectedAt: new Date().toISOString(),
      connectedBy: 'Current User',
      dailySummary: true,
      dailySummaryTime: '09:00',
      alertsEnabled: true,
      alertPriorities: ['high', 'urgent'],
    };
    
    setLocalPrefs(prev => ({
      ...prev,
      integrations: {
        ...prev.integrations,
        slack: mockSlackIntegration,
      },
    }));
    showToast('success', 'Slack connecté avec succès!');
  };

  const handleDisconnectSlack = () => {
    setLocalPrefs(prev => ({
      ...prev,
      integrations: {
        ...prev.integrations,
        slack: null,
      },
      channels: Object.fromEntries(
        Object.entries(prev.channels).map(([key, val]) => [
          key,
          { ...val, slack: false }
        ])
      ) as typeof prev.channels,
    }));
    showToast('info', 'Slack déconnecté.');
  };

  const handleUpdateSlack = (updates: Partial<SlackIntegration>) => {
    setLocalPrefs(prev => ({
      ...prev,
      integrations: {
        ...prev.integrations,
        slack: prev.integrations?.slack ? { ...prev.integrations.slack, ...updates } : null,
      },
    }));
  };

  // Handle Teams connection
  const handleConnectTeams = async () => {
    // In production, this would initiate OAuth flow
    const mockTeamsIntegration: TeamsIntegration = {
      connected: true,
      tenantName: 'Demo Organization',
      tenantId: 'tenant-id-123',
      teamId: 'team-id-123',
      teamName: 'Finance Team',
      channelId: 'channel-id-123',
      channelName: 'Alertes PlainLedger',
      connectedAt: new Date().toISOString(),
      connectedBy: 'Current User',
      dailySummary: true,
      dailySummaryTime: '09:00',
      alertsEnabled: true,
      alertPriorities: ['high', 'urgent'],
    };
    
    setLocalPrefs(prev => ({
      ...prev,
      integrations: {
        ...prev.integrations,
        teams: mockTeamsIntegration,
      },
    }));
    showToast('success', 'Microsoft Teams connecté avec succès!');
  };

  const handleDisconnectTeams = () => {
    setLocalPrefs(prev => ({
      ...prev,
      integrations: {
        ...prev.integrations,
        teams: null,
      },
      channels: Object.fromEntries(
        Object.entries(prev.channels).map(([key, val]) => [
          key,
          { ...val, teams: false }
        ])
      ) as typeof prev.channels,
    }));
    showToast('info', 'Microsoft Teams déconnecté.');
  };

  const handleUpdateTeams = (updates: Partial<TeamsIntegration>) => {
    setLocalPrefs(prev => ({
      ...prev,
      integrations: {
        ...prev.integrations,
        teams: prev.integrations?.teams ? { ...prev.integrations.teams, ...updates } : null,
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Global Toggle */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <Bell className="w-6 h-6" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                Notifications
              </h3>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                Activez ou désactivez toutes les notifications
              </p>
            </div>
          </div>
          <Toggle
            checked={localPrefs.enabled}
            onChange={handleToggleGlobal}
            size="lg"
          />
        </div>
      </div>

      {localPrefs.enabled && (
        <>
          {/* Email Digest */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
              >
                <Mail className="w-5 h-5" style={{ color: 'rgb(var(--color-text-secondary))' }} />
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  Résumé par courriel
                </h3>
                <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  Recevez un résumé de vos notifications
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                { value: 'none', label: 'Aucun', icon: '✕' },
                { value: 'daily', label: 'Quotidien', icon: '📅' },
                { value: 'weekly', label: 'Hebdomadaire', icon: '📆' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleEmailDigestChange(option.value as 'none' | 'daily' | 'weekly')}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm
                    transition-all duration-200
                  `}
                  style={{
                    backgroundColor: localPrefs.emailDigest === option.value
                      ? 'rgb(var(--color-primary-500))'
                      : 'rgb(var(--color-bg-muted))',
                    color: localPrefs.emailDigest === option.value
                      ? 'white'
                      : 'rgb(var(--color-text-secondary))',
                    border: localPrefs.emailDigest === option.value
                      ? 'none'
                      : '1px solid rgb(var(--color-border))',
                  }}
                >
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Messaging Integrations - Slack & Teams */}
          <MessagingIntegrations 
            slack={localPrefs.integrations?.slack || null}
            teams={localPrefs.integrations?.teams || null}
            onSlackConnect={() => handleConnectSlack()}
            onSlackDisconnect={() => handleDisconnectSlack()}
            onTeamsConnect={() => handleConnectTeams()}
            onTeamsDisconnect={() => handleDisconnectTeams()}
            onSlackUpdate={(updates) => handleUpdateSlack(updates)}
            onTeamsUpdate={(updates) => handleUpdateTeams(updates)}
          />

          {/* Quiet Hours */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'rgb(var(--color-accent) / 0.1)' }}
                >
                  <Moon className="w-5 h-5" style={{ color: 'rgb(var(--color-accent))' }} />
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    Heures de silence
                  </h3>
                  <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    Pas de notifications pendant ces heures
                  </p>
                </div>
              </div>
              <Toggle
                checked={localPrefs.quietHoursEnabled}
                onChange={handleToggleQuietHours}
                size="lg"
              />
            </div>
            
            {localPrefs.quietHoursEnabled && (
              <div 
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mt-4 pt-4"
                style={{ borderTop: '1px solid rgb(var(--color-border))' }}
              >
                <div className="flex-1">
                  <label className="label text-sm mb-1.5">Début</label>
                  <input
                    type="time"
                    value={localPrefs.quietHoursStart}
                    onChange={(e) => setLocalPrefs(prev => ({ ...prev, quietHoursStart: e.target.value }))}
                    className="input w-full"
                    style={{
                      backgroundColor: 'rgb(var(--color-bg-muted))',
                      borderColor: 'rgb(var(--color-border))',
                      color: 'rgb(var(--color-text))',
                    }}
                  />
                </div>
                <span 
                  className="hidden sm:block text-lg mt-6"
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                >
                  →
                </span>
                <div className="flex-1">
                  <label className="label text-sm mb-1.5">Fin</label>
                  <input
                    type="time"
                    value={localPrefs.quietHoursEnd}
                    onChange={(e) => setLocalPrefs(prev => ({ ...prev, quietHoursEnd: e.target.value }))}
                    className="input w-full"
                    style={{
                      backgroundColor: 'rgb(var(--color-bg-muted))',
                      borderColor: 'rgb(var(--color-border))',
                      color: 'rgb(var(--color-text))',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Category Preferences */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  Préférences par catégorie
                </h3>
                <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  Choisissez comment recevoir chaque type de notification
                </p>
              </div>
              <div 
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                style={{ 
                  backgroundColor: 'rgb(var(--color-info) / 0.1)',
                  color: 'rgb(var(--color-info))'
                }}
              >
                <Info className="w-3.5 h-3.5" />
                Cliquez pour activer/désactiver
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgb(var(--color-border))' }}>
                    <th 
                      className="text-left py-3 px-4 font-medium text-sm"
                      style={{ color: 'rgb(var(--color-text-secondary))' }}
                    >
                      Catégorie
                    </th>
                    {channels.map((channel) => (
                      <th 
                        key={channel.id}
                        className="py-3 px-4 text-center"
                      >
                        <div className="flex flex-col items-center gap-1.5">
                          <channel.icon 
                            className="w-5 h-5" 
                            style={{ color: 'rgb(var(--color-text-muted))' }}
                          />
                          <span 
                            className="text-xs font-medium"
                            style={{ color: 'rgb(var(--color-text-secondary))' }}
                          >
                            {channel.labelFr}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(categoryLabels) as NotificationCategory[]).map((category, index) => (
                    <tr 
                      key={category}
                      className="group hover:bg-muted/50 transition-colors"
                      style={{ 
                        borderBottom: index < Object.keys(categoryLabels).length - 1 
                          ? '1px solid rgb(var(--color-border-subtle))' 
                          : 'none'
                      }}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-2 h-8 rounded-full"
                            style={{ backgroundColor: categoryLabels[category].color }}
                          />
                          <div>
                            <p 
                              className="font-medium text-sm"
                              style={{ color: 'rgb(var(--color-text))' }}
                            >
                              {categoryLabels[category].name}
                            </p>
                            <p 
                              className="text-xs mt-0.5"
                              style={{ color: 'rgb(var(--color-text-muted))' }}
                            >
                              {categoryLabels[category].description}
                            </p>
                          </div>
                        </div>
                      </td>
                      {channels.map((channel) => {
                        const isMessagingChannel = channel.id === 'slack' || channel.id === 'teams';
                        const isConnected = channel.id === 'slack' ? isSlackConnected : channel.id === 'teams' ? isTeamsConnected : true;
                        const isDisabled = isMessagingChannel && !isConnected;
                        
                        return (
                        <td key={channel.id} className="py-4 px-4 text-center">
                          <div className="flex justify-center" title={isDisabled ? `Connectez ${channel.label} dans la section ci-dessus` : ''}>
                            <NotificationCheckbox
                              checked={localPrefs.channels[category][channel.id]}
                              onChange={() => handleToggleChannel(category, channel.id)}
                              disabled={isDisabled}
                            />
                          </div>
                        </td>
                      );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {(Object.keys(categoryLabels) as NotificationCategory[]).map((category) => (
                <div 
                  key={category}
                  className="p-4 rounded-xl"
                  style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-6 rounded-full"
                        style={{ backgroundColor: categoryLabels[category].color }}
                      />
                      <div>
                        <p 
                          className="font-medium text-sm"
                          style={{ color: 'rgb(var(--color-text))' }}
                        >
                          {categoryLabels[category].name}
                        </p>
                        <p 
                          className="text-xs"
                          style={{ color: 'rgb(var(--color-text-muted))' }}
                        >
                          {categoryLabels[category].description}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleCategory(category, !isCategoryAllEnabled(category))}
                      className="text-xs px-2 py-1 rounded-md"
                      style={{ 
                        backgroundColor: isCategoryAllEnabled(category) 
                          ? 'rgb(var(--color-primary-500) / 0.1)' 
                          : 'rgb(var(--color-bg-emphasis))',
                        color: isCategoryAllEnabled(category) 
                          ? 'rgb(var(--color-primary-500))' 
                          : 'rgb(var(--color-text-muted))'
                      }}
                    >
                      {isCategoryAllEnabled(category) ? 'Tout désactiver' : 'Tout activer'}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {channels.map((channel) => {
                      // Disable Slack/Teams if not connected
                      const isMessagingChannel = channel.id === 'slack' || channel.id === 'teams';
                      const isConnected = channel.id === 'slack' ? isSlackConnected : channel.id === 'teams' ? isTeamsConnected : true;
                      const isDisabled = isMessagingChannel && !isConnected;
                      
                      return (
                      <button
                        key={channel.id}
                        onClick={() => !isDisabled && handleToggleChannel(category, channel.id)}
                        disabled={isDisabled}
                        className={`
                          flex flex-col items-center gap-1.5 p-2.5 rounded-lg transition-all
                          ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}
                        `}
                        style={{
                          backgroundColor: localPrefs.channels[category][channel.id] && !isDisabled
                            ? 'rgb(var(--color-primary-500))'
                            : 'rgb(var(--color-surface))',
                          border: localPrefs.channels[category][channel.id] && !isDisabled
                            ? 'none'
                            : '1px solid rgb(var(--color-border))',
                        }}
                        title={isDisabled ? `Connectez ${channel.label} d'abord` : ''}
                      >
                        <channel.icon 
                          className="w-4 h-4" 
                          style={{ 
                            color: localPrefs.channels[category][channel.id] && !isDisabled
                              ? 'white'
                              : 'rgb(var(--color-text-muted))'
                          }}
                        />
                        <span 
                          className="text-[10px] font-medium"
                          style={{ 
                            color: localPrefs.channels[category][channel.id] && !isDisabled
                              ? 'white'
                              : 'rgb(var(--color-text-muted))'
                          }}
                        >
                          {channel.labelFr}
                        </span>
                      </button>
                    );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="loading-spinner w-4 h-4" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Enregistrer les préférences
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Messaging Integrations Component (Slack & Teams)
// ============================================================================

interface MessagingIntegrationsProps {
  slack: SlackIntegration | null;
  teams: TeamsIntegration | null;
  onSlackConnect: () => void;
  onSlackDisconnect: () => void;
  onTeamsConnect: () => void;
  onTeamsDisconnect: () => void;
  onSlackUpdate: (updates: Partial<SlackIntegration>) => void;
  onTeamsUpdate: (updates: Partial<TeamsIntegration>) => void;
}

function MessagingIntegrations({
  slack,
  teams,
  onSlackConnect,
  onSlackDisconnect,
  onTeamsConnect,
  onTeamsDisconnect,
  onSlackUpdate,
  onTeamsUpdate,
}: MessagingIntegrationsProps) {
  const [expandedIntegration, setExpandedIntegration] = useState<'slack' | 'teams' | null>(null);

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-6">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'rgb(var(--color-info) / 0.1)' }}
        >
          <Zap className="w-5 h-5" style={{ color: 'rgb(var(--color-info))' }} />
        </div>
        <div>
          <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            Intégrations messagerie
          </h3>
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            Recevez des alertes et résumés quotidiens sur Slack ou Teams
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Slack Integration */}
        <IntegrationCard
          name="Slack"
          icon={<SlackIcon className="w-6 h-6" />}
          iconBg="#4A154B"
          connected={!!slack?.connected}
          workspaceName={slack?.workspaceName}
          channelName={slack?.channelName}
          connectedAt={slack?.connectedAt}
          expanded={expandedIntegration === 'slack'}
          onToggleExpand={() => setExpandedIntegration(expandedIntegration === 'slack' ? null : 'slack')}
          onConnect={onSlackConnect}
          onDisconnect={onSlackDisconnect}
        >
          {slack?.connected && (
            <SlackSettings
              integration={slack}
              onUpdate={onSlackUpdate}
            />
          )}
        </IntegrationCard>

        {/* Microsoft Teams Integration */}
        <IntegrationCard
          name="Microsoft Teams"
          icon={<TeamsIcon className="w-6 h-6" />}
          iconBg="#464EB8"
          connected={!!teams?.connected}
          workspaceName={teams?.tenantName}
          channelName={teams?.channelName}
          teamName={teams?.teamName}
          connectedAt={teams?.connectedAt}
          expanded={expandedIntegration === 'teams'}
          onToggleExpand={() => setExpandedIntegration(expandedIntegration === 'teams' ? null : 'teams')}
          onConnect={onTeamsConnect}
          onDisconnect={onTeamsDisconnect}
        >
          {teams?.connected && (
            <TeamsSettings
              integration={teams}
              onUpdate={onTeamsUpdate}
            />
          )}
        </IntegrationCard>
      </div>

      {/* Info about integrations */}
      <div 
        className="mt-6 p-4 rounded-xl flex items-start gap-3"
        style={{ 
          backgroundColor: 'rgb(var(--color-bg-muted))',
          border: '1px solid rgb(var(--color-border))'
        }}
      >
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }} />
        <div className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
          <p className="mb-2">
            <strong>Alertes en temps réel:</strong> Recevez les notifications urgentes (anomalies, échecs de sync, paiements) directement dans votre canal.
          </p>
          <p>
            <strong>Résumé quotidien:</strong> Un récapitulatif de l'activité de la journée envoyé à l'heure de votre choix.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Integration Card Component
// ============================================================================

interface IntegrationCardProps {
  name: string;
  icon: React.ReactNode;
  iconBg: string;
  connected: boolean;
  workspaceName?: string;
  channelName?: string;
  teamName?: string;
  connectedAt?: string;
  expanded: boolean;
  onToggleExpand: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  children?: React.ReactNode;
}

function IntegrationCard({
  name,
  icon,
  iconBg,
  connected,
  workspaceName,
  channelName,
  teamName,
  connectedAt,
  expanded,
  onToggleExpand,
  onConnect,
  onDisconnect,
  children,
}: IntegrationCardProps) {
  return (
    <div 
      className="rounded-xl overflow-hidden transition-all"
      style={{ 
        backgroundColor: connected ? 'rgb(var(--color-success) / 0.03)' : 'rgb(var(--color-bg-muted))',
        border: connected ? '1px solid rgb(var(--color-success) / 0.2)' : '1px solid rgb(var(--color-border))',
      }}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: iconBg }}
            >
              {icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{name}</h4>
                {connected && (
                  <span 
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-success) / 0.1)',
                      color: 'rgb(var(--color-success))'
                    }}
                  >
                    <CheckCircle className="w-3 h-3" />
                    Connecté
                  </span>
                )}
              </div>
              {connected ? (
                <div className="flex items-center gap-2 text-sm mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  <span>{workspaceName}</span>
                  {teamName && (
                    <>
                      <span>•</span>
                      <span>{teamName}</span>
                    </>
                  )}
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    {channelName}
                  </span>
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  Non connecté
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {connected ? (
              <>
                <button
                  onClick={onToggleExpand}
                  className="btn-sm flex items-center gap-1.5"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-bg-emphasis))',
                    color: 'rgb(var(--color-text-secondary))'
                  }}
                >
                  <Settings2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Paramètres</span>
                </button>
                <button
                  onClick={onDisconnect}
                  className="btn-sm flex items-center gap-1.5 hover:bg-error/10"
                  style={{ color: 'rgb(var(--color-error))' }}
                >
                  <Unlink className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={onConnect}
                className="btn-primary btn-sm flex items-center gap-1.5"
              >
                <Link2 className="w-4 h-4" />
                Connecter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Settings */}
      {connected && expanded && (
        <div 
          className="px-4 pb-4 pt-0"
          style={{ borderTop: '1px solid rgb(var(--color-border))' }}
        >
          <div className="pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Slack Settings Component
// ============================================================================

interface SlackSettingsProps {
  integration: SlackIntegration;
  onUpdate: (updates: Partial<SlackIntegration>) => void;
}

function SlackSettings({ integration, onUpdate }: SlackSettingsProps) {
  return (
    <div className="space-y-6">
      {/* Daily Summary */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
            <span className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
              Résumé quotidien
            </span>
          </div>
          <Toggle
            checked={integration.dailySummary}
            onChange={() => onUpdate({ dailySummary: !integration.dailySummary })}
          />
        </div>
        {integration.dailySummary && (
          <div className="ml-6">
            <label className="text-xs mb-1 block" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Heure d'envoi
            </label>
            <input
              type="time"
              value={integration.dailySummaryTime}
              onChange={(e) => onUpdate({ dailySummaryTime: e.target.value })}
              className="input w-32"
              style={{
                backgroundColor: 'rgb(var(--color-bg-muted))',
                borderColor: 'rgb(var(--color-border))',
              }}
            />
          </div>
        )}
      </div>

      {/* Real-time Alerts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: 'rgb(var(--color-warning))' }} />
            <span className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
              Alertes en temps réel
            </span>
          </div>
          <Toggle
            checked={integration.alertsEnabled}
            onChange={() => onUpdate({ alertsEnabled: !integration.alertsEnabled })}
          />
        </div>
        {integration.alertsEnabled && (
          <div className="ml-6">
            <label className="text-xs mb-2 block" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Niveaux de priorité
            </label>
            <div className="flex flex-wrap gap-2">
              {(['low', 'medium', 'high', 'urgent'] as NotificationPriority[]).map((priority) => (
                <button
                  key={priority}
                  onClick={() => {
                    const newPriorities = integration.alertPriorities.includes(priority)
                      ? integration.alertPriorities.filter(p => p !== priority)
                      : [...integration.alertPriorities, priority];
                    onUpdate({ alertPriorities: newPriorities });
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor: integration.alertPriorities.includes(priority)
                      ? getPriorityColor(priority)
                      : 'rgb(var(--color-bg-emphasis))',
                    color: integration.alertPriorities.includes(priority)
                      ? 'white'
                      : 'rgb(var(--color-text-muted))',
                  }}
                >
                  {getPriorityLabel(priority)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Connection Info */}
      <div 
        className="p-3 rounded-lg text-xs"
        style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
      >
        <p style={{ color: 'rgb(var(--color-text-muted))' }}>
          Connecté le {new Date(integration.connectedAt).toLocaleDateString('fr-CA')} par {integration.connectedBy}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Teams Settings Component
// ============================================================================

interface TeamsSettingsProps {
  integration: TeamsIntegration;
  onUpdate: (updates: Partial<TeamsIntegration>) => void;
}

function TeamsSettings({ integration, onUpdate }: TeamsSettingsProps) {
  return (
    <div className="space-y-6">
      {/* Daily Summary */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
            <span className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
              Résumé quotidien
            </span>
          </div>
          <Toggle
            checked={integration.dailySummary}
            onChange={() => onUpdate({ dailySummary: !integration.dailySummary })}
          />
        </div>
        {integration.dailySummary && (
          <div className="ml-6">
            <label className="text-xs mb-1 block" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Heure d'envoi
            </label>
            <input
              type="time"
              value={integration.dailySummaryTime}
              onChange={(e) => onUpdate({ dailySummaryTime: e.target.value })}
              className="input w-32"
              style={{
                backgroundColor: 'rgb(var(--color-bg-muted))',
                borderColor: 'rgb(var(--color-border))',
              }}
            />
          </div>
        )}
      </div>

      {/* Real-time Alerts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: 'rgb(var(--color-warning))' }} />
            <span className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
              Alertes en temps réel
            </span>
          </div>
          <Toggle
            checked={integration.alertsEnabled}
            onChange={() => onUpdate({ alertsEnabled: !integration.alertsEnabled })}
          />
        </div>
        {integration.alertsEnabled && (
          <div className="ml-6">
            <label className="text-xs mb-2 block" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Niveaux de priorité
            </label>
            <div className="flex flex-wrap gap-2">
              {(['low', 'medium', 'high', 'urgent'] as NotificationPriority[]).map((priority) => (
                <button
                  key={priority}
                  onClick={() => {
                    const newPriorities = integration.alertPriorities.includes(priority)
                      ? integration.alertPriorities.filter(p => p !== priority)
                      : [...integration.alertPriorities, priority];
                    onUpdate({ alertPriorities: newPriorities });
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor: integration.alertPriorities.includes(priority)
                      ? getPriorityColor(priority)
                      : 'rgb(var(--color-bg-emphasis))',
                    color: integration.alertPriorities.includes(priority)
                      ? 'white'
                      : 'rgb(var(--color-text-muted))',
                  }}
                >
                  {getPriorityLabel(priority)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Connection Info */}
      <div 
        className="p-3 rounded-lg text-xs"
        style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
      >
        <p style={{ color: 'rgb(var(--color-text-muted))' }}>
          Connecté le {new Date(integration.connectedAt).toLocaleDateString('fr-CA')} par {integration.connectedBy}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getPriorityColor(priority: NotificationPriority): string {
  const colors: Record<NotificationPriority, string> = {
    low: 'rgb(var(--color-text-muted))',
    medium: 'rgb(var(--color-info))',
    high: 'rgb(var(--color-warning))',
    urgent: 'rgb(var(--color-error))',
  };
  return colors[priority];
}

function getPriorityLabel(priority: NotificationPriority): string {
  const labels: Record<NotificationPriority, string> = {
    low: 'Faible',
    medium: 'Moyen',
    high: 'Élevé',
    urgent: 'Urgent',
  };
  return labels[priority];
}
