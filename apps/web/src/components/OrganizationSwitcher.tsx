import { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  ChevronDown, 
  Check, 
  Plus, 
  Settings,
  Users,
  Crown,
  Shield,
  User,
  Eye,
  Loader2,
  AlertTriangle,
  Info,
  Database,
  Mail,
  Copy,
  ExternalLink,
  LayoutDashboard,
  FileText,
  TrendingUp,
  Banknote,
  AlertCircle,
  Link2,
  FileBarChart,
  Cog,
  ChevronRight,
} from 'lucide-react';
import { useTenant, type Tenant, type TenantInvitation } from '../contexts/TenantContext';
import { useNotifications } from '../contexts/NotificationContext';
import { RoleSelector, ROLE_DEFINITIONS } from './RolesPermissions';
import { useI18n } from '../lib/i18n';
import { generateInvitationEmail, generateInvitationEmailText, type SectionAccess } from '../lib/emailTemplates';

interface OrganizationSwitcherProps {
  compact?: boolean;
}

export default function OrganizationSwitcher({ compact = false }: OrganizationSwitcherProps) {
  const { 
    currentTenant, 
    tenants, 
    isLoading, 
    switchTenant, 
    createTenant,
  } = useTenant();
  const { showToast } = useNotifications();
  const { language } = useI18n();
  const isEn = language === 'en';
  
  // Only paid users (Professional/Enterprise) can create new organizations
  const isPaidUser = currentTenant?.plan === 'professional' || currentTenant?.plan === 'enterprise';
  
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleSwitchTenant = async (tenant: Tenant) => {
    if (tenant.id === currentTenant?.id) {
      setIsOpen(false);
      return;
    }
    
    await switchTenant(tenant.id);
    setIsOpen(false);
    
    showToast({
      type: 'success',
      title: 'Organisation changée',
      message: `Vous travaillez maintenant sur "${tenant.name}"`,
    });
  };

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) return;
    
    setIsCreating(true);
    try {
      const newTenant = await createTenant({ name: newOrgName.trim() });
      setShowCreateModal(false);
      setNewOrgName('');
      setIsOpen(false);
      
      showToast({
        type: 'success',
        title: 'Organisation créée',
        message: `"${newTenant.name}" a été créée avec succès.`,
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de créer l\'organisation.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getRoleIcon = (role: Tenant['role']) => {
    switch (role) {
      case 'owner': return Crown;
      case 'admin': return Shield;
      case 'member': return User;
      case 'viewer': return Eye;
    }
  };

  const getRoleLabel = (role: Tenant['role']) => {
    switch (role) {
      case 'owner': return 'Propriétaire';
      case 'admin': return 'Administrateur';
      case 'member': return 'Membre';
      case 'viewer': return 'Lecteur';
    }
  };

  const getStatusBadge = (tenant: Tenant) => {
    if (tenant.status === 'suspended') {
      return (
        <span 
          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
          style={{ 
            backgroundColor: 'rgb(var(--color-error) / 0.1)',
            color: 'rgb(var(--color-error))'
          }}
        >
          Suspendu
        </span>
      );
    }
    return null;
  };

  const getPlanBadge = (plan: Tenant['plan']) => {
    const planStyles: Record<Tenant['plan'], { bg: string; text: string; border: string }> = {
      free: { 
        bg: 'rgb(var(--color-bg-muted))', 
        text: 'rgb(var(--color-text-muted))',
        border: 'rgb(var(--color-border))'
      },
      starter: { 
        bg: 'rgb(var(--color-info) / 0.1)', 
        text: 'rgb(var(--color-info))',
        border: 'rgb(var(--color-info) / 0.2)'
      },
      professional: { 
        bg: 'rgb(var(--color-success) / 0.1)', 
        text: 'rgb(var(--color-success))',
        border: 'rgb(var(--color-success) / 0.2)'
      },
      enterprise: { 
        bg: 'rgb(var(--color-warning) / 0.1)', 
        text: 'rgb(var(--color-warning))',
        border: 'rgb(var(--color-warning) / 0.2)'
      },
    };
    
    const style = planStyles[plan];
    
    return (
      <span 
        className="text-[10px] px-1.5 py-0.5 rounded font-medium"
        style={{ 
          backgroundColor: style.bg,
          color: style.text,
          border: `1px solid ${style.border}`
        }}
      >
        {plan}
      </span>
    );
  };

  // Get role color for visual distinction
  const getRoleColor = (role: Tenant['role']) => {
    switch (role) {
      case 'owner': return 'var(--color-warning)';
      case 'admin': return 'var(--color-info)';
      case 'member': return 'var(--color-success)';
      case 'viewer': return 'var(--color-text-muted)';
    }
  };

  if (isLoading) {
    return (
      <div className="px-2 py-1">
        <div 
          className="flex items-center gap-2.5 p-2 rounded-lg"
          style={{ backgroundColor: 'rgb(var(--color-bg-muted) / 0.5)' }}
        >
          <div 
            className="w-8 h-8 rounded-lg animate-pulse"
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
          />
          <div className="flex-1 space-y-1.5">
            <div 
              className="h-3 w-20 rounded animate-pulse"
              style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
            />
            <div 
              className="h-2 w-12 rounded animate-pulse"
              style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Sleek trigger button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-all duration-150 hover:bg-[rgb(var(--color-bg-muted))] active:scale-[0.98] group"
        title={currentTenant?.name || 'Sélectionner une organisation'}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {/* Organization avatar */}
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-xs flex-shrink-0 overflow-hidden"
          style={{ 
            background: currentTenant?.logo 
              ? 'transparent'
              : currentTenant 
                ? 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)'
                : 'rgb(var(--color-bg-muted))',
            color: currentTenant ? 'white' : 'rgb(var(--color-text-muted))',
          }}
        >
          {currentTenant?.logo ? (
            <img src={currentTenant.logo} alt={currentTenant.name} className="w-full h-full object-cover" />
          ) : currentTenant ? (
            currentTenant.name.charAt(0).toUpperCase()
          ) : (
            <Building2 className="w-3.5 h-3.5" />
          )}
        </div>
        
        {!compact && (
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-1.5">
              <span 
                className="text-sm font-medium truncate"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {currentTenant?.name || 'Sélectionner...'}
              </span>
              {currentTenant?.plan && (
                <span 
                  className="text-[9px] px-1 py-0.5 rounded font-medium uppercase tracking-wide flex-shrink-0"
                  style={{ 
                    backgroundColor: currentTenant.plan === 'free' 
                      ? 'rgb(var(--color-bg-muted))' 
                      : 'rgb(var(--color-primary-500) / 0.1)',
                    color: currentTenant.plan === 'free' 
                      ? 'rgb(var(--color-text-muted))' 
                      : 'rgb(var(--color-primary-500))'
                  }}
                >
                  {currentTenant.plan}
                </span>
              )}
            </div>
          </div>
        )}
        
        <ChevronDown 
          className={`w-4 h-4 flex-shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: 'rgb(var(--color-text-muted))' }}
        />
      </button>

      {/* Sleek dropdown */}
      {isOpen && (
        <div 
          className="absolute left-0 right-0 mt-1 rounded-xl z-50 overflow-hidden animate-scale-in"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))',
            boxShadow: '0 10px 40px rgb(0 0 0 / 0.12)',
          }}
          role="listbox"
          aria-label="Sélectionner une organisation"
        >
          {/* Current organization - compact */}
          <div className="p-2">
            {!currentTenant ? (
              <div className="px-3 py-6 text-center">
                <Building2 className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgb(var(--color-text-muted))' }} />
                <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                  Aucune organisation
                </p>
                <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  Créez votre première organisation
                </p>
              </div>
            ) : (
              <div
                className="flex items-center gap-3 p-2.5 rounded-lg"
                style={{
                  backgroundColor: 'rgb(var(--color-primary-500) / 0.08)',
                }}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm overflow-hidden"
                    style={{ 
                      background: currentTenant.logo 
                        ? 'transparent'
                        : 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
                      color: 'white',
                    }}
                  >
                    {currentTenant.logo ? (
                      <img src={currentTenant.logo} alt={currentTenant.name} className="w-full h-full object-cover" />
                    ) : (
                      currentTenant.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  {/* Role badge */}
                  <div 
                    className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ 
                      backgroundColor: `rgb(${getRoleColor(currentTenant.role)})`,
                    }}
                  >
                    {(() => {
                      const RoleIcon = getRoleIcon(currentTenant.role);
                      return <RoleIcon className="w-2 h-2 text-white" />;
                    })()}
                  </div>
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <span 
                    className="font-medium text-sm block truncate"
                    style={{ color: 'rgb(var(--color-text))' }}
                  >
                    {currentTenant.name}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span 
                      className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style={{ 
                        backgroundColor: 'rgb(var(--color-bg-muted))',
                        color: 'rgb(var(--color-text-muted))'
                      }}
                    >
                      {currentTenant.plan}
                    </span>
                  </div>
                </div>

                {/* Check */}
                <Check className="w-4 h-4 flex-shrink-0" style={{ color: 'rgb(var(--color-primary-500))' }} />
              </div>
            )}
          </div>

          {/* Actions - minimal */}
          <div 
            className="flex items-center gap-1 px-2 py-2 border-t"
            style={{ 
              borderColor: 'rgb(var(--color-border))',
              backgroundColor: 'rgb(var(--color-bg-subtle))'
            }}
          >
            <button
              disabled={!isPaidUser}
              onClick={() => isPaidUser && setShowCreateModal(true)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                isPaidUser 
                  ? 'cursor-pointer hover:bg-[rgb(var(--color-bg-muted))]' 
                  : 'cursor-not-allowed opacity-40'
              }`}
              style={{ color: isPaidUser ? 'rgb(var(--color-text-secondary))' : 'rgb(var(--color-text-muted))' }}
              title={isPaidUser 
                ? (isEn ? 'Create new organization' : 'Créer une nouvelle organisation') 
                : (isEn ? 'Upgrade to Professional or Enterprise to create organizations' : 'Passez à Professionnel ou Entreprise pour créer des organisations')
              }
            >
              <Plus className="w-3.5 h-3.5" />
              {isEn ? 'Create' : 'Créer'}
            </button>
            
            <div className="w-px h-4" style={{ backgroundColor: 'rgb(var(--color-border))' }} />
            
            {currentTenant ? (
              <a
                href="/app/settings"
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-[rgb(var(--color-bg-muted))]"
                style={{ color: 'rgb(var(--color-text-secondary))' }}
                onClick={() => setIsOpen(false)}
              >
                <Settings className="w-3.5 h-3.5" />
                Paramètres
              </a>
            ) : (
              <button
                disabled
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium cursor-not-allowed opacity-40"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                <Settings className="w-3.5 h-3.5" />
                Paramètres
              </button>
            )}
          </div>
        </div>
      )}

      {/* Create Organization Modal - Centered on screen */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fade-in"
          style={{ backgroundColor: 'rgb(0 0 0 / 0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}
        >
          <div 
            className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-scale-in"
            style={{ backgroundColor: 'rgb(var(--color-surface))' }}
          >
            {/* Header with gradient accent */}
            <div 
              className="px-5 sm:px-6 py-4 sm:py-5 border-b flex-shrink-0 relative overflow-hidden"
              style={{ borderColor: 'rgb(var(--color-border))' }}
            >
              {/* Gradient background accent */}
              <div 
                className="absolute inset-0 opacity-50"
                style={{ 
                  background: 'linear-gradient(135deg, rgb(var(--color-primary-500) / 0.1) 0%, transparent 60%)'
                }}
              />
              <div className="relative">
                <div className="flex items-center gap-3 mb-2">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ 
                      background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
                      boxShadow: '0 2px 8px rgb(var(--color-primary-500) / 0.3)'
                    }}
                  >
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    Créer une organisation
                  </h3>
                </div>
                <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  Une organisation regroupe vos données comptables et vos collaborateurs
                </p>
              </div>
            </div>
            
            <div className="p-5 sm:p-6 overflow-y-auto flex-1">
              <div className="mb-5">
                <label className="label text-sm font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                  Nom de l'organisation
                </label>
                <input
                  type="text"
                  className="input text-base mt-1.5"
                  placeholder="Ex: Ma Compagnie Inc."
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  autoFocus
                  style={{
                    borderRadius: '0.75rem',
                    padding: '0.75rem 1rem',
                  }}
                />
              </div>
              
              <div 
                className="p-4 rounded-xl flex items-start gap-3"
                style={{ 
                  backgroundColor: 'rgb(var(--color-primary-500) / 0.06)',
                  border: '1px solid rgb(var(--color-primary-500) / 0.15)'
                }}
              >
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                >
                  <Info className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                    Vous serez le propriétaire
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    Vous pourrez inviter des membres après la création.
                  </p>
                </div>
              </div>
            </div>
            
            <div 
              className="px-5 sm:px-6 py-4 sm:py-5 border-t flex flex-col-reverse sm:flex-row sm:justify-end gap-3 flex-shrink-0 safe-area-bottom"
              style={{ 
                borderColor: 'rgb(var(--color-border))',
                backgroundColor: 'rgb(var(--color-bg-subtle))'
              }}
            >
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewOrgName('');
                }}
                className="btn-secondary w-full sm:w-auto justify-center"
                disabled={isCreating}
              >
                Annuler
              </button>
              <button
                onClick={handleCreateOrg}
                className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
                disabled={!newOrgName.trim() || isCreating}
                style={{
                  background: !newOrgName.trim() || isCreating 
                    ? undefined 
                    : 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
                  color: 'white',
                  boxShadow: !newOrgName.trim() || isCreating 
                    ? undefined 
                    : '0 2px 8px rgb(var(--color-primary-500) / 0.3)'
                }}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Créer l'organisation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Section access defaults by role
