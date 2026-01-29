/**
 * Premium Feature Gate Component
 * Shows premium sections with upgrade CTA for free/starter tier users
 * Redesigned for better UI/UX with aspirational design
 */

import { ReactNode, useState } from 'react';
import { Lock, Sparkles, Calendar, ArrowRight, Crown, Rocket, Mail, Check, TrendingUp, BarChart3, LineChart, Zap, Target, Shield } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import { useI18n } from '../lib/i18n';
import UpgradeRequestForm from './UpgradeRequestForm';

// Calendly link for upgrade consultations
const CALENDLY_URL = 'https://calendly.com/anthonypaquet1508';

export type PremiumFeature = 
  | 'aiInsights' 
  | 'customReports' 
  | 'powerBI' 
  | 'apiAccess' 
  | 'auditLogs' 
  | 'webhooks' 
  | 'sso'
  | 'strategicPlanning'
  | 'advancedAnalytics'
  | 'boardMeeting'
  | 'marketAnalysis'
  | 'taxCredits';

interface PremiumFeatureGateProps {
  children: ReactNode;
  feature: PremiumFeature;
  /** Compact mode for inline elements */
  compact?: boolean;
  /** Show as card with preview */
  showPreview?: boolean;
  /** Custom title override */
  title?: string;
  /** Custom description override */
  description?: string;
  /** Additional class names */
  className?: string;
  /** Show email form option alongside Calendly */
  showEmailForm?: boolean;
  /** Default to email form instead of Calendly */
  defaultToEmailForm?: boolean;
}

