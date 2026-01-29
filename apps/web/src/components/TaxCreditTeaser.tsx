/**
 * Tax Credit Teaser Component
 * 
 * Displays tax credit cards for free users with names and basic info visible,
 * but eligibility details blurred/locked behind Pro upgrade.
 */

import { useState } from 'react';
import {
  Receipt,
  Lock,
  Building2,
  MapPin,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Crown,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { TAX_CREDITS, type TaxCredit } from '../lib/taxCredits';
import { useTenant } from '../contexts/TenantContext';

interface TaxCreditTeaserProps {
  onUpgradeClick: () => void;
}

export default function TaxCreditTeaser({ onUpgradeClick }: TaxCreditTeaserProps) {
  const { language } = useI18n();
  const { currentTenant } = useTenant();
  const isEn = language === 'en';
  const [expandedCredit, setExpandedCredit] = useState<string | null>(null);

  // Get organization's province and industry for relevance hints
  const orgProvince = currentTenant?.province;
  const orgIndustry = currentTenant?.industry;

  // Group credits by jurisdiction
  const federalCredits = TAX_CREDITS.filter(c => c.jurisdiction === 'federal');
  // Only show provincial credits for the user's province (if province is set)
  const provincialCredits = orgProvince 
    ? TAX_CREDITS.filter(c => c.jurisdiction === 'provincial' && c.province === orgProvince)
    : [];

  // Check if credit might be relevant to org
  const isRelevant = (credit: TaxCredit) => {
    const industryMatch = credit.industries === 'all' || 
      (orgIndustry && credit.industries.includes(orgIndustry));
    const provinceMatch = credit.jurisdiction === 'federal' || 
      (orgProvince && credit.province === orgProvince);
    return industryMatch && provinceMatch;
  };

  const renderCreditCard = (credit: TaxCredit) => {
    const relevant = isRelevant(credit);
    const isExpanded = expandedCredit === credit.id;

    return (
      <div
        key={credit.id}
        className="rounded-xl border transition-all duration-200 overflow-hidden"
        style={{
          backgroundColor: 'rgb(var(--color-surface))',
          borderColor: relevant 
            ? 'rgb(var(--color-primary-300))' 
            : 'rgb(var(--color-border))',
          boxShadow: relevant 
            ? '0 0 0 1px rgb(var(--color-primary-100))' 
            : undefined,
        }}
      >
        {/* Card Header - Always Visible */}
        <div 
          className="p-4 cursor-pointer"
          onClick={() => setExpandedCredit(isExpanded ? null : credit.id)}
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ 
                background: relevant 
                  ? 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)'
                  : 'linear-gradient(135deg, rgb(var(--color-text-muted) / 0.15) 0%, rgb(var(--color-text-muted) / 0.1) 100%)',
                boxShadow: relevant 
                  ? '0 4px 12px -2px rgb(var(--color-primary-500) / 0.3)'
                  : undefined,
              }}
            >
              <Receipt 
                className="w-5 h-5" 
                style={{ 
                  color: relevant 
                    ? 'white'
                    : 'rgb(var(--color-text-muted))',
                }} 
              />
            </div>

            {/* Credit Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 
                  className="font-semibold text-sm"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {credit.shortName[language]}
                </h3>
                
                {/* Jurisdiction Badge */}
                <span 
                  className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide"
                  style={{
                    backgroundColor: credit.jurisdiction === 'federal' 
                      ? 'rgb(var(--color-info) / 0.1)' 
                      : 'rgb(var(--color-warning) / 0.1)',
                    color: credit.jurisdiction === 'federal' 
                      ? 'rgb(var(--color-info))' 
                      : 'rgb(var(--color-warning))',
                  }}
                >
                  {credit.jurisdiction === 'federal' 
                    ? (isEn ? 'Federal' : 'Fédéral')
                    : credit.province}
                </span>

                {/* Relevance indicator */}
                {relevant && (
                  <span 
                    className="px-2 py-0.5 rounded text-[10px] font-medium"
                    style={{
                      backgroundColor: 'rgb(var(--color-success) / 0.1)',
                      color: 'rgb(var(--color-success))',
                    }}
                  >
                    {isEn ? 'May apply' : 'Peut s\'appliquer'}
                  </span>
                )}
              </div>

              <p 
                className="text-xs line-clamp-2"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {credit.name[language]}
              </p>
            </div>

            {/* Expand Icon */}
            <ChevronRight 
              className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
              style={{ color: 'rgb(var(--color-text-muted))' }}
            />
          </div>
        </div>

        {/* Expanded Content - Blurred for Free Users */}
        {isExpanded && (
          <div 
            className="px-4 pb-4 border-t"
            style={{ borderColor: 'rgb(var(--color-border))' }}
          >
            {/* Blurred Eligibility Section */}
            <div className="mt-4 relative">
              {/* Blur Overlay */}
              <div 
                className="absolute inset-0 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg"
                style={{ backgroundColor: 'rgb(var(--color-surface) / 0.8)' }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpgradeClick();
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
                    color: 'white',
                    boxShadow: '0 4px 12px rgb(var(--color-primary-500) / 0.35), inset 0 1px 0 rgb(255 255 255 / 0.1)',
                  }}
                >
                  <Crown className="w-4 h-4" />
                  {isEn ? 'Unlock with Pro' : 'Débloquer avec Pro'}
                </button>
              </div>

              {/* Placeholder Content (blurred) */}
              <div className="space-y-3 opacity-40 select-none pointer-events-none">
                {/* Eligibility Score */}
                <div 
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      {isEn ? 'Eligibility Score' : 'Score d\'admissibilité'}
                    </span>
                    <span className="text-lg font-bold" style={{ color: 'rgb(var(--color-success))' }}>
                      ██%
                    </span>
                  </div>
                  <div 
                    className="h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'rgb(var(--color-border))' }}
                  >
                    <div 
                      className="h-full rounded-full"
                      style={{ 
                        backgroundColor: 'rgb(var(--color-success))',
                        width: '75%',
                      }}
                    />
                  </div>
                </div>

                {/* Estimated Savings */}
                <div 
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: 'rgb(var(--color-primary-50))' }}
                >
                  <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-primary-700))' }}>
                    {isEn ? 'Estimated Savings' : 'Économies estimées'}
                  </span>
                  <div className="text-xl font-bold mt-1" style={{ color: 'rgb(var(--color-primary-600))' }}>
                    $██,███ - $██,███
                  </div>
                </div>

                {/* Criteria */}
                <div className="space-y-2">
                  <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {isEn ? 'Eligibility Criteria' : 'Critères d\'admissibilité'}
                  </span>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'rgb(var(--color-success))' }}>
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'rgb(var(--color-success) / 0.2)' }} />
                      <span>████████████████</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'rgb(var(--color-border))' }} />
                      <span>██████████████</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Documentation Link - Always Visible */}
            <div className="mt-4 pt-3 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
              <a
                href={credit.documentationUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 text-xs font-medium transition-colors hover:underline"
                style={{ color: 'rgb(var(--color-primary-600))' }}
              >
                <ExternalLink className="w-3 h-3" />
                {isEn ? 'Official Documentation' : 'Documentation officielle'}
              </a>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Info - Following theme patterns */}
      <div 
        className="rounded-xl p-4 border"
        style={{
          backgroundColor: 'rgb(var(--color-surface))',
          borderColor: 'rgb(var(--color-border))',
        }}
      >
        <div className="flex items-start gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgb(var(--color-info) / 0.1)' }}
          >
            <Sparkles className="w-5 h-5" style={{ color: 'rgb(var(--color-info))' }} />
          </div>
          <div>
            <h3 className="font-semibold text-sm mb-1" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn 
                ? 'Browse Available Tax Credits' 
                : 'Parcourir les crédits d\'impôt disponibles'}
            </h3>
            <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn 
                ? 'Expand each credit to learn more. Upgrade to Pro to see your personalized eligibility scores and estimated savings.'
                : 'Développez chaque crédit pour en savoir plus. Passez à Pro pour voir vos scores d\'admissibilité personnalisés.'}
            </p>
          </div>
        </div>
      </div>

      {/* Federal Credits */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="w-4 h-4" style={{ color: 'rgb(var(--color-info))' }} />
          <h2 className="font-semibold text-sm" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Federal Tax Credits' : 'Crédits d\'impôt fédéraux'}
          </h2>
          <span 
            className="px-2 py-0.5 rounded text-[10px] font-medium"
            style={{
              backgroundColor: 'rgb(var(--color-info) / 0.1)',
              color: 'rgb(var(--color-info))',
            }}
          >
            {federalCredits.length}
          </span>
        </div>
        <div className="grid gap-3">
          {federalCredits.map(renderCreditCard)}
        </div>
      </div>

      {/* Provincial Credits - Only show if province is set and there are credits */}
      {provincialCredits.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4" style={{ color: 'rgb(var(--color-warning))' }} />
            <h2 className="font-semibold text-sm" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Provincial Tax Credits' : 'Crédits d\'impôt provinciaux'}
              {orgProvince && (
                <span 
                  className="ml-2 px-2 py-0.5 rounded text-[10px] font-medium uppercase"
                  style={{
                    backgroundColor: 'rgb(var(--color-warning) / 0.1)',
                    color: 'rgb(var(--color-warning))',
                  }}
                >
                  {orgProvince}
                </span>
              )}
            </h2>
            <span 
              className="px-2 py-0.5 rounded text-[10px] font-medium"
              style={{
                backgroundColor: 'rgb(var(--color-warning) / 0.1)',
                color: 'rgb(var(--color-warning))',
              }}
            >
              {provincialCredits.length}
            </span>
          </div>
          <div className="grid gap-3">
            {provincialCredits.map(renderCreditCard)}
          </div>
        </div>
      )}

      {/* Bottom CTA - Following theme patterns */}
      <div 
        className="relative rounded-xl p-6 text-center border overflow-hidden"
        style={{
          backgroundColor: 'rgb(var(--color-surface))',
          borderColor: 'rgb(var(--color-border))',
        }}
      >
        {/* Accent stripe at top */}
        <div 
          className="absolute top-0 left-0 right-0 h-1"
          style={{ 
            background: 'linear-gradient(90deg, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-400)) 50%, rgb(var(--color-accent-500)) 100%)',
          }}
        />
        
        <div 
          className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center"
          style={{ 
            background: 'linear-gradient(135deg, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-600)) 100%)',
            boxShadow: '0 4px 12px rgb(var(--color-accent-500) / 0.3)',
          }}
        >
          <Crown className="w-6 h-6 text-white" />
        </div>
        <h3 className="font-semibold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Ready to maximize your savings?' : 'Prêt à maximiser vos économies?'}
        </h3>
        <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn 
            ? 'Pro members save an average of $15,000+ annually in discovered tax credits.'
            : 'Les membres Pro économisent en moyenne 15 000$+ par an en crédits d\'impôt découverts.'}
        </p>
        <button
          onClick={onUpgradeClick}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
            boxShadow: '0 4px 14px rgb(var(--color-primary-500) / 0.35), inset 0 1px 0 rgb(255 255 255 / 0.1)',
          }}
        >
          <Crown className="w-5 h-5" />
          {isEn ? 'Upgrade to Pro' : 'Passer à Pro'}
        </button>
      </div>
    </div>
  );
}
