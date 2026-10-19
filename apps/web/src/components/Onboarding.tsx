/**
 * Onboarding Component
 * Multi-step wizard for new user onboarding
 * Integrates with analytics and CRM for tracking
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  ChevronRight,
  ChevronLeft,
  X,
  BarChart3,
  Menu,
  ExternalLink,
  UtensilsCrossed,
  Hotel,
  ShoppingBag,
  Hammer,
  Briefcase,
  Factory,
  Truck,
  Heart,
  GraduationCap,
  Wheat,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../lib/keycloak';
import { useI18n, LanguageToggle } from '../lib/i18n';
import ThemeToggle from './ThemeToggle';
import { analytics, type OnboardingStep } from '../lib/analytics';
import { crmService } from '../lib/crm';
import { getAllIndustries, getIndustryTemplate } from '../lib/industries';
import { getKPIsForIndustry } from '../lib/industryKPIs';
import { useTenant, type Tenant } from '../contexts/TenantContext';
import OnboardingCompletion, { type OnboardingResult, type OnboardingDestination } from './OnboardingCompletion';
// =====================================================
// TYPES
// =====================================================

export interface OnboardingData {
  // Account type
  accountType: 'individual' | 'business' | 'enterprise';
  // Company info
  companyName: string;
  companySize: string;
  industry: string;
  fiscalYearEnd: number;
  currency: string;
  // Data source
  primarySource: string;
  skipSource: boolean;
  // Team
  teamEmails: string[];
  skipTeam: boolean;
}

const INITIAL_DATA: OnboardingData = {
  accountType: 'business',
  companyName: '',
  companySize: '',
  industry: '',
  fiscalYearEnd: 12,
  currency: 'CAD',
  primarySource: '',
  skipSource: false,
  teamEmails: [],
  skipTeam: false,
};

const BASE_STEPS: OnboardingStep[] = ['company_info', 'complete'];
const INDUSTRY_STEPS: OnboardingStep[] = ['company_info', 'industry_preview', 'complete'];

// =====================================================
// STEP COMPONENTS
// =====================================================

// Industry icon mapping
const INDUSTRY_ICONS: Record<
  string,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  real_estate: Building2,
  construction: Hammer,
  hospitality: Hotel,
  retail: ShoppingBag,
  restaurant: UtensilsCrossed,
  professional_services: Briefcase,
  manufacturing: Factory,
  agriculture: Wheat,
  transportation: Truck,
  transport: Truck,
  healthcare: Heart,
  education: GraduationCap,
  wholesale: ShoppingBag,
  automotive: Truck,
  beauty_wellness: Heart,
};

const colors = {
  green: '#2E7D5F',
  greenDark: '#1E5A43',
  gold: '#C5A24D',
  goldDark: '#A68A3C',
};

// Step 1: Company Info
export function CompanyInfoStep({
  data,
  onChange,
  onNext,
  onBack,
  readOnly = false,
}: {
  data: OnboardingData;
  onChange: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack?: () => void;
  readOnly?: boolean;
}) {
  const { language } = useI18n();
  const { resolvedTheme } = useTheme();
  const isEn = language === 'en';
  const isDark = resolvedTheme === 'dark';
  const theme = isDark
    ? { green: colors.green, gold: colors.gold }
    : { green: colors.green, gold: colors.gold };

  const companySizes = [
    { value: '1', label: isEn ? 'Just me' : 'Juste moi' },
    { value: '2-10', label: '2-10' },
    { value: '11-50', label: '11-50' },
    { value: '51-200', label: '51-200' },
    { value: '201+', label: '201+' },
  ];

  const isValid = data.companyName.trim().length > 0 && data.companyName.length <= 255;

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Tell us about your organization' : 'Parlez-nous de votre organisation'}
        </h2>
        <p style={{ color: 'rgb(var(--color-text-secondary))' }}>
          {isEn
            ? "We'll use this to personalize your reports"
            : 'Nous utiliserons ceci pour personnaliser vos rapports'}
        </p>
      </div>

      {readOnly && (
        <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn ? 'Only organization administrators can edit these details.' : 'Seuls les administrateurs de l’organisation peuvent modifier ces détails.'}
        </p>
      )}
      <fieldset disabled={readOnly} className="space-y-6 min-w-0">
        {/* Company Name */}
        <div>
          <label className="label" htmlFor="onboarding-company-name">
            {isEn ? 'Company / Organization Name' : "Nom de l'entreprise / Organisation"} *
          </label>
          <input
            id="onboarding-company-name"
            type="text"
            maxLength={255}
            value={data.companyName}
            onChange={(e) => onChange({ companyName: e.target.value })}
            className="input"
            placeholder={isEn ? 'Acme Inc.' : 'Acme Inc.'}
            autoFocus
          />
        </div>

        {/* Company Size */}
        <div>
          <label className="label">{isEn ? 'Team Size' : "Taille de l'équipe"}</label>
          <div className="flex flex-wrap gap-2">
            {companySizes.map((size) => (
              <button
                key={size.value}
                onClick={() => onChange({ companySize: size.value })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors`}
                style={{
                  backgroundColor:
                    data.companySize === size.value
                      ? 'rgb(var(--color-primary-500))'
                      : 'rgb(var(--color-bg-muted))',
                  color:
                    data.companySize === size.value ? 'white' : 'rgb(var(--color-text-secondary))',
                }}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>

        {/* Industry - Visual Cards */}
        <div>
          <label className="label">{isEn ? 'Industry' : "Secteur d'activité"}</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
            {getAllIndustries().map((industry) => {
              const IconComponent = INDUSTRY_ICONS[industry.id] || Building2;
              const iconColor = industry.popular ? theme.gold : theme.green;

              return (
                <button
                  key={industry.id}
                  onClick={() => onChange({ industry: industry.id })}
                  className="p-4 rounded-xl text-left transition-all border-2"
                  style={{
                    borderColor:
                      data.industry === industry.id
                        ? iconColor
                        : isDark
                          ? 'rgba(71, 85, 105, 0.4)'
                          : 'rgba(229, 231, 235, 0.8)',
                    backgroundColor:
                      data.industry === industry.id
                        ? `${iconColor}15`
                        : isDark
                          ? 'rgba(30, 41, 59, 0.6)'
                          : 'rgba(255, 255, 255, 0.9)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: `${iconColor}15`,
                      }}
                    >
                      <IconComponent className="w-5 h-5" style={{ color: iconColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="font-semibold text-sm"
                          style={{ color: 'rgb(var(--color-text))' }}
                        >
                          {isEn ? industry.name.en : industry.name.fr}
                        </span>
                        {industry.popular && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap"
                            style={{
                              backgroundColor: `${theme.gold}20`,
                              color: colors.goldDark,
                            }}
                          >
                            {isEn ? 'Popular' : 'Populaire'}
                          </span>
                        )}
                      </div>
                      <p
                        className="text-xs mt-1 line-clamp-2"
                        style={{ color: 'rgb(var(--color-text-muted))' }}
                      >
                        {isEn ? industry.description.en : industry.description.fr}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fiscal Year & Currency */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="onboarding-fiscal-year-end">{isEn ? 'Fiscal Year End' : "Fin d'exercice"}</label>
            <select
              id="onboarding-fiscal-year-end"
              value={data.fiscalYearEnd}
              onChange={(e) => onChange({ fiscalYearEnd: parseInt(e.target.value) })}
              className="select"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString(language === 'en' ? 'en-CA' : 'fr-CA', {
                    month: 'long',
                  })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="onboarding-currency">{isEn ? 'Currency' : 'Devise'}</label>
            <select
              id="onboarding-currency"
              value={data.currency}
              onChange={(e) => onChange({ currency: e.target.value })}
              className="select"
            >
              <option value="CAD">CAD - {isEn ? 'Canadian Dollar' : 'Dollar canadien'}</option>
              <option value="USD">USD - {isEn ? 'US Dollar' : 'Dollar américain'}</option>
              <option value="EUR">EUR - Euro</option>
            </select>
          </div>
        </div>
      </fieldset>

      <div className="flex justify-between mt-8">
        {onBack && (
          <button onClick={onBack} className="btn-ghost">
            <ChevronLeft className="w-4 h-4" />
            {isEn ? 'Back' : 'Retour'}
          </button>
        )}
        <div className={onBack ? '' : 'ml-auto'}>
          <button onClick={onNext} className="btn-primary" disabled={!isValid}>
            {isEn ? 'Continue' : 'Continuer'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Step 2: Industry KPIs Preview
export function IndustryPreviewStep({
  data,
  onChange: _onChange,
  onNext,
  onBack,
}: {
  data: OnboardingData;
  onChange: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { language } = useI18n();
  const { resolvedTheme } = useTheme();
  const isEn = language === 'en';
  const isDark = resolvedTheme === 'dark';
  const theme = isDark
    ? { green: colors.green, gold: colors.gold }
    : { green: colors.green, gold: colors.gold };

  const industryTemplate = data.industry ? getIndustryTemplate(data.industry) : null;
  const kpis = industryTemplate ? getKPIsForIndustry(industryTemplate.id) : [];

  useEffect(() => {
    if (!industryTemplate) onNext();
  }, [industryTemplate, onNext]);

  if (!industryTemplate) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Your Industry KPIs' : 'Vos indicateurs de performance'}
        </h2>
        <p style={{ color: 'rgb(var(--color-text-secondary))' }}>
          {isEn
            ? `Explore metrics for ${industryTemplate.name.en}`
            : `Découvrez les indicateurs pour ${industryTemplate.name.fr}`}
        </p>
      </div>

      {/* Industry Summary */}
      <div
        className="p-6 rounded-xl mb-6"
        style={{
          backgroundColor: `${theme.green}08`,
          border: `1px solid ${theme.green}20`,
        }}
      >
        <div className="flex items-center gap-4">
          {(() => {
            const IconComponent = INDUSTRY_ICONS[industryTemplate.id] || Building2;
            return (
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${theme.green}15` }}
              >
                <IconComponent className="w-8 h-8" style={{ color: theme.green }} />
              </div>
            );
          })()}
          <div>
            <h3 className="font-semibold text-lg" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? industryTemplate.name.en : industryTemplate.name.fr}
            </h3>
            <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? industryTemplate.description.en : industryTemplate.description.fr}
            </p>
          </div>
        </div>
      </div>

      {/* Key KPIs */}
      <div className="mb-6">
        <h3 className="font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Key Metrics' : 'Métriques clés'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {kpis.slice(0, 6).map((kpi, idx) => {
            const metricColor = idx % 2 === 0 ? theme.green : theme.gold;
            return (
              <div
                key={kpi.id}
                className="p-4 rounded-lg transition-all hover:shadow-md"
                style={{
                  backgroundColor: `${metricColor}08`,
                  border: `1px solid ${metricColor}20`,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${metricColor}15` }}
                  >
                    <BarChart3 className="w-4 h-4" style={{ color: metricColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="font-medium text-sm"
                        style={{ color: 'rgb(var(--color-text))' }}
                      >
                        {isEn ? kpi.name.en : kpi.name.fr}
                      </span>
                      {kpi.benchmark && (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                          style={{
                            backgroundColor: `${metricColor}20`,
                            color: metricColor,
                          }}
                        >
                          {kpi.benchmark.min}-{kpi.benchmark.max} {kpi.benchmark.unit}
                        </span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? kpi.description?.en : kpi.description?.fr}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {kpis.length > 6 && (
          <div className="mt-4 text-center">
            <p className="text-sm font-medium" style={{ color: theme.green }}>
              {isEn
                ? `+ ${kpis.length - 6} more metrics available`
                : `+ ${kpis.length - 6} autres métriques disponibles`}
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn
                ? 'These are just examples. Your dashboard will include all relevant KPIs for your industry.'
                : 'Ce ne sont que des exemples. Votre tableau de bord inclura tous les KPIs pertinents pour votre industrie.'}
            </p>
          </div>
        )}
      </div>

      {/* Info */}
      <div
        className="p-4 rounded-lg mb-6"
        style={{
          backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
          border: '1px solid rgb(var(--color-primary-500) / 0.2)',
        }}
      >
        <p className="text-sm" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn
            ? 'You can select and customize these metrics in your financial model.'
            : 'Vous pouvez sélectionner et personnaliser ces indicateurs dans votre modèle financier.'}
        </p>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="btn-ghost">
          <ChevronLeft className="w-4 h-4" />
          {isEn ? 'Back' : 'Retour'}
        </button>
        <button onClick={onNext} className="btn-primary">
          {isEn ? 'Continue' : 'Continuer'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// =====================================================
// MAIN ONBOARDING COMPONENT
// =====================================================

export default function Onboarding() {
  const { user } = useAuth();
  const { currentTenant, isLoading, error, refreshTenants } = useTenant();
  const { language } = useI18n();
  const isEn = language === 'en';

  if (isLoading) {
    return <main className="min-h-screen flex items-center justify-center p-6"><p role="status">{isEn ? 'Loading your organization…' : 'Chargement de votre organisation…'}</p></main>;
  }
  if (!currentTenant || error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p role="alert">{isEn ? 'Your organization could not be loaded. Please try again.' : 'Votre organisation n’a pas pu être chargée. Veuillez réessayer.'}</p>
        <button type="button" className="btn-secondary" onClick={() => { void refreshTenants().catch(() => {}); }}>{isEn ? 'Try again' : 'Réessayer'}</button>
      </main>
    );
  }
  return <OnboardingWizard key={`${user?.id}:${currentTenant.id}`} tenant={currentTenant} />;
}

function OnboardingWizard({ tenant }: { tenant: Tenant }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canManageSettings } = useTenant();
  const { language } = useI18n();
  const isEn = language === 'en';

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('company_info');
  const [data, setData] = useState<OnboardingData>(() => ({
    ...INITIAL_DATA,
    companyName: tenant.name,
    industry: tenant.industry || '',
    currency: tenant.settings.currency,
    fiscalYearEnd: Number(tenant.settings.fiscalYearEnd.split('-')[0]),
  }));
  const [startTime] = useState(Date.now());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Simplified steps - user is already authenticated via Keycloak
  const steps = getIndustryTemplate(data.industry) ? INDUSTRY_STEPS : BASE_STEPS;
  const currentIndex = steps.indexOf(currentStep);

  // Track step views
  useEffect(() => {
    analytics.trackOnboardingStep(currentStep, 'viewed');
  }, [currentStep]);

  // Track onboarding start
  useEffect(() => {
    analytics.trackOnboardingStarted();
    if (user?.email) {
      void crmService.trackOnboardingProgress(user.email, 'company_info', false).catch(() => {});
    }
  }, [user?.email]);

  const updateData = useCallback((newData: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...newData }));
  }, []);

  const goToStep = useCallback(
    (step: OnboardingStep) => {
      analytics.trackOnboardingStep(currentStep, 'completed');
      if (user?.email) {
        void crmService.trackOnboardingProgress(user.email, currentStep, true).catch(() => {});
      }
      setCurrentStep(step);
    },
    [currentStep, user?.email],
  );

  const goNext = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < steps.length) {
      goToStep(steps[nextIndex]);
    }
  }, [currentIndex, goToStep, steps]);

  const goBack = useCallback(() => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  }, [currentIndex, steps]);

  const handleFinish = useCallback((result: OnboardingResult, destination: OnboardingDestination) => {
    const totalTime = Math.floor((Date.now() - startTime) / 1000);
    const completion = { totalTime, sourceConnected: false, teamInvited: result.teamInvitationsSent > 0 };

    // Only the confirmed server result reaches this callback. Telemetry must not block navigation.
    try {
      analytics.trackOnboardingCompleted({ ...completion, stepsCompleted: steps.length });
      if (user?.email) void crmService.trackOnboardingCompleted(user.email, completion).catch(() => {});
    } catch {
      // A telemetry failure does not change the saved organization state.
    }
    try {
      localStorage.setItem('pl_onboarding_data', JSON.stringify({ ...data, primarySource: '', teamEmails: [], skipSource: true, skipTeam: true, tenantId: result.tenantId }));
      localStorage.setItem('pl_onboarding_completed', 'true');
    } catch {
      // Server-side completion is authoritative when browser storage is unavailable.
    }
    navigate(destination);
  }, [data, navigate, startTime, steps.length, user?.email]);

  // Progress indicator
  const progress = (currentIndex / (steps.length - 1)) * 100;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-md"
        style={{
          backgroundColor: 'rgb(var(--color-bg) / 0.95)',
          borderColor: 'rgb(var(--color-border))',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 flex items-center justify-center transition-transform group-hover:scale-105">
                <svg
                  className="w-8 h-8"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="5"
                    y="5"
                    width="6"
                    height="6"
                    rx="1.3"
                    fill="rgb(var(--color-primary-500))"
                  />
                  <rect
                    x="13"
                    y="5"
                    width="6"
                    height="6"
                    rx="1.3"
                    fill="rgb(var(--color-primary-500))"
                  />
                  <rect
                    x="21"
                    y="5"
                    width="6"
                    height="6"
                    rx="1.3"
                    fill="rgb(var(--color-primary-500))"
                  />
                  <rect
                    x="5"
                    y="13"
                    width="6"
                    height="6"
                    rx="1.3"
                    fill="rgb(var(--color-primary-500))"
                  />
                  <rect
                    x="13"
                    y="13"
                    width="6"
                    height="6"
                    rx="1.3"
                    fill="rgb(var(--color-primary-500))"
                  />
                  <rect
                    x="21"
                    y="13"
                    width="6"
                    height="6"
                    rx="1.3"
                    fill="rgb(var(--color-primary-500))"
                  />
                  <rect
                    x="5"
                    y="21"
                    width="6"
                    height="6"
                    rx="1.3"
                    fill="rgb(var(--color-primary-500))"
                  />
                  <rect
                    x="13"
                    y="21"
                    width="6"
                    height="6"
                    rx="1.3"
                    fill="rgb(var(--color-primary-500))"
                  />
                  <rect
                    x="21"
                    y="21"
                    width="6"
                    height="6"
                    rx="1.3"
                    fill="rgb(var(--color-primary-500))"
                  />
                </svg>
              </div>
              <span className="font-semibold text-lg" style={{ color: 'rgb(var(--color-text))' }}>
                PlainLedger
              </span>
            </Link>

            {/* Desktop Nav - opens in new tab to preserve onboarding progress */}
            <nav className="hidden lg:flex items-center gap-6">
              <a
                href="/#features"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1 group"
                style={{ color: 'rgb(var(--color-text-secondary))' }}
              >
                {isEn ? 'Features' : 'Fonctionnalités'}
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
              </a>
              <a
                href="/#pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1 group"
                style={{ color: 'rgb(var(--color-text-secondary))' }}
              >
                {isEn ? 'Pricing' : 'Tarifs'}
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
              </a>
              <a
                href="/#industry-kpis"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1 group"
                style={{ color: 'rgb(var(--color-text-secondary))' }}
              >
                {isEn ? 'Industries' : 'Industries'}
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
              </a>
              <a
                href="/#testimonials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1 group"
                style={{ color: 'rgb(var(--color-text-secondary))' }}
              >
                {isEn ? 'Testimonials' : 'Témoignages'}
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
              </a>
            </nav>

            {/* Actions & Progress */}
            <div className="flex items-center gap-3">
              {/* Progress indicator (desktop) */}
              {currentStep !== 'complete' && (
                <div className="hidden lg:flex items-center gap-3 mr-2">
                  <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn
                      ? `Step ${currentIndex + 1} of ${steps.length - 1}`
                      : `Étape ${currentIndex + 1} sur ${steps.length - 1}`}
                  </span>
                  <div
                    className="w-24 h-2 rounded-full"
                    style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: 'rgb(var(--color-primary-500))',
                      }}
                    />
                  </div>
                </div>
              )}

              <ThemeToggle />
              <LanguageToggle />

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2"
                aria-expanded={mobileMenuOpen}
                aria-label={isEn ? (mobileMenuOpen ? 'Close menu' : 'Open menu') : (mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu')}
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div
              className="lg:hidden py-4 border-t"
              style={{ borderColor: 'rgb(var(--color-border))' }}
            >
              <nav className="flex flex-col gap-3">
                <a
                  href="/#features"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium py-2"
                  style={{ color: 'rgb(var(--color-text-secondary))' }}
                >
                  {isEn ? 'Features' : 'Fonctionnalités'}
                </a>
                <a
                  href="/#pricing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium py-2"
                  style={{ color: 'rgb(var(--color-text-secondary))' }}
                >
                  {isEn ? 'Pricing' : 'Tarifs'}
                </a>
                <a
                  href="/#industry-kpis"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium py-2"
                  style={{ color: 'rgb(var(--color-text-secondary))' }}
                >
                  {isEn ? 'Industries' : 'Industries'}
                </a>
                <a
                  href="/#testimonials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium py-2"
                  style={{ color: 'rgb(var(--color-text-secondary))' }}
                >
                  {isEn ? 'Testimonials' : 'Témoignages'}
                </a>
                {/* Progress indicator (mobile) */}
                {currentStep !== 'complete' && (
                  <div
                    className="flex items-center gap-3 pt-3 border-t"
                    style={{ borderColor: 'rgb(var(--color-border))' }}
                  >
                    <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn
                        ? `Step ${currentIndex + 1} of ${steps.length - 1}`
                        : `Étape ${currentIndex + 1} sur ${steps.length - 1}`}
                    </span>
                    <div
                      className="flex-1 h-2 rounded-full"
                      style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: 'rgb(var(--color-primary-500))',
                        }}
                      />
                    </div>
                  </div>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        {currentStep === 'company_info' && (
          <CompanyInfoStep data={data} onChange={updateData} onNext={goNext} readOnly={!canManageSettings} />
        )}
        {currentStep === 'industry_preview' && (
          <IndustryPreviewStep data={data} onChange={updateData} onNext={goNext} onBack={goBack} />
        )}
        {currentStep === 'complete' && (
          <OnboardingCompletion data={data} onFinish={handleFinish} onBack={goBack} />
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 px-6 text-center">
        <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn
            ? 'Need help? Contact support@plainledger.ca'
            : "Besoin d'aide ? Contactez support@plainledger.ca"}
        </p>
      </footer>
    </div>
  );
}

export { Onboarding };
