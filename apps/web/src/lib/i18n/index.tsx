/**
 * PlainLedger i18n - Internationalization System
 * Provides language context and translation utilities
 */

import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
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

// Quebec flag SVG component (blue with white cross and fleur-de-lis)
const QuebecFlag = ({ className = "w-5 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Blue background */}
    <rect width="24" height="16" rx="2" fill="#095797"/>
    {/* White cross */}
    <rect x="10" y="0" width="4" height="16" fill="white"/>
    <rect x="0" y="6" width="24" height="4" fill="white"/>
    {/* Simplified fleur-de-lis in each quadrant */}
    <g fill="white">
      {/* Top-left ⚜ */}
      <path d="M5 2L5.8 3.5H4.2L5 2ZM3.5 3.5L5 5L6.5 3.5L5 4.5L3.5 3.5Z" />
      {/* Top-right ⚜ */}
      <path d="M19 2L19.8 3.5H18.2L19 2ZM17.5 3.5L19 5L20.5 3.5L19 4.5L17.5 3.5Z" />
      {/* Bottom-left ⚜ */}
      <path d="M5 11L5.8 12.5H4.2L5 11ZM3.5 12.5L5 14L6.5 12.5L5 13.5L3.5 12.5Z" />
      {/* Bottom-right ⚜ */}
      <path d="M19 11L19.8 12.5H18.2L19 11ZM17.5 12.5L19 14L20.5 12.5L19 13.5L17.5 12.5Z" />
    </g>
  </svg>
);

// Canada flag emoji wrapper for consistency
const CanadaFlag = ({ className = "w-5 h-4" }: { className?: string }) => (
  <span className={`inline-flex items-center justify-center ${className}`} style={{ fontSize: '1.1em', lineHeight: 1 }}>🇨🇦</span>
);

export function LanguageSelector({ className }: LanguageSelectorProps) {
  const { language, setLanguage } = useI18n();

  const nextLang = language === 'en' ? 'Français' : 'English';

  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all hover:opacity-80 active:scale-95 ${className}`}
      style={{ color: 'rgb(var(--color-text))' }}
      title={language === 'en' ? `Switch to ${nextLang}` : `Passer en ${nextLang}`}
    >
      {language === 'en' ? <CanadaFlag /> : <QuebecFlag />}
      <span className="text-xs font-semibold uppercase">{language}</span>
    </button>
  );
}

// Compact version for header with flag dropdown
export function LanguageToggle() {
  const { language, setLanguage } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const languages = [
    { code: 'en' as const, name: 'English' },
    { code: 'fr' as const, name: 'Français' },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all hover:opacity-80 active:scale-95"
        style={{ color: 'rgb(var(--color-text))' }}
        title={language === 'en' ? 'Change language' : 'Changer de langue'}
      >
        {language === 'en' ? <CanadaFlag className="w-5 h-4" /> : <QuebecFlag className="w-5 h-4" />}
        <span className="text-xs font-semibold uppercase">{language}</span>
        <svg 
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
          style={{ opacity: 0.5 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 py-1.5 rounded-xl shadow-xl border z-50 min-w-[140px] overflow-hidden"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            borderColor: 'rgb(var(--color-border))',
            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)'
          }}
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-all hover:bg-black/5 dark:hover:bg-white/5"
              style={{ 
                color: language === lang.code ? 'rgb(var(--color-primary))' : 'rgb(var(--color-text))',
                fontWeight: language === lang.code ? 600 : 400
              }}
            >
              {lang.code === 'en' ? <CanadaFlag className="w-5 h-4" /> : <QuebecFlag className="w-5 h-4" />}
              <span className="flex-1 text-left">{lang.name}</span>
              {language === lang.code && (
                <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default I18nProvider;
