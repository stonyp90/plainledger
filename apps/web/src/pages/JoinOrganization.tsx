import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, Users } from 'lucide-react';
import PublicHeader from '../components/PublicHeader';
import { useI18n } from '../lib/i18n';
import { useKeycloak } from '../lib/keycloak';
import api from '../lib/api';
import { authRequestError } from '../lib/authFeedback';

const TOKEN_KEY = 'plainledger-pending-invitation';
const PREVIEW_KEY = 'plainledger-invitation-preview';

interface InvitationPreview {
  tenantId: string;
  organizationName: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  expiresAt: string;
}

function readInvitationToken(): string {
  const fragment = new URLSearchParams(window.location.hash.slice(1)).get('token');
  if (fragment) {
    // Keep the bearer invitation out of request URLs, analytics and referrers.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    if (!/^[A-Za-z0-9_-]{32,256}$/.test(fragment)) return '';
    try { sessionStorage.setItem(TOKEN_KEY, fragment); } catch { /* This tab can still preview the link. */ }
    return fragment;
  }
  try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}

export default function JoinOrganization() {
  const { language } = useI18n();
  const isEn = language === 'en';
  const { initialized, authenticated, user, keycloak, authError } = useKeycloak();
  const [token] = useState(readInvitationToken);
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!token || accepted) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setPreview(null);
    api.post<InvitationPreview>('/organizations/invitations/preview', { token }, { signal: controller.signal })
      .then(({ data }) => {
        if (!data?.tenantId || !data.organizationName || !data.email || !['admin', 'member', 'viewer'].includes(data.role) || !Number.isFinite(Date.parse(data.expiresAt))) {
          throw new Error(isEn ? 'The invitation response is incomplete.' : 'La réponse de l’invitation est incomplète.');
        }
        if (Date.parse(data.expiresAt) <= Date.now()) {
          throw new Error(isEn ? 'This invitation has expired. Ask your administrator for a new link.' : 'Cette invitation est expirée. Demandez un nouveau lien à votre administrateur.');
        }
        if (controller.signal.aborted) return;
        setPreview(data);
        try { sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(data)); } catch { /* Preview remains usable. */ }
      })
      .catch(cause => { if (!controller.signal.aborted) setError(authRequestError(cause, isEn, isEn ? 'Unable to load invitation. Please try again.' : 'Impossible de charger l’invitation. Veuillez réessayer.')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, attempt, isEn, initialized, accepted]);

  const matchingEmail = Boolean(preview && user?.email?.trim().toLowerCase() === preview.email.toLowerCase());
  const accept = async () => {
    if (!preview || !matchingEmail || !user?.emailVerified || accepting || loading) return;
    if (Date.parse(preview.expiresAt) <= Date.now()) {
      setPreview(null);
      setError(isEn ? 'This invitation has expired. Ask your administrator for a new link.' : 'Cette invitation est expirée. Demandez un nouveau lien à votre administrateur.');
      return;
    }
    setAccepting(true);
    setError(null);
    try {
      const { data } = await api.post<{ tenantId: string; refreshSession: boolean }>('/organizations/invitations/accept', { token });
      if (data.tenantId !== preview.tenantId || data.refreshSession !== true) throw new Error(isEn ? 'Membership could not be confirmed.' : 'L’adhésion n’a pas pu être confirmée.');
      setAccepted(true);
      try { sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(PREVIEW_KEY); } catch { /* Already accepted server-side. */ }
      await keycloak.updateToken(-1);
    } catch (cause) {
      setError(authRequestError(cause, isEn, isEn ? 'Unable to accept invitation.' : 'Impossible d’accepter l’invitation.'));
    } finally { setAccepting(false); }
  };

  return <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--color-bg))', color: 'rgb(var(--color-text))' }}>
    <PublicHeader minimal />
    <main className="mx-auto w-full max-w-xl px-4 py-10 sm:py-16">
      <section className="rounded-2xl border p-5 sm:p-8 space-y-6" style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}>
        <Users className="h-9 w-9" style={{ color: 'rgb(var(--color-primary-500))' }} aria-hidden="true" />
        <h1 className="text-2xl sm:text-3xl font-bold">{isEn ? 'Join your organization' : 'Rejoignez votre organisation'}</h1>
        {loading && <p role="status" className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />{isEn ? 'Checking invitation…' : 'Vérification de l’invitation…'}</p>}
        {!token && <p role="alert">{isEn ? 'This invitation link is incomplete. Ask your organization administrator for a new link.' : 'Ce lien d’invitation est incomplet. Demandez un nouveau lien à votre administrateur.'}</p>}
        {error && <div role="alert" className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'rgb(var(--color-error))' }}>
          <p className="flex items-start gap-2 break-words"><AlertCircle className="h-5 w-5 shrink-0" />{error}</p>
          {!accepted && <button className="underline" type="button" onClick={() => setAttempt(value => value + 1)}>{isEn ? 'Check link again' : 'Vérifier le lien à nouveau'}</button>}
        </div>}
        {accepted ? <div className="space-y-4" role="status">
          <CheckCircle2 className="h-8 w-8" style={{ color: 'rgb(var(--color-primary-500))' }} />
          <p>{isEn ? `You have joined ${preview?.organizationName}.` : `Vous avez rejoint ${preview?.organizationName}.`}</p>
          <Link to="/app" className="inline-block rounded-lg px-4 py-3 text-white" style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}>{isEn ? 'Open dashboard' : 'Ouvrir le tableau de bord'}</Link>
        </div> : preview && !loading && <div className="space-y-5">
          <dl className="space-y-3 break-words">
            <div><dt className="text-sm opacity-70">{isEn ? 'Organization' : 'Organisation'}</dt><dd className="font-semibold">{preview.organizationName}</dd></div>
            <div><dt className="text-sm opacity-70">{isEn ? 'Invited email' : 'Courriel invité'}</dt><dd>{preview.email}</dd></div>
            <div><dt className="text-sm opacity-70">{isEn ? 'Role' : 'Rôle'}</dt><dd>{({ admin: isEn ? 'Administrator' : 'Administrateur', member: isEn ? 'Member' : 'Membre', viewer: isEn ? 'Viewer' : 'Lecteur' })[preview.role]}</dd></div>
            <div><dt className="text-sm opacity-70">{isEn ? 'Expires' : 'Expiration'}</dt><dd>{new Date(preview.expiresAt).toLocaleString(isEn ? 'en-CA' : 'fr-CA')}</dd></div>
          </dl>
          {!initialized ? <p role="status">{isEn ? 'Checking your sign-in session…' : 'Vérification de votre session…'}</p> : !authenticated ? <div className="space-y-4">
            {authError && <p role="alert">{authError}</p>}
            <p>{isEn ? 'Sign in with the invited email address, or create an account to join this organization.' : 'Connectez-vous avec le courriel invité ou créez un compte pour rejoindre cette organisation.'}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/login?redirect=%2Fjoin" className="rounded-lg px-4 py-3 text-center text-white" style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}>{isEn ? 'Sign in' : 'Se connecter'}</Link>
              <Link to="/signup" className="rounded-lg border px-4 py-3 text-center">{isEn ? 'Create account' : 'Créer un compte'}</Link>
            </div>
          </div> : !matchingEmail ? <p role="alert">{isEn ? `You are signed in as ${user?.email}. Sign out and use ${preview.email} to accept this invitation.` : `Vous êtes connecté avec ${user?.email}. Déconnectez-vous et utilisez ${preview.email} pour accepter cette invitation.`}</p> : !user?.emailVerified ? <div className="space-y-3"><p>{isEn ? 'Verify your email address before accepting the invitation.' : 'Vérifiez votre adresse courriel avant d’accepter l’invitation.'}</p><Link className="underline" to="/verify-email">{isEn ? 'Verify email' : 'Vérifier le courriel'}</Link></div> : <button type="button" disabled={accepting} onClick={accept} className="w-full rounded-lg px-4 py-3 text-white disabled:opacity-60" style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}>{accepting ? (isEn ? 'Joining…' : 'Adhésion…') : (isEn ? 'Accept invitation' : 'Accepter l’invitation')}</button>}
        </div>}
      </section>
    </main>
  </div>;
}
