import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/keycloak';
import ThemeToggle from '../components/ThemeToggle';
import { LanguageToggle, useI18n } from '../lib/i18n';
import IndustryKPISection from '../components/IndustryKPISection';
import DemoModal from '../components/DemoModal';
import { 
  ArrowRight,
  Check,
  Shield,
  Menu,
  X,
  Database,
  Sparkles,
  FileCheck,
  Layers,
  Zap,
  TrendingUp,
  Eye,
  RefreshCw,
  ArrowDownRight,
  Brain,
  Calendar,
  Target,
  BarChart3,
  Info,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

// =====================================================
// ANIMATED COUNTER HOOK (from DemoModal)
// =====================================================

function useAnimatedCounter(target: number, duration: number = 1500, delay: number = 0, trigger: boolean = true) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (!trigger) return;
    setCount(0);
    
    const timeoutId = setTimeout(() => {
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
        setCount(Math.floor(target * eased));
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    }, delay);
    
    return () => clearTimeout(timeoutId);
  }, [target, duration, delay, trigger]);
  
  return count;
}

// =====================================================
// INTERSECTION OBSERVER HOOK
// =====================================================

function useInView(options?: IntersectionObserverInit) {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
      }
    }, { threshold: 0.2, ...options });
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  return { ref, isInView };
}

// =====================================================
// ANIMATED SPARKLINE COMPONENT (from DemoModal)
// =====================================================

function AnimatedSparkline({ 
  data, 
  color, 
  showArea = true,
  delay = 300,
  width = 120,
  height = 40,
  trigger = true
}: { 
  data: number[]; 
  color: string;
  showArea?: boolean;
  delay?: number;
  width?: number;
  height?: number;
  trigger?: boolean;
}) {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (!trigger) return;
    setProgress(0);
    
    const timeoutId = setTimeout(() => {
      const startTime = Date.now();
      const duration = 1500;
      
      const animateProgress = () => {
        const elapsed = Date.now() - startTime;
        const p = Math.min(elapsed / duration, 1);
        setProgress(p);
        
        if (p < 1) {
          requestAnimationFrame(animateProgress);
        }
      };
      
      requestAnimationFrame(animateProgress);
    }, delay);
    
    return () => clearTimeout(timeoutId);
  }, [data, delay, trigger]);
  
  const points = useMemo(() => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    return data.map((value, i) => ({
      x: (i / (data.length - 1)) * width,
      y: height - ((value - min) / range) * (height - 8) - 4,
    }));
  }, [data, width, height]);
  
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`sparkline-gradient-landing-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {showArea && (
        <path
          d={areaPath}
          fill={`url(#sparkline-gradient-landing-${color.replace(/[^a-z0-9]/gi, '')})`}
          style={{ opacity: progress }}
        />
      )}
      
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: linePath.length,
          strokeDashoffset: linePath.length * (1 - progress),
          transition: 'stroke-dashoffset 0.1s linear',
        }}
      />
      
      {/* Animated dot at end */}
      {progress > 0.9 && (
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="3"
          fill={color}
          className="animate-pulse"
        />
      )}
    </svg>
  );
}

// =====================================================
// ANIMATED GAUGE COMPONENT (from DemoModal)
// =====================================================

function AnimatedGauge({ 
  value, 
  maxValue = 100, 
  size = 120, 
  strokeWidth = 10,
  color = '#10b981',
  showLabel = true,
  delay = 400,
  trigger = true
}: {
  value: number;
  maxValue?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  showLabel?: boolean;
  delay?: number;
  trigger?: boolean;
}) {
  const [animatedValue, setAnimatedValue] = useState(0);
  
  useEffect(() => {
    if (!trigger) return;
    setAnimatedValue(0);
    
    const timeoutId = setTimeout(() => {
      const startTime = Date.now();
      const duration = 1500;
      
      const animateValue = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        setAnimatedValue(Math.floor(value * eased));
        
        if (progress < 1) {
          requestAnimationFrame(animateValue);
        }
      };
      
      requestAnimationFrame(animateValue);
    }, delay);
    
    return () => clearTimeout(timeoutId);
  }, [value, delay, trigger]);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = animatedValue / maxValue;
  const strokeDashoffset = circumference * (1 - percentage);
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(var(--color-border))"
          strokeWidth={strokeWidth}
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ 
            transition: 'stroke-dashoffset 0.1s linear',
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        />
      </svg>
      
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl sm:text-3xl font-bold" style={{ color }}>
            {animatedValue}
          </span>
          <span className="text-[10px] sm:text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            / {maxValue}
          </span>
        </div>
      )}
    </div>
  );
}

// =====================================================
// ANIMATED BAR CHART COMPONENT
// =====================================================

