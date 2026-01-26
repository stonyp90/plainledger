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
  Check,
  X,
  ArrowRight,
  Shield,
  BarChart3,
  Upload,
  UserPlus,
  Mail,
  PartyPopper,
  Menu,
} from 'lucide-react';
import { useAuth } from '../lib/keycloak';
import { useI18n, LanguageToggle } from '../lib/i18n';
import ThemeToggle from './ThemeToggle';
import { useTenant } from '../contexts/TenantContext';
import { analytics, type OnboardingStep } from '../lib/analytics';
import { crmService } from '../lib/crm';

// =====================================================
// TYPES
// =====================================================

interface OnboardingData {
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

// =====================================================
// STEP COMPONENTS
// =====================================================

// Step 1: Company Info (first step now)
function CompanyInfoStep({ 
  data, 
  onChange, 
  onNext, 
}: { 
  data: OnboardingData; 
  onChange: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
}) {
  const { language } = useI18n();
  const isEn = language === 'en';

  const companySizes = [
    { value: '1', label: isEn ? 'Just me' : 'Juste moi' },
    { value: '2-10', label: '2-10' },
    { value: '11-50', label: '11-50' },
    { value: '51-200', label: '51-200' },
    { value: '201+', label: '201+' },
  ];

  const industries = [
    { value: 'technology', label: isEn ? 'Technology' : 'Technologie' },
    { value: 'retail', label: isEn ? 'Retail' : 'Commerce de détail' },
    { value: 'services', label: isEn ? 'Professional Services' : 'Services professionnels' },
    { value: 'manufacturing', label: isEn ? 'Manufacturing' : 'Fabrication' },
    { value: 'construction', label: isEn ? 'Construction' : 'Construction' },
    { value: 'healthcare', label: isEn ? 'Healthcare' : 'Santé' },
    { value: 'finance', label: isEn ? 'Finance' : 'Finance' },
    { value: 'nonprofit', label: isEn ? 'Non-profit' : 'Organisme à but non lucratif' },
    { value: 'other', label: isEn ? 'Other' : 'Autre' },
  ];

  const isValid = data.companyName.trim().length > 0;

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Tell us about your organization' : 'Parlez-nous de votre organisation'}
        </h2>
        <p style={{ color: 'rgb(var(--color-text-secondary))' }}>
          {isEn ? "We'll use this to personalize your reports" : "Nous utiliserons ceci pour personnaliser vos rapports"}
        </p>
      </div>

      <div className="space-y-6">
        {/* Company Name */}
        <div>
          <label className="label">{isEn ? 'Company / Organization Name' : 'Nom de l\'entreprise / Organisation'} *</label>
          <input
            type="text"
            value={data.companyName}
            onChange={(e) => onChange({ companyName: e.target.value })}
            className="input"
            placeholder={isEn ? 'Acme Inc.' : 'Acme Inc.'}
            autoFocus
          />
        </div>

        {/* Company Size */}
        <div>
          <label className="label">{isEn ? 'Team Size' : 'Taille de l\'équipe'}</label>
          <div className="flex flex-wrap gap-2">
            {companySizes.map((size) => (
              <button
                key={size.value}
                onClick={() => onChange({ companySize: size.value })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors`}
                style={{
                  backgroundColor: data.companySize === size.value 
                    ? 'rgb(var(--color-primary-500))' 
                    : 'rgb(var(--color-bg-muted))',
                  color: data.companySize === size.value 
                    ? 'white' 
                    : 'rgb(var(--color-text-secondary))',
                }}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>

        {/* Industry */}
        <div>
          <label className="label">{isEn ? 'Industry' : 'Secteur d\'activité'}</label>
          <select
            value={data.industry}
            onChange={(e) => onChange({ industry: e.target.value })}
            className="select"
          >
            <option value="">{isEn ? 'Select industry...' : 'Sélectionner le secteur...'}</option>
            {industries.map((ind) => (
              <option key={ind.value} value={ind.value}>{ind.label}</option>
            ))}
          </select>
        </div>

        {/* Fiscal Year & Currency */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{isEn ? 'Fiscal Year End' : 'Fin d\'exercice'}</label>
            <select
              value={data.fiscalYearEnd}
              onChange={(e) => onChange({ fiscalYearEnd: parseInt(e.target.value) })}
              className="select"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString(language === 'en' ? 'en-CA' : 'fr-CA', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{isEn ? 'Currency' : 'Devise'}</label>
            <select
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
      </div>

      <div className="flex justify-end mt-8">
        <button onClick={onNext} className="btn-primary" disabled={!isValid}>
          {isEn ? 'Continue' : 'Continuer'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Provider Logo Components for Onboarding
const ProviderLogos: Record<string, JSX.Element> = {
  quickbooks: (
    <svg viewBox="0 0 40 40" className="w-8 h-8">
      <circle cx="20" cy="20" r="20" fill="#2CA01C"/>
      <circle cx="20" cy="16" r="8" stroke="white" strokeWidth="3" fill="none"/>
      <path d="M28 16v14" stroke="white" strokeWidth="3" strokeLinecap="round"/>
      <path d="M12 10v16M12 22c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
    </svg>
  ),
  xero: (
    <svg viewBox="0 0 40 40" className="w-8 h-8">
      <circle cx="20" cy="20" r="20" fill="#13B5EA"/>
      <text x="20" y="25" textAnchor="middle" fill="white" fontFamily="Arial, sans-serif" fontWeight="400" fontSize="14" letterSpacing="-0.5">xero</text>
      <circle cx="33" cy="20" r="1.5" fill="white"/>
    </svg>
  ),
  sage: (
    <svg viewBox="0 0 40 40" className="w-8 h-8">
      <circle cx="20" cy="20" r="20" fill="#1D1D1B"/>
      <text x="20" y="25" textAnchor="middle" fill="#00D639" fontFamily="Arial, sans-serif" fontWeight="400" fontSize="12">Sage</text>
    </svg>
  ),
  freshbooks: (
    <svg viewBox="0 0 40 40" className="w-8 h-8">
      <rect width="40" height="40" rx="6" fill="#0075DD"/>
      <path d="M30 0C30 8 32 10 40 10V0H30Z" fill="white"/>
      <path d="M13 10h14v4H17v5h8v4h-8v9h-4V10z" fill="white"/>
    </svg>
  ),
  wave: (
    <svg viewBox="0 0 40 40" className="w-8 h-8">
      <path d="M6 28c0 2.2 1.8 4 4 4 2.2 0 4-1.8 4-4V16c0-2.2-1.8-4-4-4-2.2 0-4 1.8-4 4v12z" fill="#003D79"/>
      <path d="M16 32c0 2.2 1.8 4 4 4 2.2 0 4-1.8 4-4V8c0-2.2-1.8-4-4-4-2.2 0-4 1.8-4 4v24z" fill="#2E77BC"/>
      <path d="M26 28c0 2.2 1.8 4 4 4 2.2 0 4-1.8 4-4V12c0-2.2-1.8-4-4-4-2.2 0-4 1.8-4 4v16z" fill="#6AB8F7"/>
    </svg>
  ),
};

// Step 2: Connect Data Source
function ConnectSourceStep({ 
  data, 
  onChange, 
  onNext, 
  onBack 
}: { 
  data: OnboardingData; 
  onChange: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { language } = useI18n();
  const isEn = language === 'en';

  const sources = [
    { id: 'quickbooks', name: 'QuickBooks Online', color: '#2CA01C' },
    { id: 'xero', name: 'Xero', color: '#13B5EA' },
    { id: 'sage', name: 'Sage', color: '#1D1D1B' },
    { id: 'freshbooks', name: 'FreshBooks', color: '#0075DD' },
    { id: 'wave', name: 'Wave', color: '#2E77BC' },
    { id: 'csv', name: isEn ? 'Import CSV' : 'Importer CSV', color: '#6B7280' },
  ];

  const handleConnect = (sourceId: string) => {
    onChange({ primarySource: sourceId });
    // In production, this would initiate OAuth flow
    // For now, simulate connection
    setTimeout(() => {
      onNext();
    }, 500);
  };

  const handleSkip = () => {
    onChange({ skipSource: true });
    onNext();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Connect your accounting software' : 'Connectez votre logiciel comptable'}
        </h2>
        <p style={{ color: 'rgb(var(--color-text-secondary))' }}>
          {isEn 
            ? "We'll securely sync your data in read-only mode" 
            : "Nous synchroniserons vos données en mode lecture seule"}
        </p>
      </div>

      {/* Security note */}
      <div 
        className="p-4 rounded-xl mb-6 flex items-start gap-3"
        style={{ 
          backgroundColor: 'rgb(var(--color-success) / 0.1)',
          border: '1px solid rgb(var(--color-success) / 0.2)'
        }}
      >
        <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-success))' }} />
        <div className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
          <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Your data is secure' : 'Vos données sont sécurisées'}
          </span>
          <br />
          {isEn 
            ? 'Read-only access • Bank-level encryption (AES-256) • Data stored in Quebec'
            : 'Accès lecture seule • Chiffrement bancaire (AES-256) • Données au Québec'}
        </div>
      </div>

      {/* Data sources grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        {sources.map((source) => (
          <button
            key={source.id}
            onClick={() => handleConnect(source.id)}
            className="p-4 rounded-xl text-center transition-all hover:scale-105"
            style={{
              backgroundColor: 'rgb(var(--color-surface))',
              border: data.primarySource === source.id 
                ? `2px solid ${source.color}` 
                : '1px solid rgb(var(--color-border))',
            }}
          >
            <div 
              className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center overflow-hidden"
            >
              {source.id === 'csv' ? (
                <div 
                  className="w-full h-full flex items-center justify-center rounded-xl"
                  style={{ backgroundColor: source.color + '20' }}
                >
                  <Upload className="w-6 h-6" style={{ color: source.color }} />
                </div>
              ) : (
                ProviderLogos[source.id]
              )}
            </div>
            <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
              {source.name}
            </span>
          </button>
        ))}
      </div>

      <div className="flex justify-between mt-8">
        <button onClick={onBack} className="btn-ghost">
          <ChevronLeft className="w-4 h-4" />
          {isEn ? 'Back' : 'Retour'}
        </button>
        <button onClick={handleSkip} className="btn-secondary">
          {isEn ? 'Skip for now' : 'Passer pour l\'instant'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Step 5: Invite Team
function InviteTeamStep({ 
  data, 
  onChange, 
  onNext, 
  onBack 
}: { 
  data: OnboardingData; 
  onChange: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [email, setEmail] = useState('');

  const addEmail = () => {
    if (email && !data.teamEmails.includes(email)) {
      onChange({ teamEmails: [...data.teamEmails, email] });
      setEmail('');
    }
  };

  const removeEmail = (emailToRemove: string) => {
    onChange({ teamEmails: data.teamEmails.filter(e => e !== emailToRemove) });
  };

  const handleSkip = () => {
    onChange({ skipTeam: true });
    onNext();
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Invite your team' : 'Invitez votre équipe'}
        </h2>
        <p style={{ color: 'rgb(var(--color-text-secondary))' }}>
          {isEn 
            ? "Collaborate with your team on financial insights" 
            : "Collaborez avec votre équipe sur les insights financiers"}
        </p>
      </div>

      <div className="space-y-4">
        {/* Email input */}
        <div>
          <label className="label">{isEn ? 'Email addresses' : 'Adresses courriel'}</label>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addEmail()}
              className="input flex-1"
              placeholder={isEn ? 'colleague@company.com' : 'collegue@entreprise.com'}
            />
            <button 
              onClick={addEmail}
              className="btn-primary"
              disabled={!email}
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Added emails */}
        {data.teamEmails.length > 0 && (
          <div className="space-y-2">
            {data.teamEmails.map((teamEmail) => (
              <div 
                key={teamEmail}
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                  <span style={{ color: 'rgb(var(--color-text))' }}>{teamEmail}</span>
                </div>
                <button 
                  onClick={() => removeEmail(teamEmail)}
                  className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20"
                >
                  <X className="w-4 h-4" style={{ color: 'rgb(var(--color-error))' }} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn 
            ? 'Team members will receive an invitation email to join your organization.'
            : 'Les membres de l\'équipe recevront un courriel d\'invitation pour rejoindre votre organisation.'}
        </p>
      </div>

      <div className="flex justify-between mt-8">
        <button onClick={onBack} className="btn-ghost">
          <ChevronLeft className="w-4 h-4" />
          {isEn ? 'Back' : 'Retour'}
        </button>
        <div className="flex gap-3">
          <button onClick={handleSkip} className="btn-secondary">
            {isEn ? 'Skip' : 'Passer'}
          </button>
          <button onClick={onNext} className="btn-primary" disabled={data.teamEmails.length === 0}>
            {isEn ? 'Send invites' : 'Envoyer les invitations'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Step 6: Tour/Features
function TourStep({ 
  onNext, 
  onBack 
}: { 
  onNext: () => void;
  onBack: () => void;
}) {
  const { language } = useI18n();
  const isEn = language === 'en';

  const features = [
    {
      icon: BarChart3,
      title: isEn ? 'Smart Dashboard' : 'Tableau de bord intelligent',
      description: isEn 
        ? 'Real-time financial health score, key metrics, and trends at a glance'
        : 'Score de santé financière en temps réel, métriques clés et tendances',
    },
    {
      icon: AlertTriangle,
      title: isEn ? 'Anomaly Detection' : 'Détection d\'anomalies',
      description: isEn 
        ? 'AI-powered alerts for unusual transactions and potential issues'
        : 'Alertes IA pour les transactions inhabituelles et problèmes potentiels',
    },
    {
      icon: Building2,
      title: isEn ? 'Financial Reports' : 'Rapports financiers',
      description: isEn 
        ? 'Balance sheet, income statement, cash flow - ready to share'
        : 'Bilan, compte de résultat, flux de trésorerie - prêts à partager',
    },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'What you can do with PlainLedger' : 'Ce que vous pouvez faire avec PlainLedger'}
        </h2>
        <p style={{ color: 'rgb(var(--color-text-secondary))' }}>
          {isEn ? "Here's a quick overview of your new superpowers" : "Voici un aperçu de vos nouveaux super pouvoirs"}
        </p>
      </div>

      <div className="space-y-4 mb-8">
        {features.map((feature, idx) => (
          <div 
            key={idx}
            className="p-5 rounded-xl flex items-start gap-4"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              border: '1px solid rgb(var(--color-border))'
            }}
          >
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <feature.icon className="w-6 h-6" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {feature.title}
              </h3>
              <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="btn-ghost">
          <ChevronLeft className="w-4 h-4" />
          {isEn ? 'Back' : 'Retour'}
        </button>
        <button onClick={onNext} className="btn-primary">
          {isEn ? 'Complete setup' : 'Terminer la configuration'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Step 7: Complete
function CompleteStep({ data, onFinish }: { data: OnboardingData; onFinish: () => void }) {
  const { language } = useI18n();
  const isEn = language === 'en';

  return (
    <div className="text-center max-w-xl mx-auto">
      <div className="mb-8">
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}
        >
          <PartyPopper className="w-10 h-10" style={{ color: 'rgb(var(--color-success))' }} />
        </div>
        <h1 className="text-3xl font-bold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? "You're all set!" : "Vous êtes prêt !"}
        </h1>
        <p className="text-lg" style={{ color: 'rgb(var(--color-text-secondary))' }}>
          {isEn 
            ? `${data.companyName} is ready to go. Let's explore your new dashboard.`
            : `${data.companyName} est prêt. Explorons votre nouveau tableau de bord.`}
        </p>
      </div>

      {/* Summary */}
      <div 
        className="p-6 rounded-xl text-left mb-8"
        style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
      >
        <h3 className="font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Setup summary' : 'Résumé de la configuration'}
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5" style={{ color: 'rgb(var(--color-success))' }} />
            <span style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn ? `Organization: ${data.companyName}` : `Organisation: ${data.companyName}`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {data.primarySource && !data.skipSource ? (
              <Check className="w-5 h-5" style={{ color: 'rgb(var(--color-success))' }} />
            ) : (
              <X className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
            )}
            <span style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {data.primarySource && !data.skipSource
                ? (isEn ? `Connected: ${data.primarySource}` : `Connecté: ${data.primarySource}`)
                : (isEn ? 'Data source: Not connected yet' : 'Source de données: Pas encore connecté')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {data.teamEmails.length > 0 && !data.skipTeam ? (
              <Check className="w-5 h-5" style={{ color: 'rgb(var(--color-success))' }} />
            ) : (
              <X className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
            )}
            <span style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {data.teamEmails.length > 0 && !data.skipTeam
                ? (isEn ? `Team: ${data.teamEmails.length} invited` : `Équipe: ${data.teamEmails.length} invité(s)`)
                : (isEn ? 'Team: No invites sent' : 'Équipe: Aucune invitation envoyée')}
            </span>
          </div>
        </div>
      </div>

      <button onClick={onFinish} className="btn-primary btn-lg">
        {isEn ? 'Go to Dashboard' : 'Aller au tableau de bord'}
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}

// =====================================================
// MAIN ONBOARDING COMPONENT
// =====================================================

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('company_info');
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [startTime] = useState(Date.now());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const steps: OnboardingStep[] = ['company_info', 'connect_source', 'invite_team', 'tour', 'complete'];
  const currentIndex = steps.indexOf(currentStep);

  // Track step views
  useEffect(() => {
    analytics.trackOnboardingStep(currentStep, 'viewed');
  }, [currentStep]);

  // Track onboarding start
  useEffect(() => {
    analytics.trackOnboardingStarted();
    if (user?.email) {
      crmService.trackOnboardingProgress(user.email, 'company_info', false);
    }
  }, [user?.email]);

  const updateData = useCallback((newData: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...newData }));
  }, []);

  const goToStep = useCallback((step: OnboardingStep) => {
    analytics.trackOnboardingStep(currentStep, 'completed');
    if (user?.email) {
      crmService.trackOnboardingProgress(user.email, currentStep, true);
    }
    setCurrentStep(step);
  }, [currentStep, user?.email]);

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

  const handleFinish = useCallback(async () => {
    const totalTime = Math.floor((Date.now() - startTime) / 1000);
    
    // Track completion
    analytics.trackOnboardingCompleted({
      totalTime,
      stepsCompleted: steps.length,
      sourceConnected: !!data.primarySource && !data.skipSource,
      teamInvited: data.teamEmails.length > 0 && !data.skipTeam,
    });

    // Update CRM
    if (user?.email) {
      await crmService.trackOnboardingCompleted(user.email, {
        totalTime,
        sourceConnected: !!data.primarySource && !data.skipSource,
        teamInvited: data.teamEmails.length > 0 && !data.skipTeam,
      });
    }

    // Mark onboarding as complete in local storage
    localStorage.setItem('pl_onboarding_completed', 'true');

    // Navigate to dashboard
    navigate('/app/dashboard');
  }, [data, navigate, startTime, steps.length, user?.email]);

  // Progress indicator
  const progress = ((currentIndex) / (steps.length - 1)) * 100;

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'rgb(var(--color-bg))' }}
    >
      {/* Header */}
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

            {/* Desktop Nav - opens in new tab to preserve onboarding progress */}
            <nav className="hidden md:flex items-center gap-6">
              <a 
                href="/store#features" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1 group" 
                style={{ color: 'rgb(var(--color-text-secondary))' }}
              >
                {isEn ? 'Features' : 'Fonctionnalités'}
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
              </a>
              <a 
                href="/store#pricing" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1 group" 
                style={{ color: 'rgb(var(--color-text-secondary))' }}
              >
                {isEn ? 'Pricing' : 'Tarifs'}
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
              </a>
              <a 
                href="/store#cpa" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1 group" 
                style={{ color: 'rgb(var(--color-text-secondary))' }}
              >
                {isEn ? 'For CPAs' : 'Pour CPA'}
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
              </a>
              <a 
                href="/store#testimonials" 
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
                    {isEn ? `Step ${currentIndex + 1} of ${steps.length - 1}` : `Étape ${currentIndex + 1} sur ${steps.length - 1}`}
                  </span>
                  <div className="w-24 h-2 rounded-full" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
                    <div 
                      className="h-full rounded-full transition-all duration-300"
                      style={{ 
                        width: `${progress}%`,
                        backgroundColor: 'rgb(var(--color-primary-500))'
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
                className="md:hidden p-2"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
              <nav className="flex flex-col gap-3">
                <a 
                  href="/store#features" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm font-medium py-2" 
                  style={{ color: 'rgb(var(--color-text-secondary))' }}
                >
                  {isEn ? 'Features' : 'Fonctionnalités'}
                </a>
                <a 
                  href="/store#pricing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm font-medium py-2" 
                  style={{ color: 'rgb(var(--color-text-secondary))' }}
                >
                  {isEn ? 'Pricing' : 'Tarifs'}
                </a>
                <a 
                  href="/store#cpa" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm font-medium py-2" 
                  style={{ color: 'rgb(var(--color-text-secondary))' }}
                >
                  {isEn ? 'For CPAs' : 'Pour CPA'}
                </a>
                <a 
                  href="/store#testimonials" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm font-medium py-2" 
                  style={{ color: 'rgb(var(--color-text-secondary))' }}
                >
                  {isEn ? 'Testimonials' : 'Témoignages'}
                </a>
                {/* Progress indicator (mobile) */}
                {currentStep !== 'complete' && (
                  <div className="flex items-center gap-3 pt-3 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
                    <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? `Step ${currentIndex + 1} of ${steps.length - 1}` : `Étape ${currentIndex + 1} sur ${steps.length - 1}`}
                    </span>
                    <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
                      <div 
                        className="h-full rounded-full transition-all duration-300"
                        style={{ 
                          width: `${progress}%`,
                          backgroundColor: 'rgb(var(--color-primary-500))'
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
          <CompanyInfoStep data={data} onChange={updateData} onNext={goNext} />
        )}
        {currentStep === 'connect_source' && (
          <ConnectSourceStep data={data} onChange={updateData} onNext={goNext} onBack={goBack} />
        )}
        {currentStep === 'invite_team' && (
          <InviteTeamStep data={data} onChange={updateData} onNext={goNext} onBack={goBack} />
        )}
        {currentStep === 'tour' && (
          <TourStep onNext={goNext} onBack={goBack} />
        )}
        {currentStep === 'complete' && (
          <CompleteStep data={data} onFinish={handleFinish} />
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 px-6 text-center">
        <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn 
            ? 'Need help? Contact support@plainledger.ca'
            : 'Besoin d\'aide ? Contactez support@plainledger.ca'}
        </p>
      </footer>
    </div>
  );
}

export { Onboarding };
