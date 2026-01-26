/**
 * Integration Logos Carousel Component
 * Interactive carousel displaying accounting software company logos
 */

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface Integration {
  name: string;
  logo: React.ReactNode;
  url: string;
  color: string;
  description: string;
  descriptionFr: string;
}

// Improved SVG Logos with better brand recognition
const QuickBooksLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 180 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* QuickBooks brand colors */}
    <rect x="4" y="8" width="24" height="24" rx="3" fill="#2CA01C"/>
    <path d="M10 16h14M10 20h14M10 24h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <text x="34" y="26" fontSize="16" fontWeight="700" fill="currentColor" fontFamily="system-ui, -apple-system, sans-serif">QuickBooks</text>
  </svg>
);

const XeroLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Xero's three circles */}
    <circle cx="14" cy="20" r="8" fill="#13B5EA"/>
    <circle cx="30" cy="20" r="8" fill="#13B5EA"/>
    <circle cx="46" cy="20" r="8" fill="#13B5EA"/>
    <text x="60" y="26" fontSize="22" fontWeight="800" fill="currentColor" fontFamily="system-ui, -apple-system, sans-serif">Xero</text>
  </svg>
);

const SageLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 140 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Sage's stacked bars */}
    <rect x="4" y="10" width="16" height="20" rx="2" fill="#00A651"/>
    <rect x="24" y="6" width="16" height="28" rx="2" fill="#00A651"/>
    <rect x="44" y="14" width="16" height="20" rx="2" fill="#00A651"/>
    <text x="66" y="26" fontSize="18" fontWeight="700" fill="currentColor" fontFamily="system-ui, -apple-system, sans-serif">Sage</text>
  </svg>
);

const FreshBooksLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 180 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* FreshBooks book icon */}
    <rect x="4" y="10" width="20" height="22" rx="2" fill="#0077C5"/>
    <path d="M10 16h12M10 20h12M10 24h10" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    <text x="30" y="26" fontSize="14" fontWeight="600" fill="currentColor" fontFamily="system-ui, -apple-system, sans-serif">FreshBooks</text>
  </svg>
);

const WaveLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Wave symbol */}
    <path d="M8 18c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5v6c0 3-2.5 5.5-5.5 5.5S8 27 8 24v-6z" fill="#FF6B35"/>
    <path d="M22 14c-3 0-5.5 2.5-5.5 5.5v6c0 3 2.5 5.5 5.5 5.5s5.5-2.5 5.5-5.5v-6c0-3-2.5-5.5-5.5-5.5z" fill="#FF6B35"/>
    <text x="38" y="26" fontSize="20" fontWeight="700" fill="currentColor" fontFamily="system-ui, -apple-system, sans-serif">Wave</text>
  </svg>
);

const INTEGRATIONS: Integration[] = [
  {
    name: 'QuickBooks',
    logo: <QuickBooksLogo />,
    url: 'https://quickbooks.intuit.com',
    color: '#2CA01C',
    description: 'Seamless QuickBooks Online integration',
    descriptionFr: 'Intégration transparente avec QuickBooks Online',
  },
  {
    name: 'Xero',
    logo: <XeroLogo />,
    url: 'https://www.xero.com',
    color: '#13B5EA',
    description: 'Connect your Xero account in seconds',
    descriptionFr: 'Connectez votre compte Xero en quelques secondes',
  },
  {
    name: 'Sage',
    logo: <SageLogo />,
    url: 'https://www.sage.com',
    color: '#00A651',
    description: 'Full Sage Business Cloud support',
    descriptionFr: 'Support complet pour Sage Business Cloud',
  },
  {
    name: 'FreshBooks',
    logo: <FreshBooksLogo />,
    url: 'https://www.freshbooks.com',
    color: '#0077C5',
    description: 'Sync invoices and expenses automatically',
    descriptionFr: 'Synchronisez factures et dépenses automatiquement',
  },
  {
    name: 'Wave',
    logo: <WaveLogo />,
    url: 'https://www.waveapps.com',
    color: '#FF6B35',
    description: 'Perfect for small businesses',
    descriptionFr: 'Parfait pour les petites entreprises',
  },
];

