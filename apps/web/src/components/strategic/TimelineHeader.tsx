/**
 * Timeline Header Component - Runway-style Design
 * 
 * Compact header with:
 * - Monthly/Quarterly toggle
 * - Period navigation
 * - Clean visual design
 */

import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
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
  onAddPeriod?: () => void;
  onRemovePeriod?: () => void;
  canRemovePeriod?: boolean;
}

export default function TimelineHeader({
  startDate,
  endDate,
  viewMode,
  onViewModeChange,
  onStartDateChange,
  onEndDateChange,
  onAddPeriod,
  onRemovePeriod,
  canRemovePeriod = false,
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
        height: '40px',
        padding: '0 16px',
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
      
      {/* Column Management */}
      <div className="flex items-center gap-2 ml-auto">
        {onAddPeriod && (
          <button 
            onClick={onAddPeriod}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors"
            style={{
              backgroundColor: '#F0FDF4',
              color: '#166534',
              border: '1px solid #BBF7D0',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#DCFCE7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F0FDF4';
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isEn ? 'Add Column' : 'Ajouter'}</span>
          </button>
        )}
        {onRemovePeriod && canRemovePeriod && (
          <button 
            onClick={onRemovePeriod}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors"
            style={{
              backgroundColor: '#FEF2F2',
              color: '#991B1B',
              border: '1px solid #FECACA',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FEE2E2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FEF2F2';
            }}
          >
            <X className="w-3.5 h-3.5" />
            <span>{isEn ? 'Remove' : 'Retirer'}</span>
          </button>
        )}
      </div>
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
      className="font-medium transition-all duration-150"
      style={{
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '13px', // Increased from 12px
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
