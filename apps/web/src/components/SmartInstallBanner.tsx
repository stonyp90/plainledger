import { useState, useEffect } from 'react';
import { X, Smartphone, Download } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { usePlatformDetect, useIsMobile } from '@/hooks/usePlatformDetect';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

export function SmartInstallBanner() {
  const { language } = useI18n();
  const isEn = language === 'en';
  const platform = usePlatformDetect();
  const isMobile = useIsMobile();
  const { isInstallable, isInstalled, install } = useInstallPrompt();
  const [isDismissed, setIsDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('pwa-install-banner-dismissed');
      if (dismissed === 'true') {
        setIsDismissed(true);
      }
    }
  }, []);

  // Don't render until mounted (prevents hydration mismatch)
  if (!mounted) {
    return null;
  }

  // Don't show if:
  // - Already installed
  // - Dismissed by user
  // - Not installable (and not iOS which doesn't have install prompt)
  if (isInstalled || isDismissed || (!isInstallable && platform !== 'ios')) {
    return null;
  }

  // Only show on mobile devices
  if (!isMobile) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('pwa-install-banner-dismissed', 'true');
  };

  const handleInstall = async () => {
    if (platform === 'android' && isInstallable) {
      await install();
    } else if (platform === 'ios') {
      // For iOS, we'll show the modal instead
      // This could trigger opening InstallAppModal
      const event = new CustomEvent('show-install-modal');
      window.dispatchEvent(event);
    }
  };

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 p-4 z-50 animate-slide-up"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        borderTop: '1px solid rgb(var(--color-border))',
        boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div className="max-w-md mx-auto flex items-center gap-3">
        <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}>
          <Smartphone className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Install PlainLedger' : 'Installer PlainLedger'}
          </p>
          <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn 
              ? 'Get quick access and offline support'
              : 'Obtenez un accès rapide et un support hors ligne'}
          </p>
        </div>
        <button
          onClick={handleInstall}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
        >
          <Download className="w-4 h-4" />
          {isEn ? 'Install' : 'Installer'}
        </button>
        <button
          onClick={handleDismiss}
          className="p-2 rounded-lg transition-colors hover:bg-muted"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
