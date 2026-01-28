/**
 * Forgot Password Page
 * Custom UI for password reset requests
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, AlertCircle, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import ThemeToggle from '../components/ThemeToggle';
import { LanguageToggle } from '../lib/i18n';
import { analytics } from '../lib/analytics';

export default function ForgotPassword() {
  const { language } = useI18n();
  const isEn = language === 'en';

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      analytics.track('forgot_password_request', { email: email.toLowerCase() });

      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send password reset email');
      }

      analytics.track('forgot_password_success');
      setSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send password reset email. Please try again.';
      setError(message);
      analytics.track('forgot_password_error', { error: message });
    } finally {
      setIsSubmitting(false);
    }
  };

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
            {isEn ? 'Check your email' : 'Vérifiez votre courriel'}
          </h1>
          <p className="mb-6" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn 
              ? `If an account exists with ${email}, you will receive password reset instructions.`
              : `Si un compte existe avec ${email}, vous recevrez des instructions pour réinitialiser votre mot de passe.`}
          </p>
          <Link
            to="/login"
            className="btn-primary inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {isEn ? 'Back to login' : 'Retour à la connexion'}
          </Link>
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
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Forgot password?' : 'Mot de passe oublié?'}
            </h1>
            <p style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn 
                ? 'Enter your email address and we\'ll send you instructions to reset your password.'
                : 'Entrez votre adresse courriel et nous vous enverrons des instructions pour réinitialiser votre mot de passe.'}
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

            <button
              type="submit"
              disabled={!email || isSubmitting}
              className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: (email && !isSubmitting) ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-bg-muted))',
                color: (email && !isSubmitting) ? 'white' : 'rgb(var(--color-text-muted))',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isEn ? 'Sending...' : 'Envoi...'}
                </>
              ) : (
                isEn ? 'Send reset instructions' : 'Envoyer les instructions'
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
