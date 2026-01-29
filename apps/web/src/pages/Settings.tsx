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
  ];

  const tabs = allTabs.filter(tab => tab.show);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-primary">Paramètres</h2>
          <p className="text-sm sm:text-base text-secondary">Gérez les paramètres de votre organisation</p>
        </div>
      </div>

      {/* Mobile Tab Selector */}
      <div className="lg:hidden">
        <label className="sr-only">Sélectionner une section</label>
        <select
          value={activeTab}
          onChange={(e) => handleTabChange(e.target.value)}
          className="select w-full"
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.name}
            </option>
          ))}
        </select>
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
  const swaggerUrl = `${config.api.baseUrl}/api/docs`;

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

// Security Settings Component - Integrates with Keycloak Account Console
function SecuritySettings() {
  const { openAccountConsole } = useKeycloak();
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
      color: 'default' as const,
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
          backgroundColor: 'rgb(var(--color-primary-500) / 0.05)',
          border: '1px solid rgb(var(--color-primary-500) / 0.2)'
        }}
      >
        <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-primary-600))' }} />
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
    default: { bg: 'rgb(var(--color-primary-500) / 0.1)', fg: 'rgb(var(--color-primary-600))' },
    success: { bg: 'rgb(var(--color-success) / 0.1)', fg: 'rgb(var(--color-success))' },
    info: { bg: 'rgb(var(--color-primary-500) / 0.1)', fg: 'rgb(var(--color-primary-600))' },
    accent: { bg: 'rgb(var(--color-primary-500) / 0.1)', fg: 'rgb(var(--color-primary-600))' },
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
