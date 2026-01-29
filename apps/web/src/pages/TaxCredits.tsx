/**
 * Tax Credits & Incentives Page
 * 
 * Standalone page for discovering and analyzing tax credit eligibility.
 * Free users see a teaser with credit names, Pro users get full eligibility analysis.
 */

import { useState } from 'react';
import {
  Receipt,
  RefreshCw,
  Info,
  Crown,
  Building2,
  MapPin,
  Sparkles,
  Calendar,
  ArrowRight,
  Target,
  Check,
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
import { usePremiumFeature, PremiumUpgradeBanner } from '../components/PremiumFeatureGate';
import TaxCreditTeaser from '../components/TaxCreditTeaser';
import TaxCreditsSection from '../components/TaxCreditsSection';

// Calendly link for upgrade consultations
const CALENDLY_URL = 'https://calendly.com/anthonypaquet1508';

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

export default function TaxCredits() {
  const { currentTenant } = useTenant();
  const { language } = useI18n();
  const isEn = language === 'en';
  const { hasAccess } = usePremiumFeature('taxCredits');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // TODO: Trigger re-calculation of eligibility
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleUpgradeClick = () => {
    window.open(CALENDLY_URL, '_blank');
  };

  // Get organization context for display
  const orgProvince = currentTenant?.province;
  const orgIndustry = currentTenant?.industry;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 
            className="text-xl sm:text-2xl font-bold flex items-center gap-2 flex-wrap" 
            style={{ color: 'rgb(var(--color-text))' }}
          >
            <Receipt className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" style={{ color: 'rgb(var(--color-primary-600))' }} />
            <span className="whitespace-nowrap">
              {isEn ? 'Tax Credits & Incentives' : 'Crédits d\'impôt et incitatifs'}
            </span>
            {!hasAccess && (
              <span 
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full uppercase tracking-wide"
                style={{ 
                  background: 'linear-gradient(135deg, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-600)) 100%)',
                  color: 'white',
                }}
              >
                <Crown className="w-3 h-3" />
                PRO
              </span>
            )}
          </h1>
          <p 
            className="mt-1 text-sm line-clamp-2 sm:line-clamp-none" 
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn 
              ? 'Discover federal and provincial tax credits you may be eligible for based on your business profile'
              : 'Découvrez les crédits d\'impôt fédéraux et provinciaux auxquels vous pourriez être admissible'}
          </p>
        </div>

        {hasAccess && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isEn ? 'Refresh' : 'Actualiser'}
            </button>
          </div>
        )}
      </div>

      {/* Organization Context Banner */}
      {currentTenant && (orgIndustry || orgProvince) && (
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
                const IndustryIcon = orgIndustry ? INDUSTRY_LUCIDE_ICONS[orgIndustry] : null;
                return IndustryIcon ? (
                  <IndustryIcon className="w-6 h-6 text-white" />
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
                {orgIndustry && (
                  <span 
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-primary-100))',
                      color: 'rgb(var(--color-primary-700))'
                    }}
                  >
                    {INDUSTRY_NAMES[orgIndustry]?.[language] || orgIndustry}
                  </span>
                )}
                {orgProvince && (
                  <span 
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-warning) / 0.1)',
                      color: 'rgb(var(--color-warning))'
                    }}
                  >
                    <MapPin className="w-3 h-3" />
                    {orgProvince}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn 
                  ? 'Tax credits are filtered based on your organization\'s industry and province'
                  : 'Les crédits d\'impôt sont filtrés selon le secteur et la province de votre organisation'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {hasAccess ? (
        /* Pro User - Full Tax Credits Section */
        <div className="space-y-6">
          {/* Info Banner */}
          <div 
            className="rounded-xl p-4 border flex items-start gap-3"
            style={{
              backgroundColor: 'rgb(var(--color-primary-500) / 0.05)',
              borderColor: 'rgb(var(--color-primary-500) / 0.2)',
            }}
          >
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-primary-600))' }} />
            <div>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn 
                  ? 'Eligibility is calculated based on your connected financial data. For accurate estimates, ensure your QuickBooks or accounting data is up to date.'
                  : 'L\'admissibilité est calculée à partir de vos données financières connectées. Pour des estimations précises, assurez-vous que vos données QuickBooks sont à jour.'}
              </p>
            </div>
          </div>

          {/* Tax Credits Section */}
          <TaxCreditsSection
            industryId={orgIndustry}
            province={orgProvince}
            organizationId={currentTenant?.id || ''}
          />

          {/* Partner Help CTA */}
          <div 
            className="rounded-xl border p-6"
            style={{
              background: 'linear-gradient(135deg, rgb(var(--color-primary-50)) 0%, rgb(var(--color-surface)) 100%)',
              borderColor: 'rgb(var(--color-primary-200))',
            }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ 
                  background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
                  boxShadow: '0 4px 12px -2px rgb(var(--color-primary-500) / 0.3)'
                }}
              >
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Need Expert Guidance?' : 'Besoin d\'un accompagnement expert?'}
                </h3>
                <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn 
                    ? 'Our certified partners specialize in maximizing tax credit claims. Get a free consultation to explore your options.'
                    : 'Nos partenaires certifiés se spécialisent dans la maximisation des réclamations de crédits d\'impôt. Obtenez une consultation gratuite.'}
                </p>
              </div>
              <button
                onClick={() => window.open(CALENDLY_URL, '_blank')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all hover:scale-105"
                style={{
                  backgroundColor: 'rgb(var(--color-primary-600))',
                  color: 'white',
                }}
              >
                <Calendar className="w-4 h-4" />
                {isEn ? 'Book Consultation' : 'Prendre rendez-vous'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Free User - Teaser View */
        <div className="space-y-6">
          {/* Standard Premium Upgrade Banner */}
          <PremiumUpgradeBanner feature="taxCredits" />
          
          {/* Value Proposition Card - Following theme patterns */}
          <div 
            className="relative rounded-2xl p-6 sm:p-8 overflow-hidden"
            style={{
              backgroundColor: 'rgb(var(--color-surface))',
              border: '1px solid rgb(var(--color-border))',
            }}
          >
            {/* Gold accent stripe at top - matches PremiumUpgradeBanner */}
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
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn 
                        ? 'Unlock Tax Credit Analysis' 
                        : 'Débloquez l\'analyse des crédits d\'impôt'}
                    </h2>
                    <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? 'Pro members save $15,000+ on average' : 'Les membres Pro économisent 15 000$+ en moyenne'}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                  {[
                    { en: 'AI-powered eligibility scoring', fr: 'Score d\'admissibilité par IA' },
                    { en: 'Estimated savings calculator', fr: 'Calculateur d\'économies' },
                    { en: 'Expert partner referrals', fr: 'Références d\'experts' },
                    { en: 'Filing guidance & deadlines', fr: 'Guide de réclamation' },
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
              
              {/* Right: Savings Preview */}
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
                    {isEn ? 'Potential Savings' : 'Économies potentielles'}
                  </span>
                </div>
                
                <div className="space-y-2">
                  {[
                    { name: 'SR&ED', value: '45,200' },
                    { name: 'CDAE', value: '18,500' },
                    { name: 'OIDMTC', value: '12,800' },
                  ].map((credit) => (
                    <div key={credit.name} className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'rgb(var(--color-text-secondary))' }}>{credit.name}</span>
                      <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                        ${credit.value}
                      </span>
                    </div>
                  ))}
                  <div 
                    className="pt-2 mt-2 flex items-center justify-between"
                    style={{ borderTop: '1px solid rgb(var(--color-border))' }}
                  >
                    <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'Total Estimated' : 'Total estimé'}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: 'rgb(var(--color-primary-600))' }}>
                      $76,500
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Teaser Cards */}
          <TaxCreditTeaser onUpgradeClick={handleUpgradeClick} />
        </div>
      )}

      {/* Data Sources Footer */}
      <div 
        className="rounded-lg border p-3"
        style={{
          backgroundColor: 'rgb(var(--color-surface))',
          borderColor: 'rgb(var(--color-border))',
        }}
      >
        <div className="flex items-start gap-2">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-primary-500))' }} />
          <div>
            <p className="text-xs leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn 
                ? 'Tax credit information is sourced from official CRA and provincial government resources. Eligibility estimates are for informational purposes only.'
                : 'Les informations sur les crédits d\'impôt proviennent des ressources officielles de l\'ARC et des gouvernements provinciaux. Les estimations d\'admissibilité sont à titre informatif seulement.'}
            </p>
            <p className="text-[10px] mt-1.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn 
                ? `Last updated: ${new Date().toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}`
                : `Dernière mise à jour: ${new Date().toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' })}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
