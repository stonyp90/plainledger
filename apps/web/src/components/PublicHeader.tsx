/**
 * PublicHeader Component
 * 
 * Reusable header for public pages (Landing, Signup, Login, etc.)
 * Provides consistent navigation menu across the website
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../lib/keycloak';
import ThemeToggle from './ThemeToggle';
import { LanguageToggle, useI18n } from '../lib/i18n';
import { useTheme } from '../contexts/ThemeContext';

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
  const { resolvedTheme } = useTheme();
  const { authenticated, login, register } = useAuth();
  const isEn = language === 'en';
  const isDark = resolvedTheme === 'dark';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Theme colors for logo
  const theme = {
    green: isDark ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-primary-600))',
  };

  return (
    <header 
      className={`sticky top-0 z-50 border-b backdrop-blur-md ${className}`}
      style={{ 
        backgroundColor: 'rgb(var(--color-bg) / 0.95)',
        borderColor: 'rgb(var(--color-border))'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
              style={{ 
                background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-700)) 100%)',
                boxShadow: '0 2px 6px rgb(var(--color-primary-500) / 0.25)'
              }}
            >
              <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="5" y="5" width="6" height="6" rx="1.3" fill="white"/>
                <rect x="13" y="5" width="6" height="6" rx="1.3" fill="white"/>
                <rect x="21" y="5" width="6" height="6" rx="1.3" fill="white"/>
                <rect x="5" y="13" width="6" height="6" rx="1.3" fill="white"/>
                <rect x="13" y="13" width="6" height="6" rx="1.3" fill="white"/>
                <rect x="21" y="13" width="6" height="6" rx="1.3" fill="white"/>
                <rect x="5" y="21" width="6" height="6" rx="1.3" fill="white"/>
                <rect x="13" y="21" width="6" height="6" rx="1.3" fill="white"/>
                <rect x="21" y="21" width="6" height="6" rx="1.3" fill="white"/>
              </svg>
            </div>
            <span className="font-semibold text-lg" style={{ color: 'rgb(var(--color-text))' }}>
              PlainLedger
            </span>
          </Link>

          {/* Desktop Nav */}
          {fullMenu ? (
            <nav className="hidden lg:flex items-center gap-4 xl:gap-5" aria-label={isEn ? 'Main navigation' : 'Navigation principale'}>
              <a href="/#features" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Features' : 'Fonctionnalités'}
              </a>
              <a href="/#industries" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Industries' : 'Industries'}
              </a>
              <a href="/#ecosystem" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Intelligence' : 'Intelligence'}
              </a>
              <a href="/#pipeline" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'How it Works' : 'Comment ça marche'}
              </a>
              <a href="/#pricing" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Pricing' : 'Tarifs'}
              </a>
              <a href="/#contact" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                Contact
              </a>
            </nav>
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

          {/* Desktop Actions */}
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

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2"
              style={{ color: 'rgb(var(--color-text))' }}
              aria-label={isEn ? 'Toggle menu' : 'Ouvrir le menu'}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div 
            className="md:hidden py-4 border-t"
            style={{ borderColor: 'rgb(var(--color-border))' }}
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
                  <a href="/#ecosystem" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium py-2.5 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {isEn ? 'Intelligence' : 'Intelligence'}
                  </a>
                  <a href="/#pipeline" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium py-2.5 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {isEn ? 'How it Works' : 'Comment ça marche'}
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
          </div>
        )}
      </div>
    </header>
  );
}
