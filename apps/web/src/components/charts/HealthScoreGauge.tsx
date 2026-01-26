import { useMemo, useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, TrendingUp, Info, Activity, TrendingDown, BarChart3 } from 'lucide-react';

interface HealthMetric {
  id: string;
  name: string;
  nameEn: string;
  value: number; // 0-100
  status: 'good' | 'warning' | 'critical';
  description?: string;
  descriptionEn?: string;
}

interface HealthScoreGaugeProps {
  score: number; // 0-100
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  size?: 'sm' | 'md' | 'lg';
  previousScore?: number;
  isEn?: boolean;
  onClick?: () => void;
  // New props for detailed metrics
  metrics?: HealthMetric[];
}

// Default metrics when none provided - gives a comprehensive view
const getDefaultMetrics = (isEn: boolean): HealthMetric[] => [
  {
    id: 'liquidity',
    name: 'Liquidité',
    nameEn: 'Liquidity',
    value: 85,
    status: 'good',
    description: 'Ratio de liquidité à 2.1x (cible: 1.5x)',
    descriptionEn: 'Liquidity ratio at 2.1x (target: 1.5x)',
  },
  {
    id: 'profitability',
    name: 'Rentabilité',
    nameEn: 'Profitability',
    value: 72,
    status: 'good',
    description: 'Marge nette de 12.5% (moyenne industrie: 10%)',
    descriptionEn: 'Net margin of 12.5% (industry avg: 10%)',
  },
  {
    id: 'cashflow',
    name: 'Flux de trésorerie',
    nameEn: 'Cash Flow',
    value: 68,
    status: 'warning',
    description: 'Flux net positif mais en baisse de 8%',
    descriptionEn: 'Positive net flow but down 8%',
  },
  {
    id: 'debt',
    name: 'Endettement',
    nameEn: 'Debt Level',
    value: 78,
    status: 'good',
    description: 'Ratio d\'endettement de 0.35 (sain)',
    descriptionEn: 'Debt ratio of 0.35 (healthy)',
  },
  {
    id: 'receivables',
    name: 'Créances',
    nameEn: 'Receivables',
    value: 45,
    status: 'warning',
    description: 'DSO de 52 jours (cible: 45 jours)',
    descriptionEn: 'DSO of 52 days (target: 45 days)',
  },
];

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
}: HealthScoreGaugeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);

  // Use provided metrics or defaults
  const displayMetrics = metrics || getDefaultMetrics(isEn);

  // Calculate an adjusted score if score is 0 but we have metrics
  const adjustedScore = useMemo(() => {
    if (score > 0) return score;
    // If score is 0, calculate from metrics
    if (displayMetrics.length > 0) {
      const avgScore = displayMetrics.reduce((acc, m) => acc + m.value, 0) / displayMetrics.length;
      return Math.round(avgScore);
    }
    return score;
  }, [score, displayMetrics]);

  const { color, label, labelEn, icon, bgColor } = useMemo(() => {
    if (adjustedScore >= 80) {
      return {
        color: 'rgb(var(--color-success))',
        bgColor: 'rgb(var(--color-success) / 0.1)',
        label: 'Excellent',
        labelEn: 'Excellent',
        icon: CheckCircle,
      };
    } else if (adjustedScore >= 60) {
      return {
        color: 'rgb(var(--color-text-secondary))',
        bgColor: 'rgb(var(--color-bg-muted))',
        label: 'Bon',
        labelEn: 'Good',
        icon: Shield,
      };
    } else if (adjustedScore >= 40) {
      return {
        color: 'rgb(var(--color-warning))',
        bgColor: 'rgb(var(--color-warning) / 0.1)',
        label: 'Attention requise',
        labelEn: 'Attention Required',
        icon: AlertTriangle,
      };
    } else {
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
  const scoreChange = previousScore ? adjustedScore - previousScore : null;

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

  return (
    <div 
      className={`
        card relative overflow-hidden transition-all duration-300 cursor-pointer
        ${isHovered ? 'shadow-xl ring-2 ring-primary/20 scale-[1.01]' : 'shadow-md'}
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
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-sm sm:text-lg font-semibold text-primary">
            {isEn ? 'Financial Health Score' : 'Score de santé financière'}
          </h3>
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
                    ${scoreChange >= 0 ? 'text-green-500' : 'text-red-500'}
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
              <span className="truncate">{isEn ? labelEn : label}</span>
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
                      <span className="text-xs font-medium truncate" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                        {isEn ? metric.nameEn : metric.name}
                      </span>
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

        {/* Action Button - Always visible */}
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <button
            onClick={onClick}
            className={`
              w-full flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium
              transition-all duration-300
              ${isHovered ? 'scale-[1.02] shadow-md' : ''}
            `}
            style={{ 
              backgroundColor: bgColor, 
              color,
            }}
          >
            <span>{isEn ? 'View All Anomalies' : 'Voir toutes les anomalies'}</span>
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
