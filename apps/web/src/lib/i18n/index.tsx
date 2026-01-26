/**
 * PlainLedger i18n - Internationalization System
 * Provides language context and translation utilities
 */

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Globe } from 'lucide-react';
import { translations, Language } from './translations';

// Re-export types
export { translations, type Language } from './translations';

// ============================================================================
// Context Types
// ============================================================================

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslateFunction;
  formatCurrency: (value: number, currency?: string) => string;
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatPercent: (value: number, decimals?: number) => string;
}

type TranslateFunction = (key: string, params?: Record<string, string | number>) => string;

// ============================================================================
// Context
// ============================================================================

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

// Shorthand hook for just the translate function
export function useTranslation() {
  const { t, language } = useI18n();
  return { t, language };
}

// ============================================================================
// Provider
// ============================================================================

interface I18nProviderProps {
  children: ReactNode;
  defaultLanguage?: Language;
}

export function I18nProvider({ children, defaultLanguage = 'fr' }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Try to get from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('plainledger-language') as Language;
      if (stored === 'en' || stored === 'fr') {
        return stored;
      }
      // Try to detect from browser
      const browserLang = navigator.language.split('-')[0];
      if (browserLang === 'en') return 'en';
    }
    return defaultLanguage;
  });

  // Persist language choice
  useEffect(() => {
    localStorage.setItem('plainledger-language', language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  // Translation function
  const t: TranslateFunction = useCallback((key: string, params?: Record<string, string | number>) => {
    const keys = key.split('.');
    let value: unknown = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    // Get the translation for current language
    if (value && typeof value === 'object' && language in value) {
      let result = (value as Record<Language, string>)[language];
      
      // Replace parameters
      if (params) {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          result = result.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue));
        });
      }
      
      return result;
    }

    console.warn(`Translation not found for language ${language}: ${key}`);
    return key;
  }, [language]);

  // Currency formatter
  const formatCurrency = useCallback((value: number, currency = 'CAD') => {
    return new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }, [language]);

  // Date formatter
  const formatDate = useCallback((date: Date | string, options?: Intl.DateTimeFormatOptions) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return new Intl.DateTimeFormat(
      language === 'fr' ? 'fr-CA' : 'en-CA',
      options || defaultOptions
    ).format(dateObj);
  }, [language]);

  // Number formatter
  const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat(
      language === 'fr' ? 'fr-CA' : 'en-CA',
      options
    ).format(value);
  }, [language]);

  // Percent formatter
  const formatPercent = useCallback((value: number, decimals = 1) => {
    return new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value / 100);
  }, [language]);

  return (
    <I18nContext.Provider value={{
      language,
      setLanguage,
      t,
      formatCurrency,
      formatDate,
      formatNumber,
      formatPercent,
    }}>
      {children}
    </I18nContext.Provider>
  );
}

// ============================================================================
// Language Selector Component
// ============================================================================

interface LanguageSelectorProps {
  className?: string;
}

export function LanguageSelector({ className }: LanguageSelectorProps) {
  const { language, setLanguage } = useI18n();

  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${className}`}
      style={{ 
        backgroundColor: 'rgb(var(--color-bg-muted))',
        color: 'rgb(var(--color-text))'
      }}
      title={language === 'en' ? 'Switch to French' : 'Passer en anglais'}
    >
      <Globe className="w-4 h-4" />
      <span className="text-sm font-medium uppercase">{language}</span>
    </button>
  );
}

// Compact version for header
export function LanguageToggle() {
  const { language, setLanguage } = useI18n();

  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')}
      className="icon-btn"
      title={language === 'en' ? 'Switch to French' : 'Passer en anglais'}
    >
      <span className="text-xs font-bold uppercase">{language}</span>
    </button>
  );
}

export default I18nProvider;
