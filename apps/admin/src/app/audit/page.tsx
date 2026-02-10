'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminShell } from '@/components/layout/AdminShell';
import { useAdmin } from '@/hooks/useAdmin';
import { auditApi } from '@/lib/api';
import { 
  Search, 
  Filter, 
  RefreshCw,
  Calendar,
  User,
  Building2,
  FileText,
  ChevronDown,
} from 'lucide-react';

interface AuditLog {
  id: string;
  adminUserId: string;
  adminUserEmail?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  resourceName?: string;
  targetOrgId?: string;
  targetOrgName?: string;
  targetUserId?: string;
  targetUserEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export default function AuditLogsPage() {
  const { token } = useAdmin();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'audit', search, actionFilter, page, token],
    queryFn: async () => {
      const params: Record<string, string> = {
        limit: limit.toString(),
        offset: (page * limit).toString(),
      };
      if (search) params.search = search;
      if (actionFilter !== 'all') params.action = actionFilter;

      return await auditApi.list(params);
    },
    enabled: !!token,
  });

  const getActionColor = (action: string) => {
    if (action.includes('create')) return 'text-green-400 bg-green-500/10';
    if (action.includes('delete')) return 'text-red-400 bg-red-500/10';
    if (action.includes('edit') || action.includes('update')) return 'text-primary-400 bg-primary-500/10';
    if (action.includes('disable')) return 'text-yellow-400 bg-yellow-500/10';
    return 'text-primary-400 bg-primary-600/20 border border-primary-600/30';
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/:/g, ' → ');
  };

  return (
    <AdminShell>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
            <p className="text-admin-400 mt-1">
              Track all administrative actions on the platform
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-white text-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-admin-400" />
            <input
              type="text"
              placeholder="Search by admin, organization, user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-admin-800 border border-admin-700 rounded-lg text-white placeholder-admin-400 focus:outline-none focus:border-primary-500"
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-4 py-2.5 bg-admin-800 border border-admin-700 rounded-lg text-admin-300 focus:outline-none focus:border-primary-500"
          >
            <option value="all">All Actions</option>
            <option value="org:create">Org: Create</option>
            <option value="org:edit">Org: Edit</option>
            <option value="org:delete">Org: Delete</option>
            <option value="user:create">User: Create</option>
            <option value="user:edit">User: Edit</option>
            <option value="user:disable">User: Disable</option>
            <option value="user:delete">User: Delete</option>
          </select>
        </div>

        {/* Logs Table */}
        <div className="bg-admin-800 rounded-xl border border-admin-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-admin-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-admin-400 uppercase tracking-wider">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-admin-400 uppercase tracking-wider">Admin</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-admin-400 uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-admin-400 uppercase tracking-wider">Resource</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-admin-400 uppercase tracking-wider">Target</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-admin-400 uppercase tracking-wider">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-admin-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading audit logs...
                  </td>
                </tr>
              ) : data?.logs?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-admin-400">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                data?.logs?.map((log: AuditLog) => (
                  <tr key={log.id} className="hover:bg-admin-700/50">
                    <td className="px-4 py-4 text-admin-400 text-sm whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-admin-500" />
                        <span className="text-white text-sm">{log.adminUserEmail || 'System'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full capitalize ${getActionColor(log.action)}`}>
                        {formatAction(log.action)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="w-4 h-4 text-admin-500" />
                        <span className="text-admin-300">{log.resourceType}</span>
                        {log.resourceName && (
                          <span className="text-admin-500">({log.resourceName})</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      {log.targetOrgName && (
                        <div className="flex items-center gap-1 text-admin-300">
                          <Building2 className="w-3 h-3" />
                          {log.targetOrgName}
                        </div>
                      )}
                      {log.targetUserEmail && (
                        <div className="flex items-center gap-1 text-admin-400">
                          <User className="w-3 h-3" />
                          {log.targetUserEmail}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-admin-500 text-sm">
                      {log.ipAddress || '-'}
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
              Showing {page * limit + 1} to {Math.min((page + 1) * limit, data.total)} of {data.total} logs
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
