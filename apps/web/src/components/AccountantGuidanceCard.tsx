/**
 * Accountant Guidance Card Component
 * 
 * Shows specific actions that accountants need to take to enable features.
 * Used inline within sections to provide contextual guidance.
 */

import { Link } from 'react-router-dom';
import {
  Users,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Mail,
  FileText,
  DollarSign,
  Calendar,
  Building2,
  RefreshCw,
  Target,
  TrendingUp,
  Link2,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';

export type GuidanceType = 
  | 'connect-software'
  | 'enter-bills'
  | 'reconcile-accounts'
  | 'set-budget'
  | 'enter-invoices'
  | 'categorize-expenses'
  | 'sync-data'
  | 'historical-data';

export interface AccountantGuidanceCardProps {
  type: GuidanceType;
  compact?: boolean;
  showIcon?: boolean;
  onActionClick?: () => void;
}

const GUIDANCE_CONFIG: Record<GuidanceType, {
  icon: typeof Users;
  title: { en: string; fr: string };
  description: { en: string; fr: string };
  action: { en: string; fr: string };
  helpLink?: string;
  actionLink?: string;
  estimatedTime?: string;
  priority: 'high' | 'medium' | 'low';
}> = {
  'connect-software': {
    icon: Link2,
    title: {
      en: 'Connect Your Accounting Software',
      fr: 'Connectez votre logiciel comptable',
    },
    description: {
      en: 'Connect QuickBooks, Xero, or another supported accounting software to start syncing your financial data automatically.',
      fr: 'Connectez QuickBooks, Xero ou un autre logiciel comptable supporté pour commencer à synchroniser automatiquement vos données financières.',
    },
    action: {
      en: 'Go to Connections',
      fr: 'Aller aux connexions',
    },
    actionLink: '/app/connections',
    estimatedTime: '5 minutes',
    priority: 'high',
  },
  'enter-bills': {
    icon: Building2,
    title: {
      en: 'Enter Vendor Bills',
      fr: 'Saisir les factures fournisseurs',
    },
    description: {
      en: 'Enter bills in QuickBooks to track accounts payable and see aging reports. This helps manage cash flow and payment timing.',
      fr: 'Saisissez les factures dans QuickBooks pour suivre les comptes fournisseurs et voir les rapports d\'échéancier. Cela aide à gérer la trésorerie et le calendrier des paiements.',
    },
    action: {
      en: 'Learn How to Enter Bills',
      fr: 'Apprendre à saisir les factures',
    },
    helpLink: 'https://quickbooks.intuit.com/learn-support/en-us/bills-and-expenses/entering-bills/00/202949',
    estimatedTime: '10 minutes',
    priority: 'medium',
  },
  'reconcile-accounts': {
    icon: RefreshCw,
    title: {
      en: 'Reconcile Bank Accounts',
      fr: 'Rapprocher les comptes bancaires',
    },
    description: {
      en: 'Regular bank reconciliation ensures accurate cash position and helps detect discrepancies early.',
      fr: 'Le rapprochement bancaire régulier garantit une position de trésorerie précise et aide à détecter les écarts rapidement.',
    },
    action: {
      en: 'Reconcile Now',
      fr: 'Rapprocher maintenant',
    },
    helpLink: 'https://quickbooks.intuit.com/learn-support/en-us/banking/reconcile-an-account/00/186490',
    estimatedTime: '15 minutes',
    priority: 'high',
  },
  'set-budget': {
    icon: Target,
    title: {
      en: 'Set Up Budget',
      fr: 'Configurer le budget',
    },
    description: {
      en: 'Create a budget in your accounting software to enable variance analysis and budget vs actual reporting.',
      fr: 'Créez un budget dans votre logiciel comptable pour activer l\'analyse des écarts et les rapports budget vs réel.',
    },
    action: {
      en: 'Learn About Budgets',
      fr: 'En savoir plus sur les budgets',
    },
    helpLink: 'https://quickbooks.intuit.com/learn-support/en-us/reports-and-accounting/create-a-budget/00/186491',
    estimatedTime: '30 minutes',
    priority: 'medium',
  },
  'enter-invoices': {
    icon: FileText,
    title: {
      en: 'Enter Customer Invoices',
      fr: 'Saisir les factures clients',
    },
    description: {
      en: 'Enter customer invoices to track accounts receivable and monitor collection timing.',
      fr: 'Saisissez les factures clients pour suivre les comptes clients et surveiller le calendrier de recouvrement.',
    },
    action: {
      en: 'Enter Invoices',
      fr: 'Saisir les factures',
    },
    helpLink: 'https://quickbooks.intuit.com/learn-support/en-us/invoicing/create-an-invoice/00/186492',
    estimatedTime: 'Ongoing',
    priority: 'medium',
  },
  'categorize-expenses': {
    icon: TrendingUp,
    title: {
      en: 'Categorize Expenses',
      fr: 'Catégoriser les dépenses',
    },
    description: {
      en: 'Ensure expenses are properly categorized for accurate reporting and forecasting.',
      fr: 'Assurez-vous que les dépenses sont correctement catégorisées pour des rapports et prévisions précis.',
    },
    action: {
      en: 'Review Categories',
      fr: 'Examiner les catégories',
    },
    estimatedTime: 'Ongoing',
    priority: 'low',
  },
  'sync-data': {
    icon: RefreshCw,
    title: {
      en: 'Sync Your Data',
      fr: 'Synchroniser vos données',
    },
    description: {
      en: 'Data syncs automatically, but you can manually refresh to get the latest information.',
      fr: 'Les données se synchronisent automatiquement, mais vous pouvez actualiser manuellement pour obtenir les dernières informations.',
    },
    action: {
      en: 'Refresh Now',
      fr: 'Actualiser maintenant',
    },
    priority: 'low',
  },
  'historical-data': {
    icon: Calendar,
    title: {
      en: 'Build Historical Data',
      fr: 'Construire des données historiques',
    },
    description: {
      en: 'Continue entering transactions regularly. More historical data improves analysis accuracy and enables better benchmarking.',
      fr: 'Continuez à saisir les transactions régulièrement. Plus de données historiques améliorent la précision de l\'analyse et permettent un meilleur benchmarking.',
    },
    action: {
      en: 'Keep Entering Data',
      fr: 'Continuer à saisir les données',
    },
    estimatedTime: 'Ongoing',
    priority: 'low',
  },
};

export default function AccountantGuidanceCard({
  type,
  compact = false,
  showIcon = true,
  onActionClick,
}: AccountantGuidanceCardProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const config = GUIDANCE_CONFIG[type];
  
  // Safety check - if type not found, don't render
  if (!config) {
    console.warn(`AccountantGuidanceCard: Unknown type "${type}"`);
    return null;
  }
  
  const Icon = config.icon;

  const handleActionClick = () => {
    if (onActionClick) {
      onActionClick();
    }
  };

  if (compact) {
    return (
      <div 
        className="flex items-start gap-2 sm:gap-3 p-3 rounded-lg border"
        style={{ 
          backgroundColor: config.priority === 'high' 
            ? 'rgb(var(--color-error) / 0.05)' 
            : 'rgb(var(--color-surface))',
          borderColor: config.priority === 'high'
            ? 'rgb(var(--color-error) / 0.3)'
            : 'rgb(var(--color-border))',
        }}
      >
        {showIcon && (
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ 
              backgroundColor: config.priority === 'high'
                ? 'rgb(var(--color-error) / 0.1)'
                : 'rgb(var(--color-primary-500) / 0.1)',
            }}
          >
            <Icon className="w-4 h-4" style={{ 
              color: config.priority === 'high'
                ? 'rgb(var(--color-error))'
                : 'rgb(var(--color-primary-500))',
            }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? config.title.en : config.title.fr}
          </h4>
          <p className="text-xs mb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? config.description.en : config.description.fr}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {config.actionLink ? (
              <Link
                to={config.actionLink}
                onClick={handleActionClick}
                className="inline-flex items-center gap-1 text-xs font-medium transition-all hover:opacity-90"
                style={{ color: 'rgb(var(--color-primary-600))' }}
              >
                {isEn ? config.action.en : config.action.fr}
                <ArrowRight className="w-3 h-3" />
              </Link>
            ) : config.helpLink ? (
              <a
                href={config.helpLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleActionClick}
                className="inline-flex items-center gap-1 text-xs font-medium transition-all hover:opacity-90"
                style={{ color: 'rgb(var(--color-primary-600))' }}
              >
                {isEn ? config.action.en : config.action.fr}
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <button
                onClick={handleActionClick}
                className="inline-flex items-center gap-1 text-xs font-medium transition-all hover:opacity-90"
                style={{ color: 'rgb(var(--color-primary-600))' }}
              >
                {isEn ? config.action.en : config.action.fr}
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            {config.estimatedTime && (
              <span className="text-xs flex items-center gap-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                <Clock className="w-3 h-3" />
                {config.estimatedTime}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="rounded-xl p-4 sm:p-5 lg:p-6 border"
      style={{ 
        backgroundColor: config.priority === 'high' 
          ? 'rgb(var(--color-error) / 0.05)' 
          : 'rgb(var(--color-primary-500) / 0.05)',
        borderColor: config.priority === 'high'
          ? 'rgb(var(--color-error) / 0.3)'
          : 'rgb(var(--color-primary-500) / 0.2)',
      }}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {showIcon && (
          <div 
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ 
              backgroundColor: config.priority === 'high'
                ? 'rgb(var(--color-error) / 0.1)'
                : 'rgb(var(--color-primary-500) / 0.1)',
            }}
          >
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ 
              color: config.priority === 'high'
                ? 'rgb(var(--color-error))'
                : 'rgb(var(--color-primary-500))',
            }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2">
            <h3 className="text-base sm:text-lg font-semibold flex-1" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? config.title.en : config.title.fr}
            </h3>
            {config.priority === 'high' && (
              <span 
                className="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
                style={{ 
                  backgroundColor: 'rgb(var(--color-error) / 0.1)',
                  color: 'rgb(var(--color-error))',
                }}
              >
                {isEn ? 'High Priority' : 'Priorité élevée'}
              </span>
            )}
          </div>
          <p className="text-sm sm:text-base mb-4" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn ? config.description.en : config.description.fr}
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            {config.actionLink ? (
              <Link
                to={config.actionLink}
                onClick={handleActionClick}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ 
                  backgroundColor: 'rgb(var(--color-primary-500))',
                  color: 'white',
                }}
              >
                {isEn ? config.action.en : config.action.fr}
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : config.helpLink ? (
              <a
                href={config.helpLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleActionClick}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 active:scale-[0.98] border"
                style={{ 
                  borderColor: 'rgb(var(--color-primary-500))',
                  color: 'rgb(var(--color-primary-600))',
                }}
              >
                {isEn ? config.action.en : config.action.fr}
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <button
                onClick={handleActionClick}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ 
                  backgroundColor: 'rgb(var(--color-primary-500))',
                  color: 'white',
                }}
              >
                {isEn ? config.action.en : config.action.fr}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {config.estimatedTime && (
              <div className="flex items-center gap-1.5 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                <Clock className="w-4 h-4" />
                <span>{isEn ? 'Estimated time:' : 'Temps estimé :'} {config.estimatedTime}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
