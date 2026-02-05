'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminShell } from '@/components/layout/AdminShell';
import { organizationsApi } from '@/lib/api';
import { 
  Plus, 
  Search, 
  Building2, 
  Users, 
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function OrganizationsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['organizations', search, page],
    queryFn: () =>
      organizationsApi.list({
        search,
        limit: String(limit),
        offset: String(page * limit),
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['organizations', 'stats'],
    queryFn: () => organizationsApi.getStats(),
  });

  return (
    <AdminShell>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Organizations</h1>
            <p className="text-admin-400 mt-1">
              Manage all organizations on the platform
            </p>
          </div>
          <a
            href="/organizations/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Create Organization</span>
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total Organizations"
            value={stats?.totalOrganizations || '--'}
          />
          <StatCard
            title="Active"
            value={stats?.activeOrganizations || '--'}
          />
          <StatCard
            title="This Month"
            value="--"
          />
          <StatCard
            title="Churned"
            value="--"
          />
        </div>

        {/* Search and filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-admin-400" />
            <input
              type="text"
              placeholder="Search by name, tenant ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-admin-800 border border-admin-700 rounded-lg text-white placeholder-admin-400 focus:outline-none focus:border-primary-500"
            />
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-admin-800 border border-admin-700 rounded-lg text-admin-400 hover:text-white hover:bg-admin-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Table */}
        <div className="bg-admin-800 border border-admin-700 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-admin-700/50">
                <th className="px-6 py-3 text-left text-xs font-medium text-admin-400 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-admin-400 uppercase tracking-wider">
                  Industry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-admin-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-admin-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-admin-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-admin-400">
                    Loading organizations...
                  </td>
                </tr>
              ) : !data?.organizations?.length ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-admin-400">
                    No organizations found
                  </td>
                </tr>
              ) : (
                data.organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-admin-700/30">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-admin-700 rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-admin-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{org.name}</p>
                          <p className="text-sm text-admin-400">{org.tenantId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-admin-300">{org.industry || 'Not set'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-admin-400">
                        {org.createdAt
                          ? formatDistanceToNow(new Date(org.createdAt), { addSuffix: true })
                          : '--'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          org.deletedAt
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}
                      >
                        {org.deletedAt ? 'Deleted' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/organizations/${org.id}`}
                          className="p-2 text-admin-400 hover:text-white hover:bg-admin-700 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        <a
                          href={`/organizations/${org.id}/edit`}
                          className="p-2 text-admin-400 hover:text-white hover:bg-admin-700 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </a>
                        <button
                          className="p-2 text-admin-400 hover:text-red-400 hover:bg-admin-700 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {data && data.total > limit && (
            <div className="px-6 py-4 border-t border-admin-700 flex items-center justify-between">
              <p className="text-sm text-admin-400">
                Showing {page * limit + 1} to {Math.min((page + 1) * limit, data.total)} of{' '}
                {data.total} organizations
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                  className="px-3 py-1 bg-admin-700 text-admin-400 rounded hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={(page + 1) * limit >= data.total}
                  className="px-3 py-1 bg-admin-700 text-admin-400 rounded hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-admin-800 border border-admin-700 rounded-lg p-4">
      <p className="text-admin-400 text-sm">{title}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}
