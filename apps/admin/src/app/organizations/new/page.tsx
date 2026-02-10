'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { AdminShell } from '@/components/layout/AdminShell';
import { organizationsApi } from '@/lib/api';
import { 
  Building2, 
  ArrowLeft,
  Loader2,
  Save,
} from 'lucide-react';

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Retail',
  'Manufacturing',
  'Real Estate',
  'Construction',
  'Professional Services',
  'Education',
  'Non-Profit',
  'Other',
];

const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP'];

export default function NewOrganizationPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    tenantId: '',
    legalName: '',
    taxNumber: '',
    fiscalYearEnd: 12,
    currency: 'CAD',
    industry: '',
  });
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => organizationsApi.create(data),
    onSuccess: (result) => {
      router.push(`/organizations/${result.id}`);
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to create organization');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.name.trim()) {
      setError('Organization name is required');
      return;
    }
    
    // Auto-generate tenant ID from name if not provided
    const data = {
      ...formData,
      tenantId: formData.tenantId || formData.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
    };
    
    createMutation.mutate(data);
  };

  return (
    <AdminShell>
      <div className="p-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-admin-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-admin-400" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600/20 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Create Organization</h1>
              <p className="text-sm text-admin-400">Add a new organization to the platform</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
              {error}
            </div>
          )}

          <div className="bg-admin-800 border border-admin-700 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
            
            <div>
              <label className="block text-sm font-medium text-admin-300 mb-1">
                Organization Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Acme Corporation"
                className="w-full px-3 py-2 bg-admin-900 border border-admin-700 rounded-lg text-white placeholder-admin-500 focus:outline-none focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-admin-300 mb-1">
                Tenant ID
              </label>
              <input
                type="text"
                value={formData.tenantId}
                onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                placeholder="acme-corp (auto-generated if empty)"
                className="w-full px-3 py-2 bg-admin-900 border border-admin-700 rounded-lg text-white placeholder-admin-500 focus:outline-none focus:border-primary-500"
              />
              <p className="text-xs text-admin-500 mt-1">
                Unique identifier for the organization. Leave empty to auto-generate.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-admin-300 mb-1">
                Legal Name
              </label>
              <input
                type="text"
                value={formData.legalName}
                onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                placeholder="Acme Corporation Inc."
                className="w-full px-3 py-2 bg-admin-900 border border-admin-700 rounded-lg text-white placeholder-admin-500 focus:outline-none focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-admin-300 mb-1">
                Tax Number
              </label>
              <input
                type="text"
                value={formData.taxNumber}
                onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                placeholder="123456789RT0001"
                className="w-full px-3 py-2 bg-admin-900 border border-admin-700 rounded-lg text-white placeholder-admin-500 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div className="bg-admin-800 border border-admin-700 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">Business Details</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-admin-300 mb-1">
                  Industry
                </label>
                <select
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-3 py-2 bg-admin-900 border border-admin-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="">Select industry</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind.toLowerCase().replace(' ', '_')}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-admin-300 mb-1">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-3 py-2 bg-admin-900 border border-admin-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                >
                  {CURRENCIES.map((curr) => (
                    <option key={curr} value={curr}>
                      {curr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-admin-300 mb-1">
                Fiscal Year End Month
              </label>
              <select
                value={formData.fiscalYearEnd}
                onChange={(e) => setFormData({ ...formData, fiscalYearEnd: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-admin-900 border border-admin-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
              >
                <option value={1}>January</option>
                <option value={2}>February</option>
                <option value={3}>March</option>
                <option value={4}>April</option>
                <option value={5}>May</option>
                <option value={6}>June</option>
                <option value={7}>July</option>
                <option value={8}>August</option>
                <option value={9}>September</option>
                <option value={10}>October</option>
                <option value={11}>November</option>
                <option value={12}>December</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-2 bg-admin-700 hover:bg-admin-600 rounded-lg text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg text-white transition-colors"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Create Organization
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}