// Feature metadata for display with highlights
const FEATURE_INFO: Record<PremiumFeature, { 
  titleEn: string; 
  titleFr: string; 
  descEn: string; 
  descFr: string;
  icon: typeof Sparkles;
  plans: ('professional' | 'enterprise')[];
  highlightsEn: string[];
  highlightsFr: string[];
}> = {
  aiInsights: {
    titleEn: 'AI-Powered Insights',
    titleFr: 'Insights propulsés par l\'IA',
    descEn: 'Ask questions in plain English and get instant answers. Our AI analyzes your financial data to surface trends, anomalies, and opportunities you might miss.',
    descFr: 'Posez des questions en langage naturel et obtenez des réponses instantanées. Notre IA analyse vos données pour révéler tendances, anomalies et opportunités.',
    icon: Sparkles,
    plans: ['professional', 'enterprise'],
    highlightsEn: ['Natural language queries', 'Anomaly detection', 'Trend analysis'],
    highlightsFr: ['Requêtes en langage naturel', 'Détection d\'anomalies', 'Analyse des tendances'],
  },
  customReports: {
    titleEn: 'Custom Reports',
    titleFr: 'Rapports personnalisés',
    descEn: 'Create unlimited custom reports with advanced visualizations.',
    descFr: 'Créez des rapports personnalisés illimités avec des visualisations avancées.',
    icon: Rocket,
    plans: ['professional', 'enterprise'],
    highlightsEn: ['Unlimited reports', 'Custom templates', 'Scheduled delivery'],
    highlightsFr: ['Rapports illimités', 'Modèles personnalisés', 'Livraison programmée'],
  },
  powerBI: {
    titleEn: 'Power BI Integration',
    titleFr: 'Intégration Power BI',
    descEn: 'Connect your data to Power BI for enterprise-grade analytics.',
    descFr: 'Connectez vos données à Power BI pour des analyses de niveau entreprise.',
    icon: Crown,
    plans: ['enterprise'],
    highlightsEn: ['Real-time sync', 'Custom dashboards', 'Enterprise security'],
    highlightsFr: ['Sync en temps réel', 'Tableaux personnalisés', 'Sécurité entreprise'],
  },
  apiAccess: {
    titleEn: 'API Access',
    titleFr: 'Accès API',
    descEn: 'Programmatic access to your financial data via REST API.',
    descFr: 'Accès programmatique à vos données financières via API REST.',
    icon: Rocket,
    plans: ['professional', 'enterprise'],
    highlightsEn: ['RESTful API', 'Webhooks support', 'Rate limiting'],
    highlightsFr: ['API RESTful', 'Support webhooks', 'Limitation de débit'],
  },
  auditLogs: {
    titleEn: 'Audit Logs',
    titleFr: 'Journaux d\'audit',
    descEn: 'Complete audit trail of all actions for compliance.',
    descFr: 'Historique complet de toutes les actions pour la conformité.',
    icon: Shield,
    plans: ['enterprise'],
    highlightsEn: ['Full history', 'Export reports', 'Compliance ready'],
    highlightsFr: ['Historique complet', 'Export rapports', 'Conformité prête'],
  },
  webhooks: {
    titleEn: 'Webhooks',
    titleFr: 'Webhooks',
    descEn: 'Real-time notifications for data changes and events.',
    descFr: 'Notifications en temps réel pour les changements de données.',
    icon: Zap,
    plans: ['enterprise'],
    highlightsEn: ['Real-time events', 'Custom endpoints', 'Retry logic'],
    highlightsFr: ['Événements temps réel', 'Endpoints personnalisés', 'Logique de retry'],
  },
  sso: {
    titleEn: 'Single Sign-On (SSO)',
    titleFr: 'Authentification unique (SSO)',
    descEn: 'Enterprise authentication with your identity provider.',
    descFr: 'Authentification entreprise avec votre fournisseur d\'identité.',
    icon: Lock,
    plans: ['enterprise'],
    highlightsEn: ['SAML 2.0', 'OAuth integration', 'MFA support'],
    highlightsFr: ['SAML 2.0', 'Intégration OAuth', 'Support MFA'],
  },
  strategicPlanning: {
    titleEn: 'Strategic Planning',
    titleFr: 'Planification stratégique',
    descEn: 'Plan your cash runway with confidence. Model expenses, forecast scenarios, and make data-driven decisions for sustainable growth.',
    descFr: 'Planifiez votre trésorerie en toute confiance. Modélisez vos dépenses, prévoyez des scénarios et prenez des décisions éclairées pour une croissance durable.',
    icon: Target,
    plans: ['professional', 'enterprise'],
    highlightsEn: ['Scenario modeling', 'Cash flow forecasting', 'Budget planning'],
    highlightsFr: ['Modélisation de scénarios', 'Prévision trésorerie', 'Planification budget'],
  },
  advancedAnalytics: {
    titleEn: 'Advanced Analytics',
    titleFr: 'Analytique avancée',
    descEn: 'Dive deep into your financials with interactive charts, custom KPIs, and industry benchmarking. Understand performance at a glance with visual dashboards.',
    descFr: 'Explorez vos finances en profondeur avec graphiques interactifs, KPIs personnalisés et comparaisons sectorielles. Comprenez votre performance en un coup d\'œil.',
    icon: BarChart3,
    plans: ['professional', 'enterprise'],
    highlightsEn: ['Interactive charts', 'Custom KPIs', 'Industry benchmarks'],
    highlightsFr: ['Graphiques interactifs', 'KPIs personnalisés', 'Benchmarks sectoriels'],
  },
  boardMeeting: {
    titleEn: 'Board Meeting Tools',
    titleFr: 'Outils de réunion CA',
    descEn: 'Generate polished board presentations in minutes. Auto-create executive summaries, financial highlights, and key metrics that impress stakeholders.',
    descFr: 'Créez des présentations de conseil en quelques minutes. Résumés exécutifs, points financiers et métriques clés générés automatiquement.',
    icon: Crown,
    plans: ['professional', 'enterprise'],
    highlightsEn: ['Auto presentations', 'Executive summaries', 'Share securely'],
    highlightsFr: ['Présentations auto', 'Résumés exécutifs', 'Partage sécurisé'],
  },
  marketAnalysis: {
    titleEn: 'AI-Powered Market Intelligence',
    titleFr: 'Intelligence de marché propulsée par l\'IA',
    descEn: 'Our AI analyzes data from 75,000+ Canadian businesses to reveal your competitive position, identify growth opportunities, and benchmark your performance against industry leaders.',
    descFr: 'Notre IA analyse les données de plus de 75 000 entreprises canadiennes pour révéler votre position concurrentielle, identifier les opportunités de croissance et comparer vos performances aux leaders du secteur.',
    icon: TrendingUp,
    plans: ['professional', 'enterprise'],
    highlightsEn: ['AI-analyzed benchmarks', 'Smart recommendations', 'Competitive positioning'],
    highlightsFr: ['Benchmarks analysés par IA', 'Recommandations intelligentes', 'Positionnement concurrentiel'],
  },
  taxCredits: {
    titleEn: 'Tax Credits & Incentives',
    titleFr: 'Crédits d\'impôt et incitatifs',
    descEn: 'Discover tax credits you may be eligible for based on your industry, province, and financial profile. Get estimated savings and connect with certified partners for expert guidance.',
    descFr: 'Découvrez les crédits d\'impôt auxquels vous pourriez être admissible selon votre secteur, province et profil financier. Obtenez des estimations d\'économies et connectez-vous avec des partenaires certifiés.',
    icon: Target,
    plans: ['professional', 'enterprise'],
    highlightsEn: ['Eligibility scoring', 'Estimated savings', 'Expert partner referrals'],
    highlightsFr: ['Score d\'admissibilité', 'Économies estimées', 'Références d\'experts'],
  },
};

