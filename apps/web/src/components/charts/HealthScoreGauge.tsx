import { useMemo, useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, TrendingUp, Info, Activity, TrendingDown, BarChart3, Building2, ChevronDown } from 'lucide-react';
import { LabelTooltip } from '../Tooltip';
import { ChartDataState } from './ChartDataState';
import { isFiniteNumber } from '../../lib/chartDataValidation';

interface HealthMetric {
  id: string;
  name: string;
  nameEn: string;
  value: number; // 0-100
  status: 'good' | 'warning' | 'critical';
  description?: string;
  descriptionEn?: string;
}

interface AnomalySummary {
  id: string;
  title: string;
  severity: 'critical' | 'warning' | 'info';
  description?: string;
}

interface HealthScoreGaugeProps {
  score: number; // 0-100; zero is an observed score, not a missing value
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  size?: 'sm' | 'md' | 'lg';
  previousScore?: number;
  isEn?: boolean;
  onClick?: () => void;
  // New props for detailed metrics
  metrics?: HealthMetric[];
  // New props for merged Top Risks section
  topRisks?: string[];
  // Anomaly summaries for display
  anomalies?: AnomalySummary[];
  // Industry info
  industry?: { id?: string; name: string; nameEn: string };
  // Whether to show industry-specific KPI metrics (default: false)
  showIndustryMetrics?: boolean;
}

