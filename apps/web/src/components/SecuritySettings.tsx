import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Clock, ExternalLink, Key, Loader2, Monitor, Shield, Smartphone } from 'lucide-react';
import { useKeycloak } from '../lib/keycloak';
import { useI18n } from '../lib/i18n';

/** Account security belongs to the configured identity provider, not fabricated API fallbacks. */
export default function SecuritySettings() {
  const { user, keycloak, authenticated, initialized } = useKeycloak();
  const { language } = useI18n();
  const isEn = language === 'en';
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState(false);
  const openingRef = useRef(false);
  const mounted = useRef(true);
  const accountId = useRef(user?.id);
  accountId.current = user?.id;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const canOpenAccount = initialized && authenticated && typeof keycloak?.accountManagement === 'function';

  const openAccount = async () => {
    if (!canOpenAccount || openingRef.current) return;
    const expectedAccount = user?.id;
    openingRef.current = true;
    setOpening(true);
    setOpenError(false);
    try {
      await keycloak!.accountManagement();
    } catch {
      if (mounted.current && accountId.current === expectedAccount) setOpenError(true);
    } finally {
      openingRef.current = false;
      if (mounted.current) setOpening(false);
    }
  };

  const sections = [
    {
      id: 'password', icon: Key,
      title: isEn ? 'Password' : 'Mot de passe',
      description: isEn
        ? 'Change your password in your sign-in account. If you use a connected identity provider, manage your password with that provider.'
        : 'Modifiez votre mot de passe dans votre compte de connexion. Si vous utilisez un fournisseur d’identité connecté, gérez votre mot de passe auprès de ce fournisseur.',
      status: isEn ? 'Managed in your sign-in account' : 'Géré dans votre compte de connexion',
    },
    {
      id: 'mfa', icon: Smartphone,
      title: isEn ? 'Two-factor authentication' : 'Authentification à deux facteurs',
      description: isEn
        ? 'Check and manage your authentication methods in your sign-in account. PlainLedger cannot currently retrieve their status.'
        : 'Consultez et gérez vos méthodes d’authentification dans votre compte de connexion. PlainLedger ne peut pas récupérer leur état actuellement.',
      status: isEn ? 'Status unavailable' : 'État indisponible',
    },
    {
      id: 'sessions', icon: Monitor,
      title: isEn ? 'Active sessions' : 'Sessions actives',
      description: isEn
        ? 'Review your sessions and sign out other devices from your sign-in account. Session details are currently unavailable in PlainLedger.'
        : 'Consultez vos sessions et déconnectez vos autres appareils depuis votre compte de connexion. Les détails des sessions sont actuellement indisponibles dans PlainLedger.',
      status: isEn ? 'Session details unavailable' : 'Détails des sessions indisponibles',
    },
    {
      id: 'history', icon: Clock,
      title: isEn ? 'Login history' : 'Historique de connexion',
      description: isEn
        ? 'Login history is currently unavailable in PlainLedger.'
        : 'L’historique de connexion est actuellement indisponible dans PlainLedger.',
      status: isEn ? 'History unavailable' : 'Historique indisponible',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="card space-y-4" aria-labelledby="account-security-heading">
        <div className="flex items-start gap-4">
          <Shield className="h-6 w-6 shrink-0" style={{ color: 'rgb(var(--color-primary-500))' }} />
          <div>
            <h3 id="account-security-heading" className="font-semibold text-lg" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Account security' : 'Sécurité du compte'}
            </h3>
            <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn
                ? 'Manage your password, authentication methods and sessions in your sign-in account.'
                : 'Gérez votre mot de passe, vos méthodes d’authentification et vos sessions dans votre compte de connexion.'}
            </p>
          </div>
        </div>
        {!canOpenAccount && (
          <p role="status" className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn
              ? 'Account management is unavailable for this session. Sign in again to access your account.'
              : 'La gestion du compte est indisponible pour cette session. Reconnectez-vous pour accéder à votre compte.'}
          </p>
        )}
        {openError && (
          <p role="alert" className="flex items-start gap-2 text-sm" style={{ color: 'rgb(var(--color-error))' }}>
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            {isEn
              ? 'We could not open your sign-in account. Please try again.'
              : 'Impossible d’ouvrir votre compte de connexion. Veuillez réessayer.'}
          </p>
        )}
        <button type="button" className="btn-primary" disabled={!canOpenAccount || opening} onClick={openAccount}>
          {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
          {opening
            ? (isEn ? 'Opening account…' : 'Ouverture du compte…')
            : openError
              ? (isEn ? 'Try opening your account again' : 'Réessayer d’ouvrir votre compte')
              : (isEn ? 'Open sign-in account' : 'Ouvrir le compte de connexion')}
        </button>
      </section>

      {sections.map(({ id, icon: Icon, title, description, status }) => (
        <section key={id} className="card" aria-labelledby={`security-${id}-heading`}>
          <div className="flex items-start gap-3">
            <Icon className="h-5 w-5 shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-primary-500))' }} />
            <div className="min-w-0 space-y-2">
              <h3 id={`security-${id}-heading`} className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{title}</h3>
              <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>{status}</p>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{description}</p>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
