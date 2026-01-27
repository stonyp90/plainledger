import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useAnalyticsVisibility } from '../contexts/AnalyticsVisibilityContext';
import { useTenant } from '../contexts/TenantContext';
import { api } from '../lib/api';
import { useToast } from '../contexts/ToastContext';

export default function OrgFeaturesConfig() {
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const { features, refreshFeatures } = useAnalyticsVisibility();
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    plainledger: {
      enabled: true,
      visibleToRoles: [] as string[],
    },
    powerbi: {
      enabled: false,
      visibleToRoles: [] as string[],
    },
  });

  useEffect(() => {
    if (features) {
      setFormData({
        plainledger: {
          enabled: features.analytics.plainledger.enabled,
          visibleToRoles: [...features.analytics.plainledger.visibleToRoles],
        },
        powerbi: {
          enabled: features.analytics.powerbi.enabled,
          visibleToRoles: [...features.analytics.powerbi.visibleToRoles],
        },
      });
    }
  }, [features]);

  const availableRoles = [
    'plainledger_user',
    'organization_admin',
    'business_unit_admin',
    'organization_integration_manager',
    'business_unit_integration_manager',
  ];

  const handleToggle = (analyticsType: 'plainledger' | 'powerbi', field: 'enabled') => {
    setFormData(prev => ({
      ...prev,
      [analyticsType]: {
        ...prev[analyticsType],
        [field]: !prev[analyticsType][field],
      },
    }));
  };

  const handleRoleToggle = (analyticsType: 'plainledger' | 'powerbi', role: string) => {
    setFormData(prev => {
      const roles = prev[analyticsType].visibleToRoles;
      const newRoles = roles.includes(role)
        ? roles.filter(r => r !== role)
        : [...roles, role];

      return {
        ...prev,
        [analyticsType]: {
          ...prev[analyticsType],
          visibleToRoles: newRoles,
        },
      };
    });
  };

  const handleSave = async () => {
    if (!currentTenant?.organizationId) {
      toast.error('Organization ID not found');
      return;
    }

    try {
      setIsSaving(true);

      await api.put('/analytics/org-features', {
        organizationId: currentTenant.organizationId,
        analytics: formData,
      });

      await refreshFeatures();
      toast.success('Organization features updated successfully');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update features';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Settings className="w-8 h-8" />
          Organization Analytics Configuration
        </h1>
        <p className="text-gray-600 mt-2">
          Configure which analytics sections are visible to different user roles
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        {/* PlainLedger Analytics */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">PlainLedger Analytics</h2>
              <p className="text-gray-600 text-sm mt-1">
                Native graphs, AI recommendations, and anomaly detection
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.plainledger.enabled}
                onChange={() => handleToggle('plainledger', 'enabled')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {formData.plainledger.enabled && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visible to Roles:
              </label>
              <div className="space-y-2">
                {availableRoles.map(role => (
                  <label key={role} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.plainledger.visibleToRoles.includes(role)}
                      onChange={() => handleRoleToggle('plainledger', role)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{role}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Power BI Analytics */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Power BI Analytics</h2>
              <p className="text-gray-600 text-sm mt-1">
                Embedded Power BI reports with advanced visualizations
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.powerbi.enabled}
                onChange={() => handleToggle('powerbi', 'enabled')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {formData.powerbi.enabled && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visible to Roles:
              </label>
              <div className="space-y-2">
                {availableRoles.map(role => (
                  <label key={role} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.powerbi.visibleToRoles.includes(role)}
                      onChange={() => handleRoleToggle('powerbi', role)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{role}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
