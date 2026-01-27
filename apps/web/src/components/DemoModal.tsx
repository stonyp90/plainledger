/**
 * Demo Modal Component
 * Interactive showcase of PlainLedger features for the landing page
 * No authentication required - uses static mockup data
 * Fully responsive with rich animations and impressive visualizations
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  BarChart3,
  AlertTriangle,
  FileText,
  Sparkles,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  DollarSign,
  PieChart,
  Zap,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Brain,
  Gauge,
  Activity,
  BarChart2,
  LineChart,
  Eye,
  XCircle,
} from 'lucide-react';

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEn: boolean;
  onStartTrial: () => void;
}

// =====================================================
// DEMO SLIDES DATA
// =====================================================

const DEMO_SLIDES = [
  {
    id: 'dashboard',
    icon: BarChart3,
    title: { en: 'Real-Time Dashboard', fr: 'Tableau de bord temps réel' },
    subtitle: { 
      en: 'Complete financial visibility in one view', 
      fr: 'Visibilité financière complète en une vue' 
    },
    stat: { value: '10x', label: { en: 'Faster insights', fr: 'Plus rapide' } },
  },
  {
    id: 'anomalies',
    icon: Shield,
    title: { en: 'Intelligent Detection', fr: 'Détection intelligente' },
    subtitle: { 
      en: '97% accuracy in fraud & error detection', 
      fr: '97% de précision dans la détection' 
    },
    stat: { value: '$847K', label: { en: 'Saved per client', fr: 'Économisé / client' } },
  },
  {
    id: 'reports',
    icon: FileText,
    title: { en: 'Instant Reports', fr: 'Rapports instantanés' },
    subtitle: { 
      en: 'Professional reports in seconds, not hours', 
      fr: 'Rapports professionnels en secondes' 
    },
    stat: { value: '85%', label: { en: 'Time saved', fr: 'Temps économisé' } },
  },
  {
    id: 'ai',
    icon: Brain,
    title: { en: 'James Financial Assistant', fr: 'Assistant financier James' },
    subtitle: { 
      en: 'Natural language queries for instant answers', 
      fr: 'Questions en langage naturel' 
    },
    stat: { value: '24/7', label: { en: 'Availability', fr: 'Disponibilité' } },
  },
];

// =====================================================
// ANIMATED COUNTER HOOK
// =====================================================

function useAnimatedCounter(target: number, duration: number = 1500, delay: number = 0) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
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
  }, [target, duration, delay]);
  
  return count;
}

// =====================================================
// ANIMATED SPARKLINE COMPONENT
// =====================================================

function AnimatedSparkline({ 
  data, 
  color, 
  showArea = true,
  delay = 300,
  width = 120,
  height = 40 
}: { 
  data: number[]; 
  color: string;
  showArea?: boolean;
  delay?: number;
  width?: number;
  height?: number;
}) {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
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
  }, [data, delay]);
  
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
  
  const visibleLength = linePath.length * progress;
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`sparkline-gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {showArea && (
        <path
          d={areaPath}
          fill={`url(#sparkline-gradient-${color})`}
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
// ANIMATED GAUGE COMPONENT
// =====================================================

function AnimatedGauge({ 
  value, 
  maxValue = 100, 
  size = 120, 
  strokeWidth = 10,
  color = 'rgb(var(--color-success))',
  showLabel = true,
  delay = 400
}: {
  value: number;
  maxValue?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  showLabel?: boolean;
  delay?: number;
}) {
  const [animatedValue, setAnimatedValue] = useState(0);
  
  useEffect(() => {
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
  }, [value, delay]);
  
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
  height = 120,
  showTrend = true,
}: {
  data: { actual: number; budget: number }[];
  labels: string[];
  delay?: number;
  height?: number;
  showTrend?: boolean;
}) {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
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
  }, [delay]);
  
  const maxValue = Math.max(...data.map(d => Math.max(d.actual, d.budget)));
  
  return (
    <div className="w-full">
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((d, i) => {
          const actualHeight = (d.actual / maxValue) * height * progress;
          const budgetHeight = (d.budget / maxValue) * height * progress;
          const isAboveBudget = d.actual > d.budget;
          
          return (
            <div 
              key={i} 
              className="flex-1 flex flex-col items-center gap-0.5"
              style={{ transitionDelay: `${i * 50}ms` }}
            >
              <div className="w-full flex gap-0.5 h-full items-end justify-center">
                <div 
                  className="w-[45%] rounded-t transition-all duration-500"
                  style={{ 
                    height: actualHeight,
                    backgroundColor: isAboveBudget 
                      ? 'rgb(var(--color-primary-500))' 
                      : 'rgb(var(--color-primary-400))',
                    boxShadow: isAboveBudget ? '0 0 8px rgb(var(--color-primary-500) / 0.5)' : 'none',
                  }}
                />
                <div 
                  className="w-[45%] rounded-t transition-all duration-500"
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
            className="text-[8px] sm:text-[9px] font-medium"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {label}
          </span>
        ))}
      </div>
      
      {showTrend && (
        <div className="flex items-center justify-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgb(var(--color-primary-500))' }} />
            <span className="text-[9px]" style={{ color: 'rgb(var(--color-text-muted))' }}>Actual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgb(var(--color-border))' }} />
            <span className="text-[9px]" style={{ color: 'rgb(var(--color-text-muted))' }}>Budget</span>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// FULL DASHBOARD MOCKUP - Most visually impressive
// =====================================================

function FullDashboardMockup({ isEn }: { isEn: boolean }) {
  const [showElements, setShowElements] = useState(false);
  const healthScore = useAnimatedCounter(87, 1500, 400);
  const revenue = useAnimatedCounter(847, 1500, 500);
  const savings = useAnimatedCounter(156, 1500, 600);
  
  const revenueData = [42, 58, 51, 67, 54, 78, 72, 89, 76, 94, 88, 102];
  const chartData = [
    { actual: 65, budget: 60 },
    { actual: 72, budget: 70 },
    { actual: 68, budget: 75 },
    { actual: 85, budget: 80 },
    { actual: 78, budget: 82 },
    { actual: 95, budget: 85 },
    { actual: 88, budget: 88 },
    { actual: 102, budget: 90 },
    { actual: 94, budget: 92 },
    { actual: 110, budget: 95 },
    { actual: 105, budget: 100 },
    { actual: 118, budget: 105 },
  ];
  
  useEffect(() => {
    const timer = setTimeout(() => setShowElements(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full rounded-xl overflow-hidden shadow-2xl border" 
      style={{ backgroundColor: 'rgb(var(--color-bg))', borderColor: 'rgb(var(--color-border))' }}>
      
      {/* Browser Chrome */}
      <div className="h-8 sm:h-10 flex items-center px-3 sm:px-4 gap-2 border-b" 
        style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-3 sm:px-4 py-1 rounded-lg text-[10px] sm:text-xs font-medium" 
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))', color: 'rgb(var(--color-text-muted))' }}>
            app.plainledger.ca/dashboard
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}>
            JD
          </div>
        </div>
      </div>

      {/* App Layout */}
      <div className="flex">
        {/* Sidebar - hidden on mobile */}
        <div className="hidden md:flex flex-col w-14 lg:w-48 border-r py-3 px-2 lg:px-3 gap-1"
          style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}>
          <div className="flex items-center gap-2 px-2 py-2 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ 
                background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-700)) 100%)'
              }}>
              <svg className="w-4 h-4" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="5" width="3" height="22" rx="1" fill="rgba(255,255,255,0.5)"/>
                <rect x="8" y="5" width="20" height="22" rx="2" fill="white"/>
                <line x1="11" y1="10" x2="25" y2="10" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round"/>
                <line x1="11" y1="15" x2="25" y2="15" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round"/>
                <path d="M17 21 L20 24 L26 17" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="hidden lg:block text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              PlainLedger
            </span>
          </div>
          
          {[
            { icon: BarChart3, label: 'Dashboard', active: true },
            { icon: Shield, label: isEn ? 'Anomalies' : 'Anomalies', active: false, badge: '3' },
            { icon: FileText, label: isEn ? 'Reports' : 'Rapports', active: false },
            { icon: Brain, label: isEn ? 'James' : 'James', active: false },
          ].map((item, i) => (
            <div 
              key={i}
              className={`flex items-center gap-2 px-2 py-2 rounded-lg transition-all ${
                item.active ? 'ring-1' : ''
              }`}
              style={{ 
                backgroundColor: item.active ? 'rgb(var(--color-primary-500) / 0.1)' : 'transparent',
                '--tw-ring-color': 'rgb(var(--color-primary-500))',
              } as React.CSSProperties}
            >
              <item.icon className="w-4 h-4" style={{ color: item.active ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))' }} />
              <span className="hidden lg:block text-xs font-medium flex-1" style={{ color: item.active ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-secondary))' }}>
                {item.label}
              </span>
              {item.badge && (
                <span className="hidden lg:flex w-5 h-5 rounded-full items-center justify-center text-[10px] font-bold text-white"
                  style={{ backgroundColor: 'rgb(var(--color-error))' }}>
                  {item.badge}
                </span>
              )}
            </div>
          ))}
        </div>
        
        {/* Main Content */}
        <div className="flex-1 p-3 sm:p-4 lg:p-5 min-h-[300px] sm:min-h-[360px] lg:min-h-[420px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-sm sm:text-base lg:text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Financial Dashboard' : 'Tableau de bord financier'}
              </h1>
              <p className="text-[10px] sm:text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Last updated: Just now' : 'Dernière mise à jour: À l\'instant'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium"
                style={{ backgroundColor: 'rgb(var(--color-primary-500))', color: 'white' }}>
                <Sparkles className="w-3.5 h-3.5" />
                {isEn ? 'Ask AI' : 'Demander IA'}
              </button>
            </div>
          </div>
          
          {/* Main Grid */}
          <div className="grid grid-cols-12 gap-3">
            {/* Health Score */}
            <div className={`col-span-6 sm:col-span-4 lg:col-span-3 p-3 sm:p-4 rounded-xl transition-all duration-700 ${
              showElements ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
              style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Health Score' : 'Score santé'}
                </span>
                <Gauge className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
              </div>
              
              <div className="flex justify-center mb-3">
                <AnimatedGauge 
                  value={87} 
                  size={100} 
                  strokeWidth={8}
                  color="rgb(var(--color-success))"
                  delay={400}
                />
              </div>
              
              <div className="flex justify-center gap-1.5">
                <span className="px-2 py-1 rounded-full text-[8px] sm:text-[9px] font-medium flex items-center gap-1"
                  style={{ backgroundColor: 'rgb(var(--color-error) / 0.1)', color: 'rgb(var(--color-error))' }}>
                  <XCircle className="w-2.5 h-2.5" /> 2
                </span>
                <span className="px-2 py-1 rounded-full text-[8px] sm:text-[9px] font-medium flex items-center gap-1"
                  style={{ backgroundColor: 'rgb(var(--color-warning) / 0.1)', color: 'rgb(var(--color-warning))' }}>
                  <AlertTriangle className="w-2.5 h-2.5" /> 3
                </span>
                <span className="px-2 py-1 rounded-full text-[8px] sm:text-[9px] font-medium flex items-center gap-1"
                  style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)', color: 'rgb(var(--color-success))' }}>
                  <CheckCircle className="w-2.5 h-2.5" /> 5
                </span>
              </div>
            </div>
            
            {/* KPI Cards */}
            <div className="col-span-6 sm:col-span-8 lg:col-span-9 grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { 
                  label: isEn ? 'Revenue MTD' : 'Revenus MTD', 
                  value: `$${revenue.toLocaleString()}`, 
                  change: '+12.4%', 
                  up: true,
                  sparkData: revenueData,
                  color: 'rgb(var(--color-primary-500))'
                },
                { 
                  label: isEn ? 'Cash Position' : 'Trésorerie', 
                  value: '$234,500', 
                  change: '+8.2%', 
                  up: true,
                  sparkData: [35, 42, 38, 45, 52, 48, 55, 60, 58, 65, 62, 68],
                  color: 'rgb(var(--color-success))'
                },
                { 
                  label: isEn ? 'Working Capital' : 'Fonds de roul.', 
                  value: `$${savings.toLocaleString()}`, 
                  change: '+5.6%', 
                  up: true,
                  sparkData: [45, 48, 52, 55, 50, 58, 62, 60, 65, 70, 68, 75],
                  color: 'rgb(var(--color-info))'
                },
                { 
                  label: isEn ? 'Net Margin' : 'Marge nette', 
                  value: '18.5%', 
                  change: '-2.1%', 
                  up: false,
                  sparkData: [22, 20, 21, 19, 20, 18, 19, 18, 17, 18, 19, 18.5],
                  color: 'rgb(var(--color-warning))'
                },
              ].map((kpi, i) => (
                <div 
                  key={i} 
                  className={`p-3 rounded-xl transition-all duration-700 ${
                    showElements ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{ 
                    backgroundColor: 'rgb(var(--color-surface))',
                    border: '1px solid rgb(var(--color-border))',
                    transitionDelay: `${i * 100 + 200}ms`
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[8px] sm:text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {kpi.label}
                    </span>
                    <div className={`flex items-center gap-0.5 text-[9px] font-bold ${kpi.up ? 'text-success' : 'text-error'}`}>
                      {kpi.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {kpi.change}
                    </div>
                  </div>
                  
                  <div className="text-base sm:text-lg lg:text-xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                    {kpi.value}
                  </div>
                  
                  <AnimatedSparkline 
                    data={kpi.sparkData} 
                    color={kpi.color}
                    delay={300 + i * 100}
                    width={100}
                    height={28}
                  />
                </div>
              ))}
            </div>
            
            {/* Revenue Chart */}
            <div className={`col-span-12 lg:col-span-8 p-4 rounded-xl transition-all duration-700 ${
              showElements ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))',
                border: '1px solid rgb(var(--color-border))',
                transitionDelay: '500ms'
              }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? 'Revenue vs Budget' : 'Revenus vs Budget'}
                  </h3>
                  <p className="text-[9px] sm:text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'Trailing 12 months performance' : 'Performance sur 12 mois'}
                  </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-medium"
                  style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)', color: 'rgb(var(--color-success))' }}>
                  <TrendingUp className="w-3.5 h-3.5" />
                  +18% YoY
                </div>
              </div>
              
              <AnimatedBarChart
                data={chartData}
                labels={['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']}
                delay={600}
                height={100}
              />
            </div>
            
            {/* Key Ratios */}
            <div className={`col-span-12 lg:col-span-4 p-4 rounded-xl transition-all duration-700 ${
              showElements ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))',
                border: '1px solid rgb(var(--color-border))',
                transitionDelay: '600ms'
              }}>
              <h3 className="text-xs sm:text-sm font-semibold mb-3" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Key Financial Ratios' : 'Ratios clés'}
              </h3>
              
              <div className="space-y-3">
                {[
                  { label: isEn ? 'Current Ratio' : 'Ratio courant', value: '2.4x', target: '2.0x', percent: 85, good: true },
                  { label: isEn ? 'Quick Ratio' : 'Ratio rapide', value: '1.8x', target: '1.5x', percent: 92, good: true },
                  { label: isEn ? 'Debt/Equity' : 'Dette/Capitaux', value: '0.6x', target: '1.0x', percent: 70, good: true },
                  { label: 'DSO', value: '38d', target: '45d', percent: 78, good: true },
                ].map((ratio, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] sm:text-[10px]" style={{ color: 'rgb(var(--color-text-secondary))' }}>{ratio.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] sm:text-xs font-bold" style={{ color: 'rgb(var(--color-text))' }}>{ratio.value}</span>
                        <CheckCircle className="w-3.5 h-3.5 text-success" />
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${showElements ? '' : 'w-0'}`}
                        style={{ 
                          width: showElements ? `${ratio.percent}%` : '0%',
                          backgroundColor: 'rgb(var(--color-success))',
                          transitionDelay: `${i * 100 + 800}ms`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// ANOMALY DETECTION MOCKUP
// =====================================================

function AnomalyMockup({ isEn }: { isEn: boolean }) {
  const [showElements, setShowElements] = useState(false);
  const [visibleAlerts, setVisibleAlerts] = useState(0);
  const savedAmount = useAnimatedCounter(847, 2000, 400);
  const accuracy = useAnimatedCounter(97, 1500, 500);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowElements(true);
      
      const alertTimer = setInterval(() => {
        setVisibleAlerts(prev => prev < 4 ? prev + 1 : prev);
      }, 400);
      
      return () => clearInterval(alertTimer);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const alerts = [
    { 
      severity: 'critical', 
      title: isEn ? 'Duplicate Payment Detected' : 'Paiement en double détecté',
      desc: isEn ? 'Invoice #4521 paid twice - AI flagged' : 'Facture #4521 payée deux fois - signalé par IA',
      amount: '$12,450',
      confidence: 99,
    },
    { 
      severity: 'critical', 
      title: isEn ? 'Fraudulent Transaction Pattern' : 'Pattern de transaction frauduleuse',
      desc: isEn ? 'Unusual vendor payment sequence' : 'Séquence de paiement fournisseur inhabituelle',
      amount: '$45,230',
      confidence: 96,
    },
    { 
      severity: 'warning', 
      title: isEn ? 'Expense Spike Anomaly' : 'Anomalie de pic de dépenses',
      desc: isEn ? 'Marketing 340% above historical avg' : 'Marketing 340% au-dessus de la moy. historique',
      amount: '$28,500',
      confidence: 94,
    },
    { 
      severity: 'warning', 
      title: isEn ? 'Revenue Recognition Issue' : 'Problème de constatation des revenus',
      desc: isEn ? 'Timing variance detected in Q4' : 'Variance temporelle détectée au Q4',
      amount: '$67,000',
      confidence: 91,
    },
  ];

  return (
    <div className="relative w-full rounded-xl overflow-hidden shadow-2xl border" 
      style={{ backgroundColor: 'rgb(var(--color-bg))', borderColor: 'rgb(var(--color-border))' }}>
      
      {/* Browser Chrome */}
      <div className="h-8 sm:h-10 flex items-center px-3 sm:px-4 gap-2 border-b" 
        style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-3 sm:px-4 py-1 rounded-lg text-[10px] sm:text-xs font-medium" 
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))', color: 'rgb(var(--color-text-muted))' }}>
            app.plainledger.ca/anomalies
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 sm:p-5 lg:p-6 min-h-[300px] sm:min-h-[360px] lg:min-h-[420px]">
        {/* Header Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className={`p-3 sm:p-4 rounded-xl text-center transition-all duration-700 ${
            showElements ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
            style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)', border: '1px solid rgb(var(--color-success) / 0.2)' }}>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-success mb-1">
              ${Math.floor(savedAmount / 1000)}K
            </div>
            <div className="text-[9px] sm:text-[10px] font-medium" style={{ color: 'rgb(var(--color-success))' }}>
              {isEn ? 'Saved YTD' : 'Économisé YTD'}
            </div>
          </div>
          
          <div className={`p-3 sm:p-4 rounded-xl text-center transition-all duration-700 ${
            showElements ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
            style={{ 
              backgroundColor: 'rgb(var(--color-primary-500) / 0.1)', 
              border: '1px solid rgb(var(--color-primary-500) / 0.2)',
              transitionDelay: '100ms'
            }}>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1" style={{ color: 'rgb(var(--color-primary-600))' }}>
              {accuracy}%
            </div>
            <div className="text-[9px] sm:text-[10px] font-medium" style={{ color: 'rgb(var(--color-primary-600))' }}>
              {isEn ? 'AI Accuracy' : 'Précision IA'}
            </div>
          </div>
          
          <div className={`p-3 sm:p-4 rounded-xl text-center transition-all duration-700 ${
            showElements ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
            style={{ 
              backgroundColor: 'rgb(var(--color-warning) / 0.1)', 
              border: '1px solid rgb(var(--color-warning) / 0.2)',
              transitionDelay: '200ms'
            }}>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-warning mb-1">
              4
            </div>
            <div className="text-[9px] sm:text-[10px] font-medium text-warning">
              {isEn ? 'Issues Found' : 'Problèmes trouvés'}
            </div>
          </div>
        </div>
        
        {/* AI Analysis Banner */}
        <div className={`flex items-center gap-3 p-3 rounded-xl mb-4 transition-all duration-700 ${
          showElements ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
          style={{ 
            backgroundColor: 'rgb(var(--color-primary-500) / 0.05)', 
            border: '1px solid rgb(var(--color-primary-500) / 0.1)',
            transitionDelay: '300ms'
          }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}>
            <Brain className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'AI Analysis Complete' : 'Analyse IA terminée'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[8px] font-medium animate-pulse"
                style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)', color: 'rgb(var(--color-success))' }}>
                {isEn ? 'Real-time' : 'Temps réel'}
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? '12 algorithms • 847 transactions scanned' : '12 algorithmes • 847 transactions analysées'}
            </p>
          </div>
        </div>
        
        {/* Alerts List */}
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div 
              key={i}
              className={`p-3 sm:p-4 rounded-xl flex items-start gap-3 transition-all duration-500 ${
                i < visibleAlerts ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
              }`}
              style={{ 
                backgroundColor: alert.severity === 'critical' 
                  ? 'rgb(var(--color-error) / 0.08)' 
                  : 'rgb(var(--color-warning) / 0.08)',
                border: `1px solid ${
                  alert.severity === 'critical' 
                    ? 'rgb(var(--color-error) / 0.2)' 
                    : 'rgb(var(--color-warning) / 0.2)'
                }`
              }}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                alert.severity === 'critical' ? 'bg-error/20' : 'bg-warning/20'
              }`}>
                <Shield className={`w-5 h-5 ${
                  alert.severity === 'critical' ? 'text-error' : 'text-warning'
                }`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-[11px] sm:text-xs font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    {alert.title}
                  </p>
                  <span className="text-[11px] sm:text-xs font-bold flex-shrink-0" style={{ color: 'rgb(var(--color-text))' }}>
                    {alert.amount}
                  </span>
                </div>
                <p className="text-[9px] sm:text-[10px] mb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {alert.desc}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] sm:text-[9px] px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgb(var(--color-bg-muted))', color: 'rgb(var(--color-text-muted))' }}>
                    <Zap className="w-2.5 h-2.5 inline mr-1" />
                    {alert.confidence}% {isEn ? 'confidence' : 'confiance'}
                  </span>
                </div>
              </div>
              
              <button className="px-3 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-medium flex-shrink-0"
                style={{ backgroundColor: 'rgb(var(--color-surface))', color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Review' : 'Examiner'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// FINANCIAL REPORTS MOCKUP
// =====================================================

function ReportsMockup({ isEn }: { isEn: boolean }) {
  const [showElements, setShowElements] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowElements(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const reportData = [
    { label: isEn ? 'Cash & Equivalents' : 'Trésorerie', current: 234500, prior: 198200, change: 18.3 },
    { label: isEn ? 'Accounts Receivable' : 'Comptes clients', current: 156200, prior: 142800, change: 9.4 },
    { label: isEn ? 'Inventory' : 'Stocks', current: 89300, prior: 78500, change: 13.8 },
    { label: isEn ? 'Fixed Assets' : 'Immobilisations', current: 765000, prior: 683000, change: 12.0 },
  ];

  return (
    <div className="relative w-full rounded-xl overflow-hidden shadow-2xl border" 
      style={{ backgroundColor: 'rgb(var(--color-bg))', borderColor: 'rgb(var(--color-border))' }}>
      
      {/* Browser Chrome */}
      <div className="h-8 sm:h-10 flex items-center px-3 sm:px-4 gap-2 border-b" 
        style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-3 sm:px-4 py-1 rounded-lg text-[10px] sm:text-xs font-medium" 
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))', color: 'rgb(var(--color-text-muted))' }}>
            app.plainledger.ca/reports
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 sm:p-5 lg:p-6 min-h-[300px] sm:min-h-[360px] lg:min-h-[420px]">
        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { label: isEn ? 'Reports Generated' : 'Rapports générés', value: '847', icon: FileText },
            { label: isEn ? 'Avg. Generation Time' : 'Temps moy.', value: '2.3s', icon: Clock },
            { label: isEn ? 'Time Saved' : 'Temps économisé', value: '85%', icon: TrendingUp },
            { label: isEn ? 'Export Formats' : 'Formats export', value: '12+', icon: Activity },
          ].map((stat, i) => (
            <div 
              key={i}
              className={`p-2 sm:p-3 rounded-xl text-center transition-all duration-700 ${
                showElements ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))', 
                border: '1px solid rgb(var(--color-border))',
                transitionDelay: `${i * 100}ms`
              }}
            >
              <stat.icon className="w-4 h-4 mx-auto mb-1" style={{ color: 'rgb(var(--color-primary-500))' }} />
              <div className="text-sm sm:text-base lg:text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                {stat.value}
              </div>
              <div className="text-[8px] sm:text-[9px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
        
        {/* Report Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {[
            { icon: FileText, label: isEn ? 'Balance Sheet' : 'Bilan' },
            { icon: PieChart, label: isEn ? 'Income Statement' : 'Compte de résultat' },
            { icon: DollarSign, label: isEn ? 'Cash Flow' : 'Flux de trésorerie' },
          ].map((tab, i) => (
            <button 
              key={i}
              onClick={() => setActiveTab(i)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] sm:text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === i ? 'ring-1' : ''
              }`}
              style={{ 
                backgroundColor: activeTab === i ? 'rgb(var(--color-primary-500) / 0.1)' : 'rgb(var(--color-bg-muted))',
                color: activeTab === i ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-muted))',
                '--tw-ring-color': 'rgb(var(--color-primary-500))',
              } as React.CSSProperties}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Report Preview */}
        <div className={`rounded-xl overflow-hidden border transition-all duration-700 ${
          showElements ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
          style={{ 
            borderColor: 'rgb(var(--color-border))',
            transitionDelay: '400ms'
          }}>
          <div className="p-3 sm:p-4 border-b flex items-center justify-between"
            style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}>
            <div>
              <h3 className="text-xs sm:text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Balance Sheet' : 'Bilan'}
              </h3>
              <p className="text-[9px] sm:text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'As of December 31, 2025' : 'Au 31 décembre 2025'}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-medium"
                style={{ backgroundColor: 'rgb(var(--color-bg-muted))', color: 'rgb(var(--color-text-secondary))' }}>
                PDF
              </button>
              <button className="px-3 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-medium"
                style={{ backgroundColor: 'rgb(var(--color-primary-500))', color: 'white' }}>
                {isEn ? 'Export' : 'Exporter'}
              </button>
            </div>
          </div>
          
          <div className="divide-y" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <div className="grid grid-cols-4 text-[9px] sm:text-[10px] font-semibold p-3"
              style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
              <span style={{ color: 'rgb(var(--color-text))' }}>{isEn ? 'Account' : 'Compte'}</span>
              <span className="text-right" style={{ color: 'rgb(var(--color-text))' }}>{isEn ? 'Current' : 'Actuel'}</span>
              <span className="text-right" style={{ color: 'rgb(var(--color-text))' }}>{isEn ? 'Prior' : 'Précédent'}</span>
              <span className="text-right" style={{ color: 'rgb(var(--color-text))' }}>{isEn ? 'Change' : 'Variation'}</span>
            </div>
            
            <div className="grid grid-cols-4 text-[10px] sm:text-xs p-3 font-bold"
              style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
              <span style={{ color: 'rgb(var(--color-text))' }}>{isEn ? 'TOTAL ASSETS' : 'TOTAL ACTIFS'}</span>
              <span className="text-right" style={{ color: 'rgb(var(--color-text))' }}>$1,245,000</span>
              <span className="text-right" style={{ color: 'rgb(var(--color-text-muted))' }}>$1,102,500</span>
              <span className="text-right text-success">+12.9%</span>
            </div>
            
            {reportData.map((row, i) => (
              <div 
                key={i} 
                className={`grid grid-cols-4 text-[9px] sm:text-[10px] p-3 pl-5 transition-all duration-500 ${
                  showElements ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ 
                  backgroundColor: 'rgb(var(--color-surface))',
                  transitionDelay: `${i * 100 + 500}ms`
                }}
              >
                <span style={{ color: 'rgb(var(--color-text-secondary))' }}>{row.label}</span>
                <span className="text-right font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                  ${row.current.toLocaleString()}
                </span>
                <span className="text-right" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  ${row.prior.toLocaleString()}
                </span>
                <span className={`text-right font-medium ${row.change >= 0 ? 'text-success' : 'text-error'}`}>
                  {row.change >= 0 ? '+' : ''}{row.change}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// AI ASSISTANT MOCKUP
// =====================================================

function AIMockup({ isEn }: { isEn: boolean }) {
  const [typedText, setTypedText] = useState('');
  const [showResponse, setShowResponse] = useState(false);
  const [showChart, setShowChart] = useState(false);
  
  const question = isEn 
    ? 'Show me our top expenses vs budget and highlight any issues' 
    : 'Montre-moi nos principales dépenses vs budget et signale les problèmes';
  
  useEffect(() => {
    setTypedText('');
    setShowResponse(false);
    setShowChart(false);
    
    let i = 0;
    const timer = setTimeout(() => {
      const typeInterval = setInterval(() => {
        if (i <= question.length) {
          setTypedText(question.slice(0, i));
          i++;
        } else {
          clearInterval(typeInterval);
          setTimeout(() => {
            setShowResponse(true);
            setTimeout(() => setShowChart(true), 500);
          }, 400);
        }
      }, 35);
      return () => clearInterval(typeInterval);
    }, 400);
    return () => clearTimeout(timer);
  }, [question]);

  const expenseData = [
    { category: isEn ? 'Payroll' : 'Salaires', actual: 124500, budget: 120000, status: 'warning' },
    { category: 'Marketing', actual: 45200, budget: 35000, status: 'critical' },
    { category: isEn ? 'Rent' : 'Loyer', actual: 36000, budget: 36000, status: 'ok' },
    { category: isEn ? 'Software' : 'Logiciels', actual: 18500, budget: 20000, status: 'ok' },
  ];

  return (
    <div className="relative w-full rounded-xl overflow-hidden shadow-2xl border" 
      style={{ backgroundColor: 'rgb(var(--color-bg))', borderColor: 'rgb(var(--color-border))' }}>
      
      {/* Browser Chrome */}
      <div className="h-8 sm:h-10 flex items-center px-3 sm:px-4 gap-2 border-b" 
        style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-3 sm:px-4 py-1 rounded-lg text-[10px] sm:text-xs font-medium" 
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))', color: 'rgb(var(--color-text-muted))' }}>
            app.plainledger.ca/ai-assistant
          </div>
        </div>
      </div>
      
      {/* AI Chat Interface */}
      <div className="p-4 sm:p-5 lg:p-6 min-h-[300px] sm:min-h-[360px] lg:min-h-[420px] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 pb-4 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center relative"
            style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}>
            <Brain className="w-6 h-6" style={{ color: 'rgb(var(--color-primary-500))' }} />
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-success animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'PlainLedger AI' : 'IA PlainLedger'}
            </h2>
            <p className="text-[10px] sm:text-xs flex items-center gap-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              <Sparkles className="w-3 h-3" />
              {isEn ? 'Powered by GPT-4 • Trained on your data' : 'Propulsé par GPT-4 • Entraîné sur vos données'}
            </p>
          </div>
        </div>
        
        {/* Chat Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto">
          {/* User Message */}
          <div className="flex justify-end">
            <div className="max-w-[85%] sm:max-w-[75%] p-3 sm:p-4 rounded-2xl rounded-tr-md text-[11px] sm:text-xs"
              style={{ backgroundColor: 'rgb(var(--color-primary-500))', color: 'white' }}>
              {typedText}
              {typedText.length < question.length && <span className="animate-pulse">|</span>}
            </div>
          </div>
          
          {/* AI Response */}
          {showResponse && (
            <div className="flex justify-start animate-fade-in">
              <div className="max-w-[95%] sm:max-w-[85%] p-4 rounded-2xl rounded-tl-md"
                style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))' }}>
                <p className="text-[11px] sm:text-xs mb-4" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn 
                    ? 'I\'ve analyzed your Q4 expenses. Here\'s what I found:' 
                    : 'J\'ai analysé vos dépenses Q4. Voici ce que j\'ai trouvé:'}
                </p>
                
                {/* Visual Chart */}
                {showChart && (
                  <div className="mb-4 p-3 rounded-xl" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
                    <div className="space-y-3">
                      {expenseData.map((expense, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
                            <span style={{ color: 'rgb(var(--color-text-secondary))' }}>{expense.category}</span>
                            <div className="flex items-center gap-2">
                              <span style={{ color: 'rgb(var(--color-text))' }}>${expense.actual.toLocaleString()}</span>
                              {expense.status === 'critical' && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-medium bg-error/10 text-error">
                                  +{Math.round((expense.actual - expense.budget) / expense.budget * 100)}%
                                </span>
                              )}
                              {expense.status === 'warning' && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-medium bg-warning/10 text-warning">
                                  +{Math.round((expense.actual - expense.budget) / expense.budget * 100)}%
                                </span>
                              )}
                              {expense.status === 'ok' && (
                                <CheckCircle className="w-3 h-3 text-success" />
                              )}
                            </div>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgb(var(--color-border))' }}>
                            <div 
                              className="h-full rounded-full transition-all duration-1000"
                              style={{ 
                                width: `${(expense.actual / expense.budget) * 80}%`,
                                backgroundColor: expense.status === 'critical' 
                                  ? 'rgb(var(--color-error))' 
                                  : expense.status === 'warning'
                                  ? 'rgb(var(--color-warning))'
                                  : 'rgb(var(--color-success))',
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* AI Insight */}
                <div className="p-3 rounded-xl flex items-start gap-2"
                  style={{ backgroundColor: 'rgb(var(--color-error) / 0.08)', border: '1px solid rgb(var(--color-error) / 0.2)' }}>
                  <AlertTriangle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] sm:text-[11px] font-semibold text-error mb-1">
                      {isEn ? 'Critical: Marketing over budget by 29%' : 'Critique: Marketing dépasse le budget de 29%'}
                    </p>
                    <p className="text-[9px] sm:text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn 
                        ? 'This exceeds your alert threshold. I recommend reviewing campaign ROI before next quarter.'
                        : 'Cela dépasse votre seuil d\'alerte. Je recommande de revoir le ROI des campagnes avant le prochain trimestre.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Input */}
        <div className="mt-4 flex items-center gap-2 p-2 rounded-xl" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
          <input 
            type="text" 
            placeholder={isEn ? 'Ask anything about your finances...' : 'Posez une question sur vos finances...'}
            className="flex-1 bg-transparent text-[11px] sm:text-xs outline-none px-2"
            style={{ color: 'rgb(var(--color-text))' }}
            disabled
          />
          <button className="p-2 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}>
            <ArrowRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// MAIN DEMO MODAL COMPONENT
// =====================================================

export default function DemoModal({ isOpen, onClose, isEn, onStartTrial }: DemoModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  
  // Auto-advance slides
  useEffect(() => {
    if (!isOpen || !isAutoPlaying) return;
    
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % DEMO_SLIDES.length);
    }, 10000);
    
    return () => clearInterval(timer);
  }, [isOpen, isAutoPlaying]);
  
  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
      setIsAutoPlaying(true);
    }
  }, [isOpen]);
  
  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
  }, []);
  
  const goNext = useCallback(() => {
    setCurrentSlide(prev => (prev + 1) % DEMO_SLIDES.length);
    setIsAutoPlaying(false);
  }, []);
  
  const goPrev = useCallback(() => {
    setCurrentSlide(prev => (prev - 1 + DEMO_SLIDES.length) % DEMO_SLIDES.length);
    setIsAutoPlaying(false);
  }, []);
  
  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, goNext, goPrev]);
  
  if (!isOpen) return null;
  
  const slide = DEMO_SLIDES[currentSlide];
  const SlideIcon = slide.icon;
  
  const renderMockup = () => {
    switch (slide.id) {
      case 'dashboard': return <FullDashboardMockup isEn={isEn} />;
      case 'anomalies': return <AnomalyMockup isEn={isEn} />;
      case 'reports': return <ReportsMockup isEn={isEn} />;
      case 'ai': return <AIMockup isEn={isEn} />;
      default: return <FullDashboardMockup isEn={isEn} />;
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-6xl max-h-[95vh] overflow-y-auto rounded-xl sm:rounded-2xl shadow-2xl"
        style={{ backgroundColor: 'rgb(var(--color-surface))' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 p-1.5 sm:p-2 rounded-full transition-colors hover:bg-black/10"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        
        {/* Content */}
        <div className="p-3 sm:p-5 lg:p-6">
          {/* Header with stat highlight */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
              >
                <SlideIcon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: 'rgb(var(--color-primary-500))' }} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base lg:text-xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? slide.title.en : slide.title.fr}
                </h3>
                <p className="text-[10px] sm:text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? slide.subtitle.en : slide.subtitle.fr}
                </p>
              </div>
            </div>
            
            {/* Highlighted stat */}
            <div className="hidden sm:flex flex-col items-end">
              <div className="text-2xl lg:text-3xl font-bold" style={{ color: 'rgb(var(--color-primary-500))' }}>
                {slide.stat.value}
              </div>
              <div className="text-[10px] sm:text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? slide.stat.label.en : slide.stat.label.fr}
              </div>
            </div>
          </div>
          
          {/* Navigation Pills */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
            {DEMO_SLIDES.map((s, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] sm:text-xs font-medium whitespace-nowrap transition-all ${
                  i === currentSlide ? 'ring-1' : ''
                }`}
                style={{ 
                  backgroundColor: i === currentSlide ? 'rgb(var(--color-primary-500) / 0.1)' : 'rgb(var(--color-bg-muted))',
                  color: i === currentSlide ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-muted))',
                  '--tw-ring-color': 'rgb(var(--color-primary-500))',
                } as React.CSSProperties}
              >
                <s.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isEn ? s.title.en : s.title.fr}</span>
              </button>
            ))}
          </div>
          
          {/* Mockup Display */}
          <div className="mb-4" key={currentSlide}>
            {renderMockup()}
          </div>
          
          {/* Bottom Controls */}
          <div className="flex items-center justify-between gap-4">
            {/* Left: Nav arrows */}
            <div className="flex items-center gap-2">
              <button
                onClick={goPrev}
                className="p-2 rounded-lg transition-colors hover:bg-black/5"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              {/* Progress dots */}
              <div className="flex items-center gap-1.5">
                {DEMO_SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToSlide(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === currentSlide ? 'w-6' : 'w-1.5'
                    }`}
                    style={{ 
                      backgroundColor: i === currentSlide 
                        ? 'rgb(var(--color-primary-500))' 
                        : 'rgb(var(--color-border))'
                    }}
                  />
                ))}
              </div>
              
              <button
                onClick={goNext}
                className="p-2 rounded-lg transition-colors hover:bg-black/5"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className="hidden sm:flex p-2 rounded-full transition-colors"
                style={{ 
                  backgroundColor: isAutoPlaying ? 'rgb(var(--color-primary-500) / 0.1)' : 'transparent',
                  color: isAutoPlaying ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))'
                }}
              >
                {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            </div>
            
            {/* Right: CTA */}
            <button
              onClick={onStartTrial}
              className="btn-primary text-xs sm:text-sm px-4 sm:px-6 py-2.5 group"
            >
              {isEn ? 'Start free trial' : 'Essai gratuit'}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { DemoModal };
