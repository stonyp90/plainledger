/**
 * FullScreenChart Component
 * 
 * Full-screen chart display with:
 * - Keyboard shortcuts (Escape to exit, F to toggle)
 * - Presentation mode (hide controls)
 * - Auto-refresh option
 * - Export options
 * 
 * Bilingual support (EN/FR)
 */

import { useEffect, useCallback, useState } from 'react';
import {
  X,
  Minimize2,
  Download,
  Share2,
  RefreshCw,
  Monitor,
  Play,
  Pause,
  Settings,
  ChevronLeft,
  ChevronRight,
  Keyboard,
} from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { CHART_KEYBOARD_SHORTCUTS } from './types';

// =====================================================
// TYPES
// =====================================================

interface FullScreenChartProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  titleEn: string;
  children: React.ReactNode;
  onShare?: () => void;
  onDownload?: (format: 'png' | 'pdf' | 'csv') => void;
  onRefresh?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  autoRefreshEnabled?: boolean;
  autoRefreshInterval?: number; // seconds
  onAutoRefreshToggle?: (enabled: boolean) => void;
}

// =====================================================
// KEYBOARD SHORTCUTS MODAL
// =====================================================

function KeyboardShortcutsModal({
  isOpen,
  onClose,
  isEn,
}: {
  isOpen: boolean;
  onClose: () => void;
  isEn: boolean;
}) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Esc', label: isEn ? 'Exit full screen' : 'Quitter le plein écran' },
    { key: 'F', label: isEn ? 'Toggle full screen' : 'Basculer plein écran' },
    { key: 'S', label: isEn ? 'Share chart' : 'Partager le graphique' },
    { key: 'D', label: isEn ? 'Download chart' : 'Télécharger le graphique' },
    { key: 'R', label: isEn ? 'Refresh data' : 'Actualiser les données' },
    { key: '←', label: isEn ? 'Previous chart' : 'Graphique précédent' },
    { key: '→', label: isEn ? 'Next chart' : 'Graphique suivant' },
    { key: 'L', label: isEn ? 'Toggle legend' : 'Basculer la légende' },
    { key: 'G', label: isEn ? 'Toggle grid' : 'Basculer la grille' },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      />
      <div
        className="relative rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in"
        style={{
          backgroundColor: 'rgb(var(--color-surface))',
          border: '1px solid rgb(var(--color-border))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-lg font-semibold"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'Keyboard Shortcuts' : 'Raccourcis clavier'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.key}
              className="flex items-center justify-between py-1.5"
            >
              <span
                className="text-sm"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {shortcut.label}
              </span>
              <kbd
                className="px-2 py-1 text-xs font-mono rounded"
                style={{
                  backgroundColor: 'rgb(var(--color-bg-muted))',
                  border: '1px solid rgb(var(--color-border))',
                  color: 'rgb(var(--color-text))',
                }}
              >
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function FullScreenChart({
  isOpen,
  onClose,
  title,
  titleEn,
  children,
  onShare,
  onDownload,
  onRefresh,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  autoRefreshEnabled = false,
  autoRefreshInterval = 30,
  onAutoRefreshToggle,
}: FullScreenChartProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [showControls, setShowControls] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-refresh effect
  useEffect(() => {
    if (!isOpen || !autoRefreshEnabled || !onRefresh) return;

    const interval = setInterval(() => {
      onRefresh();
    }, autoRefreshInterval * 1000);

    return () => clearInterval(interval);
  }, [isOpen, autoRefreshEnabled, autoRefreshInterval, onRefresh]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case CHART_KEYBOARD_SHORTCUTS.escape:
          onClose();
          break;
        case CHART_KEYBOARD_SHORTCUTS.share:
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            onShare?.();
          }
          break;
        case CHART_KEYBOARD_SHORTCUTS.download:
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            onDownload?.('png');
          }
          break;
        case CHART_KEYBOARD_SHORTCUTS.refresh:
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            handleRefresh();
          }
          break;
        case CHART_KEYBOARD_SHORTCUTS.prevChart:
          e.preventDefault();
          onPrevious?.();
          break;
        case CHART_KEYBOARD_SHORTCUTS.nextChart:
          e.preventDefault();
          onNext?.();
          break;
        case 'h':
          // Hide/show controls for presentation mode
          setShowControls((prev) => !prev);
          break;
        case '?':
          setShowShortcuts(true);
          break;
      }
    },
    [isOpen, onClose, onShare, onDownload, onPrevious, onNext]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ 
        backgroundColor: 'rgb(var(--color-bg))',
        zIndex: 9997, // Below toasts (9998) but above everything else
      }}
    >
      {/* Header */}
      {showControls && (
        <div
          className="flex items-center justify-between px-4 py-3 border-b shrink-0"
          style={{
            backgroundColor: 'rgb(var(--color-surface))',
            borderColor: 'rgb(var(--color-border))',
          }}
        >
          {/* Left: Navigation & Title */}
          <div className="flex items-center gap-3">
            {hasPrevious && (
              <button
                onClick={onPrevious}
                className="p-2 rounded-lg hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
                style={{ color: 'rgb(var(--color-text-muted))' }}
                title={isEn ? 'Previous chart (←)' : 'Graphique précédent (←)'}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <div>
              <h1
                className="text-lg font-semibold"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? titleEn : title}
              </h1>
              {autoRefreshEnabled && (
                <span
                  className="text-xs flex items-center gap-1"
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                >
                  <RefreshCw className="w-3 h-3" />
                  {isEn
                    ? `Auto-refresh: ${autoRefreshInterval}s`
                    : `Actualisation auto: ${autoRefreshInterval}s`}
                </span>
              )}
            </div>

            {hasNext && (
              <button
                onClick={onNext}
                className="p-2 rounded-lg hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
                style={{ color: 'rgb(var(--color-text-muted))' }}
                title={isEn ? 'Next chart (→)' : 'Graphique suivant (→)'}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Auto-refresh toggle */}
            {onAutoRefreshToggle && (
              <button
                onClick={() => onAutoRefreshToggle(!autoRefreshEnabled)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: autoRefreshEnabled
                    ? 'rgb(var(--color-primary-500) / 0.1)'
                    : 'rgb(var(--color-bg-muted))',
                  color: autoRefreshEnabled
                    ? 'rgb(var(--color-primary-500))'
                    : 'rgb(var(--color-text-muted))',
                }}
              >
                {autoRefreshEnabled ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {isEn ? 'Auto-refresh' : 'Auto-actualiser'}
                </span>
              </button>
            )}

            {/* Refresh button */}
            {onRefresh && (
              <button
                onClick={handleRefresh}
                className="p-2 rounded-lg hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
                style={{ color: 'rgb(var(--color-text-muted))' }}
                title={isEn ? 'Refresh (R)' : 'Actualiser (R)'}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
                />
              </button>
            )}

            {/* Share button */}
            {onShare && (
              <button
                onClick={onShare}
                className="p-2 rounded-lg hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
                style={{ color: 'rgb(var(--color-text-muted))' }}
                title={isEn ? 'Share (S)' : 'Partager (S)'}
              >
                <Share2 className="w-5 h-5" />
              </button>
            )}

            {/* Download button */}
            {onDownload && (
              <button
                onClick={() => onDownload('png')}
                className="p-2 rounded-lg hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
                style={{ color: 'rgb(var(--color-text-muted))' }}
                title={isEn ? 'Download (D)' : 'Télécharger (D)'}
              >
                <Download className="w-5 h-5" />
              </button>
            )}

            {/* Keyboard shortcuts */}
            <button
              onClick={() => setShowShortcuts(true)}
              className="p-2 rounded-lg hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
              style={{ color: 'rgb(var(--color-text-muted))' }}
              title={isEn ? 'Keyboard shortcuts (?)' : 'Raccourcis clavier (?)'}
            >
              <Keyboard className="w-5 h-5" />
            </button>

            {/* Presentation mode */}
            <button
              onClick={() => setShowControls(false)}
              className="p-2 rounded-lg hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
              style={{ color: 'rgb(var(--color-text-muted))' }}
              title={isEn ? 'Presentation mode (H)' : 'Mode présentation (H)'}
            >
              <Monitor className="w-5 h-5" />
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
              style={{ color: 'rgb(var(--color-text-muted))' }}
              title={isEn ? 'Exit full screen (Esc)' : 'Quitter plein écran (Esc)'}
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Chart Content */}
      <div className="flex-1 p-4 overflow-auto">
        {children}
      </div>

      {/* Hidden controls indicator */}
      {!showControls && (
        <button
          onClick={() => setShowControls(true)}
          className="fixed top-4 right-4 p-2 rounded-lg shadow-lg opacity-50 hover:opacity-100 transition-opacity"
          style={{
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))',
            color: 'rgb(var(--color-text-muted))',
          }}
          title={isEn ? 'Show controls (H)' : 'Afficher contrôles (H)'}
        >
          <Settings className="w-5 h-5" />
        </button>
      )}

      {/* Keyboard shortcuts modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        isEn={isEn}
      />
    </div>
  );
}
