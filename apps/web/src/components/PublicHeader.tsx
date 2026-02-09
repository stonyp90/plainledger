/**
 * PublicHeader Component
 * 
 * Reusable header for public pages (Landing, Signup, Login, etc.)
 * Provides consistent navigation menu across the website
 * 
 * Modes:
 * - fullMenu: Shows all navigation items (Features, Industries, Pricing, Contact)
 * - default: Shows reduced menu (Industries, Pricing) 
 * - minimal: Just logo and toggles (for legal pages)
 * - custom: Provide your own menu items via customMenuItems prop
 */

import { useState, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, X, ArrowRight } from 'lucide-react';
import { useAuth } from '../lib/keycloak';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from './ThemeToggle';
import { LanguageToggle, useI18n } from '../lib/i18n';

export interface MenuItem {
  /** Label in English */
  labelEn: string;
  /** Label in French */
  labelFr: string;
  /** Either a URL path or a scroll handler */
  href?: string;
  /** Scroll to section ID (if provided, uses button with onClick) */
  scrollTo?: string;
}

interface PublicHeaderProps {
  /** Show full navigation menu (for landing page) */
  fullMenu?: boolean;
  /** Minimal mode - just logo and toggles, no menu (for legal pages) */
  minimal?: boolean;
  /** Custom menu items (overrides fullMenu) */
  customMenuItems?: MenuItem[];
  /** Scroll handler for custom menu items with scrollTo */
  onScrollToSection?: (sectionId: string) => void;
  /** Badge text under logo (e.g., "Québec", "Canada 🇨🇦") */
  badge?: string;
  /** Badge color (CSS color value) */
  badgeColor?: string;
  /** Custom accent color for borders (CSS color value) */
  accentColor?: string;
  /** Show progress indicator (for signup flow) */
  showProgress?: {
    currentStep: number;
    totalSteps: number;
    progress: number;
  };
  /** Custom action button (replaces default "Start free" button) */
  customAction?: {
    labelEn: string;
    labelFr: string;
    onClick: () => void;
    color?: string;
  };
  /** Custom className for header */
  className?: string;
}

