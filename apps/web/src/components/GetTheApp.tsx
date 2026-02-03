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
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <span className="text-base" style={{ color: 'rgb(var(--color-text))' }}>{title}</span>
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
      <section id="mobile-app" className="py-24" style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4" style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}>
              <Smartphone className="w-5 h-5 text-white" />
              <span className="text-white font-medium">
                {isEn ? 'Available on Mobile' : 'Disponible sur mobile'}
              </span>
            </div>
            <h2 className="text-4xl font-bold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Take PlainLedger Anywhere' : 'PlainLedger partout avec vous'}
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn 
                ? 'Access your financial dashboards on the go. Scan the QR code to install the app on your phone.'
                : 'Accédez à vos tableaux de bord financiers en déplacement. Scannez le code QR pour installer l\'app.'}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-white p-6 rounded-2xl shadow-2xl">
                <ClientOnly
                  fallback={
                    <div className="w-[200px] h-[200px] bg-gray-100 animate-pulse rounded" />
                  }
                >
                  <QRCode 
                    value={appUrl} 
                    size={200}
                    style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                  />
                </ClientOnly>
                <p className="text-slate-600 text-sm text-center mt-4">
                  {isEn ? 'Scan to install' : 'Scannez pour installer'}
                </p>
              </div>
            </div>
            
            {/* Features & Instructions */}
            <div className="space-y-6">
              <FeatureItem icon={WifiOff} title={isEn ? 'Works Offline' : 'Fonctionne hors ligne'} />
              <FeatureItem icon={Zap} title={isEn ? 'Lightning Fast' : 'Ultra rapide'} />
              <FeatureItem icon={Bell} title={isEn ? 'Push Notifications' : 'Notifications push'} />
              
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors"
                  style={{ 
                    backgroundColor: platform === 'ios' ? 'rgb(var(--color-surface))' : 'rgb(var(--color-surface))',
                    color: 'rgb(var(--color-text))',
                    border: '1px solid rgb(var(--color-border))'
                  }}
                >
                  <Apple className="w-6 h-6" />
                  <span>iOS</span>
                </button>
                <button 
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors"
                  style={{ 
                    backgroundColor: platform === 'android' ? 'rgb(var(--color-surface))' : 'rgb(var(--color-surface))',
                    color: 'rgb(var(--color-text))',
                    border: '1px solid rgb(var(--color-border))'
                  }}
                >
                  <Play className="w-6 h-6" />
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
