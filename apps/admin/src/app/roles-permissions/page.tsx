'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminShell } from '@/components/layout/AdminShell';
import { useAdmin } from '@/hooks/useAdmin';
import { getAuthToken } from '@/lib/api';
import { Plus, Search, Shield, Edit, Trash2 } from 'lucide-react';

// API client functions
async function getRoles() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const token = getAuthToken();
  const response = await fetch(`${apiUrl}/api/admin/roles`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) return [];
  return response.json();
}

async function getPermissions() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const token = getAuthToken();
  const response = await fetch(`${apiUrl}/api/admin/permissions`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) return [];
  return response.json();
}

export default function RolesPermissionsPage() {
  const { token } = useAdmin();
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions'>('roles');
  const [search, setSearch] = useState('');

  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles', token],
    queryFn: getRoles,
    enabled: !!token,
  });

  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions', token],
    queryFn: getPermissions,
    enabled: !!token,
  });

  const isLoading = activeTab === 'roles' ? rolesLoading : permissionsLoading;
  const data = activeTab === 'roles' ? roles : permissions;

  const filteredData = data?.filter((item: any) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.id.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <AdminShell>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Roles & Permissions</h1>
            <p className="text-admin-400 mt-1">
              Manage user roles and their permissions
            </p>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New {activeTab === 'roles' ? 'Role' : 'Permission'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-admin-700">
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'roles'
                ? 'text-white border-b-2 border-white'
                : 'text-admin-400 hover:text-white'
            }`}
          >
            Roles ({roles?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'permissions'
                ? 'text-white border-b-2 border-white'
                : 'text-admin-400 hover:text-white'
            }`}
          >
            Permissions ({permissions?.length || 0})
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-admin-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-admin-800 border border-admin-700 rounded-lg text-white placeholder-admin-400"
            />
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-admin-400">Loading...</div>
        ) : (
          <div className="grid gap-4">
            {filteredData.map((item: any) => (
              <div
                key={item.id}
                className="bg-admin-800 border border-admin-700 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <Shield className="w-5 h-5 text-admin-400" />
                  <div>
                    <h3 className="text-white font-semibold">{item.name}</h3>
                    <p className="text-admin-400 text-sm font-mono">{item.id}</p>
                    {item.description && (
                      <p className="text-admin-400 text-sm mt-1">{item.description}</p>
                    )}
                    {activeTab === 'roles' && (
                      <div className="flex gap-4 mt-2 text-sm">
                        <span className="text-admin-400">
                          Tier: {item.tierLevel}
                        </span>
                        <span className="text-admin-400">
                          Permissions: {item.permissions?.length || 0}
                        </span>
                        {item.isSystem && (
                          <span className="px-2 py-1 bg-primary-600/20 border border-primary-600/30 text-primary-400 text-xs rounded">
                            System
                          </span>
                        )}
                      </div>
                    )}
                    {activeTab === 'permissions' && (
                      <span className="inline-block mt-2 px-2 py-1 bg-admin-700 text-admin-300 text-xs rounded">
                        {item.category}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-primary-600/20 rounded">
                    <Edit className="w-4 h-4 text-admin-400" />
                  </button>
                  {(!item.isSystem || activeTab === 'permissions') && (
                    <button className="p-2 hover:bg-primary-600/20 rounded">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
