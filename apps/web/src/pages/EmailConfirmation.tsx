import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, RefreshCw, CheckCircle, ArrowRight, Inbox, Clock, LogIn } from 'lucide-react';
import { useKeycloak } from '../lib/keycloak';
import { useI18n } from '../lib/i18n';

export default function EmailConfirmation() {
  const { user, logout, authenticated } = useKeycloak();
  const { language } = useI18n();
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      // Call the API to resend verification email
      const email = user?.email || new URLSearchParams(window.location.search).get('email');
      if (!email) {
        throw new Error('No email address available');
      }
      
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to resend verification email');
      }
      
      setResendSuccess(true);
      setCountdown(60); // 60 second cooldown
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (error) {
      console.error('Failed to resend email:', error);
    } finally {
      setIsResending(false);
    }
  };

  const handleRefreshStatus = () => {
    // Reload the page to check if email has been verified
    window.location.reload();
  };

  const isEn = language === 'en';

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}
    >
      <div className="w-full max-w-lg">
        {/* Main Card */}
        <div className="card p-8 text-center">
          {/* Icon */}
          <div 
            className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--color-primary-100))' }}
          >
            <Mail 
              className="w-10 h-10" 
              style={{ color: 'rgb(var(--color-primary-600))' }}
            />
          </div>

          {/* Title */}
          <h1 
            className="text-2xl font-bold mb-2"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'Check Your Email' : 'Vérifiez votre courriel'}
          </h1>

          {/* Subtitle */}
          <p 
            className="mb-6"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn 
              ? 'We sent a confirmation link to verify your email address.'
              : 'Nous avons envoyé un lien de confirmation pour vérifier votre adresse courriel.'}
          </p>

          {/* Email Display */}
          <div 
            className="rounded-lg p-4 mb-6"
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
          >
            <div className="flex items-center justify-center gap-2">
              <Inbox className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
              <span 
                className="font-medium"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {user?.email || new URLSearchParams(window.location.search).get('email') || 'your@email.com'}
              </span>
            </div>
          </div>

          {/* Instructions */}
          <div 
            className="rounded-lg p-4 mb-6 text-left"
            style={{ 
              backgroundColor: 'rgb(var(--color-primary-500) / 0.08)',
              border: '1px solid rgb(var(--color-primary-500) / 0.2)'
            }}
          >
            <h3 
              className="font-semibold mb-3 flex items-center gap-2"
              style={{ color: 'rgb(var(--color-primary-600))' }}
            >
              <CheckCircle className="w-4 h-4" />
              {isEn ? 'Next Steps' : 'Prochaines étapes'}
            </h3>
            <ol className="space-y-2 text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              <li className="flex items-start gap-2">
                <span 
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-primary-500) / 0.2)',
                    color: 'rgb(var(--color-primary-600))'
                  }}
                >
                  1
                </span>
                {isEn 
                  ? 'Open the email we sent to your inbox'
                  : 'Ouvrez le courriel que nous avons envoyé'}
              </li>
              <li className="flex items-start gap-2">
                <span 
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-primary-500) / 0.2)',
                    color: 'rgb(var(--color-primary-600))'
                  }}
                >
                  2
                </span>
                {isEn 
                  ? 'Click the "Verify Email" button in the email'
                  : 'Cliquez sur le bouton "Vérifier le courriel"'}
              </li>
              <li className="flex items-start gap-2">
                <span 
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-primary-500) / 0.2)',
                    color: 'rgb(var(--color-primary-600))'
                  }}
                >
                  3
                </span>
                {isEn 
                  ? 'Return here and click "Continue to Dashboard"'
                  : 'Revenez ici et cliquez sur "Continuer"'}
              </li>
            </ol>
          </div>

          {/* Success Message */}
          {resendSuccess && (
            <div 
              className="rounded-lg p-3 mb-4 flex items-center justify-center gap-2"
              style={{ 
                backgroundColor: 'rgb(var(--color-success) / 0.1)',
                color: 'rgb(var(--color-success))'
              }}
            >
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                {isEn ? 'Email sent successfully!' : 'Courriel envoyé avec succès!'}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {authenticated ? (
              /* If authenticated, show continue button */
              <button
                onClick={handleRefreshStatus}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                {isEn ? 'Continue to Dashboard' : 'Continuer vers le tableau de bord'}
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              /* If not authenticated, show login button */
              <Link
                to="/login"
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                {isEn ? 'Go to Login' : 'Aller à la connexion'}
              </Link>
            )}

            {/* Secondary: Resend */}
            <button
              onClick={handleResendEmail}
              disabled={isResending || countdown > 0}
              className="btn-secondary w-full py-2.5 flex items-center justify-center gap-2"
            >
              {isResending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {isEn ? 'Sending...' : 'Envoi...'}
                </>
              ) : countdown > 0 ? (
                <>
                  <Clock className="w-4 h-4" />
                  {isEn ? `Resend in ${countdown}s` : `Renvoyer dans ${countdown}s`}
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  {isEn ? 'Resend confirmation email' : 'Renvoyer le courriel de confirmation'}
                </>
              )}
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <p 
              className="text-sm mb-2"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn 
                ? "Can't find the email? Check your spam folder."
                : "Vous ne trouvez pas le courriel? Vérifiez votre dossier spam."}
            </p>
            {authenticated ? (
              <button
                onClick={logout}
                className="text-sm font-medium hover:underline"
                style={{ color: 'rgb(var(--color-primary-600))' }}
              >
                {isEn ? 'Use a different email address' : 'Utiliser une autre adresse courriel'}
              </button>
            ) : (
              <Link
                to="/signup"
                className="text-sm font-medium hover:underline"
                style={{ color: 'rgb(var(--color-primary-600))' }}
              >
                {isEn ? 'Use a different email address' : 'Utiliser une autre adresse courriel'}
              </Link>
            )}
          </div>
        </div>

        {/* Footer */}
        <p 
          className="text-center text-xs mt-6"
          style={{ color: 'rgb(var(--color-text-subtle))' }}
        >
          {isEn 
            ? 'Need help? Contact support@plainledger.ca'
            : 'Besoin d\'aide? Contactez support@plainledger.ca'}
        </p>
      </div>
    </div>
  );
}
