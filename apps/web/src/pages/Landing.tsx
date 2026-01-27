import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/keycloak';
import ThemeToggle from '../components/ThemeToggle';
import { LanguageToggle, useI18n } from '../lib/i18n';
import { NewsletterSignup, NewsletterPreview } from '../components/Newsletter';
import { 
  ArrowRight,
  Check,
  Shield,
  AlertTriangle,
  BarChart3,
  MessageSquare,
  Menu,
  X,
  Coffee,
  Lock,
  Zap,
  TrendingUp,
} from 'lucide-react';

// Integration logos
const integrations = ['QuickBooks', 'Xero', 'Sage', 'FreshBooks', 'Wave'];

// Theme colors
const colors = {
  light: {
    green: '#10b981',
    greenDark: '#059669',
    greenLight: '#34d399',
    gold: '#d4af37',
    goldDark: '#b8860b',
    goldText: '#8b7355',
    cardBg: 'rgba(255,255,255,0.9)',
    cardBgSolid: 'rgba(255,255,255,0.95)',
    navBg: 'rgba(254, 253, 251, 0.92)',
    sectionBg: 'linear-gradient(180deg, rgba(16, 185, 129, 0.02) 0%, rgba(212, 175, 55, 0.02) 100%)',
  },
  dark: {
    green: '#34d399',
    greenDark: '#10b981',
    greenLight: '#6ee7b7',
    gold: '#fbbf24',
    goldDark: '#f59e0b',
    goldText: '#fcd34d',
    cardBg: 'rgba(30, 41, 59, 0.9)',
    cardBgSolid: 'rgba(30, 41, 59, 0.95)',
    navBg: 'rgba(15, 23, 42, 0.92)',
    sectionBg: 'linear-gradient(180deg, rgba(52, 211, 153, 0.03) 0%, rgba(251, 191, 36, 0.03) 100%)',
  }
};

