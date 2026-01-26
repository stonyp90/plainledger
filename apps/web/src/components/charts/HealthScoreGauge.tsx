import { useMemo, useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, TrendingUp, Info } from 'lucide-react';

interface HealthScoreGaugeProps {
  score: number; // 0-100
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  size?: 'sm' | 'md' | 'lg';
  previousScore?: number;
  isEn?: boolean;
  onClick?: () => void;
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
}: HealthScoreGaugeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  const { color, label, labelEn, icon, bgColor } = useMemo(() => {
    if (score >= 80) {
      return {
        color: 'rgb(var(--color-success))',
        bgColor: 'rgb(var(--color-success) / 0.1)',
        label: 'Excellent',
        labelEn: 'Excellent',
        icon: CheckCircle,
      };
    } else if (score >= 60) {
      return {
        color: 'rgb(var(--color-text-secondary))',
        bgColor: 'rgb(var(--color-bg-muted))',
        label: 'Bon',
        labelEn: 'Good',
        icon: Shield,
      };
    } else if (score >= 40) {
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
  }, [score]);

  const Icon = icon;
  const scoreChange = previousScore ? score - previousScore : null;

  const sizes = {
    sm: { gauge: 100, stroke: 8, fontSize: 'text-2xl', iconSize: 16 },
    md: { gauge: 140, stroke: 10, fontSize: 'text-4xl', iconSize: 20 },
    lg: { gauge: 180, stroke: 12, fontSize: 'text-5xl', iconSize: 24 },
  };

  const { gauge, stroke, fontSize, iconSize } = sizes[size];
  const radius = (gauge - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = ((100 - score) / 100) * circumference;

  const segments = [
    { id: 'critical', count: criticalCount, color: 'rgb(var(--color-error))', label: isEn ? 'Critical issues' : 'Problèmes critiques' },
    { id: 'warning', count: warningCount, color: 'rgb(var(--color-warning))', label: isEn ? 'Warnings' : 'Avertissements' },
    { id: 'info', count: infoCount, color: 'rgb(var(--color-info))', label: isEn ? 'Information' : 'Informations' },
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary">
            {isEn ? 'Financial Health Score' : 'Score de santé financière'}
          </h3>
          <div 
            className={`
              p-2 rounded-lg transition-all duration-300
              ${isHovered ? 'scale-110 rotate-12' : ''}
            `}
            style={{ backgroundColor: bgColor }}
          >
            <Icon style={{ color, width: iconSize, height: iconSize }} />
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Gauge */}
          <div 
            className={`relative transition-transform duration-300 ${isHovered ? 'scale-105' : ''}`} 
            style={{ width: gauge, height: gauge }}
          >
            <svg 
              viewBox={`0 0 ${gauge} ${gauge}`}
              className="transform -rotate-90"
            >
              {/* Background circle with subtle animation */}
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
              
              {/* Progress circle with glow effect */}
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
            
            {/* Score text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span 
                className={`${fontSize} font-bold tabular-nums transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`}
                style={{ color }}
              >
                {score}
              </span>
              <span className="text-xs text-muted">/ 100</span>
              
              {/* Score change indicator */}
              {scoreChange !== null && (
                <div 
                  className={`
                    flex items-center gap-0.5 text-xs mt-1 transition-all duration-300
                    ${scoreChange >= 0 ? 'text-green-500' : 'text-red-500'}
                    ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
                  `}
                >
                  <TrendingUp className={`w-3 h-3 ${scoreChange < 0 ? 'rotate-180' : ''}`} />
                  <span>{scoreChange >= 0 ? '+' : ''}{scoreChange}</span>
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="flex-1 space-y-3">
            <div 
              className={`
                text-sm font-medium px-3 py-1.5 rounded-full inline-flex items-center gap-2
                transition-all duration-300
                ${isHovered ? 'scale-105 shadow-md' : ''}
              `}
              style={{ backgroundColor: bgColor, color }}
            >
              <Icon className="w-4 h-4" />
              {isEn ? labelEn : label}
            </div>
            
            <div className="space-y-2">
              {segments.map((segment) => segment.count > 0 && (
                <div 
                  key={segment.id}
                  className={`
                    flex items-center gap-2 p-2 rounded-lg transition-all duration-200 cursor-pointer
                    ${hoveredSegment === segment.id ? 'bg-muted scale-[1.02]' : 'hover:bg-muted/50'}
                  `}
                  onMouseEnter={() => setHoveredSegment(segment.id)}
                  onMouseLeave={() => setHoveredSegment(null)}
                >
                  <span 
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: segment.color }}
                  />
                  <span className="text-sm" style={{ color: segment.color }}>
                    {segment.count} {segment.label}
                  </span>
                  {hoveredSegment === segment.id && (
                    <Info className="w-3 h-3 ml-auto" style={{ color: segment.color }} />
                  )}
                </div>
              ))}
              
              {criticalCount === 0 && warningCount === 0 && infoCount === 0 && (
                <div 
                  className={`
                    flex items-center gap-2 p-2 rounded-lg transition-all duration-200
                    ${isHovered ? 'bg-green-50 dark:bg-green-900/20' : ''}
                  `}
                >
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-sm text-success">
                    {isEn ? 'No anomalies detected' : 'Aucune anomalie détectée'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Button - Always visible */}
        <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <button
            onClick={onClick}
            className={`
              w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
              transition-all duration-300
              ${isHovered ? 'scale-[1.02] shadow-md' : ''}
            `}
            style={{ 
              backgroundColor: bgColor, 
              color,
            }}
          >
            <span>{isEn ? 'View All Anomalies' : 'Voir toutes les anomalies'}</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
