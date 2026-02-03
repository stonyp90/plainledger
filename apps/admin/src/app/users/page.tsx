'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminShell } from '@/components/layout/AdminShell';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  UserPlus,
  Mail,
  Ban,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'users', search, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
      });
      if (search) params.set('search', search);

      const res = await fetch(`${API_URL}/admin/users?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        return { users: [], total: 0 };
      }
      return res.json();
    },
  });

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
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm transition-colors">
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
              className="w-full pl-10 pr-4 py-2.5 bg-admin-800 border border-admin-700 rounded-lg text-white placeholder-admin-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-admin-800 border border-admin-700 rounded-lg text-admin-300 hover:bg-admin-700 transition-colors">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2.5 bg-admin-800 border border-admin-700 rounded-lg text-admin-300 hover:bg-admin-700 transition-colors"
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
                        <div className="w-8 h-8 rounded-full bg-admin-600 flex items-center justify-center text-sm font-medium text-white">
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
                      <span className="px-2 py-1 text-xs rounded-full bg-admin-700 text-admin-300">
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
                      <button className="p-1 hover:bg-admin-700 rounded">
                        <MoreVertical className="w-5 h-5 text-admin-400" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.total > limit && (
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
    </AdminShell>
  );
}
