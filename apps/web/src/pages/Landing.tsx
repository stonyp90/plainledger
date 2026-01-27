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
  Sparkles,
  Cpu,
  FileCheck,
  Layers,
  Zap,
  TrendingUp,
  Eye,
  RefreshCw,
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
            {isEn ? 'ROI Calculator' : 'Calculateur ROI'}
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Calculate Your Potential Savings' : 'Calculez vos économies potentielles'}
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn 
              ? 'See how much you could save with automated anomaly detection and industry benchmarking.'
              : 'Découvrez combien vous pourriez économiser avec la détection automatisée d\'anomalies et le benchmarking sectoriel.'}
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
    window.open('https://calendly.com/anthonypaquet1508', '_blank');
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
      <section className="pt-20 sm:pt-24 lg:pt-28 pb-8 sm:pb-12 px-4 sm:px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Headline */}
          <h1 
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4 sm:mb-6"
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
            className="text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-6 sm:mb-8 px-2"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            {isEn 
              ? 'Exec-ready dashboards with industry KPIs, OKRs, strategic projections, and AI-optimized financial modeling. Built for Canadian businesses.'
              : 'Tableaux de bord prêts pour la direction avec KPIs sectoriels, OKRs, projections stratégiques et modélisation financière optimisée par IA. Conçu pour les entreprises canadiennes.'}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-6 sm:mb-8">
            <button 
              onClick={() => register()}
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold transition-all hover:scale-105 text-sm sm:text-base"
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
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold transition-all hover:scale-105 text-sm sm:text-base"
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
          <div className="w-full flex justify-center">
            <div className="inline-flex flex-wrap justify-center items-center gap-3 sm:gap-6 text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              <span className="flex items-center gap-1.5 sm:gap-2">
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: theme.green }} />
                {isEn ? 'No credit card' : 'Sans carte de crédit'}
              </span>
              <span className="flex items-center gap-1.5 sm:gap-2">
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: theme.green }} />
                {isEn ? '5 min setup' : '5 min config'}
              </span>
              <span className="flex items-center gap-1.5 sm:gap-2">
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: theme.green }} />
                {isEn ? 'Data in Canada' : 'Données au Canada'} 🇨🇦
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Industry KPIs Section */}
      <section id="industries" className="py-8 sm:py-12 lg:py-16">
        <IndustryKPISection onScheduleCall={handleScheduleCall} />
      </section>

      {/* Fair Value, Clear Returns - ROI Calculator */}
      <ROICalculatorSection isEn={isEn} isDark={isDark} theme={theme} onScheduleCall={handleScheduleCall} />

      {/* How It Works - Interactive Timeline Pipeline */}
      <section 
        id="pipeline" 
        className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 relative overflow-hidden"
        style={{ 
          background: isDark 
            ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.8) 100%)' 
            : 'linear-gradient(180deg, #fafafa 0%, #f0fdf4 30%, #fefce8 70%, #fafafa 100%)'
        }}
      >
        <style>{`
          @keyframes pulse-ring {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(1.8); opacity: 0; }
          }
          @keyframes data-flow {
            0% { transform: translateY(0); opacity: 0; }
            20% { opacity: 1; }
            80% { opacity: 1; }
            100% { transform: translateY(100px); opacity: 0; }
          }
          @keyframes connector-pulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
          }
          @keyframes float-particle {
            0%, 100% { transform: translateY(0) translateX(0); }
            25% { transform: translateY(-10px) translateX(5px); }
            50% { transform: translateY(-5px) translateX(-5px); }
            75% { transform: translateY(-15px) translateX(3px); }
          }
          .timeline-step {
            opacity: 0;
            transform: translateX(-30px);
            transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .timeline-step.visible {
            opacity: 1;
            transform: translateX(0);
          }
          .timeline-step:nth-child(even) {
            transform: translateX(30px);
          }
          .timeline-step:nth-child(even).visible {
            transform: translateX(0);
          }
          .timeline-connector {
            transition: all 0.6s ease;
          }
          .timeline-connector.active {
            height: 100%;
          }
          .step-node {
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .step-node:hover {
            transform: scale(1.1);
          }
          .step-card {
            transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .step-card:hover {
            transform: translateY(-8px) scale(1.02);
          }
          .data-particle {
            position: absolute;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            animation: float-particle 3s ease-in-out infinite;
          }
        `}</style>

        <div className="max-w-5xl mx-auto relative z-10">
          {/* Section Header */}
          <div className="text-center mb-10 sm:mb-14 lg:mb-16">
            <div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold mb-4"
              style={{ 
                background: `linear-gradient(135deg, ${theme.green}20 0%, ${theme.green}10 100%)`,
                border: `1px solid ${theme.green}30`,
                color: theme.greenDark
              }}
            >
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {isEn ? 'How It Works' : 'Comment ça fonctionne'}
            </div>
            <h2 
              className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? 'Your Data Journey' : 'Le parcours de vos données'}
            </h2>
            <p 
              className="text-sm sm:text-base lg:text-lg max-w-xl mx-auto px-2"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'Watch your data transform through our intelligent pipeline'
                : 'Suivez la transformation de vos données dans notre pipeline intelligent'}
            </p>
          </div>

          {/* Interactive Timeline */}
          <div className="relative">
            {/* Central Timeline Line */}
            <div 
              className="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 hidden md:block"
              style={{ 
                background: `linear-gradient(180deg, ${theme.green} 0%, ${theme.green} 50%, ${theme.gold} 100%)`,
                borderRadius: '4px'
              }}
            >
              {/* Animated particles flowing down */}
              {[0, 1, 2, 3, 4].map((i) => (
                <div 
                  key={i}
                  className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
                  style={{ 
                    background: i < 2 ? theme.green : theme.gold,
                    boxShadow: `0 0 10px ${i < 2 ? theme.green : theme.gold}`,
                    animation: `data-flow 4s linear infinite ${i * 0.8}s`
                  }}
                />
              ))}
            </div>

            {/* Timeline Steps */}
            <div className="space-y-6 md:space-y-0">
              
              {/* Step 1 - Connect */}
              <div className="timeline-step visible md:grid md:grid-cols-2 md:gap-6 lg:gap-8 md:items-center pb-6 md:pb-12 lg:pb-16">
                <div className="md:text-right md:pr-8 lg:pr-12 order-1">
                  <div 
                    className="step-card inline-block p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl text-left md:text-right w-full"
                    style={{ 
                      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                      border: `2px solid ${theme.green}30`,
                      boxShadow: isDark ? `0 8px 32px rgba(0,0,0,0.3)` : `0 8px 40px ${theme.green}15`
                    }}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 md:justify-end">
                      <div 
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center"
                        style={{ 
                          background: `linear-gradient(135deg, ${theme.green}25 0%, ${theme.green}10 100%)`,
                          border: `2px solid ${theme.green}30`
                        }}
                      >
                        <Database className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: theme.green }} />
                      </div>
                      <span 
                        className="text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2 sm:px-3 py-1 rounded-full"
                        style={{ backgroundColor: `${theme.green}15`, color: theme.green }}
                      >
                        {isEn ? 'Step 1' : 'Étape 1'}
                      </span>
                    </div>
                    <h4 className="text-lg sm:text-xl font-bold mb-1.5 sm:mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'Connect Your Software' : 'Connectez votre logiciel'}
                    </h4>
                    <p className="text-xs sm:text-sm mb-3" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      {isEn 
                        ? 'Securely link your accounting software with bank-level encryption.'
                        : 'Liez votre logiciel comptable avec un chiffrement bancaire.'}
                    </p>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 md:justify-end">
                      {['QuickBooks', 'Xero', 'Sage', 'Wave'].map((name) => (
                        <span 
                          key={name} 
                          className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-full font-medium"
                          style={{ 
                            backgroundColor: `${theme.green}10`,
                            color: theme.greenDark,
                            border: `1px solid ${theme.green}20`
                          }}
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Node */}
                <div className="hidden md:flex items-center justify-start order-2 relative">
                  <div 
                    className="step-node absolute -left-6 w-12 h-12 rounded-full flex items-center justify-center z-10"
                    style={{ 
                      background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                      boxShadow: `0 0 20px ${theme.green}60`
                    }}
                  >
                    <span className="text-white font-bold text-lg">1</span>
                    {/* Pulse ring */}
                    <div 
                      className="absolute inset-0 rounded-full"
                      style={{ 
                        border: `2px solid ${theme.green}`,
                        animation: 'pulse-ring 2s ease-out infinite'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Step 2 - Sanitize */}
              <div className="timeline-step visible md:grid md:grid-cols-2 md:gap-6 lg:gap-8 md:items-center pb-6 md:pb-12 lg:pb-16">
                {/* Node */}
                <div className="hidden md:flex items-center justify-end order-1 relative">
                  <div 
                    className="step-node absolute -right-5 lg:-right-6 w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center z-10"
                    style={{ 
                      background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                      boxShadow: `0 0 20px ${theme.green}60`
                    }}
                  >
                    <span className="text-white font-bold text-base lg:text-lg">2</span>
                    <div 
                      className="absolute inset-0 rounded-full"
                      style={{ 
                        border: `2px solid ${theme.green}`,
                        animation: 'pulse-ring 2s ease-out infinite 0.5s'
                      }}
                    />
                  </div>
                </div>
                <div className="md:pl-8 lg:pl-12 order-2">
                  <div 
                    className="step-card p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl"
                    style={{ 
                      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                      border: `2px solid ${theme.green}40`,
                      boxShadow: isDark ? `0 8px 32px rgba(0,0,0,0.3)` : `0 8px 40px ${theme.green}20`
                    }}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 mb-3">
                      <div 
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center"
                        style={{ 
                          background: `linear-gradient(135deg, ${theme.green}30 0%, ${theme.green}15 100%)`,
                          border: `2px solid ${theme.green}40`
                        }}
                      >
                        <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: theme.green }} />
                      </div>
                      <span 
                        className="text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2 sm:px-3 py-1 rounded-full"
                        style={{ backgroundColor: `${theme.green}15`, color: theme.green }}
                      >
                        {isEn ? 'Step 2' : 'Étape 2'}
                      </span>
                    </div>
                    <h4 className="text-lg sm:text-xl font-bold mb-1.5 sm:mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'Data Lake & Sanitization' : 'Lac de données & Nettoyage'}
                    </h4>
                    <p className="text-xs sm:text-sm mb-3" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      {isEn 
                        ? 'Data cleaned, normalized, and stored in our secure Canadian data lake.'
                        : 'Données nettoyées, normalisées et stockées dans notre lac de données canadien.'}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      {[
                        { icon: FileCheck, en: 'Duplicate removal', fr: 'Suppression doublons' },
                        { icon: Layers, en: 'Normalization', fr: 'Normalisation' },
                        { icon: Shield, en: 'Validation', fr: 'Validation' },
                        { icon: Lock, en: 'Encrypted', fr: 'Chiffré' },
                      ].map((item) => (
                        <div 
                          key={item.en} 
                          className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs p-1.5 sm:p-2 rounded-md sm:rounded-lg"
                          style={{ backgroundColor: `${theme.green}08` }}
                        >
                          <item.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" style={{ color: theme.green }} />
                          <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? item.en : item.fr}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 - AI Analysis */}
              <div className="timeline-step visible md:grid md:grid-cols-2 md:gap-6 lg:gap-8 md:items-center pb-6 md:pb-12 lg:pb-16">
                <div className="md:text-right md:pr-8 lg:pr-12 order-1">
                  <div 
                    className="step-card inline-block p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl text-left md:text-right w-full"
                    style={{ 
                      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                      border: `2px solid ${theme.gold}40`,
                      boxShadow: isDark ? `0 8px 32px rgba(0,0,0,0.3)` : `0 8px 40px ${theme.gold}20`
                    }}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 md:justify-end">
                      <div 
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center"
                        style={{ 
                          background: `linear-gradient(135deg, ${theme.gold}30 0%, ${theme.gold}15 100%)`,
                          border: `2px solid ${theme.gold}40`
                        }}
                      >
                        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: theme.goldDark }} />
                      </div>
                      <span 
                        className="text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2 sm:px-3 py-1 rounded-full"
                        style={{ backgroundColor: `${theme.gold}15`, color: theme.goldDark }}
                      >
                        {isEn ? 'Step 3' : 'Étape 3'}
                      </span>
                    </div>
                    <h4 className="text-lg sm:text-xl font-bold mb-1.5 sm:mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'AI-Powered Analysis' : 'Analyse propulsée par l\'IA'}
                    </h4>
                    <p className="text-xs sm:text-sm mb-3" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      {isEn 
                        ? 'ML models analyze your data to detect anomalies and predict trends.'
                        : 'Modèles ML analysent vos données pour détecter anomalies et prédire tendances.'}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2 md:justify-items-end">
                      {[
                        { icon: Zap, en: '97% accuracy', fr: 'Précision 97%' },
                        { icon: TrendingUp, en: 'Predictions', fr: 'Prédictions' },
                        { icon: Cpu, en: 'Industry AI', fr: 'IA sectorielle' },
                        { icon: Eye, en: 'Patterns', fr: 'Motifs' },
                      ].map((item) => (
                        <div 
                          key={item.en} 
                          className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs p-1.5 sm:p-2 rounded-md sm:rounded-lg"
                          style={{ backgroundColor: `${theme.gold}08` }}
                        >
                          <item.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" style={{ color: theme.goldDark }} />
                          <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? item.en : item.fr}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Node */}
                <div className="hidden md:flex items-center justify-start order-2 relative">
                  <div 
                    className="step-node absolute -left-6 w-12 h-12 rounded-full flex items-center justify-center z-10"
                    style={{ 
                      background: `linear-gradient(135deg, ${theme.gold} 0%, ${theme.goldDark} 100%)`,
                      boxShadow: `0 0 20px ${theme.gold}60`
                    }}
                  >
                    <span className="text-white font-bold text-lg">3</span>
                    <div 
                      className="absolute inset-0 rounded-full"
                      style={{ 
                        border: `2px solid ${theme.gold}`,
                        animation: 'pulse-ring 2s ease-out infinite 1s'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Step 4 - Dashboard */}
              <div className="timeline-step visible md:grid md:grid-cols-2 md:gap-6 lg:gap-8 md:items-center">
                {/* Node */}
                <div className="hidden md:flex items-center justify-end order-1 relative">
                  <div 
                    className="step-node absolute -right-5 lg:-right-6 w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center z-10"
                    style={{ 
                      background: `linear-gradient(135deg, ${theme.gold} 0%, ${theme.goldDark} 100%)`,
                      boxShadow: `0 0 20px ${theme.gold}60`
                    }}
                  >
                    <span className="text-white font-bold text-base lg:text-lg">4</span>
                    <div 
                      className="absolute inset-0 rounded-full"
                      style={{ 
                        border: `2px solid ${theme.gold}`,
                        animation: 'pulse-ring 2s ease-out infinite 1.5s'
                      }}
                    />
                  </div>
                </div>
                <div className="md:pl-8 lg:pl-12 order-2">
                  <div 
                    className="step-card p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl"
                    style={{ 
                      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                      border: `2px solid ${theme.gold}50`,
                      boxShadow: isDark ? `0 8px 32px rgba(0,0,0,0.3)` : `0 8px 40px ${theme.gold}25`
                    }}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 mb-3">
                      <div 
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center"
                        style={{ 
                          background: `linear-gradient(135deg, ${theme.gold}35 0%, ${theme.gold}20 100%)`,
                          border: `2px solid ${theme.gold}50`
                        }}
                      >
                        <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: theme.goldDark }} />
                      </div>
                      <span 
                        className="text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2 sm:px-3 py-1 rounded-full"
                        style={{ backgroundColor: `${theme.gold}20`, color: theme.goldDark }}
                      >
                        {isEn ? 'Step 4' : 'Étape 4'}
                      </span>
                    </div>
                    <h4 className="text-lg sm:text-xl font-bold mb-1.5 sm:mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'Exec-Ready Dashboard' : 'Tableau de bord exécutif'}
                    </h4>
                    <p className="text-xs sm:text-sm mb-3" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      {isEn 
                        ? 'KPIs, OKRs, and strategic projections ready for leadership.'
                        : 'KPIs, OKRs et projections stratégiques prêts pour la direction.'}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      {[
                        { icon: Eye, en: 'KPIs & OKRs', fr: 'KPIs & OKRs' },
                        { icon: TrendingUp, en: 'Strategic', fr: 'Stratégie' },
                        { icon: Calculator, en: 'Montage fin.', fr: 'Montage fin.' },
                        { icon: Sparkles, en: 'AI insights', fr: 'Insights IA' },
                      ].map((item) => (
                        <div 
                          key={item.en} 
                          className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs p-1.5 sm:p-2 rounded-md sm:rounded-lg"
                          style={{ backgroundColor: `${theme.gold}10` }}
                        >
                          <item.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" style={{ color: theme.goldDark }} />
                          <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? item.en : item.fr}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-8 sm:mt-12">
            <button 
              onClick={() => setShowDemoModal(true)}
              className="inline-flex items-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold text-white transition-all hover:scale-105 text-sm sm:text-base"
              style={{ 
                background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
                boxShadow: `0 8px 24px ${theme.green}40`
              }}
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5" />
              {isEn ? 'See it in action' : 'Voir en action'}
            </button>
          </div>
        </div>
      </section>

      {/* AI & Security Features Section */}
      <section 
        id="integrations" 
        className="py-10 sm:py-14 lg:py-16 px-4 sm:px-6 relative"
        style={{ 
          background: isDark 
            ? 'transparent' 
            : 'linear-gradient(180deg, rgba(248, 250, 252, 0.9) 0%, rgba(255, 255, 255, 0.95) 100%)'
        }}
      >
        <div className="max-w-5xl mx-auto">
          {/* AI & Security Features */}
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {/* AI-Powered Intelligence */}
            <div 
              className="p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl"
              style={{ 
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.95)',
                border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(251, 191, 36, 0.3)'}`,
                boxShadow: isDark ? 'none' : '0 4px 24px rgba(251, 191, 36, 0.08)'
              }}
            >
              <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div 
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ 
                    background: `linear-gradient(135deg, ${theme.gold}25 0%, ${theme.gold}10 100%)`,
                  }}
                >
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: theme.goldDark }} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg lg:text-xl font-semibold mb-0.5 sm:mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? 'AI-Optimized for Your Industry' : 'IA optimisée pour votre industrie'}
                  </h3>
                  <p className="text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {isEn 
                      ? 'Industry-specific models for accurate insights'
                      : 'Modèles spécifiques pour des insights précis'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {[
                  { icon: TrendingUp, en: 'Strategic projections', fr: 'Projections' },
                  { icon: Zap, en: 'Montage financier', fr: 'Montage fin.' },
                  { icon: Eye, en: 'KPIs & OKRs', fr: 'KPIs & OKRs' },
                  { icon: Cpu, en: 'Benchmarks', fr: 'Références' },
                ].map((item) => (
                  <div 
                    key={item.en}
                    className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-md sm:rounded-lg"
                    style={{ 
                      backgroundColor: isDark ? 'rgba(251, 191, 36, 0.08)' : 'rgba(251, 191, 36, 0.06)',
                    }}
                  >
                    <item.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: theme.goldDark }} />
                    <span className="text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      {isEn ? item.en : item.fr}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Security & Compliance */}
            <div 
              className="p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl"
              style={{ 
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.95)',
                border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(16, 185, 129, 0.3)'}`,
                boxShadow: isDark ? 'none' : '0 4px 24px rgba(16, 185, 129, 0.08)'
              }}
            >
              <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div 
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ 
                    background: `linear-gradient(135deg, ${theme.green}25 0%, ${theme.green}10 100%)`,
                  }}
                >
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: theme.green }} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg lg:text-xl font-semibold mb-0.5 sm:mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? 'Enterprise Security' : 'Sécurité Enterprise'}
                  </h3>
                  <p className="text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {isEn 
                      ? 'Bank-level protection for your data'
                      : 'Protection bancaire pour vos données'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {[
                  { icon: Lock, en: 'AES-256', fr: 'AES-256' },
                  { icon: Database, en: 'Canada 🇨🇦', fr: 'Canada 🇨🇦' },
                  { icon: Shield, en: 'RBAC', fr: 'RBAC' },
                  { icon: FileCheck, en: 'Audit trail', fr: 'Audit' },
                ].map((item) => (
                  <div 
                    key={item.en}
                    className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-md sm:rounded-lg"
                    style={{ 
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.06)',
                    }}
                  >
                    <item.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: theme.green }} />
                    <span className="text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      {isEn ? item.en : item.fr}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Supported Integrations Bar */}
          <div className="mt-8 sm:mt-10 lg:mt-12 text-center max-w-2xl mx-auto">
            <p className="text-xs sm:text-sm font-medium mb-3 sm:mb-4 mx-auto" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Seamless integrations with your favorite tools' : 'Intégrations fluides avec vos outils préférés'}
            </p>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {integrations.map((name) => (
                <div 
                  key={name}
                  className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2"
                  style={{ 
                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                    border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(203, 213, 225, 0.6)'}`,
                    color: 'rgb(var(--color-text-secondary))'
                  }}
                >
                  <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" style={{ color: theme.green }} />
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section 
        id="pricing" 
        className="py-10 sm:py-14 lg:py-16 px-4 sm:px-6 relative"
        style={{ 
          background: isDark 
            ? 'transparent' 
            : 'linear-gradient(180deg, rgba(248, 250, 252, 0.5) 0%, rgba(240, 253, 244, 0.3) 50%, rgba(255, 255, 255, 0.9) 100%)'
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 
            className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'Simple, transparent pricing' : 'Tarification simple et transparente'}
          </h2>
          <p 
            className="text-sm sm:text-base lg:text-lg mb-8 sm:mb-10 lg:mb-12 max-w-xl mx-auto px-2"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            {isEn 
              ? 'Get a personalized quote based on your business needs.'
              : 'Obtenez une soumission selon vos besoins.'}
          </p>

          {/* Pricing Cards */}
          <div className="grid sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {[
              {
                name: 'Essentiel',
                descEn: 'Growing businesses',
                descFr: 'Entreprises en croissance',
                featuresEn: ['Industry KPIs', 'Anomaly detection', 'Monthly reports'],
                featuresFr: ['KPIs sectoriels', 'Détection anomalies', 'Rapports mensuels'],
                highlighted: false,
              },
              {
                name: 'Pro',
                descEn: 'Mid-market companies',
                descFr: 'Entreprises moyennes',
                featuresEn: ['All Essentiel +', 'Custom dashboards', 'Priority support'],
                featuresFr: ['Tout Essentiel +', 'Dashboards custom', 'Support prioritaire'],
                highlighted: true,
              },
              {
                name: 'Premium',
                descEn: 'Established enterprises',
                descFr: 'Entreprises établies',
                featuresEn: ['All Pro +', 'Dedicated manager', 'Custom integrations'],
                featuresFr: ['Tout Pro +', 'Gestionnaire dédié', 'Intégrations custom'],
                highlighted: false,
              },
            ].map((tier) => (
              <div 
                key={tier.name}
                className="p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl text-left relative overflow-hidden"
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
                    className="absolute top-0 right-0 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold"
                    style={{ 
                      backgroundColor: theme.green,
                      color: 'white',
                      borderBottomLeftRadius: '6px'
                    }}
                  >
                    {isEn ? 'Popular' : 'Populaire'}
                  </div>
                )}
                <h3 className="font-semibold text-base sm:text-lg mb-0.5 sm:mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                  {tier.name}
                </h3>
                <p className="text-xs sm:text-sm mb-3 sm:mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? tier.descEn : tier.descFr}
                </p>
                <ul className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6">
                  {(isEn ? tier.featuresEn : tier.featuresFr).map((feature) => (
                    <li key={feature} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: theme.green }} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={handleScheduleCall}
                  className="w-full py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all hover:scale-105"
                  style={{ 
                    background: tier.highlighted 
                      ? `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`
                      : 'transparent',
                    color: tier.highlighted ? 'white' : isDark ? theme.green : theme.greenDark,
                    border: tier.highlighted ? 'none' : `2px solid ${theme.green}`,
                  }}
                >
                  {isEn ? 'Get quote' : 'Soumission'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-10 sm:py-14 lg:py-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div 
            className="text-center p-6 sm:p-10 lg:p-12 rounded-2xl sm:rounded-3xl relative overflow-hidden"
            style={{ 
              background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`,
              boxShadow: `0 8px 32px ${theme.green}40`
            }}
          >
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 sm:mb-4 text-white">
              {isEn ? 'Ready to see your data clearly?' : 'Prêt à voir vos données clairement?'}
            </h2>
            <p className="text-sm sm:text-base lg:text-lg mb-4 sm:mb-6 text-white/90 max-w-lg mx-auto">
              {isEn 
                ? 'Join Canadian businesses who trust PlainLedger.'
                : 'Rejoignez les entreprises canadiennes qui font confiance à PlainLedger.'}
            </p>
            <button 
              onClick={() => register()}
              className="inline-flex items-center gap-2 px-5 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base lg:text-lg transition-all hover:scale-105"
              style={{ 
                background: `linear-gradient(135deg, ${theme.gold} 0%, ${theme.goldDark} 100%)`,
                color: 'white',
                boxShadow: `0 4px 16px ${theme.gold}66`
              }}
            >
              {isEn ? 'Start free trial' : 'Essai gratuit'}
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <p className="text-xs sm:text-sm mt-3 sm:mt-4 text-white/80 text-center">
              {isEn ? 'No credit card required' : 'Sans carte de crédit'}
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer 
        className="py-6 sm:py-8 px-4 sm:px-6 border-t"
        style={{ borderColor: `${theme.green}1a` }}
      >
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center"
              style={{ 
                background: `linear-gradient(135deg, ${theme.green} 0%, ${theme.greenDark} 100%)`
              }}
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="5" width="3" height="22" rx="1" fill="rgba(255,255,255,0.5)"/>
                <rect x="8" y="5" width="20" height="22" rx="2" fill="white"/>
                <path d="M17 21 L20 24 L26 17" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-medium text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text))' }}>PlainLedger</span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
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
