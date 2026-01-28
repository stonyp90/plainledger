/**
 * Signup Page
 * Custom registration form that creates users via Keycloak Admin API
 * Provides seamless branded experience within the app
 */

import { useState, useEffect } from 'react';
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
  Building2,
  Mail,
  User,
  Lock,
  MapPin,
  ChevronDown,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n, LanguageToggle } from '../lib/i18n';
import ThemeToggle from '../components/ThemeToggle';
import { analytics } from '../lib/analytics';

// =====================================================
// TYPES
// =====================================================

interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  organizationName: string;
  province: string;
  agreeToTerms: boolean;
}

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
  organizationName: '',
  province: '',
  agreeToTerms: false,
};

// =====================================================
// COMPONENT
// =====================================================

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useI18n();
  const isEn = language === 'en';

  // Form state
  const [formData, setFormData] = useState<SignupFormData>(INITIAL_FORM_DATA);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Pre-fill email from URL params (for team invites)
  useEffect(() => {
    const email = searchParams.get('email');
    const org = searchParams.get('org');
    if (email) {
      setFormData((prev) => ({ ...prev, email }));
    }
    if (org) {
      setFormData((prev) => ({ ...prev, organizationName: org }));
    }
  }, [searchParams]);

  // Track page view
  useEffect(() => {
    analytics.page('signup');
  }, []);

  // Update form field
  const updateField = (field: keyof SignupFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Check password requirements
  const passwordMet = PASSWORD_REQUIREMENTS.map((req) => ({
    ...req,
    met: req.check(formData.password),
  }));
  const allPasswordRequirementsMet = passwordMet.every((r) => r.met);
  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0;

  // Form validation
  const isFormValid =
    formData.firstName.trim().length > 0 &&
    formData.lastName.trim().length > 0 &&
    formData.email.trim().length > 0 &&
    formData.email.includes('@') &&
    formData.province.length > 0 &&
    allPasswordRequirementsMet &&
    passwordsMatch &&
    formData.agreeToTerms;

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      analytics.track('signup_submitted', { 
        hasOrganization: !!formData.organizationName 
      });

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
          ...(formData.organizationName.trim() && { organizationName: formData.organizationName.trim() }),
          province: formData.province,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors
        if (data.errors && Array.isArray(data.errors)) {
          throw new Error(data.errors.join('. '));
        }
        throw new Error(data.message || 'Registration failed');
      }

      analytics.track('signup_success', { userId: data.userId });
      setSuccess(true);

      // Redirect to email verification page after short delay
      setTimeout(() => {
        navigate('/verify-email?email=' + encodeURIComponent(formData.email));
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(message);
      analytics.track('signup_error', { error: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (success) {
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
            className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}
          >
            <Check className="w-8 h-8" style={{ color: 'rgb(var(--color-success))' }} />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Account Created!' : 'Compte créé!'}
          </h1>
          <p style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn 
              ? `We've sent a verification email to ${formData.email}. Please check your inbox.`
              : `Nous avons envoyé un courriel de vérification à ${formData.email}. Veuillez vérifier votre boîte de réception.`}
          </p>
          <div className="mt-8">
            <Loader2 className="w-6 h-6 mx-auto animate-spin" style={{ color: 'rgb(var(--color-primary-500))' }} />
            <p className="text-sm mt-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Redirecting...' : 'Redirection...'}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: 'rgb(var(--color-bg))' }}
    >
      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
          >
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg" style={{ color: 'rgb(var(--color-text))' }}>
            PlainLedger
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-8">
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
                ? 'Start your 21-day free trial. No credit card required.'
                : 'Commencez votre essai gratuit de 21 jours. Aucune carte de crédit requise.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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

            {/* Organization Name and Province */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Organization name' : 'Nom de l\'organisation'} 
                  <span className="text-xs ml-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    ({isEn ? 'optional' : 'optionnel'})
                  </span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                  <input
                    type="text"
                    value={formData.organizationName}
                    onChange={(e) => updateField('organizationName', e.target.value)}
                    placeholder={isEn ? 'Acme Corp' : 'Entreprise ABC'}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border transition-colors"
                    style={{
                      backgroundColor: 'rgb(var(--color-bg-subtle))',
                      borderColor: 'rgb(var(--color-border))',
                      color: 'rgb(var(--color-text))',
                    }}
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
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="terms"
                checked={formData.agreeToTerms}
                onChange={(e) => updateField('agreeToTerms', e.target.checked)}
                className="mt-1 w-4 h-4 rounded"
                style={{ accentColor: 'rgb(var(--color-primary-500))' }}
              />
              <label htmlFor="terms" className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? (
                  <>
                    I agree to the{' '}
                    <Link to="/terms" className="underline" style={{ color: 'rgb(var(--color-primary-500))' }}>
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" className="underline" style={{ color: 'rgb(var(--color-primary-500))' }}>
                      Privacy Policy
                    </Link>
                  </>
                ) : (
                  <>
                    J'accepte les{' '}
                    <Link to="/terms" className="underline" style={{ color: 'rgb(var(--color-primary-500))' }}>
                      Conditions d'utilisation
                    </Link>{' '}
                    et la{' '}
                    <Link to="/privacy" className="underline" style={{ color: 'rgb(var(--color-primary-500))' }}>
                      Politique de confidentialité
                    </Link>
                  </>
                )}
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: isFormValid ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-bg-muted))',
                color: isFormValid ? 'white' : 'rgb(var(--color-text-muted))',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isEn ? 'Creating account...' : 'Création du compte...'}
                </>
              ) : (
                <>
                  {isEn ? 'Create account' : 'Créer le compte'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: 'rgb(var(--color-border))' }}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span 
                className="px-2" 
                style={{ 
                  backgroundColor: 'rgb(var(--color-bg))',
                  color: 'rgb(var(--color-text-muted))'
                }}
              >
                {isEn ? 'or' : 'ou'}
              </span>
            </div>
          </div>

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

          {/* Security Note */}
          <div 
            className="flex items-center justify-center gap-2 text-xs"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            <Shield className="w-4 h-4" />
            <span>
              {isEn 
                ? 'Your data is encrypted and secure'
                : 'Vos données sont chiffrées et sécurisées'}
            </span>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
