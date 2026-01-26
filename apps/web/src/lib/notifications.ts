/**
 * PlainLedger Notification System
 * Comprehensive notification types and management
 */

// ============================================================================
// Notification Types
// ============================================================================

export type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms' | 'slack' | 'teams';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type NotificationCategory = 
  | 'account'
  | 'security'
  | 'billing'
  | 'data_sync'
  | 'reports'
  | 'connections'
  | 'system'
  | 'marketing';

export type NotificationType =
  // Account notifications
  | 'welcome'
  | 'email_verified'
  | 'profile_updated'
  | 'password_changed'
  | 'account_deactivated'
  | 'account_reactivated'
  
  // Security notifications
  | 'login_new_device'
  | 'login_new_location'
  | 'login_failed_attempts'
  | 'two_factor_enabled'
  | 'two_factor_disabled'
  | 'api_key_created'
  | 'api_key_revoked'
  | 'suspicious_activity'
  
  // Billing notifications
  | 'subscription_created'
  | 'subscription_upgraded'
  | 'subscription_downgraded'
  | 'subscription_cancelled'
  | 'subscription_renewed'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'payment_method_expiring'
  | 'invoice_created'
  | 'trial_ending'
  | 'usage_limit_warning'
  | 'usage_limit_reached'
  
  // Data sync notifications
  | 'sync_started'
  | 'sync_completed'
  | 'sync_failed'
  | 'sync_scheduled'
  | 'data_import_completed'
  | 'data_export_ready'
  
  // Report notifications
  | 'report_generated'
  | 'report_scheduled'
  | 'report_failed'
  | 'report_shared'
  | 'report_comment_added'
  
  // Connection notifications
  | 'connection_added'
  | 'connection_removed'
  | 'connection_error'
  | 'connection_reauthorization_required'
  | 'connection_sync_completed'
  
  // System notifications
  | 'system_maintenance'
  | 'feature_announcement'
  | 'terms_updated'
  | 'privacy_policy_updated'
  
  // Team/Organization notifications
  | 'team_member_invited'
  | 'team_member_joined'
  | 'team_member_removed'
  | 'team_role_changed'
  | 'organization_created'
  | 'organization_deleted';

// ============================================================================
// Notification Structure
// ============================================================================

export interface Notification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  archived: boolean;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
}

// ============================================================================
// Notification Templates
// ============================================================================

interface NotificationTemplate {
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  title: string;
  message: string;
  emailSubject?: string;
  emailTemplate?: string;
  actionUrl?: string;
  actionLabel?: string;
}