const DEFAULT_SECTION_ACCESS: Record<'admin' | 'member' | 'viewer', SectionAccess> = {
  admin: {
    dashboard: true,
    balanceSheet: true,
    incomeStatement: true,
    cashFlow: true,
    anomalies: true,
    connections: true,
    reports: true,
    settings: true,
  },
  member: {
    dashboard: true,
    balanceSheet: true,
    incomeStatement: true,
    cashFlow: true,
    anomalies: true,
    connections: false,
    reports: true,
    settings: false,
  },
  viewer: {
    dashboard: true,
    balanceSheet: true,
    incomeStatement: true,
    cashFlow: true,
    anomalies: true,
    connections: false,
    reports: true,
    settings: false,
  },
};

// Section definitions for the UI
const SECTION_DEFINITIONS = [
  { 
    id: 'dashboard' as keyof SectionAccess, 
    icon: LayoutDashboard, 
    nameEn: 'Dashboard', 
    nameFr: 'Tableau de bord',
    descEn: 'KPIs, financial health score',
    descFr: 'KPIs, score de santé financière',
  },
  { 
    id: 'balanceSheet' as keyof SectionAccess, 
    icon: FileText, 
    nameEn: 'Balance Sheet', 
    nameFr: 'Bilan',
    descEn: 'Assets, liabilities, equity',
    descFr: 'Actifs, passifs, capitaux propres',
  },
  { 
    id: 'incomeStatement' as keyof SectionAccess, 
    icon: TrendingUp, 
    nameEn: 'Income Statement', 
    nameFr: 'État des résultats',
    descEn: 'Revenue, expenses, profit',
    descFr: 'Revenus, dépenses, bénéfices',
  },
  { 
    id: 'cashFlow' as keyof SectionAccess, 
    icon: Banknote, 
    nameEn: 'Cash Flow', 
    nameFr: 'Flux de trésorerie',
    descEn: 'Operating, investing, financing',
    descFr: 'Exploitation, investissement, financement',
  },
  { 
    id: 'anomalies' as keyof SectionAccess, 
    icon: AlertCircle, 
    nameEn: 'Anomaly Detection', 
    nameFr: 'Détection d\'anomalies',
    descEn: 'Intelligent insights',
    descFr: 'Insights alimentés par l\'IA',
  },
  { 
    id: 'connections' as keyof SectionAccess, 
    icon: Link2, 
    nameEn: 'Data Connections', 
    nameFr: 'Connexions de données',
    descEn: 'QuickBooks, Xero, etc.',
    descFr: 'QuickBooks, Xero, etc.',
    adminOnly: true,
  },
  { 
    id: 'reports' as keyof SectionAccess, 
    icon: FileBarChart, 
    nameEn: 'Reports', 
    nameFr: 'Rapports',
    descEn: 'Generate and export',
    descFr: 'Générer et exporter',
  },
  { 
    id: 'settings' as keyof SectionAccess, 
    icon: Cog, 
    nameEn: 'Settings', 
    nameFr: 'Paramètres',
    descEn: 'Organization settings',
    descFr: 'Paramètres organisation',
    adminOnly: true,
  },
];

