'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminShell } from '@/components/layout/AdminShell';
import { useAdmin } from '@/hooks/useAdmin';
import { adminsApi } from '@/lib/api';
import { 
  Search, 
  UserPlus,
  Shield,
  MoreVertical,
  CheckCircle,
  Ban,
  RefreshCw,
} from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  groups: string[];
  createdAt: string;
  lastLoginAt?: string;
}

export default function AdminUsersPage() {
  const { token } = useAdmin();
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'admins', search, token],
    queryFn: async () => {
      // The adminsApi doesn't have a list function, so we'll use direct fetch
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/admin/admins`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch admins: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!token,
  });

  const filteredAdmins = data?.admins?.filter((admin: AdminUser) =>
    admin.email.toLowerCase().includes(search.toLowerCase()) ||
    admin.displayName.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <AdminShell>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Users</h1>
            <p className="text-admin-400 mt-1">
              Manage platform administrators and their permissions
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-white text-sm transition-colors">
            <UserPlus className="w-4 h-4" />
            Add Admin
          </button>
        </div>

        {/* Search */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-admin-400" />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-admin-800 border border-admin-700 rounded-lg text-white placeholder-admin-400 focus:outline-none focus:border-primary-500"
            />
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2.5 bg-admin-800/50 border border-admin-700/50 rounded-lg text-admin-300 hover:bg-primary-600/20 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Admin Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-full text-center py-8 text-admin-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading admin users...
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="col-span-full text-center py-8 text-admin-400">
              No admin users found
            </div>
          ) : (
            filteredAdmins.map((admin: AdminUser) => (
              <div
                key={admin.id}
                className="bg-admin-800 rounded-xl p-5 border border-admin-700 hover:border-admin-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-medium">
                      {admin.displayName?.[0] || admin.email?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-white">{admin.displayName}</p>
                      <p className="text-sm text-admin-400">{admin.email}</p>
                    </div>
                  </div>
                  <button className="p-1 hover:bg-admin-700 rounded">
                    <MoreVertical className="w-5 h-5 text-admin-400" />
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-admin-500" />
                    <div className="flex flex-wrap gap-1">
                      {admin.groups?.map((group) => (
                        <span
                          key={group}
                          className="px-2 py-0.5 text-xs rounded bg-primary-600/20 border border-primary-600/30 text-primary-400"
                        >
                          {group}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-admin-700">
                  <div className="flex items-center gap-1">
                    {admin.isActive ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-green-400">Active</span>
                      </>
                    ) : (
                      <>
                        <Ban className="w-4 h-4 text-red-400" />
                        <span className="text-sm text-red-400">Disabled</span>
                      </>
                    )}
                  </div>
                  <span className="text-xs text-admin-500">
                    Last login: {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleDateString() : 'Never'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminShell>
  );
}
