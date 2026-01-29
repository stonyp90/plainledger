/**
 * Demo Signup Welcome Banner
 * Shows for new signups in demo-signup organization
 * Displays subscription tiers and clear CTA to contact us for real data access
 */

import { Calendar, Mail, Sparkles, Check, ArrowRight, Building2, Users, Zap } from 'lucide-react';
import { useAuth } from '../lib/keycloak';
import { useI18n } from '../lib/i18n';
import UpgradeRequestForm from './UpgradeRequestForm';
import { useState } from 'react';

// Calendly link for upgrade consultations
const CALENDLY_URL = 'https://calendly.com/anthonypaquet1508';

// Subscription tiers
const TIERS = {
  en: [
    {
      id: 'starter',
      name: 'Starter',
      description: 'For small businesses',
      icon: Building2,
      features: [
        'Connect 1 accounting software',
        'Financial dashboard',
        'Basic reports',
        'Email support',
      ],
      highlight: false,
    },
    {
      id: 'professional',
      name: 'Professional',
      description: 'For growing companies',
      icon: Users,
      features: [
        'Connect up to 3 integrations',
        'Advanced analytics',
        'AI-powered insights',
        'Priority support',
        'Custom reports',
      ],
      highlight: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For large organizations',
      icon: Zap,
      features: [
        'Unlimited integrations',
        'Strategic planning tools',
        'Board meeting presentations',
        'Dedicated account manager',
        'Custom integrations',
      ],
      highlight: false,
    },
  ],
  fr: [
    {
      id: 'starter',
      name: 'Démarrage',
      description: 'Pour les petites entreprises',
      icon: Building2,
      features: [
        'Connecter 1 logiciel comptable',
        'Tableau de bord financier',
        'Rapports de base',
        'Support par courriel',
      ],
      highlight: false,
    },
    {
      id: 'professional',
      name: 'Professionnel',
      description: 'Pour les entreprises en croissance',
      icon: Users,
      features: [
        'Jusqu\'à 3 intégrations',
        'Analyses avancées',
        'Insights propulsés par l\'IA',
        'Support prioritaire',
        'Rapports personnalisés',
      ],
      highlight: true,
    },
    {
      id: 'enterprise',
      name: 'Entreprise',
      description: 'Pour les grandes organisations',
      icon: Zap,
      features: [
        'Intégrations illimitées',
        'Outils de planification stratégique',
        'Présentations de CA',
        'Gestionnaire de compte dédié',
        'Intégrations sur mesure',
      ],
      highlight: false,
    },
  ],
};