// Role dropdown component with better UI
interface RoleDropdownProps {
  value: 'admin' | 'member' | 'viewer';
  onChange: (role: 'admin' | 'member' | 'viewer') => void;
}

function RoleDropdown({ value, onChange }: RoleDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { language } = useI18n();
  const isEn = language === 'en';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roles = [
    { 
      id: 'admin' as const, 
      icon: Shield, 
      labelEn: 'Administrator', 
      labelFr: 'Administrateur',
      color: { bg: 'rgb(var(--color-primary-500) / 0.1)', text: 'rgb(var(--color-primary-600))', border: 'rgb(var(--color-primary-500) / 0.3)' }
    },
    { 
      id: 'member' as const, 
      icon: User, 
      labelEn: 'Member', 
      labelFr: 'Membre',
      color: { bg: 'rgb(var(--color-primary-100))', text: 'rgb(var(--color-primary-700))', border: 'rgb(var(--color-primary-200))' }
    },
    { 
      id: 'viewer' as const, 
      icon: Eye, 
      labelEn: 'Viewer', 
      labelFr: 'Lecteur',
      color: { bg: 'rgb(var(--color-bg-muted))', text: 'rgb(var(--color-text-muted))', border: 'rgb(var(--color-border))' }
    },
  ];

  const currentRole = roles.find(r => r.id === value) || roles[1];
  const CurrentIcon = currentRole.icon;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all min-w-[140px]"
        style={{ 
          backgroundColor: currentRole.color.bg,
          borderColor: currentRole.color.border,
        }}
      >
        <CurrentIcon className="w-4 h-4" style={{ color: currentRole.color.text }} />
        <span 
          className="text-sm font-medium flex-1 text-left"
          style={{ color: currentRole.color.text }}
        >
          {isEn ? currentRole.labelEn : currentRole.labelFr}
        </span>
        <ChevronDown 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: currentRole.color.text }}
        />
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-1 w-48 rounded-xl z-50 overflow-hidden shadow-lg"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))',
          }}
        >
          {roles.map((role) => {
            const RoleIcon = role.icon;
            const isSelected = value === role.id;
            
            return (
              <button
                key={role.id}
                onClick={() => {
                  onChange(role.id);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[rgb(var(--color-bg-muted))]"
                style={{
                  backgroundColor: isSelected ? 'rgb(var(--color-bg-subtle))' : 'transparent',
                }}
              >
                <div 
                  className="w-7 h-7 rounded-md flex items-center justify-center"
                  style={{ 
                    backgroundColor: role.color.bg,
                  }}
                >
                  <RoleIcon className="w-4 h-4" style={{ color: role.color.text }} />
                </div>
                <span 
                  className="text-sm font-medium flex-1"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn ? role.labelEn : role.labelFr}
                </span>
                {isSelected && (
                  <Check className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Team members component for settings
export function TeamMembersSection() {
  const { 
    currentTenant, 
    getMembers, 
    inviteMember, 
    updateMemberRole, 
    removeMember,
    canManageMembers,
    isOwner,
    getInvitations,
    revokeInvitation,
    resendInvitation,
  } = useTenant();
  const { showToast } = useNotifications();
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [members, setMembers] = useState<Awaited<ReturnType<typeof getMembers>>>([]);
  const [pendingInvitations, setPendingInvitations] = useState<TenantInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteStep, setInviteStep] = useState<'details' | 'access' | 'preview'>('details');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [sectionAccess, setSectionAccess] = useState<SectionAccess>(DEFAULT_SECTION_ACCESS.member);
  const [isInviting, setIsInviting] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  useEffect(() => {
    loadMembers();
  }, [currentTenant]);

  // Reset section access when role changes
  useEffect(() => {
    setSectionAccess(DEFAULT_SECTION_ACCESS[inviteRole]);
  }, [inviteRole]);

  const loadMembers = async () => {
    setIsLoading(true);
    try {
      const [membersData, invitationsData] = await Promise.all([
        getMembers(),
        getInvitations(),
      ]);
      setMembers(membersData);
      setPendingInvitations(invitationsData.filter(inv => inv.status === 'pending'));
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetInviteModal = () => {
    setShowInviteModal(false);
    setInviteStep('details');
    setInviteEmail('');
    setInviteRole('member');
    setSectionAccess(DEFAULT_SECTION_ACCESS.member);
    setShowEmailPreview(false);
    setCustomMessage('');
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    
    setIsInviting(true);
    try {
      const invitation = await inviteMember(inviteEmail.trim(), inviteRole);
      
      // Generate email (in production, this would be sent server-side)
      const emailHtml = generateInvitationEmail({
        inviterName: 'Admin User', // In production, get from auth
        inviterEmail: 'admin@plainledger.ca',
        organizationName: currentTenant?.name || 'Your Organization',
        recipientEmail: inviteEmail.trim(),
        role: inviteRole,
        inviteUrl: `${window.location.origin}/invite/${invitation.id}`,
        expiresAt: invitation.expiresAt,
        sectionAccess,
        customMessage: customMessage || undefined,
      }, language);
      
      console.log('Generated email HTML:', emailHtml);
      
      resetInviteModal();
      await loadMembers();
      
      showToast({
        type: 'success',
        title: isEn ? 'Invitation sent' : 'Invitation envoyée',
        message: isEn 
          ? `An invitation has been sent to ${inviteEmail}`
          : `Une invitation a été envoyée à ${inviteEmail}`,
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: isEn ? 'Error' : 'Erreur',
        message: isEn 
          ? 'Unable to send invitation.'
          : 'Impossible d\'envoyer l\'invitation.',
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleResendInvitation = async (invitationId: string, email: string) => {
    try {
      await resendInvitation(invitationId);
      showToast({
        type: 'success',
        title: isEn ? 'Invitation resent' : 'Invitation renvoyée',
        message: isEn 
          ? `Invitation resent to ${email}`
          : `Invitation renvoyée à ${email}`,
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: isEn ? 'Error' : 'Erreur',
        message: isEn ? 'Unable to resend invitation.' : 'Impossible de renvoyer l\'invitation.',
      });
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!confirm(isEn ? 'Revoke this invitation?' : 'Révoquer cette invitation ?')) return;
    
    try {
      await revokeInvitation(invitationId);
      setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      showToast({
        type: 'success',
        title: isEn ? 'Invitation revoked' : 'Invitation révoquée',
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: isEn ? 'Error' : 'Erreur',
        message: isEn ? 'Unable to revoke invitation.' : 'Impossible de révoquer l\'invitation.',
      });
    }
  };

  const toggleSection = (sectionId: keyof SectionAccess) => {
    setSectionAccess(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir retirer ${memberName} de l'organisation?`)) {
      return;
    }
    
    try {
      await removeMember(memberId);
      setMembers(prev => prev.filter(m => m.id !== memberId));
      
      showToast({
        type: 'success',
        title: 'Membre retiré',
        message: `${memberName} a été retiré de l'organisation.`,
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de retirer le membre.',
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return Crown;
      case 'admin': return Shield;
      case 'member': return User;
      case 'viewer': return Eye;
      default: return User;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'rgb(var(--color-text-muted))' }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="section-title">{isEn ? 'Team Members' : 'Membres de l\'équipe'}</h3>
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {members.length} {isEn ? 'member' : 'membre'}{members.length > 1 ? 's' : ''} • {isEn ? 'Limit' : 'Limite'}: {currentTenant?.limits.users === -1 ? (isEn ? 'Unlimited' : 'Illimité') : currentTenant?.limits.users}
          </p>
        </div>
        {canManageMembers && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            {isEn ? 'Invite' : 'Inviter'}
          </button>
        )}
      </div>

      {/* Role info hint */}
      <p 
        className="text-xs mb-4"
        style={{ color: 'rgb(var(--color-text-muted))' }}
      >
        {isEn 
          ? 'Manage permissions and create custom groups in '
          : 'Gérez les permissions et créez des groupes personnalisés dans '}
        <a 
          href="/app/settings" 
          onClick={(e) => {
            e.preventDefault();
            // Navigate to roles tab via Settings
            window.location.href = '/app/settings?tab=roles';
          }}
          className="font-medium underline-offset-2 hover:underline"
          style={{ color: 'rgb(var(--color-interactive))' }}
        >
          {isEn ? 'Roles & Access' : 'Rôles & Accès'}
        </a>
      </p>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && canManageMembers && (
        <div className="space-y-2">
          <h4 
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn ? 'Pending Invitations' : 'Invitations en attente'} ({pendingInvitations.length})
          </h4>
          {pendingInvitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ 
                backgroundColor: 'rgb(var(--color-warning) / 0.05)',
                border: '1px solid rgb(var(--color-warning) / 0.2)'
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgb(var(--color-warning) / 0.1)' }}
                >
                  <Mail className="w-4 h-4" style={{ color: 'rgb(var(--color-warning))' }} />
                </div>
                <div>
                  <p className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                    {invitation.email}
                  </p>
                  <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'Invited as' : 'Invité en tant que'} {ROLE_DEFINITIONS[invitation.role as keyof typeof ROLE_DEFINITIONS]?.[isEn ? 'nameEn' : 'nameFr']}
                    {' • '}
                    {isEn ? 'Expires' : 'Expire'} {new Date(invitation.expiresAt).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleResendInvitation(invitation.id, invitation.email)}
                  className="btn-secondary btn-sm"
                >
                  {isEn ? 'Resend' : 'Renvoyer'}
                </button>
                <button
                  onClick={() => handleRevokeInvitation(invitation.id)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'rgb(var(--color-error))' }}
                  title={isEn ? 'Revoke' : 'Révoquer'}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Members list */}
      <div className="space-y-2">
        {members.map((member) => {
          const RoleIcon = getRoleIcon(member.role);
          const canEdit = canManageMembers && member.role !== 'owner';
          const roleInfo = ROLE_DEFINITIONS[member.role as keyof typeof ROLE_DEFINITIONS];
          
          // Determine role color - using app's primary green palette
          const roleColors: Record<string, { bg: string; text: string; border: string }> = {
            owner: { bg: 'rgb(var(--color-accent-500) / 0.1)', text: 'rgb(var(--color-accent-600))', border: 'rgb(var(--color-accent-500) / 0.3)' },
            admin: { bg: 'rgb(var(--color-primary-500) / 0.1)', text: 'rgb(var(--color-primary-600))', border: 'rgb(var(--color-primary-500) / 0.3)' },
            member: { bg: 'rgb(var(--color-primary-100))', text: 'rgb(var(--color-primary-700))', border: 'rgb(var(--color-primary-200))' },
            viewer: { bg: 'rgb(var(--color-bg-muted))', text: 'rgb(var(--color-text-muted))', border: 'rgb(var(--color-border))' },
          };
          const colors = roleColors[member.role] || roleColors.viewer;
          
          return (
            <div
              key={member.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-lg transition-colors"
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))',
                border: '1px solid rgb(var(--color-border))'
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div 
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-semibold text-base sm:text-lg flex-shrink-0"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-primary-500) / 0.15)',
                    color: 'rgb(var(--color-primary-500))'
                  }}
                >
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold truncate" style={{ color: 'rgb(var(--color-text))' }}>
                      {member.name}
                    </span>
                    <div 
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                      style={{ 
                        backgroundColor: colors.bg,
                        color: colors.text,
                        border: `1px solid ${colors.border}`
                      }}
                      title={roleInfo?.descFr || ''}
                    >
                      <RoleIcon className="w-3 h-3" />
                      <span className="hidden xs:inline">
                        {member.role === 'owner' ? (isEn ? 'Owner' : 'Propriétaire') :
                         member.role === 'admin' ? (isEn ? 'Admin' : 'Admin') :
                         member.role === 'member' ? (isEn ? 'Member' : 'Membre') : (isEn ? 'Viewer' : 'Lecteur')}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {member.email}
                  </p>
                </div>
              </div>
              
              {canEdit && (
                <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                  <RoleDropdown
                    value={member.role as 'admin' | 'member' | 'viewer'}
                    onChange={(role) => updateMemberRole(member.id, role)}
                  />
                  <button
                    onClick={() => handleRemoveMember(member.id, member.name)}
                    className="p-2 rounded-lg transition-colors hover:bg-[rgb(var(--color-error)/0.1)]"
                    style={{ color: 'rgb(var(--color-error))' }}
                    title={isEn ? 'Remove member' : 'Retirer le membre'}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Enhanced Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div 
            className="w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            style={{ backgroundColor: 'rgb(var(--color-surface))' }}
          >
            {/* Header with steps */}
            <div 
              className="px-6 py-4 border-b flex-shrink-0"
              style={{ borderColor: 'rgb(var(--color-border))' }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Invite Team Member' : 'Inviter un membre'}
                </h3>
                <button 
                  onClick={resetInviteModal}
                  className="icon-btn"
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                >
                  ×
                </button>
              </div>
              
              {/* Step indicators */}
              <div className="flex items-center gap-2">
                {[
                  { id: 'details', label: isEn ? 'Details' : 'Détails' },
                  { id: 'access', label: isEn ? 'Access' : 'Accès' },
                  { id: 'preview', label: isEn ? 'Preview' : 'Aperçu' },
                ].map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <button
                      onClick={() => {
                        if (step.id === 'details' || (step.id === 'access' && inviteEmail.trim()) || (step.id === 'preview' && inviteEmail.trim())) {
                          setInviteStep(step.id as typeof inviteStep);
                        }
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        inviteStep === step.id ? '' : 'opacity-60'
                      }`}
                      style={{
                        backgroundColor: inviteStep === step.id ? 'rgb(var(--color-primary-500) / 0.15)' : 'transparent',
                        color: inviteStep === step.id ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))',
                      }}
                    >
                      <span 
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                        style={{
                          backgroundColor: inviteStep === step.id ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-bg-muted))',
                          color: inviteStep === step.id ? 'white' : 'rgb(var(--color-text-muted))',
                        }}
                      >
                        {index + 1}
                      </span>
                      {step.label}
                    </button>
                    {index < 2 && (
                      <ChevronRight className="w-4 h-4 mx-1" style={{ color: 'rgb(var(--color-text-subtle))' }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Step content */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Step 1: Details */}
              {inviteStep === 'details' && (
                <div className="space-y-5">
                  <div>
                    <label className="label">
                      <Mail className="w-4 h-4 inline mr-2" />
                      {isEn ? 'Email address' : 'Adresse e-mail'}
                    </label>
                    <input
                      type="email"
                      className="input"
                      placeholder={isEn ? 'colleague@example.com' : 'collegue@exemple.com'}
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      autoFocus
                    />
                  </div>
                  
                  <div>
                    <label className="label mb-3">
                      {isEn ? 'Select a role' : 'Sélectionner un rôle'}
                    </label>
                    <RoleSelector
                      value={inviteRole}
                      onChange={(role) => setInviteRole(role as 'admin' | 'member' | 'viewer')}
                      excludeOwner={true}
                      showDescriptions={true}
                    />
                  </div>

                  {inviteRole === 'admin' && (
                    <div 
                      className="p-3 rounded-lg flex items-start gap-2"
                      style={{ 
                        backgroundColor: 'rgb(var(--color-info) / 0.1)',
                        border: '1px solid rgb(var(--color-info) / 0.2)'
                      }}
                    >
                      <Database className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'rgb(var(--color-info))' }} />
                      <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                        {isEn 
                          ? 'Administrators can connect accounting systems (QuickBooks, Xero, etc.) and sync data.'
                          : 'Les administrateurs peuvent connecter des systèmes comptables (QuickBooks, Xero, etc.) et synchroniser les données.'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Section Access */}
              {inviteStep === 'access' && (
                <div className="space-y-4">
                  <div 
                    className="p-3 rounded-lg flex items-start gap-2 mb-4"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-bg-subtle))',
                      border: '1px solid rgb(var(--color-border))'
                    }}
                  >
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
                    <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      {isEn 
                        ? 'Customize which sections this user can access. Unchecked sections will be hidden from their view.'
                        : 'Personnalisez les sections auxquelles cet utilisateur peut accéder. Les sections non cochées seront masquées.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SECTION_DEFINITIONS.map((section) => {
                      const Icon = section.icon;
                      const isEnabled = sectionAccess[section.id];
                      const isDisabled = section.adminOnly && inviteRole !== 'admin';
                      
                      return (
                        <button
                          key={section.id}
                          onClick={() => !isDisabled && toggleSection(section.id)}
                          disabled={isDisabled}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                          }`}
                          style={{
                            backgroundColor: isEnabled ? 'rgb(var(--color-success) / 0.05)' : 'rgb(var(--color-surface))',
                            borderColor: isEnabled ? 'rgb(var(--color-success) / 0.3)' : 'rgb(var(--color-border))',
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div 
                              className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                              style={{ 
                                backgroundColor: isEnabled ? 'rgb(var(--color-success) / 0.1)' : 'rgb(var(--color-bg-muted))',
                                color: isEnabled ? 'rgb(var(--color-success))' : 'rgb(var(--color-text-muted))'
                              }}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span 
                                  className="font-medium text-sm"
                                  style={{ color: 'rgb(var(--color-text))' }}
                                >
                                  {isEn ? section.nameEn : section.nameFr}
                                </span>
                                {section.adminOnly && (
                                  <span 
                                    className="text-[10px] px-1.5 py-0.5 rounded"
                                    style={{ 
                                      backgroundColor: 'rgb(var(--color-warning) / 0.1)',
                                      color: 'rgb(var(--color-warning))'
                                    }}
                                  >
                                    Admin
                                  </span>
                                )}
                              </div>
                              <p 
                                className="text-xs mt-0.5"
                                style={{ color: 'rgb(var(--color-text-muted))' }}
                              >
                                {isEn ? section.descEn : section.descFr}
                              </p>
                            </div>
                            <div 
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                isEnabled ? 'border-transparent' : ''
                              }`}
                              style={{
                                backgroundColor: isEnabled ? 'rgb(var(--color-success))' : 'transparent',
                                borderColor: isEnabled ? 'rgb(var(--color-success))' : 'rgb(var(--color-border-strong))',
                              }}
                            >
                              {isEnabled && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Preview */}
              {inviteStep === 'preview' && (
                <div className="space-y-5">
                  {/* Summary - Clean layout without gray background */}
                  <div>
                    <h4 className="font-medium mb-3" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'Invitation Summary' : 'Résumé de l\'invitation'}
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div 
                        className="flex justify-between items-center py-2"
                        style={{ borderBottom: '1px solid rgb(var(--color-border-subtle))' }}
                      >
                        <span style={{ color: 'rgb(var(--color-text-muted))' }}>
                          {isEn ? 'Email' : 'Courriel'}
                        </span>
                        <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                          {inviteEmail}
                        </span>
                      </div>
                      <div 
                        className="flex justify-between items-center py-2"
                        style={{ borderBottom: '1px solid rgb(var(--color-border-subtle))' }}
                      >
                        <span style={{ color: 'rgb(var(--color-text-muted))' }}>
                          {isEn ? 'Role' : 'Rôle'}
                        </span>
                        <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                          {ROLE_DEFINITIONS[inviteRole]?.[isEn ? 'nameEn' : 'nameFr']}
                        </span>
                      </div>
                      <div 
                        className="flex justify-between items-center py-2"
                        style={{ borderBottom: '1px solid rgb(var(--color-border-subtle))' }}
                      >
                        <span style={{ color: 'rgb(var(--color-text-muted))' }}>
                          {isEn ? 'Organization' : 'Organisation'}
                        </span>
                        <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                          {currentTenant?.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section access summary */}
                  <div>
                    <h4 className="font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'Section Access' : 'Accès aux sections'}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {SECTION_DEFINITIONS
                        .filter(section => sectionAccess[section.id])
                        .map(section => (
                          <span 
                            key={section.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium"
                            style={{ 
                              backgroundColor: 'rgb(var(--color-success) / 0.1)',
                              color: 'rgb(var(--color-success))'
                            }}
                          >
                            <Check className="w-3 h-3" />
                            {isEn ? section.nameEn : section.nameFr}
                          </span>
                        ))}
                    </div>
                  </div>

                  {/* Invitation Link Preview */}
                  <div>
                    <h4 className="font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'Invitation Link' : 'Lien d\'invitation'}
                    </h4>
                    <div 
                      className="flex items-center gap-2 p-3 rounded-lg"
                      style={{ 
                        backgroundColor: 'rgb(var(--color-primary-500) / 0.05)',
                        border: '1px solid rgb(var(--color-primary-500) / 0.2)'
                      }}
                    >
                      <Link2 className="w-4 h-4 flex-shrink-0" style={{ color: 'rgb(var(--color-primary-600))' }} />
                      <code 
                        className="flex-1 text-xs truncate font-mono"
                        style={{ color: 'rgb(var(--color-primary-700))' }}
                      >
                        {`${window.location.origin}/invite/${currentTenant?.slug || 'org'}?token=xxxxx`}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/invite/${currentTenant?.slug || 'org'}?token=preview`);
                          showToast({
                            type: 'success',
                            title: isEn ? 'Link copied!' : 'Lien copié !',
                          });
                        }}
                        className="flex-shrink-0 p-1.5 rounded hover:bg-[rgb(var(--color-primary-500)/0.1)] transition-colors"
                        title={isEn ? 'Copy link' : 'Copier le lien'}
                      >
                        <Copy className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-600))' }} />
                      </button>
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn 
                        ? 'This link will be included in the invitation email and expires in 7 days.'
                        : 'Ce lien sera inclus dans le courriel d\'invitation et expire dans 7 jours.'}
                    </p>
                  </div>

                  {/* Custom Message (optional) */}
                  <div>
                    <h4 className="font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'Personal Message' : 'Message personnalisé'}
                      <span className="text-xs font-normal ml-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        ({isEn ? 'optional' : 'optionnel'})
                      </span>
                    </h4>
                    <textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder={isEn 
                        ? 'Add a personal note to your invitation...'
                        : 'Ajoutez une note personnelle à votre invitation...'}
                      className="input w-full resize-none"
                      rows={3}
                      maxLength={500}
                    />
                    <p className="text-xs mt-1 text-right" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {customMessage.length}/500
                    </p>
                  </div>

                  {/* Email preview toggle */}
                  <div>
                    <button
                      onClick={() => setShowEmailPreview(!showEmailPreview)}
                      className="flex items-center gap-2 text-sm font-medium"
                      style={{ color: 'rgb(var(--color-interactive))' }}
                    >
                      <Mail className="w-4 h-4" />
                      {showEmailPreview 
                        ? (isEn ? 'Hide email preview' : 'Masquer l\'aperçu')
                        : (isEn ? 'Preview invitation email' : 'Aperçu du courriel')}
                      <ChevronDown className={`w-4 h-4 transition-transform ${showEmailPreview ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showEmailPreview && (
                      <div 
                        className="mt-3 rounded-lg overflow-hidden"
                        style={{ border: '1px solid rgb(var(--color-border))' }}
                      >
                        <div 
                          className="px-3 py-2 flex items-center justify-between"
                          style={{ 
                            borderBottom: '1px solid rgb(var(--color-border))',
                            backgroundColor: 'rgb(var(--color-bg-subtle))'
                          }}
                        >
                          <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                            {isEn ? 'Email Preview' : 'Aperçu du courriel'}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const emailHtml = generateInvitationEmail({
                                  inviterName: 'Admin User',
                                  inviterEmail: 'admin@plainledger.ca',
                                  organizationName: currentTenant?.name || '',
                                  recipientEmail: inviteEmail,
                                  role: inviteRole,
                                  inviteUrl: `${window.location.origin}/invite/${currentTenant?.slug || 'org'}?token=preview`,
                                  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                                  sectionAccess,
                                  customMessage: customMessage || undefined,
                                }, language);
                                navigator.clipboard.writeText(emailHtml);
                                showToast({
                                  type: 'success',
                                  title: isEn ? 'HTML Copied!' : 'HTML copié !',
                                  message: isEn ? 'Email HTML copied to clipboard' : 'HTML du courriel copié dans le presse-papiers',
                                });
                              }}
                              className="text-xs flex items-center gap-1 px-2 py-1 rounded hover:bg-white/50 transition-colors"
                              style={{ color: 'rgb(var(--color-interactive))' }}
                              title={isEn ? 'Copy HTML' : 'Copier le HTML'}
                            >
                              <Copy className="w-3 h-3" />
                              HTML
                            </button>
                            <button
                              onClick={() => {
                                const emailText = generateInvitationEmailText({
                                  inviterName: 'Admin User',
                                  inviterEmail: 'admin@plainledger.ca',
                                  organizationName: currentTenant?.name || '',
                                  recipientEmail: inviteEmail,
                                  role: inviteRole,
                                  inviteUrl: `${window.location.origin}/invite/${currentTenant?.slug || 'org'}?token=preview`,
                                  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                                  sectionAccess,
                                  customMessage: customMessage || undefined,
                                }, language);
                                navigator.clipboard.writeText(emailText);
                                showToast({
                                  type: 'success',
                                  title: isEn ? 'Text Copied!' : 'Texte copié !',
                                  message: isEn ? 'Plain text version copied' : 'Version texte copiée',
                                });
                              }}
                              className="text-xs flex items-center gap-1 px-2 py-1 rounded hover:bg-white/50 transition-colors"
                              style={{ color: 'rgb(var(--color-interactive))' }}
                              title={isEn ? 'Copy plain text' : 'Copier le texte'}
                            >
                              <Copy className="w-3 h-3" />
                              {isEn ? 'Text' : 'Texte'}
                            </button>
                          </div>
                        </div>
                        <div 
                          className="relative"
                          style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}
                        >
                          <div 
                            className="overflow-auto"
                            style={{ 
                              maxHeight: '500px',
                              backgroundColor: '#f8fafc'
                            }}
                          >
                            <iframe
                              srcDoc={generateInvitationEmail({
                                inviterName: 'Admin User',
                                inviterEmail: 'admin@plainledger.ca',
                                organizationName: currentTenant?.name || '',
                                recipientEmail: inviteEmail,
                                role: inviteRole,
                                inviteUrl: `${window.location.origin}/invite/${currentTenant?.slug || 'org'}?token=preview`,
                                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                                sectionAccess,
                                customMessage: customMessage || undefined,
                              }, language)}
                              className="w-full border-0"
                              style={{ 
                                minHeight: '400px',
                                backgroundColor: '#f8fafc'
                              }}
                              title={isEn ? 'Email Preview' : 'Aperçu du courriel'}
                            />
                          </div>
                          <div 
                            className="px-3 py-2 text-xs"
                            style={{ 
                              borderTop: '1px solid rgb(var(--color-border))',
                              backgroundColor: 'rgb(var(--color-surface))',
                              color: 'rgb(var(--color-text-muted))'
                            }}
                          >
                            <p className="mb-1">
                              <strong>{isEn ? 'To:' : 'À :'}</strong> {inviteEmail || 'collegue@exemple.com'}
                            </p>
                            <p>
                              <strong>{isEn ? 'Subject:' : 'Objet :'}</strong> {isEn ? 'You\'re invited to join ' : 'Invitation à rejoindre '}{currentTenant?.name || 'Your Organization'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div 
              className="px-6 py-4 border-t flex justify-between flex-shrink-0"
              style={{ 
                borderColor: 'rgb(var(--color-border))',
                backgroundColor: 'rgb(var(--color-bg-subtle))'
              }}
            >
              <button
                onClick={() => {
                  if (inviteStep === 'access') setInviteStep('details');
                  else if (inviteStep === 'preview') setInviteStep('access');
                  else resetInviteModal();
                }}
                className="btn-secondary"
                disabled={isInviting}
              >
                {inviteStep === 'details' 
                  ? (isEn ? 'Cancel' : 'Annuler')
                  : (isEn ? 'Back' : 'Retour')}
              </button>
              
              <button
                onClick={() => {
                  if (inviteStep === 'details') setInviteStep('access');
                  else if (inviteStep === 'access') setInviteStep('preview');
                  else handleInvite();
                }}
                className="btn-primary flex items-center gap-2"
                disabled={!inviteEmail.trim() || isInviting}
              >
                {isInviting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isEn ? 'Sending...' : 'Envoi...'}
                  </>
                ) : inviteStep === 'preview' ? (
                  <>
                    <Mail className="w-4 h-4" />
                    {isEn ? 'Send Invitation' : 'Envoyer l\'invitation'}
                  </>
                ) : (
                  <>
                    {isEn ? 'Next' : 'Suivant'}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
