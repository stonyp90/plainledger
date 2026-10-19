/**
 * Login Page
 * Starts the Keycloak authorization-code flow with PKCE.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Loader2,
  Mail,
  Lock,
  Shield,
  ArrowLeft,
  X,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n, LanguageToggle } from '../lib/i18n';
import PublicHeader from '../components/PublicHeader';
import ThemeToggle from '../components/ThemeToggle';
import { analytics } from '../lib/analytics';
import { useKeycloak } from '../lib/keycloak';

// =====================================================
// COMPONENT
// =====================================================

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useI18n();
  const isEn = language === 'en';
  const { login, initialized, authError } = useKeycloak();

  // Form state
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showBackPopup, setShowBackPopup] = useState(false);

  // Pre-fill email from URL params and check for success messages
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }

    // Check if user just verified their email
    const verified = searchParams.get('verified');
    if (verified === 'true') {
      setSuccessMessage(
        isEn
          ? 'Email verified successfully! You can now sign in.'
          : 'Courriel vérifié avec succès! Vous pouvez maintenant vous connecter.',
      );
      window.history.replaceState({}, '', '/login');
    }

    // Check if user just reset their password
    const passwordReset = searchParams.get('passwordReset');
    if (passwordReset === 'true') {
      setSuccessMessage(
        isEn
          ? 'Password reset successfully! You can now sign in with your new password.'
          : 'Mot de passe réinitialisé avec succès! Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.',
      );
      window.history.replaceState({}, '', '/login');
    }
  }, [searchParams, isEn]);

  // Track page view
  useEffect(() => {
    analytics.page('login');
  }, []);

  // Passwords, MFA, recovery, and identity providers are handled by Keycloak.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !initialized) return;
    setIsSubmitting(true);
    setError(null);
    try {
      analytics.track('login_attempt', { method: 'keycloak' });
      await login(email.trim() || undefined);
    } catch {
      setError(isEn ? 'Secure sign-in is unavailable. Please reload the page and try again.' : 'La connexion sécurisée est indisponible. Rechargez la page et réessayez.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
      {/* Header - Minimal header with just logo and toggles */}
      <PublicHeader minimal={true} />

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        {/* Back to Website Confirmation Popup */}
        {showBackPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={() => setShowBackPopup(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-xl shadow-2xl p-6 relative"
              style={{ backgroundColor: 'rgb(var(--color-surface))' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setShowBackPopup(false)}
                className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                <X className="w-4 h-4" />
              </button>

              {/* Popup content */}
              <div className="text-center">
                <div
                  className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                >
                  <ArrowLeft
                    className="w-6 h-6"
                    style={{ color: 'rgb(var(--color-primary-500))' }}
                  />
                </div>
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn ? 'Return to Website?' : 'Retourner au site web?'}
                </h3>
                <p className="text-sm mb-6" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn
                    ? 'You will leave the login page and return to the main website.'
                    : 'Vous quitterez la page de connexion et retournerez au site web principal.'}
                </p>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowBackPopup(false)}
                    className="flex-1 py-2.5 px-4 rounded-lg font-medium border transition-colors"
                    style={{
                      backgroundColor: 'transparent',
                      borderColor: 'rgb(var(--color-border))',
                      color: 'rgb(var(--color-text))',
                    }}
                  >
                    {isEn ? 'Cancel' : 'Annuler'}
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="flex-1 py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: 'rgb(var(--color-primary-500))',
                      color: 'white',
                    }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {isEn ? 'Go Back' : 'Retourner'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        <div className="w-full max-w-md">
          {/* Login Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-8 relative"
          >
            {/* Back to Website Button */}
            <button
              onClick={() => setShowBackPopup(true)}
              className="absolute top-4 left-4 flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              <ArrowLeft className="w-4 h-4" />
              {isEn ? 'Back' : 'Retour'}
            </button>

            {/* Logo */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="w-10 h-10 flex items-center justify-center">
                <svg
                  className="w-10 h-10"
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
              <span
                className="text-xl font-semibold tracking-tight"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                PlainLedger
              </span>
            </div>

            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Sign in to your account' : 'Connectez-vous à votre compte'}
              </h1>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn
                  ? 'Continue to secure sign-in. You can use your password, SSO, or recovery options there.'
                  : 'Continuez vers la connexion sécurisée pour utiliser votre mot de passe, le SSO ou les options de récupération.'}
              </p>
            </div>

            {/* Success Alert */}
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-lg flex items-start gap-3"
                style={{
                  backgroundColor: 'rgb(var(--color-success) / 0.1)',
                  border: '1px solid rgb(var(--color-success) / 0.2)',
                }}
              >
                <CheckCircle
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: 'rgb(var(--color-success))' }}
                />
                <p className="text-sm" style={{ color: 'rgb(var(--color-success))' }}>
                  {successMessage}
                </p>
              </motion.div>
            )}

            {/* Error Alert */}
            {(error || authError) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-lg flex items-start gap-3"
                style={{
                  backgroundColor: 'rgb(var(--color-error) / 0.1)',
                  border: '1px solid rgb(var(--color-error) / 0.2)',
                }}
              >
                <AlertCircle
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: 'rgb(var(--color-error))' }}
                />
                <p className="text-sm" style={{ color: 'rgb(var(--color-error))' }}>
                  {error || (isEn ? 'Secure sign-in is unavailable. Please reload the page and try again.' : 'La connexion sécurisée est indisponible. Rechargez la page et réessayez.')}
                </p>
              </motion.div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn ? 'Email (optional)' : 'Courriel (facultatif)'}
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    placeholder={isEn ? 'you@company.com' : 'vous@entreprise.com'}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border transition-colors"
                    style={{
                      backgroundColor: 'rgb(var(--color-bg-subtle))',
                      borderColor: 'rgb(var(--color-border))',
                      color: 'rgb(var(--color-text))',
                    }}
                    autoFocus
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!initialized || isSubmitting}
                className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor:
                    initialized && !isSubmitting
                      ? 'rgb(var(--color-primary-500))'
                      : 'rgb(var(--color-bg-muted))',
                  color:
                    initialized && !isSubmitting ? 'white' : 'rgb(var(--color-text-muted))',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isEn ? 'Signing in...' : 'Connexion...'}
                  </>
                ) : isEn ? (
                  'Continue to sign in'
                ) : (
                  'Continuer la connexion'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div
                  className="w-full border-t"
                  style={{ borderColor: 'rgb(var(--color-border))' }}
                ></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span
                  className="px-2"
                  style={{
                    backgroundColor: 'rgb(var(--color-surface))',
                    color: 'rgb(var(--color-text-muted))',
                  }}
                >
                  {isEn ? 'or' : 'ou'}
                </span>
              </div>
            </div>

            {/* Sign Up Link */}
            <div className="text-center">
              <p style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? "Don't have an account?" : "Vous n'avez pas de compte?"}{' '}
                <Link
                  to="/signup"
                  className="font-medium"
                  style={{ color: 'rgb(var(--color-primary-500))' }}
                >
                  {isEn ? 'Create account' : 'Créer un compte'}
                </Link>
              </p>
            </div>

            {/* Security Note */}
            <div
              className="flex items-center justify-center gap-2 text-xs mt-6"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              <Shield className="w-4 h-4" />
              <span>
                {isEn
                  ? 'Protected sign-in with optional multi-factor authentication'
                  : 'Connexion protégée avec authentification multifacteur facultative'}
              </span>
            </div>
          </motion.div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <ThemeToggle />
            <LanguageToggle />
          </div>

          <p
            className="text-center text-xs mt-4"
            style={{ color: 'rgb(var(--color-text-subtle))' }}
          >
            By CPAs for entrepreneurs · Bank-level encryption · Data in Canada
          </p>
        </div>
      </div>
    </div>
  );
}
