/**
 * ChartErrorBoundary - Isolates chart rendering failures
 * 
 * Catches errors in chart components and displays a user-friendly
 * error message with retry functionality.
 * 
 * Features:
 * - Bilingual error messages (EN/FR)
 * - Retry mechanism
 * - Error logging
 * - Brand-compliant styling
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  chartName?: string;
  chartNameEn?: string;
  isEn?: boolean;
  onRetry?: () => void;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  fallbackMinHeight?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class ChartErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error for debugging
    console.error('[ChartErrorBoundary] Chart rendering error:', {
      chartName: this.props.chartName,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Call optional error callback (for analytics/monitoring)
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    const { retryCount } = this.state;
    
    if (retryCount >= this.maxRetries) {
      console.warn('[ChartErrorBoundary] Max retries reached for:', this.props.chartName);
      return;
    }

    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: retryCount + 1,
    });
    
    this.props.onRetry?.();
  };

  resetError = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0,
    });
  };

  render() {
    const { hasError, error, retryCount } = this.state;
    const { 
      children, 
      chartName, 
      chartNameEn, 
      isEn = true, 
      fallbackMinHeight = '200px' 
    } = this.props;

    if (hasError) {
      const displayName = isEn ? (chartNameEn || chartName || 'this chart') : (chartName || 'ce graphique');
      const canRetry = retryCount < this.maxRetries;

      return (
        <div 
          className="flex flex-col items-center justify-center p-6 rounded-xl"
          style={{ 
            minHeight: fallbackMinHeight,
            backgroundColor: 'rgb(var(--color-error) / 0.05)',
            border: '2px dashed rgb(var(--color-error) / 0.3)',
          }}
        >
          {/* Error Icon */}
          <div 
            className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: 'rgb(var(--color-error) / 0.1)' }}
          >
            <AlertTriangle 
              className="w-7 h-7" 
              style={{ color: 'rgb(var(--color-error))' }} 
            />
          </div>

          {/* Error Title */}
          <h3 
            className="text-lg font-semibold mb-2"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'Chart Error' : 'Erreur du graphique'}
          </h3>

          {/* Error Description */}
          <p 
            className="text-sm text-center mb-4 max-w-xs"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn 
              ? `Unable to render ${displayName}. This may be due to invalid data or a temporary issue.`
              : `Impossible d'afficher ${displayName}. Cela peut être dû à des données invalides ou un problème temporaire.`}
          </p>

          {/* Error Details (Development Only) */}
          {process.env.NODE_ENV === 'development' && error && (
            <details className="mb-4 w-full max-w-md">
              <summary 
                className="text-xs cursor-pointer flex items-center gap-1 justify-center"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                <Bug className="w-3 h-3" />
                {isEn ? 'Technical Details' : 'Détails techniques'}
              </summary>
              <pre 
                className="mt-2 p-3 text-xs overflow-auto rounded-lg max-h-32"
                style={{ 
                  backgroundColor: 'rgb(var(--color-surface))',
                  color: 'rgb(var(--color-error))',
                  border: '1px solid rgb(var(--color-border))',
                }}
              >
                {error.message}
              </pre>
            </details>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {canRetry && (
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all"
                style={{
                  backgroundColor: 'rgb(var(--color-primary-500))',
                  color: 'white',
                }}
              >
                <RefreshCw className="w-4 h-4" />
                {isEn ? 'Try Again' : 'Réessayer'}
                {retryCount > 0 && (
                  <span className="text-xs opacity-75">
                    ({retryCount}/{this.maxRetries})
                  </span>
                )}
              </button>
            )}

            {!canRetry && (
              <p 
                className="text-sm"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {isEn 
                  ? 'Please refresh the page or contact support if the issue persists.'
                  : 'Veuillez rafraîchir la page ou contacter le support si le problème persiste.'}
              </p>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}

/**
 * Hook to wrap chart components with error boundary
 * Usage: const WrappedChart = withChartErrorBoundary(MyChart, 'My Chart');
 */
export function withChartErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  chartName?: string,
  chartNameEn?: string,
) {
  return function WithErrorBoundary(props: P & { isEn?: boolean; onRetry?: () => void }) {
    const { isEn, onRetry, ...componentProps } = props;
    
    return (
      <ChartErrorBoundary 
        chartName={chartName} 
        chartNameEn={chartNameEn}
        isEn={isEn}
        onRetry={onRetry}
      >
        <WrappedComponent {...(componentProps as P)} />
      </ChartErrorBoundary>
    );
  };
}

export default ChartErrorBoundary;
