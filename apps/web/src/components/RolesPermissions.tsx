/**
 * Roles & Permissions Component
 * Enhanced with custom role management and responsive design
 */

import { useState, useMemo } from 'react';
import { 
  Crown, 
  Shield, 
  User, 
  Eye, 
  Check, 
  X,
  Info,
  Database,
  FileText,
  Settings,
  Users,
  Webhook,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Plus,
  Edit3,
  Trash2,
  Save,
  Copy,
  MoreVertical,
  Lock,
  Unlock,
  Search,
  Filter,
  BarChart2,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useTenant } from '../contexts/TenantContext';

// =====================================================
// TYPES
// =====================================================

export interface Permission {
  id: string;
  nameEn: string;
  nameFr: string;
  descEn?: string;
  descFr?: string;
  critical?: boolean;
}

export interface PermissionCategory {
  id: string;
  nameEn: string;
  nameFr: string;
  descEn: string;
  descFr: string;
  icon: React.ElementType;
  permissions: Permission[];
}

export interface RoleDefinition {
  id: string;
  nameEn: string;
  nameFr: string;
  descEn: string;
  descFr: string;
  icon: React.ElementType;
  color: string;
  badge: string;
  isSystem: boolean; // System roles cannot be deleted
  permissions: string[]; // Permission IDs
}

// =====================================================
// DEFAULT DATA
// =====================================================

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: 'data',
    nameEn: 'Data & Connections',
    nameFr: 'Données & Connexions',
    descEn: 'Connect accounting software, sync data to the platform',
    descFr: 'Connecter les logiciels comptables, synchroniser les données',
    icon: Database,
    permissions: [
      { id: 'view:connections', nameEn: 'View connections', nameFr: 'Voir les connexions' },
      { id: 'manage:connections', nameEn: 'Connect/disconnect systems', nameFr: 'Connecter/déconnecter systèmes', critical: true },
      { id: 'sync:data', nameEn: 'Sync data', nameFr: 'Synchroniser données' },
      { id: 'delete:data', nameEn: 'Delete data', nameFr: 'Supprimer données', critical: true },
    ],
  },
  {
    id: 'analytics',
    nameEn: 'Analytics',
    nameFr: 'Analytique',
    descEn: 'PlainLedger native analytics and Power BI embedded reports',
    descFr: 'Analytique native PlainLedger et rapports Power BI intégrés',
    icon: BarChart2,
    permissions: [
      { id: 'view:plainledger_analytics', nameEn: 'View PlainLedger Analytics', nameFr: 'Voir analytique PlainLedger' },
      { id: 'view:powerbi_analytics', nameEn: 'View Power BI Analytics', nameFr: 'Voir analytique Power BI' },
      { id: 'manage:org_features', nameEn: 'Configure Organization Features', nameFr: 'Configurer fonctionnalités organisation', critical: true },
    ],
  },
  {
    id: 'reports',
    nameEn: 'Reports & Analysis',
    nameFr: 'Rapports & Analyses',
    descEn: 'Financial reports, anomaly detection, dashboards',
    descFr: 'Rapports financiers, détection d\'anomalies, tableaux de bord',
    icon: FileText,
    permissions: [
      { id: 'view:dashboard', nameEn: 'View dashboard', nameFr: 'Voir le tableau de bord' },
      { id: 'view:reports', nameEn: 'View reports', nameFr: 'Voir les rapports' },
      { id: 'create:reports', nameEn: 'Create reports', nameFr: 'Créer des rapports' },
      { id: 'edit:reports', nameEn: 'Edit reports', nameFr: 'Modifier rapports' },
      { id: 'delete:reports', nameEn: 'Delete reports', nameFr: 'Supprimer rapports', critical: true },
      { id: 'export:reports', nameEn: 'Export reports', nameFr: 'Exporter rapports' },
      { id: 'view:anomalies', nameEn: 'View anomalies', nameFr: 'Voir les anomalies' },
      { id: 'resolve:anomalies', nameEn: 'Resolve anomalies', nameFr: 'Résoudre anomalies' },
    ],
  },
  {
    id: 'team',
    nameEn: 'Team Management',
    nameFr: 'Gestion d\'équipe',
    descEn: 'Invite users, assign roles, manage access',
    descFr: 'Inviter utilisateurs, assigner rôles, gérer accès',
    icon: Users,
    permissions: [
      { id: 'view:members', nameEn: 'View team members', nameFr: 'Voir les membres' },
      { id: 'invite:members', nameEn: 'Invite members', nameFr: 'Inviter membres', critical: true },
      { id: 'remove:members', nameEn: 'Remove members', nameFr: 'Retirer membres', critical: true },
      { id: 'manage:roles', nameEn: 'Change member roles', nameFr: 'Modifier les rôles', critical: true },
    ],
  },
  {
    id: 'settings',
    nameEn: 'Organization Settings',
    nameFr: 'Paramètres organisation',
    descEn: 'Company info, preferences, integrations',
    descFr: 'Infos entreprise, préférences, intégrations',
    icon: Settings,
    permissions: [
      { id: 'view:settings', nameEn: 'View settings', nameFr: 'Voir les paramètres' },
      { id: 'manage:settings', nameEn: 'Change settings', nameFr: 'Modifier paramètres' },
      { id: 'manage:billing', nameEn: 'Manage billing', nameFr: 'Gérer facturation', critical: true },
      { id: 'view:audit-logs', nameEn: 'View audit logs', nameFr: 'Voir logs d\'audit' },
      { id: 'manage:branding', nameEn: 'Customize branding', nameFr: 'Personnaliser la marque' },
    ],
  },
  {
    id: 'api',
    nameEn: 'API & Integrations',
    nameFr: 'API & Intégrations',
    descEn: 'API access, webhooks, external integrations',
    descFr: 'Accès API, webhooks, intégrations externes',
    icon: Webhook,
    permissions: [
      { id: 'use:api', nameEn: 'Use API', nameFr: 'Utiliser l\'API' },
      { id: 'manage:api-keys', nameEn: 'Manage API keys', nameFr: 'Gérer clés API', critical: true },
      { id: 'manage:webhooks', nameEn: 'Configure webhooks', nameFr: 'Configurer webhooks' },
    ],
  },
];

