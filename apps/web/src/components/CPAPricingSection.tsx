/**
 * CPA Partner Program Pricing Section
 * Interactive pricing calculator with client count slider and billing toggle
 */

import { useState, useMemo } from 'react';
import { Check, Award, Crown, Users, TrendingDown } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { CPA_PARTNER_TIERS, PricingCalculator } from '../lib/pricing';
import { analytics } from '../lib/analytics';

interface CPAPricingSectionProps {
  onCTAClick?: (tierId: string, action: 'trial' | 'contact') => void;
}

export default function CPAPricingSection({ onCTAClick }: CPAPricingSectionProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [clientCount, setClientCount] = useState(15);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');

  // Calculate pricing for each tier based on client count
  const tierCalculations = useMemo(() => {
    return CPA_PARTNER_TIERS.map(tier => {
      const effectiveClients = Math.max(clientCount, tier.minimumClients);
      const calculation = PricingCalculator.calculateCPAPrice(tier.id, effectiveClients);
      
      // Determine which tier applies based on client count
      let applicableTier = tier;
      if (clientCount >= tier.minimumClients) {
        // Check if we qualify for a better tier
        const betterTier = CPA_PARTNER_TIERS.find(t => 
          t.minimumClients > tier.minimumClients && 
          clientCount >= t.minimumClients
        );
        if (betterTier) {
          applicableTier = betterTier;
        }
      }

      const monthlyPrice = effectiveClients * tier.pricePerClient;
      const yearlyPrice = monthlyPrice * 12 * 0.8; // 20% discount
      const savings = monthlyPrice * 12 - yearlyPrice;
      
      // Calculate savings vs base tier (for volume discount badge)
      const baseTier = CPA_PARTNER_TIERS[0];
      const basePrice = effectiveClients * baseTier.pricePerClient;
      const savingsVsBase = basePrice - monthlyPrice;
      const volumeDiscountPercent = baseTier.pricePerClient > 0 && tier.pricePerClient < baseTier.pricePerClient
        ? Math.round((savingsVsBase / basePrice) * 100)
        : 0;

      return {
        tier,
        effectiveClients,
        monthlyPrice,
        yearlyPrice,
        savings,
        savingsVsBase,
        volumeDiscountPercent,
        isRecommended: tier.id === 'cpa_professional',
      };
    });
  }, [clientCount]);

  const handleCTAClick = (tier: CPAPartnerPricing, action: 'trial' | 'contact') => {
    analytics.track('cpa_pricing_cta_clicked', {
      tier: tier.id,
      action,
      clientCount,
      billingInterval,
    });
    
    if (onCTAClick) {
      onCTAClick(tier.id, action);
    } else if (action === 'contact') {
      window.location.href = `mailto:partners@plainledger.ca?subject=CPA%20Partner%20Program%20-%20${tier.id}&body=${encodeURIComponent(
        isEn 
          ? `Hello,\n\nI'm interested in the CPA Partner Program.\n\nFirm name:\nNumber of clients: ${clientCount}\nYour name:\nPhone:`
          : `Bonjour,\n\nJe suis intéressé par le Programme Partenaire CPA.\n\nNom du cabinet:\nNombre de clients: ${clientCount}\nVotre nom:\nTéléphone:`
      )}`;
    } else {
      window.location.href = '/signup?plan=cpa';
    }
  };

  return (
    <section id="cpa" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm mb-4 font-medium"
            style={{ 
              backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
              color: 'rgb(var(--color-primary-600))'
            }}
          >
            <Crown className="w-4 h-4" />
            {isEn ? 'CPA Partner Program' : 'Programme Partenaire CPA'}
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Special pricing for accounting firms' : 'Tarification spéciale pour les cabinets comptables'}
          </h2>
          <p className="text-lg max-w-2xl mx-auto mb-8" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn 
              ? 'Manage all your clients from one dashboard with volume discounts'
              : 'Gérez tous vos clients depuis un tableau de bord avec remises sur volume'}
          </p>

          {/* Interactive Client Count Slider */}
          <div className="max-w-2xl mx-auto mb-8">
            <label className="block text-sm font-medium mb-4" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn ? 'How many clients do you manage?' : 'Combien de clients gérez-vous?'}
            </label>
            <div className="flex items-center gap-4">
              <Users className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
              <input
                type="range"
                min="5"
                max="100"
                value={clientCount}
                onChange={(e) => setClientCount(Number(e.target.value))}
                className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, rgb(var(--color-primary-600)) 0%, rgb(var(--color-primary-600)) ${((clientCount - 5) / 95) * 100}%, rgb(var(--color-border)) ${((clientCount - 5) / 95) * 100}%, rgb(var(--color-border)) 100%)`
                }}
              />
              <div className="flex items-center gap-2 min-w-[120px]">
                <span className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                  {clientCount}
                </span>
                <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'clients' : 'clients'}
                </span>
              </div>
            </div>
            
            {/* Price Preview */}
            <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Your monthly cost' : 'Votre coût mensuel'}
                </span>
                <span className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                  {billingInterval === 'monthly' 
                    ? `$${tierCalculations[0].monthlyPrice.toLocaleString()}`
                    : `$${Math.round(tierCalculations[0].yearlyPrice / 12).toLocaleString()}`
                  }
                  <span className="text-sm font-normal ml-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    /{isEn ? 'mo' : 'mois'}
                  </span>
                </span>
              </div>
              {billingInterval === 'yearly' && (
                <div className="flex items-center gap-2 text-sm">
                  <TrendingDown className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
                  <span style={{ color: 'rgb(var(--color-success))' }}>
                    {isEn 
                      ? `Save $${Math.round(tierCalculations[0].savings).toLocaleString()}/year`
                      : `Économisez $${Math.round(tierCalculations[0].savings).toLocaleString()}/an`
                    }
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                billingInterval === 'monthly'
                  ? 'text-white'
                  : 'border'
              }`}
              style={{
                backgroundColor: billingInterval === 'monthly' ? 'rgb(var(--color-text))' : 'transparent',
                color: billingInterval === 'monthly' ? 'rgb(var(--color-bg))' : 'rgb(var(--color-text))',
                borderColor: billingInterval === 'monthly' ? undefined : 'rgb(var(--color-border))',
              }}
            >
              {isEn ? 'Monthly' : 'Mensuel'}
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${
                billingInterval === 'yearly'
                  ? 'text-white'
                  : 'border'
              }`}
              style={{
                backgroundColor: billingInterval === 'yearly' ? 'rgb(var(--color-text))' : 'transparent',
                color: billingInterval === 'yearly' ? 'rgb(var(--color-bg))' : 'rgb(var(--color-text))',
                borderColor: billingInterval === 'yearly' ? undefined : 'rgb(var(--color-border))',
              }}
            >
              {isEn ? 'Annual' : 'Annuel'}
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ 
                backgroundColor: billingInterval === 'yearly' ? 'rgba(255,255,255,0.2)' : 'rgb(var(--color-success) / 0.1)',
                color: billingInterval === 'yearly' ? 'white' : 'rgb(var(--color-success))',
              }}>
                {isEn ? 'Save 20%' : 'Économisez 20%'}
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12 pt-4">
          {tierCalculations.map((calc) => {
            const { tier, monthlyPrice, yearlyPrice, volumeDiscountPercent, isRecommended } = calc;
            const displayPrice = billingInterval === 'yearly' 
              ? Math.round(yearlyPrice / 12)
              : monthlyPrice;
            
            const qualifies = clientCount >= tier.minimumClients;
            const showAnnualSavings = billingInterval === 'yearly' && qualifies;

            return (
              <div 
                key={tier.id}
                className={`p-6 rounded-xl transition-all duration-300 relative overflow-visible ${
                  isRecommended && qualifies ? 'ring-2 mt-0' : ''
                } ${
                  qualifies ? 'opacity-100' : 'opacity-60'
                }`}
                style={{ 
                  backgroundColor: 'rgb(var(--color-surface))',
                  border: '1px solid rgb(var(--color-border))',
                  ringColor: isRecommended && qualifies ? 'rgb(var(--color-primary-600))' : undefined,
                }}
              >
                {/* Recommended Badge - positioned at top center, centered on border */}
                {isRecommended && qualifies && (
                  <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-0 z-10">
                    <span 
                      className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg whitespace-nowrap"
                      style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
                    >
                      {isEn ? 'RECOMMENDED' : 'RECOMMANDÉ'}
                    </span>
                  </div>
                )}

                {/* Volume Discount Badge (vs base tier) - positioned at top right, centered on border */}
                {volumeDiscountPercent > 0 && qualifies && !isRecommended && (
                  <div className="absolute right-4 -translate-y-1/2 top-0 z-10">
                    <span 
                      className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 whitespace-nowrap"
                      style={{ 
                        backgroundColor: 'rgb(var(--color-success))',
                        color: 'white'
                      }}
                    >
                      <TrendingDown className="w-3 h-3" />
                      {isEn ? `Save ${volumeDiscountPercent}%` : `Économisez ${volumeDiscountPercent}%`}
                    </span>
                  </div>
                )}

                <h3 className="font-bold text-xl mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? tier.name : tier.nameFr}
                </h3>
                <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? tier.description : tier.descriptionFr}
                </p>

                {/* Pricing */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                      ${tier.pricePerClient}
                    </span>
                    <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      /{isEn ? 'client' : 'client'}
                    </span>
                  </div>
                  {qualifies && (
                    <div className="mt-2">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                          ${displayPrice.toLocaleString()}
                        </span>
                        <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                          /{isEn ? 'mo' : 'mois'}
                        </span>
                        {showAnnualSavings && (
                          <span 
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ 
                              backgroundColor: 'rgb(var(--color-success) / 0.1)',
                              color: 'rgb(var(--color-success))'
                            }}
                          >
                            {isEn ? 'Save 20%' : 'Économisez 20%'}
                          </span>
                        )}
                      </div>
                      <span className="text-xs mt-1 block" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        ({isEn ? 'for' : 'pour'} {calc.effectiveClients} {isEn ? 'clients' : 'clients'})
                      </span>
                    </div>
                  )}
                </div>

                {/* Limits */}
                <div className="mb-4 text-sm space-y-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  <p>
                    {tier.clientSeats === -1 
                      ? (isEn ? 'Unlimited' : 'Illimité') 
                      : tier.clientSeats} {isEn ? 'clients max' : 'clients max'}
                  </p>
                  <p>
                    {tier.teamMembers === -1 
                      ? (isEn ? 'Unlimited' : 'Illimité') 
                      : tier.teamMembers} {isEn ? 'team members' : 'membres'}
                  </p>
                  <p className="font-medium">
                    {isEn ? `Min. ${tier.minimumClients} clients` : `Min. ${tier.minimumClients} clients`}
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {(isEn ? tier.features : tier.featuresFr).map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'rgb(var(--color-success))' }} />
                      <span style={{ color: 'rgb(var(--color-text-secondary))' }}>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleCTAClick(tier, tier.id === 'cpa_enterprise' ? 'contact' : 'trial')}
                  disabled={!qualifies}
                  className={`w-full py-2.5 rounded-full font-medium transition-all ${
                    isRecommended && qualifies
                      ? 'text-white'
                      : 'border'
                  } ${
                    !qualifies ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                  }`}
                  style={{ 
                    backgroundColor: isRecommended && qualifies 
                      ? 'rgb(var(--color-text))' 
                      : 'transparent',
                    color: isRecommended && qualifies 
                      ? 'rgb(var(--color-bg))' 
                      : 'rgb(var(--color-text))',
                    borderColor: isRecommended && qualifies 
                      ? undefined 
                      : 'rgb(var(--color-border))',
                  }}
                >
                  {!qualifies 
                    ? (isEn ? `Requires ${tier.minimumClients}+ clients` : `Nécessite ${tier.minimumClients}+ clients`)
                    : tier.id === 'cpa_enterprise'
                      ? (isEn ? 'Contact Sales' : 'Contacter les ventes')
                      : (isEn ? 'Start Free Trial' : 'Essai gratuit')
                  }
                </button>
              </div>
            );
          })}
        </div>

        {/* Trust Signals */}
        <div className="max-w-4xl mx-auto space-y-8">
          {/* CPA Testimonial */}
          <div className="text-center p-6 rounded-xl" style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
            <p className="text-lg italic mb-4" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              "{isEn 
                ? 'I manage 35 clients with PlainLedger. Anomaly detection prevented 3 major errors this quarter. Immediate ROI.'
                : 'Je gère 35 clients avec PlainLedger. La détection d\'anomalies m\'a évité 3 erreurs majeures ce trimestre. ROI immédiat.'}"
            </p>
            <div className="flex items-center justify-center gap-3">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center font-semibold text-white"
                style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
              >
                JL
              </div>
              <div className="text-left">
                <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Jean-François Lavoie, CPA' : 'Jean-François Lavoie, CPA'}
                </p>
                <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Partner, Lavoie & Associates' : 'Associé, Cabinet Lavoie'} • Trois-Rivières
                </p>
              </div>
            </div>
          </div>

          {/* Guarantee */}
          <div className="flex items-center justify-center gap-2 text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            <Award className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
            <span>
              {isEn 
                ? '14-day free trial • No credit card required • Cancel anytime'
                : 'Essai gratuit 14 jours • Aucune carte de crédit requise • Annulez à tout moment'
              }
            </span>
          </div>

          {/* Trust Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                50+
              </p>
              <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Quebec CPA firms' : 'Cabinets CPA du Québec'}
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                5h+
              </p>
              <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Saved per client/month' : 'Économisées par client/mois'}
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                99%
              </p>
              <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Client retention' : 'Rétention clients'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
