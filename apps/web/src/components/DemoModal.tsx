/**
 * Demo Modal Component
 * Interactive showcase of PlainLedger features for the landing page
 * No authentication required - uses static mockup data
 * Fully responsive with rich animations
 */

import { useState, useEffect, useCallback } from 'react';
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
  TrendingDown,
  CheckCircle,
  ArrowRight,
  DollarSign,
  PieChart,
  Zap,
  RefreshCw,
  Calendar,
  Users,
  Link2,
  Eye,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
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
    title: { en: 'Smart Dashboard', fr: 'Tableau de bord intelligent' },
    subtitle: { 
      en: 'Your financial health at a glance', 
      fr: 'Votre santé financière en un coup d\'œil' 
    },
  },
  {
    id: 'anomalies',
    icon: AlertTriangle,
    title: { en: 'AI Anomaly Detection', fr: 'Détection d\'anomalies IA' },
    subtitle: { 
      en: 'Catch issues before they become problems', 
      fr: 'Détectez les problèmes avant qu\'ils ne s\'aggravent' 
    },
  },
  {
    id: 'reports',
    icon: FileText,
    title: { en: 'Financial Reports', fr: 'Rapports financiers' },
    subtitle: { 
      en: 'Professional reports in seconds', 
      fr: 'Rapports professionnels en quelques secondes' 
    },
  },
  {
    id: 'ai',
    icon: Sparkles,
    title: { en: 'AI Assistant', fr: 'Assistant IA' },
    subtitle: { 
      en: 'Ask questions in plain language', 
      fr: 'Posez vos questions en langage naturel' 
    },
  },
];

// =====================================================
// FULL DASHBOARD MOCKUP - Most visually impressive
// =====================================================

