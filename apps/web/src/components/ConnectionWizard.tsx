/**
 * Connection Wizard Component
 * 
 * Displays a focused interface for users without connected accounting software
 * to guide them through connecting their accounting tools.
 */

import { Link } from 'react-router-dom';
import { 
  Link2, 
  ArrowRight, 
  CheckCircle, 
  Shield, 
  RefreshCw, 
  BarChart3,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface ConnectionWizardProps {
  onConnect?: () => void;
}

export default function ConnectionWizard({ onConnect }: ConnectionWizardProps) {
  const { language } = useI18n();
  const isEn = language === 'en';

  const benefits = [
    {
      icon: RefreshCw,
      titleEn: 'Automatic Sync',
      titleFr: 'Synchronisation automatique',
      descEn: 'Your data syncs daily automatically',
      descFr: 'Vos données se synchronisent quotidiennement automatiquement',
    },
    {
      icon: BarChart3,
      titleEn: 'Real-Time Insights',
      titleFr: 'Insights en temps réel',
      descEn: 'Get board-ready reports and dashboards',
      descFr: 'Obtenez des rapports et tableaux de bord prêts pour le conseil',
    },
    {
      icon: Shield,
      titleEn: 'Secure & Read-Only',
      titleFr: 'Sécurisé et lecture seule',
      descEn: 'AES-256 encryption, we never modify your data',
      descFr: 'Chiffrement AES-256, nous ne modifions jamais vos données',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Main CTA Card */}
      <div 
        className="rounded-xl sm:rounded-2xl p-5 sm:p-6 lg:p-8 relative overflow-hidden"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          border: '2px solid rgb(var(--color-primary-500))',
        }}
      >
        {/* Background gradient */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{ 
            background: 'linear-gradient(135deg, rgb(var(--color-primary-600)) 0%, rgb(var(--color-primary-700)) 100%)',
          }}
        />

        <div className="relative">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}>
              <Link2 className="w-8 h-8" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Connect Your Accounting Software' : 'Connectez votre logiciel comptable'}
            </h2>
            <p className="text-sm sm:text-base max-w-2xl mx-auto" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn 
                ? 'Get started in minutes. Connect QuickBooks, Xero, Sage, or upload a CSV to see your financial dashboard with real data.'
                : 'Démarrez en quelques minutes. Connectez QuickBooks, Xero, Sage ou téléchargez un CSV pour voir votre tableau de bord financier avec des données réelles.'}
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={index}
                  className="flex flex-col items-center text-center p-4 rounded-lg"
                  style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}>
                    <Icon className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
                  </div>
                  <h3 className="text-sm font-semibold mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? benefit.titleEn : benefit.titleFr}
                  </h3>
                  <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? benefit.descEn : benefit.descFr}
                  </p>
                </div>
              );
            })}
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <Link
              to="/app/connections"
              onClick={onConnect}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm sm:text-base transition-all hover:opacity-90 active:scale-[0.98] shadow-lg"
              style={{ 
                backgroundColor: 'rgb(var(--color-primary-500))',
                color: 'white',
              }}
            >
              <Sparkles className="w-4 h-4" />
              {isEn ? 'Connect Now' : 'Connecter maintenant'}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="mt-3 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn 
                ? 'Supports QuickBooks, Xero, Sage, FreshBooks, Wave, and CSV uploads'
                : 'Prend en charge QuickBooks, Xero, Sage, FreshBooks, Wave et les téléchargements CSV'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Info Card */}
      <div 
        className="rounded-xl p-4 sm:p-5 flex items-start gap-3"
        style={{ 
          backgroundColor: 'rgb(var(--color-info) / 0.05)',
          border: '1px solid rgb(var(--color-info) / 0.2)',
        }}
      >
        <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-info))' }} />
        <div>
          <h3 className="text-sm font-semibold mb-1" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Why connect?' : 'Pourquoi connecter?'}
          </h3>
          <p className="text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn 
              ? 'Connecting your accounting software enables real-time financial dashboards, automated anomaly detection, industry benchmarking, and board-ready reports. Your data syncs automatically every day.'
              : 'Connecter votre logiciel comptable permet des tableaux de bord financiers en temps réel, la détection automatique d\'anomalies, le benchmarking industriel et des rapports prêts pour le conseil. Vos données se synchronisent automatiquement chaque jour.'}
          </p>
        </div>
      </div>
    </div>
  );
}
