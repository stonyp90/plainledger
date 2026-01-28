/**
 * Premium Feature Gate Component
 * Shows grayed-out premium sections with upgrade CTA for free/starter tier users
 */

import { ReactNode, useState } from 'react';
import { Lock, Sparkles, Calendar, ArrowRight, Crown, Rocket, Mail } from 'lucide-react';
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
  | 'boardMeeting';

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

// Feature metadata for display
const FEATURE_INFO: Record<PremiumFeature, { 
  titleEn: string; 
  titleFr: string; 
  descEn: string; 
  descFr: string;
  icon: typeof Sparkles;
  plans: ('professional' | 'enterprise')[];
}> = {
  aiInsights: {
    titleEn: 'AI-Powered Insights',
    titleFr: 'Insights propulsés par l\'IA',
    descEn: 'Get intelligent analysis and natural language queries for your financial data.',
    descFr: 'Obtenez des analyses intelligentes et des requêtes en langage naturel pour vos données financières.',
    icon: Sparkles,
    plans: ['professional', 'enterprise'],
  },
  customReports: {
    titleEn: 'Custom Reports',
    titleFr: 'Rapports personnalisés',
    descEn: 'Create unlimited custom reports with advanced visualizations.',
    descFr: 'Créez des rapports personnalisés illimités avec des visualisations avancées.',
    icon: Rocket,
    plans: ['professional', 'enterprise'],
  },
  powerBI: {
    titleEn: 'Power BI Integration',
    titleFr: 'Intégration Power BI',
    descEn: 'Connect your data to Power BI for enterprise-grade analytics.',
    descFr: 'Connectez vos données à Power BI pour des analyses de niveau entreprise.',
    icon: Crown,
    plans: ['enterprise'],
  },
  apiAccess: {
    titleEn: 'API Access',
    titleFr: 'Accès API',
    descEn: 'Programmatic access to your financial data via REST API.',
    descFr: 'Accès programmatique à vos données financières via API REST.',
    icon: Rocket,
    plans: ['professional', 'enterprise'],
  },
  auditLogs: {
    titleEn: 'Audit Logs',
    titleFr: 'Journaux d\'audit',
    descEn: 'Complete audit trail of all actions for compliance.',
    descFr: 'Historique complet de toutes les actions pour la conformité.',
    icon: Lock,
    plans: ['enterprise'],
  },
  webhooks: {
    titleEn: 'Webhooks',
    titleFr: 'Webhooks',
    descEn: 'Real-time notifications for data changes and events.',
    descFr: 'Notifications en temps réel pour les changements de données.',
    icon: Rocket,
    plans: ['enterprise'],
  },
  sso: {
    titleEn: 'Single Sign-On (SSO)',
    titleFr: 'Authentification unique (SSO)',
    descEn: 'Enterprise authentication with your identity provider.',
    descFr: 'Authentification entreprise avec votre fournisseur d\'identité.',
    icon: Lock,
    plans: ['enterprise'],
  },
  strategicPlanning: {
    titleEn: 'Strategic Planning',
    titleFr: 'Planification stratégique',
    descEn: 'Advanced financial modeling, scenarios, and forecasting tools.',
    descFr: 'Modélisation financière avancée, scénarios et outils de prévision.',
    icon: Sparkles,
    plans: ['professional', 'enterprise'],
  },
  advancedAnalytics: {
    titleEn: 'Advanced Analytics',
    titleFr: 'Analytique avancée',
    descEn: 'Deep financial analytics with custom KPIs and benchmarking.',
    descFr: 'Analyses financières approfondies avec KPIs personnalisés.',
    icon: Crown,
    plans: ['professional', 'enterprise'],
  },
  boardMeeting: {
    titleEn: 'Board Meeting Tools',
    titleFr: 'Outils de réunion CA',
    descEn: 'Generate professional board presentations and financial summaries.',
    descFr: 'Générez des présentations professionnelles pour le conseil d\'administration.',
    icon: Crown,
    plans: ['professional', 'enterprise'],
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

  // Full card mode (default)
  return (
    <div className={`relative rounded-xl overflow-hidden ${className}`}>
      {/* Grayed out preview of content */}
      {showPreview && (
        <div className="opacity-20 pointer-events-none blur-[3px] select-none">
          {children}
        </div>
      )}
      
      {/* Premium Gate Overlay */}
      <div 
        className={`${showPreview ? 'absolute inset-0' : ''} flex items-center justify-center p-6`}
        style={{ 
          background: showPreview 
            ? 'linear-gradient(135deg, rgb(var(--color-surface) / 0.95) 0%, rgb(var(--color-bg-muted) / 0.95) 100%)'
            : 'rgb(var(--color-surface))',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="text-center max-w-md">
          {/* Feature Icon */}
          <div 
            className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ 
              background: 'linear-gradient(135deg, rgb(var(--color-primary-500) / 0.15) 0%, rgb(var(--color-primary-600) / 0.1) 100%)',
            }}
          >
            <Icon className="w-8 h-8" style={{ color: 'rgb(var(--color-primary-500))' }} />
          </div>
          
          {/* Lock Badge */}
          <div 
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3"
            style={{ 
              backgroundColor: 'rgb(var(--color-warning) / 0.15)',
              color: 'rgb(var(--color-warning))',
            }}
          >
            <Lock className="w-3 h-3" />
            {isEn ? `${requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)} Plan` : `Plan ${requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)}`}
          </div>
          
          {/* Title */}
          <h3 
            className="text-xl font-bold mb-2"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {displayTitle}
          </h3>
          
          {/* Description */}
          <p 
            className="text-sm mb-6 leading-relaxed"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {displayDesc}
          </p>
          
          {/* CTA Options */}
          {showEmailForm && showEmailFormState ? (
            <div className="w-full max-w-md mx-auto">
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
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {showEmailForm && (
                <button
                  onClick={() => setShowEmailFormState(true)}
                  className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-surface))',
                    color: 'rgb(var(--color-text))',
                    border: '1px solid rgb(var(--color-border))',
                  }}
                >
                  <Mail className="w-5 h-5" />
                  <span>{isEn ? 'Request Information' : 'Demander des informations'}</span>
                </button>
              )}
              <button
                onClick={handleUpgradeClick}
                className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105 hover:shadow-xl"
                style={{ 
                  background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
                  boxShadow: '0 4px 14px rgb(var(--color-primary-500) / 0.4)',
                }}
              >
                <Calendar className="w-5 h-5" />
                <span>{isEn ? 'Schedule Upgrade Call' : 'Planifier un appel'}</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          )}
          
          {/* Current Plan Info */}
          <p 
            className="text-xs mt-4"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn 
              ? `You're currently on the ${currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} plan`
              : `Vous êtes actuellement sur le plan ${currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}`
            }
          </p>
          
          {/* Benefits List */}
          <div className="mt-6 pt-6 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <p className="text-xs font-semibold mb-3" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn ? 'Upgrade includes:' : 'La mise à niveau inclut:'}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                isEn ? 'Unlimited AI queries' : 'Requêtes IA illimitées',
                isEn ? 'Advanced analytics' : 'Analytique avancée',
                isEn ? 'Priority support' : 'Support prioritaire',
              ].map((benefit, idx) => (
                <span 
                  key={idx}
                  className="px-3 py-1 rounded-full text-xs"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-success) / 0.1)',
                    color: 'rgb(var(--color-success))',
                  }}
                >
                  ✓ {benefit}
                </span>
              ))}
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
export function PremiumBadge({ feature }: { feature: PremiumFeature }) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const { hasAccess } = usePremiumFeature(feature);
  
  if (hasAccess) return null;
  
  return (
    <span 
      className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide"
      style={{ 
        backgroundColor: 'rgb(var(--color-warning) / 0.15)',
        color: 'rgb(var(--color-warning))',
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
 * Premium upgrade banner for pages
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
  
  const handleUpgradeClick = () => {
    window.open(CALENDLY_URL, '_blank');
  };
  
  return (
    <div 
      className="relative rounded-xl p-4 mb-6 overflow-hidden"
      style={{ 
        background: 'linear-gradient(135deg, rgb(var(--color-primary-500) / 0.08) 0%, rgb(var(--color-primary-600) / 0.05) 100%)',
        border: '1px solid rgb(var(--color-primary-500) / 0.2)',
      }}
    >
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgb(var(--color-primary-500)) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />
      
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.15)' }}
        >
          <Sparkles className="w-6 h-6" style={{ color: 'rgb(var(--color-primary-500))' }} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Unlock Premium Features' : 'Débloquez les fonctionnalités Premium'}
            </h4>
            <span 
              className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
              style={{ 
                backgroundColor: 'rgb(var(--color-warning) / 0.15)',
                color: 'rgb(var(--color-warning))',
              }}
            >
              {requiredPlan}
            </span>
          </div>
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? featureInfo.descEn : featureInfo.descFr}
          </p>
        </div>
        
        <button
          onClick={handleUpgradeClick}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white transition-all hover:scale-105 flex-shrink-0"
          style={{ 
            background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
          }}
        >
          <Calendar className="w-4 h-4" />
          <span>{isEn ? 'Talk to Sales' : 'Parler aux ventes'}</span>
        </button>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-2 right-2 p-1 rounded-full opacity-50 hover:opacity-100 transition-opacity"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
