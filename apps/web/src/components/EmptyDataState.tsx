/**
 * Empty Data State Component
 * 
 * Displays contextual empty states when data is missing or unavailable.
 * Provides helpful CTAs to guide users on how to get data.
 */

import { Link } from 'react-router-dom';
import { 
  Database, 
  CloudOff, 
  RefreshCw, 
  Link2, 
  BarChart3,
  FileText,
  TrendingUp,
  PieChart,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';

export type EmptyStateContext = 
  | 'dashboard'
  | 'balance-sheet'
  | 'income-statement'
  | 'cash-flow'
  | 'trends'
  | 'accounts'
  | 'transactions'
  | 'reports';

export interface EmptyDataStateProps {
  context: EmptyStateContext;
  hasConnection?: boolean;
  onRetry?: () => void;
  onConnect?: () => void;
}

const contextConfig: Record<EmptyStateContext, {
  icon: typeof Database;
  titleEn: string;
  titleFr: string;
  descriptionEn: string;
  descriptionFr: string;
}> = {
  dashboard: {
    icon: BarChart3,
    titleEn: 'No Financial Data Available',
    titleFr: 'Aucune donnée financière disponible',
    descriptionEn: 'Connect your accounting software to see your financial dashboard with real data.',
    descriptionFr: 'Connectez votre logiciel comptable pour voir votre tableau de bord financier avec des données réelles.',
  },
  'balance-sheet': {
    icon: FileText,
    titleEn: 'Balance Sheet Data Not Available',
    titleFr: 'Données du bilan non disponibles',
    descriptionEn: 'We need account data to generate your balance sheet. Connect your accounting software.',
    descriptionFr: 'Nous avons besoin des données de compte pour générer votre bilan. Connectez votre logiciel comptable.',
  },
  'income-statement': {
    icon: TrendingUp,
    titleEn: 'Income Statement Data Not Available',
    titleFr: 'Données du compte de résultat non disponibles',
    descriptionEn: 'We need transaction data to generate your income statement. Connect your accounting software.',
    descriptionFr: 'Nous avons besoin des données de transaction pour générer votre compte de résultat. Connectez votre logiciel comptable.',
  },
  'cash-flow': {
    icon: TrendingUp,
    titleEn: 'Cash Flow Data Not Available',
    titleFr: 'Données de flux de trésorerie non disponibles',
    descriptionEn: 'We need transaction data to calculate your cash flow. Connect your accounting software.',
    descriptionFr: 'Nous avons besoin des données de transaction pour calculer votre flux de trésorerie. Connectez votre logiciel comptable.',
  },
  trends: {
    icon: PieChart,
    titleEn: 'Not Enough Data for Trends',
    titleFr: 'Pas assez de données pour les tendances',
    descriptionEn: 'We need historical transaction data to show trends. Sync more data from your accounting software.',
    descriptionFr: 'Nous avons besoin de données historiques pour afficher les tendances. Synchronisez plus de données depuis votre logiciel comptable.',
  },
  accounts: {
    icon: Database,
    titleEn: 'No Accounts Found',
    titleFr: 'Aucun compte trouvé',
    descriptionEn: 'Your chart of accounts will appear here once you connect your accounting software.',
    descriptionFr: 'Votre plan comptable apparaîtra ici une fois que vous aurez connecté votre logiciel comptable.',
  },
  transactions: {
    icon: Database,
    titleEn: 'No Transactions Found',
    titleFr: 'Aucune transaction trouvée',
    descriptionEn: 'Your transactions will appear here once they are synced from your accounting software.',
    descriptionFr: 'Vos transactions apparaîtront ici une fois synchronisées depuis votre logiciel comptable.',
  },
  reports: {
    icon: FileText,
    titleEn: 'No Reports Available',
    titleFr: 'Aucun rapport disponible',
    descriptionEn: 'Connect your accounting software to generate financial reports.',
    descriptionFr: 'Connectez votre logiciel comptable pour générer des rapports financiers.',
  },
};

export default function EmptyDataState({
  context,
  hasConnection = false,
  onRetry,
  onConnect,
}: EmptyDataStateProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const config = contextConfig[context];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-6 p-4 rounded-full bg-slate-100 dark:bg-slate-800">
        <Icon className="w-12 h-12 text-slate-400 dark:text-slate-500" />
      </div>
      
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        {isEn ? config.titleEn : config.titleFr}
      </h3>
      
      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-6">
        {isEn ? config.descriptionEn : config.descriptionFr}
      </p>

      <div className="flex gap-3">
        {!hasConnection && (
          <Link
            to="/settings?tab=connections"
            onClick={onConnect}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Link2 className="w-4 h-4" />
            {isEn ? 'Connect Accounting Software' : 'Connecter un logiciel comptable'}
          </Link>
        )}

        {hasConnection && onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {isEn ? 'Retry Sync' : 'Réessayer la synchronisation'}
          </button>
        )}
      </div>

      {hasConnection && (
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-500">
          {isEn 
            ? 'Data may take a few minutes to sync after initial connection.'
            : 'Les données peuvent prendre quelques minutes à se synchroniser après la connexion initiale.'
          }
        </p>
      )}
    </div>
  );
}

/**
 * Inline empty state for charts (smaller version)
 */
export function ChartEmptyState({ 
  message, 
  showConnectLink = true 
}: { 
  message?: string;
  showConnectLink?: boolean;
}) {
  const { language } = useI18n();
  const isEn = language === 'en';

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4">
      <CloudOff className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-3" />
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
        {message || (isEn ? 'No data available' : 'Aucune donnée disponible')}
      </p>
      {showConnectLink && (
        <Link
          to="/settings?tab=connections"
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          {isEn ? 'Connect data source' : 'Connecter une source de données'}
        </Link>
      )}
    </div>
  );
}