export const notificationTemplates: Record<NotificationType, NotificationTemplate> = {
  // Account notifications
  welcome: {
    type: 'welcome',
    category: 'account',
    priority: 'medium',
    channels: ['in_app', 'email'],
    title: 'Bienvenue sur PlainLedger!',
    message: 'Votre compte a été créé avec succès. Commencez par connecter votre logiciel comptable.',
    emailSubject: 'Bienvenue sur PlainLedger - Commencez maintenant',
    emailTemplate: 'welcome',
    actionUrl: '/app/connections',
    actionLabel: 'Connecter un compte',
  },
  email_verified: {
    type: 'email_verified',
    category: 'account',
    priority: 'low',
    channels: ['in_app'],
    title: 'Courriel vérifié',
    message: 'Votre adresse courriel a été vérifiée avec succès.',
  },
  profile_updated: {
    type: 'profile_updated',
    category: 'account',
    priority: 'low',
    channels: ['in_app'],
    title: 'Profil mis à jour',
    message: 'Vos informations de profil ont été mises à jour.',
    actionUrl: '/app/settings',
    actionLabel: 'Voir le profil',
  },
  password_changed: {
    type: 'password_changed',
    category: 'account',
    priority: 'high',
    channels: ['in_app', 'email'],
    title: 'Mot de passe modifié',
    message: 'Votre mot de passe a été changé. Si ce n\'était pas vous, contactez le support immédiatement.',
    emailSubject: 'Votre mot de passe PlainLedger a été modifié',
    emailTemplate: 'password_changed',
  },
  account_deactivated: {
    type: 'account_deactivated',
    category: 'account',
    priority: 'high',
    channels: ['email'],
    title: 'Compte désactivé',
    message: 'Votre compte PlainLedger a été désactivé.',
    emailSubject: 'Votre compte PlainLedger a été désactivé',
    emailTemplate: 'account_deactivated',
  },
  account_reactivated: {
    type: 'account_reactivated',
    category: 'account',
    priority: 'medium',
    channels: ['in_app', 'email'],
    title: 'Compte réactivé',
    message: 'Bienvenue de retour! Votre compte a été réactivé.',
    emailSubject: 'Votre compte PlainLedger a été réactivé',
    emailTemplate: 'account_reactivated',
  },

  // Security notifications
  login_new_device: {
    type: 'login_new_device',
    category: 'security',
    priority: 'high',
    channels: ['in_app', 'email'],
    title: 'Connexion depuis un nouvel appareil',
    message: 'Une connexion a été détectée depuis un nouvel appareil: {device}',
    emailSubject: 'Nouvelle connexion à votre compte PlainLedger',
    emailTemplate: 'login_new_device',
  },
  login_new_location: {
    type: 'login_new_location',
    category: 'security',
    priority: 'high',
    channels: ['in_app', 'email'],
    title: 'Connexion depuis un nouvel emplacement',
    message: 'Une connexion a été détectée depuis {location}',
    emailSubject: 'Connexion depuis un nouvel emplacement',
    emailTemplate: 'login_new_location',
  },
  login_failed_attempts: {
    type: 'login_failed_attempts',
    category: 'security',
    priority: 'urgent',
    channels: ['in_app', 'email'],
    title: 'Tentatives de connexion échouées',
    message: 'Plusieurs tentatives de connexion échouées ont été détectées sur votre compte.',
    emailSubject: 'Alerte de sécurité - Tentatives de connexion échouées',
    emailTemplate: 'login_failed_attempts',
  },
  two_factor_enabled: {
    type: 'two_factor_enabled',
    category: 'security',
    priority: 'medium',
    channels: ['in_app', 'email'],
    title: 'Authentification à deux facteurs activée',
    message: 'L\'authentification à deux facteurs a été activée sur votre compte.',
    emailSubject: 'Authentification à deux facteurs activée',
    emailTemplate: 'two_factor_enabled',
  },
  two_factor_disabled: {
    type: 'two_factor_disabled',
    category: 'security',
    priority: 'high',
    channels: ['in_app', 'email'],
    title: 'Authentification à deux facteurs désactivée',
    message: 'L\'authentification à deux facteurs a été désactivée. Votre compte est moins sécurisé.',
    emailSubject: 'Authentification à deux facteurs désactivée',
    emailTemplate: 'two_factor_disabled',
    actionUrl: '/app/settings',
    actionLabel: 'Réactiver',
  },
  api_key_created: {
    type: 'api_key_created',
    category: 'security',
    priority: 'medium',
    channels: ['in_app', 'email'],
    title: 'Nouvelle clé API créée',
    message: 'Une nouvelle clé API a été créée: {keyName}',
    emailSubject: 'Nouvelle clé API créée sur votre compte',
    emailTemplate: 'api_key_created',
  },
  api_key_revoked: {
    type: 'api_key_revoked',
    category: 'security',
    priority: 'medium',
    channels: ['in_app'],
    title: 'Clé API révoquée',
    message: 'La clé API "{keyName}" a été révoquée.',
  },
  suspicious_activity: {
    type: 'suspicious_activity',
    category: 'security',
    priority: 'urgent',
    channels: ['in_app', 'email', 'sms'],
    title: 'Activité suspecte détectée',
    message: 'Une activité suspecte a été détectée sur votre compte. Veuillez vérifier.',
    emailSubject: 'URGENT: Activité suspecte sur votre compte PlainLedger',
    emailTemplate: 'suspicious_activity',
    actionUrl: '/app/settings',
    actionLabel: 'Vérifier',
  },

  // Billing notifications
  subscription_created: {
    type: 'subscription_created',
    category: 'billing',
    priority: 'medium',
    channels: ['in_app', 'email'],
    title: 'Abonnement activé',
    message: 'Votre abonnement {plan} a été activé avec succès.',
    emailSubject: 'Bienvenue sur PlainLedger {plan}!',
    emailTemplate: 'subscription_created',
    actionUrl: '/app/settings',
    actionLabel: 'Voir les détails',
  },
  subscription_upgraded: {
    type: 'subscription_upgraded',
    category: 'billing',
    priority: 'medium',
    channels: ['in_app', 'email'],
    title: 'Abonnement mis à niveau',
    message: 'Votre abonnement a été mis à niveau vers {plan}.',
    emailSubject: 'Votre abonnement PlainLedger a été mis à niveau',
    emailTemplate: 'subscription_upgraded',
  },
  subscription_downgraded: {
    type: 'subscription_downgraded',
    category: 'billing',
    priority: 'medium',
    channels: ['in_app', 'email'],
    title: 'Abonnement rétrogradé',
    message: 'Votre abonnement passera à {plan} à la fin de la période actuelle.',
    emailSubject: 'Changement de votre abonnement PlainLedger',
    emailTemplate: 'subscription_downgraded',
  },
  subscription_cancelled: {
    type: 'subscription_cancelled',
    category: 'billing',
    priority: 'high',
    channels: ['in_app', 'email'],
    title: 'Abonnement annulé',
    message: 'Votre abonnement a été annulé et prendra fin le {endDate}.',
    emailSubject: 'Votre abonnement PlainLedger a été annulé',
    emailTemplate: 'subscription_cancelled',
  },
  subscription_renewed: {
    type: 'subscription_renewed',
    category: 'billing',
    priority: 'low',
    channels: ['in_app', 'email'],
    title: 'Abonnement renouvelé',
    message: 'Votre abonnement {plan} a été renouvelé avec succès.',
    emailSubject: 'Votre abonnement PlainLedger a été renouvelé',
    emailTemplate: 'subscription_renewed',
  },
  payment_succeeded: {
    type: 'payment_succeeded',
    category: 'billing',
    priority: 'low',
    channels: ['in_app', 'email'],
    title: 'Paiement réussi',
    message: 'Votre paiement de {amount} a été traité avec succès.',
    emailSubject: 'Reçu de paiement PlainLedger',
    emailTemplate: 'payment_receipt',
  },
  payment_failed: {
    type: 'payment_failed',
    category: 'billing',
    priority: 'urgent',
    channels: ['in_app', 'email'],
    title: 'Échec du paiement',
    message: 'Votre paiement a échoué. Veuillez mettre à jour votre méthode de paiement.',
    emailSubject: 'Action requise: Échec du paiement PlainLedger',
    emailTemplate: 'payment_failed',
    actionUrl: '/app/settings',
    actionLabel: 'Mettre à jour',
  },
  payment_method_expiring: {
    type: 'payment_method_expiring',
    category: 'billing',
    priority: 'high',
    channels: ['in_app', 'email'],
    title: 'Méthode de paiement expire bientôt',
    message: 'Votre carte se terminant par {last4} expire le {expiryDate}.',
    emailSubject: 'Votre méthode de paiement expire bientôt',
    emailTemplate: 'payment_method_expiring',
    actionUrl: '/app/settings',
    actionLabel: 'Mettre à jour',
  },
  invoice_created: {
    type: 'invoice_created',
    category: 'billing',
    priority: 'low',
    channels: ['in_app', 'email'],
    title: 'Nouvelle facture',
    message: 'Votre facture #{invoiceNumber} est disponible.',
    emailSubject: 'Nouvelle facture PlainLedger #{invoiceNumber}',
    emailTemplate: 'invoice_created',
    actionUrl: '/app/settings',
    actionLabel: 'Voir la facture',
  },
  trial_ending: {
    type: 'trial_ending',
    category: 'billing',
    priority: 'high',
    channels: ['in_app', 'email'],
    title: 'Période d\'essai se termine',
    message: 'Votre période d\'essai se termine dans {daysLeft} jours.',
    emailSubject: 'Votre essai PlainLedger se termine bientôt',
    emailTemplate: 'trial_ending',
    actionUrl: '/app/settings',
    actionLabel: 'S\'abonner',
  },
  usage_limit_warning: {
    type: 'usage_limit_warning',
    category: 'billing',
    priority: 'medium',
    channels: ['in_app', 'email'],
    title: 'Limite d\'utilisation proche',
    message: 'Vous avez utilisé {percentage}% de votre quota de {resource}.',
    emailSubject: 'Vous approchez de votre limite PlainLedger',
    emailTemplate: 'usage_limit_warning',
    actionUrl: '/app/settings',
    actionLabel: 'Mettre à niveau',
  },
  usage_limit_reached: {
    type: 'usage_limit_reached',
    category: 'billing',
    priority: 'urgent',
    channels: ['in_app', 'email'],
    title: 'Limite d\'utilisation atteinte',
    message: 'Vous avez atteint votre limite de {resource}. Mettez à niveau pour continuer.',
    emailSubject: 'Limite atteinte - Action requise',
    emailTemplate: 'usage_limit_reached',
    actionUrl: '/app/settings',
    actionLabel: 'Mettre à niveau',
  },

  // Data sync notifications
  sync_started: {
    type: 'sync_started',
    category: 'data_sync',
    priority: 'low',
    channels: ['in_app'],
    title: 'Synchronisation démarrée',
    message: 'La synchronisation avec {provider} a commencé.',
  },
  sync_completed: {
    type: 'sync_completed',
    category: 'data_sync',
    priority: 'low',
    channels: ['in_app'],
    title: 'Synchronisation terminée',
    message: 'La synchronisation avec {provider} est terminée. {recordCount} enregistrements mis à jour.',
    actionUrl: '/app/connections',
    actionLabel: 'Voir les détails',
  },
  sync_failed: {
    type: 'sync_failed',
    category: 'data_sync',
    priority: 'high',
    channels: ['in_app', 'email'],
    title: 'Échec de synchronisation',
    message: 'La synchronisation avec {provider} a échoué: {error}',
    emailSubject: 'Échec de synchronisation PlainLedger',
    emailTemplate: 'sync_failed',
    actionUrl: '/app/connections',
    actionLabel: 'Réessayer',
  },
  sync_scheduled: {
    type: 'sync_scheduled',
    category: 'data_sync',
    priority: 'low',
    channels: ['in_app'],
    title: 'Synchronisation planifiée',
    message: 'Une synchronisation avec {provider} est planifiée pour {scheduledTime}.',
  },
  data_import_completed: {
    type: 'data_import_completed',
    category: 'data_sync',
    priority: 'medium',
    channels: ['in_app', 'email'],
    title: 'Import terminé',
    message: '{recordCount} enregistrements ont été importés avec succès.',
    emailSubject: 'Import de données terminé',
    emailTemplate: 'data_import_completed',
  },
  data_export_ready: {
    type: 'data_export_ready',
    category: 'data_sync',
    priority: 'medium',
    channels: ['in_app', 'email'],
    title: 'Export prêt',
    message: 'Votre export de données est prêt à télécharger.',
    emailSubject: 'Votre export PlainLedger est prêt',
    emailTemplate: 'data_export_ready',
    actionUrl: '/app/settings',
    actionLabel: 'Télécharger',
  },

  // Report notifications
  report_generated: {
    type: 'report_generated',
    category: 'reports',
    priority: 'medium',
    channels: ['in_app', 'email'],
    title: 'Rapport généré',
    message: 'Votre rapport "{reportName}" a été généré avec succès.',
    emailSubject: 'Votre rapport PlainLedger est prêt',
    emailTemplate: 'report_generated',
    actionUrl: '/app/reports',
    actionLabel: 'Voir le rapport',
  },
  report_scheduled: {
    type: 'report_scheduled',
    category: 'reports',
    priority: 'low',
    channels: ['in_app'],
    title: 'Rapport planifié',
    message: 'Le rapport "{reportName}" sera généré {schedule}.',
  },
  report_failed: {
    type: 'report_failed',
    category: 'reports',
    priority: 'high',
    channels: ['in_app', 'email'],
    title: 'Échec de génération du rapport',
    message: 'Le rapport "{reportName}" n\'a pas pu être généré: {error}',
    emailSubject: 'Échec de génération du rapport',
    emailTemplate: 'report_failed',
    actionUrl: '/app/reports',
    actionLabel: 'Réessayer',
  },
  report_shared: {
    type: 'report_shared',
    category: 'reports',
    priority: 'medium',
    channels: ['in_app', 'email'],
    title: 'Rapport partagé avec vous',
    message: '{sharedBy} a partagé le rapport "{reportName}" avec vous.',
    emailSubject: 'Un rapport a été partagé avec vous',
    emailTemplate: 'report_shared',
    actionUrl: '/app/reports',
    actionLabel: 'Voir le rapport',
  },
  report_comment_added: {
    type: 'report_comment_added',
    category: 'reports',
    priority: 'low',
    channels: ['in_app'],
    title: 'Nouveau commentaire',
    message: '{commenter} a commenté sur "{reportName}".',
    actionUrl: '/app/reports',
    actionLabel: 'Voir',
  },

  // Connection notifications
  connection_added: {
    type: 'connection_added',
    category: 'connections',
    priority: 'medium',
    channels: ['in_app'],
    title: 'Connexion ajoutée',
    message: 'La connexion à {provider} a été établie avec succès.',
    actionUrl: '/app/connections',
    actionLabel: 'Gérer',
  },
  connection_removed: {
    type: 'connection_removed',
    category: 'connections',
    priority: 'medium',
    channels: ['in_app'],
    title: 'Connexion supprimée',
    message: 'La connexion à {provider} a été supprimée.',
  },
  connection_error: {
    type: 'connection_error',
    category: 'connections',
    priority: 'high',
    channels: ['in_app', 'email'],
    title: 'Erreur de connexion',
    message: 'Un problème a été détecté avec votre connexion {provider}.',
    emailSubject: 'Problème avec votre connexion {provider}',
    emailTemplate: 'connection_error',
    actionUrl: '/app/connections',
    actionLabel: 'Vérifier',
  },
  connection_reauthorization_required: {
    type: 'connection_reauthorization_required',
    category: 'connections',
    priority: 'urgent',
    channels: ['in_app', 'email'],
    title: 'Réautorisation requise',
    message: 'Votre connexion {provider} nécessite une réautorisation.',
    emailSubject: 'Action requise: Reconnectez {provider}',
    emailTemplate: 'connection_reauthorization',
    actionUrl: '/app/connections',
    actionLabel: 'Reconnecter',
  },
  connection_sync_completed: {
    type: 'connection_sync_completed',
    category: 'connections',
    priority: 'low',
    channels: ['in_app'],
    title: 'Synchronisation terminée',
    message: '{provider}: {recordCount} transactions synchronisées.',
  },

  // System notifications
  system_maintenance: {
    type: 'system_maintenance',
    category: 'system',
    priority: 'high',
    channels: ['in_app', 'email'],
    title: 'Maintenance planifiée',
    message: 'Une maintenance est prévue le {date} de {startTime} à {endTime}.',
    emailSubject: 'Maintenance planifiée PlainLedger',
    emailTemplate: 'system_maintenance',
  },
  feature_announcement: {
    type: 'feature_announcement',
    category: 'system',
    priority: 'low',
    channels: ['in_app', 'email'],
    title: 'Nouvelle fonctionnalité',
    message: 'Découvrez notre nouvelle fonctionnalité: {featureName}',
    emailSubject: 'Nouveau sur PlainLedger: {featureName}',
    emailTemplate: 'feature_announcement',
  },
  terms_updated: {
    type: 'terms_updated',
    category: 'system',
    priority: 'medium',
    channels: ['in_app', 'email'],
    title: 'Conditions mises à jour',
    message: 'Nos conditions d\'utilisation ont été mises à jour.',
    emailSubject: 'Mise à jour des conditions d\'utilisation',
    emailTemplate: 'terms_updated',
  },
  privacy_policy_updated: {
    type: 'privacy_policy_updated',
    category: 'system',
    priority: 'medium',
    channels: ['in_app', 'email'],
    title: 'Politique de confidentialité mise à jour',
    message: 'Notre politique de confidentialité a été mise à jour.',
    emailSubject: 'Mise à jour de la politique de confidentialité',
    emailTemplate: 'privacy_policy_updated',
  },

  // Team notifications
  team_member_invited: {
    type: 'team_member_invited',
    category: 'account',
    priority: 'medium',
    channels: ['in_app', 'email'],
    title: 'Invitation envoyée',
    message: 'Une invitation a été envoyée à {email}.',
    emailSubject: 'Vous êtes invité à rejoindre {organization} sur PlainLedger',
    emailTemplate: 'team_member_invited',
  },
  team_member_joined: {
    type: 'team_member_joined',
    category: 'account',
    priority: 'low',
    channels: ['in_app'],
    title: 'Nouveau membre',
    message: '{memberName} a rejoint l\'équipe.',
  },
  team_member_removed: {
    type: 'team_member_removed',
    category: 'account',
    priority: 'medium',
    channels: ['in_app'],
    title: 'Membre retiré',
    message: '{memberName} a été retiré de l\'équipe.',
  },
  team_role_changed: {
    type: 'team_role_changed',
    category: 'account',
    priority: 'medium',
    channels: ['in_app', 'email'],
    title: 'Rôle modifié',
    message: 'Votre rôle a été changé de {oldRole} à {newRole}.',
    emailSubject: 'Votre rôle a été modifié',
    emailTemplate: 'team_role_changed',
  },
  organization_created: {
    type: 'organization_created',
    category: 'account',
    priority: 'medium',
    channels: ['in_app'],
    title: 'Organisation créée',
    message: 'L\'organisation "{organizationName}" a été créée.',
  },
  organization_deleted: {
    type: 'organization_deleted',
    category: 'account',
    priority: 'high',
    channels: ['in_app', 'email'],
    title: 'Organisation supprimée',
    message: 'L\'organisation "{organizationName}" a été supprimée.',
    emailSubject: 'Organisation supprimée',
    emailTemplate: 'organization_deleted',
  },
};

