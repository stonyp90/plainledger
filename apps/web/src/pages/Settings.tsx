import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2,
  User,
  Bell,
  Shield,
  Save,
  CreditCard,
  Key,
  AlertTriangle,
  Users,
  Camera,
  Lock,
  Mail,
  Loader2,
  Target,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../lib/keycloak';
import { IDPBadge } from '../components/Avatar';
import { useTenant } from '../contexts/TenantContext';
import { useDemoMode } from '../contexts/DemoModeContext';
import { useI18n } from '../lib/i18n';
import NotificationSettings from '../components/NotificationSettings';
import ThresholdSettings from '../components/ThresholdSettings';
import { TeamMembersSection } from '../components/OrganizationSwitcher';
import RolesPermissionsSection from '../components/RolesPermissions';
import SubscriptionManagement from '../components/SubscriptionManagement';
import SecretsManagement from '../components/SecretsManagement';
import DemoModeBanner from '../components/DemoModeBanner';
import ChartGlobalSettings from '../components/ChartGlobalSettings';
import {
  uploadLogo,
  deleteLogo,
  uploadProfilePicture,
  deleteProfilePicture,
  validateImageFile,
} from '../lib/uploads';
import { organizationSettingsApi } from '../lib/settings-api';
import SecuritySettings from '../components/SecuritySettings';

