/**
 * Montreal City Landing Page
 *
 * Local SEO page targeting Montreal businesses with:
 * - Montreal-specific messaging
 * - Local industries (Tech, Aerospace, Gaming)
 * - French-first content
 */

import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../lib/keycloak';
import PublicHeader from '../../components/PublicHeader';
import { useI18n } from '../../lib/i18n';
import ContactForm from '../../components/ContactForm';
import { 
  ArrowRight,
  Check,
  DollarSign,
  Building2,
  Calculator,
  TrendingUp,
  MapPin,
  Gamepad2,
  Plane,
  Code,
  Film,
  Calendar,
  Mail,
} from 'lucide-react';

// Montreal theme
const theme = {
  primary: '#003DA5', // Quebec blue
  secondary: '#059669', // Green
};

// Montreal industries
const MONTREAL_INDUSTRIES = [
  {
    icon: Code,
    name: { en: 'Technology', fr: 'Technologies' },
    description: {
      en: 'Montreal is Canada\'s AI capital with Google, Microsoft, and Meta offices.',
      fr: 'Montréal est la capitale canadienne de l\'IA avec des bureaux Google, Microsoft et Meta.',
    },
    companies: ['Element AI', 'Shopify', 'Lightspeed', 'Hopper'],
  },
  {
    icon: Gamepad2,
    name: { en: 'Video Games', fr: 'Jeux vidéo' },
    description: {
      en: 'Home to Ubisoft, EA, and Warner Bros Games Montreal.',
      fr: 'Siège d\'Ubisoft, EA et Warner Bros Games Montréal.',
    },
    companies: ['Ubisoft', 'EA Montreal', 'WB Games', 'Behaviour'],
  },
  {
    icon: Plane,
    name: { en: 'Aerospace', fr: 'Aérospatiale' },
    description: {
      en: '40,000+ aerospace workers in the Greater Montreal area.',
      fr: '40 000+ travailleurs en aérospatiale dans le Grand Montréal.',
    },
    companies: ['Bombardier', 'CAE', 'Pratt & Whitney', 'Bell Helicopter'],
  },
  {
    icon: Film,
    name: { en: 'VFX & Film', fr: 'VFX et film' },
    description: {
      en: 'Major VFX studios serving Hollywood productions.',
      fr: 'Studios VFX majeurs au service des productions hollywoodiennes.',
    },
    companies: ['Framestore', 'MPC', 'DNEG', 'Rodeo FX'],
  },
];

// Montreal tax credits
const MONTREAL_TAX_CREDITS = [
  {
    name: 'CDAE',
    rate: '30%',
    description: { en: 'E-Business Development', fr: 'Développement commerce électronique' },
  },
  {
    name: 'JEVI',
    rate: '35%',
    description: { en: 'Interactive Digital Media (Games)', fr: 'Médias numériques interactifs (Jeux)' },
  },
  {
    name: 'CRIC',
    rate: '30%',
    description: { en: 'R&D and Innovation', fr: 'R&D et innovation' },
  },
  {
    name: 'CTMM',
    rate: '25%',
    description: { en: 'Multimedia Titles', fr: 'Titres multimédias' },
  },
];

