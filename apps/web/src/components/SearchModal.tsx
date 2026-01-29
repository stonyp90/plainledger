import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  FileText,
  LayoutDashboard,
  Link2,
  Settings,
  AlertTriangle,
  Clock,
  ArrowRight,
  Command,
  BarChart2,
  BarChart3,
  Users,
  CreditCard,
  Bell,
  Shield,
  Zap,
  TrendingUp,
  Wallet,
  PieChart,
  Target,
  Presentation,
  Building2,
  User,
  Lock,
  Database,
  Eye,
  Download,
  Plus,
  Calculator,
  BookOpen,
  Sparkles,
  Activity,
  LineChart,
  DollarSign,
  Percent,
  Scale,
  Briefcase,
  Hash,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';

// ============================================================================
// TYPES
// ============================================================================

type SearchCategory = 
  | 'navigation' 
  | 'reports' 
  | 'anomalies' 
  | 'settings' 
  | 'actions'
  | 'features'
  | 'help';

interface SearchResult {
  id: string;
  title: string;
  titleFr?: string;
  description: string;
  descriptionFr?: string;
  category: SearchCategory;
  icon: React.ReactNode;
  path: string;
  keywords: string[];
  badge?: string;
  badgeFr?: string;
  shortcut?: string;
  iconColor?: 'info' | 'warning' | 'accent'; // Override category color for specific icons
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================================
// COMPREHENSIVE SEARCH DATA
// ============================================================================

const getSearchData = (t: (key: string) => string, language: 'en' | 'fr'): SearchResult[] => {
  const isEn = language === 'en';
  
  return [
  // ========== MAIN NAVIGATION ==========
  {
    id: 'nav-dashboard',
    title: 'Dashboard',
    titleFr: 'Tableau de bord',
    description: 'Real-time financial overview and KPIs',
    descriptionFr: 'Aperçu financier en temps réel et KPIs',
    category: 'navigation',
    icon: <LayoutDashboard className="w-4 h-4" />,
    path: '/app',
    keywords: ['dashboard', 'tableau de bord', 'home', 'accueil', 'overview', 'aperçu', 'kpi', 'metrics', 'métriques', 'main', 'principal'],
  },
  {
    id: 'nav-visualizations',
    title: 'Visualizations',
    titleFr: 'Visualisations',
    description: 'Custom dashboards and data visualization',
    descriptionFr: 'Tableaux de bord personnalisés et visualisation de données',
    category: 'navigation',
    icon: <BarChart3 className="w-4 h-4" />,
    path: '/app/visualizations',
    keywords: ['visualizations', 'visualisations', 'charts', 'graphiques', 'custom', 'personnalisé', 'dashboard', 'tableau de bord', 'analytics', 'analytique'],
    badge: 'Pro',
    iconColor: 'info', // Blue-gray for visualizations
  },
  {
    id: 'nav-strategic-planning',
    title: 'Strategic Planning',
    titleFr: 'Planification stratégique',
    description: 'Financial modeling and scenario analysis',
    descriptionFr: 'Modélisation financière et analyse de scénarios',
    category: 'navigation',
    icon: <Target className="w-4 h-4" />,
    path: '/app/strategic-planning',
    keywords: ['strategic', 'stratégique', 'planning', 'planification', 'forecast', 'prévision', 'scenario', 'scénario', 'model', 'modèle', 'projection'],
    badge: 'Pro',
  },
  {
    id: 'nav-anomalies',
    title: 'Anomaly Detection',
    titleFr: 'Détection d\'anomalies',
    description: 'AI-powered analysis of your financial data',
    descriptionFr: 'Analyse de vos données financières propulsée par l\'IA',
    category: 'navigation',
    icon: <AlertTriangle className="w-4 h-4" />,
    path: '/app/anomalies',
    keywords: ['anomalies', 'anomaly', 'detection', 'détection', 'inconsistency', 'incohérence', 'alert', 'alerte', 'ai', 'ia', 'intelligence', 'error', 'erreur'],
  },
  {
    id: 'nav-connections',
    title: 'Connections',
    titleFr: 'Connexions',
    description: 'Connect your accounting software',
    descriptionFr: 'Connectez votre logiciel comptable',
    category: 'navigation',
    icon: <Link2 className="w-4 h-4" />,
    path: '/app/connections',
    keywords: ['connections', 'connexions', 'quickbooks', 'xero', 'sage', 'accounting', 'comptable', 'sync', 'synchronisation', 'integrate', 'intégrer', 'source'],
  },
  {
    id: 'nav-reports',
    title: 'Reports',
    titleFr: 'Rapports',
    description: 'Financial statements and reports',
    descriptionFr: 'États financiers et rapports',
    category: 'navigation',
    icon: <FileText className="w-4 h-4" />,
    path: '/app/reports',
    keywords: ['reports', 'rapports', 'financial', 'financier', 'statements', 'états', 'documents', 'export', 'pdf'],
  },
  {
    id: 'nav-board-meeting',
    title: 'Board Meeting',
    titleFr: 'Réunion CA',
    description: 'Board-ready presentations and packages',
    descriptionFr: 'Présentations et dossiers prêts pour le CA',
    category: 'navigation',
    icon: <Presentation className="w-4 h-4" />,
    path: '/app/board-meeting',
    keywords: ['board', 'ca', 'conseil', 'meeting', 'réunion', 'presentation', 'présentation', 'package', 'dossier', 'directors', 'administrateurs'],
    badge: 'Pro',
  },
  {
    id: 'nav-settings',
    title: 'Settings',
    titleFr: 'Paramètres',
    description: 'Organization and account settings',
    descriptionFr: 'Paramètres de l\'organisation et du compte',
    category: 'navigation',
    icon: <Settings className="w-4 h-4" />,
    path: '/app/settings',
    keywords: ['settings', 'paramètres', 'configuration', 'preferences', 'préférences', 'config', 'options'],
  },

  // ========== FINANCIAL REPORTS ==========
  {
    id: 'report-balance-sheet',
    title: 'Balance Sheet',
    titleFr: 'Bilan',
    description: 'Assets, liabilities and equity statement',
    descriptionFr: 'État des actifs, passifs et capitaux propres',
    category: 'reports',
    icon: <Scale className="w-4 h-4" />,
    path: '/app/reports/balance-sheet',
    keywords: ['balance sheet', 'bilan', 'assets', 'actifs', 'liabilities', 'passifs', 'equity', 'capitaux propres', 'financial position', 'situation financière'],
  },
  {
    id: 'report-income-statement',
    title: 'Income Statement',
    titleFr: 'État des résultats',
    description: 'Revenue, expenses and net income',
    descriptionFr: 'Revenus, dépenses et bénéfice net',
    category: 'reports',
    icon: <TrendingUp className="w-4 h-4" />,
    path: '/app/reports/income-statement',
    keywords: ['income statement', 'état des résultats', 'revenue', 'revenus', 'expenses', 'dépenses', 'profit', 'bénéfice', 'loss', 'perte', 'p&l', 'profit and loss'],
  },
  {
    id: 'report-cash-flow',
    title: 'Cash Flow Statement',
    titleFr: 'Flux de trésorerie',
    description: 'Operating, investing and financing activities',
    descriptionFr: 'Activités d\'exploitation, d\'investissement et de financement',
    category: 'reports',
    icon: <Wallet className="w-4 h-4" />,
    path: '/app/reports/cash-flow',
    keywords: ['cash flow', 'flux de trésorerie', 'operating', 'opérations', 'investing', 'investissement', 'financing', 'financement', 'liquidity', 'liquidité'],
  },
  {
    id: 'report-trial-balance',
    title: 'Trial Balance',
    titleFr: 'Balance de vérification',
    description: 'Detailed account balances',
    descriptionFr: 'Soldes détaillés des comptes',
    category: 'reports',
    icon: <BookOpen className="w-4 h-4" />,
    path: '/app/reports/trial-balance',
    keywords: ['trial balance', 'balance de vérification', 'accounts', 'comptes', 'debit', 'débit', 'credit', 'crédit', 'ledger', 'grand livre'],
  },

  // ========== ANOMALY ANALYSIS ==========
  {
    id: 'anomaly-variance',
    title: 'Variance Analysis',
    titleFr: 'Analyse des écarts',
    description: 'Compare current vs prior periods',
    descriptionFr: 'Comparer période actuelle vs précédente',
    category: 'anomalies',
    icon: <PieChart className="w-4 h-4" />,
    path: '/app/anomalies?filter=variance',
    keywords: ['variance', 'écart', 'comparison', 'comparaison', 'budget', 'actual', 'réel', 'difference', 'différence'],
  },
  {
    id: 'anomaly-trend',
    title: 'Trend Analysis',
    titleFr: 'Analyse des tendances',
    description: 'Identify unusual patterns over time',
    descriptionFr: 'Identifier les tendances inhabituelles',
    category: 'anomalies',
    icon: <LineChart className="w-4 h-4" />,
    path: '/app/anomalies?filter=trend',
    keywords: ['trend', 'tendance', 'pattern', 'modèle', 'historical', 'historique', 'evolution', 'évolution'],
  },
  {
    id: 'anomaly-ratio',
    title: 'Ratio Analysis',
    titleFr: 'Analyse des ratios',
    description: 'Financial ratio anomalies',
    descriptionFr: 'Anomalies des ratios financiers',
    category: 'anomalies',
    icon: <Percent className="w-4 h-4" />,
    path: '/app/anomalies?filter=ratio',
    keywords: ['ratio', 'ratios', 'liquidity', 'liquidité', 'profitability', 'rentabilité', 'solvency', 'solvabilité'],
  },
  {
    id: 'anomaly-outlier',
    title: 'Outlier Detection',
    titleFr: 'Détection des valeurs aberrantes',
    description: 'Unusual transactions and values',
    descriptionFr: 'Transactions et valeurs inhabituelles',
    category: 'anomalies',
    icon: <Activity className="w-4 h-4" />,
    path: '/app/anomalies?filter=outlier',
    keywords: ['outlier', 'aberrant', 'unusual', 'inhabituel', 'suspicious', 'suspect', 'transaction'],
  },

  // ========== SETTINGS SECTIONS ==========
  {
    id: 'settings-organization',
    title: 'Organization Settings',
    titleFr: 'Paramètres de l\'organisation',
    description: 'Company name, industry and branding',
    descriptionFr: 'Nom de l\'entreprise, industrie et image de marque',
    category: 'settings',
    icon: <Building2 className="w-4 h-4" />,
    path: '/app/settings?tab=organization',
    keywords: ['organization', 'organisation', 'company', 'entreprise', 'name', 'nom', 'industry', 'industrie', 'logo', 'branding', 'marque'],
  },
  {
    id: 'settings-team',
    title: 'Team Management',
    titleFr: 'Gestion de l\'équipe',
    description: 'Invite members and manage access',
    descriptionFr: 'Inviter des membres et gérer les accès',
    category: 'settings',
    icon: <Users className="w-4 h-4" />,
    path: '/app/settings?tab=team',
    keywords: ['team', 'équipe', 'members', 'membres', 'invite', 'inviter', 'user', 'utilisateur', 'access', 'accès', 'collaborator', 'collaborateur'],
  },
  {
    id: 'settings-roles',
    title: 'Roles & Permissions',
    titleFr: 'Rôles et permissions',
    description: 'Configure access levels and permissions',
    descriptionFr: 'Configurer les niveaux d\'accès et permissions',
    category: 'settings',
    icon: <Shield className="w-4 h-4" />,
    path: '/app/settings?tab=roles',
    keywords: ['roles', 'rôles', 'permissions', 'access', 'accès', 'admin', 'viewer', 'lecteur', 'editor', 'éditeur', 'rights', 'droits'],
  },
  {
    id: 'settings-profile',
    title: 'My Profile',
    titleFr: 'Mon profil',
    description: 'Personal information and preferences',
    descriptionFr: 'Informations personnelles et préférences',
    category: 'settings',
    icon: <User className="w-4 h-4" />,
    path: '/app/settings?tab=profile',
    keywords: ['profile', 'profil', 'personal', 'personnel', 'account', 'compte', 'avatar', 'photo', 'name', 'nom', 'email'],
  },
  {
    id: 'settings-subscription',
    title: 'Subscription & Billing',
    titleFr: 'Abonnement et facturation',
    description: 'Manage your plan and payment methods',
    descriptionFr: 'Gérer votre forfait et méthodes de paiement',
    category: 'settings',
    icon: <CreditCard className="w-4 h-4" />,
    path: '/app/settings?tab=subscription',
    keywords: ['subscription', 'abonnement', 'plan', 'forfait', 'billing', 'facturation', 'payment', 'paiement', 'invoice', 'facture', 'upgrade', 'mise à niveau', 'pricing', 'prix'],
    iconColor: 'info', // Blue-gray for subscription/billing
  },
  {
    id: 'settings-anomalies',
    title: 'Anomaly Thresholds',
    titleFr: 'Seuils d\'anomalies',
    description: 'Configure detection sensitivity',
    descriptionFr: 'Configurer la sensibilité de détection',
    category: 'settings',
    icon: <Zap className="w-4 h-4" />,
    path: '/app/settings?tab=anomalies',
    keywords: ['threshold', 'seuil', 'sensitivity', 'sensibilité', 'configure', 'configurer', 'detection', 'détection', 'anomaly', 'anomalie', 'alert', 'alerte'],
    iconColor: 'warning', // Orange/gold for anomaly thresholds
  },
  {
    id: 'settings-notifications',
    title: 'Notifications',
    titleFr: 'Notifications',
    description: 'Email and push notification preferences',
    descriptionFr: 'Préférences de notifications email et push',
    category: 'settings',
    icon: <Bell className="w-4 h-4" />,
    path: '/app/settings?tab=notifications',
    keywords: ['notifications', 'email', 'courriel', 'alerts', 'alertes', 'push', 'sms', 'digest', 'résumé', 'preferences', 'préférences'],
  },
  {
    id: 'settings-security',
    title: 'Security',
    titleFr: 'Sécurité',
    description: 'Password, 2FA and login sessions',
    descriptionFr: 'Mot de passe, 2FA et sessions de connexion',
    category: 'settings',
    icon: <Lock className="w-4 h-4" />,
    path: '/app/settings?tab=security',
    keywords: ['security', 'sécurité', 'password', 'mot de passe', '2fa', 'two-factor', 'authentication', 'authentification', 'mfa', 'session', 'login', 'connexion'],
  },
  {
    id: 'settings-secrets',
    title: 'API Keys',
    titleFr: 'Clés API',
    description: 'Manage API keys and integrations',
    descriptionFr: 'Gérer les clés API et intégrations',
    category: 'settings',
    icon: <Hash className="w-4 h-4" />,
    path: '/app/settings?tab=secrets',
    keywords: ['api', 'keys', 'clés', 'secrets', 'token', 'integration', 'intégration', 'developer', 'développeur'],
    badge: 'Admin',
    badgeFr: 'Admin',
  },
  {
    id: 'settings-integrations',
    title: 'Integrations',
    titleFr: 'Intégrations',
    description: 'Third-party connections and data sources',
    descriptionFr: 'Connexions tierces et sources de données',
    category: 'settings',
    icon: <Database className="w-4 h-4" />,
    path: '/app/settings?tab=integrations',
    keywords: ['integrations', 'intégrations', 'third-party', 'tiers', 'api', 'webhook', 'connect', 'connecter'],
  },

  // ========== QUICK ACTIONS ==========
  {
    id: 'action-export-report',
    title: 'Export Report',
    titleFr: 'Exporter un rapport',
    description: 'Download financial reports as PDF or Excel',
    descriptionFr: 'Télécharger les rapports en PDF ou Excel',
    category: 'actions',
    icon: <Download className="w-4 h-4" />,
    path: '/app/reports',
    keywords: ['export', 'exporter', 'download', 'télécharger', 'pdf', 'excel', 'csv', 'report', 'rapport'],
  },
  {
    id: 'action-sync-data',
    title: 'Sync Data',
    titleFr: 'Synchroniser les données',
    description: 'Refresh data from connected sources',
    descriptionFr: 'Actualiser les données des sources connectées',
    category: 'actions',
    icon: <Link2 className="w-4 h-4" />,
    path: '/app/connections',
    keywords: ['sync', 'synchroniser', 'refresh', 'actualiser', 'update', 'mettre à jour', 'data', 'données'],
  },
  {
    id: 'action-invite-member',
    title: 'Invite Team Member',
    titleFr: 'Inviter un membre',
    description: 'Add a new user to your organization',
    descriptionFr: 'Ajouter un nouvel utilisateur à votre organisation',
    category: 'actions',
    icon: <Plus className="w-4 h-4" />,
    path: '/app/settings?tab=team',
    keywords: ['invite', 'inviter', 'add', 'ajouter', 'member', 'membre', 'user', 'utilisateur', 'team', 'équipe'],
  },
  {
    id: 'action-create-scenario',
    title: 'Create Scenario',
    titleFr: 'Créer un scénario',
    description: 'Build a new financial projection',
    descriptionFr: 'Construire une nouvelle projection financière',
    category: 'actions',
    icon: <Calculator className="w-4 h-4" />,
    path: '/app/strategic-planning',
    keywords: ['create', 'créer', 'scenario', 'scénario', 'forecast', 'prévision', 'projection', 'model', 'modèle'],
    badge: 'Pro',
  },

  // ========== FEATURES & CAPABILITIES ==========
  {
    id: 'feature-ai-insights',
    title: 'AI Insights',
    titleFr: 'Analyses IA',
    description: 'Intelligent analysis powered by AI',
    descriptionFr: 'Analyses intelligentes propulsées par l\'IA',
    category: 'features',
    icon: <Sparkles className="w-4 h-4" />,
    path: '/app/anomalies',
    keywords: ['ai', 'ia', 'artificial intelligence', 'intelligence artificielle', 'insights', 'analyses', 'smart', 'intelligent', 'machine learning'],
  },
  {
    id: 'feature-kpi-dashboard',
    title: 'KPI Dashboard',
    titleFr: 'Tableau de bord KPI',
    description: 'Key performance indicators at a glance',
    descriptionFr: 'Indicateurs clés de performance en un coup d\'œil',
    category: 'features',
    icon: <Activity className="w-4 h-4" />,
    path: '/app',
    keywords: ['kpi', 'metrics', 'métriques', 'performance', 'indicators', 'indicateurs', 'dashboard', 'tableau de bord'],
  },
  {
    id: 'feature-financial-health',
    title: 'Financial Health Score',
    titleFr: 'Score de santé financière',
    description: 'Overall health assessment of your finances',
    descriptionFr: 'Évaluation globale de votre santé financière',
    category: 'features',
    icon: <Activity className="w-4 h-4" />,
    path: '/app',
    keywords: ['health', 'santé', 'score', 'assessment', 'évaluation', 'rating', 'note', 'financial', 'financier'],
  },
  {
    id: 'feature-ratios',
    title: 'Financial Ratios',
    titleFr: 'Ratios financiers',
    description: 'Liquidity, profitability and solvency ratios',
    descriptionFr: 'Ratios de liquidité, rentabilité et solvabilité',
    category: 'features',
    icon: <Percent className="w-4 h-4" />,
    path: '/app',
    keywords: ['ratios', 'liquidity', 'liquidité', 'profitability', 'rentabilité', 'current ratio', 'quick ratio', 'margin', 'marge', 'dso', 'dpo'],
  },

  // ========== HELP & INTEGRATIONS ==========
  {
    id: 'help-quickbooks',
    title: 'QuickBooks Integration',
    titleFr: 'Intégration QuickBooks',
    description: 'Connect and sync with QuickBooks Online',
    descriptionFr: 'Connecter et synchroniser avec QuickBooks Online',
    category: 'help',
    icon: <Link2 className="w-4 h-4" />,
    path: '/app/connections',
    keywords: ['quickbooks', 'intuit', 'integration', 'intégration', 'connect', 'connecter', 'accounting', 'comptabilité', 'qbo'],
  },
  {
    id: 'help-xero',
    title: 'Xero Integration',
    titleFr: 'Intégration Xero',
    description: 'Connect and sync with Xero',
    descriptionFr: 'Connecter et synchroniser avec Xero',
    category: 'help',
    icon: <Link2 className="w-4 h-4" />,
    path: '/app/connections',
    keywords: ['xero', 'integration', 'intégration', 'connect', 'connecter', 'accounting', 'comptabilité'],
  },
  {
    id: 'help-sage',
    title: 'Sage Integration',
    titleFr: 'Intégration Sage',
    description: 'Connect and sync with Sage',
    descriptionFr: 'Connecter et synchroniser avec Sage',
    category: 'help',
    icon: <Link2 className="w-4 h-4" />,
    path: '/app/connections',
    keywords: ['sage', 'integration', 'intégration', 'connect', 'connecter', 'accounting', 'comptabilité'],
  },
  {
    id: 'help-powerbi',
    title: 'Power BI Integration',
    titleFr: 'Intégration Power BI',
    description: 'Advanced analytics with Microsoft Power BI',
    descriptionFr: 'Analyses avancées avec Microsoft Power BI',
    category: 'help',
    icon: <BarChart2 className="w-4 h-4" />,
    path: '/app/analytics/powerbi',
    keywords: ['powerbi', 'power bi', 'microsoft', 'analytics', 'analytique', 'bi', 'business intelligence'],
    badge: 'Enterprise',
  },

  // ========== FINANCIAL METRICS (searchable) ==========
  {
    id: 'metric-revenue',
    title: 'Revenue',
    titleFr: 'Revenus',
    description: 'View revenue metrics and trends',
    descriptionFr: 'Voir les métriques et tendances de revenus',
    category: 'features',
    icon: <DollarSign className="w-4 h-4" />,
    path: '/app',
    keywords: ['revenue', 'revenus', 'sales', 'ventes', 'income', 'chiffre d\'affaires', 'ca'],
  },
  {
    id: 'metric-expenses',
    title: 'Expenses',
    titleFr: 'Dépenses',
    description: 'Track and analyze expenses',
    descriptionFr: 'Suivre et analyser les dépenses',
    category: 'features',
    icon: <TrendingUp className="w-4 h-4" />,
    path: '/app/reports/income-statement',
    keywords: ['expenses', 'dépenses', 'costs', 'coûts', 'spending', 'charges'],
  },
  {
    id: 'metric-cash',
    title: 'Cash Position',
    titleFr: 'Position de trésorerie',
    description: 'Current cash and liquidity status',
    descriptionFr: 'État actuel de la trésorerie et liquidité',
    category: 'features',
    icon: <Wallet className="w-4 h-4" />,
    path: '/app',
    keywords: ['cash', 'trésorerie', 'liquidity', 'liquidité', 'bank', 'banque', 'money', 'argent'],
  },
  {
    id: 'metric-working-capital',
    title: 'Working Capital',
    titleFr: 'Fonds de roulement',
    description: 'Current assets minus current liabilities',
    descriptionFr: 'Actifs courants moins passifs courants',
    category: 'features',
    icon: <Briefcase className="w-4 h-4" />,
    path: '/app',
    keywords: ['working capital', 'fonds de roulement', 'current assets', 'actifs courants', 'current liabilities', 'passifs courants', 'bfr'],
  },
];
};

// ============================================================================
// FUZZY MATCHING HELPERS
// ============================================================================

// Simple fuzzy match score - handles typos and partial matches
function fuzzyMatch(text: string, query: string): number {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Exact match
  if (textLower === queryLower) return 100;
  
  // Contains full query
  if (textLower.includes(queryLower)) return 80;
  
  // Word boundary match (query matches start of a word)
  const words = textLower.split(/\s+/);
  for (const word of words) {
    if (word.startsWith(queryLower)) return 70;
  }
  
  // Fuzzy character match (for typos)
  let queryIndex = 0;
  let consecutiveMatches = 0;
  let maxConsecutive = 0;
  
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
      consecutiveMatches++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);
    } else {
      consecutiveMatches = 0;
    }
  }
  
  // All query chars found in order
  if (queryIndex === queryLower.length) {
    return 40 + (maxConsecutive / queryLower.length) * 20;
  }
  
  // Partial match - at least 60% of query chars found
  if (queryIndex >= queryLower.length * 0.6) {
    return 20 + (queryIndex / queryLower.length) * 20;
  }
  
  return 0;
}

