import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/keycloak';
import { useI18n } from '../lib/i18n';
import { useReducedMotion } from '../hooks/useReducedMotion';
import PublicHeader from '../components/PublicHeader';
import IndustryKPISection from '../components/IndustryKPISection';
import DemoModal from '../components/DemoModal';
import ContactForm from '../components/ContactForm';
import { GetTheApp } from '../components/GetTheApp';
import { InstallAppModal } from '../components/InstallAppModal';
import { 
  ArrowRight,
  ArrowDown,
  Check,
  Shield,
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
  Gift,
  Clock,
  Lock,
  Server,
  ShieldCheck,
  KeyRound,
  Wallet,
  Calculator,
  Cpu,
  Percent,
  PieChart,
  Receipt,
  Briefcase,
  LineChart,
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
// ANIMATED COUNTER COMPONENT
// =====================================================

function AnimatedCounter({ 
  end, 
  prefix = '', 
  suffix = '',
  separator = ',',
  duration = 2000,
  delay = 0 
}: { 
  end: number; 
  prefix?: string;
  suffix?: string;
  separator?: string;
  duration?: number;
  delay?: number;
}) {
  const { ref, isInView } = useInView();
  const count = useAnimatedCounter(end, duration, delay, isInView);
  
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  };
  
  return (
    <span ref={ref}>
      {prefix}{formatNumber(count)}{suffix}
    </span>
  );
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
  color = 'rgb(var(--color-primary-600))',
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
  
  const maxValue = data.length > 0 
    ? Math.max(...data.map(d => Math.max(d?.actual ?? 0, d?.budget ?? 0))) 
    : 0;
  
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
                    <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: isAboveBudget ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-muted))' }} />
                    <span>Actual: ${d.actual}K</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: 'rgb(var(--color-border))' }} />
                    <span>Budget: ${d.budget}K</span>
                  </div>
                  {isAboveBudget && (
                    <div className="text-[8px] mt-1 font-medium" style={{ color: 'rgb(var(--color-primary-600))' }}>
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
                    backgroundColor: isAboveBudget ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-muted))',
                    boxShadow: isAboveBudget && isHovered ? '0 0 12px rgba(16, 185, 129, 0.5)' : 'none',
                  }}
                />
                <div 
                  className={`w-[45%] rounded-t transition-all duration-500 ${isHovered ? 'scale-110' : ''}`}
                  style={{ 
                    height: budgetHeight,
                    backgroundColor: 'rgb(var(--color-border))',
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
  const [containerWidth, setContainerWidth] = useState(120);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Measure container width for responsive sizing
  useEffect(() => {
    const measureWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.getBoundingClientRect().width;
        setContainerWidth(Math.max(width, 80)); // Minimum width
      }
    };
    
    measureWidth();
    window.addEventListener('resize', measureWidth);
    return () => window.removeEventListener('resize', measureWidth);
  }, []);
  
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

  const width = containerWidth;
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
    // Scale mouse position to viewBox coordinates
    const scaleX = width / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;
    
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
    
    // Scale threshold to viewBox coordinates
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
    <div ref={containerRef} className="w-full">
      <svg 
        ref={svgRef}
        width="100%"
        height={height} 
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="overflow-visible"
        style={{ cursor: showHoverValues ? 'crosshair' : 'default' }}
        onMouseMove={showHoverValues ? handleMouseMove : undefined}
        onMouseLeave={showHoverValues ? handleMouseLeave : undefined}
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
    </div>
  );
}

// =====================================================
// HERO DASHBOARD PREVIEW COMPONENT (Runway-inspired)
// =====================================================

