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
} from 'lucide-react';
import Toggle, { ToggleGroup } from './Toggle';
import { useNotifications } from '../contexts/NotificationContext';
import { NotificationCategory } from '../lib/notifications';

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
];

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
    channel: 'in_app' | 'email' | 'push' | 'sms'
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
        },
      },
    }));
  };

  // Check if all channels are enabled for a category
  const isCategoryAllEnabled = (category: NotificationCategory) => {
    const cat = localPrefs.channels[category];
    return cat.in_app && cat.email && cat.push && cat.sms;
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
                      {channels.map((channel) => (
                        <td key={channel.id} className="py-4 px-4 text-center">
                          <div className="flex justify-center">
                            <NotificationCheckbox
                              checked={localPrefs.channels[category][channel.id]}
                              onChange={() => handleToggleChannel(category, channel.id)}
                            />
                          </div>
                        </td>
                      ))}
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
                  
                  <div className="grid grid-cols-4 gap-2">
                    {channels.map((channel) => (
                      <button
                        key={channel.id}
                        onClick={() => handleToggleChannel(category, channel.id)}
                        className={`
                          flex flex-col items-center gap-1.5 p-2.5 rounded-lg transition-all
                        `}
                        style={{
                          backgroundColor: localPrefs.channels[category][channel.id]
                            ? 'rgb(var(--color-primary-500))'
                            : 'rgb(var(--color-surface))',
                          border: localPrefs.channels[category][channel.id]
                            ? 'none'
                            : '1px solid rgb(var(--color-border))',
                        }}
                      >
                        <channel.icon 
                          className="w-4 h-4" 
                          style={{ 
                            color: localPrefs.channels[category][channel.id]
                              ? 'white'
                              : 'rgb(var(--color-text-muted))'
                          }}
                        />
                        <span 
                          className="text-[10px] font-medium"
                          style={{ 
                            color: localPrefs.channels[category][channel.id]
                              ? 'white'
                              : 'rgb(var(--color-text-muted))'
                          }}
                        >
                          {channel.labelFr}
                        </span>
                      </button>
                    ))}
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
