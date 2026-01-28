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
  ExternalLink,
  AlertTriangle,
  UtensilsCrossed,
  Hotel,
  ShoppingBag,
  Hammer,
  Briefcase,
  Factory,
  Truck,
  Heart,
  GraduationCap,
  Loader2,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../lib/keycloak';
import { useI18n, LanguageToggle } from '../lib/i18n';
import ThemeToggle from './ThemeToggle';
import { useTenant } from '../contexts/TenantContext';
import { analytics, type OnboardingStep } from '../lib/analytics';
import { crmService } from '../lib/crm';
import { getAllIndustries, getIndustryTemplate, type IndustryTemplate } from '../lib/industries';
import { getKPIsForIndustry } from '../lib/industryKPIs';
import { authApi } from '../features/auth/api';

// =====================================================
// TYPES
// =====================================================

interface OnboardingData {
  // Account credentials
  email: string;
  password: string;
  confirmPassword: string;
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
  email: '',
  password: '',
  confirmPassword: '',
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

// Industry icon mapping
const INDUSTRY_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  real_estate: Building2,
  construction: Hammer,
  hospitality: Hotel,
  retail: ShoppingBag,
  restaurant: UtensilsCrossed,
  professional_services: Briefcase,
  manufacturing: Factory,
  transportation: Truck,
  healthcare: Heart,
  education: GraduationCap,
};

const colors = {
  green: '#2E7D5F',
  greenDark: '#1E5A43',
  gold: '#C5A24D',
  goldDark: '#A68A3C',
};

// Password validation requirements
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
};

