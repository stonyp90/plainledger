/**
 * Enterprise Timeline Header Component
 * 
 * Professional timeline header with zoom controls, navigation, and today marker
 */

import { useMemo, useRef, useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Calendar,
  Target,
  Home,
} from 'lucide-react';
import { useI18n } from '../../lib/i18n';

export type ViewMode = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface Period {
  start: Date;
  end: Date;
  label: string;
  sublabel?: string;
  isToday: boolean;
  isCurrentPeriod: boolean;
  width: number; // percentage
}

export interface EnterpriseTimelineHeaderProps {
  startDate: Date;
  endDate: Date;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onNavigate: (direction: 'prev' | 'next' | 'today') => void;
  onDateClick?: (date: Date) => void;
  showZoomControls?: boolean;
  sticky?: boolean;
}

const VIEW_MODE_CONFIG: Record<ViewMode, { labelEn: string; label: string; months: number }> = {
  day: { labelEn: 'Day', label: 'Jour', months: 1 },
  week: { labelEn: 'Week', label: 'Semaine', months: 2 },
  month: { labelEn: 'Month', label: 'Mois', months: 12 },
  quarter: { labelEn: 'Quarter', label: 'Trimestre', months: 24 },
  year: { labelEn: 'Year', label: 'Année', months: 60 },
};

