import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import PublicHeader from '../components/PublicHeader';
import { useI18n } from '../lib/i18n';
import api from '../lib/api';
import { authRequestError } from '../lib/authFeedback';

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


interface SignupFields {
  firstName: string; lastName: string; email: string; organizationName: string;
  province: string; password: string; confirmPassword: string; agreeToTerms: boolean;
}
interface RegistrationResult {
  success: boolean; userId: string; email: string;
  requiresEmailVerification: boolean; verificationEmailSent: boolean;
}
interface InvitationPreview { tenantId: string; organizationName: string; email: string; expiresAt: string; }
const EMPTY_FORM: SignupFields = { firstName: '', lastName: '', email: '', organizationName: '', province: '', password: '', confirmPassword: '', agreeToTerms: false };
const PASSWORD_RULES = [
  { en: 'At least 12 characters', fr: 'Au moins 12 caractères', check: (p: string) => p.length >= 12 },
  { en: 'One uppercase letter', fr: 'Une lettre majuscule', check: (p: string) => /[A-Z]/.test(p) },
  { en: 'One lowercase letter', fr: 'Une lettre minuscule', check: (p: string) => /[a-z]/.test(p) },
  { en: 'One number', fr: 'Un chiffre', check: (p: string) => /\d/.test(p) },
  { en: 'One special character', fr: 'Un caractère spécial', check: (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p) },
];

