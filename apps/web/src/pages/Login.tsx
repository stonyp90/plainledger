/**
 * Login Page
 * Custom login form that authenticates via backend API
 * Maintains our UI/UX while using Keycloak securely
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
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n, LanguageToggle } from '../lib/i18n';
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
  const { keycloak } = useKeycloak();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
          : 'Courriel vérifié avec succès! Vous pouvez maintenant vous connecter.'
      );
      window.history.replaceState({}, '', '/login');
    }
    
    // Check if user just reset their password
    const passwordReset = searchParams.get('passwordReset');
    if (passwordReset === 'true') {
      setSuccessMessage(
        isEn 
          ? 'Password reset successfully! You can now sign in with your new password.'
          : 'Mot de passe réinitialisé avec succès! Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.'
      );
      window.history.replaceState({}, '', '/login');
    }
  }, [searchParams, isEn]);

  // Track page view
  useEffect(() => {
    analytics.page('login');
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      analytics.track('login_attempt', { email: email.toLowerCase() });

      // Authenticate via backend API endpoint
      // This maintains our custom UI while using Keycloak securely
      // The backend uses Direct Access Grants with the API client credentials
      // Use relative URL to align with ALB routing rules (/api/* routes to API service)
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle EMAIL_NOT_VERIFIED error - redirect to verify-email page
        if (errorData.error === 'EMAIL_NOT_VERIFIED') {
          analytics.track('login_email_not_verified', { email: email.toLowerCase() });
          navigate(`/verify-email?email=${encodeURIComponent(errorData.email || email.toLowerCase())}`);
          return;
        }
        
        const errorMsg = errorData.message || errorData.error || 'Invalid email or password';
        throw new Error(errorMsg);
      }

      const data = await response.json();

      if (data.accessToken && data.user) {
        analytics.track('login_success', { userId: data.user.id });
        
        // Store tokens in sessionStorage for Keycloak client to pick up
        // The Keycloak provider will detect these on next render/initialization
        sessionStorage.setItem('kc_token', data.accessToken);
        sessionStorage.setItem('kc_refresh_token', data.refreshToken || '');
        if (data.idToken) {
          sessionStorage.setItem('kc_id_token', data.idToken);
        }
        
        // Store user info temporarily for Keycloak provider to use
        sessionStorage.setItem('kc_user', JSON.stringify(data.user));
        
        // Force Keycloak provider to re-initialize with stored tokens
        // by triggering a page reload - this ensures proper session establishment
        const redirectTo = searchParams.get('redirect') || '/app';
        
        // Use window.location to ensure Keycloak provider picks up tokens on reload
        // The provider checks sessionStorage on initialization
        window.location.href = redirectTo;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(message);
      analytics.track('login_error', { error: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}
    >
      <div className="w-full max-w-md">
        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8"
        >
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ 
                background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-700)) 100%)',
                boxShadow: '0 2px 8px rgb(var(--color-primary-500) / 0.25)'
              }}
            >
              <svg className="w-6 h-6" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="5" width="3" height="22" rx="1" fill="rgba(255,255,255,0.5)"/>
                <rect x="8" y="5" width="20" height="22" rx="2" fill="white"/>
                <line x1="11" y1="10" x2="25" y2="10" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="11" y1="15" x2="25" y2="15" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="11" y1="20" x2="20" y2="20" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M17 21 L20 24 L26 17" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
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
            <h1 
              className="text-2xl font-bold mb-2"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? 'Sign in to your account' : 'Connectez-vous à votre compte'}
            </h1>
            <p 
              className="text-sm"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn 
                ? 'Enter your email and password to continue'
                : 'Entrez votre courriel et mot de passe pour continuer'}
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
                border: '1px solid rgb(var(--color-success) / 0.2)'
              }}
            >
              <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(var(--color-success))' }} />
              <p className="text-sm" style={{ color: 'rgb(var(--color-success))' }}>{successMessage}</p>
            </motion.div>
          )}

          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-lg flex items-start gap-3"
              style={{ 
                backgroundColor: 'rgb(var(--color-error) / 0.1)',
                border: '1px solid rgb(var(--color-error) / 0.2)'
              }}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(var(--color-error))' }} />
              <p className="text-sm" style={{ color: 'rgb(var(--color-error))' }}>{error}</p>
            </motion.div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Email' : 'Courriel'} *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                <input
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
                  required
                  autoFocus
                  autoComplete="email"
                />
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
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder={isEn ? 'Enter your password' : 'Entrez votre mot de passe'}
                  className="w-full pl-10 pr-12 py-2.5 rounded-lg border transition-colors"
                  style={{
                    backgroundColor: 'rgb(var(--color-bg-subtle))',
                    borderColor: 'rgb(var(--color-border))',
                    color: 'rgb(var(--color-text))',
                  }}
                  required
                  autoComplete="current-password"
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
            </div>

            {/* Forgot Password Link */}
            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                className="text-sm font-medium"
                style={{ color: 'rgb(var(--color-primary-500))' }}
              >
                {isEn ? 'Forgot password?' : 'Mot de passe oublié?'}
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!email || !password || isSubmitting}
              className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: (email && password && !isSubmitting) ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-bg-muted))',
                color: (email && password && !isSubmitting) ? 'white' : 'rgb(var(--color-text-muted))',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isEn ? 'Signing in...' : 'Connexion...'}
                </>
              ) : (
                isEn ? 'Sign in' : 'Se connecter'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: 'rgb(var(--color-border))' }}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span 
                className="px-2" 
                style={{ 
                  backgroundColor: 'rgb(var(--color-surface))',
                  color: 'rgb(var(--color-text-muted))'
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
                ? 'Your data is encrypted and secure'
                : 'Vos données sont chiffrées et sécurisées'}
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
          Built by CPAs for CPAs · Bank-level encryption · Data in Canada
        </p>
      </div>
    </div>
  );
}