// Get all permission IDs
const ALL_PERMISSIONS = PERMISSION_CATEGORIES.flatMap(c => c.permissions.map(p => p.id));

// Default role definitions
const DEFAULT_ROLES: RoleDefinition[] = [
  {
    id: 'owner',
    nameEn: 'Owner',
    nameFr: 'Propriétaire',
    descEn: 'Full access including billing and organization settings',
    descFr: 'Accès complet incluant facturation et paramètres',
    icon: Crown,
    color: 'warning',
    badge: '👑',
    isSystem: true,
    permissions: ALL_PERMISSIONS, // All permissions
  },
  {
    id: 'admin',
    nameEn: 'Administrator',
    nameFr: 'Administrateur',
    descEn: 'Can manage connections, users, and settings',
    descFr: 'Peut gérer les connexions, utilisateurs et paramètres',
    icon: Shield,
    color: 'primary',
    badge: '🛡️',
    isSystem: true,
    permissions: ALL_PERMISSIONS.filter(p => p !== 'manage:billing'),
  },
  {
    id: 'member',
    nameEn: 'Member',
    nameFr: 'Membre',
    descEn: 'Can view data, create and edit reports',
    descFr: 'Peut voir les données, créer et modifier les rapports',
    icon: User,
    color: 'info',
    badge: '👤',
    isSystem: true,
    permissions: [
      'view:connections', 'view:dashboard', 'view:reports', 'create:reports', 
      'edit:reports', 'export:reports', 'view:anomalies', 'resolve:anomalies',
      'view:members', 'view:settings', 'use:api'
    ],
  },
  {
    id: 'viewer',
    nameEn: 'Viewer',
    nameFr: 'Lecteur',
    descEn: 'Read-only access to dashboards and reports',
    descFr: 'Accès lecture seule aux tableaux de bord et rapports',
    icon: Eye,
    color: 'muted',
    badge: '👁️',
    isSystem: true,
    permissions: [
      'view:connections', 'view:dashboard', 'view:reports', 'view:anomalies',
      'view:members', 'view:settings'
    ],
  },
];