export default function DemoSignupWelcome() {
  const { user } = useAuth();
  const { language } = useI18n();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const isEn = language === 'en';
  
  const isDemoSignupUser = user?.organization === 'demo-signup';
  
  if (!isDemoSignupUser) return null;

  const handleUpgradeClick = () => {
    window.open(CALENDLY_URL, '_blank');
  };

  const handleEmailFormSubmitted = () => {
    setShowEmailForm(false);
  };

  const tiers = isEn ? TIERS.en : TIERS.fr;

  return (
    <div 
      className="relative overflow-hidden rounded-xl sm:rounded-2xl p-6 sm:p-8 mb-6 border"
      style={{ 
        background: 'linear-gradient(135deg, rgb(var(--color-warning) / 0.08) 0%, rgb(var(--color-warning) / 0.02) 100%)',
        borderColor: 'rgb(var(--color-warning) / 0.3)',
      }}
    >
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgb(var(--color-warning)) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />
      
      <div className="relative">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span 
              className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide"
              style={{ 
                backgroundColor: 'rgb(var(--color-warning) / 0.15)',
                color: 'rgb(var(--color-warning))',
              }}
            >
              {isEn ? 'DEMO MODE' : 'MODE DÉMO'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Welcome! You\'re Viewing Sample Data' : 'Bienvenue! Vous visualisez des données d\'exemple'}
          </h2>
          <p className="text-sm sm:text-base leading-relaxed max-w-2xl mx-auto" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn 
              ? 'All data shown is fictional and for preview purposes only. A subscription is required to connect your accounting software and access your real financial data.'
              : 'Toutes les données affichées sont fictives et uniquement pour aperçu. Un abonnement est requis pour connecter votre logiciel comptable et accéder à vos vraies données financières.'
            }
          </p>
        </div>

        {/* Important Notice - Integration Restriction */}
        <div 
          className="p-4 rounded-xl mb-6 flex items-start gap-3"
          style={{ 
            backgroundColor: 'rgb(var(--color-error) / 0.06)',
            border: '1px solid rgb(var(--color-error) / 0.2)',
          }}
        >
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgb(var(--color-error) / 0.1)' }}
          >
            <Building2 className="w-5 h-5" style={{ color: 'rgb(var(--color-error))' }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold mb-1" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Software Integration Not Available in Demo' : 'Intégration logicielle non disponible en démo'}
            </p>
            <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn 
                ? 'Without a subscription, you cannot connect your QuickBooks, Sage, Xero, or other accounting software. All features are shown with test data only.'
                : 'Sans abonnement, vous ne pouvez pas connecter votre QuickBooks, Sage, Xero ou autre logiciel comptable. Toutes les fonctionnalités sont affichées avec des données de test uniquement.'
              }
            </p>
          </div>
        </div>

        {/* Subscription Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {tiers.map((tier) => (
            <div 
              key={tier.id}
              className={`relative rounded-xl p-5 transition-all ${
                tier.highlight ? 'scale-[1.02] shadow-lg' : ''
              }`}
              style={{ 
                backgroundColor: tier.highlight 
                  ? 'rgb(var(--color-primary-500) / 0.08)'
                  : 'rgb(var(--color-surface))',
                border: tier.highlight 
                  ? '2px solid rgb(var(--color-primary-500))'
                  : '1px solid rgb(var(--color-border))',
              }}
            >
              {tier.highlight && (
                <span 
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-primary-500))',
                    color: 'white',
                  }}
                >
                  {isEn ? 'Most Popular' : 'Le plus populaire'}
                </span>
              )}
              
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ 
                    backgroundColor: tier.highlight 
                      ? 'rgb(var(--color-primary-500) / 0.15)'
                      : 'rgb(var(--color-bg-muted))',
                  }}
                >
                  <tier.icon 
                    className="w-5 h-5" 
                    style={{ 
                      color: tier.highlight 
                        ? 'rgb(var(--color-primary-500))'
                        : 'rgb(var(--color-text-muted))',
                    }} 
                  />
                </div>
                <div>
                  <h3 className="font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                    {tier.name}
                  </h3>
                  <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {tier.description}
                  </p>
                </div>
              </div>
              
              <ul className="space-y-2">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <Check 
                      className="w-4 h-4 mt-0.5 flex-shrink-0" 
                      style={{ color: 'rgb(var(--color-success))' }} 
                    />
                    <span style={{ color: 'rgb(var(--color-text-muted))' }}>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Notice */}
        <div 
          className="p-4 rounded-lg mb-6 flex items-start gap-3"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))',
          }}
        >
          <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-primary-500))' }} />
          <div className="flex-1">
            <p className="text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Ready to get started?' : 'Prêt à commencer?'}
            </p>
            <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn 
                ? 'Contact us to discuss pricing and find the plan that fits your needs. We\'ll help you connect your accounting software and access your real data.'
                : 'Contactez-nous pour discuter des tarifs et trouver le forfait qui correspond à vos besoins. Nous vous aiderons à connecter votre logiciel comptable et à accéder à vos vraies données.'
              }
            </p>
          </div>
        </div>

        {/* CTA Section */}
        {showEmailForm ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <UpgradeRequestForm
              feature="subscription"
              compact={false}
              showCalendlyOption={true}
              onSubmitted={handleEmailFormSubmitted}
              title={isEn ? 'Get Started Today' : 'Commencez aujourd\'hui'}
              description={isEn 
                ? 'Fill out the form below and we\'ll contact you to discuss pricing and set up your account with real data.'
                : 'Remplissez le formulaire ci-dessous et nous vous contacterons pour discuter des tarifs et configurer votre compte avec des données réelles.'
              }
            />
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowEmailForm(true)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105"
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))',
                color: 'rgb(var(--color-text))',
                border: '1px solid rgb(var(--color-border))',
              }}
            >
              <Mail className="w-5 h-5" />
              <span>{isEn ? 'Request Pricing' : 'Demander les tarifs'}</span>
            </button>
            <button
              onClick={handleUpgradeClick}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105 hover:shadow-xl"
              style={{ 
                background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
                boxShadow: '0 4px 14px rgb(var(--color-primary-500) / 0.4)',
              }}
            >
              <Calendar className="w-5 h-5" />
              <span>{isEn ? 'Schedule a Call' : 'Planifier un appel'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
