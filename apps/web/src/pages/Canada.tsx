/**
 * Canada Landing Page
 *
 * Marketing page targeting Canadian businesses with:
 * - Federal tax credits (SR&ED, Clean Tech ITC, etc.)
 * - Canadian government programs (BDC, EDC, IRAP)
 * - Data sovereignty messaging (Canadian data centers)
 * - Provincial highlights (link to Quebec, Ontario pages)
 */

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/keycloak';
import PublicHeader from '../components/PublicHeader';
import { useI18n } from '../lib/i18n';
import ContactForm from '../components/ContactForm';
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
  Globe,
  Database,
  Lock,
  Calendar,
  Mail,
  ExternalLink,
  Leaf,
  GraduationCap,
  Plane,
  Server,
  X,
} from 'lucide-react';

// Canadian theme - Red and White inspired
const canadaTheme = {
  red: '#FF0000',        // Canadian red
  redLight: '#FF3333',
  redDark: '#CC0000',
  accent: '#FFFFFF',
  maple: '#D52B1E',      // Official maple leaf red
};

// Use green for primary CTA (better conversion)
const primaryColor = '#059669'; // Emerald green

// Canadian provinces
const CANADIAN_PROVINCES = [
  { id: 'qc', name: { en: 'Quebec', fr: 'Québec' }, flag: '⚜️', link: '/quebec', highlight: true },
  { id: 'on', name: { en: 'Ontario', fr: 'Ontario' }, flag: '🏛️', link: null },
  { id: 'bc', name: { en: 'British Columbia', fr: 'Colombie-Britannique' }, flag: '🏔️', link: null },
  { id: 'ab', name: { en: 'Alberta', fr: 'Alberta' }, flag: '🛢️', link: null },
  { id: 'mb', name: { en: 'Manitoba', fr: 'Manitoba' }, flag: '🌾', link: null },
  { id: 'sk', name: { en: 'Saskatchewan', fr: 'Saskatchewan' }, flag: '🌻', link: null },
  { id: 'ns', name: { en: 'Nova Scotia', fr: 'Nouvelle-Écosse' }, flag: '🦞', link: null },
  { id: 'nb', name: { en: 'New Brunswick', fr: 'Nouveau-Brunswick' }, flag: '🌲', link: null },
];

// Federal tax credits
const FEDERAL_TAX_CREDITS = [
  {
    id: 'sred',
    name: { en: 'SR&ED', fr: 'RSDE' },
    fullName: { 
      en: 'Scientific Research and Experimental Development',
      fr: 'Recherche scientifique et développement expérimental'
    },
    maxBenefit: '35%',
    description: {
      en: 'Canada\'s largest R&D tax credit program. Up to 35% refundable credit on eligible R&D expenditures.',
      fr: 'Le plus grand programme de crédit R&D du Canada. Jusqu\'à 35% de crédit remboursable sur les dépenses R&D admissibles.'
    },
    eligibility: {
      en: ['R&D activities in Canada', 'Technological advancement', 'Systematic investigation'],
      fr: ['Activités R&D au Canada', 'Avancement technologique', 'Investigation systématique']
    },
    icon: Calculator,
  },
  {
    id: 'clean-tech',
    name: { en: 'Clean Tech ITC', fr: 'CIIP' },
    fullName: {
      en: 'Clean Technology Investment Tax Credit',
      fr: 'Crédit d\'impôt à l\'investissement dans les technologies propres'
    },
    maxBenefit: '30%',
    description: {
      en: 'Refundable tax credit for investments in clean technology equipment to support Canada\'s net-zero goals.',
      fr: 'Crédit remboursable pour les investissements dans l\'équipement de technologies propres pour la carboneutralité.'
    },
    eligibility: {
      en: ['Clean energy generation', 'Energy storage', 'Zero-emission vehicles'],
      fr: ['Production d\'énergie propre', 'Stockage d\'énergie', 'Véhicules zéro émission']
    },
    icon: Leaf,
  },
  {
    id: 'apprenticeship',
    name: { en: 'Apprenticeship Credit', fr: 'Crédit apprentissage' },
    fullName: {
      en: 'Apprenticeship Job Creation Tax Credit',
      fr: 'Crédit d\'impôt pour la création d\'emplois d\'apprentis'
    },
    maxBenefit: '$2,000',
    description: {
      en: 'Tax credit for employers hiring apprentices in Red Seal trades.',
      fr: 'Crédit d\'impôt pour les employeurs qui embauchent des apprentis dans les métiers Sceau rouge.'
    },
    eligibility: {
      en: ['Red Seal trade apprentices', 'First 2 years of apprenticeship', 'Canadian employer'],
      fr: ['Apprentis métiers Sceau rouge', '2 premières années d\'apprentissage', 'Employeur canadien']
    },
    icon: GraduationCap,
  },
];