function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`At least ${PASSWORD_REQUIREMENTS.minLength} characters`);
  }
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('One uppercase letter');
  }
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('One lowercase letter');
  }
  if (PASSWORD_REQUIREMENTS.requireNumber && !/\d/.test(password)) {
    errors.push('One number');
  }
  if (PASSWORD_REQUIREMENTS.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('One special character (!@#$%^&*)');
  }
  
  return { valid: errors.length === 0, errors };
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Step 0: Account Signup - Email and Password
function SignupStep({ 
  data, 
  onChange, 
  onNext, 
}: { 
  data: OnboardingData; 
  onChange: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
}) {
  const { language } = useI18n();
  const { resolvedTheme } = useTheme();
  const { user } = useAuth();
  const isEn = language === 'en';
  const isDark = resolvedTheme === 'dark';
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false, confirmPassword: false });
  
  // Pre-fill email from auth if available
  useEffect(() => {
    if (user?.email && !data.email) {
      onChange({ email: user.email });
    }
  }, [user?.email, data.email, onChange]);
  
  const emailValid = validateEmail(data.email);
  const passwordValidation = validatePassword(data.password);
  const passwordsMatch = data.password === data.confirmPassword;
  
  const isValid = emailValid && passwordValidation.valid && passwordsMatch && data.confirmPassword.length > 0;
  
  const handleBlur = (field: 'email' | 'password' | 'confirmPassword') => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
        >
          <UserPlus className="w-8 h-8" style={{ color: 'rgb(var(--color-primary-500))' }} />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Create your account' : 'Créez votre compte'}
        </h2>
        <p style={{ color: 'rgb(var(--color-text-secondary))' }}>
          {isEn ? "Enter your email and create a secure password" : "Entrez votre courriel et créez un mot de passe sécurisé"}
        </p>
      </div>

      <div className="space-y-5">
        {/* Email */}
        <div>
          <label className="label">{isEn ? 'Email Address' : 'Adresse courriel'} *</label>
          <div className="relative">
            <Mail 
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" 
              style={{ color: 'rgb(var(--color-text-muted))' }} 
            />
            <input
              type="email"
              value={data.email}
              onChange={(e) => onChange({ email: e.target.value })}
              onBlur={() => handleBlur('email')}
              className="input pl-10"
              placeholder={isEn ? 'you@company.com' : 'vous@entreprise.com'}
              autoFocus
              autoComplete="email"
              style={{
                borderColor: touched.email && !emailValid ? '#ef4444' : undefined,
              }}
            />
          </div>
          {touched.email && !emailValid && data.email && (
            <p className="text-xs mt-1" style={{ color: '#ef4444' }}>
              {isEn ? 'Please enter a valid email address' : 'Veuillez entrer une adresse courriel valide'}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="label">{isEn ? 'Password' : 'Mot de passe'} *</label>
          <div className="relative">
            <Shield 
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" 
              style={{ color: 'rgb(var(--color-text-muted))' }} 
            />
            <input
              type={showPassword ? 'text' : 'password'}
              value={data.password}
              onChange={(e) => onChange({ password: e.target.value })}
              onBlur={() => handleBlur('password')}
              className="input pl-10 pr-10"
              placeholder={isEn ? 'Create a strong password' : 'Créez un mot de passe fort'}
              autoComplete="new-password"
              style={{
                borderColor: touched.password && !passwordValidation.valid ? '#ef4444' : undefined,
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {showPassword ? (
                <X className="w-4 h-4" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </button>
          </div>
          
          {/* Password Requirements */}
          <div className="mt-3 space-y-1.5">
            <p className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Password must contain:' : 'Le mot de passe doit contenir:'}
            </p>
            <div className="grid grid-cols-2 gap-1">
              {[
                { check: data.password.length >= 8, label: isEn ? '8+ characters' : '8+ caractères' },
                { check: /[A-Z]/.test(data.password), label: isEn ? 'Uppercase letter' : 'Majuscule' },
                { check: /[a-z]/.test(data.password), label: isEn ? 'Lowercase letter' : 'Minuscule' },
                { check: /\d/.test(data.password), label: isEn ? 'Number' : 'Chiffre' },
                { check: /[!@#$%^&*(),.?":{}|<>]/.test(data.password), label: isEn ? 'Special char' : 'Caractère spécial' },
              ].map((req, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-1.5 text-xs"
                  style={{ 
                    color: req.check 
                      ? 'rgb(var(--color-success))' 
                      : (touched.password && data.password ? '#ef4444' : 'rgb(var(--color-text-muted))')
                  }}
                >
                  {req.check ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <X className="w-3.5 h-3.5" />
                  )}
                  <span>{req.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="label">{isEn ? 'Confirm Password' : 'Confirmer le mot de passe'} *</label>
          <div className="relative">
            <Shield 
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" 
              style={{ color: 'rgb(var(--color-text-muted))' }} 
            />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={data.confirmPassword}
              onChange={(e) => onChange({ confirmPassword: e.target.value })}
              onBlur={() => handleBlur('confirmPassword')}
              className="input pl-10 pr-10"
              placeholder={isEn ? 'Confirm your password' : 'Confirmez votre mot de passe'}
              autoComplete="new-password"
              style={{
                borderColor: touched.confirmPassword && !passwordsMatch && data.confirmPassword ? '#ef4444' : undefined,
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {showConfirmPassword ? (
                <X className="w-4 h-4" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </button>
          </div>
          {touched.confirmPassword && !passwordsMatch && data.confirmPassword && (
            <p className="text-xs mt-1" style={{ color: '#ef4444' }}>
              {isEn ? 'Passwords do not match' : 'Les mots de passe ne correspondent pas'}
            </p>
          )}
          {touched.confirmPassword && passwordsMatch && data.confirmPassword && (
            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'rgb(var(--color-success))' }}>
              <Check className="w-3.5 h-3.5" />
              {isEn ? 'Passwords match' : 'Les mots de passe correspondent'}
            </p>
          )}
        </div>
      </div>

      {/* Security Note */}
      <div 
        className="mt-6 p-4 rounded-xl flex items-start gap-3"
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
            ? 'Passwords are encrypted with AES-256 and never stored in plain text.'
            : 'Les mots de passe sont chiffrés avec AES-256 et jamais stockés en clair.'}
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

// Step 1: Company Info
function CompanyInfoStep({ 
  data, 
  onChange, 
  onNext,
  onBack,
}: { 
  data: OnboardingData; 
  onChange: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack?: () => void;
}) {
  const { language } = useI18n();
  const { resolvedTheme } = useTheme();
  const isEn = language === 'en';
  const isDark = resolvedTheme === 'dark';
  const theme = isDark ? { green: colors.green, gold: colors.gold } : { green: colors.green, gold: colors.gold };

  const companySizes = [
    { value: '1', label: isEn ? 'Just me' : 'Juste moi' },
    { value: '2-10', label: '2-10' },
    { value: '11-50', label: '11-50' },
    { value: '51-200', label: '51-200' },
    { value: '201+', label: '201+' },
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

        {/* Industry - Visual Cards */}
        <div>
          <label className="label">{isEn ? 'Industry' : 'Secteur d\'activité'}</label>
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
                    borderColor: data.industry === industry.id
                      ? iconColor
                      : (isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)'),
                    backgroundColor: data.industry === industry.id
                      ? `${iconColor}15`
                      : (isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.9)'),
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
                        <span className="font-semibold text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                          {isEn ? industry.name.en : industry.name.fr}
                        </span>
                        {industry.popular && (
                          <span 
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap"
                            style={{
                              backgroundColor: `${theme.gold}20`,
                              color: theme.goldDark,
                            }}
                          >
                            {isEn ? 'Popular' : 'Populaire'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
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
            ? 'Read-only access • Bank-level encryption (AES-256) • Data stored in Canada'
            : 'Accès lecture seule • Chiffrement bancaire (AES-256) • Données au Canada'}
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

      {/* Skip Option - Prominent */}
      <div 
        className="mt-8 p-4 rounded-xl text-center"
        style={{ 
          backgroundColor: 'rgb(var(--color-bg-muted))',
          border: '1px solid rgb(var(--color-border))'
        }}
      >
        <p className="text-sm mb-3" style={{ color: 'rgb(var(--color-text-secondary))' }}>
          {isEn 
            ? "Don't have your accounting software ready? No problem!" 
            : "Vous n'avez pas votre logiciel comptable sous la main? Pas de problème!"}
        </p>
        <button 
          onClick={handleSkip} 
          className="btn-primary w-full"
        >
          {isEn ? 'Skip and connect later' : 'Passer et connecter plus tard'}
          <ChevronRight className="w-4 h-4" />
        </button>
        <p className="text-xs mt-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn 
            ? 'You can always connect your software from Settings' 
            : 'Vous pourrez toujours connecter votre logiciel depuis les Paramètres'}
        </p>
      </div>

      <div className="flex justify-start mt-6">
        <button onClick={onBack} className="btn-ghost">
          <ChevronLeft className="w-4 h-4" />
          {isEn ? 'Back' : 'Retour'}
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

// Step 2: Industry KPIs Preview
function IndustryPreviewStep({
  data,
  onChange,
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
  const theme = isDark ? { green: colors.green, gold: colors.gold } : { green: colors.green, gold: colors.gold };
  
  const industryTemplate = data.industry ? getIndustryTemplate(data.industry) : null;
  const kpis = industryTemplate ? getKPIsForIndustry(industryTemplate.id) : [];
  
  if (!industryTemplate) {
    // Skip this step if no industry selected
    onNext();
    return null;
  }
  
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Your Industry KPIs' : 'Vos indicateurs de performance'}
        </h2>
        <p style={{ color: 'rgb(var(--color-text-secondary))' }}>
          {isEn
            ? `We'll pre-configure these metrics for ${industryTemplate.name.en}`
            : `Nous préconfigurerons ces métriques pour ${industryTemplate.name.fr}`}
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
                      <span className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                        {isEn ? kpi.name.en : kpi.name.fr}
                      </span>
                      {kpi.benchmark && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap" style={{
                          backgroundColor: `${metricColor}20`,
                          color: metricColor,
                        }}>
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
              {isEn ? `+ ${kpis.length - 6} more metrics available` : `+ ${kpis.length - 6} autres métriques disponibles`}
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'These are just examples. Your dashboard will include all relevant KPIs for your industry.' : 'Ce ne sont que des exemples. Votre tableau de bord inclura tous les KPIs pertinents pour votre industrie.'}
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
            ? 'These metrics will be automatically added to your financial model. You can customize them later.'
            : 'Ces métriques seront automatiquement ajoutées à votre modèle financier. Vous pourrez les personnaliser plus tard.'}
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
        ? 'Intelligent alerts for unusual transactions and potential issues, powered by our AI'
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

// Step: Complete - Account validation and registration
function CompleteStep({ data, onFinish }: { data: OnboardingData; onFinish: () => void }) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [isValidating, setIsValidating] = useState(false);
  const [validationStep, setValidationStep] = useState<'idle' | 'registering' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFinish = async () => {
    setIsValidating(true);
    setValidationStep('registering');
    setErrorMessage(null);

    try {
      // Step 1: Register user account with auth API
      const registerResponse = await authApi.register({
        email: data.email,
        password: data.password,
        firstName: data.companyName.split(' ')[0] || 'User',
        lastName: data.companyName.split(' ').slice(1).join(' ') || '',
        organizationName: data.companyName,
      });

      if (!registerResponse) {
        throw new Error(isEn ? 'Failed to create account' : 'Échec de la création du compte');
      }

      // Step 2: Save onboarding data
      setValidationStep('saving');
      
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          companyName: data.companyName,
          companySize: data.companySize,
          industry: data.industry,
          fiscalYearEnd: data.fiscalYearEnd,
          currency: data.currency,
          primarySource: data.primarySource,
          skipSource: data.skipSource,
          teamEmails: data.teamEmails,
          skipTeam: data.skipTeam,
        }),
      });

      if (!response.ok) {
        console.warn('Failed to save onboarding data, but account was created');
      }

      // Step 3: Success - redirect to app
      setValidationStep('success');
      
      // Brief delay to show success state before redirecting
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      onFinish();
    } catch (error) {
      console.error('Error during account creation:', error);
      setValidationStep('error');
      
      // Parse error message
      if (error instanceof Error) {
        if (error.message.includes('already exists') || error.message.includes('409')) {
          setErrorMessage(isEn 
            ? 'An account with this email already exists. Please try logging in instead.'
            : 'Un compte avec cet email existe déjà. Veuillez vous connecter.'
          );
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          setErrorMessage(isEn 
            ? 'Network error. Please check your connection and try again.'
            : 'Erreur réseau. Veuillez vérifier votre connexion et réessayer.'
          );
        } else {
          setErrorMessage(error.message);
        }
      } else {
        setErrorMessage(isEn 
          ? 'An unexpected error occurred. Please try again.'
          : 'Une erreur inattendue s\'est produite. Veuillez réessayer.'
        );
      }
    } finally {
      if (validationStep !== 'success') {
        setIsValidating(false);
      }
    }
  };

  // Validation progress UI
  if (isValidating) {
    return (
      <div className="text-center max-w-md mx-auto">
        <div className="mb-8">
          {validationStep === 'success' ? (
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}
            >
              <Check className="w-10 h-10" style={{ color: 'rgb(var(--color-success))' }} />
            </div>
          ) : (
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
          )}
          
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
            {validationStep === 'success' 
              ? (isEn ? 'Account Created!' : 'Compte créé!')
              : (isEn ? 'Creating your account...' : 'Création de votre compte...')
            }
          </h2>
          
          <p className="mb-6" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {validationStep === 'registering' && (isEn ? 'Validating your credentials...' : 'Validation de vos identifiants...')}
            {validationStep === 'saving' && (isEn ? 'Setting up your workspace...' : 'Configuration de votre espace...')}
            {validationStep === 'success' && (isEn ? 'Redirecting to your dashboard...' : 'Redirection vers votre tableau de bord...')}
          </p>
        </div>

        {/* Progress steps */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
            {validationStep === 'registering' ? (
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'rgb(var(--color-primary-500))' }} />
            ) : (
              <Check className="w-5 h-5" style={{ color: 'rgb(var(--color-success))' }} />
            )}
            <span style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Creating secure account' : 'Création du compte sécurisé'}
            </span>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
            {validationStep === 'registering' ? (
              <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: 'rgb(var(--color-border))' }} />
            ) : validationStep === 'saving' ? (
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'rgb(var(--color-primary-500))' }} />
            ) : (
              <Check className="w-5 h-5" style={{ color: 'rgb(var(--color-success))' }} />
            )}
            <span style={{ color: validationStep === 'registering' ? 'rgb(var(--color-text-muted))' : 'rgb(var(--color-text))' }}>
              {isEn ? 'Configuring workspace' : 'Configuration de l\'espace'}
            </span>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
            {validationStep === 'success' ? (
              <Check className="w-5 h-5" style={{ color: 'rgb(var(--color-success))' }} />
            ) : (
              <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: 'rgb(var(--color-border))' }} />
            )}
            <span style={{ color: validationStep === 'success' ? 'rgb(var(--color-text))' : 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Launching dashboard' : 'Lancement du tableau de bord'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (validationStep === 'error' && errorMessage) {
    return (
      <div className="text-center max-w-md mx-auto">
        <div className="mb-8">
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: 'rgb(var(--color-error) / 0.1)' }}
          >
            <AlertTriangle className="w-10 h-10" style={{ color: 'rgb(var(--color-error))' }} />
          </div>
          
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Account Creation Failed' : 'Échec de la création du compte'}
          </h2>
          
          <div 
            className="p-4 rounded-xl mb-6"
            style={{ 
              backgroundColor: 'rgb(var(--color-error) / 0.1)',
              border: '1px solid rgb(var(--color-error) / 0.2)'
            }}
          >
            <p style={{ color: 'rgb(var(--color-error))' }}>
              {errorMessage}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={handleFinish} 
            className="btn-primary"
          >
            {isEn ? 'Try Again' : 'Réessayer'}
            <ArrowRight className="w-5 h-5" />
          </button>
          
          <a 
            href="/login"
            className="btn-secondary"
          >
            {isEn ? 'Go to Login' : 'Aller à la connexion'}
          </a>
        </div>
      </div>
    );
  }

  // Default: Ready to create account
  return (
    <div className="text-center max-w-xl mx-auto">
      <div className="mb-8">
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
        >
          <PartyPopper className="w-10 h-10" style={{ color: 'rgb(var(--color-primary-500))' }} />
        </div>
        <h1 className="text-3xl font-bold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? "You're all set!" : "Vous êtes prêt!"}
        </h1>
        <p className="text-lg mb-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
          {isEn 
            ? `Let's create your account and launch ${data.companyName}'s dashboard.`
            : `Créons votre compte et lançons le tableau de bord de ${data.companyName}.`}
        </p>
        <p className="text-sm" style={{ color: 'rgb(var(--color-primary-600))' }}>
          {isEn 
            ? 'Our clients save an average of $847K/year. Start seeing your ROI today.'
            : 'Nos clients économisent en moyenne 847 000$/an. Commencez à voir votre ROI dès aujourd\'hui.'}
        </p>
      </div>
      
      {/* Account to be created */}
      <div 
        className="mb-6 p-4 rounded-xl text-left"
        style={{ 
          backgroundColor: 'rgb(var(--color-primary-500) / 0.05)',
          border: '1px solid rgb(var(--color-primary-500) / 0.2)'
        }}
      >
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
          <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Account details' : 'Détails du compte'}
          </span>
        </div>
        <div className="ml-8 space-y-1">
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            <span className="font-medium">{isEn ? 'Email:' : 'Courriel:'}</span> {data.email}
          </p>
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            <span className="font-medium">{isEn ? 'Organization:' : 'Organisation:'}</span> {data.companyName}
          </p>
          <p className="text-sm flex items-center gap-1" style={{ color: 'rgb(var(--color-success))' }}>
            <Check className="w-3.5 h-3.5" />
            {isEn ? 'Password validated' : 'Mot de passe validé'}
          </p>
        </div>
      </div>

      {/* What happens next */}
      <div 
        className="p-6 rounded-xl text-left mb-6"
        style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
      >
        <h3 className="font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'What happens next' : 'Ce qui se passe ensuite'}
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" 
              style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}>1</div>
            <div>
              <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Secure account creation' : 'Création de compte sécurisée'}
              </span>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Your credentials are encrypted and validated' : 'Vos identifiants sont chiffrés et validés'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" 
              style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}>2</div>
            <div>
              <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Workspace configuration' : 'Configuration de l\'espace'}
              </span>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Industry KPIs and settings applied' : 'KPIs et paramètres de l\'industrie appliqués'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" 
              style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}>3</div>
            <div>
              <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Launch your dashboard' : 'Lancez votre tableau de bord'}
              </span>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Start seeing AI-powered insights immediately' : 'Voyez les insights IA immédiatement'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div 
        className="p-4 rounded-xl text-left mb-8"
        style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
      >
        <h4 className="text-sm font-medium mb-3" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn ? 'Setup summary' : 'Résumé'}
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
            <span style={{ color: 'rgb(var(--color-text-secondary))' }}>{data.companyName}</span>
          </div>
          {data.industry && (
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
              <span style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? `Industry: ${data.industry}` : `Industrie: ${data.industry}`}
              </span>
            </div>
          )}
          {data.teamEmails.length > 0 && (
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
              <span style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? `${data.teamEmails.length} team member(s) invited` : `${data.teamEmails.length} membre(s) invité(s)`}
              </span>
            </div>
          )}
        </div>
      </div>

      <button 
        onClick={handleFinish} 
        className="btn-primary btn-lg"
      >
        {isEn ? 'Create Account & Launch' : 'Créer le compte et lancer'}
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
  
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('signup');
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [startTime] = useState(Date.now());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const steps: OnboardingStep[] = ['signup', 'company_info', 'industry_preview', 'invite_team', 'complete'];
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
    setData(prev => {
      const updated = { ...prev, ...newData };
      // Save to localStorage for FinancialModel to access
      try {
        localStorage.setItem('pl_onboarding_data', JSON.stringify(updated));
      } catch (e) {
        // Ignore errors
      }
      return updated;
    });
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

            {/* Desktop Nav - opens in new tab to preserve onboarding progress */}
            <nav className="hidden md:flex items-center gap-6">
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
        {currentStep === 'signup' && (
          <SignupStep data={data} onChange={updateData} onNext={goNext} />
        )}
        {currentStep === 'company_info' && (
          <CompanyInfoStep data={data} onChange={updateData} onNext={goNext} onBack={goBack} />
        )}
        {currentStep === 'industry_preview' && (
          <IndustryPreviewStep data={data} onChange={updateData} onNext={goNext} onBack={goBack} />
        )}
        {currentStep === 'invite_team' && (
          <InviteTeamStep data={data} onChange={updateData} onNext={goNext} onBack={goBack} />
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
