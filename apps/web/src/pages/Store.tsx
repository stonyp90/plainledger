/**
 * Store Landing Page
 * store.plainledger.ca
 * 
 * Canadian Market-Focused Landing Page with Usage-Based Pricing
 */

import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useKeycloak } from '../lib/keycloak';
import {
  Check,
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
  AlertTriangle,
  Users,
  Database,
  FileText,
  Star,
  Play,
  Menu,
  X,
  MapPin,
  Calculator,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  Info,
  Sparkles,
  Clock,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import ThemeToggle from '../components/ThemeToggle';
import { analytics } from '../lib/analytics';
import DemoModal from '../components/DemoModal';
import { 
  PRICING_TIERS, 
  PricingCalculator, 
  CANADA_MARKET_MESSAGING,
  type PricingTierConfig,
  type BillingInterval,
} from '../lib/pricing';
import IntegrationLogos from '../components/IntegrationLogos';
import { Tooltip } from '../components/Tooltip';

// =====================================================
// FEATURES DATA
// =====================================================

const FEATURES = [
  {
    icon: BarChart3,
    title: { en: 'Smart Dashboard', fr: 'Tableau de bord intelligent' },
    description: { 
      en: 'Real-time financial health score with intelligent insights, powered by our AI. See cash flow, ratios, and trends at a glance.',
      fr: 'Score de santé financière en temps réel avec insights IA. Visualisez trésorerie, ratios et tendances.'
    },
    stat: { value: '87', label: { en: 'Health Score', fr: 'Score santé' } },
    highlights: [
      { en: 'Live KPIs', fr: 'KPIs en direct' },
      { en: 'Trend analysis', fr: 'Analyse tendances' },
      { en: 'Custom views', fr: 'Vues personnalisées' },
    ],
    color: 'primary',
  },
  {
    icon: AlertTriangle,
    title: { en: 'Intelligent Anomaly Detection', fr: 'Détection intelligente d\'anomalies' },
    description: { 
      en: 'Our AI automatically flags duplicate payments, fraud patterns, and unusual expenses before they become problems.',
      fr: 'L\'IA signale paiements en double, fraudes et dépenses inhabituelles avant qu\'ils ne deviennent problèmes.'
    },
    stat: { value: '$847K', label: { en: 'Saved avg.', fr: 'Économisé moy.' } },
    highlights: [
      { en: '97% accuracy', fr: '97% précision' },
      { en: 'Real-time alerts', fr: 'Alertes temps réel' },
      { en: 'Auto-categorize', fr: 'Auto-catégoriser' },
    ],
    color: 'error',
    badge: { en: 'Most Popular', fr: 'Plus populaire' },
  },
  {
    icon: FileText,
    title: { en: 'Instant Reports', fr: 'Rapports instantanés' },
    description: { 
      en: 'Generate professional balance sheets, income statements, and cash flow reports. Export to PDF, Excel, or share directly.',
      fr: 'Générez bilans, comptes de résultat et flux de trésorerie professionnels. Export PDF, Excel ou partage direct.'
    },
    stat: { value: '2.3s', label: { en: 'Generation time', fr: 'Temps génération' } },
    highlights: [
      { en: 'GAAP/IFRS ready', fr: 'GAAP/IFRS prêt' },
      { en: 'Multi-format export', fr: 'Export multi-format' },
      { en: 'Board-ready', fr: 'Prêt pour CA' },
    ],
    color: 'info',
  },
  {
    icon: Database,
    title: { en: 'Universal Integrations', fr: 'Intégrations universelles' },
    description: { 
      en: 'Connect QuickBooks, Xero, Sage, FreshBooks, Wave in minutes. Import CSV/Excel for any system. Read-only for security.',
      fr: 'Connectez QuickBooks, Xero, Sage, FreshBooks, Wave en minutes. Import CSV/Excel. Lecture seule pour la sécurité.'
    },
    stat: { value: '6+', label: { en: 'Integrations', fr: 'Intégrations' } },
    highlights: [
      { en: 'One-click connect', fr: 'Connexion 1-clic' },
      { en: 'Auto-sync', fr: 'Synchro auto' },
      { en: 'Read-only secure', fr: 'Lecture seule' },
    ],
    color: 'success',
  },
  {
    icon: Shield,
    title: { en: 'Canadian Data Security', fr: 'Sécurité canadienne' },
    description: { 
      en: 'Bank-level AES-256 encryption. Data stored exclusively in Canada. Built by CPAs, for CPAs.',
      fr: 'Chiffrement bancaire AES-256. Données exclusivement au Canada. Conçu par des CPA, pour des CPA.'
    },
    stat: { value: '100%', label: { en: 'Canadian hosted', fr: 'Hébergé au Canada' } },
    highlights: [
      { en: 'AES-256 encrypted', fr: 'Chiffré AES-256' },
      { en: 'Read-only access', fr: 'Accès lecture seule' },
      { en: 'No write access', fr: 'Aucun accès écriture' },
    ],
    color: 'warning',
  },
  {
    icon: Users,
    title: { en: 'Team Collaboration', fr: 'Collaboration d\'équipe' },
    description: { 
      en: 'Invite accountants, CFOs, and team members with granular role-based permissions. Comment, share, and collaborate in real-time.',
      fr: 'Invitez comptables, CFO et équipe avec permissions granulaires par rôle. Commentez, partagez et collaborez en temps réel.'
    },
    stat: { value: '∞', label: { en: 'Team members', fr: 'Membres équipe' } },
    highlights: [
      { en: 'Role-based access', fr: 'Accès par rôle' },
      { en: 'Real-time collab', fr: 'Collab. temps réel' },
      { en: 'Audit trail', fr: 'Piste d\'audit' },
    ],
    color: 'primary',
  },
];

const TESTIMONIALS = [
  {
    quote: { 
      en: "PlainLedger cut our month-end close time by 60%. The anomaly detection caught a $50K error we would have missed.",
      fr: "PlainLedger a réduit notre clôture mensuelle de 60%. La détection d'anomalies a repéré une erreur de 50 000$ que nous aurions manquée."
    },
    author: 'Sarah Tremblay',
    role: { en: 'CFO, TechStartup Montreal', fr: 'CFO, TechStartup Montréal' },
    avatar: 'ST',
    location: 'Montréal',
    rating: 5,
    verified: true,
    metrics: { en: '60% time saved', fr: '60% de temps économisé' },
  },
  {
    quote: { 
      en: "I manage 35 clients with PlainLedger. Anomaly detection prevented 3 major errors this quarter. Immediate ROI.",
      fr: "Je gère 35 clients avec PlainLedger. La détection d'anomalies m'a évité 3 erreurs majeures ce trimestre. ROI immédiat."
    },
    author: 'Jean-François Lavoie, CPA',
    role: { en: 'Partner, Lavoie & Associates', fr: 'Associé, Cabinet Lavoie' },
    avatar: 'JL',
    location: 'Trois-Rivières',
    rating: 5,
    verified: true,
    metrics: { en: '3 errors prevented', fr: '3 erreurs évitées' },
  },
  {
    quote: { 
      en: "Finally, a tool that speaks accountant. Clean reports, clear insights, bilingual interface - perfect for our Canadian clients.",
      fr: "Enfin, un outil qui parle comptable. Rapports clairs, insights précis, interface bilingue - parfait pour nos clients canadiens."
    },
    author: 'Marc Dubois, CPA',
    role: { en: 'Partner at Dubois & Associés', fr: 'Associé chez Dubois & Associés' },
    avatar: 'MD',
    location: 'Ottawa',
    rating: 4.5,
    verified: true,
    metrics: { en: '50+ clients managed', fr: '50+ clients gérés' },
  },
  {
    quote: { 
      en: "The dashboard gives me everything I need to know about our financial health in 30 seconds. Love the GST/QST reports!",
      fr: "Le tableau de bord me donne tout ce que je dois savoir sur notre santé financière en 30 secondes. J'adore les rapports TPS/TVQ!"
    },
    author: 'Lisa Gagnon',
    role: { en: 'Owner, Gagnon Retail Group', fr: 'Propriétaire, Groupe Détail Gagnon' },
    avatar: 'LG',
    location: 'Laval',
    rating: 5,
    verified: false,
    metrics: { en: '30-second insights', fr: 'Insights en 30 secondes' },
  },
  {
    quote: { 
      en: "Saves me 5+ hours per client per month on reporting. The bulk reporting feature is a game-changer for our firm.",
      fr: "M'économise 5+ heures par client par mois sur les rapports. La fonction de rapports en lot change la donne pour notre cabinet."
    },
    author: 'Marie-Claire Bouchard, CPA',
    role: { en: 'Managing Partner, Bouchard & Partners', fr: 'Associée principale, Bouchard & Associés' },
    avatar: 'MB',
    location: 'Sherbrooke',
    rating: 5,
    verified: true,
    metrics: { en: '5+ hours saved/client', fr: '5+ heures économisées/client' },
  },
  {
    quote: { 
      en: "Caught $125K in duplicate transactions across 20 clients last month. This tool pays for itself.",
      fr: "A détecté 125 000$ en transactions dupliquées sur 20 clients le mois dernier. Cet outil se paie de lui-même."
    },
    author: 'Pierre Fortin, CPA',
    role: { en: 'Senior Partner, Fortin Accounting Group', fr: 'Associé principal, Groupe Comptable Fortin' },
    avatar: 'PF',
    location: 'Gatineau',
    rating: 5,
    verified: true,
    metrics: { en: '$125K caught', fr: '125 000$ détectés' },
  },
];

// =====================================================
// COMPONENTS
// =====================================================

function Header({ isEn, onLanguageToggle }: { isEn: boolean; onLanguageToggle: () => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header 
      className="sticky top-0 z-50 border-b backdrop-blur-md"
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
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium hover:text-primary transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn ? 'Features' : 'Fonctionnalités'}
            </a>
            <a href="#pricing" className="text-sm font-medium hover:text-primary transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn ? 'Pricing' : 'Tarifs'}
            </a>
            <a href="#cpa" className="text-sm font-medium hover:text-primary transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn ? 'For CPAs' : 'Pour CPA'}
            </a>
            <a href="#testimonials" className="text-sm font-medium hover:text-primary transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn ? 'Testimonials' : 'Témoignages'}
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={onLanguageToggle}
              className="px-2 py-1 text-sm font-medium rounded hover:bg-muted transition-colors"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn ? 'FR' : 'EN'}
            </button>
            <Link to="/login" className="hidden sm:block text-sm font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn ? 'Sign in' : 'Connexion'}
            </Link>
            <Link to="/signup" className="btn-primary btn-sm">
              {isEn ? 'Start free' : 'Essai gratuit'}
            </Link>
            
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <nav className="flex flex-col gap-3">
              <a href="#features" className="text-sm font-medium py-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Features' : 'Fonctionnalités'}
              </a>
              <a href="#pricing" className="text-sm font-medium py-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Pricing' : 'Tarifs'}
              </a>
              <a href="#cpa" className="text-sm font-medium py-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'For CPAs' : 'Pour CPA'}
              </a>
              <Link to="/login" className="text-sm font-medium py-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Sign in' : 'Connexion'}
              </Link>
              <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
                <ThemeToggle />
                <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Theme' : 'Thème'}
                </span>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

function HeroSection({ isEn, onWatchDemo }: { isEn: boolean; onWatchDemo: () => void }) {
  const { register } = useKeycloak();
  const messaging = CANADA_MARKET_MESSAGING;

  const handleCTA = () => {
    analytics.track('landing_page_cta_clicked', { location: 'hero' });
    register();
  };

  const handleWatchDemo = () => {
    analytics.track('demo_modal_opened', { location: 'hero' });
    onWatchDemo();
  };

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-1/2 -right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
        />
        <div 
          className="absolute -bottom-1/2 -left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10"
          style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
        />
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        {/* Canada badge */}
        <div 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm mb-6 border"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            borderColor: 'rgb(var(--color-border))',
            color: 'rgb(var(--color-primary-600))'
          }}
        >
          <MapPin className="w-4 h-4" />
          <span className="font-medium">
            {isEn ? 'Made in Canada 🇨🇦' : 'Fait au Canada 🇨🇦'}
          </span>
          <span style={{ color: 'rgb(var(--color-text-muted))' }}>•</span>
          <span style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Data stored in Canada' : 'Données au Canada'}
          </span>
        </div>

        {/* Headline */}
        <h1 
          className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          {isEn ? messaging.taglines.main.en : messaging.taglines.main.fr}
        </h1>

        {/* Subheadline */}
        <p 
          className="text-lg sm:text-xl mb-8 max-w-2xl mx-auto"
          style={{ color: 'rgb(var(--color-text-secondary))' }}
        >
          {isEn ? messaging.taglines.sub.en : messaging.taglines.sub.fr}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <button onClick={handleCTA} className="btn-primary btn-lg group">
            {isEn ? 'Start free 21-day trial' : 'Essai gratuit de 21 jours'}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button onClick={handleWatchDemo} className="btn-secondary btn-lg flex items-center gap-2">
            <Play className="w-4 h-4" />
            {isEn ? 'Watch demo' : 'Voir la démo'}
          </button>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
            {isEn ? 'No credit card required' : 'Aucune carte de crédit requise'}
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
            {isEn ? 'Setup in 5 minutes' : 'Configuration en 5 minutes'}
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
            {isEn ? 'GST/HST/PST compliant' : 'Conforme TPS/TVH/TVP'}
          </span>
        </div>

        {/* Stats */}
        <div className="mt-12 grid grid-cols-3 gap-8 max-w-lg mx-auto">
          {Object.entries(messaging.socialProof.stats).map(([key, stat]) => (
            <div key={key} className="text-center">
              <div 
                className="text-2xl sm:text-3xl font-bold"
                style={{ color: 'rgb(var(--color-primary-600))' }}
              >
                {stat.value}
              </div>
              <div className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? stat.label.en : stat.label.fr}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection({ isEn }: { isEn: boolean }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'primary': return { bg: 'rgb(var(--color-primary-500) / 0.1)', text: 'rgb(var(--color-primary-500))', border: 'rgb(var(--color-primary-500) / 0.2)' };
      case 'error': return { bg: 'rgb(var(--color-error) / 0.1)', text: 'rgb(var(--color-error))', border: 'rgb(var(--color-error) / 0.2)' };
      case 'success': return { bg: 'rgb(var(--color-success) / 0.1)', text: 'rgb(var(--color-success))', border: 'rgb(var(--color-success) / 0.2)' };
      case 'warning': return { bg: 'rgb(var(--color-warning) / 0.1)', text: 'rgb(var(--color-warning))', border: 'rgb(var(--color-warning) / 0.2)' };
      case 'info': return { bg: 'rgb(var(--color-info) / 0.1)', text: 'rgb(var(--color-info))', border: 'rgb(var(--color-info) / 0.2)' };
      default: return { bg: 'rgb(var(--color-primary-500) / 0.1)', text: 'rgb(var(--color-primary-500))', border: 'rgb(var(--color-primary-500) / 0.2)' };
    }
  };
  
  return (
    <section id="features" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4" 
            style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}>
            <Sparkles className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
            <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-primary-600))' }}>
              {isEn ? 'Purpose-built for finance teams' : 'Conçu pour les équipes finance'}
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Everything you need, nothing you don\'t' : 'Tout ce dont vous avez besoin, rien de plus'}
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn 
              ? 'Built for accountants and CFOs who want clarity, not complexity. Get started in minutes.'
              : 'Conçu pour les comptables et CFO qui veulent de la clarté, pas de la complexité. Commencez en minutes.'}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, idx) => {
            const colors = getColorClasses(feature.color);
            const isHovered = hoveredIdx === idx;
            
            return (
              <div 
                key={idx}
                className={`
                  relative p-6 rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden
                  ${isHovered ? 'shadow-xl scale-[1.02]' : 'shadow-sm hover:shadow-lg'}
                `}
                style={{ 
                  backgroundColor: 'rgb(var(--color-surface))',
                  border: `1px solid ${isHovered ? colors.border : 'rgb(var(--color-border))'}`,
                }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Badge */}
                {feature.badge && (
                  <div 
                    className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: colors.bg, color: colors.text }}
                  >
                    {isEn ? feature.badge.en : feature.badge.fr}
                  </div>
                )}
                
                {/* Header with icon and stat */}
                <div className="flex items-start justify-between mb-4">
                  <div 
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`}
                    style={{ backgroundColor: colors.bg }}
                  >
                    <feature.icon className="w-6 h-6" style={{ color: colors.text }} />
                  </div>
                  
                  {/* Stat */}
                  <div className="text-right">
                    <div className="text-2xl font-bold" style={{ color: colors.text }}>
                      {feature.stat.value}
                    </div>
                    <div className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? feature.stat.label.en : feature.stat.label.fr}
                    </div>
                  </div>
                </div>
                
                {/* Title & Description */}
                <h3 className="font-semibold text-lg mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? feature.title.en : feature.title.fr}
                </h3>
                <p className="text-sm mb-4 leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? feature.description.en : feature.description.fr}
                </p>
                
                {/* Highlights */}
                <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
                  {feature.highlights.map((highlight, hIdx) => (
                    <span 
                      key={hIdx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: 'rgb(var(--color-bg-muted))', color: 'rgb(var(--color-text-secondary))' }}
                    >
                      <Check className="w-3 h-3" style={{ color: 'rgb(var(--color-success))' }} />
                      {isEn ? highlight.en : highlight.fr}
                    </span>
                  ))}
                </div>
                
                {/* Hover gradient overlay */}
                <div 
                  className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                  style={{ 
                    background: `linear-gradient(135deg, ${colors.bg} 0%, transparent 50%)`,
                  }}
                />
              </div>
            );
          })}
        </div>
        
        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn 
              ? 'Join 1,000+ Canadian businesses already using PlainLedger'
              : 'Rejoignez 1 000+ entreprises canadiennes utilisant déjà PlainLedger'}
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            {[
              { icon: Clock, text: { en: 'Setup in 5 min', fr: 'Config. en 5 min' } },
              { icon: Shield, text: { en: 'No credit card required', fr: 'Sans carte de crédit' } },
              { icon: Zap, text: { en: '21-day free trial', fr: 'Essai gratuit 21 jours' } },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <item.icon className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
                <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? item.text.en : item.text.fr}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Pricing Card Component
function PricingCard({ 
  plan, 
  isEn, 
  onSelect 
}: { 
  plan: PricingTierConfig;
  isEn: boolean;
  onSelect: (planId: string) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div 
      className={`
        p-5 rounded-2xl relative transition-all duration-300 flex flex-col
        ${plan.popular ? 'ring-2' : 'hover:ring-1'}
      `}
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        border: '1px solid rgb(var(--color-border))',
        ...(plan.popular && { 
          '--tw-ring-color': 'rgb(var(--color-primary-500))',
          boxShadow: '0 8px 30px rgb(var(--color-primary-500) / 0.15)'
        }),
      }}
    >
      {/* Badge */}
      {(plan.badge || plan.badgeFr) && (
        <div 
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap"
          style={{ backgroundColor: plan.popular ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-secondary))' }}
        >
          {isEn ? plan.badge : plan.badgeFr}
        </div>
      )}

      {/* Header */}
      <div className="mb-4">
        <h3 className="font-bold text-lg mb-0.5" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? plan.name : plan.nameFr}
        </h3>
        <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn ? plan.tagline : plan.taglineFr}
        </p>
      </div>

      {/* Description */}
      <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-text-secondary))' }}>
        {isEn ? plan.description : plan.descriptionFr}
      </p>

      {/* Features */}
      <ul className="space-y-2 mb-4 flex-1">
        {plan.features.slice(0, showDetails ? undefined : 5).map((feature, idx) => (
          <li 
            key={idx} 
            className={`flex items-start gap-1.5 text-xs ${!feature.included ? 'opacity-50' : ''}`}
          >
            {feature.included ? (
              <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'rgb(var(--color-success))' }} />
            ) : (
              <X className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
            )}
            <span style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn ? feature.name : feature.nameFr}
            </span>
          </li>
        ))}
      </ul>

      {/* Show more */}
      {plan.features.length > 5 && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1 text-xs mb-4 hover:underline"
          style={{ color: 'rgb(var(--color-primary-500))' }}
        >
          {showDetails ? (
            <>
              {isEn ? 'Show less' : 'Voir moins'}
              <ChevronUp className="w-3 h-3" />
            </>
          ) : (
            <>
              {isEn ? `Show all ${plan.features.length} features` : `Voir les ${plan.features.length} fonctionnalités`}
              <ChevronDown className="w-3 h-3" />
            </>
          )}
        </button>
      )}

      {/* CTA */}
      <button
        onClick={() => onSelect(plan.id)}
        className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}
      >
        {isEn ? plan.ctaText : plan.ctaTextFr}
      </button>
    </div>
  );
}

function PricingSection({ isEn }: { isEn: boolean }) {
  const handlePlanSelect = (planId: string) => {
    analytics.track('pricing_plan_selected', { plan: planId });
    // All plans direct to Calendly for quote
    window.open('https://calendly.com/anthonypaquet1508/15min', '_blank');
  };

  return (
    <section id="pricing" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Plans tailored to your business' : 'Plans adaptés à votre entreprise'}
          </h2>
          <p className="text-base mb-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn 
              ? 'Schedule a call to discuss your needs and get a personalized quote.' 
              : 'Planifiez un appel pour discuter de vos besoins et obtenir une soumission personnalisée.'}
          </p>
        </div>

        {/* Pricing cards - All plans */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-7xl mx-auto">
          {PRICING_TIERS.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isEn={isEn}
              onSelect={handlePlanSelect}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn 
              ? 'Not sure which plan is right for you?' 
              : 'Vous ne savez pas quel plan vous convient?'}
          </p>
          <button
            onClick={() => window.open('https://calendly.com/anthonypaquet1508/15min', '_blank')}
            className="btn-primary btn-lg"
          >
            {isEn ? 'Schedule a free consultation' : 'Planifier une consultation gratuite'}
          </button>
        </div>
      </div>
    </section>
  );
}

function IntegrationsSection() {
  return <IntegrationLogos />;
}

function TestimonialsSection({ isEn }: { isEn: boolean }) {
  // Show first 3 testimonials, with CPA-focused ones prioritized
  const displayedTestimonials = TESTIMONIALS.slice(0, 3);

  return (
    <section id="testimonials" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Trusted by Canadian finance teams' : 'Approuvé par les équipes financières canadiennes'}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {displayedTestimonials.map((testimonial, idx) => {
            const rating = testimonial.rating || 5;
            const fullStars = Math.floor(rating);
            const hasHalfStar = rating % 1 !== 0;
            
            return (
              <div 
                key={idx}
                className="p-6 rounded-xl transition-all duration-300 hover:shadow-lg"
                style={{ 
                  backgroundColor: 'rgb(var(--color-surface))',
                  border: '1px solid rgb(var(--color-border))'
                }}
              >
                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex gap-0.5">
                    {[...Array(fullStars)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" style={{ color: 'rgb(var(--color-warning))' }} />
                    ))}
                    {hasHalfStar && (
                      <div className="relative w-4 h-4">
                        <Star className="w-4 h-4 absolute fill-current" style={{ color: 'rgb(var(--color-border))' }} />
                        <div className="absolute overflow-hidden w-2 h-4">
                          <Star className="w-4 h-4 fill-current" style={{ color: 'rgb(var(--color-warning))' }} />
                        </div>
                      </div>
                    )}
                    {[...Array(5 - Math.ceil(rating))].map((_, i) => (
                      <Star key={`empty-${i}`} className="w-4 h-4" style={{ color: 'rgb(var(--color-border))' }} />
                    ))}
                  </div>
                  {testimonial.verified && (
                    <span 
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ 
                        backgroundColor: 'rgb(var(--color-success) / 0.1)',
                        color: 'rgb(var(--color-success))'
                      }}
                    >
                      {isEn ? 'Verified' : 'Vérifié'}
                    </span>
                  )}
                </div>

                {/* Quote */}
                <p className="mb-4 text-sm leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  "{isEn ? testimonial.quote.en : testimonial.quote.fr}"
                </p>

                {/* Metrics */}
                {testimonial.metrics && (
                  <div className="mb-4 p-2 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
                    <p className="text-xs font-semibold" style={{ color: 'rgb(var(--color-primary-600))' }}>
                      {isEn ? testimonial.metrics.en : testimonial.metrics.fr}
                    </p>
                  </div>
                )}

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0"
                    style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
                  >
                    {testimonial.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                      {testimonial.author}
                    </p>
                    <Tooltip content={isEn ? testimonial.role.en : testimonial.role.fr} position="top" delay={200}>
                      <p className="text-xs flex items-center gap-1 truncate cursor-help" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        {isEn ? testimonial.role.en : testimonial.role.fr}
                      </p>
                    </Tooltip>
                    <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      <MapPin className="w-3 h-3" />
                      {testimonial.location}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Canadian regions */}
        <div className="mt-12 text-center">
          <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Serving businesses across Canada' : 'Au service des entreprises partout au Canada'}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {CANADA_MARKET_MESSAGING.socialProof.regions.map((region) => (
              <span 
                key={region}
                className="px-3 py-1 rounded-full text-sm"
                style={{ 
                  backgroundColor: 'rgb(var(--color-bg-muted))',
                  color: 'rgb(var(--color-text-secondary))'
                }}
              >
                {region}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection({ isEn }: { isEn: boolean }) {
  const { register } = useKeycloak();

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
      <div 
        className="max-w-4xl mx-auto text-center p-8 sm:p-12 rounded-3xl relative overflow-hidden"
        style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
      >
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/4 w-96 h-96 rounded-full bg-white/10" />
          <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 rounded-full bg-white/5" />
        </div>

        <div className="relative z-10">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
            {isEn ? 'Ready for financial clarity?' : 'Prêt pour la clarté financière?'}
          </h2>
          <p className="text-lg mb-8 text-white/80">
            {isEn 
              ? 'Join 1,000+ Canadian businesses who trust PlainLedger for their financial insights.'
              : 'Rejoignez plus de 1 000 entreprises canadiennes qui font confiance à PlainLedger.'}
          </p>
          <button
            onClick={() => {
              analytics.track('landing_page_cta_clicked', { location: 'bottom' });
              register();
            }}
            className="bg-white font-semibold px-8 py-3.5 rounded-xl hover:bg-gray-100 transition-all inline-flex items-center gap-2 group"
            style={{ color: 'rgb(var(--color-primary-700))' }}
          >
            {isEn ? 'Start your free trial' : 'Commencer l\'essai gratuit'}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-sm mt-4 text-white/60">
            {isEn ? 'No credit card required • 21 days free' : 'Sans carte de crédit • 21 jours gratuits'}
          </p>
        </div>
      </div>
    </section>
  );
}

function Footer({ isEn }: { isEn: boolean }) {
  return (
    <footer 
      className="py-12 px-4 sm:px-6 lg:px-8 border-t"
      style={{ borderColor: 'rgb(var(--color-border))' }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ 
                  background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-700)) 100%)'
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
              <span className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                PlainLedger
              </span>
            </div>
            <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn 
                ? 'Financial intelligence for Canadian businesses. Made with ❤️ in Canada.'
                : 'Intelligence financière pour les entreprises canadiennes. Fait avec ❤️ au Canada.'}
            </p>
            <div className="flex items-center gap-2 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              <MapPin className="w-4 h-4" />
              <span>Canada 🇨🇦</span>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Product' : 'Produit'}
            </h4>
            <ul className="space-y-2 text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              <li><a href="#features" className="hover:underline">{isEn ? 'Features' : 'Fonctionnalités'}</a></li>
              <li><a href="#pricing" className="hover:underline">{isEn ? 'Pricing' : 'Tarifs'}</a></li>
              <li><a href="#" className="hover:underline">{isEn ? 'Integrations' : 'Intégrations'}</a></li>
              <li><a href="#" className="hover:underline">{isEn ? 'Security' : 'Sécurité'}</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Company' : 'Entreprise'}
            </h4>
            <ul className="space-y-2 text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              <li><a href="#" className="hover:underline">{isEn ? 'About' : 'À propos'}</a></li>
              <li><a href="#" className="hover:underline">Blog</a></li>
              <li><a href="#" className="hover:underline">{isEn ? 'Careers' : 'Carrières'}</a></li>
              <li><a href="#cpa" className="hover:underline">{isEn ? 'Partner Program' : 'Programme partenaire'}</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Support' : 'Support'}
            </h4>
            <ul className="space-y-2 text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              <li><a href="#" className="hover:underline">{isEn ? 'Help Center' : 'Centre d\'aide'}</a></li>
              <li><a href="mailto:support@plainledger.ca" className="hover:underline">support@plainledger.ca</a></li>
              <li><a href="#" className="hover:underline">{isEn ? 'Privacy Policy' : 'Confidentialité'}</a></li>
              <li><a href="#" className="hover:underline">{isEn ? 'Terms of Service' : 'Conditions d\'utilisation'}</a></li>
            </ul>
          </div>
        </div>
        
        <div 
          className="pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            © 2026 PlainLedger Inc. {isEn ? 'All rights reserved.' : 'Tous droits réservés.'}
          </p>
          <div className="flex items-center gap-4 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            <span className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              {isEn ? 'Built by CPAs' : 'Conçu par des CPA'}
            </span>
            <span>•</span>
            <span>{isEn ? 'Data stored in Canada' : 'Données au Canada'}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// =====================================================
// MAIN STORE PAGE
// =====================================================

export default function Store() {
  const { language, setLanguage } = useI18n();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEn = language === 'en';
  const [showDemoModal, setShowDemoModal] = useState(false);

  // Track page view
  useEffect(() => {
    analytics.page('Store Landing Page', {
      referrer: document.referrer,
      utm_source: searchParams.get('utm_source') || undefined,
      utm_medium: searchParams.get('utm_medium') || undefined,
      utm_campaign: searchParams.get('utm_campaign') || undefined,
    });
  }, [searchParams]);

  const toggleLanguage = () => {
    setLanguage(isEn ? 'fr' : 'en');
  };

  const handleStartTrial = () => {
    analytics.track('demo_modal_cta_clicked', { action: 'start_trial' });
    setShowDemoModal(false);
    navigate('/signup');
  };

  return (
    <div style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
      <Header isEn={isEn} onLanguageToggle={toggleLanguage} />
      <main>
        <HeroSection isEn={isEn} onWatchDemo={() => setShowDemoModal(true)} />
        <FeaturesSection isEn={isEn} />
        <PricingSection isEn={isEn} />
        <IntegrationsSection />
        <TestimonialsSection isEn={isEn} />
        <CTASection isEn={isEn} />
      </main>
      <Footer isEn={isEn} />
      
      {/* Demo Modal */}
      <DemoModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        isEn={isEn}
        onStartTrial={handleStartTrial}
      />
    </div>
  );
}

export { Store };
