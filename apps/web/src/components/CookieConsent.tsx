/**
 * Cookie Consent Component
 *
 * GDPR/Quebec Law 25 compliant cookie consent banner.
 * - Blocks analytics until consent given
 * - Granular consent options (essential, analytics, marketing)
 * - Persists preferences to localStorage
 * - Bilingual EN/FR
 */

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '../lib/i18n';
import { Cookie, Shield, BarChart3, Megaphone, X, Settings, Check } from 'lucide-react';

// Consent state
export interface ConsentState {
  essential: boolean;   // Always true - required for site to function
  analytics: boolean;   // GA4, PostHog
  marketing: boolean;   // Future: ads, retargeting
  timestamp: string;    // When consent was given
  version: string;      // Consent version for audit trail
}

// Default consent - nothing except essential
const DEFAULT_CONSENT: ConsentState = {
  essential: true,
  analytics: false,
  marketing: false,
  timestamp: '',
  version: '1.0',
};

// Storage key
const CONSENT_KEY = 'pl_cookie_consent';
const CONSENT_VERSION = '1.0';

// Context
interface ConsentContextType {
  consent: ConsentState;
  hasConsented: boolean;
  showBanner: boolean;
  setShowBanner: (show: boolean) => void;
  acceptAll: () => void;
  rejectAll: () => void;
  savePreferences: (prefs: Partial<ConsentState>) => void;
  resetConsent: () => void;
}

const ConsentContext = createContext<ConsentContextType | null>(null);

// Hook to use consent
export function useConsent() {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error('useConsent must be used within ConsentProvider');
  }
  return context;
}

// Check if consent has been given
export function getStoredConsent(): ConsentState | null {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ConsentState;
      // Check if consent version matches
      if (parsed.version === CONSENT_VERSION) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading consent:', e);
  }
  return null;
}

// Check if analytics consent is given (for external use)
export function hasAnalyticsConsent(): boolean {
  const consent = getStoredConsent();
  return consent?.analytics ?? false;
}

// Provider component
export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<ConsentState>(DEFAULT_CONSENT);
  const [hasConsented, setHasConsented] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  // Load consent on mount
  useEffect(() => {
    const stored = getStoredConsent();
    if (stored) {
      setConsent(stored);
      setHasConsented(true);
      // Initialize analytics if consent was given
      if (stored.analytics) {
        initializeAnalytics();
      }
    } else {
      // No consent stored, show banner
      setShowBanner(true);
    }
  }, []);

  // Initialize analytics when consent is given
  const initializeAnalytics = useCallback(() => {
    // GA4 - enable tracking
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted',
      });
    }

    // PostHog - opt in
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.opt_in_capturing();
    }
  }, []);

  // Disable analytics
  const disableAnalytics = useCallback(() => {
    // GA4 - disable tracking
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied',
      });
    }

    // PostHog - opt out
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.opt_out_capturing();
    }
  }, []);

  // Save consent to localStorage
  const saveConsent = useCallback((newConsent: ConsentState) => {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(newConsent));
      setConsent(newConsent);
      setHasConsented(true);
      setShowBanner(false);

      // Handle analytics based on consent
      if (newConsent.analytics) {
        initializeAnalytics();
      } else {
        disableAnalytics();
      }
    } catch (e) {
      console.error('Error saving consent:', e);
    }
  }, [initializeAnalytics, disableAnalytics]);

  // Accept all cookies
  const acceptAll = useCallback(() => {
    saveConsent({
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    });
  }, [saveConsent]);

  // Reject all (except essential)
  const rejectAll = useCallback(() => {
    saveConsent({
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    });
  }, [saveConsent]);

  // Save custom preferences
  const savePreferences = useCallback((prefs: Partial<ConsentState>) => {
    saveConsent({
      ...consent,
      ...prefs,
      essential: true, // Always required
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    });
  }, [consent, saveConsent]);

  // Reset consent (for testing or user request)
  const resetConsent = useCallback(() => {
    localStorage.removeItem(CONSENT_KEY);
    setConsent(DEFAULT_CONSENT);
    setHasConsented(false);
    setShowBanner(true);
    disableAnalytics();
  }, [disableAnalytics]);

  return (
    <ConsentContext.Provider value={{
      consent,
      hasConsented,
      showBanner,
      setShowBanner,
      acceptAll,
      rejectAll,
      savePreferences,
      resetConsent,
    }}>
      {children}
    </ConsentContext.Provider>
  );
}

