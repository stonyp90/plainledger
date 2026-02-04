/**
 * ChartTooltip - Reusable tooltip component for charts
 * Provides beautiful hover effects and data display
 */

import { useState, useRef, useEffect, ReactNode, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, Info, AlertTriangle, CheckCircle } from 'lucide-react';

// =====================================================
// TOOLTIP COMPONENT
// =====================================================

interface TooltipPosition {
  x: number;
  y: number;
}

interface ChartTooltipProps {
  visible: boolean;
  position: TooltipPosition;
  children: ReactNode;
  className?: string;
}

export function ChartTooltip({ visible, position, children, className = '' }: ChartTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    if (tooltipRef.current && visible) {
      const tooltip = tooltipRef.current;
      const rect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newX = position.x;
      let newY = position.y;

      // Adjust horizontal position
      if (position.x + rect.width > viewportWidth - 20) {
        newX = position.x - rect.width - 10;
      }

      // Adjust vertical position
      if (position.y + rect.height > viewportHeight - 20) {
        newY = position.y - rect.height - 10;
      }

      setAdjustedPosition({ x: newX, y: newY });
    }
  }, [position, visible]);

  if (!visible) return null;

  return (
    <div
      ref={tooltipRef}
      className={`
        fixed z-50 pointer-events-none
        rounded-xl shadow-2xl
        px-4 py-3
        text-sm
        animate-in fade-in zoom-in-95 duration-150
        ${className}
      `}
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        transform: 'translate(10px, -50%)',
        backgroundColor: 'rgb(var(--color-surface))',
        color: 'rgb(var(--color-text))',
        border: '1px solid rgb(var(--color-border))',
        boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)',
      }}
    >
      {/* Arrow */}
      <div 
        className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 border-8 border-transparent"
        style={{ borderRightColor: 'rgb(var(--color-surface))' }}
      />
      {children}
    </div>
  );
}

// =====================================================
// TOOLTIP CONTENT COMPONENTS
// =====================================================

interface DataPointTooltipProps {
  label: string;
  value: number | string;
  previousValue?: number;
  format?: 'currency' | 'percent' | 'number';
  currency?: string;
  trend?: 'up' | 'down' | 'stable';
  status?: 'normal' | 'warning' | 'critical' | 'success';
  additionalInfo?: { label: string; value: string }[];
}

