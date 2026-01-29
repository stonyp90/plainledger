/**
 * MetricCard - Reusable Metric Card Component
 * 
 * A simple, responsive card for displaying portfolio metrics and summaries.
 * Optimized for displaying key values with icons and optional subtitles.
 * 
 * Features:
 * - LabelTooltip for truncated labels (shows full text on hover)
 * - Responsive sizing with compact mode option
 * - Dark/light theme support via CSS variables
 * - Hover effects and animations
 */

import type { LucideIcon } from 'lucide-react';
import { LabelTooltip } from './Tooltip';

export type MetricColorVariant = 'primary' | 'success' | 'info' | 'accent' | 'warning' | 'error';

export interface MetricCardProps {
  /** Label/name of the metric */
  label: string;
  /** Formatted value to display */
  value: string;
  /** Optional subtitle or additional context */
  subtitle?: string;
  /** Icon component to display */
  icon: LucideIcon;
  /** Color variant for the icon */
  color?: MetricColorVariant;
  /** Compact mode for denser layouts */
  compact?: boolean;
  /** English language mode */
  isEn?: boolean;
  /** Click handler */
  onClick?: () => void;
}

// Color mapping for theme CSS variables
const colorMap: Record<MetricColorVariant, string> = {
  primary: 'rgb(var(--color-primary-500))',
  success: 'rgb(var(--color-success))',
  info: 'rgb(var(--color-info))',
  accent: 'rgb(var(--color-accent-600))',
  warning: 'rgb(var(--color-warning))',
  error: 'rgb(var(--color-error))',
};

export default function MetricCard({
  label,
  value,
  subtitle,
  icon: Icon,
  color = 'primary',
  compact = false,
  isEn = false,
  onClick,
}: MetricCardProps) {
  const iconColor = colorMap[color];

  if (compact) {
    return (
      <div 
        className="p-2 sm:p-2.5 lg:p-3 rounded-lg sm:rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] min-h-[80px] sm:min-h-[90px] flex flex-col cursor-pointer"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          border: '1px solid rgb(var(--color-border) / 0.5)',
        }}
        onClick={onClick}
      >
        <div className="flex items-center gap-1.5 mb-1.5 flex-shrink-0">
          <Icon className="w-4 h-4 flex-shrink-0" color={iconColor} />
          <div className="flex-1 min-w-0">
            <LabelTooltip label={label}>
              <span 
                className="text-[9px] sm:text-[10px] font-medium truncate leading-tight" 
                style={{ color: 'rgb(var(--color-text-secondary))' }}
              >
                {label}
              </span>
            </LabelTooltip>
          </div>
        </div>
        <p 
          className="text-base sm:text-lg font-bold leading-tight mb-1 flex-shrink-0" 
          style={{ color: 'rgb(var(--color-text))' }}
        >
          {value}
        </p>
        {subtitle && (
          <LabelTooltip label={subtitle}>
            <p 
              className="text-[8px] sm:text-[9px] mt-auto leading-tight line-clamp-1" 
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {subtitle}
            </p>
          </LabelTooltip>
        )}
      </div>
    );
  }

  // Normal mode: larger cards for portfolio overview
  return (
    <div 
      className="p-4 sm:p-5 lg:p-6 rounded-lg sm:rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] min-h-[110px] sm:min-h-[120px] flex flex-col cursor-pointer"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        border: '1px solid rgb(var(--color-border) / 0.5)',
      }}
      onClick={onClick}
    >
      <div className="flex items-center gap-2.5 mb-3 sm:mb-4 flex-shrink-0">
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 flex-shrink-0" color={iconColor} />
        <div className="flex-1 min-w-0">
          <LabelTooltip label={label}>
            <span 
              className="text-[11px] sm:text-xs font-medium truncate leading-tight" 
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {label}
            </span>
          </LabelTooltip>
        </div>
      </div>
      <p 
        className="text-xl sm:text-2xl lg:text-3xl font-bold leading-tight mb-2 flex-shrink-0" 
        style={{ color: 'rgb(var(--color-text))' }}
      >
        {value}
      </p>
      {subtitle && (
        <LabelTooltip label={subtitle}>
          <p 
            className="text-[10px] sm:text-xs mt-auto leading-tight line-clamp-2" 
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {subtitle}
          </p>
        </LabelTooltip>
      )}
    </div>
  );
}
