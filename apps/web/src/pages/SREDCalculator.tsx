/**
 * SR&ED Calculator Page
 *
 * Public landing page for the SR&ED tax credit calculator tool.
 * Designed for lead generation and SEO.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/keycloak';
import ThemeToggle from '../components/ThemeToggle';
import { LanguageToggle, useI18n } from '../lib/i18n';
import SREDCalculator from '../components/SREDCalculator';
import SEOHead from '../components/SEOHead';
import { 
  ArrowRight,
  Check,
  Menu,
  X,
  Calendar,
  Mail,
} from 'lucide-react';

// Theme color
const primaryColor = '#059669';

// FAQ items
const FAQ_ITEMS = [
  {
    question: {
      en: 'What is SR&ED?',
      fr: 'Qu\'est-ce que le RSDE?',
    },
    answer: {
      en: 'SR&ED (Scientific Research and Experimental Development) is Canada\'s largest tax incentive program, providing tax credits to businesses that conduct R&D in Canada. It\'s administered by the CRA.',
      fr: 'Le RSDE (Recherche scientifique et développement expérimental) est le plus grand programme d\'incitatifs fiscaux du Canada, offrant des crédits d\'impôt aux entreprises qui font de la R&D au Canada. Il est administré par l\'ARC.',
    },
  },
  {
    question: {
      en: 'Who is eligible for SR&ED?',
      fr: 'Qui est admissible au RSDE?',
    },
    answer: {
      en: 'Any Canadian business conducting R&D activities that involve technological uncertainty, systematic investigation, and technological advancement may qualify. This includes software development, manufacturing improvements, and scientific research.',
      fr: 'Toute entreprise canadienne effectuant des activités de R&D impliquant une incertitude technologique, une investigation systématique et un avancement technologique peut être admissible. Cela inclut le développement logiciel, l\'amélioration des procédés manufacturiers et la recherche scientifique.',
    },
  },
  {
    question: {
      en: 'How much can I claim?',
      fr: 'Combien puis-je réclamer?',
    },
    answer: {
      en: 'CCPCs (Canadian-Controlled Private Corporations) can claim up to 35% refundable on the first $3M of eligible expenses, plus provincial credits (e.g., 14% in Quebec). Non-CCPCs get 15% non-refundable credits.',
      fr: 'Les SPCC (Sociétés privées sous contrôle canadien) peuvent réclamer jusqu\'à 35% remboursable sur les premiers 3 M$ de dépenses admissibles, plus les crédits provinciaux (par ex., 14% au Québec). Les non-SPCC obtiennent 15% de crédits non remboursables.',
    },
  },
  {
    question: {
      en: 'What expenses qualify?',
      fr: 'Quelles dépenses sont admissibles?',
    },
    answer: {
      en: 'Eligible expenses include: salaries of R&D employees, materials consumed in R&D, 80% of third-party contractor costs, and allocated overhead. Capital equipment is generally not eligible.',
      fr: 'Les dépenses admissibles comprennent: les salaires des employés R&D, les matériaux consommés en R&D, 80% des coûts des sous-traitants tiers, et les frais généraux alloués. L\'équipement en capital n\'est généralement pas admissible.',
    },
  },
  {
    question: {
      en: 'Does software development qualify?',
      fr: 'Le développement logiciel est-il admissible?',
    },
    answer: {
      en: 'Yes! Software development often qualifies if it involves technological uncertainty—creating new algorithms, solving performance challenges, or developing novel functionality that can\'t be achieved with standard methods.',
      fr: 'Oui! Le développement logiciel est souvent admissible s\'il implique une incertitude technologique—création de nouveaux algorithmes, résolution de défis de performance, ou développement de fonctionnalités novatrices impossibles avec les méthodes standard.',
    },
  },
  {
    question: {
      en: 'How far back can I claim?',
      fr: 'Jusqu\'à quand puis-je remonter?',
    },
    answer: {
      en: 'You can claim SR&ED for up to 18 months after your fiscal year end. For example, if your fiscal year ends December 31, 2024, you have until June 30, 2026 to file your SR&ED claim.',
      fr: 'Vous pouvez réclamer le RSDE jusqu\'à 18 mois après la fin de votre exercice fiscal. Par exemple, si votre exercice se termine le 31 décembre 2024, vous avez jusqu\'au 30 juin 2026 pour déposer votre réclamation RSDE.',
    },
  },
];

export default function SREDCalculatorPage() {
  const { language } = useI18n();
  const { register, authenticated } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
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
      <SEOHead 
        title={{
          en: 'SR&ED Tax Credit Calculator | Free R&D Tax Credit Estimator Canada',
          fr: 'Calculateur de crédit d\'impôt RSDE | Estimateur gratuit de crédit R&D Canada',
        }}
        description={{
          en: 'Free SR&ED tax credit calculator. Estimate your Canadian R&D tax credit in 2 minutes. Federal 35% + provincial credits. Works for software, manufacturing, and tech companies.',
          fr: 'Calculateur gratuit de crédit RSDE. Estimez votre crédit d\'impôt R&D canadien en 2 minutes. Fédéral 35% + crédits provinciaux. Pour logiciel, manufacturier et technologie.',
        }}
        canonicalPath="/tools/sred-calculator"
      />

      {/* Navigation */}
      <nav 
        className="sticky top-0 z-50 backdrop-blur-md border-b"
        style={{ 
          backgroundColor: 'rgba(var(--color-bg), 0.9)',
          borderColor: `${primaryColor}20`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ 
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`
                }}
              >
                <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="5" width="3" height="22" rx="1" fill="rgba(255,255,255,0.5)"/>
                  <rect x="8" y="5" width="20" height="22" rx="2" fill="white"/>
                  <path d="M17 21 L20 24 L26 17" stroke={primaryColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="font-bold text-lg" style={{ color: 'rgb(var(--color-text))' }}>PlainLedger</span>
            </Link>

            <div className="flex items-center gap-3">
              <LanguageToggle />
              <ThemeToggle />
              <button
                onClick={handleGetStarted}
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all"
                style={{ 
                  backgroundColor: primaryColor,
                  color: 'white',
                }}
              >
                {isEn ? 'Get Started' : 'Commencer'}
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Calculator */}
          <SREDCalculator />

          {/* FAQ Section */}
          <section className="mt-20">
            <h2 
              className="text-2xl sm:text-3xl font-bold text-center mb-10"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? 'Frequently Asked Questions' : 'Questions fréquentes'}
            </h2>

            <div className="max-w-3xl mx-auto space-y-4">
              {FAQ_ITEMS.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-xl overflow-hidden"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-surface))',
                    border: '1px solid rgb(var(--color-border))',
                  }}
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between"
                  >
                    <span 
                      className="font-medium"
                      style={{ color: 'rgb(var(--color-text))' }}
                    >
                      {isEn ? item.question.en : item.question.fr}
                    </span>
                    <span 
                      className={`transition-transform ${expandedFaq === index ? 'rotate-180' : ''}`}
                      style={{ color: 'rgb(var(--color-text-muted))' }}
                    >
                      ▼
                    </span>
                  </button>
                  
                  {expandedFaq === index && (
                    <div 
                      className="px-6 pb-4"
                      style={{ color: 'rgb(var(--color-text-secondary))' }}
                    >
                      {isEn ? item.answer.en : item.answer.fr}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </section>

          {/* CTA Section */}
          <section className="mt-20">
            <div 
              className="p-8 sm:p-12 rounded-3xl text-center"
              style={{ 
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
              }}
            >
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                {isEn ? 'Need Help With Your SR&ED Claim?' : 'Besoin d\'aide avec votre réclamation RSDE?'}
              </h2>
              <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
                {isEn 
                  ? 'PlainLedger tracks your R&D expenses automatically and helps you prepare SR&ED documentation.'
                  : 'PlainLedger suit automatiquement vos dépenses R&D et vous aide à préparer la documentation RSDE.'}
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={handleGetStarted}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105"
                  style={{ 
                    backgroundColor: 'white',
                    color: primaryColor,
                  }}
                >
                  {isEn ? 'Start Free Trial' : 'Essai gratuit'}
                  <ArrowRight className="w-5 h-5" />
                </button>
                <a
                  href="https://calendly.com/plainledger/sred-consultation"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all border-2 border-white/30 text-white hover:bg-white/10"
                >
                  <Calendar className="w-5 h-5" />
                  {isEn ? 'Book SR&ED Consultation' : 'Réserver consultation RSDE'}
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>

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
                <rect x="4" y="5" width="3" height="22" rx="1" fill="rgba(255,255,255,0.5)"/>
                <rect x="8" y="5" width="20" height="22" rx="2" fill="white"/>
                <path d="M17 21 L20 24 L26 17" stroke={primaryColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>PlainLedger</span>
          </div>
          <div className="flex items-center gap-6 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            <Link to="/privacy" className="hover:underline">{isEn ? 'Privacy' : 'Confidentialité'}</Link>
            <Link to="/terms" className="hover:underline">{isEn ? 'Terms' : 'Conditions'}</Link>
            <Link to="/canada" className="hover:underline">Canada 🇨🇦</Link>
            <Link to="/quebec" className="hover:underline">Québec ⚜️</Link>
          </div>
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            © 2026 PlainLedger 🇨🇦
          </p>
        </div>
      </footer>
    </div>
  );
}
