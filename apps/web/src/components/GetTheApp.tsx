import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { useI18n } from '@/lib/i18n';
import { Smartphone, Apple, Play, WifiOff, Zap, Bell, ChevronDown } from 'lucide-react';
import { usePlatformDetect } from '@/hooks/usePlatformDetect';
import { InstallAppModal } from './InstallAppModal';
import { ClientOnly } from './ClientOnly';

interface FeatureItemProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}

function FeatureItem({ icon: Icon, title }: FeatureItemProps) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="p-1.5 sm:p-2 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
      </div>
      <span className="text-sm sm:text-base" style={{ color: 'rgb(var(--color-text))' }}>{title}</span>
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
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setAppUrl(window.location.origin);
    }
  }, []);

  return (
    <>
      <section id="mobile-app" className="py-4 sm:py-6" style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}>
        <div className="max-w-6xl mx-auto px-4">
          {/* Collapsed Header - Always visible */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-center gap-3 py-2 group cursor-pointer"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}>
              <Smartphone className="w-4 h-4 text-white" />
              <span className="text-white font-medium text-xs sm:text-sm">
                {isEn ? 'Mobile App Available' : 'Application mobile disponible'}
              </span>
            </div>
            <ChevronDown 
              className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
              style={{ color: 'rgb(var(--color-text-muted))' }}
            />
          </button>

          {/* Expandable Content */}
          <div 
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isExpanded ? 'max-h-[800px] opacity-100 mt-6' : 'max-h-0 opacity-0'
            }`}
          >
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
            
            <div className="grid md:grid-cols-2 gap-8 sm:gap-10 md:gap-12 items-center">
              {/* QR Code */}
              <div className="flex justify-center md:justify-end">
                <div className="bg-white p-3 sm:p-4 rounded-xl shadow-xl max-w-fit">
                  <ClientOnly
                    fallback={
                      <div className="w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] bg-gray-100 animate-pulse rounded" />
                    }
                  >
                    <div className="w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] flex items-center justify-center">
                      <QRCode 
                        value={appUrl} 
                        size={280}
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
                  <p className="text-slate-600 text-xs text-center mt-2 sm:mt-3">
                    {isEn ? 'Scan to install' : 'Scannez pour installer'}
                  </p>
                </div>
              </div>
              
              {/* Features & Instructions */}
              <div className="flex flex-col justify-center space-y-4 sm:space-y-5 md:space-y-6 md:items-start">
                <FeatureItem icon={WifiOff} title={isEn ? 'Works Offline' : 'Fonctionne hors ligne'} />
                <FeatureItem icon={Zap} title={isEn ? 'Lightning Fast' : 'Ultra rapide'} />
                <FeatureItem icon={Bell} title={isEn ? 'Push Notifications' : 'Notifications push'} />
                
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-3 sm:pt-4">
                  <button 
                    onClick={() => setShowModal(true)}
                    className="flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium text-sm sm:text-base transition-colors"
                    style={{ 
                      backgroundColor: platform === 'ios' ? 'rgb(var(--color-surface))' : 'rgb(var(--color-surface))',
                      color: 'rgb(var(--color-text))',
                      border: '1px solid rgb(var(--color-border))'
                    }}
                  >
                    <Apple className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span>iOS</span>
                  </button>
                  <button 
                    onClick={() => setShowModal(true)}
                    className="flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium text-sm sm:text-base transition-colors"
                    style={{ 
                      backgroundColor: platform === 'android' ? 'rgb(var(--color-surface))' : 'rgb(var(--color-surface))',
                      color: 'rgb(var(--color-text))',
                      border: '1px solid rgb(var(--color-border))'
                    }}
                  >
                    <Play className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span>Android</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <InstallAppModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
