/**
 * MFA Setup Page
 * Custom UI for setting up TOTP two-factor authentication
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield,
  Smartphone,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Copy,
  Check,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useKeycloak } from '../lib/keycloak';
import ThemeToggle from '../components/ThemeToggle';
import { LanguageToggle } from '../lib/i18n';
import { analytics } from '../lib/analytics';

export default function MFASetup() {
  const navigate = useNavigate();
  const { language } = useI18n();
  const { user, getToken } = useKeycloak();
  const isEn = language === 'en';

  // State
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch TOTP setup data on mount
  useEffect(() => {
    const fetchSetupData = async () => {
      try {
        const token = getToken();
        const response = await fetch('/api/auth/mfa/setup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
        });

        if (!response.ok) {
          throw new Error(isEn 
            ? 'Failed to initialize MFA setup' 
            : 'Échec de l\'initialisation de la configuration MFA');
        }

        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error(isEn 
            ? 'Server error. Please try again later.' 
            : 'Erreur du serveur. Veuillez réessayer plus tard.');
        }

        const data = await response.json();
        setQrCode(data.qrCode);
        setSecret(data.secret);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load MFA setup');
      } finally {
        setLoading(false);
      }
    };

    fetchSetupData();
  }, [getToken]);

  // Copy secret to clipboard
  const copySecret = async () => {
    if (secret) {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle OTP verification
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6 || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      analytics.track('mfa_setup_verify');

      const token = getToken();
      const response = await fetch('/api/auth/mfa/verify-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ code: otpCode }),
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
        throw new Error(data.message || (isEn ? 'Invalid code. Please try again.' : 'Code invalide. Veuillez réessayer.'));
      }

      analytics.track('mfa_setup_success');
      setSuccess(true);

      // Redirect to app after 2 seconds
      setTimeout(() => {
        navigate('/app');
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed. Please try again.';
      setError(message);
      analytics.track('mfa_setup_error', { error: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}
      >
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" style={{ color: 'rgb(var(--color-primary-500))' }} />
          <p style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn ? 'Loading MFA setup...' : 'Chargement de la configuration MFA...'}
          </p>
        </div>
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
            {isEn ? 'MFA Enabled!' : 'MFA activé!'}
          </h1>
          <p className="mb-6" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn 
              ? 'Two-factor authentication is now enabled on your account.'
              : 'L\'authentification à deux facteurs est maintenant activée sur votre compte.'}
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
              <Shield className="w-6 h-6" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Set Up Two-Factor Authentication' : 'Configurer l\'authentification à deux facteurs'}
            </h1>
            <p style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn 
                ? 'Add an extra layer of security to your account'
                : 'Ajoutez une couche de sécurité supplémentaire à votre compte'}
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

          {/* Instructions */}
          <div 
            className="rounded-lg p-4 mb-6"
            style={{ 
              backgroundColor: 'rgb(var(--color-primary-500) / 0.08)',
              border: '1px solid rgb(var(--color-primary-500) / 0.2)'
            }}
          >
            <div className="flex items-start gap-3">
              <Smartphone className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-primary-600))' }} />
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-primary-600))' }}>
                  {isEn ? 'Step 1: Install an authenticator app' : 'Étape 1: Installez une application d\'authentification'}
                </p>
                <p className="text-xs" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn 
                    ? 'We recommend Google Authenticator, Authy, or Microsoft Authenticator'
                    : 'Nous recommandons Google Authenticator, Authy, ou Microsoft Authenticator'}
                </p>
              </div>
            </div>
          </div>

          {/* QR Code */}
          {qrCode && (
            <div className="text-center mb-6">
              <p className="text-sm font-medium mb-3" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Step 2: Scan this QR code' : 'Étape 2: Scannez ce code QR'}
              </p>
              <div 
                className="inline-block p-4 rounded-lg"
                style={{ backgroundColor: '#ffffff' }}
              >
                <img 
                  src={qrCode} 
                  alt="MFA QR Code" 
                  className="w-48 h-48"
                />
              </div>
            </div>
          )}

          {/* Manual Entry */}
          {secret && (
            <div className="mb-6">
              <p className="text-xs text-center mb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Or enter this code manually:' : 'Ou entrez ce code manuellement:'}
              </p>
              <div 
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
              >
                <code className="text-sm font-mono" style={{ color: 'rgb(var(--color-text))' }}>
                  {secret}
                </code>
                <button
                  onClick={copySecret}
                  className="p-1.5 rounded transition-colors"
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                >
                  {copied ? (
                    <Check className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* OTP Input */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Step 3: Enter the 6-digit code' : 'Étape 3: Entrez le code à 6 chiffres'}
              </label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtpCode(value);
                  setError(null);
                }}
                placeholder="000000"
                className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest rounded-lg border transition-colors"
                style={{
                  backgroundColor: 'rgb(var(--color-bg-subtle))',
                  borderColor: 'rgb(var(--color-border))',
                  color: 'rgb(var(--color-text))',
                }}
                maxLength={6}
                autoComplete="one-time-code"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={otpCode.length !== 6 || isSubmitting}
              className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: otpCode.length === 6 ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-bg-muted))',
                color: otpCode.length === 6 ? 'white' : 'rgb(var(--color-text-muted))',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isEn ? 'Verifying...' : 'Vérification...'}
                </>
              ) : (
                isEn ? 'Enable Two-Factor Authentication' : 'Activer l\'authentification à deux facteurs'
              )}
            </button>
          </form>

          {/* Skip Link */}
          <div className="mt-6 text-center">
            <Link
              to="/app"
              className="text-sm font-medium inline-flex items-center gap-2"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              <ArrowLeft className="w-4 h-4" />
              {isEn ? 'Skip for now' : 'Passer pour l\'instant'}
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
