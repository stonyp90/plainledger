/**
 * PlainLedger Secrets Management Component
 * 
 * Admin-only interface for managing API keys and secrets.
 * Secure secrets management - secrets are never displayed in full.
 */

import { useState, useEffect } from 'react';
import { 
  Key, Shield, RefreshCw, Trash2, Eye, EyeOff, 
  Plus, Copy, CheckCircle, XCircle, Clock, History, Lock
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useTenant } from '../contexts/TenantContext';
import { useToast } from '../contexts/ToastContext';
import { 
  secretsService,
  SecretMetadata, 
  SecretAuditLog,
  SecretType,
  SecretProvider,
  CreateSecretRequest 
} from '../lib/secrets';

// =====================================================
// MAIN COMPONENT
// =====================================================

export function SecretsManagement() {
  const { language } = useI18n();
  const { currentTenant, canManageSettings, isInternalStaff } = useTenant();
  const toast = useToast();
  const isEn = language === 'en';
  
  const [secrets, setSecrets] = useState<SecretMetadata[]>([]);
  const [auditLogs, setAuditLogs] = useState<SecretAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  
  // Check if user is admin (can manage settings or internal staff)
  const isAdmin = canManageSettings || isInternalStaff || currentTenant?.role === 'owner' || currentTenant?.role === 'admin';
  
  // Load secrets on mount
  useEffect(() => {
    if (currentTenant?.id) {
      loadSecrets();
    }
  }, [currentTenant?.id]);
  
  const loadSecrets = async () => {
    if (!currentTenant?.id) return;
    
    setLoading(true);
    try {
      const data = await secretsService.listSecrets(currentTenant.id);
      setSecrets(data);
    } catch (error) {
      toast.error(isEn ? 'Failed to load secrets' : 'Échec du chargement des secrets');
    } finally {
      setLoading(false);
    }
  };
  
  const loadAuditLogs = async () => {
    if (!currentTenant?.id) return;
    
    try {
      const logs = await secretsService.getAuditLogs(currentTenant.id, { limit: 50 });
      setAuditLogs(logs);
      setShowAuditModal(true);
    } catch (error) {
      toast.error(isEn ? 'Failed to load audit logs' : 'Échec du chargement des journaux');
    }
  };
  
  const handleRotate = async (secret: SecretMetadata) => {
    if (!currentTenant?.id) return;
    
    const confirmed = window.confirm(
      isEn 
        ? `Are you sure you want to rotate "${secret.name}"? The old key will be immediately invalidated.`
        : `Êtes-vous sûr de vouloir faire une rotation de "${secret.name}"? L'ancienne clé sera immédiatement invalidée.`
    );
    
    if (!confirmed) return;
    
    // In production, this would open a modal to enter the new secret
    toast.info(
      isEn 
        ? 'Secret rotation initiated. Please enter the new value via the secure admin panel.'
        : 'Rotation du secret initiée. Veuillez entrer la nouvelle valeur via le panneau d\'administration sécurisé.'
    );
  };
  
  const handleRevoke = async (secret: SecretMetadata) => {
    if (!currentTenant?.id) return;
    
    const confirmed = window.confirm(
      isEn 
        ? `⚠️ WARNING: Are you sure you want to revoke "${secret.name}"? This action cannot be undone and may break integrations.`
        : `⚠️ ATTENTION: Êtes-vous sûr de vouloir révoquer "${secret.name}"? Cette action est irréversible et peut casser des intégrations.`
    );
    
    if (!confirmed) return;
    
    try {
      await secretsService.revokeSecret(currentTenant.id, secret.id, 'Manual revocation');
      toast.success(isEn ? 'Secret revoked successfully' : 'Secret révoqué avec succès');
      loadSecrets();
    } catch (error) {
      toast.error(isEn ? 'Failed to revoke secret' : 'Échec de la révocation');
    }
  };
  
  const handleValidate = async (secret: SecretMetadata) => {
    if (!currentTenant?.id) return;
    
    toast.info(isEn ? 'Validating secret...' : 'Validation du secret...');
    
    try {
      const result = await secretsService.validateSecret(currentTenant.id, secret.id);
      if (result.valid) {
        toast.success(isEn ? 'Secret is valid and working' : 'Le secret est valide et fonctionne');
      } else {
        toast.error(result.message || (isEn ? 'Secret validation failed' : 'La validation a échoué'));
      }
    } catch (error) {
      toast.error(isEn ? 'Validation failed' : 'La validation a échoué');
    }
  };
  
  // Access denied for non-admins
  if (!isAdmin) {
    return (
      <div className="card p-8 text-center">
        <Lock className="w-16 h-16 mx-auto mb-4 text-muted" />
        <h3 className="text-xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Access Restricted' : 'Accès Restreint'}
        </h3>
        <p className="text-muted max-w-md mx-auto">
          {isEn 
            ? 'Only administrators can manage API keys and secrets. Please contact your organization administrator if you need access.'
            : 'Seuls les administrateurs peuvent gérer les clés API et les secrets. Veuillez contacter l\'administrateur de votre organisation si vous avez besoin d\'un accès.'}
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Security Notice */}
      <div 
        className="p-4 rounded-xl flex items-start gap-3"
        style={{ 
          backgroundColor: 'rgb(var(--color-warning) / 0.1)',
          border: '1px solid rgb(var(--color-warning) / 0.3)'
        }}
      >
        <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-warning))' }} />
        <div>
          <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Secure Secrets Management' : 'Gestion Sécurisée des Secrets'}
          </p>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn 
              ? 'API keys and secrets are encrypted at rest and never displayed in full. All access is logged for security and audit purposes.'
              : 'Les clés API et les secrets sont chiffrés au repos et ne sont jamais affichés en entier. Tous les accès sont journalisés pour la sécurité et l\'audit.'}
          </p>
        </div>
      </div>
      
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'API Keys & Secrets' : 'Clés API & Secrets'}
          </h3>
          <p className="text-sm text-muted">
            {isEn 
              ? `${secrets.length} secrets configured`
              : `${secrets.length} secrets configurés`}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={loadAuditLogs}
            className="btn-secondary flex items-center gap-2"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">{isEn ? 'Audit Log' : 'Journal d\'audit'}</span>
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{isEn ? 'Add Secret' : 'Ajouter un secret'}</span>
          </button>
        </div>
      </div>
      
      {/* Secrets List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-muted" />
        </div>
      ) : secrets.length === 0 ? (
        <div className="card p-8 text-center">
          <Key className="w-12 h-12 mx-auto mb-4 text-muted" />
          <h4 className="font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'No secrets configured' : 'Aucun secret configuré'}
          </h4>
          <p className="text-sm text-muted mb-4">
            {isEn 
              ? 'Add API keys and secrets to connect with external services.'
              : 'Ajoutez des clés API et des secrets pour vous connecter aux services externes.'}
          </p>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            {isEn ? 'Add Your First Secret' : 'Ajouter votre premier secret'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {secrets.map((secret) => (
            <SecretCard 
              key={secret.id}
              secret={secret}
              onRotate={() => handleRotate(secret)}
              onRevoke={() => handleRevoke(secret)}
              onValidate={() => handleValidate(secret)}
              isEn={isEn}
            />
          ))}
        </div>
      )}
      
      {/* Security Best Practices */}
      <div className="card p-4">
        <h4 className="font-medium mb-3 flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
          <Shield className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
          {isEn ? 'Security Standards' : 'Standards de sécurité'}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ComplianceItem 
            icon={Lock}
            title={isEn ? 'Encryption at Rest' : 'Chiffrement au repos'}
            description={isEn ? 'AES-256-GCM encryption' : 'Chiffrement AES-256-GCM'}
            isEn={isEn}
          />
          <ComplianceItem 
            icon={Shield}
            title={isEn ? 'Access Control' : 'Contrôle d\'accès'}
            description={isEn ? 'Role-based permissions' : 'Permissions basées sur les rôles'}
            isEn={isEn}
          />
          <ComplianceItem 
            icon={History}
            title={isEn ? 'Audit Logging' : 'Journalisation'}
            description={isEn ? 'All access is logged' : 'Tous les accès sont journalisés'}
            isEn={isEn}
          />
          <ComplianceItem 
            icon={RefreshCw}
            title={isEn ? 'Key Rotation' : 'Rotation des clés'}
            description={isEn ? 'Automated rotation support' : 'Support de rotation automatique'}
            isEn={isEn}
          />
        </div>
      </div>
      
      {/* Add Secret Modal */}
      {showAddModal && (
        <AddSecretModal 
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadSecrets();
          }}
          isEn={isEn}
        />
      )}
      
      {/* Audit Log Modal */}
      {showAuditModal && (
        <AuditLogModal 
          logs={auditLogs}
          onClose={() => setShowAuditModal(false)}
          isEn={isEn}
        />
      )}
    </div>
  );
}

