/**
 * PlainLedger Tooltip System
 * 
 * Beautiful, accessible tooltips for better UX:
 * - Clear explanations for complex concepts
 * - Bilingual support (EN/FR)
 * - Multiple trigger modes (hover, click, focus)
 * - Smart positioning
 * - Rich content support
 */

import { useState, useRef, useEffect, ReactNode, CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, Info, AlertCircle, ChevronRight, ExternalLink, X } from 'lucide-react';
import { useI18n } from '../lib/i18n';

// =====================================================
// TYPES
// =====================================================

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right' | 'auto';
export type TooltipTrigger = 'hover' | 'click' | 'focus' | 'manual';
export type TooltipVariant = 'default' | 'info' | 'warning' | 'error' | 'success' | 'rich';

export interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  position?: TooltipPosition;
  trigger?: TooltipTrigger;
  variant?: TooltipVariant;
  delay?: number;
  maxWidth?: number;
  className?: string;
  disabled?: boolean;
  showArrow?: boolean;
  interactive?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface InfoTooltipProps {
  title?: string;
  titleEn?: string;
  content: string;
  contentEn?: string;
  example?: string;
  exampleEn?: string;
  impact?: string;
  impactEn?: string;
  learnMoreUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'info' | 'help' | 'warning';
}

export interface MetricTooltipProps {
  metricName: string;
  metricNameEn?: string;
  value: string | number;
  description: string;
  descriptionEn?: string;
  formula?: string;
  benchmark?: {
    good: string;
    warning: string;
    bad: string;
  };
  trend?: 'up' | 'down' | 'stable';
  trendLabel?: string;
}

// =====================================================
// BASE TOOLTIP COMPONENT
// =====================================================