export default function IntegrationLogos() {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-play carousel
  useEffect(() => {
    if (!isPaused) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % INTEGRATIONS.length);
      }, 3000); // Change slide every 3 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 5000); // Resume after 5 seconds
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + INTEGRATIONS.length) % INTEGRATIONS.length);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 5000);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % INTEGRATIONS.length);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 5000);
  };

  const currentIntegration = INTEGRATIONS[currentIndex];

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
      <div className="max-w-5xl mx-auto">
        <p className="text-sm mb-8 text-center" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn ? 'Works with your existing accounting software' : 'Fonctionne avec votre logiciel comptable existant'}
        </p>
        
        {/* Carousel Container */}
        <div 
          className="relative rounded-2xl overflow-hidden"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            border: '2px solid rgb(var(--color-border))',
          }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Main Logo Display */}
          <div className="relative px-12 py-10 sm:py-12">
            <a
              href={currentIntegration.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <div className="flex flex-col items-center justify-center gap-6">
                {/* Logo */}
                <div 
                  className="transition-all duration-500 group-hover:scale-110"
                  style={{ color: currentIntegration.color }}
                >
                  <div className="w-full max-w-[280px] h-16 flex items-center justify-center">
                    {currentIntegration.logo}
                  </div>
                </div>
                
                {/* Description */}
                <p 
                  className="text-sm text-center transition-opacity duration-300"
                  style={{ color: 'rgb(var(--color-text-secondary))' }}
                >
                  {isEn ? currentIntegration.description : currentIntegration.descriptionFr}
                </p>
                
                {/* External Link Icon */}
                <ExternalLink 
                  className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: currentIntegration.color }}
                />
              </div>
            </a>

            {/* Navigation Arrows */}
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
              style={{ 
                backgroundColor: 'rgb(var(--color-bg))',
                border: '1px solid rgb(var(--color-border))',
                color: 'rgb(var(--color-text))',
              }}
              aria-label={isEn ? 'Previous logo' : 'Logo précédent'}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
              style={{ 
                backgroundColor: 'rgb(var(--color-bg))',
                border: '1px solid rgb(var(--color-border))',
                color: 'rgb(var(--color-text))',
              }}
              aria-label={isEn ? 'Next logo' : 'Logo suivant'}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Dot Indicators */}
          <div className="flex items-center justify-center gap-2 pb-6">
            {INTEGRATIONS.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`transition-all duration-300 rounded-full ${
                  index === currentIndex ? 'w-8' : 'w-2'
                } h-2`}
                style={{
                  backgroundColor: index === currentIndex 
                    ? currentIntegration.color 
                    : 'rgb(var(--color-border))',
                }}
                aria-label={`${isEn ? 'Go to' : 'Aller à'} ${INTEGRATIONS[index].name}`}
              />
            ))}
          </div>
        </div>

        {/* All Logos Grid (below carousel) */}
        <div className="mt-8 flex flex-wrap justify-center items-center gap-3 sm:gap-4">
          {INTEGRATIONS.map((integration, index) => (
            <button
              key={integration.name}
              onClick={() => goToSlide(index)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-300 ${
                index === currentIndex ? 'scale-105 shadow-lg' : 'hover:scale-105'
              }`}
              style={{ 
                backgroundColor: index === currentIndex 
                  ? `${integration.color}15` 
                  : 'rgb(var(--color-surface))',
                border: `2px solid ${index === currentIndex ? integration.color : 'rgb(var(--color-border))'}`,
                color: index === currentIndex 
                  ? integration.color 
                  : 'rgb(var(--color-text-secondary))',
              }}
            >
              {integration.name}
            </button>
          ))}
        </div>
        
        <p className="text-xs text-center mt-6" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn 
            ? 'Click any logo to learn more • Auto-rotates every 3 seconds'
            : 'Cliquez sur n\'importe quel logo pour en savoir plus • Rotation automatique toutes les 3 secondes'
          }
        </p>
      </div>
    </section>
  );
}
