import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Loader2, Shield } from 'lucide-react';
import PublicHeader from '../components/PublicHeader';
import { useI18n } from '../lib/i18n';
import { getLoginRedirectUri, useKeycloak } from '../lib/keycloak';

/** Legacy MFA links restart the same browser flow that owns the authenticated session. */
export default function MFAVerify() {
  const { language } = useI18n();
  const isEn = language === 'en';
  const { initialized, authenticated, authError, login } = useKeycloak();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!initialized || !authenticated) return;
    const target = new URL(getLoginRedirectUri(params.get('redirect')));
    navigate(target.pathname + target.search + target.hash, { replace: true });
  }, [initialized, authenticated, params, navigate]);

  const continueSignIn = async () => {
    if (!initialized || submitting || authenticated) return;
    setSubmitting(true);
    setError(null);
    try {
      await login();
    } catch {
      setError(isEn
        ? 'Secure sign-in could not start. Please try again.'
        : 'La connexion sécurisée n’a pas pu démarrer. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="flex min-h-screen flex-col" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
    <PublicHeader minimal />
    <main className="flex flex-1 items-center justify-center p-4">
      <section className="card w-full max-w-md space-y-6 p-6 sm:p-8" aria-labelledby="mfa-heading">
        <Shield className="mx-auto h-10 w-10" aria-hidden="true" />
        <h1 id="mfa-heading" className="text-center text-2xl font-bold">{isEn ? 'Complete secure sign-in' : 'Terminer la connexion sécurisée'}</h1>
        <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{isEn
          ? 'Continue to our secure sign-in page. If your account requires an authenticator code or another verification step, you will complete it there before returning to PlainLedger.'
          : 'Continuez vers notre page de connexion sécurisée. Si votre compte exige un code d’authentification ou une autre vérification, vous la terminerez avant de revenir à PlainLedger.'}</p>
        {(error || authError) && <div role="alert" className="flex items-start gap-2 rounded-lg border p-3 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>{error || authError}</span>
        </div>}
        {!initialized && <p role="status" className="flex items-center justify-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{isEn ? 'Checking your session…' : 'Vérification de votre session…'}</p>}
        {initialized && authenticated && <p role="status">{isEn ? 'Returning to PlainLedger…' : 'Retour à PlainLedger…'}</p>}
        {authError ? <button type="button" className="btn-primary w-full" onClick={() => window.location.reload()}>{isEn ? 'Reload secure sign-in' : 'Recharger la connexion sécurisée'}</button>
          : <button type="button" className="btn-primary flex w-full items-center justify-center gap-2" disabled={!initialized || submitting || authenticated} onClick={() => void continueSignIn()}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isEn ? 'Continue secure sign-in' : 'Continuer la connexion sécurisée'}
          </button>}
        <Link to="/login" className="block text-center text-sm underline">{isEn ? 'Back to sign-in' : 'Retour à la connexion'}</Link>
      </section>
    </main>
  </div>;
}
