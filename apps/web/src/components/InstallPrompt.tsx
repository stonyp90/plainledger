import { Smartphone, Download } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { usePlatformDetect } from '@/hooks/usePlatformDetect';

interface InstallPromptProps {
  variant?: 'button' | 'icon';
  className?: string;
  onInstall?: () => void;
}

export function InstallPrompt({ variant = 'button', className = '', onInstall }: InstallPromptProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const { isInstallable, install } = useInstallPrompt();
  const platform = usePlatformDetect();

  const handleClick = async () => {
    if (platform === 'android' && isInstallable) {
      const success = await install();
      if (success && onInstall) {
        onInstall();
      }
    } else if (platform === 'ios') {
      // Trigger modal for iOS
      const event = new CustomEvent('show-install-modal');
      window.dispatchEvent(event);
      if (onInstall) {
        onInstall();
      }
    }
  };

  // Don't show if not installable (except iOS which doesn't have install prompt)
  if (!isInstallable && platform !== 'ios') {
    return null;
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        className={`p-2 rounded-lg transition-colors hover:bg-muted ${className}`}
        style={{ color: 'rgb(var(--color-text-muted))' }}
        title={isEn ? 'Install app' : 'Installer l\'app'}
      >
        <Smartphone className="w-5 h-5" />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${className}`}
      style={{ 
        backgroundColor: 'rgb(var(--color-primary-500))',
        color: 'white'
      }}
    >
      <Download className="w-4 h-4" />
      {isEn ? 'Install App' : 'Installer l\'app'}
    </button>
  );
}
