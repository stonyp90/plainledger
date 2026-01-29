/**
 * Data Staleness Warning Component
 * 
 * Displays a warning banner when data hasn't been synced recently.
 * Helps users understand that their data may be outdated.
 */

import { AlertTriangle, RefreshCw, Clock } from 'lucide-react';
import { useI18n } from '../lib/i18n';

export interface DataStalenessWarningProps {
  lastSyncAt: string | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  threshold?: number; // Hours before data is considered stale (default: 24)
}

function getHoursSince(dateString: string | null): number | null {
  if (!dateString) return null;
  const lastSync = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - lastSync.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60));
}

function formatTimeSince(hours: number, isEn: boolean): string {
  if (hours < 1) {
    return isEn ? 'less than an hour ago' : "il y a moins d'une heure";
  } else if (hours < 24) {
    return isEn ? `${hours} hour${hours !== 1 ? 's' : ''} ago` : `il y a ${hours} heure${hours !== 1 ? 's' : ''}`;
  } else {
    const days = Math.floor(hours / 24);
    return isEn ? `${days} day${days !== 1 ? 's' : ''} ago` : `il y a ${days} jour${days !== 1 ? 's' : ''}`;
  }
}

export default function DataStalenessWarning({
  lastSyncAt,
  onRefresh,
  isRefreshing = false,
  threshold = 24,
}: DataStalenessWarningProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const hoursSince = getHoursSince(lastSyncAt);
  
  // Don't show warning if data is recent or we don't know when it was synced
  if (hoursSince === null || hoursSince < threshold) {
    return null;
  }

  const timeSinceText = formatTimeSince(hoursSince, isEn);
  const isVeryStale = hoursSince > 72; // More than 3 days

  return (
    <div 
      className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
        isVeryStale 
          ? 'bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700' 
          : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
      }`}
    >
      <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
        isVeryStale 
          ? 'text-amber-600 dark:text-amber-400' 
          : 'text-yellow-600 dark:text-yellow-400'
      }`} />
      
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${
          isVeryStale 
            ? 'text-amber-800 dark:text-amber-200' 
            : 'text-yellow-800 dark:text-yellow-200'
        }`}>
          {isEn ? 'Data may be outdated' : 'Les données peuvent être obsolètes'}
        </p>
        <p className={`text-xs ${
          isVeryStale 
            ? 'text-amber-700 dark:text-amber-300' 
            : 'text-yellow-700 dark:text-yellow-300'
        }`}>
          <Clock className="w-3 h-3 inline-block mr-1" />
          {isEn ? `Last synced ${timeSinceText}` : `Dernière synchronisation ${timeSinceText}`}
        </p>
      </div>

      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            isVeryStale 
              ? 'text-amber-800 dark:text-amber-200 bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 dark:hover:bg-amber-700' 
              : 'text-yellow-800 dark:text-yellow-200 bg-yellow-200 dark:bg-yellow-800 hover:bg-yellow-300 dark:hover:bg-yellow-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing 
            ? (isEn ? 'Syncing...' : 'Synchronisation...') 
            : (isEn ? 'Sync Now' : 'Synchroniser')
          }
        </button>
      )}
    </div>
  );
}

/**
 * Compact version for use in cards/smaller spaces
 */
export function DataStalenessIndicator({
  lastSyncAt,
  threshold = 24,
}: {
  lastSyncAt: string | null;
  threshold?: number;
}) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const hoursSince = getHoursSince(lastSyncAt);
  
  if (hoursSince === null) {
    return (
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {isEn ? 'Sync status unknown' : 'État de synchronisation inconnu'}
      </span>
    );
  }

  if (hoursSince < threshold) {
    return (
      <span className="text-xs text-green-600 dark:text-green-400">
        <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
        {isEn ? 'Data is current' : 'Données à jour'}
      </span>
    );
  }

  const timeSinceText = formatTimeSince(hoursSince, isEn);
  const isVeryStale = hoursSince > 72;

  return (
    <span className={`text-xs ${
      isVeryStale 
        ? 'text-amber-600 dark:text-amber-400' 
        : 'text-yellow-600 dark:text-yellow-400'
    }`}>
      <AlertTriangle className="w-3 h-3 inline-block mr-1" />
      {isEn ? `Updated ${timeSinceText}` : `Mis à jour ${timeSinceText}`}
    </span>
  );
}
