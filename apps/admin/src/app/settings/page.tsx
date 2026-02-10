'use client';

import { useState } from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import { 
  Settings as SettingsIcon,
  Bell,
  Shield,
  Mail,
  Globe,
  Key,
  Save,
  RefreshCw,
  Info,
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
  };

  return (
    <AdminShell>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="text-admin-400 mt-1">
              Configure platform settings and preferences
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-600/50 rounded-lg text-white text-sm transition-colors"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-48 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-600 text-white'
                      : 'text-admin-400 hover:bg-primary-600/20 hover:text-primary-400'
                  }`}
                  style={activeTab === tab.id ? { color: '#ffffff' } : undefined}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            {activeTab === 'general' && <GeneralSettings />}
            {activeTab === 'notifications' && <NotificationSettings />}
            {activeTab === 'security' && <SecuritySettings />}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function GeneralSettings() {
  return (
    <div className="bg-admin-800 rounded-xl p-6 border border-admin-700">
      <h2 className="text-lg font-semibold text-white mb-4">General Settings</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-admin-300 mb-2">
            Platform Name
          </label>
          <input
            type="text"
            defaultValue="PlainLedger"
            className="w-full px-4 py-2.5 bg-admin-900 border border-admin-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-admin-300 mb-2">
            Support Email
          </label>
          <input
            type="email"
            defaultValue="support@plainledger.ca"
            className="w-full px-4 py-2.5 bg-admin-900 border border-admin-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-admin-300 mb-2">
            Default Timezone
          </label>
          <select className="w-full px-4 py-2.5 bg-admin-900 border border-admin-700 rounded-lg text-white focus:outline-none focus:border-primary-500">
            <option value="America/Toronto">America/Toronto (EST)</option>
            <option value="America/Vancouver">America/Vancouver (PST)</option>
            <option value="UTC">UTC</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-admin-300 mb-2">
            Default Currency
          </label>
          <select className="w-full px-4 py-2.5 bg-admin-900 border border-admin-700 rounded-lg text-white focus:outline-none focus:border-primary-500">
            <option value="CAD">CAD - Canadian Dollar</option>
            <option value="USD">USD - US Dollar</option>
            <option value="EUR">EUR - Euro</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="bg-admin-800 rounded-xl p-6 border border-admin-700">
      <h2 className="text-lg font-semibold text-white mb-4">Notification Settings</h2>
      
      <div className="space-y-4">
        <ToggleSetting
          title="Email Notifications"
          description="Receive email notifications for important events"
          defaultChecked={true}
        />
        <ToggleSetting
          title="New User Alerts"
          description="Get notified when new users sign up"
          defaultChecked={true}
        />
        <ToggleSetting
          title="Sync Failure Alerts"
          description="Get notified when data sync jobs fail"
          defaultChecked={true}
        />
        <ToggleSetting
          title="Billing Alerts"
          description="Get notified about billing issues and renewals"
          defaultChecked={true}
        />
        <ToggleSetting
          title="Security Alerts"
          description="Get notified about security events"
          defaultChecked={true}
        />
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="bg-admin-800 rounded-xl p-6 border border-admin-700">
      <h2 className="text-lg font-semibold text-white mb-4">Security Settings</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-admin-300 mb-2">
            Session Timeout (minutes)
          </label>
          <input
            type="number"
            defaultValue={30}
            className="w-full px-4 py-2.5 bg-admin-900 border border-admin-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
          />
        </div>

        <ToggleSetting
          title="Enforce 2FA for Admins"
          description="Require two-factor authentication for all admin users"
          defaultChecked={true}
        />

        <ToggleSetting
          title="IP Allowlist"
          description="Restrict admin access to specific IP addresses"
          defaultChecked={false}
        />

        <div>
          <label className="block text-sm font-medium text-admin-300 mb-2">
            Password Policy
          </label>
          <select className="w-full px-4 py-2.5 bg-admin-900 border border-admin-700 rounded-lg text-white focus:outline-none focus:border-primary-500">
            <option value="strong">Strong (12+ chars, mixed case, numbers, symbols)</option>
            <option value="medium">Medium (8+ chars, mixed case, numbers)</option>
            <option value="basic">Basic (8+ chars)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function ToggleSetting({ 
  title, 
  description, 
  defaultChecked 
}: { 
  title: string; 
  description: string; 
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div className="flex items-center justify-between py-3 border-b border-admin-700 last:border-0">
      <div>
        <p className="font-medium text-white">{title}</p>
        <p className="text-sm text-admin-400">{description}</p>
      </div>
      <button
        onClick={() => setChecked(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? 'bg-primary-600' : 'bg-admin-700'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
