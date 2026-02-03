import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export function OfflineIndicator() {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [isOnline, setIsOnline] = useState(true); // Default to online for SSR
  const [showIndicator, setShowIndicator] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;
    
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      setShowIndicator(true);
      setTimeout(() => setShowIndicator(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowIndicator(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Show indicator if starting offline
    if (!navigator.onLine) {
      setShowIndicator(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Don't render until mounted (prevents hydration mismatch)
  if (!mounted || !showIndicator) {
    return null;
  }

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-center gap-2 transition-transform duration-300 translate-y-0"
      style={{ 
        backgroundColor: isOnline 
          ? 'rgb(var(--color-success))' 
          : 'rgb(var(--color-error))',
        color: 'white',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
      }}
    >
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4" />
          <span className="text-sm font-medium">
            {isEn ? 'Back online' : 'En ligne'}
          </span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">
            {isEn ? 'You\'re offline. Some features may be limited.' : 'Vous êtes hors ligne. Certaines fonctionnalités peuvent être limitées.'}
          </span>
        </>
      )}
    </div>
  );
}
