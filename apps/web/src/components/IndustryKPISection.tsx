/**
 * Industry KPI Section Component - Runway-Style Dashboard
 * Interactive showcase with animated charts and clear ROI for executives
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Sparkles,
  ArrowRight,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../contexts/ThemeContext';
import KPICard from './KPICard';
import { useHasRealData } from '../hooks/useHasRealData';
import { INDUSTRY_KPIS, type IndustryData, type KPIDefinition } from '../lib/industryBenchmarkDisplay';

// Theme colors - Corporate green palette (consistent with Landing page)
const colors = {
  green: '#059669',      // emerald-600 - primary corporate green
  greenDark: '#047857',  // emerald-700 - darker for depth
  greenLight: '#10b981', // emerald-500 - lighter accents
  gold: '#d4af37',       // classic gold
  goldDark: '#b8860b',   // darker gold
};

// =====================================================
// ANIMATED HOOKS & COMPONENTS
// =====================================================

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, [threshold]);
  
  return { ref, isInView };
}

// Re-export INDUSTRY_KPIS for backward compatibility
export { INDUSTRY_KPIS };
// =====================================================

interface IndustryKPISectionProps {
  onScheduleCall?: () => void;
}

export default function IndustryKPISection({ onScheduleCall }: IndustryKPISectionProps) {
  const { language } = useI18n();
  const { resolvedTheme } = useTheme();
  const isEn = language === 'en';
  const isDark = resolvedTheme === 'dark';
  const { hasRealData, shouldShowSandboxData } = useHasRealData();
  const [selectedIndustry, setSelectedIndustry] = useState<string>('real_estate');
  const [hoveredKpi, setHoveredKpi] = useState<number | null>(null);
  const { ref: sectionRef, isInView } = useInView(0.1);
  
  // Only show industry KPIs if we have real data or should show sandbox data (free users only)
  if (!hasRealData && !shouldShowSandboxData) {
    return null;
  }
  
  const currentIndustry = INDUSTRY_KPIS.find(ind => ind.id === selectedIndustry) || INDUSTRY_KPIS[0];
  
  // Safety check - if no industry data found, don't render
  if (!currentIndustry) {
    return null;
  }
  
  const Icon = currentIndustry.icon;
  
  // Format value for display
  const formatValue = (value: number | null | undefined, name: string): string => {
    const numValue = value ?? 0;
    if (isNaN(numValue) || !isFinite(numValue)) return '—';
    
    if (name.includes('Revenue') || name.includes('NOI') || name.includes('Revenus')) {
      return `$${(numValue / 1000).toFixed(0)}K`;
    }
    if (name.includes('Rate') || name.includes('Taux') || name.includes('%') || name.includes('Margin') || name.includes('Marge')) {
      return `${numValue}%`;
    }
    if (name.includes('ADR') || name.includes('TJM') || name.includes('Effective') || name.includes('effectif')) {
      return `$${numValue}`;
    }
    return `${numValue}`;
  };
  
  return (
    <section 
      ref={sectionRef}
      id="industry-kpis" 
      className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8"
      style={{ 
        background: isDark 
          ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.8) 100%)' 
          : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 50%, #ffffff 100%)'
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div 
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold mb-3"
            style={{ 
              background: `${colors.gold}${isDark ? '25' : '15'}`,
              border: `1px solid ${colors.gold}${isDark ? '40' : '25'}`,
              color: isDark ? colors.gold : colors.goldDark
            }}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            {isEn ? 'Industry Benchmarks' : 'Références sectorielles'}
          </div>
          
          <h2 
            className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3"
            style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
          >
            {isEn ? 'Beat Your Industry Benchmarks' : 'Dépassez les références de votre secteur'}
          </h2>
          
          <p 
            className="text-sm sm:text-base max-w-2xl mx-auto"
            style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
          >
            {isEn 
              ? 'See exactly where you stand vs. industry leaders. Identify the KPIs dragging down your margins and fix them.'
              : 'Voyez exactement où vous vous situez vs les leaders du secteur. Identifiez les KPIs qui réduisent vos marges et corrigez-les.'}
          </p>
        </div>
        
        {/* Industry Selector */}
        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mb-4 sm:mb-6 px-2">
          {INDUSTRY_KPIS.map((industry) => {
            const TabIcon = industry.icon;
            const isSelected = selectedIndustry === industry.id;
            
            return (
              <button
                key={industry.id}
                onClick={() => setSelectedIndustry(industry.id)}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold transition-all duration-200"
                style={{
                  backgroundColor: isSelected ? colors.green : (isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.95)'),
                  color: isSelected ? 'white' : (isDark ? 'rgb(226, 232, 240)' : 'rgb(51, 65, 85)'),
                  border: `1px solid ${isSelected ? colors.green : (isDark ? 'rgba(100, 116, 139, 0.5)' : 'rgba(229, 231, 235, 0.8)')}`,
                  boxShadow: isSelected 
                    ? `0 4px 12px ${colors.green}40` 
                    : (isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.08)'),
                }}
              >
                <TabIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" color={isSelected ? 'white' : colors.green} />
                <span className="hidden min-[375px]:inline">
                  {isEn ? industry.name.en.split('/')[0].trim() : industry.name.fr.split('/')[0].trim()}
                </span>
              </button>
            );
          })}
        </div>
        
        {/* Dashboard Container */}
        <div 
          className="rounded-2xl overflow-hidden shadow-2xl"
          style={{ 
            backgroundColor: isDark ? 'rgb(30, 41, 59)' : 'rgba(255, 255, 255, 0.98)',
            border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.6)' : 'rgba(229, 231, 235, 0.8)'}`,
            boxShadow: isDark 
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' 
              : '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
          }}
        >
          {/* Browser Chrome */}
          <div 
            className="h-10 flex items-center px-4 gap-3 border-b"
            style={{ 
              backgroundColor: isDark ? 'rgb(15, 23, 42)' : 'rgba(248, 250, 252, 0.98)',
              borderColor: isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(229, 231, 235, 0.6)'
            }}
          >
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ef4444' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.gold }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.green }} />
            </div>
            
            {/* Industry Name */}
            <div className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 min-w-0">
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" color={colors.green} />
              <span className="text-[10px] sm:text-[11px] font-semibold truncate" style={{ color: isDark ? 'rgb(226, 232, 240)' : 'rgb(51, 65, 85)' }}>
                {isEn ? currentIndustry.name.en : currentIndustry.name.fr}
              </span>
            </div>
            
            {/* Live indicator */}
            <div 
              className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-[9px] font-medium flex-shrink-0"
              style={{ backgroundColor: `${colors.green}15`, color: colors.green }}
            >
              <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: colors.green }} />
              <span className="hidden min-[375px]:inline">{isEn ? 'Live Data' : 'Données en direct'}</span>
            </div>
          </div>
          
          {/* Main Content */}
          <div 
            className="p-4 sm:p-6"
            style={{
              backgroundColor: isDark ? 'rgb(30, 41, 59)' : 'rgba(255, 255, 255, 0.98)',
            }}
          >
            {/* ROI Highlight Banner */}
            <div 
              className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg sm:rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4"
              style={{ 
                background: isDark 
                  ? `linear-gradient(135deg, ${colors.gold}35 0%, ${colors.green}25 100%)`
                  : `linear-gradient(135deg, ${colors.gold}20 0%, ${colors.green}12 100%)`,
                border: `1px solid ${isDark ? `${colors.gold}70` : `${colors.gold}40`}`,
                boxShadow: isDark 
                  ? `0 4px 20px ${colors.gold}20` 
                  : `0 4px 20px ${colors.gold}10`
              }}
            >
              <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-start">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div 
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ 
                      backgroundColor: `${colors.gold}30`,
                      boxShadow: `0 2px 8px ${colors.gold}20`
                    }}
                  >
                    <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: colors.gold }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider" style={{ color: isDark ? 'rgb(203, 213, 225)' : 'rgb(100, 116, 139)' }}>
                      {isEn ? 'ROI Highlight' : 'Point ROI'}
                    </p>
                    <p className="text-sm sm:text-base font-bold truncate" style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}>
                      {isEn ? currentIndustry.roiHighlight.en : currentIndustry.roiHighlight.fr}
                    </p>
                  </div>
                </div>
                <div 
                  className="text-xl sm:text-2xl lg:text-3xl font-bold flex-shrink-0"
                  style={{ color: colors.gold }}
                >
                  {currentIndustry.roiValue}
                </div>
              </div>
            </div>
            
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-5">
              {currentIndustry.kpis.map((kpi, idx) => {
                const isOnTarget = kpi.currentValue >= kpi.targetValue * 0.95 || 
                  (kpi.name.includes('Cost') && kpi.currentValue <= kpi.targetValue * 1.05) ||
                  (kpi.name.includes('Days') && kpi.currentValue <= kpi.targetValue);
                
                const isGoodWhenDown = kpi.name.includes('Cost') || kpi.name.includes('Days') || 
                  kpi.name.includes('Coût') || kpi.name.includes('Jours');
                
                return (
                  <KPICard
                    key={idx}
                    id={`kpi-${idx}`}
                    label={isEn ? kpi.name : kpi.nameFr}
                    value={formatValue(kpi.currentValue, kpi.name)}
                    target={`${isEn ? 'Target:' : 'Cible:'} ${kpi.target}`}
                    change={kpi.trendValue}
                    trend={kpi.trend}
                    isGoodWhenDown={isGoodWhenDown}
                    chartData={kpi.chartData}
                    benchmarkData={kpi.industryBenchmark}
                    impact={isEn ? kpi.impact : kpi.impactFr}
                    isOnTarget={isOnTarget}
                    isEn={isEn}
                    isHovered={hoveredKpi === idx}
                    onHoverChange={(hovered) => setHoveredKpi(hovered ? idx : null)}
                    isVisible={isInView}
                    animateChart={true}
                  />
                );
              })}
            </div>
            
            {/* Formula Builder - Spreadsheet Style */}
            <div 
              className="rounded-xl overflow-hidden shadow-lg"
              style={{ 
                backgroundColor: isDark ? 'rgb(51, 65, 85)' : 'rgba(255, 255, 255, 0.98)',
                border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.7)' : 'rgba(229, 231, 235, 0.8)'}`,
                boxShadow: isDark 
                  ? '0 4px 20px rgba(0, 0, 0, 0.4)' 
                  : '0 4px 20px rgba(0, 0, 0, 0.08)'
              }}
            >
              {/* Header with tabs */}
              <div 
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 px-3 sm:px-4 py-2.5 sm:py-3 border-b"
                style={{ 
                  borderColor: isDark ? 'rgba(71, 85, 105, 0.6)' : 'rgba(229, 231, 235, 0.8)',
                  backgroundColor: isDark ? 'rgb(30, 41, 59)' : 'rgba(248, 250, 252, 0.95)'
                }}
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div 
                    className="p-1 sm:p-1.5 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: `${colors.green}20` }}
                  >
                    <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: colors.green }} />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold" style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}>
                    {isEn ? 'Formula Builder' : 'Constructeur de formules'}
                  </span>
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span 
                    className="text-[9px] sm:text-[10px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md font-medium"
                    style={{ backgroundColor: `${colors.green}20`, color: colors.green }}
                  >
                    {isEn ? 'Pre-built' : 'Pré-définies'}
                  </span>
                  <span 
                    className="text-[9px] sm:text-[10px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md font-medium"
                    style={{ backgroundColor: `${colors.gold}20`, color: colors.gold }}
                  >
                    {isEn ? 'Custom' : 'Personnalisées'}
                  </span>
                </div>
              </div>
              
              {/* Spreadsheet-like grid */}
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="min-w-[320px] sm:min-w-[500px]">
                  {/* Column headers */}
                  <div 
                    className="grid text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-3 sm:px-4 py-2 sm:py-2.5"
                    style={{ 
                      gridTemplateColumns: 'minmax(100px, 1.5fr) minmax(120px, 2fr) minmax(60px, 80px) minmax(40px, 60px)',
                      backgroundColor: isDark ? 'rgb(71, 85, 105)' : 'rgba(241, 245, 249, 1)',
                      color: isDark ? 'rgb(248, 250, 252)' : 'rgb(71, 85, 105)',
                      borderBottom: `1px solid ${isDark ? 'rgba(100, 116, 139, 0.5)' : 'rgba(229, 231, 235, 0.8)'}`
                    }}
                  >
                    <span className="text-left truncate">{isEn ? 'Metric' : 'Métrique'}</span>
                    <span className="text-left truncate">{isEn ? 'Formula' : 'Formule'}</span>
                    <span className="text-left truncate">{isEn ? 'Target' : 'Cible'}</span>
                    <span></span>
                  </div>
                  
                  {/* Formula rows */}
                  {currentIndustry.kpis.map((kpi, idx) => (
                    <div 
                      key={idx}
                      className="grid items-center px-3 sm:px-4 py-2 sm:py-3 border-b transition-all duration-200 cursor-pointer group"
                      style={{ 
                        gridTemplateColumns: 'minmax(100px, 1.5fr) minmax(120px, 2fr) minmax(60px, 80px) minmax(40px, 60px)',
                        borderColor: isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.6)',
                        backgroundColor: hoveredKpi === idx 
                          ? (isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(241, 245, 249, 1)')
                          : (isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(255, 255, 255, 0.5)')
                      }}
                      onMouseEnter={() => setHoveredKpi(idx)}
                      onMouseLeave={() => setHoveredKpi(null)}
                    >
                      <span 
                        className="text-[9px] sm:text-[10px] font-semibold text-left leading-tight line-clamp-2"
                        style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
                        title={isEn ? kpi.name : kpi.nameFr}
                      >
                        {isEn ? kpi.name : kpi.nameFr}
                      </span>
                      <div className="flex items-center gap-1 sm:gap-1.5 justify-start min-w-0">
                        <code 
                          className="text-[8px] sm:text-[9px] px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-md font-mono font-medium leading-tight"
                          title={kpi.formula}
                          style={{ 
                            backgroundColor: isDark ? 'rgba(30, 41, 59, 1)' : 'rgba(241, 245, 249, 1)',
                            color: isDark ? colors.greenLight : colors.green,
                            border: `1px solid ${isDark ? 'rgba(100, 116, 139, 0.8)' : 'rgba(203, 213, 225, 0.8)'}`,
                            boxShadow: isDark ? 'inset 0 1px 2px rgba(0,0,0,0.2)' : 'inset 0 1px 2px rgba(0,0,0,0.05)'
                          }}
                        >
                          {kpi.formula}
                        </code>
                      </div>
                      <span 
                        className="text-[8px] sm:text-[9px] px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-semibold text-left inline-block whitespace-nowrap"
                        style={{ 
                          backgroundColor: isDark ? `${colors.green}30` : `${colors.green}18`,
                          color: isDark ? colors.greenLight : colors.green
                        }}
                        title={kpi.target}
                      >
                        {kpi.target}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="p-1 sm:p-1.5 rounded-md transition-colors"
                          style={{ backgroundColor: `${colors.gold}20`, color: colors.gold }}
                          title={isEn ? 'Edit formula' : 'Modifier'}
                        >
                          <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Add custom formula row */}
                  <div 
                    className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3.5 cursor-pointer transition-all duration-200 hover:bg-opacity-80"
                    style={{ 
                      backgroundColor: isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(248, 250, 252, 0.8)',
                    }}
                  >
                    <div 
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center transition-colors flex-shrink-0"
                      style={{ 
                        border: `2px dashed ${isDark ? 'rgba(148, 163, 184, 0.6)' : 'rgba(148, 163, 184, 0.8)'}`,
                        color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)'
                      }}
                    >
                      <span className="text-xs sm:text-sm font-bold">+</span>
                    </div>
                    <span 
                      className="text-[10px] sm:text-[11px] font-medium truncate"
                      style={{ color: isDark ? 'rgb(203, 213, 225)' : 'rgb(100, 116, 139)' }}
                    >
                      {isEn ? 'Add custom formula...' : 'Ajouter une formule personnalisée...'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Benchmark Note */}
              {(currentIndustry.profitNote || currentIndustry.benchmarkNote) && (
                <div 
                  className="px-4 py-3.5 flex items-start gap-2.5"
                  style={{ 
                    borderTop: `1px solid ${isDark ? 'rgba(100, 116, 139, 0.5)' : 'rgba(229, 231, 235, 0.8)'}`,
                    backgroundColor: isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(248, 250, 252, 0.9)'
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: isDark ? '#fbbf24' : colors.gold }} />
                  <p className="text-[11px] font-medium" style={{ color: isDark ? 'rgb(226, 232, 240)' : 'rgb(71, 85, 105)' }}>
                    {isEn 
                      ? (currentIndustry.profitNote?.en || currentIndustry.benchmarkNote?.en)
                      : (currentIndustry.profitNote?.fr || currentIndustry.benchmarkNote?.fr)
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Industry Note + CTA */}
        <div className="mt-8 text-center">
          <p 
            className="text-xs sm:text-sm mb-5 max-w-2xl mx-auto"
            style={{ color: isDark ? 'rgb(203, 213, 225)' : 'rgb(100, 116, 139)' }}
          >
            <Sparkles className="w-3.5 h-3.5 inline mr-1.5" style={{ color: isDark ? colors.greenLight : colors.green }} />
            {isEn 
              ? 'AI-optimized for 15+ Canadian industries: Real Estate, Restaurant, Hospitality, Construction, Retail, Professional Services, Manufacturing, Transport, Agriculture, and more.'
              : 'IA optimisée pour plus de 15 industries canadiennes: Immobilier, Restauration, Hôtellerie, Construction, Commerce de détail, Services professionnels, Fabrication, Transport, Agriculture, et plus.'}
          </p>
          
          <button 
            onClick={onScheduleCall}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105 text-sm group"
            style={{ 
              background: `linear-gradient(135deg, ${colors.green} 0%, ${colors.greenDark} 100%)`,
              boxShadow: `0 4px 16px ${colors.green}35`
            }}
          >
            {isEn ? 'See your industry benchmarks free' : 'Voyez vos benchmarks sectoriels gratuitement'}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
}

export type { IndustryData, KPIDefinition };
