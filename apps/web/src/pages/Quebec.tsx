/**
 * Quebec Landing Page
 *
 * Marketing page targeting Quebec businesses with:
 * - Quebec-specific tax credits (CDAE, CRIC, RSDE)
 * - Quebec government programs (Investissement Québec, ESSOR, MAPAQ)
 * - French-first content with Quebec French terminology
 * - Local SEO for Quebec cities
 */

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/keycloak';
import PublicHeader from '../components/PublicHeader';
import { useI18n } from '../lib/i18n';
import ContactForm from '../components/ContactForm';
import SEOHead from '../components/SEOHead';
import { 
  ArrowRight,
  Check,
  Shield,
  DollarSign,
  Building2,
  Calculator,
  FileText,
  TrendingUp,
  MapPin,
  ChevronRight,
  Landmark,
  Briefcase,
  Factory,
  UtensilsCrossed,
  HardHat,
  Tractor,
  Calendar,
  Mail,
  ExternalLink,
} from 'lucide-react';

// Quebec theme - Fleurdelisé inspired blue
const quebecTheme = {
  blue: '#003DA5',       // Quebec blue
  blueLight: '#0055B8',
  blueDark: '#002D7A',
  accent: '#FFFFFF',     // White accent
  gold: '#FFD700',       // Gold accent
};

// Quebec cities for local SEO
const QUEBEC_CITIES = [
  { id: 'montreal', name: 'Montréal', population: '1.8M', businesses: '80,000+' },
  { id: 'quebec-city', name: 'Ville de Québec', population: '550K', businesses: '25,000+' },
  { id: 'laval', name: 'Laval', population: '450K', businesses: '15,000+' },
  { id: 'gatineau', name: 'Gatineau', population: '290K', businesses: '10,000+' },
  { id: 'sherbrooke', name: 'Sherbrooke', population: '170K', businesses: '8,000+' },
  { id: 'trois-rivieres', name: 'Trois-Rivières', population: '140K', businesses: '6,000+' },
];

// Quebec tax credits
const QUEBEC_TAX_CREDITS = [
  {
    id: 'cdae',
    name: { fr: 'Crédit CDAE', en: 'E-Business Tax Credit' },
    fullName: { 
      fr: 'Crédit d\'impôt pour le développement des affaires électroniques',
      en: 'Tax Credit for E-Business Development'
    },
    maxBenefit: '30%',
    description: {
      fr: 'Jusqu\'à 30% des salaires admissibles, maximum 25 000 $ par employé pour les entreprises TI québécoises.',
      en: 'Up to 30% of eligible salaries, max $25,000 per employee for Quebec IT companies.'
    },
    eligibility: {
      fr: ['Entreprise TI au Québec', '6+ employés techniques', 'Développement de logiciels'],
      en: ['Quebec IT company', '6+ technical employees', 'Software development']
    },
    icon: Calculator,
  },
  {
    id: 'cric',
    name: { fr: 'Crédit CRIC', en: 'CRIC Tax Credit' },
    fullName: {
      fr: 'Crédit d\'impôt pour la recherche, l\'innovation et la commercialisation',
      en: 'Tax Credit for Research, Innovation and Commercialization'
    },
    maxBenefit: '30%',
    description: {
      fr: 'Le crédit R&D phare du Québec, remplaçant les programmes RSDE et IDCI précédents.',
      en: 'Quebec\'s flagship R&D tax credit, replacing previous RSDE and IDCI programs.'
    },
    eligibility: {
      fr: ['Activités R&D au Québec', 'Innovation technologique', 'Dépenses admissibles documentées'],
      en: ['R&D activities in Quebec', 'Technological innovation', 'Documented eligible expenses']
    },
    icon: TrendingUp,
  },
  {
    id: 'rsde-qc',
    name: { fr: 'RSDE Provincial', en: 'Provincial SR&ED' },
    fullName: {
      fr: 'Crédit d\'impôt R&D provincial du Québec',
      en: 'Quebec Provincial SR&ED Tax Credit'
    },
    maxBenefit: '14%',
    description: {
      fr: 'Se cumule avec le crédit fédéral pour maximiser vos économies en R&D.',
      en: 'Stacks with federal credit to maximize your R&D savings.'
    },
    eligibility: {
      fr: ['R&D scientifique', 'Développement expérimental', 'Entreprise au Québec'],
      en: ['Scientific R&D', 'Experimental development', 'Quebec-based business']
    },
    icon: FileText,
  },
];