// ============================================================================
// User Notification Preferences
// ============================================================================

export interface NotificationPreferences {
  // Global settings
  enabled: boolean;
  emailDigest: 'none' | 'daily' | 'weekly';
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:mm
  quietHoursEnd: string;   // HH:mm
  
  // Channel preferences per category
  channels: {
    [K in NotificationCategory]: {
      in_app: boolean;
      email: boolean;
      push: boolean;
      sms: boolean;
      slack: boolean;
      teams: boolean;
    };
  };
  
  // Messaging integrations
  integrations: {
    slack: SlackIntegration | null;
    teams: TeamsIntegration | null;
  };
  
  // Type-specific overrides
  typeOverrides: {
    [K in NotificationType]?: {
      enabled: boolean;
      channels?: NotificationChannel[];
    };
  };
}

// Slack Integration Configuration
export interface SlackIntegration {
  connected: boolean;
  workspaceName: string;
  workspaceId: string;
  channelId: string;
  channelName: string;
  webhookUrl?: string;
  connectedAt: string;
  connectedBy: string;
  dailySummary: boolean;
  dailySummaryTime: string; // HH:mm
  alertsEnabled: boolean;
  alertPriorities: NotificationPriority[];
}

// Microsoft Teams Integration Configuration
export interface TeamsIntegration {
  connected: boolean;
  tenantName: string;
  tenantId: string;
  teamId: string;
  teamName: string;
  channelId: string;
  channelName: string;
  webhookUrl?: string;
  connectedAt: string;
  connectedBy: string;
  dailySummary: boolean;
  dailySummaryTime: string; // HH:mm
  alertsEnabled: boolean;
  alertPriorities: NotificationPriority[];
}

