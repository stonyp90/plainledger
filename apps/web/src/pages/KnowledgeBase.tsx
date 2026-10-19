/**
 * PlainLedger Knowledge Base
 * 
 * Search-focused knowledge base with:
 * - Instant search with fuzzy matching
 * - Highlighted search results
 * - Popular articles section
 * - Keyboard navigation (Cmd/Ctrl+K to focus search)
 * - Tags for better discoverability
 * - SEO optimized for search engines and LLMs
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Book, 
  FileText, 
  Sparkles,
  Link2,
  AlertTriangle,
  BarChart3,
  Settings,
  ChevronRight,
  ExternalLink,
  Search,
  X,
  Clock,
  TrendingUp,
  Command,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';

// =====================================================
// SEO UTILITIES
// =====================================================

function useKnowledgeBaseSEO(title: string, description: string) {
  useEffect(() => {
    // Set document title
    const previousTitle = document.title;
    document.title = `${title} | PlainLedger Knowledge Base`;
    
    // Set meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    const previousDescription = metaDescription?.getAttribute('content') || '';
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    }
    
    // Add structured data for the article/page
    const scriptId = 'kb-structured-data';
    let script = document.querySelector<HTMLScriptElement>(`script[id="${scriptId}"]`);
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "name": title,
      "description": description,
      "publisher": {
        "@type": "Organization",
        "name": "PlainLedger"
      }
    });
    
    return () => {
      document.title = previousTitle;
      if (metaDescription) {
        metaDescription.setAttribute('content', previousDescription);
      }
    };
  }, [title, description]);
}

// =====================================================
// TYPES
// =====================================================

interface Article {
  id: string;
  title: { en: string; fr: string };
  content?: { en: string; fr: string };
  url?: string;
  tags?: string[];
}

interface HelpTopic {
  id: string;
  icon: typeof Book;
  title: { en: string; fr: string };
  description: { en: string; fr: string };
  articles: Article[];
}

interface SearchResult {
  type: 'topic' | 'article';
  topicId: string;
  articleId?: string;
  topic: HelpTopic;
  article?: Article;
  score: number;
  matchedFields: string[];
}

// =====================================================
// KNOWLEDGE BASE DATA
// =====================================================

const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'getting-started',
    icon: Sparkles,
    title: { en: 'Getting Started', fr: 'Démarrage' },
    description: { en: 'Learn the basics of PlainLedger', fr: 'Apprenez les bases de PlainLedger' },
    articles: [
      { 
        id: 'quick-start', 
        title: { en: 'Quick Start Guide', fr: 'Guide de démarrage rapide' },
        content: {
          en: 'Welcome to PlainLedger! This guide will help you get started quickly.\n\n1. Connect your first data source (QuickBooks, Xero, Sage, or CSV)\n2. Review your dashboard and financial health score\n3. Explore your visualizations and reports\n4. Set up anomaly detection thresholds\n\nFor detailed instructions, visit the Connections page.',
          fr: 'Bienvenue sur PlainLedger! Ce guide vous aidera à démarrer rapidement.\n\n1. Connectez votre première source de données (QuickBooks, Xero, Sage ou CSV)\n2. Consultez votre tableau de bord et score de santé financière\n3. Explorez vos visualisations et rapports\n4. Configurez les seuils de détection d\'anomalies\n\nPour des instructions détaillées, visitez la page Connexions.'
        },
        url: '/app',
        tags: ['onboarding', 'setup', 'first steps', 'tutorial', 'beginner']
      },
      { 
        id: 'first-connection', 
        title: { en: 'Connect Your First Data Source', fr: 'Connecter votre première source' },
        content: {
          en: 'To connect your first data source:\n\n1. Navigate to Connections\n2. Select your accounting software (QuickBooks, Xero, Sage, FreshBooks, Wave)\n3. Follow the OAuth authorization flow\n4. Wait for data synchronization\n\nYour data will be securely synced and ready for analysis. Data syncs automatically every day.',
          fr: 'Pour connecter votre première source de données:\n\n1. Accédez à Connexions\n2. Sélectionnez votre logiciel comptable (QuickBooks, Xero, Sage, FreshBooks, Wave)\n3. Suivez le processus d\'autorisation OAuth\n4. Attendez la synchronisation des données\n\nVos données seront synchronisées en toute sécurité et prêtes pour l\'analyse. La synchronisation se fait automatiquement chaque jour.'
        },
        url: '/app/connections',
        tags: ['connection', 'integration', 'sync', 'data', 'oauth']
      },
      { 
        id: 'dashboard-overview', 
        title: { en: 'Dashboard Overview', fr: 'Aperçu du tableau de bord' },
        content: {
          en: 'The PlainLedger dashboard provides a comprehensive view of your financial health.\n\nKey features:\n- Financial Health Score (0-100)\n- Key Performance Indicators (KPIs)\n- Cash Flow Analysis\n- Revenue and Expense Trends\n- Anomaly Alerts\n- Customizable Widgets\n\nYou can customize your dashboard by adding, removing, or reordering widgets. Lock the dashboard to prevent accidental changes.',
          fr: 'Le tableau de bord PlainLedger offre une vue complète de votre santé financière.\n\nFonctionnalités clés:\n- Score de santé financière (0-100)\n- Indicateurs de performance clés (KPI)\n- Analyse des flux de trésorerie\n- Tendances des revenus et dépenses\n- Alertes d\'anomalies\n- Widgets personnalisables\n\nVous pouvez personnaliser votre tableau de bord en ajoutant, supprimant ou réorganisant les widgets. Verrouillez le tableau pour éviter les modifications accidentelles.'
        },
        url: '/app',
        tags: ['dashboard', 'overview', 'metrics', 'kpi', 'health score', 'widgets', 'customize']
      },
      { 
        id: 'free-vs-paid', 
        title: { en: 'Free vs Paid Plans', fr: 'Plans gratuit vs payant' },
        content: {
          en: 'PlainLedger offers both free and paid plans:\n\nFree Plan:\n- Dashboard with demo data\n- Basic financial reports\n- Anomaly detection\n- Single user\n\nPaid Plans (Professional, Enterprise):\n- Connect real accounting data\n- Market analysis & benchmarks\n- Tax credit eligibility\n- Board meeting presentations\n- Strategic planning tools\n- Multi-user access\n- Priority support\n\nUpgrade anytime from Settings > Subscription.',
          fr: 'PlainLedger offre des plans gratuits et payants:\n\nPlan gratuit:\n- Tableau de bord avec données démo\n- Rapports financiers de base\n- Détection d\'anomalies\n- Utilisateur unique\n\nPlans payants (Professionnel, Entreprise):\n- Connexion aux données comptables réelles\n- Analyse de marché et benchmarks\n- Éligibilité aux crédits d\'impôt\n- Présentations pour réunions CA\n- Outils de planification stratégique\n- Accès multi-utilisateurs\n- Support prioritaire\n\nMettez à niveau à tout moment depuis Paramètres > Abonnement.'
        },
        url: '/app/settings?tab=subscription',
        tags: ['pricing', 'plans', 'free', 'professional', 'enterprise', 'upgrade', 'subscription']
      },
    ],
  },
  {
    id: 'reports',
    icon: FileText,
    title: { en: 'Financial Reports', fr: 'Rapports financiers' },
    description: { en: 'Generate and customize reports', fr: 'Générer et personnaliser les rapports' },
    articles: [
      { 
        id: 'balance-sheet', 
        title: { en: 'Balance Sheet Report', fr: 'Rapport de bilan' },
        content: {
          en: 'The Balance Sheet shows your assets, liabilities, and equity at a specific point in time.\n\nUse filters to:\n- Select date ranges\n- Filter by account categories\n- Export to PDF or Excel\n\nNavigate to Reports > Balance Sheet to generate.',
          fr: 'Le bilan montre vos actifs, passifs et capitaux propres à un moment précis.\n\nUtilisez les filtres pour:\n- Sélectionner des périodes\n- Filtrer par catégories de comptes\n- Exporter en PDF ou Excel\n\nAccédez à Rapports > Bilan pour générer.'
        },
        url: '/app/reports/balance-sheet',
        tags: ['balance sheet', 'assets', 'liabilities', 'equity', 'financial statement']
      },
      { 
        id: 'income-statement', 
        title: { en: 'Income Statement', fr: 'Compte de résultat' },
        content: {
          en: 'The Income Statement shows your revenue and expenses over a period.\n\nFeatures:\n- Customizable date ranges\n- Detailed breakdowns\n- Comparison views\n- Export capabilities',
          fr: 'Le compte de résultat montre vos revenus et dépenses sur une période.\n\nFonctionnalités:\n- Périodes personnalisables\n- Détails détaillés\n- Vues comparatives\n- Capacités d\'exportation'
        },
        url: '/app/reports/income-statement',
        tags: ['income', 'revenue', 'expenses', 'profit', 'loss', 'P&L']
      },
      { 
        id: 'cash-flow', 
        title: { en: 'Cash Flow Statement', fr: 'Flux de trésorerie' },
        content: {
          en: 'Track your cash inflows and outflows with the Cash Flow Statement.\n\nSections:\n- Operating Activities\n- Investing Activities\n- Financing Activities\n\nEssential for understanding liquidity.',
          fr: 'Suivez vos entrées et sorties de trésorerie avec le tableau des flux de trésorerie.\n\nSections:\n- Activités d\'exploitation\n- Activités d\'investissement\n- Activités de financement\n\nEssentiel pour comprendre la liquidité.'
        },
        url: '/app/reports/cash-flow',
        tags: ['cash flow', 'liquidity', 'operating', 'investing', 'financing']
      },
      { 
        id: 'export-reports', 
        title: { en: 'Exporting Reports', fr: 'Exporter les rapports' },
        content: {
          en: 'Export your reports in multiple formats:\n\n- PDF: Professional formatting for presentations\n- Excel: For further analysis and manipulation\n- CSV: For data import into other systems\n\nClick the Export button on any report page.',
          fr: 'Exportez vos rapports dans plusieurs formats:\n\n- PDF: Formatage professionnel pour les présentations\n- Excel: Pour analyse et manipulation supplémentaires\n- CSV: Pour importation de données dans d\'autres systèmes\n\nCliquez sur le bouton Exporter sur n\'importe quelle page de rapport.'
        },
        url: '/app/reports',
        tags: ['export', 'pdf', 'excel', 'csv', 'download']
      },
    ],
  },
  {
    id: 'connections',
    icon: Link2,
    title: { en: 'Data Connections', fr: 'Connexions de données' },
    description: { en: 'Connect and manage data sources', fr: 'Connecter et gérer les sources' },
    articles: [
      { 
        id: 'connect-quickbooks', 
        title: { en: 'Connect QuickBooks', fr: 'Connecter QuickBooks' },
        content: {
          en: 'To connect QuickBooks:\n\n1. Go to Connections\n2. Click on QuickBooks\n3. Sign in with your Intuit account\n4. Authorize PlainLedger access\n5. Select your company\n\nYour data will sync automatically.',
          fr: 'Pour connecter QuickBooks:\n\n1. Allez dans Connexions\n2. Cliquez sur QuickBooks\n3. Connectez-vous avec votre compte Intuit\n4. Autorisez l\'accès PlainLedger\n5. Sélectionnez votre entreprise\n\nVos données se synchroniseront automatiquement.'
        },
        url: '/app/connections',
        tags: ['quickbooks', 'qbo', 'intuit', 'integration', 'accounting software']
      },
      { 
        id: 'connect-xero', 
        title: { en: 'Connect Xero', fr: 'Connecter Xero' },
        content: {
          en: 'Connect Xero to PlainLedger:\n\n1. Navigate to Connections\n2. Select Xero\n3. Sign in to your Xero account\n4. Grant permissions\n5. Choose your organization\n\nSync happens automatically.',
          fr: 'Connectez Xero à PlainLedger:\n\n1. Accédez à Connexions\n2. Sélectionnez Xero\n3. Connectez-vous à votre compte Xero\n4. Accordez les permissions\n5. Choisissez votre organisation\n\nLa synchronisation se fait automatiquement.'
        },
        url: '/app/connections',
        tags: ['xero', 'integration', 'accounting software', 'cloud accounting']
      },
      { 
        id: 'connect-sage', 
        title: { en: 'Connect Sage', fr: 'Connecter Sage' },
        content: {
          en: 'Sage integration steps:\n\n1. Visit Connections page\n2. Click Sage\n3. Authenticate with Sage\n4. Authorize PlainLedger\n5. Select your company\n\nData syncs automatically.',
          fr: 'Étapes d\'intégration Sage:\n\n1. Visitez la page Connexions\n2. Cliquez sur Sage\n3. Authentifiez-vous avec Sage\n4. Autorisez PlainLedger\n5. Sélectionnez votre entreprise\n\nLa synchronisation des données se fait automatiquement.'
        },
        url: '/app/connections',
        tags: ['sage', 'integration', 'accounting software', 'erp']
      },
      { 
        id: 'import-csv', 
        title: { en: 'Import CSV Data', fr: 'Importer des données CSV' },
        content: {
          en: 'Import CSV files:\n\n1. Go to Connections\n2. Select CSV Import\n3. Upload your file\n4. Map columns to accounts\n5. Review and confirm\n\nSupported formats: CSV, Excel',
          fr: 'Importez des fichiers CSV:\n\n1. Allez dans Connexions\n2. Sélectionnez Import CSV\n3. Téléchargez votre fichier\n4. Mappez les colonnes aux comptes\n5. Examinez et confirmez\n\nFormats pris en charge: CSV, Excel'
        },
        url: '/app/connections',
        tags: ['csv', 'excel', 'import', 'upload', 'manual data']
      },
    ],
  },
  {
    id: 'anomalies',
    icon: AlertTriangle,
    title: { en: 'Anomaly Detection', fr: 'Détection d\'anomalies' },
    description: { en: 'Understand and resolve anomalies', fr: 'Comprendre et résoudre les anomalies' },
    articles: [
      { 
        id: 'anomaly-types', 
        title: { en: 'Types of Anomalies', fr: 'Types d\'anomalies' },
        content: {
          en: 'PlainLedger detects several types of anomalies:\n\n- Unusual transactions\n- Missing entries\n- Duplicate entries\n- Threshold violations\n- Trend deviations\n\nEach anomaly is flagged with severity and context.',
          fr: 'PlainLedger détecte plusieurs types d\'anomalies:\n\n- Transactions inhabituelles\n- Entrées manquantes\n- Entrées en double\n- Violations de seuils\n- Déviation des tendances\n\nChaque anomalie est signalée avec sa gravité et son contexte.'
        },
        url: '/app/anomalies',
        tags: ['anomaly', 'detection', 'unusual', 'duplicate', 'missing', 'fraud']
      },
      { 
        id: 'threshold-config', 
        title: { en: 'Configure Thresholds', fr: 'Configurer les seuils' },
        content: {
          en: 'Customize anomaly detection thresholds:\n\n1. Go to Settings > Anomalies\n2. Adjust thresholds per metric\n3. Set sensitivity levels\n4. Save changes\n\nLower thresholds = more sensitive detection.',
          fr: 'Personnalisez les seuils de détection d\'anomalies:\n\n1. Allez dans Paramètres > Anomalies\n2. Ajustez les seuils par métrique\n3. Définissez les niveaux de sensibilité\n4. Enregistrez les modifications\n\nSeuils plus bas = détection plus sensible.'
        },
        url: '/app/settings?tab=anomalies',
        tags: ['threshold', 'sensitivity', 'configuration', 'customize', 'alerts']
      },
      { 
        id: 'false-positives', 
        title: { en: 'Managing False Positives', fr: 'Gérer les faux positifs' },
        content: {
          en: 'If an anomaly is flagged incorrectly:\n\n1. Review the anomaly details\n2. Mark as resolved if expected\n3. Adjust thresholds if needed\n4. The system learns from your feedback\n\nThis improves detection accuracy over time.',
          fr: 'Si une anomalie est signalée incorrectement:\n\n1. Examinez les détails de l\'anomalie\n2. Marquez comme résolu si attendu\n3. Ajustez les seuils si nécessaire\n4. Le système apprend de vos commentaires\n\nCela améliore la précision de la détection au fil du temps.'
        },
        url: '/app/anomalies',
        tags: ['false positive', 'resolve', 'dismiss', 'machine learning', 'feedback']
      },
    ],
  },
  {
    id: 'dashboard',
    icon: BarChart3,
    title: { en: 'Dashboard & Analytics', fr: 'Tableau de bord & Analyses' },
    description: { en: 'Understand your financial metrics', fr: 'Comprendre vos métriques' },
    articles: [
      { 
        id: 'health-score', 
        title: { en: 'Financial Health Score', fr: 'Score de santé financière' },
        content: {
          en: 'The Health Score (0-100) reflects your overall financial health.\n\nScoring:\n- 80+: Excellent\n- 60-79: Good\n- Below 60: Needs attention\n\nBased on ratios, anomalies, and trends.',
          fr: 'Le Score de Santé (0-100) reflète votre santé financière globale.\n\nNotation:\n- 80+: Excellent\n- 60-79: Bon\n- En dessous de 60: Nécessite attention\n\nBasé sur les ratios, anomalies et tendances.'
        },
        url: '/app/anomalies',
        tags: ['health score', 'financial health', 'score', 'rating', 'assessment']
      },
      { 
        id: 'kpi-explained', 
        title: { en: 'KPIs Explained', fr: 'KPIs expliqués' },
        content: {
          en: 'Key Performance Indicators tracked:\n\n- Revenue Growth\n- Profit Margins\n- Cash Flow\n- Debt Ratios\n- Operating Efficiency\n\nEach KPI includes trends and comparisons.',
          fr: 'Indicateurs de performance clés suivis:\n\n- Croissance des revenus\n- Marges bénéficiaires\n- Flux de trésorerie\n- Ratios d\'endettement\n- Efficacité opérationnelle\n\nChaque KPI inclut des tendances et comparaisons.'
        },
        url: '/app',
        tags: ['kpi', 'metrics', 'indicators', 'performance', 'revenue', 'profit margin']
      },
      { 
        id: 'trends', 
        title: { en: 'Understanding Trends', fr: 'Comprendre les tendances' },
        content: {
          en: 'Trend analysis helps identify patterns:\n\n- Upward trends: Growth indicators\n- Downward trends: Areas of concern\n- Seasonal patterns: Expected variations\n- Anomalies: Unexpected changes\n\nUse trend charts to visualize changes.',
          fr: 'L\'analyse des tendances aide à identifier les modèles:\n\n- Tendances à la hausse: Indicateurs de croissance\n- Tendances à la baisse: Domaines préoccupants\n- Modèles saisonniers: Variations attendues\n- Anomalies: Changements inattendus\n\nUtilisez les graphiques de tendances pour visualiser les changements.'
        },
        url: '/app/visualizations',
        tags: ['trends', 'analysis', 'patterns', 'charts', 'visualization', 'growth']
      },
    ],
  },
  {
    id: 'settings',
    icon: Settings,
    title: { en: 'Account & Settings', fr: 'Compte & Paramètres' },
    description: { en: 'Manage your account and team', fr: 'Gérer votre compte et équipe' },
    articles: [
      { 
        id: 'team-management', 
        title: { en: 'Team Management', fr: 'Gestion d\'équipe' },
        content: {
          en: 'Manage your team:\n\n1. Go to Settings > Team\n2. Invite members by email\n3. Assign roles (Admin, Member, Viewer)\n4. Manage permissions\n5. Remove members if needed\n\nRoles determine access levels. Admins can manage all settings, Members can view and edit data, Viewers have read-only access.',
          fr: 'Gérez votre équipe:\n\n1. Allez dans Paramètres > Équipe\n2. Invitez des membres par courriel\n3. Attribuez des rôles (Admin, Membre, Observateur)\n4. Gérez les permissions\n5. Supprimez des membres si nécessaire\n\nLes rôles déterminent les niveaux d\'accès. Les admins peuvent gérer tous les paramètres, les membres peuvent voir et modifier les données, les observateurs ont un accès en lecture seule.'
        },
        url: '/app/settings?tab=team',
        tags: ['team', 'users', 'invite', 'roles', 'permissions', 'organization']
      },
      { 
        id: 'billing', 
        title: { en: 'Billing & Subscriptions', fr: 'Facturation & Abonnements' },
        content: {
          en: 'Manage your subscription:\n\n- View current plan (Free, Professional, Enterprise)\n- Update payment method (credit card via Stripe)\n- View billing history and invoices\n- Upgrade or downgrade plans\n- Cancel subscription\n\nAccess via Settings > Subscription.',
          fr: 'Gérez votre abonnement:\n\n- Voir le plan actuel (Gratuit, Professionnel, Entreprise)\n- Mettre à jour le mode de paiement (carte de crédit via Stripe)\n- Voir l\'historique de facturation et les factures\n- Mettre à niveau ou rétrograder les plans\n- Annuler l\'abonnement\n\nAccès via Paramètres > Abonnement.'
        },
        url: '/app/settings?tab=subscription',
        tags: ['billing', 'subscription', 'payment', 'plan', 'upgrade', 'invoice', 'stripe']
      },
      { 
        id: 'security', 
        title: { en: 'Security Settings', fr: 'Paramètres de sécurité' },
        content: {
          en: 'Security features:\n\n- Enable two-factor authentication (2FA)\n- Manage API keys for integrations\n- View login history and active sessions\n- Password management\n- Social login (Google, Microsoft)\n\nKeep your account secure with industry-standard security practices.',
          fr: 'Fonctionnalités de sécurité:\n\n- Activer l\'authentification à deux facteurs (2FA)\n- Gérer les clés API pour les intégrations\n- Voir l\'historique de connexion et les sessions actives\n- Gestion du mot de passe\n- Connexion sociale (Google, Microsoft)\n\nGardez votre compte sécurisé avec des pratiques de sécurité standard de l\'industrie.'
        },
        url: '/app/settings?tab=security',
        tags: ['security', '2fa', 'mfa', 'password', 'authentication', 'api keys', 'google', 'microsoft']
      },
      { 
        id: 'profile', 
        title: { en: 'Profile Settings', fr: 'Paramètres du profil' },
        content: {
          en: 'Manage your personal profile:\n\n- Update your name and email\n- Upload a profile picture\n- Set your language preference (English/French)\n- Configure notification preferences\n- Update your timezone\n\nYour profile picture appears across the app and in shared reports.',
          fr: 'Gérez votre profil personnel:\n\n- Mettez à jour votre nom et courriel\n- Téléchargez une photo de profil\n- Définissez votre préférence de langue (Anglais/Français)\n- Configurez vos préférences de notification\n- Mettez à jour votre fuseau horaire\n\nVotre photo de profil apparaît dans toute l\'application et les rapports partagés.'
        },
        url: '/app/settings?tab=profile',
        tags: ['profile', 'avatar', 'picture', 'name', 'email', 'language', 'preferences']
      },
      { 
        id: 'notifications', 
        title: { en: 'Notification Settings', fr: 'Paramètres de notification' },
        content: {
          en: 'Configure your notification preferences:\n\n- Email notifications for anomalies\n- Weekly digest summaries\n- Report generation alerts\n- Team activity notifications\n- System announcements\n\nCustomize what notifications you receive and how often.',
          fr: 'Configurez vos préférences de notification:\n\n- Notifications par courriel pour les anomalies\n- Résumés hebdomadaires\n- Alertes de génération de rapports\n- Notifications d\'activité d\'équipe\n- Annonces système\n\nPersonnalisez les notifications que vous recevez et leur fréquence.'
        },
        url: '/app/settings?tab=notifications',
        tags: ['notifications', 'email', 'alerts', 'digest', 'preferences']
      },
      { 
        id: 'company-settings', 
        title: { en: 'Company Settings', fr: 'Paramètres de l\'entreprise' },
        content: {
          en: 'Configure your company settings:\n\n- Company name and logo\n- Fiscal year end date\n- Industry classification\n- Currency settings\n- Address and contact information\n\nThese settings affect reports and industry comparisons.',
          fr: 'Configurez les paramètres de votre entreprise:\n\n- Nom et logo de l\'entreprise\n- Date de fin d\'exercice fiscal\n- Classification de l\'industrie\n- Paramètres de devise\n- Adresse et coordonnées\n\nCes paramètres affectent les rapports et les comparaisons sectorielles.'
        },
        url: '/app/settings?tab=organization',
        tags: ['company', 'organization', 'logo', 'fiscal year', 'industry', 'currency']
      },
    ],
  },
  {
    id: 'visualizations',
    icon: BarChart3,
    title: { en: 'Visualizations & Charts', fr: 'Visualisations & Graphiques' },
    description: { en: 'Create custom charts and dashboards', fr: 'Créer des graphiques et tableaux personnalisés' },
    articles: [
      { 
        id: 'chart-types', 
        title: { en: 'Available Chart Types', fr: 'Types de graphiques disponibles' },
        content: {
          en: 'PlainLedger supports various chart types:\n\n- Line Charts: Track trends over time\n- Bar Charts: Compare values across categories\n- Waterfall Charts: Show how values change step by step\n- Pie Charts: Show proportion breakdown\n- Area Charts: Visualize cumulative totals\n- Combo Charts: Combine multiple chart types\n\nEach chart can be customized with colors, labels, and thresholds.',
          fr: 'PlainLedger prend en charge plusieurs types de graphiques:\n\n- Graphiques en ligne: Suivre les tendances dans le temps\n- Graphiques à barres: Comparer les valeurs entre catégories\n- Graphiques en cascade: Montrer comment les valeurs changent étape par étape\n- Graphiques circulaires: Montrer la répartition proportionnelle\n- Graphiques en aires: Visualiser les totaux cumulés\n- Graphiques combinés: Combiner plusieurs types\n\nChaque graphique peut être personnalisé avec des couleurs, étiquettes et seuils.'
        },
        url: '/app/visualizations',
        tags: ['charts', 'graphs', 'line', 'bar', 'waterfall', 'pie', 'visualization']
      },
      { 
        id: 'ibcs-standards', 
        title: { en: 'IBCS Standards', fr: 'Normes IBCS' },
        content: {
          en: 'PlainLedger follows IBCS (International Business Communication Standards):\n\n- Consistent visual language\n- Actual vs Plan comparisons\n- Variance highlighting\n- Proper use of colors (green for positive, red for negative)\n- Clean, professional presentation\n\nIBCS standards ensure your charts communicate clearly and effectively.',
          fr: 'PlainLedger suit les normes IBCS (International Business Communication Standards):\n\n- Langage visuel cohérent\n- Comparaisons Réel vs Plan\n- Mise en évidence des écarts\n- Utilisation appropriée des couleurs (vert pour positif, rouge pour négatif)\n- Présentation claire et professionnelle\n\nLes normes IBCS garantissent que vos graphiques communiquent clairement et efficacement.'
        },
        url: '/app/visualizations',
        tags: ['ibcs', 'standards', 'business', 'communication', 'professional', 'variance']
      },
      { 
        id: 'customize-charts', 
        title: { en: 'Customizing Charts', fr: 'Personnaliser les graphiques' },
        content: {
          en: 'Customize your charts:\n\n1. Click on any chart to open settings\n2. Change chart type, colors, and labels\n3. Add thresholds and reference lines\n4. Configure moving averages\n5. Set date range and filters\n6. Save as template for reuse\n\nLock chart settings to prevent accidental changes.',
          fr: 'Personnalisez vos graphiques:\n\n1. Cliquez sur n\'importe quel graphique pour ouvrir les paramètres\n2. Changez le type, les couleurs et les étiquettes\n3. Ajoutez des seuils et lignes de référence\n4. Configurez les moyennes mobiles\n5. Définissez la plage de dates et les filtres\n6. Enregistrez comme modèle pour réutilisation\n\nVerrouillez les paramètres pour éviter les modifications accidentelles.'
        },
        url: '/app/visualizations',
        tags: ['customize', 'charts', 'colors', 'thresholds', 'templates', 'settings']
      },
      { 
        id: 'add-chart-dashboard', 
        title: { en: 'Adding Charts to Dashboard', fr: 'Ajouter des graphiques au tableau de bord' },
        content: {
          en: 'Add charts to your dashboard:\n\n1. Go to Dashboard\n2. Click "Charts" button in header\n3. Browse available charts by category\n4. Click to add to dashboard\n5. Drag to reorder\n6. Lock dashboard when done\n\nYou can also remove charts by clicking the X on hover.',
          fr: 'Ajoutez des graphiques à votre tableau de bord:\n\n1. Allez au tableau de bord\n2. Cliquez sur le bouton "Graphiques" dans l\'en-tête\n3. Parcourez les graphiques disponibles par catégorie\n4. Cliquez pour ajouter au tableau de bord\n5. Glissez pour réorganiser\n6. Verrouillez le tableau de bord une fois terminé\n\nVous pouvez également supprimer des graphiques en cliquant sur le X au survol.'
        },
        url: '/app',
        tags: ['dashboard', 'charts', 'add', 'customize', 'reorder', 'widgets']
      },
    ],
  },
  {
    id: 'market-analysis',
    icon: TrendingUp,
    title: { en: 'Market Analysis', fr: 'Analyse de marché' },
    description: { en: 'Industry benchmarks and comparisons', fr: 'Benchmarks et comparaisons sectorielles' },
    articles: [
      { 
        id: 'industry-benchmarks', 
        title: { en: 'Industry Benchmarks', fr: 'Benchmarks sectoriels' },
        content: {
          en: 'Compare your performance to industry benchmarks:\n\n- Revenue growth rates\n- Profit margins (gross, operating, net)\n- Liquidity ratios\n- Debt ratios\n- Operating efficiency metrics\n\nBenchmarks are based on industry averages and updated quarterly. Select your industry in Company Settings for accurate comparisons.',
          fr: 'Comparez votre performance aux benchmarks sectoriels:\n\n- Taux de croissance des revenus\n- Marges bénéficiaires (brute, opérationnelle, nette)\n- Ratios de liquidité\n- Ratios d\'endettement\n- Métriques d\'efficacité opérationnelle\n\nLes benchmarks sont basés sur les moyennes sectorielles et mis à jour trimestriellement. Sélectionnez votre industrie dans les Paramètres de l\'entreprise pour des comparaisons précises.'
        },
        url: '/app/market-analysis',
        tags: ['benchmarks', 'industry', 'comparison', 'ratios', 'performance', 'competitors']
      },
      { 
        id: 'competitive-analysis', 
        title: { en: 'Competitive Analysis', fr: 'Analyse concurrentielle' },
        content: {
          en: 'Understand your competitive position:\n\n- See where you rank in your industry\n- Identify areas of strength and weakness\n- Track your position over time\n- Set improvement targets\n\nUse insights to make strategic decisions and improve performance.',
          fr: 'Comprenez votre position concurrentielle:\n\n- Voyez où vous vous situez dans votre industrie\n- Identifiez les forces et faiblesses\n- Suivez votre position dans le temps\n- Définissez des objectifs d\'amélioration\n\nUtilisez les insights pour prendre des décisions stratégiques et améliorer la performance.'
        },
        url: '/app/market-analysis',
        tags: ['competitive', 'analysis', 'ranking', 'position', 'strategy', 'improvement']
      },
      { 
        id: 'trend-analysis', 
        title: { en: 'Market Trends', fr: 'Tendances du marché' },
        content: {
          en: 'Track industry trends:\n\n- Industry-wide growth patterns\n- Seasonal variations\n- Economic indicators impact\n- Future projections\n\nUnderstand how external factors affect your business and industry.',
          fr: 'Suivez les tendances de l\'industrie:\n\n- Modèles de croissance à l\'échelle de l\'industrie\n- Variations saisonnières\n- Impact des indicateurs économiques\n- Projections futures\n\nComprenez comment les facteurs externes affectent votre entreprise et votre industrie.'
        },
        url: '/app/market-analysis',
        tags: ['trends', 'market', 'industry', 'growth', 'economic', 'seasonal']
      },
    ],
  },
  {
    id: 'tax-credits',
    icon: FileText,
    title: { en: 'Tax Credits', fr: 'Crédits d\'impôt' },
    description: { en: 'Discover eligible tax credits', fr: 'Découvrir les crédits d\'impôt éligibles' },
    articles: [
      { 
        id: 'eligibility', 
        title: { en: 'Tax Credit Eligibility', fr: 'Éligibilité aux crédits d\'impôt' },
        content: {
          en: 'Discover tax credits you may be eligible for:\n\n- SR&ED (Scientific Research & Experimental Development)\n- Digital Media Tax Credit\n- Film & Television Production Credits\n- Manufacturing Investment Tax Credit\n- Clean Technology Credits\n\nPlainLedger analyzes your financial data to identify potential eligibility.',
          fr: 'Découvrez les crédits d\'impôt auxquels vous pourriez être éligible:\n\n- RS&DE (Recherche scientifique et développement expérimental)\n- Crédit d\'impôt pour médias numériques\n- Crédits de production cinématographique et télévisuelle\n- Crédit d\'impôt pour investissement manufacturier\n- Crédits pour technologies propres\n\nPlainLedger analyse vos données financières pour identifier les éligibilités potentielles.'
        },
        url: '/app/tax-credits',
        tags: ['tax credits', 'eligibility', 'SRED', 'incentives', 'savings', 'government']
      },
      { 
        id: 'sred-guide', 
        title: { en: 'SR&ED Tax Credit Guide', fr: 'Guide du crédit RS&DE' },
        content: {
          en: 'Understanding SR&ED:\n\n- Federal credit: 15-35% of eligible expenditures\n- Provincial credits vary by province\n- Eligible activities: Research, development, testing\n- Eligible expenditures: Salaries, materials, contractors\n\nPlainLedger helps identify qualifying R&D activities in your business.',
          fr: 'Comprendre le RS&DE:\n\n- Crédit fédéral: 15-35% des dépenses éligibles\n- Crédits provinciaux varient selon la province\n- Activités éligibles: Recherche, développement, tests\n- Dépenses éligibles: Salaires, matériaux, sous-traitants\n\nPlainLedger aide à identifier les activités de R&D admissibles dans votre entreprise.'
        },
        url: '/app/tax-credits',
        tags: ['sred', 'rs&de', 'research', 'development', 'federal', 'provincial']
      },
      { 
        id: 'claim-process', 
        title: { en: 'Claiming Tax Credits', fr: 'Réclamer les crédits d\'impôt' },
        content: {
          en: 'How to claim tax credits:\n\n1. Review eligibility in PlainLedger\n2. Gather supporting documentation\n3. Work with a tax professional or CPA\n4. File claims with your tax return\n5. Track claim status\n\nPlainLedger provides reports to support your claims but does not file on your behalf.',
          fr: 'Comment réclamer les crédits d\'impôt:\n\n1. Examinez l\'éligibilité dans PlainLedger\n2. Rassemblez la documentation justificative\n3. Travaillez avec un professionnel fiscal ou CPA\n4. Déposez les réclamations avec votre déclaration\n5. Suivez l\'état des réclamations\n\nPlainLedger fournit des rapports pour soutenir vos réclamations mais ne dépose pas en votre nom.'
        },
        url: '/app/tax-credits',
        tags: ['claim', 'filing', 'documentation', 'CPA', 'accountant', 'process']
      },
    ],
  },
  {
    id: 'board-meeting',
    icon: FileText,
    title: { en: 'Board Meeting', fr: 'Réunion du CA' },
    description: { en: 'Generate board presentation packages', fr: 'Générer des présentations pour le CA' },
    articles: [
      { 
        id: 'presentation-package', 
        title: { en: 'Board Presentation Package', fr: 'Dossier de présentation CA' },
        content: {
          en: 'Generate professional board presentation packages:\n\n- Executive summary with key metrics\n- Financial performance highlights\n- Year-over-year comparisons\n- Industry benchmark positioning\n- Strategic recommendations\n\nExport as PDF for distribution to board members.',
          fr: 'Générez des dossiers de présentation professionnels pour le CA:\n\n- Résumé exécutif avec métriques clés\n- Points saillants de la performance financière\n- Comparaisons d\'une année à l\'autre\n- Positionnement par rapport aux benchmarks\n- Recommandations stratégiques\n\nExportez en PDF pour distribution aux membres du CA.'
        },
        url: '/app/board-meeting',
        tags: ['board', 'presentation', 'executive', 'summary', 'pdf', 'directors']
      },
      { 
        id: 'customize-presentation', 
        title: { en: 'Customize Presentations', fr: 'Personnaliser les présentations' },
        content: {
          en: 'Customize your board presentation:\n\n- Select which sections to include\n- Choose date ranges and comparisons\n- Add custom commentary and notes\n- Include company branding\n- Select chart styles and colors\n\nSave templates for recurring board meetings.',
          fr: 'Personnalisez votre présentation au CA:\n\n- Sélectionnez les sections à inclure\n- Choisissez les plages de dates et comparaisons\n- Ajoutez des commentaires et notes personnalisés\n- Incluez l\'image de marque de l\'entreprise\n- Sélectionnez les styles et couleurs des graphiques\n\nEnregistrez des modèles pour les réunions récurrentes.'
        },
        url: '/app/board-meeting',
        tags: ['customize', 'template', 'sections', 'branding', 'commentary']
      },
    ],
  },
  {
    id: 'strategic-planning',
    icon: Sparkles,
    title: { en: 'Strategic Planning', fr: 'Planification stratégique' },
    description: { en: 'Plan and forecast your business', fr: 'Planifier et prévoir votre entreprise' },
    articles: [
      { 
        id: 'expense-planning', 
        title: { en: 'Expense Planning', fr: 'Planification des dépenses' },
        content: {
          en: 'Plan your expenses strategically:\n\n- Create OPEX (operating expenses) plans\n- Plan CAPEX (capital expenditures)\n- Set recurring vs one-time expenses\n- Drag and drop timeline planning\n- Set confidence levels for estimates\n\nVisualize your planned expenses on an interactive timeline.',
          fr: 'Planifiez vos dépenses stratégiquement:\n\n- Créez des plans OPEX (dépenses opérationnelles)\n- Planifiez les CAPEX (dépenses en capital)\n- Définissez les dépenses récurrentes vs ponctuelles\n- Planification par glisser-déposer sur chronologie\n- Définissez les niveaux de confiance des estimations\n\nVisualisez vos dépenses prévues sur une chronologie interactive.'
        },
        url: '/app/strategic-planning',
        tags: ['expenses', 'opex', 'capex', 'planning', 'budget', 'forecast', 'timeline']
      },
      { 
        id: 'scenario-modeling', 
        title: { en: 'Scenario Modeling', fr: 'Modélisation de scénarios' },
        content: {
          en: 'Model different business scenarios:\n\n- Create "what-if" scenarios\n- Compare optimistic vs pessimistic outcomes\n- Assess impact of strategic decisions\n- Plan for different growth rates\n- Stress test your finances\n\nMake informed decisions with data-driven scenario analysis.',
          fr: 'Modélisez différents scénarios d\'affaires:\n\n- Créez des scénarios "et si"\n- Comparez les résultats optimistes vs pessimistes\n- Évaluez l\'impact des décisions stratégiques\n- Planifiez pour différents taux de croissance\n- Testez la résistance de vos finances\n\nPrenez des décisions éclairées avec une analyse de scénarios basée sur les données.'
        },
        url: '/app/strategic-planning',
        tags: ['scenarios', 'modeling', 'what-if', 'forecast', 'simulation', 'planning']
      },
      { 
        id: 'goals-tracking', 
        title: { en: 'Goals & KPI Tracking', fr: 'Suivi des objectifs et KPI' },
        content: {
          en: 'Track progress towards your goals:\n\n- Set financial targets\n- Define key milestones\n- Monitor progress in real-time\n- Get alerts when off-track\n- Celebrate achievements\n\nAlign your team around shared objectives.',
          fr: 'Suivez la progression vers vos objectifs:\n\n- Définissez des cibles financières\n- Définissez des jalons clés\n- Suivez la progression en temps réel\n- Recevez des alertes si hors trajectoire\n- Célébrez les réalisations\n\nAlignez votre équipe autour d\'objectifs partagés.'
        },
        url: '/app/strategic-planning',
        tags: ['goals', 'kpi', 'targets', 'milestones', 'tracking', 'objectives']
      },
    ],
  },
  {
    id: 'sharing',
    icon: Link2,
    title: { en: 'Sharing & Collaboration', fr: 'Partage & Collaboration' },
    description: { en: 'Share reports and documents', fr: 'Partager rapports et documents' },
    articles: [
      { 
        id: 'share-reports', 
        title: { en: 'Share Reports', fr: 'Partager des rapports' },
        content: {
          en: 'Share reports with stakeholders:\n\n1. Generate any report\n2. Click the Share button\n3. Set expiration date\n4. Optionally add password protection\n5. Copy and send the link\n\nRecipients can view without logging in. Track who viewed your shared reports.',
          fr: 'Partagez des rapports avec les parties prenantes:\n\n1. Générez n\'importe quel rapport\n2. Cliquez sur le bouton Partager\n3. Définissez une date d\'expiration\n4. Ajoutez optionnellement une protection par mot de passe\n5. Copiez et envoyez le lien\n\nLes destinataires peuvent voir sans se connecter. Suivez qui a consulté vos rapports partagés.'
        },
        url: '/app/reports',
        tags: ['share', 'reports', 'link', 'password', 'expiration', 'stakeholders']
      },
      { 
        id: 'document-shares', 
        title: { en: 'Document Shares', fr: 'Partage de documents' },
        content: {
          en: 'Manage your shared documents:\n\n- View all active shares\n- See view counts and last accessed\n- Revoke access anytime\n- Update passwords\n- Extend expiration dates\n\nAccess via Settings > Document Shares.',
          fr: 'Gérez vos documents partagés:\n\n- Voir tous les partages actifs\n- Voir le nombre de vues et dernier accès\n- Révoquez l\'accès à tout moment\n- Mettez à jour les mots de passe\n- Prolongez les dates d\'expiration\n\nAccès via Paramètres > Partage de documents.'
        },
        url: '/app/document-shares',
        tags: ['documents', 'shares', 'manage', 'revoke', 'access', 'security']
      },
    ],
  },
];

// Popular articles (based on typical user needs)
const POPULAR_ARTICLE_IDS = [
  { topicId: 'getting-started', articleId: 'quick-start' },
  { topicId: 'connections', articleId: 'connect-quickbooks' },
  { topicId: 'visualizations', articleId: 'chart-types' },
  { topicId: 'market-analysis', articleId: 'industry-benchmarks' },
  { topicId: 'anomalies', articleId: 'threshold-config' },
  { topicId: 'settings', articleId: 'profile' },
];

// =====================================================
// SEARCH UTILITIES
// =====================================================

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fuzzyMatch(text: string, query: string): { match: boolean; score: number } {
  const normalizedText = normalizeText(text);
  const normalizedQuery = normalizeText(query);
  
  // Exact match gets highest score
  if (normalizedText.includes(normalizedQuery)) {
    // Boost score if it's a word start match
    const wordStartMatch = normalizedText.split(' ').some(word => word.startsWith(normalizedQuery));
    return { match: true, score: wordStartMatch ? 100 : 80 };
  }
  
  // Word-by-word matching
  const queryWords = normalizedQuery.split(' ').filter(w => w.length > 1);
  const textWords = normalizedText.split(' ');
  
  let matchedWords = 0;
  for (const queryWord of queryWords) {
    if (textWords.some(tw => tw.includes(queryWord) || queryWord.includes(tw))) {
      matchedWords++;
    }
  }
  
  if (matchedWords > 0) {
    return { match: true, score: (matchedWords / queryWords.length) * 60 };
  }
  
  return { match: false, score: 0 };
}

function searchKnowledgeBase(query: string, language: 'en' | 'fr'): SearchResult[] {
  if (!query.trim()) return [];
  
  const results: SearchResult[] = [];
  
  for (const topic of HELP_TOPICS) {
    // Search in topic title and description
    const topicTitle = language === 'en' ? topic.title.en : topic.title.fr;
    const topicDesc = language === 'en' ? topic.description.en : topic.description.fr;
    
    const titleMatch = fuzzyMatch(topicTitle, query);
    const descMatch = fuzzyMatch(topicDesc, query);
    
    if (titleMatch.match || descMatch.match) {
      const matchedFields: string[] = [];
      if (titleMatch.match) matchedFields.push('title');
      if (descMatch.match) matchedFields.push('description');
      
      results.push({
        type: 'topic',
        topicId: topic.id,
        topic,
        score: Math.max(titleMatch.score * 1.2, descMatch.score), // Boost topic title matches
        matchedFields,
      });
    }
    
    // Search in articles
    for (const article of topic.articles) {
      const articleTitle = language === 'en' ? article.title.en : article.title.fr;
      const articleContent = article.content 
        ? (language === 'en' ? article.content.en : article.content.fr) 
        : '';
      const tags = article.tags?.join(' ') || '';
      
      const aTitleMatch = fuzzyMatch(articleTitle, query);
      const aContentMatch = fuzzyMatch(articleContent, query);
      const aTagsMatch = fuzzyMatch(tags, query);
      
      if (aTitleMatch.match || aContentMatch.match || aTagsMatch.match) {
        const matchedFields: string[] = [];
        if (aTitleMatch.match) matchedFields.push('title');
        if (aContentMatch.match) matchedFields.push('content');
        if (aTagsMatch.match) matchedFields.push('tags');
        
        results.push({
          type: 'article',
          topicId: topic.id,
          articleId: article.id,
          topic,
          article,
          score: Math.max(
            aTitleMatch.score * 1.5, // Boost title matches the most
            aTagsMatch.score * 1.2,  // Tags are also important
            aContentMatch.score * 0.8 // Content matches are less precise
          ),
          matchedFields,
        });
      }
    }
  }
  
  // Sort by score descending
  return results.sort((a, b) => b.score - a.score);
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  
  const normalizedQuery = normalizeText(query);
  const queryWords = normalizedQuery.split(' ').filter(w => w.length > 1);
  
  if (queryWords.length === 0) return text;
  
  // Create regex pattern for all query words
  const pattern = queryWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');
  
  const parts = text.split(regex);
  
  return parts.map((part, i) => {
    const isMatch = queryWords.some(qw => normalizeText(part).includes(qw));
    if (isMatch) {
      return (
        <mark 
          key={i} 
          className="bg-yellow-200 dark:bg-yellow-800 text-inherit rounded px-0.5"
        >
          {part}
        </mark>
      );
    }
    return part;
  });
}

// =====================================================
// COMPONENTS
// =====================================================

function SearchBar({ 
  value, 
  onChange, 
  onClear,
  placeholder,
  autoFocus = false,
}: { 
  value: string; 
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
        onClear();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClear]);
  
  return (
    <div 
      className="relative flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all focus-within:border-primary-500 focus-within:shadow-lg"
      style={{ 
        borderColor: 'rgb(var(--color-border))',
        backgroundColor: 'rgb(var(--color-surface))'
      }}
    >
      <Search 
        className="w-5 h-5 flex-shrink-0" 
        style={{ color: 'rgb(var(--color-text-muted))' }} 
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="flex-1 bg-transparent outline-none text-base"
        style={{ color: 'rgb(var(--color-text))' }}
      />
      {value && (
        <button
          onClick={onClear}
          className="p-1 rounded-md hover:bg-muted transition-colors"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          <X className="w-4 h-4" />
        </button>
      )}
      <kbd 
        className="hidden sm:flex items-center gap-0.5 px-2 py-1 rounded text-xs border"
        style={{ 
          borderColor: 'rgb(var(--color-border))',
          color: 'rgb(var(--color-text-muted))',
          backgroundColor: 'rgb(var(--color-bg-muted))'
        }}
      >
        <Command className="w-3 h-3" />K
      </kbd>
    </div>
  );
}

function SearchResults({ 
  results, 
  query,
  isEn,
  onNavigate,
}: { 
  results: SearchResult[];
  query: string;
  isEn: boolean;
  onNavigate: (path: string) => void;
}) {
  if (results.length === 0) {
    return (
      <div 
        className="text-center py-12 px-6 rounded-xl border"
        style={{ 
          borderColor: 'rgb(var(--color-border))',
          backgroundColor: 'rgb(var(--color-surface))'
        }}
      >
        <Search className="w-12 h-12 mx-auto mb-4 opacity-30" style={{ color: 'rgb(var(--color-text-muted))' }} />
        <p className="text-lg font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'No results found' : 'Aucun résultat trouvé'}
        </p>
        <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn 
            ? 'Try different keywords or browse topics below' 
            : 'Essayez d\'autres mots-clés ou parcourez les sujets ci-dessous'}
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium mb-3" style={{ color: 'rgb(var(--color-text-muted))' }}>
        {results.length} {isEn ? 'results found' : 'résultats trouvés'}
      </p>
      {results.slice(0, 10).map((result, idx) => {
        const path = result.type === 'topic'
          ? `/help/knowledge-base/${result.topicId}`
          : `/help/knowledge-base/${result.topicId}/${result.articleId}`;
        
        const title = result.type === 'topic'
          ? (isEn ? result.topic.title.en : result.topic.title.fr)
          : (isEn ? result.article!.title.en : result.article!.title.fr);
        
        const subtitle = result.type === 'topic'
          ? (isEn ? result.topic.description.en : result.topic.description.fr)
          : (isEn ? result.topic.title.en : result.topic.title.fr);
        
        const Icon = result.topic.icon;
        
        return (
          <button
            key={`${result.topicId}-${result.articleId || 'topic'}-${idx}`}
            onClick={() => onNavigate(path)}
            className="w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-all hover:border-primary-500 hover:shadow-md group"
            style={{ 
              borderColor: 'rgb(var(--color-border))',
              backgroundColor: 'rgb(var(--color-surface))'
            }}
          >
            <div 
              className="p-2 rounded-lg flex-shrink-0 transition-colors group-hover:bg-primary-500/20"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              {result.type === 'topic' ? (
                <Icon className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
              ) : (
                <FileText className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span 
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ 
                    backgroundColor: result.type === 'topic' 
                      ? 'rgb(var(--color-primary-500) / 0.15)' 
                      : 'rgb(var(--color-success) / 0.15)',
                    color: result.type === 'topic' 
                      ? 'rgb(var(--color-primary-600))' 
                      : 'rgb(var(--color-success))'
                  }}
                >
                  {result.type === 'topic' 
                    ? (isEn ? 'Topic' : 'Sujet') 
                    : (isEn ? 'Article' : 'Article')}
                </span>
              </div>
              <h3 
                className="font-semibold mb-1 group-hover:text-primary-600 transition-colors"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {highlightText(title, query)}
              </h3>
              <p 
                className="text-sm line-clamp-1"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {highlightText(subtitle, query)}
              </p>
            </div>
            <ArrowRight 
              className="w-5 h-5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: 'rgb(var(--color-primary-500))' }}
            />
          </button>
        );
      })}
    </div>
  );
}

function PopularArticles({ isEn, navigate }: { isEn: boolean; navigate: (path: string) => void }) {
  const articles = POPULAR_ARTICLE_IDS.map(({ topicId, articleId }) => {
    const topic = HELP_TOPICS.find(t => t.id === topicId);
    const article = topic?.articles.find(a => a.id === articleId);
    return { topic, article, topicId, articleId };
  }).filter(a => a.topic && a.article);
  
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
        <h2 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Popular Articles' : 'Articles populaires'}
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {articles.map(({ topic, article, topicId, articleId }) => (
          <button
            key={articleId}
            onClick={() => navigate(`/help/knowledge-base/${topicId}/${articleId}`)}
            className="flex items-center gap-3 p-3 rounded-lg border text-left transition-all hover:border-primary-500 hover:bg-muted group"
            style={{ 
              borderColor: 'rgb(var(--color-border))',
              backgroundColor: 'rgb(var(--color-surface))'
            }}
          >
            <FileText className="w-4 h-4 flex-shrink-0" style={{ color: 'rgb(var(--color-primary-500))' }} />
            <span 
              className="text-sm font-medium flex-1 truncate group-hover:text-primary-600"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? article!.title.en : article!.title.fr}
            </span>
            <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-50 group-hover:opacity-100" style={{ color: 'rgb(var(--color-text-muted))' }} />
          </button>
        ))}
      </div>
    </div>
  );
}

function TopicCard({ 
  topic, 
  isEn, 
  navigate 
}: { 
  topic: HelpTopic; 
  isEn: boolean;
  navigate: (path: string) => void;
}) {
  const Icon = topic.icon;
  
  return (
    <button
      onClick={() => navigate(`/help/knowledge-base/${topic.id}`)}
      className="p-6 rounded-xl border text-left transition-all hover:border-primary-500 hover:shadow-lg hover:scale-[1.02] group"
      style={{ 
        borderColor: 'rgb(var(--color-border))',
        backgroundColor: 'rgb(var(--color-surface))'
      }}
    >
      <div className="flex items-start gap-4">
        <div 
          className="p-3 rounded-lg transition-colors group-hover:bg-primary-500/20"
          style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
        >
          <Icon className="w-6 h-6" style={{ color: 'rgb(var(--color-primary-500))' }} />
        </div>
        <div className="flex-1">
          <h3 
            className="font-semibold text-lg mb-1 group-hover:text-primary-600 transition-colors"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? topic.title.en : topic.title.fr}
          </h3>
          <p className="text-sm mb-3" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? topic.description.en : topic.description.fr}
          </p>
          <p className="text-xs" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {topic.articles.length} {isEn ? 'articles' : 'articles'}
          </p>
        </div>
        <ChevronRight 
          className="w-5 h-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" 
          style={{ color: 'rgb(var(--color-text-muted))' }} 
        />
      </div>
    </button>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function KnowledgeBase() {
  const { topicId, articleId } = useParams<{ topicId?: string; articleId?: string }>();
  const navigate = useNavigate();
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  // Memoized search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchKnowledgeBase(searchQuery, language as 'en' | 'fr');
  }, [searchQuery, language]);
  
  const handleNavigate = useCallback((path: string) => {
    setSearchQuery('');
    navigate(path);
  }, [navigate]);
  
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // SEO for main page
  useKnowledgeBaseSEO(
    isEn ? 'Knowledge Base' : 'Base de connaissances',
    isEn 
      ? 'Find answers about PlainLedger features, integrations, reports, and more. Search our comprehensive help documentation.'
      : 'Trouvez des réponses sur les fonctionnalités, intégrations, rapports PlainLedger et plus. Recherchez notre documentation d\'aide complète.'
  );

  // =====================================================
  // RENDER: Main search view (no topic selected)
  // =====================================================
  if (!topicId) {
    return (
      <div className="h-full overflow-auto">
        {/* Hero Section with Gradient Background */}
        <div 
          className="relative"
          style={{ 
            background: 'linear-gradient(135deg, rgb(var(--color-primary-500) / 0.08) 0%, rgb(var(--color-primary-600) / 0.04) 50%, transparent 100%)'
          }}
        >
          {/* Decorative Elements */}
          <div 
            className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-30 blur-3xl pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgb(var(--color-primary-500) / 0.15) 0%, transparent 70%)' }}
          />
          <div 
            className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgb(var(--color-primary-400) / 0.2) 0%, transparent 70%)' }}
          />
          
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-12">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
                style={{ 
                  backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                  border: '1px solid rgb(var(--color-primary-500) / 0.2)'
                }}
              >
                <BookOpen className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
                <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-primary-600))' }}>
                  {isEn ? 'Help Center' : 'Centre d\'aide'}
                </span>
              </div>
              <h1 className="text-4xl font-bold mb-3" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Knowledge Base' : 'Base de connaissances'}
              </h1>
              <p className="text-lg max-w-xl mx-auto" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn 
                  ? 'Find answers to your questions about PlainLedger' 
                  : 'Trouvez des réponses à vos questions sur PlainLedger'}
              </p>
            </div>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onClear={handleClearSearch}
                placeholder={isEn ? 'Search articles, topics, features...' : 'Rechercher articles, sujets, fonctionnalités...'}
                autoFocus
              />
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div 
          className="px-4 sm:px-6 py-8"
          style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}
        >
          <div className="max-w-4xl mx-auto">
            {/* Search Results or Default Content */}
            {searchQuery.trim() ? (
              <SearchResults 
                results={searchResults}
                query={searchQuery}
                isEn={isEn}
                onNavigate={handleNavigate}
              />
            ) : (
              <>
                {/* Popular Articles */}
                <PopularArticles isEn={isEn} navigate={handleNavigate} />
                
                {/* All Topics */}
                <div className="mb-6">
                  <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
                    <Book className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
                    {isEn ? 'Browse by Topic' : 'Parcourir par sujet'}
                  </h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {HELP_TOPICS.map((topic) => (
                    <TopicCard 
                      key={topic.id}
                      topic={topic}
                      isEn={isEn}
                      navigate={handleNavigate}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // RENDER: Topic not found
  // =====================================================
  const topic = HELP_TOPICS.find(t => t.id === topicId);
  if (!topic) {
    return (
      <div className="h-full overflow-auto" style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <p style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Topic not found' : 'Sujet introuvable'}
          </p>
          <Link
            to="/help/knowledge-base"
            className="text-sm underline"
            style={{ color: 'rgb(var(--color-primary-500))' }}
          >
            {isEn ? 'Back to Knowledge Base' : 'Retour à la base de connaissances'}
          </Link>
        </div>
      </div>
    );
  }

  // =====================================================
  // RENDER: Article view
  // =====================================================
  if (articleId) {
    const article = topic.articles.find(a => a.id === articleId);
    if (!article) {
      return (
        <div className="h-full overflow-auto" style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}>
          <div className="max-w-4xl mx-auto px-6 py-8">
            <p style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Article not found' : 'Article introuvable'}
            </p>
            <Link
              to={`/help/knowledge-base/${topicId}`}
              className="text-sm underline"
              style={{ color: 'rgb(var(--color-primary-500))' }}
            >
              {isEn ? 'Back to Topic' : 'Retour au sujet'}
            </Link>
          </div>
        </div>
      );
    }

    const TopicIcon = topic.icon;

    return (
      <div className="h-full overflow-auto" style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          {/* Breadcrumb */}
          <nav 
            className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm mb-6 flex-wrap" 
            style={{ color: 'rgb(var(--color-text-muted))' }}
            aria-label="Breadcrumb"
          >
            <Link 
              to="/help/knowledge-base" 
              className="hover:underline shrink-0"
              style={{ color: 'rgb(var(--color-primary-500))' }}
            >
              {isEn ? 'Knowledge Base' : 'Base de connaissances'}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <Link 
              to={`/help/knowledge-base/${topicId}`}
              className="hover:underline shrink-0"
              style={{ color: 'rgb(var(--color-primary-500))' }}
            >
              {isEn ? topic.title.en : topic.title.fr}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate max-w-[150px] sm:max-w-none">
              {isEn ? article.title.en : article.title.fr}
            </span>
          </nav>

          <article>
            {/* Article Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                >
                  <TopicIcon className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
                </div>
                <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-primary-600))' }}>
                  {isEn ? topic.title.en : topic.title.fr}
                </span>
              </div>
              <h1 className="text-3xl font-bold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? article.title.en : article.title.fr}
              </h1>
              
              {/* Tags */}
              {article.tags && article.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {article.tags.slice(0, 5).map(tag => (
                    <span 
                      key={tag}
                      className="text-xs px-2 py-1 rounded-full"
                      style={{ 
                        backgroundColor: 'rgb(var(--color-bg-muted))',
                        color: 'rgb(var(--color-text-muted))'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Article Content */}
            <div 
              className="p-6 rounded-xl mb-6"
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))',
                color: 'rgb(var(--color-text))'
              }}
            >
              <div className="whitespace-pre-line text-base leading-relaxed">
                {article.content ? (isEn ? article.content.en : article.content.fr) : (
                  <p>{isEn ? 'Content coming soon...' : 'Contenu à venir...'}</p>
                )}
              </div>
            </div>

            {/* CTA Button */}
            {article.url && (
              <div className="flex items-center gap-4">
                <Link
                  to={article.url}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all hover:scale-105"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-primary-500))',
                    color: 'white'
                  }}
                >
                  {isEn ? 'Go to Feature' : 'Aller à la fonctionnalité'}
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            )}
          </article>

          {/* Related Articles */}
          <div className="mt-12 pt-8 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <h2 className="font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'More from this topic' : 'Plus sur ce sujet'}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {topic.articles
                .filter(a => a.id !== articleId)
                .slice(0, 4)
                .map(relatedArticle => (
                  <Link
                    key={relatedArticle.id}
                    to={`/help/knowledge-base/${topicId}/${relatedArticle.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg border transition-all hover:border-primary-500 hover:bg-muted group"
                    style={{ 
                      borderColor: 'rgb(var(--color-border))',
                      backgroundColor: 'rgb(var(--color-surface))'
                    }}
                  >
                    <FileText className="w-4 h-4 flex-shrink-0" style={{ color: 'rgb(var(--color-primary-500))' }} />
                    <span 
                      className="text-sm font-medium flex-1 truncate group-hover:text-primary-600"
                      style={{ color: 'rgb(var(--color-text))' }}
                    >
                      {isEn ? relatedArticle.title.en : relatedArticle.title.fr}
                    </span>
                    <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-50" style={{ color: 'rgb(var(--color-text-muted))' }} />
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // RENDER: Topic view (article list)
  // =====================================================
  const TopicIcon = topic.icon;
  
  return (
    <div className="h-full overflow-auto" style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <nav 
          className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm mb-6 flex-wrap" 
          style={{ color: 'rgb(var(--color-text-muted))' }}
          aria-label="Breadcrumb"
        >
          <Link 
            to="/help/knowledge-base" 
            className="hover:underline shrink-0"
            style={{ color: 'rgb(var(--color-primary-500))' }}
          >
            {isEn ? 'Knowledge Base' : 'Base de connaissances'}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="truncate max-w-[200px] sm:max-w-none">
            {isEn ? topic.title.en : topic.title.fr}
          </span>
        </nav>

        {/* Topic Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div 
              className="p-4 rounded-xl"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <TopicIcon className="w-8 h-8" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? topic.title.en : topic.title.fr}
              </h1>
              <p className="text-lg" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? topic.description.en : topic.description.fr}
              </p>
            </div>
          </div>
        </div>

        {/* Articles List */}
        <div className="space-y-3">
          {topic.articles.map((article) => (
            <Link
              key={article.id}
              to={`/help/knowledge-base/${topicId}/${article.id}`}
              className="flex items-start gap-4 p-5 rounded-xl border transition-all hover:border-primary-500 hover:shadow-md group"
              style={{ 
                borderColor: 'rgb(var(--color-border))',
                backgroundColor: 'rgb(var(--color-surface))'
              }}
            >
              <div 
                className="p-2 rounded-lg flex-shrink-0 transition-colors group-hover:bg-primary-500/20"
                style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
              >
                <FileText className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 
                  className="font-semibold mb-1 group-hover:text-primary-600 transition-colors"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn ? article.title.en : article.title.fr}
                </h3>
                {article.content && (
                  <p 
                    className="text-sm line-clamp-2"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  >
                    {isEn ? article.content.en : article.content.fr}
                  </p>
                )}
                {/* Tags */}
                {article.tags && article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {article.tags.slice(0, 3).map(tag => (
                      <span 
                        key={tag}
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ 
                          backgroundColor: 'rgb(var(--color-bg-muted))',
                          color: 'rgb(var(--color-text-muted))'
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <ChevronRight 
                className="w-5 h-5 flex-shrink-0 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" 
                style={{ color: 'rgb(var(--color-text-muted))' }} 
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
