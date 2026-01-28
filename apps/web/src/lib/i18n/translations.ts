/**
 * PlainLedger Internationalization
 * Complete translations for English and French
 */

export type Language = 'en' | 'fr';

export const translations = {
  // ============================================================================
  // COMMON
  // ============================================================================
  common: {
    appName: {
      en: 'PlainLedger',
      fr: 'PlainLedger',
    },
    loading: {
      en: 'Loading...',
      fr: 'Chargement...',
    },
    save: {
      en: 'Save',
      fr: 'Enregistrer',
    },
    cancel: {
      en: 'Cancel',
      fr: 'Annuler',
    },
    delete: {
      en: 'Delete',
      fr: 'Supprimer',
    },
    edit: {
      en: 'Edit',
      fr: 'Modifier',
    },
    create: {
      en: 'Create',
      fr: 'Créer',
    },
    add: {
      en: 'Add',
      fr: 'Ajouter',
    },
    remove: {
      en: 'Remove',
      fr: 'Retirer',
    },
    close: {
      en: 'Close',
      fr: 'Fermer',
    },
    confirm: {
      en: 'Confirm',
      fr: 'Confirmer',
    },
    back: {
      en: 'Back',
      fr: 'Retour',
    },
    next: {
      en: 'Next',
      fr: 'Suivant',
    },
    previous: {
      en: 'Previous',
      fr: 'Précédent',
    },
    search: {
      en: 'Search',
      fr: 'Rechercher',
    },
    searchPlaceholder: {
      en: 'Search anything...',
      fr: 'Rechercher...',
    },
    noResults: {
      en: 'No results found',
      fr: 'Aucun résultat trouvé',
    },
    recentSearches: {
      en: 'Recent',
      fr: 'Récents',
    },
    clearSearch: {
      en: 'Clear',
      fr: 'Effacer',
    },
    filter: {
      en: 'Filter',
      fr: 'Filtrer',
    },
    export: {
      en: 'Export',
      fr: 'Exporter',
    },
    import: {
      en: 'Import',
      fr: 'Importer',
    },
    download: {
      en: 'Download',
      fr: 'Télécharger',
    },
    upload: {
      en: 'Upload',
      fr: 'Téléverser',
    },
    refresh: {
      en: 'Refresh',
      fr: 'Actualiser',
    },
    refreshing: {
      en: 'Refreshing...',
      fr: 'Actualisation...',
    },
    viewAll: {
      en: 'View all',
      fr: 'Voir tout',
    },
    viewDetails: {
      en: 'View details',
      fr: 'Voir les détails',
    },
    learnMore: {
      en: 'Learn more',
      fr: 'En savoir plus',
    },
    getStarted: {
      en: 'Get started',
      fr: 'Commencer',
    },
    yes: {
      en: 'Yes',
      fr: 'Oui',
    },
    no: {
      en: 'No',
      fr: 'Non',
    },
    or: {
      en: 'or',
      fr: 'ou',
    },
    and: {
      en: 'and',
      fr: 'et',
    },
    all: {
      en: 'All',
      fr: 'Tous',
    },
    none: {
      en: 'None',
      fr: 'Aucun',
    },
    optional: {
      en: 'Optional',
      fr: 'Optionnel',
    },
    required: {
      en: 'Required',
      fr: 'Requis',
    },
  },

  // ============================================================================
  // NAVIGATION
  // ============================================================================
  nav: {
    dashboard: {
      en: 'Dashboard',
      fr: 'Tableau de bord',
    },
    visualizations: {
      en: 'Visualizations',
      fr: 'Visualisations',
    },
    anomalies: {
      en: 'Anomalies',
      fr: 'Anomalies',
    },
    connections: {
      en: 'Connections',
      fr: 'Connexions',
    },
    reports: {
      en: 'Reports',
      fr: 'Rapports',
    },
    settings: {
      en: 'Settings',
      fr: 'Paramètres',
    },
    boardMeeting: {
      en: 'Board Meeting',
      fr: 'Réunion CA',
    },
    help: {
      en: 'Help Center',
      fr: 'Centre d\'aide',
    },
    logout: {
      en: 'Log out',
      fr: 'Déconnexion',
    },
    login: {
      en: 'Log in',
      fr: 'Connexion',
    },
    signup: {
      en: 'Sign up',
      fr: 'S\'inscrire',
    },
  },

  // ============================================================================
  // DASHBOARD
  // ============================================================================
  dashboard: {
    title: {
      en: 'Dashboard',
      fr: 'Tableau de bord',
    },
    subtitle: {
      en: 'Real-time financial overview',
      fr: 'Aperçu financier en temps réel',
    },
    greeting: {
      en: 'Hello',
      fr: 'Bonjour',
    },
    period: {
      month: {
        en: 'Month',
        fr: 'Mois',
      },
      quarter: {
        en: 'Quarter',
        fr: 'Trim.',
      },
      year: {
        en: 'Year',
        fr: 'Année',
      },
    },
    generateReport: {
      en: 'Generate report',
      fr: 'Générer rapport',
    },
    dataUpdated: {
      en: 'Data updated',
      fr: 'Données actualisées',
    },
    allDataUpToDate: {
      en: 'All data is up to date',
      fr: 'Toutes les données sont à jour',
    },

    // KPIs
    kpi: {
      revenue: {
        en: 'Revenue',
        fr: 'Revenus',
      },
      cash: {
        en: 'Cash',
        fr: 'Trésorerie',
      },
      cashFlow: {
        en: 'Cash Flow',
        fr: 'Flux de trésorerie',
      },
      netCashFlow: {
        en: 'Net Cash Flow',
        fr: 'Flux net',
      },
      workingCapital: {
        en: 'Working Capital',
        fr: 'Fonds de roulement',
      },
      runway: {
        en: 'months runway',
        fr: 'mois runway',
      },
      thisMonth: {
        en: 'This month',
        fr: 'Ce mois',
      },
      vsPrior: {
        en: 'vs prior',
        fr: 'vs précédent',
      },
      assetsMinusLiabilities: {
        en: 'Assets - ST Liabilities',
        fr: 'Actifs - Passifs CT',
      },
    },

    // Ratios
    ratios: {
      currentRatio: {
        en: 'Current Ratio',
        fr: 'Liquidité générale',
      },
      quickRatio: {
        en: 'Quick Ratio',
        fr: 'Liquidité immédiate',
      },
      grossMargin: {
        en: 'Gross Margin',
        fr: 'Marge brute',
      },
      netMargin: {
        en: 'Net Margin',
        fr: 'Marge nette',
      },
      dso: {
        en: 'DSO',
        fr: 'DSO',
      },
      dpo: {
        en: 'DPO',
        fr: 'DPO',
      },
      vs: {
        en: 'vs',
        fr: 'vs',
      },
    },

    // Health Score
    healthScore: {
      title: {
        en: 'Financial Health Score',
        fr: 'Score de santé financière',
      },
      excellent: {
        en: 'Excellent',
        fr: 'Excellent',
      },
      good: {
        en: 'Good',
        fr: 'Bon',
      },
      attention: {
        en: 'Attention Required',
        fr: 'Attention requise',
      },
      critical: {
        en: 'Critical',
        fr: 'Critique',
      },
      criticalIssues: {
        en: 'critical issue',
        fr: 'problème critique',
      },
      criticalIssuesPlural: {
        en: 'critical issues',
        fr: 'problèmes critiques',
      },
      warnings: {
        en: 'warning',
        fr: 'avertissement',
      },
      warningsPlural: {
        en: 'warnings',
        fr: 'avertissements',
      },
      info: {
        en: 'information',
        fr: 'information',
      },
      infoPlural: {
        en: 'informations',
        fr: 'informations',
      },
      noAnomalies: {
        en: 'No anomalies detected',
        fr: 'Aucune anomalie détectée',
      },
    },

    // Alerts
    alerts: {
      criticalAnomalies: {
        en: 'critical anomalies detected',
        fr: 'anomalies critiques détectées',
      },
      criticalAnomaly: {
        en: 'critical anomaly detected',
        fr: 'anomalie critique détectée',
      },
      actionRequired: {
        en: 'Action required - Click to review',
        fr: 'Action requise - Cliquez pour examiner',
      },
      attentionPoints: {
        en: 'Attention Points',
        fr: 'Points d\'attention',
      },
      noAnomaliesDetected: {
        en: 'No anomalies detected',
        fr: 'Aucune anomalie détectée',
      },
      dataConsistent: {
        en: 'Your financial data is consistent',
        fr: 'Vos données financières sont cohérentes',
      },
    },

    // Quick Actions
    quickActions: {
      anomalies: {
        en: 'Anomalies',
        fr: 'Anomalies',
      },
      toReview: {
        en: 'to review',
        fr: 'à réviser',
      },
      balanceSheet: {
        en: 'Balance Sheet',
        fr: 'Bilan',
      },
      financialStatement: {
        en: 'Financial statement',
        fr: 'État financier',
      },
      reports: {
        en: 'Reports',
        fr: 'Rapports',
      },
      allReports: {
        en: 'All reports',
        fr: 'Tous les rapports',
      },
      connections: {
        en: 'Connections',
        fr: 'Connexions',
      },
      dataSources: {
        en: 'Data sources',
        fr: 'Sources de données',
      },
    },

    // Charts
    charts: {
      revenue: {
        en: 'Revenue',
        fr: 'Revenus',
      },
      last12Months: {
        en: '12 last months',
        fr: '12 derniers mois',
      },
      cashFlow: {
        en: 'Cash Flow',
        fr: 'Flux de trésorerie',
      },
      operational: {
        en: 'Operational',
        fr: 'Opérationnel',
      },
      thresholds: {
        en: 'Thresholds',
        fr: 'Seuils',
      },
      normalZone: {
        en: 'Normal zone',
        fr: 'Zone normale',
      },
      attentionZone: {
        en: 'Attention',
        fr: 'Attention',
      },
      criticalZone: {
        en: 'Critical',
        fr: 'Critique',
      },
      upTrend: {
        en: 'Upward trend',
        fr: 'Tendance haussière',
      },
      downTrend: {
        en: 'Downward trend',
        fr: 'Tendance baissière',
      },
      anomaliesDetected: {
        en: 'anomalies',
        fr: 'anomalies',
      },
      anomalyDetected: {
        en: 'anomaly',
        fr: 'anomalie',
      },
    },
  },

  // ============================================================================
  // ANOMALIES
  // ============================================================================
  anomalies: {
    title: {
      en: 'Anomaly Detection',
      fr: 'Détection d\'anomalies',
    },
    subtitle: {
      en: 'Automatic analysis of your financial data',
      fr: 'Analyse automatique de vos données financières',
    },
    noAnomalies: {
      en: 'No anomalies',
      fr: 'Aucune anomalie',
    },
    exportCsv: {
      en: 'Export CSV',
      fr: 'Exporter CSV',
    },
    configureThresholds: {
      en: 'Configure thresholds',
      fr: 'Configurer seuils',
    },
    severity: {
      critical: {
        en: 'Critical',
        fr: 'Critique',
      },
      warning: {
        en: 'Warning',
        fr: 'Attention',
      },
      info: {
        en: 'Information',
        fr: 'Information',
      },
    },
    categories: {
      variance: {
        en: 'Variance',
        fr: 'Variance',
      },
      trend: {
        en: 'Trend',
        fr: 'Tendance',
      },
      ratio: {
        en: 'Ratio',
        fr: 'Ratio',
      },
      balance: {
        en: 'Balance',
        fr: 'Solde',
      },
      outlier: {
        en: 'Outlier',
        fr: 'Valeur aberrante',
      },
    },
    details: {
      en: 'Details',
      fr: 'Détails',
    },
    recommendation: {
      en: 'Recommendation',
      fr: 'Recommandation',
    },
    affectedAccount: {
      en: 'Affected account',
      fr: 'Compte affecté',
    },
    affectedPeriod: {
      en: 'Affected period',
      fr: 'Période affectée',
    },
  },

  // ============================================================================
  // CONNECTIONS
  // ============================================================================
  connections: {
    title: {
      en: 'Connections',
      fr: 'Connexions',
    },
    subtitle: {
      en: 'Connect your accounting software',
      fr: 'Connectez votre logiciel comptable',
    },
    connected: {
      en: 'Connected',
      fr: 'Connecté',
    },
    disconnected: {
      en: 'Disconnected',
      fr: 'Déconnecté',
    },
    pending: {
      en: 'Pending',
      fr: 'En attente',
    },
    error: {
      en: 'Error',
      fr: 'Erreur',
    },
    connect: {
      en: 'Connect',
      fr: 'Connecter',
    },
    disconnect: {
      en: 'Disconnect',
      fr: 'Déconnecter',
    },
    reconnect: {
      en: 'Reconnect',
      fr: 'Reconnecter',
    },
    sync: {
      en: 'Sync',
      fr: 'Synchroniser',
    },
    syncing: {
      en: 'Syncing...',
      fr: 'Synchronisation...',
    },
    lastSync: {
      en: 'Last sync',
      fr: 'Dernière synchro',
    },
    neverSynced: {
      en: 'Never synced',
      fr: 'Jamais synchronisé',
    },
    providers: {
      quickbooks: {
        en: 'QuickBooks',
        fr: 'QuickBooks',
      },
      xero: {
        en: 'Xero',
        fr: 'Xero',
      },
      sage: {
        en: 'Sage',
        fr: 'Sage',
      },
      freshbooks: {
        en: 'FreshBooks',
        fr: 'FreshBooks',
      },
      wave: {
        en: 'Wave',
        fr: 'Wave',
      },
      zoho: {
        en: 'Zoho Books',
        fr: 'Zoho Books',
      },
    },
    steps: {
      step1: {
        en: 'Choose your provider',
        fr: 'Choisissez votre fournisseur',
      },
      step2: {
        en: 'Authorize access',
        fr: 'Autorisez l\'accès',
      },
      step3: {
        en: 'Initial sync',
        fr: 'Synchronisation initiale',
      },
    },
    internalMode: {
      en: 'Internal mode enabled',
      fr: 'Mode interne activé',
    },
    internalModeDesc: {
      en: 'Advanced features visible for configuration',
      fr: 'Fonctionnalités avancées visibles pour configuration',
    },
  },

  // ============================================================================
  // REPORTS
  // ============================================================================
  reports: {
    title: {
      en: 'Reports',
      fr: 'Rapports',
    },
    subtitle: {
      en: 'Financial reports with anomaly detection',
      fr: 'Rapports financiers avec détection d\'anomalies',
    },
    balanceSheet: {
      en: 'Balance Sheet',
      fr: 'Bilan',
    },
    incomeStatement: {
      en: 'Income Statement',
      fr: 'État des résultats',
    },
    cashFlowStatement: {
      en: 'Cash Flow Statement',
      fr: 'Flux de trésorerie',
    },
    generate: {
      en: 'Generate',
      fr: 'Générer',
    },
    view: {
      en: 'View',
      fr: 'Visualiser',
    },
    print: {
      en: 'Print',
      fr: 'Imprimer',
    },
    share: {
      en: 'Share',
      fr: 'Partager',
    },
    exportPdf: {
      en: 'Export PDF',
      fr: 'Exporter PDF',
    },
    recentReports: {
      en: 'Recent Reports',
      fr: 'Rapports récents',
    },
    scheduledReports: {
      en: 'Scheduled Reports',
      fr: 'Rapports planifiés',
    },
    assets: {
      en: 'Assets',
      fr: 'Actifs',
    },
    liabilities: {
      en: 'Liabilities',
      fr: 'Passifs',
    },
    equity: {
      en: 'Equity',
      fr: 'Capitaux propres',
    },
    revenue: {
      en: 'Revenue',
      fr: 'Revenus',
    },
    expenses: {
      en: 'Expenses',
      fr: 'Dépenses',
    },
    netIncome: {
      en: 'Net Income',
      fr: 'Bénéfice net',
    },
    total: {
      en: 'Total',
      fr: 'Total',
    },
    current: {
      en: 'Current',
      fr: 'Courant',
    },
    prior: {
      en: 'Prior',
      fr: 'Précédent',
    },
    variance: {
      en: 'Variance',
      fr: 'Variance',
    },
  },

  // ============================================================================
  // SETTINGS
  // ============================================================================
  settings: {
    title: {
      en: 'Settings',
      fr: 'Paramètres',
    },
    tabs: {
      organization: {
        en: 'Organization',
        fr: 'Organisation',
      },
      team: {
        en: 'Team',
        fr: 'Équipe',
      },
      profile: {
        en: 'Profile',
        fr: 'Profil',
      },
      subscription: {
        en: 'Subscription',
        fr: 'Abonnement',
      },
      anomalies: {
        en: 'Anomaly Detection',
        fr: 'Détection anomalies',
      },
      analytics: {
        en: 'Analytics Config',
        fr: 'Config Analytics',
      },
      notifications: {
        en: 'Notifications',
        fr: 'Notifications',
      },
      security: {
        en: 'Security',
        fr: 'Sécurité',
      },
      integrations: {
        en: 'Integrations',
        fr: 'Intégrations',
      },
    },
    organization: {
      name: {
        en: 'Organization name',
        fr: 'Nom de l\'organisation',
      },
      industry: {
        en: 'Industry',
        fr: 'Industrie',
      },
      size: {
        en: 'Company size',
        fr: 'Taille de l\'entreprise',
      },
      fiscalYearEnd: {
        en: 'Fiscal year end',
        fr: 'Fin d\'exercice fiscal',
      },
      currency: {
        en: 'Default currency',
        fr: 'Devise par défaut',
      },
      timezone: {
        en: 'Timezone',
        fr: 'Fuseau horaire',
      },
    },
    profile: {
      firstName: {
        en: 'First name',
        fr: 'Prénom',
      },
      lastName: {
        en: 'Last name',
        fr: 'Nom',
      },
      email: {
        en: 'Email',
        fr: 'Courriel',
      },
      phone: {
        en: 'Phone',
        fr: 'Téléphone',
      },
      language: {
        en: 'Language',
        fr: 'Langue',
      },
      role: {
        en: 'Role',
        fr: 'Rôle',
      },
    },
    team: {
      members: {
        en: 'Team Members',
        fr: 'Membres de l\'équipe',
      },
      inviteMember: {
        en: 'Invite member',
        fr: 'Inviter un membre',
      },
      pendingInvitations: {
        en: 'Pending invitations',
        fr: 'Invitations en attente',
      },
      roles: {
        owner: {
          en: 'Owner',
          fr: 'Propriétaire',
        },
        admin: {
          en: 'Admin',
          fr: 'Administrateur',
        },
        member: {
          en: 'Member',
          fr: 'Membre',
        },
        viewer: {
          en: 'Viewer',
          fr: 'Lecteur',
        },
      },
    },
    subscription: {
      currentPlan: {
        en: 'Current plan',
        fr: 'Forfait actuel',
      },
      usage: {
        en: 'Usage',
        fr: 'Utilisation',
      },
      billingCycle: {
        en: 'Billing cycle',
        fr: 'Cycle de facturation',
      },
      nextBilling: {
        en: 'Next billing',
        fr: 'Prochaine facturation',
      },
      changePlan: {
        en: 'Change plan',
        fr: 'Changer de forfait',
      },
      cancelSubscription: {
        en: 'Cancel subscription',
        fr: 'Annuler l\'abonnement',
      },
      plans: {
        starter: {
          en: 'Starter',
          fr: 'Démarrage',
        },
        professional: {
          en: 'Professional',
          fr: 'Professionnel',
        },
        enterprise: {
          en: 'Enterprise',
          fr: 'Entreprise',
        },
      },
    },
    security: {
      password: {
        en: 'Password',
        fr: 'Mot de passe',
      },
      changePassword: {
        en: 'Change password',
        fr: 'Changer le mot de passe',
      },
      twoFactor: {
        en: 'Two-factor authentication',
        fr: 'Authentification à deux facteurs',
      },
      enable2FA: {
        en: 'Enable 2FA',
        fr: 'Activer 2FA',
      },
      disable2FA: {
        en: 'Disable 2FA',
        fr: 'Désactiver 2FA',
      },
      sessions: {
        en: 'Active sessions',
        fr: 'Sessions actives',
      },
      revokeAll: {
        en: 'Revoke all sessions',
        fr: 'Révoquer toutes les sessions',
      },
    },
    thresholds: {
      title: {
        en: 'Anomaly Detection Thresholds',
        fr: 'Seuils de détection d\'anomalies',
      },
      varianceWarning: {
        en: 'Variance warning threshold',
        fr: 'Seuil d\'avertissement de variance',
      },
      varianceCritical: {
        en: 'Variance critical threshold',
        fr: 'Seuil critique de variance',
      },
      description: {
        en: 'Configure sensitivity for anomaly detection',
        fr: 'Configurez la sensibilité de détection des anomalies',
      },
    },
  },

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================
  notifications: {
    title: {
      en: 'Notifications',
      fr: 'Notifications',
    },
    markAllRead: {
      en: 'Mark all as read',
      fr: 'Tout marquer comme lu',
    },
    noNotifications: {
      en: 'No notifications',
      fr: 'Aucune notification',
    },
    allCaughtUp: {
      en: 'You\'re all caught up!',
      fr: 'Vous êtes à jour!',
    },
    justNow: {
      en: 'Just now',
      fr: 'À l\'instant',
    },
    minutesAgo: {
      en: 'min ago',
      fr: 'min',
    },
    hoursAgo: {
      en: 'h ago',
      fr: 'h',
    },
    daysAgo: {
      en: 'd ago',
      fr: 'j',
    },
    preferences: {
      en: 'Notification preferences',
      fr: 'Préférences de notification',
    },
    channels: {
      inApp: {
        en: 'In-app',
        fr: 'Dans l\'app',
      },
      email: {
        en: 'Email',
        fr: 'Courriel',
      },
      push: {
        en: 'Push',
        fr: 'Push',
      },
      sms: {
        en: 'SMS',
        fr: 'SMS',
      },
    },
    categories: {
      account: {
        en: 'Account',
        fr: 'Compte',
      },
      security: {
        en: 'Security',
        fr: 'Sécurité',
      },
      billing: {
        en: 'Billing',
        fr: 'Facturation',
      },
      dataSync: {
        en: 'Data sync',
        fr: 'Synchro données',
      },
      reports: {
        en: 'Reports',
        fr: 'Rapports',
      },
      connections: {
        en: 'Connections',
        fr: 'Connexions',
      },
      system: {
        en: 'System',
        fr: 'Système',
      },
    },
  },

  // ============================================================================
  // LANDING PAGE
  // ============================================================================
  landing: {
    hero: {
      title: {
        en: 'Financial Reporting,\nSimplified.',
        fr: 'Rapports financiers,\nSimplifiés.',
      },
      subtitle: {
        en: 'Connect your accounting software, detect anomalies automatically, and generate clear financial reports in minutes.',
        fr: 'Connectez votre logiciel comptable, détectez les anomalies automatiquement et générez des rapports financiers clairs en quelques minutes.',
      },
      cta: {
        en: 'Start free trial',
        fr: 'Essai gratuit',
      },
      ctaSecondary: {
        en: 'Watch demo',
        fr: 'Voir la démo',
      },
    },
    features: {
      title: {
        en: 'Everything you need',
        fr: 'Tout ce dont vous avez besoin',
      },
      feature1: {
        title: {
          en: 'Auto-connect',
          fr: 'Connexion auto',
        },
        description: {
          en: 'Connect QuickBooks, Xero, Sage and more in one click',
          fr: 'Connectez QuickBooks, Xero, Sage et plus en un clic',
        },
      },
      feature2: {
        title: {
          en: 'Clear Reports',
          fr: 'Rapports clairs',
        },
        description: {
          en: 'Professional reports following international standards',
          fr: 'Rapports professionnels suivant les normes internationales',
        },
      },
      feature3: {
        title: {
          en: 'AI Analysis',
          fr: 'Analyse IA',
        },
        description: {
          en: 'Automatic anomaly detection and insights',
          fr: 'Détection automatique d\'anomalies et insights',
        },
      },
    },
    pricing: {
      title: {
        en: 'Simple pricing',
        fr: 'Tarification simple',
      },
      monthly: {
        en: 'Monthly',
        fr: 'Mensuel',
      },
      yearly: {
        en: 'Yearly',
        fr: 'Annuel',
      },
      perMonth: {
        en: '/month',
        fr: '/mois',
      },
    },
    footer: {
      product: {
        en: 'Product',
        fr: 'Produit',
      },
      company: {
        en: 'Company',
        fr: 'Entreprise',
      },
      legal: {
        en: 'Legal',
        fr: 'Légal',
      },
      about: {
        en: 'About',
        fr: 'À propos',
      },
      contact: {
        en: 'Contact',
        fr: 'Contact',
      },
      privacy: {
        en: 'Privacy Policy',
        fr: 'Politique de confidentialité',
      },
      terms: {
        en: 'Terms of Service',
        fr: 'Conditions d\'utilisation',
      },
      copyright: {
        en: 'All rights reserved.',
        fr: 'Tous droits réservés.',
      },
    },
  },

  // ============================================================================
  // THEME
  // ============================================================================
  theme: {
    switchToLight: {
      en: 'Switch to light mode',
      fr: 'Passer en mode clair',
    },
    switchToDark: {
      en: 'Switch to dark mode',
      fr: 'Passer en mode sombre',
    },
    light: {
      en: 'Light',
      fr: 'Clair',
    },
    dark: {
      en: 'Dark',
      fr: 'Sombre',
    },
    system: {
      en: 'System',
      fr: 'Système',
    },
  },

  // ============================================================================
  // EMAIL VERIFICATION
  // ============================================================================
  emailVerification: {
    title: {
      en: 'Check Your Email',
      fr: 'Vérifiez votre courriel',
    },
    subtitle: {
      en: 'We sent a confirmation link to verify your email address.',
      fr: 'Nous avons envoyé un lien de confirmation pour vérifier votre adresse courriel.',
    },
    nextSteps: {
      en: 'Next Steps',
      fr: 'Prochaines étapes',
    },
    step1: {
      en: 'Open the email we sent to your inbox',
      fr: 'Ouvrez le courriel que nous avons envoyé',
    },
    step2: {
      en: 'Click the "Verify Email" button in the email',
      fr: 'Cliquez sur le bouton "Vérifier le courriel"',
    },
    step3: {
      en: 'Return here and click "Continue to Dashboard"',
      fr: 'Revenez ici et cliquez sur "Continuer"',
    },
    continue: {
      en: 'Continue to Dashboard',
      fr: 'Continuer vers le tableau de bord',
    },
    resend: {
      en: 'Resend confirmation email',
      fr: 'Renvoyer le courriel de confirmation',
    },
    resending: {
      en: 'Sending...',
      fr: 'Envoi...',
    },
    resendSuccess: {
      en: 'Email sent successfully!',
      fr: 'Courriel envoyé avec succès!',
    },
    resendIn: {
      en: 'Resend in {seconds}s',
      fr: 'Renvoyer dans {seconds}s',
    },
    checkSpam: {
      en: "Can't find the email? Check your spam folder.",
      fr: "Vous ne trouvez pas le courriel? Vérifiez votre dossier spam.",
    },
    useOtherEmail: {
      en: 'Use a different email address',
      fr: 'Utiliser une autre adresse courriel',
    },
    needHelp: {
      en: 'Need help? Contact support@plainledger.ca',
      fr: 'Besoin d\'aide? Contactez support@plainledger.ca',
    },
  },

  // ============================================================================
  // ERRORS & MESSAGES
  // ============================================================================
  errors: {
    general: {
      en: 'An error occurred',
      fr: 'Une erreur est survenue',
    },
    notFound: {
      en: 'Page not found',
      fr: 'Page non trouvée',
    },
    unauthorized: {
      en: 'Unauthorized access',
      fr: 'Accès non autorisé',
    },
    forbidden: {
      en: 'Access forbidden',
      fr: 'Accès interdit',
    },
    networkError: {
      en: 'Network error. Please check your connection.',
      fr: 'Erreur réseau. Veuillez vérifier votre connexion.',
    },
    sessionExpired: {
      en: 'Session expired. Please log in again.',
      fr: 'Session expirée. Veuillez vous reconnecter.',
    },
    tryAgain: {
      en: 'Try again',
      fr: 'Réessayer',
    },
  },

  // ============================================================================
  // DATES & TIME
  // ============================================================================
  dates: {
    today: {
      en: 'Today',
      fr: 'Aujourd\'hui',
    },
    yesterday: {
      en: 'Yesterday',
      fr: 'Hier',
    },
    tomorrow: {
      en: 'Tomorrow',
      fr: 'Demain',
    },
    months: {
      jan: { en: 'Jan', fr: 'Jan' },
      feb: { en: 'Feb', fr: 'Fév' },
      mar: { en: 'Mar', fr: 'Mar' },
      apr: { en: 'Apr', fr: 'Avr' },
      may: { en: 'May', fr: 'Mai' },
      jun: { en: 'Jun', fr: 'Jun' },
      jul: { en: 'Jul', fr: 'Jul' },
      aug: { en: 'Aug', fr: 'Aoû' },
      sep: { en: 'Sep', fr: 'Sep' },
      oct: { en: 'Oct', fr: 'Oct' },
      nov: { en: 'Nov', fr: 'Nov' },
      dec: { en: 'Dec', fr: 'Déc' },
    },
    days: { 
      en: 'days',
      fr: 'jours',
    },
  },

  // ============================================================================
  // ORGANIZATION
  // ============================================================================
  organization: {
    switch: {
      en: 'Switch organization',
      fr: 'Changer d\'organisation',
    },
    create: {
      en: 'Create organization',
      fr: 'Créer une organisation',
    },
    settings: {
      en: 'Organization settings',
      fr: 'Paramètres de l\'organisation',
    },
    plan: {
      en: 'Plan',
      fr: 'Forfait',
    },
    trial: {
      en: 'Trial',
      fr: 'Essai',
    },
    trialDaysLeft: {
      en: 'days left in trial',
      fr: 'jours restants d\'essai',
    },
  },
} as const;

// Type for nested translation keys
export type TranslationKey = keyof typeof translations;
