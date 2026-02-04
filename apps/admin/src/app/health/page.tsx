'use client';

import { useQuery } from '@tanstack/react-query';
import { healthApi } from '@/lib/api';
import { AdminShell } from '@/components/layout/AdminShell';
import { Activity, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

export default function HealthPage() {
  const { data: overallHealth, isLoading: loadingOverall } = useQuery({
    queryKey: ['admin', 'health', 'overall'],
    queryFn: () => healthApi.getOverall(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: servicesData, isLoading: loadingServices } = useQuery({
    queryKey: ['admin', 'health', 'services'],
    queryFn: () => healthApi.getServices(),
    refetchInterval: 30000,
  });

  const { data: syncStats } = useQuery({
    queryKey: ['admin', 'health', 'sync-stats'],
    queryFn: () => healthApi.getSyncStats(),
    refetchInterval: 60000, // Refresh every minute
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-400';
      case 'degraded':
        return 'text-yellow-400';
      case 'unhealthy':
        return 'text-red-400';
      default:
        return 'text-admin-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case 'degraded':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case 'unhealthy':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Activity className="w-5 h-5 text-admin-400" />;
    }
  };

  return (
    <AdminShell>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">System Health</h1>
          <p className="text-admin-400">Monitor system services and infrastructure</p>
        </div>

        {/* Overall Status */}
        {overallHealth && (
          <div className="mb-6">
            <div className="bg-admin-800 rounded-lg p-6 border border-admin-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Overall Status</h2>
                {getStatusIcon(overallHealth.status)}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-admin-400 text-sm">Status</p>
                  <p className={`text-lg font-semibold ${getStatusColor(overallHealth.status)}`}>
                    {overallHealth.status.toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-admin-400 text-sm">Degraded Services</p>
                  <p className="text-lg font-semibold text-yellow-400">
                    {overallHealth.degradedCount || 0}
                  </p>
                </div>
                <div>
                  <p className="text-admin-400 text-sm">Unhealthy Services</p>
                  <p className="text-lg font-semibold text-red-400">
                    {overallHealth.unhealthyCount || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Services */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Services</h2>
          {loadingServices ? (
            <div className="text-admin-400">Loading services...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {servicesData?.services?.map((service: any) => (
                <div
                  key={service.name}
                  className="bg-admin-800 rounded-lg p-4 border border-admin-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white">{service.name}</h3>
                    {getStatusIcon(service.status)}
                  </div>
                  <div className="text-sm text-admin-400">
                    <p>Latency: {service.latencyMs}ms</p>
                    {service.error && (
                      <p className="text-red-400 mt-1">{service.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sync Jobs */}
        {syncStats && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Sync Jobs (Last 24h)</h2>
            <div className="bg-admin-800 rounded-lg p-6 border border-admin-700">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-admin-400 text-sm">Total</p>
                  <p className="text-2xl font-bold text-white">{syncStats.total24h || 0}</p>
                </div>
                <div>
                  <p className="text-admin-400 text-sm">Completed</p>
                  <p className="text-2xl font-bold text-green-400">{syncStats.completed || 0}</p>
                </div>
                <div>
                  <p className="text-admin-400 text-sm">Failed</p>
                  <p className="text-2xl font-bold text-red-400">{syncStats.failed || 0}</p>
                </div>
                <div>
                  <p className="text-admin-400 text-sm">Running</p>
                  <p className="text-2xl font-bold text-blue-400">{syncStats.running || 0}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
