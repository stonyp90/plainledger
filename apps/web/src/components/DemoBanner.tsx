/**
 * Demo Banner Component
 * Displays a persistent banner indicating test data mode with subscription CTA
 * Clearly communicates that integration is not possible without a subscription
 */

import { X, AlertTriangle, ArrowRight, Link2Off, Calendar, Sparkles, Lock } from 'lucide-react';
import { useState } from 'react';
import { useDemoMode } from '../contexts/DemoModeContext';
import { useAuth } from '../lib/keycloak';
import { useI18n } from '../lib/i18n';

// Calendly link for upgrade consultations
const CALENDLY_URL = 'https://calendly.com/anthonypaquet1508';

export default function DemoBanner() {
  const { isDemoMode } = useDemoMode();
  const { user } = useAuth();
  const { language } = useI18n();
  const [isDismissed, setIsDismissed] = useState(false);
  const isEn = language === 'en';
  
  // Don't show this banner for demo-signup users (they see DemoSignupWelcome instead)
  const isDemoSignupUser = user?.organization === 'demo-signup';

  if (!isDemoMode || isDismissed || isDemoSignupUser) return null;

  const handleContactClick = () => {
    window.open(CALENDLY_URL, '_blank');
  };

  return (
    <div 
      className="relative overflow-hidden rounded-xl sm:rounded-2xl mb-4 sm:mb-6 border-2"
      style={{ 
        background: 'linear-gradient(135deg, rgb(var(--color-warning) / 0.08) 0%, rgb(var(--color-warning) / 0.03) 100%)',
        borderColor: 'rgb(var(--color-warning) / 0.4)',
      }}
    >
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgb(var(--color-warning)) 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }}
      />

      <div className="relative p-4 sm:p-5">
        {/* Header Row */}
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Icon */}
          <div 
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ 
              background: 'linear-gradient(135deg, rgb(var(--color-warning)) 0%, rgb(var(--color-warning-dark)) 100%)',
              boxShadow: '0 4px 12px rgb(var(--color-warning) / 0.3)',
            }}
          >
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h4 
                className="text-base sm:text-lg font-bold"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? 'Demo Mode - Test Data Only' : 'Mode Démo - Données de test uniquement'}
              </h4>
              <span 
                className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                style={{ 
                  backgroundColor: 'rgb(var(--color-warning) / 0.15)',
                  color: 'rgb(var(--color-warning))',
                }}
              >
                {isEn ? 'DEMO' : 'DÉMO'}
              </span>
            </div>
            <p 
              className="text-sm leading-relaxed"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'You\'re viewing sample data for demonstration purposes. All data shown is fictional and for preview only.'
                : 'Vous visualisez des données d\'exemple pour démonstration. Toutes les données affichées sont fictives et uniquement pour aperçu.'
              }
            </p>
          </div>

          {/* Dismiss Button */}
          <button
            onClick={() => setIsDismissed(true)}
            className="flex-shrink-0 p-1.5 rounded-lg transition-all hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: 'rgb(var(--color-text-muted))' }}
            aria-label={isEn ? 'Dismiss banner' : 'Fermer la bannière'}
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Key Points */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          {/* No Integration */}
          <div 
            className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-lg"
            style={{ backgroundColor: 'rgb(var(--color-surface) / 0.7)' }}
          >
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgb(var(--color-error) / 0.1)' }}
            >
              <Link2Off className="w-4 h-4" style={{ color: 'rgb(var(--color-error))' }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Integration Disabled' : 'Intégration désactivée'}
              </p>
              <p className="text-[10px] sm:text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Cannot connect software' : 'Connexion logiciel impossible'}
              </p>
            </div>
          </div>

          {/* Test Data Only */}
          <div 
            className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-lg"
            style={{ backgroundColor: 'rgb(var(--color-surface) / 0.7)' }}
          >
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgb(var(--color-warning) / 0.1)' }}
            >
              <Lock className="w-4 h-4" style={{ color: 'rgb(var(--color-warning))' }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Test Data Only' : 'Données de test uniquement'}
              </p>
              <p className="text-[10px] sm:text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Not your real data' : 'Pas vos vraies données'}
              </p>
            </div>
          </div>

          {/* Upgrade Required */}
          <div 
            className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-lg"
            style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.08)' }}
          >
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.15)' }}
            >
              <Sparkles className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Subscription Required' : 'Abonnement requis'}
              </p>
              <p className="text-[10px] sm:text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'For real data access' : 'Pour accéder aux vraies données'}
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div 
          className="mt-4 pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
          style={{ borderTop: '1px solid rgb(var(--color-border))' }}
        >
          <p className="text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn 
              ? 'Ready to connect your accounting software and see your real financial data?'
              : 'Prêt à connecter votre logiciel comptable et voir vos vraies données financières?'
            }
          </p>
          <button
            onClick={handleContactClick}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-white transition-all hover:scale-105 hover:shadow-lg flex-shrink-0"
            style={{ 
              background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
              boxShadow: '0 4px 12px rgb(var(--color-primary-500) / 0.3)',
            }}
          >
            <Calendar className="w-4 h-4" />
            <span className="text-sm">{isEn ? 'Schedule a Demo' : 'Planifier une démo'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
