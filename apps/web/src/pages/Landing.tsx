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
  Play,
  Menu,
  X,
  Lock,
  Database,
  Calculator,
  Info,
  Clock,
  Sparkles,
  Cpu,
  FileCheck,
  Layers,
  Zap,
  TrendingUp,
  Eye,
  RefreshCw,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  AlertTriangle,
  Gauge,
  Brain,
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
// HERO DASHBOARD PREVIEW COMPONENT
// =====================================================

function HeroDashboardPreview({ isDark, theme, isEn, isVisible }: { isDark: boolean; theme: typeof colors.light; isEn: boolean; isVisible: boolean }) {
  const revenue = useAnimatedCounter(847, 1500, 400, isVisible);
  const savings = useAnimatedCounter(156, 1500, 600, isVisible);
  const [showElements, setShowElements] = useState(false);
  
  const revenueData = [42, 58, 51, 67, 54, 78, 72, 89, 76, 94, 88, 102];
  
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setShowElements(true), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  return (
    <div 
      className="relative w-full max-w-2xl mx-auto rounded-xl overflow-hidden shadow-2xl"
      style={{ 
        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.98)',
        border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(16, 185, 129, 0.2)'}`,
      }}
    >
      {/* Browser Chrome */}
      <div 
        className="h-8 sm:h-10 flex items-center px-3 sm:px-4 gap-2 border-b"
        style={{ 
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(248, 250, 252, 0.9)',
          borderColor: isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.6)'
        }}
      >
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 flex justify-center">
          <div 
            className="px-3 sm:px-4 py-1 rounded-lg text-[10px] sm:text-xs font-medium"
            style={{ 
              backgroundColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(241, 245, 249, 0.9)',
              color: 'rgb(var(--color-text-muted))'
            }}
          >
            app.plainledger.ca/dashboard
          </div>
        </div>
      </div>
      
      {/* Dashboard Content */}
      <div className="p-4 sm:p-6">
        {/* KPI Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { 
              label: isEn ? 'Revenue MTD' : 'Revenus MTD', 
              value: `$${revenue.toLocaleString()}K`, 
              change: '+12.4%', 
              up: true,
              sparkData: revenueData,
              color: theme.green
            },
            { 
              label: isEn ? 'Cash Position' : 'Trésorerie', 
              value: '$234K', 
              change: '+8.2%', 
              up: true,
              sparkData: [35, 42, 38, 45, 52, 48, 55, 60, 58, 65, 62, 68],
              color: theme.green
            },
            { 
              label: isEn ? 'Working Cap.' : 'Fonds roul.', 
              value: `$${savings.toLocaleString()}K`, 
              change: '+5.6%', 
              up: true,
              sparkData: [45, 48, 52, 55, 50, 58, 62, 60, 65, 70, 68, 75],
              color: theme.gold
            },
            { 
              label: isEn ? 'Net Margin' : 'Marge nette', 
              value: '18.5%', 
              change: '-2.1%', 
              up: false,
              sparkData: [22, 20, 21, 19, 20, 18, 19, 18, 17, 18, 19, 18.5],
              color: theme.gold
            },
          ].map((kpi, i) => (
            <div 
              key={i} 
              className={`p-3 rounded-xl transition-all duration-700 ${
                showElements ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ 
                backgroundColor: isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(248, 250, 252, 0.9)',
                border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(203, 213, 225, 0.5)'}`,
                transitionDelay: `${i * 100 + 200}ms`
              }}
            >
              <div className="flex items-start justify-between mb-1">
                <span className="text-[8px] sm:text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {kpi.label}
                </span>
                <div className={`flex items-center gap-0.5 text-[9px] font-bold`} style={{ color: kpi.up ? theme.green : '#ef4444' }}>
                  {kpi.up ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                  {kpi.change}
                </div>
              </div>
              
              <div className="text-sm sm:text-base lg:text-lg font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                {kpi.value}
              </div>
              
              <AnimatedSparkline 
                data={kpi.sparkData} 
                color={kpi.color}
                delay={300 + i * 100}
                width={80}
                height={24}
                trigger={isVisible}
              />
            </div>
          ))}
        </div>
        
        {/* Bottom Row - Health Score + Alert */}
        <div className="grid grid-cols-2 gap-3">
          {/* Health Score */}
          <div 
            className={`p-4 rounded-xl text-center transition-all duration-700 ${
              showElements ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ 
              backgroundColor: isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(248, 250, 252, 0.9)',
              border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(203, 213, 225, 0.5)'}`,
              transitionDelay: '600ms'
            }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Gauge className="w-4 h-4" style={{ color: theme.green }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Health Score' : 'Score santé'}
              </span>
            </div>
            <div className="flex justify-center">
              <AnimatedGauge 
                value={87} 
                size={80} 
                strokeWidth={6}
                color={theme.green}
                delay={700}
                trigger={isVisible}
              />
            </div>
          </div>
          
          {/* AI Alert */}
          <div 
            className={`p-4 rounded-xl transition-all duration-700 ${
              showElements ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ 
              backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(254, 243, 199, 0.6)',
              border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(251, 191, 36, 0.4)'}`,
              transitionDelay: '700ms'
            }}
          >
            <div className="flex items-start gap-2">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${theme.gold}20` }}
              >
                <Brain className="w-4 h-4" style={{ color: theme.goldDark }} />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-semibold mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'AI Alert' : 'Alerte IA'}
                </p>
                <p className="text-[9px] sm:text-[10px]" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Marketing expense 29% over budget' : 'Marketing dépasse le budget de 29%'}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <span 
                    className="text-[8px] px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: `${theme.gold}20`, color: theme.goldDark }}
                  >
                    97% {isEn ? 'confidence' : 'confiance'}
                  </span>
                </div>
              </div>
            </div>
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

// ROI Calculator Section Component
function ROICalculatorSection({ 
  isEn, 
  isDark, 
  theme, 
  onScheduleCall 
}: { 
  isEn: boolean; 
  isDark: boolean; 
  theme: typeof colors.light; 
  onScheduleCall: () => void;
}) {
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(500000);
  const [transactionVolume, setTransactionVolume] = useState<number>(1000);
  const { ref: sectionRef, isInView } = useInView();
  
  // ROI calculations based on industry averages
  const estimatedSavings = useMemo(() => {
    const anomalyRate = 0.02; // 2% error rate industry average
    const detectionAccuracy = 0.97; // Our 97% detection rate
    const avgErrorValue = monthlyRevenue * 0.005; // 0.5% of revenue per error
    const errorsPerMonth = Math.floor(transactionVolume * anomalyRate);
    const detectedErrors = Math.floor(errorsPerMonth * detectionAccuracy);
    const monthlySavings = detectedErrors * avgErrorValue;
    const yearlySavings = monthlySavings * 12;
    const timeSavedHours = Math.floor(transactionVolume * 0.02); // 2 min per 100 transactions
    
    return {
      monthlySavings,
      yearlySavings,
      detectedErrors,
      timeSavedHours,
    };
  }, [monthlyRevenue, transactionVolume]);
  
  // Animated counters for stats
  const animatedYearlySavings = useAnimatedCounter(Math.floor(estimatedSavings.yearlySavings), 1500, 300, isInView);
  const animatedMonthlySavings = useAnimatedCounter(Math.floor(estimatedSavings.monthlySavings), 1200, 400, isInView);
  const animatedErrors = useAnimatedCounter(estimatedSavings.detectedErrors, 1000, 500, isInView);
  const animatedHours = useAnimatedCounter(estimatedSavings.timeSavedHours, 1000, 600, isInView);

  return (
    <section 
      ref={sectionRef}
      id="roi" 
      className="py-16 sm:py-20 px-6 relative"
      style={{ 
        background: isDark 
          ? 'rgba(15, 23, 42, 0.5)' 
          : 'linear-gradient(180deg, rgba(240, 253, 244, 0.6) 0%, rgba(254, 252, 232, 0.4) 50%, rgba(255, 255, 255, 0.8) 100%)'
      }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
            style={{ 
              backgroundColor: `${theme.gold}1a`,
              color: theme.goldDark
            }}
          >
            <Calculator className="w-4 h-4" />
            {isEn ? 'ROI Calculator' : 'Calculateur ROI'}
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Calculate Your Potential Savings' : 'Calculez vos économies potentielles'}
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn 
              ? 'See how much you could save with automated anomaly detection and industry benchmarking.'
              : 'Découvrez combien vous pourriez économiser avec la détection automatisée d\'anomalies et le benchmarking sectoriel.'}
          </p>
        </div>

        {/* Calculator Card */}
        <div 
          className="rounded-2xl overflow-hidden shadow-lg"
          style={{ 
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.5)'}`,
          }}
        >
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.5)' }}>
            {/* Input Side */}
            <div className="p-8">
              <h3 className="font-semibold text-lg mb-6" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Your Business' : 'Votre entreprise'}
              </h3>
              
              {/* Monthly Revenue Slider */}
              <div className="mb-8">
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {isEn ? 'Monthly Revenue' : 'Revenus mensuels'}
                  </label>
                  <span className="text-sm font-semibold" style={{ color: theme.green }}>
                    ${monthlyRevenue.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min="50000"
                  max="5000000"
                  step="50000"
                  value={monthlyRevenue}
                  onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ 
                    background: `linear-gradient(to right, ${theme.green} ${((monthlyRevenue - 50000) / 4950000) * 100}%, ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.8)'} ${((monthlyRevenue - 50000) / 4950000) * 100}%)`
                  }}
                />
                <div className="flex justify-between text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  <span>$50K</span>
                  <span>$5M+</span>
                </div>
              </div>
              
              {/* Transaction Volume Slider */}
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {isEn ? 'Monthly Transactions' : 'Transactions mensuelles'}
                  </label>
                  <span className="text-sm font-semibold" style={{ color: theme.green }}>
                    {transactionVolume.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="10000"
                  step="100"
                  value={transactionVolume}
                  onChange={(e) => setTransactionVolume(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ 
                    background: `linear-gradient(to right, ${theme.green} ${((transactionVolume - 100) / 9900) * 100}%, ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.8)'} ${((transactionVolume - 100) / 9900) * 100}%)`
                  }}
                />
                <div className="flex justify-between text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  <span>100</span>
                  <span>10,000+</span>
                </div>
              </div>

              {/* Assumptions Note */}
              <div 
                className="p-3 rounded-lg text-xs"
                style={{ 
                  backgroundColor: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(241, 245, 249, 0.8)',
                  color: 'rgb(var(--color-text-muted))'
                }}
              >
                <Info className="w-3 h-3 inline mr-1" />
                {isEn 
                  ? 'Based on industry average 2% error rate and our 97% detection accuracy'
                  : 'Basé sur le taux d\'erreur moyen de 2% et notre précision de détection de 97%'}
              </div>
            </div>
            
            {/* Results Side */}
            <div className="p-8" style={{ backgroundColor: isDark ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.03)' }}>
              <h3 className="font-semibold text-lg mb-6" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Your Potential Returns' : 'Vos retours potentiels'}
              </h3>
              
              {/* Big Number - Yearly Savings */}
              <div 
                className={`p-6 rounded-xl mb-6 transition-all duration-700 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)' }}
              >
                <div className="text-4xl sm:text-5xl font-bold mb-2" style={{ color: theme.green }}>
                  ${animatedYearlySavings.toLocaleString()}
                </div>
                <div className="text-sm font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Estimated annual savings' : 'Économies annuelles estimées'}
                </div>
              </div>
              
              {/* Breakdown */}
              <div className="space-y-3 mb-6">
                <div className={`flex justify-between items-center transition-all duration-500 ${isInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`} style={{ transitionDelay: '200ms' }}>
                  <span className="text-sm flex items-center gap-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    <Shield className="w-3 h-3" style={{ color: theme.green }} />
                    {isEn ? 'Errors detected/month' : 'Erreurs détectées/mois'}
                  </span>
                  <span className="font-semibold" style={{ color: theme.green }}>
                    {animatedErrors}
                  </span>
                </div>
                <div className={`flex justify-between items-center transition-all duration-500 ${isInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`} style={{ transitionDelay: '300ms' }}>
                  <span className="text-sm flex items-center gap-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    <Check className="w-3 h-3" style={{ color: theme.green }} />
                    {isEn ? 'Monthly savings' : 'Économies mensuelles'}
                  </span>
                  <span className="font-semibold" style={{ color: theme.green }}>
                    ${animatedMonthlySavings.toLocaleString()}
                  </span>
                </div>
                <div className={`flex justify-between items-center transition-all duration-500 ${isInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`} style={{ transitionDelay: '400ms' }}>
                  <span className="text-sm flex items-center gap-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    <Clock className="w-3 h-3" style={{ color: theme.goldDark }} />
                    {isEn ? 'Time saved/month' : 'Temps économisé/mois'}
                  </span>
                  <span className="font-semibold" style={{ color: theme.goldDark }}>
                    {animatedHours}+ {isEn ? 'hours' : 'heures'}
                  </span>
                </div>
              </div>
              
              {/* CTA */}
              <button
                onClick={onScheduleCall}
                className="w-full py-3 rounded-xl font-semibold transition-all hover:scale-105 flex items-center justify-center gap-2"
                style={{ 
                  background: `linear-gradient(135deg, ${theme.gold} 0%, ${theme.goldDark} 100%)`,
                  color: 'white',
                  boxShadow: `0 4px 12px ${theme.gold}40`
                }}
              >
                {isEn ? 'Get Your Free ROI Analysis' : 'Obtenez votre analyse ROI gratuite'}
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <p className="text-center text-xs mt-3" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'No commitment. No surprises.' : 'Sans engagement. Sans surprises.'}
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

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

          {/* Tagline */}
          <p 
            className="text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-8 sm:mb-10 px-2 animate-fade-up opacity-0"
            style={{ color: 'rgb(var(--color-text-secondary))', animationDelay: '0.15s', animationFillMode: 'forwards' }}
          >
            {isEn 
              ? 'Exec-ready dashboards with industry KPIs, OKRs, strategic projections, and AI-optimized financial modeling. Built for Canadian businesses.'
              : 'Tableaux de bord prêts pour la direction avec KPIs sectoriels, OKRs, projections stratégiques et modélisation financière optimisée par IA. Conçu pour les entreprises canadiennes.'}
          </p>

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
              onClick={() => setShowDemoModal(true)}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all hover:scale-105 text-base"
              style={{ 
                border: `2px solid ${theme.green}`,
                color: isDark ? theme.green : theme.greenDark,
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255,255,255,0.9)'
              }}
            >
              <Play className="w-5 h-5" />
              {isEn ? 'Watch demo' : 'Voir la démo'}
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

      {/* Industry KPIs Section - Multiple IDs for SEO compatibility */}
      <span id="features" className="absolute" style={{ top: '-100px' }} />
      <span id="industry-kpis" className="absolute" style={{ top: '-100px' }} />
      <section id="industries" className="py-16 sm:py-20 lg:py-24 relative">
        <IndustryKPISection onScheduleCall={handleScheduleCall} />
      </section>

      {/* How It Works - Compact Pipeline */}
      <section 
        id="pipeline" 
        className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 relative overflow-hidden"
        style={{ 
          background: isDark 
            ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.8) 100%)' 
            : 'linear-gradient(180deg, #fafafa 0%, #f0fdf4 50%, #fafafa 100%)'
        }}
      >

        <div className="max-w-6xl mx-auto relative z-10">
          {/* Section Header */}
          <div className="text-center mb-10 sm:mb-12">
            <div 
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-3"
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
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? 'Your Data Journey' : 'Le parcours de vos données'}
            </h2>
            <p 
              className="text-sm sm:text-base max-w-lg mx-auto mb-6"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'From connection to insights in 4 simple steps'
                : 'De la connexion aux insights en 4 étapes simples'}
            </p>
            
            {/* Data Flow Animation */}
            <div className="flex justify-center">
              <DataFlowAnimation style={{ width: 200, height: 40 }} />
            </div>
          </div>

          {/* Horizontal Steps - Desktop */}
          <div className="hidden lg:block">
            <div className="flex items-start justify-between gap-4 relative">
              {/* Connector Line */}
              <div 
                className="absolute top-8 left-[12%] right-[12%] h-0.5"
                style={{ 
                  background: `linear-gradient(90deg, ${theme.green} 0%, ${theme.green} 50%, ${theme.gold} 100%)`
                }}
              />
              
              {[
                { 
                  num: 1, 
                  icon: Database, 
                  title: isEn ? 'Connect' : 'Connecter',
                  desc: isEn ? 'Link your accounting software securely' : 'Liez votre logiciel comptable',
                  tags: ['QuickBooks', 'Xero', 'Sage'],
                  color: theme.green
                },
                { 
                  num: 2, 
                  icon: RefreshCw, 
                  title: isEn ? 'Clean' : 'Nettoyer',
                  desc: isEn ? 'Data sanitized in Canadian data lake' : 'Données nettoyées au Canada',
                  tags: [isEn ? 'Normalized' : 'Normalisé', isEn ? 'Validated' : 'Validé'],
                  color: theme.green
                },
                { 
                  num: 3, 
                  icon: Sparkles, 
                  title: isEn ? 'Analyze' : 'Analyser',
                  desc: isEn ? 'AI models optimized for your industry' : 'Modèles IA pour votre secteur',
                  tags: ['97%', isEn ? 'Predictions' : 'Prédictions'],
                  color: theme.gold
                },
                { 
                  num: 4, 
                  icon: TrendingUp, 
                  title: isEn ? 'Dashboard' : 'Tableau',
                  desc: isEn ? 'Exec-ready KPIs and strategic insights' : 'KPIs et insights stratégiques',
                  tags: ['KPIs', 'OKRs'],
                  color: theme.gold
                },
              ].map((step) => (
                <div key={step.num} className="flex-1 flex flex-col items-center text-center transition-all duration-300 hover:scale-105">
                  {/* Number Circle */}
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-4 relative z-10"
                    style={{ 
                      background: `linear-gradient(135deg, ${step.color} 0%, ${step.num <= 2 ? theme.greenDark : theme.goldDark} 100%)`,
                      boxShadow: `0 4px 20px ${step.color}40`
                    }}
                  >
                    <step.icon className="w-7 h-7 text-white" />
                  </div>
                  
                  {/* Step Number Badge */}
                  <span 
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-2"
                    style={{ backgroundColor: `${step.color}15`, color: step.num <= 2 ? theme.greenDark : theme.goldDark }}
                  >
                    {isEn ? `Step ${step.num}` : `Étape ${step.num}`}
                  </span>
                  
                  {/* Title */}
                  <h4 className="text-base font-bold mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                    {step.title}
                  </h4>
                  
                  {/* Description */}
                  <p className="text-xs mb-3 px-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {step.desc}
                  </p>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap justify-center gap-1">
                    {step.tags.map((tag) => (
                      <span 
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ 
                          backgroundColor: `${step.color}10`,
                          color: step.num <= 2 ? theme.greenDark : theme.goldDark,
                          border: `1px solid ${step.color}20`
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vertical Steps - Mobile/Tablet */}
          <div className="lg:hidden space-y-4">
            {[
              { 
                num: 1, 
                icon: Database, 
                title: isEn ? 'Connect Your Software' : 'Connectez votre logiciel',
                desc: isEn ? 'Securely link your accounting software' : 'Liez votre logiciel comptable',
                color: theme.green
              },
              { 
                num: 2, 
                icon: RefreshCw, 
                title: isEn ? 'Data Lake & Sanitization' : 'Nettoyage des données',
                desc: isEn ? 'Cleaned & stored in Canadian data lake' : 'Nettoyées & stockées au Canada',
                color: theme.green
              },
              { 
                num: 3, 
                icon: Sparkles, 
                title: isEn ? 'AI-Powered Analysis' : 'Analyse par l\'IA',
                desc: isEn ? 'Industry-optimized ML models' : 'Modèles ML optimisés par secteur',
                color: theme.gold
              },
              { 
                num: 4, 
                icon: TrendingUp, 
                title: isEn ? 'Exec-Ready Dashboard' : 'Tableau de bord exécutif',
                desc: isEn ? 'KPIs, OKRs & strategic projections' : 'KPIs, OKRs & projections',
                color: theme.gold
              },
            ].map((step, idx) => (
              <div 
                key={step.num}
                className="flex items-start gap-4 p-4 rounded-xl transition-all duration-300 hover:scale-[1.02]"
                style={{ 
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.9)',
                  border: `1px solid ${step.color}25`
                }}
              >
                {/* Number Circle */}
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ 
                    background: `linear-gradient(135deg, ${step.color} 0%, ${step.num <= 2 ? theme.greenDark : theme.goldDark} 100%)`,
                    boxShadow: `0 2px 12px ${step.color}30`
                  }}
                >
                  <step.icon className="w-5 h-5 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span 
                      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: `${step.color}15`, color: step.num <= 2 ? theme.greenDark : theme.goldDark }}
                    >
                      {step.num}
                    </span>
                    <h4 className="text-sm font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                      {step.title}
                    </h4>
                  </div>
                  <p className="text-xs" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {step.desc}
                  </p>
                </div>
                
                {/* Connector */}
                {idx < 3 && (
                  <div 
                    className="absolute left-10 mt-14 w-0.5 h-4"
                    style={{ backgroundColor: `${step.color}30` }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-10">
            <button 
              onClick={() => setShowDemoModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105 text-sm"
              style={{ 
                background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                boxShadow: `0 4px 16px ${theme.green}35`
              }}
            >
              <Play className="w-4 h-4" />
              {isEn ? 'See it in action' : 'Voir en action'}
            </button>
          </div>
        </div>
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
                onClick={() => setShowDemoModal(true)}
                className="inline-flex items-center gap-2 px-6 py-4 rounded-xl font-semibold text-base transition-all hover:scale-105"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(8px)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.25)'
                }}
              >
                <Play className="w-5 h-5" />
                {isEn ? 'Watch demo' : 'Voir démo'}
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
