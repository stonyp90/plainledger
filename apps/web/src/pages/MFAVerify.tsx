/**
 * MFA Verify Page
 * Custom UI for OTP verification during login
 */

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import ThemeToggle from '../components/ThemeToggle';
import { LanguageToggle } from '../lib/i18n';
import { analytics } from '../lib/analytics';

export default function MFAVerify() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useI18n();
  const isEn = language === 'en';

  // Get session ID from URL (passed from login when MFA is required)
  const sessionId = searchParams.get('session');
  const email = searchParams.get('email');

  // State
  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (otpCode.length === 6 && !isSubmitting) {
      handleSubmit();
    }
  }, [otpCode]);

  // Handle OTP verification
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!otpCode || otpCode.length !== 6 || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      analytics.track('mfa_verify_attempt');

      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          code: otpCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid code. Please try again.');
      }

      analytics.track('mfa_verify_success');

      // Store tokens and redirect
      if (data.accessToken) {
        sessionStorage.setItem('kc_token', data.accessToken);
        sessionStorage.setItem('kc_refresh_token', data.refreshToken || '');
        if (data.idToken) {
          sessionStorage.setItem('kc_id_token', data.idToken);
        }
        
        const redirectTo = searchParams.get('redirect') || '/app';
        window.location.href = redirectTo;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed. Please try again.';
      setError(message);
      setOtpCode(''); // Clear code on error
      inputRef.current?.focus();
      analytics.track('mfa_verify_error', { error: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // No session - redirect to login
  if (!sessionId) {
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
            style={{ backgroundColor: 'rgb(var(--color-warning) / 0.1)' }}
          >
            <AlertCircle className="w-8 h-8" style={{ color: 'rgb(var(--color-warning))' }} />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Session Expired' : 'Session expirée'}
          </h1>
          <p className="mb-6" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn 
              ? 'Please log in again to continue.'
              : 'Veuillez vous reconnecter pour continuer.'}
          </p>
          <Link
            to="/login"
            className="btn-primary inline-flex items-center gap-2"
          >
            {isEn ? 'Go to Login' : 'Aller à la connexion'}
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
            <div 
              className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <Shield className="w-6 h-6" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Two-Factor Authentication' : 'Authentification à deux facteurs'}
            </h1>
            <p style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn 
                ? 'Enter the code from your authenticator app'
                : 'Entrez le code de votre application d\'authentification'}
            </p>
            {email && (
              <p className="text-sm mt-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {email}
              </p>
            )}
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

          {/* OTP Input */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-center" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? '6-digit code' : 'Code à 6 chiffres'}
              </label>
              <input
                ref={inputRef}
                type="text"
                value={otpCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtpCode(value);
                  setError(null);
                }}
                placeholder="000000"
                className="w-full px-4 py-4 text-center text-3xl font-mono tracking-[0.5em] rounded-lg border transition-colors"
                style={{
                  backgroundColor: 'rgb(var(--color-bg-subtle))',
                  borderColor: error ? 'rgb(var(--color-error))' : 'rgb(var(--color-border))',
                  color: 'rgb(var(--color-text))',
                }}
                maxLength={6}
                autoComplete="one-time-code"
                inputMode="numeric"
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              disabled={otpCode.length !== 6 || isSubmitting}
              className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: otpCode.length === 6 && !isSubmitting ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-bg-muted))',
                color: otpCode.length === 6 && !isSubmitting ? 'white' : 'rgb(var(--color-text-muted))',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isEn ? 'Verifying...' : 'Vérification...'}
                </>
              ) : (
                isEn ? 'Verify' : 'Vérifier'
              )}
            </button>
          </form>

          {/* Help text */}
          <div className="mt-6 text-center">
            <p className="text-xs mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn 
                ? 'Open your authenticator app and enter the 6-digit code displayed for PlainLedger.'
                : 'Ouvrez votre application d\'authentification et entrez le code à 6 chiffres affiché pour PlainLedger.'}
            </p>
          </div>

          {/* Back to Login */}
          <div className="mt-4 text-center">
            <Link
              to="/login"
              className="text-sm font-medium inline-flex items-center gap-2"
              style={{ color: 'rgb(var(--color-primary-500))' }}
            >
              <ArrowLeft className="w-4 h-4" />
              {isEn ? 'Use a different account' : 'Utiliser un autre compte'}
            </Link>
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
          {isEn 
            ? 'Lost access to your authenticator? Contact support@plainledger.ca'
            : 'Accès perdu à votre authentificateur? Contactez support@plainledger.ca'}
        </p>
      </div>
    </div>
  );
}
