'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminShell } from '@/components/layout/AdminShell';
import { useAdmin } from '@/hooks/useAdmin';
import { getAuthToken } from '@/lib/api';
import { Plus, Search, CreditCard, Edit, Trash2 } from 'lucide-react';

// API client function
async function getSubscriptionPlans() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const token = getAuthToken();
  const response = await fetch(`${apiUrl}/api/admin/subscription-plans`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) return [];
  return response.json();
}

export default function SubscriptionPlansPage() {
  const { token } = useAdmin();
  const [search, setSearch] = useState('');

  const { data: plans, isLoading, refetch } = useQuery({
    queryKey: ['subscription-plans', token],
    queryFn: getSubscriptionPlans,
    enabled: !!token,
  });

  const filteredPlans = plans?.filter((plan: any) =>
    plan.name.toLowerCase().includes(search.toLowerCase()) ||
    plan.id.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <AdminShell>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Subscription Plans</h1>
            <p className="text-admin-400 mt-1">
              Manage subscription plans and Stripe mappings
            </p>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Plan
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-admin-400" />
            <input
              type="text"
              placeholder="Search plans..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-admin-800 border border-admin-700 rounded-lg text-white placeholder-admin-400"
            />
          </div>
        </div>

        {/* Plans List */}
        {isLoading ? (
          <div className="text-admin-400">Loading...</div>
        ) : (
          <div className="grid gap-4">
            {filteredPlans.map((plan: any) => (
              <div
                key={plan.id}
                className="bg-admin-800 border border-admin-700 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <CreditCard className="w-5 h-5 text-admin-400" />
                  <div>
                    <h3 className="text-white font-semibold">{plan.name}</h3>
                    <p className="text-admin-400 text-sm">{plan.id}</p>
                    {plan.description && (
                      <p className="text-admin-400 text-sm mt-1">{plan.description}</p>
                    )}
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="text-admin-400">
                        Entitlements: {plan.entitlements?.length || 0}
                      </span>
                      <span className="text-admin-400">
                        Stripe: {plan.stripeProductId || 'Not mapped'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-primary-600/20 rounded">
                    <Edit className="w-4 h-4 text-admin-400" />
                  </button>
                  <button className="p-2 hover:bg-primary-600/20 rounded">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