// Canadian government programs
const CANADIAN_PROGRAMS = [
  {
    id: 'bdc',
    name: 'BDC',
    fullName: { en: 'Business Development Bank of Canada', fr: 'Banque de développement du Canada' },
    description: {
      en: 'Financing and advisory services exclusively for Canadian entrepreneurs.',
      fr: 'Financement et services-conseils exclusivement pour les entrepreneurs canadiens.'
    },
    types: { en: ['Loans', 'Advisory', 'Venture Capital'], fr: ['Prêts', 'Conseils', 'Capital de risque'] },
    url: 'https://www.bdc.ca',
    icon: Building2,
  },
  {
    id: 'edc',
    name: 'EDC',
    fullName: { en: 'Export Development Canada', fr: 'Exportation et développement Canada' },
    description: {
      en: 'Financing and insurance for Canadian exporters and international trade.',
      fr: 'Financement et assurance pour les exportateurs canadiens et le commerce international.'
    },
    types: { en: ['Export Financing', 'Insurance', 'Guarantees'], fr: ['Financement export', 'Assurance', 'Garanties'] },
    url: 'https://www.edc.ca',
    icon: Plane,
  },
  {
    id: 'irap',
    name: 'NRC-IRAP',
    fullName: { en: 'Industrial Research Assistance Program', fr: 'Programme d\'aide à la recherche industrielle' },
    description: {
      en: 'Funding and advisory support for innovative Canadian SMBs.',
      fr: 'Financement et soutien consultatif pour les PME canadiennes innovantes.'
    },
    types: { en: ['R&D Funding', 'Advisory', 'Networking'], fr: ['Financement R&D', 'Conseils', 'Réseautage'] },
    url: 'https://nrc.canada.ca/en/support-technology-innovation',
    icon: TrendingUp,
  },
  {
    id: 'csbfp',
    name: 'CSBFP',
    fullName: { en: 'Canada Small Business Financing Program', fr: 'Programme de financement des petites entreprises du Canada' },
    description: {
      en: 'Government-backed loans for equipment, property, and leasehold improvements.',
      fr: 'Prêts garantis par le gouvernement pour équipement, immobilier et améliorations locatives.'
    },
    types: { en: ['Equipment', 'Real Estate', 'Improvements'], fr: ['Équipement', 'Immobilier', 'Améliorations'] },
    url: 'https://ised-isde.canada.ca/site/canada-small-business-financing-program',
    icon: Landmark,
  },
];

// Canadian differentiators
const CANADIAN_DIFFERENTIATORS = [
  {
    icon: Server,
    title: { en: 'Canadian Data Centers', fr: 'Centres de données canadiens' },
    description: { 
      en: 'All data stored in AWS ca-central-1 (Montreal)',
      fr: 'Toutes les données stockées dans AWS ca-central-1 (Montréal)'
    },
  },
  {
    icon: Globe,
    title: { en: 'Bilingual EN/FR', fr: 'Bilingue EN/FR' },
    description: { 
      en: 'Full French support for Quebec businesses',
      fr: 'Support français complet pour les entreprises québécoises'
    },
  },
  {
    icon: Lock,
    title: { en: 'PIPEDA Compliant', fr: 'Conforme PIPEDA' },
    description: { 
      en: 'Built for Canadian privacy requirements',
      fr: 'Conçu pour les exigences de confidentialité canadiennes'
    },
  },
  {
    icon: DollarSign,
    title: { en: 'CAD Native', fr: 'CAD natif' },
    description: { 
      en: 'No currency conversion needed',
      fr: 'Aucune conversion de devise nécessaire'
    },
  },
];

// Canada-specific menu items
const CANADA_MENU_ITEMS = [
  { labelEn: 'Tax Credits', labelFr: 'Crédits d\'impôt', scrollTo: 'tax-credits' },
  { labelEn: 'Programs', labelFr: 'Programmes', scrollTo: 'programs' },
  { labelEn: 'Provinces', labelFr: 'Provinces', scrollTo: 'provinces' },
  { labelEn: 'Contact', labelFr: 'Contact', scrollTo: 'contact' },
];

