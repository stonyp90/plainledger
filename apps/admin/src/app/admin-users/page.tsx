'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  X,
  Trash2,
  Loader2,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  groups: string[];
  createdAt: string;
  lastLoginAt?: string;
}

interface AdminGroup {
  id: string;
  name: string;
  description?: string;
}

export default function AdminUsersPage() {
  const { token } = useAdmin();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [newAdmin, setNewAdmin] = useState({ email: '', displayName: '', groupIds: [] as string[] });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'admins', search, token],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/admin/admins`, {
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

  // Fetch available groups
  const { data: groupsData } = useQuery({
    queryKey: ['admin', 'groups', token],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/admin/admins/groups`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!token,
  });

  const createAdminMutation = useMutation({
    mutationFn: async (data: { email: string; displayName: string; groupIds: string[] }) => {
      const response = await fetch(`${API_URL}/api/admin/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create admin');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'admins'] });
      setShowAddModal(false);
      setNewAdmin({ email: '', displayName: '', groupIds: [] });
    },
  });

  const deleteAdminMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_URL}/api/admin/admins/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to remove admin');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'admins'] });
      setShowDeleteConfirm(null);
    },
  });

  const filteredAdmins = data?.admins?.filter((admin: AdminUser) =>
    admin.email.toLowerCase().includes(search.toLowerCase()) ||
    admin.displayName.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const groups: AdminGroup[] = groupsData || [];

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
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-primary-600/40 hover:bg-primary-600/10 hover:border-primary-600/70 rounded-lg text-primary-400 text-sm transition-colors"
          >
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
                  <button 
                    onClick={() => setShowDeleteConfirm(admin.id)}
                    className="p-1 hover:bg-red-500/20 rounded text-admin-400 hover:text-red-400 transition-colors"
                    title="Remove admin"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-admin-500" />
                    <div className="flex flex-wrap gap-1">
                      {admin.groups?.length > 0 ? admin.groups.map((group) => (
                        <span
                          key={group}
                          className="px-2 py-0.5 text-xs rounded bg-primary-600/20 border border-primary-600/30 text-primary-400"
                        >
                          {group}
                        </span>
                      )) : (
                        <span className="text-xs text-admin-500">No groups assigned</span>
                      )}
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

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-admin-800 rounded-xl p-6 w-full max-w-md border border-admin-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Add New Admin</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-admin-400 hover:text-primary-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              createAdminMutation.mutate(newAdmin);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-admin-300 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                    className="w-full px-3 py-2 bg-admin-900 border border-admin-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    placeholder="admin@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm text-admin-300 mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    value={newAdmin.displayName}
                    onChange={(e) => setNewAdmin({ ...newAdmin, displayName: e.target.value })}
                    className="w-full px-3 py-2 bg-admin-900 border border-admin-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm text-admin-300 mb-1">Groups (optional)</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {groups.map((group) => (
                      <label key={group.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newAdmin.groupIds.includes(group.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewAdmin({ ...newAdmin, groupIds: [...newAdmin.groupIds, group.id] });
                            } else {
                              setNewAdmin({ ...newAdmin, groupIds: newAdmin.groupIds.filter(id => id !== group.id) });
                            }
                          }}
                          className="rounded border-admin-600 bg-admin-900 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-admin-300">{group.name}</span>
                      </label>
                    ))}
                    {groups.length === 0 && (
                      <p className="text-sm text-admin-500">No groups available</p>
                    )}
                  </div>
                </div>

                {createAdminMutation.error && (
                  <p className="text-sm text-red-400">
                    {(createAdminMutation.error as Error).message}
                  </p>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 bg-admin-700 hover:bg-admin-600 rounded-lg text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createAdminMutation.isPending}
                    className="flex-1 px-4 py-2 border border-primary-600/40 hover:bg-primary-600/10 hover:border-primary-600/70 rounded-lg text-primary-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {createAdminMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Admin'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-admin-800 rounded-xl p-6 w-full max-w-sm border border-admin-700">
            <h2 className="text-lg font-semibold text-white mb-2">Remove Admin?</h2>
            <p className="text-admin-400 mb-6">
              This will revoke admin privileges. The user account will remain active.
            </p>
            
            {deleteAdminMutation.error && (
              <p className="text-sm text-red-400 mb-4">
                {(deleteAdminMutation.error as Error).message}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-admin-700 hover:bg-admin-600 rounded-lg text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteAdminMutation.mutate(showDeleteConfirm)}
                disabled={deleteAdminMutation.isPending}
                className="flex-1 px-4 py-2 border border-red-600/40 hover:bg-red-600/10 hover:border-red-600/70 rounded-lg text-red-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteAdminMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  'Remove'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
