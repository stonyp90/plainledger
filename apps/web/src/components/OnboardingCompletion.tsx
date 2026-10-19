import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Building2, Check, ChevronLeft, Link2, Loader2, Users } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../lib/keycloak';
import { useI18n } from '../lib/i18n';
import api, { ApiException } from '../lib/api';
import { authRequestError } from '../lib/authFeedback';
import type { OnboardingData } from './Onboarding';

export interface OnboardingResult {
  success: true;
  organizationId: string;
  tenantId: string;
  teamInvitationsSent: number;
}

export type OnboardingDestination = '/app/dashboard' | '/app/connections' | '/app/settings?tab=team';

export default function OnboardingCompletion({ data, onFinish, onBack }: {
  data: OnboardingData;
  onFinish: (result: OnboardingResult, destination: OnboardingDestination) => void;
  onBack: () => void;
}) {
  const { authenticated, user } = useAuth();
  const { currentTenant, isLoading, canManageSettings, canManageMembers } = useTenant();
  const { language } = useI18n();
  const isEn = language === 'en';
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const completed = useRef(false);
  const mounted = useRef(true);
  const context = `${user?.id}:${currentTenant?.id}:${currentTenant?.organizationId}`;
  const currentContext = useRef(context);
  currentContext.current = context;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const canSave = !isLoading && authenticated && user?.emailVerified === true &&
    !!currentTenant?.organizationId && user.organization === currentTenant.id;

  const save = async (destination: OnboardingDestination) => {
    if (!canSave || inFlight.current || completed.current || !currentTenant) return;
    const expectedContext = context;
    const expectedTenantId = currentTenant.id;
    const expectedOrganizationId = currentTenant.organizationId;
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      // Connections and team invitations have their own authenticated workflows.
      const response = await api.post<Partial<OnboardingResult>>('/onboarding/complete', {
        email: user.email,
        companyName: canManageSettings ? data.companyName.trim() : currentTenant.name,
        companySize: data.companySize,
        ...(canManageSettings ? {
          industry: data.industry,
          fiscalYearEnd: data.fiscalYearEnd,
          currency: data.currency,
        } : {}),
        skipSource: true,
        skipTeam: true,
      });
      if (!mounted.current) return;
      if (currentContext.current !== expectedContext) {
        throw new Error(isEn
          ? 'Your account or organization changed. Review the setup and try again.'
          : 'Votre compte ou votre organisation a changé. Vérifiez la configuration et réessayez.');
      }
      const result = response.data;
      if (!result || result.success !== true || result.tenantId !== expectedTenantId ||
        result.organizationId !== expectedOrganizationId || !Number.isInteger(result.teamInvitationsSent) ||
        (result.teamInvitationsSent ?? -1) < 0) {
        throw new Error(isEn
          ? 'The server did not confirm setup for this organization. Please try again.'
          : 'Le serveur n’a pas confirmé la configuration de cette organisation. Veuillez réessayer.');
      }
      completed.current = true;
      setSaved(true);
      onFinish(result as OnboardingResult, destination);
    } catch (cause) {
      if (!mounted.current) return;
      setError(cause instanceof ApiException && cause.statusCode === 403
        ? (isEn
          ? 'Setup could not be saved for this account. Confirm your email verification and organization permissions, then try again.'
          : 'La configuration n’a pas pu être enregistrée pour ce compte. Vérifiez votre courriel et vos autorisations dans l’organisation, puis réessayez.')
        : authRequestError(cause, isEn, isEn ? 'Unable to save setup. Please try again.' : 'Impossible d’enregistrer la configuration. Veuillez réessayer.'));
    } finally {
      inFlight.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  const disabled = !canSave || saving || saved;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Review and save your setup' : 'Vérifiez et enregistrez votre configuration'}
        </h2>
        <p style={{ color: 'rgb(var(--color-text-secondary))' }}>
          {isEn
            ? 'Save your organization details, then choose your next step.'
            : 'Enregistrez les détails de votre organisation, puis choisissez la prochaine étape.'}
        </p>
      </div>

      <div className="card space-y-3">
        <div className="flex items-start gap-3">
          <Building2 className="h-5 w-5 shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-primary-500))' }} />
          <div className="min-w-0">
            <h3 className="font-semibold break-words" style={{ color: 'rgb(var(--color-text))' }}>{data.companyName}</h3>
            <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {data.currency} · {isEn ? 'Fiscal year ends in' : 'Fin d’exercice en'}{' '}
              {new Date(2000, data.fiscalYearEnd - 1).toLocaleString(isEn ? 'en-CA' : 'fr-CA', { month: 'long' })}
            </p>
          </div>
        </div>
        <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
          {isEn
            ? 'Connect accounting providers from Connections. Create and send team invitations from Team settings after saving.'
            : 'Connectez vos fournisseurs comptables depuis Connexions. Créez et envoyez les invitations depuis les paramètres d’équipe après l’enregistrement.'}
        </p>
      </div>

      {!canSave && (
        <p role="alert" className="text-sm" style={{ color: 'rgb(var(--color-error))' }}>
          {isEn
            ? 'A verified account and its active organization are required to save setup. Refresh the page or sign in again.'
            : 'Un compte vérifié et son organisation active sont nécessaires pour enregistrer la configuration. Actualisez la page ou reconnectez-vous.'}
        </p>
      )}
      {error && (
        <p role="alert" className="flex items-start gap-2 text-sm" style={{ color: 'rgb(var(--color-error))' }}>
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />{error}
        </p>
      )}
      {(saving || saved) && (
        <p role="status" className="flex items-center gap-2 text-sm" style={{ color: 'rgb(var(--color-text))' }}>
          {saved ? <Check className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
          {saved
            ? (isEn ? 'Organization setup saved.' : 'Configuration de l’organisation enregistrée.')
            : (isEn ? 'Saving organization setup…' : 'Enregistrement de la configuration…')}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <button type="button" onClick={() => save('/app/connections')} disabled={disabled} className="btn-primary justify-center">
          <Link2 className="h-4 w-4 shrink-0" />
          {isEn ? 'Save and connect a data source' : 'Enregistrer et connecter une source'}
        </button>
        {canManageMembers && (
          <button type="button" onClick={() => save('/app/settings?tab=team')} disabled={disabled} className="btn-secondary justify-center">
            <Users className="h-4 w-4 shrink-0" />
            {isEn ? 'Save and manage team invitations' : 'Enregistrer et gérer les invitations'}
          </button>
        )}
        <button type="button" onClick={() => save('/app/dashboard')} disabled={disabled} className="btn-secondary justify-center">
          {isEn ? 'Save and open dashboard' : 'Enregistrer et ouvrir le tableau de bord'}
          <ArrowRight className="h-4 w-4 shrink-0" />
        </button>
        <button type="button" onClick={onBack} disabled={saving || saved} className="btn-ghost justify-center">
          <ChevronLeft className="h-4 w-4" />{isEn ? 'Back' : 'Retour'}
        </button>
      </div>
    </div>
  );
}
