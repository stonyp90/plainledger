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
    if (tenant.status === 'trial') {
      const daysLeft = tenant.trialEndsAt 
        ? Math.ceil((new Date(tenant.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;
      return (
        <span 
          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
          style={{ 
            backgroundColor: 'rgb(var(--color-warning) / 0.1)',
            color: 'rgb(var(--color-warning))'
          }}
        >
          Essai • {daysLeft}j
        </span>
      );
    }
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

  if (isLoading) {
    return (
      <div 
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          border: '1px solid rgb(var(--color-border))'
        }}
      >
        <div 
          className="w-8 h-8 rounded-lg animate-pulse"
          style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
        />
        <div className="flex-1 space-y-1.5">
          <div 
            className="h-3.5 w-24 rounded animate-pulse"
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
          />
          <div 
            className="h-2.5 w-16 rounded animate-pulse"
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
          />
        </div>
        <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: 'rgb(var(--color-primary-500))' }} />
      </div>
    );
  }

  // Get role color for visual distinction
  const getRoleColor = (role: Tenant['role']) => {
    switch (role) {
      case 'owner': return 'var(--color-warning)';
      case 'admin': return 'var(--color-info)';
      case 'member': return 'var(--color-success)';
      case 'viewer': return 'var(--color-text-muted)';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button - Enhanced with theme accent and visual hierarchy */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
          hover:shadow-md active:scale-[0.98] group
          ${isOpen ? 'shadow-md' : 'hover:border-opacity-80'}
        `}
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          border: `1.5px solid ${isOpen ? 'rgb(var(--color-primary-500) / 0.5)' : 'rgb(var(--color-border))'}`,
          boxShadow: isOpen ? '0 0 0 3px rgb(var(--color-primary-500) / 0.1)' : undefined,
        }}
        title={currentTenant?.name || 'Sélectionner une organisation'}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Organization avatar with gradient and ring indicator */}
          <div className="relative flex-shrink-0">
            <div 
              className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm transition-transform group-hover:scale-105"
              style={{ 
                background: currentTenant 
                  ? 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-700)) 100%)'
                  : 'rgb(var(--color-bg-muted))',
                color: currentTenant ? 'white' : 'rgb(var(--color-text-muted))',
                boxShadow: currentTenant ? '0 2px 8px rgb(var(--color-primary-500) / 0.3)' : 'none'
              }}
            >
              {currentTenant ? currentTenant.name.charAt(0).toUpperCase() : <Building2 className="w-4 h-4" />}
            </div>
            {/* Role indicator dot */}
            {currentTenant && (
              <div 
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center"
                style={{ 
                  backgroundColor: `rgb(${getRoleColor(currentTenant.role)})`,
                  borderColor: 'rgb(var(--color-surface))'
                }}
                title={getRoleLabel(currentTenant.role)}
              >
                {currentTenant.role === 'owner' && <Crown className="w-2 h-2 text-white" />}
              </div>
            )}
          </div>
          {!compact && (
            <div className="min-w-0 text-left flex-1">
              <span 
                className="text-sm font-semibold truncate block leading-tight"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {currentTenant?.name || 'Sélectionner...'}
              </span>
              {currentTenant && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span 
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-bg-muted))',
                      color: 'rgb(var(--color-text-muted))'
                    }}
                  >
                    {currentTenant.plan}
                  </span>
                  <span 
                    className="text-[10px] truncate"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  >
                    {getRoleLabel(currentTenant.role)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        <div 
          className={`
            w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-200
            ${isOpen ? 'rotate-180' : ''}
          `}
          style={{ 
            backgroundColor: isOpen ? 'rgb(var(--color-primary-500) / 0.1)' : 'rgb(var(--color-bg-muted))',
            color: isOpen ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))'
          }}
        >
          <ChevronDown className="w-4 h-4" />
        </div>
      </button>

      {/* Dropdown - Enhanced with better visual hierarchy */}
      {isOpen && (
        <div 
          className="absolute left-0 right-0 mt-2 rounded-2xl z-50 overflow-hidden animate-scale-in"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))',
            boxShadow: '0 20px 50px rgb(var(--color-primary-500) / 0.15), 0 8px 20px rgb(0 0 0 / 0.12)',
          }}
          role="listbox"
          aria-label="Sélectionner une organisation"
        >
          {/* Header with accent bar */}
          <div 
            className="relative px-4 py-3.5 border-b"
            style={{ 
              borderColor: 'rgb(var(--color-border))',
              backgroundColor: 'rgb(var(--color-surface))',
            }}
          >
            {/* Top accent line */}
            <div 
              className="absolute top-0 left-4 right-4 h-0.5 rounded-full"
              style={{ 
                background: 'linear-gradient(90deg, rgb(var(--color-primary-500)), rgb(var(--color-primary-400)), transparent)'
              }}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                    color: 'rgb(var(--color-primary-500))'
                  }}
                >
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  Organisations
                </p>
              </div>
              <span 
                className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
                style={{ 
                  backgroundColor: 'rgb(var(--color-primary-500))',
                  color: 'white'
                }}
              >
                {tenants.length}
              </span>
            </div>
          </div>

          {/* Tenant list - Touch-optimized with better spacing */}
          <div className="max-h-[50vh] sm:max-h-72 overflow-y-auto py-2 px-2" style={{ WebkitOverflowScrolling: 'touch' }}>
            {tenants.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div 
                  className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ 
                    background: 'linear-gradient(135deg, rgb(var(--color-bg-muted)) 0%, rgb(var(--color-bg-subtle)) 100%)'
                  }}
                >
                  <Building2 className="w-8 h-8" style={{ color: 'rgb(var(--color-text-muted))' }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  Aucune organisation
                </p>
                <p className="text-xs mt-1.5 max-w-[200px] mx-auto" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  Créez votre première organisation pour commencer
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {tenants.map((tenant) => {
                  const RoleIcon = getRoleIcon(tenant.role);
                  const isSelected = tenant.id === currentTenant?.id;
                  const roleColor = getRoleColor(tenant.role);
                  
                  return (
                    <button
                      key={tenant.id}
                      onClick={() => handleSwitchTenant(tenant)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-3 text-left transition-all duration-150
                        rounded-xl active:scale-[0.98]
                        ${tenant.status === 'suspended' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                      style={{
                        backgroundColor: isSelected ? 'rgb(var(--color-primary-500) / 0.1)' : 'transparent',
                        border: isSelected ? '1.5px solid rgb(var(--color-primary-500) / 0.3)' : '1.5px solid transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected && tenant.status !== 'suspended') {
                          e.currentTarget.style.backgroundColor = 'rgb(var(--color-bg-muted))';
                          e.currentTarget.style.borderColor = 'rgb(var(--color-border))';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.borderColor = 'transparent';
                        }
                      }}
                      disabled={tenant.status === 'suspended'}
                      role="option"
                      aria-selected={isSelected}
                    >
                      {/* Avatar with role color ring */}
                      <div className="relative flex-shrink-0">
                        <div 
                          className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm transition-all"
                          style={{ 
                            background: isSelected 
                              ? 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-700)) 100%)'
                              : 'rgb(var(--color-bg-muted))',
                            color: isSelected 
                              ? 'white'
                              : 'rgb(var(--color-text-secondary))',
                            boxShadow: isSelected ? '0 4px 12px rgb(var(--color-primary-500) / 0.35)' : 'none'
                          }}
                        >
                          {tenant.name.charAt(0).toUpperCase()}
                        </div>
                        {/* Role indicator */}
                        <div 
                          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center"
                          style={{ 
                            backgroundColor: `rgb(${roleColor})`,
                            borderColor: isSelected ? 'rgb(var(--color-primary-500) / 0.1)' : 'rgb(var(--color-surface))'
                          }}
                        >
                          <RoleIcon className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span 
                            className="font-semibold text-sm truncate"
                            style={{ 
                              color: tenant.status === 'suspended' 
                                ? 'rgb(var(--color-text-muted))'
                                : 'rgb(var(--color-text))'
                            }}
                          >
                            {tenant.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {getPlanBadge(tenant.plan)}
                          {getStatusBadge(tenant)}
                        </div>
                      </div>

                      {/* Selection indicator */}
                      <div 
                        className={`
                          w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                          ${isSelected ? 'scale-100' : 'scale-0'}
                        `}
                        style={{ 
                          backgroundColor: 'rgb(var(--color-primary-500))',
                          boxShadow: isSelected ? '0 2px 6px rgb(var(--color-primary-500) / 0.4)' : 'none'
                        }}
                      >
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer actions - Clean modern design */}
          <div 
            className="border-t p-2.5"
            style={{ 
              borderColor: 'rgb(var(--color-border))',
              backgroundColor: 'rgb(var(--color-bg-subtle))'
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setShowCreateModal(true);
                  setIsOpen(false);
                }}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:shadow-md active:scale-[0.97]"
                style={{ 
                  background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
                  color: 'white',
                  boxShadow: '0 2px 8px rgb(var(--color-primary-500) / 0.3)'
                }}
              >
                <Plus className="w-4 h-4" />
                <span>Créer</span>
              </button>
              
              {currentTenant && (
                <a
                  href="/app/settings"
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:shadow-sm active:scale-[0.97]"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-surface))',
                    color: 'rgb(var(--color-text-secondary))',
                    border: '1px solid rgb(var(--color-border))'
                  }}
                  onClick={() => setIsOpen(false)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgb(var(--color-bg-muted))';
                    e.currentTarget.style.borderColor = 'rgb(var(--color-border-strong))';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface))';
                    e.currentTarget.style.borderColor = 'rgb(var(--color-border))';
                  }}
                >
                  <Settings className="w-4 h-4" />
                  <span>Paramètres</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Organization Modal - Mobile-first with enhanced styling */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in"
          style={{ backgroundColor: 'rgb(0 0 0 / 0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}
        >
          <div 
            className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] sm:max-h-[85vh] flex flex-col animate-scale-in"
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

      {/* Role Legend */}
      <div 
        className="p-3 rounded-lg flex items-start gap-2 mb-4"
        style={{ 
          backgroundColor: 'rgb(var(--color-bg-subtle))',
          border: '1px solid rgb(var(--color-border))'
        }}
      >
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
        <div className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
          <span className="font-medium">{isEn ? 'Roles:' : 'Rôles :'}</span>{' '}
          <span className="inline-flex items-center gap-1"><Crown className="w-3 h-3" /> {isEn ? 'Owner' : 'Propriétaire'}</span> = {isEn ? 'full access' : 'accès total'} |{' '}
          <span className="inline-flex items-center gap-1"><Shield className="w-3 h-3" /> Admin</span> = {isEn ? 'connect systems' : 'peut connecter systèmes'} |{' '}
          <span className="inline-flex items-center gap-1"><User className="w-3 h-3" /> {isEn ? 'Member' : 'Membre'}</span> = {isEn ? 'create reports' : 'peut créer rapports'} |{' '}
          <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" /> {isEn ? 'Viewer' : 'Lecteur'}</span> = {isEn ? 'read-only' : 'lecture seule'}
        </div>
      </div>

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
          
          // Determine role color
          const roleColors: Record<string, { bg: string; text: string; border: string }> = {
            owner: { bg: 'rgb(var(--color-warning) / 0.1)', text: 'rgb(var(--color-warning))', border: 'rgb(var(--color-warning) / 0.3)' },
            admin: { bg: 'rgb(var(--color-info) / 0.1)', text: 'rgb(var(--color-info))', border: 'rgb(var(--color-info) / 0.3)' },
            member: { bg: 'rgb(var(--color-success) / 0.1)', text: 'rgb(var(--color-success))', border: 'rgb(var(--color-success) / 0.3)' },
            viewer: { bg: 'rgb(var(--color-bg-muted))', text: 'rgb(var(--color-text-muted))', border: 'rgb(var(--color-border))' },
          };
          const colors = roleColors[member.role] || roleColors.viewer;
          
          return (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 rounded-lg transition-colors"
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))',
                border: '1px solid rgb(var(--color-border))'
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-11 h-11 rounded-full flex items-center justify-center font-semibold text-lg"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-primary-500) / 0.15)',
                    color: 'rgb(var(--color-primary-500))'
                  }}
                >
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                      {member.name}
                    </span>
                    <div 
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ 
                        backgroundColor: colors.bg,
                        color: colors.text,
                        border: `1px solid ${colors.border}`
                      }}
                      title={roleInfo?.descFr || ''}
                    >
                      <RoleIcon className="w-3.5 h-3.5" />
                      {member.role === 'owner' ? 'Propriétaire' :
                       member.role === 'admin' ? 'Administrateur' :
                       member.role === 'member' ? 'Membre' : 'Lecteur'}
                    </div>
                    {/* Show if user can manage connections */}
                    {(member.role === 'owner' || member.role === 'admin') && (
                      <span 
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ 
                          backgroundColor: 'rgb(var(--color-bg-muted))',
                          color: 'rgb(var(--color-text-muted))'
                        }}
                        title="Peut connecter des systèmes comptables"
                      >
                        <Database className="w-3 h-3 inline-block mr-0.5" />
                        Connexions
                      </span>
                    )}
                  </div>
                  <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {member.email}
                  </p>
                </div>
              </div>
              
              {canEdit && (
                <div className="flex items-center gap-2">
                  <select
                    value={member.role}
                    onChange={(e) => updateMemberRole(member.id, e.target.value as 'admin' | 'member' | 'viewer')}
                    className="select text-sm py-1.5"
                    title="Changer le rôle"
                  >
                    <option value="admin">🛡️ Administrateur</option>
                    <option value="member">👤 Membre</option>
                    <option value="viewer">👁️ Lecteur</option>
                  </select>
                  <button
                    onClick={() => handleRemoveMember(member.id, member.name)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Retirer le membre"
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
                <div className="space-y-4">
                  {/* Summary */}
                  <div 
                    className="p-4 rounded-lg"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-bg-subtle))',
                      border: '1px solid rgb(var(--color-border))'
                    }}
                  >
                    <h4 className="font-medium mb-3" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'Invitation Summary' : 'Résumé de l\'invitation'}
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span style={{ color: 'rgb(var(--color-text-muted))' }}>
                          {isEn ? 'Email' : 'Courriel'}
                        </span>
                        <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                          {inviteEmail}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: 'rgb(var(--color-text-muted))' }}>
                          {isEn ? 'Role' : 'Rôle'}
                        </span>
                        <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                          {ROLE_DEFINITIONS[inviteRole]?.[isEn ? 'nameEn' : 'nameFr']}
                        </span>
                      </div>
                      <div className="flex justify-between">
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
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
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
                            backgroundColor: 'rgb(var(--color-bg-muted))',
                            borderBottom: '1px solid rgb(var(--color-border))'
                          }}
                        >
                          <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                            {isEn ? 'Email Preview' : 'Aperçu du courriel'}
                          </span>
                          <button
                            onClick={() => {
                              const emailText = generateInvitationEmailText({
                                inviterName: 'Admin User',
                                inviterEmail: 'admin@plainledger.ca',
                                organizationName: currentTenant?.name || '',
                                recipientEmail: inviteEmail,
                                role: inviteRole,
                                inviteUrl: `${window.location.origin}/invite/preview`,
                                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                                sectionAccess,
                              }, language);
                              navigator.clipboard.writeText(emailText);
                              showToast({
                                type: 'success',
                                title: isEn ? 'Copied!' : 'Copié !',
                              });
                            }}
                            className="text-xs flex items-center gap-1"
                            style={{ color: 'rgb(var(--color-interactive))' }}
                          >
                            <Copy className="w-3 h-3" />
                            {isEn ? 'Copy' : 'Copier'}
                          </button>
                        </div>
                        <div 
                          className="p-4 text-sm max-h-64 overflow-y-auto"
                          style={{ backgroundColor: 'rgb(var(--color-surface))' }}
                        >
                          <div className="space-y-2">
                            <p><strong>{isEn ? 'To:' : 'À :'}</strong> {inviteEmail}</p>
                            <p><strong>{isEn ? 'Subject:' : 'Objet :'}</strong> {isEn ? 'You\'re invited to join ' : 'Invitation à rejoindre '}{currentTenant?.name}</p>
                            <hr style={{ borderColor: 'rgb(var(--color-border))' }} />
                            <p style={{ color: 'rgb(var(--color-text-secondary))' }}>
                              {isEn 
                                ? `Admin User has invited you to join ${currentTenant?.name} on PlainLedger as ${ROLE_DEFINITIONS[inviteRole]?.nameEn}.`
                                : `Admin User vous invite à rejoindre ${currentTenant?.name} sur PlainLedger en tant que ${ROLE_DEFINITIONS[inviteRole]?.nameFr}.`}
                            </p>
                            <p style={{ color: 'rgb(var(--color-text-secondary))' }}>
                              {isEn ? 'You will have access to:' : 'Vous aurez accès à :'}
                            </p>
                            <ul className="list-disc list-inside" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                              {SECTION_DEFINITIONS
                                .filter(section => sectionAccess[section.id])
                                .map(section => (
                                  <li key={section.id}>{isEn ? section.nameEn : section.nameFr}</li>
                                ))}
                            </ul>
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
