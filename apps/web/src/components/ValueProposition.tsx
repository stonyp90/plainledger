import { 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  FileText,
  Zap,
  Shield,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';

// Pain points section for landing page
export function PainPoints() {
  const { language } = useI18n();
  const isEn = language === 'en';

  const painPoints = [
    {
      icon: Clock,
      problem: isEn ? 'Hours spent on manual reconciliation' : 'Des heures passées en réconciliation manuelle',
      solution: isEn ? 'Done in minutes' : 'Fait en quelques minutes',
    },
    {
      icon: AlertTriangle,
      problem: isEn ? 'Errors discovered too late' : 'Erreurs découvertes trop tard',
      solution: isEn ? 'Caught before your clients' : 'Détectées avant vos clients',
    },
    {
      icon: FileText,
      problem: isEn ? 'No time for proper analysis' : 'Pas le temps pour une analyse approfondie',
      solution: isEn ? 'Clear reports, instantly' : 'Rapports clairs, instantanément',
    },
    {
      icon: DollarSign,
      problem: isEn ? 'No access to expert advice' : 'Pas accès à des conseils d\'experts',
      solution: isEn ? 'CPA support included' : 'Support CPA inclus',
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

// Benefits section
export function Benefits() {
  const { language } = useI18n();
  const isEn = language === 'en';

  const benefits = [
    {
      metric: '90%',
      label: isEn ? 'Less time on reports' : 'Moins de temps sur les rapports',
    },
    {
      metric: '48h',
      label: isEn ? 'CPA response time' : 'Temps de réponse CPA',
    },
    {
      metric: '100%',
      label: isEn ? 'Data security' : 'Sécurité des données',
    },
    {
      metric: '$500',
      label: isEn ? 'Starting price/month' : 'Prix de départ/mois',
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
            className="text-sm"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}

// How it works section
export function HowItWorks() {
  const { language } = useI18n();
  const isEn = language === 'en';

  const steps = [
    {
      step: '1',
      title: isEn ? 'Connect' : 'Connectez',
      description: isEn 
        ? 'Link your QuickBooks, Xero, or Sage account in 2 clicks' 
        : 'Liez votre compte QuickBooks, Xero ou Sage en 2 clics',
      icon: Zap,
    },
    {
      step: '2',
      title: isEn ? 'Analyze' : 'Analysez',
      description: isEn 
        ? 'AI automatically detects anomalies and inconsistencies' 
        : 'L\'IA détecte automatiquement les anomalies et incohérences',
      icon: AlertTriangle,
    },
    {
      step: '3',
      title: isEn ? 'Act' : 'Agissez',
      description: isEn 
        ? 'Get clear reports and fix issues before they become problems' 
        : 'Obtenez des rapports clairs et corrigez les problèmes à temps',
      icon: TrendingUp,
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

// Testimonial placeholder (for future use)
export function SocialProof() {
  const { language } = useI18n();
  const isEn = language === 'en';

  return (
    <div 
      className="p-6 sm:p-8 rounded-2xl text-center"
      style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
    >
      <p 
        className="text-lg sm:text-xl italic mb-4"
        style={{ color: 'rgb(var(--color-text-secondary))' }}
      >
        "{isEn 
          ? 'Finally, a tool that makes financial reporting simple. We catch errors before our clients do.'
          : 'Enfin un outil qui simplifie les rapports financiers. On détecte les erreurs avant nos clients.'}"
      </p>
      <p 
        className="text-sm font-medium"
        style={{ color: 'rgb(var(--color-text-muted))' }}
      >
        — {isEn ? 'Early Beta User' : 'Utilisateur Beta'}
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
