import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Link2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Settings, 
  Trash2,
  AlertCircle,
  Clock,
  ArrowRight,
  Zap,
  HelpCircle,
  Wrench,
  Plus,
  Shield,
  Lock,
  Eye,
  MousePointerClick,
  FileCheck,
  BarChart3,
  Headphones,
  Sparkles,
  Users,
  Calendar,
  Crown,
  Check,
  Mail,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { InfoBanner } from '../components/HelpTooltip';
import { useTenant, useCanPerform } from '../contexts/TenantContext';
import { useI18n } from '../lib/i18n';
import UpgradeRequestForm from '../components/UpgradeRequestForm';
import { PremiumUpgradeBanner } from '../components/PremiumFeatureGate';
import { useDisconnectDataSource, useDataSources, useSyncDataSource } from '../lib/graphql/hooks';

// Sync cooldown period (1 hour in milliseconds)
const SYNC_COOLDOWN_MS = 60 * 60 * 1000;

/**
 * Format a timestamp as relative time (e.g., "5 minutes ago")
 */
function formatRelativeTime(date: Date, isEn: boolean): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return isEn ? 'Just now' : 'À l\'instant';
  if (diffMins < 60) return isEn ? `${diffMins} min ago` : `Il y a ${diffMins} min`;
  if (diffHours < 24) return isEn ? `${diffHours}h ago` : `Il y a ${diffHours}h`;
  if (diffDays === 1) return isEn ? 'Yesterday' : 'Hier';
  return date.toLocaleDateString();
}

/**
 * Calculate time until next sync is allowed
 */
function getTimeUntilNextSync(lastSyncAt: string | undefined): number {
  if (!lastSyncAt) return 0;
  const lastSync = new Date(lastSyncAt);
  const timeSinceLastSync = Date.now() - lastSync.getTime();
  return Math.max(0, SYNC_COOLDOWN_MS - timeSinceLastSync);
}

/**
 * Format remaining cooldown time
 */
function formatCooldownTime(ms: number, isEn: boolean): string {
  if (ms <= 0) return '';
  const mins = Math.ceil(ms / 60000);
  if (mins < 60) return isEn ? `${mins} min` : `${mins} min`;
  const hours = Math.ceil(ms / 3600000);
  return isEn ? `${hours}h` : `${hours}h`;
}

// Calendly link for upgrade consultations
const CALENDLY_URL = 'https://calendly.com/anthonypaquet1508';

// Step type definition
type StepType = {
  number: number;
  titleEn: string;
  titleFr: string;
  descEn: string;
  descFr: string;
  icon: any;
  benefitsEn: string[];
  benefitsFr: string[];
};

