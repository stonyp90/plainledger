import { useState } from 'react';
import { 
  Building2, 
  User, 
  Bell, 
  Shield, 
  Database, 
  Save,
  CreditCard,
  BarChart3,
  Zap,
  ExternalLink,
  Key,
  Smartphone,
  Monitor,
  Clock,
  AlertTriangle,
  Users,
  Link2,
  Unlink,
  Camera,
  Lock,
  Mail,
} from 'lucide-react';
import { useAuth, useKeycloak } from '../lib/keycloak';
import Avatar, { IDPBadge } from '../components/Avatar';
import { useTenant } from '../contexts/TenantContext';
import { 
  getEntitlements, 
  type SubscriptionTier, 
} from '../lib/entitlements';
import config from '../lib/config';
import NotificationSettings from '../components/NotificationSettings';
import ThresholdSettings from '../components/ThresholdSettings';
import { TeamMembersSection } from '../components/OrganizationSwitcher';
import RolesPermissionsSection from '../components/RolesPermissions';
import SubscriptionManagement from '../components/SubscriptionManagement';
import SecretsManagement from '../components/SecretsManagement';

// Mock subscription data - would come from API
const mockSubscription = {
  tier: 'professional' as SubscriptionTier,
  status: 'active',
  currentPeriodEnd: '2026-02-25',
  usage: {
    dataSources: 3,
    reportsThisMonth: 45,
  },
};