export default function EnterpriseTimelineHeader({
  startDate,
  endDate,
  viewMode,
  onViewModeChange,
  onNavigate,
  onDateClick,
  showZoomControls = true,
  sticky = true,
}: EnterpriseTimelineHeaderProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const headerRef = useRef<HTMLDivElement>(null);
  const [hoveredPeriod, setHoveredPeriod] = useState<number | null>(null);

  // Generate periods based on view mode
  const periods = useMemo((): Period[] => {
    const result: Period[] = [];
    const current = new Date(startDate);
    const now = new Date();
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    while (current <= endDate) {
      const periodStart = new Date(current);
      let periodEnd: Date;
      let label: string;
      let sublabel: string | undefined;

      switch (viewMode) {
        case 'day':
          periodEnd = new Date(current);
          label = current.getDate().toString();
          sublabel = current.toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { weekday: 'short' });
          current.setDate(current.getDate() + 1);
          break;

        case 'week': {
          periodEnd = new Date(current);
          periodEnd.setDate(periodEnd.getDate() + 6);
          const weekNum = Math.ceil(((current.getTime() - new Date(current.getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24) + 1) / 7);
          label = `W${weekNum}`;
          sublabel = current.toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { month: 'short' });
          current.setDate(current.getDate() + 7);
          break;
        }

        case 'month':
          periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
          label = current.toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { month: 'short' });
          if (current.getMonth() === 0 || result.length === 0) {
            sublabel = `'${String(current.getFullYear()).slice(2)}`;
          }
          current.setMonth(current.getMonth() + 1);
          break;

        case 'quarter': {
          const quarter = Math.floor(current.getMonth() / 3);
          periodEnd = new Date(current.getFullYear(), (quarter + 1) * 3, 0);
          label = `Q${quarter + 1}`;
          sublabel = current.getFullYear().toString();
          current.setMonth((quarter + 1) * 3);
          break;
        }

        case 'year':
          periodEnd = new Date(current.getFullYear(), 11, 31);
          label = current.getFullYear().toString();
          current.setFullYear(current.getFullYear() + 1);
          break;

        default:
          periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
          label = current.toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { month: 'short' });
          current.setMonth(current.getMonth() + 1);
      }

      const isToday = now >= periodStart && now <= periodEnd;
      const isCurrentPeriod = now.getMonth() === periodStart.getMonth() && 
                              now.getFullYear() === periodStart.getFullYear();

      // Calculate width as percentage
      const periodDays = Math.ceil((Math.min(periodEnd.getTime(), endDate.getTime()) - 
                                    Math.max(periodStart.getTime(), startDate.getTime())) / 
                                   (1000 * 60 * 60 * 24)) + 1;
      const width = (periodDays / totalDays) * 100;

      result.push({
        start: periodStart,
        end: periodEnd,
        label,
        sublabel,
        isToday,
        isCurrentPeriod,
        width: Math.max(width, 2), // minimum 2% width
      });
    }

    return result;
  }, [startDate, endDate, viewMode, isEn]);

  // Calculate today marker position
  const todayPosition = useMemo(() => {
    const now = new Date();
    if (now < startDate || now > endDate) return null;
    
    const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const daysFromStart = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    return (daysFromStart / totalDays) * 100;
  }, [startDate, endDate]);

  const handlePeriodClick = useCallback((period: Period) => {
    if (onDateClick) {
      onDateClick(period.start);
    }
  }, [onDateClick]);

  const zoomIn = useCallback(() => {
    const modes: ViewMode[] = ['year', 'quarter', 'month', 'week', 'day'];
    const currentIndex = modes.indexOf(viewMode);
    if (currentIndex < modes.length - 1) {
      onViewModeChange(modes[currentIndex + 1]);
    }
  }, [viewMode, onViewModeChange]);

  const zoomOut = useCallback(() => {
    const modes: ViewMode[] = ['year', 'quarter', 'month', 'week', 'day'];
    const currentIndex = modes.indexOf(viewMode);
    if (currentIndex > 0) {
      onViewModeChange(modes[currentIndex - 1]);
    }
  }, [viewMode, onViewModeChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'ArrowLeft' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onNavigate('prev');
      } else if (e.key === 'ArrowRight' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onNavigate('next');
      } else if (e.key === 't' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onNavigate('today');
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        zoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate, zoomIn, zoomOut]);

  const displayDateRange = useMemo(() => {
    const start = startDate.toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { 
      month: 'short', 
      year: 'numeric' 
    });
    const end = endDate.toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { 
      month: 'short', 
      year: 'numeric' 
    });
    return `${start} - ${end}`;
  }, [startDate, endDate, isEn]);

  return (
    <div
      ref={headerRef}
      className={`${sticky ? 'sticky top-0 z-30' : ''}`}
      style={{ backgroundColor: 'rgb(var(--color-surface))' }}
    >
      {/* Controls bar */}
      <div 
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: 'rgb(var(--color-border))' }}
      >
        {/* Left: Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onNavigate('prev')}
            className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            title={isEn ? 'Previous (⌘←)' : 'Précédent (⌘←)'}
          >
            <ChevronLeft size={18} style={{ color: 'rgb(var(--color-text-muted))' }} />
          </button>
          
          <button
            onClick={() => onNavigate('today')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            style={{ color: 'rgb(var(--color-primary-500))' }}
            title={isEn ? 'Go to today (T)' : "Aller à aujourd'hui (T)"}
          >
            <Home size={14} />
            <span className="hidden sm:inline">{isEn ? 'Today' : "Aujourd'hui"}</span>
          </button>
          
          <button
            onClick={() => onNavigate('next')}
            className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            title={isEn ? 'Next (⌘→)' : 'Suivant (⌘→)'}
          >
            <ChevronRight size={18} style={{ color: 'rgb(var(--color-text-muted))' }} />
          </button>

          <div className="hidden sm:block ml-2 px-2 py-1 rounded text-xs" style={{ 
            backgroundColor: 'rgb(var(--color-bg-muted))',
            color: 'rgb(var(--color-text-muted))'
          }}>
            {displayDateRange}
          </div>
        </div>

        {/* Center: View Mode Selector */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
          {(['month', 'quarter', 'year'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === mode ? 'shadow-sm' : ''
              }`}
              style={{
                backgroundColor: viewMode === mode ? 'rgb(var(--color-surface))' : 'transparent',
                color: viewMode === mode ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))',
              }}
            >
              {isEn ? VIEW_MODE_CONFIG[mode].labelEn : VIEW_MODE_CONFIG[mode].label}
            </button>
          ))}
        </div>

        {/* Right: Zoom Controls */}
        {showZoomControls && (
          <div className="flex items-center gap-1">
            <button
              onClick={zoomOut}
              disabled={viewMode === 'year'}
              className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
              title={isEn ? 'Zoom out (-)' : 'Zoom arrière (-)'}
            >
              <ZoomOut size={16} style={{ color: 'rgb(var(--color-text-muted))' }} />
            </button>
            <button
              onClick={zoomIn}
              disabled={viewMode === 'day'}
              className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
              title={isEn ? 'Zoom in (+)' : 'Zoom avant (+)'}
            >
              <ZoomIn size={16} style={{ color: 'rgb(var(--color-text-muted))' }} />
            </button>
          </div>
        )}
      </div>

      {/* Timeline header */}
      <div 
        className="relative flex overflow-hidden"
        style={{ 
          backgroundColor: 'rgb(var(--color-bg-subtle))',
          minHeight: '48px',
        }}
      >
        {periods.map((period, index) => (
          <div
            key={index}
            className="relative flex-shrink-0 border-r last:border-r-0 transition-colors cursor-pointer"
            style={{
              width: `${period.width}%`,
              minWidth: viewMode === 'month' ? '40px' : viewMode === 'quarter' ? '60px' : '80px',
              borderColor: 'rgb(var(--color-border) / 0.5)',
              backgroundColor: period.isCurrentPeriod 
                ? 'rgb(var(--color-primary-500) / 0.08)' 
                : hoveredPeriod === index 
                  ? 'rgb(var(--color-bg-muted))' 
                  : 'transparent',
            }}
            onClick={() => handlePeriodClick(period)}
            onMouseEnter={() => setHoveredPeriod(index)}
            onMouseLeave={() => setHoveredPeriod(null)}
          >
            <div className="flex flex-col items-center justify-center h-full py-1.5 px-1">
              <span
                className={`text-xs font-semibold ${period.isCurrentPeriod ? '' : ''}`}
                style={{
                  color: period.isCurrentPeriod 
                    ? 'rgb(var(--color-primary-600))' 
                    : 'rgb(var(--color-text-muted))',
                }}
              >
                {period.label}
              </span>
              {period.sublabel && (
                <span
                  className="text-[10px]"
                  style={{ color: 'rgb(var(--color-text-muted) / 0.7)' }}
                >
                  {period.sublabel}
                </span>
              )}
            </div>

            {/* Current period indicator */}
            {period.isCurrentPeriod && (
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
              />
            )}
          </div>
        ))}

        {/* Today marker line */}
        {todayPosition !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 z-20 pointer-events-none"
            style={{
              left: `${todayPosition}%`,
              backgroundColor: 'rgb(var(--color-error))',
              boxShadow: '0 0 8px rgb(var(--color-error) / 0.5)',
            }}
          >
            <div
              className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
              style={{ backgroundColor: 'rgb(var(--color-error))' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