// Interactive Timeline Component
function InteractiveTimeline({ steps, isEn, onSelectProvider }: { 
  steps: StepType[]; 
  isEn: boolean;
  onSelectProvider: () => void;
}) {
  const [activeStep, setActiveStep] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handlePrevious = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveStep((prev) => (prev === 0 ? steps.length - 1 : prev - 1));
      setTimeout(() => setIsTransitioning(false), 50);
    }, 300);
  };

  const handleNext = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveStep((prev) => (prev === steps.length - 1 ? 0 : prev + 1));
      setTimeout(() => setIsTransitioning(false), 50);
    }, 300);
  };

  const handleStepClick = (index: number) => {
    if (index === activeStep) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveStep(index);
      setTimeout(() => setIsTransitioning(false), 50);
    }, 300);
  };

  const currentStep = steps[activeStep];

  return (
    <div className="mb-6">

      {/* Progress Timeline */}
      <div className="mb-4 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between relative">
          {/* Progress Line Background */}
          <div 
            className="absolute top-4 left-0 right-0 h-0.5 rounded-full z-0"
            style={{ backgroundColor: 'rgb(var(--color-border))' }}
          />
          
          {/* Progress Line Fill */}
          <div 
            className="absolute top-4 left-0 h-0.5 rounded-full z-10 transition-all duration-500 ease-out"
            style={{ 
              backgroundColor: 'rgb(var(--color-primary-500))',
              width: `${((activeStep + 1) / steps.length) * 100}%`,
            }}
          />
          
          {/* Step Indicators - Clickable for Navigation */}
          {steps.map((step, index) => {
            const isActive = index === activeStep;
            const isCompleted = index < activeStep;
            
            return (
              <button
                key={step.number}
                onClick={() => handleStepClick(index)}
                className="relative z-20 flex flex-col items-center flex-1 group cursor-pointer"
                aria-label={isEn ? `Go to step ${step.number}: ${step.titleEn}` : `Aller à l'étape ${step.number}: ${step.titleFr}`}
              >
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 shadow-sm group-hover:scale-105 ${
                    isActive ? 'scale-105 ring-2' : 'scale-100'
                  }`}
                  style={{ 
                    backgroundColor: isActive || isCompleted
                      ? 'rgb(var(--color-primary-500))'
                      : 'rgb(var(--color-bg-muted))',
                    color: isActive || isCompleted ? 'white' : 'rgb(var(--color-text-muted))',
                    border: isActive ? '2px solid rgb(var(--color-primary-300))' : '1px solid transparent',
                    ringColor: isActive ? 'rgb(var(--color-primary-200))' : 'transparent',
                  }}
                >
                  {isCompleted ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    step.number
                  )}
                </div>
                <span 
                  className={`mt-1.5 text-[10px] font-medium text-center max-w-[100px] hidden sm:block transition-all ${
                    isActive ? 'font-semibold' : ''
                  }`}
                  style={{ 
                    color: isActive 
                      ? 'rgb(var(--color-primary-600))' 
                      : 'rgb(var(--color-text-muted))' 
                  }}
                >
                  {isEn ? step.titleEn : step.titleFr}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Step Display with Zoom Effect */}
      <div id="timeline-content" className="max-w-3xl mx-auto">
        <div
          className={`rounded-xl p-5 sm:p-6 relative overflow-hidden transition-all duration-500 shadow-lg ${
            isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          }`}
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            border: '2px solid rgb(var(--color-primary-500))',
          }}
        >
          {/* Background gradient */}
          <div 
            className="absolute inset-0 opacity-5"
            style={{ 
              background: 'linear-gradient(135deg, rgb(var(--color-primary-600)) 0%, rgb(var(--color-primary-700)) 100%)',
            }}
          />

          <div className="relative">
            {/* Navigation Arrows - Top Right */}
            <div className="absolute top-0 right-0 flex items-center gap-1 z-10">
              <button
                onClick={handlePrevious}
                className="p-1.5 rounded-md transition-all hover:scale-105"
                style={{ 
                  backgroundColor: 'rgb(var(--color-bg-muted))',
                  color: 'rgb(var(--color-text))',
                }}
                aria-label={isEn ? 'Previous step' : 'Étape précédente'}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 rounded-md transition-all hover:scale-105"
                style={{ 
                  backgroundColor: 'rgb(var(--color-bg-muted))',
                  color: 'rgb(var(--color-text))',
                }}
                aria-label={isEn ? 'Next step' : 'Étape suivante'}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Step Header */}
            <div className="flex items-start gap-3 mb-3">
              {/* Icon - Clickable */}
              <button
                onClick={() => handleStepClick((activeStep + 1) % steps.length)}
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm transition-all hover:scale-105 cursor-pointer"
                style={{ 
                  backgroundColor: 'rgb(var(--color-primary-600))',
                }}
                aria-label={isEn ? 'Go to next step' : 'Aller à l\'étape suivante'}
              >
                <currentStep.icon className="w-4 h-4 text-white" />
              </button>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span 
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-primary-100))',
                      color: 'rgb(var(--color-primary-700))',
                    }}
                  >
                    {isEn ? `Step ${currentStep.number}` : `Étape ${currentStep.number}`}
                  </span>
                  <span 
                    className="text-[10px] font-medium"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  >
                    {activeStep + 1} / {steps.length}
                  </span>
                </div>
                <h3 
                  className="text-base sm:text-lg font-semibold mb-1"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn ? currentStep.titleEn : currentStep.titleFr}
                </h3>
              </div>
            </div>

            {/* Description */}
            <p 
              className="text-xs sm:text-sm mb-3"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn ? currentStep.descEn : currentStep.descFr}
            </p>

            {/* Benefits - Pill badges */}
            <div className="flex flex-wrap gap-2">
              {(isEn ? currentStep.benefitsEn : currentStep.benefitsFr).map((benefit, idx) => (
                <span 
                  key={idx}
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-primary-50))',
                    color: 'rgb(var(--color-primary-700))',
                    border: '1px solid rgb(var(--color-primary-200))',
                  }}
                >
                  <Check className="w-3 h-3 flex-shrink-0" style={{ color: 'rgb(var(--color-primary-500))' }} />
                  <span className="font-medium">{benefit}</span>
                </span>
              ))}
            </div>

            {/* CTA for last step */}
            {activeStep === steps.length - 1 && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
                <button
                  onClick={onSelectProvider}
                  className="group flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm transition-all hover:opacity-90 mx-auto"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-primary-600))',
                    color: 'white',
                  }}
                >
                  {isEn ? 'Get Started' : 'Commencer'}
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Memoized Trust Badges Component
const TrustBadges = ({ isEn }: { isEn: boolean }) => (
  <div className="mt-4 flex flex-wrap justify-center gap-4 text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
    <div className="flex items-center gap-1">
      <Lock className="w-3 h-3" />
      {isEn ? 'AES-256 Encryption' : 'Chiffrement AES-256'}
    </div>
    <div className="flex items-center gap-1">
      <Shield className="w-3 h-3" />
      {isEn ? 'Bank-Level Security' : 'Sécurité bancaire'}
    </div>
    <div className="flex items-center gap-1">
      <Headphones className="w-3 h-3" />
      {isEn ? 'Customer Success Support' : 'Support client dédié'}
    </div>
  </div>
);

// Steps data moved outside component to prevent recreation
const SUBSCRIPTION_STEPS: StepType[] = [
  {
    number: 1,
    titleEn: 'Select your software',
    titleFr: 'Sélectionnez votre logiciel',
    descEn: 'Choose from QuickBooks, Xero, Sage, FreshBooks, Wave, or upload a CSV. No technical skills required — just pick your accounting system and we\'ll handle the rest.',
    descFr: 'Choisissez parmi QuickBooks, Xero, Sage, FreshBooks, Wave, ou téléchargez un CSV. Aucune compétence technique requise — choisissez simplement votre système comptable et nous nous occupons du reste.',
    icon: MousePointerClick,
    benefitsEn: ['6+ supported platforms', 'CSV import fallback', 'No coding needed'],
    benefitsFr: ['6+ plateformes supportées', 'Import CSV disponible', 'Aucun code requis'],
  },
  {
    number: 2,
    titleEn: 'Authorize securely',
    titleFr: 'Autorisez en toute sécurité',
    descEn: 'Click one button to grant read-only access. Your data stays encrypted with AES-256. We never modify your accounting records — only read.',
    descFr: 'Cliquez sur un bouton pour accorder l\'accès en lecture seule. Vos données restent chiffrées avec AES-256. Nous ne modifions jamais vos données — lecture seule.',
    icon: Shield,
    benefitsEn: ['Read-only access', 'AES-256 encryption', 'Bank-level security'],
    benefitsFr: ['Accès lecture seule', 'Chiffrement AES-256', 'Sécurité bancaire'],
  },
  {
    number: 3,
    titleEn: 'Always up to date',
    titleFr: 'Toujours à jour',
    descEn: 'Once connected, your data stays fresh automatically. We sync your books daily in the background — no exports, no uploads, no maintenance. Just accurate insights, every time you log in.',
    descFr: 'Une fois connecté, vos données restent fraîches automatiquement. Nous synchronisons vos comptes chaque jour en arrière-plan — aucun export, aucun téléchargement, aucune maintenance. Des insights précis à chaque connexion.',
    icon: RefreshCw,
    benefitsEn: ['Syncs daily, automatically', 'Set it and forget it', 'Always current data'],
    benefitsFr: ['Synchronisation quotidienne', 'Configurez et oubliez', 'Données toujours actuelles'],
  },
  {
    number: 4,
    titleEn: 'Get insights instantly',
    titleFr: 'Obtenez des insights instantanément',
    descEn: 'View board-ready reports, detect anomalies, and track your financial health in plain language. Everything is automatic — no accounting degree required.',
    descFr: 'Consultez des rapports prêts pour le conseil, détectez les anomalies et suivez votre santé financière en langage clair. Tout est automatique — aucun diplôme en comptabilité requis.',
    icon: BarChart3,
    benefitsEn: ['Board-ready reports', 'Anomaly detection', 'Plain language insights'],
    benefitsFr: ['Rapports prêts pour le CA', 'Détection d\'anomalies', 'Insights en langage clair'],
  },
];

// Full-page subscription gate for free users
function FreeUserSubscriptionGate({ isEn }: { isEn: boolean }) {
  const [showEmailForm, setShowEmailForm] = useState(false);

  const handleUpgradeClick = useCallback(() => {
    window.open(CALENDLY_URL, '_blank');
  }, []);

  const handleShowEmailForm = useCallback(() => setShowEmailForm(true), []);
  const handleHideEmailForm = useCallback(() => setShowEmailForm(false), []);

  // Memoized benefits list
  const ctaBenefits = useMemo(() => [
    isEn ? 'Unlimited connections' : 'Connexions illimitées',
    isEn ? 'Automatic daily sync' : 'Synchronisation quotidienne',
    isEn ? 'Board-ready reports' : 'Rapports prêts pour le CA',
    isEn ? 'Priority support' : 'Support prioritaire',
  ], [isEn]);

  return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col">
      {/* Premium Upgrade Banner - Consistent with other pages */}
      <PremiumUpgradeBanner feature="customReports" />
      
      {/* Header */}
      <div className="text-center mb-5 mt-3">
        <h1 
          className="text-xl sm:text-2xl font-semibold mb-2"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          {isEn ? 'Connect Your Accounting Software' : 'Connectez votre logiciel comptable'}
        </h1>
        <p 
          className="text-xs sm:text-sm max-w-xl mx-auto"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          {isEn 
            ? 'Unlock powerful financial insights in just 4 simple steps. Upgrade to a paid plan to get started.'
            : 'Débloquez des insights financiers puissants en seulement 4 étapes simples. Passez à un plan payant pour commencer.'}
        </p>
      </div>

      {/* Interactive Timeline */}
      <InteractiveTimeline 
        steps={SUBSCRIPTION_STEPS} 
        isEn={isEn}
        onSelectProvider={() => setShowEmailForm(true)}
      />

      {/* Enhanced Upgrade CTA Section */}
      <div 
        className="rounded-xl p-5 sm:p-6 text-center relative overflow-hidden"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          border: '1px solid rgb(var(--color-border))',
        }}
      >
        <div className="relative">
          {/* Crown icon */}
          <div 
            className="w-8 h-8 mx-auto mb-2 rounded-lg flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
            style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            onClick={handleShowEmailForm}
          >
            <Crown className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-600))' }} />
          </div>

          <h2 className="text-sm sm:text-base font-semibold mb-1" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Ready to unlock the full power of PlainLedger?' : 'Prêt à débloquer toute la puissance de PlainLedger?'}
          </h2>
          <p className="mb-3 max-w-md mx-auto text-xs" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn 
              ? 'Subscribe now and connect your accounting software in minutes. Our team is here to help you every step of the way.'
              : 'Abonnez-vous maintenant et connectez votre logiciel comptable en quelques minutes. Notre équipe est là pour vous aider à chaque étape.'}
          </p>

          {/* What's included - compact */}
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mb-3">
            {ctaBenefits.map((item, idx) => (
              <span 
                key={idx}
                className="inline-flex items-center gap-1 text-xs"
                style={{ color: 'rgb(var(--color-text-secondary))' }}
              >
                <Check className="w-3 h-3" style={{ color: 'rgb(var(--color-primary-500))' }} />
                {item}
              </span>
            ))}
          </div>

          {/* CTA Buttons - Compact */}
          {showEmailForm ? (
            <div 
              className="max-w-xs mx-auto rounded-lg p-3 text-left"
              style={{ 
                backgroundColor: 'rgb(var(--color-bg-muted))',
                border: '1px solid rgb(var(--color-border))',
              }}
            >
              <UpgradeRequestForm
                feature="customReports"
                compact={true}
                showCalendlyOption={true}
                onSubmitted={handleHideEmailForm}
                title={isEn ? 'Connect Accounting Software' : 'Connecter un logiciel comptable'}
                description={isEn ? 'We\'ll get back to you within 24 hours.' : 'Nous vous répondrons dans les 24 heures.'}
              />
              <button
                onClick={handleHideEmailForm}
                className="mt-2 text-[10px] underline opacity-70 hover:opacity-100 transition-opacity"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {isEn ? '← Back' : '← Retour'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <button
                onClick={handleUpgradeClick}
                className="group flex items-center gap-1 px-3 py-1.5 rounded-md font-medium text-xs transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ 
                  backgroundColor: 'rgb(var(--color-primary-500))',
                  color: 'white',
                }}
              >
                <Calendar className="w-3 h-3" />
                {isEn ? 'Schedule a Call' : 'Planifier un appel'}
                <ArrowRight className="w-2.5 h-2.5 transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                onClick={handleShowEmailForm}
                className="group flex items-center gap-1 px-3 py-1.5 rounded-md font-medium text-xs transition-all hover:opacity-90 active:scale-[0.98] border"
                style={{ 
                  borderColor: 'rgb(var(--color-primary-500))',
                  color: 'rgb(var(--color-primary-600))',
                }}
              >
                <Mail className="w-3 h-3" />
                {isEn ? 'Request Info' : 'Demander info'}
                <ArrowRight className="w-2.5 h-2.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          )}

          {/* Trust badges */}
          <TrustBadges isEn={isEn} />
        </div>
      </div>
    </div>
  );
}

// Onboarding steps data (moved outside component)
const ONBOARDING_STEPS = [
  {
    number: 1,
    titleEn: 'Select your software',
    titleFr: 'Sélectionnez votre logiciel',
    descEn: 'Choose from QuickBooks, Xero, Sage, FreshBooks, Wave, or upload a CSV. No technical skills required.',
    descFr: 'Choisissez parmi QuickBooks, Xero, Sage, FreshBooks, Wave, ou téléchargez un CSV. Aucune compétence technique requise.',
    icon: MousePointerClick,
    actionEn: 'Browse integrations below',
    actionFr: 'Parcourir les intégrations ci-dessous',
  },
  {
    number: 2,
    titleEn: 'Authorize securely',
    titleFr: 'Autorisez en toute sécurité',
    descEn: 'Click one button to grant read-only access. Your data stays encrypted with AES-256 and we never modify your records.',
    descFr: 'Cliquez sur un bouton pour accorder l\'accès en lecture seule. Vos données restent chiffrées avec AES-256 et nous ne modifions jamais vos enregistrements.',
    icon: Shield,
    actionEn: 'One-click authorization',
    actionFr: 'Autorisation en un clic',
  },
  {
    number: 3,
    titleEn: 'Automatic sync',
    titleFr: 'Synchronisation automatique',
    descEn: 'Your financial data syncs automatically every day. No manual exports or uploads needed—ever.',
    descFr: 'Vos données financières se synchronisent automatiquement chaque jour. Aucune exportation ou téléchargement manuel n\'est nécessaire.',
    icon: RefreshCw,
    actionEn: 'Set it and forget it',
    actionFr: 'Configurez et oubliez',
  },
  {
    number: 4,
    titleEn: 'Get insights instantly',
    titleFr: 'Obtenez des insights instantanément',
    descEn: 'View board-ready reports, detect anomalies, and track your financial health in plain language.',
    descFr: 'Consultez des rapports prêts pour le conseil, détectez les anomalies et suivez votre santé financière en langage clair.',
    icon: BarChart3,
    actionEn: 'Start analyzing',
    actionFr: 'Commencer l\'analyse',
  },
];

// Interactive onboarding steps component
function OnboardingSteps({ isEn, onSelectProvider }: { isEn: boolean; onSelectProvider: () => void }) {
  const [activeStep, setActiveStep] = useState(1);

  return (
    <div className="mb-8">
      {/* Main onboarding card */}
      <div 
        className="rounded-xl overflow-hidden"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          border: '1px solid rgb(var(--color-border))',
        }}
      >
        {/* Header - thin and elegant */}
        <div 
          className="px-5 py-3 sm:px-6 sm:py-3"
          style={{ 
            background: 'rgb(var(--color-primary-600))',
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span className="text-xs font-medium text-white/70 uppercase tracking-wide">
                {isEn ? 'Get Started in Minutes' : 'Démarrez en quelques minutes'}
              </span>
              <span className="text-white/40">•</span>
              <h2 className="text-sm sm:text-base font-semibold text-white">
                {isEn ? 'Connect your accounting software' : 'Connectez votre logiciel comptable'}
              </h2>
            </div>
            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }}
            >
              <Headphones className="w-3.5 h-3.5 text-white/80" />
              <span className="text-xs text-white/80 font-medium">
                {isEn ? 'Support included with every plan' : 'Support inclus avec chaque plan'}
              </span>
            </div>
          </div>
        </div>

        {/* Steps navigation */}
        <div className="px-5 py-3 sm:px-6 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <div className="flex items-center gap-1 overflow-x-auto">
            {ONBOARDING_STEPS.map((step, index) => (
              <button
                key={step.number}
                onClick={() => setActiveStep(step.number)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all duration-200 min-w-fit"
                style={{ 
                  backgroundColor: activeStep === step.number 
                    ? 'rgb(var(--color-primary-600))' 
                    : 'transparent',
                  color: activeStep === step.number 
                    ? 'white' 
                    : 'rgb(var(--color-text-secondary))',
                }}
              >
                <div 
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                  style={{ 
                    backgroundColor: activeStep === step.number 
                      ? 'white' 
                      : 'rgb(var(--color-bg-muted))',
                    color: activeStep === step.number 
                      ? 'rgb(var(--color-primary-600))' 
                      : 'rgb(var(--color-text-secondary))',
                  }}
                >
                  {step.number}
                </div>
                <span className="font-medium text-xs hidden sm:inline">
                  {isEn ? step.titleEn : step.titleFr}
                </span>
                {index < ONBOARDING_STEPS.length - 1 && (
                  <ArrowRight 
                    className="w-3.5 h-3.5 hidden lg:block ml-1" 
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Active step content */}
        <div className="p-5 sm:p-6">
          {ONBOARDING_STEPS.map((step) => (
            <div 
              key={step.number}
              className={`transition-all duration-300 ${activeStep === step.number ? 'block' : 'hidden'}`}
            >
              <div className="flex items-start gap-4">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-primary-600))',
                  }}
                >
                  <step.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 
                    className="text-sm font-semibold mb-1"
                    style={{ color: 'rgb(var(--color-text))' }}
                  >
                    {isEn ? `Step ${step.number}: ${step.titleEn}` : `Étape ${step.number}: ${step.titleFr}`}
                  </h3>
                  <p 
                    className="text-sm leading-relaxed"
                    style={{ color: 'rgb(var(--color-text-secondary))' }}
                  >
                    {isEn ? step.descEn : step.descFr}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Customer success banner */}
        <div 
          className="px-5 py-3 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          style={{ 
            borderTop: '1px solid rgb(var(--color-border))',
          }}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-600))' }} />
            <p 
              className="text-xs"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn ? 'Need help? Our team is here for you' : 'Besoin d\'aide? Notre équipe est là pour vous'}
              <span style={{ color: 'rgb(var(--color-text-muted))' }}> — </span>
              {isEn 
                ? 'Customer success support included with every plan—no extra cost' 
                : 'Support client inclus avec chaque plan—sans frais supplémentaires'}
            </p>
          </div>
          <button
            onClick={onSelectProvider}
            className="px-4 py-2 rounded-lg font-medium text-xs transition-all duration-200 flex items-center gap-1.5 hover:opacity-90"
            style={{ 
              backgroundColor: 'rgb(var(--color-primary-600))',
              color: 'white',
            }}
          >
            {isEn ? 'Get Started' : 'Commencer'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Provider types - Enhanced for Airbyte-style experience
interface Provider {
  id: string;
  name: string;
  description: string;
  descriptionFr: string;
  logo: string;
  color: string;
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  lastSync?: string;
  lastSyncAt?: string; // Raw ISO timestamp for cooldown calculations
  accountsCount?: number;
  transactionsCount?: number;
  dataSourceId?: string; // Real database ID for API calls
  // Enhanced fields for Airbyte-style experience
  syncSchedule?: 'manual' | 'hourly' | 'daily' | 'weekly';
  nextSyncAt?: string;
  healthStatus?: 'healthy' | 'warning' | 'error' | 'unknown';
  credentialsConfigured?: boolean;
  syncHistory?: { date: string; status: 'success' | 'failed'; recordsSync: number }[];
  errorMessage?: string;
}

// Mock data - would come from API
const providers: Provider[] = [
  {
    id: 'quickbooks',
    name: 'QuickBooks Online',
    description: 'Intuit QuickBooks accounting software',
    descriptionFr: 'Logiciel comptable Intuit QuickBooks',
    logo: '/providers/quickbooks.svg',
    color: '#2CA01C',
    status: 'connected',
    lastSync: 'Just now',
    accountsCount: 24,
    transactionsCount: 847,
    syncSchedule: 'daily',
    nextSyncAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours from now
    healthStatus: 'healthy',
    credentialsConfigured: true,
    syncHistory: [
      { date: new Date().toISOString(), status: 'success', recordsSync: 847 },
      { date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), status: 'success', recordsSync: 842 },
    ],
  },
  {
    id: 'xero',
    name: 'Xero',
    description: 'Cloud-based accounting platform',
    descriptionFr: 'Plateforme comptable infonuagique',
    logo: '/providers/xero.svg',
    color: '#13B5EA',
    status: 'disconnected',
    healthStatus: 'unknown',
    credentialsConfigured: false,
  },
  {
    id: 'sage',
    name: 'Sage',
    description: 'Sage Business Cloud Accounting',
    descriptionFr: 'Comptabilité Sage Business Cloud',
    logo: '/providers/sage.svg',
    color: '#00D639',
    status: 'disconnected',
    healthStatus: 'unknown',
    credentialsConfigured: false,
  },
  {
    id: 'freshbooks',
    name: 'FreshBooks',
    description: 'Invoice and accounting software',
    descriptionFr: 'Logiciel de facturation et comptabilité',
    logo: '/providers/freshbooks.svg',
    color: '#0075DD',
    status: 'disconnected',
    healthStatus: 'unknown',
    credentialsConfigured: false,
  },
  {
    id: 'wave',
    name: 'Wave',
    description: 'Free accounting software',
    descriptionFr: 'Logiciel comptable gratuit',
    logo: '/providers/wave.svg',
    color: '#2E77BC',
    status: 'disconnected',
    healthStatus: 'unknown',
    credentialsConfigured: false,
  },
  {
    id: 'csv',
    name: 'CSV Import',
    description: 'Import data from CSV files',
    descriptionFr: 'Importez vos données depuis des fichiers CSV',
    logo: '/providers/csv.svg',
    color: '#6B7280',
    status: 'disconnected',
    healthStatus: 'unknown',
    credentialsConfigured: false,
  },
];

// Sync schedule options
const SYNC_SCHEDULES = [
  { id: 'manual', labelEn: 'Manual', labelFr: 'Manuel', descEn: 'Sync only when triggered', descFr: 'Sync uniquement sur demande' },
  { id: 'hourly', labelEn: 'Every hour', labelFr: 'Chaque heure', descEn: 'Sync every 60 minutes', descFr: 'Sync toutes les 60 minutes' },
  { id: 'daily', labelEn: 'Daily', labelFr: 'Quotidien', descEn: 'Sync once per day at 2:00 AM', descFr: 'Sync une fois par jour à 2h00' },
  { id: 'weekly', labelEn: 'Weekly', labelFr: 'Hebdomadaire', descEn: 'Sync every Monday at 2:00 AM', descFr: 'Sync chaque lundi à 2h00' },
] as const;

// Provider Logo Component - Using official brand logos
function ProviderLogo({ provider, size = 'md' }: { provider: Provider; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };
  
  const sizePx = {
    sm: 32,
    md: 40,
    lg: 48,
  };
  
  // Official brand logos - using high-quality CDN images with SVG fallbacks
  // Using SimpleIcons CDN (cdn.simpleicons.org) for consistent, high-quality brand icons
  const logoUrls: Record<string, string> = {
    quickbooks: 'https://cdn.simpleicons.org/quickbooks/2CA01C',
    xero: 'https://cdn.simpleicons.org/xero/13B5EA',
    sage: 'https://cdn.simpleicons.org/sage/00D639',
    freshbooks: 'https://cdn.simpleicons.org/freshbooks/0075DD',
    wave: 'https://cdn.simpleicons.org/wave/2E77BC',
  };
  
  // Fallback SVG logos - accurate recreations of official brand marks
  const fallbackLogos: Record<string, JSX.Element> = {
    quickbooks: (
      <svg viewBox="0 0 48 48" className={sizeClasses[size]}>
        <circle cx="24" cy="24" r="24" fill="#2CA01C"/>
        <g transform="translate(10, 10)" fill="none" stroke="white" strokeWidth="2.5">
          <circle cx="14" cy="14" r="10"/>
          <path d="M14 6v16M8 14h12" strokeLinecap="round"/>
        </g>
      </svg>
    ),
    xero: (
      <svg viewBox="0 0 48 48" className={sizeClasses[size]}>
        <circle cx="24" cy="24" r="24" fill="#13B5EA"/>
        <g transform="translate(8, 14)" fill="white">
          <path d="M6.5 0L10 10L13.5 0h3L11 20H9L3.5 0h3z"/>
          <path d="M18 0h8v3h-5v5h4v3h-4v6h5v3h-8V0z"/>
        </g>
      </svg>
    ),
    sage: (
      <svg viewBox="0 0 48 48" className={sizeClasses[size]}>
        <rect width="48" height="48" rx="10" fill="#00D639"/>
        <text x="24" y="30" textAnchor="middle" fill="white" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="13">Sage</text>
      </svg>
    ),
    freshbooks: (
      <svg viewBox="0 0 48 48" className={sizeClasses[size]}>
        <rect width="48" height="48" rx="10" fill="#0075DD"/>
        <g transform="translate(14, 10)" fill="white">
          <rect x="0" y="0" width="18" height="3.5" rx="1"/>
          <rect x="0" y="7" width="14" height="3.5" rx="1"/>
          <rect x="0" y="14" width="10" height="3.5" rx="1"/>
          <rect x="0" y="21" width="3.5" height="7" rx="1"/>
        </g>
      </svg>
    ),
    wave: (
      <svg viewBox="0 0 48 48" className={sizeClasses[size]}>
        <rect width="48" height="48" rx="10" fill="#003D79"/>
        <g transform="translate(8, 10)">
          <rect x="0" y="14" width="8" height="14" rx="4" fill="#6AB8F7"/>
          <rect x="12" y="6" width="8" height="22" rx="4" fill="#2E77BC"/>
          <rect x="24" y="10" width="8" height="18" rx="4" fill="white"/>
        </g>
      </svg>
    ),
    csv: (
      <svg viewBox="0 0 48 48" className={sizeClasses[size]}>
        <rect width="48" height="48" rx="10" fill="#64748B"/>
        <text x="24" y="30" textAnchor="middle" fill="white" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="12">CSV</text>
      </svg>
    ),
  };

  const [imageError, setImageError] = useState(false);
  const logoUrl = logoUrls[provider.id];
  
  // Use image if available and not errored, otherwise use fallback SVG
  if (logoUrl && !imageError) {
    return (
      <img 
        src={logoUrl}
        alt={`${provider.name} logo`}
        className={`${sizeClasses[size]} object-contain`}
        width={sizePx[size]}
        height={sizePx[size]}
        onError={() => setImageError(true)}
        loading="lazy"
      />
    );
  }
  
  return fallbackLogos[provider.id] || (
    <div 
      className={`${sizeClasses[size]} rounded-lg flex items-center justify-center text-white font-bold text-sm`} 
      style={{ backgroundColor: provider.color }}
    >
      {provider.name.charAt(0)}
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status, isEn }: { status: Provider['status']; isEn: boolean }) {
  const config = {
    connected: { 
      icon: CheckCircle2, 
      textEn: 'Connected',
      textFr: 'Connecté', 
      bgClass: 'bg-primary-50 dark:bg-primary-900/20',
      textClass: 'text-primary-600 dark:text-primary-400',
      dotClass: 'bg-primary-500',
      pulse: true,
    },
    disconnected: { 
      icon: XCircle, 
      textEn: 'Not connected',
      textFr: 'Non connecté', 
      bgClass: 'bg-gray-100 dark:bg-gray-800',
      textClass: 'text-gray-500 dark:text-gray-400',
      dotClass: 'bg-gray-400',
      pulse: false,
    },
    syncing: { 
      icon: RefreshCw, 
      textEn: 'Syncing...',
      textFr: 'Sync...', 
      bgClass: 'bg-blue-50 dark:bg-blue-900/20',
      textClass: 'text-blue-600 dark:text-blue-400',
      dotClass: 'bg-blue-500',
      pulse: true,
    },
    error: { 
      icon: AlertCircle, 
      textEn: 'Error',
      textFr: 'Erreur', 
      bgClass: 'bg-red-50 dark:bg-red-900/20',
      textClass: 'text-red-600 dark:text-red-400',
      dotClass: 'bg-red-500',
      pulse: true,
    },
  };
  
  const { textEn, textFr, bgClass, textClass, dotClass, pulse } = config[status];
  
  return (
    <span 
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${bgClass} ${textClass}`}
    >
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotClass}`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${dotClass}`} />
      </span>
      <span>{isEn ? textEn : textFr}</span>
    </span>
  );
}

