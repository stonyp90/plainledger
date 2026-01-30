/**
 * Data Readiness Checklist Component
 * 
 * Shows what data is available, what's missing, and provides guidance
 * on what the accountant needs to do to enable features.
 */

import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  X,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Link2,
  FileText,
  DollarSign,
  Calendar,
  Building2,
  Users,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useFinancialData } from '../hooks/useFinancialData';
import { useHasRealData } from '../hooks/useHasRealData';
import { Link } from 'react-router-dom';

export type DataCheckContext = 
  | 'dashboard' 
  | 'reports' 
  | 'planning' 
  | 'board' 
  | 'analytics'
  | 'market-analysis'
  | 'anomalies';

export interface DataCheckItem {
  id: string;
  label: { en: string; fr: string };
  description: { en: string; fr: string };
  status: 'complete' | 'partial' | 'missing';
  required: boolean;
  quickbooksAction: { en: string; fr: string }; // What to do in QuickBooks
  helpLink?: string;
  icon?: typeof CheckCircle2;
}

interface DataReadinessChecklistProps {
  context: DataCheckContext;
  items?: DataCheckItem[];
  onDismiss?: () => void;
  compact?: boolean;
}

// Context-specific default items
const getDefaultItems = (
  context: DataCheckContext,
  financialData: any,
  isEn: boolean,
  hasRealData: boolean,
  hasQuickBooksConnection: boolean
): DataCheckItem[] => {
  // Only count data as "complete" if it's REAL data from a connected accounting system
  // Sample/sandbox data should NOT count as complete for the checklist
  const hasAccounts = hasRealData && (financialData?.accounts?.length > 0);
  const hasTransactions = hasRealData && (financialData?.trends?.revenue?.data?.length > 0);
  const hasCashData = hasRealData && (financialData?.summary?.cash?.current > 0);
  const hasARData = hasRealData && (financialData?.summary?.receivables?.hasData);
  const hasAPData = hasRealData && (financialData?.summary?.payables?.hasData);
  const hasBudget = hasRealData && (financialData?.summary?.hasBudget);

  const baseItems: DataCheckItem[] = [
    {
      id: 'accounting-connection',
      label: { 
        en: 'Accounting Software Connected', 
        fr: 'Logiciel comptable connecté' 
      },
      description: {
        en: 'Your accounting software is connected and syncing data',
        fr: 'Votre logiciel comptable est connecté et synchronise les données'
      },
      // Use hasQuickBooksConnection directly - this checks the actual connection status
      status: hasQuickBooksConnection ? 'complete' : 'missing',
      required: true,
      quickbooksAction: {
        en: 'Go to Connections → Connect QuickBooks → Authorize access',
        fr: 'Allez dans Connexions → Connecter QuickBooks → Autoriser l\'accès'
      },
      helpLink: '/app/connections',
      icon: Link2,
    },
    {
      id: 'chart-of-accounts',
      label: { 
        en: 'Chart of Accounts', 
        fr: 'Plan comptable' 
      },
      description: {
        en: 'Account structure is set up and accounts are active',
        fr: 'La structure des comptes est configurée et les comptes sont actifs'
      },
      status: hasAccounts ? 'complete' : 'missing',
      required: true,
      quickbooksAction: {
        en: 'In QuickBooks: Settings → Chart of Accounts → Ensure accounts are active and properly categorized',
        fr: 'Dans QuickBooks : Paramètres → Plan comptable → Assurez-vous que les comptes sont actifs et correctement catégorisés'
      },
      icon: FileText,
    },
    {
      id: 'transaction-history',
      label: { 
        en: 'Transaction History', 
        fr: 'Historique des transactions' 
      },
      description: {
        en: 'At least 3 months of transaction data available',
        fr: 'Au moins 3 mois de données de transaction disponibles'
      },
      status: hasTransactions && financialData?.trends?.revenue?.data?.length >= 3 
        ? 'complete' 
        : hasTransactions 
          ? 'partial' 
          : 'missing',
      required: true,
      quickbooksAction: {
        en: 'In QuickBooks: Enter all transactions regularly → Bank feeds → Reconcile accounts monthly',
        fr: 'Dans QuickBooks : Saisissez toutes les transactions régulièrement → Flux bancaires → Rapprochez les comptes mensuellement'
      },
      icon: Calendar,
    },
  ];

  // Context-specific items
  switch (context) {
    case 'planning':
      return [
        ...baseItems,
        {
          id: 'cash-balance',
          label: { en: 'Cash Balance', fr: 'Solde de trésorerie' },
          description: {
            en: 'Current cash position is tracked',
            fr: 'La position de trésorerie actuelle est suivie'
          },
          status: hasCashData ? 'complete' : 'missing',
          required: true,
          quickbooksAction: {
            en: 'In QuickBooks: Banking → Reconcile → Reconcile bank accounts to update cash balance',
            fr: 'Dans QuickBooks : Banque → Rapprocher → Rapprochez les comptes bancaires pour mettre à jour le solde de trésorerie'
          },
          icon: DollarSign,
        },
        {
          id: 'expense-categories',
          label: { en: 'Expense Categories', fr: 'Catégories de dépenses' },
          description: {
            en: 'Expenses are properly categorized for forecasting',
            fr: 'Les dépenses sont correctement catégorisées pour la prévision'
          },
          status: hasTransactions ? 'complete' : 'missing',
          required: false,
          quickbooksAction: {
            en: 'In QuickBooks: When entering expenses, assign them to the correct account categories',
            fr: 'Dans QuickBooks : Lors de la saisie des dépenses, attribuez-les aux bonnes catégories de comptes'
          },
          icon: TrendingUp,
        },
      ];

    case 'board':
      return [
        ...baseItems,
        {
          id: 'financial-summary',
          label: { en: 'Financial Summary', fr: 'Résumé financier' },
          description: {
            en: 'Key financial metrics are available',
            fr: 'Les métriques financières clés sont disponibles'
          },
          status: hasCashData && hasTransactions ? 'complete' : 'partial',
          required: true,
          quickbooksAction: {
            en: 'In QuickBooks: Banking → Reconcile → Complete reconciliation for all bank accounts',
            fr: 'Dans QuickBooks : Banque → Rapprocher → Complétez le rapprochement pour tous les comptes bancaires'
          },
          icon: FileText,
        },
        {
          id: 'budget-data',
          label: { en: 'Budget Data', fr: 'Données budgétaires' },
          description: {
            en: 'Budget is set up for variance analysis',
            fr: 'Le budget est configuré pour l\'analyse des écarts'
          },
          status: hasBudget ? 'complete' : 'missing',
          required: false,
          quickbooksAction: {
            en: 'In QuickBooks: Company → Planning & Budgeting → Set up budget for current fiscal year',
            fr: 'Dans QuickBooks : Entreprise → Planification et budgétisation → Configurez le budget pour l\'exercice en cours'
          },
          icon: Target,
        },
      ];

    case 'reports':
      return [
        ...baseItems,
        {
          id: 'accounts-receivable',
          label: { en: 'Accounts Receivable', fr: 'Comptes clients' },
          description: {
            en: 'AR aging data is available',
            fr: 'Les données d\'échéancier AR sont disponibles'
          },
          status: hasARData ? 'complete' : 'missing',
          required: false,
          quickbooksAction: {
            en: 'In QuickBooks: Sales → Invoices → Create invoices for all customer sales',
            fr: 'Dans QuickBooks : Ventes → Factures → Créez des factures pour toutes les ventes clients'
          },
          icon: Users,
        },
        {
          id: 'accounts-payable',
          label: { en: 'Accounts Payable', fr: 'Comptes fournisseurs' },
          description: {
            en: 'AP aging data is available',
            fr: 'Les données d\'échéancier AP sont disponibles'
          },
          status: hasAPData ? 'complete' : 'missing',
          required: false,
          quickbooksAction: {
            en: 'In QuickBooks: Expenses → Bills → Enter vendor bills when received',
            fr: 'Dans QuickBooks : Dépenses → Factures → Saisissez les factures fournisseurs lorsqu\'elles sont reçues'
          },
          helpLink: 'https://quickbooks.intuit.com/learn-support/en-us/bills-and-expenses/entering-bills/00/202949',
          icon: Building2,
        },
      ];

    case 'market-analysis':
    case 'analytics':
      return [
        ...baseItems,
        {
          id: 'historical-data',
          label: { en: 'Historical Data', fr: 'Données historiques' },
          description: {
            en: 'At least 12 months of historical data for benchmarking',
            fr: 'Au moins 12 mois de données historiques pour le benchmarking'
          },
          status: hasTransactions && financialData?.trends?.revenue?.data?.length >= 12
            ? 'complete'
            : hasTransactions
              ? 'partial'
              : 'missing',
          required: false,
          quickbooksAction: {
            en: 'In QuickBooks: Continue entering transactions regularly. Historical data syncs automatically once connected.',
            fr: 'Dans QuickBooks : Continuez à saisir les transactions régulièrement. Les données historiques se synchronisent automatiquement une fois connecté.'
          },
          icon: Calendar,
        },
      ];

    case 'anomalies':
      return [
        ...baseItems,
        {
          id: 'data-quality',
          label: { en: 'Data Quality', fr: 'Qualité des données' },
          description: {
            en: 'Data is reconciled and consistent for anomaly detection',
            fr: 'Les données sont rapprochées et cohérentes pour la détection d\'anomalies'
          },
          status: hasAccounts && hasTransactions ? 'complete' : 'partial',
          required: true,
          quickbooksAction: {
            en: 'In QuickBooks: Banking → Reconcile → Reconcile all accounts monthly to ensure data accuracy',
            fr: 'Dans QuickBooks : Banque → Rapprocher → Rapprochez tous les comptes mensuellement pour assurer la précision des données'
          },
          icon: RefreshCw,
        },
      ];

    default:
      return baseItems;
  }
};