// Quebec government programs
const QUEBEC_PROGRAMS = [
  {
    id: 'investissement-quebec',
    name: 'Investissement Québec',
    description: {
      fr: 'Financement, investissements et garanties de prêts pour les PME québécoises.',
      en: 'Financing, investments and loan guarantees for Quebec SMBs.'
    },
    types: ['Prêts', 'Équité', 'Garanties'],
    url: 'https://www.investquebec.com',
  },
  {
    id: 'essor',
    name: 'Programme ESSOR',
    description: {
      fr: 'Aide financière pour démarrage et expansion d\'entreprises québécoises.',
      en: 'Financial assistance for Quebec business startups and expansions.'
    },
    types: ['Subventions', 'Prêts'],
    url: 'https://www.economie.gouv.qc.ca/essor',
  },
  {
    id: 'mapaq',
    name: 'Programmes MAPAQ',
    description: {
      fr: 'Programmes de financement du ministère de l\'agriculture du Québec.',
      en: 'Quebec Agriculture Ministry funding programs.'
    },
    types: ['Subventions', 'Aide technique'],
    url: 'https://www.mapaq.gouv.qc.ca',
  },
  {
    id: 'pme-mtl',
    name: 'PME MTL',
    description: {
      fr: 'Réseau d\'accompagnement des PME montréalaises avec financement et mentorat.',
      en: 'Montreal SMB support network with financing and mentorship.'
    },
    types: ['Prêts', 'Mentorat', 'Formation'],
    url: 'https://pmemtl.com',
  },
];

// Quebec industries
const QUEBEC_INDUSTRIES = [
  { id: 'technology', name: { fr: 'Technologies', en: 'Technology' }, icon: Calculator },
  { id: 'manufacturing', name: { fr: 'Manufacturier', en: 'Manufacturing' }, icon: Factory },
  { id: 'construction', name: { fr: 'Construction', en: 'Construction' }, icon: HardHat },
  { id: 'restaurant', name: { fr: 'Restauration', en: 'Restaurant' }, icon: UtensilsCrossed },
  { id: 'agriculture', name: { fr: 'Agroalimentaire', en: 'Agriculture' }, icon: Tractor },
  { id: 'professional', name: { fr: 'Services professionnels', en: 'Professional Services' }, icon: Briefcase },
];

// Intersection observer hook
function useInView(options?: IntersectionObserverInit) {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
      }
    }, { threshold: 0.2, ...options });
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  return { ref, isInView };
}

// Quebec-specific menu items
const QUEBEC_MENU_ITEMS = [
  { labelEn: 'Tax Credits', labelFr: 'Crédits d\'impôt', scrollTo: 'credits-impot' },
  { labelEn: 'Programs', labelFr: 'Programmes', scrollTo: 'programmes' },
  { labelEn: 'Industries', labelFr: 'Industries', scrollTo: 'industries' },
  { labelEn: 'Contact', labelFr: 'Contact', scrollTo: 'contact' },
];

