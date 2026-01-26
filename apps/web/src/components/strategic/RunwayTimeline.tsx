/**
 * Runway Timeline Component
 * 
 * Visual countdown showing cash runway with milestones
 */

import { useMemo } from 'react';
import { AlertTriangle, TrendingDown, Calendar, Target } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { RunwayAnalysis, Milestone } from '../../lib/strategicPlanning';
import { ChartTooltip } from '../charts/ChartTooltip';

interface RunwayTimelineProps {
  runway: RunwayAnalysis;
  milestones?: Milestone[];
  currentDate?: Date;
  onMilestoneClick?: (milestone: Milestone) => void;
}

export default function RunwayTimeline({
  runway,
  milestones = [],
  currentDate = new Date(),
  onMilestoneClick,
}: RunwayTimelineProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const zeroDate = new Date(runway.zeroDate);
  const daysUntilZero = Math.ceil((zeroDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Calculate progress percentage (0-100%)
  const maxRunwayMonths = 24; // Show up to 24 months
  const progressPercent = Math.min(100, (runway.runwayMonths / maxRunwayMonths) * 100);
  
  // Determine urgency color
  const getUrgencyColor = () => {
    if (runway.runwayMonths < 3) return 'rgb(var(--color-error))';
    if (runway.runwayMonths < 6) return 'rgb(var(--color-warning))';
    if (runway.runwayMonths < 12) return '#F59E0B';
    return 'rgb(var(--color-success))';
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  // Position milestones on timeline
  const positionedMilestones = useMemo(() => {
    const startDate = currentDate;
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + maxRunwayMonths);
    
    return milestones
      .filter(m => {
        const milestoneDate = new Date(m.date);
        return milestoneDate >= startDate && milestoneDate <= endDate;
      })
      .map(milestone => {
        const milestoneDate = new Date(milestone.date);
        const monthsFromStart = 
          (milestoneDate.getFullYear() - startDate.getFullYear()) * 12 +
          (milestoneDate.getMonth() - startDate.getMonth());
        const positionPercent = (monthsFromStart / maxRunwayMonths) * 100;
        
        return {
          ...milestone,
          positionPercent: Math.min(100, Math.max(0, positionPercent)),
        };
      });
  }, [milestones, currentDate]);
  
  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Cash Position */}
        <div 
          className="card p-4 sm:p-5 transition-all active:scale-[0.98] touch-manipulation"
          style={{
            background: 'linear-gradient(135deg, rgb(var(--color-primary-500) / 0.1) 0%, rgb(var(--color-primary-600) / 0.05) 100%)',
            border: '1px solid rgb(var(--color-primary-500) / 0.2)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Cash Position' : 'Position de trésorerie'}
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold break-words" style={{ color: 'rgb(var(--color-primary-500))' }}>
            {formatCurrency(runway.currentCash)}
          </p>
        </div>
        
        {/* Monthly Burn */}
        <div 
          className="card p-4 sm:p-5 transition-all active:scale-[0.98] touch-manipulation"
          style={{
            background: 'linear-gradient(135deg, rgb(var(--color-error) / 0.1) 0%, rgb(var(--color-error) / 0.05) 100%)',
            border: '1px solid rgb(var(--color-error) / 0.2)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Monthly Burn' : 'Brûlage mensuel'}
            </span>
            <TrendingDown className="w-4 h-4 flex-shrink-0" style={{ color: 'rgb(var(--color-error))' }} />
          </div>
          <p className="text-2xl sm:text-3xl font-bold break-words" style={{ color: 'rgb(var(--color-error))' }}>
            {formatCurrency(runway.monthlyBurnRate)}
          </p>
        </div>
        
        {/* Runway */}
        <div 
          className="card p-4 sm:p-5 transition-all active:scale-[0.98] touch-manipulation sm:col-span-2 md:col-span-1"
          style={{
            background: `linear-gradient(135deg, ${getUrgencyColor()}20 0%, ${getUrgencyColor()}10 100%)`,
            border: `1px solid ${getUrgencyColor()}30`,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Runway' : 'Autonomie'}
            </span>
            {runway.runwayMonths < 6 && (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: 'rgb(var(--color-warning))' }} />
            )}
          </div>
          <p className="text-2xl sm:text-3xl font-bold" style={{ color: getUrgencyColor() }}>
            {runway.runwayMonths.toFixed(1)} {isEn ? 'months' : 'mois'}
          </p>
          <p className="text-xs mt-1 font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {daysUntilZero > 0 ? `${daysUntilZero} ${isEn ? 'days' : 'jours'}` : isEn ? 'Past due' : 'Dépassé'}
          </p>
        </div>
      </div>
      
      {/* Timeline Visualization */}
      <div className="card p-4 sm:p-6" style={{
        background: 'linear-gradient(135deg, rgb(var(--color-surface)) 0%, rgb(var(--color-bg-muted)) 100%)',
      }}>
        <div className="space-y-3 sm:space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <h3 className="text-base sm:text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Runway Timeline' : 'Chronologie de l\'autonomie'}
            </h3>
            <div className="flex items-center gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 rounded-lg w-fit" style={{ 
              backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
              color: 'rgb(var(--color-primary-500))',
            }}>
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="font-medium whitespace-nowrap">
                {zeroDate.toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="relative">
            {/* Background Track */}
            <div
              className="h-12 sm:h-14 rounded-lg sm:rounded-xl relative overflow-hidden shadow-inner touch-none"
              style={{
                backgroundColor: 'rgb(var(--color-bg-muted))',
                background: 'linear-gradient(90deg, rgb(var(--color-success)) 0%, #F59E0B 50%, rgb(var(--color-error)) 100%)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              {/* Current Position Indicator */}
              <div
                className="absolute top-0 bottom-0 w-1 z-20 transition-all"
                style={{
                  left: `${progressPercent}%`,
                  backgroundColor: 'white',
                  boxShadow: '0 0 12px rgba(0,0,0,0.4), 0 0 24px ' + getUrgencyColor() + '40',
                }}
              >
                <div 
                  className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-3 flex items-center justify-center shadow-lg transition-all hover:scale-110"
                  style={{ 
                    borderColor: getUrgencyColor(),
                    boxShadow: `0 4px 12px ${getUrgencyColor()}60`,
                  }}
                >
                  <div 
                    className="w-2.5 h-2.5 rounded-full animate-pulse" 
                    style={{ backgroundColor: getUrgencyColor() }} 
                  />
                </div>
              </div>
              
              {/* Zero Date Marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 z-10"
                style={{
                  left: `${progressPercent}%`,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                }}
              />
              
              {/* Milestones */}
              {positionedMilestones.map((milestone, index) => {
                const milestoneDate = new Date(milestone.date);
                const isPast = milestoneDate < currentDate;
                const isCritical = milestoneDate <= zeroDate && milestoneDate > currentDate;
                
                return (
                  <div
                    key={milestone.id}
                    className="absolute top-full mt-2 cursor-pointer group"
                    style={{
                      left: `${milestone.positionPercent}%`,
                      transform: 'translateX(-50%)',
                    }}
                    onClick={() => onMilestoneClick?.(milestone)}
                  >
                    {/* Flag */}
                    <div
                      className="relative"
                      style={{
                        transform: milestone.positionPercent > 50 ? 'translateX(-100%)' : 'none',
                      }}
                    >
                      <div
                        className="w-0 h-0 border-l-8 border-r-8 border-b-8"
                        style={{
                          borderLeftColor: 'transparent',
                          borderRightColor: 'transparent',
                          borderBottomColor: isCritical 
                            ? 'rgb(var(--color-error))' 
                            : isPast 
                            ? 'rgb(var(--color-success))' 
                            : 'rgb(var(--color-primary-500))',
                        }}
                      />
                      <div
                        className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-xs font-medium whitespace-nowrap"
                        style={{
                          backgroundColor: isCritical 
                            ? 'rgb(var(--color-error))' 
                            : isPast 
                            ? 'rgb(var(--color-success))' 
                            : 'rgb(var(--color-primary-500))',
                          color: 'white',
                        }}
                      >
                        {isEn ? milestone.nameEn : milestone.name}
                      </div>
                    </div>
                    
                    {/* Date Label */}
                    <div className="text-xs text-center mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {milestoneDate.toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Labels */}
            <div className="flex justify-between mt-2 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              <span>{currentDate.toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { month: 'short', year: 'numeric' })}</span>
              <span className="font-medium" style={{ color: getUrgencyColor() }}>
                {isEn ? 'Zero Cash' : 'Trésorerie zéro'}
              </span>
              <span>
                {new Date(currentDate.getFullYear(), currentDate.getMonth() + maxRunwayMonths, 1)
                  .toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
          
          {/* Confidence Indicator */}
          <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Confidence Level' : 'Niveau de confiance'}:
            </span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
              <div
                className="h-full transition-all"
                style={{
                  width: `${runway.confidenceLevel}%`,
                  backgroundColor: runway.confidenceLevel > 70 
                    ? 'rgb(var(--color-success))' 
                    : runway.confidenceLevel > 50 
                    ? '#F59E0B' 
                    : 'rgb(var(--color-error))',
                }}
              />
            </div>
            <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text))' }}>
              {runway.confidenceLevel.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
      
      {/* Break-even Indicator */}
      {runway.breakEvenDate && (
        <div className="card p-4 flex items-center gap-3" style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}>
          <Target className="w-5 h-5" style={{ color: 'rgb(var(--color-success))' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Break-even Projected' : 'Point d\'équilibre prévu'}
            </p>
            <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {new Date(runway.breakEvenDate).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