// Provider Card Component - Clean Airbyte-style design
function ProviderCard({ provider, onConnect, onDisconnect, onSync, isInternalStaff, isEn, readOnly = false, isDisconnecting = false }: {
  provider: Provider;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onSync: (id: string) => void;
  isInternalStaff: boolean;
  isEn: boolean;
  readOnly?: boolean;
  isDisconnecting?: boolean;
}) {
  const isConnected = provider.status === 'connected';
  const isSyncing = provider.status === 'syncing';
  const [showScheduleMenu, setShowScheduleMenu] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(provider.syncSchedule || 'daily');
  
  // Calculate cooldown status
  const cooldownTimeRemaining = useMemo(() => {
    return getTimeUntilNextSync(provider.lastSyncAt);
  }, [provider.lastSyncAt]);
  
  const isOnCooldown = cooldownTimeRemaining > 0;
  
  const currentSchedule = SYNC_SCHEDULES.find(s => s.id === selectedSchedule);
  
  // Format next sync time
  const formatNextSync = (isoString?: string) => {
    if (!isoString) return isEn ? 'Not scheduled' : 'Non planifié';
    const date = new Date(isoString);
    const now = new Date();
    const diffHours = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return isEn ? '< 1h' : '< 1h';
    if (diffHours < 24) return isEn ? `${diffHours}h` : `${diffHours}h`;
    const diffDays = Math.round(diffHours / 24);
    return isEn ? `${diffDays}d` : `${diffDays}j`;
  };
  
  return (
    <div 
      className="rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        border: isConnected 
          ? '2px solid rgb(var(--color-primary-400))' 
          : '1px solid rgb(var(--color-border))',
      }}
    >
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div 
            className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 p-2"
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
          >
            <ProviderLogo provider={provider} size="md" />
          </div>
          
          {/* Title & Description */}
          <div className="flex-1 min-w-0">
            <h3 
              className="font-semibold text-sm"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {provider.name}
            </h3>
            <p 
              className="text-xs mt-0.5 line-clamp-1"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn ? provider.description : provider.descriptionFr}
            </p>
          </div>
          
          {/* Status Indicator */}
          {isConnected ? (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: 'rgb(var(--color-success))' }} />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: 'rgb(var(--color-success))' }} />
              </span>
              <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-success))' }}>
                {isEn ? 'Active' : 'Actif'}
              </span>
            </div>
          ) : (
            <span 
              className="text-xs px-2 py-1 rounded-md"
              style={{ 
                backgroundColor: 'rgb(var(--color-bg-muted))',
                color: 'rgb(var(--color-text-muted))',
              }}
            >
              {isEn ? 'Not connected' : 'Non connecté'}
            </span>
          )}
        </div>
      </div>
      
      {/* Connected Content */}
      {isConnected ? (
        <>
          {/* Divider */}
          <div style={{ borderTop: '1px solid rgb(var(--color-border))' }} />
          
          {/* Sync Info Row - Mobile optimized */}
          <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" style={{ backgroundColor: 'rgb(var(--color-bg-muted) / 0.5)' }}>
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              {/* Last Sync */}
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgb(var(--color-success))' }} />
                <span className="text-xs whitespace-nowrap" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {provider.lastSync || '—'}
                </span>
              </div>
              
              {/* Separator - hidden on mobile */}
              <span className="hidden sm:inline" style={{ color: 'rgb(var(--color-border))' }}>•</span>
              
              {/* Records */}
              <span className="text-xs whitespace-nowrap" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {provider.transactionsCount?.toLocaleString() || 0} {isEn ? 'records' : 'enreg.'}
              </span>
            </div>
            
            {/* Schedule Badge - Touch friendly */}
            <div className="relative">
              <button
                onClick={() => !readOnly && setShowScheduleMenu(!showScheduleMenu)}
                disabled={readOnly}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all active:scale-95 disabled:opacity-60"
                style={{ 
                  backgroundColor: 'rgb(var(--color-primary-100))',
                  color: 'rgb(var(--color-primary-700))',
                }}
              >
                <Clock className="w-3.5 h-3.5" />
                <span className="font-medium">{isEn ? currentSchedule?.labelEn : currentSchedule?.labelFr}</span>
              </button>
              
              {/* Schedule Dropdown - Full width on mobile */}
              {showScheduleMenu && (
                <>
                  {/* Backdrop for mobile */}
                  <div 
                    className="fixed inset-0 z-10 sm:hidden"
                    onClick={() => setShowScheduleMenu(false)}
                  />
                  <div 
                    className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 bottom-4 sm:bottom-auto sm:top-full sm:mt-1 sm:w-64 rounded-xl shadow-2xl z-20 py-2 border"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-surface))',
                      borderColor: 'rgb(var(--color-border))',
                    }}
                  >
                    <div className="px-4 py-2 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
                      <p className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                        {isEn ? 'Sync Schedule' : 'Fréquence de sync'}
                      </p>
                    </div>
                    {SYNC_SCHEDULES.map((schedule) => (
                      <button
                        key={schedule.id}
                        onClick={() => {
                          setSelectedSchedule(schedule.id);
                          setShowScheduleMenu(false);
                        }}
                        className="w-full flex items-center justify-between px-4 py-3 active:bg-gray-100 dark:active:bg-gray-800/50 transition-all"
                        style={{ 
                          backgroundColor: selectedSchedule === schedule.id ? 'rgb(var(--color-primary-50))' : 'transparent',
                        }}
                      >
                        <div className="text-left">
                          <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                            {isEn ? schedule.labelEn : schedule.labelFr}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                            {isEn ? schedule.descEn : schedule.descFr}
                          </p>
                        </div>
                        {selectedSchedule === schedule.id && (
                          <Check className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(var(--color-primary-500))' }} />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Divider */}
          <div style={{ borderTop: '1px solid rgb(var(--color-border))' }} />
          
          {/* Action Buttons - Touch optimized (min 44px) */}
          <div className="p-3 flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onSync(provider.id); }}
              disabled={isSyncing || readOnly || isOnCooldown}
              className="flex-1 h-11 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 text-sm active:scale-[0.98]"
              style={{ 
                backgroundColor: 'rgb(var(--color-primary-500))',
                color: 'white',
              }}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>
                {isSyncing 
                  ? (isEn ? 'Syncing...' : 'Sync...') 
                  : isOnCooldown 
                    ? `${formatCooldownTime(cooldownTimeRemaining, isEn)}`
                    : (isEn ? 'Sync now' : 'Synchroniser')}
              </span>
            </button>
            
            <button
              onClick={(e) => { e.stopPropagation(); window.location.href = `/app/settings?tab=integrations&provider=${provider.id}`; }}
              className="h-11 w-11 rounded-lg transition-all duration-200 active:scale-95 flex items-center justify-center"
              style={{ 
                backgroundColor: 'rgb(var(--color-bg-muted))',
                color: 'rgb(var(--color-text-muted))',
              }}
              title={isEn ? 'Settings' : 'Paramètres'}
            >
              <Settings className="w-5 h-5" />
            </button>
            
            {!readOnly && (
              <button
                onClick={(e) => { e.stopPropagation(); onDisconnect(provider.id); }}
                disabled={isDisconnecting}
                className="h-11 w-11 rounded-lg transition-all duration-200 active:bg-red-50 dark:active:bg-red-900/30 disabled:opacity-50 flex items-center justify-center"
                style={{ 
                  backgroundColor: 'rgb(var(--color-bg-muted))',
                  color: 'rgb(var(--color-text-muted))',
                }}
                title={isEn ? 'Disconnect' : 'Déconnecter'}
              >
                {isDisconnecting ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
        </>
      ) : (
        /* Disconnected Content */
        <>
          {/* Divider */}
          <div style={{ borderTop: '1px solid rgb(var(--color-border))' }} />
          
          {/* Features Row */}
          <div className="px-4 py-3 flex items-center justify-center gap-4" style={{ backgroundColor: 'rgb(var(--color-bg-muted) / 0.3)' }}>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-text-muted))' }} />
              <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Read-only' : 'Lecture seule'}
              </span>
            </div>
            <span style={{ color: 'rgb(var(--color-border))' }}>•</span>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-text-muted))' }} />
              <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                AES-256
              </span>
            </div>
          </div>
          
          {/* Divider */}
          <div style={{ borderTop: '1px solid rgb(var(--color-border))' }} />
          
          {/* Connect Button - Touch optimized */}
          <div className="p-3">
            {readOnly ? (
              <div 
                className="w-full h-12 rounded-lg font-medium flex items-center justify-center gap-2 text-sm"
                style={{ 
                  backgroundColor: 'rgb(var(--color-bg-muted))',
                  color: 'rgb(var(--color-text-muted))',
                }}
              >
                <Lock className="w-4 h-4" />
                {isEn ? 'Admin required' : 'Admin requis'}
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onConnect(provider.id); }}
                className="w-full h-12 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 text-base active:scale-[0.98]"
                style={{ 
                  backgroundColor: 'rgb(var(--color-primary-500))',
                  color: 'white',
                }}
              >
                <Link2 className="w-5 h-5" />
                <span>{isEn ? 'Connect' : 'Connecter'}</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Connection Configuration for different providers
interface ConnectionConfig {
  authType: 'oauth' | 'apiKey' | 'upload';
  oauthUrl?: string;
  requiredFields?: { key: string; label: string; labelFr: string; placeholder: string; type: 'text' | 'password' }[];
  scopes?: string[];
}

const providerConfigs: Record<string, ConnectionConfig> = {
  quickbooks: {
    authType: 'oauth',
    oauthUrl: 'https://appcenter.intuit.com/connect/oauth2',
    scopes: ['com.intuit.quickbooks.accounting.readonly'],
  },
  xero: {
    authType: 'oauth',
    oauthUrl: 'https://login.xero.com/identity/connect/authorize',
    scopes: ['accounting.transactions.read', 'accounting.contacts.read', 'accounting.settings.read'],
  },
  sage: {
    authType: 'oauth',
    oauthUrl: 'https://www.sageone.com/oauth2/auth/central',
    scopes: ['full_access'],
  },
  freshbooks: {
    authType: 'oauth',
    oauthUrl: 'https://auth.freshbooks.com/oauth/authorize',
    scopes: ['user:profile:read', 'user:invoices:read', 'user:expenses:read'],
  },
  wave: {
    authType: 'apiKey',
    requiredFields: [
      { key: 'apiToken', label: 'API Token', labelFr: 'Jeton API', placeholder: 'wv_xxxxxxxxxxxxxxxxxxxx', type: 'password' },
      { key: 'businessId', label: 'Business ID', labelFr: 'ID Entreprise', placeholder: 'QnVzaW5lc3M6...', type: 'text' },
    ],
  },
  csv: {
    authType: 'upload',
  },
};

// Connection Modal Component with intelligent OAuth flow
function ConnectionModal({ provider, onClose, onConfirm, isEn }: {
  provider: Provider | null;
  onClose: () => void;
  onConfirm: () => void;
  isEn: boolean;
}) {
  const [step, setStep] = useState<'welcome' | 'setup' | 'oauth' | 'authorizing' | 'validating' | 'success' | 'error'>('welcome');
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [useDemoMode, setUseDemoMode] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [oauthUrl, setOAuthUrl] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'connected' | 'disconnected' | 'ready'>('idle');
  const [canQuickConnect, setCanQuickConnect] = useState(false);
  const [existingSession, setExistingSession] = useState<any>(null);
  
  const config = provider ? providerConfigs[provider.id] : null;
  const isOAuth = config?.authType === 'oauth';
  const isApiKey = config?.authType === 'apiKey';
  const isUpload = config?.authType === 'upload';
  const isQuickBooks = provider?.id === 'quickbooks';
  const isSage = provider?.id === 'sage';
  const isXero = provider?.id === 'xero';
  const isFreshBooks = provider?.id === 'freshbooks';
  const hasIntelligentFlow = isOAuth && (isQuickBooks || isSage || isXero || isFreshBooks);
  
  // Step-by-step connection flow for QuickBooks
  const quickbooksSteps = [
    { 
      titleEn: 'Connect QuickBooks', 
      titleFr: 'Connecter QuickBooks',
      descEn: 'We\'ll guide you through connecting your QuickBooks account securely',
      descFr: 'Nous vous guiderons pour connecter votre compte QuickBooks en toute sécurité'
    },
    { 
      titleEn: 'Authorize Access', 
      titleFr: 'Autoriser l\'accès',
      descEn: 'You\'ll be redirected to QuickBooks to authorize read-only access',
      descFr: 'Vous serez redirigé vers QuickBooks pour autoriser l\'accès en lecture seule'
    },
    { 
      titleEn: 'Select Company', 
      titleFr: 'Sélectionner l\'entreprise',
      descEn: 'Choose which QuickBooks company to connect',
      descFr: 'Choisissez quelle entreprise QuickBooks connecter'
    },
    { 
      titleEn: 'Verify Connection', 
      titleFr: 'Vérifier la connexion',
      descEn: 'We\'ll test the connection and fetch your account data',
      descFr: 'Nous testerons la connexion et récupérerons vos données de compte'
    },
    { 
      titleEn: 'Complete', 
      titleFr: 'Terminé',
      descEn: 'Your QuickBooks data is now syncing',
      descFr: 'Vos données QuickBooks sont maintenant en cours de synchronisation'
    },
  ];
  
  // Step-by-step connection flow for Sage
  const sageSteps = [
    { 
      titleEn: 'Connect Sage', 
      titleFr: 'Connecter Sage',
      descEn: 'We\'ll guide you through connecting your Sage Business Cloud account securely',
      descFr: 'Nous vous guiderons pour connecter votre compte Sage Business Cloud en toute sécurité'
    },
    { 
      titleEn: 'Authorize Access', 
      titleFr: 'Autoriser l\'accès',
      descEn: 'You\'ll be redirected to Sage to authorize read-only access',
      descFr: 'Vous serez redirigé vers Sage pour autoriser l\'accès en lecture seule'
    },
    { 
      titleEn: 'Select Business', 
      titleFr: 'Sélectionner l\'entreprise',
      descEn: 'Choose which Sage business to connect',
      descFr: 'Choisissez quelle entreprise Sage connecter'
    },
    { 
      titleEn: 'Verify Connection', 
      titleFr: 'Vérifier la connexion',
      descEn: 'We\'ll test the connection and fetch your account data',
      descFr: 'Nous testerons la connexion et récupérerons vos données de compte'
    },
    { 
      titleEn: 'Complete', 
      titleFr: 'Terminé',
      descEn: 'Your Sage data is now syncing',
      descFr: 'Vos données Sage sont maintenant en cours de synchronisation'
    },
  ];
  
  // Step-by-step connection flow for Xero
  const xeroSteps = [
    { 
      titleEn: 'Connect Xero', 
      titleFr: 'Connecter Xero',
      descEn: 'We\'ll guide you through connecting your Xero account securely',
      descFr: 'Nous vous guiderons pour connecter votre compte Xero en toute sécurité'
    },
    { 
      titleEn: 'Authorize Access', 
      titleFr: 'Autoriser l\'accès',
      descEn: 'You\'ll be redirected to Xero to authorize read-only access',
      descFr: 'Vous serez redirigé vers Xero pour autoriser l\'accès en lecture seule'
    },
    { 
      titleEn: 'Select Organization', 
      titleFr: 'Sélectionner l\'organisation',
      descEn: 'Choose which Xero organization to connect',
      descFr: 'Choisissez quelle organisation Xero connecter'
    },
    { 
      titleEn: 'Verify Connection', 
      titleFr: 'Vérifier la connexion',
      descEn: 'We\'ll test the connection and fetch your account data',
      descFr: 'Nous testerons la connexion et récupérerons vos données de compte'
    },
    { 
      titleEn: 'Complete', 
      titleFr: 'Terminé',
      descEn: 'Your Xero data is now syncing',
      descFr: 'Vos données Xero sont maintenant en cours de synchronisation'
    },
  ];
  
  // Step-by-step connection flow for FreshBooks
  const freshbooksSteps = [
    { 
      titleEn: 'Connect FreshBooks', 
      titleFr: 'Connecter FreshBooks',
      descEn: 'We\'ll guide you through connecting your FreshBooks account securely',
      descFr: 'Nous vous guiderons pour connecter votre compte FreshBooks en toute sécurité'
    },
    { 
      titleEn: 'Authorize Access', 
      titleFr: 'Autoriser l\'accès',
      descEn: 'You\'ll be redirected to FreshBooks to authorize read-only access',
      descFr: 'Vous serez redirigé vers FreshBooks pour autoriser l\'accès en lecture seule'
    },
    { 
      titleEn: 'Select Business', 
      titleFr: 'Sélectionner l\'entreprise',
      descEn: 'Choose which FreshBooks business to connect',
      descFr: 'Choisissez quelle entreprise FreshBooks connecter'
    },
    { 
      titleEn: 'Verify Connection', 
      titleFr: 'Vérifier la connexion',
      descEn: 'We\'ll test the connection and fetch your account data',
      descFr: 'Nous testerons la connexion et récupérerons vos données de compte'
    },
    { 
      titleEn: 'Complete', 
      titleFr: 'Terminé',
      descEn: 'Your FreshBooks data is now syncing',
      descFr: 'Vos données FreshBooks sont maintenant en cours de synchronisation'
    },
  ];
  
  // Get steps based on provider
  const connectionSteps = 
    isQuickBooks ? quickbooksSteps : 
    isSage ? sageSteps : 
    isXero ? xeroSteps : 
    isFreshBooks ? freshbooksSteps : 
    [];
  
  // Check existing connection status and auto-detect seamless connection
  useEffect(() => {
    if (hasIntelligentFlow && step === 'welcome') {
      setConnectionStatus('checking');
      
      // In production, this would:
      // 1. Check for existing PlainLedger connections
      // 2. Check if user has active OAuth session with provider
      // 3. Check if user has developer/admin access
      // 4. Auto-detect if QuickBooks/Xero/etc. is open in another tab
      const checkSeamlessConnection = async () => {
        try {
          // Check for existing PlainLedger connections
          // const response = await api.get(`/api/datasources?provider=${provider.id}`);
          // if (response.data && response.data.length > 0) {
          //   setConnectionStatus('connected');
          //   setExistingSession(response.data[0]);
          //   return;
          // }
          
          // Check for active OAuth session with provider
          // This would check browser storage, cookies, or make a lightweight API call
          // const oauthSession = await checkProviderSession(provider.id);
          // if (oauthSession && oauthSession.isValid) {
          //   setConnectionStatus('ready');
          //   setCanQuickConnect(true);
          //   setExistingSession(oauthSession);
          //   return;
          // }
          
          // Check if user has developer/admin access (for QuickBooks specifically)
          // This could check localStorage, sessionStorage, or make an API call
          // if (isQuickBooks) {
          //   const hasDevAccess = await checkQuickBooksDevAccess();
          //   if (hasDevAccess) {
          //     setConnectionStatus('ready');
          //     setCanQuickConnect(true);
          //   }
          // }
          
          // Simulate seamless connection detection
          setTimeout(() => {
            // Simulate: 40% chance of finding existing connection
            const hasExisting = Math.random() > 0.6;
            if (hasExisting) {
              setConnectionStatus('connected');
              setExistingSession({ id: 'existing-123', name: 'Existing Connection' });
            } else {
              // Simulate: 30% chance of detecting ready-to-connect state
              const isReady = Math.random() > 0.7;
              if (isReady) {
                setConnectionStatus('ready');
                setCanQuickConnect(true);
                setExistingSession({ 
                  hasActiveSession: true, 
                  canAutoConnect: true,
                  message: isEn 
                    ? 'QuickBooks session detected. Click "Quick Connect" to connect instantly.'
                    : 'Session QuickBooks détectée. Cliquez sur "Connexion rapide" pour connecter instantanément.'
                });
              } else {
                setConnectionStatus('disconnected');
              }
            }
          }, 1000);
        } catch (error) {
          setConnectionStatus('disconnected');
        }
      };
      
      checkSeamlessConnection();
    }
  }, [hasIntelligentFlow, step, provider?.id, isEn]);
  
  // Auto-advance through steps for better UX
  useEffect(() => {
    if (hasIntelligentFlow && step === 'oauth' && oauthUrl) {
      // Auto-advance after showing instructions
      const timer = setTimeout(() => {
        if (step === 'oauth') {
          setStep('authorizing');
          setCurrentStep(2);
          setProgress(40);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [hasIntelligentFlow, step, oauthUrl]);

  // Early return must be after all hooks
  if (!provider) return null;
  
  const handleQuickConnect = async () => {
    if (canQuickConnect && existingSession) {
      setStep('validating');
      setCurrentStep(3);
      setProgress(60);
      
      try {
        // In production, this would use the existing session to connect instantly
        // const response = await api.post(`/api/datasources/${provider.id}/quick-connect`, {
        //   sessionId: existingSession.id,
        //   useExistingAuth: true
        // });
        
        // Simulate quick connection
        setTimeout(() => {
          setProgress(100);
          setStep('success');
          setCurrentStep(4);
        }, 1500);
      } catch (error) {
        // Fallback to regular OAuth flow if quick connect fails
        handleStartOAuth();
      }
    }
  };
  
  const handleStartOAuth = async () => {
    if (isOAuth && hasIntelligentFlow) {
      setStep('oauth');
      setCurrentStep(1);
      setProgress(20);
      
      try {
        // In production, this would call the API to get OAuth URL
        // const response = await api.post(`/api/datasources/${provider.id}/oauth/url`, {
        //   redirectUri: `${window.location.origin}/connections/callback`
        // });
        // setOAuthUrl(response.data.url);
        
        // For now, simulate OAuth URL generation based on provider
        let simulatedUrl = '';
        if (isQuickBooks) {
          simulatedUrl = `https://appcenter.intuit.com/connect/oauth2?client_id=DEMO&redirect_uri=${encodeURIComponent(window.location.origin)}&response_type=code&scope=com.intuit.quickbooks.accounting&state=test123`;
        } else if (isSage) {
          simulatedUrl = `https://www.sageone.com/oauth2/auth/central?client_id=DEMO&redirect_uri=${encodeURIComponent(window.location.origin)}&response_type=code&scope=full_access&state=test123`;
        } else if (isXero) {
          simulatedUrl = `https://login.xero.com/identity/connect/authorize?response_type=code&client_id=DEMO&redirect_uri=${encodeURIComponent(window.location.origin)}&scope=openid profile email accounting.transactions accounting.contacts&state=test123`;
        } else if (isFreshBooks) {
          simulatedUrl = `https://api.freshbooks.com/auth/oauth/authorize?client_id=DEMO&redirect_uri=${encodeURIComponent(window.location.origin)}&response_type=code&state=test123`;
        }
        setOAuthUrl(simulatedUrl);
        
        // Auto-redirect after showing instructions
        setTimeout(() => {
          setStep('authorizing');
          setCurrentStep(2);
          setProgress(40);
          
          // Simulate OAuth callback
          setTimeout(() => {
            setStep('validating');
            setCurrentStep(3);
            setProgress(60);
            
            // Simulate validation
            setTimeout(() => {
              setProgress(100);
              setStep('success');
              setCurrentStep(4);
            }, 2000);
          }, 3000);
        }, 2000);
      } catch (error) {
        setStep('error');
      }
    } else {
      handleContinue();
    }
  };
  
  const handleContinue = () => {
    if (useDemoMode) {
      setStep('validating');
      setProgress(50);
      setTimeout(() => {
        setProgress(100);
        setStep('success');
      }, 2000);
    } else if (isApiKey) {
      setStep('credentials');
    } else if (isUpload) {
      setStep('credentials');
    }
  };
  
  const validateCredentials = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (config?.requiredFields) {
      config.requiredFields.forEach(field => {
        if (!credentials[field.key]?.trim()) {
          newErrors[field.key] = isEn ? 'This field is required' : 'Ce champ est requis';
        }
      });
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmitCredentials = () => {
    if (validateCredentials()) {
      setStep('connecting');
      // Simulate API validation
      setTimeout(() => {
        setStep('success');
      }, 2500);
    }
  };
  
  const handleUseDemoData = () => {
    setUseDemoMode(true);
    setStep('connecting');
    setTimeout(() => {
      setStep('success');
    }, 1500);
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className={`rounded-xl ${hasIntelligentFlow ? 'max-w-2xl' : 'max-w-lg'} w-full shadow-2xl max-h-[90vh] overflow-y-auto`}
        style={{ backgroundColor: 'rgb(var(--color-surface))' }}
      >
        <div className="p-6">
          {/* Intelligent Step-by-Step Wizard for QuickBooks and Sage */}
          {hasIntelligentFlow && isOAuth && step !== 'success' && step !== 'error' && (
            <div className="mb-6">
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? 'Connection Progress' : 'Progression de la connexion'}
                  </span>
                  <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {progress}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
                  <div 
                    className="h-full transition-all duration-500 rounded-full"
                    style={{ 
                      width: `${progress}%`,
                      background: `linear-gradient(90deg, ${provider.color}, ${provider.color}80)`
                    }}
                  />
                </div>
              </div>
              
              {/* Step Indicators */}
              <div className="flex items-center justify-between mb-6">
                {connectionSteps.map((stepItem, index) => (
                  <div key={index} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div 
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
                          index <= currentStep 
                            ? 'scale-110' 
                            : 'scale-100 opacity-50'
                        }`}
                        style={{ 
                          backgroundColor: index <= currentStep ? provider.color : 'rgb(var(--color-bg-muted))',
                          color: index <= currentStep ? 'white' : 'rgb(var(--color-text-muted))'
                        }}
                      >
                        {index < currentStep ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      {index < connectionSteps.length - 1 && (
                        <div 
                          className={`h-0.5 w-full mt-2 transition-all duration-300 ${
                            index < currentStep ? '' : 'opacity-30'
                          }`}
                          style={{ 
                            backgroundColor: index < currentStep ? provider.color : 'rgb(var(--color-border))'
                          }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {step === 'welcome' && (
            <>
              <div className="flex items-center gap-4 mb-6">
                <ProviderLogo provider={provider} size="lg" />
                <div>
                  <h3 
                    className="text-xl font-semibold"
                    style={{ color: 'rgb(var(--color-text))' }}
                  >
                    {isEn ? `Connect ${provider.name}` : `Connecter ${provider.name}`}
                  </h3>
                  <p 
                    className="text-sm"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  >
                    {hasIntelligentFlow 
                      ? (isEn 
                          ? `Automated connection wizard - we'll guide you step by step`
                          : `Assistant de connexion automatisé - nous vous guiderons étape par étape`)
                      : isOAuth 
                        ? (isEn ? 'OAuth 2.0 secure authorization' : 'Autorisation sécurisée OAuth 2.0')
                        : isApiKey 
                          ? (isEn ? 'API key authentication' : 'Authentification par clé API')
                          : (isEn ? 'Upload your data files' : 'Téléversez vos fichiers de données')}
                  </p>
                </div>
              </div>
              
              {/* Connection Status Check */}
              {hasIntelligentFlow && connectionStatus === 'checking' && (
                <div className="mb-4 p-3 rounded-lg flex items-center gap-3" style={{ backgroundColor: 'rgb(var(--color-info) / 0.05)' }}>
                  <RefreshCw className="w-4 h-4 animate-spin" style={{ color: 'rgb(var(--color-info))' }} />
                  <span className="text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? 'Checking for existing connections and active sessions...' : 'Vérification des connexions existantes et sessions actives...'}
                  </span>
                </div>
              )}
              
              {/* Seamless Quick Connect Option */}
              {hasIntelligentFlow && connectionStatus === 'ready' && canQuickConnect && (
                <div className="mb-4 p-5 rounded-xl border-2" style={{ 
                  backgroundColor: 'rgb(var(--color-success) / 0.05)',
                  borderColor: 'rgb(var(--color-success) / 0.3)'
                }}>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}>
                      <Zap className="w-6 h-6" style={{ color: 'rgb(var(--color-success))' }} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-base mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                        {isEn ? '⚡ Seamless Connection Available' : '⚡ Connexion transparente disponible'}
                      </h4>
                      <p className="text-sm mb-4 leading-relaxed" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        {existingSession?.message || (isEn 
                          ? `We detected an active ${provider.name} session. Connect instantly without re-authenticating.`
                          : `Nous avons détecté une session ${provider.name} active. Connectez-vous instantanément sans ré-authentification.`)}
                      </p>
                      
                      {/* Clear Instructions */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4" style={{ border: '1px solid rgb(var(--color-border))' }}>
                        <h5 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
                          <HelpCircle className="w-4 h-4" style={{ color: 'rgb(var(--color-info))' }} />
                          {isEn ? 'How it works:' : 'Comment ça fonctionne:'}
                        </h5>
                        <ol className="list-decimal list-inside space-y-2 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                          <li>
                            {isEn 
                              ? `You're already logged into ${provider.name} in this browser`
                              : `Vous êtes déjà connecté à ${provider.name} dans ce navigateur`}
                          </li>
                          <li>
                            {isEn 
                              ? 'Click "Quick Connect" to use your existing session'
                              : 'Cliquez sur "Connexion rapide" pour utiliser votre session existante'}
                          </li>
                          <li>
                            {isEn 
                              ? 'Connection completes automatically in seconds'
                              : 'La connexion se complète automatiquement en quelques secondes'}
                          </li>
                        </ol>
                      </div>
                      
                      <button
                        onClick={handleQuickConnect}
                        className="w-full px-6 py-3 rounded-lg font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 hover:scale-105 mb-3"
                        style={{ 
                          backgroundColor: provider.color,
                          color: 'white',
                          boxShadow: `0 4px 12px ${provider.color}40`
                        }}
                      >
                        <Zap className="w-5 h-5" />
                        {isEn ? 'Quick Connect (Instant)' : 'Connexion rapide (Instantané)'}
                      </button>
                      
                      <div className="pt-3 border-t text-center" style={{ borderColor: 'rgb(var(--color-border))' }}>
                        <button
                          onClick={handleStartOAuth}
                          className="text-xs hover:underline font-medium"
                          style={{ color: 'rgb(var(--color-text-muted))' }}
                        >
                          {isEn ? 'Or use standard connection flow →' : 'Ou utiliser le flux de connexion standard →'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {hasIntelligentFlow && connectionStatus === 'connected' && (
                <div className="mb-4 p-3 rounded-lg flex items-center gap-3" style={{ backgroundColor: 'rgb(var(--color-success) / 0.05)' }}>
                  <CheckCircle2 className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
                  <span className="text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn 
                      ? `Found existing connection. You can reconnect or add a new ${isQuickBooks ? 'company' : isXero ? 'organization' : 'business'}.`
                      : `Connexion existante trouvée. Vous pouvez reconnecter ou ajouter une nouvelle ${isQuickBooks ? 'entreprise' : isXero ? 'organisation' : 'entreprise'}.`}
                  </span>
                </div>
              )}
              
              {/* Authentication Method Info */}
              <div 
                className="mb-4 p-3 rounded-lg flex items-start gap-3"
                style={{ 
                  backgroundColor: 'rgb(var(--color-info) / 0.05)',
                  border: '1px solid rgb(var(--color-info) / 0.2)'
                }}
              >
                <Shield className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'rgb(var(--color-info))' }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                    {isOAuth 
                      ? (isEn ? 'Secure OAuth Connection' : 'Connexion OAuth sécurisée')
                      : (isEn ? 'API Credentials Required' : 'Identifiants API requis')}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isOAuth 
                      ? (isEn 
                          ? `You'll be redirected to ${provider.name} to authorize read-only access. We never store your password.`
                          : `Vous serez redirigé vers ${provider.name} pour autoriser l'accès en lecture seule. Nous ne stockons jamais votre mot de passe.`)
                      : isApiKey
                        ? (isEn 
                            ? `You'll need to provide your ${provider.name} API credentials. Find them in your ${provider.name} developer settings.`
                            : `Vous devrez fournir vos identifiants API ${provider.name}. Trouvez-les dans les paramètres développeur de ${provider.name}.`)
                        : (isEn 
                            ? 'Upload your accounting data in CSV format. We support chart of accounts, transactions, and journal entries.'
                            : 'Téléversez vos données comptables au format CSV. Nous supportons le plan comptable, les transactions et les écritures.')}
                  </p>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                {[
                  { 
                    titleEn: 'Read-only access', 
                    titleFr: 'Lecture seule',
                    descEn: 'We never modify your data',
                    descFr: 'Nous ne modifions jamais vos données'
                  },
                  { 
                    titleEn: 'AES-256 encryption', 
                    titleFr: 'Chiffrement AES-256',
                    descEn: 'Your credentials are encrypted at rest',
                    descFr: 'Vos identifiants sont chiffrés au repos'
                  },
                  { 
                    titleEn: 'Revocable anytime', 
                    titleFr: 'Révocable à tout moment',
                    descEn: 'Disconnect and delete data whenever you want',
                    descFr: 'Déconnectez et supprimez les données quand vous voulez'
                  },
                ].map((item, i) => (
                  <div 
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg"
                    style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                  >
                    <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'rgb(var(--color-success))' }} />
                    <div>
                      <p className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                        {isEn ? item.titleEn : item.titleFr}
                      </p>
                      <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        {isEn ? item.descEn : item.descFr}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* IT Admin Setup Requirements Toggle */}
              {hasIntelligentFlow && (
                <div 
                  className="mb-4 p-3 rounded-lg cursor-pointer hover:bg-opacity-80 transition-colors"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-bg-muted))',
                    border: '1px solid rgb(var(--color-border))'
                  }}
                  onClick={() => setShowSetupGuide(!showSetupGuide)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                      <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                        {isEn ? 'IT Admin / Developer Setup Guide' : 'Guide de configuration IT Admin / Développeur'}
                      </span>
                    </div>
                    <ArrowRight 
                      className={`w-4 h-4 transition-transform duration-200 ${showSetupGuide ? 'rotate-90' : ''}`} 
                      style={{ color: 'rgb(var(--color-text-muted))' }} 
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn 
                      ? 'View prerequisites and one-time setup requirements for IT personnel'
                      : 'Voir les prérequis et les configurations uniques pour le personnel IT'}
                  </p>
                </div>
              )}
              
              {/* Expanded Setup Guide */}
              {showSetupGuide && hasIntelligentFlow && (
                <div 
                  className="mb-4 p-4 rounded-xl space-y-4"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-bg-muted))',
                    border: '1px solid rgb(var(--color-border))'
                  }}
                >
                  <h4 className="font-bold text-sm flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
                    <Wrench className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-600))' }} />
                    {isEn ? 'Setup Requirements Checklist' : 'Liste de vérification des prérequis'}
                  </h4>
                  
                  {/* PlainLedger Admin Setup */}
                  <div className="space-y-2">
                    <h5 className="font-semibold text-xs uppercase tracking-wide flex items-center gap-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 text-xs font-bold">1</span>
                      {isEn ? 'PlainLedger Configuration (Done by PlainLedger team)' : 'Configuration PlainLedger (Fait par l\'équipe PlainLedger)'}
                    </h5>
                    <div className="pl-7 space-y-1.5 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgb(var(--color-success))' }} />
                        <span>{isEn ? 'OAuth redirect URIs configured in backend' : 'URIs de redirection OAuth configurées dans le backend'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgb(var(--color-success))' }} />
                        <span>{isEn ? 'API endpoints deployed and accessible' : 'Points d\'accès API déployés et accessibles'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgb(var(--color-success))' }} />
                        <span>{isEn ? 'AES-256 encryption for credential storage' : 'Chiffrement AES-256 pour le stockage des identifiants'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Provider Developer Setup */}
                  <div className="space-y-2">
                    <h5 className="font-semibold text-xs uppercase tracking-wide flex items-center gap-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 text-xs font-bold">2</span>
                      {isEn 
                        ? `${provider.name} Developer Portal Setup (One-time by IT Admin)` 
                        : `Configuration du portail développeur ${provider.name} (Une fois par l'admin IT)`}
                    </h5>
                    <div className="pl-7 space-y-1.5 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      <div className="flex items-start gap-2">
                        <span className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 rounded-full border-2" style={{ borderColor: 'rgb(var(--color-border))' }} />
                        <div>
                          <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                            {isEn ? 'Create Developer Account:' : 'Créer un compte développeur:'}
                          </span>{' '}
                          <a 
                            href={isQuickBooks ? 'https://developer.intuit.com' : isSage ? 'https://developer.sage.com' : isXero ? 'https://developer.xero.com' : 'https://www.freshbooks.com/api'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                            style={{ color: 'rgb(var(--color-primary-600))' }}
                          >
                            {isQuickBooks ? 'developer.intuit.com' : isSage ? 'developer.sage.com' : isXero ? 'developer.xero.com' : 'freshbooks.com/api'}
                          </a>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 rounded-full border-2" style={{ borderColor: 'rgb(var(--color-border))' }} />
                        <span>
                          {isEn 
                            ? 'Register a new app and obtain Client ID & Client Secret' 
                            : 'Enregistrer une nouvelle app et obtenir Client ID & Client Secret'}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 rounded-full border-2" style={{ borderColor: 'rgb(var(--color-border))' }} />
                        <span>
                          {isEn 
                            ? 'Configure redirect URI: ' 
                            : 'Configurer l\'URI de redirection: '}
                          <code className="text-xs px-1 py-0.5 rounded" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
                            {window.location.origin}/api/v1/datasources/oauth/{provider.id}/callback
                          </code>
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 rounded-full border-2" style={{ borderColor: 'rgb(var(--color-border))' }} />
                        <span>
                          {isEn 
                            ? 'Provide credentials to PlainLedger team for secure storage' 
                            : 'Fournir les identifiants à l\'équipe PlainLedger pour stockage sécurisé'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Business User Requirements */}
                  <div className="space-y-2">
                    <h5 className="font-semibold text-xs uppercase tracking-wide flex items-center gap-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 text-xs font-bold">3</span>
                      {isEn 
                        ? `${provider.name} User Requirements (Per connection)` 
                        : `Prérequis utilisateur ${provider.name} (Par connexion)`}
                    </h5>
                    <div className="pl-7 space-y-1.5 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 flex-shrink-0 rounded-full border-2" style={{ borderColor: 'rgb(var(--color-border))' }} />
                        <span>
                          {isQuickBooks 
                            ? (isEn ? 'Admin or Master Admin access to QuickBooks company' : 'Accès Admin ou Admin principal à l\'entreprise QuickBooks')
                            : isSage 
                              ? (isEn ? 'Admin or authorized user credentials for Sage' : 'Identifiants admin ou utilisateur autorisé pour Sage')
                              : isXero
                                ? (isEn ? 'Advisor or Standard user role with API access in Xero' : 'Rôle Conseiller ou Standard avec accès API dans Xero')
                                : (isEn ? 'Owner or admin access to FreshBooks account' : 'Accès propriétaire ou admin au compte FreshBooks')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 flex-shrink-0 rounded-full border-2" style={{ borderColor: 'rgb(var(--color-border))' }} />
                        <span>
                          {isEn 
                            ? 'Ability to authorize third-party app connections' 
                            : 'Capacité d\'autoriser les connexions d\'applications tierces'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Keycloak Note */}
                  <div 
                    className="p-3 rounded-lg text-xs"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-info) / 0.05)',
                      border: '1px solid rgb(var(--color-info) / 0.2)'
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'rgb(var(--color-info))' }} />
                      <div>
                        <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                          {isEn ? 'Keycloak / User Authentication' : 'Keycloak / Authentification utilisateur'}
                        </p>
                        <p style={{ color: 'rgb(var(--color-text-muted))' }}>
                          {isEn 
                            ? 'No additional Keycloak configuration is required for data connections. Keycloak handles PlainLedger user login only - accounting software OAuth is a separate data integration flow.'
                            : 'Aucune configuration Keycloak supplémentaire n\'est requise pour les connexions de données. Keycloak gère uniquement la connexion utilisateur PlainLedger - l\'OAuth des logiciels comptables est un flux d\'intégration de données séparé.'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Contact Support */}
                  <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: 'rgb(var(--color-border))' }}>
                    <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? 'Need help with setup?' : 'Besoin d\'aide avec la configuration?'}
                    </span>
                    <a 
                      href="mailto:support@plainledger.ca"
                      className="text-xs font-medium hover:underline"
                      style={{ color: 'rgb(var(--color-primary-600))' }}
                    >
                      support@plainledger.ca
                    </a>
                  </div>
                </div>
              )}
              
              {/* Demo Mode Option */}
              <div 
                className="mb-4 p-3 rounded-lg"
                style={{ 
                  backgroundColor: 'rgb(var(--color-warning) / 0.05)',
                  border: '1px solid rgb(var(--color-warning) / 0.2)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" style={{ color: 'rgb(var(--color-warning))' }} />
                    <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'Demo Mode Available' : 'Mode démo disponible'}
                    </span>
                  </div>
                  <button
                    onClick={handleUseDemoData}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-warning) / 0.1)',
                      color: 'rgb(var(--color-warning))'
                    }}
                  >
                    {isEn ? 'Use demo data' : 'Utiliser données démo'}
                  </button>
                </div>
                <p className="text-xs mt-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn 
                    ? 'Try PlainLedger with sample accounting data - no real credentials needed.'
                    : 'Essayez PlainLedger avec des données comptables d\'exemple - aucun identifiant réel requis.'}
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors text-sm"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-bg-muted))',
                    color: 'rgb(var(--color-text-secondary))'
                  }}
                >
                  {isEn ? 'Cancel' : 'Annuler'}
                </button>
                <button
                  onClick={hasIntelligentFlow && isOAuth ? handleStartOAuth : handleContinue}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                  style={{ 
                    backgroundColor: hasIntelligentFlow ? provider.color : 'rgb(var(--color-text))',
                    color: 'white'
                  }}
                >
                  {hasIntelligentFlow && isOAuth
                    ? (isEn ? 'Start Connection Wizard' : 'Démarrer l\'assistant de connexion')
                    : isOAuth 
                      ? (isEn ? `Authorize with ${provider.name}` : `Autoriser avec ${provider.name}`)
                      : (isEn ? 'Enter credentials' : 'Saisir identifiants')}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
          
          {step === 'credentials' && (
            <>
              <div className="flex items-center gap-4 mb-6">
                <ProviderLogo provider={provider} size="lg" />
                <div>
                  <h3 
                    className="text-xl font-semibold"
                    style={{ color: 'rgb(var(--color-text))' }}
                  >
                    {isEn ? `${provider.name} Credentials` : `Identifiants ${provider.name}`}
                  </h3>
                  <p 
                    className="text-sm"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  >
                    {isEn ? 'Enter your API credentials' : 'Saisissez vos identifiants API'}
                  </p>
                </div>
              </div>
              
              {isUpload ? (
                <div className="mb-6">
                  <div 
                    className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
                    style={{ borderColor: 'rgb(var(--color-border))' }}
                    onClick={() => {
                      alert(isEn 
                        ? 'File upload dialog would open here. Supported formats: CSV, XLS, XLSX' 
                        : 'Le dialogue de téléversement s\'ouvrirait ici. Formats supportés: CSV, XLS, XLSX');
                    }}
                  >
                    <Plus className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgb(var(--color-text-muted))' }} />
                    <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'Click to upload or drag files here' : 'Cliquez pour téléverser ou glissez les fichiers ici'}
                    </p>
                    <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? 'CSV, XLS, XLSX (max 50MB)' : 'CSV, XLS, XLSX (max 50Mo)'}
                    </p>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'Required files:' : 'Fichiers requis:'}
                    </p>
                    {[
                      { en: 'Chart of Accounts', fr: 'Plan comptable' },
                      { en: 'General Ledger / Trial Balance', fr: 'Grand livre / Balance de vérification' },
                      { en: 'Journal Entries (optional)', fr: 'Écritures de journal (optionnel)' },
                    ].map((file, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgb(var(--color-border))' }} />
                        {isEn ? file.en : file.fr}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  {config?.requiredFields?.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgb(var(--color-text))' }}>
                        {isEn ? field.label : field.labelFr}
                      </label>
                      <input
                        type={field.type}
                        placeholder={field.placeholder}
                        value={credentials[field.key] || ''}
                        onChange={(e) => {
                          setCredentials(prev => ({ ...prev, [field.key]: e.target.value }));
                          if (errors[field.key]) {
                            setErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors[field.key];
                              return newErrors;
                            });
                          }
                        }}
                        className="input w-full font-mono text-sm"
                        style={{
                          borderColor: errors[field.key] ? 'rgb(var(--color-error))' : undefined
                        }}
                      />
                      {errors[field.key] && (
                        <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-error))' }}>
                          {errors[field.key]}
                        </p>
                      )}
                    </div>
                  ))}
                  
                  {/* Help link */}
                  <a 
                    href="#" 
                    className="text-sm flex items-center gap-1 hover:underline"
                    style={{ color: 'rgb(var(--color-primary-600))' }}
                    onClick={(e) => {
                      e.preventDefault();
                      alert(isEn 
                        ? `To find your ${provider.name} API credentials:\n\n1. Log in to your ${provider.name} account\n2. Go to Settings > Integrations or Developer\n3. Create a new API key or app\n4. Copy the credentials here`
                        : `Pour trouver vos identifiants API ${provider.name}:\n\n1. Connectez-vous à votre compte ${provider.name}\n2. Allez dans Paramètres > Intégrations ou Développeur\n3. Créez une nouvelle clé API ou application\n4. Copiez les identifiants ici`);
                    }}
                  >
                    <HelpCircle className="w-4 h-4" />
                    {isEn ? `Where to find my ${provider.name} credentials?` : `Où trouver mes identifiants ${provider.name}?`}
                  </a>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('info')}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors text-sm"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-bg-muted))',
                    color: 'rgb(var(--color-text-secondary))'
                  }}
                >
                  {isEn ? 'Back' : 'Retour'}
                </button>
                <button
                  onClick={handleSubmitCredentials}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-text))',
                    color: 'rgb(var(--color-bg))'
                  }}
                >
                  {isEn ? 'Connect' : 'Connecter'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
          
          {/* OAuth Step - Instructions */}
          {step === 'oauth' && hasIntelligentFlow && (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 relative">
                <ProviderLogo provider={provider} size="lg" />
                <div 
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: provider.color }}
                >
                  <Zap className="w-3 h-3 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                {connectionSteps[currentStep]?.titleEn || 'Ready to Connect'}
              </h3>
              <p className="mb-6" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {connectionSteps[currentStep]?.descEn || `Preparing to redirect you to ${provider.name}...`}
              </p>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5 mb-6 text-left border" style={{ borderColor: 'rgb(var(--color-info) / 0.2)' }}>
                <h4 className="font-bold mb-3 text-sm flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
                  <ArrowRight className="w-4 h-4" style={{ color: 'rgb(var(--color-info))' }} />
                  {isEn ? 'Step-by-Step Instructions:' : 'Instructions étape par étape:'}
                </h4>
                <ol className="list-decimal list-inside space-y-3 text-sm leading-relaxed" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  <li className="pl-2">
                    <strong style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'Redirect:' : 'Redirection:'}
                    </strong>{' '}
                    {isEn 
                      ? `You'll be redirected to ${provider.name} in a new window`
                      : `Vous serez redirigé vers ${provider.name} dans une nouvelle fenêtre`}
                  </li>
                  <li className="pl-2">
                    <strong style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'Sign In:' : 'Connexion:'}
                    </strong>{' '}
                    {isEn 
                      ? `Sign in with your ${provider.name} account (if not already signed in)`
                      : `Connectez-vous avec votre compte ${provider.name} (si pas déjà connecté)`}
                  </li>
                  <li className="pl-2">
                    <strong style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'Authorize:' : 'Autoriser:'}
                    </strong>{' '}
                    {isEn 
                      ? 'Click "Allow" or "Authorize" to grant PlainLedger read-only access to your data'
                      : 'Cliquez sur "Autoriser" pour accorder à PlainLedger un accès en lecture seule à vos données'}
                  </li>
                  <li className="pl-2">
                    <strong style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'Select:' : 'Sélectionner:'}
                    </strong>{' '}
                    {isEn 
                      ? `Choose which ${isQuickBooks ? 'company' : isXero ? 'organization' : 'business'} to connect`
                      : `Choisissez quelle ${isQuickBooks ? 'entreprise' : isXero ? 'organisation' : 'entreprise'} connecter`}
                  </li>
                  <li className="pl-2">
                    <strong style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'Complete:' : 'Compléter:'}
                    </strong>{' '}
                    {isEn 
                      ? 'You\'ll be automatically redirected back to PlainLedger - no action needed'
                      : 'Vous serez automatiquement redirigé vers PlainLedger - aucune action requise'}
                  </li>
                </ol>
                
                <div className="mt-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border" style={{ borderColor: 'rgb(var(--color-warning) / 0.2)' }}>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'rgb(var(--color-warning))' }} />
                    <p className="text-xs leading-relaxed" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn 
                        ? '💡 Tip: If the popup window doesn\'t open, check your browser\'s popup blocker settings. You may need to allow popups for this site.'
                        : '💡 Astuce: Si la fenêtre popup ne s\'ouvre pas, vérifiez les paramètres de blocage des popups de votre navigateur. Vous devrez peut-être autoriser les popups pour ce site.'}
                    </p>
                  </div>
                </div>
              </div>
              
              {oauthUrl && (
                <button
                  onClick={() => {
                    // In production, this would open the OAuth URL
                    // window.location.href = oauthUrl;
                    setStep('authorizing');
                  }}
                  className="w-full px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                  style={{ 
                    backgroundColor: provider.color,
                    color: 'white',
                    boxShadow: `0 4px 15px ${provider.color}40`
                  }}
                >
                  {isEn ? `Continue to ${provider.name}` : `Continuer vers ${provider.name}`}
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
          
          {/* Authorizing Step */}
          {step === 'authorizing' && hasIntelligentFlow && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 relative">
                <ProviderLogo provider={provider} size="lg" />
                <div 
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgb(var(--color-info))' }}
                >
                  <RefreshCw className="w-3 h-3 text-white animate-spin" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                {connectionSteps[currentStep]?.titleEn || 'Authorizing...'}
              </h3>
              <p className="mb-4 text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn 
                  ? `Please complete the authorization in the ${provider.name} window. This window will update automatically when done.`
                  : `Veuillez compléter l'autorisation dans la fenêtre ${provider.name}. Cette fenêtre se mettra à jour automatiquement.`}
              </p>
              
              {/* Clear Instructions Box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4 border" style={{ borderColor: 'rgb(var(--color-info) / 0.2)' }}>
                <h5 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
                  <Eye className="w-4 h-4" style={{ color: 'rgb(var(--color-info))' }} />
                  {isEn ? 'What to do:' : 'Que faire:'}
                </h5>
                <ul className="list-disc list-inside space-y-1.5 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  <li>
                    {isEn 
                      ? `Look for the ${provider.name} authorization window (it may be behind this window)`
                      : `Recherchez la fenêtre d'autorisation ${provider.name} (elle peut être derrière cette fenêtre)`}
                  </li>
                  <li>
                    {isEn 
                      ? 'Sign in if prompted, then click "Allow" or "Authorize"'
                      : 'Connectez-vous si demandé, puis cliquez sur "Autoriser"'}
                  </li>
                  <li>
                    {isEn 
                      ? 'This window will automatically update when authorization is complete'
                      : 'Cette fenêtre se mettra à jour automatiquement lorsque l\'autorisation sera terminée'}
                  </li>
                </ul>
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border" style={{ borderColor: 'rgb(var(--color-warning) / 0.2)' }}>
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'rgb(var(--color-warning))' }} />
                  <p className="text-xs leading-relaxed" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn 
                      ? `💡 Tip: If the ${provider.name} window didn't open, check your popup blocker settings. You may need to allow popups for this site.`
                      : `💡 Astuce: Si la fenêtre ${provider.name} ne s'est pas ouverte, vérifiez les paramètres de blocage des popups. Vous devrez peut-être autoriser les popups pour ce site.`}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Validating Step */}
          {step === 'validating' && hasIntelligentFlow && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 relative">
                <ProviderLogo provider={provider} size="lg" />
                <div 
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgb(var(--color-info))' }}
                >
                  <RefreshCw className="w-3 h-3 text-white animate-spin" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                {connectionSteps[currentStep]?.titleEn || 'Verifying Connection...'}
              </h3>
              <p className="mb-4 text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn 
                  ? 'Testing connection and fetching your account data...'
                  : 'Test de la connexion et récupération de vos données de compte...'}
              </p>
              
              {/* Progress Steps */}
              <div className="space-y-3 text-sm text-left max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg p-4 border" style={{ borderColor: 'rgb(var(--color-border))' }}>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}>
                    <CheckCircle2 className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'Connection established' : 'Connexion établie'}
                    </p>
                    <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? 'Successfully authenticated with provider' : 'Authentification réussie avec le fournisseur'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgb(var(--color-info) / 0.1)' }}>
                    <RefreshCw className="w-4 h-4 animate-spin" style={{ color: 'rgb(var(--color-info))' }} />
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn 
                        ? `Fetching ${isQuickBooks ? 'company' : isXero ? 'organization' : 'business'} information...` 
                        : `Récupération des informations de l'${isQuickBooks ? 'entreprise' : isXero ? 'organisation' : 'entreprise'}...`}
                    </p>
                    <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? 'Retrieving basic details and settings' : 'Récupération des détails et paramètres de base'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgb(var(--color-info) / 0.1)' }}>
                    <RefreshCw className="w-4 h-4 animate-spin" style={{ color: 'rgb(var(--color-info))' }} />
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'Loading account list...' : 'Chargement de la liste des comptes...'}
                    </p>
                    <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? 'Fetching chart of accounts and account details' : 'Récupération du plan comptable et des détails des comptes'}
                    </p>
                  </div>
                </div>
              </div>
              
              <p className="mt-4 text-xs text-center" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn 
                  ? 'This usually takes 10-30 seconds depending on your data size'
                  : 'Cela prend généralement 10-30 secondes selon la taille de vos données'}
              </p>
            </div>
          )}
          
          {step === 'connecting' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 relative">
                <ProviderLogo provider={provider} size="lg" />
                <div 
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgb(var(--color-info))' }}
                >
                  <RefreshCw className="w-3 h-3 text-white animate-spin" />
                </div>
              </div>
              <h3 
                className="text-xl font-semibold mb-2"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {useDemoMode 
                  ? (isEn ? 'Loading demo data...' : 'Chargement des données démo...')
                  : (isEn ? 'Connecting...' : 'Connexion en cours...')}
              </h3>
              <p style={{ color: 'rgb(var(--color-text-muted))' }}>
                {useDemoMode 
                  ? (isEn 
                      ? 'Generating sample accounting data for demonstration'
                      : 'Génération de données comptables d\'exemple pour démonstration')
                  : config?.authType === 'oauth'
                    ? (isEn 
                        ? `Please complete the authorization in the ${provider.name} window`
                        : `Veuillez compléter l'autorisation dans la fenêtre ${provider.name}`)
                    : (isEn
                        ? 'Validating credentials and fetching account data...'
                        : 'Validation des identifiants et récupération des données...')}
              </p>
              
              {useDemoMode && (
                <div 
                  className="mt-4 p-3 rounded-lg text-left"
                  style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                >
                  <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn 
                      ? 'Demo data includes: 45 accounts, 12 months of transactions, balance sheet, income statement, and cash flow data.'
                      : 'Les données démo incluent: 45 comptes, 12 mois de transactions, bilan, état des résultats et flux de trésorerie.'}
                  </p>
                </div>
              )}
            </div>
          )}
          
          {step === 'success' && (
            <div className="text-center py-8">
              <div 
                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}
              >
                <CheckCircle2 className="w-8 h-8" style={{ color: 'rgb(var(--color-success))' }} />
              </div>
              <h3 
                className="text-xl font-semibold mb-2"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? '✅ Successfully Connected!' : '✅ Connecté avec succès!'}
              </h3>
              <p className="mb-4 text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {useDemoMode 
                  ? (isEn 
                      ? 'Demo data has been loaded into your account'
                      : 'Les données démo ont été chargées dans votre compte')
                  : (isEn 
                      ? `${provider.name} is now linked to your PlainLedger account. Your financial data will sync automatically.`
                      : `${provider.name} est maintenant lié à votre compte PlainLedger. Vos données financières se synchroniseront automatiquement.`)}
              </p>
              
              {/* Next Steps Instructions */}
              <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4 mb-4 border" style={{ borderColor: 'rgb(var(--color-success) / 0.2)' }}>
                <h5 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: 'rgb(var(--color-success))' }}>
                  <ArrowRight className="w-4 h-4" />
                  {isEn ? 'What happens next:' : 'Prochaines étapes:'}
                </h5>
                <ul className="list-disc list-inside space-y-1.5 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  <li>
                    {isEn 
                      ? 'Your data will sync automatically in the background'
                      : 'Vos données se synchroniseront automatiquement en arrière-plan'}
                  </li>
                  <li>
                    {isEn 
                      ? 'You can view your financial reports in the Dashboard'
                      : 'Vous pouvez consulter vos rapports financiers dans le Tableau de bord'}
                  </li>
                  <li>
                    {isEn 
                      ? 'Sync status and last sync time will be shown on the Connections page'
                      : 'Le statut de synchronisation et l\'heure de la dernière sync seront affichés sur la page Connexions'}
                  </li>
                </ul>
              </div>
              
              {useDemoMode && (
                <div 
                  className="mb-4 p-3 rounded-lg text-left"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-warning) / 0.05)',
                    border: '1px solid rgb(var(--color-warning) / 0.2)'
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4" style={{ color: 'rgb(var(--color-warning))' }} />
                    <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-warning))' }}>
                      {isEn ? 'Demo Mode' : 'Mode Démo'}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn 
                      ? 'This is sample data for testing. Connect a real accounting system to see your actual financial data.'
                      : 'Ce sont des données d\'exemple pour les tests. Connectez un vrai système comptable pour voir vos données financières réelles.'}
                  </p>
                </div>
              )}
              
              {/* Connection summary */}
              <div 
                className="mb-6 p-4 rounded-lg text-left"
                style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
              >
                <p className="text-sm font-medium mb-3" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Connection Details' : 'Détails de la connexion'}
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Provider' : 'Fournisseur'}</span>
                    <span style={{ color: 'rgb(var(--color-text))' }}>{provider.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Auth Method' : 'Méthode auth.'}</span>
                    <span style={{ color: 'rgb(var(--color-text))' }}>
                      {useDemoMode ? (isEn ? 'Demo' : 'Démo') : config?.authType === 'oauth' ? 'OAuth 2.0' : 'API Key'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Access Level' : 'Niveau d\'accès'}</span>
                    <span style={{ color: 'rgb(var(--color-text))' }}>{isEn ? 'Read-only' : 'Lecture seule'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Accounts Found' : 'Comptes trouvés'}</span>
                    <span style={{ color: 'rgb(var(--color-text))' }}>45</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="w-full px-4 py-2.5 rounded-lg font-medium transition-colors"
                style={{ 
                  backgroundColor: 'rgb(var(--color-text))',
                  color: 'rgb(var(--color-bg))'
                }}
              >
                {isEn ? 'Start synchronization' : 'Commencer la synchronisation'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Connections() {
  const { isInternalStaff, currentTenant, isAdmin } = useTenant();
  const { canManageConnections, canViewConnections } = useCanPerform();
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [providerList, setProviderList] = useState(providers);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState<string | null>(null);
  
  // GraphQL hooks for actual data sources
  // Skip the query if we're in mock/demo mode to avoid auth errors
  const { data: dataSourcesData, refetch: refetchDataSources, error: dataSourcesError } = useDataSources();
  const [disconnectDataSource] = useDisconnectDataSource();
  const [syncDataSource] = useSyncDataSource();
  
  // State for sync error messages
  const [syncError, setSyncError] = useState<string | null>(null);
  
  // Log any GraphQL errors for debugging
  useEffect(() => {
    if (dataSourcesError) {
      console.log('[Connections] GraphQL data sources error (expected in demo mode):', dataSourcesError.message);
    }
  }, [dataSourcesError]);
  
  // Map real data sources to provider list
  useEffect(() => {
    if (dataSourcesData?.dataSources) {
      setProviderList(prev => prev.map(provider => {
        const matchingSource = dataSourcesData.dataSources.find(
          (ds: any) => ds.provider.toLowerCase() === provider.id.toLowerCase()
        );
        if (matchingSource) {
          return {
            ...provider,
            dataSourceId: matchingSource.id, // Store the real ID for API calls
            status: matchingSource.status === 'ACTIVE' ? 'connected' : 
                   matchingSource.status === 'SYNCING' ? 'syncing' :
                   matchingSource.status === 'ERROR' ? 'error' : 'disconnected',
            lastSync: matchingSource.lastSyncAt 
              ? formatRelativeTime(new Date(matchingSource.lastSyncAt), isEn)
              : undefined,
            lastSyncAt: matchingSource.lastSyncAt, // Store raw timestamp for cooldown
            accountsCount: matchingSource.syncStats?.accountsSynced,
            transactionsCount: matchingSource.syncStats?.transactionsSynced,
          };
        }
        return provider;
      }));
    }
  }, [dataSourcesData, isEn]);
  
  const connectedCount = providerList.filter(p => p.status === 'connected').length;
  
  // Check if user is on free plan - show subscription gate
  const isFreePlan = currentTenant?.plan === 'free';
  
  // Show permission notice for non-admin users
  const showReadOnlyNotice = !canManageConnections;
  
  const handleConnect = (id: string) => {
    const provider = providerList.find(p => p.id === id);
    if (provider) {
      setSelectedProvider(provider);
      setShowModal(true);
    }
  };
  
  const handleConfirmConnection = () => {
    if (selectedProvider) {
      setProviderList(prev => prev.map(p => 
        p.id === selectedProvider.id 
          ? { ...p, status: 'connected', lastSync: isEn ? 'Just now' : 'À l\'instant', accountsCount: 24, transactionsCount: 847 }
          : p
      ));
    }
  };
  
  const handleDisconnect = async (id: string) => {
    const provider = providerList.find(p => p.id === id);
    const confirmMsg = isEn 
      ? 'Are you sure you want to disconnect this provider? This will stop syncing data.' 
      : 'Êtes-vous sûr de vouloir déconnecter ce fournisseur? Cela arrêtera la synchronisation des données.';
    
    // Skip confirmation in dev/test mode for easier testing
    const isDev = import.meta.env.DEV;
    if (!isDev && !confirm(confirmMsg)) return;
    
    // If we have a real data source ID, call the API
    if (provider?.dataSourceId) {
      setIsDisconnecting(id);
      try {
        const result = await disconnectDataSource({
          variables: { id: provider.dataSourceId }
        });
        
        if (result.data?.disconnectDataSource?.success) {
          // Refetch to get updated state from server
          await refetchDataSources();
          
          // Also update local state immediately for better UX
          setProviderList(prev => prev.map(p => 
            p.id === id ? { 
              ...p, 
              status: 'disconnected', 
              lastSync: undefined, 
              accountsCount: undefined, 
              transactionsCount: undefined,
              dataSourceId: undefined 
            } : p
          ));
        } else {
          const errorMsg = result.data?.disconnectDataSource?.message || 
            (isEn ? 'Failed to disconnect' : 'Échec de la déconnexion');
          alert(errorMsg);
        }
      } catch (error) {
        console.error('Disconnect error:', error);
        alert(isEn 
          ? 'An error occurred while disconnecting. Please try again.' 
          : 'Une erreur s\'est produite lors de la déconnexion. Veuillez réessayer.');
      } finally {
        setIsDisconnecting(null);
      }
    } else {
      // No real data source, just update local state (demo mode)
      console.log('[Connections] Demo mode disconnect for provider:', id);
      setProviderList(prev => prev.map(p => 
        p.id === id ? { ...p, status: 'disconnected', lastSync: undefined, accountsCount: undefined, transactionsCount: undefined } : p
      ));
    }
  };
  
  const handleSync = async (id: string) => {
    const provider = providerList.find(p => p.id === id);
    setSyncError(null);
    
    // Check cooldown
    if (provider?.lastSyncAt) {
      const timeUntilNextSync = getTimeUntilNextSync(provider.lastSyncAt);
      if (timeUntilNextSync > 0) {
        const cooldownMsg = isEn 
          ? `Please wait ${formatCooldownTime(timeUntilNextSync, isEn)} before syncing again`
          : `Veuillez attendre ${formatCooldownTime(timeUntilNextSync, isEn)} avant de synchroniser à nouveau`;
        setSyncError(cooldownMsg);
        return;
      }
    }
    
    // If we have a real data source ID, call the API
    if (provider?.dataSourceId) {
      // Update UI to show syncing
      setProviderList(prev => prev.map(p => 
        p.id === id ? { ...p, status: 'syncing' } : p
      ));
      
      try {
        const result = await syncDataSource({
          variables: { id: provider.dataSourceId }
        });
        
        if (result.data?.syncDataSource?.success) {
          // Refetch to get updated state from server
          await refetchDataSources();
          
          // Show any warnings
          if (result.data.syncDataSource.warnings?.length > 0) {
            console.log('[Connections] Sync warnings:', result.data.syncDataSource.warnings);
          }
        } else {
          const errorMsg = result.data?.syncDataSource?.message || 
            (isEn ? 'Sync failed. Please try again.' : 'La synchronisation a échoué. Veuillez réessayer.');
          setSyncError(errorMsg);
          
          // Revert status
          setProviderList(prev => prev.map(p => 
            p.id === id ? { ...p, status: 'connected' } : p
          ));
        }
      } catch (error) {
        console.error('Sync error:', error);
        setSyncError(isEn 
          ? 'An error occurred during sync. Please try again.' 
          : 'Une erreur s\'est produite lors de la synchronisation. Veuillez réessayer.');
        
        // Revert status
        setProviderList(prev => prev.map(p => 
          p.id === id ? { ...p, status: 'connected' } : p
        ));
      }
    } else {
      // No real data source - demo mode mock sync
      console.log('[Connections] Demo mode sync for provider:', id);
      setProviderList(prev => prev.map(p => 
        p.id === id ? { ...p, status: 'syncing' } : p
      ));
      
      setTimeout(() => {
        const now = new Date();
        setProviderList(prev => prev.map(p => 
          p.id === id ? { 
            ...p, 
            status: 'connected', 
            lastSync: formatRelativeTime(now, isEn),
            lastSyncAt: now.toISOString()
          } : p
        ));
      }, 3000);
    }
  };
  
  // Show subscription gate for free users (not internal staff)
  if (isFreePlan && !isInternalStaff) {
    return <FreeUserSubscriptionGate isEn={isEn} />;
  }

  return (
    <div className="space-y-6">
      {/* Header - Modern clean style */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-4 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
        <div>
          <h1 
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'Connections' : 'Connexions'}
          </h1>
          <p 
            className="text-sm mt-1"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn 
              ? 'Connect your accounting software to import your data'
              : 'Connectez vos logiciels comptables pour importer vos données'}
          </p>
        </div>
        {connectedCount > 0 && (
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-full self-start"
            style={{ 
              backgroundColor: 'rgb(var(--color-success) / 0.1)',
              border: '1px solid rgb(var(--color-success) / 0.2)',
            }}
          >
            <Zap className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-success))' }} />
            <span 
              className="text-sm font-semibold"
              style={{ color: 'rgb(var(--color-success))' }}
            >
              {connectedCount} {isEn 
                ? `active connection${connectedCount !== 1 ? 's' : ''}` 
                : `connexion${connectedCount !== 1 ? 's' : ''} active${connectedCount !== 1 ? 's' : ''}`}
            </span>
          </div>
        )}
      </div>

      {/* Sync Error Banner */}
      {syncError && (
        <div 
          className="p-3 rounded-lg flex items-center gap-3"
          style={{ 
            backgroundColor: 'rgb(var(--color-warning) / 0.1)',
            border: '1px solid rgb(var(--color-warning) / 0.3)'
          }}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(var(--color-warning))' }} />
          <p className="text-sm flex-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {syncError}
          </p>
          <button
            onClick={() => setSyncError(null)}
            className="text-xs font-medium px-2 py-1 rounded hover:opacity-80"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn ? 'Dismiss' : 'Fermer'}
          </button>
        </div>
      )}

      {/* Internal Staff Banner */}
      {isInternalStaff && (
        <div 
          className="p-3 rounded-lg flex flex-col sm:flex-row sm:items-center gap-3"
          style={{ 
            backgroundColor: 'rgb(var(--color-error) / 0.05)',
            border: '1px solid rgb(var(--color-error) / 0.2)'
          }}
        >
          <Wrench className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(var(--color-error))' }} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-error))' }}>
              {isEn ? 'Internal mode enabled' : 'Mode interne activé'}
            </p>
            <p className="text-xs" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn 
                ? 'You see this page as PlainLedger staff. Clients only see their active connections.'
                : 'Vous voyez cette page en tant que staff PlainLedger. Les clients ne voient que leurs connexions actives.'}
            </p>
          </div>
          <a 
            href="/app/settings" 
            className="text-xs font-medium px-3 py-1.5 rounded whitespace-nowrap"
            style={{ 
              backgroundColor: 'rgb(var(--color-error) / 0.1)',
              color: 'rgb(var(--color-error))'
            }}
          >
            {isEn ? 'Advanced config →' : 'Config avancée →'}
          </a>
        </div>
      )}

      {/* Read-only Permission Notice for non-admin users */}
      {showReadOnlyNotice && (
        <div 
          className="p-4 rounded-xl flex items-start gap-4"
          style={{ 
            backgroundColor: 'rgb(var(--color-warning) / 0.05)',
            border: '1px solid rgb(var(--color-warning) / 0.2)'
          }}
        >
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgb(var(--color-warning) / 0.1)' }}
          >
            <Eye className="w-5 h-5" style={{ color: 'rgb(var(--color-warning))' }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 
                className="font-semibold text-sm"
                style={{ color: 'rgb(var(--color-warning))' }}
              >
                {isEn ? 'View-only Access' : 'Accès en lecture seule'}
              </h3>
              <span 
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ 
                  backgroundColor: 'rgb(var(--color-bg-muted))',
                  color: 'rgb(var(--color-text-muted))'
                }}
              >
                {currentTenant?.role === 'member' 
                  ? (isEn ? 'Member' : 'Membre') 
                  : (isEn ? 'Viewer' : 'Lecteur')}
              </span>
            </div>
            <p 
              className="text-sm"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'You can view connected data sources but cannot connect or disconnect accounting systems. Contact an Administrator or Owner to manage connections.'
                : 'Vous pouvez voir les sources de données connectées mais ne pouvez pas connecter ou déconnecter les systèmes comptables. Contactez un Administrateur ou Propriétaire pour gérer les connexions.'}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Shield className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
              <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn 
                  ? 'Only Owners and Administrators can manage connections'
                  : 'Seuls les Propriétaires et Administrateurs peuvent gérer les connexions'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Onboarding Steps */}
      {connectedCount === 0 && !isInternalStaff && (
        <OnboardingSteps 
          isEn={isEn} 
          onSelectProvider={() => {
            const firstProvider = providerList[0];
            if (firstProvider) {
              setSelectedProvider(firstProvider);
              setShowModal(true);
            }
          }}
        />
      )}
      
      {/* Section title for integrations - Clean modern style */}
      <div className="flex items-center gap-3 mb-4">
        <h2 
          className="text-lg font-semibold"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          {isEn ? 'Available Integrations' : 'Intégrations disponibles'}
        </h2>
        <span 
          className="px-2 py-0.5 rounded text-xs font-medium tabular-nums"
          style={{ 
            backgroundColor: 'rgb(var(--color-bg-muted))',
            color: 'rgb(var(--color-text-muted))',
            border: '1px solid rgb(var(--color-border))',
          }}
        >
          {providerList.length} {isEn ? 'options' : 'options'}
        </span>
      </div>
      
      {/* Provider Grid - Airbyte-style card layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providerList.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onSync={handleSync}
            isInternalStaff={isInternalStaff}
            isEn={isEn}
            readOnly={!canManageConnections}
            isDisconnecting={isDisconnecting === provider.id}
          />
        ))}
      </div>
      
      {/* Quick Start Demo Card */}
      {connectedCount === 0 && (
        <div 
          className="mt-6 rounded-xl p-4 sm:p-5"
          style={{ 
            backgroundColor: 'rgb(var(--color-primary-600))',
          }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 flex items-center gap-3">
              <Zap className="w-4 h-4 text-yellow-300 flex-shrink-0" />
              <div>
                <span className="text-sm font-medium text-white">
                  {isEn ? 'Try PlainLedger instantly' : 'Essayez PlainLedger instantanément'}
                </span>
                <span className="text-white/60 mx-2">—</span>
                <span className="text-sm text-white/70">
                  {isEn 
                    ? 'Load demo data to explore all features'
                    : 'Chargez des données démo pour explorer toutes les fonctionnalités'}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                const demoProvider = providerList.find(p => p.id === 'quickbooks');
                if (demoProvider) {
                  setSelectedProvider(demoProvider);
                  setShowModal(true);
                }
              }}
              className="px-4 py-2 rounded-lg font-medium text-xs transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap hover:opacity-90"
              style={{ 
                backgroundColor: 'white',
                color: 'rgb(var(--color-primary-700))',
              }}
            >
              <Zap className="w-3.5 h-3.5" />
              {isEn ? 'Load Demo Data' : 'Charger données démo'}
            </button>
          </div>
        </div>
      )}
      
      {/* Coming Soon */}
      <div 
        className="rounded-2xl p-8 text-center relative overflow-hidden group cursor-pointer hover:border-blue-400 transition-colors duration-300"
        style={{ 
          backgroundColor: 'rgb(var(--color-bg-muted))',
          border: '2px dashed rgb(var(--color-border))'
        }}
      >
        <div 
          className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
          style={{ 
            background: 'linear-gradient(135deg, rgb(var(--color-primary-100)), rgb(var(--color-primary-50)))',
          }}
        >
          <Plus className="w-8 h-8" style={{ color: 'rgb(var(--color-primary-600))' }} />
        </div>
        <h3 
          className="text-lg font-bold mb-2"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          {isEn ? 'More connectors coming soon' : 'Plus de connecteurs à venir'}
        </h3>
        <p 
          className="text-sm mb-5 max-w-md mx-auto"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          {isEn 
            ? 'We\'re constantly adding support for more accounting platforms. Have a suggestion?'
            : 'Nous ajoutons constamment le support pour plus de plateformes comptables. Une suggestion?'}
        </p>
        <button 
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 inline-flex items-center gap-2"
          style={{ 
            backgroundColor: 'rgb(var(--color-primary-600))',
            color: 'white',
          }}
          onClick={() => alert(isEn ? 'Contact us at support@plainledger.ca with your connector suggestion!' : 'Contactez-nous à support@plainledger.ca avec votre suggestion!')}
        >
          <HelpCircle className="w-4 h-4" />
          {isEn ? 'Suggest a connector' : 'Suggérer un connecteur'}
        </button>
      </div>
      
      {/* Connection Modal */}
      {showModal && (
        <ConnectionModal
          provider={selectedProvider}
          onClose={() => {
            setShowModal(false);
            setSelectedProvider(null);
          }}
          onConfirm={handleConfirmConnection}
          isEn={isEn}
        />
      )}
    </div>
  );
}
