import { useState, useEffect, useRef, type FormEvent } from 'react';
import { X, Target } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/keycloak';
import { intelligenceApi } from '../lib/intelligence-api';
import {
  type IndustryType, type BusinessSize, type ActionType, type ConfidenceLevel, type DataMetric, type DecisionEvent,
  getActionTemplatesForIndustry, createDecisionEvent, calculateGapPercentage, getIndustryName,
} from '../lib/decisionContext';

const colors = { green: 'rgb(var(--color-primary-600))' };
const supportedIndustries: IndustryType[] = ['restaurant', 'retail', 'construction', 'professional_services', 'real_estate', 'technology', 'healthcare', 'manufacturing', 'other'];
interface DecisionCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called only after the server confirms persistence. */
  onSave: (decision: DecisionEvent) => void | Promise<void>;
  trigger: { metricType: DataMetric; metricLabel?: string; chartId?: string; currentValue: number; benchmarkValue?: number; period?: string };
  organizationId: string;
  industry?: IndustryType;
  businessSize?: BusinessSize;
  suggestedPatterns?: { actionType: ActionType; description: string; successRate: number; sampleSize: number; avgImpact: number }[];
}

export default function DecisionCapture({ isOpen, onClose, onSave, trigger, organizationId, industry, businessSize }: DecisionCaptureProps) {
  const { language } = useI18n();
  const { authenticated, user } = useAuth();
  const isEn = language === 'en';
  const [selectedIndustry, setIndustry] = useState<IndustryType | ''>(industry && supportedIndustries.includes(industry) ? industry : '');
  const [selectedSize, setSize] = useState<BusinessSize | ''>(businessSize || '');
  const [action, setAction] = useState<ActionType>('custom');
  const [description, setDescription] = useState('');
  const [expectedImpact, setExpectedImpact] = useState('');
  const [benchmark, setBenchmark] = useState(trigger.benchmarkValue === undefined ? '' : String(trigger.benchmarkValue));
  const [confidence, setConfidence] = useState<ConfidenceLevel>('medium');
  const [reasoning, setReasoning] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<DecisionEvent | null>(null);
  const scope = useRef(0);
  const requestInProgress = useRef(false);
  useEffect(() => {
    scope.current++;
    requestInProgress.current = false;
    setIndustry(industry && supportedIndustries.includes(industry) ? industry : '');
    setSize(businessSize || ''); setAction('custom'); setDescription(''); setExpectedImpact('');
    setBenchmark(trigger.benchmarkValue === undefined ? '' : String(trigger.benchmarkValue));
    setConfidence('medium'); setReasoning(''); setError(null); setSaved(null); setSaving(false);
    return () => { scope.current++; };
  }, [isOpen, organizationId, user?.id, industry, businessSize, trigger.chartId, trigger.currentValue, trigger.benchmarkValue]);
  const templates = selectedIndustry ? getActionTemplatesForIndustry(selectedIndustry) : [];
  const impact = Number(expectedImpact);
  const reference = Number(benchmark);
  const validImpact = expectedImpact.trim() !== '' && Number.isFinite(impact);
  const validReference = benchmark.trim() !== '' && Number.isFinite(reference) && reference !== 0;
  const valid = authenticated && !!organizationId && !!selectedIndustry && !!selectedSize &&
    description.trim().length > 0 && Number.isFinite(trigger.currentValue) && validImpact && validReference;

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (requestInProgress.current) return;
    if (!saved && !valid) { setError(isEn ? 'Complete the required fields with valid values.' : 'Remplissez les champs requis avec des valeurs valides.'); return; }
    const requestScope = scope.current;
    requestInProgress.current = true; setSaving(true); setError(null);
    let persisted = saved;
    try {
      if (!persisted) {
        const gap = calculateGapPercentage(trigger.currentValue, reference);
        if (!Number.isFinite(gap)) throw new Error(isEn ? 'The reference gap exceeds the supported numeric range.' : 'L’écart de référence dépasse la plage numérique prise en charge.');
        const response = await intelligenceApi.captureDecision({
          organizationId, industry: selectedIndustry === 'technology' ? 'saas' : selectedIndustry,
          businessSize: selectedSize as BusinessSize,
          trigger: { metric: trigger.metricType, currentValue: trigger.currentValue, benchmarkValue: reference, gapPercentage: gap, chartContext: trigger.chartId },
          decision: { actionType: action, description: description.trim(), reasoning: reasoning.trim() || undefined, expectedImpact: impact, confidence },
          source: 'user',
        });
        if (requestScope !== scope.current) return;
        const record = response.data;
        if (!record?.id || !record.createdAt || !Number.isFinite(Date.parse(record.createdAt))) throw new Error(isEn ? 'The server did not confirm that the decision was saved.' : 'Le serveur n’a pas confirmé l’enregistrement de la décision.');
        persisted = {
          ...createDecisionEvent({ organizationId, industry: selectedIndustry as IndustryType, businessSize: selectedSize as BusinessSize,
            trigger: { ...trigger, benchmarkValue: reference, gapPercentage: gap },
            decision: { actionType: action, description: description.trim(), reasoning: reasoning.trim() || undefined, expectedImpact: impact, confidence }, source: 'user' }),
          id: record.id, organizationId: record.organizationId || organizationId, createdAt: record.createdAt, updatedAt: record.createdAt, reminderScheduled: false,
        };
        setSaved(persisted);
      }
      await onSave(persisted);
      if (requestScope === scope.current) onClose();
    } catch (reason) {
      if (requestScope === scope.current) setError(persisted
        ? (isEn ? 'The decision was saved, but the dashboard could not refresh. Retry to refresh without creating another record.' : 'La décision a été enregistrée, mais le tableau de bord n’a pas pu être actualisé. Réessayez sans créer un autre enregistrement.')
        : reason instanceof Error ? reason.message : (isEn ? 'Unable to save the decision. Please retry.' : 'Impossible d’enregistrer la décision. Réessayez.'));
    } finally {
      if (requestScope === scope.current) { setSaving(false); requestInProgress.current = false; }
    }
  };
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => { if (!saving) onClose(); }}>
    <form onSubmit={handleSave} role="dialog" aria-modal="true" aria-labelledby="decision-heading" onClick={event => event.stopPropagation()} className="flex h-full w-full max-w-lg flex-col shadow-xl" style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
      <header className="flex items-center justify-between border-b p-5"><h2 id="decision-heading" className="text-lg font-semibold">{isEn ? 'Record decision' : 'Enregistrer une décision'}</h2><button type="button" aria-label={isEn ? 'Close' : 'Fermer'} disabled={saving} onClick={onClose}><X className="h-5 w-5" /></button></header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        <p className="rounded-lg border p-3 text-sm"><strong>{trigger.metricLabel || trigger.metricType}</strong>: {Number.isFinite(trigger.currentValue) ? trigger.currentValue.toLocaleString(isEn ? 'en-CA' : 'fr-CA') : '—'} {trigger.period && `· ${trigger.period}`}</p>
        {!authenticated && <p role="alert">{isEn ? 'Sign in before saving a decision.' : 'Connectez-vous avant d’enregistrer une décision.'}</p>}
        <fieldset disabled={saving || !!saved} className="min-w-0 space-y-4">
          <label className="block text-sm">{isEn ? 'Reporting industry' : 'Secteur pour ce dossier'}<select required className="input mt-1 w-full" value={selectedIndustry} onChange={event => { setIndustry(event.target.value as IndustryType | ''); setAction('custom'); }}><option value="">{isEn ? 'Select an industry' : 'Choisir un secteur'}</option>{supportedIndustries.map(value => <option value={value} key={value}>{getIndustryName(value, language)}</option>)}</select></label>
          <label className="block text-sm">{isEn ? 'Business size' : 'Taille de l’entreprise'}<select required className="input mt-1 w-full" value={selectedSize} onChange={event => setSize(event.target.value as BusinessSize | '')}><option value="">{isEn ? 'Select a business size' : 'Choisir la taille'}</option><option value="small">{isEn ? 'Small' : 'Petite'}</option><option value="medium">{isEn ? 'Medium' : 'Moyenne'}</option><option value="large">{isEn ? 'Large' : 'Grande'}</option></select></label>
          <p className="text-xs text-muted">{isEn ? 'Confirm the industry and size to attach to this decision.' : 'Confirmez le secteur et la taille associés à cette décision.'}</p>
          <label className="block text-sm">{isEn ? 'Action' : 'Action'}<select className="input mt-1 w-full" value={action} onChange={event => setAction(event.target.value as ActionType)}><option value="custom">{isEn ? 'Custom action' : 'Action personnalisée'}</option>{templates.map(template => <option key={template.actionType} value={template.actionType}>{template.label[language]}</option>)}</select></label>
          <label className="block text-sm">{isEn ? 'Description' : 'Description'}<textarea required maxLength={4000} rows={3} className="input mt-1 w-full" value={description} onChange={event => setDescription(event.target.value)} /></label>
          <label className="block text-sm">{isEn ? 'Expected impact (CAD)' : 'Impact attendu (CAD)'}<input required type="number" step="any" className="input mt-1 w-full" value={expectedImpact} onChange={event => setExpectedImpact(event.target.value)} /></label>
          {expectedImpact !== '' && !validImpact && <p role="alert" className="text-sm text-red-600">{isEn ? 'Enter a finite numeric impact.' : 'Saisissez un impact numérique fini.'}</p>}
          <label className="block text-sm">{isEn ? 'Reference value' : 'Valeur de référence'}<input required type="number" step="any" className="input mt-1 w-full" value={benchmark} onChange={event => setBenchmark(event.target.value)} /></label>
          <p className="text-xs text-muted">{isEn ? 'A nonzero reference is required by the decision service to calculate a percentage gap.' : 'Le service de décisions nécessite une référence non nulle pour calculer l’écart en pourcentage.'}</p>
          <label className="block text-sm">{isEn ? 'Confidence' : 'Confiance'}<select className="input mt-1 w-full" value={confidence} onChange={event => setConfidence(event.target.value as ConfidenceLevel)}><option value="low">{isEn ? 'Low' : 'Faible'}</option><option value="medium">{isEn ? 'Medium' : 'Moyenne'}</option><option value="high">{isEn ? 'High' : 'Élevée'}</option></select></label>
          <label className="block text-sm">{isEn ? 'Reasoning (optional)' : 'Justification (facultatif)'}<textarea rows={2} maxLength={4000} className="input mt-1 w-full" value={reasoning} onChange={event => setReasoning(event.target.value)} /></label>
        </fieldset>
        <p className="text-xs text-muted">{isEn ? 'Saving records the decision. Automatic follow-up reminders are not configured.' : 'L’enregistrement conserve la décision. Les rappels automatiques ne sont pas configurés.'}</p>
        {error && <p role="alert" className="rounded border border-red-300 p-3 text-sm">{error}</p>}
        {saved && <p role="status" className="text-sm">{isEn ? 'Decision saved.' : 'Décision enregistrée.'}</p>}
      </div>
      <footer className="flex justify-end gap-3 border-t p-5"><button className="btn-secondary" type="button" disabled={saving} onClick={onClose}>{isEn ? 'Cancel' : 'Annuler'}</button><button className="btn-primary" type="submit" disabled={saving || (!saved && !valid)}>{saving ? (isEn ? 'Saving…' : 'Enregistrement…') : saved ? (isEn ? 'Refresh dashboard' : 'Actualiser le tableau') : (isEn ? 'Save decision' : 'Enregistrer la décision')}</button></footer>
    </form>
  </div>;
}

// Export a trigger button component for use in charts
export function DecisionCaptureButton({
  onClick,
  isDark,
  compact = false,
}: {
  onClick: () => void;
  isDark: boolean;
  compact?: boolean;
}) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  if (compact) {
    return (
      <button
        onClick={onClick}
        className="p-1.5 rounded-lg transition-all hover:scale-110"
        style={{
          backgroundColor: `${colors.green}20`,
          color: colors.green,
        }}
        title={isEn ? 'Record Decision' : 'Enregistrer une décision'}
      >
        <Target className="w-4 h-4" />
      </button>
    );
  }
  
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
      style={{
        backgroundColor: `${colors.green}15`,
        color: colors.green,
        border: `1px solid ${colors.green}30`,
      }}
    >
      <Target className="w-3.5 h-3.5" />
      {isEn ? 'Record Decision' : 'Décision'}
    </button>
  );
}
