import { 
  Target,
  TrendingDown,
  Clock, 
  Lightbulb,
  Zap,
  Brain,
  RefreshCw,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';

// Pain points section for landing page - ENTREPRENEUR FOCUSED
export function PainPoints() {
  const { language } = useI18n();
  const isEn = language === 'en';

  const painPoints = [
    {
      icon: Target,
      problem: isEn ? 'Decisions based on gut, not data' : 'Décisions basées sur l\'intuition, pas les données',
      solution: isEn ? 'AI-backed recommendations' : 'Recommandations soutenues par l\'IA',
    },
    {
      icon: TrendingDown,
      problem: isEn ? 'No idea how you compare to competitors' : 'Aucune idée de votre position vs concurrents',
      solution: isEn ? 'Benchmarks from 75K+ businesses' : 'Benchmarks de 75K+ entreprises',
    },
    {
      icon: Clock,
      problem: isEn ? 'Opportunities discovered too late' : 'Opportunités découvertes trop tard',
      solution: isEn ? 'Proactive profit alerts' : 'Alertes de profit proactives',
    },
    {
      icon: Lightbulb,
      problem: isEn ? 'Generic advice that doesn\'t fit your industry' : 'Conseils génériques inadaptés à votre secteur',
      solution: isEn ? 'Industry-specific intelligence' : 'Intelligence spécifique à votre industrie',
    },
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {painPoints.map((item, index) => (
        <div 
          key={index}
          className="p-5 sm:p-6 rounded-2xl"
          style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
        >
          <item.icon 
            className="w-8 h-8 mb-4" 
            style={{ color: 'rgb(var(--color-error))' }} 
          />
          <p 
            className="text-sm line-through mb-2"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {item.problem}
          </p>
          <p 
            className="font-semibold flex items-center gap-2"
            style={{ color: 'rgb(var(--color-success))' }}
          >
            <CheckCircle2 className="w-4 h-4" />
            {item.solution}
          </p>
        </div>
      ))}
    </div>
  );
}

// Benefits section - COMPOUNDING INTELLIGENCE FOCUSED
export function Benefits() {
  const { language } = useI18n();
  const isEn = language === 'en';

  const benefits = [
    {
      metric: '92%',
      label: isEn ? 'Recommendation accuracy' : 'Précision des recommandations',
      subtext: isEn ? 'Improves daily' : 'S\'améliore chaque jour',
    },
    {
      metric: '75K+',
      label: isEn ? 'Businesses analyzed' : 'Entreprises analysées',
      subtext: isEn ? 'Growing network' : 'Réseau en croissance',
    },
    {
      metric: '15+',
      label: isEn ? 'Industry patterns' : 'Modèles sectoriels',
      subtext: isEn ? 'Deep expertise' : 'Expertise profonde',
    },
    {
      metric: '$28K',
      label: isEn ? 'Avg. annual savings' : 'Économies annuelles moy.',
      subtext: isEn ? 'Per business' : 'Par entreprise',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {benefits.map((item, index) => (
        <div 
          key={index}
          className="text-center p-4 sm:p-6"
        >
          <p 
            className="text-3xl sm:text-4xl font-bold mb-1"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {item.metric}
          </p>
          <p 
            className="text-sm font-medium"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            {item.label}
          </p>
          <p 
            className="text-xs mt-1"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {item.subtext}
          </p>
        </div>
      ))}
    </div>
  );
}

// How it works section - FLYWHEEL FOCUSED
export function HowItWorks() {
  const { language } = useI18n();
  const isEn = language === 'en';

  const steps = [
    {
      step: '1',
      title: isEn ? 'Connect' : 'Connectez',
      description: isEn 
        ? 'Link your accounting software. We start learning immediately.' 
        : 'Liez votre logiciel comptable. L\'apprentissage commence immédiatement.',
      icon: Zap,
    },
    {
      step: '2',
      title: isEn ? 'Insights' : 'Insights',
      description: isEn 
        ? 'Get recommendations backed by patterns from thousands of similar businesses.' 
        : 'Obtenez des recommandations basées sur des milliers d\'entreprises similaires.',
      icon: Brain,
    },
    {
      step: '3',
      title: isEn ? 'Decide & Learn' : 'Décidez & Apprenez',
      description: isEn 
        ? 'Every decision you make improves recommendations for everyone in your industry.' 
        : 'Chaque décision améliore les recommandations pour tous dans votre industrie.',
      icon: RefreshCw,
    },
  ];

  return (
    <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
      {steps.map((item, index) => (
        <div key={index} className="relative">
          {/* Connector line */}
          {index < steps.length - 1 && (
            <div 
              className="hidden sm:block absolute top-8 left-1/2 w-full h-0.5"
              style={{ backgroundColor: 'rgb(var(--color-border))' }}
            />
          )}
          
          <div className="relative flex flex-col items-center text-center">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4 relative z-10"
              style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
            >
              <item.icon className="w-7 h-7 text-white" />
            </div>
            <span 
              className="text-xs font-bold uppercase tracking-wider mb-2"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn ? 'Step' : 'Étape'} {item.step}
            </span>
            <h3 
              className="text-lg font-semibold mb-2"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {item.title}
            </h3>
            <p 
              className="text-sm"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {item.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Testimonial - ENTREPRENEUR FOCUSED
export function SocialProof() {
  const { language } = useI18n();
  const isEn = language === 'en';

  return (
    <div 
      className="p-6 sm:p-8 rounded-2xl text-center"
      style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
    >
      <div className="flex items-center justify-center gap-2 mb-4">
        <Sparkles className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-600))' }} />
        <span 
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'rgb(var(--color-primary-600))' }}
        >
          {isEn ? 'Compounding Intelligence' : 'Intelligence composée'}
        </span>
      </div>
      <p 
        className="text-lg sm:text-xl italic mb-4"
        style={{ color: 'rgb(var(--color-text-secondary))' }}
      >
        "{isEn 
          ? 'The recommendations get better every month. It\'s like having an advisor who knows every business in my industry.'
          : 'Les recommandations s\'améliorent chaque mois. C\'est comme avoir un conseiller qui connaît toutes les entreprises de mon secteur.'}"
      </p>
      <p 
        className="text-sm font-medium"
        style={{ color: 'rgb(var(--color-text-muted))' }}
      >
        — {isEn ? 'Restaurant Owner, Montreal' : 'Propriétaire de restaurant, Montréal'}
      </p>
    </div>
  );
}

// Quick stat card for dashboard
interface QuickStatProps {
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  suffix?: string;
  loading?: boolean;
}

export function QuickStat({ label, value, change, trend, suffix, loading }: QuickStatProps) {
  if (loading) {
    return (
      <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
        <div className="skeleton h-4 w-20 mb-2" />
        <div className="skeleton h-8 w-16" />
      </div>
    );
  }

  return (
    <div 
      className="p-4 rounded-xl"
      style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
    >
      <p 
        className="text-xs font-medium uppercase tracking-wide mb-1"
        style={{ color: 'rgb(var(--color-text-muted))' }}
      >
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span 
          className="text-2xl font-bold tabular-nums"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          {value}{suffix}
        </span>
        {change !== undefined && (
          <span 
            className={`text-xs font-medium ${
              trend === 'up' ? 'text-success' : 
              trend === 'down' ? 'text-error' : 
              'text-muted'
            }`}
          >
            {change >= 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
    </div>
  );
}