export default function HealthScoreGauge({
  score,
  criticalCount,
  warningCount,
  infoCount,
  size = 'md',
  previousScore,
  isEn = false,
  onClick,
  metrics,
  topRisks,
  anomalies,
  industry,
  showIndustryMetrics = false,
}: HealthScoreGaugeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);

  // Only display supplied financial metrics. Zero is a valid observed score.
  const displayMetrics = Array.isArray(metrics) ? metrics : [];
  const adjustedScore = score;

  const { color, label, labelEn, icon, bgColor } = useMemo(() => {
    if (adjustedScore >= 80) {
      // Excellent - Bright Green
      return {
        color: 'rgb(var(--color-success))',
        bgColor: 'rgb(var(--color-success) / 0.1)',
        label: 'Excellent',
        labelEn: 'Excellent',
        icon: CheckCircle,
      };
    } else if (adjustedScore >= 60) {
      // Good - Green (not gray)
      return {
        color: 'rgb(34, 197, 94)', // green-500
        bgColor: 'rgb(34, 197, 94, 0.1)',
        label: 'Bon',
        labelEn: 'Good',
        icon: Shield,
      };
    } else if (adjustedScore >= 40) {
      // Warning - Orange/Yellow
      return {
        color: 'rgb(var(--color-warning))',
        bgColor: 'rgb(var(--color-warning) / 0.1)',
        label: 'Attention requise',
        labelEn: 'Attention Required',
        icon: AlertTriangle,
      };
    } else {
      // Critical - Red
      return {
        color: 'rgb(var(--color-error))',
        bgColor: 'rgb(var(--color-error) / 0.1)',
        label: 'Critique',
        labelEn: 'Critical',
        icon: XCircle,
      };
    }
  }, [adjustedScore]);

  const Icon = icon;
  const scoreChange = previousScore !== undefined ? adjustedScore - previousScore : null;

  // Responsive gauge sizes
  const sizes = {
    sm: { gauge: 90, gaugeSm: 80, stroke: 8, fontSize: 'text-xl sm:text-2xl', iconSize: 14 },
    md: { gauge: 140, gaugeSm: 110, stroke: 10, fontSize: 'text-3xl sm:text-4xl', iconSize: 18 },
    lg: { gauge: 180, gaugeSm: 140, stroke: 12, fontSize: 'text-4xl sm:text-5xl', iconSize: 22 },
  };

  const { gauge, gaugeSm, stroke, fontSize, iconSize } = sizes[size];
  const radius = (gauge - stroke) / 2;
  const radiusSm = (gaugeSm - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const circumferenceSm = 2 * Math.PI * radiusSm;
  const progress = ((100 - adjustedScore) / 100) * circumference;
  const progressSm = ((100 - adjustedScore) / 100) * circumferenceSm;

  const segments = [
    { id: 'critical', count: criticalCount, color: 'rgb(var(--color-error))', label: isEn ? 'Critical issues' : 'Critiques', labelFull: isEn ? 'Critical issues' : 'Problèmes critiques' },
    { id: 'warning', count: warningCount, color: 'rgb(var(--color-warning))', label: isEn ? 'Warnings' : 'Avertissements', labelFull: isEn ? 'Warnings' : 'Avertissements' },
    { id: 'info', count: infoCount, color: 'rgb(var(--color-info))', label: 'Info', labelFull: isEn ? 'Information' : 'Informations' },
  ];

  const validScore = (value: unknown) => isFiniteNumber(value) && value >= 0 && value <= 100;
  if (!validScore(score) || (previousScore !== undefined && !validScore(previousScore)) ||
      ![criticalCount, warningCount, infoCount].every(count => Number.isInteger(count) && count >= 0) ||
      (metrics !== undefined && !Array.isArray(metrics)) ||
      displayMetrics.some(metric => !metric || !validScore(metric.value) || !['good', 'warning', 'critical'].includes(metric.status))) {
    return <ChartDataState title={isEn ? 'Financial health' : 'Santé financière'} issue="invalid" isEn={isEn} />;
  }

  return (
    <div 
      className={`
        card relative overflow-hidden transition-all duration-300 cursor-pointer
        ${isHovered ? 'shadow-xl ring-2 ring-primary/20 scale-[1.005]' : 'shadow-md'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setHoveredSegment(null); }}
      onClick={onClick}
    >
      {/* Animated gradient background on hover */}
      <div 
        className="absolute inset-0 opacity-0 transition-opacity duration-500 pointer-events-none"
        style={{ 
          opacity: isHovered ? 0.05 : 0,
          background: `radial-gradient(circle at center, ${color}, transparent 70%)`,
        }}
      />

      <div className="relative z-10">
        {/* Header with title and industry badge */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h3 className="text-sm sm:text-lg font-semibold text-primary">
              {isEn ? 'Financial Health Score' : 'Score de santé financière'}
            </h3>
            {industry && (
              <div 
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs"
                style={{ 
                  backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                  color: 'rgb(var(--color-primary-600))',
                }}
                title={isEn ? 'Industry-specific benchmarks applied. More industries available.' : 'Benchmarks spécifiques à l\'industrie appliqués. Plus d\'industries disponibles.'}
              >
                <Building2 className="w-3 h-3" />
                <span>{isEn ? industry.nameEn : industry.name}</span>
              </div>
            )}
          </div>
          <div 
            className={`
              p-1.5 sm:p-2 rounded-lg transition-all duration-300
              ${isHovered ? 'scale-110 rotate-12' : ''}
            `}
            style={{ backgroundColor: bgColor }}
          >
            <Icon style={{ color, width: iconSize, height: iconSize }} className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Main content grid - responsive two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Left side: Gauge and summary */}
          <div>
            <div className="flex items-center gap-3 sm:gap-6">
              {/* Gauge - Responsive */}
              <div 
                className={`relative transition-transform duration-300 flex-shrink-0 ${isHovered ? 'scale-105' : ''}`} 
              >
                {/* Mobile gauge */}
                <svg 
                  viewBox={`0 0 ${gaugeSm} ${gaugeSm}`}
                  className="transform -rotate-90 sm:hidden"
                  style={{ width: gaugeSm, height: gaugeSm }}
                >
                  <circle
                    cx={gaugeSm / 2}
                    cy={gaugeSm / 2}
                    r={radiusSm}
                    fill="none"
                    stroke="rgb(var(--color-bg-emphasis))"
                    strokeWidth={stroke - 2}
                    className={isHovered ? 'animate-pulse' : ''}
                    style={{ opacity: isHovered ? 0.7 : 1 }}
                  />
                  <circle
                    cx={gaugeSm / 2}
                    cy={gaugeSm / 2}
                    r={radiusSm}
                    fill="none"
                    stroke={color}
                    strokeWidth={stroke - 2}
                    strokeLinecap="round"
                    strokeDasharray={circumferenceSm}
                    strokeDashoffset={progressSm}
                    style={{ 
                      transition: 'stroke-dashoffset 1s ease-in-out, filter 0.3s',
                      filter: isHovered ? `drop-shadow(0 0 8px ${color})` : 'none',
                    }}
                  />
                </svg>
                
                {/* Desktop gauge */}
                <svg 
                  viewBox={`0 0 ${gauge} ${gauge}`}
                  className="transform -rotate-90 hidden sm:block"
                  style={{ width: gauge, height: gauge }}
                >
                  <circle
                    cx={gauge / 2}
                    cy={gauge / 2}
                    r={radius}
                    fill="none"
                    stroke="rgb(var(--color-bg-emphasis))"
                    strokeWidth={stroke}
                    className={isHovered ? 'animate-pulse' : ''}
                    style={{ opacity: isHovered ? 0.7 : 1 }}
                  />
                  <circle
                    cx={gauge / 2}
                    cy={gauge / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={progress}
                    style={{ 
                      transition: 'stroke-dashoffset 1s ease-in-out, filter 0.3s',
                      filter: isHovered ? `drop-shadow(0 0 8px ${color})` : 'none',
                    }}
                  />
                </svg>
                
                {/* Score text - Centered over gauge */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span 
                    className={`${fontSize} font-bold tabular-nums transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`}
                    style={{ color }}
                  >
                    {adjustedScore}
                  </span>
                  <span className="text-[10px] sm:text-xs text-muted">/ 100</span>
                  
                  {/* Score change indicator */}
                  {scoreChange !== null && (
                    <div 
                      className={`
                        flex items-center gap-0.5 text-[10px] sm:text-xs mt-1 transition-all duration-300
                        ${scoreChange >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}
                        ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
                      `}
                    >
                      <TrendingUp className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${scoreChange < 0 ? 'rotate-180' : ''}`} />
                      <span>{scoreChange >= 0 ? '+' : ''}{scoreChange}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="flex-1 min-w-0 space-y-2 sm:space-y-3">
                <div 
                  className={`
                    text-xs sm:text-sm font-medium px-2 sm:px-3 py-1 sm:py-1.5 rounded-full inline-flex items-center gap-1.5 sm:gap-2
                    transition-all duration-300
                    ${isHovered ? 'scale-105 shadow-md' : ''}
                  `}
                  style={{ backgroundColor: bgColor, color }}
                >
                  <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                  <LabelTooltip label={isEn ? labelEn : label}>
                    <span className="truncate">{isEn ? labelEn : label}</span>
                  </LabelTooltip>
                </div>
                
                <div className="space-y-1.5 sm:space-y-2">
                  {segments.map((segment) => segment.count > 0 && (
                    <div 
                      key={segment.id}
                      className={`
                        flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg transition-all duration-200 cursor-pointer
                        ${hoveredSegment === segment.id ? 'bg-muted scale-[1.02]' : 'hover:bg-muted/50'}
                      `}
                      onMouseEnter={() => setHoveredSegment(segment.id)}
                      onMouseLeave={() => setHoveredSegment(null)}
                      title={segment.labelFull}
                    >
                      <span 
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-pulse flex-shrink-0"
                        style={{ backgroundColor: segment.color }}
                      />
                      <span className="text-xs sm:text-sm truncate" style={{ color: segment.color }}>
                        <span className="font-medium">{segment.count}</span> <span className="hidden xs:inline">{segment.label}</span>
                      </span>
                      {hoveredSegment === segment.id && (
                        <Info className="w-3 h-3 ml-auto flex-shrink-0 hidden sm:block" style={{ color: segment.color }} />
                      )}
                    </div>
                  ))}
                  
                  {criticalCount === 0 && warningCount === 0 && infoCount === 0 && (
                    <div 
                      className={`
                        flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg transition-all duration-200
                        ${isHovered ? 'bg-green-50 dark:bg-green-900/20' : ''}
                      `}
                    >
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-success flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-success truncate">
                        {isEn ? 'No anomalies' : 'Aucune anomalie'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Metrics Breakdown */}
            {displayMetrics.length > 0 && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                  <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'Key Metrics' : 'Métriques clés'}
                  </h4>
                </div>
                <div className="space-y-2.5">
                  {displayMetrics.map((metric) => (
                    <div
                      key={metric.id}
                      className={`
                        relative group/metric cursor-pointer rounded-lg transition-all duration-200
                        ${hoveredMetric === metric.id ? 'bg-muted' : 'hover:bg-muted/50'}
                      `}
                      onMouseEnter={() => setHoveredMetric(metric.id)}
                      onMouseLeave={() => setHoveredMetric(null)}
                    >
                      <div className="flex items-center justify-between px-2 py-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor:
                                metric.status === 'good'
                                  ? 'rgb(var(--color-success))'
                                  : metric.status === 'warning'
                                  ? 'rgb(var(--color-warning))'
                                  : 'rgb(var(--color-error))',
                            }}
                          />
                          <LabelTooltip label={isEn ? metric.nameEn : metric.name}>
                            <span className="text-xs font-medium truncate" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                              {isEn ? metric.nameEn : metric.name}
                            </span>
                          </LabelTooltip>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-bold tabular-nums"
                            style={{
                              color:
                                metric.status === 'good'
                                  ? 'rgb(var(--color-success))'
                                  : metric.status === 'warning'
                                  ? 'rgb(var(--color-warning))'
                                  : 'rgb(var(--color-error))',
                            }}
                          >
                            {metric.value}%
                          </span>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="px-2 pb-1.5">
                        <div 
                          className="h-1 rounded-full overflow-hidden"
                          style={{ backgroundColor: 'rgb(var(--color-bg-emphasis))' }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${metric.value}%`,
                              backgroundColor:
                                metric.status === 'good'
                                  ? 'rgb(var(--color-success))'
                                  : metric.status === 'warning'
                                  ? 'rgb(var(--color-warning))'
                                  : 'rgb(var(--color-error))',
                            }}
                          />
                        </div>
                      </div>
                      {/* Tooltip on hover */}
                      {hoveredMetric === metric.id && (metric.description || metric.descriptionEn) && (
                        <div 
                          className="absolute left-0 right-0 -bottom-8 z-10 px-2 py-1 text-[10px] text-center rounded shadow-lg"
                          style={{ 
                            backgroundColor: 'rgb(var(--color-surface))',
                            color: 'rgb(var(--color-text-muted))',
                            border: '1px solid rgb(var(--color-border))',
                          }}
                        >
                          {isEn ? metric.descriptionEn : metric.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right side: Top Risks */}
          <div className="lg:border-l lg:pl-6 flex flex-col" style={{ borderColor: 'rgb(var(--color-border))' }}>
            {/* Header with title and badges - responsive layout */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <h4 className="text-sm font-semibold whitespace-nowrap" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Top Risks' : 'Risques principaux'}
              </h4>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {criticalCount > 0 && (
                  <span 
                    className="inline-flex items-center px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-error) / 0.1)',
                      color: 'rgb(var(--color-error))'
                    }}
                  >
                    {criticalCount} {isEn ? 'critical' : 'critiques'}
                  </span>
                )}
                {warningCount > 0 && (
                  <span 
                    className="inline-flex items-center px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-warning) / 0.1)',
                      color: 'rgb(var(--color-warning))'
                    }}
                  >
                    {warningCount} {isEn ? 'warnings' : 'avertissements'}
                  </span>
                )}
              </div>
            </div>
            
            {(() => {
              // Get critical and warning anomalies to display
              const criticalAnomalies = anomalies?.filter(a => a.severity === 'critical').slice(0, 3) || [];
              const warningAnomalies = anomalies?.filter(a => a.severity === 'warning').slice(0, Math.max(0, 3 - criticalAnomalies.length)) || [];
              const displayAnomalies = [...criticalAnomalies, ...warningAnomalies];
              
              // Also consider topRisks as fallback
              const hasRisksToShow = displayAnomalies.length > 0 || (topRisks && topRisks.length > 0);
              
              if (hasRisksToShow) {
                return (
                  <div className="flex flex-col h-full">
                    {/* Risk cards - scrollable on mobile if needed, full height on desktop */}
                    <div className="space-y-2.5 sm:space-y-3 flex-1 overflow-y-auto max-h-[280px] lg:max-h-none pr-1">
                      {displayAnomalies.length > 0 ? (
                        displayAnomalies.map((anomaly, idx) => (
                          <div 
                            key={anomaly.id}
                            className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl border transition-all hover:shadow-sm"
                            style={{ 
                              borderColor: anomaly.severity === 'critical' 
                                ? 'rgb(var(--color-error) / 0.3)' 
                                : 'rgb(var(--color-warning) / 0.3)',
                              backgroundColor: anomaly.severity === 'critical'
                                ? 'rgb(var(--color-error) / 0.03)'
                                : 'rgb(var(--color-warning) / 0.03)',
                            }}
                          >
                            {/* Number badge */}
                            <div 
                              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                              style={{ 
                                backgroundColor: anomaly.severity === 'critical' 
                                  ? 'rgb(var(--color-error) / 0.15)' 
                                  : 'rgb(var(--color-warning) / 0.15)',
                              }}
                            >
                              <span 
                                className="text-[10px] sm:text-xs font-bold"
                                style={{ 
                                  color: anomaly.severity === 'critical' 
                                    ? 'rgb(var(--color-error))' 
                                    : 'rgb(var(--color-warning))' 
                                }}
                              >
                                {idx + 1}
                              </span>
                            </div>
                            {/* Content - fully visible, no truncation */}
                            <div className="min-w-0 flex-1">
                              <p 
                                className="font-semibold text-xs sm:text-sm leading-snug break-words"
                                style={{ 
                                  color: anomaly.severity === 'critical' 
                                    ? 'rgb(var(--color-error))' 
                                    : 'rgb(var(--color-warning))' 
                                }}
                              >
                                {anomaly.title}
                              </p>
                              {anomaly.description && (
                                <p 
                                  className="text-[11px] sm:text-xs mt-1 leading-relaxed break-words"
                                  style={{ color: 'rgb(var(--color-text-muted))' }}
                                >
                                  {anomaly.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        topRisks?.slice(0, 3).map((risk, idx) => (
                          <div 
                            key={idx}
                            className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl border transition-all hover:shadow-sm"
                            style={{ 
                              borderColor: idx < 2 ? 'rgb(var(--color-error) / 0.3)' : 'rgb(var(--color-warning) / 0.3)',
                              backgroundColor: idx < 2 ? 'rgb(var(--color-error) / 0.03)' : 'rgb(var(--color-warning) / 0.03)',
                            }}
                          >
                            <div 
                              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                              style={{ 
                                backgroundColor: idx < 2 ? 'rgb(var(--color-error) / 0.15)' : 'rgb(var(--color-warning) / 0.15)',
                              }}
                            >
                              <span 
                                className="text-[10px] sm:text-xs font-bold"
                                style={{ color: idx < 2 ? 'rgb(var(--color-error))' : 'rgb(var(--color-warning))' }}
                              >
                                {idx + 1}
                              </span>
                            </div>
                            <p 
                              className="text-xs sm:text-sm leading-relaxed break-words"
                              style={{ color: 'rgb(var(--color-text-secondary))' }}
                            >
                              {risk}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                    
                    {/* Scroll to anomalies button */}
                    <button
                      onClick={onClick}
                      className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all hover:scale-[1.01] hover:shadow-sm border"
                      style={{ 
                        backgroundColor: 'rgb(var(--color-primary-500) / 0.08)',
                        borderColor: 'rgb(var(--color-primary-500) / 0.2)',
                        color: 'rgb(var(--color-primary-600))',
                      }}
                    >
                      <span>{isEn ? 'View all anomalies' : 'Voir toutes les anomalies'}</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                );
              } else if (criticalCount > 0 || warningCount > 0) {
                return (
                  <div className="flex flex-col items-center justify-center flex-1 min-h-[8rem] lg:min-h-[10rem]">
                    <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 mb-2" style={{ color: 'rgb(var(--color-warning))' }} />
                    <p className="text-xs sm:text-sm font-medium text-center" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn 
                        ? `${criticalCount + warningCount} issue${criticalCount + warningCount > 1 ? 's' : ''} found`
                        : `${criticalCount + warningCount} problème${criticalCount + warningCount > 1 ? 's' : ''} trouvé${criticalCount + warningCount > 1 ? 's' : ''}`
                      }
                    </p>
                    <button
                      onClick={onClick}
                      className="mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all hover:scale-[1.02] border"
                      style={{ 
                        backgroundColor: 'rgb(var(--color-primary-500) / 0.08)',
                        borderColor: 'rgb(var(--color-primary-500) / 0.2)',
                        color: 'rgb(var(--color-primary-600))',
                      }}
                    >
                      <span>{isEn ? 'View details' : 'Voir les détails'}</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                );
              } else {
                return (
                  <div className="flex-1 flex items-center justify-center min-h-[8rem] lg:min-h-[10rem]">
                    <div className="text-center">
                      <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2" style={{ color: 'rgb(var(--color-success))' }} />
                      <p className="text-xs sm:text-sm font-medium" style={{ color: 'rgb(var(--color-success))' }}>
                        {isEn ? 'No critical risks' : 'Aucun risque critique'}
                      </p>
                      <p className="text-[10px] sm:text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        {isEn ? 'Your financial data looks healthy' : 'Vos données financières sont saines'}
                      </p>
                    </div>
                  </div>
                );
              }
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
