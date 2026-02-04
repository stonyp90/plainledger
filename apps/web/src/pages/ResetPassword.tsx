/**
 * Reset Password Page
 * Custom UI for setting a new password from email reset link
 */

import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Lock,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
  X,
  ShieldAlert,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import ThemeToggle from '../components/ThemeToggle';
import { LanguageToggle } from '../lib/i18n';
import { analytics } from '../lib/analytics';

// Password requirements (same as signup)
interface PasswordRequirement {
  id: string;
  label: string;
  labelFr: string;
  check: (password: string) => boolean;
}

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

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useI18n();
  const isEn = language === 'en';

  // Get token from URL
  const token = searchParams.get('token');

  // Form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenChecking, setTokenChecking] = useState(true);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenValid(false);
        setTokenChecking(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/validate-reset-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          setTokenValid(false);
          return;
        }

        const data = await response.json();
        setTokenValid(data.valid === true);
      } catch {
        setTokenValid(false);
      } finally {
        setTokenChecking(false);
      }
    };

    validateToken();
  }, [token]);

  // Check password requirements
  const passwordMet = PASSWORD_REQUIREMENTS.map((req) => ({
    ...req,
    met: req.check(password),
  }));
  const allPasswordRequirementsMet = passwordMet.every((r) => r.met);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const isFormValid = allPasswordRequirementsMet && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting || !token) return;

    setIsSubmitting(true);
    setError(null);

    try {
      analytics.track('password_reset_submit');

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(isEn 
          ? 'Server error. Please try again later.' 
          : 'Erreur du serveur. Veuillez réessayer plus tard.');
      }

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error(isEn 
          ? 'Server error. Please try again later.' 
          : 'Erreur du serveur. Veuillez réessayer plus tard.');
      }

      if (!response.ok) {
        throw new Error(data.message || (isEn ? 'Failed to reset password' : 'Échec de la réinitialisation'));
      }

      analytics.track('password_reset_success');
      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login?passwordReset=true');
      }, 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reset password. Please try again.';
      setError(message);
      analytics.track('password_reset_error', { error: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state while checking token
  if (tokenChecking) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}
      >
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" style={{ color: 'rgb(var(--color-primary-500))' }} />
          <p style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn ? 'Validating reset link...' : 'Validation du lien...'}
          </p>
        </div>
      </div>
    );
  }

  // Invalid or expired token
  if (!tokenValid) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full card p-8 text-center"
        >
          <div 
            className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--color-error) / 0.1)' }}
          >
            <ShieldAlert className="w-8 h-8" style={{ color: 'rgb(var(--color-error))' }} />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Invalid or Expired Link' : 'Lien invalide ou expiré'}
          </h1>
          <p className="mb-6" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn 
              ? 'This password reset link is invalid or has expired. Please request a new one.'
              : 'Ce lien de réinitialisation est invalide ou a expiré. Veuillez en demander un nouveau.'}
          </p>
          <Link
            to="/forgot-password"
            className="btn-primary inline-flex items-center gap-2"
          >
            {isEn ? 'Request new link' : 'Demander un nouveau lien'}
          </Link>
          <div className="mt-4">
            <Link
              to="/login"
              className="text-sm font-medium inline-flex items-center gap-2"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              <ArrowLeft className="w-4 h-4" />
              {isEn ? 'Back to login' : 'Retour à la connexion'}
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full card p-8 text-center"
        >
          <div 
            className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}
          >
            <CheckCircle className="w-8 h-8" style={{ color: 'rgb(var(--color-success))' }} />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Password Reset!' : 'Mot de passe réinitialisé!'}
          </h1>
          <p className="mb-6" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn 
              ? 'Your password has been successfully reset. Redirecting you to login...'
              : 'Votre mot de passe a été réinitialisé avec succès. Redirection vers la connexion...'}
          </p>
          <Loader2 className="w-6 h-6 mx-auto animate-spin" style={{ color: 'rgb(var(--color-primary-500))' }} />
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}
    >
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div 
              className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <Lock className="w-6 h-6" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Set New Password' : 'Définir un nouveau mot de passe'}
            </h1>
            <p style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn 
                ? 'Enter your new password below.'
                : 'Entrez votre nouveau mot de passe ci-dessous.'}
            </p>
          </div>

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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'New Password' : 'Nouveau mot de passe'} *
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
                  className="w-full pl-10 pr-12 py-2.5 rounded-lg border transition-colors"
                  style={{
                    backgroundColor: 'rgb(var(--color-bg-subtle))',
                    borderColor: 'rgb(var(--color-border))',
                    color: 'rgb(var(--color-text))',
                  }}
                  required
                  autoFocus
                  autoComplete="new-password"
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
              {password.length > 0 && (
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
                {isEn ? 'Confirm Password' : 'Confirmer le mot de passe'} *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError(null);
                  }}
                  className="w-full pl-10 pr-12 py-2.5 rounded-lg border transition-colors"
                  style={{
                    backgroundColor: 'rgb(var(--color-bg-subtle))',
                    borderColor: confirmPassword.length > 0 
                      ? (passwordsMatch ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))') 
                      : 'rgb(var(--color-border))',
                    color: 'rgb(var(--color-text))',
                  }}
                  required
                  autoComplete="new-password"
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
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-error))' }}>
                  {isEn ? 'Passwords do not match' : 'Les mots de passe ne correspondent pas'}
                </p>
              )}
            </div>

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
                  {isEn ? 'Resetting...' : 'Réinitialisation...'}
                </>
              ) : (
                isEn ? 'Reset Password' : 'Réinitialiser le mot de passe'
              )}
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm font-medium inline-flex items-center gap-2"
              style={{ color: 'rgb(var(--color-primary-500))' }}
            >
              <ArrowLeft className="w-4 h-4" />
              {isEn ? 'Back to login' : 'Retour à la connexion'}
            </Link>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </div>
    </div>
  );
}