export function Tooltip({
  children,
  content,
  position = 'top',
  trigger = 'hover',
  variant = 'default',
  delay = 200,
  maxWidth = 280,
  className = '',
  disabled = false,
  showArrow = true,
  interactive = false,
  onOpenChange,
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [calculatedPosition, setCalculatedPosition] = useState<Exclude<TooltipPosition, 'auto'>>(position === 'auto' ? 'top' : position);
  const [tooltipCoords, setTooltipCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleOpen = () => {
    if (disabled) return;
    if (trigger === 'hover' || trigger === 'focus') {
      timeoutRef.current = setTimeout(() => {
        setIsOpen(true);
        onOpenChange?.(true);
      }, delay);
    } else {
      setIsOpen(true);
      onOpenChange?.(true);
    }
  };

  const handleClose = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(false);
    onOpenChange?.(false);
  };

  // Calculate position and coordinates when open
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    
    const updatePosition = () => {
      if (!triggerRef.current) return;
      
      const rect = triggerRef.current.getBoundingClientRect();
      const tooltipHeight = tooltipRef.current?.offsetHeight || 40;
      const tooltipWidth = tooltipRef.current?.offsetWidth || maxWidth;
      
      // Calculate best position if auto
      let bestPosition: Exclude<TooltipPosition, 'auto'> = position === 'auto' ? 'top' : position;
      if (position === 'auto') {
        const spaceTop = rect.top;
        const spaceBottom = window.innerHeight - rect.bottom;
        const spaceLeft = rect.left;
        const spaceRight = window.innerWidth - rect.right;
        
        if (spaceBottom > spaceTop && spaceBottom > tooltipHeight + 20) bestPosition = 'bottom';
        else if (spaceTop > tooltipHeight + 20) bestPosition = 'top';
        else if (spaceRight > spaceLeft && spaceRight > tooltipWidth + 20) bestPosition = 'right';
        else if (spaceLeft > tooltipWidth + 20) bestPosition = 'left';
        else bestPosition = 'bottom';
      }
      
      setCalculatedPosition(bestPosition);
      
      // Calculate coordinates based on position
      let top = 0;
      let left = 0;
      const gap = 8;
      
      switch (bestPosition) {
        case 'top':
          top = rect.top - tooltipHeight - gap + window.scrollY;
          left = rect.left + rect.width / 2 - tooltipWidth / 2 + window.scrollX;
          break;
        case 'bottom':
          top = rect.bottom + gap + window.scrollY;
          left = rect.left + rect.width / 2 - tooltipWidth / 2 + window.scrollX;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2 + window.scrollY;
          left = rect.left - tooltipWidth - gap + window.scrollX;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2 + window.scrollY;
          left = rect.right + gap + window.scrollX;
          break;
      }
      
      // Ensure tooltip stays within viewport
      const padding = 8;
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding + window.scrollX));
      top = Math.max(padding + window.scrollY, top);
      
      setTooltipCoords({ top, left });
    };
    
    updatePosition();
    
    // Recalculate on scroll or resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, position, maxWidth]);

  // Close on click outside for click trigger
  useEffect(() => {
    if (trigger !== 'click' || !isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        tooltipRef.current && !tooltipRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [trigger, isOpen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const variantStyles: Record<TooltipVariant, CSSProperties> = {
    default: {
      backgroundColor: 'rgb(var(--color-bg-inverse))',
      color: 'rgb(var(--color-text-inverse))',
    },
    info: {
      backgroundColor: 'rgb(var(--color-info))',
      color: 'white',
    },
    warning: {
      backgroundColor: 'rgb(var(--color-warning))',
      color: 'white',
    },
    error: {
      backgroundColor: 'rgb(var(--color-error))',
      color: 'white',
    },
    success: {
      backgroundColor: 'rgb(var(--color-success))',
      color: 'white',
    },
    rich: {
      backgroundColor: 'rgb(var(--color-surface))',
      color: 'rgb(var(--color-text))',
      border: '1px solid rgb(var(--color-border))',
      boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)',
    },
  };

  const arrowStyles: Record<Exclude<TooltipPosition, 'auto'>, CSSProperties> = {
    top: { bottom: '-4px', left: '50%', transform: 'translateX(-50%) rotate(45deg)' },
    bottom: { top: '-4px', left: '50%', transform: 'translateX(-50%) rotate(45deg)' },
    left: { right: '-4px', top: '50%', transform: 'translateY(-50%) rotate(45deg)' },
    right: { left: '-4px', top: '50%', transform: 'translateY(-50%) rotate(45deg)' },
  };

  const triggerEvents = {
    hover: {
      onMouseEnter: handleOpen,
      onMouseLeave: handleClose,
    },
    click: {
      onClick: () => isOpen ? handleClose() : handleOpen(),
    },
    focus: {
      onFocus: handleOpen,
      onBlur: handleClose,
    },
    manual: {},
  };

  // Render tooltip in a portal to avoid overflow clipping
  const tooltipContent = isOpen && createPortal(
    <div
      ref={tooltipRef}
      className="animate-in fade-in duration-150"
      style={{
        position: 'absolute',
        top: tooltipCoords.top,
        left: tooltipCoords.left,
        maxWidth,
        ...variantStyles[variant],
        borderRadius: '8px',
        padding: variant === 'rich' ? '0' : '8px 12px',
        fontSize: '13px',
        lineHeight: '1.4',
        whiteSpace: 'normal',
        pointerEvents: interactive ? 'auto' : 'none',
        zIndex: 99999,
      }}
      onMouseEnter={interactive && trigger === 'hover' ? handleOpen : undefined}
      onMouseLeave={interactive && trigger === 'hover' ? handleClose : undefined}
    >
      {showArrow && variant !== 'rich' && (
        <div
          className="absolute w-2 h-2"
          style={{
            ...arrowStyles[calculatedPosition],
            backgroundColor: variantStyles[variant].backgroundColor as string,
          }}
        />
      )}
      {content}
    </div>,
    document.body
  );

  return (
    <div 
      ref={triggerRef}
      className={`relative inline-flex ${className}`}
      {...triggerEvents[trigger]}
    >
      {children}
      {tooltipContent}
    </div>
  );
}

// =====================================================
// INFO TOOLTIP (with icon)
// =====================================================

export function InfoTooltip({
  title,
  titleEn,
  content,
  contentEn,
  example,
  exampleEn,
  impact,
  impactEn,
  learnMoreUrl,
  size = 'md',
  variant = 'help',
}: InfoTooltipProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const displayTitle = isEn && titleEn ? titleEn : title;
  const displayContent = isEn && contentEn ? contentEn : content;
  const displayExample = isEn && exampleEn ? exampleEn : example;
  const displayImpact = isEn && impactEn ? impactEn : impact;
  
  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };
  
  const Icon = variant === 'warning' ? AlertCircle : variant === 'info' ? Info : HelpCircle;
  const iconColor = variant === 'warning' 
    ? 'rgb(var(--color-warning))' 
    : 'rgb(var(--color-text-muted))';

  const tooltipContent = (
    <div className="p-4 max-w-sm">
      {displayTitle && (
        <h4 
          className="font-semibold mb-2 text-sm"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          {displayTitle}
        </h4>
      )}
      
      <p 
        className="text-sm mb-3"
        style={{ color: 'rgb(var(--color-text-secondary))' }}
      >
        {displayContent}
      </p>
      
      {displayExample && (
        <div 
          className="p-2.5 rounded-lg mb-3 text-xs"
          style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
        >
          <span 
            className="font-medium"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn ? 'Example: ' : 'Exemple : '}
          </span>
          <span style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {displayExample}
          </span>
        </div>
      )}
      
      {displayImpact && (
        <div className="flex items-start gap-2 text-xs">
          <AlertCircle 
            className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" 
            style={{ color: 'rgb(var(--color-warning))' }}
          />
          <span style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {displayImpact}
          </span>
        </div>
      )}
      
      {learnMoreUrl && (
        <a
          href={learnMoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 mt-3 text-xs font-medium hover:underline"
          style={{ color: 'rgb(var(--color-primary-500))' }}
        >
          {isEn ? 'Learn more' : 'En savoir plus'}
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );

  return (
    <Tooltip
      content={tooltipContent}
      variant="rich"
      trigger="hover"
      position="auto"
      interactive
      maxWidth={320}
    >
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-full hover:bg-muted transition-colors p-0.5"
        aria-label={isEn ? 'More information' : 'Plus d\'information'}
      >
        <Icon className={sizeClasses[size]} style={{ color: iconColor }} />
      </button>
    </Tooltip>
  );
}

// =====================================================
// METRIC TOOLTIP (for KPIs and ratios)
// =====================================================

export function MetricTooltip({
  metricName,
  metricNameEn,
  value,
  description,
  descriptionEn,
  formula,
  benchmark,
  trend,
  trendLabel,
}: MetricTooltipProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const displayName = isEn && metricNameEn ? metricNameEn : metricName;
  const displayDescription = isEn && descriptionEn ? descriptionEn : description;

  const trendColors = {
    up: 'rgb(var(--color-success))',
    down: 'rgb(var(--color-error))',
    stable: 'rgb(var(--color-text-muted))',
  };

  const tooltipContent = (
    <div className="p-4 min-w-[280px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 
          className="font-semibold text-sm"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          {displayName}
        </h4>
        {trend && (
          <span 
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ 
              backgroundColor: `${trendColors[trend]}20`,
              color: trendColors[trend],
            }}
          >
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendLabel}
          </span>
        )}
      </div>
      
      {/* Value */}
      <div 
        className="text-2xl font-bold mb-3"
        style={{ color: 'rgb(var(--color-text))' }}
      >
        {value}
      </div>
      
      {/* Description */}
      <p 
        className="text-sm mb-3"
        style={{ color: 'rgb(var(--color-text-secondary))' }}
      >
        {displayDescription}
      </p>
      
      {/* Formula */}
      {formula && (
        <div 
          className="p-2.5 rounded-lg mb-3 font-mono text-xs"
          style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
        >
          <span style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Formula: ' : 'Formule : '}
          </span>
          <span style={{ color: 'rgb(var(--color-text))' }}>
            {formula}
          </span>
        </div>
      )}
      
      {/* Benchmark */}
      {benchmark && (
        <div className="space-y-1.5">
          <span 
            className="text-xs font-medium"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn ? 'Industry benchmarks:' : 'Références sectorielles :'}
          </span>
          <div className="flex gap-1.5">
            <span 
              className="text-xs px-2 py-1 rounded"
              style={{ 
                backgroundColor: 'rgb(var(--color-success) / 0.1)',
                color: 'rgb(var(--color-success))',
              }}
            >
              ✓ {benchmark.good}
            </span>
            <span 
              className="text-xs px-2 py-1 rounded"
              style={{ 
                backgroundColor: 'rgb(var(--color-warning) / 0.1)',
                color: 'rgb(var(--color-warning))',
              }}
            >
              ⚠ {benchmark.warning}
            </span>
            <span 
              className="text-xs px-2 py-1 rounded"
              style={{ 
                backgroundColor: 'rgb(var(--color-error) / 0.1)',
                color: 'rgb(var(--color-error))',
              }}
            >
              ✗ {benchmark.bad}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Tooltip
      content={tooltipContent}
      variant="rich"
      trigger="hover"
      position="auto"
      interactive
      maxWidth={340}
    >
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-full hover:bg-muted transition-colors p-0.5 ml-1"
        aria-label={isEn ? 'Metric details' : 'Détails de la métrique'}
      >
        <Info className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-text-muted))' }} />
      </button>
    </Tooltip>
  );
}

