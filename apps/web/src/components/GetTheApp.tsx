import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { useI18n } from '@/lib/i18n';
import { Smartphone, Apple, Play, WifiOff, Zap, Bell } from 'lucide-react';
import { usePlatformDetect } from '@/hooks/usePlatformDetect';
import { InstallAppModal } from './InstallAppModal';
import { ClientOnly } from './ClientOnly';

interface FeatureItemProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}

function FeatureItem({ icon: Icon, title }: FeatureItemProps) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto justify-center lg:justify-start">
      <div className="p-1.5 sm:p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
      </div>
      <span className="text-sm sm:text-base text-center lg:text-left" style={{ color: 'rgb(var(--color-text))' }}>{title}</span>
    </div>
  );
}

export function GetTheApp() {
  const { language } = useI18n();
  const isEn = language === 'en';
  const platform = usePlatformDetect();
  const [showModal, setShowModal] = useState(false);
  const [appUrl, setAppUrl] = useState('https://plainledger.io');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setAppUrl(window.location.origin);
    }
  }, []);

  return (
    <>
      <section id="mobile-app" className="py-8 sm:py-12 lg:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Header Badge */}
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}>
              <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              <span className="text-white font-medium text-xs sm:text-sm">
                {isEn ? 'Mobile App Available' : 'Application mobile disponible'}
              </span>
            </div>
          </div>

          {/* Content - Always visible */}
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 leading-tight" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Take PlainLedger Anywhere' : 'PlainLedger partout avec vous'}
            </h2>
            <p className="text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn 
                ? 'Access your financial dashboards on the go. Scan the QR code to install the app on your phone.'
                : 'Accédez à vos tableaux de bord financiers en déplacement. Scannez le code QR pour installer l\'app.'}
            </p>
          </div>
          
          {/* Balanced Grid Layout - Better for mobile and desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center max-w-4xl mx-auto">
            {/* QR Code - Centered on mobile, right-aligned on desktop */}
            <div className="flex justify-center lg:justify-end order-1 lg:order-1">
              <div className="bg-white p-4 sm:p-5 rounded-xl shadow-lg max-w-fit">
                <ClientOnly
                  fallback={
                    <div className="w-[140px] h-[140px] sm:w-[160px] sm:h-[160px] bg-gray-100 animate-pulse rounded" />
                  }
                >
                  <div className="w-[140px] h-[140px] sm:w-[160px] sm:h-[160px] flex items-center justify-center">
                    <QRCode 
                      value={appUrl} 
                      size={320}
                      level="H"
                      style={{ 
                        height: 'auto', 
                        maxWidth: '100%', 
                        width: '100%',
                        imageRendering: 'crisp-edges'
                      }}
                    />
                  </div>
                </ClientOnly>
                <p className="text-slate-600 text-xs sm:text-sm text-center mt-3">
                  {isEn ? 'Scan to install' : 'Scannez pour installer'}
                </p>
              </div>
            </div>
            
            {/* Features & Instructions - Centered on mobile, left-aligned on desktop */}
            <div className="flex flex-col justify-center items-center lg:items-start space-y-4 sm:space-y-5 order-2 lg:order-2">
              <FeatureItem icon={WifiOff} title={isEn ? 'Works Offline' : 'Fonctionne hors ligne'} />
              <FeatureItem icon={Zap} title={isEn ? 'Lightning Fast' : 'Ultra rapide'} />
              <FeatureItem icon={Bell} title={isEn ? 'Push Notifications' : 'Notifications push'} />
              
              {/* App Store Buttons - Centered on mobile */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4 w-full sm:w-auto">
                <button 
                  onClick={() => setShowModal(true)}
                  className="flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium text-sm sm:text-base transition-colors hover:opacity-90"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-surface))',
                    color: 'rgb(var(--color-text))',
                    border: '1px solid rgb(var(--color-border))'
                  }}
                  aria-label={isEn ? 'Install on iOS' : 'Installer sur iOS'}
                >
                  <Apple className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span>iOS</span>
                </button>
                <button 
                  onClick={() => setShowModal(true)}
                  className="flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium text-sm sm:text-base transition-colors hover:opacity-90"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-surface))',
                    color: 'rgb(var(--color-text))',
                    border: '1px solid rgb(var(--color-border))'
                  }}
                  aria-label={isEn ? 'Install on Android' : 'Installer sur Android'}
                >
                  <Play className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span>Android</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <InstallAppModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