export function usePremiumFeature(feature: PremiumFeature): {
  hasAccess: boolean;
  requiredPlan: string;
  currentPlan: string;
} {
  const { currentTenant } = useTenant();
  
  const plan = currentTenant?.plan || 'free';
  const featureInfo = FEATURE_INFO[feature];
  
  // Check if user's plan includes this feature
  const hasAccess = featureInfo.plans.includes(plan as 'professional' | 'enterprise') || 
                    currentTenant?.settings?.features?.[feature as keyof typeof currentTenant.settings.features] === true;
  
  const requiredPlan = featureInfo.plans[0] || 'professional';
  
  return {
    hasAccess,
    requiredPlan,
    currentPlan: plan,
  };
}

export default function PremiumFeatureGate({
  children,
  feature,
  compact = false,
  showPreview = true,
  title,
  description,
  className = '',
  showEmailForm = true,
  defaultToEmailForm = false,
}: PremiumFeatureGateProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const { hasAccess, requiredPlan, currentPlan } = usePremiumFeature(feature);
  const [showEmailFormState, setShowEmailFormState] = useState(defaultToEmailForm);
  
  const featureInfo = FEATURE_INFO[feature];
  const Icon = featureInfo.icon;
  const highlights = isEn ? featureInfo.highlightsEn : featureInfo.highlightsFr;
  
  // If user has access, render children normally
  if (hasAccess) {
    return <>{children}</>;
  }
  
  const displayTitle = title || (isEn ? featureInfo.titleEn : featureInfo.titleFr);
  const displayDesc = description || (isEn ? featureInfo.descEn : featureInfo.descFr);
  
  const handleUpgradeClick = () => {
    window.open(CALENDLY_URL, '_blank');
  };
  
  const handleEmailFormSubmitted = () => {
    setShowEmailFormState(false);
  };

  // Compact mode for inline elements
  if (compact) {
    return (
      <div className={`relative ${className}`}>
        {/* Grayed out content */}
        {showPreview && (
          <div className="opacity-30 pointer-events-none blur-[2px] select-none">
            {children}
          </div>
        )}
        
        {/* Overlay CTA */}
        <div 
          className={`${showPreview ? 'absolute inset-0' : ''} flex items-center justify-center`}
        >
          {showEmailForm && showEmailFormState ? (
            <div className="w-full max-w-sm mx-auto p-4">
              <UpgradeRequestForm
                feature={feature}
                compact={true}
                showCalendlyOption={true}
                onSubmitted={handleEmailFormSubmitted}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {showEmailForm && (
                <button
                  onClick={() => setShowEmailFormState(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-surface))',
                    color: 'rgb(var(--color-text))',
                    border: '1px solid rgb(var(--color-border))',
                  }}
                >
                  <Mail className="w-4 h-4" />
                  <span>{isEn ? 'Request Info' : 'Demander info'}</span>
                </button>
              )}
              <button
                onClick={handleUpgradeClick}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105 hover:shadow-lg"
                style={{ 
                  backgroundColor: 'rgb(var(--color-primary-500))',
                  color: 'white',
                }}
              >
                <Lock className="w-4 h-4" />
                <span>{isEn ? 'Upgrade to unlock' : 'Passer au niveau supérieur'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full card mode (default) - Enhanced aspirational design
  return (
    <div className={`relative rounded-xl overflow-hidden ${className}`}>
      {/* Grayed out preview of content */}
      {showPreview && (
        <div className="opacity-15 pointer-events-none blur-[4px] select-none">
          {children}
        </div>
      )}
      
      {/* Premium Gate Overlay - Redesigned for better UX */}
      <div 
        className={`${showPreview ? 'absolute inset-0 overflow-y-auto' : ''} flex items-center justify-center p-3 sm:p-4 lg:p-6`}
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
        }}
      >
        {/* Background decorative elements */}
        <div 
          className="absolute top-0 right-0 w-48 h-48 opacity-[0.02] pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgb(var(--color-accent-500)) 0%, transparent 70%)',
          }}
        />
        
        <div className="relative w-full max-w-4xl mx-auto my-auto">
          {/* Main content card */}
          <div 
            className="rounded-xl p-5 sm:p-6 lg:p-8"
            style={{
              backgroundColor: 'rgb(var(--color-surface))',
              border: '1px solid rgb(var(--color-border))',
              boxShadow: '0 2px 4px -1px rgb(0 0 0 / 0.03), 0 4px 8px -2px rgb(0 0 0 / 0.04)',
            }}
          >
            {/* Two-column layout on larger screens */}
            <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8">
              {/* Left Column - Main Info */}
              <div className="flex-1 text-center lg:text-left">
                {/* Icon - smaller and tighter */}
                <div className="relative inline-flex mb-4">
                  <div 
                    className="absolute inset-0 rounded-xl"
                    style={{ 
                      background: 'rgb(var(--color-accent-500) / 0.15)',
                      filter: 'blur(10px)',
                    }}
                  />
                  <div 
                    className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center"
                    style={{ 
                      background: 'linear-gradient(135deg, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-600)) 100%)',
                      boxShadow: '0 2px 8px rgb(var(--color-accent-500) / 0.25)',
                    }}
                  >
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                
                {/* Title - smaller */}
                <h3 
                  className="text-xl sm:text-2xl font-bold mb-2.5"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {displayTitle}
                </h3>
                
                {/* Description - tighter */}
                <p 
                  className="text-sm sm:text-base leading-relaxed mb-5 max-w-lg"
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                >
                  {displayDesc}
                </p>
                
                {/* Feature highlights - more compact */}
                <div className="flex flex-wrap justify-center lg:justify-start gap-1.5 mb-6">
                  {highlights.map((highlight, idx) => (
                    <span 
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium"
                      style={{ 
                        backgroundColor: 'rgb(var(--color-accent-500) / 0.08)',
                        color: 'rgb(var(--color-accent-700))',
                        border: '1px solid rgb(var(--color-accent-500) / 0.15)',
                      }}
                    >
                      <Check className="w-3 h-3" style={{ color: 'rgb(var(--color-accent-600))' }} />
                      {highlight}
                    </span>
                  ))}
                </div>
                
                {/* CTA Buttons - more compact */}
                {showEmailForm && showEmailFormState ? (
                  <div className="w-full text-left">
                    <UpgradeRequestForm
                      feature={feature}
                      compact={false}
                      showCalendlyOption={true}
                      onSubmitted={handleEmailFormSubmitted}
                      title={displayTitle}
                      description={displayDesc}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2.5 justify-center lg:justify-start">
                    <button
                      onClick={handleUpgradeClick}
                      className="group inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                      style={{ 
                        background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
                        boxShadow: '0 2px 8px rgb(var(--color-primary-500) / 0.3), inset 0 1px 0 rgb(255 255 255 / 0.1)',
                      }}
                    >
                      <Calendar className="w-4 h-4" />
                      <span>{isEn ? 'Schedule Call' : 'Planifier un appel'}</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                    {showEmailForm && (
                      <button
                        onClick={() => setShowEmailFormState(true)}
                        className="group inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        style={{ 
                          background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
                          boxShadow: '0 2px 8px rgb(var(--color-primary-500) / 0.3), inset 0 1px 0 rgb(255 255 255 / 0.1)',
                        }}
                      >
                        <Mail className="w-4 h-4" />
                        <span>{isEn ? 'Request Info' : 'Demander info'}</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Right Column - Plan info card - more compact */}
              <div 
                className="lg:w-56 flex-shrink-0 rounded-lg p-4 mt-2 lg:mt-0"
                style={{ 
                  backgroundColor: 'rgb(var(--color-bg-muted) / 0.4)',
                  border: '1px solid rgb(var(--color-border) / 0.4)',
                }}
              >
                {/* Plan badge - smaller */}
                <div 
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide mb-4"
                  style={{ 
                    background: 'linear-gradient(135deg, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-600)) 100%)',
                    color: 'white',
                    boxShadow: '0 1px 4px rgb(var(--color-accent-500) / 0.25)',
                  }}
                >
                  <Crown className="w-2.5 h-2.5" />
                  {requiredPlan.toUpperCase()}
                </div>
                
                {/* Upgrade benefits */}
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-3" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Included in plan' : 'INCLUS DANS LE PLAN'}
                </p>
                <ul className="space-y-2">
                  {[
                    { icon: Sparkles, textEn: 'Unlimited AI queries', textFr: 'Requêtes IA illimitées' },
                    { icon: BarChart3, textEn: 'Advanced analytics', textFr: 'Analytique avancée' },
                    { icon: Zap, textEn: 'Priority support', textFr: 'Support prioritaire' },
                  ].map((item, idx) => (
                    <li 
                      key={idx}
                      className="flex items-center gap-2 text-xs"
                      style={{ color: 'rgb(var(--color-text-secondary))' }}
                    >
                      <item.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgb(var(--color-success))' }} />
                      <span>{isEn ? item.textEn : item.textFr}</span>
                    </li>
                  ))}
                </ul>
                
                {/* Current plan */}
                <div 
                  className="mt-4 pt-3"
                  style={{ borderTop: '1px solid rgb(var(--color-border) / 0.4)' }}
                >
                  <p className="text-[10px] mb-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'Your current plan:' : 'Votre plan actuel:'}
                  </p>
                  <p className="text-xs font-semibold capitalize" style={{ color: 'rgb(var(--color-text))' }}>
                    {currentPlan}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline upgrade badge for sidebar/navigation items
 */