function AnimatedBarChart({
  data,
  labels,
  delay = 500,
  height = 100,
  trigger = true,
}: {
  data: { actual: number; budget: number }[];
  labels: string[];
  delay?: number;
  height?: number;
  trigger?: boolean;
}) {
  const [progress, setProgress] = useState(0);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  
  useEffect(() => {
    if (!trigger) return;
    setProgress(0);
    
    const timeoutId = setTimeout(() => {
      const startTime = Date.now();
      const duration = 1200;
      
      const animateProgress = () => {
        const elapsed = Date.now() - startTime;
        const p = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setProgress(eased);
        
        if (p < 1) {
          requestAnimationFrame(animateProgress);
        }
      };
      
      requestAnimationFrame(animateProgress);
    }, delay);
    
    return () => clearTimeout(timeoutId);
  }, [delay, trigger]);
  
  const maxValue = Math.max(...data.map(d => Math.max(d.actual, d.budget)));
  
  return (
    <div className="w-full">
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((d, i) => {
          const actualHeight = (d.actual / maxValue) * height * progress;
          const budgetHeight = (d.budget / maxValue) * height * progress;
          const isAboveBudget = d.actual > d.budget;
          const isHovered = hoveredBar === i;
          
          return (
            <div 
              key={i} 
              className="flex-1 flex flex-col items-center gap-0.5 relative cursor-pointer"
              style={{ transitionDelay: `${i * 50}ms` }}
              onMouseEnter={() => setHoveredBar(i)}
              onMouseLeave={() => setHoveredBar(null)}
            >
              {/* Tooltip on hover */}
              {isHovered && (
                <div 
                  className="absolute -top-16 left-1/2 -translate-x-1/2 px-2 py-1.5 rounded-lg text-[9px] whitespace-nowrap z-10 shadow-lg"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-surface))',
                    border: '1px solid rgb(var(--color-border))',
                    color: 'rgb(var(--color-text))'
                  }}
                >
                  <div className="font-semibold mb-1">{labels[i]}</div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: isAboveBudget ? '#10b981' : '#94a3b8' }} />
                    <span>Actual: ${d.actual}K</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#cbd5e1' }} />
                    <span>Budget: ${d.budget}K</span>
                  </div>
                  {isAboveBudget && (
                    <div className="text-[8px] mt-1 font-medium" style={{ color: '#10b981' }}>
                      +{Math.round((d.actual - d.budget) / d.budget * 100)}% above target
                    </div>
                  )}
                </div>
              )}
              
              <div className="w-full flex gap-0.5 h-full items-end justify-center">
                <div 
                  className={`w-[45%] rounded-t transition-all duration-500 ${isHovered ? 'scale-110' : ''}`}
                  style={{ 
                    height: actualHeight,
                    backgroundColor: isAboveBudget ? '#10b981' : '#94a3b8',
                    boxShadow: isAboveBudget && isHovered ? '0 0 12px rgba(16, 185, 129, 0.5)' : 'none',
                  }}
                />
                <div 
                  className={`w-[45%] rounded-t transition-all duration-500 ${isHovered ? 'scale-110' : ''}`}
                  style={{ 
                    height: budgetHeight,
                    backgroundColor: '#cbd5e1',
                    opacity: 0.6,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="flex justify-between mt-2">
        {labels.map((label, i) => (
          <span 
            key={i} 
            className={`text-[8px] sm:text-[9px] font-medium transition-all ${hoveredBar === i ? 'scale-110' : ''}`}
            style={{ color: hoveredBar === i ? 'rgb(var(--color-text))' : 'rgb(var(--color-text-muted))' }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// ANIMATED AREA CHART COMPONENT (Runway-style)
// =====================================================

function AnimatedAreaChart({
  data,
  color,
  height = 50,
  delay = 300,
  trigger = true,
  showDashed = false,
  showHoverValues = true,
  isDark = false,
}: {
  data: number[];
  color: string;
  height?: number;
  delay?: number;
  trigger?: boolean;
  showDashed?: boolean;
  showHoverValues?: boolean;
  isDark?: boolean;
}) {
  const [progress, setProgress] = useState(0);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!trigger) return;
    setProgress(0);
    
    const timeoutId = setTimeout(() => {
      const startTime = Date.now();
      const duration = 1200;
      
      const animateProgress = () => {
        const elapsed = Date.now() - startTime;
        const p = Math.min(elapsed / duration, 1);
        setProgress(p);
        
        if (p < 1) {
          requestAnimationFrame(animateProgress);
        }
      };
      
      requestAnimationFrame(animateProgress);
    }, delay);
    
    return () => clearTimeout(timeoutId);
  }, [delay, trigger]);

  const width = 120;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((value - min) / range) * (height - 10) - 5,
    value,
  }));
  
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  // For dashed projection line (last 3 points)
  const solidPoints = points.slice(0, -3);
  const dashedPoints = points.slice(-4);
  const solidPath = solidPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const dashedPath = dashedPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Handle mouse move for hover detection
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!showHoverValues || !svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
    // Find closest point
    let closestIndex = 0;
    let closestDistance = Infinity;
    
    points.forEach((point, i) => {
      const distance = Math.abs(point.x - mouseX);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    });
    
    if (closestDistance < 15) {
      setHoveredPoint(closestIndex);
    } else {
      setHoveredPoint(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  // Format value for display
  const formatValue = (val: number) => {
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    if (val < 1 && val > 0) return `${(val * 100).toFixed(1)}%`;
    return val.toFixed(0);
  };

  return (
    <svg 
      ref={svgRef}
      width={width} 
      height={height} 
      className="overflow-visible cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <defs>
        <linearGradient id={`area-gradient-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
        <filter id="tooltip-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.15"/>
        </filter>
      </defs>
      
      {/* Area fill */}
      <path
        d={areaPath}
        fill={`url(#area-gradient-${color.replace(/[^a-z0-9]/gi, '')})`}
        style={{ opacity: progress }}
      />
      
      {/* Main line */}
      {showDashed ? (
        <>
          <path
            d={solidPath}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            style={{ opacity: progress }}
          />
          <path
            d={dashedPath}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="4 3"
            style={{ opacity: progress * 0.7 }}
          />
        </>
      ) : (
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 500,
            strokeDashoffset: 500 * (1 - progress),
          }}
        />
      )}
      
      {/* Hover vertical line */}
      {hoveredPoint !== null && progress > 0.5 && (
        <line
          x1={points[hoveredPoint].x}
          y1={0}
          x2={points[hoveredPoint].x}
          y2={height}
          stroke={color}
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.5"
          className="transition-all duration-150"
        />
      )}
      
      {/* Hover point indicator */}
      {hoveredPoint !== null && progress > 0.5 && (
        <g className="animate-pulse">
          <circle
            cx={points[hoveredPoint].x}
            cy={points[hoveredPoint].y}
            r="6"
            fill={color}
            opacity="0.2"
          />
          <circle
            cx={points[hoveredPoint].x}
            cy={points[hoveredPoint].y}
            r="4"
            fill={color}
            stroke="white"
            strokeWidth="1.5"
          />
        </g>
      )}
      
      {/* Hover tooltip - compact, close to point */}
      {hoveredPoint !== null && progress > 0.5 && (
        <g filter="url(#tooltip-shadow)">
          <rect
            x={points[hoveredPoint].x + 6}
            y={points[hoveredPoint].y - 8}
            width="28"
            height="14"
            rx="3"
            fill={isDark ? 'rgb(30, 41, 59)' : 'white'}
            stroke={color}
            strokeWidth="0.5"
          />
          <text
            x={points[hoveredPoint].x + 20}
            y={points[hoveredPoint].y + 2}
            textAnchor="middle"
            fontSize="8"
            fontWeight="600"
            fill={color}
          >
            {formatValue(points[hoveredPoint].value)}
          </text>
        </g>
      )}
      
      {/* Current value dot (only when not hovering) */}
      {progress > 0.8 && hoveredPoint === null && (
        <circle
          cx={points[showDashed ? points.length - 4 : points.length - 1].x}
          cy={points[showDashed ? points.length - 4 : points.length - 1].y}
          r="3"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
          className="animate-pulse"
        />
      )}
    </svg>
  );
}

// =====================================================
// HERO DASHBOARD PREVIEW COMPONENT (Runway-inspired)
// =====================================================

function HeroDashboardPreview({ isDark, theme, isEn, isVisible }: { isDark: boolean; theme: typeof colors.light; isEn: boolean; isVisible: boolean }) {
  const [showElements, setShowElements] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState(0);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredKpi, setHoveredKpi] = useState<number | null>(null);
  const [roadmapView, setRoadmapView] = useState<'quarterly' | 'monthly' | 'yearly'>('quarterly');
  
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setShowElements(true), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  // Industry-specific configurations
  const industries = [
    { 
      id: 'restaurant',
      name: isEn ? 'Restaurant' : 'Restauration',
      icon: 'R',
      iconColor: theme.green,
      kpis: [
        { 
          label: isEn ? 'Revenue' : 'Revenus', 
          value: '$847K', 
          data: [42, 45, 48, 52, 58, 54, 62, 68, 72, 78, 82, 85], 
          projection: true,
          threshold: isEn ? 'Target: $800K+' : 'Cible: 800K$+',
          target: '$800K',
          previous: '$780K',
          insight: isEn ? '+8.6% vs last month' : '+8,6% vs mois dernier'
        },
        { 
          label: isEn ? 'Food Cost %' : 'Coût nourriture', 
          value: '28.5%', 
          data: [32, 30, 29, 31, 28, 29, 27, 28, 29, 28, 28.5, 28], 
          projection: false,
          threshold: isEn ? 'Target: 25-35%' : 'Cible: 25-35%',
          target: '30%',
          previous: '29.2%',
          insight: isEn ? 'Within optimal range' : 'Dans la plage optimale'
        },
        { 
          label: isEn ? 'Labor Cost %' : 'Coût M-O', 
          value: '24.2%', 
          data: [26, 25, 24, 25, 24, 23, 24, 25, 24, 24, 24, 24.2], 
          projection: false,
          threshold: isEn ? 'Target: 20-30%' : 'Cible: 20-30%',
          target: '25%',
          previous: '24.8%',
          insight: isEn ? 'Optimized scheduling working' : 'Planification optimisée efficace'
        },
        { 
          label: isEn ? 'Prime Cost' : 'Coût principal', 
          value: '52.7%', 
          data: [58, 55, 53, 56, 52, 52, 51, 53, 53, 52, 52.5, 52.7], 
          projection: true,
          threshold: isEn ? 'Target: 55-65%' : 'Cible: 55-65%',
          target: '60%',
          previous: '54.0%',
          insight: isEn ? 'Excellent - below target' : 'Excellent - sous la cible'
        },
      ],
      benchmarks: [
        { metric: isEn ? 'Food Cost %' : 'Coût nourriture %', yours: '28.5%', target: '25-35%', status: 'good' },
        { metric: isEn ? 'Labor Cost %' : 'Coût M-O %', yours: '24.2%', target: '20-30%', status: 'good' },
        { metric: isEn ? 'Prime Cost %' : 'Coût principal %', yours: '52.7%', target: '55-65%', status: 'excellent' },
        { metric: isEn ? 'Net Margin' : 'Marge nette', yours: '8.2%', target: '6-9%', status: 'good' },
        { metric: isEn ? 'Beverage Cost %' : 'Coût boissons %', yours: '18.4%', target: '18-24%', status: 'excellent' },
      ]
    },
    { 
      id: 'realestate',
      name: isEn ? 'Real Estate' : 'Immobilier',
      icon: 'RE',
      iconColor: theme.gold,
      kpis: [
        { 
          label: isEn ? 'NOI' : 'Bénéfice net', 
          value: '$1.2M', 
          data: [85, 88, 92, 95, 98, 102, 108, 112, 115, 118, 120, 124], 
          projection: true,
          threshold: isEn ? 'Target: $1.0M+' : 'Cible: 1,0M$+',
          target: '$1.0M',
          previous: '$1.15M',
          insight: isEn ? '+4.3% vs last quarter' : '+4,3% vs trimestre dernier'
        },
        { 
          label: isEn ? 'Occupancy' : 'Occupation', 
          value: '94.5%', 
          data: [88, 89, 90, 91, 92, 93, 93, 94, 94, 94, 94.5, 95], 
          projection: true,
          threshold: isEn ? 'Target: 90-95%' : 'Cible: 90-95%',
          target: '92%',
          previous: '93.8%',
          insight: isEn ? 'Near full occupancy' : 'Quasi pleine occupation'
        },
        { 
          label: isEn ? 'Cap Rate' : 'Taux cap.', 
          value: '6.8%', 
          data: [7.2, 7.1, 7.0, 6.9, 6.9, 6.8, 6.8, 6.8, 6.7, 6.8, 6.8, 6.8], 
          projection: false,
          threshold: isEn ? 'Target: 5-8%' : 'Cible: 5-8%',
          target: '6.5%',
          previous: '6.9%',
          insight: isEn ? 'Healthy returns' : 'Rendements sains'
        },
        { 
          label: isEn ? 'Cash-on-Cash' : 'Rendement', 
          value: '12.4%', 
          data: [10, 10.5, 11, 11.2, 11.5, 11.8, 12, 12.1, 12.2, 12.3, 12.4, 12.5], 
          projection: true,
          threshold: isEn ? 'Target: 8-12%' : 'Cible: 8-12%',
          target: '10%',
          previous: '11.8%',
          insight: isEn ? 'Exceeding target' : 'Dépasse la cible'
        },
      ],
      benchmarks: [
        { metric: isEn ? 'Occupancy Rate' : 'Taux occupation', yours: '94.5%', target: '90-95%', status: 'good' },
        { metric: isEn ? 'Cap Rate' : 'Taux capitalisation', yours: '6.8%', target: '5-8%', status: 'good' },
        { metric: isEn ? 'Cash-on-Cash' : 'Rendement cash', yours: '12.4%', target: '8-12%', status: 'excellent' },
        { metric: 'DSC Ratio', yours: '1.35', target: '>1.25', status: 'good' },
      ]
    },
    { 
      id: 'saas',
      name: 'SaaS / Tech',
      icon: 'S',
      iconColor: theme.green,
      kpis: [
        { 
          label: 'ARR', 
          value: '$2.8M', 
          data: [1.5, 1.7, 1.9, 2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8], 
          projection: true,
          threshold: isEn ? 'Target: $2.5M+' : 'Cible: 2,5M$+',
          target: '$2.5M',
          previous: '$2.6M',
          insight: isEn ? '+7.7% growth rate' : '+7,7% taux de croissance'
        },
        { 
          label: isEn ? 'Cash' : 'Trésorerie', 
          value: '$4.6M', 
          data: [3.2, 3.4, 3.6, 3.8, 4.0, 4.1, 4.2, 4.3, 4.4, 4.5, 4.55, 4.6], 
          projection: true,
          threshold: isEn ? 'Target: $4.0M+' : 'Cible: 4,0M$+',
          target: '$4.0M',
          previous: '$4.4M',
          insight: isEn ? 'Strong cash position' : 'Position de trésorerie solide'
        },
        { 
          label: isEn ? 'Avg ACV' : 'ACV moyen', 
          value: '$23K', 
          data: [18, 19, 19, 20, 20, 21, 21, 22, 22, 22, 23, 23], 
          projection: false,
          threshold: isEn ? 'Target: $20K+' : 'Cible: 20K$+',
          target: '$20K',
          previous: '$22K',
          insight: isEn ? 'Higher value customers' : 'Clients à plus haute valeur'
        },
        { 
          label: 'Runway', 
          value: isEn ? '14 Mo' : '14 mois', 
          data: [18, 17, 16, 16, 15, 15, 14, 14, 14, 14, 14, 14], 
          projection: true,
          threshold: isEn ? 'Target: 12+ months' : 'Cible: 12+ mois',
          target: '12 Mo',
          previous: '15 Mo',
          insight: isEn ? 'Adequate runway' : 'Runway adéquat'
        },
      ],
      benchmarks: [
        { metric: isEn ? 'Net Retention' : 'Rétention nette', yours: '115%', target: '>100%', status: 'excellent' },
        { metric: isEn ? 'Gross Margin' : 'Marge brute', yours: '78%', target: '70-85%', status: 'good' },
        { metric: 'CAC Payback', yours: isEn ? '12 mo' : '12 mois', target: '<18 mo', status: 'good' },
        { metric: isEn ? 'Magic Number' : 'Nombre magique', yours: '0.85', target: '>0.75', status: 'good' },
      ]
    },
  ];

  const current = industries[selectedIndustry];

  // Strategic roadmap items
  const roadmapItems = [
    { 
      plan: isEn ? 'Q1 Expansion' : 'Expansion Q1', 
      start: 0, 
      end: 30, 
      color: theme.green,
      details: isEn ? 'Open 2 new locations, hire 15 staff' : 'Ouvrir 2 nouveaux emplacements, embaucher 15 employés',
      budget: isEn ? '$450K' : '450K$',
      status: isEn ? 'On track' : 'Dans les temps'
    },
    { 
      plan: isEn ? 'Cost Optimization' : 'Optimisation coûts', 
      start: 20, 
      end: 60, 
      color: theme.gold,
      details: isEn ? 'Reduce overhead by 12%, automate processes' : 'Réduire les frais généraux de 12%, automatiser les processus',
      budget: isEn ? 'Save $180K/yr' : 'Économiser 180K$/an',
      status: isEn ? 'In progress' : 'En cours'
    },
    { 
      plan: isEn ? 'New Revenue Stream' : 'Nouveau revenu', 
      start: 50, 
      end: 100, 
      color: theme.green,
      details: isEn ? 'Launch catering service, target $200K ARR' : 'Lancer service traiteur, cible 200K$ ARR',
      budget: isEn ? '$120K investment' : '120K$ investissement',
      status: isEn ? 'Planned' : 'Planifié'
    },
  ];

  return (
    <div 
      className="relative w-full max-w-5xl mx-auto rounded-xl overflow-hidden shadow-2xl"
      style={{ 
        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.98)' : 'rgba(255, 255, 255, 0.99)',
        border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.6)'}`,
      }}
    >
      {/* Top Bar */}
      <div 
        className="h-10 sm:h-12 flex items-center px-3 sm:px-4 gap-3 border-b"
        style={{ 
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(250, 250, 250, 0.95)',
          borderColor: isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)'
        }}
      >
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-400" />
        </div>
        
        {/* Industry Selector Dropdown */}
        <div 
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-black/5 transition-colors"
          style={{ backgroundColor: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(241, 245, 249, 0.8)' }}
        >
          <span className="text-sm">{current.icon}</span>
          <span className="text-[10px] sm:text-xs font-medium" style={{ color: 'rgb(var(--color-text))' }}>
            {current.name}
          </span>
          <ArrowDownRight className="w-3 h-3 rotate-45" style={{ color: 'rgb(var(--color-text-muted))' }} />
        </div>
        
        <div className="flex-1" />
        
        <div className="hidden sm:flex items-center gap-2">
          <div 
            className="px-3 py-1 rounded-md text-[10px] font-medium"
            style={{ backgroundColor: `${theme.green}15`, color: theme.green }}
          >
            {isEn ? 'Live Data' : 'Temps réel'}
          </div>
          <div className="w-7 h-7 rounded-full overflow-hidden border-2 shadow-sm" style={{ borderColor: theme.green }}>
            <img 
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face" 
              alt="User" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
      
      <div className="flex">
        {/* Sidebar - Hidden on mobile */}
        <div 
          className="hidden md:flex flex-col w-48 border-r py-3 px-2"
          style={{ 
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(250, 250, 250, 0.8)',
            borderColor: isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)'
          }}
        >
          
          {/* Board - Active with sub-items */}
          <div className={`mb-1 transition-all duration-300 ${showElements ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '0ms' }}>
            <div 
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px] font-semibold cursor-pointer"
              style={{ 
                backgroundColor: `${theme.green}15`,
                color: theme.green,
              }}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              {isEn ? 'Board' : 'Tableau'}
            </div>
            {/* Sub-items - Left aligned */}
            <div className="mt-1 space-y-0.5 pl-4">
              {[
                { label: isEn ? 'Overview' : 'Aperçu', active: true },
                { label: isEn ? 'Cash Flow' : 'Flux de trésorerie', active: false },
                { label: isEn ? 'P&L Analysis' : 'Analyse P&L', active: false },
              ].map((sub, j) => (
                <div 
                  key={j}
                  className="text-[9px] py-1 pl-2 rounded cursor-pointer transition-colors text-left"
                  style={{ 
                    color: sub.active ? theme.green : (isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)'),
                    backgroundColor: sub.active ? `${theme.green}08` : 'transparent',
                    borderLeft: `2px solid ${sub.active ? theme.green : 'transparent'}`
                  }}
                >
                  {sub.label}
                </div>
              ))}
            </div>
          </div>
          
          {/* Industry KPIs */}
          <div className={`mb-1 transition-all duration-300 ${showElements ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '50ms' }}>
            <div 
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px] font-medium cursor-pointer hover:bg-opacity-50 transition-colors"
              style={{ 
                color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)',
              }}
            >
              <TrendingUp className="w-3.5 h-3.5" style={{ color: theme.gold }} />
              {isEn ? 'Industry KPIs' : 'KPIs sectoriels'}
            </div>
            <div className="mt-1 space-y-0.5 pl-4">
              {[
                { label: isEn ? 'Benchmarks' : 'Références' },
                { label: isEn ? 'Trends' : 'Tendances' },
              ].map((sub, j) => (
                <div 
                  key={j}
                  className="text-[9px] py-1 pl-2 rounded cursor-pointer transition-colors text-left"
                  style={{ color: isDark ? 'rgb(100, 116, 139)' : 'rgb(148, 163, 184)' }}
                >
                  {sub.label}
                </div>
              ))}
            </div>
          </div>
          
          {/* Scenarios */}
          <div className={`mb-1 transition-all duration-300 ${showElements ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '100ms' }}>
            <div 
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px] font-medium cursor-pointer hover:bg-opacity-50 transition-colors"
              style={{ 
                color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)',
              }}
            >
              <Target className="w-3.5 h-3.5" style={{ color: theme.gold }} />
              {isEn ? 'Scenarios' : 'Scénarios'}
            </div>
            <div className="mt-1 space-y-0.5 pl-4">
              {[
                { label: isEn ? 'What-If' : 'Simulation' },
                { label: isEn ? 'Forecasts' : 'Prévisions' },
              ].map((sub, j) => (
                <div 
                  key={j}
                  className="text-[9px] py-1 pl-2 rounded cursor-pointer transition-colors text-left"
                  style={{ color: isDark ? 'rgb(100, 116, 139)' : 'rgb(148, 163, 184)' }}
                >
                  {sub.label}
                </div>
              ))}
            </div>
          </div>
          
          {/* Reports */}
          <div className={`mb-1 transition-all duration-300 ${showElements ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '150ms' }}>
            <div 
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px] font-medium cursor-pointer hover:bg-opacity-50 transition-colors"
              style={{ 
                color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)',
              }}
            >
              <FileCheck className="w-3.5 h-3.5" style={{ color: theme.green }} />
              {isEn ? 'Reports' : 'Rapports'}
            </div>
            <div className="mt-1 space-y-0.5 pl-4">
              {[
                { label: isEn ? 'Monthly' : 'Mensuel' },
                { label: isEn ? 'Custom' : 'Personnalisé' },
              ].map((sub, j) => (
                <div 
                  key={j}
                  className="text-[9px] py-1 pl-2 rounded cursor-pointer transition-colors text-left"
                  style={{ color: isDark ? 'rgb(100, 116, 139)' : 'rgb(148, 163, 184)' }}
                >
                  {sub.label}
                </div>
              ))}
            </div>
          </div>
          
          {/* AI Status */}
          <div 
            className="mt-auto p-3 rounded-lg"
            style={{ 
              backgroundColor: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(248, 250, 252, 0.95)',
              border: `1px solid ${theme.green}25`,
              boxShadow: `0 2px 8px ${theme.green}10`
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="relative">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.green }} />
                <div className="absolute inset-0 w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: theme.green, opacity: 0.4 }} />
              </div>
              <span className="text-[10px] font-semibold" style={{ color: theme.green }}>
                {isEn ? 'AI Insights' : 'IA Insights'}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3 h-3" style={{ color: theme.gold }} />
              <p className="text-[9px] font-medium" style={{ color: isDark ? 'rgb(203, 213, 225)' : 'rgb(71, 85, 105)' }}>
                {isEn ? '3 opportunities detected' : '3 opportunités détectées'}
              </p>
            </div>
            <p className="text-[8px]" style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}>
              {isEn ? 'Monitoring your metrics in real-time' : 'Surveillance de vos métriques en temps réel'}
            </p>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 p-3 sm:p-4 min-h-[400px]">
          {/* Breadcrumb */}
          <div className={`flex items-center gap-2 mb-4 text-[10px] transition-all duration-500 ${showElements ? 'opacity-100' : 'opacity-0'}`}>
            <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Overview' : 'Aperçu'}</span>
            <span style={{ color: 'rgb(var(--color-text-muted))' }}>›</span>
            <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{isEn ? 'Board' : 'Tableau'}</span>
          </div>
          
          {/* KPI Cards Row - Runway Style */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 relative">
            {current.kpis.map((kpi, i) => (
              <div 
                key={i}
                className={`p-2 rounded-lg transition-all duration-300 cursor-pointer relative group ${
                  showElements ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ 
                  backgroundColor: isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(255, 255, 255, 0.9)',
                  border: `1px solid ${hoveredKpi === i ? theme.green : (isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)')}`,
                  boxShadow: hoveredKpi === i ? `0 8px 24px ${theme.green}30` : 'none',
                  transitionDelay: `${i * 100 + 200}ms`,
                  zIndex: hoveredKpi === i ? 10 : 1,
                }}
                onMouseEnter={() => setHoveredKpi(i)}
                onMouseLeave={() => setHoveredKpi(null)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[8px] font-medium" style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}>
                    {kpi.label}
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold" style={{ color: theme.green }}>
                    {kpi.value}
                  </span>
                </div>
                <AnimatedAreaChart 
                  data={kpi.data}
                  color={theme.green}
                  height={35}
                  delay={400 + i * 100}
                  trigger={isVisible}
                  showDashed={kpi.projection}
                  showHoverValues={true}
                  isDark={isDark}
                />
                
                {/* Hover Tooltip - Slick & Compact */}
                {hoveredKpi === i && kpi.threshold && (
                  <div 
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1.5 rounded-md shadow-xl z-20 whitespace-nowrap"
                    style={{ 
                      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                      border: `1px solid ${theme.green}25`,
                      backdropFilter: 'blur(12px)',
                    }}
                  >
                    <div className="flex items-center gap-2 text-[8px]">
                      <div className="flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full" style={{ backgroundColor: theme.green }} />
                        <span style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}>{kpi.threshold}</span>
                      </div>
                      <div className="w-px h-2.5" style={{ backgroundColor: isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)' }} />
                      <div className="flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full" style={{ backgroundColor: theme.gold }} />
                        <span style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}>{kpi.target}</span>
                      </div>
                      <div className="w-px h-2.5" style={{ backgroundColor: isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)' }} />
                      <span className="font-medium" style={{ color: theme.green }}>{kpi.insight}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Strategic Roadmap */}
          <div 
            className={`p-3 sm:p-4 rounded-xl mb-4 transition-all duration-700 ${
              showElements ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ 
              backgroundColor: isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(250, 250, 250, 0.9)',
              border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.6)'}`,
              transitionDelay: '500ms'
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[11px] sm:text-xs font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Strategic Roadmap' : 'Feuille de route stratégique'}
              </h4>
              <div className="flex items-center gap-2">
                {/* View Toggle */}
                <div className="flex items-center gap-1 rounded border" style={{ borderColor: isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)' }}>
                  {(['monthly', 'quarterly', 'yearly'] as const).map((view) => (
                    <button
                      key={view}
                      onClick={() => setRoadmapView(view)}
                      className="px-2 py-0.5 text-[8px] font-medium transition-colors rounded"
                      style={{
                        backgroundColor: roadmapView === view ? theme.green : 'transparent',
                        color: roadmapView === view ? 'white' : (isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)'),
                      }}
                    >
                      {isEn 
                        ? (view === 'monthly' ? 'Mo' : view === 'quarterly' ? 'Q' : 'Yr')
                        : (view === 'monthly' ? 'M' : view === 'quarterly' ? 'T' : 'A')
                      }
                    </button>
                  ))}
                </div>
                <button 
                  className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-medium"
                  style={{ backgroundColor: `${theme.green}15`, color: theme.green }}
                >
                  <Sparkles className="w-3 h-3" />
                  {isEn ? 'Customize' : 'Personnaliser'}
                </button>
              </div>
            </div>
            
            {/* Timeline Header */}
            <div className="flex mb-2">
              <div className="w-28 sm:w-36" />
              <div className="flex-1 flex justify-between text-[8px] sm:text-[9px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {roadmapView === 'monthly' ? (
                  <>
                    <span>Jan</span>
                    <span>Apr</span>
                    <span>Jul</span>
                    <span>Oct</span>
                  </>
                ) : roadmapView === 'quarterly' ? (
                  <>
                    <span>Q1 '26</span>
                    <span>Q2 '26</span>
                    <span>Q3 '26</span>
                    <span>Q4 '26</span>
                  </>
                ) : (
                  <>
                    <span>2025</span>
                    <span>2026</span>
                    <span>2027</span>
                    <span>2028</span>
                  </>
                )}
              </div>
            </div>
            
            {/* Roadmap Items */}
            {roadmapItems.map((item, i) => (
              <div 
                key={i} 
                className="flex items-center mb-2"
              >
                <div className="w-28 sm:w-36 text-[9px] sm:text-[10px] font-medium pr-2 text-left" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {item.plan}
                </div>
                <div className="flex-1 h-6 relative rounded overflow-hidden" style={{ backgroundColor: isDark ? 'rgba(71, 85, 105, 0.2)' : 'rgba(229, 231, 235, 0.5)' }}>
                  <div 
                    className="absolute top-1 bottom-1 rounded transition-all duration-1000"
                    style={{ 
                      left: `${item.start}%`,
                      width: showElements ? `${item.end - item.start}%` : '0%',
                      backgroundColor: item.color,
                      transitionDelay: `${600 + i * 150}ms`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          
          {/* Industry Benchmarks Table */}
          <div 
            className={`rounded-xl overflow-hidden transition-all duration-700 ${
              showElements ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ 
              backgroundColor: isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(255, 255, 255, 0.95)',
              border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.6)'}`,
              transitionDelay: '700ms'
            }}
          >
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b" style={{ borderColor: isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.6)' }}>
              <h4 className="text-[11px] sm:text-xs font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Industry Benchmarks' : 'Références sectorielles'} - {current.name}
              </h4>
              <button 
                className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-medium"
                style={{ backgroundColor: `${theme.gold}15`, color: theme.goldDark }}
              >
                <Brain className="w-3 h-3" />
                {isEn ? 'AI Analyze' : 'Analyser IA'}
              </button>
            </div>
            
            {/* Table Header */}
            <div 
              className="grid grid-cols-5 text-[8px] sm:text-[9px] font-semibold uppercase tracking-wider px-3 sm:px-4 py-2"
              style={{ backgroundColor: isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(248, 250, 252, 0.9)' }}
            >
              <span style={{ color: 'rgb(var(--color-text-muted))' }}>KPI</span>
              <span className="text-center" style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Current Score' : 'Score actuel'}</span>
              <span className="text-center" style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Target Score' : 'Score cible'}</span>
              <span className="text-center" style={{ color: 'rgb(var(--color-text-muted))' }}>Status</span>
              <span className="text-right" style={{ color: 'rgb(var(--color-text-muted))' }}></span>
            </div>
            
            {/* Table Rows */}
            {current.benchmarks.map((row, i) => {
              const isExcellent = row.status === 'excellent';
              const isGood = row.status === 'good';
              // Status icon determined by condition below
              const statusColor = isExcellent ? theme.green : isGood ? theme.gold : '#ef4444';
              
              return (
                <div 
                  key={i}
                  className={`grid grid-cols-5 text-[9px] sm:text-[10px] px-3 sm:px-4 py-2.5 border-b last:border-b-0 cursor-pointer transition-all group ${
                    hoveredRow === i ? 'bg-opacity-50' : ''
                  }`}
                  style={{ 
                    borderColor: isDark ? 'rgba(71, 85, 105, 0.2)' : 'rgba(229, 231, 235, 0.4)',
                    backgroundColor: hoveredRow === i ? (isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(248, 250, 252, 0.9)') : 'transparent'
                  }}
                  onMouseEnter={() => setHoveredRow(i)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <span className="font-medium flex items-center gap-1" style={{ color: 'rgb(var(--color-text))' }}>
                    {row.metric}
                  </span>
                  <span className="text-center font-bold" style={{ color: theme.green }}>{row.yours}</span>
                  <span 
                    className="text-center px-2 py-0.5 rounded-full mx-auto font-medium"
                    style={{ 
                      backgroundColor: `${theme.gold}12`,
                      color: theme.goldDark,
                      fontSize: '9px'
                    }}
                  >
                    {row.target}
                  </span>
                  <div className="flex justify-center items-center gap-1">
                    {isExcellent ? (
                      <CheckCircle className="w-3.5 h-3.5" style={{ color: statusColor }} />
                    ) : isGood ? (
                      <CheckCircle className="w-3.5 h-3.5" style={{ color: statusColor }} />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5" style={{ color: statusColor }} />
                    )}
                    <span 
                      className="px-1.5 py-0.5 rounded text-[8px] font-medium"
                      style={{ 
                        backgroundColor: `${statusColor}15`,
                        color: statusColor,
                      }}
                    >
                      {isExcellent ? (isEn ? 'Excellent' : 'Excellent') : isGood ? (isEn ? 'Good' : 'Bon') : (isEn ? 'Alert' : 'Alerte')}
                    </span>
                  </div>
                  <div className="flex justify-end items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Could open a modal or navigate to detailed view
                        alert(isEn ? `Learn more about ${row.metric}` : `En savoir plus sur ${row.metric}`);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-opacity-50"
                      style={{ 
                        backgroundColor: `${theme.green}10`,
                        color: theme.green
                      }}
                      title={isEn ? 'Learn more' : 'En savoir plus'}
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Supported integrations - used inline in JSX

// Theme colors
const colors = {
  light: {
    green: '#10b981',
    greenDark: '#059669',
    greenLight: '#34d399',
    gold: '#d4af37',
    goldDark: '#b8860b',
    goldText: '#8b7355',
    navBg: 'rgba(254, 253, 251, 0.92)',
  },
  dark: {
    green: '#34d399',
    greenDark: '#10b981',
    greenLight: '#6ee7b7',
    gold: '#fbbf24',
    goldDark: '#f59e0b',
    goldText: '#fcd34d',
    navBg: 'rgba(15, 23, 42, 0.92)',
  }
};

export default function Landing() {
  const { login, register, authenticated } = useAuth();
  const { language } = useI18n();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);

  // Listen for theme changes
  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDark();
    
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  const isEn = language === 'en';
  const theme = isDark ? colors.dark : colors.light;

  const handleScheduleCall = () => {
    window.open('https://calendly.com/anthonypaquet1508', '_blank');
  };

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{ 
        background: isDark 
          ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)'
          : 'linear-gradient(135deg, #fefefe 0%, #f0fdf4 25%, #f8fafc 50%, #fef3c7 75%, #fefefe 100%)'
      }}
    >
      {/* Global Animation Styles */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-up { animation: fadeInUp 0.8s ease-out forwards; }
        .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
        .animate-scale-in { animation: scaleIn 0.6s ease-out forwards; }
        .animate-slide-left { animation: slideInLeft 0.7s ease-out forwards; }
        .animate-slide-right { animation: slideInRight 0.7s ease-out forwards; }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
        .delay-500 { animation-delay: 0.5s; }
      `}</style>
      
      {/* Decorative background gradients - Light theme */}
      {!isDark && (
        <>
          <div 
            className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full pointer-events-none"
            style={{ 
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 60%)',
              transform: 'translate(20%, -30%)'
            }}
          />
          <div 
            className="absolute top-1/3 left-0 w-[600px] h-[600px] rounded-full pointer-events-none"
            style={{ 
              background: 'radial-gradient(circle, rgba(251, 191, 36, 0.06) 0%, transparent 60%)',
              transform: 'translate(-30%, 0%)'
            }}
          />
          <div 
            className="absolute bottom-1/4 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{ 
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 60%)',
              transform: 'translate(30%, 20%)'
            }}
          />
        </>
      )}
      
      {/* Navigation */}
      <nav 
        className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md"
        style={{ 
          backgroundColor: theme.navBg,
          borderColor: `${theme.green}15`
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
                style={{ 
                  background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                  boxShadow: `0 2px 6px ${theme.green}40`
                }}
              >
                <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="5" width="3" height="22" rx="1" fill="rgba(255,255,255,0.5)"/>
                  <rect x="8" y="5" width="20" height="22" rx="2" fill="white"/>
                  <line x1="11" y1="10" x2="25" y2="10" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="11" y1="15" x2="25" y2="15" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="11" y1="20" x2="20" y2="20" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M17 21 L20 24 L26 17" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="font-semibold text-lg" style={{ color: 'rgb(var(--color-text))' }}>
                PlainLedger
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#industries" className="text-sm font-medium hover:text-primary transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Industries' : 'Industries'}
              </a>
              <a href="#pricing" className="text-sm font-medium hover:text-primary transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Pricing' : 'Tarifs'}
              </a>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
              <ThemeToggle />
              <LanguageToggle />
              {authenticated ? (
                <Link 
                  to="/app" 
                  className="px-5 py-2.5 rounded-lg font-medium transition-all btn-primary btn-sm"
                >
                  {isEn ? 'Go to Dashboard' : 'Accéder au dashboard'}
                </Link>
              ) : (
                <>
                  <button 
                    onClick={() => login()}
                    className="text-sm font-medium"
                    style={{ color: 'rgb(var(--color-text-secondary))' }}
                  >
                    {isEn ? 'Sign in' : 'Connexion'}
                  </button>
                  <button 
                    onClick={() => register()}
                    className="btn-primary btn-sm"
                  >
                    {isEn ? 'Start free' : 'Essai gratuit'}
                  </button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              <ThemeToggle />
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {isMobileMenuOpen && (
            <div 
              className="md:hidden py-4 border-t"
              style={{ borderColor: 'rgb(var(--color-border))' }}
            >
              <nav className="flex flex-col gap-3">
                <a href="#industries" className="text-sm font-medium py-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Industries' : 'Industries'}
                </a>
                <a href="#pricing" className="text-sm font-medium py-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Pricing' : 'Tarifs'}
                </a>
                <button 
                  onClick={() => { login(); setIsMobileMenuOpen(false); }}
                  className="text-sm font-medium py-2 text-left"
                  style={{ color: 'rgb(var(--color-text-secondary))' }}
                >
                  {isEn ? 'Sign in' : 'Connexion'}
                </button>
                <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
                  <LanguageToggle />
                </div>
              </nav>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section 
        className="pt-24 sm:pt-28 lg:pt-32 pb-12 sm:pb-16 lg:pb-20 px-4 sm:px-6 relative z-10 min-h-[85vh] flex items-center overflow-hidden"
        style={{
          backgroundImage: isDark 
            ? `radial-gradient(circle at 20% 50%, ${theme.green}08 0%, transparent 50%), radial-gradient(circle at 80% 50%, ${theme.gold}06 0%, transparent 50%)`
            : `radial-gradient(circle at 20% 50%, ${theme.green}05 0%, transparent 50%), radial-gradient(circle at 80% 50%, ${theme.gold}04 0%, transparent 50%)`,
          backgroundSize: '100% 100%',
        }}
      >
        {/* Corporate Background Pattern */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'} 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />
        
        <div className="max-w-4xl mx-auto text-center w-full relative z-10">
          {/* Main Headline */}
          <h1 
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-tight mb-6 sm:mb-8 animate-fade-up"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? (
              <>
                <span style={{ color: theme.green }}>
                  No Surprises.
                </span>{' '}
                <span>Just Numbers.</span>
              </>
            ) : (
              <>
                <span style={{ color: theme.green }}>
                  Pas de surprises.
                </span>{' '}
                <span>Juste des chiffres.</span>
              </>
            )}
          </h1>

          {/* Value Proposition - Condensed */}
          <div 
            className="max-w-2xl mx-auto mb-8 px-2 animate-fade-up opacity-0"
            style={{ animationDelay: '0.15s', animationFillMode: 'forwards' }}
          >
            <p 
              className="text-lg sm:text-xl md:text-2xl leading-relaxed"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'Exec-ready dashboards with industry KPIs, OKRs, and AI-optimized projections.'
                : 'Tableaux de bord avec KPIs sectoriels, OKRs et projections optimisées par IA.'}
            </p>
          </div>

          {/* CTAs - Smaller buttons */}
          <div 
            className="flex flex-col sm:flex-row gap-3 justify-center mb-8 animate-fade-up opacity-0"
            style={{ animationDelay: '0.25s', animationFillMode: 'forwards' }}
          >
            <button 
              onClick={() => register()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105 text-sm shadow-lg"
              style={{ 
                background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                color: 'white',
                boxShadow: `0 8px 24px ${theme.green}40`
              }}
            >
              {isEn ? 'Start free 21-day trial' : 'Essai gratuit de 21 jours'}
              <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={handleScheduleCall}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105 text-sm"
              style={{ 
                border: `2px solid ${theme.green}`,
                color: isDark ? theme.green : theme.greenDark,
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255,255,255,0.9)'
              }}
            >
              <Calendar className="w-4 h-4" />
              {isEn ? 'Schedule a call' : 'Planifier un appel'}
            </button>
          </div>

          {/* Trust badges */}
          <div 
            className="w-full flex justify-center animate-fade-up opacity-0"
            style={{ animationDelay: '0.35s', animationFillMode: 'forwards' }}
          >
            <div className="inline-flex flex-wrap justify-center items-center gap-4 sm:gap-8 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4" style={{ color: theme.green }} />
                {isEn ? 'No credit card' : 'Sans carte de crédit'}
              </span>
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4" style={{ color: theme.green }} />
                {isEn ? '5 min setup' : '5 min config'}
              </span>
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4" style={{ color: theme.green }} />
                {isEn ? 'Data in Canada' : 'Données au Canada'} 🇨🇦
              </span>
            </div>
          </div>

          {/* Social Proof - Trusted by founders */}
          <motion.div 
            className="mt-8 flex flex-col items-center gap-4"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.3, delay: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center -space-x-3">
              {[
                { src: 'https://randomuser.me/api/portraits/men/32.jpg', name: 'Marc' },
                { src: 'https://randomuser.me/api/portraits/women/44.jpg', name: 'Sophie' },
                { src: 'https://randomuser.me/api/portraits/men/52.jpg', name: 'David' },
                { src: 'https://randomuser.me/api/portraits/women/68.jpg', name: 'Julie' },
                { src: 'https://randomuser.me/api/portraits/men/76.jpg', name: 'Pierre' },
              ].map((person, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.3, x: -40 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ 
                    duration: 1, 
                    delay: 0.8 + idx * 0.2, 
                    ease: [0.16, 1, 0.3, 1]
                  }}
                  whileHover={{ scale: 1.15, zIndex: 20, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }}
                  className="w-11 h-11 rounded-full border-[3px] overflow-hidden shadow-lg cursor-pointer"
                  style={{ 
                    borderColor: isDark ? 'rgb(30, 41, 59)' : 'white',
                    zIndex: 10 - idx,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                >
                  <img 
                    src={person.src} 
                    alt={person.name}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ scale: 1.1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }}
                className="w-11 h-11 rounded-full border-[3px] flex items-center justify-center text-xs font-bold shadow-lg cursor-pointer"
                style={{ 
                  borderColor: isDark ? 'rgb(30, 41, 59)' : 'white',
                  background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                  color: 'white',
                  zIndex: 0,
                  boxShadow: `0 4px 12px ${theme.green}40`
                }}
              >
                +50
              </motion.div>
            </div>
            <motion.p 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.4, ease: [0.16, 1, 0.3, 1] }}
              className="text-sm font-medium"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn ? 'Trusted by Canadian business owners' : 'Utilisé par des entrepreneurs canadiens'}
            </motion.p>
          </motion.div>
          
          {/* Interactive Dashboard Preview */}
          <div 
            className="mt-10 sm:mt-14 animate-fade-up opacity-0"
            style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}
          >
            <HeroDashboardPreview isDark={isDark} theme={theme} isEn={isEn} isVisible={true} />
          </div>
        </div>
      </section>

      {/* Exec Dashboard Features Section */}
      <span id="features" className="absolute" style={{ top: '-100px' }} />
      <section 
        id="exec-dashboard" 
        className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 relative"
        style={{ 
          background: isDark 
            ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.8) 100%)' 
            : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 50%, #ffffff 100%)'
        }}
      >
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <div 
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold mb-3"
              style={{ 
                background: `${theme.green}15`,
                border: `1px solid ${theme.green}25`,
                color: theme.greenDark
              }}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              {isEn ? 'Exec Dashboard' : 'Tableau de bord exécutif'}
            </div>
            <h2 
              className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4"
              style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
            >
              {isEn ? 'Strategic Intelligence at a Glance' : 'Intelligence stratégique en un coup d\'œil'}
            </h2>
            <p 
              className="text-sm sm:text-base max-w-2xl mx-auto"
              style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
            >
              {isEn 
                ? 'Real-time metrics, AI-powered insights, and strategic planning tools designed for executive decision-making.'
                : 'Métriques en temps réel, insights alimentés par l\'IA et outils de planification stratégique conçus pour les décisions exécutives.'}
            </p>
          </motion.div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                icon: Eye,
                title: isEn ? 'Real-Time Visibility' : 'Visibilité en temps réel',
                desc: isEn 
                  ? 'Live dashboards that sync with your accounting software. See your cash position, revenue trends, and key metrics updated automatically.'
                  : 'Tableaux de bord en direct synchronisés avec votre logiciel comptable. Position de trésorerie, tendances et métriques clés mis à jour automatiquement.',
                highlight: isEn ? 'Auto-sync every 15 min' : 'Synchro auto chaque 15 min',
                color: theme.green,
              },
              {
                icon: Brain,
                title: isEn ? 'AI-Powered Alerts' : 'Alertes alimentées par l\'IA',
                desc: isEn 
                  ? 'Proactive anomaly detection that catches issues before they become problems. Get notified about unusual expenses, cash flow risks, and opportunities.'
                  : 'Détection proactive d\'anomalies qui identifie les problèmes avant qu\'ils ne surviennent. Alertes sur dépenses inhabituelles et risques de trésorerie.',
                highlight: isEn ? '97% detection accuracy' : '97% de précision',
                color: theme.gold,
              },
              {
                icon: Target,
                title: isEn ? 'OKRs & Goal Tracking' : 'OKRs & Suivi des objectifs',
                desc: isEn 
                  ? 'Set quarterly objectives and track progress automatically. Link financial KPIs to strategic goals for complete alignment.'
                  : 'Définissez des objectifs trimestriels et suivez la progression automatiquement. Liez les KPIs financiers aux objectifs stratégiques.',
                highlight: isEn ? 'Quarterly planning' : 'Planification trimestrielle',
                color: theme.green,
              },
              {
                icon: TrendingUp,
                title: isEn ? 'Scenario Planning' : 'Planification de scénarios',
                desc: isEn 
                  ? 'What-if analysis for strategic decisions. Model hiring plans, expansion costs, or market changes and see projected impact.'
                  : 'Analyse "what-if" pour décisions stratégiques. Modélisez embauches, coûts d\'expansion ou changements de marché.',
                highlight: isEn ? '12-month forecasts' : 'Prévisions 12 mois',
                color: theme.gold,
              },
              {
                icon: FileCheck,
                title: isEn ? 'Board-Ready Reports' : 'Rapports prêts pour le CA',
                desc: isEn 
                  ? 'One-click exports for board meetings, investor updates, or bank reviews. Professional formatting with your branding.'
                  : 'Exports en un clic pour réunions du CA, mises à jour investisseurs ou revues bancaires. Formatage professionnel avec votre image.',
                highlight: isEn ? 'PDF, Excel, PowerPoint' : 'PDF, Excel, PowerPoint',
                color: theme.green,
              },
              {
                icon: Zap,
                title: isEn ? 'Action Recommendations' : 'Recommandations d\'action',
                desc: isEn 
                  ? 'AI suggests specific actions based on your data: optimize payment terms, reduce specific costs, or invest in growth areas.'
                  : 'L\'IA suggère des actions spécifiques: optimiser les délais de paiement, réduire certains coûts, ou investir dans des zones de croissance.',
                highlight: isEn ? 'Data-driven decisions' : 'Décisions basées sur les données',
                color: theme.gold,
              },
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ 
                  duration: 0.5, 
                  delay: 0.1 * idx
                }}
                className="group p-5 rounded-xl transition-all duration-300 relative overflow-hidden cursor-default"
                style={{ 
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.95)',
                  border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)'}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                {/* Icon */}
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ 
                    backgroundColor: `${feature.color}15`,
                  }}
                >
                  <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
                </div>
                
                {/* Title */}
                <h3 
                  className="text-base font-bold mb-2"
                  style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
                >
                  {feature.title}
                </h3>
                
                {/* Description */}
                <p 
                  className="text-xs leading-relaxed mb-3"
                  style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
                >
                  {feature.desc}
                </p>
                
                {/* Highlight */}
                <div 
                  className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full"
                  style={{ 
                    backgroundColor: `${feature.color}12`,
                    color: feature.color
                  }}
                >
                  <Check className="w-3 h-3" />
                  {feature.highlight}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bottom CTA */}
          <motion.div 
            className="flex flex-col items-center justify-center mt-10 w-full"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <p 
              className="text-sm mb-4 text-center w-full max-w-md mx-auto px-4"
              style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
            >
              {isEn 
                ? 'All features included in every plan. No hidden upgrades.'
                : 'Toutes les fonctionnalités incluses dans chaque plan. Aucune mise à niveau cachée.'}
            </p>
            <button 
              onClick={() => register()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white text-sm hover:opacity-90 transition-opacity"
              style={{ 
                background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                boxShadow: `0 4px 16px ${theme.green}35`
              }}
            >
              {isEn ? 'Try the dashboard free' : 'Essayez le tableau de bord gratuitement'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </section>


      {/* Industry KPIs Section - Formulas & Benchmarks */}
      <span id="industry-kpis" className="absolute" style={{ top: '-100px' }} />
      <section id="industries" className="relative">
        <IndustryKPISection onScheduleCall={handleScheduleCall} />
      </section>

      {/* How It Works - Clean Animated Pipeline */}
      <section 
        id="pipeline" 
        className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 relative overflow-hidden"
        style={{ 
          background: isDark 
            ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.8) 100%)' 
            : 'linear-gradient(180deg, #fafafa 0%, #f0fdf4 50%, #fafafa 100%)'
        }}
      >
        {/* Background decoration */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(${theme.green}10 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />
        
        <div className="max-w-5xl mx-auto relative z-10">
          {/* Section Header */}
          <motion.div 
            className="text-center mb-10 sm:mb-14"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div 
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold mb-3"
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{ 
                background: `${theme.green}15`,
                border: `1px solid ${theme.green}25`,
                color: theme.greenDark
              }}
            >
              <Layers className="w-3.5 h-3.5" />
              {isEn ? 'How It Works' : 'Comment ça fonctionne'}
            </motion.div>
            <motion.h2 
              className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
            >
              {isEn ? 'Your Data Journey' : 'Le parcours de vos données'}
            </motion.h2>
            <motion.p 
              className="text-sm sm:text-base max-w-lg mx-auto"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
              style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
            >
              {isEn 
                ? 'From connection to insights in 4 intelligent steps'
                : 'De la connexion aux insights en 4 étapes intelligentes'}
            </motion.p>
          </motion.div>

          {/* Pipeline Steps - Horizontal on Desktop */}
          <div className="relative">
            {/* Enhanced Animated Connection Line - Desktop */}
            <div className="hidden lg:block absolute top-[120px] left-[14%] right-[14%] h-[3px] z-0 rounded-full overflow-hidden">
              {/* Base gradient line */}
              <motion.div 
                className="h-full rounded-full"
                style={{ 
                  background: `linear-gradient(90deg, ${theme.green} 0%, ${theme.green} 35%, ${theme.gold} 65%, ${theme.gold} 100%)`
                }}
                initial={{ scaleX: 0, opacity: 0 }}
                whileInView={{ scaleX: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
              />
              {/* Animated glow overlay */}
              <motion.div 
                className="absolute inset-0 rounded-full"
                style={{ 
                  background: `linear-gradient(90deg, transparent 0%, ${theme.green}60 20%, transparent 40%, ${theme.gold}60 80%, transparent 100%)`,
                  filter: 'blur(4px)'
                }}
                animate={{ 
                  x: ['-100%', '100%']
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
              {/* Multiple animated data particles */}
              {[0, 1, 2].map((i) => (
                <motion.div 
                  key={i}
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                  style={{ 
                    backgroundColor: i < 2 ? theme.green : theme.gold,
                    boxShadow: `0 0 12px ${i < 2 ? theme.green : theme.gold}, 0 0 24px ${i < 2 ? theme.green : theme.gold}50`
                  }}
                  animate={{ 
                    left: ['0%', '100%'],
                    scale: [1, 1.3, 1],
                    opacity: [0.8, 1, 0.8]
                  }}
                  transition={{ 
                    duration: 4,
                    delay: i * 1.3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
            
            {/* Steps Grid - Enhanced & Animated */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {[
                { 
                  num: 1, 
                  icon: Database, 
                  title: isEn ? 'Connect' : 'Connecter',
                  desc: isEn ? 'Link your accounting software securely' : 'Liez votre logiciel comptable de façon sécurisée',
                  tags: ['QuickBooks', 'Xero', 'Sage'],
                  color: theme.green,
                  visual: 'connect',
                },
                { 
                  num: 2, 
                  icon: RefreshCw, 
                  title: isEn ? 'Clean & Store' : 'Nettoyer',
                  desc: isEn ? 'Transform & store in Canadian data lake' : 'Transformez et stockez au Canada',
                  tags: [isEn ? 'Sanitized' : 'Assaini', isEn ? 'Validated' : 'Validé', 'CA'],
                  color: theme.green,
                  visual: 'clean',
                },
                { 
                  num: 3, 
                  icon: Sparkles, 
                  title: isEn ? 'AI Analysis' : 'Analyse IA',
                  desc: isEn ? 'Industry-specific machine learning' : 'Apprentissage machine sectoriel',
                  tags: ['97%', isEn ? 'Accuracy' : 'Précision', 'ML'],
                  color: theme.gold,
                  visual: 'ai',
                },
                { 
                  num: 4, 
                  icon: TrendingUp, 
                  title: isEn ? 'Dashboard' : 'Tableau',
                  desc: isEn ? 'Executive-ready business insights' : 'Insights prêts pour dirigeants',
                  tags: ['KPIs', 'OKRs', isEn ? 'Real-time' : 'Temps réel'],
                  color: theme.gold,
                  visual: 'dashboard',
                },
              ].map((step, idx) => (
                <motion.div 
                  key={step.num}
                  className="group relative"
                  initial={{ opacity: 0, y: 60, scale: 0.85 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ 
                    duration: 1.0, 
                    delay: 0.3 + idx * 0.15,
                    ease: [0.16, 1, 0.3, 1]
                  }}
                >
                  {/* Step Card - Enhanced Design */}
                  <motion.div 
                    className="relative p-4 sm:p-5 rounded-xl cursor-pointer overflow-hidden h-full min-h-[280px] sm:min-h-[300px]"
                    style={{ 
                      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                      border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.6)'}`,
                      backdropFilter: 'blur(12px)',
                      boxShadow: isDark 
                        ? `0 4px 24px -4px rgba(0,0,0,0.3), inset 0 1px 0 0 rgba(255,255,255,0.05)`
                        : `0 4px 24px -4px rgba(0,0,0,0.08), inset 0 1px 0 0 rgba(255,255,255,0.8)`,
                    }}
                    whileHover={{ 
                      y: -12,
                      scale: 1.02,
                      boxShadow: isDark 
                        ? `0 32px 64px -16px ${step.color}40, 0 16px 32px -8px rgba(0,0,0,0.4)`
                        : `0 32px 64px -16px ${step.color}30, 0 16px 32px -8px rgba(0,0,0,0.1)`,
                      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Gradient top accent */}
                    <motion.div 
                      className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                      style={{ 
                        background: `linear-gradient(90deg, ${step.color}, ${step.color}80)`
                      }}
                      initial={{ scaleX: 0, transformOrigin: 'left' }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: idx * 0.15 + 0.5 }}
                    />
                    
                    {/* Subtle gradient background */}
                    <div 
                      className="absolute inset-0 opacity-[0.03] pointer-events-none"
                      style={{ 
                        background: `radial-gradient(circle at top right, ${step.color} 0%, transparent 60%)`
                      }}
                    />
                    
                    {/* Animated glow on hover */}
                    <motion.div 
                      className="absolute inset-0 pointer-events-none rounded-xl"
                      style={{ 
                        background: `radial-gradient(circle at center, ${step.color}15 0%, transparent 70%)`
                      }}
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                    
                    {/* Step Number Badge & Icon */}
                    <div className="flex items-center justify-between mb-3">
                      <motion.div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-base font-bold relative overflow-hidden"
                        style={{ 
                          backgroundColor: `${step.color}15`,
                          color: step.color,
                          border: `1px solid ${step.color}25`
                        }}
                        whileHover={{ 
                          scale: 1.1,
                          backgroundColor: `${step.color}25`,
                          transition: { duration: 0.3 }
                        }}
                      >
                        <motion.div
                          className="absolute inset-0"
                          style={{ background: `linear-gradient(135deg, ${step.color}20 0%, transparent 60%)` }}
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <span className="relative z-10">{step.num}</span>
                      </motion.div>
                      <motion.div 
                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ 
                          backgroundColor: `${step.color}10`,
                          border: `1px solid ${step.color}15`
                        }}
                        animate={{ 
                          rotate: step.visual === 'clean' ? [0, 360] : [0, 5, -5, 0],
                        }}
                        transition={{ 
                          duration: step.visual === 'clean' ? 8 : 4,
                          repeat: Infinity,
                          ease: step.visual === 'clean' ? "linear" : "easeInOut",
                          delay: idx * 0.5
                        }}
                        whileHover={{ 
                          scale: 1.15,
                          backgroundColor: `${step.color}20`,
                          transition: { duration: 0.3 }
                        }}
                      >
                        <step.icon className="w-4 h-4" style={{ color: step.color }} />
                      </motion.div>
                    </div>
                    
                    {/* Title */}
                    <h4 
                      className="text-base sm:text-lg font-bold mb-1.5"
                      style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
                    >
                      {step.title}
                    </h4>
                    
                    {/* Description */}
                    <p 
                      className="text-xs sm:text-sm mb-3 leading-relaxed min-h-[2.5rem]"
                      style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
                    >
                      {step.desc}
                    </p>
                    
                    {/* Mini Visualization Area */}
                    <div 
                      className="relative h-16 sm:h-20 mb-3 rounded-lg overflow-hidden"
                      style={{ 
                        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(248, 250, 252, 0.8)',
                        border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.5)'}`
                      }}
                    >
                      {step.visual === 'connect' && (
                        <div className="absolute inset-0 flex items-center justify-center gap-2 px-3">
                          {/* Source icons */}
                          <div className="flex flex-col gap-1.5">
                            {['QB', 'XE', 'SA'].map((src, i) => (
                              <motion.div
                                key={src}
                                className="w-7 h-5 rounded text-[9px] font-bold flex items-center justify-center"
                                style={{ 
                                  backgroundColor: `${step.color}20`,
                                  color: step.color,
                                  border: `1px solid ${step.color}30`
                                }}
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: i * 0.2 + 1, duration: 0.5 }}
                              >
                                {src}
                              </motion.div>
                            ))}
                          </div>
                          {/* Animated connection lines */}
                          <svg className="flex-1 h-full" viewBox="0 0 60 60">
                            {[0, 1, 2].map((i) => (
                              <motion.path
                                key={i}
                                d={`M0,${15 + i * 15} Q30,30 60,30`}
                                fill="none"
                                stroke={step.color}
                                strokeWidth="1.5"
                                strokeDasharray="4,4"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.6 }}
                                transition={{ delay: i * 0.3 + 1.5, duration: 1 }}
                              />
                            ))}
                            <motion.circle
                              cx="60" cy="30" r="5"
                              fill={step.color}
                              initial={{ scale: 0 }}
                              animate={{ scale: [0, 1.2, 1] }}
                              transition={{ delay: 2.5, duration: 0.5 }}
                            />
                          </svg>
                          {/* Target */}
                          <motion.div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${step.color}25`, border: `1px solid ${step.color}40` }}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 2.5, duration: 0.3 }}
                          >
                            <Database className="w-5 h-5" style={{ color: step.color }} />
                          </motion.div>
                        </div>
                      )}
                      
                      {step.visual === 'clean' && (
                        <div className="absolute inset-0 flex items-center justify-center px-3">
                          {/* Data cleaning visualization */}
                          <div className="flex items-center gap-3 w-full">
                            {/* Messy data */}
                            <div className="flex flex-col gap-1">
                              {[1, 2, 3, 4].map((i) => (
                                <motion.div
                                  key={i}
                                  className="h-2.5 rounded-full"
                                  style={{ 
                                    width: `${Math.random() * 20 + 12}px`,
                                    backgroundColor: isDark ? 'rgba(148, 163, 184, 0.3)' : 'rgba(100, 116, 139, 0.3)'
                                  }}
                                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                                />
                              ))}
                            </div>
                            {/* Processing arrow */}
                            <motion.div 
                              className="flex-1 flex items-center justify-center"
                              animate={{ x: [0, 5, 0] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            >
                              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${step.color}15` }}>
                                <RefreshCw className="w-4 h-4" style={{ color: step.color }} />
                              </div>
                            </motion.div>
                            {/* Clean data bars */}
                            <div className="flex items-end gap-1.5 h-12">
                              {[60, 80, 45, 90, 70].map((h, i) => (
                                <motion.div
                                  key={i}
                                  className="w-2.5 rounded-t"
                                  style={{ backgroundColor: step.color }}
                                  initial={{ height: 0 }}
                                  animate={{ height: `${h}%` }}
                                  transition={{ delay: i * 0.1 + 1.5, duration: 0.5 }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {step.visual === 'ai' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          {/* AI neural network visualization */}
                          <svg className="w-full h-full" viewBox="0 0 100 60">
                            {/* Neural network nodes */}
                            {[[15, 12], [15, 30], [15, 48], [50, 20], [50, 40], [85, 30]].map(([cx, cy], i) => (
                              <motion.circle
                                key={i}
                                cx={cx} cy={cy} r="5"
                                fill={step.color}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: [0.5, 1, 0.5] }}
                                transition={{ 
                                  delay: i * 0.1 + 1,
                                  opacity: { duration: 2, repeat: Infinity, delay: i * 0.2 }
                                }}
                              />
                            ))}
                            {/* Connection lines */}
                            {[
                              [15, 12, 50, 20], [15, 12, 50, 40],
                              [15, 30, 50, 20], [15, 30, 50, 40],
                              [15, 48, 50, 20], [15, 48, 50, 40],
                              [50, 20, 85, 30], [50, 40, 85, 30]
                            ].map(([x1, y1, x2, y2], i) => (
                              <motion.line
                                key={i}
                                x1={x1} y1={y1} x2={x2} y2={y2}
                                stroke={step.color}
                                strokeWidth="1.5"
                                strokeOpacity="0.4"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ delay: i * 0.05 + 1.3, duration: 0.5 }}
                              />
                            ))}
                            {/* Animated pulse */}
                            <motion.circle
                              cx="85" cy="30" r="8"
                              fill="none"
                              stroke={step.color}
                              strokeWidth="2"
                              animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          </svg>
                        </div>
                      )}
                      
                      {step.visual === 'dashboard' && (
                        <div className="absolute inset-0 flex items-center justify-center px-3 gap-3">
                          {/* Mini dashboard preview */}
                          <div className="flex flex-col gap-1.5 flex-1">
                            {/* KPI card */}
                            <motion.div 
                              className="h-6 rounded flex items-center px-2 gap-1.5"
                              style={{ backgroundColor: `${step.color}15`, border: `1px solid ${step.color}25` }}
                              initial={{ width: 0 }}
                              animate={{ width: '100%' }}
                              transition={{ delay: 1.2, duration: 0.5 }}
                            >
                              <TrendingUp className="w-3 h-3" style={{ color: step.color }} />
                              <span className="text-[9px] font-bold" style={{ color: step.color }}>+24%</span>
                            </motion.div>
                            {/* Chart bars */}
                            <div className="flex items-end gap-1 h-8">
                              {[40, 65, 45, 80, 55, 70, 90].map((h, i) => (
                                <motion.div
                                  key={i}
                                  className="flex-1 rounded-t"
                                  style={{ backgroundColor: i === 6 ? step.color : `${step.color}50` }}
                                  initial={{ height: 0 }}
                                  animate={{ height: `${h}%` }}
                                  transition={{ delay: i * 0.08 + 1.5, duration: 0.4 }}
                                />
                              ))}
                            </div>
                          </div>
                          {/* Gauge */}
                          <motion.div 
                            className="w-12 h-12 relative"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 2, duration: 0.4 }}
                          >
                            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                              <circle cx="18" cy="18" r="14" fill="none" stroke={isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.8)'} strokeWidth="3" />
                              <motion.circle 
                                cx="18" cy="18" r="14" 
                                fill="none" 
                                stroke={step.color} 
                                strokeWidth="3"
                                strokeDasharray="88"
                                initial={{ strokeDashoffset: 88 }}
                                animate={{ strokeDashoffset: 22 }}
                                transition={{ delay: 2.2, duration: 1 }}
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color: step.color }}>75%</span>
                          </motion.div>
                        </div>
                      )}
                    </div>
                    
                    {/* Tags with enhanced styling */}
                    <div className="flex flex-wrap gap-1.5 min-h-[1.75rem]">
                      {step.tags.map((tag, tagIdx) => (
                        <motion.span 
                          key={tag}
                          className="text-[10px] px-2.5 py-1 rounded-md font-medium"
                          style={{ 
                            backgroundColor: `${step.color}12`,
                            color: step.color,
                            border: `1px solid ${step.color}20`
                          }}
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: idx * 0.1 + tagIdx * 0.08 + 0.6 }}
                          whileHover={{ 
                            scale: 1.08,
                            backgroundColor: `${step.color}25`,
                            y: -2
                          }}
                        >
                          {tag}
                        </motion.span>
                      ))}
                    </div>
                    
                    {/* Animated corner glow */}
                    <motion.div 
                      className="absolute -bottom-2 -right-2 w-16 h-16 rounded-full pointer-events-none"
                      style={{
                        background: `radial-gradient(circle, ${step.color}20 0%, transparent 70%)`
                      }}
                      animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                      transition={{ duration: 3, repeat: Infinity, delay: idx * 0.5 }}
                    />
                  </motion.div>
                  
                  {/* Enhanced Connector Arrow - Desktop only */}
                  {idx < 3 && (
                    <motion.div 
                      className="hidden lg:flex absolute -right-3 top-[120px] -translate-y-1/2 z-10 items-center justify-center"
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.2 + 1 }}
                    >
                      <motion.div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ 
                          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                          border: `2px solid ${idx < 2 ? theme.green : theme.gold}`,
                          boxShadow: `0 0 12px ${idx < 2 ? theme.green : theme.gold}40`
                        }}
                        animate={{ x: [0, 4, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <ArrowRight className="w-3 h-3" style={{ color: idx < 2 ? theme.green : theme.gold }} />
                      </motion.div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-8">
            <button 
              onClick={() => register()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-all hover:scale-105 hover:shadow-lg text-sm"
              style={{ 
                background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                boxShadow: `0 4px 16px ${theme.green}35`
              }}
            >
              {isEn ? 'Start your journey' : 'Commencer votre parcours'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* CSS Animation for moving dot */}
        <style>{`
          @keyframes moveRight {
            0% { left: 0%; opacity: 1; }
            100% { left: 100%; opacity: 0; }
          }
        `}</style>
      </section>

      {/* Pricing Section */}
      <section 
        id="pricing" 
        className="py-10 sm:py-14 lg:py-16 px-4 sm:px-6 relative"
        style={{ 
          background: isDark 
            ? 'transparent' 
            : 'linear-gradient(180deg, rgba(248, 250, 252, 0.5) 0%, rgba(240, 253, 244, 0.3) 50%, rgba(255, 255, 255, 0.9) 100%)'
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.h2 
              className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4"
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? 'Simple, transparent pricing' : 'Tarification simple et transparente'}
            </motion.h2>
            <motion.p 
              className="text-sm sm:text-base lg:text-lg mb-8 sm:mb-10 lg:mb-12 max-w-xl mx-auto px-2"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'Get a personalized quote based on your business needs.'
                : 'Obtenez une soumission selon vos besoins.'}
            </motion.p>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {[
              {
                name: 'Essentiel',
                descEn: 'Growing businesses',
                descFr: 'Entreprises en croissance',
                featuresEn: ['Industry KPIs', 'Anomaly detection', 'Monthly reports'],
                featuresFr: ['KPIs sectoriels', 'Détection anomalies', 'Rapports mensuels'],
                highlighted: false,
              },
              {
                name: 'Pro',
                descEn: 'Mid-market companies',
                descFr: 'Entreprises moyennes',
                featuresEn: ['All Essentiel +', 'Custom dashboards', 'Priority support'],
                featuresFr: ['Tout Essentiel +', 'Dashboards custom', 'Support prioritaire'],
                highlighted: true,
              },
              {
                name: 'Premium',
                descEn: 'Established enterprises',
                descFr: 'Entreprises établies',
                featuresEn: ['All Pro +', 'Dedicated manager', 'Custom integrations'],
                featuresFr: ['Tout Pro +', 'Gestionnaire dédié', 'Intégrations custom'],
                highlighted: false,
              },
            ].map((tier, idx) => (
              <motion.div 
                key={tier.name}
                initial={{ opacity: 0, y: 90, scale: 0.88 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ 
                  duration: 1.3, 
                  delay: 0.4 + idx * 0.35,
                  ease: [0.16, 1, 0.3, 1]
                }}
                whileHover={{ 
                  y: -15, 
                  scale: tier.highlighted ? 1.05 : 1.03,
                  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
                }}
                className="p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl text-left relative overflow-hidden"
                style={{ 
                  background: tier.highlighted 
                    ? `linear-gradient(135deg, ${theme.green}0d 0%, ${theme.gold}0d 100%)`
                    : isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255,255,255,0.8)',
                  border: tier.highlighted 
                    ? `2px solid ${theme.green}`
                    : isDark ? '1px solid rgba(71, 85, 105, 0.5)' : '1px solid rgba(203, 213, 225, 0.5)',
                }}
              >
                {tier.highlighted && (
                  <div 
                    className="absolute top-0 right-0 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold"
                    style={{ 
                      backgroundColor: theme.green,
                      color: 'white',
                      borderBottomLeftRadius: '6px'
                    }}
                  >
                    {isEn ? 'Popular' : 'Populaire'}
                  </div>
                )}
                <h3 className="font-semibold text-base sm:text-lg mb-0.5 sm:mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                  {tier.name}
                </h3>
                <p className="text-xs sm:text-sm mb-3 sm:mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? tier.descEn : tier.descFr}
                </p>
                <ul className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6">
                  {(isEn ? tier.featuresEn : tier.featuresFr).map((feature) => (
                    <li key={feature} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: theme.green }} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <motion.button 
                  onClick={handleScheduleCall}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold"
                  style={{ 
                    background: tier.highlighted 
                      ? `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`
                      : 'transparent',
                    color: tier.highlighted ? 'white' : isDark ? theme.green : theme.greenDark,
                    border: tier.highlighted ? 'none' : `2px solid ${theme.green}`,
                  }}
                >
                  {isEn ? 'Get quote' : 'Soumission'}
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA - Enhanced with Image */}
      <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 relative overflow-hidden">
        {/* Background Image with Overlay */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1553484771-371a605b060b?auto=format&fit=crop&w=2000&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div 
            className="absolute inset-0"
            style={{ 
              background: isDark 
                ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)'
                : `linear-gradient(135deg, ${theme.green}f2 0%, ${theme.greenDark}f5 100%)`
            }}
          />
        </div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center">
            {/* Avatar Stack with Badge */}
            <motion.div 
              className="flex flex-col items-center gap-4 mb-6"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center -space-x-2.5">
                {[
                  { src: 'https://randomuser.me/api/portraits/women/65.jpg', name: 'Émilie' },
                  { src: 'https://randomuser.me/api/portraits/men/41.jpg', name: 'François' },
                  { src: 'https://randomuser.me/api/portraits/women/33.jpg', name: 'Catherine' },
                  { src: 'https://randomuser.me/api/portraits/men/22.jpg', name: 'Antoine' },
                ].map((person, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.2, x: -35 }}
                    whileInView={{ opacity: 1, scale: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ 
                      duration: 1, 
                      delay: 0.3 + idx * 0.2, 
                      ease: [0.16, 1, 0.3, 1]
                    }}
                    whileHover={{ scale: 1.2, zIndex: 20, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }}
                    className="w-10 h-10 rounded-full border-2 border-white/40 overflow-hidden cursor-pointer"
                    style={{ 
                      zIndex: 10 - idx,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.25)'
                    }}
                  >
                    <img 
                      src={person.src} 
                      alt={person.name}
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                ))}
              </div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 1, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(8px)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                {isEn ? 'Join 500+ Canadian businesses' : 'Rejoignez 500+ entreprises canadiennes'}
              </motion.div>
            </motion.div>
            
            {/* Heading */}
            <motion.h2 
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-white leading-tight"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1.3, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              {isEn ? 'Ready to see your data clearly?' : 'Prêt à voir vos données clairement?'}
            </motion.h2>
            
            {/* Subheading */}
            <motion.p 
              className="text-base sm:text-lg lg:text-xl mb-8 text-white/85 max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.3, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              {isEn 
                ? 'Get the financial clarity you need to make confident decisions. Start your free trial today.'
                : 'Obtenez la clarté financière dont vous avez besoin pour prendre des décisions éclairées.'}
            </motion.p>
            
            {/* CTA Buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 1, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.button 
                onClick={() => register()}
                whileHover={{ scale: 1.05, boxShadow: '0 12px 40px rgba(0,0,0,0.3)', transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-base"
                style={{ 
                  background: 'white',
                  color: theme.greenDark,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                }}
              >
                {isEn ? 'Start free 21-day trial' : 'Essai gratuit 21 jours'}
                <ArrowRight className="w-5 h-5" />
              </motion.button>
              
              <motion.button 
                onClick={handleScheduleCall}
                whileHover={{ scale: 1.05, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 px-6 py-4 rounded-xl font-semibold text-base"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(8px)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.25)'
                }}
              >
                <Calendar className="w-5 h-5" />
                {isEn ? 'Talk to an expert' : 'Parler à un expert'}
              </motion.button>
            </motion.div>
            
            {/* Trust Badges */}
            <motion.div 
              className="w-full flex justify-center"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="inline-flex flex-wrap justify-center items-center gap-4 sm:gap-8 text-white/70 text-sm">
                {[
                  { text: isEn ? 'No credit card required' : 'Sans carte de crédit' },
                  { text: isEn ? 'Setup in 5 minutes' : 'Configuration en 5 min' },
                  { text: isEn ? 'Data stays in Canada' : 'Données au Canada', flag: true },
                ].map((badge, idx) => (
                  <motion.span 
                    key={idx}
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.8 + idx * 0.15, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Check className="w-4 h-4 text-green-300" />
                    {badge.text} {badge.flag && '🇨🇦'}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer 
        className="py-6 sm:py-8 px-4 sm:px-6 border-t"
        style={{ borderColor: `${theme.green}1a` }}
      >
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center"
              style={{ 
                background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`
              }}
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="5" width="3" height="22" rx="1" fill="rgba(255,255,255,0.5)"/>
                <rect x="8" y="5" width="20" height="22" rx="2" fill="white"/>
                <path d="M17 21 L20 24 L26 17" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-medium text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text))' }}>PlainLedger</span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            <Link to="/privacy" className="transition-colors hover:underline">{isEn ? 'Privacy' : 'Confidentialité'}</Link>
            <Link to="/terms" className="transition-colors hover:underline">{isEn ? 'Terms' : 'Conditions'}</Link>
            <a href="mailto:info@plainledger.ca" className="transition-colors hover:underline">Contact</a>
          </div>
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            © 2026 PlainLedger 🇨🇦
          </p>
        </div>
      </footer>

      {/* Demo Modal */}
      <DemoModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        isEn={isEn}
        onStartTrial={() => {
          setShowDemoModal(false);
          register();
        }}
      />
    </div>
  );
}