export default function Montreal() {
  const { language } = useI18n();
  const { register, authenticated } = useAuth();
  const navigate = useNavigate();
  const isEn = language === 'en';

  const handleGetStarted = () => {
    if (authenticated) {
      navigate('/app');
    } else {
      register();
    }
  };

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: 'rgb(var(--color-bg))' }}
    >
      {/* SEO */}

      {/* Navigation - Using shared PublicHeader */}
      <PublicHeader
        badge="Montréal"
        badgeColor={theme.primary}
        accentColor={theme.primary}
        minimal
        customAction={{
          labelEn: 'Get Started',
          labelFr: 'Commencer',
          onClick: handleGetStarted,
          color: theme.secondary,
        }}
      />

      {/* Hero Section */}
      <section 
        className="relative py-16 sm:py-24 px-4 sm:px-6"
        style={{ 
          background: `linear-gradient(135deg, ${theme.primary}08 0%, ${theme.secondary}08 100%)`,
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            {/* Montreal Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
              style={{ 
                backgroundColor: `${theme.primary}10`,
                border: `1px solid ${theme.primary}20`,
              }}
            >
              <MapPin className="w-4 h-4" style={{ color: theme.primary }} />
              <span className="text-sm font-medium" style={{ color: theme.primary }}>
                Montréal, Québec
              </span>
              <span className="text-lg">⚜️</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? (
                <>
                  FP&A for<br />
                  <span style={{ color: theme.secondary }}>Montreal Business.</span>
                </>
              ) : (
                <>
                  FP&A pour les<br />
                  <span style={{ color: theme.secondary }}>entreprises montréalaises.</span>
                </>
              )}
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg sm:text-xl md:text-2xl mb-8 max-w-3xl mx-auto"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'CDAE, JEVI, and CRIC tax credits. Built for Montreal\'s tech, gaming, and aerospace ecosystem.'
                : 'Crédits d\'impôt CDAE, JEVI et CRIC. Conçu pour l\'écosystème tech, jeux vidéo et aérospatiale de Montréal.'}
            </motion.p>

            {/* Tax Credit Badges */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap justify-center gap-3 mb-10"
            >
              {MONTREAL_TAX_CREDITS.map((credit, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-4 py-2 rounded-full"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-surface))',
                    border: '1px solid rgb(var(--color-border))',
                  }}
                >
                  <DollarSign className="w-4 h-4" style={{ color: theme.secondary }} />
                  <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                    {credit.name}
                  </span>
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ 
                      backgroundColor: `${theme.secondary}15`,
                      color: theme.secondary,
                    }}
                  >
                    {credit.rate}
                  </span>
                </div>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <button
                onClick={handleGetStarted}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105"
                style={{ 
                  backgroundColor: theme.secondary,
                  color: 'white',
                  boxShadow: `0 4px 20px ${theme.secondary}40`,
                }}
              >
                {isEn ? 'Start Free Trial' : 'Essai gratuit'}
                <ArrowRight className="w-5 h-5" />
              </button>
              <Link
                to="/quebec"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all"
                style={{ 
                  backgroundColor: 'rgb(var(--color-surface))',
                  color: 'rgb(var(--color-text))',
                  border: `2px solid ${theme.secondary}30`,
                }}
              >
                {isEn ? 'Quebec Programs' : 'Programmes Québec'}
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 
              className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? 'Serving Montreal\'s Key Industries' : 'Au service des industries clés de Montréal'}
            </h2>
            <p 
              className="text-lg max-w-2xl mx-auto"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'Industry-specific KPIs and tax credit tracking for Montreal\'s leading sectors.'
                : 'KPIs sectoriels et suivi des crédits d\'impôt pour les secteurs phares de Montréal.'}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {MONTREAL_INDUSTRIES.map((industry, index) => {
              const Icon = industry.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 rounded-2xl"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-surface))',
                    border: '1px solid rgb(var(--color-border))',
                  }}
                >
                  <div 
                    className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center"
                    style={{ backgroundColor: `${theme.secondary}10` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: theme.secondary }} />
                  </div>
                  
                  <h3 
                    className="text-lg font-bold mb-2"
                    style={{ color: 'rgb(var(--color-text))' }}
                  >
                    {isEn ? industry.name.en : industry.name.fr}
                  </h3>
                  
                  <p 
                    className="text-sm mb-4"
                    style={{ color: 'rgb(var(--color-text-secondary))' }}
                  >
                    {isEn ? industry.description.en : industry.description.fr}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {industry.companies.slice(0, 3).map((company) => (
                      <span
                        key={company}
                        className="text-xs px-2 py-1 rounded"
                        style={{ 
                          backgroundColor: 'rgb(var(--color-bg-subtle))',
                          color: 'rgb(var(--color-text-muted))',
                        }}
                      >
                        {company}
                      </span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Local Benefits */}
      <section 
        className="py-16 sm:py-24 px-4 sm:px-6"
        style={{ backgroundColor: `${theme.secondary}03` }}
      >
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 
              className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? 'Why Montreal Businesses Choose PlainLedger' : 'Pourquoi les entreprises montréalaises choisissent PlainLedger'}
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: { en: 'Quebec Tax Credits', fr: 'Crédits d\'impôt Québec' },
                description: { 
                  en: 'Automatic tracking of CDAE, JEVI, CRIC, and CTMM eligibility',
                  fr: 'Suivi automatique de l\'admissibilité aux crédits CDAE, JEVI, CRIC et CTMM'
                },
              },
              {
                title: { en: 'Data in Montreal', fr: 'Données à Montréal' },
                description: { 
                  en: 'All data stored in AWS ca-central-1 (Montreal region)',
                  fr: 'Toutes les données stockées dans AWS ca-central-1 (région Montréal)'
                },
              },
              {
                title: { en: 'Bilingual Support', fr: 'Support bilingue' },
                description: { 
                  en: 'Full French interface and customer support',
                  fr: 'Interface et support client entièrement en français'
                },
              },
            ].map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-2xl flex items-start gap-4"
                style={{ 
                  backgroundColor: 'rgb(var(--color-surface))',
                  border: '1px solid rgb(var(--color-border))',
                }}
              >
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${theme.secondary}15` }}
                >
                  <Check className="w-5 h-5" style={{ color: theme.secondary }} />
                </div>
                <div>
                  <h3 
                    className="font-semibold mb-1"
                    style={{ color: 'rgb(var(--color-text))' }}
                  >
                    {isEn ? benefit.title.en : benefit.title.fr}
                  </h3>
                  <p 
                    className="text-sm"
                    style={{ color: 'rgb(var(--color-text-secondary))' }}
                  >
                    {isEn ? benefit.description.en : benefit.description.fr}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            className="text-center mb-10"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 
              className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? 'Contact Our Montreal Team' : 'Contactez notre équipe de Montréal'}
            </h2>
            <p 
              className="text-lg"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'We\'re based in Montreal and understand local business needs.'
                : 'Nous sommes basés à Montréal et comprenons les besoins des entreprises locales.'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-6 sm:p-8 rounded-2xl"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              border: `1px solid ${theme.secondary}20`,
            }}
          >
            <ContactForm 
              source="montreal-landing" 
              landingStyle={true}
              theme={{
                green: theme.secondary,
                greenDark: '#047857',
                greenLight: '#10b981',
              }}
            />
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer 
        className="py-8 px-4 sm:px-6 border-t"
        style={{ borderColor: `${theme.secondary}1a` }}
      >
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>PlainLedger Montréal</span>
          </div>
          <div className="flex items-center gap-6 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            <Link to="/privacy" className="hover:underline">{isEn ? 'Privacy' : 'Confidentialité'}</Link>
            <Link to="/quebec" className="hover:underline">Québec ⚜️</Link>
            <Link to="/canada" className="hover:underline">Canada 🇨🇦</Link>
            <Link to="/" className="hover:underline">{isEn ? 'Main Site' : 'Site principal'}</Link>
          </div>
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            © 2026 PlainLedger
          </p>
        </div>
      </footer>
    </div>
  );
}
