import { useState } from 'react';
import { useI18n } from '../../lib/i18n';
import {
  Settings,
  Bell,
  Shield,
  Globe,
  Mail,
  Save,
  Palette,
  Database,
} from 'lucide-react';

// Toggle Switch Component with CSS variables
function ToggleSwitch({ 
  defaultChecked = false,
  onChange 
}: { 
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  
  const handleChange = () => {
    const newValue = !checked;
    setChecked(newValue);
    onChange?.(newValue);
  };
  
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={handleChange}
      className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2"
      style={{
        backgroundColor: checked ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-bg-muted))',
        boxShadow: checked ? undefined : 'inset 0 0 0 1px rgb(var(--color-border))',
      }}
    >
      <span
        className="pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out"
        style={{
          backgroundColor: 'white',
          transform: checked ? 'translateX(1.25rem)' : 'translateX(0)',
        }}
      />
    </button>
  );
}

export default function AdminSettings() {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [activeSection, setActiveSection] = useState('general');

  const sections = [
    { id: 'general', label: isEn ? 'General' : 'Général', icon: Settings },
    { id: 'notifications', label: isEn ? 'Notifications' : 'Notifications', icon: Bell },
    { id: 'security', label: isEn ? 'Security' : 'Sécurité', icon: Shield },
    { id: 'branding', label: isEn ? 'Branding' : 'Image de marque', icon: Palette },
    { id: 'email', label: isEn ? 'Email' : 'Courriel', icon: Mail },
    { id: 'data', label: isEn ? 'Data & Storage' : 'Données', icon: Database },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Settings' : 'Paramètres'}
        </h1>
        <p className="mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
          {isEn ? 'Configure platform settings and preferences' : 'Configurer les paramètres de la plateforme'}
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div
          className="w-64 flex-shrink-0 rounded-xl border p-4"
          style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}
        >
          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: isActive ? 'rgb(var(--color-primary-500) / 0.1)' : 'transparent',
                    color: isActive ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-secondary))',
                  }}
                >
                  <Icon className="w-5 h-5" />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div
            className="rounded-xl border p-6"
            style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}
          >
            {activeSection === 'general' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'General Settings' : 'Paramètres généraux'}
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'Platform Name' : 'Nom de la plateforme'}
                    </label>
                    <input
                      type="text"
                      defaultValue="PlainLedger"
                      className="w-full px-4 py-2 rounded-lg border text-sm"
                      style={{
                        backgroundColor: 'rgb(var(--color-bg))',
                        borderColor: 'rgb(var(--color-border))',
                        color: 'rgb(var(--color-text))',
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'Default Language' : 'Langue par défaut'}
                    </label>
                    <select
                      className="w-full px-4 py-2 rounded-lg border text-sm"
                      style={{
                        backgroundColor: 'rgb(var(--color-bg))',
                        borderColor: 'rgb(var(--color-border))',
                        color: 'rgb(var(--color-text))',
                      }}
                    >
                      <option value="en">English</option>
                      <option value="fr">Français</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'Default Timezone' : 'Fuseau horaire par défaut'}
                    </label>
                    <select
                      className="w-full px-4 py-2 rounded-lg border text-sm"
                      style={{
                        backgroundColor: 'rgb(var(--color-bg))',
                        borderColor: 'rgb(var(--color-border))',
                        color: 'rgb(var(--color-text))',
                      }}
                    >
                      <option value="America/Toronto">Eastern Time (ET)</option>
                      <option value="America/Vancouver">Pacific Time (PT)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'security' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Security Settings' : 'Paramètres de sécurité'}
                </h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
                    <div>
                      <div className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                        {isEn ? 'Require MFA for Admins' : 'Exiger MFA pour les admins'}
                      </div>
                      <div className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                        {isEn ? 'All admin users must use multi-factor authentication' : 'Tous les admins doivent utiliser MFA'}
                      </div>
                    </div>
                    <ToggleSwitch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
                    <div>
                      <div className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                        {isEn ? 'Session Timeout' : 'Expiration de session'}
                      </div>
                      <div className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                        {isEn ? 'Auto-logout after inactivity' : 'Déconnexion auto après inactivité'}
                      </div>
                    </div>
                    <select
                      className="px-3 py-1.5 rounded-lg border text-sm"
                      style={{
                        backgroundColor: 'rgb(var(--color-bg))',
                        borderColor: 'rgb(var(--color-border))',
                        color: 'rgb(var(--color-text))',
                      }}
                    >
                      <option value="30">30 {isEn ? 'minutes' : 'minutes'}</option>
                      <option value="60">1 {isEn ? 'hour' : 'heure'}</option>
                      <option value="240">4 {isEn ? 'hours' : 'heures'}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {(activeSection !== 'general' && activeSection !== 'security') && (
              <div className="text-center py-12">
                <Settings className="w-12 h-12 mx-auto mb-4 opacity-30" style={{ color: 'rgb(var(--color-text-secondary))' }} />
                <p style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Settings section coming soon' : 'Section en cours de développement'}
                </p>
              </div>
            )}

            <div className="mt-6 pt-6 border-t flex justify-end" style={{ borderColor: 'rgb(var(--color-border))' }}>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
              >
                <Save className="w-4 h-4" />
                {isEn ? 'Save Changes' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
