'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communicationsApi } from '@/lib/api';
import { AdminShell } from '@/components/layout/AdminShell';
import { Mail, Send, FileText, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export default function CommunicationsPage() {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);

  const { data: templatesData } = useQuery({
    queryKey: ['admin', 'communications', 'templates'],
    queryFn: () => communicationsApi.listTemplates(),
  });

  const { data: campaignsData } = useQuery({
    queryKey: ['admin', 'communications', 'campaigns'],
    queryFn: () => communicationsApi.listCampaigns(),
  });

  const { data: logsData } = useQuery({
    queryKey: ['admin', 'communications', 'logs'],
    queryFn: () => communicationsApi.getLogs({ limit: '50' }),
  });

  const previewMutation = useMutation({
    mutationFn: (name: string) => communicationsApi.previewTemplate(name),
    onSuccess: (data) => {
      setPreviewContent(data.preview);
    },
  });

  return (
    <AdminShell>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Communication Center</h1>
          <p className="text-admin-400">Manage email templates and send communications</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Templates */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-white mb-4">Email Templates</h2>
            <div className="bg-admin-800 rounded-lg border border-admin-700 overflow-hidden">
              <div className="divide-y divide-admin-700">
                {templatesData?.templates?.map((template: any) => (
                  <div
                    key={template.name}
                    className="p-4 hover:bg-admin-700 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedTemplate(template.name);
                      previewMutation.mutate(template.name);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">{template.name}</h3>
                        <p className="text-admin-400 text-sm mt-1">{template.subject}</p>
                        <p className="text-admin-500 text-xs mt-2 line-clamp-2">
                          {template.preview}
                        </p>
                      </div>
                      <FileText className="w-5 h-5 text-admin-400 ml-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Preview</h2>
            {previewContent ? (
              <div className="bg-admin-800 rounded-lg border border-admin-700 p-4">
                <div
                  className="prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: previewContent }}
                />
              </div>
            ) : (
              <div className="bg-admin-800 rounded-lg border border-admin-700 p-8 text-center">
                <Mail className="w-12 h-12 text-admin-600 mx-auto mb-4" />
                <p className="text-admin-400">Select a template to preview</p>
              </div>
            )}
          </div>
        </div>

        {/* Campaigns */}
        <div className="mt-6">
          <h2 className="text-xl font-semibold text-white mb-4">Recent Campaigns</h2>
          <div className="bg-admin-800 rounded-lg border border-admin-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-admin-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">Campaign</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">Recipients</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">Sent</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">Delivered</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">Failed</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">Date</th>
                </tr>
              </thead>
              <tbody>
                {campaignsData?.campaigns?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-admin-400">
                      No campaigns yet
                    </td>
                  </tr>
                ) : (
                  campaignsData?.campaigns?.map((campaign: any) => (
                    <tr key={campaign.id} className="border-t border-admin-700">
                      <td className="px-4 py-3 text-white">{campaign.name}</td>
                      <td className="px-4 py-3 text-admin-400">{campaign.recipientCount}</td>
                      <td className="px-4 py-3 text-admin-400">{campaign.sentCount}</td>
                      <td className="px-4 py-3 text-green-400">{campaign.deliveredCount}</td>
                      <td className="px-4 py-3 text-red-400">{campaign.failedCount}</td>
                      <td className="px-4 py-3 text-admin-400">
                        {campaign.createdAt
                          ? new Date(campaign.createdAt).toLocaleDateString()
                          : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
