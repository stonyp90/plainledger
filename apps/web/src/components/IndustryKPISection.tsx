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
  const [isMobile, setIsMobile] = useState(false);
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);
  const { ref: sectionRef, isInView } = useInView(0.1);

  // Detect screen size
  useEffect(() => {
    const checkSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);
    };
    
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  // Check scroll position for fade indicators
  useEffect(() => {
    const checkScroll = () => {
      if (!tabsScrollRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = tabsScrollRef.current;
      setShowLeftFade(scrollLeft > 10);
      setShowRightFade(scrollLeft < scrollWidth - clientWidth - 10);
    };
    
    const scrollEl = tabsScrollRef.current;
    if (scrollEl) {
      scrollEl.addEventListener('scroll', checkScroll);
      checkScroll();
      return () => scrollEl.removeEventListener('scroll', checkScroll);
    }
  }, [selectedIndustry]);
  
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
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ 
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.95)',
                color: isDark ? 'rgb(226, 232, 240)' : 'rgb(71, 85, 105)',
                border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.8)'}`,
                boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-accent-500))' }} />
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
        
        {/* Industry Tabs - Horizontal scroll with fade indicators */}
        <div 
          className={`relative mb-8 sm:mb-10 transition-all duration-700 delay-100 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          {/* Left fade indicator */}
          {showLeftFade && (
            <div 
              className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
              style={{
                background: `linear-gradient(to right, ${isDark ? 'rgb(15, 23, 42)' : '#fafafa'} 0%, transparent 100%)`
              }}
            />
          )}
          {/* Right fade indicator */}
          {showRightFade && (
            <div 
              className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
              style={{
                background: `linear-gradient(to left, ${isDark ? 'rgb(15, 23, 42)' : '#fafafa'} 0%, transparent 100%)`
              }}
            />
          )}
          <div 
            ref={tabsScrollRef}
            className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide scroll-smooth px-2"
            style={{ scrollSnapType: 'x proximity' }}
          >
            {filteredIndustries.map((industry) => {
              const TabIcon = industry.icon;
              const isSelected = validSelectedIndustry === industry.id;
              
              return (
                <button
                  key={industry.id}
                  onClick={() => setSelectedIndustry(industry.id)}
                  className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-sm font-medium transition-all duration-300 flex-shrink-0 ${
                    isSelected 
                      ? 'shadow-lg scale-[1.02]' 
                      : 'hover:scale-[1.02]'
                  }`}
                  style={{
                    backgroundColor: isSelected 
                      ? `rgb(var(--color-accent-${isDark ? '500' : '600'}))` 
                      : (isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(241, 245, 249, 0.9)'),
                    color: isSelected 
                      ? 'rgb(255, 255, 255)' 
                      : (isDark ? 'rgb(203, 213, 225)' : 'rgb(71, 85, 105)'),
                    border: isSelected 
                      ? 'none' 
                      : `1px solid ${isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.6)'}`,
                    boxShadow: isSelected 
                      ? `0 4px 14px rgba(var(--color-accent-500), 0.4)` 
                      : 'none',
                    scrollSnapAlign: 'start',
                  }}
                >
                  <TabIcon className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden min-[400px]:inline whitespace-nowrap">
                    {isEn ? industry.name.en.split('/')[0].trim() : industry.name.fr.split('/')[0].trim()}
                  </span>
                </button>
              );
            })}
          </div>
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
          
          {/* KPI List - Full text visible, clean tooltip on hover */}
          <div className="divide-y" style={{ borderColor: isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.6)' }}>
            {currentIndustry.kpis.map((kpi, idx) => (
              <div 
                key={idx}
                className="group relative px-4 sm:px-5 py-3 sm:py-3.5 transition-all duration-200 cursor-default"
                style={{ 
                  backgroundColor: hoveredKpi === idx 
                    ? (isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(248, 250, 252, 1)')
                    : 'transparent',
                }}
                onMouseEnter={() => !isMobile && setHoveredKpi(idx)}
                onMouseLeave={() => !isMobile && setHoveredKpi(null)}
                onClick={() => isMobile && setHoveredKpi(hoveredKpi === idx ? null : idx)}
              >
                {/* Main row - responsive grid */}
                <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[minmax(140px,1.2fr)_1fr_auto] gap-2 sm:gap-3 items-center">
                  {/* KPI Name - full text */}
                  <div className="min-w-0">
                    <span 
                      className="text-[12px] sm:text-[13px] font-semibold leading-tight"
                      style={{ color: isDark ? 'rgb(248, 250, 252)' : 'rgb(15, 23, 42)' }}
                    >
                      {isEn ? kpi.name : kpi.nameFr}
                    </span>
                  </div>
                  
                  {/* Formula - visible on sm+ */}
                  <div className="hidden sm:flex items-center gap-1.5 min-w-0">
                    <span 
                      className="text-xs font-medium flex-shrink-0"
                      style={{ color: isDark ? 'rgb(100, 116, 139)' : 'rgb(148, 163, 184)' }}
                    >
                      =
                    </span>
                    <code 
                      className="text-xs font-mono font-medium"
                      style={{ color: '#10b981' }}
                    >
                      {kpi.formula}
                    </code>
                  </div>
                  
                  {/* Target badge */}
                  <span 
                    className="text-[11px] sm:text-xs px-2 py-1 rounded-md font-semibold whitespace-nowrap justify-self-end"
                    style={{ 
                      backgroundColor: isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(217, 119, 6, 0.1)',
                      color: isDark ? '#fbbf24' : '#b45309',
                    }}
                  >
                    {kpi.target}
                  </span>
                </div>
                
                {/* Mobile: show formula below name */}
                <div className="sm:hidden mt-1.5 flex items-center gap-1.5">
                  <span 
                    className="text-[10px] font-medium"
                    style={{ color: isDark ? 'rgb(100, 116, 139)' : 'rgb(148, 163, 184)' }}
                  >
                    =
                  </span>
                  <code 
                    className="text-[10px] font-mono font-medium"
                    style={{ color: '#10b981' }}
                  >
                    {kpi.formula}
                  </code>
                </div>
                
                {/* Hover tooltip - clean label style */}
                {hoveredKpi === idx && !isMobile && (
                  <div 
                    className="absolute left-4 right-4 sm:left-auto sm:right-4 sm:w-auto top-full mt-1 z-20 px-3 py-2 rounded-lg shadow-lg text-[11px] flex items-center gap-3"
                    style={{ 
                      backgroundColor: isDark ? 'rgb(30, 41, 59)' : 'rgb(255, 255, 255)',
                      border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.6)' : 'rgba(226, 232, 240, 1)'}`,
                      boxShadow: isDark 
                        ? '0 4px 12px rgba(0, 0, 0, 0.4)' 
                        : '0 4px 12px rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    <span style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}>
                      {isEn ? 'Formula:' : 'Formule:'}
                    </span>
                    <code className="font-mono font-semibold" style={{ color: '#10b981' }}>
                      {kpi.formula}
                    </code>
                    <span 
                      className="w-px h-3"
                      style={{ backgroundColor: isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(226, 232, 240, 1)' }}
                    />
                    <span style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}>
                      {isEn ? 'Target:' : 'Cible:'}
                    </span>
                    <span className="font-semibold" style={{ color: isDark ? '#fbbf24' : '#b45309' }}>
                      {kpi.target}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
            
            {/* Add Custom Formula Row */}
            <button 
              className="w-full px-4 sm:px-5 py-4 flex items-center justify-center gap-2 transition-colors duration-150 group/add min-h-[44px] active:scale-95"
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
