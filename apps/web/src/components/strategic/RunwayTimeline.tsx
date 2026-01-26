/**
 * Runway Timeline Component
 * 
 * Clean, professional cash runway visualization
 */

import { useMemo } from 'react';
import { AlertTriangle, TrendingDown, Calendar, Target, DollarSign, Clock, ArrowRight } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { RunwayAnalysis, Milestone } from '../../lib/strategicPlanning';

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
  
  const maxRunwayMonths = 24;
  const progressPercent = Math.min(100, (runway.runwayMonths / maxRunwayMonths) * 100);
  
  const getUrgencyLevel = () => {
    if (runway.runwayMonths < 3) return { color: '#EF4444', bg: '#FEF2F2', label: isEn ? 'Critical' : 'Critique' };
    if (runway.runwayMonths < 6) return { color: '#F59E0B', bg: '#FFFBEB', label: isEn ? 'Warning' : 'Attention' };
    if (runway.runwayMonths < 12) return { color: '#F59E0B', bg: '#FFFBEB', label: isEn ? 'Monitor' : 'Surveiller' };
    return { color: '#10B981', bg: '#F0FDF4', label: isEn ? 'Healthy' : 'Sain' };
  };
  
  const urgency = getUrgencyLevel();
  
  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', {
        style: 'currency',
        currency: 'CAD',
        maximumFractionDigits: 1,
        notation: 'compact',
      }).format(value);
    }
    return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Generate month markers for timeline
  const monthMarkers = useMemo(() => {
    const markers: Array<{ month: number; label: string; position: number }> = [];
    for (let i = 0; i <= maxRunwayMonths; i += 3) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() + i);
      markers.push({
        month: i,
        label: i === 0 ? (isEn ? 'Now' : 'Maint.') : `${i}mo`,
        position: (i / maxRunwayMonths) * 100,
      });
    }
    return markers;
  }, [currentDate, isEn]);

  // Position milestones on timeline
  const positionedMilestones = useMemo(() => {
    return milestones
      .filter(m => {
        const mDate = new Date(m.date);
        const endDate = new Date(currentDate);
        endDate.setMonth(endDate.getMonth() + maxRunwayMonths);
        return mDate >= currentDate && mDate <= endDate;
      })
      .map(milestone => {
        const mDate = new Date(milestone.date);
        const monthsFromNow = (mDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        return {
          ...milestone,
          position: Math.min(100, (monthsFromNow / maxRunwayMonths) * 100),
        };
      })
      .slice(0, 5); // Max 5 milestones to avoid clutter
  }, [milestones, currentDate]);
  
  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Cash Position */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <DollarSign className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Cash' : 'Trésorerie'}
            </span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-primary-600))' }}>
            {formatCurrency(runway.currentCash)}
          </p>
        </div>
        
        {/* Monthly Burn */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'rgb(var(--color-error) / 0.1)' }}
            >
              <TrendingDown className="w-4 h-4" style={{ color: 'rgb(var(--color-error))' }} />
            </div>
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Burn Rate' : 'Burn Rate'}
            </span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-error))' }}>
            {formatCurrency(runway.monthlyBurnRate)}
            <span className="text-sm font-normal">/mo</span>
          </p>
        </div>
        
        {/* Runway */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${urgency.color}15` }}
            >
              <Clock className="w-4 h-4" style={{ color: urgency.color }} />
            </div>
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Runway' : 'Autonomie'}
            </span>
            {runway.runwayMonths < 6 && (
              <AlertTriangle className="w-3.5 h-3.5 ml-auto" style={{ color: urgency.color }} />
            )}
          </div>
          <p className="text-2xl font-bold" style={{ color: urgency.color }}>
            {runway.runwayMonths === Infinity ? '∞' : runway.runwayMonths.toFixed(1)}
            <span className="text-sm font-normal ml-1">{isEn ? 'months' : 'mois'}</span>
          </p>
        </div>
        
        {/* Zero Date */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
            >
              <Calendar className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
            </div>
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Zero Date' : 'Date zéro'}
            </span>
          </div>
          <p className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {runway.runwayMonths === Infinity ? (
              <span className="text-sm">{isEn ? 'Sustainable' : 'Durable'}</span>
            ) : (
              zeroDate.toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })
            )}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {daysUntilZero > 0 ? `${daysUntilZero} ${isEn ? 'days' : 'jours'}` : ''}
          </p>
        </div>
      </div>
      
      {/* Timeline Visualization */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Runway Timeline' : 'Chronologie du runway'}
          </h3>
          <span 
            className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ backgroundColor: `${urgency.color}15`, color: urgency.color }}
          >
            {urgency.label}
          </span>
        </div>
        
        {/* Timeline Track */}
        <div className="relative mt-8 mb-6">
          {/* Background track with gradient */}
          <div 
            className="h-3 rounded-full relative overflow-hidden"
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
          >
            {/* Gradient fill */}
            <div 
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: '100%',
                background: 'linear-gradient(to right, #10B981 0%, #10B981 25%, #F59E0B 50%, #EF4444 100%)',
                opacity: 0.2,
              }}
            />
            
            {/* Current position indicator */}
            <div 
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: urgency.color,
              }}
            />
          </div>
          
          {/* Current position marker */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 transition-all duration-500"
            style={{ left: `${progressPercent}%` }}
          >
            <div 
              className="w-5 h-5 rounded-full border-3 bg-white -ml-2.5 shadow-lg"
              style={{ 
                borderColor: urgency.color,
                boxShadow: `0 0 0 4px ${urgency.color}20`,
              }}
            />
          </div>
          
          {/* Month markers */}
          <div className="absolute -bottom-6 left-0 right-0 flex justify-between">
            {monthMarkers.map((marker) => (
              <div 
                key={marker.month}
                className="text-[10px] text-center"
                style={{ 
                  color: marker.position <= progressPercent ? urgency.color : 'rgb(var(--color-text-muted))',
                  fontWeight: marker.month === 0 ? 600 : 400,
                }}
              >
                {marker.label}
              </div>
            ))}
          </div>
          
          {/* Zero cash marker */}
          {runway.runwayMonths < maxRunwayMonths && (
            <div 
              className="absolute -top-7 text-center"
              style={{ left: `${progressPercent}%`, transform: 'translateX(-50%)' }}
            >
              <span 
                className="text-[10px] font-semibold px-2 py-0.5 rounded whitespace-nowrap"
                style={{ backgroundColor: `${urgency.color}15`, color: urgency.color }}
              >
                {isEn ? 'Zero Cash' : 'Tréso. zéro'}
              </span>
            </div>
          )}
        </div>
        
        {/* Milestones */}
        {positionedMilestones.length > 0 && (
          <div className="mt-10 pt-4 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <h4 className="text-xs font-semibold mb-3" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Key Milestones' : 'Jalons clés'}
            </h4>
            <div className="space-y-2">
              {positionedMilestones.map((milestone) => {
                const mDate = new Date(milestone.date);
                const isPast = mDate < currentDate;
                const isCritical = mDate <= zeroDate && mDate > currentDate;
                
                return (
                  <button
                    key={milestone.id}
                    onClick={() => onMilestoneClick?.(milestone)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left"
                    style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}
                  >
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ 
                        backgroundColor: isCritical ? '#EF4444' : isPast ? '#10B981' : 'rgb(var(--color-primary-500))',
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>
                        {isEn ? milestone.nameEn : milestone.name}
                      </p>
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {mDate.toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { month: 'short', day: 'numeric' })}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
                  </button>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Confidence */}
        <div className="mt-4 pt-4 border-t flex items-center gap-3" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Forecast Confidence' : 'Confiance prévision'}
          </span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${runway.confidenceLevel}%`,
                backgroundColor: runway.confidenceLevel > 70 ? '#10B981' : runway.confidenceLevel > 50 ? '#F59E0B' : '#EF4444',
              }}
            />
          </div>
          <span className="text-xs font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {runway.confidenceLevel.toFixed(0)}%
          </span>
        </div>
      </div>
      
      {/* Break-even Indicator */}
      {runway.breakEvenDate && (
        <div 
          className="card p-4 flex items-center gap-3"
          style={{ backgroundColor: 'rgb(var(--color-success) / 0.05)', border: '1px solid rgb(var(--color-success) / 0.2)' }}
        >
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}
          >
            <Target className="w-5 h-5" style={{ color: 'rgb(var(--color-success))' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Break-even Projected' : 'Point d\'équilibre prévu'}
            </p>
            <p className="text-xs" style={{ color: 'rgb(var(--color-success))' }}>
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
