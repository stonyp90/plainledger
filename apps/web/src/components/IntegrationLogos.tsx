/**
 * Integration Logos Banner Component
 * Displays accounting software company logos in an interactive banner
 */

import { ExternalLink } from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface Integration {
  name: string;
  logo: React.ReactNode;
  url: string;
  color: string;
}

// SVG Logos for each integration - Simplified brand representations
const QuickBooksLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 140 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="6" width="20" height="20" rx="2" fill="currentColor" opacity="0.9"/>
    <path d="M8 12h12M8 16h12M8 20h8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    <text x="30" y="20" fontSize="14" fontWeight="600" fill="currentColor" fontFamily="system-ui, -apple-system">QuickBooks</text>
  </svg>
);

const XeroLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 100 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="16" r="6" fill="currentColor"/>
    <circle cx="24" cy="16" r="6" fill="currentColor"/>
    <circle cx="36" cy="16" r="6" fill="currentColor"/>
    <text x="48" y="20" fontSize="18" fontWeight="700" fill="currentColor" fontFamily="system-ui, -apple-system">Xero</text>
  </svg>
);

const SageLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 100 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="8" width="12" height="16" rx="1" fill="currentColor"/>
    <rect x="20" y="5" width="12" height="22" rx="1" fill="currentColor"/>
    <rect x="36" y="11" width="12" height="16" rx="1" fill="currentColor"/>
    <text x="54" y="20" fontSize="16" fontWeight="600" fill="currentColor" fontFamily="system-ui, -apple-system">Sage</text>
  </svg>
);

const FreshBooksLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 140 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="8" width="16" height="18" rx="2" fill="currentColor" opacity="0.9"/>
    <path d="M8 12h10M8 16h10M8 20h8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    <text x="26" y="20" fontSize="12" fontWeight="600" fill="currentColor" fontFamily="system-ui, -apple-system">FreshBooks</text>
  </svg>
);

const WaveLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 100 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 14c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5v4c0 2.5-2 4.5-4.5 4.5S6 20.5 6 18v-4z" fill="currentColor"/>
    <path d="M18 10c-2.5 0-4.5 2-4.5 4.5v4c0 2.5 2 4.5 4.5 4.5s4.5-2 4.5-4.5v-4c0-2.5-2-4.5-4.5-4.5z" fill="currentColor"/>
    <text x="32" y="20" fontSize="16" fontWeight="600" fill="currentColor" fontFamily="system-ui, -apple-system">Wave</text>
  </svg>
);

const INTEGRATIONS: Integration[] = [
  {
    name: 'QuickBooks',
    logo: <QuickBooksLogo />,
    url: 'https://quickbooks.intuit.com',
    color: '#2CA01C',
  },
  {
    name: 'Xero',
    logo: <XeroLogo />,
    url: 'https://www.xero.com',
    color: '#13B5EA',
  },
  {
    name: 'Sage',
    logo: <SageLogo />,
    url: 'https://www.sage.com',
    color: '#00A651',
  },
  {
    name: 'FreshBooks',
    logo: <FreshBooksLogo />,
    url: 'https://www.freshbooks.com',
    color: '#0077C5',
  },
  {
    name: 'Wave',
    logo: <WaveLogo />,
    url: 'https://www.waveapps.com',
    color: '#FF6B35',
  },
];

export default function IntegrationLogos() {
  const { language } = useI18n();
  const isEn = language === 'en';

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
      <div className="max-w-5xl mx-auto">
        <p className="text-sm mb-8 text-center" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn ? 'Works with your existing accounting software' : 'Fonctionne avec votre logiciel comptable existant'}
        </p>
        
        <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6">
          {INTEGRATIONS.map((integration) => (
            <a
              key={integration.name}
              href={integration.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex items-center justify-center px-6 py-4 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg"
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))',
                border: '2px solid rgb(var(--color-border))',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = integration.color;
                e.currentTarget.style.backgroundColor = `${integration.color}10`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgb(var(--color-border))';
                e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface))';
              }}
            >
              <div 
                className="w-28 sm:w-32 h-10 flex items-center justify-center"
                style={{ color: integration.color }}
              >
                {integration.logo}
              </div>
              
              {/* External link icon on hover */}
              <ExternalLink 
                className="absolute top-2 right-2 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: integration.color }}
              />
              
              {/* Tooltip */}
              <div 
                className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10"
                style={{ 
                  backgroundColor: 'rgb(var(--color-text))',
                  color: 'rgb(var(--color-bg))',
                }}
              >
                {integration.name}
                <div 
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45"
                  style={{ backgroundColor: 'rgb(var(--color-text))' }}
                />
              </div>
            </a>
          ))}
        </div>
        
        <p className="text-xs text-center mt-6" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn 
            ? 'Click any logo to learn more about the integration'
            : 'Cliquez sur n\'importe quel logo pour en savoir plus sur l\'intégration'
          }
        </p>
      </div>
    </section>
  );
}