export const defaultNotificationPreferences: NotificationPreferences = {
  enabled: true,
  emailDigest: 'none',
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  
  channels: {
    account: { in_app: true, email: true, push: false, sms: false, slack: false, teams: false },
    security: { in_app: true, email: true, push: true, sms: true, slack: true, teams: true },
    billing: { in_app: true, email: true, push: false, sms: false, slack: false, teams: false },
    data_sync: { in_app: true, email: false, push: false, sms: false, slack: true, teams: true },
    reports: { in_app: true, email: true, push: false, sms: false, slack: true, teams: true },
    connections: { in_app: true, email: true, push: false, sms: false, slack: true, teams: true },
    system: { in_app: true, email: true, push: false, sms: false, slack: false, teams: false },
    marketing: { in_app: true, email: false, push: false, sms: false, slack: false, teams: false },
  },
  
  integrations: {
    slack: null,
    teams: null,
  },
  
  typeOverrides: {},
};

// ============================================================================
// Utility Functions
// ============================================================================

export function getNotificationIcon(category: NotificationCategory): string {
  const icons: Record<NotificationCategory, string> = {
    account: 'user',
    security: 'shield',
    billing: 'credit-card',
    data_sync: 'refresh-cw',
    reports: 'file-text',
    connections: 'link-2',
    system: 'bell',
    marketing: 'megaphone',
  };
  return icons[category];
}

