'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminShell } from '@/components/layout/AdminShell';
import { useAdmin } from '@/hooks/useAdmin';
import { getAuthToken } from '@/lib/api';
import { Plus, Search, Key, Edit, Trash2 } from 'lucide-react';

// API client function
async function getEntitlements() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const token = getAuthToken();
  const response = await fetch(`${apiUrl}/api/admin/entitlements`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) return [];
  return response.json();
}

export default function EntitlementsPage() {
  const { token } = useAdmin();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const { data: entitlements, isLoading } = useQuery({
    queryKey: ['entitlements', token],
    queryFn: getEntitlements,
    enabled: !!token,
  });

  const filteredEntitlements = entitlements?.filter((ent: any) => {
    const matchesSearch =
      ent.name.toLowerCase().includes(search.toLowerCase()) ||
      ent.id.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || ent.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }) || [];

  const categorySet = new Set<string>(entitlements?.map((e: any) => e.category as string) || []);
  const categories: string[] = ['all', ...Array.from(categorySet)];

  return (
    <AdminShell>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Entitlements</h1>
            <p className="text-admin-400 mt-1">
              Manage feature entitlements for subscription plans
            </p>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Entitlement
          </button>
        </div>

        {/* Filters */}
        <div className="mb-4 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-admin-400" />
            <input
              type="text"
              placeholder="Search entitlements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-admin-800 border border-admin-700 rounded-lg text-white placeholder-admin-400"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 bg-admin-800 border border-admin-700 rounded-lg text-white"
          >
            {categories.map((cat: string) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        {/* Entitlements List */}
        {isLoading ? (
          <div className="text-admin-400">Loading...</div>
        ) : (
          <div className="grid gap-4">
            {filteredEntitlements.map((entitlement: any) => (
              <div
                key={entitlement.id}
                className="bg-admin-800 border border-admin-700 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <Key className="w-5 h-5 text-admin-400" />
                  <div>
                    <h3 className="text-white font-semibold">{entitlement.name}</h3>
                    <p className="text-admin-400 text-sm font-mono">{entitlement.id}</p>
                    {entitlement.description && (
                      <p className="text-admin-400 text-sm mt-1">{entitlement.description}</p>
                    )}
                    <span className="inline-block mt-2 px-2 py-1 bg-primary-600/20 border border-primary-600/30 text-primary-400 text-xs rounded">
                      {entitlement.category}
                    </span>
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