function HeroDashboardPreview({ 
  isDark, 
  theme, 
  isEn, 
  isVisible,
  selectedIndustry: externalSelectedIndustry,
  onIndustryChange 
}: { 
  isDark: boolean; 
  theme: typeof colors.light; 
  isEn: boolean; 
  isVisible: boolean;
  selectedIndustry?: number;
  onIndustryChange?: (index: number) => void;
}) {
  const [showElements, setShowElements] = useState(false);
  const [internalSelectedIndustry, setInternalSelectedIndustry] = useState(0);
  
  // Use external state if provided, otherwise use internal state
  const selectedIndustry = externalSelectedIndustry ?? internalSelectedIndustry;
  const setSelectedIndustry = onIndustryChange ?? setInternalSelectedIndustry;
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredKpi, setHoveredKpi] = useState<number | null>(null);
  const [showAllKpis, setShowAllKpis] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  
  // Detect screen size
  useEffect(() => {
    const checkSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024);
    };
    
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

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
        { metric: isEn ? 'Net Margin' : 'Marge nette', yours: '8.2%', target: '6-9%', status: 'good' },
        { metric: isEn ? 'Beverage Cost %' : 'Coût boissons %', yours: '18.4%', target: '18-24%', status: 'excellent' },
        { metric: isEn ? 'Table Turnover' : 'Rotation tables', yours: '3.2', target: '2.5-4', status: 'good' },
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
        { metric: isEn ? 'Job Margin Variance' : 'Écart marge projet', yours: '2.1%', target: '<5%', status: 'excellent' },
        { metric: isEn ? 'Equipment Utilization' : 'Utilisation équipement', yours: '78%', target: '70-85%', status: 'good' },
        { metric: isEn ? 'Safety Incidents' : 'Incidents sécurité', yours: '0.8', target: '<1.0', status: 'excellent' },
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
      {/* Top Bar - Browser Chrome Style - Simplified */}
      <div 
        className="h-8 sm:h-10 flex items-center justify-between px-3 sm:px-4 border-b"
        style={{ 
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(250, 250, 250, 0.95)',
          borderColor: isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)'
        }}
      >
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-primary-400" />
        </div>
        
        <div className="flex items-center gap-2">
          {/* Real-time badge */}
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-medium"
            style={{ backgroundColor: `${theme.green}15`, color: theme.green }}
          >
            <div className="relative">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.green }} />
              <div className="absolute inset-0 w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: theme.green, opacity: 0.5 }} />
            </div>
            {isEn ? 'Live' : 'Direct'}
          </div>
          {/* User avatar - hidden on mobile */}
          <div className="hidden sm:block w-6 h-6 rounded-full overflow-hidden border-2 shadow-sm" style={{ borderColor: theme.green }}>
            <img 
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face" 
              alt="User" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
      
      <div className="flex">
        {/* Sidebar - Collapsed on tablet, full on desktop, hidden on mobile */}
        {isTablet ? (
          <div 
            className={`flex flex-col border-r py-3 px-2 transition-all duration-300 ${
              sidebarExpanded ? 'w-52' : 'w-12'
            }`}
            style={{ 
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(250, 250, 250, 0.8)',
              borderColor: isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)'
            }}
          >
            <button
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className="mb-4 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              aria-label={isEn ? 'Toggle sidebar' : 'Basculer la barre latérale'}
            >
              <Layers className="w-4 h-4" style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }} />
            </button>
            {sidebarExpanded && (
              <>
                {/* Logo Header */}
                <div className={`flex items-center gap-2 px-2 mb-4 transition-all duration-300 ${showElements ? 'opacity-100' : 'opacity-0'}`}>
                  <div 
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ 
                      background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                      boxShadow: `0 2px 6px ${theme.green}40`
                    }}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="5" y="5" width="6" height="6" rx="1.3" fill="white"/>
                      <rect x="13" y="5" width="6" height="6" rx="1.3" fill="white"/>
                      <rect x="21" y="5" width="6" height="6" rx="1.3" fill="white"/>
                      <rect x="5" y="13" width="6" height="6" rx="1.3" fill="white"/>
                      <rect x="13" y="13" width="6" height="6" rx="1.3" fill="white"/>
                      <rect x="21" y="13" width="6" height="6" rx="1.3" fill="white"/>
                      <rect x="5" y="21" width="6" height="6" rx="1.3" fill="white"/>
                      <rect x="13" y="21" width="6" height="6" rx="1.3" fill="white"/>
                      <rect x="21" y="21" width="6" height="6" rx="1.3" fill="white"/>
                    </svg>
                  </div>
                  <span className="text-xs font-bold tracking-tight" style={{ color: 'rgb(var(--color-text))' }}>
                    <span style={{ color: 'rgb(var(--color-text))' }}>Plain</span>
                    <span style={{ color: theme.green }}>Ledger</span>
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
                
                {/* Insights Status - Bottom */}
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
                      {isEn ? 'Live Insights' : 'Insights actifs'}
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
              </>
            )}
          </div>
        ) : (
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
              <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="5" y="5" width="6" height="6" rx="1.3" fill="white"/>
                <rect x="13" y="5" width="6" height="6" rx="1.3" fill="white"/>
                <rect x="21" y="5" width="6" height="6" rx="1.3" fill="white"/>
                <rect x="5" y="13" width="6" height="6" rx="1.3" fill="white"/>
                <rect x="13" y="13" width="6" height="6" rx="1.3" fill="white"/>
                <rect x="21" y="13" width="6" height="6" rx="1.3" fill="white"/>
                <rect x="5" y="21" width="6" height="6" rx="1.3" fill="white"/>
                <rect x="13" y="21" width="6" height="6" rx="1.3" fill="white"/>
                <rect x="21" y="21" width="6" height="6" rx="1.3" fill="white"/>
              </svg>
            </div>
            <span className="text-xs font-bold tracking-tight" style={{ color: 'rgb(var(--color-text))' }}>
              <span style={{ color: 'rgb(var(--color-text))' }}>Plain</span>
              <span style={{ color: theme.green }}>Ledger</span>
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
          
          {/* Insights Status - Bottom */}
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
                {isEn ? 'Live Insights' : 'Insights actifs'}
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
        )}
        
        {/* Main Content */}
        <div className="flex-1 p-3 sm:p-4 min-h-[400px]">
          {/* KPI Cards Row - Responsive: 2-col mobile, 2-col tablet, 4-col desktop */}
          <div className={`grid gap-2 mb-3 relative ${
            isMobile ? 'grid-cols-2' : isTablet ? 'grid-cols-2' : 'grid-cols-4'
          }`}>
            {(isMobile && !showAllKpis ? current.kpis.slice(0, 2) : current.kpis).map((kpi, i) => (
              <div 
                key={i}
                className={`p-2 rounded-lg transition-all duration-300 cursor-pointer relative group min-h-[44px] ${
                  showElements ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ 
                  backgroundColor: isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(255, 255, 255, 0.9)',
                  border: `1px solid ${hoveredKpi === i ? theme.green : (isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)')}`,
                  boxShadow: hoveredKpi === i ? `0 8px 24px ${theme.green}30` : 'none',
                  transitionDelay: `${i * 100 + 200}ms`,
                  zIndex: hoveredKpi === i ? 10 : 1,
                }}
                onMouseEnter={() => !isMobile && setHoveredKpi(i)}
                onMouseLeave={() => !isMobile && setHoveredKpi(null)}
                onClick={() => isMobile && setHoveredKpi(hoveredKpi === i ? null : i)}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] sm:text-[10px] font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {kpi.label}
                  </span>
                  <span className="text-[11px] sm:text-xs font-bold" style={{ color: theme.green }}>
                    {kpi.value}
                  </span>
                </div>
                <div className="w-full" style={{ minHeight: '35px' }}>
                  <AnimatedAreaChart 
                    data={kpi.data}
                    color={theme.green}
                    height={35}
                    delay={400 + i * 100}
                    trigger={isVisible}
                    showDashed={kpi.projection}
                    showHoverValues={!isMobile}
                    isDark={isDark}
                  />
                </div>
                
                {/* Hover Tooltip - Slick & Compact */}
                {hoveredKpi === i && kpi.threshold && (
                  <div 
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2.5 py-1.5 rounded-md shadow-xl z-20 whitespace-nowrap"
                    style={{ 
                      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                      border: `1px solid ${theme.green}25`,
                      backdropFilter: 'blur(12px)',
                    }}
                  >
                    <div className="flex items-center gap-2 text-[9px]">
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.green }} />
                        <span style={{ color: 'rgb(var(--color-text-muted))' }}>{kpi.threshold}</span>
                      </div>
                      <div className="w-px h-3" style={{ backgroundColor: isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)' }} />
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.gold }} />
                        <span style={{ color: 'rgb(var(--color-text-muted))' }}>{kpi.target}</span>
                      </div>
                      <div className="w-px h-3" style={{ backgroundColor: isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)' }} />
                      <span className="font-medium" style={{ color: theme.green }}>{kpi.insight}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Strategic Roadmap - Improved UX for M, T, A */}
          <div 
            className={`p-3 sm:p-4 lg:p-5 rounded-xl mb-4 transition-all duration-700 ${
              showElements ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ 
              backgroundColor: isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(250, 250, 250, 0.9)',
              border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.6)'}`,
              transitionDelay: '500ms'
            }}
          >
            {/* Header - Left aligned */}
            <div className="mb-3 sm:mb-4 text-left">
              <h4 className="text-xs sm:text-sm font-semibold text-left" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Strategic Roadmap' : 'Feuille de route stratégique'}
              </h4>
            </div>
            
            {/* Timeline with Grid - Improved mobile visibility */}
            <div className="relative">
              {/* Timeline Header - Better mobile spacing */}
              <div className={`flex mb-2 sm:mb-2 ${isMobile ? 'flex-col gap-2' : ''}`}>
                <div className={`${isMobile ? 'w-full text-[10px] font-medium mb-1 text-left' : 'w-24 sm:w-32 lg:w-40 text-left'}`} style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isMobile && (isEn ? 'Timeline' : 'Calendrier')}
                </div>
                <div className={`flex-1 flex ${isMobile ? 'justify-around' : 'justify-between'} text-[9px] sm:text-[10px] font-medium`} style={{ color: 'rgb(var(--color-text-muted))' }}>
                  <span>Q1 '26</span>
                  <span>Q2 '26</span>
                  <span>Q3 '26</span>
                  <span>Q4 '26</span>
                </div>
              </div>
              
              {/* Roadmap Items with Grid Lines - Improved mobile layout */}
              <div className="relative">
                {/* Vertical Grid Lines - Show on tablet+ */}
                <div className="absolute inset-0 flex pointer-events-none" style={{ left: isMobile ? '0' : 'calc(6rem)', right: 0 }}>
                  <div className={`${isMobile ? 'hidden' : 'hidden sm:block'} absolute inset-0`} style={{ left: isMobile ? '0' : 'calc(8rem - 6rem)', right: 0 }}>
                    {[0, 25, 50, 75, 100].map((pos) => (
                      <div 
                        key={pos}
                        className="absolute top-0 bottom-0 w-px"
                        style={{ 
                          left: `${pos}%`,
                          backgroundColor: isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.5)',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {roadmapItems.map((item, i) => (
                  <div 
                    key={i} 
                    className={`${isMobile ? 'flex-col' : 'flex items-center'} mb-2 sm:mb-1.5 lg:mb-2 relative gap-2`}
                  >
                    {/* Label - Left aligned */}
                    <div className={`${isMobile ? 'w-full text-[10px] font-medium mb-1 text-left' : 'w-24 sm:w-32 lg:w-40 text-[10px] sm:text-[11px] font-medium pr-2 text-left truncate'}`} style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      {item.plan}
                    </div>
                    {/* Progress Bar */}
                    <div className={`relative ${isMobile ? 'w-full' : 'flex-1'}`} style={{ minWidth: isMobile ? 'auto' : '200px' }}>
                      <div 
                        className={`${isMobile ? 'h-5' : 'h-4 sm:h-5 lg:h-6'} w-full relative rounded-md overflow-hidden`}
                        style={{ backgroundColor: isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.6)' }}
                      >
                        {/* Grid lines inside bar */}
                        {[25, 50, 75].map((pos) => (
                          <div 
                            key={pos}
                            className="absolute top-0 bottom-0 w-px"
                            style={{ 
                              left: `${pos}%`,
                              backgroundColor: isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(203, 213, 225, 0.8)',
                            }}
                          />
                        ))}
                        {/* Progress fill - animated */}
                        <div 
                          className={`absolute ${isMobile ? 'top-0.5 bottom-0.5' : 'top-0.5 bottom-0.5'} rounded-sm`}
                          style={{ 
                            left: `${item.start}%`,
                            width: showElements ? `${item.end - item.start}%` : '0%',
                            backgroundColor: item.color,
                            transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            transitionDelay: `${400 + i * 200}ms`,
                            boxShadow: `0 0 8px ${item.color}40`,
                          }}
                        />
                      </div>
                      {/* Percentage label */}
                      <div className="flex justify-between text-[7px] mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        <span>{item.start}%</span>
                        <span>{item.end}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Industry Benchmarks - Grid Cards Layout */}
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
            {/* Header - Left aligned */}
            <div className="px-3 sm:px-4 lg:px-5 py-2.5 sm:py-3 lg:py-3.5 border-b text-left" style={{ borderColor: isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.6)' }}>
              <h4 className="text-xs sm:text-sm font-semibold text-left" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Benchmarks' : 'Références'} {current.name}
              </h4>
            </div>
            
            {/* Benchmark Cards - Matching KPI cards style */}
            <div className={`grid gap-2 p-2 sm:p-3 ${
              isMobile ? 'grid-cols-1' : 'grid-cols-3'
            }`}>
              {current.benchmarks.map((row, i) => {
                const isExcellent = row.status === 'excellent';
                const isGood = row.status === 'good';
                const statusColor = isExcellent ? theme.green : isGood ? theme.gold : 'rgb(var(--color-error))';
                
                // Parse for bar visualization
                const currentVal = parseFloat(row.yours.replace(/[^0-9.-]/g, ''));
                const targetParts = row.target.match(/([0-9.]+)/g) || ['0'];
                const targetMax = targetParts.length > 1 ? parseFloat(targetParts[1]) : parseFloat(targetParts[0]) * 1.1;
                const barPercent = Math.min(95, Math.max(10, (currentVal / targetMax) * 70));
                
                return (
                  <div 
                    key={i}
                    className="p-2 rounded-lg transition-all duration-300 cursor-pointer relative group"
                    style={{ 
                      backgroundColor: isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(255, 255, 255, 0.9)',
                      border: `1px solid ${hoveredRow === i ? statusColor : (isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)')}`,
                      boxShadow: hoveredRow === i ? `0 8px 24px ${statusColor}30` : 'none',
                    }}
                    onMouseEnter={() => !isMobile && setHoveredRow(i)}
                    onMouseLeave={() => !isMobile && setHoveredRow(null)}
                  >
                    {/* Header: Label & Value */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] sm:text-[10px] font-medium truncate" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                        {row.metric}
                      </span>
                      <span className="text-[11px] sm:text-xs font-bold" style={{ color: statusColor }}>
                        {row.yours}
                      </span>
                    </div>
                    
                    {/* Mini bar chart visualization - animated */}
                    <div className="w-full" style={{ minHeight: '35px' }}>
                      <svg width="100%" height="35" className="overflow-visible">
                        {/* Background bars */}
                        {[0, 1, 2, 3, 4, 5, 6].map((_, idx) => (
                          <rect
                            key={idx}
                            x={`${idx * 14}%`}
                            y={35 - (15 + idx * 2.5)}
                            width="10%"
                            height={15 + idx * 2.5}
                            rx="2"
                            fill={isDark ? 'rgba(71, 85, 105, 0.25)' : 'rgba(229, 231, 235, 0.5)'}
                          />
                        ))}
                        {/* Filled bars - animated growth */}
                        {[0, 1, 2, 3, 4, 5, 6].map((_, idx) => {
                          const maxHeight = 15 + idx * 2.5;
                          const fillHeight = Math.min(maxHeight, (barPercent / 100) * maxHeight * 1.4);
                          const animatedHeight = showElements ? fillHeight : 0;
                          return (
                            <rect
                              key={`fill-${idx}`}
                              x={`${idx * 14}%`}
                              y={35 - animatedHeight}
                              width="10%"
                              height={animatedHeight}
                              rx="2"
                              fill={statusColor}
                              opacity={0.85}
                              style={{
                                transition: `height 0.8s cubic-bezier(0.4, 0, 0.2, 1), y 0.8s cubic-bezier(0.4, 0, 0.2, 1)`,
                                transitionDelay: `${800 + i * 100 + idx * 50}ms`,
                              }}
                            />
                          );
                        })}
                        {/* Target line */}
                        <line
                          x1="0"
                          y1="12"
                          x2="100%"
                          y2="12"
                          stroke={theme.gold}
                          strokeWidth="1"
                          strokeDasharray="3,3"
                          opacity={showElements ? 0.6 : 0}
                          style={{ transition: 'opacity 0.5s', transitionDelay: `${1200 + i * 100}ms` }}
                        />
                      </svg>
                    </div>
                    
                    {/* Footer: Target & Status - more visible */}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[9px] sm:text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        {isEn ? 'Target:' : 'Cible:'} {row.target}
                      </span>
                      <div 
                        className="flex items-center gap-1 px-2 py-0.5 rounded"
                        style={{ 
                          backgroundColor: isExcellent 
                            ? (isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)')
                            : isGood 
                              ? (isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(217, 119, 6, 0.1)')
                              : (isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)')
                        }}
                      >
                        {isExcellent || isGood ? (
                          <CheckCircle className="w-3 h-3" style={{ color: statusColor }} />
                        ) : (
                          <AlertCircle className="w-3 h-3" style={{ color: statusColor }} />
                        )}
                        <span className="text-[9px] sm:text-[10px] font-semibold" style={{ color: statusColor }}>
                          {isExcellent ? (isEn ? 'Excellent' : 'Excellent') : isGood ? (isEn ? 'Good' : 'Bon') : (isEn ? 'Alert' : 'Alerte')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Supported integrations - used inline in JSX

// =====================================================
// Theme colors - Corporate green palette (using CSS variables for consistency)
const colors = {
  light: {
    green: 'rgb(var(--color-primary-600))',      // emerald-600 - primary corporate green
    greenDark: 'rgb(var(--color-primary-700))',  // emerald-700 - darker for depth
    greenLight: 'rgb(var(--color-primary-500))', // emerald-500 - lighter accents
    gold: 'rgb(var(--color-accent-500))',        // amber-500 (for UI consistency)
    goldDark: 'rgb(var(--color-accent-600))',    // amber-600
    goldText: 'rgb(var(--color-accent-700))',
    navBg: 'rgba(254, 253, 251, 0.92)',
  },
  dark: {
    green: 'rgb(var(--color-primary-500))',      // emerald-500 - visible on dark bg
    greenDark: 'rgb(var(--color-primary-600))',  // emerald-600 - darker shade
    greenLight: 'rgb(var(--color-primary-400))', // emerald-400 - highlights
    gold: 'rgb(var(--color-accent-400))',        // amber-400
    goldDark: 'rgb(var(--color-accent-500))',   // amber-500
    goldText: 'rgb(var(--color-accent-400))',
    navBg: 'rgba(15, 23, 42, 0.92)',
  }
};

// =====================================================
// Section Badge Component - Reusable badge for section titles
// =====================================================
type ThemeColors = typeof colors.light;
type BadgeVariant = 'gold' | 'green';

interface SectionBadgeProps {
  variant: BadgeVariant;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  children: React.ReactNode;
  theme: ThemeColors;
  isDark?: boolean;
  className?: string;
}

function SectionBadge({ variant, icon: Icon, children, theme, isDark = false, className = '' }: SectionBadgeProps) {
  const iconColor = variant === 'gold' ? theme.gold : theme.green;
  
  return (
    <span 
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${className}`}
      style={{ 
        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.95)',
        color: isDark ? 'rgb(226, 232, 240)' : 'rgb(71, 85, 105)',
        border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.8)'}`,
        boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <Icon className="w-3.5 h-3.5" style={{ color: iconColor }} />
      {children}
    </span>
  );
}

export default function Landing() {
  const { language } = useI18n();
  const { register } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const [isDark, setIsDark] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Detect screen size
  useEffect(() => {
    const checkSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024);
    };
    
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

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
  
  // Industry selection state for dashboard preview
  const [selectedIndustry, setSelectedIndustry] = useState(0);
  
  // Industries for the selector pills (matches HeroDashboardPreview order)
  const industryOptions = [
    { id: 'realestate', name: isEn ? 'Real Estate' : 'Immobilier', icon: Building2 },
    { id: 'restaurant', name: isEn ? 'Restaurant' : 'Restauration', icon: UtensilsCrossed },
    { id: 'construction', name: 'Construction', icon: Hammer },
  ];

  const handleScheduleCall = () => {
    window.open('https://calendly.com/anthonypaquet1508', '_blank');
  };

  return (
    <>
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
        @keyframes orbit-rotate-0 {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orbit-rotate-1 {
          from { transform: rotate(180deg); }
          to { transform: rotate(540deg); }
        }
        @keyframes orbit-rotate-2 {
          from { transform: rotate(90deg); }
          to { transform: rotate(-270deg); }
        }
        @keyframes orbit-rotate-3 {
          from { transform: rotate(270deg); }
          to { transform: rotate(-90deg); }
        }
        @keyframes orbit-rotate-4 {
          from { transform: rotate(45deg); }
          to { transform: rotate(405deg); }
        }
        @keyframes orbit-rotate-5 {
          from { transform: rotate(225deg); }
          to { transform: rotate(585deg); }
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
        @media (prefers-reduced-motion: reduce) {
          .animate-fade-up,
          .animate-fade-in,
          .animate-scale-in,
          .animate-slide-left,
          .animate-slide-right {
            animation: none;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
      
      {/* Navigation - Sticky header outside overflow container */}
      <PublicHeader fullMenu={true} />

      <div 
        className="min-h-screen relative overflow-x-hidden"
        style={{ 
          background: isDark 
            ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)'
            : 'linear-gradient(135deg, #fefefe 0%, #f0fdf4 25%, #f8fafc 50%, #fef3c7 75%, #fefefe 100%)'
        }}
      >
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
                  Your Accountant Speaks Numbers.
                </span>{' '}
                <span>We Speak Business.</span>
              </>
            ) : (
              <>
                <span style={{ color: theme.green }}>
                  Votre comptable parle chiffres.
                </span>{' '}
                <span>Nous parlons affaires.</span>
              </>
            )}
          </h1>

          {/* Professional Credibility Badge */}
          <div 
            className="flex flex-wrap justify-center gap-3 mb-6 animate-fade-up opacity-0"
            style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}
          >
            <span 
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ 
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.95)',
                border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.8)'}`,
                color: isDark ? 'rgb(226, 232, 240)' : 'rgb(71, 85, 105)',
                boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              <BarChart3 className="w-3.5 h-3.5" style={{ color: theme.gold }} />
              {isEn ? 'FP&A Intelligence' : 'Intelligence FP&A'}
            </span>
          </div>

          {/* Value Proposition - Bridge the Gap focused */}
          <div 
            className="max-w-3xl mx-auto mb-8 px-2 animate-fade-up opacity-0"
            style={{ animationDelay: '0.15s', animationFillMode: 'forwards' }}
          >
            <p 
              className="text-lg sm:text-xl md:text-2xl leading-relaxed mb-4"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'Know your margins. Beat your industry. Find money you\'re missing.'
                : 'Connaissez vos marges. Dépassez votre industrie. Trouvez l\'argent qui vous échappe.'}
            </p>
          </div>

          {/* CTAs - Smaller buttons */}
          <div 
            className="flex flex-col sm:flex-row gap-3 justify-center mb-8 animate-fade-up opacity-0"
            style={{ animationDelay: '0.25s', animationFillMode: 'forwards' }}
          >
            <button 
              onClick={() => register()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all hover:scale-[1.02] text-sm shadow-md"
              style={{ 
                background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                color: 'white',
                boxShadow: `0 4px 16px ${theme.green}30`
              }}
            >
              {isEn ? 'See what you\'re missing' : 'Voyez ce que vous manquez'}
              <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={handleScheduleCall}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all hover:scale-[1.02] text-sm"
              style={{ 
                border: `1.5px solid ${theme.green}`,
                color: isDark ? theme.green : theme.greenDark,
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255,255,255,0.9)'
              }}
              aria-label={isEn ? 'Schedule a call with our team' : 'Planifier un appel avec notre équipe'}
            >
              <Calendar className="w-4 h-4" />
              {isEn ? 'Talk to a real person' : 'Parlez à une vraie personne'}
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
              {isEn ? 'Trusted by Canadian entrepreneurs' : 'Utilisé par des entrepreneurs canadiens'}
            </motion.p>
          </motion.div>
          
        </div>
      </section>
      
      {/* Industry Dashboards Section - With background separation */}
      <section 
        className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 relative"
        style={{ 
          background: isDark 
            ? 'linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)'
            : 'linear-gradient(180deg, rgba(254, 252, 232, 0.3) 0%, rgba(255, 251, 235, 0.5) 50%, rgba(254, 249, 195, 0.2) 100%)'
        }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <motion.div 
            className="text-center mb-8 sm:mb-10"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Badge */}
            <div className="flex justify-center mb-4">
              <SectionBadge variant="gold" icon={Sparkles} theme={theme} isDark={isDark}>
                {isEn ? 'Industry Dashboards' : 'Tableaux de bord sectoriels'}
              </SectionBadge>
            </div>
            
            {/* Title */}
            <h2 
              className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? (
                <>Outperform your <span style={{ color: theme.gold }}>industry benchmarks</span></>
              ) : (
                <>Dépassez les <span style={{ color: theme.gold }}>références de votre secteur</span></>
              )}
            </h2>
            
            {/* Subtitle */}
            <p 
              className="text-base sm:text-lg max-w-2xl mx-auto mb-6"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'Track the most important KPIs for your industry with preset formulas validated by experts.'
                : 'Suivez les KPIs les plus importants pour votre secteur avec des formules préétablies validées par des experts.'}
            </p>
            
            {/* Industry Selector Pills */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {industryOptions.map((industry, index) => {
                const isActive = selectedIndustry === index;
                const Icon = industry.icon;
                return (
                  <button
                    key={industry.id}
                    onClick={() => setSelectedIndustry(index)}
                    className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                      isActive 
                        ? 'shadow-lg scale-[1.02]' 
                        : 'hover:scale-[1.02]'
                    }`}
                    style={{
                      backgroundColor: isActive 
                        ? theme.gold 
                        : isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(241, 245, 249, 0.9)',
                      color: isActive 
                        ? '#ffffff' 
                        : isDark ? 'rgb(203, 213, 225)' : 'rgb(71, 85, 105)',
                      border: isActive 
                        ? 'none' 
                        : `1px solid ${isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.6)'}`,
                      boxShadow: isActive 
                        ? `0 4px 14px ${theme.gold}40` 
                        : 'none'
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{industry.name}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
          
          {/* Interactive Dashboard Preview */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <HeroDashboardPreview 
              isDark={isDark} 
              theme={theme} 
              isEn={isEn} 
              isVisible={true}
              selectedIndustry={selectedIndustry}
              onIndustryChange={setSelectedIndustry}
            />
          </motion.div>
        </div>
      </section>

      {/* Exec Dashboard Features Section - Enhanced */}
      <span id="features" className="absolute" style={{ top: '-100px' }} />
      <section 
        id="exec-dashboard" 
        className="py-20 sm:py-24 lg:py-32 px-4 sm:px-6 relative overflow-hidden"
        aria-label={isEn ? 'Executive dashboard features' : 'Fonctionnalités du tableau de bord exécutif'}
        style={{ 
          background: isDark 
            ? 'linear-gradient(180deg, rgba(15, 23, 42, 1) 0%, rgba(30, 41, 59, 0.95) 50%, rgba(15, 23, 42, 1) 100%)' 
            : 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 50%, #ffffff 100%)'
        }}
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Floating orbs */}
          <motion.div 
            className="absolute top-20 left-10 w-64 h-64 rounded-full"
            style={{ 
              background: `radial-gradient(circle, ${theme.green}10 0%, transparent 70%)`,
              filter: 'blur(40px)'
            }}
            animate={{ 
              y: [0, -30, 0],
              x: [0, 20, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-20 right-10 w-72 h-72 rounded-full"
            style={{ 
              background: `radial-gradient(circle, ${theme.gold}08 0%, transparent 70%)`,
              filter: 'blur(50px)'
            }}
            animate={{ 
              y: [0, 30, 0],
              x: [0, -20, 0],
              scale: [1.1, 1, 1.1]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Grid pattern */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(${theme.green} 1px, transparent 1px), linear-gradient(90deg, ${theme.green} 1px, transparent 1px)`,
              backgroundSize: '60px 60px'
            }}
          />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          {/* Section Header */}
          <div className="text-center mb-16">
            {/* Section Label Badge */}
            <div className="flex justify-center mb-4">
              <SectionBadge variant="gold" icon={Sparkles} theme={theme} isDark={isDark}>
                {isEn ? 'Smart Analytics' : 'Analytique intelligente'}
              </SectionBadge>
            </div>
            {/* Main heading with gradient - H2 for SEO (H1 is in hero section) */}
            <h2 
              className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? (
                <>Your <span style={{ color: theme.green }}>Executive Dashboard</span></>
              ) : (
                <>Votre <span style={{ color: theme.green }}>tableau de bord exécutif</span></>
              )}
            </h2>
            <p 
              className="text-lg sm:text-xl max-w-2xl mx-auto"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'Replace spreadsheets with automated dashboards. Get insights that drive confident decisions.'
                : 'Remplacez les feuilles de calcul par des tableaux de bord automatisés. Obtenez les insights pour des décisions éclairées.'}
            </p>
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 text-center">
            {/* FP&A Metrics - Compact horizontal layout with background */}
            <motion.div 
              className="inline-flex justify-center items-center rounded-xl sm:rounded-2xl px-3 sm:px-6 py-2.5 sm:py-3 mb-8"
              style={{
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(248, 250, 252, 0.8)',
                border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.6)'}`,
                backdropFilter: 'blur(8px)',
              }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              {/* Metric 1: Time Savings */}
              <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 border-r" style={{ borderColor: isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)' }}>
                <span className="text-lg sm:text-2xl font-bold" style={{ color: theme.green }}>
                  <AnimatedCounter end={40} suffix="%" duration={2000} delay={100} />
                </span>
                <span className="text-[9px] sm:text-[11px] font-medium leading-tight" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'faster close' : 'plus vite'}
                </span>
              </div>
              
              {/* Metric 2: Visibility */}
              <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 border-r" style={{ borderColor: isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)' }}>
                <span className="text-lg sm:text-2xl font-bold" style={{ color: theme.gold }}>
                  <AnimatedCounter end={25} suffix="%" duration={2000} delay={200} />
                </span>
                <span className="text-[9px] sm:text-[11px] font-medium leading-tight" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'visibility' : 'visibilité'}
                </span>
              </div>
              
              {/* Metric 3: Time Recovered */}
              <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4">
                <span className="text-lg sm:text-2xl font-bold" style={{ color: theme.green }}>
                  <AnimatedCounter end={10} suffix="h" duration={1500} delay={300} />
                </span>
                <span className="text-[9px] sm:text-[11px] font-medium leading-tight" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'saved/wk' : 'épargnées'}
                </span>
              </div>
            </motion.div>

            {/* Social proof & trust indicators */}
            <motion.div 
              className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-6 text-sm"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <span>
                {isEn 
                  ? 'Trusted by business owners across Quebec' 
                  : 'La confiance des entrepreneurs du Québec'}
              </span>
              <span className="hidden sm:inline" style={{ color: 'rgb(var(--color-text-tertiary))' }}>•</span>
              <span>
                {isEn 
                  ? '20+ industries served' 
                  : '20+ industries desservies'}
              </span>
            </motion.div>

            {/* Trust badges */}
            <motion.div 
              className="flex flex-wrap items-center justify-center gap-4 mb-6"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <div 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                style={{ 
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                  border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.6)'}`
                }}
              >
                <Shield className="w-3.5 h-3.5" style={{ color: theme.green }} />
                <span style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Data hosted in Canada' : 'Données hébergées au Canada'}
                </span>
              </div>
              <div 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                style={{ 
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                  border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.6)'}`
                }}
              >
                <Check className="w-3.5 h-3.5" style={{ color: theme.green }} />
                <span style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'No credit card required' : 'Aucune carte de crédit requise'}
                </span>
              </div>
            </motion.div>

            {/* CTA Button with pulse effect */}
            <motion.button 
              onClick={() => register()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white text-sm relative overflow-hidden"
              style={{ 
                background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                boxShadow: `0 4px 16px ${theme.green}30`
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.6 }}
              aria-label={isEn ? 'Start understanding your numbers - Free trial' : 'Commencez à comprendre vos chiffres - Essai gratuit'}
            >
              {/* Subtle shine effect */}
              <motion.div
                className="absolute inset-0 opacity-30"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                }}
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />
              <span className="relative z-10">
                {isEn ? 'Start understanding your numbers' : 'Commencez à comprendre vos chiffres'}
              </span>
              <ArrowRight className="w-5 h-5 relative z-10" />
            </motion.button>
          </div>
        </div>
      </section>

      {/* Stay Informed Section */}
      <section 
        className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 relative overflow-hidden"
        aria-label={isEn ? 'Stay informed with smart alerts and notifications' : 'Restez informé avec des alertes et notifications intelligentes'}
        style={{ 
          background: isDark 
            ? 'linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)' 
            : 'linear-gradient(180deg, #f8fafc 0%, #ffffff 50%, #f0fdf4 100%)'
        }}
      >
        <div className="max-w-5xl mx-auto relative z-10">
          {/* Section Header */}
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Section Label Badge */}
            <div className="flex justify-center mb-4">
              <SectionBadge variant="gold" icon={Bell} theme={theme} isDark={isDark}>
                {isEn ? 'Smart Alerts' : 'Alertes intelligentes'}
              </SectionBadge>
            </div>
            
            {/* Main heading - H2 for SEO (H1 is in hero section) */}
            <h2 
              className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? (
                <>Never Miss What <span style={{ color: theme.green }}>Matters</span></>
              ) : (
                <>Ne manquez jamais ce qui <span style={{ color: theme.green }}>compte</span></>
              )}
            </h2>
            <p 
              className="text-lg max-w-2xl mx-auto"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'Get notified the way you prefer. We meet you where you already work.'
                : 'Recevez vos alertes comme vous le souhaitez. On vous rejoint là où vous travaillez déjà.'}
            </p>
          </motion.div>

          {/* Main Content - Channel notifications */}
          <div className="flex flex-col items-center justify-center gap-8">
            
            {/* Channel Cards Grid - 2 cols mobile, 3 cols tablet+ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 w-full max-w-2xl">
              {/* Top Row */}
              {[
                { 
                  icon: Mail, 
                  name: 'Email', 
                  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
                  message: isEn ? 'Cash flow alert!' : 'Alerte trésorerie!',
                  delay: 0
                },
                { 
                  icon: Hash, 
                  name: 'Slack', 
                  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
                  message: isEn ? 'Revenue up 12%' : 'Revenus +12%',
                  delay: 0.8
                },
                { 
                  icon: Smartphone, 
                  name: 'Push', 
                  avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
                  message: isEn ? 'Goal reached!' : 'Objectif atteint!',
                  delay: 1.6
                },
              ].map((item, idx) => (
                <motion.div
                  key={`top-${idx}`}
                  className="relative flex flex-col items-center gap-2 px-3 py-4 sm:px-4 sm:py-5 rounded-xl"
                  style={{ 
                    background: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.95)',
                    boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.06)',
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                  whileHover={{ scale: 1.03, y: -2 }}
                >
                  {/* Animated message bubble */}
                  <motion.div
                    className="absolute -top-2 left-1/2 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                    style={{ 
                      background: theme.green,
                      color: 'white',
                      transform: 'translateX(-50%)',
                      boxShadow: `0 2px 8px ${theme.green}40`
                    }}
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ 
                      opacity: [0, 1, 1, 0],
                      y: [10, 0, 0, -10],
                      scale: [0.8, 1, 1, 0.8]
                    }}
                    transition={{ 
                      duration: 3,
                      delay: item.delay,
                      repeat: Infinity,
                      repeatDelay: 4
                    }}
                  >
                    {item.message}
                  </motion.div>
                  
                  {/* Mini avatar */}
                  <div className="relative">
                    <img 
                      src={item.avatar}
                      alt=""
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                      style={{ border: `2px solid ${theme.green}30` }}
                    />
                    {/* Online indicator */}
                    <motion.div
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
                      style={{ 
                        backgroundColor: theme.green,
                        border: `2px solid ${isDark ? '#1e293b' : 'white'}`
                      }}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: idx * 0.3 }}
                    />
                  </div>
                  
                  {/* Icon and label */}
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center"
                      style={{ backgroundColor: `${theme.green}15` }}
                    >
                      <item.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: theme.green }} />
                    </div>
                    <span className="font-medium text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                      {item.name}
                    </span>
                  </div>
                </motion.div>
              ))}

              {/* Bottom Row */}
              {[
                { 
                  icon: Users, 
                  name: 'Teams', 
                  avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
                  message: isEn ? 'New insight' : 'Nouvel aperçu',
                  delay: 2.4
                },
                { 
                  icon: MessageSquare, 
                  name: 'SMS', 
                  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
                  message: isEn ? 'Action needed' : 'Action requise',
                  delay: 3.2
                },
                { 
                  icon: Bell, 
                  name: 'In-App', 
                  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
                  message: isEn ? 'Weekly report' : 'Rapport hebdo',
                  delay: 4
                },
              ].map((item, idx) => (
                <motion.div
                  key={`bottom-${idx}`}
                  className="relative flex flex-col items-center gap-2 px-3 py-4 sm:px-4 sm:py-5 rounded-xl"
                  style={{ 
                    background: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.95)',
                    boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.06)',
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + idx * 0.1 }}
                  whileHover={{ scale: 1.03, y: -2 }}
                >
                  {/* Animated message bubble */}
                  <motion.div
                    className="absolute -top-2 left-1/2 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                    style={{ 
                      background: theme.gold,
                      color: 'white',
                      transform: 'translateX(-50%)',
                      boxShadow: `0 2px 8px ${theme.gold}40`
                    }}
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ 
                      opacity: [0, 1, 1, 0],
                      y: [10, 0, 0, -10],
                      scale: [0.8, 1, 1, 0.8]
                    }}
                    transition={{ 
                      duration: 3,
                      delay: item.delay,
                      repeat: Infinity,
                      repeatDelay: 4
                    }}
                  >
                    {item.message}
                  </motion.div>
                  
                  {/* Mini avatar */}
                  <div className="relative">
                    <img 
                      src={item.avatar}
                      alt=""
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                      style={{ border: `2px solid ${theme.gold}30` }}
                    />
                    {/* Online indicator */}
                    <motion.div
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
                      style={{ 
                        backgroundColor: theme.gold,
                        border: `2px solid ${isDark ? '#1e293b' : 'white'}`
                      }}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: idx * 0.3 }}
                    />
                  </div>
                  
                  {/* Icon and label */}
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center"
                      style={{ backgroundColor: `${theme.gold}15` }}
                    >
                      <item.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: theme.gold }} />
                    </div>
                    <span className="font-medium text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                      {item.name}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Features - Simple inline list */}
          <motion.div 
            className="flex flex-wrap justify-center gap-x-8 gap-y-3 mt-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
          >
            {[
              isEn ? 'Custom thresholds' : 'Seuils personnalisés',
              isEn ? 'Priority routing' : 'Routage prioritaire',
              isEn ? 'Scheduled digests' : 'Résumés planifiés',
              isEn ? 'Role-based alerts' : 'Alertes par rôle',
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Check className="w-4 h-4" style={{ color: theme.green }} />
                <span 
                  className="text-sm"
                  style={{ color: 'rgb(var(--color-text-secondary))' }}
                >
                  {feature}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Industry KPIs Section - Formulas & Benchmarks */}
      <span id="industry-kpis" className="absolute" style={{ top: '-100px' }} />
      <section id="industries" className="relative" aria-label={isEn ? 'Industry-specific KPIs and benchmarks' : 'KPIs et références par industrie'}>
        <IndustryKPISection onScheduleCall={handleScheduleCall} />
      </section>

      {/* Connected Intelligence - Orbital System */}
      <section 
        id="ecosystem" 
        className="py-10 sm:py-16 lg:py-24 px-4 sm:px-6 relative overflow-hidden"
        aria-label={isEn ? 'Connected intelligence' : 'Intelligence connectée'}
        style={{ 
          background: isDark 
            ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.8) 100%)' 
            : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 50%, #ffffff 100%)'
        }}
      >
        {/* Animated Background Elements */}
        {!prefersReducedMotion && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Floating gradient orbs */}
            <motion.div
              className="absolute w-[400px] h-[400px] rounded-full opacity-30"
              style={{
                background: `radial-gradient(circle, ${theme.green}20 0%, transparent 70%)`,
                top: '10%',
                left: '-10%',
              }}
              animate={{
                x: [0, 50, 0],
                y: [0, 30, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <motion.div
              className="absolute w-[300px] h-[300px] rounded-full opacity-20"
              style={{
                background: `radial-gradient(circle, ${theme.gold}25 0%, transparent 70%)`,
                top: '60%',
                right: '-5%',
              }}
              animate={{
                x: [0, -40, 0],
                y: [0, -20, 0],
                scale: [1, 1.15, 1],
              }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 2,
              }}
            />
            <motion.div
              className="absolute w-[250px] h-[250px] rounded-full opacity-15"
              style={{
                background: `radial-gradient(circle, ${theme.green}15 0%, transparent 70%)`,
                bottom: '5%',
                left: '20%',
              }}
              animate={{
                x: [0, 30, 0],
                y: [0, -25, 0],
              }}
              transition={{
                duration: 18,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 4,
              }}
            />
            
            {/* Floating particles */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: i % 2 === 0 ? theme.green : theme.gold,
                  left: `${10 + (i * 7)}%`,
                  top: `${15 + (i * 6) % 70}%`,
                  opacity: 0.4,
                }}
                animate={{
                  y: [0, -30, 0],
                  opacity: [0.2, 0.5, 0.2],
                }}
                transition={{
                  duration: 4 + (i % 3),
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.5,
                }}
              />
            ))}
            
            {/* Pulse rings */}
            <motion.div
              className="absolute w-[600px] h-[600px] rounded-full border opacity-10"
              style={{
                borderColor: theme.green,
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
              animate={{
                scale: [0.8, 1.2, 0.8],
                opacity: [0.05, 0.15, 0.05],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <motion.div
              className="absolute w-[800px] h-[800px] rounded-full border opacity-5"
              style={{
                borderColor: theme.gold,
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.03, 0.1, 0.03],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 2,
              }}
            />
          </div>
        )}
        
        <div className="max-w-5xl mx-auto relative z-10">
          {/* Section Header - Compact on mobile */}
          <motion.div 
            className="text-center mb-6 sm:mb-10 lg:mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Section Label Badge */}
            <div className="flex justify-center mb-3 sm:mb-4">
              <SectionBadge variant="green" icon={Database} theme={theme} isDark={isDark}>
                {isEn ? 'Data-Driven Insights' : 'Données en action'}
              </SectionBadge>
            </div>
            
            <h2 
              className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-2 sm:mb-4"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? (
                <><span style={{ color: theme.green }}>Data-Centric</span> Decisions</>
              ) : (
                <>Décisions <span style={{ color: theme.green }}>centrées sur les données</span></>
              )}
            </h2>
            <p 
              className="text-sm sm:text-base lg:text-lg max-w-xl mx-auto px-4 sm:px-0"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'Transform raw financial data into actionable insights across every business domain.'
                : 'Transformez vos données financières brutes en informations exploitables dans tous les domaines d\'affaires.'}
            </p>
          </motion.div>

          {/* Desktop - Full Enterprise Orbital System */}
          <div className="hidden lg:flex items-center justify-center relative" style={{ height: '480px' }}>
            
            {/* Cosmic background - solar system atmosphere */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at center, ${theme.gold}10 0%, ${theme.green}06 25%, transparent 55%)`,
              }}
            />
            
            {/* Animated floating particles */}
            {!prefersReducedMotion && (
              <>
                {/* Floating dots - scattered organically */}
                {[
                  { x: '8%', y: '15%', size: 3, color: theme.green, delay: 0, duration: 4 },
                  { x: '92%', y: '12%', size: 2, color: theme.gold, delay: 0.5, duration: 5 },
                  { x: '5%', y: '45%', size: 4, color: theme.green, delay: 1, duration: 4.5 },
                  { x: '95%', y: '50%', size: 3, color: theme.gold, delay: 1.5, duration: 5.5 },
                  { x: '10%', y: '80%', size: 2, color: theme.greenLight, delay: 2, duration: 4 },
                  { x: '90%', y: '85%', size: 3, color: theme.goldDark, delay: 0.8, duration: 5 },
                  { x: '15%', y: '25%', size: 2, color: theme.gold, delay: 1.2, duration: 4.8 },
                  { x: '85%', y: '30%', size: 2, color: theme.green, delay: 0.3, duration: 5.2 },
                  { x: '3%', y: '65%', size: 3, color: theme.greenDark, delay: 1.8, duration: 4.2 },
                  { x: '97%', y: '70%', size: 2, color: theme.gold, delay: 0.7, duration: 5.3 },
                ].map((dot, i) => (
                  <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                      left: dot.x,
                      top: dot.y,
                      width: dot.size,
                      height: dot.size,
                      backgroundColor: dot.color,
                    }}
                    animate={{
                      y: [-8, 8, -8],
                      opacity: [0.3, 0.7, 0.3],
                    }}
                    transition={{
                      duration: dot.duration,
                      delay: dot.delay,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
                
                {/* Subtle ellipse shapes */}
                <motion.div
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    left: '5%',
                    top: '20%',
                    width: 60,
                    height: 30,
                    border: `1px solid ${theme.green}15`,
                    transform: 'rotate(-15deg)',
                  }}
                  animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.05, 1] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    right: '8%',
                    top: '25%',
                    width: 40,
                    height: 20,
                    border: `1px solid ${theme.gold}15`,
                    transform: 'rotate(20deg)',
                  }}
                  animate={{ opacity: [0.15, 0.35, 0.15], scale: [1, 1.08, 1] }}
                  transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                />
                <motion.div
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    left: '10%',
                    bottom: '15%',
                    width: 50,
                    height: 25,
                    border: `1px solid ${theme.gold}12`,
                    transform: 'rotate(10deg)',
                  }}
                  animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.06, 1] }}
                  transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                />
                <motion.div
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    right: '5%',
                    bottom: '20%',
                    width: 45,
                    height: 22,
                    border: `1px solid ${theme.green}12`,
                    transform: 'rotate(-25deg)',
                  }}
                  animate={{ opacity: [0.15, 0.35, 0.15], scale: [1, 1.07, 1] }}
                  transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                />
              </>
            )}

            {/* Thin orbital path lines - subtle circles showing orbit paths */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {[220, 165, 110].map((radius, idx) => (
                <motion.div
                  key={idx}
                  className="absolute rounded-full"
                  style={{
                    width: radius * 2,
                    height: radius * 2,
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ 
                    delay: idx * 0.1,
                    duration: 0.5,
                  }}
                />
              ))}
            </div>


            {/* Center Hub - The Sun (Customer) */}
            <div className="relative z-30">
              {/* Subtle glow */}
              {!prefersReducedMotion && (
                <motion.div
                  className="absolute -inset-6 rounded-full"
                  style={{ 
                    background: `radial-gradient(circle, ${theme.green}20 0%, transparent 70%)`,
                  }}
                  animate={{ 
                    scale: [1, 1.15, 1],
                    opacity: [0.4, 0.6, 0.4]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              
              {/* Clean gradient ring */}
              <div
                className="absolute -inset-1.5 rounded-full"
                style={{ 
                  background: `conic-gradient(from 0deg, ${theme.green}, ${theme.greenDark}, ${theme.green})`,
                  padding: 2,
                }}
              >
                <div 
                  className="w-full h-full rounded-full"
                  style={{ background: isDark ? '#0f172a' : '#ffffff' }}
                />
              </div>
              
              {/* Sun - Avatar */}
              <motion.div 
                className="relative w-20 h-20 rounded-full overflow-hidden"
                style={{ 
                  border: `2px solid ${theme.green}50`,
                  boxShadow: `0 0 24px ${theme.green}25, 0 4px 16px rgba(0,0,0,0.15)`,
                }}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <img 
                  src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=128&h=128&fit=crop&crop=face"
                  alt=""
                  className="w-full h-full object-cover"
                />
              </motion.div>

              {/* Sun's status badge - simple pulse, no rotation */}
              <motion.div
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ 
                  background: `linear-gradient(135deg, ${theme.green}, ${theme.greenDark})`,
                  border: `2px solid ${isDark ? '#0f172a' : '#ffffff'}`,
                  boxShadow: `0 0 12px ${theme.green}50`
                }}
                animate={prefersReducedMotion ? {} : { scale: [1, 1.1, 1] }}
                transition={prefersReducedMotion ? {} : { 
                  duration: 2, repeat: Infinity, ease: "easeInOut"
                }}
              >
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </motion.div>
            </div>

            {/* 
              ROI Spiral Structure - Balanced spiral effect:
              - Orbit 1 (r=95): 2 ROI keywords - Savings, Time Saved - clockwise
              - Orbit 2 (r=150): 2 ROI keywords - Revenue, Tax Credits - counter-clockwise  
              - Orbit 3 (r=210): 2 ROI keywords - Profit, Efficiency - clockwise
              - Golden angle spacing (~137.5°) creates natural spiral flow
            */}
            
            {/* Data Domain Keywords with connection lines to center - Reduced elements for reduced motion */}
            {(prefersReducedMotion ? [
              // Reduced set for reduced motion preference
              { icon: Calculator, label: { en: 'Accounting', fr: 'Comptabilité' }, color: theme.green, radius: 110, duration: 0, start: 0, direction: 1, labelOffset: 28 },
              { icon: Wallet, label: { en: 'Finance', fr: 'Finances' }, color: theme.greenDark, radius: 110, duration: 0, start: 180, direction: 1, labelOffset: 28 },
              { icon: Percent, label: { en: 'Credits', fr: 'Crédits' }, color: theme.gold, radius: 165, duration: 0, start: 90, direction: -1, labelOffset: 24 },
              { icon: Receipt, label: { en: 'Taxes', fr: 'Impôts' }, color: theme.goldDark, radius: 165, duration: 0, start: 270, direction: -1, labelOffset: 24 },
            ] : [
              // Orbit 1 - innermost (r=110) - 2 keywords, 180° apart
              { icon: Calculator, label: { en: 'Accounting', fr: 'Comptabilité' }, color: theme.green, radius: 110, duration: 42, start: 0, direction: 1, labelOffset: 28 },
              { icon: Wallet, label: { en: 'Finance', fr: 'Finances' }, color: theme.greenDark, radius: 110, duration: 48, start: 180, direction: 1, labelOffset: 28 },
              // Orbit 2 - middle (r=165) - 2 keywords, 180° apart
              { icon: Percent, label: { en: 'Credits', fr: 'Crédits' }, color: theme.gold, radius: 165, duration: 52, start: 90, direction: -1, labelOffset: 24 },
              { icon: Receipt, label: { en: 'Taxes', fr: 'Impôts' }, color: theme.goldDark, radius: 165, duration: 58, start: 270, direction: -1, labelOffset: 24 },
              // Orbit 3 - outer (r=220) - 2 keywords, 180° apart
              { icon: LineChart, label: { en: 'Market', fr: 'Marché' }, color: theme.greenLight, radius: 220, duration: 65, start: 45, direction: 1, labelOffset: 20 },
              { icon: Briefcase, label: { en: 'Investors', fr: 'Investisseurs' }, color: theme.green, radius: 220, duration: 72, start: 225, direction: 1, labelOffset: 20 },
            ]).map((item, idx) => {
              const points = 72;
              const xPos = Array.from({ length: points + 1 }, (_, i) => 
                Math.cos(((item.start + item.direction * i * (360 / points)) * Math.PI) / 180) * item.radius
              );
              const yPos = Array.from({ length: points + 1 }, (_, i) => 
                Math.sin(((item.start + item.direction * i * (360 / points)) * Math.PI) / 180) * item.radius
              );
              // Label follows same orbit but offset by labelOffset degrees
              const labelXPos = Array.from({ length: points + 1 }, (_, i) => 
                Math.cos(((item.start + item.labelOffset + item.direction * i * (360 / points)) * Math.PI) / 180) * item.radius
              );
              const labelYPos = Array.from({ length: points + 1 }, (_, i) => 
                Math.sin(((item.start + item.labelOffset + item.direction * i * (360 / points)) * Math.PI) / 180) * item.radius
              );
              
              return (
                <React.Fragment key={idx}>
                  {/* Planet - Icon with clean styling */}
                  <motion.div
                    className="absolute z-20"
                    style={{ 
                      left: '50%', 
                      top: '50%',
                      willChange: prefersReducedMotion ? 'auto' : 'transform',
                    }}
                    animate={prefersReducedMotion ? {} : { x: xPos, y: yPos }}
                    transition={prefersReducedMotion ? {} : {
                      duration: item.duration,
                      repeat: Infinity,
                      ease: "linear",
                      times: Array.from({ length: points + 1 }, (_, i) => i / points),
                    }}
                  >
                    <motion.div 
                      className="relative"
                      style={{ marginLeft: -20, marginTop: -20 }}
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1 + 0.3, type: "spring", stiffness: 200, damping: 15 }}
                    >
                      {/* Simple planet body - cleaner design */}
                      <div 
                        className="relative flex items-center justify-center rounded-full"
                        style={{ 
                          width: 40,
                          height: 40,
                          background: isDark 
                            ? `linear-gradient(135deg, ${item.color}25, rgba(15, 23, 42, 0.9))`
                            : `linear-gradient(135deg, ${item.color}15, #ffffff)`,
                          border: `1.5px solid ${item.color}40`,
                          boxShadow: `0 0 16px ${item.color}20, 0 2px 8px rgba(0,0,0,0.1)`
                        }}
                      >
                        <item.icon style={{ color: item.color, width: 16, height: 16 }} />
                      </div>
                    </motion.div>
                  </motion.div>

                  {/* Label on same orbit, offset by labelOffset degrees */}
                  <motion.div
                    className="absolute z-30 pointer-events-none"
                    style={{ 
                      left: '50%', 
                      top: '50%',
                      willChange: prefersReducedMotion ? 'auto' : 'transform',
                    }}
                    animate={prefersReducedMotion ? {} : { x: labelXPos, y: labelYPos }}
                    transition={prefersReducedMotion ? {} : {
                      duration: item.duration,
                      repeat: Infinity,
                      ease: "linear",
                      times: Array.from({ length: points + 1 }, (_, i) => i / points),
                    }}
                  >
                    <motion.span
                      className="whitespace-nowrap text-[10px] font-medium"
                      style={{ 
                        marginLeft: -28,
                        marginTop: -6,
                        color: item.color,
                        display: 'block',
                      }}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1 + 0.5 }}
                    >
                      {isEn ? item.label.en : item.label.fr}
                    </motion.span>
                  </motion.div>
                </React.Fragment>
              );
            })}


            {/* Floating ROI badges around perimeter - removed to emphasize spiral */}
          </div>

          {/* Mobile - Clean Card Layout */}
          <div className="md:hidden relative px-4">
            <motion.div 
              className="rounded-xl p-5 relative overflow-hidden"
              style={{ 
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255, 255, 255, 0.95)',
                border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.6)'}`,
                boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.15)' : '0 4px 20px rgba(0,0,0,0.04)'
              }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              {/* Subtle gradient background */}
              <div 
                className="absolute inset-0 opacity-30 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 15% 50%, ${theme.green}20 0%, transparent 50%)`
                }}
              />
              
              {/* Content */}
              <div className="relative flex items-center gap-5">
                {/* Human photo - centered circle */}
                <div className="relative flex-shrink-0">
                  <div 
                    className="rounded-full overflow-hidden"
                    style={{ 
                      width: 64,
                      height: 64,
                      border: `2.5px solid ${theme.green}50`,
                      boxShadow: `0 4px 16px ${theme.green}20`
                    }}
                  >
                    <img 
                      src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop&crop=face"
                      alt={isEn ? 'Business professional' : 'Professionnel'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  {/* Checkmark */}
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ 
                      background: theme.green,
                      border: `2px solid ${isDark ? '#0f172a' : '#ffffff'}`,
                    }}
                  >
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </div>
                </div>

                {/* Data Domains - 2 rows of 3 - shifted right with more space */}
                <div className="flex-1 grid grid-cols-3 gap-x-3 gap-y-2.5 pl-1">
                  {[
                    { icon: Calculator, label: { en: 'Accounting', fr: 'Compta' }, color: theme.green },
                    { icon: Wallet, label: { en: 'Finance', fr: 'Finance' }, color: theme.greenDark },
                    { icon: Percent, label: { en: 'Credits', fr: 'Crédits' }, color: theme.gold },
                    { icon: Receipt, label: { en: 'Taxes', fr: 'Impôts' }, color: theme.goldDark },
                    { icon: LineChart, label: { en: 'Market', fr: 'Marché' }, color: theme.greenLight },
                    { icon: Briefcase, label: { en: 'Invest', fr: 'Invest.' }, color: theme.green },
                  ].map((d, i) => (
                    <motion.div 
                      key={i}
                      className="flex items-center gap-1.5"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 + 0.2, duration: 0.3 }}
                    >
                      <d.icon className="w-4 h-4 flex-shrink-0" style={{ color: d.color }} />
                      <span 
                        className="text-[11px] font-semibold"
                        style={{ color: d.color }}
                      >
                        {isEn ? d.label.en : d.label.fr}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* LEGACY: Original mobile grid - hidden, replaced by compact layout above */}
          <div className="hidden">
            <div className="grid grid-cols-3 gap-4 px-4 w-full max-w-sm">
              {[
                { icon: Calculator, label: { en: 'Accounting', fr: 'Comptabilité' }, color: theme.green },
                { icon: Wallet, label: { en: 'Finance', fr: 'Finances' }, color: theme.greenDark },
                { icon: Percent, label: { en: 'Credits', fr: 'Crédits' }, color: theme.gold },
                { icon: Receipt, label: { en: 'Taxes', fr: 'Impôts' }, color: theme.goldDark },
                { icon: LineChart, label: { en: 'Market', fr: 'Marché' }, color: theme.greenLight },
                { icon: Briefcase, label: { en: 'Investors', fr: 'Investisseurs' }, color: theme.green },
              ].map((d, i) => (
                <motion.div 
                  key={i}
                  className="flex flex-col items-center"
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 + 0.4, duration: 0.5, ease: "easeOut" }}
                >
                  <motion.div 
                    className="relative w-14 h-14 rounded-2xl flex items-center justify-center mb-2 min-h-[44px]"
                    style={{ 
                      background: isDark 
                        ? `linear-gradient(145deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)`
                        : `linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)`,
                      border: `2px solid ${d.color}35`,
                      boxShadow: `0 4px 20px ${d.color}20, 0 2px 8px rgba(0,0,0,0.06)`
                    }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    {/* Animated corner accent */}
                    {!prefersReducedMotion && (
                      <motion.div
                        className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                        style={{ backgroundColor: d.color, boxShadow: `0 0 6px ${d.color}` }}
                        animate={{ 
                          scale: [1, 1.3, 1],
                          opacity: [0.7, 1, 0.7]
                        }}
                        transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3 }}
                      />
                    )}
                    {prefersReducedMotion && (
                      <div
                        className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                        style={{ backgroundColor: d.color, boxShadow: `0 0 6px ${d.color}` }}
                      />
                    )}
                    <d.icon className="w-6 h-6" style={{ color: d.color }} />
                  </motion.div>
                  <span 
                    className="text-[10px] font-semibold text-center leading-tight"
                    style={{ color: d.color }}
                  >
                    {isEn ? d.label.en : d.label.fr}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

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
            {/* Section Label Badge */}
            <div className="flex justify-center mb-4">
              <SectionBadge variant="green" icon={Layers} theme={theme} isDark={isDark}>
                {isEn ? 'How It Works' : 'Comment ça fonctionne'}
              </SectionBadge>
            </div>
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
              className="text-sm sm:text-base max-w-lg mx-auto mb-8 sm:mb-12"
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

          {/* Pipeline Steps - Responsive Grid */}
          <div className="relative mt-8 sm:mt-12">
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
              {/* Multiple animated data particles - Disabled for reduced motion */}
              {!prefersReducedMotion && [0, 1, 2].map((i) => (
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

            {/* Simplified Connection Line - Tablet (vertical dotted line) */}
            {isTablet && (
              <div className="hidden md:block lg:hidden absolute left-1/2 top-[120px] bottom-[120px] w-[2px] z-0 -translate-x-1/2">
                <div 
                  className="h-full"
                  style={{ 
                    background: `repeating-linear-gradient(to bottom, ${theme.green} 0%, ${theme.green} 8px, transparent 8px, transparent 16px)`,
                    opacity: 0.4
                  }}
                />
              </div>
            )}
            
            {/* Steps Grid - Responsive: 1-col mobile, 2x2 tablet, 4-col desktop */}
            <div className={`grid gap-4 lg:gap-6 items-stretch ${
              isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-2' : 'grid-cols-4'
            }`}>
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
                  title: isEn ? 'Analyze' : 'Analyser',
                  desc: isEn ? 'Detects anomalies, calculates KPIs, spots trends' : 'Détecte anomalies, calcule KPIs, repère tendances',
                  tags: ['97%', isEn ? 'Accuracy' : 'Précision', 'Auto'],
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
                  className="group relative h-full"
                  initial={{ opacity: 0, y: 60, scale: 0.85 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ 
                    duration: 1.0, 
                    delay: 0.3 + idx * 0.15,
                    ease: [0.16, 1, 0.3, 1]
                  }}
                >
                  {/* Step Card - Enhanced Design with responsive heights */}
                  <motion.div 
                    className="relative p-3 sm:p-4 lg:p-5 rounded-xl cursor-pointer overflow-hidden h-full flex flex-col"
                    style={{ 
                      minHeight: 'min-content',
                      maxHeight: isMobile ? 'none' : isTablet ? '450px' : '480px',
                      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                      border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.6)'}`,
                      backdropFilter: 'blur(12px)',
                      boxShadow: isDark 
                        ? `0 4px 24px -4px rgba(0,0,0,0.3), inset 0 1px 0 0 rgba(255,255,255,0.05)`
                        : `0 4px 24px -4px rgba(0,0,0,0.08), inset 0 1px 0 0 rgba(255,255,255,0.8)`,
                    }}
                    whileHover={!isMobile ? { 
                      y: -12,
                      scale: 1.02,
                      boxShadow: isDark 
                        ? `0 32px 64px -16px ${step.color}40, 0 16px 32px -8px rgba(0,0,0,0.4)`
                        : `0 32px 64px -16px ${step.color}30, 0 16px 32px -8px rgba(0,0,0,0.1)`,
                      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
                    } : {}}
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
                    
                    {/* Icon only - no step number */}
                    <div className="flex items-center justify-end mb-2">
                      <motion.div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden"
                        style={{ 
                          backgroundColor: `${step.color}12`,
                          border: `1px solid ${step.color}20`
                        }}
                        animate={prefersReducedMotion ? {} : { 
                          rotate: step.visual === 'clean' ? [0, 360] : 0,
                          scale: [1, 1.05, 1],
                        }}
                        transition={prefersReducedMotion ? {} : { 
                          rotate: { duration: 10, repeat: Infinity, ease: "linear" },
                          scale: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: idx * 0.3 }
                        }}
                        whileHover={{ 
                          scale: 1.15,
                          backgroundColor: `${step.color}25`,
                          transition: { duration: 0.3 }
                        }}
                      >
                        <step.icon className="w-5 h-5" style={{ color: step.color }} />
                      </motion.div>
                    </div>
                    
                    {/* Title */}
                    <h4 
                      className="text-base sm:text-lg font-bold mb-1.5"
                      style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
                    >
                      {step.title}
                    </h4>
                    
                    {/* Description - Compact for more visualization space */}
                    <p 
                      className="text-xs sm:text-sm mb-2 leading-relaxed"
                      style={{ 
                        color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)',
                      }}
                    >
                      {step.desc}
                    </p>
                    
                    {/* Mini Visualization Area - Maximized responsive heights */}
                    <div 
                      className="relative flex-1 min-h-[140px] sm:min-h-[160px] lg:min-h-[150px] mb-3 rounded-lg overflow-hidden"
                      style={{ 
                        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(248, 250, 252, 0.8)',
                        border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.5)'}`
                      }}
                    >
                      {step.visual === 'connect' && (
                        <div className="absolute inset-0 flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4">
                          {/* Source icons with pulse */}
                          <div className="flex flex-col gap-1.5">
                            {['QB', 'XE', 'SA'].map((src, i) => (
                              <motion.div
                                key={src}
                                className="w-9 h-6 rounded-md text-[10px] font-bold flex items-center justify-center relative overflow-hidden"
                                style={{ 
                                  backgroundColor: `${step.color}15`,
                                  color: step.color,
                                  border: `1px solid ${step.color}25`
                                }}
                                initial={{ x: -30, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: i * 0.15 + 0.3, duration: 0.4, ease: "easeOut" }}
                              >
                                <motion.div
                                  className="absolute inset-0"
                                  style={{ background: `linear-gradient(90deg, transparent, ${step.color}30, transparent)` }}
                                  animate={{ x: ['-100%', '100%'] }}
                                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 + 1 }}
                                />
                                <span className="relative z-10">{src}</span>
                              </motion.div>
                            ))}
                          </div>
                          {/* Animated flowing lines */}
                          <svg className="flex-1 h-[70px]" viewBox="0 0 80 60" preserveAspectRatio="xMidYMid meet">
                            {[0, 1, 2].map((i) => (
                              <React.Fragment key={i}>
                                <motion.path
                                  d={`M0,${15 + i * 15} Q40,30 80,30`}
                                  fill="none"
                                  stroke={step.color}
                                  strokeWidth="2"
                                  strokeOpacity="0.3"
                                  initial={{ pathLength: 0 }}
                                  animate={{ pathLength: 1 }}
                                  transition={{ delay: i * 0.2 + 0.8, duration: 0.8 }}
                                />
                                {/* Flowing dot */}
                                <motion.circle
                                  r="4"
                                  fill={step.color}
                                  initial={{ opacity: 0 }}
                                  animate={{
                                    opacity: [0, 1, 1, 0],
                                    offsetDistance: ['0%', '100%'],
                                  }}
                                  style={{ offsetPath: `path("M0,${15 + i * 15} Q40,30 80,30")` }}
                                  transition={{ duration: 1.2, delay: i * 0.3 + 1.5, repeat: Infinity, repeatDelay: 1 }}
                                />
                              </React.Fragment>
                            ))}
                            <motion.circle
                              cx="80" cy="30" r="6"
                              fill={step.color}
                              initial={{ scale: 0 }}
                              animate={{ scale: [0, 1.3, 1] }}
                              transition={{ delay: 2, duration: 0.4, ease: "backOut" }}
                            />
                          </svg>
                          {/* Target with glow */}
                          <motion.div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center relative"
                            style={{ backgroundColor: `${step.color}20`, border: `2px solid ${step.color}40` }}
                            initial={{ scale: 0, rotate: -45 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 2, duration: 0.5, type: "spring" }}
                          >
                            <motion.div 
                              className="absolute inset-0 rounded-xl"
                              style={{ boxShadow: `0 0 20px ${step.color}40` }}
                              animate={{ opacity: [0.3, 0.7, 0.3] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                            <Database className="w-6 h-6" style={{ color: step.color }} />
                          </motion.div>
                        </div>
                      )}
                      
                      {step.visual === 'clean' && (
                        <div className="absolute inset-0 flex items-center justify-center px-3 sm:px-4">
                          <div className="flex items-center gap-2 sm:gap-3 w-full">
                            {/* Raw data blocks */}
                            <div className="flex flex-col gap-1.5">
                              {[1, 2, 3].map((i) => (
                                <motion.div
                                  key={i}
                                  className="h-3 rounded"
                                  style={{ 
                                    width: `${20 + i * 8}px`,
                                    backgroundColor: isDark ? 'rgba(148, 163, 184, 0.3)' : 'rgba(100, 116, 139, 0.25)'
                                  }}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: [0.3, 0.6, 0.3], x: 0 }}
                                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                                />
                              ))}
                            </div>
                            {/* Animated sync icon */}
                            <motion.div 
                              className="flex-1 flex items-center justify-center"
                            >
                              <motion.div 
                                className="w-10 h-10 rounded-full flex items-center justify-center relative"
                                style={{ backgroundColor: `${step.color}15`, border: `1px solid ${step.color}25` }}
                              >
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                >
                                  <RefreshCw className="w-5 h-5" style={{ color: step.color }} />
                                </motion.div>
                                {/* Pulse ring */}
                                <motion.div
                                  className="absolute inset-0 rounded-full"
                                  style={{ border: `2px solid ${step.color}` }}
                                  animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                                  transition={{ duration: 1.5, repeat: Infinity }}
                                />
                              </motion.div>
                            </motion.div>
                            {/* Clean animated bars */}
                            <div className="flex items-end gap-1.5 h-14">
                              {[50, 75, 40, 90, 65].map((h, i) => (
                                <motion.div
                                  key={i}
                                  className="w-3 rounded-sm relative overflow-hidden"
                                  style={{ backgroundColor: `${step.color}30` }}
                                  initial={{ height: 0 }}
                                  animate={{ height: `${h}%` }}
                                  transition={{ delay: i * 0.12 + 0.8, duration: 0.6, ease: "easeOut" }}
                                >
                                  <motion.div
                                    className="absolute inset-0"
                                    style={{ backgroundColor: step.color }}
                                    initial={{ y: '100%' }}
                                    animate={{ y: '0%' }}
                                    transition={{ delay: i * 0.12 + 1.2, duration: 0.5 }}
                                  />
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {step.visual === 'ai' && (
                        <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4 lg:p-4">
                          {/* AI neural network visualization - significantly improved for all screens */}
                          <svg className="w-full h-full max-w-[200px] sm:max-w-none" viewBox="0 0 120 70" preserveAspectRatio="xMidYMid meet">
                            {/* Background glow for output node */}
                            <motion.circle
                              cx="100" cy="35" r="18"
                              style={{ fill: step.color }}
                              fillOpacity={0.1}
                              animate={prefersReducedMotion ? {} : { scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                              transition={prefersReducedMotion ? {} : { duration: 3, repeat: Infinity }}
                            />
                            
                            {/* Connection lines - drawn first so nodes appear on top */}
                            {[
                              // Input to hidden layer 1
                              [20, 14, 55, 22], [20, 14, 55, 48],
                              [20, 35, 55, 22], [20, 35, 55, 48],
                              [20, 56, 55, 22], [20, 56, 55, 48],
                              // Hidden layer 1 to output
                              [55, 22, 100, 35], [55, 48, 100, 35]
                            ].map(([x1, y1, x2, y2], i) => (
                              <motion.line
                                key={i}
                                x1={x1} y1={y1} x2={x2} y2={y2}
                                style={{ stroke: step.color }}
                                strokeWidth="2"
                                strokeOpacity="0.4"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.4 }}
                                transition={{ delay: i * 0.06 + 1.2, duration: 0.6 }}
                              />
                            ))}
                            
                            {/* Animated data flow particles - Disabled for reduced motion */}
                            {!prefersReducedMotion && [0, 1, 2].map((i) => (
                              <motion.circle
                                key={`particle-${i}`}
                                r="3"
                                style={{ fill: step.color }}
                                initial={{ opacity: 0 }}
                                animate={{ 
                                  cx: [20, 55, 100],
                                  cy: [14 + i * 21, 35, 35],
                                  opacity: [0, 1, 0]
                                }}
                                transition={{ 
                                  duration: 2.5,
                                  delay: i * 0.8 + 2,
                                  repeat: Infinity,
                                  repeatDelay: 1
                                }}
                              />
                            ))}
                            
                            {/* Input layer nodes (3 nodes) */}
                            {[[20, 14], [20, 35], [20, 56]].map(([cx, cy], i) => (
                              <motion.g key={`input-${i}`}>
                                <motion.circle
                                  cx={cx} cy={cy} r="8"
                                  style={{ fill: step.color, stroke: step.color }}
                                  fillOpacity={0.25}
                                  strokeWidth="2"
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ delay: i * 0.1 + 1, duration: 0.4 }}
                                />
                                <motion.circle
                                  cx={cx} cy={cy} r="4"
                                  style={{ fill: step.color }}
                                  initial={{ scale: 0 }}
                                  animate={prefersReducedMotion ? {} : { scale: [0.8, 1, 0.8], opacity: [0.6, 1, 0.6] }}
                                  transition={prefersReducedMotion ? {} : { 
                                    delay: i * 0.1 + 1.2,
                                    duration: 2,
                                    repeat: Infinity
                                  }}
                                />
                              </motion.g>
                            ))}
                            
                            {/* Hidden layer nodes (2 nodes) */}
                            {[[55, 22], [55, 48]].map(([cx, cy], i) => (
                              <motion.g key={`hidden-${i}`}>
                                <motion.circle
                                  cx={cx} cy={cy} r="9"
                                  style={{ fill: step.color, stroke: step.color }}
                                  fillOpacity={0.3}
                                  strokeWidth="2"
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ delay: i * 0.15 + 1.3, duration: 0.4 }}
                                />
                                <motion.circle
                                  cx={cx} cy={cy} r="5"
                                  style={{ fill: step.color }}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.7, 1, 0.7] }}
                                  transition={{ 
                                    delay: i * 0.15 + 1.5,
                                    duration: 1.8,
                                    repeat: Infinity
                                  }}
                                />
                              </motion.g>
                            ))}
                            
                            {/* Output node (larger, emphasized) */}
                            <motion.g>
                              <motion.circle
                                cx="100" cy="35" r="12"
                                style={{ fill: step.color, stroke: step.color }}
                                fillOpacity={0.35}
                                strokeWidth="2.5"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 1.6, duration: 0.5 }}
                              />
                              <motion.circle
                                cx="100" cy="35" r="6"
                                style={{ fill: step.color }}
                                initial={{ scale: 0 }}
                                animate={{ scale: [0.9, 1.2, 0.9], opacity: [0.8, 1, 0.8] }}
                                transition={{ 
                                  delay: 1.8,
                                  duration: 1.5,
                                  repeat: Infinity
                                }}
                              />
                            </motion.g>
                            
                            {/* Animated pulse ring around output */}
                            <motion.circle
                              cx="100" cy="35" r="16"
                              fill="none"
                              style={{ stroke: step.color }}
                              strokeWidth="2"
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                              transition={{ duration: 2, repeat: Infinity, delay: 2 }}
                            />
                          </svg>
                        </div>
                      )}
                      
                      {step.visual === 'dashboard' && (
                        <div className="absolute inset-0 flex items-center justify-center px-3 sm:px-4 lg:px-4 py-2 gap-4 sm:gap-5 lg:gap-5">
                          {/* Mini dashboard preview - expanded layout */}
                          <div className="flex flex-col gap-2 sm:gap-2.5 flex-1 h-full justify-center">
                            {/* KPI card - taller */}
                            <motion.div 
                              className="h-7 sm:h-8 lg:h-8 rounded-md flex items-center px-3 gap-2"
                              style={{ 
                                backgroundColor: isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(217, 119, 6, 0.12)', 
                                border: `1px solid ${isDark ? 'rgba(251, 191, 36, 0.25)' : 'rgba(217, 119, 6, 0.2)'}` 
                              }}
                              initial={{ width: 0 }}
                              animate={{ width: '100%' }}
                              transition={{ delay: 1.2, duration: 0.5 }}
                            >
                              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-4 lg:h-4" style={{ color: step.color }} />
                              <span className="text-[10px] sm:text-[11px] lg:text-[11px] font-bold" style={{ color: step.color }}>+24%</span>
                            </motion.div>
                            {/* Chart bars - taller with more bars */}
                            <div className="flex items-end gap-1.5 sm:gap-2 lg:gap-2 h-14 sm:h-16 lg:h-16 flex-1">
                              {[35, 55, 40, 70, 50, 65, 85].map((h, i) => (
                                <motion.div
                                  key={i}
                                  className="flex-1 rounded-t"
                                  style={{ backgroundColor: step.color, opacity: i === 6 ? 1 : 0.5 }}
                                  initial={{ height: 0 }}
                                  animate={{ height: `${h}%` }}
                                  transition={{ delay: i * 0.08 + 1.5, duration: 0.4 }}
                                />
                              ))}
                            </div>
                          </div>
                          {/* Gauge - larger */}
                          <motion.div 
                            className="w-14 h-14 sm:w-16 sm:h-16 lg:w-16 lg:h-16 relative flex-shrink-0"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 2, duration: 0.4 }}
                          >
                            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                              <circle cx="18" cy="18" r="14" fill="none" stroke={isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.8)'} strokeWidth="4" />
                              <motion.circle 
                                cx="18" cy="18" r="14" 
                                fill="none" 
                                style={{ stroke: step.color }}
                                strokeWidth="4"
                                strokeDasharray="88"
                                initial={{ strokeDashoffset: 88 }}
                                animate={{ strokeDashoffset: 22 }}
                                transition={{ delay: 2.2, duration: 1 }}
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[11px] sm:text-[12px] lg:text-[12px] font-bold" style={{ color: step.color }}>75%</span>
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white transition-all hover:scale-[1.02] text-sm"
              style={{ 
                background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                boxShadow: `0 4px 16px ${theme.green}30`
              }}
              aria-label={isEn ? 'Connect your accounting software and start free trial' : 'Connectez votre logiciel comptable et commencez votre essai gratuit'}
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

      {/* Final CTA - Clean Light Design */}
      <section 
        className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6"
        aria-label={isEn ? 'Ready to grow smarter - Start your free trial' : 'Prêt à grandir plus intelligemment - Commencez votre essai gratuit'}
        style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}
      >
        <div className="max-w-4xl mx-auto text-center">
          {/* Gold Badge */}
          <motion.div 
            className="flex justify-center mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <SectionBadge variant="gold" icon={Target} theme={theme} isDark={isDark}>
              {isEn ? 'Are you ready?' : 'Vous êtes prêts?'}
            </SectionBadge>
          </motion.div>
          
          {/* Heading */}
          <motion.h2 
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 leading-tight"
            style={{ color: 'rgb(var(--color-text))' }}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            {isEn ? 'Join the Intelligence Network' : 'Rejoignez le réseau d\'intelligence'}
          </motion.h2>
          
          {/* Subheading */}
          <motion.p 
            className="text-base sm:text-lg lg:text-xl mb-8 max-w-2xl mx-auto"
            style={{ color: 'rgb(var(--color-text-muted))' }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            {isEn 
              ? 'Every data point captured helps you make better decisions across accounting, taxes, and investments. Leverage the full picture.'
              : 'Chaque donnée capturée vous aide à prendre de meilleures décisions en comptabilité, fiscalité et investissements. Exploitez le portrait complet.'}
          </motion.p>
          
          {/* CTA Buttons */}
          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.button 
              onClick={() => register()}
              whileHover={{ scale: 1.02, transition: { duration: 0.3 } }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm text-white"
              style={{ 
                background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                boxShadow: `0 4px 16px ${theme.green}30`
              }}
              aria-label={isEn ? 'Start free trial today' : 'Commencez votre essai gratuit aujourd\'hui'}
            >
              {isEn ? 'Start free today' : 'Commencez gratuitement'}
              <ArrowRight className="w-4 h-4" />
            </motion.button>
            
            <motion.button 
              onClick={handleScheduleCall}
              whileHover={{ scale: 1.02, transition: { duration: 0.3 } }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))',
                color: 'rgb(var(--color-text))',
                border: '1px solid rgb(var(--color-border))'
              }}
              aria-label={isEn ? 'Schedule a personalized demo' : 'Planifier une démo personnalisée'}
            >
              <Calendar className="w-4 h-4" />
              {isEn ? 'Get a personalized demo' : 'Obtenez une démo personnalisée'}
            </motion.button>
          </motion.div>
          
          {/* Trust Badges */}
          <motion.div 
            className="flex flex-wrap justify-center items-center gap-4 sm:gap-8 text-sm"
            style={{ color: 'rgb(var(--color-text-muted))' }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {[
              { text: isEn ? '8x average ROI' : 'ROI moyen de 8x' },
              { text: isEn ? '5 min setup' : 'Config. en 5 min' },
              { text: isEn ? 'Data in Canada' : 'Données au Canada', flag: true },
            ].map((badge, idx) => (
              <span 
                key={idx}
                className="flex items-center gap-2"
              >
                <Check className="w-4 h-4" style={{ color: theme.green }} />
                {badge.text} {badge.flag && '🇨🇦'}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Tax Credits / Unclaimed Money Section */}
      <span id="pricing" className="absolute" style={{ top: '-100px' }} />
      <section 
        className="py-12 sm:py-16 px-4 sm:px-6 relative overflow-hidden"
        aria-label={isEn ? 'Unclaimed tax credits for Canadian SMBs' : 'Crédits d\'impôt non réclamés pour PME canadiennes'}
        style={{ 
          background: isDark 
            ? 'linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 1) 100%)' 
            : 'linear-gradient(180deg, #ffffff 0%, #fefce8 50%, #ffffff 100%)'
        }}
      >
        {/* Background Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 30% 50%, ${theme.gold} 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
        
        <div className="max-w-3xl mx-auto text-center relative z-10">
          {/* Gold Badge - Clarté financière */}
          <motion.div 
            className="flex justify-center mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <SectionBadge variant="gold" icon={DollarSign} theme={theme} isDark={isDark}>
              {isEn ? 'Financial Clarity' : 'Clarté financière'}
            </SectionBadge>
          </motion.div>
          
          {/* Main Headline */}
          <motion.h2 
            className="text-xl sm:text-2xl md:text-3xl font-bold mb-3"
            style={{ color: 'rgb(var(--color-text))' }}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            {isEn ? (
              <>The Money You're <span style={{ color: theme.gold }}>Leaving on the Table</span></>
            ) : (
              <>L'argent que vous <span style={{ color: theme.gold }}>laissez sur la table</span></>
            )}
          </motion.h2>
          
          {/* Subtitle */}
          <motion.p 
            className="text-sm sm:text-base mb-5 max-w-xl mx-auto"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {isEn 
              ? 'Canadian SMBs miss out on tax credits every year. SR&ED, CDAE, apprenticeship credits, and more.'
              : 'Les PME canadiennes passent à côté de crédits d\'impôt chaque année. RS&DE, CDAE, crédits d\'apprentissage, et plus.'}
          </motion.p>
          
          {/* Credit Types */}
          <motion.div 
            className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {[
              { en: 'SR&ED', fr: 'RS&DE' },
              { en: 'CDAE', fr: 'CDAE' },
              { en: 'Apprenticeship', fr: 'Apprentissage' },
              { en: 'Digital Adoption', fr: 'Adoption numérique' },
              { en: 'Green Energy', fr: 'Énergie verte' },
            ].map((credit, idx) => (
              <span 
                key={idx}
                className="px-2.5 py-1 rounded-md text-xs font-medium"
                style={{ 
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                  color: theme.green,
                  border: `1px solid ${theme.green}25`,
                }}
              >
                {isEn ? credit.en : credit.fr}
              </span>
            ))}
          </motion.div>
          
          {/* CTA Button */}
          <motion.button
            onClick={() => register()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white text-sm transition-all"
            style={{ 
              background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
              boxShadow: `0 4px 16px ${theme.green}30`,
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            aria-label={isEn ? 'See your tax credit eligibility' : 'Voir votre éligibilité aux crédits d\'impôt'}
            whileHover={{ 
              scale: 1.02,
              boxShadow: `0 6px 20px ${theme.green}40`,
            }}
            whileTap={{ scale: 0.98 }}
          >
            {isEn ? 'See Your Eligibility' : 'Voir votre éligibilité'}
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </section>

      {/* Contact Section */}
      <section 
        id="contact"
        className="py-16 sm:py-24 px-4 sm:px-6 relative overflow-hidden"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          borderTop: `1px solid ${theme.green}15`,
        }}
      >
        {/* Decorative background elements */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 30%, ${theme.green} 0%, transparent 50%), radial-gradient(circle at 80% 70%, ${theme.gold} 0%, transparent 50%)`,
          }}
        />
        <div 
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(${theme.green} 1px, transparent 1px), linear-gradient(90deg, ${theme.green} 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div 
            className="text-center mb-10 sm:mb-14"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Section Label Badge */}
            <div className="flex justify-center mb-4">
              <SectionBadge variant="green" icon={MessageSquare} theme={theme} isDark={isDark}>
                {isEn ? 'We\'re here to help' : 'Nous sommes là pour vous aider'}
              </SectionBadge>
            </div>
            
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
          
          {/* Contact Form - Full Width */}
          <motion.div 
            className="max-w-3xl mx-auto p-6 sm:p-8 md:p-10 rounded-2xl relative overflow-hidden"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              border: `1px solid ${theme.green}20`,
              boxShadow: `0 8px 40px ${theme.green}08`,
            }}
          >
            {/* Decorative elements */}
            <div 
              className="absolute top-0 right-0 w-32 h-32 opacity-5"
              style={{
                background: `radial-gradient(circle, ${theme.green} 0%, transparent 70%)`,
              }}
            />
            <div 
              className="absolute bottom-0 left-0 w-24 h-24 opacity-5"
              style={{
                background: `radial-gradient(circle, ${theme.gold} 0%, transparent 70%)`,
              }}
            />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6 sm:mb-8">
                <div 
                  className="p-2.5 rounded-xl flex-shrink-0"
                  style={{ backgroundColor: `${theme.green}12` }}
                >
                  <MessageSquare className="w-5 h-5" style={{ color: theme.green }} />
                </div>
                <h3 
                  className="text-base sm:text-lg font-semibold"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn ? 'Send Us a Message' : 'Envoyez-nous un message'}
                </h3>
              </div>
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

          {/* Quick Contact Options - Left/Right thin layout */}
          <motion.div 
            className="flex items-center justify-center gap-6 sm:gap-10 mt-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {/* Email - Left */}
            <a 
              href="mailto:info@plainledger.ca" 
              className="group flex items-center gap-1.5 text-xs sm:text-sm transition-colors duration-200"
              aria-label={isEn ? 'Send email to info@plainledger.ca' : 'Envoyer un courriel à info@plainledger.ca'}
            >
              <Mail className="w-3.5 h-3.5" style={{ color: theme.green }} />
              <span className="group-hover:underline" style={{ color: theme.green }}>
                info@plainledger.ca
              </span>
            </a>
            
            {/* Separator */}
            <span 
              className="w-px h-3.5"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)' }}
            />
            
            {/* Schedule call - Right */}
            <button
              onClick={handleScheduleCall}
              className="group flex items-center gap-1.5 text-xs sm:text-sm transition-colors duration-200"
              aria-label={isEn ? 'Schedule a call' : 'Planifier un appel'}
            >
              <Calendar className="w-3.5 h-3.5" style={{ color: theme.green }} />
              <span className="group-hover:underline" style={{ color: theme.green }}>
                {isEn ? 'Schedule a call' : 'Planifier un appel'}
              </span>
              <span className="text-[10px] sm:text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                (15 min)
              </span>
            </button>
          </motion.div>
        </div>
      </section>

      {/* Get The App Section */}
      <GetTheApp />

      {/* Footer */}
      <footer className="py-3 sm:py-4 px-3 sm:px-4 border-t border-gray-200 dark:border-gray-800" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
            <Link to="/privacy" className="transition-colors hover:underline">{isEn ? 'Privacy' : 'Confidentialité'}</Link>
            <Link to="/terms" className="transition-colors hover:underline">{isEn ? 'Terms' : 'Conditions'}</Link>
            <a href="#contact" className="transition-colors hover:underline">Contact</a>
          </div>
          <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 text-center sm:text-right">
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

      {/* Install App Modal */}
      <InstallAppModal 
        isOpen={showInstallModal} 
        onClose={() => setShowInstallModal(false)} 
      />
      </div>
    </>
  );
}