export default function Settings() {
  const { user } = useAuth();
  const { currentTenant, canManageSettings, canManageMembers, canManageBilling, isInternalStaff } = useTenant();
  const [activeTab, setActiveTab] = useState('organization');
  const [subscription] = useState(mockSubscription);
  const entitlements = getEntitlements(currentTenant?.plan || subscription.tier);

  // Build tabs based on permissions
  // Technical configuration tabs are hidden from customers - only visible to internal staff
  const isAdmin = canManageSettings || isInternalStaff;
  
  const allTabs = [
    { id: 'organization', name: 'Organisation', icon: Building2, show: canManageSettings },
    { id: 'team', name: 'Équipe', icon: Users, show: canManageMembers },
    { id: 'roles', name: 'Rôles & Accès', icon: Shield, show: true },
    { id: 'profile', name: 'Profil', icon: User, show: true },
    { id: 'subscription', name: 'Abonnement', icon: CreditCard, show: canManageBilling },
    { id: 'anomalies', name: 'Détection anomalies', icon: AlertTriangle, show: canManageSettings },
    { id: 'notifications', name: 'Notifications', icon: Bell, show: true },
    { id: 'security', name: 'Sécurité', icon: Shield, show: true },
    // Secrets management - admin only (secure handling)
    { id: 'secrets', name: 'Clés API', icon: Lock, show: isAdmin },
    // Technical config tabs - internal PlainLedger staff only (we configure this for customers)
    { id: 'analytics', name: 'Analytics Config', icon: BarChart3, show: isInternalStaff && entitlements.powerBI.enabled },
    { id: 'integrations', name: 'Intégrations', icon: Database, show: isInternalStaff },
  ];

  const tabs = allTabs.filter(tab => tab.show);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-primary">Paramètres</h2>
        <p className="text-sm sm:text-base text-secondary">Gérez les paramètres de votre organisation</p>
      </div>

      {/* Mobile Tab Selector */}
      <div className="lg:hidden">
        <label className="sr-only">Sélectionner une section</label>
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
          className="select w-full"
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Desktop Sidebar Tabs */}
        <div className="hidden lg:block w-56 xl:w-64 flex-shrink-0">
          <nav className="space-y-1 sticky top-20">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-item w-full text-left ${activeTab === tab.id ? 'active' : ''}`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-sm">{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'organization' && (
            <div className="card">
              <h3 className="section-title">Informations de l'organisation</h3>
              <form className="space-y-4">
                <div>
                  <label className="label">Nom de l'organisation</label>
                  <input type="text" defaultValue={currentTenant?.name || "Demo Corporation"} className="input" />
                </div>
                <div>
                  <label className="label">Raison sociale</label>
                  <input type="text" defaultValue="Demo Corporation Inc." className="input" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Numéro d'entreprise (NEQ)</label>
                    <input type="text" defaultValue="123456789RT0001" className="input" />
                  </div>
                  <div>
                    <label className="label">Devise</label>
                    <select className="select">
                      <option value="CAD">CAD - Dollar canadien</option>
                      <option value="USD">USD - Dollar américain</option>
                      <option value="EUR">EUR - Euro</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Fin d'exercice (mois)</label>
                    <select className="select">
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(2000, i).toLocaleString('fr-CA', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Secteur d'activité</label>
                    <select className="select">
                      <option value="technology">Technologie</option>
                      <option value="retail">Commerce de détail</option>
                      <option value="services">Services professionnels</option>
                      <option value="manufacturing">Fabrication</option>
                      <option value="construction">Construction</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>
                </div>
                <div className="pt-4">
                  <button 
                    type="button" 
                    className="btn-primary"
                    onClick={() => alert('Modifications enregistrées avec succès!\n\nLes paramètres de votre organisation ont été mis à jour.')}
                  >
                    <Save className="w-4 h-4" />
                    Enregistrer les modifications
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="card">
              <TeamMembersSection />
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="card">
              <RolesPermissionsSection />
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="card">
                <h3 className="section-title">Informations du profil</h3>
                <div className="space-y-4">
                  {/* Profile Picture Section */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                      <Avatar
                        src={user?.picture}
                        name={user?.name}
                        firstName={user?.firstName}
                        lastName={user?.lastName}
                        size="xl"
                      />
                      {user?.identityProvider && (
                        <div className="absolute -bottom-1 -right-1">
                          <IDPBadge provider={user.identityProvider} size="md" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{user?.name}</p>
                      <p style={{ color: 'rgb(var(--color-text-muted))' }}>{user?.email}</p>
                      {user?.identityProvider && (
                        <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                          Connecté via {user.identityProvider === 'google' ? 'Google' : 
                                       user.identityProvider === 'microsoft' ? 'Microsoft' :
                                       user.identityProvider === 'github' ? 'GitHub' :
                                       user.identityProvider === 'saml' ? 'SSO Entreprise' :
                                       user.identityProvider}
                        </p>
                      )}
                    </div>
                    {!user?.picture && (
                      <button 
                        className="btn-secondary btn-sm flex items-center gap-2"
                        title="Connectez un compte social pour utiliser votre photo de profil"
                        onClick={() => alert('Pour ajouter une photo de profil:\n\n1. Connectez un compte Google ou Microsoft dans la section "Comptes connectés" ci-dessous\n\n2. Votre photo de profil sera automatiquement synchronisée')}
                      >
                        <Camera className="w-4 h-4" />
                        Ajouter photo
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Prénom</label>
                      <input type="text" defaultValue={user?.firstName} className="input" />
                    </div>
                    <div>
                      <label className="label">Nom</label>
                      <input type="text" defaultValue={user?.lastName} className="input" />
                    </div>
                  </div>
                  <div>
                    <label className="label">Courriel</label>
                    <input type="email" defaultValue={user?.email} className="input" disabled />
                    <p className="helper-text">
                      {user?.emailVerified 
                        ? '✓ Courriel vérifié' 
                        : 'Courriel non vérifié - vérifiez votre boîte de réception'}
                    </p>
                  </div>
                  <div>
                    <label className="label">Rôles</label>
                    <div className="flex flex-wrap gap-2">
                      {user?.roles.filter(r => !r.startsWith('default-roles')).map((role) => (
                        <span key={role} className="badge-default">{role}</span>
                      ))}
                    </div>
                  </div>
                  <div className="pt-4">
                    <button 
                      type="button" 
                      className="btn-primary"
                      onClick={() => alert('Profil mis à jour avec succès!\n\nVos informations personnelles ont été enregistrées.')}
                    >
                      <Save className="w-4 h-4" />
                      Mettre à jour le profil
                    </button>
                  </div>
                </div>
              </div>

              {/* Enterprise SSO */}
              <div className="card">
                <h3 className="section-title">Authentification entreprise</h3>
                <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  Connectez votre système d'authentification d'entreprise pour une connexion sécurisée et centralisée.
                </p>
                
                {/* Enterprise SSO Info */}
                <div 
                  className="p-4 rounded-xl mb-4"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-primary-500) / 0.05)',
                    border: '1px solid rgb(var(--color-primary-500) / 0.2)'
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                    >
                      <Key className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>SSO Entreprise</p>
                        <span className="badge-default text-[10px]">Enterprise</span>
                      </div>
                      <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        SAML 2.0, OpenID Connect, Azure AD, Okta, et plus
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact for SSO */}
                <div 
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                >
                  <p className="text-sm mb-3" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Pour configurer l'authentification unique (SSO) avec votre fournisseur d'identité d'entreprise, contactez notre équipe.
                  </p>
                  <a 
                    href="mailto:enterprise@plainledger.ca?subject=Enterprise SSO Setup Request"
                    className="btn-primary btn-sm inline-flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Contacter l'équipe Enterprise
                  </a>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'subscription' && <SubscriptionManagement />}

          {/* Internal staff only - Analytics configuration */}
          {activeTab === 'analytics' && isInternalStaff && (
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="section-title mb-0">Analytics Engine Configuration</h3>
                <span className="badge-warning flex items-center gap-1">
                  Internal Staff Only
                </span>
              </div>
              
              {entitlements.powerBI.enabled ? (
                <div className="space-y-6">
                  <p style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Configure the embedded analytics engine for this organization's interactive dashboards.
                  </p>
                  
                  <div 
                    className="p-4 rounded-xl border"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-info) / 0.05)',
                      borderColor: 'rgb(var(--color-info) / 0.2)'
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <Zap className="w-5 h-5 mt-0.5" style={{ color: 'rgb(var(--color-info))' }} />
                      <div>
                        <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>Technical Configuration</p>
                        <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                          This configuration is managed by PlainLedger support. Customer should not see this section.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="label">Tenant ID</label>
                      <input type="text" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="input font-mono" defaultValue={config.powerBI.tenantId} />
                    </div>
                    <div>
                      <label className="label">Client ID</label>
                      <input type="text" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="input font-mono" defaultValue={config.powerBI.clientId} />
                    </div>
                    <div>
                      <label className="label">Workspace ID</label>
                      <input type="text" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="input font-mono" defaultValue={config.powerBI.groupId} />
                    </div>
                    <div>
                      <label className="label">Default Report ID</label>
                      <input type="text" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="input font-mono" defaultValue={config.powerBI.reportId} />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button type="submit" className="btn-primary">
                      <Save className="w-4 h-4" />
                      Save Configuration
                    </button>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <BarChart3 className="empty-state-icon" />
                  <p className="empty-state-description">
                    Interactive dashboards not available on this plan.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="card">
              <h3 className="section-title">Intégrations de données</h3>
              <div className="space-y-4">
                <IntegrationItem name="QuickBooks" enabled={entitlements.dataSources.quickbooks} connected={false} />
                <IntegrationItem name="Xero" enabled={entitlements.dataSources.xero} connected={false} />
                <IntegrationItem name="Sage" enabled={entitlements.dataSources.sage} connected={false} />
                <IntegrationItem name="FreshBooks" enabled={entitlements.dataSources.freshbooks} connected={false} />
                <IntegrationItem name="Wave" enabled={entitlements.dataSources.wave} connected={false} />
                <IntegrationItem name="Import CSV" enabled={entitlements.dataSources.csv} connected={true} />
              </div>
            </div>
          )}

          {activeTab === 'anomalies' && <ThresholdSettings />}

          {activeTab === 'notifications' && <NotificationSettings />}

          {activeTab === 'security' && <SecuritySettings />}

          {activeTab === 'secrets' && <SecretsManagement />}
        </div>
      </div>
    </div>
  );
}

// Security Settings Component - Integrates with Keycloak Account Console
function SecuritySettings() {
  const { openAccountConsole, getAccountConsoleUrl } = useKeycloak();
  const { user } = useAuth();
  
  // Security management items that redirect to Keycloak
  const securityItems = [
    {
      id: 'password',
      icon: Key,
      title: 'Mot de passe',
      titleEn: 'Password',
      description: 'Changez votre mot de passe de connexion',
      descriptionEn: 'Change your login password',
      action: 'Modifier',
      actionEn: 'Change',
      section: 'password' as const,
      color: 'default' as const,
    },
    {
      id: 'mfa',
      icon: Smartphone,
      title: 'Authentification à deux facteurs (2FA)',
      titleEn: 'Two-Factor Authentication (2FA)',
      description: 'Configurez une application d\'authentification ou des clés de sécurité',
      descriptionEn: 'Set up authenticator app or security keys',
      action: 'Configurer',
      actionEn: 'Configure',
      section: 'authenticator' as const,
      color: 'success' as const,
    },
    {
      id: 'sessions',
      icon: Monitor,
      title: 'Appareils et sessions',
      titleEn: 'Devices & Sessions',
      description: 'Gérez vos sessions actives et déconnectez les appareils',
      descriptionEn: 'Manage active sessions and sign out devices',
      action: 'Gérer',
      actionEn: 'Manage',
      section: 'device-activity' as const,
      color: 'info' as const,
    },
    {
      id: 'linked',
      icon: Link2,
      title: 'SSO Entreprise',
      titleEn: 'Enterprise SSO',
      description: 'Configurez l\'authentification unique entreprise',
      descriptionEn: 'Configure enterprise single sign-on',
      action: 'Gérer',
      actionEn: 'Manage',
      section: 'linked-accounts' as const,
      color: 'accent' as const,
    },
    {
      id: 'history',
      icon: Clock,
      title: 'Historique de connexion',
      titleEn: 'Sign-in History',
      description: 'Consultez l\'historique de vos connexions récentes',
      descriptionEn: 'View your recent sign-in activity',
      action: 'Voir',
      actionEn: 'View',
      section: 'log' as const,
      color: 'default' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
          >
            <Shield className="w-6 h-6" style={{ color: 'rgb(var(--color-primary-500))' }} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg" style={{ color: 'rgb(var(--color-text))' }}>
              Sécurité du compte
            </h3>
            <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              La gestion de la sécurité de votre compte (mot de passe, 2FA, sessions) est assurée par notre système d'authentification sécurisé. 
              Vous serez redirigé vers le portail de gestion de compte.
            </p>
          </div>
        </div>
        
        {/* Quick action to open full security console */}
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgb(var(--color-border))' }}>
          <button 
            onClick={() => openAccountConsole('security')}
            className="btn-primary flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Ouvrir le portail de sécurité
          </button>
        </div>
      </div>

      {/* Security Options Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {securityItems.map((item) => (
          <SecurityCard
            key={item.id}
            icon={item.icon}
            title={item.title}
            description={item.description}
            action={item.action}
            color={item.color}
            onClick={() => openAccountConsole(item.section)}
          />
        ))}
      </div>

      {/* Info about Keycloak */}
      <div 
        className="p-4 rounded-xl flex items-start gap-3"
        style={{ 
          backgroundColor: 'rgb(var(--color-info) / 0.05)',
          border: '1px solid rgb(var(--color-info) / 0.2)'
        }}
      >
        <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-info))' }} />
        <div>
          <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
            Sécurité gérée par Keycloak
          </p>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            Votre compte est protégé par Keycloak, un système de gestion des identités conforme aux normes de sécurité 
            enterprise (OAuth 2.0, OpenID Connect, SAML). Toutes les opérations sensibles sont gérées dans un environnement sécurisé séparé.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="badge-default text-xs">OAuth 2.0</span>
            <span className="badge-default text-xs">OpenID Connect</span>
            <span className="badge-default text-xs">PKCE</span>
            <span className="badge-default text-xs">MFA</span>
          </div>
        </div>
      </div>

      {/* Current account info */}
      {user && (
        <div className="card">
          <h4 className="font-medium mb-4" style={{ color: 'rgb(var(--color-text))' }}>
            Informations du compte
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid rgb(var(--color-border-subtle))' }}>
              <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>Email</span>
              <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>{user.email}</span>
            </div>
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid rgb(var(--color-border-subtle))' }}>
              <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>Statut email</span>
              <span className={`text-sm font-medium`} style={{ color: user.emailVerified ? 'rgb(var(--color-success))' : 'rgb(var(--color-warning))' }}>
                {user.emailVerified ? '✓ Vérifié' : '⚠ Non vérifié'}
              </span>
            </div>
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid rgb(var(--color-border-subtle))' }}>
              <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>Méthode de connexion</span>
              <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                {user.identityProvider === 'saml' ? 'SSO Entreprise' : 'Email / Mot de passe'}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>ID utilisateur</span>
              <span className="text-xs font-mono" style={{ color: 'rgb(var(--color-text-muted))' }}>{user.id}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Security Card Component
interface SecurityCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  action: string;
  color: 'default' | 'success' | 'info' | 'accent';
  onClick: () => void;
}

function SecurityCard({ icon: Icon, title, description, action, color, onClick }: SecurityCardProps) {
  const colors = {
    default: { bg: 'rgb(var(--color-bg-muted))', fg: 'rgb(var(--color-text-secondary))' },
    success: { bg: 'rgb(var(--color-success) / 0.1)', fg: 'rgb(var(--color-success))' },
    info: { bg: 'rgb(var(--color-info) / 0.1)', fg: 'rgb(var(--color-info))' },
    accent: { bg: 'rgb(var(--color-accent) / 0.15)', fg: 'rgb(var(--color-accent-dark))' },
  };

  return (
    <div 
      className="card hover:shadow-md transition-all cursor-pointer group hover:scale-[1.01]"
      onClick={onClick}
    >
      {/* Stacked layout for better readability */}
      <div className="flex items-start gap-4">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
          style={{ backgroundColor: colors[color].bg }}
        >
          <Icon className="w-6 h-6" style={{ color: colors[color].fg }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h4 className="font-semibold text-base leading-tight" style={{ color: 'rgb(var(--color-text))' }}>{title}</h4>
            <button className="btn-secondary btn-sm flex items-center gap-1.5 flex-shrink-0">
              {action}
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: 'rgb(var(--color-text-muted))' }}>{description}</p>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function IntegrationItem({ name, enabled, connected }: { name: string; enabled: boolean; connected: boolean }) {
  return (
    <div 
      className={`p-4 border rounded-lg flex items-center justify-between ${!enabled ? 'opacity-50' : ''}`}
      style={{ borderColor: 'rgb(var(--color-border))' }}
    >
      <div className="flex items-center gap-4">
        <div 
          className="w-12 h-12 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
        >
          <span className="font-bold text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {name.substring(0, 2).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{name}</p>
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {!enabled ? 'Non disponible dans votre plan' : connected ? 'Connecté' : 'Non connecté'}
          </p>
        </div>
      </div>
      {enabled ? (
        <button className={connected ? 'btn-secondary btn-sm' : 'btn-primary btn-sm'}>
          {connected ? 'Gérer' : 'Connecter'}
        </button>
      ) : (
        <button className="btn-secondary btn-sm" disabled>Upgrade</button>
      )}
    </div>
  );
}
