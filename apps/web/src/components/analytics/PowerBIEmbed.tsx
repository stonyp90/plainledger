import React, { useEffect, useRef, useState } from 'react';
import * as powerbi from 'powerbi-client';
import { Loader2, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';

interface PowerBIEmbedProps {
  reportId: string;
  organizationId: string;
  businessUnitId?: string;
  className?: string;
  onError?: (error: Error) => void;
}

export function PowerBIEmbed({
  reportId,
  organizationId,
  businessUnitId,
  className = '',
  onError,
}: PowerBIEmbedProps) {
  const embedContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reportRef = useRef<powerbi.Report | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadReport = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get embed configuration from backend
        const response = await api.post('/analytics/embed', {
          reportId,
          businessUnitId,
        });

        const embedConfig = response.data;

        if (!embedContainerRef.current) {
          return;
        }

        // Get Power BI theme
        const themeResponse = await api.get(`/analytics/theme?organizationId=${organizationId}`);
        const themeData = themeResponse.data;
        
        // Power BI expects theme as a JSON string, not an object
        const themeJson = typeof themeData === 'string' ? themeData : JSON.stringify(themeData);

        // Create embed configuration
        const config: powerbi.IEmbedConfiguration = {
          type: 'report',
          id: embedConfig.reportId,
          embedUrl: embedConfig.embedUrl,
          accessToken: embedConfig.accessToken,
          tokenType: powerbi.models.TokenType.Embed,
          settings: {
            panes: {
              filters: {
                expanded: false,
                visible: false,
              },
              pageNavigation: {
                visible: false,
              },
            },
            background: powerbi.models.BackgroundType.Transparent,
            layoutType: powerbi.models.LayoutType.Custom,
          },
          theme: themeJson,
        };

        // Embed the report
        const report = powerbi.embed(embedContainerRef.current, config) as powerbi.Report;
        reportRef.current = report;

        // Handle report loaded event
        report.on('loaded', () => {
          if (mounted) {
            setIsLoading(false);
          }
        });

        // Handle errors
        report.on('error', (event: any) => {
          const errorMessage = event.detail?.message || 'Failed to load Power BI report';
          setError(errorMessage);
          setIsLoading(false);
          if (onError) {
            onError(new Error(errorMessage));
          }
        });

      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || 'Failed to load report';
        setError(errorMessage);
        setIsLoading(false);
        if (onError) {
          onError(new Error(errorMessage));
        }
      }
    };

    loadReport();

    // Cleanup
    return () => {
      mounted = false;
      if (reportRef.current) {
        try {
          reportRef.current.off('loaded');
          reportRef.current.off('error');
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [reportId, organizationId, businessUnitId, onError]);

  if (error) {
    return (
      <div className={`flex items-center justify-center p-8 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 font-medium">Failed to load report</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}
      <div
        ref={embedContainerRef}
        className="w-full h-full min-h-[600px]"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