function FullDashboardMockup({ isEn }: { isEn: boolean }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showElements, setShowElements] = useState(false);
  
  useEffect(() => {
    setAnimatedScore(0);
    setShowElements(false);
    
    const timer = setTimeout(() => {
      setShowElements(true);
      const interval = setInterval(() => {
        setAnimatedScore(prev => {
          if (prev >= 87) {
            clearInterval(interval);
            return 87;
          }
          return prev + 3;
        });
      }, 25);
      return () => clearInterval(interval);
    }, 200);
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
          <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
        </div>
      </div>

      {/* App Layout */}
      <div className="flex">
        {/* Sidebar - hidden on mobile */}
        <div className="hidden md:flex flex-col w-14 lg:w-48 border-r py-3 px-2 lg:px-3 gap-1"
          style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}>
          {/* Logo */}
          <div className="flex items-center gap-2 px-2 py-2 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}>
              PL
            </div>
            <span className="hidden lg:block text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              PlainLedger
            </span>
          </div>
          
          {/* Nav items */}
          {[
            { icon: BarChart3, label: 'Dashboard', active: true },
            { icon: AlertTriangle, label: isEn ? 'Anomalies' : 'Anomalies', active: false },
            { icon: FileText, label: isEn ? 'Reports' : 'Rapports', active: false },
            { icon: Link2, label: isEn ? 'Connections' : 'Connexions', active: false },
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
              <span className="hidden lg:block text-xs font-medium" style={{ color: item.active ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-secondary))' }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
        
        {/* Main Content */}
        <div className="flex-1 p-3 sm:p-4 lg:p-5 min-h-[280px] sm:min-h-[340px] lg:min-h-[400px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div>
              <h1 className="text-sm sm:text-base lg:text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Financial Dashboard' : 'Tableau de bord financier'}
              </h1>
              <p className="text-[10px] sm:text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Real-time financial insights' : 'Insights financiers en temps réel'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-xs"
                style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
                <Calendar className="w-3 h-3" style={{ color: 'rgb(var(--color-text-muted))' }} />
                <span style={{ color: 'rgb(var(--color-text-secondary))' }}>MTD</span>
              </div>
              <button className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium"
                style={{ backgroundColor: 'rgb(var(--color-primary-500))', color: 'white' }}>
                <Sparkles className="w-3 h-3" />
                <span className="hidden sm:inline">{isEn ? 'Ask AI' : 'Demander'}</span>
              </button>
            </div>
          </div>
          
          {/* Main Grid */}
          <div className="grid grid-cols-12 gap-2 sm:gap-3">
            {/* Health Score */}
            <div className={`col-span-4 sm:col-span-3 lg:col-span-2 p-2 sm:p-3 rounded-xl transition-all duration-500 ${
              showElements ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
              style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))' }}>
              <div className="text-[8px] sm:text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Health Score' : 'Score santé'}
              </div>
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 mx-auto">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="rgb(var(--color-border))" strokeWidth="2.5" />
                  <circle 
                    cx="18" cy="18" r="14" fill="none" 
                    stroke="rgb(var(--color-success))" strokeWidth="2.5"
                    strokeDasharray={`${animatedScore * 0.88} 88`}
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg sm:text-xl lg:text-2xl font-bold" style={{ color: 'rgb(var(--color-success))' }}>
                    {animatedScore}
                  </span>
                  <span className="text-[7px] sm:text-[8px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'Good' : 'Bon'}
                  </span>
                </div>
              </div>
              <div className="flex justify-center gap-1 mt-2">
                <span className="px-1.5 py-0.5 rounded text-[7px] sm:text-[8px] font-medium bg-error/10 text-error">2</span>
                <span className="px-1.5 py-0.5 rounded text-[7px] sm:text-[8px] font-medium bg-warning/10 text-warning">3</span>
                <span className="px-1.5 py-0.5 rounded text-[7px] sm:text-[8px] font-medium bg-success/10 text-success">5</span>
              </div>
            </div>
            
            {/* KPI Cards */}
            <div className="col-span-8 sm:col-span-9 lg:col-span-10 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {[
                { label: isEn ? 'Revenue' : 'Revenus', value: '$847,230', change: 12.4, up: true, badge: isEn ? '3mo runway' : '3 mois' },
                { label: isEn ? 'Cash' : 'Trésorerie', value: '$234,500', change: 8.2, up: true },
                { label: isEn ? 'Net Cash Flow' : 'Flux net', value: '$45,200', change: -3.1, up: false },
                { label: isEn ? 'Working Capital' : 'Fonds de roul.', value: '$156,800', change: 5.6, up: true },
              ].map((kpi, i) => (
                <div 
                  key={i} 
                  className={`p-2 sm:p-3 rounded-xl transition-all duration-500 ${
                    showElements ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{ 
                    backgroundColor: 'rgb(var(--color-surface))',
                    border: '1px solid rgb(var(--color-border))',
                    transitionDelay: `${i * 100 + 100}ms`
                  }}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-[8px] sm:text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {kpi.label}
                    </span>
                    {kpi.badge && (
                      <span className="px-1.5 py-0.5 rounded-full text-[7px] sm:text-[8px] font-medium"
                        style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)', color: 'rgb(var(--color-primary-600))' }}>
                        {kpi.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-base sm:text-lg lg:text-xl font-bold mt-1" style={{ color: 'rgb(var(--color-text))' }}>
                    {kpi.value}
                  </div>
                  <div className={`flex items-center gap-1 mt-1 text-[9px] sm:text-[10px] font-medium ${kpi.up ? 'text-success' : 'text-error'}`}>
                    {kpi.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {kpi.change > 0 ? '+' : ''}{kpi.change}%
                    <span className="text-[8px] sm:text-[9px] ml-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? 'vs prior' : 'vs précéd.'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Revenue Chart */}
            <div className={`col-span-12 sm:col-span-7 lg:col-span-8 p-3 sm:p-4 rounded-xl transition-all duration-500 ${
              showElements ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))',
                border: '1px solid rgb(var(--color-border))',
                transitionDelay: '400ms'
              }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-[10px] sm:text-xs font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? 'Revenue Trend' : 'Tendance des revenus'}
                  </h3>
                  <p className="text-[8px] sm:text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'Last 12 months vs budget' : '12 derniers mois vs budget'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgb(var(--color-primary-500))' }} />
                    <span className="text-[8px] sm:text-[9px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? 'Actual' : 'Réel'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgb(var(--color-border))' }} />
                    <span className="text-[8px] sm:text-[9px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      Budget
                    </span>
                  </div>
                </div>
              </div>
              <div className="h-24 sm:h-28 lg:h-32 flex items-end gap-1 sm:gap-1.5">
                {[40, 55, 45, 60, 50, 70, 65, 75, 70, 85, 80, 90].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col gap-0.5 h-full justify-end">
                    <div 
                      className={`w-full rounded-t transition-all duration-700 ${showElements ? '' : 'h-0'}`}
                      style={{ 
                        height: showElements ? `${h}%` : '0%',
                        backgroundColor: 'rgb(var(--color-primary-500))',
                        opacity: 0.8 + (i / 60),
                        transitionDelay: `${i * 50 + 500}ms`
                      }}
                    />
                    <div 
                      className="w-full rounded-t"
                      style={{ 
                        height: `${h * 0.85}%`,
                        backgroundColor: 'rgb(var(--color-border))',
                        opacity: 0.5
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2">
                {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((m, i) => (
                  <span key={i} className="text-[7px] sm:text-[8px]" style={{ color: 'rgb(var(--color-text-muted))' }}>{m}</span>
                ))}
              </div>
            </div>
            
            {/* Key Ratios & Alerts */}
            <div className={`col-span-12 sm:col-span-5 lg:col-span-4 space-y-2 sm:space-y-3 transition-all duration-500 ${
              showElements ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`} style={{ transitionDelay: '500ms' }}>
              {/* Ratios Card */}
              <div className="p-3 sm:p-4 rounded-xl"
                style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))' }}>
                <h3 className="text-[10px] sm:text-xs font-semibold mb-2 sm:mb-3" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Key Ratios' : 'Ratios clés'}
                </h3>
                <div className="space-y-2">
                  {[
                    { label: isEn ? 'Current Ratio' : 'Ratio courant', value: '2.4x', benchmark: '2.0x', good: true },
                    { label: isEn ? 'Quick Ratio' : 'Ratio rapide', value: '1.8x', benchmark: '1.5x', good: true },
                    { label: isEn ? 'Gross Margin' : 'Marge brute', value: '42.5%', benchmark: '35%', good: true },
                    { label: isEn ? 'DSO' : 'DMP', value: '38d', benchmark: '45d', good: true },
                  ].map((ratio, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-[9px] sm:text-[10px]" style={{ color: 'rgb(var(--color-text-secondary))' }}>{ratio.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] sm:text-xs font-bold" style={{ color: 'rgb(var(--color-text))' }}>{ratio.value}</span>
                        <CheckCircle className="w-3 h-3 text-success" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Quick Alert */}
              <div className="p-2 sm:p-3 rounded-xl"
                style={{ backgroundColor: 'rgb(var(--color-error) / 0.08)', border: '1px solid rgb(var(--color-error) / 0.2)' }}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-error flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] sm:text-[10px] font-semibold text-error">
                      {isEn ? '2 Critical Anomalies' : '2 anomalies critiques'}
                    </p>
                    <p className="text-[8px] sm:text-[9px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? 'Action required' : 'Action requise'}
                    </p>
                  </div>
                  <button className="px-2 py-1 rounded text-[8px] sm:text-[9px] font-medium"
                    style={{ backgroundColor: 'rgb(var(--color-surface))', color: 'rgb(var(--color-error))' }}>
                    {isEn ? 'View' : 'Voir'}
                  </button>
                </div>
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
  const [visibleAlerts, setVisibleAlerts] = useState(0);
  
  useEffect(() => {
    setVisibleAlerts(0);
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setVisibleAlerts(prev => prev < 4 ? prev + 1 : prev);
      }, 300);
      return () => clearInterval(interval);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const alerts = [
    { 
      severity: 'critical', 
      title: isEn ? 'Duplicate Payment Detected' : 'Paiement en double détecté',
      desc: isEn ? 'Invoice #4521 paid twice' : 'Facture #4521 payée deux fois',
      amount: '$12,450',
      time: '2h',
    },
    { 
      severity: 'critical', 
      title: isEn ? 'Missing Bank Reconciliation' : 'Rapprochement bancaire manquant',
      desc: isEn ? 'December 2025 not reconciled' : 'Décembre 2025 non rapproché',
      amount: '$45,230',
      time: '1d',
    },
    { 
      severity: 'warning', 
      title: isEn ? 'Unusual Expense Spike' : 'Pic de dépenses inhabituel',
      desc: isEn ? 'Marketing 340% above avg' : 'Marketing 340% au-dessus de la moy.',
      amount: '$28,500',
      time: '3d',
    },
    { 
      severity: 'info', 
      title: isEn ? 'Revenue Below Forecast' : 'Revenus sous les prévisions',
      desc: isEn ? 'Q4 revenue 15% below target' : 'Revenus Q4 15% sous cible',
      amount: '-$67,000',
      time: '5d',
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
      <div className="p-4 sm:p-5 lg:p-6 min-h-[280px] sm:min-h-[340px] lg:min-h-[400px]">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 sm:mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-sm sm:text-base lg:text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Anomaly Detection' : 'Détection d\'anomalies'}
              </h1>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium"
                style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)', color: 'rgb(var(--color-primary-600))' }}>
                <Zap className="w-2.5 h-2.5" />
                {isEn ? 'AI Powered' : 'Propulsé par IA'}
              </span>
            </div>
            <p className="text-[10px] sm:text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? '4 issues detected requiring attention' : '4 problèmes détectés nécessitant votre attention'}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-error) / 0.1)' }}>
              <span className="text-sm sm:text-lg font-bold text-error">2</span>
              <p className="text-[8px] sm:text-[9px]" style={{ color: 'rgb(var(--color-text-muted))' }}>Critical</p>
            </div>
            <div className="text-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-warning) / 0.1)' }}>
              <span className="text-sm sm:text-lg font-bold text-warning">1</span>
              <p className="text-[8px] sm:text-[9px]" style={{ color: 'rgb(var(--color-text-muted))' }}>Warning</p>
            </div>
            <div className="hidden sm:block text-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
              <span className="text-sm sm:text-lg font-bold" style={{ color: 'rgb(var(--color-text-secondary))' }}>1</span>
              <p className="text-[8px] sm:text-[9px]" style={{ color: 'rgb(var(--color-text-muted))' }}>Info</p>
            </div>
          </div>
        </div>
        
        {/* Alerts List */}
        <div className="space-y-2 sm:space-y-3">
          {alerts.map((alert, i) => (
            <div 
              key={i}
              className={`p-3 sm:p-4 rounded-xl flex items-start gap-3 transition-all duration-500 ${
                i < visibleAlerts ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
              }`}
              style={{ 
                backgroundColor: alert.severity === 'critical' 
                  ? 'rgb(var(--color-error) / 0.08)' 
                  : alert.severity === 'warning'
                  ? 'rgb(var(--color-warning) / 0.08)'
                  : 'rgb(var(--color-bg-muted))',
                border: `1px solid ${
                  alert.severity === 'critical' 
                    ? 'rgb(var(--color-error) / 0.2)' 
                    : alert.severity === 'warning'
                    ? 'rgb(var(--color-warning) / 0.2)'
                    : 'rgb(var(--color-border))'
                }`
              }}
            >
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                alert.severity === 'critical' ? 'bg-error/20' : 
                alert.severity === 'warning' ? 'bg-warning/20' : 'bg-muted'
              }`}>
                <AlertTriangle className={`w-4 h-4 sm:w-5 sm:h-5 ${
                  alert.severity === 'critical' ? 'text-error' : 
                  alert.severity === 'warning' ? 'text-warning' : 'text-muted'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] sm:text-xs font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                      {alert.title}
                    </p>
                    <p className="text-[9px] sm:text-[10px] mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {alert.desc}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[11px] sm:text-xs font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                      {alert.amount}
                    </p>
                    <p className="text-[8px] sm:text-[9px] flex items-center gap-1 justify-end" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      <Clock className="w-2.5 h-2.5" />
                      {alert.time}
                    </p>
                  </div>
                </div>
              </div>
              <button className="px-2 sm:px-3 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-medium flex-shrink-0"
                style={{ backgroundColor: 'rgb(var(--color-surface))', color: 'rgb(var(--color-text-secondary))' }}>
                <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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
  const [activeReport, setActiveReport] = useState(0);
  
  useEffect(() => {
    setActiveReport(0);
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
            app.plainledger.ca/reports
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex min-h-[280px] sm:min-h-[340px] lg:min-h-[400px]">
        {/* Report Sidebar */}
        <div className="w-28 sm:w-36 lg:w-44 border-r p-2 sm:p-3 flex flex-col gap-1.5"
          style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))' }}>
          <div className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider px-2 py-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Financial Statements' : 'États financiers'}
          </div>
          {[
            { icon: FileText, label: isEn ? 'Balance Sheet' : 'Bilan' },
            { icon: PieChart, label: isEn ? 'Income Statement' : 'Compte de résultat' },
            { icon: DollarSign, label: isEn ? 'Cash Flow' : 'Flux de trésorerie' },
          ].map((report, i) => (
            <button 
              key={i}
              onClick={() => setActiveReport(i)}
              className={`flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg text-left transition-all ${
                activeReport === i ? 'ring-1' : ''
              }`}
              style={{ 
                backgroundColor: activeReport === i ? 'rgb(var(--color-primary-500) / 0.1)' : 'transparent',
                '--tw-ring-color': 'rgb(var(--color-primary-500))',
              } as React.CSSProperties}
            >
              <report.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: activeReport === i ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))' }} />
              <span className="text-[9px] sm:text-[10px] font-medium truncate" style={{ color: activeReport === i ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-secondary))' }}>
                {report.label}
              </span>
            </button>
          ))}
          
          <div className="border-t mt-2 pt-2" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <div className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider px-2 py-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Custom Reports' : 'Rapports custom'}
            </div>
            <div className="px-2 py-2 text-[8px] sm:text-[9px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? '+ Create new report' : '+ Créer un rapport'}
            </div>
          </div>
        </div>
        
        {/* Report Preview */}
        <div className="flex-1 p-4 sm:p-5 lg:p-6">
          {/* Report Header */}
          <div className="flex items-start justify-between mb-4 sm:mb-5">
            <div>
              <h2 className="text-sm sm:text-base lg:text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Balance Sheet' : 'Bilan'}
              </h2>
              <p className="text-[10px] sm:text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'As of December 31, 2025' : 'Au 31 décembre 2025'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-2 sm:px-3 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-medium"
                style={{ backgroundColor: 'rgb(var(--color-bg-muted))', color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Export PDF' : 'Exporter PDF'}
              </button>
              <button className="px-2 sm:px-3 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-medium"
                style={{ backgroundColor: 'rgb(var(--color-primary-500))', color: 'white' }}>
                {isEn ? 'Share' : 'Partager'}
              </button>
            </div>
          </div>
          
          {/* Report Table */}
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <div className="grid grid-cols-3 text-[9px] sm:text-[10px] font-semibold p-2 sm:p-3"
              style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
              <span style={{ color: 'rgb(var(--color-text))' }}>{isEn ? 'Account' : 'Compte'}</span>
              <span className="text-right" style={{ color: 'rgb(var(--color-text))' }}>{isEn ? 'Current' : 'Actuel'}</span>
              <span className="text-right" style={{ color: 'rgb(var(--color-text))' }}>{isEn ? 'Prior' : 'Précédent'}</span>
            </div>
            
            <div className="divide-y" style={{ borderColor: 'rgb(var(--color-border))' }}>
              <div className="grid grid-cols-3 text-[9px] sm:text-[10px] p-2 sm:p-3 font-semibold"
                style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
                <span style={{ color: 'rgb(var(--color-text))' }}>{isEn ? 'ASSETS' : 'ACTIFS'}</span>
                <span className="text-right" style={{ color: 'rgb(var(--color-text))' }}>$1,245,000</span>
                <span className="text-right" style={{ color: 'rgb(var(--color-text-muted))' }}>$1,102,500</span>
              </div>
              {[
                { label: isEn ? 'Cash & Equivalents' : 'Trésorerie', current: '$234,500', prior: '$198,200' },
                { label: isEn ? 'Accounts Receivable' : 'Comptes clients', current: '$156,200', prior: '$142,800' },
                { label: isEn ? 'Inventory' : 'Stocks', current: '$89,300', prior: '$78,500' },
                { label: isEn ? 'Fixed Assets' : 'Immobilisations', current: '$765,000', prior: '$683,000' },
              ].map((row, i) => (
                <div key={i} className="grid grid-cols-3 text-[8px] sm:text-[9px] p-2 sm:p-3 pl-4 sm:pl-5"
                  style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
                  <span style={{ color: 'rgb(var(--color-text-secondary))' }}>{row.label}</span>
                  <span className="text-right" style={{ color: 'rgb(var(--color-text))' }}>{row.current}</span>
                  <span className="text-right" style={{ color: 'rgb(var(--color-text-muted))' }}>{row.prior}</span>
                </div>
              ))}
              
              <div className="grid grid-cols-3 text-[9px] sm:text-[10px] p-2 sm:p-3 font-semibold"
                style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
                <span style={{ color: 'rgb(var(--color-text))' }}>{isEn ? 'LIABILITIES' : 'PASSIFS'}</span>
                <span className="text-right" style={{ color: 'rgb(var(--color-text))' }}>$567,000</span>
                <span className="text-right" style={{ color: 'rgb(var(--color-text-muted))' }}>$512,300</span>
              </div>
              
              <div className="grid grid-cols-3 text-[9px] sm:text-[10px] p-2 sm:p-3 font-bold"
                style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.05)' }}>
                <span style={{ color: 'rgb(var(--color-primary-600))' }}>{isEn ? 'EQUITY' : 'CAPITAUX PROPRES'}</span>
                <span className="text-right" style={{ color: 'rgb(var(--color-primary-600))' }}>$678,000</span>
                <span className="text-right" style={{ color: 'rgb(var(--color-text-muted))' }}>$590,200</span>
              </div>
            </div>
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
  
  const question = isEn 
    ? 'What were our top expenses last quarter and how do they compare to budget?' 
    : 'Quelles étaient nos principales dépenses du dernier trimestre et comment se comparent-elles au budget?';
  
  useEffect(() => {
    setTypedText('');
    setShowResponse(false);
    
    let i = 0;
    const timer = setTimeout(() => {
      const typeInterval = setInterval(() => {
        if (i <= question.length) {
          setTypedText(question.slice(0, i));
          i++;
        } else {
          clearInterval(typeInterval);
          setTimeout(() => setShowResponse(true), 400);
        }
      }, 30);
      return () => clearInterval(typeInterval);
    }, 300);
    return () => clearTimeout(timer);
  }, [question]);

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
      <div className="p-4 sm:p-5 lg:p-6 min-h-[280px] sm:min-h-[340px] lg:min-h-[400px] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 sm:mb-5 pb-3 sm:pb-4 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}>
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: 'rgb(var(--color-primary-500))' }} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'AI Financial Assistant' : 'Assistant financier IA'}
            </h2>
            <p className="text-[10px] sm:text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Ask anything about your financial data' : 'Posez n\'importe quelle question sur vos données financières'}
            </p>
          </div>
        </div>
        
        {/* Chat Messages */}
        <div className="flex-1 space-y-3 sm:space-y-4">
          {/* User Message */}
          <div className="flex justify-end">
            <div className="max-w-[85%] sm:max-w-[75%] p-3 sm:p-4 rounded-2xl rounded-tr-md text-[10px] sm:text-xs"
              style={{ backgroundColor: 'rgb(var(--color-primary-500))', color: 'white' }}>
              {typedText}
              {typedText.length < question.length && <span className="animate-pulse">|</span>}
            </div>
          </div>
          
          {/* AI Response */}
          {showResponse && (
            <div className="flex justify-start animate-fade-in">
              <div className="max-w-[90%] sm:max-w-[80%] p-3 sm:p-4 rounded-2xl rounded-tl-md"
                style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))' }}>
                <p className="text-[10px] sm:text-xs mb-3" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn 
                    ? 'Based on your Q4 2025 data, here\'s a breakdown of your top expenses compared to budget:' 
                    : 'Selon vos données Q4 2025, voici le détail de vos principales dépenses comparées au budget:'}
                </p>
                
                {/* Expense Table */}
                <div className="rounded-lg overflow-hidden border mb-3" style={{ borderColor: 'rgb(var(--color-border))' }}>
                  <div className="grid grid-cols-4 text-[8px] sm:text-[9px] font-semibold p-2"
                    style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
                    <span style={{ color: 'rgb(var(--color-text))' }}>{isEn ? 'Category' : 'Catégorie'}</span>
                    <span className="text-right" style={{ color: 'rgb(var(--color-text))' }}>{isEn ? 'Actual' : 'Réel'}</span>
                    <span className="text-right" style={{ color: 'rgb(var(--color-text))' }}>Budget</span>
                    <span className="text-right" style={{ color: 'rgb(var(--color-text))' }}>Var.</span>
                  </div>
                  {[
                    { label: isEn ? 'Payroll' : 'Salaires', actual: '$124,500', budget: '$120,000', var: '+3.8%', over: true },
                    { label: 'Marketing', actual: '$45,200', budget: '$35,000', var: '+29.1%', over: true },
                    { label: isEn ? 'Rent' : 'Loyer', actual: '$36,000', budget: '$36,000', var: '0%', over: false },
                    { label: isEn ? 'Software' : 'Logiciels', actual: '$18,500', budget: '$20,000', var: '-7.5%', over: false },
                  ].map((item, i) => (
                    <div key={i} className="grid grid-cols-4 text-[8px] sm:text-[9px] p-2 border-t"
                      style={{ borderColor: 'rgb(var(--color-border))' }}>
                      <span style={{ color: 'rgb(var(--color-text-secondary))' }}>{item.label}</span>
                      <span className="text-right" style={{ color: 'rgb(var(--color-text))' }}>{item.actual}</span>
                      <span className="text-right" style={{ color: 'rgb(var(--color-text-muted))' }}>{item.budget}</span>
                      <span className={`text-right font-medium ${item.over ? 'text-error' : 'text-success'}`}>{item.var}</span>
                    </div>
                  ))}
                </div>
                
                <p className="text-[9px] sm:text-[10px] p-2 rounded-lg" 
                  style={{ backgroundColor: 'rgb(var(--color-warning) / 0.1)', color: 'rgb(var(--color-text-secondary))' }}>
                  <AlertTriangle className="w-3 h-3 inline mr-1 text-warning" />
                  {isEn 
                    ? 'Marketing expenses are significantly over budget. Consider reviewing campaign ROI.' 
                    : 'Les dépenses marketing dépassent significativement le budget. Considérez revoir le ROI des campagnes.'}
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Input */}
        <div className="mt-4 flex items-center gap-2 p-2 rounded-xl" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
          <input 
            type="text" 
            placeholder={isEn ? 'Ask a question about your finances...' : 'Posez une question sur vos finances...'}
            className="flex-1 bg-transparent text-[10px] sm:text-xs outline-none px-2"
            style={{ color: 'rgb(var(--color-text))' }}
            disabled
          />
          <button className="p-2 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}>
            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
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
    }, 8000); // Longer time to appreciate the visuals
    
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
  
  // Render the appropriate mockup based on current slide
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
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal - Full width on mobile, constrained on larger screens */}
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
          {/* Compact Header */}
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div 
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
              >
                <SlideIcon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base lg:text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? slide.title.en : slide.title.fr}
                </h3>
                <p className="text-[10px] sm:text-xs" style={{ color: 'rgb(var(--color-primary-600))' }}>
                  {isEn ? slide.subtitle.en : slide.subtitle.fr}
                </p>
              </div>
            </div>
            
            {/* Navigation Pills - Hidden on small mobile */}
            <div className="hidden sm:flex items-center gap-1.5 sm:gap-2">
              {DEMO_SLIDES.map((s, i) => (
                <button
                  key={i}
                  onClick={() => goToSlide(i)}
                  className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full text-[9px] sm:text-[10px] font-medium transition-all ${
                    i === currentSlide ? 'ring-1' : ''
                  }`}
                  style={{ 
                    backgroundColor: i === currentSlide ? 'rgb(var(--color-primary-500) / 0.1)' : 'rgb(var(--color-bg-muted))',
                    color: i === currentSlide ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-muted))',
                    '--tw-ring-color': 'rgb(var(--color-primary-500))',
                  } as React.CSSProperties}
                >
                  <s.icon className="w-3 h-3" />
                  <span className="hidden lg:inline">{isEn ? s.title.en : s.title.fr}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Mockup Display - Takes most of the space */}
          <div className="mb-3 sm:mb-4" key={currentSlide}>
            {renderMockup()}
          </div>
          
          {/* Bottom Controls */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Left: Nav arrows */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={goPrev}
                className="p-1.5 sm:p-2 rounded-lg transition-colors hover:bg-black/5"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              
              {/* Mobile dots */}
              <div className="flex sm:hidden items-center gap-1.5">
                {DEMO_SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToSlide(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === currentSlide ? 'w-4' : ''
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
                className="p-1.5 sm:p-2 rounded-lg transition-colors hover:bg-black/5"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              
              <button
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className="hidden sm:flex p-1.5 rounded-full transition-colors"
                style={{ 
                  backgroundColor: isAutoPlaying ? 'rgb(var(--color-primary-500) / 0.1)' : 'transparent',
                  color: isAutoPlaying ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))'
                }}
              >
                {isAutoPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
            </div>
            
            {/* Right: CTA */}
            <button
              onClick={onStartTrial}
              className="btn-primary text-xs sm:text-sm px-3 sm:px-5 py-2 sm:py-2.5 group"
            >
              {isEn ? 'Start free trial' : 'Essai gratuit'}
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { DemoModal };