export function getNotificationColor(priority: NotificationPriority): string {
  const colors: Record<NotificationPriority, string> = {
    low: 'gray',
    medium: 'blue',
    high: 'yellow',
    urgent: 'red',
  };
  return colors[priority];
}

export function formatNotificationMessage(
  template: string, 
  data: Record<string, unknown>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return data[key]?.toString() || match;
  });
}

export function shouldSendNotification(
  type: NotificationType,
  preferences: NotificationPreferences,
  channel: NotificationChannel
): boolean {
  if (!preferences.enabled) return false;
  
  const template = notificationTemplates[type];
  if (!template) return false;
  
  // Check type-specific override
  const typeOverride = preferences.typeOverrides[type];
  if (typeOverride) {
    if (!typeOverride.enabled) return false;
    if (typeOverride.channels && !typeOverride.channels.includes(channel)) {
      return false;
    }
  }
  
  // Check category preference
  const categoryPrefs = preferences.channels[template.category];
  if (!categoryPrefs[channel]) return false;
  
  // Check if channel is supported by template
  if (!template.channels.includes(channel)) return false;
  
  return true;
}

export function getRelativeTime(date: string): string {
  const now = new Date();
  const notificationDate = new Date(date);
  const diffMs = now.getTime() - notificationDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  
  return notificationDate.toLocaleDateString('fr-CA', {
    day: 'numeric',
    month: 'short',
  });
}