// =====================================================
// SUB-COMPONENTS
// =====================================================

interface SecretCardProps {
  secret: SecretMetadata;
  onRotate: () => void;
  onRevoke: () => void;
  onValidate: () => void;
  isEn: boolean;
}

// Action Button with Tooltip component
interface ActionButtonWithTooltipProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

function ActionButtonWithTooltip({ icon, label, description, onClick, variant = 'default' }: ActionButtonWithTooltipProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div className="relative">
      <button 
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`p-2.5 rounded-xl border transition-all duration-200 ${
          variant === 'danger' 
            ? 'hover:bg-error/10 hover:border-error/50 hover:scale-105' 
            : 'hover:bg-primary/10 hover:border-primary/30 hover:scale-105'
        }`}
        style={{ 
          borderColor: variant === 'danger' ? 'rgb(var(--color-error) / 0.3)' : 'rgb(var(--color-border))',
          color: variant === 'danger' ? 'rgb(var(--color-error))' : 'rgb(var(--color-text-secondary))',
          backgroundColor: 'rgb(var(--color-surface))',
        }}
      >
        {icon}
      </button>
      
      {/* Tooltip with CTA */}
      <div 
        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 transition-all duration-200 pointer-events-none ${
          isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
        }`}
      >
        <div 
          className="px-3 py-2 rounded-xl shadow-lg text-center whitespace-nowrap"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))',
            boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.15), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          }}
        >
          <p className="font-semibold text-sm" style={{ color: variant === 'danger' ? 'rgb(var(--color-error))' : 'rgb(var(--color-text))' }}>
            {label}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {description}
          </p>
        </div>
        {/* Arrow */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 rotate-45"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            borderRight: '1px solid rgb(var(--color-border))',
            borderBottom: '1px solid rgb(var(--color-border))',
          }}
        />
      </div>
    </div>
  );
}

function SecretCard({ secret, onRotate, onRevoke, onValidate, isEn }: SecretCardProps) {
  const [showValue, setShowValue] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isCardHovered, setIsCardHovered] = useState(false);
  
  const statusColors = {
    active: 'rgb(var(--color-success))',
    expired: 'rgb(var(--color-error))',
    revoked: 'rgb(var(--color-error))',
    pending_rotation: 'rgb(var(--color-warning))',
  };

  const statusLabels = {
    active: isEn ? 'active' : 'actif',
    expired: isEn ? 'expired' : 'expiré',
    revoked: isEn ? 'revoked' : 'révoqué',
    pending_rotation: isEn ? 'pending' : 'en attente',
  };
  
  const handleCopyId = () => {
    navigator.clipboard.writeText(secret.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div 
      className="card p-4 transition-all duration-300 group"
      style={{ 
        borderLeft: `4px solid ${statusColors[secret.status]}`,
        boxShadow: isCardHovered 
          ? '0 10px 40px -10px rgb(var(--color-primary-500) / 0.15), 0 4px 20px -8px rgb(0 0 0 / 0.1)' 
          : undefined,
        transform: isCardHovered ? 'translateY(-2px)' : undefined,
      }}
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Secret Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Key className="w-4 h-4 flex-shrink-0 transition-transform duration-300 group-hover:rotate-12" style={{ color: 'rgb(var(--color-text-muted))' }} />
            <h4 className="font-semibold truncate" style={{ color: 'rgb(var(--color-text))' }}>
              {secret.name}
            </h4>
            <span 
              className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide"
              style={{ 
                backgroundColor: statusColors[secret.status] + '15',
                color: statusColors[secret.status]
              }}
            >
              {statusLabels[secret.status]}
            </span>
          </div>
          
          <p className="text-sm mb-2 truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {secret.description}
          </p>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
              <span className="font-semibold" style={{ color: 'rgb(var(--color-text-secondary))' }}>{isEn ? 'Provider:' : 'Fournisseur:'}</span>
              {secretsService.getProviderDisplayName(secret.provider)}
            </span>
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
              <span className="font-semibold" style={{ color: 'rgb(var(--color-text-secondary))' }}>{isEn ? 'Type:' : 'Type:'}</span>
              {secretsService.getTypeDisplayName(secret.type, isEn)}
            </span>
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
              <span className="font-semibold" style={{ color: 'rgb(var(--color-text-secondary))' }}>{isEn ? 'Environment:' : 'Environnement:'}</span>
              {secret.environment}
            </span>
          </div>
        </div>
        
        {/* Masked Value */}
        <div 
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all duration-200"
          style={{ 
            backgroundColor: 'rgb(var(--color-bg))',
            border: '1px solid rgb(var(--color-border-subtle))',
          }}
        >
          <code className="text-sm font-mono tracking-wider" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {showValue ? secret.maskedValue : '••••••••••••••••'}
          </code>
          <div className="flex items-center gap-1 ml-2 pl-2" style={{ borderLeft: '1px solid rgb(var(--color-border-subtle))' }}>
            <button 
              onClick={() => setShowValue(!showValue)}
              className="p-1.5 rounded-lg transition-all duration-200 hover:bg-primary/10 hover:scale-110"
              title={isEn ? 'Toggle visibility' : 'Basculer la visibilité'}
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button 
              onClick={handleCopyId}
              className="p-1.5 rounded-lg transition-all duration-200 hover:bg-primary/10 hover:scale-110"
              title={isEn ? 'Copy ID' : 'Copier l\'ID'}
              style={{ color: copied ? 'rgb(var(--color-success))' : 'rgb(var(--color-text-muted))' }}
            >
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        {/* Actions with Tooltips */}
        <div className="flex items-center gap-2">
          <ActionButtonWithTooltip
            icon={<CheckCircle className="w-4 h-4" />}
            label={isEn ? 'Validate' : 'Valider'}
            description={isEn ? 'Test if this secret is working' : 'Tester si ce secret fonctionne'}
            onClick={onValidate}
          />
          <ActionButtonWithTooltip
            icon={<RefreshCw className="w-4 h-4" />}
            label={isEn ? 'Rotate' : 'Rotation'}
            description={isEn ? 'Generate a new secret value' : 'Générer une nouvelle valeur'}
            onClick={onRotate}
          />
          <ActionButtonWithTooltip
            icon={<Trash2 className="w-4 h-4" />}
            label={isEn ? 'Revoke' : 'Révoquer'}
            description={isEn ? 'Permanently disable this secret' : 'Désactiver ce secret définitivement'}
            onClick={onRevoke}
            variant="danger"
          />
        </div>
      </div>
      
      {/* Footer Info */}
      <div 
        className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 pt-3 text-xs" 
        style={{ 
          borderTop: '1px solid rgb(var(--color-border-subtle))',
          color: 'rgb(var(--color-text-muted))',
        }}
      >
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {isEn ? 'Created:' : 'Créé:'} {new Date(secret.createdAt).toLocaleDateString()}
        </span>
        {secret.lastRotated && (
          <span className="flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            {isEn ? 'Last rotated:' : 'Dernière rotation:'} {new Date(secret.lastRotated).toLocaleDateString()}
          </span>
        )}
        <span className="font-medium">
          {isEn ? 'Access count:' : 'Nombre d\'accès:'} {secret.accessCount.toLocaleString()}
        </span>
        {secret.expiresAt && (
          <span 
            className="font-semibold"
            style={{ color: secret.isExpired ? 'rgb(var(--color-error))' : undefined }}
          >
            {isEn ? 'Expires:' : 'Expire:'} {new Date(secret.expiresAt).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}

interface ComplianceItemProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  isEn: boolean;
}

function ComplianceItem({ icon: Icon, title, description }: ComplianceItemProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-success/5">
      <div className="p-2 rounded-lg bg-success/10">
        <Icon className="w-4 h-4 text-success" />
      </div>
      <div>
        <p className="font-medium text-sm text-primary">{title}</p>
        <p className="text-xs text-muted">{description}</p>
      </div>
    </div>
  );
}

// =====================================================
// MODALS
// =====================================================

interface AddSecretModalProps {
  onClose: () => void;
  onSuccess: () => void;
  isEn: boolean;
}

function AddSecretModal({ onClose, onSuccess, isEn }: AddSecretModalProps) {
  const { currentTenant } = useTenant();
  const toast = useToast();
  
  const [formData, setFormData] = useState<CreateSecretRequest>({
    name: '',
    description: '',
    provider: 'internal',
    type: 'api_key',
    value: '',
    environment: 'production',
  });
  const [showValue, setShowValue] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const providers: SecretProvider[] = [
    'quickbooks', 'xero', 'sage', 'freshbooks', 'wave',
    'stripe', 'keycloak', 'powerbi', 'azure', 'aws', 'gcp', 'internal'
  ];
  
  const types: SecretType[] = [
    'api_key', 'client_secret', 'oauth_token', 'refresh_token',
    'webhook_secret', 'encryption_key', 'database_password', 'service_account'
  ];
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentTenant?.id) return;
    
    if (!formData.name || !formData.value) {
      toast.error(isEn ? 'Please fill all required fields' : 'Veuillez remplir tous les champs requis');
      return;
    }
    
    setSaving(true);
    try {
      await secretsService.createSecret(currentTenant.id, formData);
      toast.success(isEn ? 'Secret created successfully' : 'Secret créé avec succès');
      onSuccess();
    } catch (error) {
      toast.error(isEn ? 'Failed to create secret' : 'Échec de la création du secret');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
    >
      {/* Backdrop - fully opaque */}
      <div 
        className="absolute inset-0"
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose} 
      />
      
      {/* Modal Content */}
      <div 
        className="relative w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgb(var(--color-border))',
        }}
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-1" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Add New Secret' : 'Ajouter un nouveau secret'}
          </h3>
          <p className="text-sm mb-6" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn 
              ? 'The secret value will be encrypted and stored securely.'
              : 'La valeur du secret sera chiffrée et stockée en toute sécurité.'}
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label 
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? 'Name' : 'Nom'} *
              </label>
              <input 
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ 
                  backgroundColor: 'rgb(var(--color-bg))',
                  borderColor: 'rgb(var(--color-border))',
                  color: 'rgb(var(--color-text))',
                }}
                placeholder={isEn ? 'e.g., Stripe Live API Key' : 'ex: Clé API Stripe Live'}
                required
              />
            </div>
            
            <div>
              <label 
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? 'Description' : 'Description'}
              </label>
              <input 
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ 
                  backgroundColor: 'rgb(var(--color-bg))',
                  borderColor: 'rgb(var(--color-border))',
                  color: 'rgb(var(--color-text))',
                }}
                placeholder={isEn ? 'Optional description' : 'Description optionnelle'}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label 
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn ? 'Provider' : 'Fournisseur'}
                </label>
                <select 
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value as SecretProvider })}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-bg))',
                    borderColor: 'rgb(var(--color-border))',
                    color: 'rgb(var(--color-text))',
                  }}
                >
                  {providers.map(p => (
                    <option key={p} value={p}>
                      {secretsService.getProviderDisplayName(p)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label 
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn ? 'Type' : 'Type'}
                </label>
                <select 
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as SecretType })}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-bg))',
                    borderColor: 'rgb(var(--color-border))',
                    color: 'rgb(var(--color-text))',
                  }}
                >
                  {types.map(t => (
                    <option key={t} value={t}>
                      {secretsService.getTypeDisplayName(t, isEn)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label 
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? 'Environment' : 'Environnement'}
              </label>
              <select 
                value={formData.environment}
                onChange={(e) => setFormData({ ...formData, environment: e.target.value as 'production' | 'sandbox' | 'development' })}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ 
                  backgroundColor: 'rgb(var(--color-bg))',
                  borderColor: 'rgb(var(--color-border))',
                  color: 'rgb(var(--color-text))',
                }}
              >
                <option value="production">Production</option>
                <option value="sandbox">Sandbox</option>
                <option value="development">Development</option>
              </select>
            </div>
            
            <div>
              <label 
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? 'Secret Value' : 'Valeur du secret'} *
              </label>
              <div className="relative">
                <input 
                  type={showValue ? 'text' : 'password'}
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  className="w-full px-3 py-2 pr-10 rounded-lg border text-sm"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-bg))',
                    borderColor: 'rgb(var(--color-border))',
                    color: 'rgb(var(--color-text))',
                  }}
                  placeholder="••••••••••••••••"
                  required
                  autoComplete="off"
                />
                <button 
                  type="button"
                  onClick={() => setShowValue(!showValue)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {showValue 
                    ? <EyeOff className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} /> 
                    : <Eye className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                  }
                </button>
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn 
                  ? 'This value will be encrypted and never displayed again.'
                  : 'Cette valeur sera chiffrée et ne sera plus jamais affichée.'}
              </p>
            </div>
            
            <div className="flex gap-3 pt-4">
              <button 
                type="button" 
                onClick={onClose} 
                className="flex-1 px-4 py-2.5 rounded-lg font-medium text-sm border transition-colors"
                style={{ 
                  backgroundColor: 'rgb(var(--color-bg))',
                  borderColor: 'rgb(var(--color-border))',
                  color: 'rgb(var(--color-text))',
                }}
              >
                {isEn ? 'Cancel' : 'Annuler'}
              </button>
              <button 
                type="submit" 
                disabled={saving} 
                className="flex-1 px-4 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                style={{ 
                  backgroundColor: 'rgb(var(--color-primary-500))',
                  color: 'white',
                }}
              >
                {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                {isEn ? 'Add Secret' : 'Ajouter le secret'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

interface AuditLogModalProps {
  logs: SecretAuditLog[];
  onClose: () => void;
  isEn: boolean;
}

function AuditLogModal({ logs, onClose, isEn }: AuditLogModalProps) {
  const actionColors: Record<SecretAuditLog['action'], string> = {
    created: 'rgb(var(--color-success))',
    updated: 'rgb(var(--color-info))',
    accessed: 'rgb(var(--color-text-muted))',
    rotated: 'rgb(var(--color-warning))',
    revoked: 'rgb(var(--color-error))',
    deleted: 'rgb(var(--color-error))',
  };
  
  const actionLabels: Record<SecretAuditLog['action'], { en: string; fr: string }> = {
    created: { en: 'Created', fr: 'Créé' },
    updated: { en: 'Updated', fr: 'Mis à jour' },
    accessed: { en: 'Accessed', fr: 'Accédé' },
    rotated: { en: 'Rotated', fr: 'Rotation' },
    revoked: { en: 'Revoked', fr: 'Révoqué' },
    deleted: { en: 'Deleted', fr: 'Supprimé' },
  };

  const getActionBadgeClass = (action: SecretAuditLog['action']): string => {
    const badgeMap: Record<SecretAuditLog['action'], string> = {
      created: 'badge-success',
      updated: 'badge-info',
      accessed: 'badge-default',
      rotated: 'badge-warning',
      revoked: 'badge-error',
      deleted: 'badge-error',
    };
    return badgeMap[action] || 'badge-default';
  };
  
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4 animate-fade-in"
      style={{ zIndex: 9999 }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0"
        style={{ 
          backgroundColor: 'rgb(0 0 0 / 0.6)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose} 
      />
      
      {/* Modal Content */}
      <div 
        className="relative w-full max-w-2xl max-h-[80vh] rounded-2xl overflow-hidden flex flex-col animate-scale-in"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          boxShadow: 'var(--shadow-2xl)',
          border: '1px solid rgb(var(--color-border))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="p-6 border-b flex-shrink-0"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 
                className="text-xl font-semibold mb-1"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? 'Secret Audit Log' : 'Journal d\'audit des secrets'}
              </h3>
              <p 
                className="text-sm"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {isEn ? 'All secret access and modifications are logged' : 'Tous les accès et modifications sont journalisés'}
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="icon-btn"
              aria-label={isEn ? 'Close' : 'Fermer'}
            >
              <XCircle className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div 
          className="flex-1 overflow-y-auto p-6"
          style={{ 
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {logs.length === 0 ? (
            <div className="empty-state">
              <History 
                className="empty-state-icon"
                style={{ color: 'rgb(var(--color-text-subtle))' }}
              />
              <h4 className="empty-state-title">
                {isEn ? 'No audit logs found' : 'Aucun journal d\'audit trouvé'}
              </h4>
              <p className="empty-state-description">
                {isEn 
                  ? 'Audit logs will appear here when secrets are accessed or modified.'
                  : 'Les journaux d\'audit apparaîtront ici lorsque les secrets seront consultés ou modifiés.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div 
                  key={log.id}
                  className="card card-interactive"
                  style={{
                    transition: 'all var(--transition-normal)',
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Status indicator */}
                    <div 
                      className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ 
                        backgroundColor: actionColors[log.action],
                        boxShadow: `0 0 0 3px ${actionColors[log.action]}20`,
                      }}
                    />
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`badge ${getActionBadgeClass(log.action)}`}>
                          {actionLabels[log.action][isEn ? 'en' : 'fr']}
                        </span>
                        <span 
                          className="text-xs font-mono truncate max-w-[200px] sm:max-w-none"
                          style={{ color: 'rgb(var(--color-text-muted))' }}
                        >
                          {log.secretId}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <p 
                          className="text-sm"
                          style={{ color: 'rgb(var(--color-text-secondary))' }}
                        >
                          <span className="font-medium">{isEn ? 'By' : 'Par'}</span>{' '}
                          <span className="font-mono">{log.performedBy}</span>
                          {log.ipAddress && (
                            <>
                              {' '}
                              <span 
                                className="text-xs"
                                style={{ color: 'rgb(var(--color-text-muted))' }}
                              >
                                ({log.ipAddress})
                              </span>
                            </>
                          )}
                        </p>
                        
                        {log.details && (
                          <p 
                            className="text-xs leading-relaxed"
                            style={{ color: 'rgb(var(--color-text-muted))' }}
                          >
                            {log.details}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-text-subtle))' }} />
                          <time 
                            className="text-xs font-mono tabular-nums"
                            style={{ color: 'rgb(var(--color-text-muted))' }}
                            dateTime={log.performedAt}
                          >
                            {new Date(log.performedAt).toLocaleString()}
                          </time>
                        </div>
                      </div>
                    </div>
                    
                    {/* Success/Error indicator */}
                    <div className="flex-shrink-0 mt-1">
                      {log.success ? (
                        <div 
                          className="w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ 
                            backgroundColor: 'rgb(var(--color-success) / 0.1)',
                            color: 'rgb(var(--color-success))',
                          }}
                          title={isEn ? 'Success' : 'Succès'}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </div>
                      ) : (
                        <div 
                          className="w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ 
                            backgroundColor: 'rgb(var(--color-error) / 0.1)',
                            color: 'rgb(var(--color-error))',
                          }}
                          title={isEn ? 'Failed' : 'Échec'}
                        >
                          <XCircle className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SecretsManagement;
