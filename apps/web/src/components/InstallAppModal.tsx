import { X, Share2, Plus, Smartphone, Apple, Play } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { usePlatformDetect } from '@/hooks/usePlatformDetect';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InstallAppModal({ isOpen, onClose }: InstallAppModalProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const platform = usePlatformDetect();
  const { install, isInstallable } = useInstallPrompt();

  if (!isOpen) return null;

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div 
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      
      <div 
        className="relative w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div 
          className="p-6 border-b flex items-center justify-between"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}>
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Install PlainLedger' : 'Installer PlainLedger'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-muted"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {platform === 'android' && isInstallable ? (
            // Android - Native install prompt
            <div className="space-y-4">
              <p className="text-base" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn 
                  ? 'Install PlainLedger on your Android device for quick access and offline support.'
                  : 'Installez PlainLedger sur votre appareil Android pour un accès rapide et un support hors ligne.'}
              </p>
              <button
                onClick={handleInstall}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-colors"
                style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
              >
                <Play className="w-5 h-5" />
                {isEn ? 'Install Now' : 'Installer maintenant'}
              </button>
            </div>
          ) : platform === 'ios' ? (
            // iOS - Manual install instructions
            <div className="space-y-4">
              <p className="text-base" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn 
                  ? 'Add PlainLedger to your home screen for quick access:'
                  : 'Ajoutez PlainLedger à votre écran d\'accueil pour un accès rapide :'}
              </p>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 rounded-xl" style={{ backgroundColor: 'rgb(var(--color-surface-secondary))' }}>
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Share2 className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'Step 1: Tap Share' : 'Étape 1 : Appuyez sur Partager'}
                    </p>
                    <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn 
                        ? 'Tap the Share button at the bottom of your Safari browser.'
                        : 'Appuyez sur le bouton Partager en bas de votre navigateur Safari.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl" style={{ backgroundColor: 'rgb(var(--color-surface-secondary))' }}>
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Plus className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'Step 2: Add to Home Screen' : 'Étape 2 : Ajouter à l\'écran d\'accueil'}
                    </p>
                    <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn 
                        ? 'Scroll down and tap "Add to Home Screen".'
                        : 'Faites défiler vers le bas et appuyez sur "Ajouter à l\'écran d\'accueil".'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Desktop - QR code instructions
            <div className="space-y-4">
              <p className="text-base" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn 
                  ? 'Scan the QR code with your phone to install PlainLedger on your mobile device.'
                  : 'Scannez le code QR avec votre téléphone pour installer PlainLedger sur votre appareil mobile.'}
              </p>
              <div className="p-4 rounded-xl text-center" style={{ backgroundColor: 'rgb(var(--color-surface-secondary))' }}>
                <p className="text-sm mb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'QR code available on the landing page' : 'Code QR disponible sur la page d\'accueil'}
                </p>
              </div>
            </div>
          )}

          {/* Benefits */}
          <div className="pt-4 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <p className="text-sm font-medium mb-3" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Benefits:' : 'Avantages :'}
            </p>
            <ul className="space-y-2 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'rgb(var(--color-primary-500))' }} />
                {isEn ? 'Works offline' : 'Fonctionne hors ligne'}
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'rgb(var(--color-primary-500))' }} />
                {isEn ? 'Faster loading' : 'Chargement plus rapide'}
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'rgb(var(--color-primary-500))' }} />
                {isEn ? 'Quick access from home screen' : 'Accès rapide depuis l\'écran d\'accueil'}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