// Highlight matching text
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  const index = textLower.indexOf(queryLower);
  
  if (index === -1) {
    // Try to highlight individual words
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 1);
    let result = text;
    let hasMatch = false;
    
    for (const word of queryWords) {
      const wordIndex = result.toLowerCase().indexOf(word);
      if (wordIndex !== -1) {
        hasMatch = true;
        const before = result.slice(0, wordIndex);
        const match = result.slice(wordIndex, wordIndex + word.length);
        const after = result.slice(wordIndex + word.length);
        result = `${before}[[HIGHLIGHT]]${match}[[/HIGHLIGHT]]${after}`;
      }
    }
    
    if (hasMatch) {
      const parts = result.split(/\[\[HIGHLIGHT\]\]|\[\[\/HIGHLIGHT\]\]/);
      return (
        <>
          {parts.map((part, i) => 
            i % 2 === 1 ? (
              <span 
                key={i} 
                className="font-semibold"
                style={{ color: 'rgb(var(--color-primary-500))' }}
              >
                {part}
              </span>
            ) : part
          )}
        </>
      );
    }
    return text;
  }
  
  const before = text.slice(0, index);
  const match = text.slice(index, index + query.length);
  const after = text.slice(index + query.length);
  
  return (
    <>
      {before}
      <span 
        className="font-semibold"
        style={{ color: 'rgb(var(--color-primary-500))' }}
      >
        {match}
      </span>
      {after}
    </>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const stored = localStorage.getItem('plainledger-recent-searches');
    return stored ? JSON.parse(stored) : [];
  });

  const isEn = language === 'en';
  const searchData = useMemo(() => getSearchData(t, language as 'en' | 'fr'), [t, language]);

  // Advanced search with fuzzy matching
  const results = useMemo(() => {
    if (!query.trim()) return [];
    
    const normalizedQuery = query.toLowerCase().trim();
    const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 0);
    
    return searchData
      .map(item => {
        let score = 0;
        
        // Get localized title and description
        const title = isEn ? item.title : (item.titleFr || item.title);
        const description = isEn ? item.description : (item.descriptionFr || item.description);
        
        // Title matching (highest priority)
        const titleScore = fuzzyMatch(title, normalizedQuery);
        score += titleScore * 2;
        
        // Also check non-localized title
        if (item.titleFr && !isEn) {
          score += fuzzyMatch(item.title, normalizedQuery) * 0.5;
        }
        
        // Description matching
        const descScore = fuzzyMatch(description, normalizedQuery);
        score += descScore * 0.5;
        
        // Keyword matching (very important for search)
        let keywordBonus = 0;
        item.keywords.forEach(keyword => {
          const kwScore = fuzzyMatch(keyword, normalizedQuery);
          if (kwScore > 50) keywordBonus += kwScore * 0.8;
          
          // Check each query word against keywords
          queryWords.forEach(word => {
            if (word.length > 1) {
              const wordScore = fuzzyMatch(keyword, word);
              if (wordScore > 40) keywordBonus += wordScore * 0.3;
            }
          });
        });
        score += keywordBonus;
        
        // Multi-word query: boost if all words match somewhere
        if (queryWords.length > 1) {
          const allText = [title, description, ...item.keywords].join(' ').toLowerCase();
          const matchedWords = queryWords.filter(word => allText.includes(word));
          if (matchedWords.length === queryWords.length) {
            score += 50; // Bonus for matching all words
          }
        }
        
        // Category ID matching (e.g., searching "settings" should boost settings items)
        if (item.id.toLowerCase().includes(normalizedQuery) || 
            item.category.toLowerCase().includes(normalizedQuery)) {
          score += 30;
        }
        
        return { ...item, score, displayTitle: title, displayDescription: description };
      })
      .filter(item => item.score > 15) // Threshold to filter out weak matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 12); // Show more results
  }, [query, searchData, isEn]);

  // Group results by category with priority ordering
  const groupedResults = useMemo(() => {
    const categoryOrder: SearchCategory[] = ['navigation', 'reports', 'settings', 'anomalies', 'actions', 'features', 'help'];
    const groups: Record<string, typeof results> = {};
    
    results.forEach(result => {
      if (!groups[result.category]) {
        groups[result.category] = [];
      }
      groups[result.category].push(result);
    });
    
    // Return ordered entries
    const orderedGroups: [string, typeof results][] = [];
    categoryOrder.forEach(cat => {
      if (groups[cat]) {
        orderedGroups.push([cat, groups[cat]]);
      }
    });
    
    return orderedGroups;
  }, [results]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current && results.length > 0) {
      const selectedElement = resultsRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex, results.length]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const totalResults = results.length;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(totalResults, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + Math.max(totalResults, 1)) % Math.max(totalResults, 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        onClose();
        break;
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          setSelectedIndex(prev => (prev - 1 + Math.max(totalResults, 1)) % Math.max(totalResults, 1));
        } else {
          setSelectedIndex(prev => (prev + 1) % Math.max(totalResults, 1));
        }
        break;
    }
  }, [results, selectedIndex, onClose]);

  // Handle result selection
  const handleSelect = (result: SearchResult & { displayTitle?: string }) => {
    const titleToSave = result.displayTitle || result.title;
    // Save to recent searches
    const newRecent = [titleToSave, ...recentSearches.filter(s => s !== titleToSave)].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem('plainledger-recent-searches', JSON.stringify(newRecent));
    
    // Navigate
    navigate(result.path);
    onClose();
  };

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('plainledger-recent-searches');
  };

  // Get category label with icons
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, { en: string; fr: string }> = {
      navigation: { en: 'Pages', fr: 'Pages' },
      reports: { en: 'Financial Reports', fr: 'Rapports financiers' },
      anomalies: { en: 'Anomaly Detection', fr: 'Détection d\'anomalies' },
      settings: { en: 'Settings', fr: 'Paramètres' },
      actions: { en: 'Quick Actions', fr: 'Actions rapides' },
      features: { en: 'Features & Metrics', fr: 'Fonctionnalités et métriques' },
      help: { en: 'Help & Integrations', fr: 'Aide et intégrations' },
    };
    return labels[category]?.[language] || category;
  };

  // Get category color styling - using theme variables
  const getCategoryColors = (category: string, iconColorOverride?: 'info' | 'warning' | 'accent') => {
    // Color override mappings
    const overrideColors: Record<string, { bg: string; icon: string; badge: string }> = {
      info: {
        bg: 'rgb(var(--color-info) / 0.1)',
        icon: 'rgb(var(--color-info))',
        badge: 'rgb(var(--color-info))'
      },
      warning: {
        bg: 'rgb(var(--color-warning) / 0.1)',
        icon: 'rgb(var(--color-warning))',
        badge: 'rgb(var(--color-warning))'
      },
      accent: {
        bg: 'rgb(var(--color-accent-500) / 0.1)',
        icon: 'rgb(var(--color-accent-600))',
        badge: 'rgb(var(--color-accent-500))'
      },
    };

    // If there's an override, use it
    if (iconColorOverride && overrideColors[iconColorOverride]) {
      return overrideColors[iconColorOverride];
    }

    const colors: Record<string, { bg: string; icon: string; badge: string }> = {
      navigation: { 
        bg: 'rgb(var(--color-primary-500) / 0.1)', 
        icon: 'rgb(var(--color-primary-600))',
        badge: 'rgb(var(--color-primary-500))'
      },
      reports: { 
        bg: 'rgb(var(--color-accent-500) / 0.1)', 
        icon: 'rgb(var(--color-accent-600))',
        badge: 'rgb(var(--color-accent-500))'
      },
      anomalies: { 
        bg: 'rgb(var(--color-warning) / 0.1)', 
        icon: 'rgb(var(--color-warning))',
        badge: 'rgb(var(--color-warning))'
      },
      settings: { 
        bg: 'rgb(var(--color-text-muted) / 0.1)', 
        icon: 'rgb(var(--color-text-secondary))',
        badge: 'rgb(var(--color-text-muted))'
      },
      actions: { 
        bg: 'rgb(var(--color-success) / 0.1)', 
        icon: 'rgb(var(--color-success))',
        badge: 'rgb(var(--color-success))'
      },
      features: { 
        bg: 'rgb(var(--color-primary-400) / 0.1)', 
        icon: 'rgb(var(--color-primary-500))',
        badge: 'rgb(var(--color-primary-400))'
      },
      help: { 
        bg: 'rgb(var(--color-accent-400) / 0.1)', 
        icon: 'rgb(var(--color-accent-500))',
        badge: 'rgb(var(--color-accent-400))'
      },
    };
    return colors[category] || { 
      bg: 'rgb(var(--color-primary-500) / 0.1)', 
      icon: 'rgb(var(--color-primary-600))',
      badge: 'rgb(var(--color-primary-500))'
    };
  };

  if (!isOpen) return null;

  // Popular searches for empty state
  const popularSearches = isEn 
    ? ['Dashboard', 'Balance Sheet', 'Cash Flow', 'Settings', 'Team', 'Anomalies']
    : ['Tableau de bord', 'Bilan', 'Flux de trésorerie', 'Paramètres', 'Équipe', 'Anomalies'];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop with animation */}
      <div 
        className="absolute inset-0 backdrop-blur-sm transition-opacity duration-200"
        style={{ backgroundColor: 'rgb(var(--color-black) / 0.6)' }}
      />
      
      {/* Modal with animation */}
      <div 
        className="relative w-[calc(100%-1.5rem)] sm:w-full max-w-2xl mx-3 sm:mx-0 rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-200 animate-in fade-in slide-in-from-top-4"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div 
          className="flex items-center gap-3 px-4 py-4 border-b"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <Search 
            className="w-5 h-5 flex-shrink-0 transition-colors" 
            style={{ color: query ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))' }} 
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={isEn ? 'Search pages, reports, settings, features...' : 'Rechercher pages, rapports, paramètres, fonctionnalités...'}
            className="flex-1 bg-transparent outline-none text-base placeholder:text-[rgb(var(--color-text-muted))]"
            style={{ color: 'rgb(var(--color-text))' }}
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="p-1.5 rounded-lg transition-colors hover:bg-[rgb(var(--color-bg-muted))]"
            >
              <X className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
            </button>
          )}
          <div 
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
            style={{ 
              backgroundColor: 'rgb(var(--color-bg-muted))',
              color: 'rgb(var(--color-text-muted))'
            }}
          >
            esc
          </div>
        </div>

        {/* Results */}
        <div ref={resultsRef} className="max-h-[60vh] overflow-y-auto">
          {/* No query - show recent searches and popular */}
          {!query.trim() && (
            <div className="p-3">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                    <span 
                      className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5"
                      style={{ color: 'rgb(var(--color-text-muted))' }}
                    >
                      <Clock className="w-3 h-3" />
                      {isEn ? 'Recent Searches' : 'Recherches récentes'}
                    </span>
                    <button 
                      onClick={clearRecentSearches}
                      className="text-[11px] font-medium hover:underline transition-colors"
                      style={{ color: 'rgb(var(--color-text-muted))' }}
                    >
                      {isEn ? 'Clear' : 'Effacer'}
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {recentSearches.map((search, i) => (
                      <button
                        key={i}
                        onClick={() => setQuery(search)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all hover:bg-[rgb(var(--color-bg-muted))]"
                      >
                        <Clock className="w-4 h-4 flex-shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
                        <span className="text-sm" style={{ color: 'rgb(var(--color-text))' }}>{search}</span>
                        <ArrowRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100" style={{ color: 'rgb(var(--color-text-muted))' }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Searches */}
              <div>
                <div className="px-2 py-1.5 mb-2">
                  <span 
                    className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  >
                    <Sparkles className="w-3 h-3" />
                    {isEn ? 'Popular Searches' : 'Recherches populaires'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 px-2">
                  {popularSearches.map((term, i) => (
                    <button
                      key={i}
                      onClick={() => setQuery(term)}
                      className="px-3 py-1.5 rounded-full text-sm font-medium border transition-all hover:border-[rgb(var(--color-primary-500))] hover:bg-[rgb(var(--color-primary-500)/0.05)]"
                      style={{ 
                        backgroundColor: 'transparent',
                        borderColor: 'rgb(var(--color-border))',
                        color: 'rgb(var(--color-text))'
                      }}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick tip */}
              <div 
                className="mt-4 mx-2 p-3 rounded-lg text-center"
                style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.05)' }}
              >
                <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  💡 {isEn 
                    ? 'Tip: Search works with typos! Try "balans" to find Balance Sheet.' 
                    : 'Astuce: La recherche tolère les fautes ! Essayez "bila" pour trouver le Bilan.'}
                </p>
              </div>
            </div>
          )}

          {/* Search results */}
          {query.trim() && results.length > 0 && (
            <div className="p-2">
              {/* Results count */}
              <div className="px-3 py-1.5 mb-1">
                <span className="text-[11px] font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {results.length} {isEn ? 'results' : 'résultats'}
                </span>
              </div>
              
              {groupedResults.map(([category, items]) => (
                <div key={category} className="mb-3">
                  <div 
                    className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-2"
                    style={{ color: getCategoryColors(category).icon }}
                  >
                    <div 
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: getCategoryColors(category).badge }}
                    />
                    {getCategoryLabel(category)}
                  </div>
                  <div className="space-y-0.5">
                    {items.map((result) => {
                      const globalIndex = results.findIndex(r => r.id === result.id);
                      const isSelected = globalIndex === selectedIndex;
                      const categoryColors = getCategoryColors(result.category, result.iconColor);
                      const displayTitle = (result as any).displayTitle || result.title;
                      const displayDescription = (result as any).displayDescription || result.description;
                      const badge = isEn ? result.badge : (result.badgeFr || result.badge);
                      
                      return (
                        <button
                          key={result.id}
                          data-index={globalIndex}
                          onClick={() => handleSelect(result)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group"
                          style={{ 
                            backgroundColor: isSelected ? 'rgb(var(--color-bg-muted))' : 'transparent',
                            transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                          }}
                        >
                          <div 
                            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                            style={{ 
                              backgroundColor: categoryColors.bg,
                              color: categoryColors.icon
                            }}
                          >
                            {result.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p 
                                className="font-medium truncate"
                                style={{ color: 'rgb(var(--color-text))' }}
                              >
                                {highlightMatch(displayTitle, query)}
                              </p>
                              {badge && (
                                <span 
                                  className="text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0"
                                  style={{ 
                                    backgroundColor: categoryColors.bg,
                                    color: categoryColors.icon
                                  }}
                                >
                                  {badge}
                                </span>
                              )}
                            </div>
                            <p 
                              className="text-xs truncate mt-0.5"
                              style={{ color: 'rgb(var(--color-text-muted))' }}
                            >
                              {highlightMatch(displayDescription, query)}
                            </p>
                          </div>
                          <div 
                            className="flex-shrink-0 transition-all"
                            style={{ 
                              opacity: isSelected ? 1 : 0,
                              transform: isSelected ? 'translateX(0)' : 'translateX(-8px)'
                            }}
                          >
                            <ArrowRight 
                              className="w-4 h-4"
                              style={{ color: 'rgb(var(--color-primary-500))' }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No results */}
          {query.trim() && results.length === 0 && (
            <div className="p-8 text-center">
              <div 
                className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
              >
                <Search 
                  className="w-8 h-8"
                  style={{ color: 'rgb(var(--color-primary-500))' }}
                />
              </div>
              <p className="font-medium mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'No results found' : 'Aucun résultat trouvé'}
              </p>
              <p 
                className="text-sm mb-4"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {isEn 
                  ? `No matches for "${query}"` 
                  : `Aucune correspondance pour « ${query} »`}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <p className="w-full text-xs mb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Try searching for:' : 'Essayez de rechercher :'}
                </p>
                {popularSearches.slice(0, 4).map((term, i) => (
                  <button
                    key={i}
                    onClick={() => setQuery(term)}
                    className="px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:bg-[rgb(var(--color-primary-500))] hover:text-white"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                      color: 'rgb(var(--color-primary-600))'
                    }}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          className="flex items-center justify-between px-4 py-2.5 border-t text-xs"
          style={{ 
            borderColor: 'rgb(var(--color-border))',
            color: 'rgb(var(--color-text-muted))',
            backgroundColor: 'rgb(var(--color-bg-subtle))'
          }}
        >
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd 
                className="px-1.5 py-0.5 rounded font-mono text-[10px]" 
                style={{ 
                  backgroundColor: 'rgb(var(--color-surface))',
                  boxShadow: '0 1px 2px rgb(0 0 0 / 0.1)'
                }}
              >↑</kbd>
              <kbd 
                className="px-1.5 py-0.5 rounded font-mono text-[10px]" 
                style={{ 
                  backgroundColor: 'rgb(var(--color-surface))',
                  boxShadow: '0 1px 2px rgb(0 0 0 / 0.1)'
                }}
              >↓</kbd>
              <span className="hidden sm:inline">{isEn ? 'navigate' : 'naviguer'}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd 
                className="px-1.5 py-0.5 rounded font-mono text-[10px]" 
                style={{ 
                  backgroundColor: 'rgb(var(--color-surface))',
                  boxShadow: '0 1px 2px rgb(0 0 0 / 0.1)'
                }}
              >↵</kbd>
              <span className="hidden sm:inline">{isEn ? 'select' : 'sélectionner'}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd 
                className="px-1.5 py-0.5 rounded font-mono text-[10px]" 
                style={{ 
                  backgroundColor: 'rgb(var(--color-surface))',
                  boxShadow: '0 1px 2px rgb(0 0 0 / 0.1)'
                }}
              >tab</kbd>
              <span className="hidden sm:inline">{isEn ? 'cycle' : 'parcourir'}</span>
            </span>
          </div>
          <span className="flex items-center gap-1.5 font-medium">
            <Command className="w-3 h-3" />
            <span>K</span>
            <span className="hidden sm:inline ml-1">{isEn ? 'to open search' : 'pour ouvrir'}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HOOK FOR GLOBAL KEYBOARD SHORTCUT
// ============================================================================

export function useSearchModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
}
