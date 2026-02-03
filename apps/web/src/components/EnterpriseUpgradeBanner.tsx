/**
 * Enterprise Upgrade Banner Component
 * 
 * Shown to Professional tier users who have connected their datasource.
 * Highlights enterprise-only features they can unlock by upgrading.
 */

import { useState } from 'react';
import { 
  Crown, 
  ArrowRight, 
  Calendar,
  X,
  Sparkles,
  Shield,
  Users,
  BarChart3,
  Zap,
  Check,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useAccountDataAccess } from '../hooks/useAccountDataAccess';

// Calendly link for enterprise consultations
const CALENDLY_URL = 'https://calendly.com/anthonypaquet1508';

interface EnterpriseUpgradeBannerProps {
  /** Custom class name */
  className?: string;
  /** Dismissible - can be closed */
  dismissible?: boolean;
  /** Compact version */
  compact?: boolean;
}

export default function EnterpriseUpgradeBanner({ 
  className = '',
  dismissible = true,
  compact = false,
}: EnterpriseUpgradeBannerProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const { showEnterpriseCTA, plan } = useAccountDataAccess();
  const [isDismissed, setIsDismissed] = useState(false);
  
  // Only show for professional users with connection
  if (!showEnterpriseCTA || isDismissed || plan !== 'professional') {
    return null;
  }
  
  const handleUpgradeClick = () => {
    window.open(CALENDLY_URL, '_blank');
  };
  
  const features = isEn ? [
    { icon: Sparkles, text: 'Full AI-powered insights' },
    { icon: Shield, text: 'SSO & advanced security' },
    { icon: Users, text: 'Unlimited team members' },
    { icon: BarChart3, text: 'Power BI integration' },
  ] : [
    { icon: Sparkles, text: 'Insights IA complets' },
    { icon: Shield, text: 'SSO & sécurité avancée' },
    { icon: Users, text: 'Membres d\'équipe illimités' },
    { icon: BarChart3, text: 'Intégration Power BI' },
  ];

  if (compact) {
    return (
      <div 
        className={`relative rounded-lg p-3 ${className}`}
        style={{ 
          backgroundColor: 'rgb(var(--color-accent-500) / 0.08)',
          border: '1px solid rgb(var(--color-accent-500) / 0.2)',
        }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgb(var(--color-accent-500) / 0.15)' }}
          >
            <Crown className="w-4 h-4" style={{ color: 'rgb(var(--color-accent-600))' }} />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Unlock Enterprise Features' : 'Débloquez les fonctionnalités Enterprise'}
            </p>
            <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Full AI, SSO, unlimited users' : 'IA complète, SSO, utilisateurs illimités'}
            </p>
          </div>
          
          <button
            onClick={handleUpgradeClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90"
            style={{ backgroundColor: 'rgb(var(--color-accent-500))' }}
          >
            <Calendar className="w-3 h-3" />
            {isEn ? 'Talk to Sales' : 'Parler aux ventes'}
          </button>
          
          {dismissible && (
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1 rounded opacity-50 hover:opacity-100 transition-all"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`relative overflow-hidden rounded-xl p-4 sm:p-5 ${className}`}
      style={{ 
        background: 'linear-gradient(135deg, rgb(var(--color-accent-500) / 0.08) 0%, rgb(var(--color-accent-600) / 0.04) 100%)',
        border: '1px solid rgb(var(--color-accent-500) / 0.2)',
      }}
    >
      {/* Dismiss button */}
      {dismissible && (
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute top-3 right-3 p-1 rounded opacity-50 hover:opacity-100 transition-all"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          <X className="w-4 h-4" />
        </button>
      )}
      
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Icon and Title */}
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ 
              background: 'linear-gradient(135deg, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-600)) 100%)',
              boxShadow: '0 4px 12px rgb(var(--color-accent-500) / 0.3)',
            }}
          >
            <Crown className="w-6 h-6 text-white" />
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Upgrade to Enterprise' : 'Passez à Enterprise'}
              </h3>
              <span 
                className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                style={{ 
                  backgroundColor: 'rgb(var(--color-accent-500) / 0.15)',
                  color: 'rgb(var(--color-accent-600))',
                }}
              >
                {isEn ? 'RECOMMENDED' : 'RECOMMANDÉ'}
              </span>
            </div>
            <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn 
                ? 'Get the most out of PlainLedger with advanced features'
                : 'Tirez le meilleur parti de PlainLedger avec des fonctionnalités avancées'
              }
            </p>
          </div>
        </div>
        
        {/* Features */}
        <div className="flex flex-wrap gap-2 sm:gap-3 flex-1">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <span 
                key={idx}
                className="inline-flex items-center gap-1.5 text-xs"
                style={{ color: 'rgb(var(--color-text-secondary))' }}
              >
                <Check className="w-3 h-3" style={{ color: 'rgb(var(--color-accent-500))' }} />
                {feature.text}
              </span>
            );
          })}
        </div>
        
        {/* CTA */}
        <button
          onClick={handleUpgradeClick}
          className="group flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white transition-all hover:opacity-90 hover:shadow-lg flex-shrink-0"
          style={{ 
            background: 'linear-gradient(135deg, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-600)) 100%)',
            boxShadow: '0 2px 8px rgb(var(--color-accent-500) / 0.3)',
          }}
        >
          <Calendar className="w-4 h-4" />
          <span className="text-sm">{isEn ? 'Schedule Call' : 'Planifier un appel'}</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
