import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/keycloak';
import ThemeToggle from '../components/ThemeToggle';
import { LanguageToggle, useI18n } from '../lib/i18n';
import IndustryKPISection from '../components/IndustryKPISection';
import DemoModal from '../components/DemoModal';
import FlywheelVisualization from '../components/FlywheelVisualization';
import AITechnologyStack, { AIMetricsRow } from '../components/AITechnologyStack';
import ContactForm from '../components/ContactForm';
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
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Hash,
  Users,
  DollarSign,
  Building2,
  ExternalLink,
  UtensilsCrossed,
  Hammer,
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
  const [selectedIndustry, setSelectedIndustry] = useState(0); // Default to Real Estate (first in array)
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredKpi, setHoveredKpi] = useState<number | null>(null);
  const [roadmapView, setRoadmapView] = useState<'quarterly' | 'monthly' | 'yearly'>('quarterly');
  
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setShowElements(true), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  // Industry-specific configurations - Real Estate first as primary focus
  const industries = [
    { 
      id: 'realestate',
      name: isEn ? 'Real Estate' : 'Immobilier',
      icon: Building2,
      iconColor: theme.green,
      kpis: [
        { 
          label: isEn ? 'NOI' : 'RNE', 
          labelFull: isEn ? 'Net Operating Income' : 'Résultat net d\'exploitation',
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
          labelFull: isEn ? 'Occupancy Rate' : 'Taux d\'occupation',
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
          labelFull: isEn ? 'Capitalization Rate' : 'Taux de capitalisation',
          value: '6.8%', 
          data: [7.2, 7.1, 7.0, 6.9, 6.9, 6.8, 6.8, 6.8, 6.7, 6.8, 6.8, 6.8], 
          projection: false,
          threshold: isEn ? 'Target: 5-8%' : 'Cible: 5-8%',
          target: '6.5%',
          previous: '6.9%',
          insight: isEn ? 'Healthy returns' : 'Rendements sains'
        },
        { 
          label: isEn ? 'Cash-on-Cash' : 'Rend. cash', 
          labelFull: isEn ? 'Cash-on-Cash Return' : 'Rendement cash-on-cash',
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
        { metric: isEn ? 'Occupancy Rate' : 'Taux d\'occupation', yours: '94.5%', target: '90-95%', status: 'good' },
        { metric: isEn ? 'Cap Rate' : 'Taux de capitalisation', yours: '6.8%', target: '5-8%', status: 'good' },
        { metric: isEn ? 'Cash-on-Cash Return' : 'Rendement cash-on-cash', yours: '12.4%', target: '8-12%', status: 'excellent' },
        { metric: isEn ? 'DSC Ratio' : 'Ratio couverture dette', yours: '1.35', target: '>1.25', status: 'good' },
        { metric: isEn ? 'Operating Expense Ratio' : 'Ratio dépenses exploitation', yours: '38%', target: '35-45%', status: 'good' },
        { metric: isEn ? 'Rent per Sq Ft' : 'Loyer par pi²', yours: '$18.50', target: '$17-20', status: 'excellent' },
      ],
      roadmapItems: [
        { 
          plan: isEn ? 'Property Acquisition' : 'Acquisition propriété', 
          start: 0, 
          end: 25, 
          color: theme.green,
        },
        { 
          plan: isEn ? 'Renovation Phase' : 'Phase rénovation', 
          start: 20, 
          end: 55, 
          color: theme.gold,
        },
        { 
          plan: isEn ? 'Lease-up Strategy' : 'Stratégie location', 
          start: 45, 
          end: 100, 
          color: theme.green,
        },
      ]
    },
    { 
      id: 'restaurant',
      name: isEn ? 'Restaurant' : 'Restauration',
      icon: UtensilsCrossed,
      iconColor: theme.gold,
      kpis: [
        { 
          label: isEn ? 'Revenue' : 'Revenus', 
          labelFull: isEn ? 'Total Revenue' : 'Revenus totaux',
          value: '$847K', 
          data: [42, 45, 48, 52, 58, 54, 62, 68, 72, 78, 82, 85], 
          projection: true,
          threshold: isEn ? 'Target: $800K+' : 'Cible: 800K$+',
          target: '$800K',
          previous: '$780K',
          insight: isEn ? '+8.6% vs last month' : '+8,6% vs mois dernier'
        },
        { 
          label: isEn ? 'Food Cost %' : 'Coût nourr.', 
          labelFull: isEn ? 'Food Cost Percentage' : 'Pourcentage coût nourriture',
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
          labelFull: isEn ? 'Labor Cost Percentage' : 'Pourcentage coût main-d\'œuvre',
          value: '24.2%', 
          data: [26, 25, 24, 25, 24, 23, 24, 25, 24, 24, 24, 24.2], 
          projection: false,
          threshold: isEn ? 'Target: 20-30%' : 'Cible: 20-30%',
          target: '25%',
          previous: '24.8%',
          insight: isEn ? 'Optimized scheduling' : 'Planification optimisée'
        },
        { 
          label: isEn ? 'Prime Cost' : 'Coût princ.', 
          labelFull: isEn ? 'Prime Cost (Food + Labor)' : 'Coût principal (Nourr. + M-O)',
          value: '52.7%', 
          data: [58, 55, 53, 56, 52, 52, 51, 53, 53, 52, 52.5, 52.7], 
          projection: true,
          threshold: isEn ? 'Target: 55-65%' : 'Cible: 55-65%',
          target: '60%',
          previous: '54.0%',
          insight: isEn ? 'Excellent, below target' : 'Excellent, sous la cible'
        },
      ],
      benchmarks: [
        { metric: isEn ? 'Food Cost %' : 'Coût nourriture %', yours: '28.5%', target: '25-35%', status: 'good' },
        { metric: isEn ? 'Labor Cost %' : 'Coût main-d\'œuvre %', yours: '24.2%', target: '20-30%', status: 'good' },
        { metric: isEn ? 'Prime Cost %' : 'Coût principal %', yours: '52.7%', target: '55-65%', status: 'excellent' },
        { metric: isEn ? 'Net Margin' : 'Marge nette', yours: '8.2%', target: '6-9%', status: 'good' },
        { metric: isEn ? 'Beverage Cost %' : 'Coût boissons %', yours: '18.4%', target: '18-24%', status: 'excellent' },
      ],
      roadmapItems: [
        { 
          plan: isEn ? 'Q1 Expansion' : 'Expansion Q1', 
          start: 0, 
          end: 30, 
          color: theme.green,
        },
        { 
          plan: isEn ? 'Cost Optimization' : 'Optimisation coûts', 
          start: 20, 
          end: 60, 
          color: theme.gold,
        },
        { 
          plan: isEn ? 'New Revenue Stream' : 'Nouveau revenu', 
          start: 50, 
          end: 100, 
          color: theme.green,
        },
      ]
    },
    { 
      id: 'construction',
      name: 'Construction',
      icon: Hammer,
      iconColor: theme.green,
      kpis: [
        { 
          label: isEn ? 'Revenue' : 'Revenus', 
          labelFull: isEn ? 'Project Revenue' : 'Revenus projets',
          value: '$3.2M', 
          data: [2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.0, 3.0, 3.1, 3.1, 3.2, 3.2], 
          projection: true,
          threshold: isEn ? 'Target: $3.0M+' : 'Cible: 3,0M$+',
          target: '$3.0M',
          previous: '$3.0M',
          insight: isEn ? '+6.7% vs last quarter' : '+6,7% vs trimestre dernier'
        },
        { 
          label: isEn ? 'Gross Margin' : 'Marge brute', 
          labelFull: isEn ? 'Gross Margin %' : 'Marge brute %',
          value: '22.5%', 
          data: [18, 19, 19.5, 20, 20.5, 21, 21.5, 21.8, 22, 22.2, 22.4, 22.5], 
          projection: true,
          threshold: isEn ? 'Target: 15-30%' : 'Cible: 15-30%',
          target: '20%',
          previous: '21.2%',
          insight: isEn ? 'Better cost control' : 'Meilleur contrôle des coûts'
        },
        { 
          label: isEn ? 'Backlog' : 'Carnet', 
          labelFull: isEn ? 'Backlog (Months)' : 'Carnet de commandes (mois)',
          value: isEn ? '8 Mo' : '8 mois', 
          data: [5, 5.5, 6, 6.2, 6.5, 6.8, 7, 7.2, 7.5, 7.8, 8, 8], 
          projection: false,
          threshold: isEn ? 'Target: 3-12 months' : 'Cible: 3-12 mois',
          target: '6 Mo',
          previous: '7 Mo',
          insight: isEn ? 'Strong pipeline' : 'Pipeline solide'
        },
        { 
          label: isEn ? 'Bid Win' : 'Soumissions', 
          labelFull: isEn ? 'Bid-to-Win Ratio' : 'Ratio soumissions gagnées',
          value: '24%', 
          data: [18, 19, 19.5, 20, 21, 21.5, 22, 22.5, 23, 23.5, 24, 24], 
          projection: true,
          threshold: isEn ? 'Target: 15-25%' : 'Cible: 15-25%',
          target: '20%',
          previous: '22%',
          insight: isEn ? 'Competitive pricing' : 'Prix compétitifs'
        },
      ],
      benchmarks: [
        { metric: isEn ? 'Gross Margin' : 'Marge brute', yours: '22.5%', target: '15-30%', status: 'good' },
        { metric: isEn ? 'Backlog (Months)' : 'Carnet (mois)', yours: '8', target: '3-12', status: 'good' },
        { metric: isEn ? 'Bid-to-Win Ratio' : 'Ratio soumissions', yours: '24%', target: '15-25%', status: 'excellent' },
        { metric: isEn ? 'Job Margin Variance' : 'Écart marge projet', yours: '2.1%', target: '<5%', status: 'excellent' },
      ],
      roadmapItems: [
        { 
          plan: isEn ? 'Equipment Purchase' : 'Achat équipement', 
          start: 0, 
          end: 25, 
          color: theme.green,
        },
        { 
          plan: isEn ? 'Workforce Expansion' : 'Expansion main-d\'œuvre', 
          start: 20, 
          end: 60, 
          color: theme.gold,
        },
        { 
          plan: isEn ? 'New Market Entry' : 'Nouveau marché', 
          start: 50, 
          end: 100, 
          color: theme.green,
        },
      ]
    },
  ];

  const current = industries[selectedIndustry];

  // Get roadmap items from current industry
  const roadmapItems = current.roadmapItems;

  return (
    <div 
      className="relative w-full max-w-5xl mx-auto rounded-xl overflow-hidden shadow-2xl"
      style={{ 
        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.98)' : 'rgba(255, 255, 255, 0.99)',
        border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.6)'}`,
      }}
    >
      {/* Top Bar - Browser Chrome Style */}
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
        
        {/* Industry Tabs - Switchable */}
        <div className="flex items-center gap-1 ml-2">
          {industries.map((industry, idx) => (
            <button
              key={industry.id}
              onClick={() => setSelectedIndustry(idx)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-medium transition-all"
              style={{ 
                backgroundColor: selectedIndustry === idx ? `${industry.iconColor}15` : 'transparent',
                color: selectedIndustry === idx ? industry.iconColor : (isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)'),
                border: selectedIndustry === idx ? `1px solid ${industry.iconColor}30` : '1px solid transparent',
              }}
            >
              <industry.icon className="w-3.5 h-3.5" style={{ color: selectedIndustry === idx ? industry.iconColor : undefined }} />
              <span className="hidden sm:inline">{industry.name}</span>
            </button>
          ))}
        </div>
        
        <div className="flex-1" />
        
        <div className="hidden sm:flex items-center gap-2">
          {/* Real-time badge */}
          <div 
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-medium"
            style={{ backgroundColor: `${theme.green}15`, color: theme.green }}
          >
            <div className="relative">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.green }} />
              <div className="absolute inset-0 w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: theme.green, opacity: 0.5 }} />
            </div>
            {isEn ? 'Live Data' : 'Temps réel'}
          </div>
          {/* User avatar */}
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
        {/* Sidebar - Hidden on mobile - Matches App Layout */}
        <div 
          className="hidden md:flex flex-col w-52 border-r py-3 px-2"
          style={{ 
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(250, 250, 250, 0.8)',
            borderColor: isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)'
          }}
        >
          {/* Logo Header - Matches App */}
          <div className={`flex items-center gap-2 px-2 mb-4 transition-all duration-300 ${showElements ? 'opacity-100' : 'opacity-0'}`}>
            <div 
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ 
                background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                boxShadow: `0 2px 6px ${theme.green}40`
              }}
            >
              <svg className="w-4 h-4" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="5" width="3" height="22" rx="1" fill="rgba(255,255,255,0.5)"/>
                <rect x="8" y="5" width="20" height="22" rx="2" fill="white"/>
                <line x1="11" y1="10" x2="25" y2="10" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="11" y1="15" x2="25" y2="15" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="11" y1="20" x2="20" y2="20" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M17 21 L20 24 L26 17" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-xs font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              Plain<span style={{ color: theme.green }}>Ledger</span>
            </span>
          </div>
          
          {/* Dashboard - Active */}
          <div className={`mb-1 transition-all duration-300 ${showElements ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '0ms' }}>
            <div 
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-semibold cursor-pointer"
              style={{ 
                backgroundColor: `${theme.green}15`,
                color: theme.green,
              }}
            >
              <BarChart3 className="w-4 h-4" />
              {isEn ? 'Dashboard' : 'Tableau de bord'}
            </div>
          </div>
          
          {/* Visualizations */}
          <div className={`mb-1 transition-all duration-300 ${showElements ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '50ms' }}>
            <div 
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-medium cursor-pointer hover:bg-black/5 transition-colors"
              style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
            >
              <TrendingUp className="w-4 h-4" />
              {isEn ? 'Visualizations' : 'Visualisations'}
            </div>
          </div>
          
          {/* Strategic Planning */}
          <div className={`mb-1 transition-all duration-300 ${showElements ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '100ms' }}>
            <div 
              className="flex items-center justify-start gap-2 px-2.5 py-2 rounded-lg text-[11px] font-medium cursor-pointer hover:bg-black/5 transition-colors text-left"
              style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
            >
              <Target className="w-4 h-4 flex-shrink-0" />
              <span className="text-left">{isEn ? 'Strategic Planning' : 'Planification stratégique'}</span>
            </div>
          </div>
          
          {/* Anomalies */}
          <div className={`mb-1 transition-all duration-300 ${showElements ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '150ms' }}>
            <div 
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-medium cursor-pointer hover:bg-black/5 transition-colors"
              style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
            >
              <AlertCircle className="w-4 h-4" />
              {isEn ? 'Anomalies' : 'Anomalies'}
              <span 
                className="ml-auto flex items-center justify-center w-4 h-4 text-[9px] rounded-full font-semibold"
                style={{ backgroundColor: 'rgb(239, 68, 68)', color: 'white' }}
              >
                2
              </span>
            </div>
          </div>
          
          {/* Connections */}
          <div className={`mb-1 transition-all duration-300 ${showElements ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '200ms' }}>
            <div 
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-medium cursor-pointer hover:bg-black/5 transition-colors"
              style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
            >
              <Database className="w-4 h-4" />
              {isEn ? 'Connections' : 'Connexions'}
            </div>
          </div>
          
          {/* Reports */}
          <div className={`mb-1 transition-all duration-300 ${showElements ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '250ms' }}>
            <div 
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-medium cursor-pointer hover:bg-black/5 transition-colors"
              style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
            >
              <FileCheck className="w-4 h-4" />
              {isEn ? 'Reports' : 'Rapports'}
            </div>
          </div>
          
          {/* Board Meeting */}
          <div className={`mb-1 transition-all duration-300 ${showElements ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '300ms' }}>
            <div 
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-medium cursor-pointer hover:bg-black/5 transition-colors"
              style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
            >
              <Users className="w-4 h-4" />
              {isEn ? 'Board Meeting' : 'Réunion CA'}
            </div>
          </div>
          
          {/* Settings */}
          <div className={`mb-1 transition-all duration-300 ${showElements ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '350ms' }}>
            <div 
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-medium cursor-pointer hover:bg-black/5 transition-colors"
              style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
            >
              <Layers className="w-4 h-4" />
              {isEn ? 'Settings' : 'Paramètres'}
            </div>
          </div>
          
          {/* AI Status - Bottom */}
          <div 
            className="mt-auto p-3 rounded-xl"
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
                {current.id === 'realestate' 
                  ? (isEn ? '2 rent optimization tips' : '2 conseils optimisation loyers')
                  : (isEn ? '3 opportunities detected' : '3 opportunités détectées')
                }
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
                {isEn ? 'Industry Benchmarks' : 'Références sectorielles'} {current.name}
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
              className="grid text-[8px] sm:text-[9px] font-semibold uppercase tracking-wider px-3 sm:px-4 py-2"
              style={{ 
                backgroundColor: isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(248, 250, 252, 0.9)',
                gridTemplateColumns: '2fr 1fr 1fr 1fr 60px'
              }}
            >
              <span className="text-left" style={{ color: 'rgb(var(--color-text-muted))' }}>KPI</span>
              <span className="text-left" style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Current' : 'Actuel'}</span>
              <span className="text-left" style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Target' : 'Cible'}</span>
              <span className="text-left" style={{ color: 'rgb(var(--color-text-muted))' }}>Status</span>
              <span style={{ color: 'rgb(var(--color-text-muted))' }}></span>
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
                  className={`grid text-[9px] sm:text-[10px] px-3 sm:px-4 py-2.5 border-b last:border-b-0 cursor-pointer transition-all group ${
                    hoveredRow === i ? 'bg-opacity-50' : ''
                  }`}
                  style={{ 
                    borderColor: isDark ? 'rgba(71, 85, 105, 0.2)' : 'rgba(229, 231, 235, 0.4)',
                    backgroundColor: hoveredRow === i ? (isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(248, 250, 252, 0.9)') : 'transparent',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 60px'
                  }}
                  onMouseEnter={() => setHoveredRow(i)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <span className="font-medium flex items-center gap-1.5 text-left" style={{ color: 'rgb(var(--color-text))' }}>
                    {row.metric}
                    <Info 
                      className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity cursor-help" 
                      style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
                      title={isEn ? `Learn more about ${row.metric}` : `En savoir plus sur ${row.metric}`}
                    />
                  </span>
                  <span className="font-bold text-left" style={{ color: theme.green }}>{row.yours}</span>
                  <span 
                    className="px-2 py-0.5 rounded-full font-medium w-fit text-left"
                    style={{ 
                      backgroundColor: `${theme.gold}12`,
                      color: theme.goldDark,
                      fontSize: '9px'
                    }}
                  >
                    {row.target}
                  </span>
                  <div className="flex items-center gap-1 justify-start">
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
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="opacity-60 group-hover:opacity-100 transition-opacity p-1 rounded"
                      style={{ 
                        backgroundColor: `${theme.gold}12`,
                        color: theme.gold
                      }}
                      title={isEn ? 'AI Analysis' : 'Analyse IA'}
                    >
                      <Sparkles className="w-3 h-3" />
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

// Theme colors - Corporate green palette (emerald-based, professional)
const colors = {
  light: {
    green: '#059669',      // emerald-600 - primary corporate green
    greenDark: '#047857',  // emerald-700 - darker for depth
    greenLight: '#10b981', // emerald-500 - lighter accents
    gold: '#d4af37',
    goldDark: '#b8860b',
    goldText: '#8b7355',
    navBg: 'rgba(254, 253, 251, 0.92)',
  },
  dark: {
    green: '#10b981',      // emerald-500 - visible on dark bg
    greenDark: '#059669',  // emerald-600 - darker shade
    greenLight: '#34d399', // emerald-400 - highlights
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
                  <path d="M17 21 L20 24 L26 17" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="font-semibold text-lg" style={{ color: 'rgb(var(--color-text))' }}>
                PlainLedger
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-4 xl:gap-5" aria-label={isEn ? 'Main navigation' : 'Navigation principale'}>
              <a href="#features" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" style={{ color: 'rgb(var(--color-text-secondary))' }} aria-label={isEn ? 'View features' : 'Voir les fonctionnalités'}>
                {isEn ? 'Features' : 'Fonctionnalités'}
              </a>
              <a href="#industries" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" style={{ color: 'rgb(var(--color-text-secondary))' }} aria-label={isEn ? 'View industry KPIs' : 'Voir les KPIs par industrie'}>
                {isEn ? 'Industries' : 'Industries'}
              </a>
              <a href="#pipeline" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" style={{ color: 'rgb(var(--color-text-secondary))' }} aria-label={isEn ? 'Learn how it works' : 'Apprendre comment ça marche'}>
                {isEn ? 'How it Works' : 'Comment ça marche'}
              </a>
              <a href="#pricing" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" style={{ color: 'rgb(var(--color-text-secondary))' }} aria-label={isEn ? 'View pricing' : 'Voir les tarifs'}>
                {isEn ? 'Pricing' : 'Tarifs'}
              </a>
              <a href="#contact" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" style={{ color: 'rgb(var(--color-text-secondary))' }} aria-label={isEn ? 'Contact us' : 'Nous contacter'}>
                Contact
              </a>
            </nav>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-2 xl:gap-3">
              <ThemeToggle />
              <LanguageToggle />
              {authenticated ? (
                <Link 
                  to="/app" 
                  className="px-5 py-2.5 rounded-lg font-medium transition-all btn-primary btn-sm whitespace-nowrap"
                >
                  {isEn ? 'Go to Dashboard' : 'Accéder au dashboard'}
                </Link>
              ) : (
                <>
                  <button 
                    onClick={() => login()}
                    className="text-sm font-medium whitespace-nowrap"
                    style={{ color: 'rgb(var(--color-text-secondary))' }}
                  >
                    {isEn ? 'Sign in' : 'Connexion'}
                  </button>
                  <button 
                    onClick={() => register()}
                    className="btn-primary btn-sm whitespace-nowrap"
                  >
                    {isEn ? 'Start free' : 'Essai gratuit'}
                  </button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden flex items-center gap-2">
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
              className="lg:hidden py-4 border-t"
              style={{ borderColor: 'rgb(var(--color-border))' }}
            >
              <nav className="flex flex-col gap-1" aria-label={isEn ? 'Mobile navigation' : 'Navigation mobile'}>
                <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium py-2.5 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }} aria-label={isEn ? 'View features' : 'Voir les fonctionnalités'}>
                  {isEn ? 'Features' : 'Fonctionnalités'}
                </a>
                <a href="#industries" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium py-2.5 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }} aria-label={isEn ? 'View industry KPIs' : 'Voir les KPIs par industrie'}>
                  {isEn ? 'Industries' : 'Industries'}
                </a>
                <a href="#pipeline" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium py-2.5 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }} aria-label={isEn ? 'Learn how it works' : 'Apprendre comment ça marche'}>
                  {isEn ? 'How it Works' : 'Comment ça marche'}
                </a>
                <a href="#pricing" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium py-2.5 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }} aria-label={isEn ? 'View pricing' : 'Voir les tarifs'}>
                  {isEn ? 'Pricing' : 'Tarifs'}
                </a>
                <a href="#contact" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium py-2.5 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }} aria-label={isEn ? 'Contact us' : 'Nous contacter'}>
                  Contact
                </a>
                
                {/* Mobile Auth Actions */}
                <div className="flex flex-col gap-3 pt-4 mt-2 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
                  <button 
                    onClick={() => { login(); setIsMobileMenuOpen(false); }}
                    className="text-sm font-medium py-2.5 px-2 text-left rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    style={{ color: 'rgb(var(--color-text-secondary))' }}
                  >
                    {isEn ? 'Sign in' : 'Connexion'}
                  </button>
                  <button 
                    onClick={() => { register(); setIsMobileMenuOpen(false); }}
                    className="btn-primary w-full py-2.5 text-sm"
                  >
                    {isEn ? 'Start free' : 'Essai gratuit'}
                  </button>
                </div>
                
                {/* Language selector */}
                <div className="flex items-center gap-3 pt-3 mt-2 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
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
                  Know Your Numbers.
                </span>{' '}
                <span>Grow Your Business.</span>
              </>
            ) : (
              <>
                <span style={{ color: theme.green }}>
                  Maîtrisez vos chiffres.
                </span>{' '}
                <span>Faites croître votre entreprise.</span>
              </>
            )}
          </h1>

          {/* Compounding Intelligence Badge */}
          <div 
            className="flex justify-center mb-6 animate-fade-up opacity-0"
            style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}
          >
            <span 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
              style={{ 
                backgroundColor: `${theme.gold}15`,
                border: `1px solid ${theme.gold}25`,
                color: theme.gold
              }}
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" style={{ animationDuration: '8s' }} />
              {isEn ? 'AI that learns from 75,000+ Canadian businesses' : 'IA qui apprend de 75 000+ entreprises canadiennes'}
            </span>
          </div>

          {/* Value Proposition - Compounding Intelligence focused */}
          <div 
            className="max-w-3xl mx-auto mb-8 px-2 animate-fade-up opacity-0"
            style={{ animationDelay: '0.15s', animationFillMode: 'forwards' }}
          >
            <p 
              className="text-lg sm:text-xl md:text-2xl leading-relaxed mb-4"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'Industry-specific recommendations backed by real decisions from businesses like yours. Every insight gets smarter over time.'
                : 'Recommandations sectorielles basées sur de vraies décisions d\'entreprises comme la vôtre. Chaque insight devient plus intelligent avec le temps.'}
            </p>
            {/* Key value metrics */}
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm">
              <span 
                className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{ 
                  backgroundColor: `${theme.gold}15`,
                  color: theme.gold,
                  fontWeight: 600,
                }}
              >
                <Target className="w-4 h-4" />
                {isEn ? '92% Accuracy' : '92% Précision'}
              </span>
              <span 
                className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{ 
                  backgroundColor: `${theme.green}15`,
                  color: theme.green,
                  fontWeight: 600,
                }}
              >
                <TrendingUp className="w-4 h-4" />
                {isEn ? '15+ Industries' : '15+ Industries'}
              </span>
              <span 
                className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{ 
                  backgroundColor: `${theme.gold}15`,
                  color: theme.gold,
                  fontWeight: 600,
                }}
              >
                <Sparkles className="w-4 h-4" />
                {isEn ? 'Gets Smarter Daily' : 'S\'améliore chaque jour'}
              </span>
            </div>
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
              {isEn ? 'Get started free' : 'Commencer gratuitement'}
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

          {/* Trust badges - ROI focused */}
          <div 
            className="w-full flex justify-center animate-fade-up opacity-0"
            style={{ animationDelay: '0.35s', animationFillMode: 'forwards' }}
          >
            <div className="inline-flex flex-wrap justify-center items-center gap-4 sm:gap-8 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4" style={{ color: theme.green }} />
                {isEn ? 'Free to start' : 'Essai gratuit'}
              </span>
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4" style={{ color: theme.green }} />
                {isEn ? 'Connect in 5 min' : 'Connecté en 5 min'}
              </span>
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4" style={{ color: theme.green }} />
                {isEn ? 'Syncs with QuickBooks' : 'Synchro QuickBooks'}
              </span>
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4" style={{ color: theme.green }} />
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
        aria-label={isEn ? 'Executive dashboard features' : 'Fonctionnalités du tableau de bord exécutif'}
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
              {isEn ? 'Save 10+ Hours Weekly on Financial Reporting' : 'Économisez 10+ heures par semaine sur vos rapports'}
            </h2>
            <p 
              className="text-sm sm:text-base max-w-2xl mx-auto"
              style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
            >
              {isEn 
                ? 'Replace spreadsheets and manual reports with automated dashboards. Get the insights you need to make confident decisions, faster.'
                : 'Remplacez les feuilles de calcul et les rapports manuels par des tableaux de bord automatisés. Obtenez les insights nécessaires pour prendre des décisions éclairées, plus rapidement.'}
            </p>
          </motion.div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                icon: Eye,
                title: isEn ? 'Real-Time Visibility' : 'Visibilité en temps réel',
                desc: isEn 
                  ? 'No more waiting for month-end reports. See cash position, revenue trends, and margins the moment they change.'
                  : 'Fini l\'attente des rapports de fin de mois. Consultez votre trésorerie, revenus et marges dès qu\'ils changent.',
                highlight: isEn ? 'Updates every 15 min' : 'Mise à jour aux 15 min',
                stat: isEn ? '5hrs/week saved' : '5h/sem économisées',
                color: theme.green,
              },
              {
                icon: Brain,
                title: isEn ? 'AI-Powered Intelligence' : 'Intelligence alimentée par l\'IA',
                desc: isEn 
                  ? 'Catch issues before they cost you. Get specific recommendations on costs to cut, when to collect receivables, and where to invest.'
                  : 'Détectez les problèmes avant qu\'ils ne coûtent cher. Obtenez des recommandations sur les coûts, créances et investissements.',
                highlight: isEn ? '97% accuracy' : '97% de précision',
                stat: isEn ? '+8% avg margin' : '+8% marge moy.',
                color: theme.gold,
              },
              {
                icon: Target,
                title: isEn ? 'Goal Tracking' : 'Suivi des objectifs',
                desc: isEn 
                  ? 'Set revenue targets, margin goals, or cost limits. Track progress automatically against AI-analyzed benchmarks from 75,000+ businesses.'
                  : 'Définissez des objectifs de revenus, marges ou coûts. Suivez automatiquement la progression vs les benchmarks IA de 75 000+ entreprises.',
                highlight: isEn ? 'AI benchmarks' : 'Benchmarks IA',
                stat: isEn ? '75,000+ businesses' : '75 000+ entreprises',
                color: theme.green,
              },
              {
                icon: TrendingUp,
                title: isEn ? '12-Month Forecasts' : 'Prévisions 12 mois',
                desc: isEn 
                  ? 'Plan with confidence. Model different scenarios and see the financial impact before making decisions.'
                  : 'Planifiez en toute confiance. Modélisez différents scénarios et voyez l\'impact financier avant de décider.',
                highlight: isEn ? 'What-if analysis' : 'Analyse "what-if"',
                stat: isEn ? 'Better decisions' : 'Meilleures décisions',
                color: theme.gold,
              },
              {
                icon: FileCheck,
                title: isEn ? 'One-Click Reports' : 'Rapports en un clic',
                desc: isEn 
                  ? 'Export board-ready reports instantly. No more hours in Excel preparing for meetings.'
                  : 'Exportez des rapports prêts pour le CA instantanément. Fini les heures dans Excel avant les réunions.',
                highlight: isEn ? 'PDF, Excel, PPT' : 'PDF, Excel, PPT',
                stat: isEn ? '3hrs/report saved' : '3h/rapport écon.',
                color: theme.green,
              },
              {
                icon: BarChart3,
                title: isEn ? 'Market Intelligence' : 'Intelligence de marché',
                desc: isEn 
                  ? 'See how you stack up against 75,000+ Canadian businesses. AI-analyzed benchmarks for your industry and size.'
                  : 'Voyez votre position vs 75 000+ entreprises canadiennes. Benchmarks IA pour votre secteur et taille.',
                highlight: isEn ? 'AI benchmarks' : 'Benchmarks IA',
                stat: isEn ? '15+ industries' : '15+ industries',
                color: theme.green,
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
                  className="text-base font-bold mb-2 flex items-center gap-2"
                  style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
                >
                  {feature.title}
                  {(feature as any).isPro && (
                    <span 
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide"
                      style={{ 
                        backgroundColor: `${theme.gold}25`,
                        color: theme.gold
                      }}
                    >
                      PRO
                    </span>
                  )}
                </h3>
                
                {/* Description */}
                <p 
                  className="text-xs leading-relaxed mb-3"
                  style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
                >
                  {feature.desc}
                </p>
                
                {/* Highlight & Stat */}
                <div className="flex items-center gap-2 flex-wrap">
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
                  {'stat' in feature && (
                    <div 
                      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full"
                      style={{ 
                        backgroundColor: `${theme.green}15`,
                        color: theme.green
                      }}
                    >
                      <TrendingUp className="w-2.5 h-2.5" />
                      {(feature as any).stat}
                    </div>
                  )}
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
              className="text-sm mb-4 text-center w-full max-w-lg mx-auto px-4"
              style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
            >
              {isEn ? 'Businesses using PlainLedger report ' : 'Les entreprises utilisant PlainLedger rapportent des rapports '}
              <span style={{ color: theme.green, fontWeight: 600 }}>
                {isEn ? '40% faster' : '40% plus rapides'}
              </span>
              {isEn ? ' reporting and ' : ' et '}
              <span style={{ color: theme.green, fontWeight: 600 }}>
                {isEn ? '25% better' : '25% de meilleure'}
              </span>
              {isEn ? ' margin visibility.' : ' visibilité sur les marges.'}
            </p>
            <button 
              onClick={() => register()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white text-sm hover:opacity-90 transition-opacity"
              style={{ 
                background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                boxShadow: `0 4px 16px ${theme.green}35`
              }}
            >
              {isEn ? 'Start saving time today' : 'Commencez à économiser du temps'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* AI-Powered Anomaly Detection Section */}
      <section 
        id="ai-anomalies" 
        className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 relative overflow-hidden"
        style={{ 
          background: isDark 
            ? 'linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)' 
            : 'linear-gradient(180deg, #f8fafc 0%, #ffffff 50%, #f0fdf4 100%)'
        }}
      >
        {/* Background pattern */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(${theme.gold}15 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }}
        />

        <div className="max-w-6xl mx-auto relative z-10">
          {/* Section Header */}
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div 
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold mb-3"
              style={{ 
                background: `${theme.gold}15`,
                border: `1px solid ${theme.gold}25`,
                color: theme.gold
              }}
            >
              <Brain className="w-3.5 h-3.5" />
              <Sparkles className="w-3 h-3" />
              {isEn ? 'AI-Powered' : 'Propulsé par l\'IA'}
            </div>
            <h2 
              className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4"
              style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
            >
              {isEn ? 'AI That Learns From Your Industry' : 'IA qui apprend de votre industrie'}
            </h2>
            <p 
              className="text-sm sm:text-base max-w-2xl mx-auto mb-4"
              style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
            >
              {isEn 
                ? 'Our AI catches duplicate payments, billing errors, and unusual expenses that typically go unnoticed. Average recovery: $28,000/year per business.'
                : 'Notre IA détecte les paiements en double, erreurs de facturation et dépenses inhabituelles qui passent souvent inaperçues. Récupération moyenne: 28 000$/an par entreprise.'}
            </p>
            {/* Learning Badge */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span 
                className="text-xs font-medium"
                style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
              >
                {isEn 
                  ? 'Trained on 847K+ real business decisions' 
                  : 'Entraîné sur 847K+ vraies décisions d\'affaires'}
              </span>
            </div>
          </motion.div>

          {/* Two-column layout: AI Features & Notification Platforms */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
            
            {/* Left Column - AI Detection Capabilities */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="p-6 rounded-2xl"
              style={{ 
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.95)',
                border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)'}`,
                boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.2)' : '0 4px 24px rgba(0,0,0,0.06)',
              }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ 
                    background: `linear-gradient(135deg, ${theme.gold}20 0%, ${theme.gold}10 100%)`,
                    border: `1px solid ${theme.gold}30`
                  }}
                >
                  <Brain className="w-6 h-6" style={{ color: theme.gold }} />
                </div>
                <div>
                  <h3 
                    className="text-lg font-bold"
                    style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
                  >
                    {isEn ? 'Learning Detection Engine' : 'Moteur de détection apprenant'}
                  </h3>
                  <p className="text-xs" style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}>
                    {isEn 
                      ? 'Gets smarter with every business that joins. Currently trained on patterns from 75,000+ Canadian businesses.' 
                      : 'S\'améliore avec chaque entreprise qui rejoint. Actuellement entraîné sur les modèles de 75 000+ entreprises canadiennes.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    title: isEn ? 'Duplicate Payment Detection' : 'Détection paiements en double',
                    desc: isEn ? 'Catches duplicate invoices and payments before you lose money. Avg savings: $4,200/year.' : 'Détecte les factures et paiements en double avant qu\'ils ne coûtent. Économies moy.: 4 200$/an.',
                  },
                  {
                    title: isEn ? 'Cash Flow Warnings' : 'Alertes de trésorerie',
                    desc: isEn ? 'Get 30-day advance warning on potential cash shortfalls. Never be caught off guard.' : 'Recevez des alertes 30 jours à l\'avance sur les manques de trésorerie. Ne soyez plus pris au dépourvu.',
                  },
                  {
                    title: isEn ? 'Cost Overrun Alerts' : 'Alertes dépassements coûts',
                    desc: isEn ? 'Know instantly when expenses exceed budget or historical patterns.' : 'Sachez immédiatement quand les dépenses dépassent le budget ou les tendances historiques.',
                  },
                  {
                    title: isEn ? 'AI Market Intelligence' : 'Intelligence de marché IA',
                    desc: isEn ? 'Our AI analyzes 75,000+ businesses to show your competitive position. Identify opportunities faster.' : 'Notre IA analyse 75 000+ entreprises pour montrer votre position concurrentielle. Identifiez les opportunités plus vite.',
                  },
                ].map((item, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.2 + idx * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-lg transition-colors"
                    style={{ 
                      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(248, 250, 252, 0.8)',
                    }}
                  >
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: `${theme.gold}15` }}
                    >
                      <Check className="w-3.5 h-3.5" style={{ color: theme.gold }} />
                    </div>
                    <div>
                      <p 
                        className="text-sm font-medium"
                        style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
                      >
                        {item.title}
                      </p>
                      <p 
                        className="text-xs mt-0.5"
                        style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
                      >
                        {item.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Accuracy badge */}
              <div 
                className="mt-5 flex items-center justify-center gap-2 py-2.5 rounded-lg"
                style={{ 
                  background: `linear-gradient(135deg, ${theme.gold}10 0%, ${theme.green}10 100%)`,
                  border: `1px solid ${theme.gold}20`
                }}
              >
                <Sparkles className="w-4 h-4" style={{ color: theme.gold }} />
                <span 
                  className="text-sm font-semibold"
                  style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
                >
                  97% {isEn ? 'detection accuracy' : 'précision de détection'}
                </span>
              </div>
            </motion.div>

            {/* Right Column - Notification Platforms */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="p-6 rounded-2xl"
              style={{ 
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.95)',
                border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)'}`,
                boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.2)' : '0 4px 24px rgba(0,0,0,0.06)',
              }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ 
                    background: `linear-gradient(135deg, ${theme.green}20 0%, ${theme.green}10 100%)`,
                    border: `1px solid ${theme.green}30`
                  }}
                >
                  <Bell className="w-6 h-6" style={{ color: theme.green }} />
                </div>
                <div>
                  <h3 
                    className="text-lg font-bold"
                    style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
                  >
                    {isEn ? 'Alerts Where You Work' : 'Alertes là où vous travaillez'}
                  </h3>
                  <p className="text-xs" style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}>
                    {isEn ? 'Multi-platform notification support' : 'Support de notifications multi-plateformes'}
                  </p>
                </div>
              </div>

              {/* Notification platforms grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                {[
                  { icon: Mail, name: 'Email', color: theme.green, desc: isEn ? 'Detailed reports' : 'Rapports détaillés' },
                  { icon: Smartphone, name: isEn ? 'Push' : 'Push', color: theme.green, desc: isEn ? 'Mobile alerts' : 'Alertes mobiles' },
                  { icon: MessageSquare, name: 'SMS', color: theme.gold, desc: isEn ? 'Critical alerts' : 'Alertes critiques' },
                  { icon: Hash, name: 'Slack', color: theme.green, desc: isEn ? 'Team channels' : 'Canaux d\'équipe' },
                  { icon: Users, name: 'Teams', color: theme.gold, desc: isEn ? 'Microsoft 365' : 'Microsoft 365' },
                  { icon: Bell, name: isEn ? 'In-App' : 'In-App', color: theme.green, desc: isEn ? 'Dashboard alerts' : 'Alertes tableau de bord' },
                ].map((platform, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.3 + idx * 0.08 }}
                    className="group p-3 rounded-xl text-center transition-all duration-300 cursor-default"
                    style={{ 
                      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(248, 250, 252, 0.9)',
                      border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.6)'}`,
                    }}
                  >
                    <div 
                      className="w-10 h-10 mx-auto rounded-lg flex items-center justify-center mb-2 transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `${platform.color}15` }}
                    >
                      <platform.icon className="w-5 h-5" style={{ color: platform.color }} />
                    </div>
                    <p 
                      className="text-sm font-semibold"
                      style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
                    >
                      {platform.name}
                    </p>
                    <p 
                      className="text-[10px] mt-0.5"
                      style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
                    >
                      {platform.desc}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Features list */}
              <div 
                className="p-4 rounded-xl"
                style={{ 
                  backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(248, 250, 252, 0.8)',
                }}
              >
                <p 
                  className="text-xs font-semibold mb-3"
                  style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
                >
                  {isEn ? 'NOTIFICATION FEATURES' : 'FONCTIONNALITÉS'}
                </p>
                <div className="space-y-2">
                  {[
                    isEn ? 'Customizable alert thresholds' : 'Seuils d\'alerte personnalisables',
                    isEn ? 'Priority-based routing' : 'Routage par priorité',
                    isEn ? 'Scheduled digest summaries' : 'Résumés planifiés',
                    isEn ? 'Role-based notifications' : 'Notifications par rôle',
                  ].map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: theme.green }} />
                      <span 
                        className="text-xs"
                        style={{ color: isDark ? 'rgb(203, 213, 225)' : 'rgb(71, 85, 105)' }}
                      >
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Bottom CTA */}
          <motion.div 
            className="text-center mt-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <p 
              className="text-sm mb-4 text-center max-w-xl mx-auto"
              style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
            >
              {isEn 
                ? 'The average PlainLedger user recovers ' 
                : 'L\'utilisateur moyen de PlainLedger récupère '}
              <span style={{ color: theme.gold, fontWeight: 600 }}>$28K</span>
              {isEn 
                ? ' in their first year from prevented errors.'
                : ' la première année grâce aux erreurs évitées.'}
            </p>
            <button 
              onClick={() => register()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white text-sm hover:scale-105 transition-all"
              style={{ 
                background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                boxShadow: `0 4px 16px ${theme.green}40`
              }}
            >
              {isEn ? 'See what AI finds in your data' : 'Voyez ce que l\'IA trouve dans vos données'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Compounding Intelligence Section */}
      <section 
        id="compounding-intelligence" 
        className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 relative overflow-hidden"
        aria-label={isEn ? 'Compounding Industry Intelligence' : 'Intelligence industrielle composée'}
        style={{ 
          background: isDark 
            ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.95) 100%)' 
            : 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 50%, #ffffff 100%)'
        }}
      >
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div 
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold mb-3"
              style={{ 
                background: `${theme.gold}15`,
                border: `1px solid ${theme.gold}25`,
                color: theme.gold
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isEn ? 'Getting Smarter Every Day' : 'Plus intelligent chaque jour'}
            </div>
            <h2 
              className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4"
              style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
            >
              {isEn ? 'The More You Use It, The Smarter It Gets' : 'Plus vous l\'utilisez, plus il devient intelligent'}
            </h2>
            <p 
              className="text-sm sm:text-base max-w-2xl mx-auto"
              style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
            >
              {isEn 
                ? 'Our AI learns from every decision across 75,000+ businesses. The result? Recommendations that compound in accuracy over time.'
                : 'Notre IA apprend de chaque décision parmi 75 000+ entreprises. Le résultat? Des recommandations dont la précision s\'améliore avec le temps.'}
            </p>
          </motion.div>

          {/* Flywheel Visualization */}
          <motion.div 
            className="mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <FlywheelVisualization theme={theme} isDark={isDark} />
          </motion.div>

          {/* Key Metrics */}
          <AIMetricsRow theme={theme} isDark={isDark} />
        </div>
      </section>

      {/* AI Technology Stack Section */}
      <section 
        id="ai-technology" 
        className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 relative"
        aria-label={isEn ? 'AI Technology Stack' : 'Stack technologique IA'}
        style={{ 
          background: isDark 
            ? 'linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)' 
            : 'linear-gradient(180deg, #f8fafc 0%, #ffffff 50%, #f8fafc 100%)'
        }}
      >
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div 
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold mb-3"
              style={{ 
                background: `${theme.green}15`,
                border: `1px solid ${theme.green}25`,
                color: theme.greenDark
              }}
            >
              <Brain className="w-3.5 h-3.5" />
              {isEn ? 'Enterprise AI' : 'IA Entreprise'}
            </div>
            <h2 
              className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4"
              style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
            >
              {isEn ? 'Powered by World-Class AI' : 'Propulsé par une IA de classe mondiale'}
            </h2>
            <p 
              className="text-sm sm:text-base max-w-2xl mx-auto"
              style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
            >
              {isEn 
                ? 'We combine the best commercial AI models with proprietary models trained on real Canadian business decisions.'
                : 'Nous combinons les meilleurs modèles IA commerciaux avec des modèles propriétaires entraînés sur de vraies décisions d\'entreprises canadiennes.'}
            </p>
          </motion.div>

          {/* AI Technology Stack Component */}
          <AITechnologyStack theme={theme} isDark={isDark} />
        </div>
      </section>

      {/* Industry KPIs Section - Formulas & Benchmarks */}
      <span id="industry-kpis" className="absolute" style={{ top: '-100px' }} />
      <section id="industries" className="relative" aria-label={isEn ? 'Industry-specific KPIs and benchmarks' : 'KPIs et références par industrie'}>
        <IndustryKPISection onScheduleCall={handleScheduleCall} />
      </section>

      {/* Tax Credits Section */}
      <section 
        id="tax-credits" 
        className="py-10 sm:py-14 lg:py-16 px-4 sm:px-6 relative"
        aria-label={isEn ? 'Tax credits and subventions' : 'Crédits d\'impôt et subventions'}
        style={{ 
          background: isDark 
            ? 'transparent' 
            : 'linear-gradient(180deg, rgba(240, 253, 244, 0.3) 0%, rgba(255, 255, 255, 0.9) 100%)'
        }}
      >
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-8 sm:mb-12"
          >
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.2 }}
              style={{ 
                background: `linear-gradient(135deg, ${theme.gold}15 0%, ${theme.green}10 100%)`,
                border: `1px solid ${theme.gold}30`
              }}
            >
              <DollarSign className="w-4 h-4" style={{ color: theme.gold }} />
              <span className="text-sm font-semibold" style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}>
                {isEn ? 'Average unclaimed credits: ' : 'Crédits non réclamés moyens: '}
                <span style={{ color: theme.gold }}>$47,000</span>
              </span>
            </motion.div>
            
            <motion.h2 
              className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4"
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? 'Discover Tax Credits You May Be Missing' : 'Découvrez les crédits d\'impôt que vous pourriez manquer'}
            </motion.h2>
            <motion.p 
              className="text-sm sm:text-base lg:text-lg mb-8 sm:mb-10 lg:mb-12 max-w-2xl mx-auto px-2 text-center"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'PlainLedger automatically analyzes your financial data to identify eligible federal and provincial tax credits. Get matched with certified specialists to maximize your benefits.'
                : 'PlainLedger analyse automatiquement vos données financières pour identifier les crédits d\'impôt fédéraux et provinciaux admissibles. Obtenez une mise en relation avec des spécialistes certifiés pour maximiser vos avantages.'}
            </motion.p>
          </motion.div>

          {/* Tax Credits Grid */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 1.3, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
          >
            {[
              {
                id: 'sred',
                name: { en: 'SR&ED', fr: 'RSDE' },
                description: { en: 'Up to 35% refundable credit on R&D expenditures', fr: 'Jusqu\'à 35% de crédit remboursable sur les dépenses R-D' },
                industries: { en: 'Technology, Manufacturing', fr: 'Technologie, Manufacturier' },
              },
              {
                id: 'cric',
                name: { en: 'CRIC', fr: 'CRIC' },
                description: { en: 'Quebec R&D credit: 20-30% on innovation', fr: 'Crédit R-D Québec: 20-30% sur l\'innovation' },
                industries: { en: 'Quebec businesses', fr: 'Entreprises québécoises' },
              },
              {
                id: 'cdae',
                name: { en: 'CDAE', fr: 'CDAE' },
                description: { en: '30% credit on IT salaries, max $25K/employee', fr: '30% crédit sur salaires TI, max 25K$/employé' },
                industries: { en: 'Quebec IT companies', fr: 'Entreprises TI québécoises' },
              },
              {
                id: 'oidmtc',
                name: { en: 'OIDMTC', fr: 'OIDMTC' },
                description: { en: '40% credit on digital media development', fr: '40% crédit sur développement médias numériques' },
                industries: { en: 'Ontario digital media', fr: 'Médias numériques Ontario' },
              },
              {
                id: 'ommitc',
                name: { en: 'OMMITC', fr: 'OMMITC' },
                description: { en: '15% credit on manufacturing investments', fr: '15% crédit sur investissements manufacturiers' },
                industries: { en: 'Ontario manufacturing', fr: 'Manufacturier Ontario' },
              },
              {
                id: 'apprenticeship',
                name: { en: 'Apprenticeship', fr: 'Apprentissage' },
                description: { en: '$2,000 per eligible apprentice per year', fr: '2 000 $ par apprenti admissible par année' },
                industries: { en: 'Construction, Manufacturing', fr: 'Construction, Manufacturier' },
              },
            ].map((credit, idx) => (
              <motion.div
                key={credit.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 sm:p-6 hover:shadow-lg transition-all"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 + 0.5 }}
                whileHover={{ y: -4, scale: 1.02 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {credit.name[language]}
                  </h3>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {credit.description[language]}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Building2 className="w-3 h-3" />
                  <span>{credit.industries[language]}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div 
            className="text-center mt-8 sm:mt-10"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.8 }}
          >
            <button 
              onClick={() => register()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-all hover:scale-105 hover:shadow-lg text-sm"
              style={{ 
                background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                boxShadow: `0 4px 16px ${theme.green}35`
              }}
            >
              {isEn ? 'Connect Your Data to See Your Eligibility' : 'Connectez vos données pour voir votre éligibilité'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* How It Works - Clean Animated Pipeline */}
      <section 
        id="pipeline" 
        className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 relative overflow-hidden"
        aria-label={isEn ? 'How PlainLedger works in 4 steps' : 'Comment PlainLedger fonctionne en 4 étapes'}
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
              {isEn ? 'From Spreadsheets to Insights in 5 Minutes' : 'De vos feuilles de calcul aux insights en 5 minutes'}
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
                ? 'Connect your accounting software and get your first insights today. No IT required.'
                : 'Connectez votre logiciel comptable et obtenez vos premiers insights aujourd\'hui. Aucune ressource TI requise.'}
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
                  desc: isEn ? '2 clicks to connect QuickBooks, Xero, or Sage securely' : '2 clics pour connecter QuickBooks, Xero ou Sage de façon sécurisée',
                  tags: ['QuickBooks', 'Xero', 'Sage'],
                  time: isEn ? '2 min' : '2 min',
                  color: theme.green,
                  visual: 'connect',
                },
                { 
                  num: 2, 
                  icon: RefreshCw, 
                  title: isEn ? 'Sync & Secure' : 'Sync. & Sécurisé',
                  desc: isEn ? 'Data stored in Canada. Bank-level encryption.' : 'Données stockées au Canada. Chiffrement bancaire.',
                  tags: [isEn ? 'Encrypted' : 'Chiffré', isEn ? 'Canadian' : 'Canadien'],
                  time: isEn ? 'Auto' : 'Auto',
                  color: theme.green,
                  visual: 'clean',
                },
                { 
                  num: 3, 
                  icon: Sparkles, 
                  title: isEn ? 'AI Analyzes' : 'L\'IA analyse',
                  desc: isEn ? 'Detects anomalies, calculates KPIs, spots trends' : 'Détecte anomalies, calcule KPIs, repère tendances',
                  tags: ['97%', isEn ? 'Accuracy' : 'Précision', 'ML'],
                  time: isEn ? '1 min' : '1 min',
                  color: theme.gold,
                  visual: 'ai',
                },
                { 
                  num: 4, 
                  icon: TrendingUp, 
                  title: isEn ? 'You Decide' : 'Vous décidez',
                  desc: isEn ? 'Executive dashboards with actionable recommendations' : 'Tableaux de bord exécutifs avec recommandations actionnables',
                  tags: ['KPIs', isEn ? 'Forecasts' : 'Prévisions', isEn ? 'Alerts' : 'Alertes'],
                  time: isEn ? 'Instant' : 'Instantané',
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
                    className="relative p-4 sm:p-5 rounded-xl cursor-pointer overflow-hidden h-full flex flex-col"
                    style={{ 
                      minHeight: '320px',
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
                    
                    {/* Description - Fixed height for alignment */}
                    <p 
                      className="text-xs sm:text-sm mb-3 leading-relaxed"
                      style={{ 
                        color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)',
                        height: '3rem',
                        overflow: 'hidden'
                      }}
                    >
                      {step.desc}
                    </p>
                    
                    {/* Mini Visualization Area - Flex grow to fill space */}
                    <div 
                      className="relative flex-1 min-h-[64px] mb-3 rounded-lg overflow-hidden"
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
                    
                    {/* Tags with enhanced styling - Always at bottom */}
                    <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
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
            <p 
              className="text-sm mb-4 text-center max-w-md mx-auto"
              style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
            >
              {isEn ? 'Total setup time: ' : 'Temps de configuration total: '}
              <span style={{ color: theme.green, fontWeight: 600 }}>
                {isEn ? 'under 5 minutes' : 'moins de 5 minutes'}
              </span>
              {isEn ? '. First insights: ' : '. Premiers insights: '}
              <span style={{ color: theme.gold, fontWeight: 600 }}>
                {isEn ? 'immediate' : 'immédiats'}
              </span>
              .
            </p>
            <button 
              onClick={() => register()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-all hover:scale-105 hover:shadow-lg text-sm"
              style={{ 
                background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                boxShadow: `0 4px 16px ${theme.green}35`
              }}
            >
              {isEn ? 'Connect your accounting software' : 'Connectez votre logiciel comptable'}
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
        aria-label={isEn ? 'Pricing and features included' : 'Tarifs et fonctionnalités incluses'}
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
            {/* Compounding Intelligence Badge */}
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.2 }}
              style={{ 
                background: `${theme.gold}15`,
                border: `1px solid ${theme.gold}25`
              }}
            >
              <RefreshCw className="w-4 h-4" style={{ color: theme.gold }} />
              <span className="text-sm font-semibold" style={{ color: theme.gold }}>
                {isEn 
                  ? 'Gets smarter every day - same price' 
                  : 'Plus intelligent chaque jour - même prix'}
              </span>
            </motion.div>
            
            {/* ROI Highlight */}
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.3 }}
              style={{ 
                background: `linear-gradient(135deg, ${theme.gold}15 0%, ${theme.green}10 100%)`,
                border: `1px solid ${theme.gold}30`
              }}
            >
              <TrendingUp className="w-4 h-4" style={{ color: theme.gold }} />
              <span className="text-sm font-semibold" style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}>
                {isEn ? 'Average ROI: ' : 'ROI moyen: '}
                <span style={{ color: theme.gold }}>8x</span>
                {isEn ? ' in the first year' : ' la première année'}
              </span>
            </motion.div>
            
            <motion.h2 
              className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4"
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? 'Costs Less Than the Errors It Prevents' : 'Coûte moins que les erreurs qu\'il prévient'}
            </motion.h2>
            <motion.p 
              className="text-sm sm:text-base lg:text-lg mb-8 sm:mb-10 lg:mb-12 max-w-xl mx-auto px-2 text-center"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'Unlike static software, PlainLedger\'s recommendations improve monthly as our AI learns from more decisions. Today\'s price locks in tomorrow\'s intelligence.'
                : 'Contrairement aux logiciels statiques, les recommandations de PlainLedger s\'améliorent mensuellement à mesure que notre IA apprend. Le prix d\'aujourd\'hui garantit l\'intelligence de demain.'}
            </motion.p>
          </motion.div>

          {/* Features Grid */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 1.3, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="p-6 sm:p-8 lg:p-10 rounded-2xl"
            style={{ 
              background: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255,255,255,0.9)',
              border: isDark ? '1px solid rgba(71, 85, 105, 0.5)' : '1px solid rgba(203, 213, 225, 0.5)',
            }}
          >
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 justify-items-start">
              {[
                { en: 'AI anomaly detection', fr: 'Détection d\'anomalies IA', highlight: true },
                { en: '75K+ business benchmarks', fr: 'Benchmarks 75K+ entreprises', highlight: true },
                { en: '15+ industry KPIs', fr: '15+ KPIs sectoriels', highlight: true },
                { en: 'Cash flow forecasting', fr: 'Prévisions de trésorerie', highlight: true },
                { en: 'Real-time dashboards', fr: 'Tableaux de bord temps réel' },
                { en: 'Board-ready reports', fr: 'Rapports prêts pour le CA' },
                { en: 'Budget vs Actual', fr: 'Budget vs Réel' },
                { en: 'Multi-entity support', fr: 'Support multi-entités' },
                { en: 'Slack & Teams alerts', fr: 'Alertes Slack & Teams' },
                { en: 'Multi-format exports', fr: 'Exports multi-formats' },
                { en: 'Priority CPA support', fr: 'Support CPA prioritaire' },
                { en: 'Data stored in Canada 🇨🇦', fr: 'Données au Canada 🇨🇦' },
              ].map((feature, idx) => (
                <motion.div 
                  key={feature.en}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 * idx, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-3"
                >
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: (feature as any).highlight ? `${theme.gold}20` : `${theme.green}20` }}
                  >
                    <Check className="w-3.5 h-3.5" style={{ color: (feature as any).highlight ? theme.gold : theme.green }} />
                  </div>
                  <span 
                    className="text-sm sm:text-base flex items-center gap-2" 
                    style={{ 
                      color: 'rgb(var(--color-text-secondary))',
                      fontWeight: (feature as any).highlight ? 600 : 400
                    }}
                  >
                    {isEn ? feature.en : feature.fr}
                    {(feature as any).pro && (
                      <span 
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide"
                        style={{ 
                          backgroundColor: `${theme.gold}25`,
                          color: theme.gold
                        }}
                      >
                        PRO
                      </span>
                    )}
                  </span>
                </motion.div>
              ))}
            </div>
            
            {/* CTA Button */}
            <div className="mt-8 flex flex-col items-center justify-center">
              <button 
                onClick={() => register()}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white text-base hover:opacity-90 transition-all hover:scale-105"
                style={{ 
                  background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                  boxShadow: `0 4px 20px ${theme.green}40`
                }}
              >
                {isEn ? 'Start free, see your ROI in minutes' : 'Commencez gratuitement, voyez votre ROI en minutes'}
                <ArrowRight className="w-5 h-5" />
              </button>
              <p 
                className="text-xs mt-4 text-center"
                style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
              >
                {isEn ? 'No credit card required. Cancel anytime.' : 'Sans carte de crédit. Annulez à tout moment.'}
              </p>
            </div>
          </motion.div>
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
                {isEn ? '75,000+ businesses contributing to intelligence' : '75 000+ entreprises contribuant à l\'intelligence'}
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
              {isEn ? 'Join the Intelligence Network' : 'Rejoignez le réseau d\'intelligence'}
            </motion.h2>
            
            {/* Subheading */}
            <motion.p 
              className="text-base sm:text-lg lg:text-xl mb-8 text-white/85 max-w-2xl mx-auto text-center"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.3, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              {isEn 
                ? 'Every business that joins makes our AI smarter. Early adopters get the best ROI as our recommendations compound in accuracy.'
                : 'Chaque entreprise qui rejoint rend notre IA plus intelligente. Les premiers adopteurs obtiennent le meilleur ROI à mesure que nos recommandations s\'améliorent.'}
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
                {isEn ? 'Start free today' : 'Commencez gratuitement'}
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
                {isEn ? 'Get a personalized demo' : 'Obtenez une démo personnalisée'}
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
                  { text: isEn ? '8x average ROI' : 'ROI moyen de 8x' },
                  { text: isEn ? '5 min setup' : 'Config. en 5 min' },
                  { text: isEn ? 'Data in Canada' : 'Données au Canada', flag: true },
                ].map((badge, idx) => (
                  <motion.span 
                    key={idx}
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.8 + idx * 0.15, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Check className="w-4 h-4 text-green-400" />
                    {badge.text} {badge.flag && '🇨🇦'}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section 
        id="contact"
        className="py-16 sm:py-24 px-4 sm:px-6"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          borderTop: `1px solid ${theme.green}15`,
        }}
      >
        <div className="max-w-4xl mx-auto">
          <motion.div 
            className="text-center mb-10 sm:mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 
              className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? 'Get in Touch' : 'Contactez-nous'}
            </h2>
            <p 
              className="text-base sm:text-lg max-w-2xl mx-auto"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn 
                ? 'Have questions? Want a personalized demo? Our team is here to help.'
                : 'Des questions? Vous voulez une démo personnalisée? Notre équipe est là pour vous aider.'}
            </p>
          </motion.div>
          
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Contact Info */}
            <div className="space-y-6">
              <div 
                className="p-6 rounded-2xl"
                style={{ 
                  backgroundColor: `${theme.green}08`,
                  border: `1px solid ${theme.green}20`,
                }}
              >
                <h3 
                  className="text-lg font-semibold mb-4"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn ? 'Contact Information' : 'Coordonnées'}
                </h3>
                <div className="space-y-4">
                  <a 
                    href="mailto:info@plainledger.ca" 
                    className="flex items-center gap-3 transition-colors group"
                  >
                    <div 
                      className="p-2.5 rounded-lg"
                      style={{ backgroundColor: `${theme.green}15` }}
                    >
                      <Mail className="w-5 h-5" style={{ color: theme.green }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                        {isEn ? 'Email' : 'Courriel'}
                      </p>
                      <p 
                        className="text-sm group-hover:underline"
                        style={{ color: theme.green }}
                      >
                        info@plainledger.ca
                      </p>
                    </div>
                  </a>
                  
                  <button
                    onClick={handleScheduleCall}
                    className="flex items-center gap-3 transition-colors group w-full text-left"
                  >
                    <div 
                      className="p-2.5 rounded-lg"
                      style={{ backgroundColor: `${theme.green}15` }}
                    >
                      <Calendar className="w-5 h-5" style={{ color: theme.green }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                        {isEn ? 'Schedule a Call' : 'Planifier un appel'}
                      </p>
                      <p 
                        className="text-sm group-hover:underline"
                        style={{ color: theme.green }}
                      >
                        {isEn ? 'Book a 15-min demo' : 'Réservez une démo de 15 min'}
                      </p>
                    </div>
                  </button>
                </div>
              </div>
              
              {/* Response Time Badge */}
              <div 
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{ 
                  backgroundColor: `${theme.green}08`,
                  border: `1px solid ${theme.green}15`,
                }}
              >
                <div className="flex-shrink-0">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${theme.green}15` }}
                  >
                    <Check className="w-5 h-5" style={{ color: theme.green }} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? 'Quick Response' : 'Réponse rapide'}
                  </p>
                  <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn 
                      ? 'We typically respond within 24 hours'
                      : 'Nous répondons généralement dans les 24 heures'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Contact Form */}
            <div 
              className="p-6 sm:p-8 rounded-2xl"
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))',
                border: `1px solid ${theme.green}20`,
                boxShadow: `0 4px 30px ${theme.green}08`,
              }}
            >
              <ContactForm 
                source="website" 
                landingStyle={true}
                theme={{
                  green: theme.green,
                  greenDark: theme.greenDark,
                  greenLight: theme.greenLight,
                }}
              />
            </div>
          </motion.div>
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
                <path d="M17 21 L20 24 L26 17" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-medium text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text))' }}>PlainLedger</span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            <Link to="/privacy" className="transition-colors hover:underline">{isEn ? 'Privacy' : 'Confidentialité'}</Link>
            <Link to="/terms" className="transition-colors hover:underline">{isEn ? 'Terms' : 'Conditions'}</Link>
            <a href="#contact" className="transition-colors hover:underline">Contact</a>
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
        onGetStarted={() => {
          setShowDemoModal(false);
          register();
        }}
      />
    </div>
  );
}
