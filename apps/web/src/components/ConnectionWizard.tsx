/**
 * Connection Wizard Component
 * 
 * Modern onboarding interface for users without connected accounting software.
 * Clean, professional design following the app's theme - no excessive colors.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Shield, 
  RefreshCw, 
  Clock,
  Link2,
  Upload,
  Lock,
  CheckCircle,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface ConnectionWizardProps {
  onConnect?: () => void;
}

// Provider logos using SimpleIcons CDN
const PROVIDERS = [
  { id: 'quickbooks', name: 'QuickBooks', logo: 'https://cdn.simpleicons.org/quickbooks/2CA01C' },
  { id: 'xero', name: 'Xero', logo: 'https://cdn.simpleicons.org/xero/13B5EA' },
  { id: 'sage', name: 'Sage', logo: 'https://cdn.simpleicons.org/sage/00D639' },
  { id: 'freshbooks', name: 'FreshBooks', logo: 'https://cdn.simpleicons.org/freshbooks/0075DD' },
  { id: 'wave', name: 'Wave', logo: 'https://cdn.simpleicons.org/wave/2E77BC' },
];

export default function ConnectionWizard({ onConnect }: ConnectionWizardProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [hoveredProvider, setHoveredProvider] = useState<string | null>(null);

  return (
    <div className="w-full">
      {/* Main Card */}
      <div 
        className="rounded-xl overflow-hidden"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          border: '1px solid rgb(var(--color-border))',
        }}
      >
        {/* Header Section - Clean, no background color */}
        <div className="px-5 py-6 sm:px-6 sm:py-8 text-center">
          {/* Icon */}
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ 
              backgroundColor: 'rgb(var(--color-bg-muted))',
            }}
          >
            <Link2 className="w-6 h-6" style={{ color: 'rgb(var(--color-text-muted))' }} />
          </div>
          
          <h2 className="text-lg sm:text-xl font-semibold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Connect Your Accounting' : 'Connectez votre comptabilité'}
          </h2>
          
          <p className="text-sm max-w-sm mx-auto" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn 
              ? 'Import your financial data automatically. Setup takes 2 minutes.'
              : 'Importez vos données financières automatiquement. Configuration en 2 minutes.'}
          </p>
        </div>

        {/* Provider Logos */}
        <div 
          className="px-5 py-4 sm:px-6"
          style={{ 
            backgroundColor: 'rgb(var(--color-bg-muted) / 0.5)',
            borderTop: '1px solid rgb(var(--color-border))',
            borderBottom: '1px solid rgb(var(--color-border))',
          }}
        >
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            {PROVIDERS.map((provider) => (
              <div
                key={provider.id}
                className="relative"
                onMouseEnter={() => setHoveredProvider(provider.id)}
                onMouseLeave={() => setHoveredProvider(null)}
              >
                <div 
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
                  style={{ 
                    backgroundColor: hoveredProvider === provider.id 
                      ? 'rgb(var(--color-surface))' 
                      : 'transparent',
                    border: hoveredProvider === provider.id 
                      ? '1px solid rgb(var(--color-border))' 
                      : '1px solid transparent',
                  }}
                >
                  <img 
                    src={provider.logo} 
                    alt={provider.name}
                    className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                    loading="lazy"
                  />
                </div>
                {hoveredProvider === provider.id && (
                  <div 
                    className="absolute -bottom-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-medium whitespace-nowrap z-10"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-text))',
                      color: 'rgb(var(--color-surface))',
                    }}
                  >
                    {provider.name}
                  </div>
                )}
              </div>
            ))}
            {/* CSV Upload */}
            <div 
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center"
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))',
                border: '1px dashed rgb(var(--color-border))',
              }}
              title={isEn ? 'CSV Upload' : 'Import CSV'}
            >
              <Upload className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
            </div>
          </div>
        </div>

        {/* Features - Compact row */}
        <div className="px-5 py-3 sm:px-6 flex items-center justify-center gap-4 sm:gap-6 flex-wrap">
          <div className="flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-text-muted))' }} />
            <span className="text-[11px] sm:text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Auto-sync' : 'Sync auto'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-text-muted))' }} />
            <span className="text-[11px] sm:text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Read-only' : 'Lecture seule'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-text-muted))' }} />
            <span className="text-[11px] sm:text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Encrypted' : 'Chiffré'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-text-muted))' }} />
            <span className="text-[11px] sm:text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              2 min
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="px-5 py-4 sm:px-6 sm:py-5" style={{ borderTop: '1px solid rgb(var(--color-border))' }}>
          <Link
            to="/app/connections"
            onClick={onConnect}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-medium text-sm transition-all hover:opacity-90 active:scale-[0.99]"
            style={{ 
              backgroundColor: 'rgb(var(--color-primary-500))',
              color: 'white',
            }}
          >
            {isEn ? 'Connect Now' : 'Connecter maintenant'}
            <ArrowRight className="w-4 h-4" />
          </Link>
          
          <p className="text-center text-[11px] mt-2.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn 
              ? 'Free • No credit card required'
              : 'Gratuit • Aucune carte requise'}
          </p>
        </div>
      </div>

      {/* Trust Indicators - Subtle */}
      <div className="mt-3 flex items-center justify-center gap-4 sm:gap-5">
        <div className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" style={{ color: 'rgb(var(--color-text-muted))' }} />
          <span className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
            SOC 2
          </span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" style={{ color: 'rgb(var(--color-text-muted))' }} />
          <span className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Bank-level security' : 'Sécurité bancaire'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" style={{ color: 'rgb(var(--color-text-muted))' }} />
          <span className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? '1000+ businesses' : '1000+ entreprises'}
          </span>
        </div>
      </div>
    </div>
  );
}
