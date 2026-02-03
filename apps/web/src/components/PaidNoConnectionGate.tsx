/**
 * Paid No Connection Gate Component
 * 
 * Full-screen blocking UI for paid users (professional/enterprise) who
 * haven't connected a datasource yet. This completely blocks access to
 * financial pages until they connect their accounting software.
 * 
 * Business Rule: Paid users see NO data until they connect - no demo data fallback.
 */

import { Link } from 'react-router-dom';
import { 
  Link2, 
  ArrowRight, 
  FileText, 
  BarChart3, 
  PieChart, 
  TrendingUp,
  Shield,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import { useI18n } from '../lib/i18n';

interface PaidNoConnectionGateProps {
  /** Optional title override */
  title?: string;
  /** Optional description override */
  description?: string;
  /** Optional: page context for more specific messaging */
  context?: 'dashboard' | 'reports' | 'statements' | 'analysis';
}

export default function PaidNoConnectionGate({ 
  title, 
  description,
  context = 'dashboard',
}: PaidNoConnectionGateProps) {
  const { currentTenant } = useTenant();
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const plan = currentTenant?.plan || 'professional';
  const planLabel = plan === 'enterprise' ? 'Enterprise' : 'Professional';
  
  // Context-aware icons
  const contextIcons: Record<string, typeof BarChart3> = {
    dashboard: BarChart3,
    reports: FileText,
    statements: PieChart,
    analysis: TrendingUp,
  };
  const ContextIcon = contextIcons[context] || BarChart3;
  
  const displayTitle = title || (isEn 
    ? 'Connect Your Accounting Software' 
    : 'Connectez votre logiciel comptable'
  );
  
  const displayDescription = description || (isEn
    ? `As a ${planLabel} subscriber, connect your accounting software to unlock real-time financial insights and powerful analytics.`
    : `En tant qu'abonné ${planLabel}, connectez votre logiciel comptable pour débloquer des insights financiers en temps réel et des analyses puissantes.`
  );
  
  const benefits = isEn ? [
    { icon: TrendingUp, text: 'Real-time financial dashboard' },
    { icon: PieChart, text: 'Automated financial statements' },
    { icon: BarChart3, text: 'Industry benchmarking & analytics' },
    { icon: Shield, text: 'Bank-level security & encryption' },
  ] : [
    { icon: TrendingUp, text: 'Tableau de bord financier en temps réel' },
    { icon: PieChart, text: 'États financiers automatisés' },
    { icon: BarChart3, text: 'Benchmarking et analyses sectorielles' },
    { icon: Shield, text: 'Sécurité et chiffrement de niveau bancaire' },
  ];
  
  const steps = isEn ? [
    'Select your accounting software',
    'Authorize secure connection',
    'Data syncs automatically',
  ] : [
    'Sélectionnez votre logiciel comptable',
    'Autorisez la connexion sécurisée',
    'Les données se synchronisent automatiquement',
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
                background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
                boxShadow: '0 8px 24px rgb(var(--color-primary-500) / 0.3)',
              }}
            >
              <Link2 className="w-10 h-10 text-white" />
            </div>
          </div>
          
          {/* Plan Badge */}
          <div className="flex justify-center mb-4">
            <span 
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
              style={{
                backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                color: 'rgb(var(--color-primary-600))',
              }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {planLabel} {isEn ? 'Plan Active' : 'Plan Actif'}
            </span>
          </div>
          
          {/* Title */}
          <h1 
            className="text-2xl sm:text-3xl font-bold mb-3"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {displayTitle}
          </h1>
          
          {/* Description */}
          <p 
            className="text-base sm:text-lg mb-8 max-w-md mx-auto"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            {displayDescription}
          </p>
          
          {/* Connection CTA Button */}
          <Link
            to="/settings?tab=connections"
            className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-white text-lg transition-all hover:scale-105 hover:shadow-xl"
            style={{
              background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
              boxShadow: '0 4px 16px rgb(var(--color-primary-500) / 0.3)',
            }}
          >
            <Link2 className="w-5 h-5" />
            <span>{isEn ? 'Connect Now' : 'Connecter maintenant'}</span>
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Link>
          
          {/* Quick Steps */}
          <div className="mt-8 flex items-center justify-center gap-2 text-sm">
            <Clock className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
            <span style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Takes less than 2 minutes' : 'Prend moins de 2 minutes'}
            </span>
          </div>
        </div>
        
        {/* Benefits Section */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          {benefits.map((benefit, idx) => {
            const BenefitIcon = benefit.icon;
            return (
              <div 
                key={idx}
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{
                  backgroundColor: 'rgb(var(--color-surface))',
                  border: '1px solid rgb(var(--color-border))',
                }}
              >
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                >
                  <BenefitIcon className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-600))' }} />
                </div>
                <span 
                  className="text-sm font-medium"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {benefit.text}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* How It Works */}
        <div 
          className="mt-8 p-6 rounded-xl"
          style={{
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))',
          }}
        >
          <h3 
            className="text-sm font-semibold mb-4 text-center"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn ? 'HOW IT WORKS' : 'COMMENT ÇA MARCHE'}
          </h3>
          <div className="flex items-center justify-between gap-4">
            {steps.map((step, idx) => (
              <div key={idx} className="flex-1 text-center">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold"
                  style={{
                    backgroundColor: 'rgb(var(--color-primary-500))',
                    color: 'white',
                  }}
                >
                  {idx + 1}
                </div>
                <p 
                  className="text-xs"
                  style={{ color: 'rgb(var(--color-text-secondary))' }}
                >
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Security Note */}
        <p 
          className="mt-6 text-center text-xs"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          <Shield className="w-3.5 h-3.5 inline-block mr-1" />
          {isEn 
            ? 'Your data is encrypted and secure. We use bank-level security protocols.' 
            : 'Vos données sont chiffrées et sécurisées. Nous utilisons des protocoles de sécurité de niveau bancaire.'
          }
        </p>
      </div>
    </div>
  );
}
