import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { useI18n } from '@/lib/i18n';
import { Smartphone, Apple, Play, WifiOff, Zap, Bell } from 'lucide-react';
import { usePlatformDetect } from '@/hooks/usePlatformDetect';
import { InstallAppModal } from './InstallAppModal';
import { ClientOnly } from './ClientOnly';

interface FeatureItemProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
}

function FeatureItem({ icon: Icon, title }: FeatureItemProps) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgb(var(--color-primary-500))' }} />
      <span>{title}</span>
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
      <section id="mobile-app" className="py-10 sm:py-14 lg:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {/* Balanced two-column layout */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 lg:gap-16">
            {/* Left: Text content */}
            <div className="flex-1 text-center md:text-left max-w-lg">
              {/* Badge */}
              <div className="flex justify-center md:justify-start mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}>
                  <Smartphone className="w-3.5 h-3.5 text-white" />
                  <span className="text-white font-medium text-xs">
                    {isEn ? 'Mobile App' : 'Application mobile'}
                  </span>
                </div>
              </div>
              
              {/* Title */}
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 leading-tight" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'PlainLedger on the go' : 'PlainLedger partout'}
              </h2>
              
              {/* Subtitle */}
              <p className="text-sm sm:text-base mb-5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn 
                  ? 'Access your dashboards anywhere. Scan to install.'
                  : 'Accédez à vos tableaux de bord partout. Scannez pour installer.'}
              </p>
              
              {/* Features */}
              <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-5">
                <FeatureItem icon={WifiOff} title={isEn ? 'Offline' : 'Hors ligne'} />
                <FeatureItem icon={Zap} title={isEn ? 'Fast' : 'Rapide'} />
                <FeatureItem icon={Bell} title={isEn ? 'Notifications' : 'Notifications'} />
              </div>
              
              {/* App Store Buttons */}
              <div className="flex justify-center md:justify-start gap-2">
                <button 
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:opacity-90"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-surface))',
                    color: 'rgb(var(--color-text))',
                    border: '1px solid rgb(var(--color-border))'
                  }}
                  aria-label={isEn ? 'Install on iOS' : 'Installer sur iOS'}
                >
                  <Apple className="w-4 h-4" />
                  <span>iOS</span>
                </button>
                <button 
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:opacity-90"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-surface))',
                    color: 'rgb(var(--color-text))',
                    border: '1px solid rgb(var(--color-border))'
                  }}
                  aria-label={isEn ? 'Install on Android' : 'Installer sur Android'}
                >
                  <Play className="w-4 h-4" />
                  <span>Android</span>
                </button>
              </div>
            </div>
            
            {/* Right: QR Code */}
            <div className="flex-shrink-0">
              <div className="bg-white p-4 rounded-xl shadow-md">
                <ClientOnly
                  fallback={
                    <div className="w-[140px] h-[140px] bg-gray-100 animate-pulse rounded" />
                  }
                >
                  <div className="w-[140px] h-[140px] flex items-center justify-center">
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
                <p className="text-slate-500 text-[10px] text-center mt-2">
                  {isEn ? 'Scan to install' : 'Scannez pour installer'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <InstallAppModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
