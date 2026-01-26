import { useState } from 'react';
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
} from 'lucide-react';

// Integration logos
const integrations = ['QuickBooks', 'Xero', 'Sage', 'FreshBooks', 'Wave'];

export default function Landing() {
  const { login, authenticated } = useAuth();
  const { language } = useI18n();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isEn = language === 'en';

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}
    >
      {/* Navigation */}
      <nav 
        className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md"
        style={{ 
          backgroundColor: 'rgb(var(--color-bg) / 0.95)',
          borderColor: 'rgb(var(--color-border))'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white"
                style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
              >
                PL
              </div>
              <span className="font-semibold text-lg" style={{ color: 'rgb(var(--color-text))' }}>
                PlainLedger
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              <Link to="/store#features" className="text-sm font-medium hover:text-primary transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Features' : 'Fonctionnalités'}
              </Link>
              <Link to="/store#pricing" className="text-sm font-medium hover:text-primary transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Pricing' : 'Tarifs'}
              </Link>
              <Link to="/store#cpa" className="text-sm font-medium hover:text-primary transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'For CPAs' : 'Pour CPA'}
              </Link>
              <Link to="/store#testimonials" className="text-sm font-medium hover:text-primary transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
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
                <Link to="/store#features" className="text-sm font-medium py-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Features' : 'Fonctionnalités'}
                </Link>
                <Link to="/store#pricing" className="text-sm font-medium py-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Pricing' : 'Tarifs'}
                </Link>
                <Link to="/store#cpa" className="text-sm font-medium py-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'For CPAs' : 'Pour CPA'}
                </Link>
                <Link to="/store#testimonials" className="text-sm font-medium py-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
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

      {/* Hero Section - Clean & Bold */}
      <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Main Headline */}
          <h1 
            className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-8"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? (
              <>
                Clear financial reports.<br />
                <span style={{ color: 'rgb(var(--color-text-muted))' }}>
                  Anomalies caught early.
                </span><br />
                CPA support included.
              </>
            ) : (
              <>
                Rapports financiers clairs.<br />
                <span style={{ color: 'rgb(var(--color-text-muted))' }}>
                  Anomalies détectées tôt.
                </span><br />
                Support CPA inclus.
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p 
            className="text-lg sm:text-xl mb-10 max-w-2xl leading-relaxed"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            {isEn 
              ? 'Stop wasting hours on manual reconciliation. Connect your accounting software and get actionable insights in minutes, backed by experienced CPAs.'
              : 'Arrêtez de perdre des heures en réconciliation manuelle. Connectez votre logiciel comptable et obtenez des insights actionnables en quelques minutes, avec le soutien de CPA expérimentés.'}
          </p>

          {/* CTAs - Hello Frank Style */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => login()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-medium transition-all hover:scale-105"
              style={{ 
                backgroundColor: 'rgb(var(--color-text))',
                color: 'rgb(var(--color-bg))'
              }}
            >
              {isEn ? "I'm a CPA" : 'Je suis CPA'}
              <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => login()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-medium transition-all border-2 hover:scale-105"
              style={{ 
                borderColor: 'rgb(var(--color-text))',
                color: 'rgb(var(--color-text))',
                backgroundColor: 'transparent'
              }}
            >
              {isEn ? "I'm a Business Owner" : 'Je suis propriétaire d\'entreprise'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Chat Bubble - AI Assistant Hint */}
      <div className="fixed bottom-8 right-8 hidden lg:block animate-float z-40">
        <div 
          className="flex items-start gap-3 p-4 rounded-2xl shadow-lg max-w-xs"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))'
          }}
        >
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold"
            style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
          >
            PL
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? '3 anomalies detected in your Q4 data.' : '3 anomalies détectées dans vos données Q4.'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Click to review →' : 'Cliquez pour examiner →'}
            </p>
          </div>
        </div>
      </div>

      {/* Section 1: Single Source of Truth */}
      <section className="py-20 sm:py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 
            className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'Your single source of truth.' : 'Votre source unique de vérité.'}
          </h2>
          <p 
            className="text-lg mb-12 max-w-2xl mx-auto"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            {isEn 
              ? 'Securely connect your accounting software in minutes. Your data is unified, encrypted, and ready for analysis.'
              : 'Connectez votre logiciel comptable en quelques minutes. Vos données sont unifiées, chiffrées et prêtes pour l\'analyse.'}
          </p>

          {/* Integration Diagram */}
          <div 
            className="p-8 sm:p-12 rounded-3xl"
            style={{ backgroundColor: 'rgb(var(--color-surface))' }}
          >
            <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-10 mb-8">
              {integrations.map((name) => (
                <div 
                  key={name}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-bg-muted))',
                    color: 'rgb(var(--color-text-secondary))'
                  }}
                >
                  {name}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-4">
              <div className="w-px h-8" style={{ backgroundColor: 'rgb(var(--color-border))' }} />
            </div>
            <div 
              className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-white font-bold text-xl"
              style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
            >
              PL
            </div>
            <p className="text-sm mt-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'All your data, one platform' : 'Toutes vos données, une plateforme'}
            </p>
          </div>

          {/* AI Chat Bubble */}
          <div className="flex justify-center mt-8">
            <div 
              className="inline-flex items-center gap-3 px-5 py-3 rounded-full"
              style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}
            >
              <MessageSquare className="w-5 h-5" style={{ color: 'rgb(var(--color-success))' }} />
              <span className="text-sm" style={{ color: 'rgb(var(--color-success-dark))' }}>
                {isEn ? 'Data synced and secure. Ready for analysis.' : 'Données synchronisées et sécurisées. Prêtes pour l\'analyse.'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Instant Clarity */}
      <section 
        className="py-20 sm:py-32 px-6"
        style={{ backgroundColor: 'rgb(var(--color-bg))' }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 
            className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'Anomalies caught. Instantly.' : 'Anomalies détectées. Instantanément.'}
          </h2>
          <p 
            className="text-lg mb-12 max-w-2xl mx-auto"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            {isEn 
              ? 'Our AI scans your financial data and flags inconsistencies before they become problems. No more surprises.'
              : 'Notre IA analyse vos données financières et signale les incohérences avant qu\'elles ne deviennent des problèmes. Plus de surprises.'}
          </p>

          {/* Feature Cards */}
          <div className="grid sm:grid-cols-3 gap-6 text-left">
            {[
              {
                icon: AlertTriangle,
                titleEn: 'Anomaly Detection',
                titleFr: 'Détection d\'anomalies',
                descEn: 'AI flags duplicates, missing entries, and unusual patterns',
                descFr: 'L\'IA signale doublons, entrées manquantes et patterns inhabituels',
              },
              {
                icon: BarChart3,
                titleEn: 'Clear Reports',
                titleFr: 'Rapports clairs',
                descEn: 'Professional financial statements ready to share',
                descFr: 'États financiers professionnels prêts à partager',
              },
              {
                icon: Shield,
                titleEn: 'CPA Support',
                titleFr: 'Support CPA',
                descEn: 'Real experts to help interpret and act on insights',
                descFr: 'De vrais experts pour aider à interpréter et agir',
              },
            ].map((feature) => (
              <div 
                key={feature.titleEn}
                className="p-6 rounded-2xl"
                style={{ backgroundColor: 'rgb(var(--color-surface))' }}
              >
                <feature.icon 
                  className="w-8 h-8 mb-4" 
                  style={{ color: 'rgb(var(--color-primary-600))' }} 
                />
                <h3 className="font-semibold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
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
      <section className="py-20 sm:py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 
            className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'Simple pricing. No surprises.' : 'Tarification simple. Sans surprises.'}
          </h2>
          <p 
            className="text-lg mb-12 max-w-2xl mx-auto"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            {isEn 
              ? 'Start with our Essentiel plan. Upgrade as you grow.'
              : 'Commencez avec notre plan Essentiel. Évoluez selon vos besoins.'}
          </p>

          {/* Pricing Cards */}
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                name: 'Essentiel',
                price: '$500',
                descEn: 'For small businesses',
                descFr: 'Pour petites entreprises',
                featuresEn: ['Anomaly detection', 'Monthly reports', 'CPA email support'],
                featuresFr: ['Détection d\'anomalies', 'Rapports mensuels', 'Support CPA par courriel'],
                highlighted: false,
              },
              {
                name: 'Professionnel',
                price: '$1,200',
                descEn: 'For growing businesses',
                descFr: 'Pour entreprises en croissance',
                featuresEn: ['Everything in Essentiel', 'Weekly reviews', 'Priority CPA (48h)'],
                featuresFr: ['Tout de Essentiel', 'Revues hebdomadaires', 'CPA prioritaire (48h)'],
                highlighted: true,
              },
              {
                name: 'Premium',
                price: '$2,500',
                descEn: 'Full-service support',
                descFr: 'Support complet',
                featuresEn: ['Everything in Pro', 'Dedicated CPA', 'Same-day response'],
                featuresFr: ['Tout de Pro', 'CPA dédié', 'Réponse le jour même'],
                highlighted: false,
              },
            ].map((tier) => (
              <div 
                key={tier.name}
                className={`p-6 rounded-2xl text-left ${tier.highlighted ? 'ring-2 ring-[rgb(var(--color-text))]' : ''}`}
                style={{ 
                  backgroundColor: 'rgb(var(--color-surface))',
                }}
              >
                <h3 className="font-semibold mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                  {tier.name}
                </h3>
                <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? tier.descEn : tier.descFr}
                </p>
                <p className="text-3xl font-bold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
                  {tier.price}<span className="text-sm font-normal" style={{ color: 'rgb(var(--color-text-muted))' }}>/mo</span>
                </p>
                <ul className="space-y-2 mb-6">
                  {(isEn ? tier.featuresEn : tier.featuresFr).map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      <Check className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => login()}
                  className={`w-full py-2.5 rounded-full text-sm font-medium transition-all ${
                    tier.highlighted ? '' : 'border'
                  }`}
                  style={{ 
                    backgroundColor: tier.highlighted ? 'rgb(var(--color-text))' : 'transparent',
                    color: tier.highlighted ? 'rgb(var(--color-bg))' : 'rgb(var(--color-text))',
                    borderColor: tier.highlighted ? undefined : 'rgb(var(--color-border))',
                  }}
                >
                  {isEn ? 'Get Started' : 'Commencer'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section - Off Balance */}
      <section 
        className="py-20 sm:py-32 px-6"
        style={{ backgroundColor: 'rgb(var(--color-bg))' }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Content */}
            <div>
              <div 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
                style={{ 
                  backgroundColor: 'rgb(var(--color-warning) / 0.1)',
                  color: 'rgb(var(--color-warning-dark))'
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
                  { en: '🔍 Anomaly of the Week – Real catches, real lessons', fr: '🔍 Anomalie de la semaine – Vraies erreurs, vraies leçons' },
                  { en: '⚡ Tech tips that actually save time', fr: '⚡ Astuces tech qui font vraiment gagner du temps' },
                  { en: '📊 Industry trends without the buzzwords', fr: '📊 Tendances de l\'industrie sans les buzzwords' },
                  { en: '💬 CPA hot takes (we don\'t hold back)', fr: '💬 Opinions CPA (on ne se retient pas)' },
                ].map((item, i) => (
                  <li 
                    key={i} 
                    className="text-sm"
                    style={{ color: 'rgb(var(--color-text-secondary))' }}
                  >
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
      <section className="py-20 sm:py-32 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 
            className="text-3xl sm:text-4xl font-bold mb-6"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'Ready to see your data clearly?' : 'Prêt à voir vos données clairement?'}
          </h2>
          <p 
            className="text-lg mb-8"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            {isEn 
              ? 'Join accountants who are saving hours every week.'
              : 'Rejoignez les comptables qui économisent des heures chaque semaine.'}
          </p>
          <button 
            onClick={() => login()}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-medium text-lg transition-all hover:scale-105"
            style={{ 
              backgroundColor: 'rgb(var(--color-text))',
              color: 'rgb(var(--color-bg))'
            }}
          >
            {isEn ? 'Start Free Trial' : 'Commencer l\'essai gratuit'}
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="text-sm mt-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? '14-day free trial · No credit card required' : 'Essai gratuit 14 jours · Aucune carte de crédit requise'}
          </p>
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer 
        className="py-8 px-6 border-t"
        style={{ borderColor: 'rgb(var(--color-border))' }}
      >
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-6 h-6 rounded flex items-center justify-center"
              style={{ backgroundColor: 'rgb(var(--color-primary-600))', color: 'white' }}
            >
              <span className="text-xs font-bold">PL</span>
            </div>
            <span className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>PlainLedger</span>
          </div>
          <div className="flex items-center gap-6 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            <Link to="/newsletter" className="hover:underline">
              <span style={{ color: 'rgb(var(--color-text-muted))' }}>Off</span>Balance
            </Link>
            <a href="/privacy" className="hover:underline">{isEn ? 'Privacy' : 'Confidentialité'}</a>
            <a href="/terms" className="hover:underline">{isEn ? 'Terms' : 'Conditions'}</a>
            <a href="mailto:info@plainledger.ca" className="hover:underline">Contact</a>
          </div>
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            © 2026 PlainLedger
          </p>
        </div>
      </footer>
    </div>
  );
}