export default function Landing() {
  const { login, register, authenticated } = useAuth();
  const { language } = useI18n();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Listen for theme changes
  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDark();
    
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  const isEn = language === 'en';
  const theme = isDark ? colors.dark : colors.light;

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{ 
        background: isDark 
          ? 'linear-gradient(135deg, #0f172a 0%, #111827 25%, #0f172a 50%, #111827 75%, #0f172a 100%)'
          : 'linear-gradient(135deg, #fefdfb 0%, #faf9f6 25%, #f8faf8 50%, #fdfcfa 75%, #fefefe 100%)'
      }}
    >
      {/* Subtle decorative gradients */}
      <div 
        className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full pointer-events-none"
        style={{ 
          background: isDark 
            ? 'radial-gradient(circle, rgba(251, 191, 36, 0.05) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(212, 175, 55, 0.03) 0%, transparent 70%)',
          transform: 'translate(30%, -30%)'
        }}
      />
      <div 
        className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ 
          background: isDark
            ? 'radial-gradient(circle, rgba(52, 211, 153, 0.05) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(16, 185, 129, 0.04) 0%, transparent 70%)',
          transform: 'translate(-30%, 30%)'
        }}
      />
      {/* Navigation */}
      <nav 
        className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md"
        style={{ 
          backgroundColor: theme.navBg,
          borderColor: `${theme.green}15`
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
                style={{ 
                  background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                  boxShadow: `0 2px 6px ${theme.green}40`
                }}
              >
                <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="5" width="3" height="22" rx="1" fill="rgba(255,255,255,0.5)"/>
                  <rect x="8" y="5" width="20" height="22" rx="2" fill="white"/>
                  <line x1="11" y1="10" x2="25" y2="10" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="11" y1="15" x2="25" y2="15" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="11" y1="20" x2="20" y2="20" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M17 21 L20 24 L26 17" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="font-semibold text-lg" style={{ color: 'rgb(var(--color-text))' }}>
                PlainLedger
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              <Link to="/#features" className="text-sm font-medium hover:text-primary transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Features' : 'Fonctionnalités'}
              </Link>
              <Link to="/#pricing" className="text-sm font-medium hover:text-primary transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Pricing' : 'Tarifs'}
              </Link>
              <Link to="/#industry-kpis" className="text-sm font-medium hover:text-primary transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Industries' : 'Industries'}
              </Link>
              <Link to="/#testimonials" className="text-sm font-medium hover:text-primary transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Testimonials' : 'Témoignages'}
              </Link>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
              <ThemeToggle />
              <LanguageToggle />
              {authenticated ? (
                <Link 
                  to="/app" 
                  className="px-5 py-2.5 rounded-lg font-medium transition-all btn-primary btn-sm"
                >
                  {isEn ? 'Go to Dashboard' : 'Accéder au dashboard'}
                </Link>
              ) : (
                <>
                  <button 
                    onClick={() => login()}
                    className="text-sm font-medium"
                    style={{ color: 'rgb(var(--color-text-secondary))' }}
                  >
                    {isEn ? 'Sign in' : 'Connexion'}
                  </button>
                  <button 
                    onClick={() => login()}
                    className="btn-primary btn-sm"
                  >
                    {isEn ? 'Start free' : 'Essai gratuit'}
                  </button>
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
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {isMobileMenuOpen && (
            <div 
              className="md:hidden py-4 border-t"
              style={{ borderColor: 'rgb(var(--color-border))' }}
            >
              <nav className="flex flex-col gap-3">
                <Link to="/#features" className="text-sm font-medium py-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Features' : 'Fonctionnalités'}
                </Link>
                <Link to="/#pricing" className="text-sm font-medium py-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Pricing' : 'Tarifs'}
                </Link>
                <Link to="/#industry-kpis" className="text-sm font-medium py-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Industries' : 'Industries'}
                </Link>
                <Link to="/#testimonials" className="text-sm font-medium py-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Testimonials' : 'Témoignages'}
                </Link>
                <button 
                  onClick={() => { login(); setIsMobileMenuOpen(false); }}
                  className="text-sm font-medium py-2 text-left"
                  style={{ color: 'rgb(var(--color-text-secondary))' }}
                >
                  {isEn ? 'Sign in' : 'Connexion'}
                </button>
                <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
                  <LanguageToggle />
                </div>
              </nav>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section - Business Outcomes Focused */}
      <section className="pt-24 sm:pt-32 pb-16 sm:pb-24 px-6 relative">
        <div className="max-w-5xl mx-auto">
          {/* Trust Badge */}
          <div className="flex justify-center mb-8">
            <div 
              className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full text-sm"
              style={{ 
                background: `linear-gradient(135deg, ${theme.green}14 0%, ${theme.gold}14 100%)`,
                border: `1px solid ${theme.green}26`
              }}
            >
              <Lock className="w-4 h-4" style={{ color: theme.green }} />
              <span style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Bank-grade security' : 'Sécurité bancaire'}
              </span>
              <span style={{ color: 'rgb(var(--color-border-strong))' }}>•</span>
              <span style={{ color: theme.goldDark }} className="font-semibold">SOC 2 Type II</span>
            </div>
          </div>
          
          {/* Main Headline - Centered */}
          <div className="text-center mb-12">
            <h1 
              className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6"
              style={{ color: 'rgb(var(--color-text))' }}
            >
            {isEn ? (
              <>
                Connect. Analyze.<br />
                <span style={{ 
                  background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  Grow with confidence.
                </span>
              </>
            ) : (
              <>
                Connecter. Analyser.<br />
                <span style={{ 
                  background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  Croître en confiance.
                </span>
              </>
            )}
            </h1>

            <p 
              className="text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'Your accounting data, unified and protected. AI-powered insights that catch issues before they cost you money.'
                : 'Vos données comptables, unifiées et protégées. Analyses IA qui détectent les problèmes avant qu\'ils ne vous coûtent de l\'argent.'}
            </p>
          </div>

          {/* Integration Flow - Visual */}
          <div 
            className="relative p-8 sm:p-10 rounded-2xl mb-10"
            style={{ 
              background: isDark 
                ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(30, 41, 59, 0.95) 100%)'
                : 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(250,250,248,0.95) 100%)',
              border: `1px solid ${theme.green}1a`,
              boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.2)' : '0 4px 24px rgba(0,0,0,0.04)'
            }}
          >
            {/* Integration logos row */}
            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8 mb-6">
              {integrations.map((name) => (
                <div 
                  key={name}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                  style={{ 
                    backgroundColor: isDark ? 'rgba(51, 65, 85, 0.8)' : 'rgba(241, 245, 249, 0.8)',
                    color: 'rgb(var(--color-text-secondary))',
                    border: isDark ? '1px solid rgba(71, 85, 105, 0.5)' : '1px solid rgba(203, 213, 225, 0.5)'
                  }}
                >
                  {name}
                </div>
              ))}
            </div>
            
            {/* Arrow down */}
            <div className="flex justify-center my-4">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${theme.green}1a` }}
              >
                <ArrowRight className="w-4 h-4 rotate-90" style={{ color: theme.green }} />
              </div>
            </div>

            {/* PlainLedger Center */}
            <div className="flex justify-center mb-6">
              <div 
                className="px-6 py-3 rounded-xl flex items-center gap-3"
                style={{ 
                  background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                  boxShadow: `0 4px 16px ${theme.green}40`
                }}
              >
                <svg className="w-6 h-6" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="5" width="3" height="22" rx="1" fill="rgba(255,255,255,0.5)"/>
                  <rect x="8" y="5" width="20" height="22" rx="2" fill="white"/>
                  <path d="M17 21 L20 24 L26 17" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="font-semibold text-white">PlainLedger</span>
              </div>
            </div>

            {/* Output Benefits */}
            <div className="grid sm:grid-cols-3 gap-4 text-center">
              <div className="flex flex-col items-center">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                  style={{ backgroundColor: `${theme.green}1a` }}
                >
                  <Zap className="w-5 h-5" style={{ color: theme.green }} />
                </div>
                <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Instant sync' : 'Synchro instantanée'}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                  style={{ backgroundColor: `${theme.gold}1a` }}
                >
                  <AlertTriangle className="w-5 h-5" style={{ color: theme.goldDark }} />
                </div>
                <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'AI anomaly detection' : 'Détection IA d\'anomalies'}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                  style={{ backgroundColor: `${theme.green}1a` }}
                >
                  <TrendingUp className="w-5 h-5" style={{ color: theme.green }} />
                </div>
                <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Growth insights' : 'Insights croissance'}
                </span>
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => register()}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all hover:scale-105"
              style={{ 
                background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                color: 'white',
                boxShadow: `0 4px 16px ${theme.green}4d`
              }}
            >
              {isEn ? 'Start Free Trial' : 'Commencer l\'essai gratuit'}
              <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => window.open('https://calendly.com/plainledger/discovery', '_blank')}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all hover:scale-105"
              style={{ 
                border: `2px solid ${theme.green}`,
                color: theme.greenDark,
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255,255,255,0.8)'
              }}
            >
              {isEn ? 'Book a Demo' : 'Réserver une démo'}
            </button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center items-center gap-6 mt-8 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4" style={{ color: theme.green }} />
              {isEn ? 'No credit card required' : 'Aucune carte de crédit'}
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4" style={{ color: theme.green }} />
              {isEn ? '14-day free trial' : 'Essai gratuit 14 jours'}
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4" style={{ color: theme.green }} />
              {isEn ? 'Setup in 5 minutes' : 'Configuration en 5 min'}
            </span>
          </div>
        </div>
      </section>

      {/* Business Outcomes Section */}
      <section 
        id="features"
        className="py-20 sm:py-28 px-6 relative"
        style={{ background: theme.sectionBg }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 
              className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? 'Business outcomes, not just reports' : 'Résultats d\'affaires, pas que des rapports'}
            </h2>
            <p 
              className="text-lg max-w-2xl mx-auto"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'Every feature is designed to protect your bottom line and accelerate growth.'
                : 'Chaque fonctionnalité est conçue pour protéger vos résultats et accélérer votre croissance.'}
            </p>
          </div>

          {/* Outcome Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Card 1: Risk Prevention */}
            <div 
              className="p-8 rounded-2xl"
              style={{ 
                background: isDark 
                  ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(30, 41, 59, 0.98) 100%)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(250,250,248,0.98) 100%)',
                border: `1px solid ${theme.green}26`,
                boxShadow: isDark ? '0 2px 16px rgba(0,0,0,0.2)' : '0 2px 16px rgba(0,0,0,0.03)'
              }}
            >
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-5"
                style={{ 
                  background: `linear-gradient(135deg, ${theme.green}1a 0%, ${theme.green}0d 100%)`
                }}
              >
                <Shield className="w-7 h-7" style={{ color: theme.green }} />
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Prevent costly errors' : 'Prévenir les erreurs coûteuses'}
              </h3>
              <p className="mb-4" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn 
                  ? 'AI-powered anomaly detection catches duplicates, missing entries, and unusual patterns before they become expensive problems.'
                  : 'La détection d\'anomalies par IA repère les doublons, entrées manquantes et patterns inhabituels avant qu\'ils ne deviennent coûteux.'}
              </p>
              <div 
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                style={{ 
                  backgroundColor: `${theme.green}1a`,
                  color: theme.greenDark
                }}
              >
                <TrendingUp className="w-4 h-4" />
                {isEn ? '$847K avg. client savings' : '847K$ économies client moy.'}
              </div>
            </div>

            {/* Card 2: Enterprise Security */}
            <div 
              className="p-8 rounded-2xl"
              style={{ 
                background: isDark 
                  ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(30, 41, 59, 0.98) 100%)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(250,250,248,0.98) 100%)',
                border: `1px solid ${theme.gold}26`,
                boxShadow: isDark ? '0 2px 16px rgba(0,0,0,0.2)' : '0 2px 16px rgba(0,0,0,0.03)'
              }}
            >
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-5"
                style={{ 
                  background: `linear-gradient(135deg, ${theme.gold}1a 0%, ${theme.gold}0d 100%)`
                }}
              >
                <Lock className="w-7 h-7" style={{ color: theme.goldDark }} />
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Enterprise-grade security' : 'Sécurité de niveau entreprise'}
              </h3>
              <p className="mb-4" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn 
                  ? 'Your financial data is protected with bank-level encryption, SOC 2 Type II compliance, and Canadian data residency.'
                  : 'Vos données financières sont protégées par un chiffrement bancaire, conformité SOC 2 Type II et résidence des données au Canada.'}
              </p>
              <div className="flex flex-wrap gap-2">
                {['SOC 2', 'AES-256', 'SSO'].map((badge) => (
                  <span 
                    key={badge}
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{ 
                      backgroundColor: `${theme.gold}1a`,
                      color: theme.goldText
                    }}
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Secondary Features Row */}
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: BarChart3,
                titleEn: 'Board-ready reports',
                titleFr: 'Rapports prêts pour le CA',
                descEn: 'Professional financial statements in minutes',
                descFr: 'États financiers professionnels en minutes',
                useGreen: true
              },
              {
                icon: MessageSquare,
                titleEn: 'CPA expertise on-demand',
                titleFr: 'Expertise CPA sur demande',
                descEn: 'Real accountants to help interpret insights',
                descFr: 'Vrais comptables pour interpréter les analyses',
                useGreen: true
              },
              {
                icon: Zap,
                titleEn: 'Real-time sync',
                titleFr: 'Synchronisation temps réel',
                descEn: 'Always up-to-date financial picture',
                descFr: 'Portrait financier toujours à jour',
                useGreen: false
              },
            ].map((feature) => (
              <div 
                key={feature.titleEn}
                className="p-6 rounded-xl text-center"
                style={{ 
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255,255,255,0.7)',
                  border: isDark ? '1px solid rgba(71, 85, 105, 0.5)' : '1px solid rgba(203, 213, 225, 0.5)'
                }}
              >
                <feature.icon 
                  className="w-6 h-6 mx-auto mb-3" 
                  style={{ color: feature.useGreen ? theme.green : theme.goldDark }} 
                />
                <h3 className="font-semibold mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? feature.titleEn : feature.titleFr}
                </h3>
                <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? feature.descEn : feature.descFr}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: Pricing - Simple */}
      <section id="pricing" className="py-20 sm:py-28 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 
            className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'Plans for every stage of growth' : 'Des plans pour chaque étape de croissance'}
          </h2>
          <p 
            className="text-lg mb-12 max-w-2xl mx-auto"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            {isEn 
              ? 'Get a personalized quote based on your business needs.'
              : 'Obtenez une soumission personnalisée selon vos besoins.'}
          </p>

          {/* Pricing Cards */}
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                name: 'Essentiel',
                descEn: 'For growing businesses',
                descFr: 'Pour entreprises en croissance',
                featuresEn: ['Anomaly detection', 'Monthly reports', 'CPA email support'],
                featuresFr: ['Détection d\'anomalies', 'Rapports mensuels', 'Support CPA par courriel'],
                highlighted: false,
              },
              {
                name: 'Professionnel',
                descEn: 'For mid-market companies',
                descFr: 'Pour entreprises de taille moyenne',
                featuresEn: ['Everything in Essentiel', 'Weekly reviews', 'Priority CPA (48h)'],
                featuresFr: ['Tout de Essentiel', 'Revues hebdomadaires', 'CPA prioritaire (48h)'],
                highlighted: true,
              },
              {
                name: 'Premium',
                descEn: 'For established enterprises',
                descFr: 'Pour entreprises établies',
                featuresEn: ['Everything in Pro', 'Dedicated CPA', 'Same-day response'],
                featuresFr: ['Tout de Pro', 'CPA dédié', 'Réponse le jour même'],
                highlighted: false,
              },
            ].map((tier) => (
              <div 
                key={tier.name}
                className="p-6 rounded-2xl text-left relative overflow-hidden"
                style={{ 
                  background: tier.highlighted 
                    ? `linear-gradient(135deg, ${theme.green}0d 0%, ${theme.gold}0d 100%)`
                    : isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255,255,255,0.8)',
                  border: tier.highlighted 
                    ? `2px solid ${theme.green}`
                    : isDark ? '1px solid rgba(71, 85, 105, 0.5)' : '1px solid rgba(203, 213, 225, 0.5)',
                }}
              >
                {tier.highlighted && (
                  <div 
                    className="absolute top-0 right-0 px-3 py-1 text-xs font-semibold"
                    style={{ 
                      backgroundColor: theme.green,
                      color: 'white',
                      borderBottomLeftRadius: '8px'
                    }}
                  >
                    {isEn ? 'Popular' : 'Populaire'}
                  </div>
                )}
                <h3 className="font-semibold text-lg mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                  {tier.name}
                </h3>
                <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? tier.descEn : tier.descFr}
                </p>
                <ul className="space-y-2 mb-6">
                  {(isEn ? tier.featuresEn : tier.featuresFr).map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      <Check className="w-4 h-4" style={{ color: theme.green }} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => window.open('https://calendly.com/anthonypaquet1508/15min', '_blank')}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                  style={{ 
                    background: tier.highlighted 
                      ? `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`
                      : 'transparent',
                    color: tier.highlighted ? 'white' : theme.greenDark,
                    border: tier.highlighted ? 'none' : `2px solid ${theme.green}`,
                  }}
                >
                  {isEn ? 'Get a quote' : 'Demander une soumission'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section - Off Balance */}
      <section 
        className="py-20 sm:py-28 px-6"
        style={{ 
          background: isDark 
            ? `linear-gradient(180deg, ${theme.gold}08 0%, ${theme.green}05 100%)`
            : `linear-gradient(180deg, ${theme.gold}08 0%, ${theme.green}05 100%)`
        }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Content */}
            <div>
              <div 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
                style={{ 
                  backgroundColor: `${theme.gold}1a`,
                  color: theme.goldText
                }}
              >
                <Coffee className="w-4 h-4" />
                {isEn ? 'Free weekly newsletter' : 'Infolettre hebdomadaire gratuite'}
              </div>
              
              <h2 
                className="text-3xl sm:text-4xl font-bold mb-4"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                <span style={{ color: 'rgb(var(--color-text-muted))' }}>Off</span>Balance
              </h2>
              
              <p 
                className="text-lg mb-6"
                style={{ color: 'rgb(var(--color-text-secondary))' }}
              >
                {isEn 
                  ? "Accounting insights that won't put you to sleep. Real anomaly catches, automation tips, and honest takes on the industry."
                  : "Des insights comptables qui ne vous endormiront pas. Vraies anomalies détectées, astuces d'automatisation et opinions franches sur l'industrie."}
              </p>

              {/* What's inside */}
              <ul className="space-y-3 mb-8">
                {[
                  { en: 'Anomaly of the Week – Real catches, real lessons', fr: 'Anomalie de la semaine – Vraies erreurs, vraies leçons', icon: '🔍' },
                  { en: 'Tech tips that actually save time', fr: 'Astuces tech qui font vraiment gagner du temps', icon: '⚡' },
                  { en: 'Industry trends without the buzzwords', fr: 'Tendances de l\'industrie sans les buzzwords', icon: '📊' },
                  { en: 'CPA hot takes (we don\'t hold back)', fr: 'Opinions CPA (on ne se retient pas)', icon: '💬' },
                ].map((item, i) => (
                  <li 
                    key={i} 
                    className="text-sm flex items-center gap-2"
                    style={{ color: 'rgb(var(--color-text-secondary))' }}
                  >
                    <span>{item.icon}</span>
                    {isEn ? item.en : item.fr}
                  </li>
                ))}
              </ul>

              {/* Signup inline */}
              <NewsletterSignup variant="minimal" />
              
              <p className="text-xs mt-3" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn 
                  ? 'Every Thursday · 5-min read · Join 500+ CPAs'
                  : 'Chaque jeudi · 5 min de lecture · 500+ CPA abonnés'}
              </p>
            </div>

            {/* Right - Preview */}
            <div className="hidden lg:block">
              <NewsletterPreview />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-28 px-6">
        <div className="max-w-3xl mx-auto">
          <div 
            className="text-center p-10 sm:p-14 rounded-3xl relative overflow-hidden"
            style={{ 
              background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 50%, ${isDark ? '#047857' : '#047857'} 100%)`,
              boxShadow: `0 8px 32px ${theme.green}40`
            }}
          >
            {/* Decorative elements */}
            <div 
              className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
              style={{ 
                background: `radial-gradient(circle, ${theme.gold} 0%, transparent 70%)`,
                transform: 'translate(30%, -30%)'
              }}
            />
            <div 
              className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-10"
              style={{ 
                background: 'radial-gradient(circle, white 0%, transparent 70%)',
                transform: 'translate(-30%, 30%)'
              }}
            />
            
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white relative z-10">
              {isEn ? 'Ready to see your data clearly?' : 'Prêt à voir vos données clairement?'}
            </h2>
            <p className="text-lg mb-8 text-white/90 relative z-10">
              {isEn 
                ? 'Join finance teams who are saving hours every week.'
                : 'Rejoignez les équipes finance qui économisent des heures chaque semaine.'}
            </p>
            <button 
              onClick={() => register()}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105 relative z-10"
              style={{ 
                background: `linear-gradient(135deg, ${theme.gold} 0%, ${theme.goldDark} 100%)`,
                color: 'white',
                boxShadow: `0 4px 16px ${theme.gold}66`
              }}
            >
              {isEn ? 'Start Free Trial' : 'Commencer l\'essai gratuit'}
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-sm mt-4 text-white/80 relative z-10">
              {isEn ? '14-day free trial · No credit card required' : 'Essai gratuit 14 jours · Aucune carte de crédit requise'}
            </p>
          </div>
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer 
        className="py-8 px-6 border-t"
        style={{ borderColor: `${theme.green}1a` }}
      >
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ 
                background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`
              }}
            >
              <svg className="w-4 h-4" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="5" width="3" height="22" rx="1" fill="rgba(255,255,255,0.5)"/>
                <rect x="8" y="5" width="20" height="22" rx="2" fill="white"/>
                <path d="M17 21 L20 24 L26 17" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>PlainLedger</span>
          </div>
          <div className="flex items-center gap-6 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            <Link to="/newsletter" className="transition-colors" style={{ ['--hover-color' as string]: theme.green }}>
              <span style={{ color: 'rgb(var(--color-text-muted))' }}>Off</span>Balance
            </Link>
            <a href="/privacy" className="transition-colors hover:underline">{isEn ? 'Privacy' : 'Confidentialité'}</a>
            <a href="/terms" className="transition-colors hover:underline">{isEn ? 'Terms' : 'Conditions'}</a>
            <a href="mailto:info@plainledger.ca" className="transition-colors hover:underline">Contact</a>
          </div>
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            © 2026 PlainLedger
          </p>
        </div>
      </footer>
    </div>
  );
}
