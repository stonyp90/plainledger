'use client';

import { AdminShell } from '@/components/layout/AdminShell';
import { 
  Code2,
  ExternalLink,
  Copy,
  Shield,
  Maximize2,
  Minimize2,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { useState } from 'react';

export default function APIDocsPage() {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const swaggerUrl = `${process.env.NEXT_PUBLIC_API_URL || 'https://plainledger.ca'}/api/docs`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(swaggerUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const handleRefresh = () => {
    setIframeKey(prev => prev + 1);
  };

  return (
    <AdminShell>
      <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-admin-900' : 'p-6'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between mb-4 ${isFullscreen ? 'p-4 bg-admin-800 border-b border-admin-700' : ''}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600/20 rounded-lg flex items-center justify-center">
              <Code2 className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">API Documentation</h1>
              <p className="text-sm text-admin-400">
                Interactive Swagger UI
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-3 py-2 bg-admin-800/50 border border-admin-700/50 hover:bg-primary-600/20 hover:text-primary-400 rounded-lg text-admin-300 text-sm transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleCopyUrl}
              className="flex items-center gap-2 px-3 py-2 bg-admin-800/50 border border-admin-700/50 hover:bg-primary-600/20 hover:text-primary-400 rounded-lg text-admin-300 text-sm transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="hidden sm:inline">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">Copy URL</span>
                </>
              )}
            </button>
            <a
              href={swaggerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-admin-800/50 border border-admin-700/50 hover:bg-primary-600/20 hover:text-primary-400 rounded-lg text-admin-300 text-sm transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">New Tab</span>
            </a>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="flex items-center gap-2 px-3 py-2 border border-primary-600/40 hover:bg-primary-600/10 hover:border-primary-600/70 rounded-lg text-primary-400 text-sm transition-colors"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Fullscreen</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Embedded Swagger UI */}
        <div className={`bg-white rounded-xl overflow-hidden border border-admin-700 ${isFullscreen ? 'h-[calc(100vh-80px)]' : 'h-[calc(100vh-200px)] min-h-[600px]'}`}>
          <iframe
            key={iframeKey}
            src={swaggerUrl}
            className="w-full h-full"
            title="API Documentation - Swagger UI"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          />
        </div>

        {/* Authentication hint - only show when not fullscreen */}
        {!isFullscreen && (
          <div className="mt-4 flex items-center gap-3 p-3 bg-admin-800 rounded-lg border border-admin-700">
            <Shield className="w-5 h-5 text-accent-400 flex-shrink-0" />
            <p className="text-sm text-admin-400">
              <span className="text-white font-medium">Tip:</span> Use the &quot;Authorize&quot; button in Swagger UI to authenticate with your Bearer token.
            </p>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
