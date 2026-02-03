/**
 * Free User Upgrade Gate Component
 * 
 * Full-screen blocking UI for free users trying to access features
 * that require a paid subscription (like connecting datasources).
 * 
 * Business Rule: Free users cannot connect datasources - they must upgrade first.
 */

import { 
  Crown, 
  ArrowRight, 
  Calendar,
  Link2, 
  BarChart3, 
  Sparkles,
  Target,
  CheckCircle2,
  Shield,
  Zap,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';

// Calendly link for upgrade consultations
const CALENDLY_URL = 'https://calendly.com/anthonypaquet1508';

interface FreeUserUpgradeGateProps {
  /** The feature they're trying to access */
  feature?: 'connections' | 'ai' | 'reports' | 'analysis';
}

export default function FreeUserUpgradeGate({ 
  feature = 'connections',
}: FreeUserUpgradeGateProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const handleScheduleClick = () => {
    window.open(CALENDLY_URL, '_blank');
  };
  
  // Feature-specific content
  const featureContent = {
    connections: {
      titleEn: 'Connect Your Accounting Software',
      titleFr: 'Connectez votre logiciel comptable',
      descEn: 'Upgrade to Professional to connect QuickBooks, Xero, Sage, and more. Get real-time financial data synced automatically.',
      descFr: 'Passez à Professional pour connecter QuickBooks, Xero, Sage et plus. Obtenez des données financières en temps réel synchronisées automatiquement.',
      icon: Link2,
    },
    ai: {
      titleEn: 'AI-Powered Financial Insights',
      titleFr: 'Insights financiers propulsés par l\'IA',
      descEn: 'Upgrade to Professional for AI analysis, natural language queries, and intelligent recommendations.',
      descFr: 'Passez à Professional pour l\'analyse IA, les requêtes en langage naturel et les recommandations intelligentes.',
      icon: Sparkles,
    },
    reports: {
      titleEn: 'Custom Financial Reports',
      titleFr: 'Rapports financiers personnalisés',
      descEn: 'Upgrade to Professional to create unlimited custom reports with advanced visualizations.',
      descFr: 'Passez à Professional pour créer des rapports personnalisés illimités avec des visualisations avancées.',
      icon: BarChart3,
    },
    analysis: {
      titleEn: 'Advanced Financial Analysis',
      titleFr: 'Analyse financière avancée',
      descEn: 'Upgrade to Professional for industry benchmarking, anomaly detection, and trend analysis.',
      descFr: 'Passez à Professional pour le benchmarking sectoriel, la détection d\'anomalies et l\'analyse des tendances.',
      icon: Target,
    },
  };
  
  const content = featureContent[feature];
  const FeatureIcon = content.icon;
  
  const benefits = isEn ? [
    { icon: Link2, title: 'Connect Any Software', desc: 'QuickBooks, Xero, Sage, and more' },
    { icon: BarChart3, title: 'Real-Time Dashboard', desc: 'Auto-synced financial data' },
    { icon: Sparkles, title: 'AI Insights', desc: 'Smart analysis & recommendations' },
    { icon: Shield, title: 'Enterprise Security', desc: 'Bank-level encryption' },
  ] : [
    { icon: Link2, title: 'Connectez n\'importe quel logiciel', desc: 'QuickBooks, Xero, Sage et plus' },
    { icon: BarChart3, title: 'Tableau de bord en temps réel', desc: 'Données financières auto-synchronisées' },
    { icon: Sparkles, title: 'Insights IA', desc: 'Analyse et recommandations intelligentes' },
    { icon: Shield, title: 'Sécurité entreprise', desc: 'Chiffrement de niveau bancaire' },
  ];

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl">
        {/* Main Card */}
        <div 
          className="rounded-2xl p-6 sm:p-10 text-center"
          style={{
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))',
            boxShadow: '0 4px 24px rgb(0 0 0 / 0.08)',
          }}
        >
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div 
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-600)) 100%)',
                boxShadow: '0 8px 24px rgb(var(--color-accent-500) / 0.3)',
              }}
            >
              <FeatureIcon className="w-10 h-10 text-white" />
            </div>
          </div>
          
          {/* Free Badge */}
          <div className="flex justify-center mb-4">
            <span 
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
              style={{
                backgroundColor: 'rgb(var(--color-warning) / 0.1)',
                color: 'rgb(var(--color-warning))',
              }}
            >
              {isEn ? 'Free Plan' : 'Plan Gratuit'}
            </span>
          </div>
          
          {/* Title */}
          <h1 
            className="text-2xl sm:text-3xl font-bold mb-3"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? content.titleEn : content.titleFr}
          </h1>
          
          {/* Description */}
          <p 
            className="text-base sm:text-lg mb-8 max-w-md mx-auto"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            {isEn ? content.descEn : content.descFr}
          </p>
          
          {/* Upgrade CTA Button */}
          <button
            onClick={handleScheduleClick}
            className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-white text-lg transition-all hover:scale-105 hover:shadow-xl"
            style={{
              background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
              boxShadow: '0 4px 16px rgb(var(--color-primary-500) / 0.3)',
            }}
          >
            <Crown className="w-5 h-5" />
            <span>{isEn ? 'Upgrade to Professional' : 'Passer à Professional'}</span>
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </button>
          
          {/* Schedule Call Option */}
          <p 
            className="mt-4 text-sm"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            <Calendar className="w-4 h-4 inline-block mr-1" />
            {isEn 
              ? 'Schedule a free demo to see all features' 
              : 'Planifiez une démo gratuite pour voir toutes les fonctionnalités'
            }
          </p>
        </div>
        
        {/* Benefits Grid */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          {benefits.map((benefit, idx) => {
            const BenefitIcon = benefit.icon;
            return (
              <div 
                key={idx}
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: 'rgb(var(--color-surface))',
                  border: '1px solid rgb(var(--color-border))',
                }}
              >
                <div className="flex items-start gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                  >
                    <BenefitIcon className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-600))' }} />
                  </div>
                  <div>
                    <h4 
                      className="text-sm font-semibold"
                      style={{ color: 'rgb(var(--color-text))' }}
                    >
                      {benefit.title}
                    </h4>
                    <p 
                      className="text-xs mt-0.5"
                      style={{ color: 'rgb(var(--color-text-muted))' }}
                    >
                      {benefit.desc}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Pricing Teaser */}
        <div 
          className="mt-8 p-6 rounded-xl text-center"
          style={{
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))',
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
            <span 
              className="font-bold"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              Professional
            </span>
          </div>
          <p 
            className="text-sm"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            {isEn 
              ? 'Starting at $49/month • Connect unlimited datasources • Real-time sync'
              : 'À partir de 49$/mois • Connectez des sources illimitées • Sync en temps réel'
            }
          </p>
        </div>
        
        {/* Demo Note */}
        <p 
          className="mt-6 text-center text-xs"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          <CheckCircle2 className="w-3.5 h-3.5 inline-block mr-1" />
          {isEn 
            ? 'You\'re currently viewing demo data. Upgrade to connect your real accounting data.' 
            : 'Vous visualisez actuellement des données de démonstration. Passez à l\'abonnement supérieur pour connecter vos vraies données comptables.'
          }
        </p>
      </div>
    </div>
  );
}
