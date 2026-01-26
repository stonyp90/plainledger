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
  Check,
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
} from 'lucide-react';
import { useAuth, useKeycloak } from '../lib/keycloak';
import Avatar, { IDPBadge } from '../components/Avatar';
import { useTenant } from '../contexts/TenantContext';
import { 
  getEntitlements, 
  formatLimit, 
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

  const formatTierName = (tier: string) => {
    const names: Record<string, string> = {
      free: 'Gratuit',
      starter: 'Starter',
      professional: 'Professional',
      enterprise: 'Enterprise',
    };
    return names[tier] || tier;
  };

  const formatPrice = (tier: string) => {
    const prices: Record<string, string> = {
      free: 'Gratuit',
      starter: '49$/mois',
      professional: '149$/mois',
      enterprise: 'Sur mesure',
    };
    return prices[tier] || '';
  };

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

              {/* Connected Accounts / Identity Providers */}
              <div className="card">
                <h3 className="section-title">Comptes connectés</h3>
                <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  Connectez des comptes tiers pour vous connecter plus facilement et synchroniser votre photo de profil.
                </p>
                
                <div className="space-y-3">
                  {/* Google */}
                  <IDPConnectionRow
                    provider="google"
                    name="Google"
                    description="Connexion avec votre compte Google"
                    icon={<GoogleIcon />}
                    connected={user?.identityProvider === 'google'}
                  />
                  
                  {/* Microsoft */}
                  <IDPConnectionRow
                    provider="microsoft"
                    name="Microsoft"
                    description="Azure AD / Microsoft 365"
                    icon={<MicrosoftIcon />}
                    connected={user?.identityProvider === 'microsoft'}
                  />
                  
                  {/* Enterprise SSO */}
                  <IDPConnectionRow
                    provider="saml"
                    name="SSO Entreprise"
                    description="SAML / OpenID Connect"
                    icon={<Key className="w-5 h-5" />}
                    connected={user?.identityProvider === 'saml'}
                    enterprise
                  />
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
      title: 'Comptes liés',
      titleEn: 'Linked Accounts',
      description: 'Connectez Google, Microsoft ou SSO entreprise',
      descriptionEn: 'Connect Google, Microsoft or enterprise SSO',
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
                {user.identityProvider === 'google' ? 'Google' :
                 user.identityProvider === 'microsoft' ? 'Microsoft' :
                 user.identityProvider === 'saml' ? 'SSO Entreprise' :
                 'Email / Mot de passe'}
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
function UsageBar({ label, current, max }: { label: string; current: number; max: number }) {
  const percentage = max === -1 ? 10 : (current / max) * 100;
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span style={{ color: 'rgb(var(--color-text-secondary))' }}>{label}</span>
        <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
          {current} / {formatLimit(max)}
        </span>
      </div>
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function EntitlementItem({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div 
      className="flex items-center gap-3 p-3 rounded-lg"
      style={{ 
        backgroundColor: enabled ? 'rgb(var(--color-success) / 0.1)' : 'rgb(var(--color-bg-muted))' 
      }}
    >
      {enabled ? (
        <Check className="w-5 h-5" style={{ color: 'rgb(var(--color-success))' }} />
      ) : (
        <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: 'rgb(var(--color-border))' }} />
      )}
      <span style={{ color: enabled ? 'rgb(var(--color-text))' : 'rgb(var(--color-text-muted))' }}>{label}</span>
    </div>
  );
}

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

function IconBox({ icon: Icon, color }: { icon: React.ElementType; color: 'default' | 'success' | 'info' | 'accent' }) {
  const colors = {
    default: { bg: 'rgb(var(--color-bg-muted))', fg: 'rgb(var(--color-text-secondary))' },
    success: { bg: 'rgb(var(--color-success) / 0.1)', fg: 'rgb(var(--color-success))' },
    info: { bg: 'rgb(var(--color-info) / 0.1)', fg: 'rgb(var(--color-info))' },
    accent: { bg: 'rgb(var(--color-accent) / 0.15)', fg: 'rgb(var(--color-accent-dark))' },
  };
  return (
    <div 
      className="w-12 h-12 rounded-xl flex items-center justify-center"
      style={{ backgroundColor: colors[color].bg }}
    >
      <Icon className="w-6 h-6" style={{ color: colors[color].fg }} />
    </div>
  );
}

// Identity Provider Connection Row
interface IDPConnectionRowProps {
  provider: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  enterprise?: boolean;
}

function IDPConnectionRow({ provider, name, description, icon, connected, enterprise }: IDPConnectionRowProps) {
  const { linkAccount, login } = useKeycloak();

  const handleConnect = () => {
    // For enterprise SSO, redirect to account linking page
    // For social login, use IDP hint to start login flow
    if (enterprise) {
      linkAccount(provider);
    } else {
      login(provider);
    }
  };

  return (
    <div 
      className="flex items-center justify-between p-4 rounded-lg"
      style={{ 
        backgroundColor: connected ? 'rgb(var(--color-success) / 0.05)' : 'rgb(var(--color-bg-muted))',
        border: connected ? '1px solid rgb(var(--color-success) / 0.2)' : '1px solid rgb(var(--color-border))'
      }}
    >
      <div className="flex items-center gap-3">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'rgb(var(--color-surface))' }}
        >
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{name}</p>
            {connected && (
              <span className="badge-success text-[10px]">Connecté</span>
            )}
            {enterprise && (
              <span className="badge-default text-[10px]">Entreprise</span>
            )}
          </div>
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{description}</p>
        </div>
      </div>
      
      {connected ? (
        <button 
          className="btn-sm flex items-center gap-1.5 text-sm"
          style={{ color: 'rgb(var(--color-text-muted))' }}
          title="Déconnecter ce compte"
        >
          <Unlink className="w-4 h-4" />
          Déconnecter
        </button>
      ) : (
        <button 
          onClick={handleConnect}
          className="btn-secondary btn-sm flex items-center gap-1.5"
        >
          <Link2 className="w-4 h-4" />
          Connecter
        </button>
      )}
    </div>
  );
}

// Google Icon
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

// Microsoft Icon
function MicrosoftIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#00A4EF" d="M13 1h10v10H13z" />
      <path fill="#7FBA00" d="M1 13h10v10H1z" />
      <path fill="#FFB900" d="M13 13h10v10H13z" />
    </svg>
  );
}
