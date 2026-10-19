import { useState, useRef, useEffect, useCallback } from 'react';
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
import { ROLE_DEFINITIONS } from './RolesPermissions';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/keycloak';

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
  const { user } = useAuth();
  useEffect(() => {
    setIsOpen(false);
    setShowCreateModal(false);
    setNewOrgName('');
  }, [user?.id, currentTenant?.id]);

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
    
    try {
      await switchTenant(tenant.id);
      setIsOpen(false);
      showToast('success', isEn ? `You are now working in ${tenant.name}.` : `Vous travaillez maintenant dans ${tenant.name}.`);
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : (isEn ? 'Unable to switch organization.' : "Impossible de changer d’organisation."));
    }
  };

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) return;
    setIsCreating(true);
    try {
      const newTenant = await createTenant({ name: newOrgName.trim() });
      setShowCreateModal(false);
      setNewOrgName('');
      setIsOpen(false);
      showToast('success', isEn ? `${newTenant.name} was created.` : `${newTenant.name} a été créée.`);
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : (isEn ? 'Unable to create organization.' : "Impossible de créer l’organisation."));
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

type EditableMemberRole = 'admin' | 'member' | 'viewer';
const MEMBER_PAGE_SIZE = 50;

/** Durable membership records come from the server; freshly issued links stay in memory. */
export function TeamMembersSection() {
  const { currentTenant, getMembers, inviteMember, updateMemberRole, removeMember,
    canManageMembers, getInvitations, revokeInvitation, resendInvitation } = useTenant();
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const { language } = useI18n();
  const isEn = language === 'en';
  const [members, setMembers] = useState<Awaited<ReturnType<typeof getMembers>>>([]);
  const [pendingInvitations, setPendingInvitations] = useState<TenantInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<EditableMemberRole>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [memberPage, setMemberPage] = useState(0);
  const [invitationPage, setInvitationPage] = useState(0);
  const scopeRef = useRef(0);

  const errorMessage = (error: unknown) => error instanceof Error ? error.message :
    (isEn ? 'The request failed. Please try again.' : 'La demande a échoué. Veuillez réessayer.');

  const loadMembers = useCallback(async () => {
    const scope = scopeRef.current;
    setIsLoading(true);
    setLoadError(null);
    try {
      const [nextMembers, nextInvitations] = await Promise.all([
        getMembers(), canManageMembers ? getInvitations() : Promise.resolve([]),
      ]);
      if (scope !== scopeRef.current) return;
      if (!Array.isArray(nextMembers) || !Array.isArray(nextInvitations)) {
        throw new Error('The server returned invalid membership data.');
      }
      setMembers(nextMembers);
      setPendingInvitations(previous => nextInvitations.filter(invitation => invitation.status === 'pending').map(invitation => ({
        ...invitation, inviteUrl: invitation.inviteUrl ?? previous.find(item => item.id === invitation.id)?.inviteUrl,
      })));
    } catch (error) {
      if (scope === scopeRef.current) setLoadError(error instanceof Error ? error.message : 'Unable to load team members.');
    } finally {
      if (scope === scopeRef.current) setIsLoading(false);
    }
  }, [getMembers, getInvitations, canManageMembers]);

  useEffect(() => {
    scopeRef.current++;
    setMembers([]);
    setPendingInvitations([]);
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteRole('member');
    setInviteError(null);
    setIsInviting(false);
    setBusyId(null);
    setMemberPage(0);
    setInvitationPage(0);
    if (currentTenant) void loadMembers();
    else setIsLoading(false);
    return () => { scopeRef.current++; };
  }, [currentTenant?.id, user?.id, loadMembers]);

  const storeInvitation = (invitation: TenantInvitation) => {
    setPendingInvitations(previous => [invitation, ...previous.filter(item => item.id !== invitation.id)]);
    setInvitationPage(0);
    const failed = invitation.deliveryStatus === 'failed';
    const queued = invitation.deliveryStatus === 'queued';
    showToast(failed ? 'error' : 'success', failed
      ? invitation.deliveryMessage || (isEn ? 'Email delivery failed. The invitation is still pending; copy the link to share it.' : 'La livraison a échoué. L’invitation reste en attente; copiez le lien pour la partager.')
      : queued ? (isEn ? 'Invitation queued for email delivery.' : 'Invitation en attente de livraison par courriel.')
      : (isEn ? 'Invitation link ready. Copy the link below to share it.' : 'Lien d’invitation prêt. Copiez le lien ci-dessous pour le partager.'));
  };

  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = inviteEmail.trim();
    if (!email || isInviting) return;
    const scope = scopeRef.current;
    setIsInviting(true);
    setInviteError(null);
    try {
      const invitation = await inviteMember(email, inviteRole);
      if (scope !== scopeRef.current) return;
      storeInvitation(invitation);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');
    } catch (error) {
      if (scope === scopeRef.current) setInviteError(errorMessage(error));
    } finally {
      if (scope === scopeRef.current) setIsInviting(false);
    }
  };

  const handleResend = async (invitationId: string) => {
    const scope = scopeRef.current;
    setBusyId(invitationId);
    try {
      const invitation = await resendInvitation(invitationId);
      if (scope === scopeRef.current) storeInvitation(invitation);
    } catch (error) {
      if (scope === scopeRef.current) showToast('error', errorMessage(error));
    } finally {
      if (scope === scopeRef.current) setBusyId(null);
    }
  };

  const copyInvitation = async (invitation: TenantInvitation) => {
    if (!invitation.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(invitation.inviteUrl);
      showToast('success', isEn ? 'Invitation link copied.' : 'Lien d’invitation copié.');
    } catch {
      showToast('error', isEn ? 'Clipboard access failed. Select and copy the link below.' : 'Accès au presse-papiers refusé. Sélectionnez et copiez le lien ci-dessous.');
    }
  };

  const handleRevoke = async (invitationId: string) => {
    const scope = scopeRef.current;
    setBusyId(invitationId);
    try {
      await revokeInvitation(invitationId);
      if (scope !== scopeRef.current) return;
      setPendingInvitations(previous => previous.filter(item => item.id !== invitationId));
      showToast('success', isEn ? 'Invitation revoked.' : 'Invitation révoquée.');
    } catch (error) {
      if (scope === scopeRef.current) showToast('error', errorMessage(error));
    } finally {
      if (scope === scopeRef.current) setBusyId(null);
    }
  };

  const changeRole = async (memberId: string, role: EditableMemberRole) => {
    const scope = scopeRef.current;
    setBusyId(memberId);
    try {
      await updateMemberRole(memberId, role);
      if (scope !== scopeRef.current) return;
      setMembers(previous => previous.map(member => member.id === memberId ? { ...member, role } : member));
      showToast('success', isEn ? 'Member role updated.' : 'Rôle du membre mis à jour.');
    } catch (error) {
      if (scope === scopeRef.current) showToast('error', errorMessage(error));
    } finally {
      if (scope === scopeRef.current) setBusyId(null);
    }
  };

  const handleRemove = async (memberId: string, name: string) => {
    if (!window.confirm(isEn ? `Remove ${name} from this organization?` : `Retirer ${name} de cette organisation ?`)) return;
    const scope = scopeRef.current;
    setBusyId(memberId);
    try {
      await removeMember(memberId);
      if (scope !== scopeRef.current) return;
      setMembers(previous => previous.filter(member => member.id !== memberId));
      showToast('success', isEn ? 'Member removed.' : 'Membre retiré.');
    } catch (error) {
      if (scope === scopeRef.current) showToast('error', errorMessage(error));
    } finally {
      if (scope === scopeRef.current) setBusyId(null);
    }
  };

  const roleLabel = (role: 'owner' | EditableMemberRole) => ROLE_DEFINITIONS[role]?.[isEn ? 'nameEn' : 'nameFr'] || role;
  const roles = (['admin', 'member', 'viewer'] as const).map(role => <option key={role} value={role}>{roleLabel(role)}</option>);
  const paginate = (count: number, page: number, setPage: (page: number) => void, label: string) => count > MEMBER_PAGE_SIZE && (
    <nav aria-label={label} className="flex flex-wrap items-center justify-end gap-3 text-sm">
      <button className="btn-secondary btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>{isEn ? 'Previous' : 'Précédent'}</button>
      <span>{Math.min(page * MEMBER_PAGE_SIZE + 1, count)}–{Math.min((page + 1) * MEMBER_PAGE_SIZE, count)} / {count}</span>
      <button className="btn-secondary btn-sm" disabled={(page + 1) * MEMBER_PAGE_SIZE >= count} onClick={() => setPage(page + 1)}>{isEn ? 'Next' : 'Suivant'}</button>
    </nav>
  );
  const safeMemberPage = Math.min(memberPage, Math.max(0, Math.ceil(members.length / MEMBER_PAGE_SIZE) - 1));
  const safeInvitationPage = Math.min(invitationPage, Math.max(0, Math.ceil(pendingInvitations.length / MEMBER_PAGE_SIZE) - 1));

  if (!currentTenant) return <p role="status">{isEn ? 'Select an organization to view its team.' : 'Sélectionnez une organisation pour afficher son équipe.'}</p>;
  return (
    <section className="min-w-0 space-y-4" aria-label={isEn ? 'Team members' : 'Membres de l’équipe'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="section-title">{isEn ? 'Team Members' : 'Membres de l’équipe'}</h3>
          <p className="text-sm text-muted">{members.length} {isEn ? 'members' : 'membres'}</p></div>
        {canManageMembers && <button className="btn-primary flex items-center gap-2" onClick={() => { setInviteError(null); setShowInviteModal(true); }}><Mail className="h-4 w-4" />{isEn ? 'Invite' : 'Inviter'}</button>}
      </div>
      {isLoading && <p role="status" className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{isEn ? 'Loading team…' : 'Chargement de l’équipe…'}</p>}
      {loadError && <div role="alert" className="rounded-lg border border-red-300 p-3"><p>{loadError}</p><button className="btn-secondary mt-2" onClick={() => void loadMembers()}>{isEn ? 'Retry' : 'Réessayer'}</button></div>}
      {canManageMembers && pendingInvitations.length > 0 && <div className="space-y-3">
        <h4 className="font-medium">{isEn ? 'Pending invitations' : 'Invitations en attente'} ({pendingInvitations.length})</h4>
        {pendingInvitations.slice(safeInvitationPage * MEMBER_PAGE_SIZE, (safeInvitationPage + 1) * MEMBER_PAGE_SIZE).map(invitation => <article key={invitation.id} className="min-w-0 rounded-lg border p-3 space-y-2" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0"><p className="break-all font-medium">{invitation.email}</p><p className="text-xs text-muted">{roleLabel(invitation.role)} · {isEn ? 'Expires' : 'Expire'} {new Date(invitation.expiresAt).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA')}</p></div>
            <div className="flex flex-wrap gap-2">
              {invitation.inviteUrl && <button className="btn-secondary btn-sm flex items-center gap-1" onClick={() => void copyInvitation(invitation)}><Copy className="h-3 w-3" />{isEn ? 'Copy link' : 'Copier le lien'}</button>}
              <button className="btn-secondary btn-sm" disabled={busyId !== null} onClick={() => void handleResend(invitation.id)}>{busyId === invitation.id ? (isEn ? 'Updating…' : 'Mise à jour…') : (isEn ? 'Create new link' : 'Créer un nouveau lien')}</button>
              <button className="btn-secondary btn-sm" disabled={busyId !== null} onClick={() => void handleRevoke(invitation.id)}>{isEn ? 'Revoke' : 'Révoquer'}</button>
            </div>
          </div>
          <p role={invitation.deliveryStatus === 'failed' ? 'alert' : undefined} className="text-sm">{invitation.deliveryStatus === 'failed'
            ? invitation.deliveryMessage || (isEn ? 'Email delivery failed. This invitation is still pending.' : 'La livraison a échoué. Cette invitation reste en attente.')
            : invitation.deliveryStatus === 'queued' ? (isEn ? 'Email delivery is queued.' : 'La livraison par courriel est en attente.')
            : invitation.deliveryStatus === 'unsent' ? (isEn ? 'Email has not been sent. Share the invitation link.' : 'Aucun courriel envoyé. Partagez le lien d’invitation.')
            : (isEn ? 'Delivery status is unavailable.' : 'Le statut de livraison est indisponible.')}</p>
          {invitation.inviteUrl && <input aria-label={`${isEn ? 'Invitation link for' : 'Lien d’invitation pour'} ${invitation.email}`} readOnly value={invitation.inviteUrl} onFocus={event => event.currentTarget.select()} className="input w-full min-w-0 text-xs" />}
          <p className="text-xs text-muted">{isEn ? 'Creating a new link invalidates the previous link.' : 'Un nouveau lien invalide le lien précédent.'}</p>
        </article>)}
        {paginate(pendingInvitations.length, safeInvitationPage, setInvitationPage, 'Invitation pages')}
      </div>}
      {!isLoading && !loadError && members.length === 0 && <p role="status">{isEn ? 'No team members were returned.' : 'Aucun membre n’a été retourné.'}</p>}
      <div className="space-y-2">{members.slice(safeMemberPage * MEMBER_PAGE_SIZE, (safeMemberPage + 1) * MEMBER_PAGE_SIZE).map(member => <article key={member.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg border p-3" style={{ borderColor: 'rgb(var(--color-border))' }}>
        <div className="min-w-0"><p className="break-words font-medium">{member.name || member.email}</p><p className="break-all text-xs text-muted">{member.email}</p></div>
        <div className="flex flex-wrap items-center gap-2">{canManageMembers && member.role !== 'owner' ? <>
          <select className="input text-sm" aria-label={`${isEn ? 'Role for' : 'Rôle de'} ${member.email}`} value={member.role} disabled={busyId !== null} onChange={event => void changeRole(member.id, event.target.value as EditableMemberRole)}>{roles}</select>
          <button className="btn-secondary btn-sm" disabled={busyId !== null} onClick={() => void handleRemove(member.id, member.name || member.email)}>{isEn ? 'Remove' : 'Retirer'}</button>
        </> : <span className="text-sm">{roleLabel(member.role)}</span>}</div>
      </article>)}</div>
      {paginate(members.length, safeMemberPage, setMemberPage, 'Member pages')}
      {showInviteModal && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
        <form onSubmit={handleInvite} role="dialog" aria-modal="true" aria-labelledby="invite-title" className="w-full max-w-md rounded-xl p-5 space-y-4" style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
          <h3 id="invite-title" className="text-lg font-semibold">{isEn ? 'Invite a team member' : 'Inviter un membre'}</h3>
          <label className="block text-sm">{isEn ? 'Email address' : 'Adresse courriel'}<input autoFocus required type="email" maxLength={320} className="input mt-1 w-full" value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} disabled={isInviting} /></label>
          <label className="block text-sm">{isEn ? 'Role' : 'Rôle'}<select className="input mt-1 w-full" value={inviteRole} onChange={event => setInviteRole(event.target.value as EditableMemberRole)} disabled={isInviting}>{roles}</select></label>
          <p className="text-sm text-muted">{isEn ? 'The invitation will use the permissions associated with this role. Email delivery and the invitation link will appear after creation.' : 'L’invitation utilisera les permissions de ce rôle. Le statut de livraison et le lien apparaîtront après la création.'}</p>
          {inviteError && <p role="alert" className="text-sm text-red-600">{inviteError}</p>}
          <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" disabled={isInviting} onClick={() => setShowInviteModal(false)}>{isEn ? 'Cancel' : 'Annuler'}</button><button type="submit" className="btn-primary" disabled={isInviting}>{isInviting ? (isEn ? 'Creating…' : 'Création…') : (isEn ? 'Create invitation' : 'Créer l’invitation')}</button></div>
        </form>
      </div>}
    </section>
  );
}
