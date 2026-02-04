/**
 * PublicHeader Component
 * 
 * Reusable header for public pages (Landing, Signup, Login, etc.)
 * Provides consistent navigation menu across the website
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../lib/keycloak';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from './ThemeToggle';
import { LanguageToggle, useI18n } from '../lib/i18n';

interface PublicHeaderProps {
  /** Show full navigation menu (for landing page) */
  fullMenu?: boolean;
  /** Show progress indicator (for signup flow) */
  showProgress?: {
    currentStep: number;
    totalSteps: number;
    progress: number;
  };
  /** Custom className for header */
  className?: string;
}

export default function PublicHeader({ 
  fullMenu = false, 
  showProgress,
  className = ''
}: PublicHeaderProps) {
  const { language } = useI18n();
  const { authenticated, login, register } = useAuth();
  const { resolvedTheme } = useTheme();
  const isEn = language === 'en';
  const isDark = resolvedTheme === 'dark';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header 
      className={`sticky top-0 z-50 border-b backdrop-blur-md ${className}`}
      style={{ 
        backgroundColor: 'rgb(var(--color-bg) / 0.85)',
        borderColor: 'rgb(var(--color-border) / 0.5)'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - switches between light and dark variants */}
          <Link to="/" className="flex items-center group transition-transform group-hover:scale-[1.02]">
            <img 
              src={isDark ? "/logo-full-dark.svg" : "/logo-full.svg"} 
              alt="PlainLedger" 
              className="h-9 sm:h-10 lg:h-11"
            />
          </Link>

          {/* Desktop Nav - Aligned breakpoints */}
          {fullMenu ? (
            <>
              {/* Desktop Nav - Optimized to 4 main sections */}
              <nav className="hidden md:flex items-center gap-4 lg:gap-6" aria-label={isEn ? 'Main navigation' : 'Navigation principale'}>
                <a href="/#features" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Features' : 'Fonctionnalités'}
                </a>
                <a href="/#industries" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Industries' : 'Industries'}
                </a>
                <a href="/#pricing" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Pricing' : 'Tarifs'}
                </a>
                <a href="/#contact" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  Contact
                </a>
              </nav>
            </>
          ) : (
            <nav className="hidden md:flex items-center gap-6" aria-label={isEn ? 'Main navigation' : 'Navigation principale'}>
              <a href="/#industries" className="text-sm font-medium hover:text-primary transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Industries' : 'Industries'}
              </a>
              <a href="/#pricing" className="text-sm font-medium hover:text-primary transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Pricing' : 'Tarifs'}
              </a>
            </nav>
          )}

          {/* Desktop Actions - Aligned with nav breakpoints */}
          <div className="hidden md:flex items-center gap-3">
            {/* Progress indicator (if provided) */}
            {showProgress && (
              <div className="flex items-center gap-3 mr-2">
                <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? `Step ${showProgress.currentStep} of ${showProgress.totalSteps}` : `Étape ${showProgress.currentStep} sur ${showProgress.totalSteps}`}
                </span>
                <div className="w-24 h-2 rounded-full" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
                  <div 
                    className="h-full rounded-full transition-all duration-300"
                    style={{ 
                      width: `${showProgress.progress}%`,
                      backgroundColor: 'rgb(var(--color-primary-500))'
                    }}
                  />
                </div>
              </div>
            )}
            
            <ThemeToggle />
            <LanguageToggle />
            
            {authenticated ? (
              <Link 
                to="/app" 
                className="px-5 py-2.5 rounded-lg font-medium transition-all btn-primary btn-sm whitespace-nowrap"
              >
                {isEn ? 'Go to Dashboard' : 'Accéder au dashboard'}
              </Link>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="text-sm font-medium whitespace-nowrap"
                  style={{ color: 'rgb(var(--color-text-secondary))' }}
                >
                  {isEn ? 'Sign in' : 'Connexion'}
                </Link>
                {fullMenu && (
                  <button 
                    onClick={() => register()}
                    className="btn-primary btn-sm whitespace-nowrap"
                  >
                    {isEn ? 'Start free' : 'Essai gratuit'}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Mobile Menu Button - Show on mobile only, hide when nav shows */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              style={{ color: 'rgb(var(--color-text))' }}
              aria-label={isEn ? 'Toggle menu' : 'Ouvrir le menu'}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown - Smooth slide animation */}
        {isMobileMenuOpen && (
          <motion.div 
            className="md:hidden py-4 border-t"
            style={{ borderColor: 'rgb(var(--color-border))' }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <nav className="flex flex-col gap-1" aria-label={isEn ? 'Mobile navigation' : 'Navigation mobile'}>
              {fullMenu ? (
                <>
                  <a href="/#features" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium py-2.5 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {isEn ? 'Features' : 'Fonctionnalités'}
                  </a>
                  <a href="/#industries" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium py-2.5 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {isEn ? 'Industries' : 'Industries'}
                  </a>
                  <a href="/#pricing" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium py-2.5 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {isEn ? 'Pricing' : 'Tarifs'}
                  </a>
                  <a href="/#contact" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium py-2.5 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Contact
                  </a>
                  
                  {/* Mobile Auth Actions */}
                  {!authenticated && (
                    <div className="flex flex-col gap-3 pt-4 mt-2 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
                      <button 
                        onClick={() => { login(); setIsMobileMenuOpen(false); }}
                        className="text-sm font-medium py-2.5 px-2 text-left rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        style={{ color: 'rgb(var(--color-text-secondary))' }}
                      >
                        {isEn ? 'Sign in' : 'Connexion'}
                      </button>
                      <button 
                        onClick={() => { register(); setIsMobileMenuOpen(false); }}
                        className="btn-primary w-full py-2.5 text-sm"
                      >
                        {isEn ? 'Start free' : 'Essai gratuit'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <a href="/#industries" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium py-2.5 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {isEn ? 'Industries' : 'Industries'}
                  </a>
                  <a href="/#pricing" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium py-2.5 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {isEn ? 'Pricing' : 'Tarifs'}
                  </a>
                  <Link 
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-sm font-medium py-2.5 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    style={{ color: 'rgb(var(--color-text-secondary))' }}
                  >
                    {isEn ? 'Sign in' : 'Connexion'}
                  </Link>
                </>
              )}
              
              {/* Language selector */}
              <div className="flex items-center gap-3 pt-3 mt-2 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
                <LanguageToggle />
              </div>
              
              {/* Progress indicator (mobile, if provided) */}
              {showProgress && (
                <div className="flex items-center gap-3 pt-3 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
                  <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? `Step ${showProgress.currentStep} of ${showProgress.totalSteps}` : `Étape ${showProgress.currentStep} sur ${showProgress.totalSteps}`}
                  </span>
                  <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
                    <div 
                      className="h-full rounded-full transition-all duration-300"
                      style={{ 
                        width: `${showProgress.progress}%`,
                        backgroundColor: 'rgb(var(--color-primary-500))'
                      }}
                    />
                  </div>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </div>
    </header>
  );
}
