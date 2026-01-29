/**
 * Demo Mode Banner Component
 * Displays a banner on settings pages when in demo mode
 */

import { AlertCircle } from 'lucide-react';
import { useDemoMode } from '../contexts/DemoModeContext';
import { useI18n } from '../lib/i18n';

export default function DemoModeBanner() {
  const { isDemoMode } = useDemoMode();
  const { language } = useI18n();
  const isEn = language === 'en';

  if (!isDemoMode) {
    return null;
  }

  return (
    <div 
      className="mb-4 sm:mb-6 p-4 rounded-xl border flex items-start gap-3"
      style={{ 
        backgroundColor: 'rgb(var(--color-warning) / 0.1)',
        borderColor: 'rgb(var(--color-warning) / 0.3)'
      }}
    >
      <div 
        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ 
          backgroundColor: 'rgb(var(--color-warning) / 0.2)',
          color: 'rgb(var(--color-warning))'
        }}
      >
        <AlertCircle className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 
          className="font-semibold text-sm mb-1"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          {isEn ? 'Demo Mode' : 'Mode démonstration'}
        </h4>
        <p 
          className="text-sm leading-relaxed"
          style={{ color: 'rgb(var(--color-text-secondary))' }}
        >
          {isEn 
            ? 'Notification settings cannot be modified in demo mode to prevent sending notifications based on demo data. A subscription is required to fully activate this feature.'
            : 'Les paramètres de notification ne peuvent pas être modifiés en mode démo pour éviter l\'envoi de notifications basées sur des données de démonstration. Un abonnement est requis pour activer pleinement cette fonctionnalité.'}
        </p>
      </div>
    </div>
  );
}
