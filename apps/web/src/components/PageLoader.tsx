/**
 * PageLoader - Full page loading component
 * Shows a branded loading screen while pages/data are loading
 * Bilingual support (EN/FR)
 */
import { Loader2 } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { ProcessingAnimation, AnalyticsAnimation } from './LottieAnimations';

type LoaderVariant = 'default' | 'analytics' | 'minimal';

interface PageLoaderProps {
  /** Optional custom message to display */
  message?: string;
  /** Optional custom English message */
  messageEn?: string;
  /** Visual variant of the loader */
  variant?: LoaderVariant;
  /** Whether to show full screen overlay */
  fullScreen?: boolean;
  /** Optional className for custom styling */
  className?: string;
}

export default function PageLoader({ 
  message,
  messageEn,
  variant = 'default',
  fullScreen = true,
  className = '',
}: PageLoaderProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  // Default messages
  const defaultMessage = isEn ? 'Loading...' : 'Chargement...';
  const displayMessage = (isEn && messageEn) ? messageEn : (message || defaultMessage);

  const containerClass = fullScreen 
    ? 'fixed inset-0 z-50 flex items-center justify-center'
    : 'flex items-center justify-center min-h-[400px]';

  return (
    <div 
      className={`${containerClass} ${className}`}
      style={{ backgroundColor: 'rgb(var(--color-bg))' }}
    >
      <div className="flex flex-col items-center gap-4 sm:gap-6 p-6 sm:p-8">
        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <div 
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
          >
            <svg 
              viewBox="0 0 24 24" 
              className="w-6 h-6 sm:w-7 sm:h-7"
              style={{ color: 'rgb(var(--color-primary-500))' }}
              fill="currentColor"
            >
              <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.5L19.5 7 12 9.5 4.5 7 12 4.5zM4 9.5l7 3.5v7L4 16.5v-7zm9 10.5v-7l7-3.5v7L13 20z"/>
            </svg>
          </div>
          <span 
            className="text-lg sm:text-xl font-bold tracking-tight"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            PlainLedger
          </span>
        </div>

        {/* Animation based on variant */}
        {variant === 'analytics' ? (
          <div className="w-32 h-24 sm:w-40 sm:h-32">
            <AnalyticsAnimation className="w-full h-full" />
          </div>
        ) : variant === 'minimal' ? (
          <Loader2 
            className="w-8 h-8 sm:w-10 sm:h-10 animate-spin" 
            style={{ color: 'rgb(var(--color-primary-500))' }}
          />
        ) : (
          <div className="w-20 h-20 sm:w-24 sm:h-24">
            <ProcessingAnimation className="w-full h-full" />
          </div>
        )}

        {/* Loading message */}
        <div className="text-center">
          <p 
            className="text-sm sm:text-base font-medium"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {displayMessage}
          </p>
          
          {/* Animated dots */}
          <div className="flex items-center justify-center gap-1 mt-3">
            <span 
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ 
                backgroundColor: 'rgb(var(--color-primary-500))',
                animationDelay: '0ms',
              }}
            />
            <span 
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ 
                backgroundColor: 'rgb(var(--color-primary-500))',
                animationDelay: '150ms',
              }}
            />
            <span 
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ 
                backgroundColor: 'rgb(var(--color-primary-500))',
                animationDelay: '300ms',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ContentLoader - Inline loading component for content sections
 * Use this for loading states within a page (not full page)
 */
export function ContentLoader({ 
  message,
  messageEn,
  className = '',
}: Pick<PageLoaderProps, 'message' | 'messageEn' | 'className'>) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const defaultMessage = isEn ? 'Loading data...' : 'Chargement des données...';
  const displayMessage = (isEn && messageEn) ? messageEn : (message || defaultMessage);

  return (
    <div 
      className={`flex flex-col items-center justify-center py-12 sm:py-16 ${className}`}
    >
      <div className="w-16 h-16 sm:w-20 sm:h-20 mb-4">
        <ProcessingAnimation className="w-full h-full" />
      </div>
      <p 
        className="text-sm sm:text-base font-medium"
        style={{ color: 'rgb(var(--color-text-muted))' }}
      >
        {displayMessage}
      </p>
    </div>
  );
}

/**
 * SkeletonLoader - Skeleton loading state for cards/content blocks
 * Shows a shimmer effect while content is loading
 */
export function SkeletonLoader({ 
  lines = 3,
  className = '',
}: { 
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {/* Header skeleton */}
      <div 
        className="h-5 w-3/4 rounded"
        style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
      />
      
      {/* Content lines skeleton */}
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i}
          className="h-4 rounded"
          style={{ 
            backgroundColor: 'rgb(var(--color-bg-muted))',
            width: `${Math.max(50, 100 - i * 15)}%`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * CardSkeleton - Full card skeleton for dashboard widgets
 */
export function CardSkeleton({ 
  className = '',
  hasChart = false,
}: { 
  className?: string;
  hasChart?: boolean;
}) {
  return (
    <div 
      className={`rounded-xl p-4 sm:p-5 animate-pulse relative overflow-hidden ${className}`}
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        border: '1px solid rgb(var(--color-border))',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div 
          className="w-10 h-10 rounded-lg"
          style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
        />
        <div className="flex-1 space-y-2">
          <div 
            className="h-4 w-1/2 rounded"
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
          />
          <div 
            className="h-3 w-1/3 rounded"
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
          />
        </div>
      </div>
      
      {/* Content */}
      {hasChart ? (
        <div 
          className="h-32 sm:h-40 rounded-lg"
          style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
        />
      ) : (
        <div className="space-y-3">
          <div 
            className="h-8 w-1/3 rounded"
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
          />
          <div 
            className="h-4 w-2/3 rounded"
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
          />
        </div>
      )}
      
      {/* Shimmer effect overlay */}
      <div 
        className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
        style={{
          background: 'linear-gradient(90deg, transparent, rgb(var(--color-bg-muted) / 0.4), transparent)',
        }}
      />
    </div>
  );
}

/**
 * DashboardSkeleton - Full dashboard skeleton for initial page load
 */
export function DashboardSkeleton() {
  const { language } = useI18n();
  const isEn = language === 'en';

  return (
    <div className="space-y-4 sm:space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div 
            className="h-7 sm:h-8 w-40 sm:w-52 rounded-lg"
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
          />
          <div 
            className="h-3 sm:h-4 w-28 sm:w-36 mt-2 rounded"
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
          />
        </div>
        <div className="flex gap-2">
          <div 
            className="h-9 w-28 rounded-lg"
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
          />
          <div 
            className="h-9 w-24 rounded-lg"
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
          />
        </div>
      </div>
      
      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      
      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {[...Array(2)].map((_, i) => (
          <CardSkeleton key={i} hasChart />
        ))}
      </div>
      
      {/* Loading indicator */}
      <div className="flex items-center justify-center py-4">
        <div className="flex items-center gap-3">
          <Loader2 
            className="w-5 h-5 animate-spin" 
            style={{ color: 'rgb(var(--color-primary-500))' }}
          />
          <span 
            className="text-sm font-medium"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn ? 'Loading your dashboard...' : 'Chargement de votre tableau de bord...'}
          </span>
        </div>
      </div>
    </div>
  );
}
