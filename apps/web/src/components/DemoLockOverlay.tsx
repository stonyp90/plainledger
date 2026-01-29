/**
 * Demo Lock Overlay Component
 * Reusable overlay to lock sections in demo mode with blurred preview
 */

import { ReactNode } from 'react';
import { Lock, Calendar, Mail, ArrowRight } from 'lucide-react';
import { useDemoMode } from '../contexts/DemoModeContext';
import { useI18n } from '../lib/i18n';
import UpgradeRequestForm from './UpgradeRequestForm';
import { useState } from 'react';

// Calendly link for upgrade consultations
const CALENDLY_URL = 'https://calendly.com/anthonypaquet1508';

interface DemoLockOverlayProps {
  children: ReactNode;
  /** Show blurred preview of content */
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

export default function DemoLockOverlay({
  children,
  showPreview = true,
  title,
  description,
  className = '',
  showEmailForm = true,
  defaultToEmailForm = false,
}: DemoLockOverlayProps) {
  const { isDemoMode } = useDemoMode();
  const { language } = useI18n();
  const [showEmailFormState, setShowEmailFormState] = useState(defaultToEmailForm);
  const isEn = language === 'en';

  // If not in demo mode, render children normally
  if (!isDemoMode) {
    return <>{children}</>;
  }

  const displayTitle = title || (isEn ? 'Demo Data' : 'Données démo');
  const displayDesc = description || (isEn 
    ? 'This section contains demo data. Subscribe to connect your accounting software and see your real data.'
    : 'Cette section contient des données de démonstration. Abonnez-vous pour connecter votre logiciel comptable et voir vos vraies données.'
  );

  const handleUpgradeClick = () => {
    window.open(CALENDLY_URL, '_blank');
  };

  const handleEmailFormSubmitted = () => {
    setShowEmailFormState(false);
  };

  return (
    <div className={`relative rounded-xl overflow-hidden ${className}`}>
      {/* Grayed out preview of content */}
      {showPreview && (
        <div className="opacity-20 pointer-events-none blur-[3px] select-none">
          {children}
        </div>
      )}
      
      {/* Demo Lock Overlay */}
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
          {/* Lock Icon */}
          <div 
            className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ 
              background: 'linear-gradient(135deg, rgb(var(--color-primary-500) / 0.15) 0%, rgb(var(--color-primary-600) / 0.1) 100%)',
            }}
          >
            <Lock className="w-8 h-8" style={{ color: 'rgb(var(--color-primary-500))' }} />
          </div>
          
          {/* Demo Badge */}
          <div 
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3"
            style={{ 
              backgroundColor: 'rgb(var(--color-warning) / 0.15)',
              color: 'rgb(var(--color-warning))',
            }}
          >
            <Lock className="w-3 h-3" />
            {isEn ? 'Demo Data' : 'Données démo'}
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
                feature="advancedAnalytics"
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
                <span>{isEn ? 'Schedule Demo Call' : 'Planifier un appel'}</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