export default function Signup() {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [form, setForm] = useState<SignupFields>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [invitationToken] = useState(() => { try { return sessionStorage.getItem('plainledger-pending-invitation') || ''; } catch { return ''; } });
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null);
  const [checkingInvitation, setCheckingInvitation] = useState(Boolean(invitationToken));

  useEffect(() => {
    // Remove legacy signup storage, which previously included plaintext passwords.
    for (const key of ['pl_signup_form_data', 'pl_signup_onboarding_data', 'pl_signup_step']) {
      try { localStorage.removeItem(key); } catch { /* Registration does not depend on storage. */ }
    }
  }, []);

  useEffect(() => {
    if (!invitationToken || result) return;
    const controller = new AbortController();
    setCheckingInvitation(true);
    setInvitation(null);
    setError(null);
    api.post<InvitationPreview>('/organizations/invitations/preview', { token: invitationToken }, { signal: controller.signal, authentication: 'none' })
      .then(({ data }) => {
        if (!data?.email || !data.organizationName || !Number.isFinite(Date.parse(data.expiresAt)) || Date.parse(data.expiresAt) <= Date.now()) {
          throw new Error(isEn ? 'This invitation is invalid or expired.' : 'Cette invitation est invalide ou expirée.');
        }
        if (controller.signal.aborted) return;
        setInvitation(data);
        setForm(previous => ({ ...previous, email: data.email }));
      })
      .catch(cause => { if (!controller.signal.aborted) setError(authRequestError(cause, isEn, isEn ? 'Unable to check invitation. Please try again.' : 'Impossible de vérifier l’invitation. Veuillez réessayer.')); })
      .finally(() => { if (!controller.signal.aborted) setCheckingInvitation(false); });
    return () => controller.abort();
  }, [invitationToken, isEn, result]);

  const validPassword = PASSWORD_RULES.every(rule => rule.check(form.password)) && form.password.length <= 1024;
  const canSubmit = form.firstName.trim().length >= 2 && form.lastName.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) && form.email.trim().length <= 254 &&
    CANADIAN_PROVINCES.some(province => province.code === form.province) && validPassword &&
    form.password === form.confirmPassword && form.agreeToTerms && (!invitationToken || Boolean(invitation));
  const update = <K extends keyof SignupFields>(key: K, value: SignupFields[K]) => {
    setForm(previous => ({ ...previous, [key]: value }));
    if (!invitationToken || invitation) setError(null);
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await api.post<RegistrationResult>('/auth/register', {
        firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim().toLowerCase(),
        password: form.password, province: form.province,
        ...(invitationToken ? { invitationToken } : form.organizationName.trim() ? { organizationName: form.organizationName.trim() } : {}),
      });
      if (data?.success !== true || !data.userId || !data.email) throw new Error(isEn ? 'The server did not confirm account creation.' : 'Le serveur n’a pas confirmé la création du compte.');
      setResult(data);
      setForm(previous => ({ ...previous, password: '', confirmPassword: '' }));
      try { sessionStorage.removeItem('plainledger-pending-invitation'); sessionStorage.removeItem('plainledger-invitation-preview'); } catch { /* Server has consumed the invitation. */ }
    } catch (cause) {
      setError(authRequestError(cause, isEn, isEn ? 'Unable to create your account. Please try again.' : 'Impossible de créer votre compte. Veuillez réessayer.'));
    } finally { setSubmitting(false); }
  };
  const resend = async () => {
    if (!result || submitting) return;
    setSubmitting(true);
    setError(null);
    setResendMessage(null);
    try {
      await api.post<{ message?: string }>('/auth/resend-verification', { email: result.email });
      setResendMessage(isEn ? 'Verification requested. Check your inbox if email delivery is available.' : 'Vérification demandée. Consultez votre boîte de réception si l’envoi est disponible.');
    } catch (cause) { setError(authRequestError(cause, isEn, isEn ? 'Unable to request verification. Please try again.' : 'Impossible de demander la vérification. Veuillez réessayer.')); }
    finally { setSubmitting(false); }
  };
  const inputClass = 'w-full min-w-0 rounded-lg border px-3 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60';
  const inputStyle = { backgroundColor: 'rgb(var(--color-bg))', borderColor: 'rgb(var(--color-border))', color: 'rgb(var(--color-text))' };

  return <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--color-bg))', color: 'rgb(var(--color-text))' }}>
    <PublicHeader minimal />
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <section className="rounded-2xl border p-5 sm:p-8" style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}>
        <Shield className="h-8 w-8 mb-4" aria-hidden="true" style={{ color: 'rgb(var(--color-primary-500))' }} />
        <h1 className="text-2xl sm:text-3xl font-bold">{result ? (isEn ? 'Your account is created' : 'Votre compte est créé') : (isEn ? 'Create your PlainLedger account' : 'Créez votre compte PlainLedger')}</h1>
        <p className="mt-3 mb-6" style={{ color: 'rgb(var(--color-text-secondary))' }}>{isEn ? 'Create your account, verify your email, then set up your workspace.' : 'Créez votre compte, vérifiez votre courriel, puis configurez votre espace de travail.'}</p>
        {error && <div role="alert" className="mb-5 flex items-start gap-2 rounded-lg border p-3 break-words" style={{ borderColor: 'rgb(var(--color-error))' }}><AlertCircle className="w-5 h-5 shrink-0" /><span>{error}</span></div>}
        {checkingInvitation && <p role="status" className="mb-5 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{isEn ? 'Checking your invitation…' : 'Vérification de votre invitation…'}</p>}
        {invitation && !result && <p className="mb-5 rounded-lg border p-4 break-words">{isEn ? `You are joining ${invitation.organizationName} as ${invitation.email}.` : `Vous rejoignez ${invitation.organizationName} avec ${invitation.email}.`}</p>}
        {invitationToken && !invitation && !checkingInvitation && !result && <Link className="block mb-5 underline" to="/join">{isEn ? 'Review invitation' : 'Consulter l’invitation'}</Link>}
        {result ? <div className="space-y-5" role="status">
          <CheckCircle2 className="h-9 w-9" style={{ color: 'rgb(var(--color-primary-500))' }} />
          <p className="break-words">{result.verificationEmailSent
            ? (isEn ? `Check ${result.email} for a verification link. After verification, sign in to continue.` : `Consultez ${result.email} pour le lien de vérification. Ensuite, connectez-vous pour continuer.`)
            : (isEn ? `Your account was saved, but the verification email could not be sent to ${result.email}. Request another email once delivery is available, or contact support.` : `Votre compte a été enregistré, mais le courriel de vérification n’a pas pu être envoyé à ${result.email}. Demandez un nouvel envoi lorsque le service sera disponible ou contactez le soutien.`)}</p>
          {invitation && <p>{isEn ? `Your membership in ${invitation.organizationName} has been saved.` : `Votre adhésion à ${invitation.organizationName} a été enregistrée.`}</p>}
          {resendMessage && <p>{resendMessage}</p>}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/login" className="rounded-lg px-4 py-3 text-white text-center" style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}>{isEn ? 'Continue to sign in' : 'Continuer la connexion'}</Link>
            <button type="button" onClick={resend} disabled={submitting} className="rounded-lg border px-4 py-3 disabled:opacity-50">{submitting ? (isEn ? 'Requesting…' : 'Demande…') : (isEn ? 'Resend verification' : 'Renvoyer la vérification')}</button>
          </div>
        </div> : <form onSubmit={submit} className="space-y-5">
          <fieldset disabled={submitting || checkingInvitation} className="space-y-5 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block space-y-2" htmlFor="signup-first-name"><span>{isEn ? 'First name' : 'Prénom'}</span><input id="signup-first-name" autoComplete="given-name" required minLength={2} maxLength={100} value={form.firstName} onChange={event => update('firstName', event.target.value)} className={inputClass} style={inputStyle} /></label>
              <label className="block space-y-2" htmlFor="signup-last-name"><span>{isEn ? 'Last name' : 'Nom'}</span><input id="signup-last-name" autoComplete="family-name" required minLength={2} maxLength={100} value={form.lastName} onChange={event => update('lastName', event.target.value)} className={inputClass} style={inputStyle} /></label>
            </div>
            <label className="block space-y-2" htmlFor="signup-email"><span>{isEn ? 'Email address' : 'Adresse courriel'}</span><input id="signup-email" type="email" autoComplete="email" required maxLength={254} readOnly={Boolean(invitation)} value={form.email} onChange={event => update('email', event.target.value)} className={inputClass} style={inputStyle} /></label>
            {!invitationToken && <label className="block space-y-2" htmlFor="signup-organization"><span>{isEn ? 'Organization name (optional)' : 'Nom de l’organisation (facultatif)'}</span><input id="signup-organization" autoComplete="organization" maxLength={255} value={form.organizationName} onChange={event => update('organizationName', event.target.value)} className={inputClass} style={inputStyle} /></label>}
            <label className="block space-y-2" htmlFor="signup-province"><span>{isEn ? 'Province or territory' : 'Province ou territoire'}</span><select id="signup-province" required value={form.province} onChange={event => update('province', event.target.value)} className={inputClass} style={inputStyle}><option value="">{isEn ? 'Select your province or territory' : 'Sélectionnez votre province ou territoire'}</option>{CANADIAN_PROVINCES.map(province => <option key={province.code} value={province.code}>{isEn ? province.name : province.nameFr}</option>)}</select></label>
            <label className="block space-y-2" htmlFor="signup-password"><span>{isEn ? 'Password' : 'Mot de passe'}</span><div className="relative"><input id="signup-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={12} maxLength={1024} aria-describedby="signup-password-rules" value={form.password} onChange={event => update('password', event.target.value)} className={`${inputClass} pr-12`} style={inputStyle} /><button type="button" aria-label={showPassword ? (isEn ? 'Hide password' : 'Masquer le mot de passe') : (isEn ? 'Show password' : 'Afficher le mot de passe')} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)} className="absolute right-0 top-0 h-full w-12 grid place-items-center">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></label>
            <ul id="signup-password-rules" className="text-sm space-y-1" aria-label={isEn ? 'Password requirements' : 'Exigences du mot de passe'}>{PASSWORD_RULES.map(rule => <li key={rule.en} className="flex items-center gap-2"><span aria-label={rule.check(form.password) ? (isEn ? 'Met' : 'Respectée') : (isEn ? 'Not met' : 'Non respectée')}>{rule.check(form.password) ? '✓' : '○'}</span>{isEn ? rule.en : rule.fr}</li>)}</ul>
            <label className="block space-y-2" htmlFor="signup-confirm-password"><span>{isEn ? 'Confirm password' : 'Confirmer le mot de passe'}</span><input id="signup-confirm-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={12} maxLength={1024} aria-invalid={Boolean(form.confirmPassword && form.password !== form.confirmPassword)} value={form.confirmPassword} onChange={event => update('confirmPassword', event.target.value)} className={inputClass} style={inputStyle} />{form.confirmPassword && form.password !== form.confirmPassword && <span className="block text-sm" role="alert">{isEn ? 'Passwords do not match.' : 'Les mots de passe ne correspondent pas.'}</span>}</label>
            <label className="flex items-start gap-3"><input type="checkbox" required checked={form.agreeToTerms} onChange={event => update('agreeToTerms', event.target.checked)} className="mt-1 h-5 w-5 shrink-0" /><span>{isEn ? 'I agree to the ' : 'J’accepte les '}<Link className="underline" to="/terms" target="_blank" rel="noopener noreferrer">{isEn ? 'Terms of Service' : 'conditions d’utilisation'}</Link>{isEn ? ' and acknowledge the ' : ' et je prends connaissance de la '}<Link className="underline" to="/privacy" target="_blank" rel="noopener noreferrer">{isEn ? 'Privacy Policy' : 'politique de confidentialité'}</Link>.</span></label>
            <button type="submit" disabled={!canSubmit || submitting} className="w-full rounded-lg py-3 px-4 font-semibold text-white disabled:opacity-50" style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}>{submitting ? (isEn ? 'Creating account…' : 'Création du compte…') : (isEn ? 'Create account' : 'Créer un compte')}</button>
          </fieldset>
        </form>}
        {!result && <p className="mt-6 text-center">{isEn ? 'Already have an account? ' : 'Vous avez déjà un compte? '}<Link className="underline" to={invitationToken ? '/login?redirect=%2Fjoin' : '/login'}>{isEn ? 'Sign in' : 'Se connecter'}</Link></p>}
      </section>
    </main>
  </div>;
}