export default function DataReadinessChecklist({
  context,
  items,
  onDismiss,
  compact = false,
}: DataReadinessChecklistProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const { data: financialData } = useFinancialData();
  const { hasRealData, hasQuickBooksConnection } = useHasRealData();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isCollapsed, setIsCollapsed] = useState(false);

  const checklistItems = items || getDefaultItems(
    context, 
    financialData, 
    isEn, 
    hasRealData, 
    hasQuickBooksConnection
  );

  const completedCount = checklistItems.filter(item => item.status === 'complete').length;
  const totalCount = checklistItems.length;
  const requiredCount = checklistItems.filter(item => item.required).length;
  const requiredCompletedCount = checklistItems.filter(
    item => item.required && item.status === 'complete'
  ).length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const requiredProgress = requiredCount > 0 
    ? (requiredCompletedCount / requiredCount) * 100 
    : 100;

  const toggleItem = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getStatusIcon = (status: DataCheckItem['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'rgb(var(--color-success))' }} />;
      case 'partial':
        return <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'rgb(var(--color-warning))' }} />;
      case 'missing':
        return <XCircle className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'rgb(var(--color-error))' }} />;
    }
  };

  const getStatusColor = (status: DataCheckItem['status']) => {
    switch (status) {
      case 'complete':
        return 'rgb(var(--color-success))';
      case 'partial':
        return 'rgb(var(--color-warning))';
      case 'missing':
        return 'rgb(var(--color-error))';
    }
  };

  if (compact) {
    return (
      <div 
        className="rounded-xl p-3 sm:p-4 border"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          borderColor: 'rgb(var(--color-border))',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
            <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Data Readiness' : 'Préparation des données'}
            </span>
          </div>
          <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {completedCount}/{totalCount}
          </span>
        </div>
        <div 
          className="h-2 rounded-full overflow-hidden mb-2"
          style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
        >
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${progress}%`,
              backgroundColor: getStatusColor(
                requiredProgress === 100 ? 'complete' : requiredProgress > 50 ? 'partial' : 'missing'
              ),
            }}
          />
        </div>
        {requiredProgress < 100 && (
          <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn 
              ? `${requiredCount - requiredCompletedCount} required items missing`
              : `${requiredCount - requiredCompletedCount} éléments requis manquants`}
          </p>
        )}
      </div>
    );
  }

  return (
    <div 
      className="rounded-xl sm:rounded-2xl overflow-hidden border"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        borderColor: 'rgb(var(--color-border))',
      }}
    >
      {/* Header */}
      <div className="p-4 sm:p-5 lg:p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div 
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
              >
                <FileText className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Data Readiness Checklist' : 'Liste de vérification des données'}
                </h3>
                <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn 
                    ? 'Complete your QuickBooks setup to unlock all insights'
                    : 'Complétez la configuration de QuickBooks pour débloquer tous les insights'}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Overall Progress' : 'Progression globale'}
                </span>
                <span className="text-xs sm:text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  {completedCount}/{totalCount} {isEn ? 'complete' : 'complétés'}
                </span>
              </div>
              <div 
                className="h-2.5 sm:h-3 rounded-full overflow-hidden"
                style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
              >
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${progress}%`,
                    backgroundColor: getStatusColor(
                      requiredProgress === 100 ? 'complete' : requiredProgress > 50 ? 'partial' : 'missing'
                    ),
                  }}
                />
              </div>
              {requiredProgress < 100 && (
                <p className="text-xs mt-1.5" style={{ color: 'rgb(var(--color-warning))' }}>
                  {isEn 
                    ? `⚠️ ${requiredCount - requiredCompletedCount} required item${requiredCount - requiredCompletedCount > 1 ? 's' : ''} missing`
                    : `⚠️ ${requiredCount - requiredCompletedCount} élément${requiredCount - requiredCompletedCount > 1 ? 's' : ''} requis manquant${requiredCount - requiredCompletedCount > 1 ? 's' : ''}`}
                </p>
              )}
            </div>
          </div>

          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-lg hover:bg-[rgb(var(--color-bg-muted))] transition-colors flex-shrink-0"
              style={{ color: 'rgb(var(--color-text-muted))' }}
              aria-label={isEn ? 'Dismiss' : 'Fermer'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Collapse/Expand Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2 text-xs sm:text-sm font-medium mb-3"
          style={{ color: 'rgb(var(--color-primary-600))' }}
        >
          {isCollapsed ? (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              {isEn ? 'Show Details' : 'Afficher les détails'}
            </>
          ) : (
            <>
              <ChevronRight className="w-3.5 h-3.5" />
              {isEn ? 'Hide Details' : 'Masquer les détails'}
            </>
          )}
        </button>
      </div>

      {/* Checklist Items */}
      {!isCollapsed && (
        <div className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6 space-y-2 sm:space-y-3">
          {checklistItems.map((item) => {
            const isExpanded = expandedItems.has(item.id);
            const Icon = item.icon || FileText;

            return (
              <div
                key={item.id}
                className="rounded-lg border overflow-hidden transition-all"
                style={{ 
                  borderColor: item.status === 'complete' 
                    ? 'rgb(var(--color-success) / 0.3)' 
                    : 'rgb(var(--color-border))',
                  backgroundColor: item.status === 'complete'
                    ? 'rgb(var(--color-success) / 0.05)'
                    : 'rgb(var(--color-surface))',
                }}
              >
                <button
                  onClick={() => toggleItem(item.id)}
                  className="w-full flex items-start gap-3 p-3 sm:p-4 text-left hover:opacity-90 transition-opacity"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getStatusIcon(item.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                      <h4 className="text-sm sm:text-base font-medium flex-1" style={{ color: 'rgb(var(--color-text))' }}>
                        {isEn ? item.label.en : item.label.fr}
                      </h4>
                      {item.required && (
                        <span 
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap"
                          style={{ 
                            backgroundColor: 'rgb(var(--color-error) / 0.1)',
                            color: 'rgb(var(--color-error))',
                          }}
                        >
                          {isEn ? 'Required' : 'Requis'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm mb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? item.description.en : item.description.fr}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                    ) : (
                      <ChevronRight className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && item.status !== 'complete' && (
                  <div 
                    className="px-4 sm:px-5 pb-3 sm:pb-4 border-t"
                    style={{ 
                      borderColor: 'rgb(var(--color-border))',
                      backgroundColor: 'rgb(var(--color-bg-muted))',
                    }}
                  >
                    <div className="pt-3 sm:pt-4">
                      <div className="flex items-start gap-2 mb-3">
                        <Link2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-primary-500))' }} />
                        <div className="flex-1">
                          <p className="text-xs font-semibold mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                            {isEn ? 'In QuickBooks:' : 'Dans QuickBooks :'}
                          </p>
                          <p className="text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                            {isEn ? item.quickbooksAction.en : item.quickbooksAction.fr}
                          </p>
                        </div>
                      </div>

                      {item.helpLink && (
                        <Link
                          to={item.helpLink.startsWith('/') ? item.helpLink : '#'}
                          {...(item.helpLink.startsWith('http') ? { href: item.helpLink, target: '_blank', rel: 'noopener noreferrer' } : {})}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90"
                          style={{ 
                            backgroundColor: item.helpLink === '/app/connections' 
                              ? 'rgb(var(--color-primary-500))'
                              : 'rgb(var(--color-primary-500) / 0.1)',
                            color: item.helpLink === '/app/connections' ? 'white' : 'rgb(var(--color-primary-600))',
                          }}
                        >
                          {item.helpLink === '/app/connections' ? (
                            <>
                              <Link2 className="w-3 h-3" />
                              {isEn ? 'Connect Now' : 'Connecter maintenant'}
                            </>
                          ) : (
                            <>
                              <ExternalLink className="w-3 h-3" />
                              {isEn ? 'Learn More' : 'En savoir plus'}
                            </>
                          )}
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
