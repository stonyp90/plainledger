/**
 * Signup Page - Unified 3-Step Signup Flow
 * Step 1: Account Info (email, name, password)
 * Step 2: Organization + Industry
 * Step 3: Invite Team
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Check,
  X,
  AlertCircle,
  Loader2,
  ArrowRight,
  Shield,
  Mail,
  User,
  Lock,
  MapPin,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  PartyPopper,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../lib/i18n';
import PublicHeader from '../components/PublicHeader';
import Checkbox from '../components/Checkbox';
import TermsModal from '../components/TermsModal';
import { analytics } from '../lib/analytics';
import { CompanyInfoStep, IndustryPreviewStep, InviteTeamStep, type OnboardingData } from '../components/Onboarding';

// =====================================================
// TYPES
// =====================================================

interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  province: string;
  agreeToTerms: boolean;
}

type SignupStep = 1 | 2 | 3 | 'success';

// Canadian Provinces and Territories
const CANADIAN_PROVINCES = [
  { code: 'AB', name: 'Alberta', nameFr: 'Alberta' },
  { code: 'BC', name: 'British Columbia', nameFr: 'Colombie-Britannique' },
  { code: 'MB', name: 'Manitoba', nameFr: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick', nameFr: 'Nouveau-Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador', nameFr: 'Terre-Neuve-et-Labrador' },
  { code: 'NS', name: 'Nova Scotia', nameFr: 'Nouvelle-Écosse' },
  { code: 'NT', name: 'Northwest Territories', nameFr: 'Territoires du Nord-Ouest' },
  { code: 'NU', name: 'Nunavut', nameFr: 'Nunavut' },
  { code: 'ON', name: 'Ontario', nameFr: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island', nameFr: 'Île-du-Prince-Édouard' },
  { code: 'QC', name: 'Quebec', nameFr: 'Québec' },
  { code: 'SK', name: 'Saskatchewan', nameFr: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon', nameFr: 'Yukon' },
];

interface PasswordRequirement {
  id: string;
  label: string;
  labelFr: string;
  check: (password: string) => boolean;
}

// =====================================================
// CONSTANTS
// =====================================================

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    id: 'length',
    label: 'At least 12 characters',
    labelFr: 'Au moins 12 caractères',
    check: (p) => p.length >= 12,
  },
  {
    id: 'uppercase',
    label: 'One uppercase letter',
    labelFr: 'Une lettre majuscule',
    check: (p) => /[A-Z]/.test(p),
  },
  {
    id: 'lowercase',
    label: 'One lowercase letter',
    labelFr: 'Une lettre minuscule',
    check: (p) => /[a-z]/.test(p),
  },
  {
    id: 'number',
    label: 'One number',
    labelFr: 'Un chiffre',
    check: (p) => /\d/.test(p),
  },
  {
    id: 'special',
    label: 'One special character (!@#$%^&*)',
    labelFr: 'Un caractère spécial (!@#$%^&*)',
    check: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p),
  },
];

const INITIAL_FORM_DATA: SignupFormData = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  province: '',
  agreeToTerms: false,
};

const INITIAL_ONBOARDING_DATA: OnboardingData = {
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
// COMPONENT
// =====================================================

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useI18n();
  const { resolvedTheme } = useTheme();
  const isEn = language === 'en';
  const isDark = resolvedTheme === 'dark';

  // Step management
  const [currentStep, setCurrentStep] = useState<SignupStep>(1);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState<SignupFormData>(INITIAL_FORM_DATA);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(INITIAL_ONBOARDING_DATA);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountCreated, setAccountCreated] = useState(false);

  // Pre-fill email from URL params (for team invites)
  useEffect(() => {
    const email = searchParams.get('email');
    const org = searchParams.get('org');
    if (email) {
      setFormData((prev) => ({ ...prev, email }));
    }
    if (org) {
      setOnboardingData((prev) => ({ ...prev, companyName: org }));
    }
  }, [searchParams]);

  // Track page view
  useEffect(() => {
    analytics.page('signup');
  }, []);

  // Load saved progress from localStorage
  useEffect(() => {
    try {
      const savedFormData = localStorage.getItem('pl_signup_form_data');
      const savedOnboardingData = localStorage.getItem('pl_signup_onboarding_data');
      const savedStep = localStorage.getItem('pl_signup_step');
      
      if (savedFormData) {
        setFormData(JSON.parse(savedFormData));
      }
      if (savedOnboardingData) {
        setOnboardingData(JSON.parse(savedOnboardingData));
      }
      if (savedStep && ['1', '2', '3'].includes(savedStep)) {
        setCurrentStep(parseInt(savedStep) as SignupStep);
      }
    } catch (e) {
      // Ignore errors
    }
  }, []);

  // Save progress to localStorage
  const saveProgress = useCallback(() => {
    try {
      localStorage.setItem('pl_signup_form_data', JSON.stringify(formData));
      localStorage.setItem('pl_signup_onboarding_data', JSON.stringify(onboardingData));
      localStorage.setItem('pl_signup_step', currentStep.toString());
    } catch (e) {
      // Ignore errors
    }
  }, [formData, onboardingData, currentStep]);

  useEffect(() => {
    saveProgress();
  }, [saveProgress]);

  // Update form field
  const updateField = (field: keyof SignupFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Update onboarding data
  const updateOnboardingData = useCallback((data: Partial<OnboardingData>) => {
    setOnboardingData((prev) => ({ ...prev, ...data }));
  }, []);

  // Check password requirements
  const passwordMet = PASSWORD_REQUIREMENTS.map((req) => ({
    ...req,
    met: req.check(formData.password),
  }));
  const allPasswordRequirementsMet = passwordMet.every((r) => r.met);
  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0;

  // Form validation for step 1
  const isStep1Valid =
    formData.firstName.trim().length > 0 &&
    formData.lastName.trim().length > 0 &&
    formData.email.trim().length > 0 &&
    formData.email.includes('@') &&
    formData.province.length > 0 &&
    allPasswordRequirementsMet &&
    passwordsMatch &&
    formData.agreeToTerms;

  // Handle step 1 submission (create account)
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStep1Valid || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      analytics.track('signup_step1_submitted');

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          password: formData.password,
          province: formData.province,
        }),
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(isEn 
          ? 'Server error. Please try again later.' 
          : 'Erreur du serveur. Veuillez réessayer plus tard.');
      }

      // Safely parse JSON (some gateways may return HTML with wrong content-type)
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error(isEn 
          ? 'Server error. Please try again later.' 
          : 'Erreur du serveur. Veuillez réessayer plus tard.');
      }

      if (!response.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          throw new Error(data.errors.join('. '));
        }
        throw new Error(data.message || (isEn ? 'Registration failed' : 'Échec de l\'inscription'));
      }

      analytics.track('signup_account_created', { userId: data.userId });
      setAccountCreated(true);
      
      // Move to step 2 after account creation
      setCurrentStep(2);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(message);
      analytics.track('signup_error', { error: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle step 2 completion
  const [showIndustryPreview, setShowIndustryPreview] = useState(false);
  
  const handleStep2Next = () => {
    if (onboardingData.companyName.trim().length === 0) {
      return; // Can't proceed without company name
    }
    
    if (onboardingData.industry && !showIndustryPreview) {
      // Show industry preview if industry is selected
      setShowIndustryPreview(true);
    } else {
      // Move to step 3
      setShowIndustryPreview(false);
      setCurrentStep(3);
    }
  };

  // Reset industry preview when changing steps
  useEffect(() => {
    if (currentStep !== 2) {
      setShowIndustryPreview(false);
    }
  }, [currentStep]);

  // Handle step 3 completion (final step)
  const handleStep3Complete = async () => {
    setIsSubmitting(true);
    try {
      // Save onboarding data
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          companyName: onboardingData.companyName,
          companySize: onboardingData.companySize,
          industry: onboardingData.industry,
          fiscalYearEnd: onboardingData.fiscalYearEnd,
          currency: onboardingData.currency,
          primarySource: onboardingData.primarySource,
          skipSource: onboardingData.skipSource,
          teamEmails: onboardingData.teamEmails,
          skipTeam: onboardingData.skipTeam,
        }),
      });

      // Only warn if response is not ok - don't block signup completion
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          console.warn('Failed to save onboarding data');
        }
        // Non-JSON response (server error) - continue silently
      }

      analytics.track('signup_completed');
      
      // Clear saved progress
      localStorage.removeItem('pl_signup_form_data');
      localStorage.removeItem('pl_signup_onboarding_data');
      localStorage.removeItem('pl_signup_step');

      // Show brief success message
      setCurrentStep('success');
      
      // Redirect after 2-3 seconds
      setTimeout(() => {
        // Check if email is verified (in production, this would check the user's emailVerified status)
        // For now, redirect to email verification page
        navigate('/verify-email?email=' + encodeURIComponent(formData.email));
      }, 2500);
    } catch (error) {
      console.error('Error completing signup:', error);
      setError('Failed to complete setup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Progress calculation
  const progress = currentStep === 1 ? 33 : currentStep === 2 ? 66 : currentStep === 3 ? 100 : 100;

  // Success state
  if (currentStep === 'success') {
    return (
      <div 
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: 'rgb(var(--color-bg))' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div 
            className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}
          >
            <PartyPopper className="w-10 h-10" style={{ color: 'rgb(var(--color-success))' }} />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'All Set!' : 'Tout est prêt!'}
          </h1>
          <p style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn 
              ? 'Your account has been created successfully. Redirecting...'
              : 'Votre compte a été créé avec succès. Redirection...'}
          </p>
          <div className="mt-8">
            <Loader2 className="w-6 h-6 mx-auto animate-spin" style={{ color: 'rgb(var(--color-primary-500))' }} />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'rgb(var(--color-bg))' }}
    >
      {/* Header - Using shared PublicHeader component */}
      <PublicHeader 
        fullMenu={false}
        showProgress={{
          currentStep,
          totalSteps: 3,
          progress
        }}
      />

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {/* Step 1: Account Info */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Title */}
              <div className="text-center">
                <h1 className="text-3xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Create your account' : 'Créer votre compte'}
                </h1>
                <p style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn 
                    ? 'Get started for free. No credit card required.'
                    : 'Commencez gratuitement. Aucune carte de crédit requise.'}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleStep1Submit} className="space-y-4">
                {/* Error Alert */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg flex items-start gap-3"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-error) / 0.1)',
                      border: '1px solid rgb(var(--color-error) / 0.2)'
                    }}
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(var(--color-error))' }} />
                    <p className="text-sm" style={{ color: 'rgb(var(--color-error))' }}>{error}</p>
                  </motion.div>
                )}

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'First name' : 'Prénom'} *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => updateField('firstName', e.target.value)}
                        placeholder={isEn ? 'John' : 'Jean'}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border transition-colors"
                        style={{
                          backgroundColor: 'rgb(var(--color-bg-subtle))',
                          borderColor: 'rgb(var(--color-border))',
                          color: 'rgb(var(--color-text))',
                        }}
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'Last name' : 'Nom'} *
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => updateField('lastName', e.target.value)}
                      placeholder={isEn ? 'Doe' : 'Dupont'}
                      className="w-full px-4 py-2.5 rounded-lg border transition-colors"
                      style={{
                        backgroundColor: 'rgb(var(--color-bg-subtle))',
                        borderColor: 'rgb(var(--color-border))',
                        color: 'rgb(var(--color-text))',
                      }}
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? 'Work email' : 'Courriel professionnel'} *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="you@company.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border transition-colors"
                      style={{
                        backgroundColor: 'rgb(var(--color-bg-subtle))',
                        borderColor: 'rgb(var(--color-border))',
                        color: 'rgb(var(--color-text))',
                      }}
                      required
                    />
                  </div>
                </div>

                {/* Province */}
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? 'Province / Territory' : 'Province / Territoire'} *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                    <select
                      value={formData.province}
                      onChange={(e) => updateField('province', e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-lg border transition-colors appearance-none cursor-pointer"
                      style={{
                        backgroundColor: 'rgb(var(--color-bg-subtle))',
                        borderColor: 'rgb(var(--color-border))',
                        color: formData.province ? 'rgb(var(--color-text))' : 'rgb(var(--color-text-muted))',
                      }}
                      required
                    >
                      <option value="">{isEn ? 'Select province...' : 'Sélectionner...'}</option>
                      {CANADIAN_PROVINCES.map((prov) => (
                        <option key={prov.code} value={prov.code}>
                          {isEn ? prov.name : prov.nameFr}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" style={{ color: 'rgb(var(--color-text-muted))' }} />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? 'Password' : 'Mot de passe'} *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      className="w-full pl-10 pr-12 py-2.5 rounded-lg border transition-colors"
                      style={{
                        backgroundColor: 'rgb(var(--color-bg-subtle))',
                        borderColor: 'rgb(var(--color-border))',
                        color: 'rgb(var(--color-text))',
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'rgb(var(--color-text-muted))' }}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Password Requirements */}
                  {formData.password.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 p-3 rounded-lg"
                      style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                    >
                      <p className="text-xs font-medium mb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        {isEn ? 'Password requirements:' : 'Exigences du mot de passe:'}
                      </p>
                      <div className="grid grid-cols-2 gap-1">
                        {passwordMet.map((req) => (
                          <div key={req.id} className="flex items-center gap-1.5">
                            {req.met ? (
                              <Check className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-success))' }} />
                            ) : (
                              <X className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                            )}
                            <span 
                              className="text-xs"
                              style={{ color: req.met ? 'rgb(var(--color-success))' : 'rgb(var(--color-text-muted))' }}
                            >
                              {isEn ? req.label : req.labelFr}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? 'Confirm password' : 'Confirmer le mot de passe'} *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => updateField('confirmPassword', e.target.value)}
                      className="w-full pl-10 pr-12 py-2.5 rounded-lg border transition-colors"
                      style={{
                        backgroundColor: 'rgb(var(--color-bg-subtle))',
                        borderColor: formData.confirmPassword.length > 0 
                          ? (passwordsMatch ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))') 
                          : 'rgb(var(--color-border))',
                        color: 'rgb(var(--color-text))',
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'rgb(var(--color-text-muted))' }}
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {formData.confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-error))' }}>
                      {isEn ? 'Passwords do not match' : 'Les mots de passe ne correspondent pas'}
                    </p>
                  )}
                </div>

                {/* Terms */}
                <div>
                  <Checkbox
                    checked={formData.agreeToTerms}
                    onChange={() => {
                      // Don't allow direct checkbox toggle - user must go through modal
                      if (!formData.agreeToTerms) {
                        setShowTermsModal(true);
                      }
                    }}
                    disabled={formData.agreeToTerms}
                    label={
                      isEn ? (
                        <>
                          I agree to the{' '}
                          <button
                            type="button"
                            onClick={() => setShowTermsModal(true)}
                            className="underline hover:no-underline font-medium"
                            style={{ color: 'rgb(var(--color-primary-500))' }}
                          >
                            Terms of Service
                          </button>{' '}
                          and{' '}
                          <Link to="/privacy" className="underline hover:no-underline" style={{ color: 'rgb(var(--color-primary-500))' }}>
                            Privacy Policy
                          </Link>
                        </>
                      ) : (
                        <>
                          J'accepte les{' '}
                          <button
                            type="button"
                            onClick={() => setShowTermsModal(true)}
                            className="underline hover:no-underline font-medium"
                            style={{ color: 'rgb(var(--color-primary-500))' }}
                          >
                            Conditions d'utilisation
                          </button>{' '}
                          et la{' '}
                          <Link to="/privacy" className="underline hover:no-underline" style={{ color: 'rgb(var(--color-primary-500))' }}>
                            Politique de confidentialité
                          </Link>
                        </>
                      )
                    }
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!isStep1Valid || isSubmitting}
                  className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: isStep1Valid ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-bg-muted))',
                    color: isStep1Valid ? 'white' : 'rgb(var(--color-text-muted))',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {isEn ? 'Creating account...' : 'Création du compte...'}
                    </>
                  ) : (
                    <>
                      {isEn ? 'Continue' : 'Continuer'}
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              {/* Sign In Link */}
              <div className="text-center">
                <p style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Already have an account?' : 'Vous avez déjà un compte?'}{' '}
                  <Link 
                    to="/login" 
                    className="font-medium"
                    style={{ color: 'rgb(var(--color-primary-500))' }}
                  >
                    {isEn ? 'Sign in' : 'Se connecter'}
                  </Link>
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 2: Organization + Industry */}
          {currentStep === 2 && (
            <div>
              {!showIndustryPreview ? (
                <CompanyInfoStep 
                  data={onboardingData} 
                  onChange={updateOnboardingData} 
                  onNext={handleStep2Next}
                  onBack={() => setCurrentStep(1)}
                />
              ) : (
                <IndustryPreviewStep
                  data={onboardingData}
                  onChange={updateOnboardingData}
                  onNext={handleStep2Next}
                  onBack={() => setShowIndustryPreview(false)}
                />
              )}
            </div>
          )}

          {/* Step 3: Invite Team */}
          {currentStep === 3 && (
            <InviteTeamStep 
              data={onboardingData} 
              onChange={updateOnboardingData} 
              onNext={handleStep3Complete}
              onBack={() => setCurrentStep(2)}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-6 text-center">
        <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn 
            ? 'Need help? Contact support@plainledger.ca'
            : 'Besoin d\'aide ? Contactez support@plainledger.ca'}
        </p>
      </footer>

      {/* Terms Modal */}
      <TermsModal
        isOpen={showTermsModal}
        onAccept={() => {
          updateField('agreeToTerms', true);
          setShowTermsModal(false);
        }}
        onDecline={() => {
          setShowTermsModal(false);
        }}
      />
    </div>
  );
}