// =====================================================
// ANOMALY TOOLTIP (for AI detections)
// =====================================================

interface AnomalyTooltipProps {
  type: string;
  confidence: number;
  explanation: string;
  explanationEn: string;
  technicalDetails?: string;
  suggestedActions: string[];
  impactScore: number;
}

export function AnomalyTooltip({
  type,
  confidence,
  explanation,
  explanationEn,
  technicalDetails,
  suggestedActions,
  impactScore,
}: AnomalyTooltipProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const displayExplanation = isEn ? explanationEn : explanation;

  const tooltipContent = (
    <div className="p-4 min-w-[300px]">
      {/* Header with confidence */}
      <div className="flex items-center justify-between mb-3">
        <span 
          className="text-xs font-medium px-2 py-1 rounded-full"
          style={{ 
            backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
            color: 'rgb(var(--color-primary-600))',
          }}
        >
          🤖 {isEn ? 'Intelligent Detection' : 'Détection intelligente'}
        </span>
        <span 
          className="text-xs"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          {isEn ? 'Confidence' : 'Confiance'}: {confidence}%
        </span>
      </div>
      
      {/* Explanation */}
      <p 
        className="text-sm mb-3"
        style={{ color: 'rgb(var(--color-text-secondary))' }}
      >
        {displayExplanation}
      </p>
      
      {/* Impact Score */}
      <div className="flex items-center gap-2 mb-3">
        <span 
          className="text-xs"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          {isEn ? 'Impact:' : 'Impact :'}
        </span>
        <div 
          className="flex-1 h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
        >
          <div 
            className="h-full rounded-full transition-all"
            style={{ 
              width: `${Math.min(100, impactScore)}%`,
              backgroundColor: impactScore > 70 
                ? 'rgb(var(--color-error))' 
                : impactScore > 40 
                  ? 'rgb(var(--color-warning))'
                  : 'rgb(var(--color-success))',
            }}
          />
        </div>
        <span 
          className="text-xs font-medium"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          {impactScore}%
        </span>
      </div>
      
      {/* Technical Details (collapsible feel) */}
      {technicalDetails && (
        <div 
          className="p-2.5 rounded-lg mb-3 font-mono text-xs"
          style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
        >
          <span style={{ color: 'rgb(var(--color-text-muted))' }}>
            {technicalDetails}
          </span>
        </div>
      )}
      
      {/* Suggested Actions */}
      {suggestedActions.length > 0 && (
        <div>
          <span 
            className="text-xs font-medium block mb-2"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn ? 'Suggested actions:' : 'Actions suggérées :'}
          </span>
          <ul className="space-y-1">
            {suggestedActions.slice(0, 3).map((action, idx) => (
              <li 
                key={idx}
                className="flex items-start gap-2 text-xs"
                style={{ color: 'rgb(var(--color-text-secondary))' }}
              >
                <ChevronRight 
                  className="w-3 h-3 mt-0.5 flex-shrink-0" 
                  style={{ color: 'rgb(var(--color-primary-500))' }}
                />
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <Tooltip
      content={tooltipContent}
      variant="rich"
      trigger="hover"
      position="auto"
      interactive
      maxWidth={360}
    >
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-full hover:bg-muted transition-colors p-1"
        aria-label={isEn ? 'View AI analysis' : 'Voir l\'analyse IA'}
      >
        <span className="text-sm">🤖</span>
      </button>
    </Tooltip>
  );
}

// =====================================================
// SIMPLE TEXT TOOLTIP
// =====================================================

interface SimpleTooltipProps {
  text: string;
  textEn?: string;
  children: ReactNode;
  position?: TooltipPosition;
}

export function SimpleTooltip({ text, textEn, children, position = 'top' }: SimpleTooltipProps) {
  const { language } = useI18n();
  const displayText = language === 'en' && textEn ? textEn : text;
  
  return (
    <Tooltip content={displayText} position={position}>
      {children}
    </Tooltip>
  );
}

// =====================================================
// LABEL TOOLTIP (for truncated text labels - instant display)
// =====================================================

interface LabelTooltipProps {
  label: string;
  children: ReactNode;
  className?: string;
  maxWidth?: number;
}

/**
 * Lightweight tooltip for truncated labels that appears instantly on hover.
 * Use this for KPI labels, chart labels, and other truncated text.
 * Includes visual cue (dotted underline) to indicate hoverable content.
 */
export function LabelTooltip({ label, children, className = '', maxWidth = 280 }: LabelTooltipProps) {
  return (
    <Tooltip 
      content={
        <div className="p-2.5">
          <span className="font-medium whitespace-normal break-words text-sm">{label}</span>
        </div>
      } 
      position="auto"
      delay={0}
      maxWidth={maxWidth}
      variant="rich"
    >
      <span 
        className={`cursor-help inline-block transition-all duration-150 hover:opacity-100 border-b border-dotted ${className}`}
        style={{
          borderColor: 'rgb(var(--color-text-muted) / 0.4)',
          opacity: 0.9,
        }}
      >
        {children}
      </span>
    </Tooltip>
  );
}

export default Tooltip;
