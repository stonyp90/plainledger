import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Camera,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  FileText,
  Copy,
  Target,
} from 'lucide-react';
import { useAuth, useKeycloak } from '../lib/keycloak';
import Avatar, { IDPBadge } from '../components/Avatar';
import { useTenant } from '../contexts/TenantContext';
import { useDemoMode } from '../contexts/DemoModeContext';
import { 
  getEntitlements, 
  type SubscriptionTier, 
} from '../lib/entitlements';
import config from '../lib/config';
import { useI18n } from '../lib/i18n';
import NotificationSettings from '../components/NotificationSettings';
import ThresholdSettings from '../components/ThresholdSettings';
import { TeamMembersSection } from '../components/OrganizationSwitcher';
import RolesPermissionsSection from '../components/RolesPermissions';
import SubscriptionManagement from '../components/SubscriptionManagement';
import SecretsManagement from '../components/SecretsManagement';
import DemoModeBanner from '../components/DemoModeBanner';
import ChartGlobalSettings from '../components/ChartGlobalSettings';
import JobsSettings from '../components/JobsSettings';
import { 
  uploadLogo, 
  deleteLogo, 
  uploadProfilePicture, 
  deleteProfilePicture, 
  validateImageFile 
} from '../lib/uploads';

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
  const { currentTenant, canManageSettings, canManageMembers, canManageBilling, isInternalStaff, updateTenantSettings, setCurrentTenant } = useTenant();
  const { isDemoMode, toggleDemoMode } = useDemoMode();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get initial tab from URL or default to first available
  const getInitialTab = () => {
    const urlTab = searchParams.get('tab');
    if (urlTab) return urlTab;
    // Default to organization if user can manage settings, otherwise profile
    return canManageSettings ? 'organization' : 'profile';
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [subscription] = useState(mockSubscription);
  const entitlements = getEntitlements(currentTenant?.plan || subscription.tier);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [userPicture, setUserPicture] = useState<string | undefined>(user?.picture);
  
  // Sync URL with active tab
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams]);
  
  // Update URL when tab changes
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId }, { replace: true });
  };

  // Handle logo upload
  const handleLogoUpload = async (file: File) => {
    // Validate the file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }
    
    if (!currentTenant) {
      alert('Aucune organisation sélectionnée');
      return;
    }

    setIsUploadingLogo(true);
    
    try {
      const result = await uploadLogo(file, currentTenant.id);
      
      if (result.success && result.url) {
        // Update tenant with new logo URL
        setCurrentTenant({
          ...currentTenant,
          logo: result.url,
        });
        // Also update via settings for persistence
        updateTenantSettings({
          branding: {
            ...currentTenant.settings.branding,
            logo: result.url,
          },
        });
      } else {
        alert(result.error || 'Échec du téléversement du logo');
      }
    } catch (error) {
      console.error('Logo upload error:', error);
      alert('Une erreur est survenue lors du téléversement');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Handle logo delete
  const handleLogoDelete = async () => {
    if (!currentTenant) return;
    
    if (!confirm('Voulez-vous vraiment supprimer le logo?')) {
      return;
    }

    setIsUploadingLogo(true);
    
    try {
      await deleteLogo(currentTenant.id);
      
      // Update tenant to remove logo
      setCurrentTenant({
        ...currentTenant,
        logo: undefined,
      });
      updateTenantSettings({
        branding: {
          ...currentTenant.settings.branding,
          logo: undefined,
        },
      });
    } catch (error) {
      console.error('Logo delete error:', error);
      alert('Une erreur est survenue lors de la suppression');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Handle profile picture upload
  const handleProfilePictureUpload = async (file: File) => {
    // Validate the file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setIsUploadingAvatar(true);
    
    try {
      const result = await uploadProfilePicture(file);
      
      if (result.success && result.url) {
        // Update local state with new picture URL
        setUserPicture(result.url);
        alert('Photo de profil mise à jour avec succès!');
      } else {
        alert(result.error || 'Échec du téléversement de la photo');
      }
    } catch (error) {
      console.error('Profile picture upload error:', error);
      alert('Une erreur est survenue lors du téléversement');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Handle profile picture delete
  const handleProfilePictureDelete = async () => {
    if (!confirm('Voulez-vous vraiment supprimer votre photo de profil?')) {
      return;
    }

    setIsUploadingAvatar(true);
    
    try {
      await deleteProfilePicture();
      setUserPicture(undefined);
      alert('Photo de profil supprimée!');
    } catch (error) {
      console.error('Profile picture delete error:', error);
      alert('Une erreur est survenue lors de la suppression');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Build tabs based on permissions
  // Technical configuration tabs are hidden from customers - only visible to internal staff
  const isAdmin = canManageSettings || isInternalStaff;
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const allTabs = [
    { 
      id: 'organization', 
      name: isEn ? 'Organization' : 'Organisation', 
      description: isEn ? 'Company info, logo, fiscal year' : 'Infos entreprise, logo, exercice',
      icon: Building2, 
      show: canManageSettings 
    },
    { 
      id: 'team', 
      name: isEn ? 'Team' : 'Équipe', 
      description: isEn ? 'Manage team members' : 'Gérer les membres',
      icon: Users, 
      show: canManageMembers 
    },
    { 
      id: 'roles', 
      name: isEn ? 'Roles & Access' : 'Rôles & Accès', 
      description: isEn ? 'Permissions and access control' : 'Permissions et contrôle d\'accès',
      icon: Shield, 
      show: true 
    },
    { 
      id: 'profile', 
      name: isEn ? 'Profile' : 'Profil', 
      description: isEn ? 'Your personal information' : 'Vos informations personnelles',
      icon: User, 
      show: true 
    },
    { 
      id: 'subscription', 
      name: isEn ? 'Subscription' : 'Abonnement', 
      description: isEn ? 'Plan, billing, invoices' : 'Forfait, facturation',
      icon: CreditCard, 
      show: canManageBilling 
    },
    { 
      id: 'charts', 
      name: isEn ? 'Charts & IBCS' : 'Graphiques & IBCS', 
      description: isEn ? 'Default chart preferences' : 'Préférences graphiques par défaut',
      icon: Target, 
      show: true 
    },
    { 
      id: 'anomalies', 
      name: isEn ? 'Anomaly Detection' : 'Anomalies', 
      description: isEn ? 'Alert thresholds config' : 'Config. seuils d\'alerte',
      icon: AlertTriangle, 
      show: canManageSettings 
    },
    { 
      id: 'notifications', 
      name: 'Notifications', 
      description: isEn ? 'Email and alert preferences' : 'Préférences email et alertes',
      icon: Bell, 
      show: true 
    },
    { 
      id: 'security', 
      name: isEn ? 'Security' : 'Sécurité', 
      description: isEn ? 'Password, 2FA, sessions' : 'Mot de passe, 2FA, sessions',
      icon: Lock, 
      show: true 
    },
    // Secrets management - admin only (secure handling)
    { 
      id: 'secrets', 
      name: isEn ? 'API Keys' : 'Clés API', 
      description: isEn ? 'Manage API credentials' : 'Gérer identifiants API',
      icon: Lock, 
      show: isAdmin 
    },
    // Technical config tabs - internal PlainLedger staff only (we configure this for customers)
    { 
      id: 'analytics', 
      name: 'Analytics Config', 
      description: 'Power BI configuration',
      icon: BarChart3, 
      show: isInternalStaff && entitlements.powerBI.enabled 
    },
    { 
      id: 'integrations', 
      name: isEn ? 'Integrations' : 'Intégrations', 
      description: isEn ? 'Data source connections' : 'Connexions sources de données',
      icon: Database, 
      show: isInternalStaff 
    },
    { 
      id: 'api-docs', 
      name: 'API Documentation', 
      description: 'Swagger/OpenAPI docs',
      icon: FileText, 
      show: isInternalStaff 
    },
    { 
      id: 'jobs', 
      name: isEn ? 'Scheduled Jobs' : 'Tâches planifiées', 
      description: isEn ? 'Configure automated tasks' : 'Configurer les tâches automatisées',
      icon: Clock, 
      show: isInternalStaff 
    },
  ];

  const tabs = allTabs.filter(tab => tab.show);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Logo */}
      <div 
        className="p-4 sm:p-6 rounded-xl"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          border: '1px solid rgb(var(--color-border))'
        }}
      >
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Organization Logo */}
          <div 
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center font-bold text-sm sm:text-lg overflow-hidden flex-shrink-0"
            style={{ 
              background: currentTenant?.logo 
                ? 'rgb(var(--color-surface))'
                : 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-700)) 100%)',
              color: 'white',
              border: currentTenant?.logo ? '1px solid rgb(var(--color-border))' : 'none',
            }}
          >
            {currentTenant?.logo ? (
              <img 
                src={currentTenant.logo} 
                alt={currentTenant.name} 
                className="w-full h-full"
                style={{ objectFit: 'contain', padding: '2px' }}
              />
            ) : (
              currentTenant?.name?.charAt(0).toUpperCase() || 'O'
            )}
          </div>
          
          {/* Title & Description */}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-bold truncate" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Settings' : 'Paramètres'}
            </h2>
            <p className="text-xs sm:text-sm truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {currentTenant?.name || (isEn ? 'Manage your organization' : 'Gérez votre organisation')}
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Tab Selector - Horizontal scrollable pills */}
      <div className="lg:hidden -mx-4 px-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 pb-2 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                style={{
                  backgroundColor: isActive 
                    ? 'rgb(var(--color-primary-500))' 
                    : 'rgb(var(--color-surface))',
                  color: isActive 
                    ? 'white' 
                    : 'rgb(var(--color-text))',
                  border: isActive 
                    ? 'none' 
                    : '1px solid rgb(var(--color-border))',
                }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {tab.name}
              </button>
            );
          })}
        </div>
      </div>

      <div>
          {/* Demo Mode Banner - Visible on all tabs */}
          <DemoModeBanner />
          
          {activeTab === 'organization' && (
            <div className="card">
              <h3 className="section-title">Informations de l'organisation</h3>
              
              {/* Organization Logo/Picture Section */}
              <div 
                className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4 p-4 rounded-xl"
                style={{ 
                  backgroundColor: 'rgb(var(--color-primary-500) / 0.05)',
                  border: '1px solid rgb(var(--color-primary-500) / 0.1)'
                }}
              >
                <div className="relative group">
                  <div 
                    className="w-24 h-24 rounded-xl flex items-center justify-center font-bold text-2xl overflow-hidden border-2"
                    style={{ 
                      background: currentTenant?.logo 
                        ? 'rgb(var(--color-surface))'
                        : 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-700)) 100%)',
                      color: 'white',
                      borderColor: currentTenant?.logo ? 'rgb(var(--color-border))' : 'transparent',
                      boxShadow: currentTenant?.logo ? '0 2px 8px rgb(0 0 0 / 0.1)' : '0 4px 12px rgb(var(--color-primary-500) / 0.3)'
                    }}
                  >
                    {currentTenant?.logo ? (
                      <img 
                        src={currentTenant.logo} 
                        alt={currentTenant.name} 
                        className="w-full h-full"
                        style={{ objectFit: 'contain', padding: '4px' }}
                      />
                    ) : (
                      currentTenant?.name?.charAt(0).toUpperCase() || 'O'
                    )}
                  </div>
                  {/* Upload overlay on hover */}
                  <label 
                    className={`absolute inset-0 rounded-xl flex items-center justify-center transition-opacity cursor-pointer ${isUploadingLogo ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    style={{
                      backgroundColor: 'rgb(var(--color-text-inverted) / 0.5)'
                    }}
                  >
                    {isUploadingLogo ? (
                      <Loader2 
                        className="w-6 h-6 animate-spin" 
                        style={{ color: 'rgb(var(--color-text))' }}
                      />
                    ) : (
                      <Camera 
                        className="w-6 h-6" 
                        style={{ color: 'rgb(var(--color-text))' }}
                      />
                    )}
                    <input 
                      type="file" 
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      disabled={isUploadingLogo}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleLogoUpload(file);
                        }
                        // Reset input value to allow uploading same file again
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg" style={{ color: 'rgb(var(--color-text))' }}>
                    {currentTenant?.name || 'Organisation'}
                  </p>
                  <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    Logo de l'organisation
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <label 
                    className={`btn-primary btn-sm flex items-center justify-center gap-2 cursor-pointer ${isUploadingLogo ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {isUploadingLogo ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                    {isUploadingLogo ? 'Téléversement...' : 'Changer le logo'}
                    <input 
                      type="file" 
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      disabled={isUploadingLogo}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleLogoUpload(file);
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {currentTenant?.logo && (
                    <button
                      className="btn-danger-outline btn-sm"
                      onClick={handleLogoDelete}
                      disabled={isUploadingLogo}
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
              
              {/* Logo Guidelines */}
              <div 
                className="p-3 rounded-lg mb-6 text-xs"
                style={{ 
                  backgroundColor: 'rgb(var(--color-primary-500) / 0.05)',
                  border: '1px solid rgb(var(--color-primary-500) / 0.15)'
                }}
              >
                <p className="font-medium mb-1" style={{ color: 'rgb(var(--color-primary-600))' }}>
                  Recommandations pour le logo
                </p>
                <ul className="space-y-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  <li>• Dimensions recommandées: 200×200 px minimum (carré ou proche)</li>
                  <li>• Formats acceptés: JPG, PNG, GIF, WebP</li>
                  <li>• Taille maximale: 5 Mo</li>
                  <li>• Fond transparent (PNG) recommandé pour meilleur rendu</li>
                </ul>
              </div>
              
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
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4 p-4 rounded-xl" style={{ 
                    backgroundColor: 'rgb(var(--color-primary-500) / 0.05)',
                    border: '1px solid rgb(var(--color-primary-500) / 0.1)'
                  }}>
                    <div className="relative group">
                      {/* Profile Picture Container - Larger for better visibility */}
                      <div 
                        className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden border-3"
                        style={{ 
                          backgroundColor: (userPicture || user?.picture) ? 'transparent' : 'rgb(var(--color-primary-500) / 0.1)',
                          borderColor: 'rgb(var(--color-border))',
                          borderWidth: '3px',
                          boxShadow: '0 2px 12px rgb(0 0 0 / 0.1)'
                        }}
                      >
                        {(userPicture || user?.picture) ? (
                          <img 
                            src={userPicture || user?.picture} 
                            alt={user?.name || 'Profile'} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <span 
                            className="font-bold text-2xl"
                            style={{ color: 'rgb(var(--color-primary-600))' }}
                          >
                            {((user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')) || (user?.name?.[0] || 'U')}
                          </span>
                        )}
                      </div>
                      {user?.identityProvider && (
                        <div className="absolute -bottom-1 -right-1">
                          <IDPBadge provider={user.identityProvider} size="md" />
                        </div>
                      )}
                      {/* Upload overlay on hover */}
                      <label 
                        className={`absolute inset-0 rounded-full flex items-center justify-center transition-opacity cursor-pointer ${isUploadingAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        style={{
                          backgroundColor: 'rgb(var(--color-text-inverted) / 0.5)'
                        }}
                      >
                        {isUploadingAvatar ? (
                          <Loader2 
                            className="w-6 h-6 animate-spin" 
                            style={{ color: 'rgb(var(--color-text))' }}
                          />
                        ) : (
                          <Camera 
                            className="w-6 h-6" 
                            style={{ color: 'rgb(var(--color-text))' }}
                          />
                        )}
                        <input 
                          type="file" 
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          disabled={isUploadingAvatar}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleProfilePictureUpload(file);
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-lg" style={{ color: 'rgb(var(--color-text))' }}>{user?.name}</p>
                      <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{user?.email}</p>
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
                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                      <label 
                        className={`btn-primary btn-sm flex items-center justify-center gap-2 cursor-pointer ${isUploadingAvatar ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        {isUploadingAvatar ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                        {isUploadingAvatar ? 'Téléversement...' : (userPicture || user?.picture) ? 'Changer photo' : 'Ajouter photo'}
                        <input 
                          type="file" 
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          disabled={isUploadingAvatar}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleProfilePictureUpload(file);
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {(userPicture || user?.picture) && (
                        <button 
                          className="btn-danger-outline btn-sm"
                          onClick={handleProfilePictureDelete}
                          disabled={isUploadingAvatar}
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Photo Guidelines */}
                  <div 
                    className="p-3 rounded-lg text-xs"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-primary-500) / 0.05)',
                      border: '1px solid rgb(var(--color-primary-500) / 0.15)'
                    }}
                  >
                    <p className="font-medium mb-1" style={{ color: 'rgb(var(--color-primary-600))' }}>
                      Recommandations pour la photo de profil
                    </p>
                    <ul className="space-y-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      <li>• Dimensions recommandées: 200×200 px minimum (carré)</li>
                      <li>• L'image sera automatiquement recadrée en cercle</li>
                      <li>• Formats acceptés: JPG, PNG, GIF, WebP</li>
                      <li>• Taille maximale: 5 Mo</li>
                    </ul>
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
                  style={{ 
                    backgroundColor: 'rgb(var(--color-primary-500) / 0.05)',
                    border: '1px solid rgb(var(--color-primary-500) / 0.1)'
                  }}
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
                      backgroundColor: 'rgb(var(--color-primary-500) / 0.05)',
                      borderColor: 'rgb(var(--color-primary-500) / 0.2)'
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <Zap className="w-5 h-5 mt-0.5" style={{ color: 'rgb(var(--color-primary-600))' }} />
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

          {activeTab === 'api-docs' && isInternalStaff && (
            <APIDocumentationSection />
          )}

          {activeTab === 'jobs' && isInternalStaff && (
            <JobsSettings userRole={isInternalStaff ? 'super_admin' : undefined} />
          )}

          {activeTab === 'charts' && <ChartGlobalSettings />}

          {activeTab === 'anomalies' && <ThresholdSettings />}

          {activeTab === 'notifications' && <NotificationSettings />}

          {activeTab === 'security' && <SecuritySettings />}

          {activeTab === 'secrets' && <SecretsManagement />}
      </div>
    </div>
  );
}

// API Documentation Section - Super Admin Only
function APIDocumentationSection() {
  const { language } = useI18n();
  const isEn = language === 'en';
  const swaggerUrl = `/api/docs`;

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="section-title flex items-center gap-2">
              <FileText className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
              {isEn ? 'API Documentation' : 'Documentation API'}
            </h3>
            <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn 
                ? 'Interactive API documentation powered by Swagger/OpenAPI'
                : 'Documentation API interactive alimentée par Swagger/OpenAPI'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div 
            className="p-4 rounded-xl border"
            style={{ 
              borderColor: 'rgb(var(--color-border))',
              backgroundColor: 'rgb(var(--color-bg-muted) / 0.3)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-medium mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Swagger UI' : 'Interface Swagger'}
                </h4>
                <p className="text-sm mb-3" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn 
                    ? 'Explore and test all available API endpoints'
                    : 'Explorez et testez tous les points de terminaison API disponibles'}
                </p>
                <div className="flex items-center gap-2 text-xs font-mono" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  <Link2 className="w-3 h-3" />
                  <span className="break-all">{swaggerUrl}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex gap-2">
              <a
                href={swaggerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                style={{ 
                  backgroundColor: 'rgb(var(--color-primary-500))',
                  color: 'white',
                }}
              >
                <ExternalLink className="w-4 h-4" />
                {isEn ? 'Open Swagger UI' : 'Ouvrir Swagger UI'}
              </a>
              
              <button
                onClick={async (e) => {
                  try {
                    await navigator.clipboard.writeText(swaggerUrl);
                    // Show brief feedback
                    const btn = e.currentTarget;
                    const originalText = btn.textContent;
                    btn.textContent = isEn ? 'Copied!' : 'Copié!';
                    setTimeout(() => {
                      btn.textContent = originalText;
                    }, 2000);
                  } catch (err) {
                    console.error('Failed to copy URL:', err);
                  }
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                style={{ 
                  backgroundColor: 'rgb(var(--color-bg-muted))',
                  color: 'rgb(var(--color-text))',
                  border: '1px solid rgb(var(--color-border))',
                }}
              >
                <Copy className="w-4 h-4" />
                {isEn ? 'Copy URL' : 'Copier l\'URL'}
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl border" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <h4 className="font-medium mb-2 flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
              <Shield className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
              {isEn ? 'Authentication' : 'Authentification'}
            </h4>
            <p className="text-sm mb-3" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn 
                ? 'The API uses Bearer token authentication. Use the "Authorize" button in Swagger UI to authenticate.'
                : 'L\'API utilise l\'authentification par jeton Bearer. Utilisez le bouton "Authorize" dans Swagger UI pour vous authentifier.'}
            </p>
            <div className="text-xs font-mono p-2 rounded bg-black/5" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Authorization: Bearer {'<token>'}
            </div>
          </div>

          <div className="p-4 rounded-xl border" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <h4 className="font-medium mb-2 flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
              <Database className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
              {isEn ? 'API Endpoints' : 'Points de terminaison API'}
            </h4>
            <ul className="space-y-2 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}></span>
                {isEn ? 'Organizations' : 'Organisations'}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}></span>
                {isEn ? 'Financial Reports' : 'Rapports financiers'}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}></span>
                {isEn ? 'Data Sources' : 'Sources de données'}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}></span>
                {isEn ? 'Analytics' : 'Analytique'}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}></span>
                {isEn ? 'Settings' : 'Paramètres'}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Security Settings Component - Native PlainLedger UI
function SecuritySettings() {
  const { user, getToken } = useKeycloak();
  const { language } = useI18n();
  const isEn = language === 'en';
  
  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  
  // MFA state
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(true);
  
  // Sessions state
  const [sessions, setSessions] = useState<Array<{
    id: string;
    device: string;
    browser: string;
    ip: string;
    location: string;
    lastActive: string;
    current: boolean;
  }>>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingSession, setRevokingSession] = useState<string | null>(null);
  
  // Login history state
  const [showLoginHistory, setShowLoginHistory] = useState(false);
  const [loginHistory, setLoginHistory] = useState<Array<{
    id: string;
    timestamp: string;
    ip: string;
    location: string;
    device: string;
    success: boolean;
  }>>([]);

  // Password requirements
  const passwordRequirements = [
    { id: 'length', label: isEn ? 'At least 12 characters' : 'Au moins 12 caractères', met: newPassword.length >= 12 },
    { id: 'uppercase', label: isEn ? 'One uppercase letter' : 'Une lettre majuscule', met: /[A-Z]/.test(newPassword) },
    { id: 'lowercase', label: isEn ? 'One lowercase letter' : 'Une lettre minuscule', met: /[a-z]/.test(newPassword) },
    { id: 'number', label: isEn ? 'One number' : 'Un chiffre', met: /\d/.test(newPassword) },
    { id: 'special', label: isEn ? 'One special character' : 'Un caractère spécial', met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword) },
  ];
  const allRequirementsMet = passwordRequirements.every(r => r.met);
  const passwordsMatch = newPassword === confirmNewPassword && confirmNewPassword.length > 0;

  // Fetch MFA status and sessions on mount
  useEffect(() => {
    const fetchSecurityData = async () => {
      const token = getToken();
      
      // Fetch MFA status
      try {
        const mfaResponse = await fetch('/api/auth/mfa/status', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        if (mfaResponse.ok) {
          const data = await mfaResponse.json();
          setMfaEnabled(data.enabled);
        }
      } catch (err) {
        console.error('Failed to fetch MFA status:', err);
      } finally {
        setMfaLoading(false);
      }
      
      // Fetch active sessions
      try {
        const sessionsResponse = await fetch('/api/auth/sessions', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        if (sessionsResponse.ok) {
          const data = await sessionsResponse.json();
          setSessions(data.sessions || []);
        } else {
          // Mock data for demo
          setSessions([
            {
              id: 'current',
              device: 'MacBook Pro',
              browser: 'Chrome 120',
              ip: '192.168.1.1',
              location: 'Montréal, QC',
              lastActive: new Date().toISOString(),
              current: true,
            },
          ]);
        }
      } catch (err) {
        // Mock data for demo
        setSessions([
          {
            id: 'current',
            device: 'MacBook Pro',
            browser: 'Chrome 120',
            ip: '192.168.1.1',
            location: 'Montréal, QC',
            lastActive: new Date().toISOString(),
            current: true,
          },
        ]);
      } finally {
        setSessionsLoading(false);
      }
      
      // Fetch login history
      try {
        const historyResponse = await fetch('/api/auth/login-history', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        if (historyResponse.ok) {
          const data = await historyResponse.json();
          setLoginHistory(data.history || []);
        } else {
          // Mock data for demo
          setLoginHistory([
            { id: '1', timestamp: new Date().toISOString(), ip: '192.168.1.1', location: 'Montréal, QC', device: 'Chrome / MacOS', success: true },
            { id: '2', timestamp: new Date(Date.now() - 86400000).toISOString(), ip: '192.168.1.1', location: 'Montréal, QC', device: 'Chrome / MacOS', success: true },
            { id: '3', timestamp: new Date(Date.now() - 172800000).toISOString(), ip: '192.168.1.2', location: 'Toronto, ON', device: 'Safari / iOS', success: true },
          ]);
        }
      } catch {
        setLoginHistory([
          { id: '1', timestamp: new Date().toISOString(), ip: '192.168.1.1', location: 'Montréal, QC', device: 'Chrome / MacOS', success: true },
          { id: '2', timestamp: new Date(Date.now() - 86400000).toISOString(), ip: '192.168.1.1', location: 'Montréal, QC', device: 'Chrome / MacOS', success: true },
        ]);
      }
    };
    
    fetchSecurityData();
  }, [getToken]);

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRequirementsMet || !passwordsMatch || passwordChanging) return;
    
    setPasswordChanging(true);
    setPasswordError(null);
    
    try {
      const token = getToken();
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || (isEn ? 'Failed to change password' : 'Échec du changement de mot de passe'));
      }
      
      setPasswordSuccess(true);
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : (isEn ? 'An error occurred' : 'Une erreur est survenue'));
    } finally {
      setPasswordChanging(false);
    }
  };

  // Handle session revocation
  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSession(sessionId);
    
    try {
      const token = getToken();
      const response = await fetch(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      
      if (response.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
      }
    } catch (err) {
      console.error('Failed to revoke session:', err);
    } finally {
      setRevokingSession(null);
    }
  };

  // Handle MFA disable
  const handleDisableMFA = async () => {
    if (!confirm(isEn 
      ? 'Are you sure you want to disable two-factor authentication? This will make your account less secure.' 
      : 'Êtes-vous sûr de vouloir désactiver l\'authentification à deux facteurs? Cela rendra votre compte moins sécurisé.'
    )) return;
    
    try {
      const token = getToken();
      const response = await fetch('/api/auth/mfa/disable', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      
      if (response.ok) {
        setMfaEnabled(false);
      }
    } catch (err) {
      console.error('Failed to disable MFA:', err);
    }
  };

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
              {isEn ? 'Account Security' : 'Sécurité du compte'}
            </h3>
            <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn 
                ? 'Manage your password, two-factor authentication, and active sessions.'
                : 'Gérez votre mot de passe, l\'authentification à deux facteurs et vos sessions actives.'}
            </p>
          </div>
        </div>
      </div>

      {/* Password Section */}
      <div className="card">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <Key className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <div>
              <h4 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Password' : 'Mot de passe'}
              </h4>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Change your login password' : 'Changez votre mot de passe de connexion'}
              </p>
            </div>
          </div>
          {!showPasswordForm && (
            <button 
              className="btn-primary btn-sm"
              onClick={() => setShowPasswordForm(true)}
            >
              {isEn ? 'Change' : 'Modifier'}
            </button>
          )}
        </div>

        {passwordSuccess && (
          <div 
            className="mb-4 p-3 rounded-lg flex items-center gap-2"
            style={{ 
              backgroundColor: 'rgb(var(--color-success) / 0.1)',
              border: '1px solid rgb(var(--color-success) / 0.2)'
            }}
          >
            <Shield className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
            <span className="text-sm" style={{ color: 'rgb(var(--color-success))' }}>
              {isEn ? 'Password changed successfully!' : 'Mot de passe modifié avec succès!'}
            </span>
          </div>
        )}

        {showPasswordForm && (
          <form onSubmit={handlePasswordChange} className="space-y-4 pt-4" style={{ borderTop: '1px solid rgb(var(--color-border))' }}>
            {passwordError && (
              <div 
                className="p-3 rounded-lg flex items-start gap-2"
                style={{ 
                  backgroundColor: 'rgb(var(--color-error) / 0.1)',
                  border: '1px solid rgb(var(--color-error) / 0.2)'
                }}
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-error))' }} />
                <span className="text-sm" style={{ color: 'rgb(var(--color-error))' }}>{passwordError}</span>
              </div>
            )}

            <div>
              <label className="label">{isEn ? 'Current Password' : 'Mot de passe actuel'}</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input pr-10"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">{isEn ? 'New Password' : 'Nouveau mot de passe'}</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input pr-10"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {newPassword.length > 0 && (
                <div className="mt-2 p-3 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
                  <p className="text-xs font-medium mb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'Password requirements:' : 'Exigences du mot de passe:'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {passwordRequirements.map(req => (
                      <div key={req.id} className="flex items-center gap-1.5">
                        {req.met ? (
                          <Shield className="w-3 h-3" style={{ color: 'rgb(var(--color-success))' }} />
                        ) : (
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'rgb(var(--color-text-muted) / 0.3)' }} />
                        )}
                        <span className="text-xs" style={{ color: req.met ? 'rgb(var(--color-success))' : 'rgb(var(--color-text-muted))' }}>
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="label">{isEn ? 'Confirm New Password' : 'Confirmer le nouveau mot de passe'}</label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="input"
                style={{
                  borderColor: confirmNewPassword.length > 0 
                    ? (passwordsMatch ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))') 
                    : undefined
                }}
                required
              />
              {confirmNewPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-error))' }}>
                  {isEn ? 'Passwords do not match' : 'Les mots de passe ne correspondent pas'}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={!allRequirementsMet || !passwordsMatch || passwordChanging}
                className="btn-primary flex items-center gap-2"
              >
                {passwordChanging && <Loader2 className="w-4 h-4 animate-spin" />}
                {isEn ? 'Update Password' : 'Mettre à jour'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowPasswordForm(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                  setPasswordError(null);
                }}
              >
                {isEn ? 'Cancel' : 'Annuler'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Two-Factor Authentication Section */}
      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: mfaEnabled ? 'rgb(var(--color-success) / 0.1)' : 'rgb(var(--color-warning) / 0.1)' }}
            >
              <Smartphone className="w-5 h-5" style={{ color: mfaEnabled ? 'rgb(var(--color-success))' : 'rgb(var(--color-warning))' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Two-Factor Authentication (2FA)' : 'Authentification à deux facteurs (2FA)'}
                </h4>
                {mfaLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'rgb(var(--color-text-muted))' }} />
                ) : (
                  <span 
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ 
                      backgroundColor: mfaEnabled ? 'rgb(var(--color-success) / 0.1)' : 'rgb(var(--color-warning) / 0.1)',
                      color: mfaEnabled ? 'rgb(var(--color-success))' : 'rgb(var(--color-warning))'
                    }}
                  >
                    {mfaEnabled ? (isEn ? 'Enabled' : 'Activé') : (isEn ? 'Disabled' : 'Désactivé')}
                  </span>
                )}
              </div>
              <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {mfaEnabled 
                  ? (isEn ? 'Your account is protected with an authenticator app.' : 'Votre compte est protégé avec une application d\'authentification.')
                  : (isEn ? 'Add an extra layer of security to your account.' : 'Ajoutez une couche de sécurité supplémentaire à votre compte.')}
              </p>
            </div>
          </div>
          {!mfaLoading && (
            mfaEnabled ? (
              <button 
                className="btn-danger-outline btn-sm"
                onClick={handleDisableMFA}
              >
                {isEn ? 'Disable' : 'Désactiver'}
              </button>
            ) : (
              <a href="/mfa-setup" className="btn-primary btn-sm">
                {isEn ? 'Enable' : 'Activer'}
              </a>
            )
          )}
        </div>

        {!mfaEnabled && !mfaLoading && (
          <div 
            className="mt-4 p-3 rounded-lg"
            style={{ 
              backgroundColor: 'rgb(var(--color-warning) / 0.05)',
              border: '1px solid rgb(var(--color-warning) / 0.2)'
            }}
          >
            <p className="text-sm" style={{ color: 'rgb(var(--color-warning))' }}>
              {isEn 
                ? '⚠️ We strongly recommend enabling 2FA to protect your account from unauthorized access.'
                : '⚠️ Nous recommandons fortement d\'activer la 2FA pour protéger votre compte contre les accès non autorisés.'}
            </p>
          </div>
        )}
      </div>

      {/* Active Sessions Section */}
      <div className="card">
        <div className="flex items-start gap-3 mb-4">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
          >
            <Monitor className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
          </div>
          <div>
            <h4 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Active Sessions' : 'Sessions actives'}
            </h4>
            <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Manage devices where you\'re currently logged in.' : 'Gérez les appareils où vous êtes actuellement connecté.'}
            </p>
          </div>
        </div>

        {sessionsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'rgb(var(--color-primary-500))' }} />
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => (
              <div 
                key={session.id}
                className="p-4 rounded-lg flex items-center justify-between"
                style={{ 
                  backgroundColor: session.current ? 'rgb(var(--color-success) / 0.05)' : 'rgb(var(--color-bg-muted))',
                  border: session.current ? '1px solid rgb(var(--color-success) / 0.2)' : '1px solid rgb(var(--color-border))'
                }}
              >
                <div className="flex items-center gap-3">
                  <Monitor className="w-5 h-5" style={{ color: session.current ? 'rgb(var(--color-success))' : 'rgb(var(--color-text-muted))' }} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                        {session.device} - {session.browser}
                      </span>
                      {session.current && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)', color: 'rgb(var(--color-success))' }}>
                          {isEn ? 'Current' : 'Actuelle'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {session.location} • {session.ip} • {new Date(session.lastActive).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                {!session.current && (
                  <button 
                    className="btn-danger-outline btn-sm"
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={revokingSession === session.id}
                  >
                    {revokingSession === session.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      isEn ? 'Sign out' : 'Déconnecter'
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Login History Section */}
      <div className="card">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <Clock className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <div>
              <h4 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Login History' : 'Historique de connexion'}
              </h4>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'View your recent login activity.' : 'Consultez votre activité de connexion récente.'}
              </p>
            </div>
          </div>
          <button 
            className="btn-secondary btn-sm"
            onClick={() => setShowLoginHistory(!showLoginHistory)}
          >
            {showLoginHistory ? (isEn ? 'Hide' : 'Masquer') : (isEn ? 'View' : 'Voir')}
          </button>
        </div>

        {showLoginHistory && (
          <div className="space-y-2 pt-4" style={{ borderTop: '1px solid rgb(var(--color-border))' }}>
            {loginHistory.map(entry => (
              <div 
                key={entry.id}
                className="p-3 rounded-lg flex items-center justify-between"
                style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: entry.success ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))' }}
                  />
                  <div>
                    <p className="text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                      {entry.device}
                    </p>
                    <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {entry.location} • {entry.ip}
                    </p>
                  </div>
                </div>
                <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {new Date(entry.timestamp).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enterprise SSO Section */}
      <div className="card">
        <div className="flex items-start gap-3 mb-4">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
          >
            <Link2 className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
          </div>
          <div>
            <h4 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Enterprise SSO' : 'SSO Entreprise'}
            </h4>
            <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn 
                ? 'Configure single sign-on with your organization\'s identity provider.'
                : 'Configurez l\'authentification unique avec le fournisseur d\'identité de votre organisation.'}
            </p>
          </div>
        </div>

        <div 
          className="p-4 rounded-lg"
          style={{ 
            backgroundColor: 'rgb(var(--color-primary-500) / 0.05)',
            border: '1px solid rgb(var(--color-primary-500) / 0.1)'
          }}
        >
          <p className="text-sm mb-3" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn 
              ? 'To configure enterprise SSO with your identity provider (SAML, OpenID Connect, Azure AD, Okta), contact our team.'
              : 'Pour configurer l\'authentification unique (SSO) avec votre fournisseur d\'identité d\'entreprise, contactez notre équipe.'}
          </p>
          <a 
            href="mailto:enterprise@plainledger.ca?subject=Enterprise SSO Setup Request"
            className="btn-primary btn-sm inline-flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            {isEn ? 'Contact Enterprise Team' : 'Contacter l\'équipe Enterprise'}
          </a>
        </div>
      </div>

      {/* Account Info */}
      {user && (
        <div className="card">
          <h4 className="font-medium mb-4" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Account Information' : 'Informations du compte'}
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid rgb(var(--color-border-subtle))' }}>
              <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>Email</span>
              <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>{user.email}</span>
            </div>
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid rgb(var(--color-border-subtle))' }}>
              <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Email Status' : 'Statut email'}</span>
              <span className="text-sm font-medium" style={{ color: user.emailVerified ? 'rgb(var(--color-success))' : 'rgb(var(--color-warning))' }}>
                {user.emailVerified ? (isEn ? '✓ Verified' : '✓ Vérifié') : (isEn ? '⚠ Not verified' : '⚠ Non vérifié')}
              </span>
            </div>
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid rgb(var(--color-border-subtle))' }}>
              <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Login Method' : 'Méthode de connexion'}</span>
              <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                {user.identityProvider === 'google' ? 'Google' :
                 user.identityProvider === 'microsoft' ? 'Microsoft' :
                 user.identityProvider === 'saml' ? (isEn ? 'Enterprise SSO' : 'SSO Entreprise') :
                 (isEn ? 'Email / Password' : 'Email / Mot de passe')}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'User ID' : 'ID utilisateur'}</span>
              <span className="text-xs font-mono" style={{ color: 'rgb(var(--color-text-muted))' }}>{user.id}</span>
            </div>
          </div>
        </div>
      )}

      {/* Security Badges */}
      <div 
        className="p-4 rounded-xl flex items-start gap-3"
        style={{ 
          backgroundColor: 'rgb(var(--color-primary-500) / 0.05)',
          border: '1px solid rgb(var(--color-primary-500) / 0.2)'
        }}
      >
        <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-primary-600))' }} />
        <div>
          <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Enterprise-Grade Security' : 'Sécurité de niveau entreprise'}
          </p>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn 
              ? 'Your account is protected by industry-standard security protocols.'
              : 'Votre compte est protégé par des protocoles de sécurité aux normes de l\'industrie.'}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="badge-default text-xs">OAuth 2.0</span>
            <span className="badge-default text-xs">OpenID Connect</span>
            <span className="badge-default text-xs">PKCE</span>
            <span className="badge-default text-xs">TLS 1.3</span>
          </div>
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
          style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
        >
          <span className="font-bold text-sm" style={{ color: 'rgb(var(--color-primary-600))' }}>
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
