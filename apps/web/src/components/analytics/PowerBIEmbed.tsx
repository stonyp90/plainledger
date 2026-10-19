import { useEffect, useRef, useState } from 'react';
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
interface EmbedResponse { reportId: string; embedUrl: string; accessToken: string }
let serviceInstance: powerbi.service.Service | undefined;
function getEmbedService() {
  return serviceInstance ??= new powerbi.service.Service(
    powerbi.factories.hpmFactory, powerbi.factories.wpmpFactory, powerbi.factories.routerFactory,
  );
}

export function PowerBIEmbed({ reportId, organizationId, businessUnitId, className = '', onError }: PowerBIEmbedProps) {
  const embedContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    let mounted = true;
    let report: powerbi.Embed | undefined;
    const container = embedContainerRef.current;
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const fail = (reason: unknown) => {
      if (!mounted) return;
      const message = reason instanceof Error ? reason.message : 'Failed to load Power BI report.';
      if (timeout) clearTimeout(timeout);
      setError(message);
      setIsLoading(false);
      onErrorRef.current?.(new Error(message));
    };
    setError(null);
    setIsLoading(Boolean(reportId && organizationId));
    if (!reportId || !organizationId || !container) return;

    const load = async () => {
      try {
        const [response, themeResponse] = await Promise.all([
          api.post<EmbedResponse>('/analytics/embed', { reportId, businessUnitId }, { signal: controller.signal }),
          api.get<Record<string, unknown> | string>(`/analytics/theme?organizationId=${encodeURIComponent(organizationId)}`, { signal: controller.signal }),
        ]);
        if (!mounted) return;
        const credentials = response.data;
        if (!credentials?.reportId || !credentials.embedUrl || !credentials.accessToken) {
          throw new Error('The server did not return a valid report configuration.');
        }
        const theme = typeof themeResponse.data === 'string' ? JSON.parse(themeResponse.data) : themeResponse.data;
        if (!theme || typeof theme !== 'object' || Array.isArray(theme)) throw new Error('The report theme is invalid.');
        const configuration: powerbi.IEmbedConfiguration = {
          type: 'report', id: credentials.reportId, embedUrl: credentials.embedUrl,
          accessToken: credentials.accessToken, tokenType: powerbi.models.TokenType.Embed,
          settings: {
            panes: { filters: { expanded: false, visible: false }, pageNavigation: { visible: false } },
            background: powerbi.models.BackgroundType.Transparent,
          },
          theme: { themeJson: theme },
        };
        report = getEmbedService().embed(container, configuration);
        report.on('loaded', () => {
          if (!mounted) return;
          if (timeout) clearTimeout(timeout);
          setIsLoading(false);
        });
        report.on('error', event => {
          const detail = event?.detail as { message?: string } | undefined;
          fail(new Error(detail?.message || 'Failed to load Power BI report.'));
        });
        timeout = setTimeout(() => fail(new Error('The report did not finish loading. Please retry.')), 30_000);
      } catch (reason) {
        if (!controller.signal.aborted) fail(reason);
      }
    };
    void load();
    return () => {
      mounted = false;
      controller.abort();
      if (timeout) clearTimeout(timeout);
      if (report) {
        report.off('loaded');
        report.off('error');
        getEmbedService().reset(container);
      }
    };
  }, [reportId, organizationId, businessUnitId, attempt]);

  return <div className={`relative min-w-0 ${className}`}>
    {!reportId || !organizationId ? <p role="status" className="p-6">Select a report and organization to view analytics.</p> : null}
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
      <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-500" />
      <p className="font-medium text-red-700">Failed to load report</p><p className="mt-1 text-sm text-red-600">{error}</p>
      <button className="btn-secondary mt-3" onClick={() => setAttempt(value => value + 1)}>Retry</button>
    </div>}
    {isLoading && <div role="status" aria-label="Loading report" className="absolute inset-0 z-10 flex items-center justify-center bg-white/75"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>}
    <div ref={embedContainerRef} className={`w-full min-h-[400px] h-full ${error || !reportId || !organizationId ? 'hidden' : ''}`} />
  </div>;
}
