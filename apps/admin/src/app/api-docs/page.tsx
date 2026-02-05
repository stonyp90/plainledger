'use client';

import { AdminShell } from '@/components/layout/AdminShell';
import { 
  Code2,
  ExternalLink,
  Copy,
  Shield,
  Database,
  FileJson,
  CheckCircle,
} from 'lucide-react';
import { useState } from 'react';

export default function APIDocsPage() {
  const [copied, setCopied] = useState(false);
  const swaggerUrl = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/docs`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(swaggerUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const endpoints = [
    { name: 'Organizations', description: 'Manage tenant organizations' },
    { name: 'Users', description: 'User management and permissions' },
    { name: 'Financial Reports', description: 'Generate and retrieve reports' },
    { name: 'Data Sync', description: 'Trigger and monitor data synchronization' },
    { name: 'Health', description: 'System health checks and status' },
    { name: 'Analytics', description: 'Business intelligence and metrics' },
  ];

  return (
    <AdminShell>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">API Documentation</h1>
          <p className="text-admin-400 mt-1">
            Interactive API documentation powered by Swagger/OpenAPI
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Swagger Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-admin-800 rounded-xl p-6 border border-admin-700">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center">
                    <Code2 className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Swagger UI</h2>
                    <p className="text-sm text-admin-400">
                      Explore and test all available API endpoints
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-admin-900 rounded-lg border border-admin-700 mb-4">
                <FileJson className="w-4 h-4 text-admin-400" />
                <code className="text-sm text-admin-300 flex-1 overflow-x-auto">
                  {swaggerUrl}
                </code>
              </div>

              <div className="flex gap-3">
                <a
                  href={swaggerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-medium transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Swagger UI
                </a>
                <button
                  onClick={handleCopyUrl}
                  className="flex items-center gap-2 px-4 py-2.5 bg-admin-700 hover:bg-admin-600 rounded-lg text-white text-sm font-medium transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy URL
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Authentication Card */}
            <div className="bg-admin-800 rounded-xl p-6 border border-admin-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-yellow-600/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Authentication</h3>
                  <p className="text-sm text-admin-400">Bearer token authentication</p>
                </div>
              </div>

              <p className="text-sm text-admin-400 mb-4">
                The API uses Bearer token authentication. Use the &quot;Authorize&quot; button in Swagger UI to authenticate with your access token.
              </p>

              <div className="p-3 bg-admin-900 rounded-lg border border-admin-700 font-mono text-sm text-admin-300">
                Authorization: Bearer {'<token>'}
              </div>
            </div>
          </div>

          {/* Sidebar - Endpoints Overview */}
          <div className="space-y-6">
            <div className="bg-admin-800 rounded-xl p-6 border border-admin-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                  <Database className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">API Endpoints</h3>
                  <p className="text-sm text-admin-400">Available resources</p>
                </div>
              </div>

              <ul className="space-y-3">
                {endpoints.map((endpoint) => (
                  <li key={endpoint.name} className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></span>
                    <div>
                      <p className="text-sm font-medium text-white">{endpoint.name}</p>
                      <p className="text-xs text-admin-500">{endpoint.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Tips */}
            <div className="bg-admin-800 rounded-xl p-6 border border-admin-700">
              <h3 className="font-semibold text-white mb-4">Quick Tips</h3>
              <ul className="space-y-3 text-sm text-admin-400">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span>Use &quot;Try it out&quot; in Swagger UI to test endpoints directly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span>All requests require a valid JWT token in the Authorization header</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span>Response schemas are documented for each endpoint</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span>Download the OpenAPI spec from /api/docs-json</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
