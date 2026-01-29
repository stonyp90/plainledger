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
} from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import { useI18n } from '../lib/i18n';
import { usePremiumFeature, PremiumUpgradeBanner } from '../components/PremiumFeatureGate';
import TaxCreditTeaser from '../components/TaxCreditTeaser';
import TaxCreditsSection from '../components/TaxCreditsSection';

// Calendly link for upgrade consultations
const CALENDLY_URL = 'https://calendly.com/anthonypaquet1508';

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
            background: 'linear-gradient(135deg, rgb(var(--color-surface)) 0%, rgb(var(--color-bg-muted)) 100%)',
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
              <Building2 className="w-6 h-6 text-white" />
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
                    {orgIndustry}
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
              backgroundColor: 'rgb(var(--color-info) / 0.05)',
              borderColor: 'rgb(var(--color-info) / 0.2)',
            }}
          >
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-info))' }} />
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
            
            <div className="relative flex flex-col lg:flex-row items-start gap-8">
              {/* Left: Value Props */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ 
                      background: 'linear-gradient(135deg, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-600)) 100%)',
                      boxShadow: '0 4px 12px rgb(var(--color-accent-500) / 0.3)',
                    }}
                  >
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn 
                        ? 'Unlock Tax Credit Analysis' 
                        : 'Débloquez l\'analyse des crédits d\'impôt'}
                    </h2>
                    <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? 'Pro members save $15,000+ on average' : 'Les membres Pro économisent 15 000$+ en moyenne'}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {[
                    { en: 'AI-powered eligibility scoring', fr: 'Score d\'admissibilité par IA' },
                    { en: 'Estimated savings calculator', fr: 'Calculateur d\'économies' },
                    { en: 'Expert partner referrals', fr: 'Références d\'experts' },
                    { en: 'Filing guidance & deadlines', fr: 'Guide de réclamation' },
                  ].map((item, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center gap-2 text-sm"
                      style={{ color: 'rgb(var(--color-text-secondary))' }}
                    >
                      <div 
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}
                      >
                        <Check className="w-3 h-3" style={{ color: 'rgb(var(--color-success))' }} />
                      </div>
                      {isEn ? item.en : item.fr}
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={handleUpgradeClick}
                  className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{ 
                    background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
                    boxShadow: '0 4px 14px rgb(var(--color-primary-500) / 0.35), inset 0 1px 0 rgb(255 255 255 / 0.1)',
                  }}
                >
                  <Calendar className="w-5 h-5" />
                  {isEn ? 'Schedule Demo' : 'Planifier une démo'}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
              
              {/* Right: Savings Preview */}
              <div 
                className="lg:w-72 w-full rounded-xl p-5"
                style={{ 
                  backgroundColor: 'rgb(var(--color-bg-muted))',
                  border: '1px solid rgb(var(--color-border) / 0.5)',
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4" style={{ color: 'rgb(var(--color-accent-500))' }} />
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'Potential Savings' : 'Économies potentielles'}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>SR&ED</span>
                    <span className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                      <span className="opacity-40">$██,███</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>CDAE</span>
                    <span className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                      <span className="opacity-40">$██,███</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>OIDMTC</span>
                    <span className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                      <span className="opacity-40">$██,███</span>
                    </span>
                  </div>
                  <div 
                    className="pt-3 mt-3 flex items-center justify-between"
                    style={{ borderTop: '1px solid rgb(var(--color-border))' }}
                  >
                    <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'Total Estimated' : 'Total estimé'}
                    </span>
                    <span 
                      className="text-lg font-bold"
                      style={{ color: 'rgb(var(--color-primary-600))' }}
                    >
                      <span className="opacity-40">$███,███</span>
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
        className="rounded-xl border p-4"
        style={{
          backgroundColor: 'rgb(var(--color-bg-muted))',
          borderColor: 'rgb(var(--color-border))',
        }}
      >
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }} />
          <div>
            <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn 
                ? 'Tax credit information is sourced from official CRA and provincial government resources. Eligibility estimates are for informational purposes only and should be verified with a qualified tax professional.'
                : 'Les informations sur les crédits d\'impôt proviennent des ressources officielles de l\'ARC et des gouvernements provinciaux. Les estimations d\'admissibilité sont à titre informatif seulement et doivent être vérifiées avec un professionnel fiscal qualifié.'}
            </p>
            <p className="text-[10px] mt-1" style={{ color: 'rgb(var(--color-text-muted) / 0.7)' }}>
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
