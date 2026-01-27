/**
 * Timeline Header Component - Runway-style Design
 * 
 * Compact header with:
 * - Monthly/Quarterly toggle
 * - Period navigation
 * - Clean visual design
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type ViewMode } from '../../lib/financialModel';
import { useI18n } from '../../lib/i18n';

// Runway-inspired color palette
const colors = {
  bg: {
    base: '#FFFFFF',
    muted: '#F9FAFB',
    active: '#3B82F6',
    hover: '#F3F4F6',
  },
  border: {
    default: '#E5E7EB',
  },
  text: {
    primary: '#111827',
    secondary: '#374151',
    muted: '#6B7280',
    active: '#FFFFFF',
  },
};

interface TimelineHeaderProps {
  startDate: Date;
  endDate: Date;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onStartDateChange?: (date: Date) => void;
  onEndDateChange?: (date: Date) => void;
}

export default function TimelineHeader({
  startDate,
  endDate,
  viewMode,
  onViewModeChange,
  onStartDateChange,
  onEndDateChange,
}: TimelineHeaderProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const handlePrevPeriod = () => {
    if (onStartDateChange && onEndDateChange) {
      const newStart = new Date(startDate);
      const newEnd = new Date(endDate);
      if (viewMode === 'monthly') {
        newStart.setMonth(newStart.getMonth() - 1);
        newEnd.setMonth(newEnd.getMonth() - 1);
      } else {
        newStart.setMonth(newStart.getMonth() - 3);
        newEnd.setMonth(newEnd.getMonth() - 3);
      }
      onStartDateChange(newStart);
      onEndDateChange(newEnd);
    }
  };
  
  const handleNextPeriod = () => {
    if (onStartDateChange && onEndDateChange) {
      const newStart = new Date(startDate);
      const newEnd = new Date(endDate);
      if (viewMode === 'monthly') {
        newStart.setMonth(newStart.getMonth() + 1);
        newEnd.setMonth(newEnd.getMonth() + 1);
      } else {
        newStart.setMonth(newStart.getMonth() + 3);
        newEnd.setMonth(newEnd.getMonth() + 3);
      }
      onStartDateChange(newStart);
      onEndDateChange(newEnd);
    }
  };
  
  return (
    <div
      className="flex items-center gap-3"
      style={{
        padding: '8px 16px',
        borderBottom: `1px solid ${colors.border.default}`,
        backgroundColor: colors.bg.base,
      }}
    >
      {/* View Mode Toggle */}
      <div
        className="flex items-center rounded-lg overflow-hidden"
        style={{
          backgroundColor: colors.bg.muted,
          padding: '2px',
        }}
      >
        <ToggleButton
          active={viewMode === 'monthly'}
          onClick={() => onViewModeChange('monthly')}
        >
          {isEn ? 'Monthly' : 'Mensuel'}
        </ToggleButton>
        <ToggleButton
          active={viewMode === 'quarterly'}
          onClick={() => onViewModeChange('quarterly')}
        >
          {isEn ? 'Quarterly' : 'Trimestriel'}
        </ToggleButton>
      </div>
      
      {/* Navigation */}
      {(onStartDateChange && onEndDateChange) && (
        <div className="flex items-center gap-1">
          <NavButton onClick={handlePrevPeriod} title={isEn ? 'Previous' : 'Précédent'}>
            <ChevronLeft className="w-4 h-4" />
          </NavButton>
          <NavButton onClick={handleNextPeriod} title={isEn ? 'Next' : 'Suivant'}>
            <ChevronRight className="w-4 h-4" />
          </NavButton>
        </div>
      )}
    </div>
  );
}

// Toggle Button Component
function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-medium transition-all duration-150"
      style={{
        padding: '6px 12px',
        borderRadius: '6px',
        backgroundColor: active ? colors.bg.active : 'transparent',
        color: active ? colors.text.active : colors.text.secondary,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = colors.bg.hover;
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      {children}
    </button>
  );
}

// Navigation Button Component
function NavButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded transition-colors"
      style={{
        color: colors.text.muted,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = colors.bg.hover;
        e.currentTarget.style.color = colors.text.primary;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = colors.text.muted;
      }}
    >
      {children}
    </button>
  );
}