export default function Quebec() {
  const { language } = useI18n();
  const { register, authenticated } = useAuth();
  const navigate = useNavigate();
  const isEn = language === 'en';

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handle CTA click
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
      <SEOHead canonicalPath="/quebec" />
      
      {/* Navigation - Using shared PublicHeader */}
      <PublicHeader
        badge="Québec"
        badgeColor={quebecTheme.blue}
        accentColor={quebecTheme.blue}
        customMenuItems={QUEBEC_MENU_ITEMS}
        onScrollToSection={scrollToSection}
        customAction={{
          labelEn: 'Get Started',
          labelFr: 'Commencer',
          onClick: handleGetStarted,
          color: quebecTheme.blue,
        }}
      />

      {/* Hero Section */}
      <section 
        className="relative py-16 sm:py-24 px-4 sm:px-6 overflow-hidden"
        style={{ 
          background: `linear-gradient(135deg, ${quebecTheme.blue}05 0%, ${quebecTheme.blueLight}08 100%)`,
        }}
      >
        {/* Quebec Fleur-de-lis pattern (subtle) */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5 L35 20 L30 15 L25 20 Z M30 55 L25 40 L30 45 L35 40 Z M5 30 L20 25 L15 30 L20 35 Z M55 30 L40 35 L45 30 L40 25 Z' fill='${encodeURIComponent(quebecTheme.blue)}' fill-rule='evenodd'/%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="max-w-7xl mx-auto relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Quebec Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
              style={{ 
                backgroundColor: `${quebecTheme.blue}10`,
                border: `1px solid ${quebecTheme.blue}20`,
              }}
            >
              <span className="text-lg">🇨🇦</span>
              <span className="text-sm font-medium" style={{ color: quebecTheme.blue }}>
                {isEn ? 'Made for Quebec' : 'Conçu pour le Québec'}
              </span>
              <span className="text-lg">⚜️</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? (
                <>
                  Quebec Entrepreneurs:<br />
                  <span style={{ color: quebecTheme.blue }}>Stop Leaving Money on the Table</span>
                </>
              ) : (
                <>
                  Entrepreneurs québécois:<br />
                  <span style={{ color: quebecTheme.blue }}>Arrêtez de laisser de l'argent sur la table</span>
                </>
              )}
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-lg sm:text-xl md:text-2xl mb-8 max-w-3xl mx-auto"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'CDAE alone could mean $25,000 per employee - if you knew you qualified. We bridge the gap between accounting and business decisions.'
                : 'Le CDAE seul pourrait signifier 25 000$ par employé - si vous saviez que vous vous qualifiez. Nous comblons l\'écart entre comptabilité et décisions d\'affaires.'}
            </motion.p>

            {/* Key Benefits */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-wrap justify-center gap-4 mb-10"
            >
              {[
                { icon: DollarSign, text: isEn ? 'CDAE & CRIC Credits' : 'Crédits CDAE & CRIC' },
                { icon: Landmark, text: isEn ? 'Investissement Québec' : 'Investissement Québec' },
                { icon: Shield, text: isEn ? 'Data in Canada' : 'Données au Canada' },
              ].map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-4 py-2 rounded-full"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-surface))',
                    border: '1px solid rgb(var(--color-border))',
                  }}
                >
                  <benefit.icon className="w-4 h-4" style={{ color: quebecTheme.blue }} />
                  <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                    {benefit.text}
                  </span>
                </div>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <button
                onClick={handleGetStarted}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105"
                style={{ 
                  backgroundColor: quebecTheme.blue,
                  color: 'white',
                  boxShadow: `0 4px 20px ${quebecTheme.blue}40`,
                }}
              >
                {isEn ? 'Start Free Trial' : 'Essai gratuit'}
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => scrollToSection('credits-impot')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all"
                style={{ 
                  backgroundColor: 'rgb(var(--color-surface))',
                  color: 'rgb(var(--color-text))',
                  border: `2px solid ${quebecTheme.blue}30`,
                }}
              >
                {isEn ? 'See Tax Credits' : 'Voir les crédits d\'impôt'}
                <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Tax Credits Section */}
      <section id="credits-impot" className="py-16 sm:py-24 px-4 sm:px-6">
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
              {isEn ? 'Money You\'re Leaving on the Table' : 'L\'argent que vous laissez sur la table'}
            </h2>
            <p 
              className="text-lg max-w-2xl mx-auto"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'CDAE alone could mean $25,000 per employee - if you knew you qualified. Most Quebec businesses miss 15K-50K$ in credits every year.'
                : 'Le CDAE seul pourrait signifier 25 000$ par employé - si vous saviez que vous vous qualifiez. La plupart des entreprises québécoises manquent 15K-50K$ en crédits chaque année.'}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {QUEBEC_TAX_CREDITS.map((credit, index) => {
              const Icon = credit.icon;
              return (
                <motion.div
                  key={credit.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 rounded-2xl transition-all hover:scale-[1.02]"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-surface))',
                    border: `1px solid ${quebecTheme.blue}20`,
                    boxShadow: `0 4px 20px ${quebecTheme.blue}08`,
                  }}
                >
                  {/* Icon & Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div 
                      className="p-3 rounded-xl"
                      style={{ backgroundColor: `${quebecTheme.blue}10` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: quebecTheme.blue }} />
                    </div>
                    <span 
                      className="px-3 py-1 rounded-full text-sm font-bold"
                      style={{ 
                        backgroundColor: `${quebecTheme.blue}15`,
                        color: quebecTheme.blue,
                      }}
                    >
                      {isEn ? 'Up to' : 'Jusqu\'à'} {credit.maxBenefit}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 
                    className="text-lg font-bold mb-1"
                    style={{ color: 'rgb(var(--color-text))' }}
                  >
                    {isEn ? credit.name.en : credit.name.fr}
                  </h3>
                  <p 
                    className="text-xs mb-3"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  >
                    {isEn ? credit.fullName.en : credit.fullName.fr}
                  </p>

                  {/* Description */}
                  <p 
                    className="text-sm mb-4"
                    style={{ color: 'rgb(var(--color-text-secondary))' }}
                  >
                    {isEn ? credit.description.en : credit.description.fr}
                  </p>

                  {/* Eligibility */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? 'Eligibility:' : 'Admissibilité:'}
                    </p>
                    {(isEn ? credit.eligibility.en : credit.eligibility.fr).map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check className="w-3 h-3 flex-shrink-0" style={{ color: quebecTheme.blue }} />
                        <span className="text-xs" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* CTA */}
          <motion.div 
            className="text-center mt-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <button
              onClick={handleGetStarted}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105"
              style={{ 
                backgroundColor: quebecTheme.blue,
                color: 'white',
              }}
            >
              {isEn ? 'Check Your Eligibility' : 'Vérifier votre admissibilité'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Government Programs Section */}
      <section 
        id="programmes" 
        className="py-16 sm:py-24 px-4 sm:px-6"
        style={{ backgroundColor: `${quebecTheme.blue}03` }}
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
              {isEn ? 'Government Programs' : 'Programmes gouvernementaux'}
            </h2>
            <p 
              className="text-lg max-w-2xl mx-auto"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'Navigate Quebec\'s funding ecosystem. We help you find and apply for the right programs.'
                : 'Naviguez dans l\'écosystème de financement québécois. Nous vous aidons à trouver et postuler aux bons programmes.'}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {QUEBEC_PROGRAMS.map((program, index) => (
              <motion.a
                key={program.id}
                href={program.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-2xl transition-all hover:scale-[1.02] group"
                style={{ 
                  backgroundColor: 'rgb(var(--color-surface))',
                  border: '1px solid rgb(var(--color-border))',
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <Landmark className="w-6 h-6" style={{ color: quebecTheme.blue }} />
                  <ExternalLink 
                    className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" 
                    style={{ color: 'rgb(var(--color-text-muted))' }} 
                  />
                </div>
                
                <h3 
                  className="text-lg font-bold mb-2"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {program.name}
                </h3>
                
                <p 
                  className="text-sm mb-4"
                  style={{ color: 'rgb(var(--color-text-secondary))' }}
                >
                  {isEn ? program.description.en : program.description.fr}
                </p>
                
                <div className="flex flex-wrap gap-2">
                  {program.types.map((type) => (
                    <span
                      key={type}
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{ 
                        backgroundColor: `${quebecTheme.blue}10`,
                        color: quebecTheme.blue,
                      }}
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section id="industries" className="py-16 sm:py-24 px-4 sm:px-6">
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
              {isEn ? 'Industry Benchmarks' : 'Benchmarks par industrie'}
            </h2>
            <p 
              className="text-lg max-w-2xl mx-auto"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'Compare your performance to Quebec industry standards with real-time KPIs.'
                : 'Comparez votre performance aux standards québécois avec des KPIs en temps réel.'}
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {QUEBEC_INDUSTRIES.map((industry, index) => {
              const Icon = industry.icon;
              return (
                <motion.div
                  key={industry.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-xl text-center transition-all hover:scale-105 cursor-pointer"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-surface))',
                    border: '1px solid rgb(var(--color-border))',
                  }}
                >
                  <div 
                    className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
                    style={{ backgroundColor: `${quebecTheme.blue}10` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: quebecTheme.blue }} />
                  </div>
                  <span 
                    className="text-sm font-medium"
                    style={{ color: 'rgb(var(--color-text))' }}
                  >
                    {isEn ? industry.name.en : industry.name.fr}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Cities Section */}
      <section 
        className="py-16 sm:py-24 px-4 sm:px-6"
        style={{ backgroundColor: `${quebecTheme.blue}03` }}
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
              {isEn ? 'Serving Quebec Businesses' : 'Au service des PME québécoises'}
            </h2>
            <p 
              className="text-lg max-w-2xl mx-auto"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'From Montreal to Quebec City, we help businesses across the province.'
                : 'De Montréal à Québec, nous aidons les entreprises partout dans la province.'}
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {QUEBEC_CITIES.map((city, index) => (
              <motion.div
                key={city.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-xl text-center"
                style={{ 
                  backgroundColor: 'rgb(var(--color-surface))',
                  border: '1px solid rgb(var(--color-border))',
                }}
              >
                <MapPin className="w-5 h-5 mx-auto mb-2" style={{ color: quebecTheme.blue }} />
                <p 
                  className="font-semibold text-sm mb-1"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {city.name}
                </p>
                <p 
                  className="text-xs"
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                >
                  {city.businesses} {isEn ? 'businesses' : 'entreprises'}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Residency Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-8 sm:p-12 rounded-3xl text-center"
            style={{ 
              background: `linear-gradient(135deg, ${quebecTheme.blue} 0%, ${quebecTheme.blueDark} 100%)`,
              boxShadow: `0 20px 60px ${quebecTheme.blue}30`,
            }}
          >
            <div className="flex justify-center gap-4 mb-6">
              <span className="text-4xl">🇨🇦</span>
              <Shield className="w-10 h-10 text-white" />
              <span className="text-4xl">⚜️</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              {isEn ? 'Your Data Stays in Canada' : 'Vos données restent au Canada'}
            </h2>
            
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
              {isEn 
                ? 'All data is stored in Canadian data centers (AWS ca-central-1). Your financial data never leaves the country.'
                : 'Toutes les données sont stockées dans des centres de données canadiens (AWS ca-central-1). Vos données financières ne quittent jamais le pays.'}
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              {[
                { text: isEn ? 'AWS Canada' : 'AWS Canada' },
                { text: isEn ? 'PIPEDA Compliant' : 'Conforme PIPEDA' },
                { text: isEn ? 'SOC 2 Ready' : 'Prêt SOC 2' },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-4 py-2 rounded-full"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                >
                  <Check className="w-4 h-4 text-white" />
                  <span className="text-sm font-medium text-white">{item.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 sm:py-24 px-4 sm:px-6">
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
              {isEn ? 'Get in Touch' : 'Contactez-nous'}
            </h2>
            <p 
              className="text-lg max-w-2xl mx-auto"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'Questions about Quebec tax credits or government programs? We\'re here to help.'
                : 'Des questions sur les crédits d\'impôt ou les programmes gouvernementaux du Québec? Nous sommes là pour vous aider.'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* Contact Info */}
            <div className="space-y-4">
              <div 
                className="p-6 rounded-2xl"
                style={{ 
                  backgroundColor: `${quebecTheme.blue}08`,
                  border: `1px solid ${quebecTheme.blue}20`,
                }}
              >
                <h3 
                  className="text-lg font-semibold mb-4"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn ? 'Contact Information' : 'Coordonnées'}
                </h3>
                <div className="space-y-4">
                  <a 
                    href="mailto:quebec@plainledger.ca" 
                    className="flex items-center gap-3 group"
                  >
                    <div 
                      className="p-2.5 rounded-lg"
                      style={{ backgroundColor: `${quebecTheme.blue}15` }}
                    >
                      <Mail className="w-5 h-5" style={{ color: quebecTheme.blue }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                        {isEn ? 'Email' : 'Courriel'}
                      </p>
                      <p 
                        className="text-sm group-hover:underline"
                        style={{ color: quebecTheme.blue }}
                      >
                        quebec@plainledger.ca
                      </p>
                    </div>
                  </a>
                  
                  <a 
                    href="https://calendly.com/plainledger/demo" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 group"
                  >
                    <div 
                      className="p-2.5 rounded-lg"
                      style={{ backgroundColor: `${quebecTheme.blue}15` }}
                    >
                      <Calendar className="w-5 h-5" style={{ color: quebecTheme.blue }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                        {isEn ? 'Schedule a Call' : 'Planifier un appel'}
                      </p>
                      <p 
                        className="text-sm group-hover:underline"
                        style={{ color: quebecTheme.blue }}
                      >
                        {isEn ? 'Book a 15-min demo' : 'Réservez une démo de 15 min'}
                      </p>
                    </div>
                  </a>
                </div>
              </div>
              
              <div 
                className="p-4 rounded-xl flex items-center gap-3"
                style={{ 
                  backgroundColor: `${quebecTheme.blue}08`,
                  border: `1px solid ${quebecTheme.blue}15`,
                }}
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${quebecTheme.blue}15` }}
                >
                  <Check className="w-5 h-5" style={{ color: quebecTheme.blue }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? 'Quick Response' : 'Réponse rapide'}
                  </p>
                  <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn 
                      ? 'We typically respond within 24 hours'
                      : 'Nous répondons généralement dans les 24 heures'}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div 
              className="p-6 sm:p-8 rounded-2xl"
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))',
                border: `1px solid ${quebecTheme.blue}20`,
              }}
            >
              <ContactForm 
                source="quebec-landing" 
                landingStyle={true}
                theme={{
                  green: quebecTheme.blue,
                  greenDark: quebecTheme.blueDark,
                  greenLight: quebecTheme.blueLight,
                }}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer 
        className="py-8 px-4 sm:px-6 border-t"
        style={{ borderColor: `${quebecTheme.blue}1a` }}
      >
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ 
                background: `linear-gradient(135deg, ${quebecTheme.blue} 0%, ${quebecTheme.blueDark} 100%)`
              }}
            >
              <svg className="w-4 h-4" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
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
            <span className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>PlainLedger Québec</span>
          </div>
          <div className="flex items-center gap-6 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            <Link to="/privacy" className="hover:underline">{isEn ? 'Privacy' : 'Confidentialité'}</Link>
            <Link to="/terms" className="hover:underline">{isEn ? 'Terms' : 'Conditions'}</Link>
            <Link to="/" className="hover:underline">{isEn ? 'Main Site' : 'Site principal'}</Link>
          </div>
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            © 2026 PlainLedger 🇨🇦 ⚜️
          </p>
        </div>
      </footer>
    </div>
  );
}
