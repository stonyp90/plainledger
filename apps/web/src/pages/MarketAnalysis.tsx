/**
 * Market Analysis Page
 *
 * AI-powered industry benchmarks comparing business metrics
 * against industry data from public and private data sources.
 * 
 * Free users see basic metrics with blurred Pro features.
 * Pro users get full access to AI insights and detailed comparisons.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart2,
  TrendingUp,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Target,
  Percent,
  DollarSign,
  Scale,
  Sparkles,
  Brain,
  Zap,
  Calendar,
  ArrowRight,
  Crown,
  Check,
  Building2,
  MapPin,
  Lock,
  // Industry icons (using Lucide instead of emojis for consistent theming)
  ShoppingBag,
  Hammer,
  Hotel,
  UtensilsCrossed,
  Briefcase,
  Factory,
  Wheat,
  Truck,
  Heart,
  GraduationCap,
  Laptop,
  Scissors,
  Car,
  Package,
  Home,
} from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import { useI18n } from '../lib/i18n';
import { useFinancialData } from '../hooks/useFinancialData';
import { useBenchmark, type RevenueRange } from '../hooks/useBenchmarks';
import BenchmarkCard from '../components/BenchmarkCard';
import BenchmarkComparison from '../components/BenchmarkComparison';
import MarketInsightsPanel, { generateInsightsFromComparison } from '../components/MarketInsightsPanel';
import PremiumFeatureGate, { usePremiumFeature, PremiumUpgradeBanner } from '../components/PremiumFeatureGate';

// Calendly link for upgrade consultations
const CALENDLY_URL = 'https://calendly.com/anthonypaquet1508';

// Industry display names
const INDUSTRY_NAMES: Record<string, { en: string; fr: string }> = {
  real_estate: { en: 'Real Estate', fr: 'Immobilier' },
  construction: { en: 'Construction', fr: 'Construction' },
  hospitality: { en: 'Hospitality', fr: 'Hôtellerie' },
  restaurant: { en: 'Restaurant', fr: 'Restauration' },
  retail: { en: 'Retail', fr: 'Commerce de détail' },
  professional_services: { en: 'Professional Services', fr: 'Services professionnels' },
  manufacturing: { en: 'Manufacturing', fr: 'Manufacturier' },
  agriculture: { en: 'Agriculture', fr: 'Agroalimentaire' },
  transport: { en: 'Transport & Logistics', fr: 'Transport et logistique' },
  healthcare: { en: 'Healthcare', fr: 'Santé' },
  education: { en: 'Education', fr: 'Éducation' },
  wholesale: { en: 'Wholesale & Distribution', fr: 'Commerce de gros' },
  automotive: { en: 'Automotive', fr: 'Automobile' },
  beauty_wellness: { en: 'Beauty & Wellness', fr: 'Beauté et bien-être' },
  technology: { en: 'Technology', fr: 'Technologie' },
};

// Industry Lucide icons (themed icons instead of emojis for consistent branding)
const INDUSTRY_LUCIDE_ICONS: Record<string, typeof Building2> = {
  real_estate: Home,
  construction: Hammer,
  hospitality: Hotel,
  restaurant: UtensilsCrossed,
  retail: ShoppingBag,
  professional_services: Briefcase,
  manufacturing: Factory,
  agriculture: Wheat,
  transport: Truck,
  healthcare: Heart,
  education: GraduationCap,
  wholesale: Package,
  automotive: Car,
  beauty_wellness: Scissors,
  technology: Laptop,
};

export default function MarketAnalysis() {
  const { currentTenant } = useTenant();
  const { language } = useI18n();
  const { data: financialData } = useFinancialData();
  const isEn = language === 'en';
  const { hasAccess } = usePremiumFeature('marketAnalysis');
  
  // Default to organization's industry if set, otherwise professional services
  const defaultIndustry = currentTenant?.industry || 'professional_services';
  const [selectedIndustry, setSelectedIndustry] = useState<string>(defaultIndustry);
  const [revenueRange, setRevenueRange] = useState<RevenueRange>('30k-5m');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showComparison, setShowComparison] = useState(true);
  
  // Update selected industry when tenant changes
  useEffect(() => {
    if (currentTenant?.industry) {
      setSelectedIndustry(currentTenant.industry);
    }
  }, [currentTenant?.industry]);

  // Fetch benchmark data from API (with fallback)
  const { benchmark, isLoading: benchmarkLoading, refetch: refetchBenchmark } = useBenchmark(
    selectedIndustry, 
    revenueRange
  );

  // Calculate user metrics from financial data
  const userMetrics = useMemo(() => {
    if (!financialData) {
      return null;
    }

    const revenue = financialData.kpis?.revenue || 500000;
    const grossProfit = financialData.kpis?.grossProfit || revenue * 0.58;
    const netIncome = financialData.kpis?.netIncome || revenue * 0.12;
    const currentAssets = financialData.kpis?.currentAssets || 150000;
    const currentLiabilities = financialData.kpis?.currentLiabilities || 80000;
    const totalDebt = financialData.kpis?.totalDebt || 200000;
    const equity = financialData.kpis?.equity || 250000;
    const operatingExpenses = financialData.kpis?.operatingExpenses || revenue * 0.42;

    return {
      grossMargin: grossProfit / revenue,
      netMargin: netIncome / revenue,
      currentRatio: currentAssets / currentLiabilities,
      debtToEquity: totalDebt / equity,
      operatingExpenseRatio: operatingExpenses / revenue,
    };
  }, [financialData]);

  // Generate AI insights from comparison
  const aiInsights = useMemo(() => {
    if (!userMetrics || !benchmark) return [];
    
    return generateInsightsFromComparison(userMetrics, {
      grossMargin: benchmark.profitability.grossMargin,
      netMargin: benchmark.profitability.netMargin,
      currentRatio: benchmark.balanceSheet.currentRatio,
      debtToEquity: benchmark.balanceSheet.debtToEquity,
      operatingExpenseRatio: benchmark.operations.operatingExpenseRatio,
    });
  }, [userMetrics, benchmark]);

  // Calculate overall score
  const overallScore = useMemo(() => {
    if (aiInsights.length === 0) return undefined;
    
    const statusScores = {
      excellent: 100,
      good: 80,
      average: 60,
      below: 40,
      attention: 20,
    };
    
    const total = aiInsights.reduce((sum, insight) => sum + statusScores[insight.status], 0);
    return Math.round(total / aiInsights.length);
  }, [aiInsights]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchBenchmark();
    setIsRefreshing(false);
  };

  const handleUpgradeClick = () => {
    window.open(CALENDLY_URL, '_blank');
  };

  const industryName = INDUSTRY_NAMES[selectedIndustry]?.[language] || selectedIndustry;
  const industryNameFr = INDUSTRY_NAMES[selectedIndustry]?.fr || selectedIndustry;
  const IndustryIcon = INDUSTRY_LUCIDE_ICONS[selectedIndustry] || Building2;

  // Convert benchmark format for BenchmarkCard/BenchmarkComparison compatibility
  const legacyBenchmark = benchmark ? {
    grossMargin: benchmark.profitability.grossMargin,
    netMargin: benchmark.profitability.netMargin,
    currentRatio: benchmark.balanceSheet.currentRatio.median,
    debtToEquity: benchmark.balanceSheet.debtToEquity.median,
    operatingExpenseRatio: benchmark.operations.operatingExpenseRatio,
    wagesToRevenueRatio: benchmark.operations.wagesToRevenueRatio,
    revenueYoY: benchmark.growth.revenueYoY,
    sampleSize: benchmark.sampleSize,
  } : null;

  // Show premium gate for free users
  if (!hasAccess) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 
              className="text-xl sm:text-2xl font-bold flex items-center gap-2 flex-wrap" 
              style={{ color: 'rgb(var(--color-text))' }}
            >
              <BarChart2 className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" style={{ color: 'rgb(var(--color-primary-600))' }} />
              <span className="whitespace-nowrap">{isEn ? 'Market Analysis' : 'Analyse de marché'}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full uppercase tracking-wide"
                style={{ 
                  background: 'linear-gradient(135deg, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-600)) 100%)',
                  color: 'white',
                }}
              >
                <Crown className="w-3 h-3" />
                PRO
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r from-primary-500 to-primary-600 text-white whitespace-nowrap flex-shrink-0">
                <Brain className="w-3 h-3" />
                {isEn ? 'AI-Powered' : 'Propulsé par IA'}
              </span>
            </h1>
            <p 
              className="mt-1 text-sm line-clamp-2 sm:line-clamp-none" 
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn 
                ? 'Our AI analyzes industry benchmark data to reveal your competitive position, identify growth opportunities, and compare your performance with industry leaders.'
                : 'Notre IA analyse les données de référence de votre secteur pour révéler votre position concurrentielle, identifier les opportunités de croissance et comparer vos performances aux leaders du secteur.'}
            </p>
          </div>
        </div>

        {/* Organization Context Banner */}
        {currentTenant && (currentTenant.industry || currentTenant.province) && (
          <div 
            className="rounded-xl border p-4"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              borderColor: 'rgb(var(--color-border))'
            }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ 
                background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
                boxShadow: '0 4px 12px -2px rgb(var(--color-primary-500) / 0.3)'
              }}
            >
              {(() => {
                const TenantIndustryIcon = currentTenant.industry ? INDUSTRY_LUCIDE_ICONS[currentTenant.industry] : null;
                return TenantIndustryIcon ? (
                  <TenantIndustryIcon className="w-6 h-6 text-white" />
                ) : (
                  <Building2 className="w-6 h-6 text-white" />
                );
              })()}
            </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-base" style={{ color: 'rgb(var(--color-text))' }}>
                    {currentTenant.name}
                  </h2>
                  {currentTenant.industry && (
                    <span 
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full"
                      style={{ 
                        backgroundColor: 'rgb(var(--color-primary-100))',
                        color: 'rgb(var(--color-primary-700))'
                      }}
                    >
                      {INDUSTRY_NAMES[currentTenant.industry]?.[language] || currentTenant.industry}
                    </span>
                  )}
                  {currentTenant.province && (
                    <span 
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full"
                      style={{ 
                        backgroundColor: 'rgb(var(--color-warning) / 0.1)',
                        color: 'rgb(var(--color-warning))'
                      }}
                    >
                      <MapPin className="w-3 h-3" />
                      {currentTenant.province}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn 
                    ? `Market benchmarks tailored to your ${currentTenant.industry ? INDUSTRY_NAMES[currentTenant.industry]?.en || 'industry' : 'business'} business`
                    : `Benchmarks de marché adaptés à votre entreprise${currentTenant.industry ? ` de ${INDUSTRY_NAMES[currentTenant.industry]?.fr || 'votre secteur'}` : ''}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Premium Upgrade Banner */}
        <PremiumUpgradeBanner feature="marketAnalysis" />
        
        {/* Value Proposition Card */}
        <div 
          className="relative rounded-2xl p-6 sm:p-8 overflow-hidden"
          style={{
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))',
          }}
        >
          {/* Gold accent stripe at top */}
          <div 
            className="absolute top-0 left-0 right-0 h-1"
            style={{ 
              background: 'linear-gradient(90deg, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-400)) 50%, rgb(var(--color-accent-500)) 100%)',
            }}
          />
          
          {/* Background decoration */}
          <div 
            className="absolute -right-12 -top-12 w-64 h-64 opacity-[0.03] pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgb(var(--color-accent-500)) 0%, transparent 70%)',
            }}
          />
          
          <div className="relative flex flex-col lg:flex-row items-start gap-6">
            {/* Left: Value Props */}
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-3">
                <div 
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ 
                    background: 'linear-gradient(135deg, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-600)) 100%)',
                    boxShadow: '0 2px 8px rgb(var(--color-accent-500) / 0.25)',
                  }}
                >
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn 
                      ? 'AI-Powered Market Intelligence' 
                      : 'Intelligence de marché propulsée par l\'IA'}
                  </h2>
                  <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'Compare with industry benchmarks' : 'Comparez avec les benchmarks de votre secteur'}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                {[
                  { en: 'AI-analyzed benchmarks', fr: 'Benchmarks analysés par IA' },
                  { en: 'Smart recommendations', fr: 'Recommandations intelligentes' },
                  { en: 'Competitive positioning', fr: 'Positionnement concurrentiel' },
                  { en: 'Industry insights', fr: 'Insights sectoriels' },
                ].map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-1.5 text-xs"
                    style={{ color: 'rgb(var(--color-text-secondary))' }}
                  >
                    <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgb(var(--color-primary-500))' }} />
                    {isEn ? item.en : item.fr}
                  </div>
                ))}
              </div>
              
              <button
                onClick={handleUpgradeClick}
                className="group inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-white text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{ 
                  background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
                  boxShadow: '0 2px 8px rgb(var(--color-primary-500) / 0.3)',
                }}
              >
                <Calendar className="w-3.5 h-3.5" />
                {isEn ? 'Schedule Demo' : 'Planifier une démo'}
                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
            
            {/* Right: Benchmark Preview */}
            <div 
              className="lg:w-64 w-full rounded-xl p-4"
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))',
                border: '1px solid rgb(var(--color-border))',
              }}
            >
              <div className="flex items-center gap-1.5 mb-3">
                <Sparkles className="w-3 h-3" style={{ color: 'rgb(var(--color-primary-500))' }} />
                <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Benchmark Preview' : 'Aperçu des benchmarks'}
                </span>
              </div>
              
              <div className="space-y-3">
                {[
                  { label: isEn ? 'Gross Margin' : 'Marge brute', value: '42%', icon: Percent, progress: 70 },
                  { label: isEn ? 'Net Margin' : 'Marge nette', value: '18%', icon: DollarSign, progress: 60 },
                  { label: isEn ? 'Current Ratio' : 'Ratio de liquidité', value: '2.1', icon: Scale, progress: 85 },
                ].map((metric, idx) => (
                  <div 
                    key={idx}
                    className="relative rounded-lg p-3 overflow-hidden"
                    style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <metric.icon className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
                        <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                          {metric.label}
                        </span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                        {metric.value}
                      </span>
                    </div>
                    <div 
                      className="h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'rgb(var(--color-border))' }}
                    >
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${metric.progress}%`,
                          backgroundColor: 'rgb(var(--color-primary-500))'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Industry Selector Teaser */}
        {currentTenant?.industry && (
          <div 
            className="rounded-xl border p-4"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              borderColor: 'rgb(var(--color-border))',
            }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ 
                  background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
                  boxShadow: '0 4px 12px -2px rgb(var(--color-primary-500) / 0.3)'
                }}
              >
                {(() => {
                  const TeaserIcon = INDUSTRY_LUCIDE_ICONS[currentTenant.industry] || Building2;
                  return <TeaserIcon className="w-5 h-5 text-white" />;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                  {INDUSTRY_NAMES[currentTenant.industry]?.[language] || currentTenant.industry}
                </h3>
                <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn 
                    ? 'Switch industries to compare across sectors. Upgrade to Pro to unlock.'
                    : 'Changez de secteur pour comparer entre industries. Passez à Pro pour débloquer.'}
                </p>
              </div>
              <div className="flex-shrink-0">
                <div 
                  className="px-3 py-1.5 rounded-lg text-xs font-medium opacity-50"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-bg-muted))',
                    color: 'rgb(var(--color-text-muted))',
                  }}
                >
                  <Lock className="w-3 h-3 inline mr-1" />
                  {isEn ? 'Locked' : 'Verrouillé'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with AI Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 flex-wrap" style={{ color: 'rgb(var(--color-text))' }}>
            <BarChart2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600 flex-shrink-0" />
            <span className="whitespace-nowrap">{isEn ? 'Market Analysis' : 'Analyse de marché'}</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r from-primary-500 to-primary-600 text-white whitespace-nowrap flex-shrink-0">
              <Brain className="w-3 h-3" />
              {isEn ? 'AI-Powered' : 'Propulsé par IA'}
            </span>
          </h1>
          <p className="mt-1 text-sm line-clamp-2 sm:line-clamp-none" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn 
              ? 'Compare your performance to industry benchmarks using AI-powered analysis'
              : 'Comparez vos performances aux benchmarks de votre secteur avec une analyse propulsée par IA'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || benchmarkLoading}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing || benchmarkLoading ? 'animate-spin' : ''}`} />
            {isEn ? 'Refresh' : 'Actualiser'}
          </button>
        </div>
      </div>

      {/* Organization Market Focus Banner - Only show if organization has industry set */}
      {currentTenant?.industry && (
        <div 
          className="rounded-xl border p-4"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            borderColor: 'rgb(var(--color-border))'
          }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <div 
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ 
                background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
                boxShadow: '0 4px 12px -2px rgb(var(--color-primary-500) / 0.3)'
              }}
            >
              {(() => {
                const ProBannerIcon = INDUSTRY_LUCIDE_ICONS[currentTenant.industry] || Building2;
                return <ProBannerIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />;
              })()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-base sm:text-lg" style={{ color: 'rgb(var(--color-text))' }}>
                  {currentTenant.name}
                </h2>
                <span 
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-primary-100))',
                    color: 'rgb(var(--color-primary-700))'
                  }}
                >
                  {INDUSTRY_NAMES[currentTenant.industry]?.[language] || currentTenant.industry}
                </span>
              </div>
              <p className="text-xs sm:text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn 
                  ? `Market benchmarks tailored to your ${INDUSTRY_NAMES[currentTenant.industry]?.en || 'industry'} business`
                  : `Benchmarks de marché adaptés à votre entreprise de ${INDUSTRY_NAMES[currentTenant.industry]?.fr || 'votre secteur'}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Industry & Business Size Selection */}
      <div className="rounded-xl border p-4 sm:p-6" style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}>
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          {/* Industry Selector */}
          <div className="flex-1">
            <label className="block text-xs sm:text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn ? 'Compare with Industry' : 'Comparer avec l\'industrie'}
            </label>
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ 
                  background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
                  boxShadow: '0 4px 12px -2px rgb(var(--color-primary-500) / 0.3)'
                }}
              >
                <IndustryIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <select
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  className="w-full rounded-lg text-sm sm:text-base py-2.5 px-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  style={{ 
                    borderColor: 'rgb(var(--color-border))',
                    backgroundColor: 'rgb(var(--color-surface))',
                    color: 'rgb(var(--color-text))'
                  }}
                >
                  {Object.entries(INDUSTRY_NAMES).map(([key, value]) => (
                    <option key={key} value={key}>
                      {isEn ? value.en : value.fr}
                      {currentTenant?.industry === key ? (isEn ? ' (Your Industry)' : ' (Votre secteur)') : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn 
                    ? `AI-analyzed data from ${(benchmark?.sampleSize || 5000).toLocaleString()}+ businesses`
                    : `Données analysées par IA de ${(benchmark?.sampleSize || 5000).toLocaleString()}+ entreprises`}
                </p>
              </div>
            </div>
          </div>

          {/* Revenue Range Selector */}
          <div className="lg:w-64">
            <label className="block text-xs sm:text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn ? 'Business Size' : 'Taille d\'entreprise'}
            </label>
            <select
              value={revenueRange}
              onChange={(e) => setRevenueRange(e.target.value as RevenueRange)}
              className="w-full rounded-lg text-sm sm:text-base py-2.5 px-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              style={{ 
                borderColor: 'rgb(var(--color-border))',
                backgroundColor: 'rgb(var(--color-surface))',
                color: 'rgb(var(--color-text))'
              }}
            >
              <option value="30k-5m">
                {isEn ? 'Small Business ($30K - $5M)' : 'Petite entreprise ($30K - $5M)'}
              </option>
              <option value="5m-20m">
                {isEn ? 'Medium Business ($5M - $20M)' : 'Moyenne entreprise ($5M - $20M)'}
              </option>
            </select>
          </div>
        </div>
        
        {/* Hint when viewing different industry */}
        {currentTenant?.industry && selectedIndustry !== currentTenant.industry && (
          <div 
            className="mt-4 p-3 rounded-lg flex items-start gap-2"
            style={{ 
              backgroundColor: 'rgb(var(--color-primary-50))',
              border: '1px solid rgb(var(--color-primary-200))'
            }}
          >
            <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-primary-600))' }} />
            <p className="text-xs sm:text-sm" style={{ color: 'rgb(var(--color-primary-700))' }}>
              {isEn 
                ? `Viewing ${industryName} benchmarks. Your organization is in ${INDUSTRY_NAMES[currentTenant.industry]?.[language] || currentTenant.industry}.`
                : `Affichage des benchmarks de ${industryName}. Votre organisation est dans le secteur ${INDUSTRY_NAMES[currentTenant.industry]?.fr || currentTenant.industry}.`}
              <button
                onClick={() => setSelectedIndustry(currentTenant.industry!)}
                className="ml-2 underline font-medium hover:no-underline"
                style={{ color: 'rgb(var(--color-primary-600))' }}
              >
                {isEn ? 'Switch back' : 'Revenir'}
              </button>
            </p>
          </div>
        )}
      </div>

      {/* Basic Benchmark Cards - Available to all users */}
      {legacyBenchmark && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <BenchmarkCard
            title={isEn ? 'Gross Margin' : 'Marge brute'}
            icon={<Percent className="w-5 h-5" />}
            userValue={userMetrics?.grossMargin}
            benchmark={legacyBenchmark.grossMargin}
            format="percentage"
            higherIsBetter={true}
            description={isEn 
              ? 'Gross profit as a percentage of revenue'
              : 'Profit brut en pourcentage des revenus'}
          />

          <BenchmarkCard
            title={isEn ? 'Net Margin' : 'Marge nette'}
            icon={<DollarSign className="w-5 h-5" />}
            userValue={userMetrics?.netMargin}
            benchmark={legacyBenchmark.netMargin}
            format="percentage"
            higherIsBetter={true}
            description={isEn 
              ? 'Net income as a percentage of revenue'
              : 'Bénéfice net en pourcentage des revenus'}
          />

          <BenchmarkCard
            title={isEn ? 'Current Ratio' : 'Ratio de liquidité'}
            icon={<Scale className="w-5 h-5" />}
            userValue={userMetrics?.currentRatio}
            benchmark={{ 
              q1: legacyBenchmark.currentRatio * 0.7, 
              median: legacyBenchmark.currentRatio, 
              q3: legacyBenchmark.currentRatio * 1.4 
            }}
            format="ratio"
            higherIsBetter={true}
            description={isEn 
              ? 'Ability to pay short-term obligations'
              : 'Capacité à payer les dettes à court terme'}
          />
        </div>
      )}

      {/* AI-Powered Insights Panel */}
      {userMetrics && benchmark && (
        <div className="rounded-xl border p-4 sm:p-6" style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}>
          <MarketInsightsPanel
            insights={aiInsights}
            overallScore={overallScore}
            industry={industryName}
            industryFr={industryNameFr}
            sampleSize={benchmark.sampleSize}
          />
        </div>
      )}

      {/* Additional Benchmark Cards */}
      {legacyBenchmark && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <BenchmarkCard
            title={isEn ? 'Debt-to-Equity' : 'Dette/Capitaux propres'}
            icon={<Target className="w-5 h-5" />}
            userValue={userMetrics?.debtToEquity}
            benchmark={{ 
              q1: legacyBenchmark.debtToEquity * 0.6, 
              median: legacyBenchmark.debtToEquity, 
              q3: legacyBenchmark.debtToEquity * 1.5 
            }}
            format="ratio"
            higherIsBetter={false}
            description={isEn 
              ? 'Leverage ratio comparing debt to equity'
              : 'Niveau d\'endettement par rapport aux capitaux propres'}
          />

          <BenchmarkCard
            title={isEn ? 'Operating Expense Ratio' : 'Ratio charges d\'exploitation'}
            icon={<BarChart2 className="w-5 h-5" />}
            userValue={userMetrics?.operatingExpenseRatio}
            benchmark={{ 
              q1: legacyBenchmark.operatingExpenseRatio * 0.8, 
              median: legacyBenchmark.operatingExpenseRatio, 
              q3: legacyBenchmark.operatingExpenseRatio * 1.2 
            }}
            format="percentage"
            higherIsBetter={false}
            description={isEn 
              ? 'Operating expenses as a percentage of revenue'
              : 'Dépenses d\'exploitation en pourcentage des revenus'}
          />

          <BenchmarkCard
            title={isEn ? 'YoY Growth' : 'Croissance annuelle'}
            icon={<TrendingUp className="w-5 h-5" />}
            userValue={null}
            benchmark={{ 
              q1: legacyBenchmark.revenueYoY * 0.5, 
              median: legacyBenchmark.revenueYoY, 
              q3: legacyBenchmark.revenueYoY * 2 
            }}
            format="percentage"
            higherIsBetter={true}
            description={isEn 
              ? 'Revenue growth over 12 months'
              : 'Croissance des revenus sur 12 mois'}
          />
        </div>
      )}

      {/* Detailed Industry Position */}
      {userMetrics && legacyBenchmark && (
        <div className="rounded-xl border p-4 sm:p-6" style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}>
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="flex items-center justify-between w-full text-left"
          >
            <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 flex-shrink-0" />
              <span className="whitespace-nowrap">{isEn ? 'Your Industry Position' : 'Votre position dans l\'industrie'}</span>
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500 flex-shrink-0" />
            </h2>
            {showComparison ? (
              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
            ) : (
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
            )}
          </button>

          {showComparison && (
            <div className="mt-4">
              <BenchmarkComparison
                userMetrics={userMetrics}
                benchmark={legacyBenchmark}
                industryName={industryName}
              />
            </div>
          )}
        </div>
      )}

      {/* Data Sources - Generic attribution */}
      <div className="rounded-xl border p-4" style={{ 
        background: 'linear-gradient(to right, rgb(var(--color-primary-50)), rgb(var(--color-primary-100)))',
        borderColor: 'rgb(var(--color-primary-200))'
      }}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgb(var(--color-primary-100))' }}>
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium flex items-center gap-2 text-sm sm:text-base" style={{ color: 'rgb(var(--color-primary-900))' }}>
              <span className="whitespace-nowrap">{isEn ? 'AI-Analyzed Benchmark Data' : 'Données de référence analysées par IA'}</span>
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500 flex-shrink-0" />
            </h3>
            <p className="mt-1 text-xs sm:text-sm" style={{ color: 'rgb(var(--color-primary-700))' }}>
              {isEn 
                ? 'Our AI aggregates and analyzes data from public and private sources to provide accurate industry benchmarks. Data is updated monthly to ensure relevance.'
                : 'Notre IA agrège et analyse des données provenant de sources publiques et privées pour fournir des benchmarks sectoriels précis. Les données sont mises à jour mensuellement.'}
            </p>
            <p className="mt-2 text-[10px] sm:text-xs" style={{ color: 'rgb(var(--color-primary-600))' }}>
              {isEn 
                ? `Reference year: ${benchmark?.referenceYear || 2023} • Last updated: ${new Date().toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA', { month: 'long', year: 'numeric' })}`
                : `Année de référence: ${benchmark?.referenceYear || 2023} • Dernière mise à jour: ${new Date().toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' })}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
