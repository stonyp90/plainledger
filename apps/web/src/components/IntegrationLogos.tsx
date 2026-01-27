/**
 * Integration Logos Section Component
 * Professional display of accounting software integrations
 * Theme-aware logos with responsive design
 */

import { useState } from 'react';
import { Check, Zap, RefreshCw, Shield, ArrowRight } from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface Integration {
  name: string;
  logo: React.ReactNode;
  color: string;
  themeColor: string; // CSS variable-based color
  features: { en: string; fr: string }[];
}

// Theme-aware logo components with responsive sizing
const QuickBooksLogo = () => (
  <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8 sm:w-10 sm:h-10">
    <circle cx="20" cy="20" r="20" fill="#2CA01C"/>
    {/* QuickBooks stylized "Q" icon */}
    <path d="M20 8c-6.627 0-12 5.373-12 12s5.373 12 12 12c2.21 0 4-1.79 4-4v-1h-1c-5.523 0-10-4.477-10-10s4.477-10 10-10 10 4.477 10 10v1h1c2.21 0 4-1.79 4-4 0-6.627-5.373-12-12-12z" fill="white" fillOpacity="0"/>
    <circle cx="20" cy="20" r="7" stroke="white" strokeWidth="3" fill="none"/>
    <path d="M27 20v10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

const XeroLogo = () => (
  <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8 sm:w-10 sm:h-10">
    <circle cx="20" cy="20" r="20" fill="#13B5EA"/>
    <text x="14" y="25" textAnchor="start" fill="white" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="13" letterSpacing="-0.5">xero</text>
    <circle cx="32" cy="15" r="2" fill="white"/>
  </svg>
);

// Sage with theme-aware background
const SageLogo = () => (
  <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8 sm:w-10 sm:h-10">
    <rect width="40" height="40" rx="8" fill="#00D639"/>
    <text x="20" y="26" textAnchor="middle" fill="white" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="13">Sage</text>
  </svg>
);

const FreshBooksLogo = () => (
  <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8 sm:w-10 sm:h-10">
    <rect width="40" height="40" rx="6" fill="#0075DD"/>
    {/* Folded corner effect */}
    <path d="M28 0h12v12L28 0z" fill="#005BB5"/>
    <path d="M28 0c0 6.627 5.373 12 12 12V0H28z" fill="white" fillOpacity="0.3"/>
    {/* F letter */}
    <path d="M12 10h16v4H16v6h10v4H16v10h-4V10z" fill="white"/>
  </svg>
);

// Wave logo with bars
const WaveLogo = () => (
  <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8 sm:w-10 sm:h-10">
    <rect width="40" height="40" rx="6" fill="#1C3A5F"/>
    {/* Three vertical bars */}
    <rect x="8" y="18" width="6" height="14" rx="3" fill="#003D79"/>
    <rect x="17" y="10" width="6" height="22" rx="3" fill="#2E77BC"/>
    <rect x="26" y="14" width="6" height="18" rx="3" fill="#6AB8F7"/>
  </svg>
);

const SYNC_FEATURES = [
  {
    icon: Zap,
    title: { en: 'Instant sync', fr: 'Synchro instantanée' },
    desc: { en: 'Data updates in real-time', fr: 'Données à jour en temps réel' },
  },
  {
    icon: RefreshCw,
    title: { en: 'Two-way sync', fr: 'Synchro bidirectionnelle' },
    desc: { en: 'Changes reflect everywhere', fr: 'Modifications partout' },
  },
  {
    icon: Shield,
    title: { en: 'Bank-level security', fr: 'Sécurité bancaire' },
    desc: { en: 'AES-256 encryption', fr: 'Chiffrement AES-256' },
  },
];

export default function IntegrationLogos() {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Build integrations with theme-aware logos
  const integrations: Integration[] = [
    {
      name: 'QuickBooks',
      logo: <QuickBooksLogo />,
      color: '#2CA01C',
      themeColor: 'rgb(var(--color-success))',
      features: [
        { en: 'Real-time sync', fr: 'Synchronisation en temps réel' },
        { en: 'Auto-categorization', fr: 'Catégorisation automatique' },
        { en: 'Bank feeds', fr: 'Flux bancaires' },
      ],
    },
    {
      name: 'Xero',
      logo: <XeroLogo />,
      color: '#13B5EA',
      themeColor: 'rgb(var(--color-info))',
      features: [
        { en: 'Multi-currency', fr: 'Multi-devises' },
        { en: 'Invoice tracking', fr: 'Suivi des factures' },
        { en: 'Payroll data', fr: 'Données de paie' },
      ],
    },
    {
      name: 'Sage',
      logo: <SageLogo />,
      color: '#00D639',
      themeColor: 'rgb(var(--color-success))',
      features: [
        { en: 'Enterprise ready', fr: 'Prêt pour entreprise' },
        { en: 'Custom fields', fr: 'Champs personnalisés' },
        { en: 'Advanced reports', fr: 'Rapports avancés' },
      ],
    },
    {
      name: 'FreshBooks',
      logo: <FreshBooksLogo />,
      color: '#0075DD',
      themeColor: 'rgb(var(--color-primary-500))',
      features: [
        { en: 'Invoice import', fr: 'Import de factures' },
        { en: 'Expense tracking', fr: 'Suivi des dépenses' },
        { en: 'Time entries', fr: 'Entrées de temps' },
      ],
    },
    {
      name: 'Wave',
      logo: <WaveLogo />,
      color: '#2E77BC',
      themeColor: 'rgb(var(--color-primary-600))',
      features: [
        { en: 'Free accounts', fr: 'Comptes gratuits' },
        { en: 'Receipt scanning', fr: 'Numérisation de reçus' },
        { en: 'GST/QST ready', fr: 'Compatible TPS/TVQ' },
      ],
    },
  ];

  return (
    <section 
      className="py-8 sm:py-12 lg:py-16 px-3 sm:px-6 lg:px-8" 
      style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h2 
            className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 sm:mb-3" 
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'Connect your accounting software' : 'Connectez votre logiciel comptable'}
          </h2>
          <p 
            className="text-sm sm:text-base max-w-2xl mx-auto px-4" 
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            {isEn 
              ? 'Seamless integration with the tools you already use. Set up in minutes, not hours.'
              : 'Intégration transparente avec les outils que vous utilisez déjà. Configuration en minutes.'}
          </p>
        </div>

        {/* Integration Cards Grid - Responsive */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4 mb-8 sm:mb-12">
          {integrations.map((integration, index) => (
            <div
              key={integration.name}
              className="group relative p-3 sm:p-4 lg:p-5 rounded-xl transition-all duration-300 cursor-pointer active:scale-95"
              style={{ 
                backgroundColor: hoveredIndex === index 
                  ? `${integration.color}15` 
                  : 'rgb(var(--color-surface))',
                border: `1.5px solid ${hoveredIndex === index ? integration.color : 'rgb(var(--color-border))'}`,
                transform: hoveredIndex === index ? 'translateY(-2px)' : 'none',
                boxShadow: hoveredIndex === index ? `0 8px 20px ${integration.color}20` : 'none',
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onTouchStart={() => setHoveredIndex(index)}
              onTouchEnd={() => setTimeout(() => setHoveredIndex(null), 300)}
            >
              {/* Logo */}
              <div className="flex justify-center mb-2 sm:mb-3">
                {integration.logo}
              </div>
              
              {/* Name */}
              <p 
                className="text-xs sm:text-sm font-semibold text-center mb-2 sm:mb-3 truncate"
                style={{ color: hoveredIndex === index ? integration.color : 'rgb(var(--color-text))' }}
              >
                {integration.name}
              </p>

              {/* Features (shown on hover/touch) - Hidden on smallest screens */}
              <div 
                className={`space-y-1 sm:space-y-1.5 transition-all duration-300 overflow-hidden ${
                  hoveredIndex === index ? 'max-h-20 sm:max-h-24 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                {integration.features.map((feature, fIdx) => (
                  <div key={fIdx} className="flex items-center gap-1 sm:gap-1.5">
                    <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" style={{ color: integration.color }} />
                    <span className="text-[10px] sm:text-xs truncate" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      {isEn ? feature.en : feature.fr}
                    </span>
                  </div>
                ))}
              </div>

              {/* Connected indicator */}
              <div 
                className={`absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                  hoveredIndex === index ? 'scale-100' : 'scale-0'
                }`}
                style={{ backgroundColor: integration.color }}
              />
            </div>
          ))}
        </div>

        {/* Sync Features - Responsive */}
        <div 
          className="rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))',
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {SYNC_FEATURES.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 sm:gap-4">
                <div 
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                >
                  <feature.icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-0.5" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? feature.title.en : feature.title.fr}
                  </h3>
                  <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? feature.desc.en : feature.desc.fr}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div 
            className="mt-6 sm:mt-8 pt-4 sm:pt-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4" 
            style={{ borderTop: '1px solid rgb(var(--color-border))' }}
          >
            <p className="text-xs sm:text-sm text-center" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn ? "Don't see your software?" : "Vous ne voyez pas votre logiciel ?"}
            </p>
            <button 
              className="flex items-center gap-2 text-sm font-medium transition-colors hover:underline active:scale-95"
              style={{ color: 'rgb(var(--color-primary-500))' }}
            >
              {isEn ? 'Request an integration' : 'Demander une intégration'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CSV Import Note */}
        <p className="text-center text-xs mt-4 sm:mt-6" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn 
            ? '+ CSV import available for any accounting software'
            : '+ Import CSV disponible pour tout logiciel comptable'}
        </p>
      </div>
    </section>
  );
}