export function PremiumBadge({ feature, isActive = false }: { feature: PremiumFeature; isActive?: boolean }) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const { hasAccess } = usePremiumFeature(feature);
  
  if (hasAccess) return null;
  
  return (
    <span 
      className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide"
      style={{ 
        backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgb(var(--color-accent-500) / 0.15)',
        color: isActive ? 'white' : 'rgb(var(--color-accent-700))',
      }}
    >
      {isEn ? 'PRO' : 'PRO'}
    </span>
  );
}

/**
 * Simple inline lock indicator
 */
export function PremiumLock({ feature }: { feature: PremiumFeature }) {
  const { hasAccess } = usePremiumFeature(feature);
  
  if (hasAccess) return null;
  
  return (
    <Lock 
      className="w-3.5 h-3.5 ml-1 inline-block" 
      style={{ color: 'rgb(var(--color-warning))' }} 
    />
  );
}

/**
 * Premium upgrade banner for pages - Redesigned with better visual hierarchy
 */
export function PremiumUpgradeBanner({ 
  feature, 
  onDismiss 
}: { 
  feature: PremiumFeature; 
  onDismiss?: () => void;
}) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const { hasAccess, requiredPlan } = usePremiumFeature(feature);
  
  if (hasAccess) return null;
  
  const featureInfo = FEATURE_INFO[feature];
  const Icon = featureInfo.icon;
  
  const handleUpgradeClick = () => {
    window.open(CALENDLY_URL, '_blank');
  };
  
  return (
    <div 
      className="relative rounded-2xl p-4 sm:p-5 mb-6 overflow-hidden"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        border: '1px solid rgb(var(--color-border))',
      }}
    >
      {/* Subtle gold gradient accent on top */}
      <div 
        className="absolute top-0 left-0 right-0 h-1"
        style={{ 
          background: 'linear-gradient(90deg, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-400)) 50%, rgb(var(--color-accent-500)) 100%)',
        }}
      />
      
      {/* Background decorative circle */}
      <div 
        className="absolute -right-12 -top-12 w-40 h-40 opacity-[0.03] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgb(var(--color-accent-500)) 0%, transparent 70%)',
        }}
      />
      
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Icon with subtle glow */}
        <div className="relative">
          <div 
            className="absolute inset-0 rounded-xl"
            style={{ 
              background: 'rgb(var(--color-accent-500) / 0.2)',
              filter: 'blur(8px)',
            }}
          />
          <div 
            className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ 
              background: 'linear-gradient(135deg, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-600)) 100%)',
              boxShadow: '0 2px 8px rgb(var(--color-accent-500) / 0.3)',
            }}
          >
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h4 className="font-semibold text-sm sm:text-base" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Unlock Premium Features' : 'Débloquez les fonctionnalités Premium'}
            </h4>
            <span 
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
              style={{ 
                background: 'linear-gradient(135deg, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-600)) 100%)',
                color: 'white',
                boxShadow: '0 1px 3px rgb(var(--color-accent-500) / 0.3)',
              }}
            >
              <Crown className="w-2.5 h-2.5" />
              {requiredPlan.toUpperCase()}
            </span>
          </div>
          <p className="text-xs sm:text-sm line-clamp-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? featureInfo.descEn : featureInfo.descFr}
          </p>
        </div>
        
        <button
          onClick={handleUpgradeClick}
          className="group flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex-shrink-0 text-sm"
          style={{ 
            background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
            boxShadow: '0 2px 8px rgb(var(--color-primary-500) / 0.35), inset 0 1px 0 rgb(255 255 255 / 0.1)',
            minWidth: '160px',
          }}
        >
          <Calendar className="w-4 h-4" />
          <span>{isEn ? 'Talk to Sales' : 'Parler aux ventes'}</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 p-1.5 rounded-lg opacity-50 hover:opacity-100 hover:bg-black/5 transition-all"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            <span className="sr-only">Dismiss</span>
            ×
          </button>
        )}
      </div>
    </div>
  );
}
