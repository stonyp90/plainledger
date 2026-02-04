/**
 * Store Landing Page
 * store.plainledger.ca
 * 
 * Canadian Market-Focused Landing Page with Usage-Based Pricing
 */

import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useKeycloak } from '../lib/keycloak';
import {
  Check,
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
  Users,
  Star,
  Play,
  MapPin,
  Calculator,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
  Clock,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import PublicHeader from '../components/PublicHeader';
import { analytics } from '../lib/analytics';
import DemoModal from '../components/DemoModal';
import IndustryKPISection from '../components/IndustryKPISection';
import { 
  CANADA_MARKET_MESSAGING,
  type PricingTierConfig,
} from '../lib/pricing';
import { Tooltip } from '../components/Tooltip';

// =====================================================
// OUTCOMES DATA - Trust & Transparency focused
// =====================================================

const FEATURES = [
  {
    icon: Shield,
    title: { en: 'Complete Financial Transparency', fr: 'Transparence financière complète' },
    description: { 
      en: 'No surprises. Just numbers. See every transaction, catch every anomaly, and trust your financial data completely.',
      fr: 'Pas de surprises. Juste des chiffres. Voyez chaque transaction, détectez chaque anomalie et faites confiance à vos données.'
    },
    stat: { value: '$847K', label: { en: 'avg. saved per client', fr: 'économisé moy. par client' } },
    highlights: [
      { en: '97% detection accuracy', fr: '97% précision' },
      { en: 'Real-time alerts', fr: 'Alertes temps réel' },
      { en: 'Full audit trail', fr: 'Piste d\'audit complète' },
    ],
    color: 'success',
    badge: { en: 'Most Trusted', fr: 'Plus fiable' },
  },
  {
    icon: Clock,
    title: { en: 'Clarity in Minutes, Not Days', fr: 'Clarté en minutes, pas en jours' },
    description: { 
      en: 'Close your books 60% faster with automated reconciliation. Get board-ready reports instantly, not after weeks of manual work.',
      fr: 'Clôturez vos livres 60% plus vite avec réconciliation automatisée. Obtenez des rapports prêts pour le CA instantanément.'
    },
    stat: { value: '60%', label: { en: 'faster close', fr: 'plus rapide' } },
    highlights: [
      { en: 'Auto-reconciliation', fr: 'Réconciliation auto' },
      { en: 'Board-ready in 2.3s', fr: 'Prêt CA en 2.3s' },
      { en: 'GAAP/IFRS compliant', fr: 'Conforme GAAP/IFRS' },
    ],
    color: 'primary',
  },
  {
    icon: BarChart3,
    title: { en: 'Financial Truth in Real-Time', fr: 'Vérité financière en temps réel' },
    description: { 
      en: 'Your single source of truth. Know your exact financial position right now, not based on last month\'s guesswork.',
      fr: 'Votre source unique de vérité. Connaissez votre position financière exacte maintenant, pas des estimations du mois dernier.'
    },
    stat: { value: '10x', label: { en: 'faster insights', fr: 'plus rapide' } },
    highlights: [
      { en: 'Live dashboard', fr: 'Tableau de bord live' },
      { en: 'Cash forecasting', fr: 'Prévision trésorerie' },
      { en: 'Industry benchmarks', fr: 'Benchmarks industrie' },
    ],
    color: 'accent',
  },
  {
    icon: Zap,
    title: { en: 'Enterprise Power, Fair Pricing', fr: 'Puissance enterprise, prix équitable' },
    description: { 
      en: 'Democratizing data intelligence for Canadian businesses. Get the same capabilities as the big players at 1/3 the cost.',
      fr: 'Démocratiser l\'intelligence de données pour les entreprises canadiennes. Mêmes capacités que les grands à 1/3 du coût.'
    },
    stat: { value: '340%', label: { en: 'avg. first-year ROI', fr: 'ROI moy. an 1' } },
    highlights: [
      { en: 'No hidden fees', fr: 'Sans frais cachés' },
      { en: 'Pay as you grow', fr: 'Payez selon croissance' },
      { en: 'Cancel anytime', fr: 'Annulez à tout moment' },
    ],
    color: 'success',
  },
];

const TESTIMONIALS = [
  {
    quote: { 
      en: "Finally, complete transparency in our finances. PlainLedger caught a $45K duplicate payment in our first week - no surprises, just numbers.",
      fr: "Enfin, une transparence complète de nos finances. PlainLedger a détecté un paiement en double de 45 000$ la première semaine - pas de surprises, juste des chiffres."
    },
    author: 'Marie-Claire Dubois',
    role: { en: 'CFO, Gestion Immobilière MTL', fr: 'CFO, Gestion Immobilière MTL' },
    avatar: 'MD',
    location: 'Montréal',
    rating: 5,
    verified: true,
    metrics: { en: '$45K protected in week 1', fr: '45 000$ protégés semaine 1' },
  },
  {
    quote: { 
      en: "Enterprise-grade insights without the enterprise price. We trust PlainLedger because there are no hidden fees - what you see is what you get.",
      fr: "Insights de niveau enterprise sans le prix enterprise. Nous faisons confiance à PlainLedger car il n'y a pas de frais cachés - ce que vous voyez est ce que vous obtenez."
    },
    author: 'Philippe Tremblay',
    role: { en: 'CEO, Construction Tremblay Inc.', fr: 'PDG, Construction Tremblay Inc.' },
    avatar: 'PT',
    location: 'Québec City',
    rating: 5,
    verified: true,
    metrics: { en: '67% cost reduction', fr: 'Réduction de 67%' },
  },
  {
    quote: { 
      en: "The clarity is incredible. Month-end close went from 5 days to 2. Now I trust our numbers completely because I can see everything in real-time.",
      fr: "La clarté est incroyable. La clôture mensuelle est passée de 5 jours à 2. Maintenant je fais confiance à nos chiffres car je vois tout en temps réel."
    },
    author: 'Jean-François Lavoie, CPA',
    role: { en: 'Partner, Lavoie & Associates', fr: 'Associé, Cabinet Lavoie' },
    avatar: 'JL',
    location: 'Trois-Rivières',
    rating: 5,
    verified: true,
    metrics: { en: '$127K errors prevented', fr: '127 000$ d\'erreurs évitées' },
  },
  {
    quote: { 
      en: "As a restaurant owner, I need to trust my numbers. PlainLedger gives me industry-specific KPIs with complete transparency - saved us $89K on food costs.",
      fr: "En tant que propriétaire de restaurant, j'ai besoin de faire confiance à mes chiffres. PlainLedger me donne des KPIs spécifiques à l'industrie avec transparence totale."
    },
    author: 'Lisa Gagnon',
    role: { en: 'Owner, Gagnon Restaurant Group', fr: 'Propriétaire, Groupe Restaurant Gagnon' },
    avatar: 'LG',
    location: 'Laval',
    rating: 5,
    verified: true,
    metrics: { en: '$89K protected on food costs', fr: '89 000$ protégés sur coûts alimentaires' },
  },
  {
    quote: { 
      en: "I trust PlainLedger with my clients' data because they're transparent about everything. Saves me 5+ hours per client and my clients love the clarity.",
      fr: "Je confie les données de mes clients à PlainLedger car ils sont transparents sur tout. M'économise 5+ heures par client et mes clients adorent la clarté."
    },
    author: 'Marie-Claire Bouchard, CPA',
    role: { en: 'Managing Partner, Bouchard & Partners', fr: 'Associée principale, Bouchard & Associés' },
    avatar: 'MB',
    location: 'Sherbrooke',
    rating: 5,
    verified: true,
    metrics: { en: '5+ hours saved/client', fr: '5+ heures économisées/client' },
  },
  {
    quote: { 
      en: "Complete financial transparency across 20 clients. Caught $125K in duplicate transactions - this is the honest, trustworthy tool CPAs need.",
      fr: "Transparence financière complète sur 20 clients. A détecté 125 000$ en transactions dupliquées - c'est l'outil honnête et fiable dont les CPA ont besoin."
    },
    author: 'Pierre Fortin, CPA',
    role: { en: 'Senior Partner, Fortin Accounting Group', fr: 'Associé principal, Groupe Comptable Fortin' },
    avatar: 'PF',
    location: 'Gatineau',
    rating: 5,
    verified: true,
    metrics: { en: '$125K protected', fr: '125 000$ protégés' },
  },
];

// =====================================================
// COMPONENTS
// =====================================================

// Header removed - using PublicHeader component instead

function HeroSection({ isEn, onWatchDemo }: { isEn: boolean; onWatchDemo: () => void }) {
  const { register } = useKeycloak();

  const handleCTA = () => {
    analytics.track('landing_page_cta_clicked', { location: 'hero' });
    register();
  };

  const handleWatchDemo = () => {
    analytics.track('demo_modal_opened', { location: 'hero' });
    onWatchDemo();
  };

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration - Subtle gradient, no flash */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-1/2 -right-1/4 w-96 h-96 rounded-full blur-3xl opacity-[0.06]"
          style={{ backgroundColor: 'rgb(var(--store-hero-gradient-1))' }}
        />
        <div 
          className="absolute -bottom-1/2 -left-1/4 w-96 h-96 rounded-full blur-3xl opacity-[0.04]"
          style={{ backgroundColor: 'rgb(var(--store-hero-gradient-2))' }}
        />
        <div 
          className="absolute top-1/4 left-1/2 w-64 h-64 rounded-full blur-3xl opacity-[0.03]"
          style={{ backgroundColor: 'rgb(var(--store-hero-gradient-3))' }}
        />
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        {/* Trust badge - Using CSS class */}
        <div className="store-trust-badge mb-6">
          <Shield className="w-4 h-4 store-check-icon" />
          <span className="font-medium">
            {isEn ? 'Trusted by Canadian Businesses' : 'Approuvé par les entreprises canadiennes'}
          </span>
          <span className="text-muted">•</span>
          <span>🇨🇦</span>
        </div>

        {/* Headline - Core mission */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? (
            <>
              <span className="store-headline-accent">No Surprises.</span>{' '}
              <span>Just Numbers.</span>
            </>
          ) : (
            <>
              <span className="store-headline-accent">Pas de surprises.</span>{' '}
              <span>Juste des chiffres.</span>
            </>
          )}
        </h1>

        {/* Subheadline - Mission focused */}
        <p className="text-lg sm:text-xl mb-8 max-w-2xl mx-auto text-secondary">
          {isEn 
            ? 'Democratizing enterprise-grade data intelligence for Canadian businesses. Complete financial transparency at 1/3 the cost.'
            : 'Démocratiser l\'intelligence de données enterprise pour les entreprises canadiennes. Transparence financière complète à 1/3 du coût.'}
        </p>

        {/* CTAs - Green primary, Gold accent */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <button onClick={handleCTA} className="btn-primary btn-lg group">
            {isEn ? 'Get started free' : 'Commencer gratuitement'}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button onClick={handleWatchDemo} className="btn-accent btn-lg flex items-center gap-2">
            <Play className="w-4 h-4" />
            {isEn ? 'Watch demo' : 'Voir la démo'}
          </button>
        </div>

        {/* Trust badges - Green checkmarks */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4 store-check-icon" />
            {isEn ? 'No credit card required' : 'Aucune carte de crédit requise'}
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4 store-check-icon" />
            {isEn ? 'Setup in 5 minutes' : 'Configuration en 5 minutes'}
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4 store-check-icon" />
            {isEn ? 'Data stays in Canada' : 'Données au Canada'}
          </span>
        </div>

        {/* Supported platforms */}
        <div className="mt-8 flex flex-col items-center">
          <p className="text-xs text-muted mb-3">
            {isEn ? 'Works with your favorite accounting software' : 'Compatible avec vos logiciels comptables préférés'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
            {['QuickBooks', 'Xero', 'Sage', 'FreshBooks', 'Wave', '+ CSV'].map((name) => (
              <span 
                key={name}
                className="px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ 
                  backgroundColor: 'rgb(var(--color-bg-muted))',
                  color: 'rgb(var(--color-text-secondary))',
                  border: '1px solid rgb(var(--color-border))'
                }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* Stats - Green and Gold accents */}
        <div className="mt-12 grid grid-cols-3 gap-8 max-w-lg mx-auto">
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold store-stat-primary">$847K</div>
            <div className="text-sm text-muted">{isEn ? 'avg. client savings' : 'économies client moy.'}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold store-stat-accent">97%</div>
            <div className="text-sm text-muted">{isEn ? 'detection accuracy' : 'précision détection'}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold store-stat-primary">1/3</div>
            <div className="text-sm text-muted">{isEn ? 'the cost' : 'du coût'}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection({ isEn }: { isEn: boolean }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  
  // Green and Gold/Yellow color scheme for trust and prosperity - using CSS variables
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'primary': return { bg: 'rgb(var(--store-feature-primary-bg))', text: 'rgb(var(--store-feature-primary))', border: 'rgb(var(--color-primary-500) / 0.3)' };
      case 'success': return { bg: 'rgb(var(--store-feature-success-bg))', text: 'rgb(var(--store-feature-success))', border: 'rgb(var(--color-success) / 0.3)' };
      case 'accent': return { bg: 'rgb(var(--store-feature-accent-bg))', text: 'rgb(var(--store-feature-accent))', border: 'rgb(var(--color-accent-500) / 0.3)' };
      case 'warning': return { bg: 'rgb(var(--color-warning) / 0.1)', text: 'rgb(var(--color-warning-dark))', border: 'rgb(var(--color-warning) / 0.3)' };
      case 'info': return { bg: 'rgb(var(--color-info) / 0.1)', text: 'rgb(var(--color-info))', border: 'rgb(var(--color-info) / 0.2)' };
      case 'error': return { bg: 'rgb(var(--color-error) / 0.1)', text: 'rgb(var(--color-error))', border: 'rgb(var(--color-error) / 0.2)' };
      default: return { bg: 'rgb(var(--store-feature-primary-bg))', text: 'rgb(var(--store-feature-primary))', border: 'rgb(var(--color-primary-500) / 0.3)' };
    }
  };
  
  return (
    <section id="features" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-muted">
      <div className="max-w-7xl mx-auto">
        {/* Header - Trust-focused messaging */}
        <div className="text-center mb-12">
          <div className="store-trust-badge mb-4">
            <Shield className="w-4 h-4 store-check-icon" />
            <span>
              {isEn ? 'Trusted by 1,000+ Canadian businesses' : 'Approuvé par 1 000+ entreprises canadiennes'}
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'No Surprises. Just Numbers.' : 'Pas de surprises. Juste des chiffres.'}
          </h2>
          <p className="text-lg max-w-2xl mx-auto text-secondary">
            {isEn 
              ? 'Complete financial transparency for your business. See every number, trust every insight, and make confident decisions.'
              : 'Transparence financière complète pour votre entreprise. Voyez chaque chiffre, faites confiance à chaque insight.'}
          </p>
        </div>

        {/* Outcomes Grid - 2x2 for 4 cards */}
        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {FEATURES.map((feature, idx) => {
            const colors = getColorClasses(feature.color);
            const isHovered = hoveredIdx === idx;
            
            return (
              <div 
                key={idx}
                className={`
                  relative p-6 rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden
                  ${isHovered ? 'shadow-xl scale-[1.02]' : 'shadow-sm hover:shadow-lg'}
                `}
                style={{ 
                  backgroundColor: 'rgb(var(--color-surface))',
                  border: `1px solid ${isHovered ? colors.border : 'rgb(var(--color-border))'}`,
                }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Badge */}
                {feature.badge && (
                  <div 
                    className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: colors.bg, color: colors.text }}
                  >
                    {isEn ? feature.badge.en : feature.badge.fr}
                  </div>
                )}
                
                {/* Header with icon and stat */}
                <div className="flex items-start justify-between mb-4">
                  <div 
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`}
                    style={{ backgroundColor: colors.bg }}
                  >
                    <feature.icon className="w-6 h-6" style={{ color: colors.text }} />
                  </div>
                  
                  {/* Stat */}
                  <div className="text-right">
                    <div className="text-2xl font-bold" style={{ color: colors.text }}>
                      {feature.stat.value}
                    </div>
                    <div className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? feature.stat.label.en : feature.stat.label.fr}
                    </div>
                  </div>
                </div>
                
                {/* Title & Description */}
                <h3 className="font-semibold text-lg mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? feature.title.en : feature.title.fr}
                </h3>
                <p className="text-sm mb-4 leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? feature.description.en : feature.description.fr}
                </p>
                
                {/* Highlights */}
                <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
                  {feature.highlights.map((highlight, hIdx) => (
                    <span 
                      key={hIdx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: 'rgb(var(--color-bg-muted))', color: 'rgb(var(--color-text-secondary))' }}
                    >
                      <Check className="w-3 h-3" style={{ color: 'rgb(var(--color-success))' }} />
                      {isEn ? highlight.en : highlight.fr}
                    </span>
                  ))}
                </div>
                
                {/* Hover gradient overlay */}
                <div 
                  className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                  style={{ 
                    background: `linear-gradient(135deg, ${colors.bg} 0%, transparent 50%)`,
                  }}
                />
              </div>
            );
          })}
        </div>
        
        {/* Bottom CTA - Trust badges */}
        <div className="text-center mt-12">
          <p className="text-sm mb-4 font-medium text-muted">
            {isEn 
              ? 'Built on trust, transparency, and Canadian values'
              : 'Construit sur la confiance, la transparence et les valeurs canadiennes'}
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 store-check-icon" />
              <span className="text-sm font-medium text-secondary">
                {isEn ? 'Data stays in Canada' : 'Données au Canada'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 store-check-icon-success" />
              <span className="text-sm font-medium text-secondary">
                {isEn ? 'No hidden fees, ever' : 'Sans frais cachés'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 store-check-icon-accent" />
              <span className="text-sm font-medium text-secondary">
                {isEn ? '340% avg. ROI' : '340% ROI moy.'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingSection({ isEn }: { isEn: boolean }) {
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(500000);
  const [transactionVolume, setTransactionVolume] = useState<number>(1000);
  
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
      roi: Math.floor((yearlySavings / (monthlyRevenue * 0.001)) * 100), // ROI %
    };
  }, [monthlyRevenue, transactionVolume]);

  const handleScheduleCall = () => {
    analytics.track('roi_calculator_schedule_call', { 
      monthlyRevenue, 
      transactionVolume,
      estimatedYearlySavings: estimatedSavings.yearlySavings 
    });
    window.open('https://calendly.com/anthonypaquet1508', '_blank');
  };

  return (
    <section id="pricing" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-muted">
      <div className="max-w-5xl mx-auto">
        {/* Header - Trust and transparency focused */}
        <div className="text-center mb-12">
          <div className="store-trust-badge mb-4">
            <Calculator className="w-4 h-4 store-check-icon-accent" />
            <span>{isEn ? 'Transparent Pricing' : 'Tarification transparente'}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Fair Value, Clear Returns' : 'Prix équitable, retours clairs'}
          </h2>
          <p className="text-lg max-w-2xl mx-auto text-secondary">
            {isEn 
              ? 'No hidden fees. No surprises. Enterprise-grade data intelligence at 1/3 the cost of traditional solutions.'
              : 'Sans frais cachés. Sans surprises. Intelligence de données enterprise à 1/3 du coût des solutions traditionnelles.'}
          </p>
        </div>

        {/* Calculator Card */}
        <div 
          className="rounded-2xl overflow-hidden shadow-lg border"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            borderColor: 'rgb(var(--color-border))',
          }}
        >
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: 'rgb(var(--color-border))' }}>
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
                  <span className="text-sm font-semibold" style={{ color: 'rgb(var(--color-primary-600))' }}>
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
                    background: `linear-gradient(to right, rgb(var(--color-primary-500)) ${((monthlyRevenue - 50000) / 4950000) * 100}%, rgb(var(--color-border)) ${((monthlyRevenue - 50000) / 4950000) * 100}%)`
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
                  <span className="text-sm font-semibold" style={{ color: 'rgb(var(--color-primary-600))' }}>
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
                    background: `linear-gradient(to right, rgb(var(--color-primary-500)) ${((transactionVolume - 100) / 9900) * 100}%, rgb(var(--color-border)) ${((transactionVolume - 100) / 9900) * 100}%)`
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
                  backgroundColor: 'rgb(var(--color-bg-muted))',
                  color: 'rgb(var(--color-text-muted))'
                }}
              >
                <Info className="w-3 h-3 inline mr-1" />
                {isEn 
                  ? 'Based on industry average 2% error rate and our 97% detection accuracy'
                  : 'Basé sur le taux d\'erreur moyen de 2% et notre précision de détection de 97%'}
              </div>
            </div>
            
            {/* Results Side - Green gradient background */}
            <div className="store-roi-results">
              <h3 className="font-semibold text-lg mb-6" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Your Potential Returns' : 'Vos retours potentiels'}
              </h3>
              
              {/* Big Number - Yearly Savings with green accent */}
              <div className="store-roi-highlight mb-6">
                <div className="text-4xl sm:text-5xl font-bold mb-2 store-stat-primary">
                  ${Math.floor(estimatedSavings.yearlySavings).toLocaleString()}
                </div>
                <div className="text-sm font-medium text-secondary">
                  {isEn ? 'Estimated annual savings' : 'Économies annuelles estimées'}
                </div>
              </div>
              
              {/* Breakdown with green accents */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm flex items-center gap-2 text-secondary">
                    <Shield className="w-3 h-3 store-check-icon" />
                    {isEn ? 'Errors detected/month' : 'Erreurs détectées/mois'}
                  </span>
                  <span className="font-semibold store-stat-primary">
                    {estimatedSavings.detectedErrors}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm flex items-center gap-2 text-secondary">
                    <Check className="w-3 h-3 store-check-icon-success" />
                    {isEn ? 'Monthly savings' : 'Économies mensuelles'}
                  </span>
                  <span className="font-semibold text-success">
                    ${Math.floor(estimatedSavings.monthlySavings).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm flex items-center gap-2 text-secondary">
                    <Clock className="w-3 h-3 store-check-icon-accent" />
                    {isEn ? 'Time saved/month' : 'Temps économisé/mois'}
                  </span>
                  <span className="font-semibold store-stat-accent">
                    {estimatedSavings.timeSavedHours}+ {isEn ? 'hours' : 'heures'}
                  </span>
                </div>
              </div>
              
              {/* CTA - Gold accent */}
              <button
                onClick={handleScheduleCall}
                className="w-full btn-accent btn-lg group"
              >
                {isEn ? 'Get Your Free ROI Analysis' : 'Obtenez votre analyse ROI gratuite'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <p className="text-center text-xs mt-3 text-muted">
                {isEn ? 'No commitment. No surprises.' : 'Sans engagement. Sans surprises.'}
              </p>
            </div>
          </div>
        </div>

        {/* Cost Comparison - Trust-focused with green and gold */}
        <div className="mt-8 grid sm:grid-cols-3 gap-4 text-center">
          <div className="store-cost-card">
            <div className="text-2xl font-bold mb-1 text-muted">$50K+/yr</div>
            <div className="text-sm text-muted">{isEn ? 'Enterprise BI tools' : 'Outils BI enterprise'}</div>
          </div>
          <div className="store-cost-card-highlight">
            <div className="text-2xl font-bold mb-1 store-stat-primary">
              1/3 {isEn ? 'the cost' : 'du coût'}
            </div>
            <div className="text-sm font-medium store-headline-accent">PlainLedger</div>
          </div>
          <div className="store-cost-card-accent">
            <div className="text-2xl font-bold mb-1 store-stat-accent">340%+</div>
            <div className="text-sm store-stat-accent">{isEn ? 'Avg first-year ROI' : 'ROI moy. an 1'}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection({ isEn }: { isEn: boolean }) {
  // Show first 3 testimonials, with CPA-focused ones prioritized
  const displayedTestimonials = TESTIMONIALS.slice(0, 3);

  return (
    <section id="testimonials" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          {/* Trust badge */}
          <div className="store-trust-badge mb-4">
            <Users className="w-4 h-4 store-check-icon" />
            <span>{isEn ? 'Real results from real clients' : 'Résultats réels de vrais clients'}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Trusted by Canadian Finance Leaders' : 'Approuvé par les leaders financiers canadiens'}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {displayedTestimonials.map((testimonial, idx) => {
            const rating = testimonial.rating || 5;
            const fullStars = Math.floor(rating);
            const hasHalfStar = rating % 1 !== 0;
            
            return (
              <div 
                key={idx}
                className="p-6 rounded-xl transition-all duration-300 hover:shadow-lg"
                style={{ 
                  backgroundColor: 'rgb(var(--color-surface))',
                  border: '1px solid rgb(var(--color-border))'
                }}
              >
                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex gap-0.5">
                    {[...Array(fullStars)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" style={{ color: 'rgb(var(--color-warning))' }} />
                    ))}
                    {hasHalfStar && (
                      <div className="relative w-4 h-4">
                        <Star className="w-4 h-4 absolute fill-current" style={{ color: 'rgb(var(--color-border))' }} />
                        <div className="absolute overflow-hidden w-2 h-4">
                          <Star className="w-4 h-4 fill-current" style={{ color: 'rgb(var(--color-warning))' }} />
                        </div>
                      </div>
                    )}
                    {[...Array(5 - Math.ceil(rating))].map((_, i) => (
                      <Star key={`empty-${i}`} className="w-4 h-4" style={{ color: 'rgb(var(--color-border))' }} />
                    ))}
                  </div>
                  {testimonial.verified && (
                    <span 
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ 
                        backgroundColor: 'rgb(var(--color-success) / 0.1)',
                        color: 'rgb(var(--color-success))'
                      }}
                    >
                      {isEn ? 'Verified' : 'Vérifié'}
                    </span>
                  )}
                </div>

                {/* Quote */}
                <p className="mb-4 text-sm leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  "{isEn ? testimonial.quote.en : testimonial.quote.fr}"
                </p>

                {/* Metrics - Green accent */}
                {testimonial.metrics && (
                  <div className="store-testimonial-metric mb-4">
                    <Check className="w-3 h-3" />
                    {isEn ? testimonial.metrics.en : testimonial.metrics.fr}
                  </div>
                )}

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="store-avatar">
                    {testimonial.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                      {testimonial.author}
                    </p>
                    <Tooltip content={isEn ? testimonial.role.en : testimonial.role.fr} position="top" delay={200}>
                      <p className="text-xs flex items-center gap-1 truncate cursor-help" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        {isEn ? testimonial.role.en : testimonial.role.fr}
                      </p>
                    </Tooltip>
                    <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      <MapPin className="w-3 h-3" />
                      {testimonial.location}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Canadian regions - Green accent */}
        <div className="mt-12 text-center">
          <p className="text-sm mb-4 flex items-center justify-center gap-2 text-muted">
            <MapPin className="w-4 h-4 store-check-icon" />
            {isEn ? 'Proudly serving Canadian businesses coast to coast' : 'Fièrement au service des entreprises canadiennes d\'un océan à l\'autre'}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {CANADA_MARKET_MESSAGING.socialProof.regions.slice(0, 12).map((region) => (
              <span key={region} className="store-region-badge">
                {region}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection({ isEn }: { isEn: boolean }) {
  const { register } = useKeycloak();

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto store-cta-section">
        {/* Background decoration - Green and Gold accents */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/4 w-96 h-96 rounded-full bg-white/10" />
          <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 rounded-full" style={{ backgroundColor: 'rgb(var(--store-prosperity-accent-light) / 0.15)' }} />
          <div className="absolute top-1/2 left-1/4 w-48 h-48 rounded-full bg-white/5" />
        </div>

        <div className="relative z-10">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
            {isEn ? 'No Surprises. Just Numbers.' : 'Pas de surprises. Juste des chiffres.'}
          </h2>
          <p className="text-lg mb-8 text-white/90">
            {isEn 
              ? 'Join 1,000+ Canadian businesses who trust PlainLedger for complete financial transparency.'
              : 'Rejoignez plus de 1 000 entreprises canadiennes qui font confiance à PlainLedger pour une transparence financière complète.'}
          </p>
          <button
            onClick={() => {
              analytics.track('landing_page_cta_clicked', { location: 'bottom' });
              register();
            }}
            className="store-cta-button group"
          >
            {isEn ? 'Get started free' : 'Commencer gratuitement'}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-sm mt-4 text-white/70">
            {isEn ? 'No credit card • No hidden fees • 7 days free' : 'Sans carte de crédit • Sans frais cachés • 7 jours gratuits'}
          </p>
        </div>
      </div>
    </section>
  );
}

function Footer({ isEn }: { isEn: boolean }) {
  return (
    <footer 
      className="py-12 px-4 sm:px-6 lg:px-8 border-t"
      style={{ borderColor: 'rgb(var(--color-border))' }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ 
                  background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-700)) 100%)'
                }}
              >
                <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="5" width="3" height="22" rx="1" fill="rgba(255,255,255,0.5)"/>
                  <rect x="8" y="5" width="20" height="22" rx="2" fill="white"/>
                  <line x1="11" y1="10" x2="25" y2="10" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="11" y1="15" x2="25" y2="15" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="11" y1="20" x2="20" y2="20" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M17 21 L20 24 L26 17" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                PlainLedger
              </span>
            </div>
            <p className="text-sm mb-2 font-medium store-headline-accent">
              {isEn ? 'No surprises. Just numbers.' : 'Pas de surprises. Juste des chiffres.'}
            </p>
            <p className="text-sm mb-4 text-muted">
              {isEn 
                ? 'Democratizing enterprise-grade financial intelligence for Canadian businesses.'
                : 'Démocratiser l\'intelligence financière enterprise pour les entreprises canadiennes.'}
            </p>
            <div className="flex items-center gap-2 text-sm store-headline-accent">
              <MapPin className="w-4 h-4" />
              <span>{isEn ? 'Made in Canada' : 'Fait au Canada'} 🇨🇦</span>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Product' : 'Produit'}
            </h4>
            <ul className="space-y-2 text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              <li><a href="#features" className="hover:underline">{isEn ? 'Features' : 'Fonctionnalités'}</a></li>
              <li><a href="#pricing" className="hover:underline">{isEn ? 'Pricing' : 'Tarifs'}</a></li>
              <li><a href="#" className="hover:underline">{isEn ? 'Security' : 'Sécurité'}</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Company' : 'Entreprise'}
            </h4>
            <ul className="space-y-2 text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              <li><a href="#" className="hover:underline">{isEn ? 'About' : 'À propos'}</a></li>
              <li><a href="#" className="hover:underline">Blog</a></li>
              <li><a href="#" className="hover:underline">{isEn ? 'Careers' : 'Carrières'}</a></li>
              <li><a href="#cpa" className="hover:underline">{isEn ? 'Partner Program' : 'Programme partenaire'}</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Support' : 'Support'}
            </h4>
            <ul className="space-y-2 text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              <li><a href="#" className="hover:underline">{isEn ? 'Help Center' : 'Centre d\'aide'}</a></li>
              <li><a href="mailto:support@plainledger.ca" className="hover:underline">support@plainledger.ca</a></li>
              <li><a href="#" className="hover:underline">{isEn ? 'Privacy Policy' : 'Confidentialité'}</a></li>
              <li><a href="#" className="hover:underline">{isEn ? 'Terms of Service' : 'Conditions d\'utilisation'}</a></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <p className="text-sm text-muted">
            © 2026 PlainLedger Inc. {isEn ? 'All rights reserved.' : 'Tous droits réservés.'}
          </p>
          <div className="flex items-center gap-4 text-sm text-muted">
            <span className="flex items-center gap-1">
              <Shield className="w-4 h-4 store-check-icon" />
              {isEn ? 'Built by CPAs' : 'Conçu par des CPA'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Check className="w-4 h-4 store-check-icon-success" />
              {isEn ? 'Data stays in Canada' : 'Données au Canada'}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// =====================================================
// MAIN STORE PAGE
// =====================================================

export default function Store() {
  const { language, setLanguage } = useI18n();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEn = language === 'en';
  const [showDemoModal, setShowDemoModal] = useState(false);

  // Track page view
  useEffect(() => {
    analytics.page('Store Landing Page', {
      referrer: document.referrer,
      utm_source: searchParams.get('utm_source') || undefined,
      utm_medium: searchParams.get('utm_medium') || undefined,
      utm_campaign: searchParams.get('utm_campaign') || undefined,
    });
  }, [searchParams]);

  const toggleLanguage = () => {
    setLanguage(isEn ? 'fr' : 'en');
  };

  const handleGetStarted = () => {
    analytics.track('demo_modal_cta_clicked', { action: 'start_free' });
    setShowDemoModal(false);
    navigate('/signup');
  };

  const handleScheduleCall = () => {
    analytics.track('schedule_call_clicked', { location: 'industry_kpi_section' });
    // Open calendar or contact form - for now, navigate to contact
    window.open('https://calendly.com/anthonypaquet1508', '_blank');
  };

  return (
    <div style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
      <PublicHeader fullMenu={false} />
      <main>
        <HeroSection isEn={isEn} onWatchDemo={() => setShowDemoModal(true)} />
        <FeaturesSection isEn={isEn} />
        <IndustryKPISection onScheduleCall={handleScheduleCall} />
        <PricingSection isEn={isEn} />
        <TestimonialsSection isEn={isEn} />
        <CTASection isEn={isEn} />
      </main>
      <Footer isEn={isEn} />
      
      {/* Demo Modal */}
      <DemoModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        isEn={isEn}
        onGetStarted={handleGetStarted}
      />
    </div>
  );
}

export { Store };