export function DataPointTooltip({
  label,
  value,
  previousValue,
  format = 'currency',
  currency = 'CAD',
  trend,
  status,
  additionalInfo,
}: DataPointTooltipProps) {
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('fr-CA', {
          style: 'currency',
          currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      case 'percent':
        return `${val.toFixed(1)}%`;
      case 'number':
        return val.toLocaleString();
      default:
        return String(val);
    }
  };

  const percentChange = previousValue && typeof value === 'number'
    ? ((value - previousValue) / previousValue) * 100
    : null;

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  
  // Use CSS variable-based colors for theme consistency
  const getTrendStyle = () => {
    if (trend === 'up') return { color: 'rgb(var(--color-success))' };
    if (trend === 'down') return { color: 'rgb(var(--color-error))' };
    return { color: 'rgb(var(--color-text-muted))' };
  };

  const statusConfig = {
    normal: { style: { color: 'rgb(var(--color-text-muted))' }, icon: null },
    warning: { style: { color: 'rgb(var(--color-warning))' }, icon: AlertTriangle },
    critical: { style: { color: 'rgb(var(--color-error))' }, icon: AlertTriangle },
    success: { style: { color: 'rgb(var(--color-success))' }, icon: CheckCircle },
  };

  const statusInfo = status ? statusConfig[status] : null;
  const StatusIcon = statusInfo?.icon ?? null;

  return (
    <div className="min-w-[180px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <span 
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          {label}
        </span>
        {StatusIcon && statusInfo && (
          <StatusIcon className="w-4 h-4" style={statusInfo.style} />
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-2">
        <span 
          className="text-xl font-bold"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          {formatValue(value)}
        </span>
        {trend && (
          <TrendIcon className="w-4 h-4" style={getTrendStyle()} />
        )}
      </div>

      {/* Change from previous */}
      {percentChange !== null && (
        <div 
          className="flex items-center gap-1 mt-1 text-xs"
          style={{ color: percentChange >= 0 ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))' }}
        >
          {percentChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}% vs précédent</span>
        </div>
      )}

      {/* Additional info */}
      {additionalInfo && additionalInfo.length > 0 && (
        <div 
          className="mt-3 pt-3 space-y-1.5"
          style={{ borderTop: '1px solid rgb(var(--color-border))' }}
        >
          {additionalInfo.map((info, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span style={{ color: 'rgb(var(--color-text-muted))' }}>{info.label}</span>
              <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{info.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =====================================================
// HOVER CARD WRAPPER
// =====================================================

interface HoverCardProps {
  children: ReactNode;
  tooltip: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function HoverCard({ children, tooltip, className = '', disabled = false }: HoverCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (disabled) return;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(true);
  }, [disabled]);

  const handleMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 50);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    setPosition({ x: e.clientX, y: e.clientY });
  }, [disabled]);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      {children}
      <ChartTooltip visible={isHovered && !disabled} position={position}>
        {tooltip}
      </ChartTooltip>
    </div>
  );
}

// =====================================================
// INTERACTIVE CHART WRAPPER
// =====================================================

interface InteractiveChartWrapperProps {
  title: string;
  titleEn?: string;
  subtitle?: string;
  subtitleEn?: string;
  children: ReactNode;
  onExpand?: () => void;
  onRefresh?: () => void;
  isEn?: boolean;
  className?: string;
  actions?: ReactNode;
  loading?: boolean;
}

export function InteractiveChartWrapper({
  title,
  titleEn,
  subtitle,
  subtitleEn,
  children,
  onExpand,
  onRefresh,
  isEn = false,
  className = '',
  actions,
  loading = false,
}: InteractiveChartWrapperProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`
        card relative overflow-hidden transition-all duration-300
        ${isHovered ? 'shadow-lg ring-2 ring-primary/20' : 'shadow-sm'}
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Gradient border effect on hover */}
      <div 
        className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 pointer-events-none"
        style={{ 
          opacity: isHovered ? 0.5 : 0,
          background: 'linear-gradient(135deg, rgb(var(--color-primary-500) / 0.1), transparent)',
        }}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div>
          <h3 className="font-semibold text-primary">
            {isEn && titleEn ? titleEn : title}
          </h3>
          {(subtitle || subtitleEn) && (
            <p className="text-sm text-muted mt-0.5">
              {isEn && subtitleEn ? subtitleEn : subtitle}
            </p>
          )}
        </div>

        {/* Actions (visible on hover) */}
        <div 
          className={`
            flex items-center gap-2 transition-opacity duration-200
            ${isHovered ? 'opacity-100' : 'opacity-0'}
          `}
        >
          {actions}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              title={isEn ? 'Refresh' : 'Actualiser'}
            >
              <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
          {onExpand && (
            <button
              onClick={onExpand}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              title={isEn ? 'Expand' : 'Agrandir'}
            >
              <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-surface/80 flex items-center justify-center z-20 rounded-xl">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Chart content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

// =====================================================
// STAT CARD WITH HOVER
// =====================================================

interface StatCardProps {
  label: string;
  labelEn?: string;
  value: number | string;
  previousValue?: number;
  format?: 'currency' | 'percent' | 'number';
  currency?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendIsGood?: boolean;
  description?: string;
  descriptionEn?: string;
  isEn?: boolean;
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  label,
  labelEn,
  value,
  previousValue,
  format = 'currency',
  currency = 'CAD',
  icon,
  trend,
  trendIsGood = true,
  description,
  descriptionEn,
  isEn = false,
  onClick,
  className = '',
}: StatCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('fr-CA', {
          style: 'currency',
          currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      case 'percent':
        return `${val.toFixed(1)}%`;
      case 'number':
        return val.toLocaleString();
      default:
        return String(val);
    }
  };

  const percentChange = previousValue && typeof value === 'number'
    ? ((value - previousValue) / previousValue) * 100
    : null;

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;
  
  // Determine if trend is positive based on context
  const isTrendPositive = trend === 'up' ? trendIsGood : trend === 'down' ? !trendIsGood : null;
  const trendColor = isTrendPositive === true 
    ? 'text-primary-500 dark:text-primary-400' 
    : isTrendPositive === false 
      ? 'text-red-500 dark:text-red-400' 
      : 'text-gray-400';

  return (
    <div
      className={`
        card p-4 transition-all duration-300 cursor-pointer
        ${isHovered ? 'shadow-lg scale-[1.02] ring-2 ring-primary/20' : 'shadow-sm'}
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted">
          {isEn && labelEn ? labelEn : label}
        </span>
        {icon && (
          <div 
            className={`
              p-2 rounded-lg transition-all duration-300
              ${isHovered ? 'bg-primary/10 scale-110' : 'bg-muted/50'}
            `}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-3">
        <span 
          className={`
            text-2xl font-bold text-primary transition-transform duration-300
            ${isHovered ? 'scale-105' : ''}
          `}
        >
          {formatValue(value)}
        </span>
        
        {TrendIcon && (
          <div className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="w-4 h-4" />
            {percentChange !== null && (
              <span className="text-sm font-medium">
                {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      {(description || descriptionEn) && (
        <p 
          className={`
            text-xs text-muted mt-2 transition-opacity duration-300
            ${isHovered ? 'opacity-100' : 'opacity-70'}
          `}
        >
          {isEn && descriptionEn ? descriptionEn : description}
        </p>
      )}

      {/* Hover indicator */}
      <div 
        className={`
          absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/50
          transition-transform duration-300 rounded-b-xl
          ${isHovered ? 'scale-x-100' : 'scale-x-0'}
        `}
        style={{ transformOrigin: 'left' }}
      />
    </div>
  );
}

// =====================================================
// MINI SPARKLINE WITH HOVER
// =====================================================

interface MiniSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showTooltip?: boolean;
  labels?: string[];
}

export function MiniSparkline({
  data,
  width = 100,
  height = 30,
  color = 'rgb(var(--color-primary-500))',
  showTooltip = true,
  labels,
}: MiniSparklineProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition>({ x: 0, y: 0 });
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Convert CSS variable color to actual hex color for SVG gradients
  const getActualColor = (colorString: string): string => {
    // Primary colors - always use green
    if (colorString.includes('--color-primary') || colorString.includes('primary')) {
      return '#10b981'; // emerald-500 (green) - theme color
    }
    // Success colors - use green
    if (colorString.includes('--color-success') || colorString.includes('success')) {
      return '#16a34a'; // green-600
    }
    // Error colors - use red
    if (colorString.includes('--color-error') || colorString.includes('error')) {
      return '#ef4444'; // red-500
    }
    // Warning colors - use amber
    if (colorString.includes('--color-warning') || colorString.includes('warning')) {
      return '#f59e0b'; // amber-500
    }
    // If it's already a hex color, return as-is
    if (colorString.startsWith('#')) {
      return colorString;
    }
    // If it's already an rgb() color without CSS variables, return as-is
    if (colorString.startsWith('rgb(') && !colorString.includes('var(')) {
      return colorString;
    }
    // Default to green for all charts (theme color)
    return '#10b981';
  };

  const actualColor = getActualColor(color);

  if (data.length < 2) return null;

  const min = data.length > 0 ? Math.min(...data) : 0;
  const max = data.length > 0 ? Math.max(...data) : 0;
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((value, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return { x, y, value };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const index = Math.round((x / width) * (data.length - 1));
    const clampedIndex = Math.max(0, Math.min(data.length - 1, index));
    setHoveredIndex(clampedIndex);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredIndex(null);
    }, 50);
  };

  return (
    <div className="relative inline-block">
      <svg
        width={width}
        height={height}
        className="cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Gradient fill */}
        <defs>
          <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={actualColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={actualColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Fill area */}
        <path
          d={`${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`}
          fill="url(#sparkline-gradient)"
        />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={actualColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Hover point */}
        {hoveredIndex !== null && (
          <circle
            cx={points[hoveredIndex].x}
            cy={points[hoveredIndex].y}
            r={4}
            fill={color}
            stroke="white"
            strokeWidth={2}
            className="drop-shadow-lg"
          />
        )}
      </svg>

      {/* Tooltip */}
      {showTooltip && hoveredIndex !== null && (
        <ChartTooltip visible={true} position={tooltipPos}>
          <div className="text-center">
            {labels && labels[hoveredIndex] && (
              <div 
                className="text-xs mb-1"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {labels[hoveredIndex]}
              </div>
            )}
            <div 
              className="text-lg font-bold"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {data[hoveredIndex].toLocaleString()}
            </div>
          </div>
        </ChartTooltip>
      )}
    </div>
  );
}

export default ChartTooltip;