export default function Canada() {
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
      
      {/* Navigation - Using shared PublicHeader */}
      <PublicHeader
        badge="Canada 🇨🇦"
        badgeColor={canadaTheme.maple}
        accentColor={canadaTheme.maple}
        customMenuItems={CANADA_MENU_ITEMS}
        onScrollToSection={scrollToSection}
        customAction={{
          labelEn: 'Get Started',
          labelFr: 'Commencer',
          onClick: handleGetStarted,
          color: primaryColor,
        }}
      />

      {/* Hero Section */}
      <section 
        className="relative py-16 sm:py-24 px-4 sm:px-6 overflow-hidden"
        style={{ 
          background: `linear-gradient(135deg, ${canadaTheme.maple}05 0%, ${primaryColor}08 100%)`,
        }}
      >
        <div className="max-w-7xl mx-auto relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Canada Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
              style={{ 
                backgroundColor: `${canadaTheme.maple}10`,
                border: `1px solid ${canadaTheme.maple}20`,
              }}
            >
              <span className="text-lg">🇨🇦</span>
              <span className="text-sm font-medium" style={{ color: canadaTheme.maple }}>
                {isEn ? 'Built for Canadian Business' : 'Conçu pour les entreprises canadiennes'}
              </span>
              <span className="text-lg">🍁</span>
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
                  FP&A Built for<br />
                  <span style={{ color: primaryColor }}>Canadian Business.</span>
                </>
              ) : (
                <>
                  FP&A conçu pour les<br />
                  <span style={{ color: primaryColor }}>entreprises canadiennes.</span>
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
                ? 'SR&ED Tax Credits. Government Programs. Data Stored in Canada.'
                : 'Crédits d\'impôt RSDE. Programmes gouvernementaux. Données stockées au Canada.'}
            </motion.p>

            {/* Key Differentiators */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10"
            >
              {CANADIAN_DIFFERENTIATORS.map((diff, index) => {
                const Icon = diff.icon;
                return (
                  <div
                    key={index}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-surface))',
                      border: '1px solid rgb(var(--color-border))',
                    }}
                  >
                    <Icon className="w-6 h-6" style={{ color: primaryColor }} />
                    <span className="text-sm font-medium text-center" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? diff.title.en : diff.title.fr}
                    </span>
                  </div>
                );
              })}
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
                  backgroundColor: primaryColor,
                  color: 'white',
                  boxShadow: `0 4px 20px ${primaryColor}40`,
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
                  border: `2px solid ${primaryColor}30`,
                }}
              >
                {isEn ? 'Quebec Businesses' : 'Entreprises québécoises'} ⚜️
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Canadian Businesses Choose Us */}
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
              {isEn ? 'Why Canadian Businesses Choose PlainLedger' : 'Pourquoi les entreprises canadiennes choisissent PlainLedger'}
            </h2>
            <p 
              className="text-lg max-w-3xl mx-auto"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'US tools don\'t understand SR&ED, CDAE, or BDC. They don\'t store data in Canada. They don\'t speak French. PlainLedger does.'
                : 'Les outils américains ne comprennent pas le RSDE, le CDAE ou la BDC. Ils ne stockent pas de données au Canada. Ils ne parlent pas français. PlainLedger, oui.'}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* PlainLedger Card */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-2xl"
              style={{ 
                backgroundColor: `${primaryColor}08`,
                border: `2px solid ${primaryColor}30`,
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Check className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                  PlainLedger 🇨🇦
                </h3>
              </div>
              
              <div className="space-y-4">
                {[
                  { en: 'Data stored in Canada (AWS Montreal)', fr: 'Données stockées au Canada (AWS Montréal)' },
                  { en: 'SR&ED, CDAE, CRIC tax credit tracking', fr: 'Suivi des crédits RSDE, CDAE, CRIC' },
                  { en: 'BDC, EDC, IRAP program guidance', fr: 'Guide des programmes BDC, EDC, IRAP' },
                  { en: 'Full bilingual EN/FR support', fr: 'Support bilingue EN/FR complet' },
                  { en: 'CAD native - no conversion', fr: 'CAD natif - aucune conversion' },
                  { en: 'PIPEDA privacy compliant', fr: 'Conforme à la confidentialité PIPEDA' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Check className="w-5 h-5 flex-shrink-0" style={{ color: primaryColor }} />
                    <span className="text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? item.en : item.fr}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* US Competitors Card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-2xl"
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))',
                border: '1px solid rgb(var(--color-border))',
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}
                >
                  <X className="w-6 h-6" style={{ color: 'rgb(var(--color-text-muted))' }} />
                </div>
                <h3 className="text-xl font-bold" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'US Competitors' : 'Concurrents américains'}
                </h3>
              </div>
              
              <div className="space-y-4">
                {[
                  { en: 'Data stored in US servers', fr: 'Données stockées sur des serveurs américains' },
                  { en: 'US tax credits only (no SR&ED)', fr: 'Crédits US seulement (pas de RSDE)' },
                  { en: 'SBA programs only', fr: 'Programmes SBA seulement' },
                  { en: 'English only', fr: 'Anglais seulement' },
                  { en: 'USD - requires conversion', fr: 'USD - conversion requise' },
                  { en: 'GDPR/CCPA (not PIPEDA)', fr: 'RGPD/CCPA (pas PIPEDA)' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <X className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
                    <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? item.en : item.fr}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Federal Tax Credits Section */}
      <section 
        id="tax-credits" 
        className="py-16 sm:py-24 px-4 sm:px-6"
        style={{ backgroundColor: `${primaryColor}03` }}
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
              {isEn ? 'Federal Tax Credits' : 'Crédits d\'impôt fédéraux'}
            </h2>
            <p 
              className="text-lg max-w-2xl mx-auto"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'PlainLedger helps you discover federal tax credits you may be missing.'
                : 'PlainLedger vous aide à découvrir les crédits d\'impôt fédéraux que vous manquez peut-être.'}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEDERAL_TAX_CREDITS.map((credit, index) => {
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
                    border: `1px solid ${primaryColor}20`,
                    boxShadow: `0 4px 20px ${primaryColor}08`,
                  }}
                >
                  {/* Icon & Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div 
                      className="p-3 rounded-xl"
                      style={{ backgroundColor: `${primaryColor}10` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: primaryColor }} />
                    </div>
                    <span 
                      className="px-3 py-1 rounded-full text-sm font-bold"
                      style={{ 
                        backgroundColor: `${primaryColor}15`,
                        color: primaryColor,
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
                        <Check className="w-3 h-3 flex-shrink-0" style={{ color: primaryColor }} />
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
                backgroundColor: primaryColor,
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
      <section id="programs" className="py-16 sm:py-24 px-4 sm:px-6">
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
              {isEn ? 'Government Funding Programs' : 'Programmes de financement gouvernementaux'}
            </h2>
            <p 
              className="text-lg max-w-2xl mx-auto"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'Navigate Canada\'s funding ecosystem. We help you find and access the right programs.'
                : 'Naviguez dans l\'écosystème de financement canadien. Nous vous aidons à trouver les bons programmes.'}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CANADIAN_PROGRAMS.map((program, index) => {
              const Icon = program.icon;
              return (
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
                    <div 
                      className="p-3 rounded-xl"
                      style={{ backgroundColor: `${primaryColor}10` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: primaryColor }} />
                    </div>
                    <ExternalLink 
                      className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" 
                      style={{ color: 'rgb(var(--color-text-muted))' }} 
                    />
                  </div>
                  
                  <h3 
                    className="text-lg font-bold mb-1"
                    style={{ color: 'rgb(var(--color-text))' }}
                  >
                    {program.name}
                  </h3>
                  <p 
                    className="text-xs mb-3"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  >
                    {isEn ? program.fullName.en : program.fullName.fr}
                  </p>
                  
                  <p 
                    className="text-sm mb-4"
                    style={{ color: 'rgb(var(--color-text-secondary))' }}
                  >
                    {isEn ? program.description.en : program.description.fr}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {(isEn ? program.types.en : program.types.fr).map((type) => (
                      <span
                        key={type}
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{ 
                          backgroundColor: `${primaryColor}10`,
                          color: primaryColor,
                        }}
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </motion.a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Provinces Section */}
      <section 
        id="provinces" 
        className="py-16 sm:py-24 px-4 sm:px-6"
        style={{ backgroundColor: `${primaryColor}03` }}
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
              {isEn ? 'Serving All Provinces' : 'Au service de toutes les provinces'}
            </h2>
            <p 
              className="text-lg max-w-2xl mx-auto"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'Federal and provincial tax credits across Canada, with dedicated support for Quebec.'
                : 'Crédits d\'impôt fédéraux et provinciaux partout au Canada, avec support dédié pour le Québec.'}
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CANADIAN_PROVINCES.map((province, index) => (
              <motion.div
                key={province.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                {province.link ? (
                  <Link
                    to={province.link}
                    className="block p-4 rounded-xl text-center transition-all hover:scale-105"
                    style={{ 
                      backgroundColor: province.highlight ? `${primaryColor}10` : 'rgb(var(--color-surface))',
                      border: province.highlight ? `2px solid ${primaryColor}` : '1px solid rgb(var(--color-border))',
                    }}
                  >
                    <span className="text-2xl mb-2 block">{province.flag}</span>
                    <p 
                      className="font-semibold text-sm"
                      style={{ color: province.highlight ? primaryColor : 'rgb(var(--color-text))' }}
                    >
                      {isEn ? province.name.en : province.name.fr}
                    </p>
                    {province.highlight && (
                      <p 
                        className="text-xs mt-1"
                        style={{ color: primaryColor }}
                      >
                        {isEn ? 'Dedicated Page' : 'Page dédiée'} →
                      </p>
                    )}
                  </Link>
                ) : (
                  <div
                    className="p-4 rounded-xl text-center"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-surface))',
                      border: '1px solid rgb(var(--color-border))',
                    }}
                  >
                    <span className="text-2xl mb-2 block">{province.flag}</span>
                    <p 
                      className="font-semibold text-sm"
                      style={{ color: 'rgb(var(--color-text))' }}
                    >
                      {isEn ? province.name.en : province.name.fr}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Sovereignty CTA */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-8 sm:p-12 rounded-3xl text-center"
            style={{ 
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}cc 100%)`,
              boxShadow: `0 20px 60px ${primaryColor}30`,
            }}
          >
            <div className="flex justify-center gap-4 mb-6">
              <span className="text-4xl">🇨🇦</span>
              <Shield className="w-10 h-10 text-white" />
              <span className="text-4xl">🍁</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              {isEn ? 'Your Data Stays in Canada' : 'Vos données restent au Canada'}
            </h2>
            
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
              {isEn 
                ? 'All data is stored in Canadian data centers (AWS ca-central-1 in Montreal). Your financial data never crosses the border.'
                : 'Toutes les données sont stockées dans des centres de données canadiens (AWS ca-central-1 à Montréal). Vos données financières ne traversent jamais la frontière.'}
            </p>
            
            <button
              onClick={handleGetStarted}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105"
              style={{ 
                backgroundColor: 'white',
                color: primaryColor,
              }}
            >
              {isEn ? 'Start Your Free Trial' : 'Commencer votre essai gratuit'}
              <ArrowRight className="w-5 h-5" />
            </button>
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
                ? 'Questions about Canadian tax credits or government programs? We\'re here to help.'
                : 'Des questions sur les crédits d\'impôt ou les programmes gouvernementaux canadiens? Nous sommes là pour vous aider.'}
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
                  backgroundColor: `${primaryColor}08`,
                  border: `1px solid ${primaryColor}20`,
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
                    href="mailto:info@plainledger.ca" 
                    className="flex items-center gap-3 group"
                  >
                    <div 
                      className="p-2.5 rounded-lg"
                      style={{ backgroundColor: `${primaryColor}15` }}
                    >
                      <Mail className="w-5 h-5" style={{ color: primaryColor }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                        {isEn ? 'Email' : 'Courriel'}
                      </p>
                      <p 
                        className="text-sm group-hover:underline"
                        style={{ color: primaryColor }}
                      >
                        info@plainledger.ca
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
                      style={{ backgroundColor: `${primaryColor}15` }}
                    >
                      <Calendar className="w-5 h-5" style={{ color: primaryColor }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                        {isEn ? 'Schedule a Call' : 'Planifier un appel'}
                      </p>
                      <p 
                        className="text-sm group-hover:underline"
                        style={{ color: primaryColor }}
                      >
                        {isEn ? 'Book a 15-min demo' : 'Réservez une démo de 15 min'}
                      </p>
                    </div>
                  </a>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div 
              className="p-6 sm:p-8 rounded-2xl"
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))',
                border: `1px solid ${primaryColor}20`,
              }}
            >
              <ContactForm 
                source="canada-landing" 
                landingStyle={true}
                theme={{
                  green: primaryColor,
                  greenDark: '#047857',
                  greenLight: '#10b981',
                }}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer 
        className="py-8 px-4 sm:px-6 border-t"
        style={{ borderColor: `${primaryColor}1a` }}
      >
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ 
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`
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
            <span className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>PlainLedger Canada</span>
          </div>
          <div className="flex items-center gap-6 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            <Link to="/privacy" className="hover:underline">{isEn ? 'Privacy' : 'Confidentialité'}</Link>
            <Link to="/terms" className="hover:underline">{isEn ? 'Terms' : 'Conditions'}</Link>
            <Link to="/quebec" className="hover:underline">Québec ⚜️</Link>
            <Link to="/" className="hover:underline">{isEn ? 'Main Site' : 'Site principal'}</Link>
          </div>
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            © 2026 PlainLedger 🇨🇦
          </p>
        </div>
      </footer>
    </div>
  );
}