// For backward compatibility
export const ROLE_DEFINITIONS = Object.fromEntries(
  DEFAULT_ROLES.map(r => [r.id, r])
);

// =====================================================
// ROLE SELECTOR COMPONENT
// =====================================================

interface RoleSelectorProps {
  value: string;
  onChange: (role: string) => void;
  roles?: RoleDefinition[];
  excludeOwner?: boolean;
  showDescriptions?: boolean;
  compact?: boolean;
}

export function RoleSelector({ 
  value, 
  onChange, 
  roles = DEFAULT_ROLES,
  excludeOwner = true, 
  showDescriptions = true,
  compact = false,
}: RoleSelectorProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const availableRoles = excludeOwner 
    ? roles.filter(r => r.id !== 'owner')
    : roles;

  if (compact) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="select"
      >
        {availableRoles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.badge} {isEn ? role.nameEn : role.nameFr}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="space-y-2">
      {availableRoles.map((role) => {
        const Icon = role.icon;
        const isSelected = value === role.id;
        
        return (
          <button
            key={role.id}
            type="button"
            onClick={() => onChange(role.id)}
            className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
              isSelected ? 'border-current' : 'border-transparent'
            }`}
            style={{
              backgroundColor: isSelected 
                ? 'rgb(var(--color-bg-muted))' 
                : 'rgb(var(--color-surface))',
              borderColor: isSelected 
                ? 'rgb(var(--color-primary-500))' 
                : 'rgb(var(--color-border))',
            }}
          >
            <div className="flex items-start gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ 
                  backgroundColor: isSelected 
                    ? 'rgb(var(--color-primary-500))' 
                    : 'rgb(var(--color-bg-muted))',
                  color: isSelected 
                    ? 'white' 
                    : 'rgb(var(--color-text-muted))'
                }}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span 
                    className="font-medium"
                    style={{ color: 'rgb(var(--color-text))' }}
                  >
                    {role.badge} {isEn ? role.nameEn : role.nameFr}
                  </span>
                  {isSelected && (
                    <Check className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
                  )}
                </div>
                {showDescriptions && (
                  <p 
                    className="text-sm mt-0.5"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  >
                    {isEn ? role.descEn : role.descFr}
                  </p>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// =====================================================
// ROLE BADGE COMPONENT
// =====================================================

interface RoleBadgeProps {
  role: string;
  roles?: RoleDefinition[];
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export function RoleBadge({ role, roles = DEFAULT_ROLES, size = 'sm', showIcon = true }: RoleBadgeProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const roleInfo = roles.find(r => r.id === role) || DEFAULT_ROLES[0];
  const Icon = roleInfo.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  return (
    <span 
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]}`}
      style={{ 
        backgroundColor: 'rgb(var(--color-bg-muted))',
        color: 'rgb(var(--color-text-secondary))'
      }}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      {isEn ? roleInfo.nameEn : roleInfo.nameFr}
    </span>
  );
}

// =====================================================
// PERMISSION TOGGLE COMPONENT
// =====================================================

interface PermissionToggleProps {
  permission: Permission;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  isEn: boolean;
}

function PermissionToggle({ permission, enabled, onChange, disabled, isEn }: PermissionToggleProps) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`w-full flex items-center justify-between p-2 sm:p-3 rounded-lg transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black/5 dark:hover:bg-white/5'
      }`}
      style={{ 
        backgroundColor: enabled ? 'rgb(var(--color-success) / 0.05)' : 'transparent'
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span 
          className="text-xs sm:text-sm truncate"
          style={{ color: 'rgb(var(--color-text-secondary))' }}
        >
          {isEn ? permission.nameEn : permission.nameFr}
        </span>
        {permission.critical && (
          <AlertTriangle 
            className="w-3 h-3 flex-shrink-0" 
            style={{ color: 'rgb(var(--color-warning))' }}
          />
        )}
      </div>
      <div 
        className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
          enabled ? '' : ''
        }`}
        style={{ 
          backgroundColor: enabled ? 'rgb(var(--color-success))' : 'rgb(var(--color-bg-muted))',
          color: enabled ? 'white' : 'rgb(var(--color-text-muted))'
        }}
      >
        {enabled ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      </div>
    </button>
  );
}

// =====================================================
// MOBILE PERMISSION CARD
// =====================================================

interface MobilePermissionCardProps {
  role: RoleDefinition;
  categories: PermissionCategory[];
  onTogglePermission: (permissionId: string) => void;
  isEditable: boolean;
  isEn: boolean;
}

function MobilePermissionCard({ role, categories, onTogglePermission, isEditable, isEn }: MobilePermissionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = role.icon;
  
  const totalPermissions = categories.flatMap(c => c.permissions).length;
  const enabledPermissions = role.permissions.length;
  
  return (
    <div 
      className="rounded-xl overflow-hidden"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        border: '1px solid rgb(var(--color-border))'
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
          >
            <Icon className="w-5 h-5" style={{ color: 'rgb(var(--color-text))' }} />
          </div>
          <div className="text-left">
            <h4 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {role.badge} {isEn ? role.nameEn : role.nameFr}
            </h4>
            <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {enabledPermissions}/{totalPermissions} {isEn ? 'permissions' : 'permissions'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {role.isSystem && (
            <Lock className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
          )}
          {expanded ? (
            <ChevronUp className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
          ) : (
            <ChevronDown className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
          )}
        </div>
      </button>
      
      {/* Expanded Content */}
      {expanded && (
        <div className="border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
          {categories.map((category) => {
            const CategoryIcon = category.icon;
            return (
              <div key={category.id}>
                <div 
                  className="px-4 py-2 flex items-center gap-2"
                  style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                >
                  <CategoryIcon className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                  <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {isEn ? category.nameEn : category.nameFr}
                  </span>
                </div>
                <div className="px-2 py-1">
                  {category.permissions.map((permission) => (
                    <PermissionToggle
                      key={permission.id}
                      permission={permission}
                      enabled={role.permissions.includes(permission.id)}
                      onChange={() => onTogglePermission(permission.id)}
                      disabled={!isEditable || role.isSystem}
                      isEn={isEn}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =====================================================
// DESKTOP PERMISSION MATRIX
// =====================================================

interface DesktopPermissionMatrixProps {
  roles: RoleDefinition[];
  categories: PermissionCategory[];
  onTogglePermission: (roleId: string, permissionId: string) => void;
  isEditable: boolean;
  isEn: boolean;
}

function DesktopPermissionMatrix({ roles, categories, onTogglePermission, isEditable, isEn }: DesktopPermissionMatrixProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map(c => c.id))
  );

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <div 
      className="rounded-xl overflow-hidden"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        border: '1px solid rgb(var(--color-border))'
      }}
    >
      {/* Role Headers */}
      <div 
        className="grid gap-1 p-3"
        style={{ 
          gridTemplateColumns: `minmax(200px, 1fr) repeat(${roles.length}, minmax(80px, 120px))`,
          backgroundColor: 'rgb(var(--color-bg-muted))'
        }}
      >
        <div className="flex items-center">
          <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn ? 'Permission' : 'Permission'}
          </span>
        </div>
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <div key={role.id} className="text-center">
              <Icon className="w-5 h-5 mx-auto mb-1" style={{ color: 'rgb(var(--color-text-muted))' }} />
              <span className="text-xs font-medium block" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? role.nameEn : role.nameFr}
              </span>
              {role.isSystem && (
                <Lock className="w-3 h-3 mx-auto mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Permission Rows */}
      {categories.map((category) => {
        const CategoryIcon = category.icon;
        const isExpanded = expandedCategories.has(category.id);

        return (
          <div key={category.id}>
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full grid gap-1 p-3 items-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ 
                gridTemplateColumns: `minmax(200px, 1fr) repeat(${roles.length}, minmax(80px, 120px))`,
                backgroundColor: 'rgb(var(--color-bg-muted) / 0.5)'
              }}
            >
              <div className="flex items-center gap-2">
                <CategoryIcon className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                <span className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? category.nameEn : category.nameFr}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                ) : (
                  <ChevronDown className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                )}
              </div>
              {/* Summary dots */}
              {roles.map((role) => {
                const count = category.permissions.filter(p => role.permissions.includes(p.id)).length;
                const total = category.permissions.length;
                return (
                  <div key={role.id} className="text-center">
                    <span 
                      className="text-xs"
                      style={{ 
                        color: count === total 
                          ? 'rgb(var(--color-success))' 
                          : count > 0 
                            ? 'rgb(var(--color-warning))' 
                            : 'rgb(var(--color-text-muted))'
                      }}
                    >
                      {count}/{total}
                    </span>
                  </div>
                );
              })}
            </button>

            {/* Permissions */}
            {isExpanded && category.permissions.map((permission, idx) => (
              <div
                key={permission.id}
                className="grid gap-1 px-3 py-2 items-center"
                style={{ 
                  gridTemplateColumns: `minmax(200px, 1fr) repeat(${roles.length}, minmax(80px, 120px))`,
                  backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgb(var(--color-bg-muted) / 0.3)'
                }}
              >
                <div className="flex items-center gap-2 pl-6">
                  <span className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {isEn ? permission.nameEn : permission.nameFr}
                  </span>
                  {permission.critical && (
                    <AlertTriangle 
                      className="w-3 h-3 flex-shrink-0" 
                      style={{ color: 'rgb(var(--color-warning))' }}
                      title={isEn ? 'Critical permission' : 'Permission critique'}
                    />
                  )}
                </div>
                {roles.map((role) => {
                  const hasPermission = role.permissions.includes(permission.id);
                  const canEdit = isEditable && !role.isSystem;
                  
                  return (
                    <div key={role.id} className="flex justify-center">
                      <button
                        onClick={() => canEdit && onTogglePermission(role.id, permission.id)}
                        disabled={!canEdit}
                        className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                          canEdit ? 'hover:scale-110' : ''
                        }`}
                        style={{ 
                          backgroundColor: hasPermission 
                            ? 'rgb(var(--color-success))' 
                            : 'rgb(var(--color-bg-muted))',
                          color: hasPermission ? 'white' : 'rgb(var(--color-text-muted))',
                          cursor: canEdit ? 'pointer' : 'default'
                        }}
                      >
                        {hasPermission ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// =====================================================
// CREATE/EDIT ROLE MODAL
// =====================================================

interface RoleModalProps {
  role?: RoleDefinition | null;
  onSave: (role: Omit<RoleDefinition, 'icon'> & { icon?: React.ElementType }) => void;
  onClose: () => void;
  existingRoles: RoleDefinition[];
  isEn: boolean;
}

function RoleModal({ role, onSave, onClose, existingRoles, isEn }: RoleModalProps) {
  const [name, setName] = useState(role?.nameEn || '');
  const [nameFr, setNameFr] = useState(role?.nameFr || '');
  const [desc, setDesc] = useState(role?.descEn || '');
  const [descFr, setDescFr] = useState(role?.descFr || '');
  const [permissions, setPermissions] = useState<string[]>(role?.permissions || []);
  const [copyFromRole, setCopyFromRole] = useState<string>('');
  
  const isNew = !role;
  
  const handleCopyPermissions = (roleId: string) => {
    const sourceRole = existingRoles.find(r => r.id === roleId);
    if (sourceRole) {
      setPermissions([...sourceRole.permissions]);
    }
    setCopyFromRole('');
  };
  
  const handleTogglePermission = (permissionId: string) => {
    setPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    );
  };
  
  const handleToggleCategory = (categoryId: string) => {
    const category = PERMISSION_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return;
    
    const categoryPermIds = category.permissions.map(p => p.id);
    const allEnabled = categoryPermIds.every(p => permissions.includes(p));
    
    if (allEnabled) {
      setPermissions(prev => prev.filter(p => !categoryPermIds.includes(p)));
    } else {
      setPermissions(prev => [...new Set([...prev, ...categoryPermIds])]);
    }
  };
  
  const handleSave = () => {
    if (!name.trim()) return;
    
    onSave({
      id: role?.id || `custom_${Date.now()}`,
      nameEn: name,
      nameFr: nameFr || name,
      descEn: desc,
      descFr: descFr || desc,
      color: 'default',
      badge: '⚙️',
      isSystem: false,
      permissions,
    });
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: 'rgb(var(--color-surface))' }}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <h3 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {isNew 
              ? (isEn ? 'Create Custom Role' : 'Créer un rôle personnalisé')
              : (isEn ? 'Edit Role' : 'Modifier le rôle')}
          </h3>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{isEn ? 'Name (English)' : 'Nom (Anglais)'}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder={isEn ? 'e.g., Accountant' : 'ex: Comptable'}
              />
            </div>
            <div>
              <label className="label">{isEn ? 'Name (French)' : 'Nom (Français)'}</label>
              <input
                type="text"
                value={nameFr}
                onChange={(e) => setNameFr(e.target.value)}
                className="input"
                placeholder={isEn ? 'e.g., Comptable' : 'ex: Comptable'}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">{isEn ? 'Description' : 'Description'}</label>
              <input
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="input"
                placeholder={isEn ? 'Brief description of this role' : 'Brève description de ce rôle'}
              />
            </div>
          </div>
          
          {/* Copy from existing role */}
          <div 
            className="p-4 rounded-xl flex flex-col sm:flex-row sm:items-center gap-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700/30"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary-100 dark:bg-primary-800/40 flex-shrink-0">
                <Copy className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              </div>
              <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                {isEn ? 'Copy permissions from:' : 'Copier les permissions de:'}
              </span>
            </div>
            <div className="relative sm:w-56">
              <select
                value={copyFromRole}
                onChange={(e) => handleCopyPermissions(e.target.value)}
                className="w-full appearance-none px-4 py-2.5 pr-10 rounded-lg text-sm font-medium cursor-pointer transition-all
                  bg-white dark:bg-gray-800 
                  border-2 border-primary-300 dark:border-primary-600
                  text-primary-700 dark:text-primary-300
                  hover:border-primary-400 dark:hover:border-primary-500
                  focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              >
                <option value="">{isEn ? 'Select a role...' : 'Sélectionner un rôle...'}</option>
                {existingRoles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.badge} {isEn ? r.nameEn : r.nameFr}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-500 pointer-events-none" />
            </div>
          </div>
          
          {/* Permissions */}
          <div>
            <h4 className="font-medium mb-3" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Permissions' : 'Permissions'} ({permissions.length})
            </h4>
            <div className="space-y-3">
              {PERMISSION_CATEGORIES.map((category) => {
                const CategoryIcon = category.icon;
                const categoryPermIds = category.permissions.map(p => p.id);
                const enabledCount = categoryPermIds.filter(p => permissions.includes(p)).length;
                const allEnabled = enabledCount === categoryPermIds.length;
                
                return (
                  <div 
                    key={category.id}
                    className="rounded-lg overflow-hidden"
                    style={{ border: '1px solid rgb(var(--color-border))' }}
                  >
                    <button
                      onClick={() => handleToggleCategory(category.id)}
                      className="w-full p-3 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5"
                      style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                    >
                      <div className="flex items-center gap-2">
                        <CategoryIcon className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                        <span className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                          {isEn ? category.nameEn : category.nameFr}
                        </span>
                        <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                          ({enabledCount}/{categoryPermIds.length})
                        </span>
                      </div>
                      <div 
                        className={`w-5 h-5 rounded flex items-center justify-center`}
                        style={{ 
                          backgroundColor: allEnabled ? 'rgb(var(--color-success))' : 'rgb(var(--color-bg))',
                          color: allEnabled ? 'white' : 'rgb(var(--color-text-muted))'
                        }}
                      >
                        {allEnabled ? <Check className="w-3 h-3" /> : null}
                      </div>
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 p-2">
                      {category.permissions.map((permission) => (
                        <PermissionToggle
                          key={permission.id}
                          permission={permission}
                          enabled={permissions.includes(permission.id)}
                          onChange={() => handleTogglePermission(permission.id)}
                          disabled={false}
                          isEn={isEn}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div 
          className="p-4 sm:p-6 border-t flex flex-col sm:flex-row gap-3 sm:justify-end"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <button onClick={onClose} className="btn-secondary order-2 sm:order-1">
            {isEn ? 'Cancel' : 'Annuler'}
          </button>
          <button 
            onClick={handleSave} 
            className="btn-primary flex items-center justify-center gap-2 order-1 sm:order-2"
            disabled={!name.trim()}
          >
            <Save className="w-4 h-4" />
            {isNew ? (isEn ? 'Create Role' : 'Créer le rôle') : (isEn ? 'Save Changes' : 'Enregistrer')}
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function RolesPermissionsSection() {
  const { language } = useI18n();
  const isEn = language === 'en';
  const { canManageMembers } = useTenant();
  
  const [roles, setRoles] = useState<RoleDefinition[]>(DEFAULT_ROLES);
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  
  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return PERMISSION_CATEGORIES;
    
    const query = searchQuery.toLowerCase();
    return PERMISSION_CATEGORIES.map(cat => ({
      ...cat,
      permissions: cat.permissions.filter(p => 
        p.nameEn.toLowerCase().includes(query) || 
        p.nameFr.toLowerCase().includes(query)
      )
    })).filter(cat => cat.permissions.length > 0);
  }, [searchQuery]);
  
  // Filter roles
  const filteredRoles = useMemo(() => {
    if (selectedRoleFilter === 'all') return roles;
    if (selectedRoleFilter === 'system') return roles.filter(r => r.isSystem);
    if (selectedRoleFilter === 'custom') return roles.filter(r => !r.isSystem);
    return roles;
  }, [roles, selectedRoleFilter]);
  
  const handleTogglePermission = (roleId: string, permissionId: string) => {
    setRoles(prev => prev.map(role => {
      if (role.id !== roleId || role.isSystem) return role;
      
      const hasPermission = role.permissions.includes(permissionId);
      return {
        ...role,
        permissions: hasPermission
          ? role.permissions.filter(p => p !== permissionId)
          : [...role.permissions, permissionId]
      };
    }));
  };
  
  const handleSaveRole = (roleData: Omit<RoleDefinition, 'icon'>) => {
    const newRole: RoleDefinition = {
      ...roleData,
      icon: User,
    };
    
    setRoles(prev => {
      const existing = prev.find(r => r.id === newRole.id);
      if (existing) {
        return prev.map(r => r.id === newRole.id ? newRole : r);
      }
      return [...prev, newRole];
    });
    
    setShowCreateModal(false);
    setEditingRole(null);
  };
  
  const handleDeleteRole = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (!role || role.isSystem) return;
    
    if (confirm(isEn 
      ? `Are you sure you want to delete the "${role.nameEn}" role?`
      : `Êtes-vous sûr de vouloir supprimer le rôle "${role.nameFr}"?`
    )) {
      setRoles(prev => prev.filter(r => r.id !== roleId));
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Roles & Permissions' : 'Rôles & Permissions'}
          </h3>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn 
              ? 'Manage what each role can do in your organization'
              : 'Gérer ce que chaque rôle peut faire dans votre organisation'}
          </p>
        </div>
        {canManageMembers && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2 self-start"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{isEn ? 'Create Role' : 'Créer un rôle'}</span>
            <span className="sm:hidden">{isEn ? 'New' : 'Nouveau'}</span>
          </button>
        )}
      </div>

      {/* Info Banner */}
      {canManageMembers && (
        <div 
          className="p-3 sm:p-4 rounded-xl flex items-start gap-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700/30"
        >
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary-100 dark:bg-primary-800/40"
          >
            <Lock className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary-700 dark:text-primary-300">
              {isEn 
                ? 'System roles are protected'
                : 'Les rôles système sont protégés'}
            </p>
            <p className="text-sm mt-0.5 text-primary-600/80 dark:text-primary-400/80">
              {isEn 
                ? 'Owner, Admin, Member, and Viewer roles cannot be modified. Create custom roles to define specific permissions for your team.'
                : 'Les rôles Propriétaire, Admin, Membre et Lecteur ne peuvent pas être modifiés. Créez des rôles personnalisés pour définir des permissions spécifiques.'}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isEn ? 'Search permissions...' : 'Rechercher permissions...'}
            className="input pl-10 w-full"
          />
        </div>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center bg-primary-100 dark:bg-primary-800/40">
            <Shield className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </div>
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="appearance-none pl-14 pr-10 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all
              bg-white dark:bg-gray-800 
              border-2 border-primary-200 dark:border-primary-700/50
              text-primary-700 dark:text-primary-300
              hover:border-primary-300 dark:hover:border-primary-600
              focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
          >
            <option value="all">{isEn ? 'All roles' : 'Tous les rôles'}</option>
            <option value="system">{isEn ? 'System roles' : 'Rôles système'}</option>
            <option value="custom">{isEn ? 'Custom roles' : 'Rôles personnalisés'}</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-500 pointer-events-none" />
        </div>
      </div>

      {/* Role Overview - Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {filteredRoles.map((role) => (
          <MobilePermissionCard
            key={role.id}
            role={role}
            categories={filteredCategories}
            onTogglePermission={(permId) => handleTogglePermission(role.id, permId)}
            isEditable={canManageMembers}
            isEn={isEn}
          />
        ))}
      </div>

      {/* Desktop Permission Matrix */}
      <div className="hidden lg:block">
        <DesktopPermissionMatrix
          roles={filteredRoles}
          categories={filteredCategories}
          onTogglePermission={handleTogglePermission}
          isEditable={canManageMembers}
          isEn={isEn}
        />
      </div>

      {/* Custom Roles Management */}
      {canManageMembers && roles.some(r => !r.isSystem) && (
        <div className="space-y-3">
          <h4 className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Custom Roles' : 'Rôles personnalisés'}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {roles.filter(r => !r.isSystem).map((role) => (
              <div
                key={role.id}
                className="p-4 rounded-xl flex items-center justify-between"
                style={{ 
                  backgroundColor: 'rgb(var(--color-surface))',
                  border: '1px solid rgb(var(--color-border))'
                }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                  >
                    <User className="w-5 h-5" style={{ color: 'rgb(var(--color-text))' }} />
                  </div>
                  <div>
                    <h5 className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                      {role.badge} {isEn ? role.nameEn : role.nameFr}
                    </h5>
                    <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {role.permissions.length} {isEn ? 'permissions' : 'permissions'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingRole(role)}
                    className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                    title={isEn ? 'Edit' : 'Modifier'}
                  >
                    <Edit3 className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                  </button>
                  <button
                    onClick={() => handleDeleteRole(role.id)}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                    title={isEn ? 'Delete' : 'Supprimer'}
                  >
                    <Trash2 className="w-4 h-4" style={{ color: 'rgb(var(--color-error))' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Important Notes */}
      <div 
        className="p-3 sm:p-4 rounded-lg"
        style={{ 
          backgroundColor: 'rgb(var(--color-warning) / 0.1)',
          border: '1px solid rgb(var(--color-warning) / 0.2)'
        }}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-warning))' }} />
          <div>
            <h5 className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Critical Permissions' : 'Permissions critiques'}
            </h5>
            <ul className="text-xs sm:text-sm mt-1 space-y-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              <li className="flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 flex-shrink-0" style={{ color: 'rgb(var(--color-warning))' }} />
                {isEn 
                  ? 'Permissions marked with this icon can affect billing, data, or security'
                  : 'Les permissions marquées de cette icône peuvent affecter la facturation, les données ou la sécurité'}
              </li>
              <li>• {isEn 
                ? 'Only Owners can manage billing and transfer ownership'
                : 'Seuls les Propriétaires peuvent gérer la facturation et transférer la propriété'}
              </li>
              <li>• {isEn 
                ? 'Connecting accounting systems requires Admin or Owner role'
                : 'Connecter les systèmes comptables nécessite le rôle Admin ou Propriétaire'}
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Create/Edit Role Modal */}
      {(showCreateModal || editingRole) && (
        <RoleModal
          role={editingRole}
          onSave={handleSaveRole}
          onClose={() => {
            setShowCreateModal(false);
            setEditingRole(null);
          }}
          existingRoles={roles}
          isEn={isEn}
        />
      )}
    </div>
  );
}

// For backward compatibility - export PermissionMatrix
export { DesktopPermissionMatrix as PermissionMatrix };