// Banner component
export default function CookieConsent() {
  const { language } = useI18n();
  const { showBanner, acceptAll, rejectAll, savePreferences, consent } = useConsent();
  const [showSettings, setShowSettings] = useState(false);
  const [localPrefs, setLocalPrefs] = useState({
    analytics: consent.analytics,
    marketing: consent.marketing,
  });
  const isEn = language === 'en';

  // Update local prefs when consent changes
  useEffect(() => {
    setLocalPrefs({
      analytics: consent.analytics,
      marketing: consent.marketing,
    });
  }, [consent]);

  if (!showBanner) return null;

  const handleSavePreferences = () => {
    savePreferences(localPrefs);
    setShowSettings(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-[9999] p-2 sm:p-4"
      >
        <div 
          className="max-w-4xl mx-auto rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))',
          }}
        >
          {!showSettings ? (
            // Main banner - compact on mobile
            <div className="p-3 sm:p-6">
              <div className="flex items-start gap-2 sm:gap-4">
                <div 
                  className="p-2 sm:p-3 rounded-lg sm:rounded-xl flex-shrink-0 hidden sm:block"
                  style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                >
                  <Cookie className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: 'rgb(var(--color-primary-500))' }} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 sm:mb-2">
                    <Cookie className="w-4 h-4 sm:hidden flex-shrink-0" style={{ color: 'rgb(var(--color-primary-500))' }} />
                    <h3 
                      className="text-sm sm:text-lg font-semibold truncate"
                      style={{ color: 'rgb(var(--color-text))' }}
                    >
                      {isEn ? 'Cookie preferences' : 'Préférences de témoins'}
                    </h3>
                  </div>
                  <p 
                    className="text-xs sm:text-sm mb-2 sm:mb-4 line-clamp-2 sm:line-clamp-none"
                    style={{ color: 'rgb(var(--color-text-secondary))' }}
                  >
                    {isEn 
                      ? 'We use cookies to improve your experience.'
                      : 'Nous utilisons des témoins pour améliorer votre expérience.'}
                  </p>
                  
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <button
                      onClick={acceptAll}
                      className="px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm text-white transition-all hover:scale-105"
                      style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
                    >
                      {isEn ? 'Accept' : 'Accepter'}
                    </button>
                    <button
                      onClick={rejectAll}
                      className="px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all"
                      style={{ 
                        backgroundColor: 'rgb(var(--color-bg-subtle))',
                        color: 'rgb(var(--color-text))',
                      }}
                    >
                      {isEn ? 'Reject' : 'Refuser'}
                    </button>
                    <button
                      onClick={() => setShowSettings(true)}
                      className="p-1.5 sm:px-5 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm flex items-center gap-1 sm:gap-2 transition-all"
                      style={{ 
                        color: 'rgb(var(--color-text-secondary))',
                      }}
                    >
                      <Settings className="w-4 h-4" />
                      <span className="hidden sm:inline">{isEn ? 'Customize' : 'Personnaliser'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Settings panel - compact on mobile
            <div className="p-3 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-6">
                <h3 
                  className="text-sm sm:text-lg font-semibold"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn ? 'Cookie Preferences' : 'Préférences de témoins'}
                </h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1.5 sm:p-2 rounded-lg transition-all"
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              <div className="space-y-2 sm:space-y-4 mb-3 sm:mb-6">
                {/* Essential - Always on */}
                <CookieCategory
                  icon={Shield}
                  title={isEn ? 'Essential' : 'Essentiels'}
                  description={isEn 
                    ? 'Required for the website to function.'
                    : 'Requis pour le fonctionnement du site.'}
                  enabled={true}
                  locked={true}
                />

                {/* Analytics */}
                <CookieCategory
                  icon={BarChart3}
                  title={isEn ? 'Analytics' : 'Analytique'}
                  description={isEn 
                    ? 'Help us improve the site.'
                    : 'Nous aide à améliorer le site.'}
                  enabled={localPrefs.analytics}
                  onChange={(enabled) => setLocalPrefs({ ...localPrefs, analytics: enabled })}
                />

                {/* Marketing */}
                <CookieCategory
                  icon={Megaphone}
                  title={isEn ? 'Marketing' : 'Marketing'}
                  description={isEn 
                    ? 'Show relevant ads.'
                    : 'Afficher des publicités pertinentes.'}
                  enabled={localPrefs.marketing}
                  onChange={(enabled) => setLocalPrefs({ ...localPrefs, marketing: enabled })}
                />
              </div>

              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={handleSavePreferences}
                  className="flex-1 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm text-white transition-all hover:scale-[1.02]"
                  style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
                >
                  {isEn ? 'Save' : 'Enregistrer'}
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-bg-subtle))',
                    color: 'rgb(var(--color-text))',
                  }}
                >
                  {isEn ? 'Cancel' : 'Annuler'}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Cookie category component
function CookieCategory({
  icon: Icon,
  title,
  description,
  enabled,
  locked = false,
  onChange,
}: {
  icon: typeof Shield;
  title: string;
  description: string;
  enabled: boolean;
  locked?: boolean;
  onChange?: (enabled: boolean) => void;
}) {
  return (
    <div 
      className="flex items-center gap-2 sm:gap-4 p-2 sm:p-4 rounded-lg sm:rounded-xl"
      style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}
    >
      <div 
        className="p-1.5 sm:p-2 rounded-md sm:rounded-lg flex-shrink-0"
        style={{ backgroundColor: enabled ? 'rgb(var(--color-primary-500) / 0.1)' : 'rgb(var(--color-bg))' }}
      >
        <Icon 
          className="w-4 h-4 sm:w-5 sm:h-5" 
          style={{ color: enabled ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))' }} 
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h4 
              className="font-medium text-xs sm:text-sm"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {title}
            </h4>
            <p 
              className="text-[10px] sm:text-xs mt-0.5 truncate sm:whitespace-normal"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {description}
            </p>
          </div>
          
          {locked ? (
            <span 
              className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded flex-shrink-0"
              style={{ 
                backgroundColor: 'rgb(var(--color-bg))',
                color: 'rgb(var(--color-text-muted))',
              }}
            >
              On
            </span>
          ) : (
            <button
              onClick={() => onChange?.(!enabled)}
              className="w-10 sm:w-12 h-5 sm:h-6 rounded-full transition-all relative flex-shrink-0"
              style={{ 
                backgroundColor: enabled ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-border))',
              }}
            >
              <span 
                className={`absolute top-0.5 sm:top-1 w-4 h-4 rounded-full bg-white transition-all ${
                  enabled ? 'left-5 sm:left-7' : 'left-0.5 sm:left-1'
                }`}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Declare window types
declare global {
  interface Window {
    gtag?: (command: string, action: string, params?: Record<string, string>) => void;

  }
}
