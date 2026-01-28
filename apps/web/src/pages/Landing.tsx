import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/keycloak';
import ThemeToggle from '../components/ThemeToggle';
import { LanguageToggle, useI18n } from '../lib/i18n';
import IndustryKPISection from '../components/IndustryKPISection';
import DemoModal from '../components/DemoModal';
import { AnalyticsAnimation, DataFlowAnimation, ProcessingAnimation } from '../components/LottieAnimations';
import { 
  ArrowRight,
  Check,
  Shield,
  Menu,
  X,
  Lock,
  Database,
  Sparkles,
  Cpu,
  FileCheck,
  Layers,
  Zap,
  TrendingUp,
  Eye,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Gauge,
  Brain,
  Calendar,
  Target,
  BarChart3,
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
}: {
  data: number[];
  color: string;
  height?: number;
  delay?: number;
  trigger?: boolean;
  showDashed?: boolean;
}) {
  const [progress, setProgress] = useState(0);
  
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
  }));
  
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  // For dashed projection line (last 3 points)
  const solidPoints = points.slice(0, -3);
  const dashedPoints = points.slice(-4);
  const solidPath = solidPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const dashedPath = dashedPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`area-gradient-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
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
      
      {/* Current value dot */}
      {progress > 0.8 && (
        <circle
          cx={points[showDashed ? points.length - 4 : points.length - 1].x}
          cy={points[showDashed ? points.length - 4 : points.length - 1].y}
          r="3"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
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
        { label: isEn ? 'Revenue' : 'Revenus', value: '$847K', data: [42, 45, 48, 52, 58, 54, 62, 68, 72, 78, 82, 85], projection: true },
        { label: isEn ? 'Food Cost %' : 'Coût nourriture', value: '28.5%', data: [32, 30, 29, 31, 28, 29, 27, 28, 29, 28, 28.5, 28], projection: false },
        { label: isEn ? 'Labor Cost %' : 'Coût M-O', value: '24.2%', data: [26, 25, 24, 25, 24, 23, 24, 25, 24, 24, 24, 24.2], projection: false },
        { label: isEn ? 'Prime Cost' : 'Coût principal', value: '52.7%', data: [58, 55, 53, 56, 52, 52, 51, 53, 53, 52, 52.5, 52.7], projection: true },
      ],
      benchmarks: [
        { metric: isEn ? 'Food Cost %' : 'Coût nourriture %', yours: '28.5%', target: '25-35%', status: 'good' },
        { metric: isEn ? 'Labor Cost %' : 'Coût M-O %', yours: '24.2%', target: '20-30%', status: 'good' },
        { metric: isEn ? 'Prime Cost %' : 'Coût principal %', yours: '52.7%', target: '55-65%', status: 'excellent' },
        { metric: isEn ? 'Net Margin' : 'Marge nette', yours: '8.2%', target: '6-9%', status: 'good' },
      ]
    },
    { 
      id: 'realestate',
      name: isEn ? 'Real Estate' : 'Immobilier',
      icon: 'RE',
      iconColor: theme.gold,
      kpis: [
        { label: isEn ? 'NOI' : 'Bénéfice net', value: '$1.2M', data: [85, 88, 92, 95, 98, 102, 108, 112, 115, 118, 120, 124], projection: true },
        { label: isEn ? 'Occupancy' : 'Occupation', value: '94.5%', data: [88, 89, 90, 91, 92, 93, 93, 94, 94, 94, 94.5, 95], projection: true },
        { label: isEn ? 'Cap Rate' : 'Taux cap.', value: '6.8%', data: [7.2, 7.1, 7.0, 6.9, 6.9, 6.8, 6.8, 6.8, 6.7, 6.8, 6.8, 6.8], projection: false },
        { label: isEn ? 'Cash-on-Cash' : 'Rendement', value: '12.4%', data: [10, 10.5, 11, 11.2, 11.5, 11.8, 12, 12.1, 12.2, 12.3, 12.4, 12.5], projection: true },
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
        { label: 'ARR', value: '$2.8M', data: [1.5, 1.7, 1.9, 2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8], projection: true },
        { label: isEn ? 'Cash' : 'Trésorerie', value: '$4.6M', data: [3.2, 3.4, 3.6, 3.8, 4.0, 4.1, 4.2, 4.3, 4.4, 4.5, 4.55, 4.6], projection: true },
        { label: isEn ? 'Avg ACV' : 'ACV moyen', value: '$23K', data: [18, 19, 19, 20, 20, 21, 21, 22, 22, 22, 23, 23], projection: false },
        { label: 'Runway', value: isEn ? '14 Mo' : '14 mois', data: [18, 17, 16, 16, 15, 15, 14, 14, 14, 14, 14, 14], projection: true },
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
    { plan: isEn ? 'Q1 Expansion' : 'Expansion Q1', start: 0, end: 30, color: theme.green },
    { plan: isEn ? 'Cost Optimization' : 'Optimisation coûts', start: 20, end: 60, color: theme.gold },
    { plan: isEn ? 'New Revenue Stream' : 'Nouveau revenu', start: 50, end: 100, color: theme.green },
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
          <div 
            className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
            style={{ backgroundColor: theme.green }}
          >
            JD
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
          {/* Main Navigation */}
          <div className="text-[8px] font-bold uppercase tracking-wider px-2 mb-2" style={{ color: isDark ? 'rgb(100, 116, 139)' : 'rgb(148, 163, 184)' }}>
            {isEn ? 'Navigation' : 'Navigation'}
          </div>
          
          {/* Exec Dashboard - Active with sub-items */}
          <div className={`mb-1 transition-all duration-300 ${showElements ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '0ms' }}>
            <div 
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px] font-semibold cursor-pointer"
              style={{ 
                backgroundColor: `${theme.green}15`,
                color: theme.green,
              }}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              {isEn ? 'Exec Dashboard' : 'Tableau exécutif'}
            </div>
            {/* Sub-items */}
            <div className="ml-5 mt-1 space-y-0.5">
              {[
                { label: isEn ? 'Overview' : 'Aperçu', active: true },
                { label: isEn ? 'Cash Flow' : 'Flux de trésorerie', active: false },
                { label: isEn ? 'P&L Analysis' : 'Analyse P&L', active: false },
              ].map((sub, j) => (
                <div 
                  key={j}
                  className="text-[9px] px-2 py-1 rounded cursor-pointer transition-colors"
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
            <div className="ml-5 mt-1 space-y-0.5">
              {[
                { label: isEn ? 'Benchmarks' : 'Références' },
                { label: isEn ? 'Trends' : 'Tendances' },
              ].map((sub, j) => (
                <div 
                  key={j}
                  className="text-[9px] px-2 py-1 rounded cursor-pointer transition-colors"
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
            <div className="ml-5 mt-1 space-y-0.5">
              {[
                { label: isEn ? 'What-If' : 'Simulation' },
                { label: isEn ? 'Forecasts' : 'Prévisions' },
              ].map((sub, j) => (
                <div 
                  key={j}
                  className="text-[9px] px-2 py-1 rounded cursor-pointer transition-colors"
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
            <div className="ml-5 mt-1 space-y-0.5">
              {[
                { label: isEn ? 'Monthly' : 'Mensuel' },
                { label: isEn ? 'Custom' : 'Personnalisé' },
              ].map((sub, j) => (
                <div 
                  key={j}
                  className="text-[9px] px-2 py-1 rounded cursor-pointer transition-colors"
                  style={{ color: isDark ? 'rgb(100, 116, 139)' : 'rgb(148, 163, 184)' }}
                >
                  {sub.label}
                </div>
              ))}
            </div>
          </div>
          
          {/* Industries Section */}
          <div className="mt-auto pt-3 border-t" style={{ borderColor: isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.6)' }}>
            <div className="text-[8px] font-bold uppercase tracking-wider px-2 mb-2" style={{ color: isDark ? 'rgb(100, 116, 139)' : 'rgb(148, 163, 184)' }}>
              {isEn ? 'Your Industry' : 'Votre industrie'}
            </div>
            {industries.map((ind, i) => (
              <div 
                key={i}
                onClick={() => setSelectedIndustry(i)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px] cursor-pointer transition-all ${
                  selectedIndustry === i ? 'font-semibold' : ''
                }`}
                style={{ 
                  backgroundColor: selectedIndustry === i ? `${ind.iconColor}12` : 'transparent',
                  color: selectedIndustry === i ? ind.iconColor : (isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)'),
                }}
              >
                <div 
                  className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold"
                  style={{ 
                    backgroundColor: selectedIndustry === i ? `${ind.iconColor}25` : (isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.8)'),
                    color: selectedIndustry === i ? ind.iconColor : (isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)'),
                  }}
                >
                  {ind.icon}
                </div>
                {ind.name}
              </div>
            ))}
          </div>
          
          {/* AI Status */}
          <div 
            className="mt-3 p-2 rounded-md"
            style={{ 
              backgroundColor: isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(248, 250, 252, 0.9)',
              border: `1px solid ${theme.green}20`
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: theme.green }} />
              <span className="text-[9px] font-semibold" style={{ color: theme.green }}>
                {isEn ? 'AI Active' : 'IA Active'}
              </span>
            </div>
            <p className="text-[8px]" style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}>
              {isEn ? 'Analyzing your data in real-time' : 'Analyse en temps réel'}
            </p>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 p-3 sm:p-4 min-h-[400px]">
          {/* Breadcrumb */}
          <div className={`flex items-center gap-2 mb-4 text-[10px] transition-all duration-500 ${showElements ? 'opacity-100' : 'opacity-0'}`}>
            <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Overview' : 'Aperçu'}</span>
            <span style={{ color: 'rgb(var(--color-text-muted))' }}>›</span>
            <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{isEn ? 'Exec Dashboard' : 'Tableau exécutif'}</span>
          </div>
          
          {/* KPI Cards Row - Runway Style */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {current.kpis.map((kpi, i) => (
              <div 
                key={i}
                className={`p-3 rounded-xl transition-all duration-500 cursor-pointer hover:shadow-lg ${
                  showElements ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ 
                  backgroundColor: isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(255, 255, 255, 0.9)',
                  border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)'}`,
                  transitionDelay: `${i * 100 + 200}ms`
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-medium" style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}>
                    {kpi.label}
                  </span>
                  <span className="text-xs sm:text-sm font-bold" style={{ color: theme.green }}>
                    {kpi.value}
                  </span>
                </div>
                <AnimatedAreaChart 
                  data={kpi.data}
                  color={theme.green}
                  height={45}
                  delay={400 + i * 100}
                  trigger={isVisible}
                  showDashed={kpi.projection}
                />
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
              <button 
                className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-medium"
                style={{ backgroundColor: `${theme.green}15`, color: theme.green }}
              >
                <Sparkles className="w-3 h-3" />
                {isEn ? 'Customize' : 'Personnaliser'}
              </button>
            </div>
            
            {/* Timeline Header */}
            <div className="flex mb-2">
              <div className="w-28 sm:w-36" />
              <div className="flex-1 flex justify-between text-[8px] sm:text-[9px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
                <span>Q1 '26</span>
                <span>Q2 '26</span>
                <span>Q3 '26</span>
                <span>Q4 '26</span>
              </div>
            </div>
            
            {/* Roadmap Items */}
            {roadmapItems.map((item, i) => (
              <div key={i} className="flex items-center mb-2">
                <div className="w-28 sm:w-36 text-[9px] sm:text-[10px] font-medium pr-2 truncate" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {item.plan}
                </div>
                <div className="flex-1 h-6 relative rounded overflow-hidden" style={{ backgroundColor: isDark ? 'rgba(71, 85, 105, 0.2)' : 'rgba(229, 231, 235, 0.5)' }}>
                  <div 
                    className="absolute top-1 bottom-1 rounded transition-all duration-1000"
                    style={{ 
                      left: `${item.start}%`,
                      width: showElements ? `${item.end - item.start}%` : '0%',
                      backgroundColor: item.color,
                      opacity: 0.8,
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
              className="grid grid-cols-4 text-[8px] sm:text-[9px] font-semibold uppercase tracking-wider px-3 sm:px-4 py-2"
              style={{ backgroundColor: isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(248, 250, 252, 0.9)' }}
            >
              <span style={{ color: 'rgb(var(--color-text-muted))' }}>KPI</span>
              <span className="text-center" style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Your Value' : 'Votre valeur'}</span>
              <span className="text-center" style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Target' : 'Cible'}</span>
              <span className="text-right" style={{ color: 'rgb(var(--color-text-muted))' }}>Status</span>
            </div>
            
            {/* Table Rows */}
            {current.benchmarks.map((row, i) => (
              <div 
                key={i}
                className={`grid grid-cols-4 text-[9px] sm:text-[10px] px-3 sm:px-4 py-2.5 border-b last:border-b-0 cursor-pointer transition-all ${
                  hoveredRow === i ? 'bg-black/5' : ''
                }`}
                style={{ borderColor: isDark ? 'rgba(71, 85, 105, 0.2)' : 'rgba(229, 231, 235, 0.4)' }}
                onMouseEnter={() => setHoveredRow(i)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{row.metric}</span>
                <span className="text-center font-semibold" style={{ color: theme.green }}>{row.yours}</span>
                <span 
                  className="text-center px-2 py-0.5 rounded-full mx-auto"
                  style={{ 
                    backgroundColor: `${theme.green}10`,
                    color: theme.green,
                    fontSize: '9px'
                  }}
                >
                  {row.target}
                </span>
                <div className="flex justify-end items-center gap-1">
                  <span 
                    className="px-1.5 py-0.5 rounded text-[8px] font-medium"
                    style={{ 
                      backgroundColor: row.status === 'excellent' ? `${theme.green}20` : `${theme.gold}15`,
                      color: row.status === 'excellent' ? theme.green : theme.goldDark,
                    }}
                  >
                    {row.status === 'excellent' ? '★ ' : ''}{row.status === 'excellent' ? (isEn ? 'Excellent' : 'Excellent') : (isEn ? 'On Track' : 'En ligne')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Supported integrations
const integrations = ['QuickBooks', 'Xero', 'Sage', 'FreshBooks', 'Wave', 'CSV Import'];

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
              <a href="#integrations" className="text-sm font-medium hover:text-primary transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Integrations' : 'Intégrations'}
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
                <a href="#integrations" className="text-sm font-medium py-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Integrations' : 'Intégrations'}
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
      <section className="pt-24 sm:pt-28 lg:pt-32 pb-12 sm:pb-16 lg:pb-20 px-4 sm:px-6 relative z-10 min-h-[85vh] flex items-center">
        <div className="max-w-4xl mx-auto text-center w-full">
          {/* Main Headline */}
          <h1 
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4 sm:mb-6 animate-fade-up"
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

          {/* Value Proposition */}
          <div 
            className="max-w-3xl mx-auto mb-8 sm:mb-10 px-2 animate-fade-up opacity-0"
            style={{ animationDelay: '0.15s', animationFillMode: 'forwards' }}
          >
            <p 
              className="text-base sm:text-lg md:text-xl leading-relaxed mb-4"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'Industry-specific AI that understands your business. Get exec-ready dashboards with KPIs, OKRs, and strategic projections tailored to your sector.'
                : 'IA spécifique à votre industrie qui comprend votre entreprise. Obtenez des tableaux de bord avec KPIs, OKRs et projections stratégiques adaptés à votre secteur.'}
            </p>
            
            {/* ROI Highlights */}
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm">
              <div className="flex items-center gap-2" style={{ color: theme.green }}>
                <Sparkles className="w-4 h-4" />
                <span className="font-medium">{isEn ? '97% AI accuracy' : '97% précision IA'}</span>
              </div>
              <div className="flex items-center gap-2" style={{ color: theme.gold }}>
                <TrendingUp className="w-4 h-4" />
                <span className="font-medium">{isEn ? '15+ industries' : '15+ industries'}</span>
              </div>
              <div className="flex items-center gap-2" style={{ color: theme.green }}>
                <Target className="w-4 h-4" />
                <span className="font-medium">{isEn ? 'Avg $4K/mo savings' : 'Économies moy. 4K$/mois'}</span>
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div 
            className="flex flex-col sm:flex-row gap-4 justify-center mb-8 sm:mb-10 animate-fade-up opacity-0"
            style={{ animationDelay: '0.25s', animationFillMode: 'forwards' }}
          >
            <button 
              onClick={() => register()}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all hover:scale-105 text-base shadow-lg"
              style={{ 
                background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                color: 'white',
                boxShadow: `0 8px 24px ${theme.green}40`
              }}
            >
              {isEn ? 'Start free 21-day trial' : 'Essai gratuit de 21 jours'}
              <ArrowRight className="w-5 h-5" />
            </button>
            <button 
              onClick={handleScheduleCall}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all hover:scale-105 text-base"
              style={{ 
                border: `2px solid ${theme.green}`,
                color: isDark ? theme.green : theme.greenDark,
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255,255,255,0.9)'
              }}
            >
              <Calendar className="w-5 h-5" />
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
          <div className="text-center mb-12">
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
          </div>

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
              <div 
                key={idx}
                className="group p-5 rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                style={{ 
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.95)',
                  border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)'}`,
                }}
              >
                {/* Icon */}
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundColor: `${feature.color}15` }}
                >
                  <feature.icon className="w-5 h-5" style={{ color: feature.color }} />
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
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-10">
            <p 
              className="text-sm mb-4"
              style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
            >
              {isEn 
                ? 'All features included in every plan. No hidden upgrades.'
                : 'Toutes les fonctionnalités incluses dans chaque plan. Aucune mise à niveau cachée.'}
            </p>
            <button 
              onClick={() => register()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-all hover:scale-105 text-sm"
              style={{ 
                background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                boxShadow: `0 4px 16px ${theme.green}35`
              }}
            >
              {isEn ? 'Try the dashboard free' : 'Essayez le tableau de bord gratuitement'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Industry KPIs Section - Formulas & Benchmarks */}
      <span id="industry-kpis" className="absolute" style={{ top: '-100px' }} />
      <section id="industries" className="py-16 sm:py-20 lg:py-24 relative">
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
          <div className="text-center mb-10 sm:mb-14">
            <div 
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold mb-3"
              style={{ 
                background: `${theme.green}15`,
                border: `1px solid ${theme.green}25`,
                color: theme.greenDark
              }}
            >
              <Layers className="w-3.5 h-3.5" />
              {isEn ? 'How It Works' : 'Comment ça fonctionne'}
            </div>
            <h2 
              className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3"
              style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
            >
              {isEn ? 'Your Data Journey' : 'Le parcours de vos données'}
            </h2>
            <p 
              className="text-sm sm:text-base max-w-lg mx-auto"
              style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
            >
              {isEn 
                ? 'From connection to insights in 4 intelligent steps'
                : 'De la connexion aux insights en 4 étapes intelligentes'}
            </p>
          </div>

          {/* Pipeline Steps - Horizontal on Desktop */}
          <div className="relative">
            {/* Animated Connection Line - Desktop */}
            <div className="hidden lg:block absolute top-[52px] left-[12%] right-[12%] h-[2px] z-0">
              <div 
                className="h-full animate-pulse"
                style={{ 
                  background: `linear-gradient(90deg, ${theme.green} 0%, ${theme.green} 40%, ${theme.gold} 100%)`
                }}
              />
              {/* Animated dots on line */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full animate-[moveRight_3s_ease-in-out_infinite]"
                style={{ backgroundColor: theme.green, left: '0%' }}
              />
            </div>
            
            {/* Steps Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {[
                { 
                  num: 1, 
                  icon: Database, 
                  title: isEn ? 'Connect' : 'Connecter',
                  desc: isEn ? 'Link your accounting software' : 'Liez votre logiciel comptable',
                  tags: ['QuickBooks', 'Xero', 'Sage'],
                  color: theme.green,
                  delay: '0s'
                },
                { 
                  num: 2, 
                  icon: RefreshCw, 
                  title: isEn ? 'Clean & Store' : 'Nettoyer',
                  desc: isEn ? 'Canadian data lake' : 'Data lake canadien',
                  tags: [isEn ? 'Sanitized' : 'Assaini', isEn ? 'Validated' : 'Validé'],
                  color: theme.green,
                  delay: '0.1s'
                },
                { 
                  num: 3, 
                  icon: Sparkles, 
                  title: isEn ? 'AI Analysis' : 'Analyse IA',
                  desc: isEn ? 'Industry ML models' : 'Modèles ML sectoriels',
                  tags: ['97%', isEn ? 'Accuracy' : 'Précision'],
                  color: theme.gold,
                  delay: '0.2s'
                },
                { 
                  num: 4, 
                  icon: TrendingUp, 
                  title: isEn ? 'Dashboard' : 'Tableau',
                  desc: isEn ? 'Exec-ready insights' : 'Insights exécutifs',
                  tags: ['KPIs', 'OKRs'],
                  color: theme.gold,
                  delay: '0.3s'
                },
              ].map((step, idx) => (
                <div 
                  key={step.num}
                  className="group relative animate-fade-up opacity-0"
                  style={{ animationDelay: step.delay, animationFillMode: 'forwards' }}
                >
                  {/* Step Card */}
                  <div 
                    className="relative p-5 rounded-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer overflow-hidden h-full"
                    style={{ 
                      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                      border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)'}`,
                    }}
                  >
                    {/* Top accent line */}
                    <div 
                      className="absolute top-0 left-0 right-0 h-1 transition-all duration-300 group-hover:h-1.5"
                      style={{ backgroundColor: step.color }}
                    />
                    
                    {/* Hover glow effect */}
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{ 
                        background: `radial-gradient(circle at center, ${step.color}08 0%, transparent 70%)`
                      }}
                    />
                    
                    {/* Step Number - Large */}
                    <div className="flex items-start justify-between mb-4">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold transition-transform duration-300 group-hover:scale-110"
                        style={{ 
                          backgroundColor: `${step.color}15`,
                          color: step.color
                        }}
                      >
                        {step.num}
                      </div>
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:rotate-12"
                        style={{ 
                          backgroundColor: `${step.color}10`,
                        }}
                      >
                        <step.icon className="w-5 h-5" style={{ color: step.color }} />
                      </div>
                    </div>
                    
                    {/* Title */}
                    <h4 
                      className="text-base font-bold mb-2"
                      style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
                    >
                      {step.title}
                    </h4>
                    
                    {/* Description */}
                    <p 
                      className="text-xs mb-4 leading-relaxed"
                      style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
                    >
                      {step.desc}
                    </p>
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {step.tags.map((tag) => (
                        <span 
                          key={tag}
                          className="text-[10px] px-2.5 py-1 rounded font-medium transition-colors duration-300 group-hover:bg-opacity-100"
                          style={{ 
                            backgroundColor: `${step.color}12`,
                            color: step.color,
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    
                    {/* Animated corner indicator */}
                    <div 
                      className="absolute bottom-0 right-0 w-8 h-8 transition-transform duration-300 group-hover:scale-150 opacity-20"
                      style={{
                        background: `linear-gradient(135deg, transparent 50%, ${step.color} 50%)`
                      }}
                    />
                  </div>
                  
                  {/* Connector Arrow - Desktop only */}
                  {idx < 3 && (
                    <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-6 h-6">
                      <div 
                        className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[8px] animate-pulse"
                        style={{ borderLeftColor: step.color }}
                      />
                    </div>
                  )}
                  
                  {/* Connector Line - Mobile/Tablet */}
                  {idx < 3 && (
                    <div className="lg:hidden flex justify-center my-3">
                      <div 
                        className="w-[2px] h-6 rounded-full"
                        style={{ backgroundColor: `${step.color}50` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Stats Bar */}
          <div 
            className="mt-10 p-4 rounded-lg flex flex-wrap justify-center gap-8 sm:gap-12"
            style={{ 
              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.8)',
              border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.6)'}`,
            }}
          >
            {[
              { label: isEn ? 'Data Sources' : 'Sources', value: '6+', color: theme.green },
              { label: isEn ? 'Processing' : 'Traitement', value: '<5min', color: theme.green },
              { label: isEn ? 'AI Accuracy' : 'Précision IA', value: '97%', color: theme.gold },
              { label: isEn ? 'Industries' : 'Industries', value: '15+', color: theme.gold },
            ].map((stat, idx) => (
              <div 
                key={stat.label} 
                className="text-center animate-fade-up opacity-0"
                style={{ animationDelay: `${0.4 + idx * 0.1}s`, animationFillMode: 'forwards' }}
              >
                <div className="text-xl sm:text-2xl font-bold mb-0.5" style={{ color: stat.color }}>
                  {stat.value}
                </div>
                <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}>
                  {stat.label}
                </div>
              </div>
            ))}
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

      {/* AI & Security Features Section */}
      <section 
        id="integrations" 
        className="py-10 sm:py-14 lg:py-16 px-4 sm:px-6 relative"
        style={{ 
          background: isDark 
            ? 'transparent' 
            : 'linear-gradient(180deg, rgba(248, 250, 252, 0.9) 0%, rgba(255, 255, 255, 0.95) 100%)'
        }}
      >
        <div className="max-w-5xl mx-auto">
          {/* AI & Security Features */}
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {/* AI-Powered Intelligence */}
            <div 
              className="p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl"
              style={{ 
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.95)',
                border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(251, 191, 36, 0.3)'}`,
                boxShadow: isDark ? 'none' : '0 4px 24px rgba(251, 191, 36, 0.08)'
              }}
            >
              <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div 
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ 
                    background: `linear-gradient(135deg, ${theme.gold}25 0%, ${theme.gold}10 100%)`,
                  }}
                >
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: theme.goldDark }} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg lg:text-xl font-semibold mb-0.5 sm:mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? 'AI-Optimized for Your Industry' : 'IA optimisée pour votre industrie'}
                  </h3>
                  <p className="text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {isEn 
                      ? 'Industry-specific models for accurate insights'
                      : 'Modèles spécifiques pour des insights précis'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {[
                  { icon: TrendingUp, en: 'Strategic projections', fr: 'Projections' },
                  { icon: Zap, en: 'Montage financier', fr: 'Montage fin.' },
                  { icon: Eye, en: 'KPIs & OKRs', fr: 'KPIs & OKRs' },
                  { icon: Cpu, en: 'Benchmarks', fr: 'Références' },
                ].map((item) => (
                  <div 
                    key={item.en}
                    className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-md sm:rounded-lg"
                    style={{ 
                      backgroundColor: isDark ? 'rgba(251, 191, 36, 0.08)' : 'rgba(251, 191, 36, 0.06)',
                    }}
                  >
                    <item.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: theme.goldDark }} />
                    <span className="text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      {isEn ? item.en : item.fr}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Security & Compliance */}
            <div 
              className="p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl"
              style={{ 
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.95)',
                border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(16, 185, 129, 0.3)'}`,
                boxShadow: isDark ? 'none' : '0 4px 24px rgba(16, 185, 129, 0.08)'
              }}
            >
              <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div 
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ 
                    background: `linear-gradient(135deg, ${theme.green}25 0%, ${theme.green}10 100%)`,
                  }}
                >
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: theme.green }} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg lg:text-xl font-semibold mb-0.5 sm:mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? 'Enterprise Security' : 'Sécurité Enterprise'}
                  </h3>
                  <p className="text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {isEn 
                      ? 'Bank-level protection for your data'
                      : 'Protection bancaire pour vos données'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {[
                  { icon: Lock, en: 'AES-256', fr: 'AES-256' },
                  { icon: Database, en: 'Canada 🇨🇦', fr: 'Canada 🇨🇦' },
                  { icon: Shield, en: 'RBAC', fr: 'RBAC' },
                  { icon: FileCheck, en: 'Audit trail', fr: 'Audit' },
                ].map((item) => (
                  <div 
                    key={item.en}
                    className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-md sm:rounded-lg"
                    style={{ 
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.06)',
                    }}
                  >
                    <item.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: theme.green }} />
                    <span className="text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      {isEn ? item.en : item.fr}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Supported Integrations Bar */}
          <div className="mt-8 sm:mt-10 lg:mt-12 text-center max-w-2xl mx-auto">
            <p className="text-xs sm:text-sm font-medium mb-3 sm:mb-4 mx-auto" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Seamless integrations with your favorite tools' : 'Intégrations fluides avec vos outils préférés'}
            </p>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {integrations.map((name) => (
                <div 
                  key={name}
                  className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2"
                  style={{ 
                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                    border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(203, 213, 225, 0.6)'}`,
                    color: 'rgb(var(--color-text-secondary))'
                  }}
                >
                  <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" style={{ color: theme.green }} />
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
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
          <h2 
            className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'Simple, transparent pricing' : 'Tarification simple et transparente'}
          </h2>
          <p 
            className="text-sm sm:text-base lg:text-lg mb-8 sm:mb-10 lg:mb-12 max-w-xl mx-auto px-2"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            {isEn 
              ? 'Get a personalized quote based on your business needs.'
              : 'Obtenez une soumission selon vos besoins.'}
          </p>

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
            ].map((tier) => (
              <div 
                key={tier.name}
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
                <button 
                  onClick={handleScheduleCall}
                  className="w-full py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all hover:scale-105"
                  style={{ 
                    background: tier.highlighted 
                      ? `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`
                      : 'transparent',
                    color: tier.highlighted ? 'white' : isDark ? theme.green : theme.greenDark,
                    border: tier.highlighted ? 'none' : `2px solid ${theme.green}`,
                  }}
                >
                  {isEn ? 'Get quote' : 'Soumission'}
                </button>
              </div>
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
            {/* Badge */}
            <div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-6"
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(8px)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              {isEn ? 'Join 500+ Canadian businesses' : 'Rejoignez 500+ entreprises canadiennes'}
            </div>
            
            {/* Heading */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-white leading-tight">
              {isEn ? 'Ready to see your data clearly?' : 'Prêt à voir vos données clairement?'}
            </h2>
            
            {/* Subheading */}
            <p className="text-base sm:text-lg lg:text-xl mb-8 text-white/85 max-w-2xl mx-auto">
              {isEn 
                ? 'Get the financial clarity you need to make confident decisions. Start your free trial today.'
                : 'Obtenez la clarté financière dont vous avez besoin pour prendre des décisions éclairées.'}
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <button 
                onClick={() => register()}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-base transition-all hover:scale-105 hover:shadow-xl"
                style={{ 
                  background: 'white',
                  color: theme.greenDark,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                }}
              >
                {isEn ? 'Start free 21-day trial' : 'Essai gratuit 21 jours'}
                <ArrowRight className="w-5 h-5" />
              </button>
              
              <button 
                onClick={handleScheduleCall}
                className="inline-flex items-center gap-2 px-6 py-4 rounded-xl font-semibold text-base transition-all hover:scale-105"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(8px)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.25)'
                }}
              >
                <Calendar className="w-5 h-5" />
                {isEn ? 'Talk to an expert' : 'Parler à un expert'}
              </button>
            </div>
            
            {/* Trust Badges */}
            <div className="w-full flex justify-center">
              <div className="inline-flex flex-wrap justify-center items-center gap-4 sm:gap-8 text-white/70 text-sm">
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-300" />
                  {isEn ? 'No credit card required' : 'Sans carte de crédit'}
                </span>
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-300" />
                  {isEn ? 'Setup in 5 minutes' : 'Configuration en 5 min'}
                </span>
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-300" />
                  {isEn ? 'Data stays in Canada' : 'Données au Canada'} 🇨🇦
                </span>
              </div>
            </div>
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
            <a href="/privacy" className="transition-colors hover:underline">{isEn ? 'Privacy' : 'Confidentialité'}</a>
            <a href="/terms" className="transition-colors hover:underline">{isEn ? 'Terms' : 'Conditions'}</a>
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
