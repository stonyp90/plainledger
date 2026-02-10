'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminShell } from '@/components/layout/AdminShell';
import { useAdmin } from '@/hooks/useAdmin';
import { usersApi, organizationsApi } from '@/lib/api';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  UserPlus,
  Mail,
  Ban,
  CheckCircle,
  RefreshCw,
  X,
  Loader2,
} from 'lucide-react';

export default function UsersPage() {
  const { token } = useAdmin();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', organizationId: '', role: 'user' });
  const [inviteError, setInviteError] = useState('');
  const limit = 20;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'users', search, page, token],
    queryFn: async () => {
      try {
        return await usersApi.list({
          limit: limit.toString(),
          offset: (page * limit).toString(),
          ...(search ? { search } : {}),
        });
      } catch {
        return { users: [], total: 0 };
      }
    },
    enabled: !!token,
  });

  // Fetch organizations for the invite modal
  const { data: orgsData } = useQuery({
    queryKey: ['admin', 'organizations', token],
    queryFn: async () => {
      try {
        return await organizationsApi.list({ limit: '100' });
      } catch {
        return { organizations: [], total: 0 };
      }
    },
    enabled: !!token,
  });

  // Invite user mutation
  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; organizationId: string; role?: string }) =>
      usersApi.invite(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setIsInviteModalOpen(false);
      setInviteForm({ email: '', organizationId: '', role: 'user' });
      setInviteError('');
    },
    onError: (error: Error) => {
      setInviteError(error.message || 'Failed to invite user');
    },
  });

  const handleInvite = () => {
    setInviteError('');
    if (!inviteForm.email || !inviteForm.organizationId) {
      setInviteError('Email and organization are required');
      return;
    }
    inviteMutation.mutate(inviteForm);
  };

  return (
    <AdminShell>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Users</h1>
            <p className="text-admin-400 mt-1">
              Manage all users across organizations
            </p>
          </div>
          <button 
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-white text-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Invite User
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-admin-400" />
            <input
              type="text"
              placeholder="Search by email, name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-admin-800 border border-admin-700 rounded-lg text-white placeholder-admin-400 focus:outline-none focus:border-primary-500"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-admin-800/50 border border-admin-700/50 rounded-lg text-admin-300 hover:bg-primary-600/20 hover:text-primary-400 transition-colors">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2.5 bg-admin-800/50 border border-admin-700/50 rounded-lg text-admin-300 hover:bg-primary-600/20 hover:text-primary-400 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Table */}
        <div className="bg-admin-800 rounded-xl border border-admin-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-admin-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-admin-400 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-admin-400 uppercase tracking-wider">Organization</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-admin-400 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-admin-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-admin-400 uppercase tracking-wider">Last Login</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-admin-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-admin-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading users...
                  </td>
                </tr>
              ) : data?.users?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-admin-400">
                    No users found
                  </td>
                </tr>
              ) : (
                data?.users?.map((user: any) => (
                  <tr key={user.id} className="hover:bg-admin-700/50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-600/20 border border-primary-600/30 flex items-center justify-center text-sm font-medium text-primary-400">
                          {user.firstName?.[0] || user.email?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-sm text-admin-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-admin-300">
                      {user.organizationName || '-'}
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-1 text-xs rounded-full bg-primary-600/20 text-primary-400 border border-primary-600/30">
                        {user.role || 'User'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {user.isActive !== false ? (
                        <span className="flex items-center gap-1 text-green-400 text-sm">
                          <CheckCircle className="w-4 h-4" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400 text-sm">
                          <Ban className="w-4 h-4" /> Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-admin-400 text-sm">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button className="p-1 hover:bg-primary-600/20 rounded transition-colors">
                        <MoreVertical className="w-5 h-5 text-admin-400 hover:text-primary-400" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total && data.total > limit && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-admin-400">
              Showing {page * limit + 1} to {Math.min((page + 1) * limit, data.total)} of {data.total} users
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 bg-admin-800 border border-admin-700 rounded text-admin-300 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={(page + 1) * limit >= data.total}
                className="px-3 py-1.5 bg-admin-800 border border-admin-700 rounded text-admin-300 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invite User Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-admin-800 rounded-xl border border-admin-700 p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Invite User</h2>
              <button
                onClick={() => {
                  setIsInviteModalOpen(false);
                  setInviteError('');
                }}
                className="p-1 hover:bg-admin-700 rounded transition-colors"
              >
                <X className="w-5 h-5 text-admin-400" />
              </button>
            </div>

            {inviteError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {inviteError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-admin-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 bg-admin-900 border border-admin-700 rounded-lg text-white placeholder-admin-500 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-admin-300 mb-1">
                  Organization
                </label>
                <select
                  value={inviteForm.organizationId}
                  onChange={(e) => setInviteForm({ ...inviteForm, organizationId: e.target.value })}
                  className="w-full px-3 py-2 bg-admin-900 border border-admin-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="">Select an organization</option>
                  {orgsData?.organizations?.map((org: any) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-admin-300 mb-1">
                  Role
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full px-3 py-2 bg-admin-900 border border-admin-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setIsInviteModalOpen(false);
                  setInviteError('');
                }}
                className="flex-1 px-4 py-2 bg-admin-700 hover:bg-admin-600 rounded-lg text-white text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={inviteMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg text-white text-sm transition-colors"
              >
                {inviteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Inviting...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send Invite
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
