'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { onboardingApi } from '@/lib/api';
import { useAdmin } from '@/hooks/useAdmin';
import { AdminShell } from '@/components/layout/AdminShell';
import { UserCheck, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

export default function OnboardingPage() {
  const { token } = useAdmin();
  const queryClient = useQueryClient();
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);

  const { data: funnel } = useQuery({
    queryKey: ['admin', 'onboarding', 'funnel', token],
    queryFn: () => onboardingApi.getFunnel(),
    enabled: !!token,
  });

  const { data: trialsData } = useQuery({
    queryKey: ['admin', 'onboarding', 'trials', token],
    queryFn: () => onboardingApi.getTrials(),
    enabled: !!token,
  });

  const { data: atRiskData } = useQuery({
    queryKey: ['admin', 'onboarding', 'at-risk', token],
    queryFn: () => onboardingApi.getAtRisk(),
    enabled: !!token,
  });

  const extendTrialMutation = useMutation({
    mutationFn: ({ orgId, days }: { orgId: string; days: number }) =>
      onboardingApi.extendTrial(orgId, days),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'onboarding'] });
    },
  });

  const convertMutation = useMutation({
    mutationFn: (orgId: string) => onboardingApi.convertOrg(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'onboarding'] });
    },
  });

  const funnelSteps = [
    { label: 'Signups', value: funnel?.signups || 0 },
    { label: 'Connected', value: funnel?.connectedDatasource || 0 },
    { label: 'First Sync', value: funnel?.firstSync || 0 },
    { label: 'Viewed Report', value: funnel?.viewedReport || 0 },
    { label: 'Converted', value: funnel?.converted || 0 },
  ];

  return (
    <AdminShell>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Onboarding Tracker</h1>
          <p className="text-admin-400">Monitor trial conversions and onboarding progress</p>
        </div>

        {/* Conversion Funnel */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Conversion Funnel</h2>
          <div className="bg-admin-800 rounded-lg p-6 border border-admin-700">
            <div className="flex items-end gap-4 h-64">
              {funnelSteps.map((step, index) => {
                const maxValue = Math.max(...funnelSteps.map((s) => s.value));
                const height = maxValue > 0 ? (step.value / maxValue) * 100 : 0;
                return (
                  <div key={step.label} className="flex-1 flex flex-col items-center">
                    <div className="flex-1 w-full flex items-end justify-center">
                      <div
                        className="w-full bg-primary-600 rounded-t transition-all"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <div className="mt-2 text-center">
                      <p className="text-white font-semibold">{step.value}</p>
                      <p className="text-admin-400 text-xs mt-1">{step.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {funnel && (
              <div className="mt-4 pt-4 border-t border-admin-700">
                <p className="text-admin-400 text-sm">
                  Conversion Rate: <span className="text-white font-semibold">{funnel.conversionRate}%</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* At-Risk Trials */}
        {atRiskData && atRiskData.atRisk.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              At-Risk Trials
            </h2>
            <div className="bg-admin-800 rounded-lg border border-admin-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-admin-800/50 border-b border-admin-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Organization</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Days Remaining</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Progress</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {atRiskData.atRisk.map((trial: any) => (
                    <tr key={trial.id} className="border-t border-admin-700">
                      <td className="px-4 py-3 text-white">{trial.name}</td>
                      <td className="px-4 py-3">
                        <span className={trial.daysRemaining < 3 ? 'text-red-400' : 'text-yellow-400'}>
                          {trial.daysRemaining} days
                        </span>
                      </td>
                      <td className="px-4 py-3 text-admin-400">
                        {trial.progressSteps}/{trial.totalSteps} steps
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => extendTrialMutation.mutate({ orgId: trial.id, days: 7 })}
                            className="px-3 py-1 border border-primary-600/40 hover:bg-primary-600/10 hover:border-primary-600/70 rounded text-sm text-primary-400"
                          >
                            Extend 7d
                          </button>
                          <button
                            onClick={() => convertMutation.mutate(trial.id)}
                            className="px-3 py-1 border border-green-600/40 hover:bg-green-600/10 hover:border-green-600/70 rounded text-sm text-green-400"
                          >
                            Convert
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Active Trials */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Active Trials</h2>
          <div className="bg-admin-800 rounded-lg border border-admin-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-admin-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">Organization</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">Days Remaining</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">Progress</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {trialsData?.trials?.map((trial: any) => (
                  <tr key={trial.id} className="border-t border-admin-700 hover:bg-primary-600/10 cursor-pointer"
                      onClick={() => setSelectedOrg(trial.id)}>
                    <td className="px-4 py-3 text-white">{trial.name}</td>
                    <td className="px-4 py-3 text-admin-400">{trial.daysRemaining} days</td>
                    <td className="px-4 py-3 text-admin-400">
                      {trial.progressSteps}/{trial.totalSteps} steps
                    </td>
                    <td className="px-4 py-3 text-admin-400">
                      {trial.lastActivity
                        ? new Date(trial.lastActivity).toLocaleDateString()
                        : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
