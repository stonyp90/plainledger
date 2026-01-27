import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/keycloak';
import ThemeToggle from '../components/ThemeToggle';
import { LanguageToggle, useI18n } from '../lib/i18n';
import IndustryKPISection from '../components/IndustryKPISection';
import DemoModal from '../components/DemoModal';
import { 
  ArrowRight,
  Check,
  Shield,
  Play,
  Menu,
  X,
  Lock,
  Database,
  Calculator,
  Info,
  Clock,
} from 'lucide-react';

// Supported integrations
const integrations = ['QuickBooks', 'Xero', 'Sage', 'FreshBooks', 'Wave', 'CSV Import'];

// Theme colors
const colors = {
  light: {
    green: '#10b981',
    greenDark: '#059669',
    greenLight: '#34d399',
    gold: '#d4af37',
    goldDark: '#b8860b',
    goldText: '#8b7355',
    navBg: 'rgba(254, 253, 251, 0.92)',
  },
  dark: {
    green: '#34d399',
    greenDark: '#10b981',
    greenLight: '#6ee7b7',
    gold: '#fbbf24',
    goldDark: '#f59e0b',
    goldText: '#fcd34d',
    navBg: 'rgba(15, 23, 42, 0.92)',
  }
};

// ROI Calculator Section Component
function ROICalculatorSection({ 
  isEn, 
  isDark, 
  theme, 
  onScheduleCall 
}: { 
  isEn: boolean; 
  isDark: boolean; 
  theme: typeof colors.light; 
  onScheduleCall: () => void;
}) {
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(500000);
  const [transactionVolume, setTransactionVolume] = useState<number>(1000);
  
  // ROI calculations based on industry averages
  const estimatedSavings = useMemo(() => {
    const anomalyRate = 0.02; // 2% error rate industry average
    const detectionAccuracy = 0.97; // Our 97% detection rate
    const avgErrorValue = monthlyRevenue * 0.005; // 0.5% of revenue per error
    const errorsPerMonth = Math.floor(transactionVolume * anomalyRate);
    const detectedErrors = Math.floor(errorsPerMonth * detectionAccuracy);
    const monthlySavings = detectedErrors * avgErrorValue;
    const yearlySavings = monthlySavings * 12;
    const timeSavedHours = Math.floor(transactionVolume * 0.02); // 2 min per 100 transactions
    
    return {
      monthlySavings,
      yearlySavings,
      detectedErrors,
      timeSavedHours,
    };
  }, [monthlyRevenue, transactionVolume]);

  return (
    <section 
      id="roi" 
      className="py-16 sm:py-20 px-6 relative"
      style={{ 
        background: isDark 
          ? 'rgba(15, 23, 42, 0.5)' 
          : 'linear-gradient(180deg, rgba(240, 253, 244, 0.6) 0%, rgba(254, 252, 232, 0.4) 50%, rgba(255, 255, 255, 0.8) 100%)'
      }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
            style={{ 
              backgroundColor: `${theme.gold}1a`,
              color: theme.goldDark
            }}
          >
            <Calculator className="w-4 h-4" />
            {isEn ? 'Transparent Pricing' : 'Tarification transparente'}
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Fair Value, Clear Returns' : 'Prix équitable, retours clairs'}
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn 
              ? 'No hidden fees. No surprises. Enterprise-grade data intelligence at 1/3 the cost of traditional solutions.'
              : 'Sans frais cachés. Sans surprises. Intelligence de données enterprise à 1/3 du coût des solutions traditionnelles.'}
          </p>
        </div>

        {/* Calculator Card */}
        <div 
          className="rounded-2xl overflow-hidden shadow-lg"
          style={{ 
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.5)'}`,
          }}
        >
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.5)' }}>
            {/* Input Side */}
            <div className="p-8">
              <h3 className="font-semibold text-lg mb-6" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Your Business' : 'Votre entreprise'}
              </h3>
              
              {/* Monthly Revenue Slider */}
              <div className="mb-8">
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {isEn ? 'Monthly Revenue' : 'Revenus mensuels'}
                  </label>
                  <span className="text-sm font-semibold" style={{ color: theme.green }}>
                    ${monthlyRevenue.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min="50000"
                  max="5000000"
                  step="50000"
                  value={monthlyRevenue}
                  onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ 
                    background: `linear-gradient(to right, ${theme.green} ${((monthlyRevenue - 50000) / 4950000) * 100}%, ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.8)'} ${((monthlyRevenue - 50000) / 4950000) * 100}%)`
                  }}
                />
                <div className="flex justify-between text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  <span>$50K</span>
                  <span>$5M+</span>
                </div>
              </div>
              
              {/* Transaction Volume Slider */}
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {isEn ? 'Monthly Transactions' : 'Transactions mensuelles'}
                  </label>
                  <span className="text-sm font-semibold" style={{ color: theme.green }}>
                    {transactionVolume.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="10000"
                  step="100"
                  value={transactionVolume}
                  onChange={(e) => setTransactionVolume(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ 
                    background: `linear-gradient(to right, ${theme.green} ${((transactionVolume - 100) / 9900) * 100}%, ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.8)'} ${((transactionVolume - 100) / 9900) * 100}%)`
                  }}
                />
                <div className="flex justify-between text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  <span>100</span>
                  <span>10,000+</span>
                </div>
              </div>

              {/* Assumptions Note */}
              <div 
                className="p-3 rounded-lg text-xs"
                style={{ 
                  backgroundColor: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(241, 245, 249, 0.8)',
                  color: 'rgb(var(--color-text-muted))'
                }}
              >
                <Info className="w-3 h-3 inline mr-1" />
                {isEn 
                  ? 'Based on industry average 2% error rate and our 97% detection accuracy'
                  : 'Basé sur le taux d\'erreur moyen de 2% et notre précision de détection de 97%'}
              </div>
            </div>
            
            {/* Results Side */}
            <div className="p-8" style={{ backgroundColor: isDark ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.03)' }}>
              <h3 className="font-semibold text-lg mb-6" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Your Potential Returns' : 'Vos retours potentiels'}
              </h3>
              
              {/* Big Number - Yearly Savings */}
              <div 
                className="p-6 rounded-xl mb-6"
                style={{ backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)' }}
              >
                <div className="text-4xl sm:text-5xl font-bold mb-2" style={{ color: theme.green }}>
                  ${Math.floor(estimatedSavings.yearlySavings).toLocaleString()}
                </div>
                <div className="text-sm font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Estimated annual savings' : 'Économies annuelles estimées'}
                </div>
              </div>
              
              {/* Breakdown */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm flex items-center gap-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    <Shield className="w-3 h-3" style={{ color: theme.green }} />
                    {isEn ? 'Errors detected/month' : 'Erreurs détectées/mois'}
                  </span>
                  <span className="font-semibold" style={{ color: theme.green }}>
                    {estimatedSavings.detectedErrors}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm flex items-center gap-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    <Check className="w-3 h-3" style={{ color: theme.green }} />
                    {isEn ? 'Monthly savings' : 'Économies mensuelles'}
                  </span>
                  <span className="font-semibold" style={{ color: theme.green }}>
                    ${Math.floor(estimatedSavings.monthlySavings).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm flex items-center gap-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    <Clock className="w-3 h-3" style={{ color: theme.goldDark }} />
                    {isEn ? 'Time saved/month' : 'Temps économisé/mois'}
                  </span>
                  <span className="font-semibold" style={{ color: theme.goldDark }}>
                    {estimatedSavings.timeSavedHours}+ {isEn ? 'hours' : 'heures'}
                  </span>
                </div>
              </div>
              
              {/* CTA */}
              <button
                onClick={onScheduleCall}
                className="w-full py-3 rounded-xl font-semibold transition-all hover:scale-105 flex items-center justify-center gap-2"
                style={{ 
                  background: `linear-gradient(135deg, ${theme.gold} 0%, ${theme.goldDark} 100%)`,
                  color: 'white',
                  boxShadow: `0 4px 12px ${theme.gold}40`
                }}
              >
                {isEn ? 'Get Your Free ROI Analysis' : 'Obtenez votre analyse ROI gratuite'}
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <p className="text-center text-xs mt-3" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'No commitment. No surprises.' : 'Sans engagement. Sans surprises.'}
              </p>
            </div>
          </div>
        </div>

        {/* Cost Comparison */}
        <div className="mt-8 grid sm:grid-cols-3 gap-4 text-center">
          <div 
            className="p-4 rounded-xl"
            style={{ 
              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.8)',
              border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.5)'}`
            }}
          >
            <div className="text-2xl font-bold mb-1" style={{ color: 'rgb(var(--color-text-muted))' }}>$50K+/yr</div>
            <div className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Enterprise BI tools' : 'Outils BI enterprise'}</div>
          </div>
          <div 
            className="p-4 rounded-xl"
            style={{ 
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
              border: `2px solid ${theme.green}`
            }}
          >
            <div className="text-2xl font-bold mb-1" style={{ color: theme.green }}>
              1/3 {isEn ? 'the cost' : 'du coût'}
            </div>
            <div className="text-sm font-medium" style={{ color: theme.green }}>PlainLedger</div>
          </div>
          <div 
            className="p-4 rounded-xl"
            style={{ 
              backgroundColor: isDark ? 'rgba(251, 191, 36, 0.1)' : 'rgba(251, 191, 36, 0.08)',
              border: `1px solid ${theme.gold}40`
            }}
          >
            <div className="text-2xl font-bold mb-1" style={{ color: theme.goldDark }}>340%+</div>
            <div className="text-sm" style={{ color: theme.goldDark }}>{isEn ? 'Avg first-year ROI' : 'ROI moy. an 1'}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  const { login, register, authenticated } = useAuth();
  const { language } = useI18n();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);

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

  const handleScheduleCall = () => {
    window.open('https://calendly.com/plainledger/discovery', '_blank');
  };

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{ 
        background: isDark 
          ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)'
          : 'linear-gradient(135deg, #fefefe 0%, #f0fdf4 25%, #f8fafc 50%, #fef3c7 75%, #fefefe 100%)'
      }}
    >
      {/* Decorative background gradients - Light theme */}
      {!isDark && (
        <>
          <div 
            className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full pointer-events-none"
            style={{ 
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 60%)',
              transform: 'translate(20%, -30%)'
            }}
          />
          <div 
            className="absolute top-1/3 left-0 w-[600px] h-[600px] rounded-full pointer-events-none"
            style={{ 
              background: 'radial-gradient(circle, rgba(251, 191, 36, 0.06) 0%, transparent 60%)',
              transform: 'translate(-30%, 0%)'
            }}
          />
          <div 
            className="absolute bottom-1/4 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{ 
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 60%)',
              transform: 'translate(30%, 20%)'
            }}
          />
        </>
      )}
      
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
              <a href="#industries" className="text-sm font-medium hover:text-primary transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Industries' : 'Industries'}
              </a>
              <a href="#integrations" className="text-sm font-medium hover:text-primary transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Integrations' : 'Intégrations'}
              </a>
              <a href="#pricing" className="text-sm font-medium hover:text-primary transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Pricing' : 'Tarifs'}
              </a>
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
                    onClick={() => register()}
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
                <a href="#industries" className="text-sm font-medium py-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Industries' : 'Industries'}
                </a>
                <a href="#integrations" className="text-sm font-medium py-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Integrations' : 'Intégrations'}
                </a>
                <a href="#pricing" className="text-sm font-medium py-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Pricing' : 'Tarifs'}
                </a>
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

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-16 px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Headline */}
          <h1 
            className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? (
              <>
                <span style={{ color: theme.green }}>
                  No Surprises.
                </span>{' '}
                <span>Just Numbers.</span>
              </>
            ) : (
              <>
                <span style={{ color: theme.green }}>
                  Pas de surprises.
                </span>{' '}
                <span>Juste des chiffres.</span>
              </>
            )}
          </h1>

          {/* Tagline */}
          <p 
            className="text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-8"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            {isEn 
              ? 'Industry-specific KPIs that actually matter. Compare your performance against real Canadian benchmarks and make data-driven decisions.'
              : 'Des KPIs spécifiques à votre industrie qui comptent vraiment. Comparez vos performances aux références canadiennes et prenez des décisions basées sur les données.'}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button 
              onClick={() => register()}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all hover:scale-105"
              style={{ 
                background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                color: 'white',
                boxShadow: `0 4px 16px ${theme.green}4d`
              }}
            >
              {isEn ? 'Start free 21-day trial' : 'Essai gratuit de 21 jours'}
              <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setShowDemoModal(true)}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all hover:scale-105"
              style={{ 
                border: `2px solid ${theme.green}`,
                color: isDark ? theme.green : theme.greenDark,
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255,255,255,0.8)'
              }}
            >
              <Play className="w-4 h-4" />
              {isEn ? 'Watch demo' : 'Voir la démo'}
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center items-center gap-6 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4" style={{ color: theme.green }} />
              {isEn ? 'No credit card required' : 'Aucune carte de crédit'}
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4" style={{ color: theme.green }} />
              {isEn ? 'Setup in 5 minutes' : 'Configuration en 5 min'}
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4" style={{ color: theme.green }} />
              {isEn ? 'Data stays in Canada' : 'Données au Canada'} 🇨🇦
            </span>
          </div>
        </div>
      </section>

      {/* Industry KPIs Section - Prominently displayed */}
      <section id="industries">
        <IndustryKPISection onScheduleCall={handleScheduleCall} />
      </section>

      {/* Fair Value, Clear Returns - ROI Calculator */}
      <ROICalculatorSection isEn={isEn} isDark={isDark} theme={theme} onScheduleCall={handleScheduleCall} />

      {/* Integrations & Security Section */}
      <section 
        id="integrations" 
        className="py-16 sm:py-20 px-6 relative"
        style={{ 
          background: isDark 
            ? 'transparent' 
            : 'linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%)'
        }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Integrations */}
            <div 
              className="p-8 rounded-2xl"
              style={{ 
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255,255,255,0.9)',
                border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.5)'}`
              }}
            >
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{ backgroundColor: `${theme.green}15` }}
              >
                <Database className="w-6 h-6" style={{ color: theme.green }} />
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Connect your accounting software' : 'Connectez votre logiciel comptable'}
              </h3>
              <p className="mb-4" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn 
                  ? 'We integrate with the tools you already use. Import your data in minutes.'
                  : 'Nous intégrons les outils que vous utilisez déjà. Importez vos données en minutes.'}
              </p>
              <ul className="space-y-2">
                {integrations.map((name) => (
                  <li 
                    key={name}
                    className="flex items-center gap-2 text-sm"
                    style={{ color: 'rgb(var(--color-text-secondary))' }}
                  >
                    <Check className="w-4 h-4" style={{ color: theme.green }} />
                    {name}
                  </li>
                ))}
              </ul>
            </div>

            {/* Security */}
            <div 
              className="p-8 rounded-2xl"
              style={{ 
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255,255,255,0.9)',
                border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.5)'}`
              }}
            >
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{ backgroundColor: `${theme.gold}15` }}
              >
                <Lock className="w-6 h-6" style={{ color: theme.goldDark }} />
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Enterprise-grade security' : 'Sécurité de niveau entreprise'}
              </h3>
              <p className="mb-4" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn 
                  ? 'Your financial data is protected with bank-level encryption and stays in Canada.'
                  : 'Vos données financières sont protégées par un chiffrement bancaire et restent au Canada.'}
              </p>
              <ul className="space-y-2">
                {[
                  { en: 'AES-256 encryption', fr: 'Chiffrement AES-256' },
                  { en: 'Data residency in Canada', fr: 'Résidence des données au Canada' },
                  { en: 'Role-based access control', fr: 'Contrôle d\'accès par rôle' },
                  { en: 'Automated backups', fr: 'Sauvegardes automatiques' },
                  { en: 'Audit logs', fr: 'Journaux d\'audit' },
                ].map((item) => (
                  <li 
                    key={item.en}
                    className="flex items-center gap-2 text-sm"
                    style={{ color: 'rgb(var(--color-text-secondary))' }}
                  >
                    <Shield className="w-4 h-4" style={{ color: theme.goldDark }} />
                    {isEn ? item.en : item.fr}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section 
        id="pricing" 
        className="py-16 sm:py-20 px-6 relative"
        style={{ 
          background: isDark 
            ? 'transparent' 
            : 'linear-gradient(180deg, rgba(248, 250, 252, 0.5) 0%, rgba(240, 253, 244, 0.3) 50%, rgba(255, 255, 255, 0.9) 100%)'
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 
            className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'Simple, transparent pricing' : 'Tarification simple et transparente'}
          </h2>
          <p 
            className="text-lg mb-12 max-w-2xl mx-auto"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            {isEn 
              ? 'Get a personalized quote based on your business needs. No hidden fees.'
              : 'Obtenez une soumission personnalisée selon vos besoins. Sans frais cachés.'}
          </p>

          {/* Pricing Cards */}
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                name: 'Essentiel',
                descEn: 'For growing businesses',
                descFr: 'Pour entreprises en croissance',
                featuresEn: ['Industry-specific KPIs', 'Anomaly detection', 'Monthly reports'],
                featuresFr: ['KPIs par industrie', 'Détection d\'anomalies', 'Rapports mensuels'],
                highlighted: false,
              },
              {
                name: 'Professionnel',
                descEn: 'For mid-market companies',
                descFr: 'Pour entreprises de taille moyenne',
                featuresEn: ['Everything in Essentiel', 'Custom dashboards', 'Priority support'],
                featuresFr: ['Tout de Essentiel', 'Tableaux de bord personnalisés', 'Support prioritaire'],
                highlighted: true,
              },
              {
                name: 'Premium',
                descEn: 'For established enterprises',
                descFr: 'Pour entreprises établies',
                featuresEn: ['Everything in Pro', 'Dedicated success manager', 'Custom integrations'],
                featuresFr: ['Tout de Pro', 'Gestionnaire dédié', 'Intégrations personnalisées'],
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
                  onClick={handleScheduleCall}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                  style={{ 
                    background: tier.highlighted 
                      ? `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`
                      : 'transparent',
                    color: tier.highlighted ? 'white' : isDark ? theme.green : theme.greenDark,
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

      {/* Final CTA */}
      <section className="py-16 sm:py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div 
            className="text-center p-10 sm:p-14 rounded-3xl relative overflow-hidden"
            style={{ 
              background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
              boxShadow: `0 8px 32px ${theme.green}40`
            }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
              {isEn ? 'Ready to see your data clearly?' : 'Prêt à voir vos données clairement?'}
            </h2>
            <p className="text-lg mb-8 text-white/90">
              {isEn 
                ? 'Join Canadian businesses who trust PlainLedger for complete financial transparency.'
                : 'Rejoignez les entreprises canadiennes qui font confiance à PlainLedger.'}
            </p>
            <button 
              onClick={() => register()}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105"
              style={{ 
                background: `linear-gradient(135deg, ${theme.gold} 0%, ${theme.goldDark} 100%)`,
                color: 'white',
                boxShadow: `0 4px 16px ${theme.gold}66`
              }}
            >
              {isEn ? 'Start free 21-day trial' : 'Essai gratuit de 21 jours'}
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-sm mt-4 text-white/80">
              {isEn ? 'No credit card required' : 'Aucune carte de crédit requise'}
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
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
            <a href="/privacy" className="transition-colors hover:underline">{isEn ? 'Privacy' : 'Confidentialité'}</a>
            <a href="/terms" className="transition-colors hover:underline">{isEn ? 'Terms' : 'Conditions'}</a>
            <a href="mailto:info@plainledger.ca" className="transition-colors hover:underline">Contact</a>
          </div>
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            © 2026 PlainLedger 🇨🇦
          </p>
        </div>
      </footer>

      {/* Demo Modal */}
      <DemoModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        isEn={isEn}
        onStartTrial={() => {
          setShowDemoModal(false);
          register();
        }}
      />
    </div>
  );
}