export default function PublicHeader({ 
  fullMenu = false, 
  minimal = false,
  customMenuItems,
  onScrollToSection,
  badge,
  badgeColor,
  accentColor,
  showProgress,
  customAction,
  className = ''
}: PublicHeaderProps) {
  const { language } = useI18n();
  const { authenticated, login, register } = useAuth();
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const isEn = language === 'en';
  const isDark = resolvedTheme === 'dark';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Determine border color
  const borderColor = accentColor 
    ? `${accentColor}20` 
    : 'rgb(var(--color-border) / 0.5)';

  // Handle menu item click
  const handleMenuItemClick = (item: MenuItem) => {
    if (item.scrollTo && onScrollToSection) {
      onScrollToSection(item.scrollTo);
      setIsMobileMenuOpen(false);
    } else if (item.href) {
      setIsMobileMenuOpen(false);
    }
  };

  // Default action handler
  const handleDefaultAction = () => {
    if (authenticated) {
      navigate('/app');
    } else {
      register();
    }
  };

  return (
    <header 
      className={`sticky top-0 z-50 border-b backdrop-blur-md ${className}`}
      style={{ 
        backgroundColor: 'rgba(var(--color-bg), 0.9)',
        borderColor: borderColor
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - with optional badge */}
          <Link to="/" className="flex items-center gap-2 group transition-transform group-hover:scale-[1.02]">
            {badge ? (
              <>
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ 
                    background: `linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-700)) 100%)`
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
                <div className="flex flex-col">
                  <span className="font-bold text-lg" style={{ color: 'rgb(var(--color-text))' }}>PlainLedger</span>
                  <span className="text-xs font-medium" style={{ color: badgeColor || 'rgb(var(--color-primary-500))' }}>{badge}</span>
                </div>
              </>
            ) : (
              <img 
                src={isDark ? "/logo-full-dark.png" : "/logo-full.png"} 
                alt="PlainLedger" 
                className="h-9 sm:h-10 lg:h-11"
              />
            )}
          </Link>

          {/* Desktop Nav - Aligned breakpoints */}
          {!minimal && (
            customMenuItems ? (
              /* Custom menu items mode */
              <nav className="hidden md:flex items-center gap-4 lg:gap-6" aria-label={isEn ? 'Main navigation' : 'Navigation principale'}>
                {customMenuItems.map((item, index) => (
                  item.scrollTo ? (
                    <button
                      key={index}
                      onClick={() => handleMenuItemClick(item)}
                      className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap"
                      style={{ color: 'rgb(var(--color-text-secondary))' }}
                    >
                      {isEn ? item.labelEn : item.labelFr}
                    </button>
                  ) : (
                    <a 
                      key={index}
                      href={item.href} 
                      className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" 
                      style={{ color: 'rgb(var(--color-text-secondary))' }}
                    >
                      {isEn ? item.labelEn : item.labelFr}
                    </a>
                  )
                ))}
              </nav>
            ) : fullMenu ? (
              /* Full menu mode - 3 main sections */
              <nav className="hidden md:flex items-center gap-4 lg:gap-6" aria-label={isEn ? 'Main navigation' : 'Navigation principale'}>
                <a href="/#pipeline" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'How it works' : 'Comment ça marche'}
                </a>
                <a href="/#industries" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Industries' : 'Industries'}
                </a>
                <a href="/#contact" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  Contact
                </a>
              </nav>
            ) : (
              /* Reduced menu mode */
              <nav className="hidden md:flex items-center gap-6" aria-label={isEn ? 'Main navigation' : 'Navigation principale'}>
                <a href="/#industries" className="text-sm font-medium hover:text-primary transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Industries' : 'Industries'}
                </a>
                <a href="/#pricing" className="text-sm font-medium hover:text-primary transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Pricing' : 'Tarifs'}
                </a>
              </nav>
            )
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
            
            {/* Custom action or default auth buttons */}
            {customAction ? (
              <button
                onClick={customAction.onClick}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap"
                style={{ 
                  backgroundColor: customAction.color || 'rgb(var(--color-primary-500))',
                  color: 'white',
                }}
              >
                {isEn ? customAction.labelEn : customAction.labelFr}
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : !minimal && (
              authenticated ? (
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
              )
            )}
          </div>

          {/* Mobile Menu Button - Show on mobile only, hide when nav shows */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            {minimal ? (
              <LanguageToggle />
            ) : (
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                style={{ color: 'rgb(var(--color-text))' }}
                aria-label={isEn ? 'Toggle menu' : 'Ouvrir le menu'}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu Dropdown - Smooth slide animation */}
        {isMobileMenuOpen && !minimal && (
          <motion.div 
            className="md:hidden py-4 border-t"
            style={{ borderColor: accentColor ? `${accentColor}20` : 'rgb(var(--color-border))' }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <nav className="flex flex-col gap-1" aria-label={isEn ? 'Mobile navigation' : 'Navigation mobile'}>
              {customMenuItems ? (
                /* Custom menu items mode */
                <>
                  {customMenuItems.map((item, index) => (
                    item.scrollTo ? (
                      <button
                        key={index}
                        onClick={() => handleMenuItemClick(item)}
                        className="text-sm font-medium py-2.5 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                        style={{ color: 'rgb(var(--color-text-secondary))' }}
                      >
                        {isEn ? item.labelEn : item.labelFr}
                      </button>
                    ) : (
                      <a
                        key={index}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="text-sm font-medium py-2.5 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        style={{ color: 'rgb(var(--color-text-secondary))' }}
                      >
                        {isEn ? item.labelEn : item.labelFr}
                      </a>
                    )
                  ))}
                  
                  {/* Custom action button for mobile */}
                  {customAction && (
                    <div className="pt-3 mt-2 border-t" style={{ borderColor: accentColor ? `${accentColor}20` : 'rgb(var(--color-border))' }}>
                      <button
                        onClick={() => { customAction.onClick(); setIsMobileMenuOpen(false); }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm"
                        style={{ 
                          backgroundColor: customAction.color || 'rgb(var(--color-primary-500))',
                          color: 'white',
                        }}
                      >
                        {isEn ? customAction.labelEn : customAction.labelFr}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              ) : fullMenu ? (
                <>
                  <a href="/#pipeline" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium py-2.5 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {isEn ? 'How it works' : 'Comment ça marche'}
                  </a>
                  <a href="/#industries" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium py-2.5 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {isEn ? 'Industries' : 'Industries'}
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
              <div className="flex items-center gap-3 pt-3 mt-2 border-t" style={{ borderColor: accentColor ? `${accentColor}20` : 'rgb(var(--color-border))' }}>
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
