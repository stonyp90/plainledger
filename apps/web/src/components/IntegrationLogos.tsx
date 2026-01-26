/**
 * Integration Logos Section Component
 * Professional display of accounting software integrations
 */

import { useState } from 'react';
import { Check, Zap, RefreshCw, Shield, ArrowRight } from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface Integration {
  name: string;
  logo: React.ReactNode;
  color: string;
  bgColor: string;
  features: { en: string; fr: string }[];
}

// Professional brand-accurate logos
const QuickBooksLogo = () => (
  <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10">
    <rect width="40" height="40" rx="8" fill="#2CA01C"/>
    <path d="M10 14h8v2h-8v-2zm0 4h12v2H10v-2zm0 4h8v2h-8v-2zm14-6h6v2h-6v-2zm0 4h6v2h-6v-2z" fill="white"/>
  </svg>
);

const XeroLogo = () => (
  <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10">
    <rect width="40" height="40" rx="8" fill="#13B5EA"/>
    <path d="M12 14l8 12m0-12l-8 12" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="28" cy="20" r="4" fill="white"/>
  </svg>
);

const SageLogo = () => (
  <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10">
    <rect width="40" height="40" rx="8" fill="#00D632"/>
    <rect x="8" y="12" width="6" height="16" rx="1" fill="white"/>
    <rect x="17" y="8" width="6" height="24" rx="1" fill="white"/>
    <rect x="26" y="14" width="6" height="18" rx="1" fill="white"/>
  </svg>
);

const FreshBooksLogo = () => (
  <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10">
    <rect width="40" height="40" rx="8" fill="#0077C5"/>
    <rect x="10" y="8" width="20" height="24" rx="2" fill="white"/>
    <path d="M14 14h12M14 18h12M14 22h8" stroke="#0077C5" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const WaveLogo = () => (
  <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10">
    <rect width="40" height="40" rx="8" fill="#FF6B35"/>
    <path d="M8 20c4-8 8 8 12 0s8 8 12 0" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
  </svg>
);

const INTEGRATIONS: Integration[] = [
  {
    name: 'QuickBooks',
    logo: <QuickBooksLogo />,
    color: '#2CA01C',
    bgColor: 'rgba(44, 160, 28, 0.1)',
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
    bgColor: 'rgba(19, 181, 234, 0.1)',
    features: [
      { en: 'Multi-currency', fr: 'Multi-devises' },
      { en: 'Invoice tracking', fr: 'Suivi des factures' },
      { en: 'Payroll data', fr: 'Données de paie' },
    ],
  },
  {
    name: 'Sage',
    logo: <SageLogo />,
    color: '#00D632',
    bgColor: 'rgba(0, 214, 50, 0.1)',
    features: [
      { en: 'Enterprise ready', fr: 'Prêt pour entreprise' },
      { en: 'Custom fields', fr: 'Champs personnalisés' },
      { en: 'Advanced reports', fr: 'Rapports avancés' },
    ],
  },
  {
    name: 'FreshBooks',
    logo: <FreshBooksLogo />,
    color: '#0077C5',
    bgColor: 'rgba(0, 119, 197, 0.1)',
    features: [
      { en: 'Invoice import', fr: 'Import de factures' },
      { en: 'Expense tracking', fr: 'Suivi des dépenses' },
      { en: 'Time entries', fr: 'Entrées de temps' },
    ],
  },
  {
    name: 'Wave',
    logo: <WaveLogo />,
    color: '#FF6B35',
    bgColor: 'rgba(255, 107, 53, 0.1)',
    features: [
      { en: 'Free accounts', fr: 'Comptes gratuits' },
      { en: 'Receipt scanning', fr: 'Numérisation de reçus' },
      { en: 'GST/QST ready', fr: 'Compatible TPS/TVQ' },
    ],
  },
];

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

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Connect your accounting software' : 'Connectez votre logiciel comptable'}
          </h2>
          <p className="text-base max-w-2xl mx-auto" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn 
              ? 'Seamless integration with the tools you already use. Set up in minutes, not hours.'
              : 'Intégration transparente avec les outils que vous utilisez déjà. Configuration en minutes.'}
          </p>
        </div>

        {/* Integration Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
          {INTEGRATIONS.map((integration, index) => (
            <div
              key={integration.name}
              className="group relative p-5 rounded-xl transition-all duration-300 cursor-pointer"
              style={{ 
                backgroundColor: hoveredIndex === index ? integration.bgColor : 'rgb(var(--color-surface))',
                border: `2px solid ${hoveredIndex === index ? integration.color : 'rgb(var(--color-border))'}`,
                transform: hoveredIndex === index ? 'translateY(-4px)' : 'none',
                boxShadow: hoveredIndex === index ? `0 12px 24px ${integration.color}20` : 'none',
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Logo */}
              <div className="flex justify-center mb-3">
                {integration.logo}
              </div>
              
              {/* Name */}
              <p 
                className="text-sm font-semibold text-center mb-3"
                style={{ color: hoveredIndex === index ? integration.color : 'rgb(var(--color-text))' }}
              >
                {integration.name}
              </p>

              {/* Features (shown on hover) */}
              <div 
                className={`space-y-1.5 transition-all duration-300 overflow-hidden ${
                  hoveredIndex === index ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                {integration.features.map((feature, fIdx) => (
                  <div key={fIdx} className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 flex-shrink-0" style={{ color: integration.color }} />
                    <span className="text-xs" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      {isEn ? feature.en : feature.fr}
                    </span>
                  </div>
                ))}
              </div>

              {/* Connected indicator */}
              <div 
                className={`absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full transition-all duration-300 ${
                  hoveredIndex === index ? 'scale-100' : 'scale-0'
                }`}
                style={{ backgroundColor: integration.color }}
              />
            </div>
          ))}
        </div>

        {/* Sync Features */}
        <div 
          className="rounded-2xl p-6 sm:p-8"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))',
          }}
        >
          <div className="grid sm:grid-cols-3 gap-6">
            {SYNC_FEATURES.map((feature, index) => (
              <div key={index} className="flex items-start gap-4">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                >
                  <feature.icon className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
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
          <div className="mt-8 pt-6 flex flex-col sm:flex-row items-center justify-center gap-4" style={{ borderTop: '1px solid rgb(var(--color-border))' }}>
            <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn ? "Don't see your software?" : "Vous ne voyez pas votre logiciel ?"}
            </p>
            <button 
              className="flex items-center gap-2 text-sm font-medium transition-colors hover:underline"
              style={{ color: 'rgb(var(--color-primary-500))' }}
            >
              {isEn ? 'Request an integration' : 'Demander une intégration'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CSV Import Note */}
        <p className="text-center text-xs mt-6" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn 
            ? '+ CSV import available for any accounting software'
            : '+ Import CSV disponible pour tout logiciel comptable'}
        </p>
      </div>
    </section>
  );
}