export default function Settings() {
  const { user } = useAuth();
  const {
    currentTenant,
    canManageSettings,
    canManageMembers,
    canManageBilling,
    isInternalStaff,
    updateTenantSettings,
    setCurrentTenant,
  } = useTenant();
  useDemoMode(); // Context used by DemoModeBanner
  const { language } = useI18n();
  const isEn = language === 'en';
  const [searchParams, setSearchParams] = useSearchParams();

  // Get initial tab from URL or default to first available
  const getInitialTab = () => {
    const urlTab = searchParams.get('tab');
    if (urlTab) return urlTab;
    // Default to organization if user can manage settings, otherwise profile
    return canManageSettings ? 'organization' : 'profile';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [userPicture, setUserPicture] = useState<string | undefined>(user?.picture);

  // Scroll state for tab navigation
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll position and update arrow visibility
  const updateScrollState = useCallback(() => {
    const container = tabScrollRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  }, []);

  // Scroll tabs by a fixed amount
  const scrollTabs = useCallback((direction: 'left' | 'right') => {
    const container = tabScrollRef.current;
    if (!container) return;

    const scrollAmount = 200;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }, []);

  // Initialize scroll state and add resize observer
  useEffect(() => {
    const container = tabScrollRef.current;
    if (!container) return;

    updateScrollState();
    container.addEventListener('scroll', updateScrollState, { passive: true });

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', updateScrollState);
      resizeObserver.disconnect();
    };
  }, [updateScrollState]);

  // Scroll active tab into view on initial mount
  useEffect(() => {
    const container = tabScrollRef.current;
    if (!container) return;

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      const activeTabButton = container.querySelector(
        `[data-tab-id="${activeTab}"]`,
      ) as HTMLElement;
      if (activeTabButton) {
        activeTabButton.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
        updateScrollState();
      }
    }, 100);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Sync URL with active tab
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams]);

  // Update URL when tab changes and scroll tab into view
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId }, { replace: true });

    // Scroll the tab button into view
    setTimeout(() => {
      const container = tabScrollRef.current;
      if (!container) return;

      const tabButton = container.querySelector(`[data-tab-id="${tabId}"]`) as HTMLElement;
      if (tabButton) {
        const containerRect = container.getBoundingClientRect();
        const tabRect = tabButton.getBoundingClientRect();

        // Calculate if tab is fully visible
        const isFullyVisible =
          tabRect.left >= containerRect.left && tabRect.right <= containerRect.right;

        if (!isFullyVisible) {
          tabButton.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      }
    }, 10);
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
      alert(isEn ? 'No organization selected' : 'Aucune organisation sélectionnée');
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

        // Persist to API
        try {
          await organizationSettingsApi.updateBranding({
            logo: result.url,
            primaryColor: currentTenant.settings.branding?.primaryColor,
            secondaryColor: currentTenant.settings.branding?.accentColor,
          });
        } catch (error) {
          console.error('Failed to persist logo URL to API:', error);
          // Don't show error to user - upload succeeded, just persistence failed
        }
      } else {
        alert(result.error || (isEn ? 'Logo upload failed' : 'Échec du téléversement du logo'));
      }
    } catch (error) {
      console.error('Logo upload error:', error);
      alert(
        isEn ? 'An error occurred during upload' : 'Une erreur est survenue lors du téléversement',
      );
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Handle logo delete
  const handleLogoDelete = async () => {
    if (!currentTenant) return;

    if (
      !confirm(
        isEn
          ? 'Are you sure you want to delete the logo?'
          : 'Voulez-vous vraiment supprimer le logo?',
      )
    ) {
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

      // Persist to API
      try {
        await organizationSettingsApi.updateBranding({
          logo: undefined,
          primaryColor: currentTenant.settings.branding?.primaryColor,
          secondaryColor: currentTenant.settings.branding?.accentColor,
        });
      } catch (error) {
        console.error('Failed to persist logo deletion to API:', error);
      }
    } catch (error) {
      console.error('Logo delete error:', error);
      alert(
        isEn
          ? 'An error occurred during deletion'
          : 'Une erreur est survenue lors de la suppression',
      );
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
        alert(
          isEn ? 'Profile photo updated successfully!' : 'Photo de profil mise à jour avec succès!',
        );
      } else {
        alert(
          result.error ||
            (isEn ? 'Profile photo upload failed' : 'Échec du téléversement de la photo'),
        );
      }
    } catch (error) {
      console.error('Profile picture upload error:', error);
      alert(
        isEn ? 'An error occurred during upload' : 'Une erreur est survenue lors du téléversement',
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Handle profile picture delete
  const handleProfilePictureDelete = async () => {
    if (
      !confirm(
        isEn
          ? 'Are you sure you want to delete your profile photo?'
          : 'Voulez-vous vraiment supprimer votre photo de profil?',
      )
    ) {
      return;
    }

    setIsUploadingAvatar(true);

    try {
      await deleteProfilePicture();
      setUserPicture(undefined);
      alert(isEn ? 'Profile photo deleted!' : 'Photo de profil supprimée!');
    } catch (error) {
      console.error('Profile picture delete error:', error);
      alert(
        isEn
          ? 'An error occurred during deletion'
          : 'Une erreur est survenue lors de la suppression',
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Build tabs based on permissions
  // Technical configuration tabs are hidden from customers - only visible to internal staff
  const isAdmin = canManageSettings || isInternalStaff;

  const allTabs = [
    {
      id: 'organization',
      name: isEn ? 'Organization' : 'Organisation',
      description: isEn ? 'Company info, logo, fiscal year' : 'Infos entreprise, logo, exercice',
      icon: Building2,
      show: canManageSettings,
    },
    {
      id: 'team',
      name: isEn ? 'Team' : 'Équipe',
      description: isEn ? 'Manage team members' : 'Gérer les membres',
      icon: Users,
      show: canManageMembers,
    },
    {
      id: 'roles',
      name: isEn ? 'Roles & Access' : 'Rôles & Accès',
      description: isEn ? 'Permissions and access control' : "Permissions et contrôle d'accès",
      icon: Shield,
      show: true,
    },
    {
      id: 'profile',
      name: isEn ? 'Profile' : 'Profil',
      description: isEn ? 'Your personal information' : 'Vos informations personnelles',
      icon: User,
      show: true,
    },
    {
      id: 'subscription',
      name: isEn ? 'Subscription' : 'Abonnement',
      description: isEn ? 'Plan, billing, invoices' : 'Forfait, facturation',
      icon: CreditCard,
      show: canManageBilling,
    },
    {
      id: 'charts',
      name: isEn ? 'Charts & IBCS' : 'Graphiques & IBCS',
      description: isEn ? 'Default chart preferences' : 'Préférences graphiques par défaut',
      icon: Target,
      // Per-org setting: only org admins can modify, only for paid plans (not free tier)
      show: canManageSettings && currentTenant?.plan !== 'free',
    },
    {
      id: 'anomalies',
      name: isEn ? 'Anomaly Detection' : 'Anomalies',
      description: isEn ? 'Alert thresholds config' : "Config. seuils d'alerte",
      icon: AlertTriangle,
      show: canManageSettings,
    },
    {
      id: 'notifications',
      name: 'Notifications',
      description: isEn ? 'Email and alert preferences' : 'Préférences email et alertes',
      icon: Bell,
      show: true,
    },
    {
      id: 'security',
      name: isEn ? 'Security' : 'Sécurité',
      description: isEn ? 'Password, 2FA, sessions' : 'Mot de passe, 2FA, sessions',
      icon: Lock,
      show: true,
    },
    // Secrets management - admin only (secure handling)
    {
      id: 'secrets',
      name: isEn ? 'API Keys' : 'Clés API',
      description: isEn ? 'Manage API credentials' : 'Gérer identifiants API',
      icon: Lock,
      show: isAdmin,
    },
  ];

  const tabs = allTabs.filter((tab) => tab.show);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Logo */}
      <div
        className="p-4 sm:p-6 rounded-xl"
        style={{
          backgroundColor: 'rgb(var(--color-surface))',
          border: '1px solid rgb(var(--color-border))',
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
            <h2
              className="text-lg sm:text-xl font-bold truncate"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? 'Settings' : 'Paramètres'}
            </h2>
            <p
              className="text-xs sm:text-sm truncate"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {currentTenant?.name ||
                (isEn ? 'Manage your organization' : 'Gérez votre organisation')}
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Tab Selector - Horizontal scrollable pills with scroll indicators */}
      <div className="lg:hidden relative">
        {/* Left scroll button */}
        <button
          onClick={() => scrollTabs('left')}
          className={`absolute left-0 top-0 bottom-0 z-10 flex items-center justify-center w-10 transition-all duration-200 ${
            canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{
            background: 'linear-gradient(to right, rgb(var(--color-bg)) 60%, transparent)',
          }}
          aria-label={isEn ? 'Scroll left' : 'Défiler à gauche'}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shadow-md"
            style={{
              backgroundColor: 'rgb(var(--color-surface))',
              border: '1px solid rgb(var(--color-border))',
            }}
          >
            <ChevronLeft className="w-5 h-5" style={{ color: 'rgb(var(--color-text))' }} />
          </div>
        </button>

        {/* Right scroll button */}
        <button
          onClick={() => scrollTabs('right')}
          className={`absolute right-0 top-0 bottom-0 z-10 flex items-center justify-center w-10 transition-all duration-200 ${
            canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{
            background: 'linear-gradient(to left, rgb(var(--color-bg)) 60%, transparent)',
          }}
          aria-label={isEn ? 'Scroll right' : 'Défiler à droite'}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shadow-md"
            style={{
              backgroundColor: 'rgb(var(--color-surface))',
              border: '1px solid rgb(var(--color-border))',
            }}
          >
            <ChevronRight className="w-5 h-5" style={{ color: 'rgb(var(--color-text))' }} />
          </div>
        </button>

        {/* Left fade indicator */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-6 pointer-events-none z-[5] transition-opacity duration-200 ${
            canScrollLeft ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background: 'linear-gradient(to right, rgb(var(--color-bg)), transparent)',
          }}
        />

        {/* Right fade indicator */}
        <div
          className={`absolute right-0 top-0 bottom-0 w-6 pointer-events-none z-[5] transition-opacity duration-200 ${
            canScrollRight ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background: 'linear-gradient(to left, rgb(var(--color-bg)), transparent)',
          }}
        />

        {/* Scrollable tabs container */}
        <div
          ref={tabScrollRef}
          className="overflow-x-auto scrollbar-hide px-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex flex-nowrap gap-2 py-1 min-w-max px-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  data-tab-id={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200"
                  style={{
                    backgroundColor: isActive
                      ? 'rgb(var(--color-primary-500))'
                      : 'rgb(var(--color-surface))',
                    color: isActive ? 'white' : 'rgb(var(--color-text))',
                    border: isActive ? 'none' : '1px solid rgb(var(--color-border))',
                    boxShadow: isActive ? '0 2px 8px rgb(var(--color-primary-500) / 0.3)' : 'none',
                  }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scroll hint for first-time users */}
        {canScrollRight && (
          <div
            className="absolute right-12 top-1/2 -translate-y-1/2 px-2 py-1 rounded-full text-[10px] font-medium animate-pulse pointer-events-none"
            style={{
              backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
              color: 'rgb(var(--color-primary-600))',
            }}
          >
            {isEn ? 'More →' : 'Plus →'}
          </div>
        )}
      </div>

      <div>
        {/* Demo Mode Banner - Visible on all tabs */}
        <DemoModeBanner />

        {activeTab === 'organization' && (
          <div className="card">
            <h3 className="section-title">
              {isEn ? 'Organization Information' : "Informations de l'organisation"}
            </h3>

            {/* Organization Logo/Picture Section */}
            <div
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4 p-4 rounded-xl"
              style={{
                backgroundColor: 'rgb(var(--color-primary-500) / 0.05)',
                border: '1px solid rgb(var(--color-primary-500) / 0.1)',
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
                    boxShadow: currentTenant?.logo
                      ? '0 2px 8px rgb(0 0 0 / 0.1)'
                      : '0 4px 12px rgb(var(--color-primary-500) / 0.3)',
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
                    backgroundColor: 'rgb(var(--color-text-inverted) / 0.5)',
                  }}
                >
                  {isUploadingLogo ? (
                    <Loader2
                      className="w-6 h-6 animate-spin"
                      style={{ color: 'rgb(var(--color-text))' }}
                    />
                  ) : (
                    <Camera className="w-6 h-6" style={{ color: 'rgb(var(--color-text))' }} />
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
                  {currentTenant?.name || (isEn ? 'Organization' : 'Organisation')}
                </p>
                <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Organization logo' : "Logo de l'organisation"}
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
                  {isEn
                    ? isUploadingLogo
                      ? 'Uploading...'
                      : 'Change logo'
                    : isUploadingLogo
                      ? 'Téléversement...'
                      : 'Changer le logo'}
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
                    {isEn ? 'Delete' : 'Supprimer'}
                  </button>
                )}
              </div>
            </div>

            {/* Logo Guidelines */}
            <div
              className="p-3 rounded-lg mb-6 text-xs"
              style={{
                backgroundColor: 'rgb(var(--color-primary-500) / 0.05)',
                border: '1px solid rgb(var(--color-primary-500) / 0.15)',
              }}
            >
              <p className="font-medium mb-1" style={{ color: 'rgb(var(--color-primary-600))' }}>
                {isEn ? 'Logo recommendations' : 'Recommandations pour le logo'}
              </p>
              <ul className="space-y-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                <li>
                  •{' '}
                  {isEn
                    ? 'Recommended dimensions: 200×200 px minimum (square or close)'
                    : 'Dimensions recommandées: 200×200 px minimum (carré ou proche)'}
                </li>
                <li>
                  •{' '}
                  {isEn
                    ? 'Accepted formats: JPG, PNG, GIF, WebP'
                    : 'Formats acceptés: JPG, PNG, GIF, WebP'}
                </li>
                <li>• {isEn ? 'Maximum size: 5 MB' : 'Taille maximale: 5 Mo'}</li>
                <li>
                  •{' '}
                  {isEn
                    ? 'Transparent background (PNG) recommended for best results'
                    : 'Fond transparent (PNG) recommandé pour meilleur rendu'}
                </li>
              </ul>
            </div>

            <form className="space-y-4">
              <div>
                <label className="label">
                  {isEn ? 'Organization name' : "Nom de l'organisation"}
                </label>
                <input
                  type="text"
                  defaultValue={currentTenant?.name || 'Demo Corporation'}
                  className="input"
                />
              </div>
              <div>
                <label className="label">{isEn ? 'Legal name' : 'Raison sociale'}</label>
                <input type="text" defaultValue="Demo Corporation Inc." className="input" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    {isEn ? 'Business number (BN)' : "Numéro d'entreprise (NEQ)"}
                  </label>
                  <input type="text" defaultValue="123456789RT0001" className="input" />
                </div>
                <div>
                  <label className="label">{isEn ? 'Currency' : 'Devise'}</label>
                  <select className="select">
                    <option value="CAD">
                      {isEn ? 'CAD - Canadian Dollar' : 'CAD - Dollar canadien'}
                    </option>
                    <option value="USD">
                      {isEn ? 'USD - US Dollar' : 'USD - Dollar américain'}
                    </option>
                    <option value="EUR">{isEn ? 'EUR - Euro' : 'EUR - Euro'}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    {isEn ? 'Fiscal year end (month)' : "Fin d'exercice (mois)"}
                  </label>
                  <select className="select">
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2000, i).toLocaleString(isEn ? 'en-CA' : 'fr-CA', {
                          month: 'long',
                        })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">{isEn ? 'Industry' : "Secteur d'activité"}</label>
                  <select className="select">
                    <option value="technology">{isEn ? 'Technology' : 'Technologie'}</option>
                    <option value="retail">{isEn ? 'Retail' : 'Commerce de détail'}</option>
                    <option value="services">
                      {isEn ? 'Professional Services' : 'Services professionnels'}
                    </option>
                    <option value="manufacturing">{isEn ? 'Manufacturing' : 'Fabrication'}</option>
                    <option value="construction">Construction</option>
                    <option value="other">{isEn ? 'Other' : 'Autre'}</option>
                  </select>
                </div>
              </div>
              <div className="pt-4">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() =>
                    alert(
                      isEn
                        ? 'Changes saved successfully!\n\nYour organization settings have been updated.'
                        : 'Modifications enregistrées avec succès!\n\nLes paramètres de votre organisation ont été mis à jour.',
                    )
                  }
                >
                  <Save className="w-4 h-4" />
                  {isEn ? 'Save changes' : 'Enregistrer les modifications'}
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
              <h3 className="section-title">
                {isEn ? 'Profile Information' : 'Informations du profil'}
              </h3>
              <div className="space-y-4">
                {/* Profile Picture Section */}
                <div
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4 p-4 rounded-xl"
                  style={{
                    backgroundColor: 'rgb(var(--color-primary-500) / 0.05)',
                    border: '1px solid rgb(var(--color-primary-500) / 0.1)',
                  }}
                >
                  <div className="relative group">
                    {/* Profile Picture Container - Larger for better visibility */}
                    <div
                      className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden border-3"
                      style={{
                        backgroundColor:
                          userPicture || user?.picture
                            ? 'transparent'
                            : 'rgb(var(--color-primary-500) / 0.1)',
                        borderColor: 'rgb(var(--color-border))',
                        borderWidth: '3px',
                        boxShadow: '0 2px 12px rgb(0 0 0 / 0.1)',
                      }}
                    >
                      {userPicture || user?.picture ? (
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
                          {(user?.firstName?.[0] || '') + (user?.lastName?.[0] || '') ||
                            user?.name?.[0] ||
                            'U'}
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
                        backgroundColor: 'rgb(var(--color-text-inverted) / 0.5)',
                      }}
                    >
                      {isUploadingAvatar ? (
                        <Loader2
                          className="w-6 h-6 animate-spin"
                          style={{ color: 'rgb(var(--color-text))' }}
                        />
                      ) : (
                        <Camera className="w-6 h-6" style={{ color: 'rgb(var(--color-text))' }} />
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
                    <p
                      className="font-semibold text-lg"
                      style={{ color: 'rgb(var(--color-text))' }}
                    >
                      {user?.name}
                    </p>
                    <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {user?.email}
                    </p>
                    {user?.identityProvider && (
                      <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        {isEn ? 'Connected via' : 'Connecté via'}{' '}
                        {user.identityProvider === 'google'
                          ? 'Google'
                          : user.identityProvider === 'microsoft'
                            ? 'Microsoft'
                            : user.identityProvider === 'github'
                              ? 'GitHub'
                              : user.identityProvider === 'saml'
                                ? isEn
                                  ? 'Enterprise SSO'
                                  : 'SSO Entreprise'
                                : user.identityProvider}
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
                      {isEn
                        ? isUploadingAvatar
                          ? 'Uploading...'
                          : userPicture || user?.picture
                            ? 'Change photo'
                            : 'Add photo'
                        : isUploadingAvatar
                          ? 'Téléversement...'
                          : userPicture || user?.picture
                            ? 'Changer photo'
                            : 'Ajouter photo'}
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
                        {isEn ? 'Delete' : 'Supprimer'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Photo Guidelines */}
                <div
                  className="p-3 rounded-lg text-xs"
                  style={{
                    backgroundColor: 'rgb(var(--color-primary-500) / 0.05)',
                    border: '1px solid rgb(var(--color-primary-500) / 0.15)',
                  }}
                >
                  <p
                    className="font-medium mb-1"
                    style={{ color: 'rgb(var(--color-primary-600))' }}
                  >
                    {isEn
                      ? 'Profile photo recommendations'
                      : 'Recommandations pour la photo de profil'}
                  </p>
                  <ul className="space-y-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    <li>
                      •{' '}
                      {isEn
                        ? 'Recommended dimensions: 200×200 px minimum (square)'
                        : 'Dimensions recommandées: 200×200 px minimum (carré)'}
                    </li>
                    <li>
                      •{' '}
                      {isEn
                        ? 'Image will be automatically cropped to circle'
                        : "L'image sera automatiquement recadrée en cercle"}
                    </li>
                    <li>
                      •{' '}
                      {isEn
                        ? 'Accepted formats: JPG, PNG, GIF, WebP'
                        : 'Formats acceptés: JPG, PNG, GIF, WebP'}
                    </li>
                    <li>• {isEn ? 'Maximum size: 5 MB' : 'Taille maximale: 5 Mo'}</li>
                  </ul>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">{isEn ? 'First name' : 'Prénom'}</label>
                    <input type="text" defaultValue={user?.firstName} className="input" />
                  </div>
                  <div>
                    <label className="label">{isEn ? 'Last name' : 'Nom'}</label>
                    <input type="text" defaultValue={user?.lastName} className="input" />
                  </div>
                </div>
                <div>
                  <label className="label">{isEn ? 'Email' : 'Courriel'}</label>
                  <input type="email" defaultValue={user?.email} className="input" disabled />
                  <p className="helper-text">
                    {user?.emailVerified
                      ? isEn
                        ? '✓ Email verified'
                        : '✓ Courriel vérifié'
                      : isEn
                        ? 'Email not verified - check your inbox'
                        : 'Courriel non vérifié - vérifiez votre boîte de réception'}
                  </p>
                </div>
                <div>
                  <label className="label">{isEn ? 'Roles' : 'Rôles'}</label>
                  <div className="flex flex-wrap gap-2">
                    {user?.roles
                      .filter((r) => !r.startsWith('default-roles'))
                      .map((role) => (
                        <span key={role} className="badge-default">
                          {role}
                        </span>
                      ))}
                  </div>
                </div>
                <div className="pt-4">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() =>
                      alert(
                        isEn
                          ? 'Profile updated successfully!\n\nYour personal information has been saved.'
                          : 'Profil mis à jour avec succès!\n\nVos informations personnelles ont été enregistrées.',
                      )
                    }
                  >
                    <Save className="w-4 h-4" />
                    {isEn ? 'Update profile' : 'Mettre à jour le profil'}
                  </button>
                </div>
              </div>
            </div>

            {/* Enterprise SSO */}
            <div className="card">
              <h3 className="section-title">
                {isEn ? 'Enterprise Authentication' : 'Authentification entreprise'}
              </h3>
              <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn
                  ? 'Connect your enterprise authentication system for secure, centralized login.'
                  : "Connectez votre système d'authentification d'entreprise pour une connexion sécurisée et centralisée."}
              </p>

              {/* Enterprise SSO Info */}
              <div
                className="p-4 rounded-xl mb-4"
                style={{
                  backgroundColor: 'rgb(var(--color-primary-500) / 0.05)',
                  border: '1px solid rgb(var(--color-primary-500) / 0.2)',
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
                      <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                        {isEn ? 'Enterprise SSO' : 'SSO Entreprise'}
                      </p>
                      <span className="badge-default text-[10px]">Enterprise</span>
                    </div>
                    <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn
                        ? 'SAML 2.0, OpenID Connect, Azure AD, Okta, and more'
                        : 'SAML 2.0, OpenID Connect, Azure AD, Okta, et plus'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact for SSO */}
              <div
                className="p-4 rounded-lg"
                style={{
                  backgroundColor: 'rgb(var(--color-primary-500) / 0.05)',
                  border: '1px solid rgb(var(--color-primary-500) / 0.1)',
                }}
              >
                <p className="text-sm mb-3" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn
                    ? 'To configure single sign-on (SSO) with your enterprise identity provider, contact our team.'
                    : "Pour configurer l'authentification unique (SSO) avec votre fournisseur d'identité d'entreprise, contactez notre équipe."}
                </p>
                <a
                  href="mailto:enterprise@plainledger.ca?subject=Enterprise SSO Setup Request"
                  className="btn-primary btn-sm inline-flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  {isEn ? 'Contact Enterprise Team' : "Contacter l'équipe Enterprise"}
                </a>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'subscription' && <SubscriptionManagement />}

        {activeTab === 'charts' && <ChartGlobalSettings />}

        {activeTab === 'anomalies' && <ThresholdSettings />}

        {activeTab === 'notifications' && <NotificationSettings />}

        {activeTab === 'security' && <SecuritySettings />}

        {activeTab === 'secrets' && <SecretsManagement />}
      </div>
    </div>
  );
}
