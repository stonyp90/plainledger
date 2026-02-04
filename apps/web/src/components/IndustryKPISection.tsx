/**
 * Industry KPI Section Component - Linear/Notion-Style Design
 * Clean, minimal interface with refined interactions
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Sparkles,
  Check,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../contexts/ThemeContext';
import { INDUSTRY_KPIS, type IndustryData, type KPIDefinition } from '../lib/industryBenchmarkDisplay';

// Re-export INDUSTRY_KPIS for backward compatibility
export { INDUSTRY_KPIS };

// =====================================================
// HOOKS
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

// =====================================================
// MAIN COMPONENT
// =====================================================

interface IndustryKPISectionProps {
  onScheduleCall?: () => void;
}

export default function IndustryKPISection({ onScheduleCall }: IndustryKPISectionProps) {
  const { language } = useI18n();
  const { resolvedTheme } = useTheme();
  const isEn = language === 'en';
  const isDark = resolvedTheme === 'dark';
  
  const [selectedIndustry, setSelectedIndustry] = useState<string>('hospitality');
  const [hoveredKpi, setHoveredKpi] = useState<number | null>(null);
  const { ref: sectionRef, isInView } = useInView(0.1);
  
  // Filter to only show 5 target industries
  const TARGET_INDUSTRIES = ['hospitality', 'real_estate', 'restaurant', 'construction', 'retail'];
  const filteredIndustries = INDUSTRY_KPIS.filter(ind => TARGET_INDUSTRIES.includes(ind.id))
    .sort((a, b) => TARGET_INDUSTRIES.indexOf(a.id) - TARGET_INDUSTRIES.indexOf(b.id));
  
  const defaultIndustry = filteredIndustries[0]?.id || 'hospitality';
  const validSelectedIndustry = TARGET_INDUSTRIES.includes(selectedIndustry) ? selectedIndustry : defaultIndustry;
  const currentIndustry = filteredIndustries.find(ind => ind.id === validSelectedIndustry) || filteredIndustries[0];
  
  if (!currentIndustry) {
    return null;
  }
  
  const Icon = currentIndustry.icon;
  
  return (
    <section 
      ref={sectionRef}
      id="industry-kpis" 
      className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8"
      style={{ 
        background: isDark 
          ? 'linear-gradient(180deg, rgb(15, 23, 42) 0%, rgb(23, 30, 48) 100%)' 
          : 'linear-gradient(180deg, #fafafa 0%, #ffffff 100%)'
      }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Section Header - Clean & Minimal */}
        <div 
          className={`text-center mb-10 sm:mb-12 transition-all duration-700 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          {/* Section Label Badge */}
          <div className="flex justify-center mb-4">
            <span 
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
              style={{ 
                backgroundColor: `rgb(var(--color-accent-400) / ${isDark ? '0.15' : '0.12'})`,
                color: `rgb(var(--color-accent-${isDark ? '400' : '600'}))`,
                border: `1px solid rgb(var(--color-accent-${isDark ? '400' : '500'}) / ${isDark ? '0.3' : '0.25'})`
              }}
            >
              <Sparkles className="w-3 h-3" />
              {isEn ? 'Industry Benchmarks' : 'Références sectorielles'}
            </span>
          </div>
          
          {/* Main heading - H1 for SEO */}
          <h1 
            className="text-2xl sm:text-3xl lg:text-[2.5rem] font-semibold tracking-tight mb-4"
            style={{ 
              color: isDark ? 'rgb(248, 250, 252)' : 'rgb(15, 23, 42)',
              lineHeight: 1.2
            }}
          >
            {isEn ? 'Beat your industry benchmarks' : 'Dépassez les références de votre secteur'}
          </h1>
          
          <p 
            className="text-sm sm:text-base max-w-xl mx-auto leading-relaxed"
            style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
          >
            {isEn 
              ? 'Track the KPIs that matter most for your industry with pre-built formulas validated by experts.'
              : 'Suivez les KPIs les plus importants pour votre secteur avec des formules préétablies validées par des experts.'}
          </p>
        </div>
        
        {/* Industry Tabs - Minimal Pills */}
        <div 
          className={`flex flex-wrap justify-center gap-1.5 sm:gap-2 mb-8 sm:mb-10 transition-all duration-700 delay-100 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          {filteredIndustries.map((industry) => {
            const TabIcon = industry.icon;
            const isSelected = validSelectedIndustry === industry.id;
            
            return (
              <button
                key={industry.id}
                onClick={() => setSelectedIndustry(industry.id)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-[11px] sm:text-xs font-medium transition-all duration-200"
                style={{
                  backgroundColor: isSelected 
                    ? (isDark ? 'rgb(248, 250, 252)' : 'rgb(15, 23, 42)') 
                    : 'transparent',
                  color: isSelected 
                    ? (isDark ? 'rgb(15, 23, 42)' : 'rgb(255, 255, 255)') 
                    : (isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)'),
                  border: `1px solid ${isSelected 
                    ? 'transparent' 
                    : (isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(226, 232, 240, 1)')}`,
                }}
              >
                <TabIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden min-[400px]:inline">
                  {isEn ? industry.name.en.split('/')[0].trim() : industry.name.fr.split('/')[0].trim()}
                </span>
              </button>
            );
          })}
        </div>
        
        {/* Main Card Container */}
        <div 
          className={`rounded-2xl overflow-hidden transition-all duration-700 delay-200 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ 
            backgroundColor: isDark ? 'rgb(30, 41, 59)' : 'rgb(255, 255, 255)',
            border: `1px solid ${isDark ? 'rgba(51, 65, 85, 0.8)' : 'rgba(226, 232, 240, 1)'}`,
            borderTop: `2px solid ${isDark ? '#fbbf24' : '#d97706'}`,
            boxShadow: isDark 
              ? '0 0 0 1px rgba(51, 65, 85, 0.5), 0 24px 48px -12px rgba(0, 0, 0, 0.5), 0 -1px 12px rgba(251, 191, 36, 0.1)' 
              : '0 0 0 1px rgba(226, 232, 240, 0.5), 0 24px 48px -12px rgba(0, 0, 0, 0.08), 0 -1px 12px rgba(217, 119, 6, 0.08)',
          }}
        >
          {/* Card Header - Clean Status Bar */}
          <div 
            className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4"
            style={{ 
              borderBottom: `1px solid ${isDark ? 'rgba(51, 65, 85, 0.8)' : 'rgba(226, 232, 240, 1)'}`,
            }}
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <Icon 
                className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" 
                style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }} 
              />
              <span 
                className="text-xs sm:text-sm font-medium truncate"
                style={{ color: isDark ? 'rgb(226, 232, 240)' : 'rgb(51, 65, 85)' }}
              >
                {isEn ? currentIndustry.name.en : currentIndustry.name.fr}
              </span>
            </div>
            
            {/* Live indicator */}
            <div className="flex items-center gap-1.5">
              <span 
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: '#10b981' }}
              />
              <span 
                className="text-[10px] sm:text-[11px] font-medium"
                style={{ color: '#10b981' }}
              >
                {isEn ? 'Live' : 'Direct'}
              </span>
            </div>
          </div>
          
          {/* Formula Header */}
          <div 
            className="px-4 sm:px-5 py-4 sm:py-5"
            style={{ 
              borderBottom: `1px solid ${isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.8)'}`,
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 
                  className="text-sm sm:text-base font-semibold mb-1"
                  style={{ color: isDark ? 'rgb(248, 250, 252)' : 'rgb(15, 23, 42)' }}
                >
                  {isEn ? 'Industry-optimized formulas' : 'Formules optimisées par secteur'}
                </h3>
                <p 
                  className="text-[11px] sm:text-xs"
                  style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
                >
                  {isEn ? 'Maintained and validated by industry experts' : 'Maintenues et validées par des experts du secteur'}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <span 
                  className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] px-2.5 py-1.5 rounded-md font-medium"
                  style={{ 
                    backgroundColor: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(241, 245, 249, 1)',
                    color: isDark ? 'rgb(203, 213, 225)' : 'rgb(71, 85, 105)',
                  }}
                >
                  <kbd 
                    className="px-1 py-0.5 rounded text-[9px] font-mono"
                    style={{ 
                      backgroundColor: isDark ? 'rgba(30, 41, 59, 1)' : 'rgba(255, 255, 255, 1)',
                      border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 1)'}`,
                    }}
                  >
                    Tab
                  </kbd>
                  {isEn ? 'Autocomplete' : 'Autocomplétion'}
                </span>
                <span 
                  className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] px-2.5 py-1.5 rounded-md font-medium"
                  style={{ 
                    backgroundColor: isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(245, 158, 11, 0.1)',
                    color: isDark ? '#fbbf24' : '#b45309',
                  }}
                >
                  <Sparkles className="w-3 h-3" />
                  {isEn ? '50+ Prebuilt' : '50+ Préétablies'}
                </span>
              </div>
            </div>
          </div>
          
          {/* KPI List - Clean Rows */}
          <div className="divide-y" style={{ borderColor: isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.6)' }}>
            {currentIndustry.kpis.map((kpi, idx) => (
              <div 
                key={idx}
                className="group relative px-4 sm:px-5 py-4 sm:py-5 transition-colors duration-150"
                style={{ 
                  backgroundColor: hoveredKpi === idx 
                    ? (isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(248, 250, 252, 1)')
                    : 'transparent',
                }}
                onMouseEnter={() => setHoveredKpi(idx)}
                onMouseLeave={() => setHoveredKpi(null)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  {/* Left: Name + Formula */}
                  <div className="flex-1 min-w-0">
                    {/* Metric Name with Check */}
                    <div className="flex items-center gap-2 mb-2.5">
                      <span 
                        className="text-sm font-medium"
                        style={{ color: isDark ? 'rgb(248, 250, 252)' : 'rgb(15, 23, 42)' }}
                      >
                        {isEn ? kpi.name : kpi.nameFr}
                      </span>
                      <div 
                        className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)' }}
                      >
                        <Check className="w-2.5 h-2.5" style={{ color: '#10b981' }} strokeWidth={3} />
                      </div>
                    </div>
                    
                    {/* Formula Display */}
                    <div 
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ 
                        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(248, 250, 252, 1)',
                        border: `1px solid ${isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 1)'}`,
                      }}
                    >
                      <span 
                        className="text-xs font-medium"
                        style={{ color: isDark ? 'rgb(100, 116, 139)' : 'rgb(148, 163, 184)' }}
                      >
                        =
                      </span>
                      <code 
                        className="text-xs sm:text-sm font-mono font-medium"
                        style={{ color: '#10b981' }}
                      >
                        {kpi.formula}
                      </code>
                    </div>
                  </div>
                  
                  {/* Right: Target */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p 
                        className="text-[10px] font-medium uppercase tracking-wide mb-1.5"
                        style={{ color: isDark ? 'rgb(100, 116, 139)' : 'rgb(148, 163, 184)' }}
                      >
                        {isEn ? 'Target' : 'Cible'}
                      </p>
                      <span 
                        className="inline-block text-xs sm:text-sm px-3 py-1.5 rounded-lg font-semibold"
                        style={{ 
                          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                          color: '#10b981',
                        }}
                      >
                        {kpi.target}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Add Custom Formula Row */}
            <button 
              className="w-full px-4 sm:px-5 py-4 flex items-center justify-center gap-2 transition-colors duration-150 group/add"
              style={{ 
                backgroundColor: isDark ? 'rgba(51, 65, 85, 0.15)' : 'rgba(248, 250, 252, 0.5)',
              }}
            >
              <div 
                className="w-5 h-5 rounded-md flex items-center justify-center transition-colors"
                style={{ 
                  backgroundColor: isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(226, 232, 240, 1)',
                  border: `1px dashed ${isDark ? 'rgba(100, 116, 139, 0.5)' : 'rgba(148, 163, 184, 0.6)'}`,
                }}
              >
                <Plus 
                  className="w-3 h-3" 
                  style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }} 
                />
              </div>
              <span 
                className="text-xs font-medium"
                style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
              >
                {isEn ? 'Add custom formula' : 'Ajouter une formule personnalisée'}
              </span>
            </button>
          </div>
          
          {/* Footer Note */}
          <div 
            className="px-4 sm:px-5 py-3.5 flex items-center gap-2.5"
            style={{ 
              backgroundColor: isDark ? 'rgba(51, 65, 85, 0.25)' : 'rgba(248, 250, 252, 0.8)',
              borderTop: `1px solid ${isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.8)'}`,
            }}
          >
            <Sparkles 
              className="w-3.5 h-3.5 flex-shrink-0" 
              style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }} 
            />
            <p 
              className="text-[11px] sm:text-xs"
              style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
            >
              {isEn 
                ? (currentIndustry.benchmarkNote?.en || currentIndustry.profitNote?.en || `Optimized for ${currentIndustry.name.en} industry standards`)
                : (currentIndustry.benchmarkNote?.fr || currentIndustry.profitNote?.fr || `Optimisé pour les standards de l'industrie ${currentIndustry.name.fr}`)
              }
            </p>
          </div>
        </div>
        
        {/* Bottom CTA */}
        <div 
          className={`mt-10 sm:mt-12 text-center transition-all duration-700 delay-300 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <p 
            className="text-xs sm:text-sm mb-5 max-w-lg mx-auto"
            style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
          >
            {isEn 
              ? 'AI-optimized for 15+ Canadian industries including Real Estate, Restaurant, Hospitality, Construction, and more.'
              : 'IA optimisée pour plus de 15 industries canadiennes incluant Immobilier, Restauration, Hôtellerie, Construction, et plus.'}
          </p>
          
          <button 
            onClick={onScheduleCall}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-200 hover:gap-3 group"
            style={{ 
              background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
              color: 'rgb(255, 255, 255)',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            }}
          >
            {isEn ? 'See your industry benchmarks' : 'Voyez vos benchmarks sectoriels'}
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </section>
  );
}

export type { IndustryData, KPIDefinition };
