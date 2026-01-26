import { useState } from 'react';
import { 
  Link2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Settings, 
  Trash2,
  AlertCircle,
  Clock,
  ArrowRight,
  Zap,
  HelpCircle,
  Wrench,
  Plus,
  Shield,
  Lock,
  Eye,
} from 'lucide-react';
import { InfoBanner } from '../components/HelpTooltip';
import { useTenant, useCanPerform } from '../contexts/TenantContext';
import { useI18n } from '../lib/i18n';
import { ROLE_DEFINITIONS } from '../components/RolesPermissions';

// Provider types
interface Provider {
  id: string;
  name: string;
  description: string;
  descriptionFr: string;
  logo: string;
  color: string;
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  lastSync?: string;
  accountsCount?: number;
  transactionsCount?: number;
}

// Mock data - would come from API
const providers: Provider[] = [
  {
    id: 'quickbooks',
    name: 'QuickBooks Online',
    description: 'Intuit QuickBooks accounting software',
    descriptionFr: 'Logiciel comptable Intuit QuickBooks',
    logo: '/providers/quickbooks.svg',
    color: '#2CA01C',
    status: 'disconnected',
  },
  {
    id: 'xero',
    name: 'Xero',
    description: 'Cloud-based accounting platform',
    descriptionFr: 'Plateforme comptable infonuagique',
    logo: '/providers/xero.svg',
    color: '#13B5EA',
    status: 'disconnected',
  },
  {
    id: 'sage',
    name: 'Sage',
    description: 'Sage Business Cloud Accounting',
    descriptionFr: 'Comptabilité Sage Business Cloud',
    logo: '/providers/sage.svg',
    color: '#00D639',
    status: 'disconnected',
  },
  {
    id: 'freshbooks',
    name: 'FreshBooks',
    description: 'Invoice and accounting software',
    descriptionFr: 'Logiciel de facturation et comptabilité',
    logo: '/providers/freshbooks.svg',
    color: '#0075DD',
    status: 'disconnected',
  },
  {
    id: 'wave',
    name: 'Wave',
    description: 'Free accounting software',
    descriptionFr: 'Logiciel comptable gratuit',
    logo: '/providers/wave.svg',
    color: '#003366',
    status: 'disconnected',
  },
  {
    id: 'csv',
    name: 'CSV Import',
    description: 'Import data from CSV files',
    descriptionFr: 'Importez vos données depuis des fichiers CSV',
    logo: '/providers/csv.svg',
    color: '#6B7280',
    status: 'disconnected',
  },
];

// Provider Logo Component
function ProviderLogo({ provider, size = 'md' }: { provider: Provider; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };
  
  const logoMap: Record<string, JSX.Element> = {
    quickbooks: (
      <svg viewBox="0 0 40 40" className={sizeClasses[size]}>
        <circle cx="20" cy="20" r="20" fill="#2CA01C"/>
        <path d="M12 14h4v12h-4v-12zm12 0h4v12h-4v-12zm-6 3h4v6h-4v-6z" fill="white"/>
      </svg>
    ),
    xero: (
      <svg viewBox="0 0 40 40" className={sizeClasses[size]}>
        <circle cx="20" cy="20" r="20" fill="#13B5EA"/>
        <text x="20" y="26" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">X</text>
      </svg>
    ),
    sage: (
      <svg viewBox="0 0 40 40" className={sizeClasses[size]}>
        <circle cx="20" cy="20" r="20" fill="#00D639"/>
        <text x="20" y="26" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">S</text>
      </svg>
    ),
    freshbooks: (
      <svg viewBox="0 0 40 40" className={sizeClasses[size]}>
        <circle cx="20" cy="20" r="20" fill="#0075DD"/>
        <text x="20" y="26" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">FB</text>
      </svg>
    ),
    wave: (
      <svg viewBox="0 0 40 40" className={sizeClasses[size]}>
        <circle cx="20" cy="20" r="20" fill="#003366"/>
        <path d="M10 20 Q15 15 20 20 T30 20" stroke="white" strokeWidth="3" fill="none"/>
      </svg>
    ),
    csv: (
      <svg viewBox="0 0 40 40" className={sizeClasses[size]}>
        <rect x="0" y="0" width="40" height="40" rx="8" fill="#6B7280"/>
        <text x="20" y="26" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">CSV</text>
      </svg>
    ),
  };
  
  return logoMap[provider.id] || (
    <div 
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-bold`} 
      style={{ backgroundColor: provider.color }}
    >
      {provider.name.charAt(0)}
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status, isEn }: { status: Provider['status']; isEn: boolean }) {
  const config = {
    connected: { 
      icon: CheckCircle2, 
      textEn: 'Connected',
      textFr: 'Connecté', 
      bgClass: 'bg-green-50 dark:bg-green-900/20',
      textClass: 'text-green-600 dark:text-green-400',
      dotClass: 'bg-green-500',
      pulse: true,
    },
    disconnected: { 
      icon: XCircle, 
      textEn: 'Not connected',
      textFr: 'Non connecté', 
      bgClass: 'bg-gray-100 dark:bg-gray-800',
      textClass: 'text-gray-500 dark:text-gray-400',
      dotClass: 'bg-gray-400',
      pulse: false,
    },
    syncing: { 
      icon: RefreshCw, 
      textEn: 'Syncing...',
      textFr: 'Sync...', 
      bgClass: 'bg-blue-50 dark:bg-blue-900/20',
      textClass: 'text-blue-600 dark:text-blue-400',
      dotClass: 'bg-blue-500',
      pulse: true,
    },
    error: { 
      icon: AlertCircle, 
      textEn: 'Error',
      textFr: 'Erreur', 
      bgClass: 'bg-red-50 dark:bg-red-900/20',
      textClass: 'text-red-600 dark:text-red-400',
      dotClass: 'bg-red-500',
      pulse: true,
    },
  };
  
  const { textEn, textFr, bgClass, textClass, dotClass, pulse } = config[status];
  
  return (
    <span 
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${bgClass} ${textClass}`}
    >
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotClass}`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${dotClass}`} />
      </span>
      <span>{isEn ? textEn : textFr}</span>
    </span>
  );
}

// Provider Card Component
function ProviderCard({ provider, onConnect, onDisconnect, onSync, isInternalStaff, isEn, readOnly = false }: {
  provider: Provider;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onSync: (id: string) => void;
  isInternalStaff: boolean;
  isEn: boolean;
  readOnly?: boolean;
}) {
  const isConnected = provider.status === 'connected';
  const isSyncing = provider.status === 'syncing';
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className="group rounded-2xl p-5 sm:p-6 transition-all duration-300 cursor-pointer relative overflow-hidden"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        border: isConnected 
          ? `2px solid ${provider.color}` 
          : '1px solid rgb(var(--color-border))',
        boxShadow: isHovered ? `0 8px 30px ${provider.color}20` : '0 2px 8px rgba(0,0,0,0.04)',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Gradient accent bar */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 transition-all duration-300"
        style={{ 
          background: `linear-gradient(90deg, ${provider.color}, ${provider.color}80)`,
          opacity: isHovered || isConnected ? 1 : 0,
        }}
      />
      
      {/* Header - Logo, Name, Status */}
      <div className="flex items-start gap-4 mb-5">
        <div 
          className="relative p-2 rounded-xl transition-all duration-300"
          style={{ 
            backgroundColor: `${provider.color}15`,
            transform: isHovered ? 'scale(1.05)' : 'scale(1)',
          }}
        >
          <ProviderLogo provider={provider} size="md" />
          {isConnected && (
            <div 
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2"
              style={{ 
                backgroundColor: 'rgb(var(--color-success))',
                borderColor: 'rgb(var(--color-surface))'
              }}
            >
              <CheckCircle2 className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 
              className="font-bold text-base sm:text-lg truncate"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {provider.name}
            </h3>
          </div>
          <p 
            className="text-sm line-clamp-2 leading-relaxed"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn ? provider.description : provider.descriptionFr}
          </p>
        </div>
      </div>
      
      {/* Connected Stats */}
      {isConnected && (
        <div 
          className="mb-5 p-4 rounded-xl"
          style={{ backgroundColor: `${provider.color}08` }}
        >
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="space-y-1">
              <p 
                className="text-xl sm:text-2xl font-bold"
                style={{ color: provider.color }}
              >
                {provider.accountsCount || 0}
              </p>
              <p 
                className="text-xs font-medium uppercase tracking-wide"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {isEn ? 'Accounts' : 'Comptes'}
              </p>
            </div>
            <div className="space-y-1">
              <p 
                className="text-xl sm:text-2xl font-bold"
                style={{ color: provider.color }}
              >
                {provider.transactionsCount?.toLocaleString() || 0}
              </p>
              <p 
                className="text-xs font-medium uppercase tracking-wide"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {isEn ? 'Transactions' : 'Transactions'}
              </p>
            </div>
            <div className="space-y-1">
              <p 
                className="text-sm sm:text-base font-semibold flex items-center justify-center gap-1.5"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                <Clock className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-success))' }} />
                <span className="truncate">{provider.lastSync || (isEn ? 'Never' : 'Jamais')}</span>
              </p>
              <p 
                className="text-xs font-medium uppercase tracking-wide"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {isEn ? 'Last sync' : 'Dernière sync'}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex items-center gap-3">
        {!isConnected ? (
          readOnly ? (
            <div 
              className="flex-1 px-5 py-3 rounded-xl font-medium flex items-center justify-center gap-2 text-sm"
              style={{ 
                backgroundColor: 'rgb(var(--color-bg-muted))',
                color: 'rgb(var(--color-text-muted))'
              }}
            >
              <Lock className="w-4 h-4" />
              {isEn ? 'Admin required' : 'Admin requis'}
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onConnect(provider.id); }}
              className="flex-1 px-5 py-3.5 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2.5 text-sm group/btn relative overflow-hidden"
              style={{ 
                backgroundColor: provider.color,
                color: 'white',
                boxShadow: isHovered ? `0 4px 15px ${provider.color}40` : 'none',
              }}
            >
              <span className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
              <Link2 className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{isEn ? 'Connect' : 'Connecter'}</span>
              <ArrowRight className="w-4 h-4 relative z-10 opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all duration-200" />
            </button>
          )
        ) : (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onSync(provider.id); }}
              disabled={isSyncing || readOnly}
              className="flex-1 px-4 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              style={{ 
                backgroundColor: readOnly ? 'rgb(var(--color-bg-muted))' : `${provider.color}15`,
                color: readOnly ? 'rgb(var(--color-text-muted))' : provider.color,
                border: `1px solid ${readOnly ? 'transparent' : provider.color}30`,
              }}
              title={readOnly ? (isEn ? 'Admin only' : 'Admin seulement') : ''}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? (isEn ? 'Syncing...' : 'Sync...') : (isEn ? 'Sync Now' : 'Synchroniser')}</span>
            </button>
            {isInternalStaff && (
              <button
                onClick={(e) => { e.stopPropagation(); }}
                className="p-3 rounded-xl transition-all duration-200 hover:scale-105"
                style={{ 
                  backgroundColor: 'rgb(var(--color-bg-muted))',
                  color: 'rgb(var(--color-text-muted))' 
                }}
                title={isEn ? 'Advanced settings (staff only)' : 'Paramètres avancés (staff uniquement)'}
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            {!readOnly && (
              <button
                onClick={(e) => { e.stopPropagation(); onDisconnect(provider.id); }}
                className="p-3 rounded-xl transition-all duration-200 hover:scale-105 hover:bg-red-100 dark:hover:bg-red-900/20"
                style={{ 
                  backgroundColor: 'rgb(var(--color-error) / 0.08)',
                  color: 'rgb(var(--color-error))' 
                }}
                title={isEn ? 'Disconnect' : 'Déconnecter'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Connection Configuration for different providers
interface ConnectionConfig {
  authType: 'oauth' | 'apiKey' | 'upload';
  oauthUrl?: string;
  requiredFields?: { key: string; label: string; labelFr: string; placeholder: string; type: 'text' | 'password' }[];
  scopes?: string[];
}

const providerConfigs: Record<string, ConnectionConfig> = {
  quickbooks: {
    authType: 'oauth',
    oauthUrl: 'https://appcenter.intuit.com/connect/oauth2',
    scopes: ['com.intuit.quickbooks.accounting.readonly'],
  },
  xero: {
    authType: 'oauth',
    oauthUrl: 'https://login.xero.com/identity/connect/authorize',
    scopes: ['accounting.transactions.read', 'accounting.contacts.read', 'accounting.settings.read'],
  },
  sage: {
    authType: 'apiKey',
    requiredFields: [
      { key: 'clientId', label: 'Client ID', labelFr: 'ID Client', placeholder: 'sb-xxxxx-xxxxx', type: 'text' },
      { key: 'clientSecret', label: 'Client Secret', labelFr: 'Secret Client', placeholder: '••••••••••••••••', type: 'password' },
      { key: 'companyId', label: 'Company ID', labelFr: 'ID Entreprise', placeholder: '12345678', type: 'text' },
    ],
  },
  freshbooks: {
    authType: 'oauth',
    oauthUrl: 'https://auth.freshbooks.com/oauth/authorize',
    scopes: ['user:profile:read', 'user:invoices:read', 'user:expenses:read'],
  },
  wave: {
    authType: 'apiKey',
    requiredFields: [
      { key: 'apiToken', label: 'API Token', labelFr: 'Jeton API', placeholder: 'wv_xxxxxxxxxxxxxxxxxxxx', type: 'password' },
      { key: 'businessId', label: 'Business ID', labelFr: 'ID Entreprise', placeholder: 'QnVzaW5lc3M6...', type: 'text' },
    ],
  },
  csv: {
    authType: 'upload',
  },
};

// Connection Modal Component
function ConnectionModal({ provider, onClose, onConfirm, isEn }: {
  provider: Provider | null;
  onClose: () => void;
  onConfirm: () => void;
  isEn: boolean;
}) {
  const [step, setStep] = useState<'info' | 'credentials' | 'connecting' | 'success'>('info');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [useDemoMode, setUseDemoMode] = useState(false);
  
  if (!provider) return null;
  
  const config = providerConfigs[provider.id];
  const isOAuth = config?.authType === 'oauth';
  const isApiKey = config?.authType === 'apiKey';
  const isUpload = config?.authType === 'upload';
  
  const handleContinue = () => {
    if (isOAuth || useDemoMode) {
      setStep('connecting');
      // Simulate OAuth redirect flow or demo mode
      setTimeout(() => {
        setStep('success');
      }, 2000);
    } else if (isApiKey) {
      setStep('credentials');
    } else if (isUpload) {
      setStep('credentials');
    }
  };
  
  const validateCredentials = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (config?.requiredFields) {
      config.requiredFields.forEach(field => {
        if (!credentials[field.key]?.trim()) {
          newErrors[field.key] = isEn ? 'This field is required' : 'Ce champ est requis';
        }
      });
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmitCredentials = () => {
    if (validateCredentials()) {
      setStep('connecting');
      // Simulate API validation
      setTimeout(() => {
        setStep('success');
      }, 2500);
    }
  };
  
  const handleUseDemoData = () => {
    setUseDemoMode(true);
    setStep('connecting');
    setTimeout(() => {
      setStep('success');
    }, 1500);
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="rounded-xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'rgb(var(--color-surface))' }}
      >
        <div className="p-6">
          {step === 'info' && (
            <>
              <div className="flex items-center gap-4 mb-6">
                <ProviderLogo provider={provider} size="lg" />
                <div>
                  <h3 
                    className="text-xl font-semibold"
                    style={{ color: 'rgb(var(--color-text))' }}
                  >
                    {isEn ? `Connect ${provider.name}` : `Connecter ${provider.name}`}
                  </h3>
                  <p 
                    className="text-sm"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  >
                    {isOAuth 
                      ? (isEn ? 'OAuth 2.0 secure authorization' : 'Autorisation sécurisée OAuth 2.0')
                      : isApiKey 
                        ? (isEn ? 'API key authentication' : 'Authentification par clé API')
                        : (isEn ? 'Upload your data files' : 'Téléversez vos fichiers de données')}
                  </p>
                </div>
              </div>
              
              {/* Authentication Method Info */}
              <div 
                className="mb-4 p-3 rounded-lg flex items-start gap-3"
                style={{ 
                  backgroundColor: 'rgb(var(--color-info) / 0.05)',
                  border: '1px solid rgb(var(--color-info) / 0.2)'
                }}
              >
                <Shield className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'rgb(var(--color-info))' }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                    {isOAuth 
                      ? (isEn ? 'Secure OAuth Connection' : 'Connexion OAuth sécurisée')
                      : (isEn ? 'API Credentials Required' : 'Identifiants API requis')}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isOAuth 
                      ? (isEn 
                          ? `You'll be redirected to ${provider.name} to authorize read-only access. We never store your password.`
                          : `Vous serez redirigé vers ${provider.name} pour autoriser l'accès en lecture seule. Nous ne stockons jamais votre mot de passe.`)
                      : isApiKey
                        ? (isEn 
                            ? `You'll need to provide your ${provider.name} API credentials. Find them in your ${provider.name} developer settings.`
                            : `Vous devrez fournir vos identifiants API ${provider.name}. Trouvez-les dans les paramètres développeur de ${provider.name}.`)
                        : (isEn 
                            ? 'Upload your accounting data in CSV format. We support chart of accounts, transactions, and journal entries.'
                            : 'Téléversez vos données comptables au format CSV. Nous supportons le plan comptable, les transactions et les écritures.')}
                  </p>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                {[
                  { 
                    titleEn: 'Read-only access', 
                    titleFr: 'Lecture seule',
                    descEn: 'We never modify your data',
                    descFr: 'Nous ne modifions jamais vos données'
                  },
                  { 
                    titleEn: 'AES-256 encryption', 
                    titleFr: 'Chiffrement AES-256',
                    descEn: 'Your credentials are encrypted at rest',
                    descFr: 'Vos identifiants sont chiffrés au repos'
                  },
                  { 
                    titleEn: 'Revocable anytime', 
                    titleFr: 'Révocable à tout moment',
                    descEn: 'Disconnect and delete data whenever you want',
                    descFr: 'Déconnectez et supprimez les données quand vous voulez'
                  },
                ].map((item, i) => (
                  <div 
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg"
                    style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                  >
                    <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'rgb(var(--color-success))' }} />
                    <div>
                      <p className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                        {isEn ? item.titleEn : item.titleFr}
                      </p>
                      <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        {isEn ? item.descEn : item.descFr}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Demo Mode Option */}
              <div 
                className="mb-4 p-3 rounded-lg"
                style={{ 
                  backgroundColor: 'rgb(var(--color-warning) / 0.05)',
                  border: '1px solid rgb(var(--color-warning) / 0.2)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" style={{ color: 'rgb(var(--color-warning))' }} />
                    <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'Demo Mode Available' : 'Mode démo disponible'}
                    </span>
                  </div>
                  <button
                    onClick={handleUseDemoData}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-warning) / 0.1)',
                      color: 'rgb(var(--color-warning))'
                    }}
                  >
                    {isEn ? 'Use demo data' : 'Utiliser données démo'}
                  </button>
                </div>
                <p className="text-xs mt-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn 
                    ? 'Try PlainLedger with sample accounting data - no real credentials needed.'
                    : 'Essayez PlainLedger avec des données comptables d\'exemple - aucun identifiant réel requis.'}
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors text-sm"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-bg-muted))',
                    color: 'rgb(var(--color-text-secondary))'
                  }}
                >
                  {isEn ? 'Cancel' : 'Annuler'}
                </button>
                <button
                  onClick={handleContinue}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-text))',
                    color: 'rgb(var(--color-bg))'
                  }}
                >
                  {isOAuth 
                    ? (isEn ? `Authorize with ${provider.name}` : `Autoriser avec ${provider.name}`)
                    : (isEn ? 'Enter credentials' : 'Saisir identifiants')}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
          
          {step === 'credentials' && (
            <>
              <div className="flex items-center gap-4 mb-6">
                <ProviderLogo provider={provider} size="lg" />
                <div>
                  <h3 
                    className="text-xl font-semibold"
                    style={{ color: 'rgb(var(--color-text))' }}
                  >
                    {isEn ? `${provider.name} Credentials` : `Identifiants ${provider.name}`}
                  </h3>
                  <p 
                    className="text-sm"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  >
                    {isEn ? 'Enter your API credentials' : 'Saisissez vos identifiants API'}
                  </p>
                </div>
              </div>
              
              {isUpload ? (
                <div className="mb-6">
                  <div 
                    className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
                    style={{ borderColor: 'rgb(var(--color-border))' }}
                    onClick={() => {
                      alert(isEn 
                        ? 'File upload dialog would open here. Supported formats: CSV, XLS, XLSX' 
                        : 'Le dialogue de téléversement s\'ouvrirait ici. Formats supportés: CSV, XLS, XLSX');
                    }}
                  >
                    <Plus className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgb(var(--color-text-muted))' }} />
                    <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'Click to upload or drag files here' : 'Cliquez pour téléverser ou glissez les fichiers ici'}
                    </p>
                    <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? 'CSV, XLS, XLSX (max 50MB)' : 'CSV, XLS, XLSX (max 50Mo)'}
                    </p>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? 'Required files:' : 'Fichiers requis:'}
                    </p>
                    {[
                      { en: 'Chart of Accounts', fr: 'Plan comptable' },
                      { en: 'General Ledger / Trial Balance', fr: 'Grand livre / Balance de vérification' },
                      { en: 'Journal Entries (optional)', fr: 'Écritures de journal (optionnel)' },
                    ].map((file, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgb(var(--color-border))' }} />
                        {isEn ? file.en : file.fr}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  {config?.requiredFields?.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgb(var(--color-text))' }}>
                        {isEn ? field.label : field.labelFr}
                      </label>
                      <input
                        type={field.type}
                        placeholder={field.placeholder}
                        value={credentials[field.key] || ''}
                        onChange={(e) => {
                          setCredentials(prev => ({ ...prev, [field.key]: e.target.value }));
                          if (errors[field.key]) {
                            setErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors[field.key];
                              return newErrors;
                            });
                          }
                        }}
                        className="input w-full font-mono text-sm"
                        style={{
                          borderColor: errors[field.key] ? 'rgb(var(--color-error))' : undefined
                        }}
                      />
                      {errors[field.key] && (
                        <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-error))' }}>
                          {errors[field.key]}
                        </p>
                      )}
                    </div>
                  ))}
                  
                  {/* Help link */}
                  <a 
                    href="#" 
                    className="text-sm flex items-center gap-1 hover:underline"
                    style={{ color: 'rgb(var(--color-primary-600))' }}
                    onClick={(e) => {
                      e.preventDefault();
                      alert(isEn 
                        ? `To find your ${provider.name} API credentials:\n\n1. Log in to your ${provider.name} account\n2. Go to Settings > Integrations or Developer\n3. Create a new API key or app\n4. Copy the credentials here`
                        : `Pour trouver vos identifiants API ${provider.name}:\n\n1. Connectez-vous à votre compte ${provider.name}\n2. Allez dans Paramètres > Intégrations ou Développeur\n3. Créez une nouvelle clé API ou application\n4. Copiez les identifiants ici`);
                    }}
                  >
                    <HelpCircle className="w-4 h-4" />
                    {isEn ? `Where to find my ${provider.name} credentials?` : `Où trouver mes identifiants ${provider.name}?`}
                  </a>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('info')}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors text-sm"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-bg-muted))',
                    color: 'rgb(var(--color-text-secondary))'
                  }}
                >
                  {isEn ? 'Back' : 'Retour'}
                </button>
                <button
                  onClick={handleSubmitCredentials}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-text))',
                    color: 'rgb(var(--color-bg))'
                  }}
                >
                  {isEn ? 'Connect' : 'Connecter'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
          
          {step === 'connecting' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 relative">
                <ProviderLogo provider={provider} size="lg" />
                <div 
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgb(var(--color-info))' }}
                >
                  <RefreshCw className="w-3 h-3 text-white animate-spin" />
                </div>
              </div>
              <h3 
                className="text-xl font-semibold mb-2"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {useDemoMode 
                  ? (isEn ? 'Loading demo data...' : 'Chargement des données démo...')
                  : (isEn ? 'Connecting...' : 'Connexion en cours...')}
              </h3>
              <p style={{ color: 'rgb(var(--color-text-muted))' }}>
                {useDemoMode 
                  ? (isEn 
                      ? 'Generating sample accounting data for demonstration'
                      : 'Génération de données comptables d\'exemple pour démonstration')
                  : config?.authType === 'oauth'
                    ? (isEn 
                        ? `Please complete the authorization in the ${provider.name} window`
                        : `Veuillez compléter l'autorisation dans la fenêtre ${provider.name}`)
                    : (isEn
                        ? 'Validating credentials and fetching account data...'
                        : 'Validation des identifiants et récupération des données...')}
              </p>
              
              {useDemoMode && (
                <div 
                  className="mt-4 p-3 rounded-lg text-left"
                  style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                >
                  <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn 
                      ? 'Demo data includes: 45 accounts, 12 months of transactions, balance sheet, income statement, and cash flow data.'
                      : 'Les données démo incluent: 45 comptes, 12 mois de transactions, bilan, état des résultats et flux de trésorerie.'}
                  </p>
                </div>
              )}
            </div>
          )}
          
          {step === 'success' && (
            <div className="text-center py-8">
              <div 
                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}
              >
                <CheckCircle2 className="w-8 h-8" style={{ color: 'rgb(var(--color-success))' }} />
              </div>
              <h3 
                className="text-xl font-semibold mb-2"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? 'Successfully connected!' : 'Connecté avec succès!'}
              </h3>
              <p className="mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {useDemoMode 
                  ? (isEn 
                      ? 'Demo data has been loaded into your account'
                      : 'Les données démo ont été chargées dans votre compte')
                  : (isEn 
                      ? `${provider.name} is now linked to your PlainLedger account`
                      : `${provider.name} est maintenant lié à votre compte PlainLedger`)}
              </p>
              
              {useDemoMode && (
                <div 
                  className="mb-4 p-3 rounded-lg text-left"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-warning) / 0.05)',
                    border: '1px solid rgb(var(--color-warning) / 0.2)'
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4" style={{ color: 'rgb(var(--color-warning))' }} />
                    <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-warning))' }}>
                      {isEn ? 'Demo Mode' : 'Mode Démo'}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn 
                      ? 'This is sample data for testing. Connect a real accounting system to see your actual financial data.'
                      : 'Ce sont des données d\'exemple pour les tests. Connectez un vrai système comptable pour voir vos données financières réelles.'}
                  </p>
                </div>
              )}
              
              {/* Connection summary */}
              <div 
                className="mb-6 p-4 rounded-lg text-left"
                style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
              >
                <p className="text-sm font-medium mb-3" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Connection Details' : 'Détails de la connexion'}
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Provider' : 'Fournisseur'}</span>
                    <span style={{ color: 'rgb(var(--color-text))' }}>{provider.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Auth Method' : 'Méthode auth.'}</span>
                    <span style={{ color: 'rgb(var(--color-text))' }}>
                      {useDemoMode ? (isEn ? 'Demo' : 'Démo') : config?.authType === 'oauth' ? 'OAuth 2.0' : 'API Key'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Access Level' : 'Niveau d\'accès'}</span>
                    <span style={{ color: 'rgb(var(--color-text))' }}>{isEn ? 'Read-only' : 'Lecture seule'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Accounts Found' : 'Comptes trouvés'}</span>
                    <span style={{ color: 'rgb(var(--color-text))' }}>45</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="w-full px-4 py-2.5 rounded-lg font-medium transition-colors"
                style={{ 
                  backgroundColor: 'rgb(var(--color-text))',
                  color: 'rgb(var(--color-bg))'
                }}
              >
                {isEn ? 'Start synchronization' : 'Commencer la synchronisation'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Connections() {
  const { isInternalStaff, currentTenant, isAdmin } = useTenant();
  const { canManageConnections, canViewConnections } = useCanPerform();
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [providerList, setProviderList] = useState(providers);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  
  const connectedCount = providerList.filter(p => p.status === 'connected').length;
  
  // Show permission notice for non-admin users
  const showReadOnlyNotice = !canManageConnections;
  
  const handleConnect = (id: string) => {
    const provider = providerList.find(p => p.id === id);
    if (provider) {
      setSelectedProvider(provider);
      setShowModal(true);
    }
  };
  
  const handleConfirmConnection = () => {
    if (selectedProvider) {
      setProviderList(prev => prev.map(p => 
        p.id === selectedProvider.id 
          ? { ...p, status: 'connected', lastSync: isEn ? 'Just now' : 'À l\'instant', accountsCount: 24, transactionsCount: 1847 }
          : p
      ));
    }
  };
  
  const handleDisconnect = (id: string) => {
    const confirmMsg = isEn 
      ? 'Are you sure you want to disconnect this provider?' 
      : 'Êtes-vous sûr de vouloir déconnecter ce fournisseur?';
    if (confirm(confirmMsg)) {
      setProviderList(prev => prev.map(p => 
        p.id === id ? { ...p, status: 'disconnected', lastSync: undefined, accountsCount: undefined, transactionsCount: undefined } : p
      ));
    }
  };
  
  const handleSync = (id: string) => {
    setProviderList(prev => prev.map(p => 
      p.id === id ? { ...p, status: 'syncing' } : p
    ));
    
    setTimeout(() => {
      setProviderList(prev => prev.map(p => 
        p.id === id ? { ...p, status: 'connected', lastSync: isEn ? 'Just now' : 'À l\'instant' } : p
      ));
    }, 3000);
  };
  
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 
            className="text-xl sm:text-2xl font-semibold"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'Connections' : 'Connexions'}
          </h2>
          <p 
            className="text-sm mt-0.5"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn 
              ? 'Connect your accounting software to import data'
              : 'Connectez vos logiciels comptables pour importer vos données'}
          </p>
        </div>
        <div 
          className="flex items-center gap-2 px-3 py-2 rounded-lg self-start"
          style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
        >
          <Zap className="w-4 h-4" style={{ color: 'rgb(var(--color-warning))' }} />
          <span 
            className="text-sm font-medium"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            {connectedCount} {isEn 
              ? `active connection${connectedCount !== 1 ? 's' : ''}` 
              : `connexion${connectedCount !== 1 ? 's' : ''} active${connectedCount !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {/* Internal Staff Banner */}
      {isInternalStaff && (
        <div 
          className="p-3 rounded-lg flex flex-col sm:flex-row sm:items-center gap-3"
          style={{ 
            backgroundColor: 'rgb(var(--color-error) / 0.05)',
            border: '1px solid rgb(var(--color-error) / 0.2)'
          }}
        >
          <Wrench className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(var(--color-error))' }} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-error))' }}>
              {isEn ? 'Internal mode enabled' : 'Mode interne activé'}
            </p>
            <p className="text-xs" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn 
                ? 'You see this page as PlainLedger staff. Clients only see their active connections.'
                : 'Vous voyez cette page en tant que staff PlainLedger. Les clients ne voient que leurs connexions actives.'}
            </p>
          </div>
          <a 
            href="/app/settings" 
            className="text-xs font-medium px-3 py-1.5 rounded whitespace-nowrap"
            style={{ 
              backgroundColor: 'rgb(var(--color-error) / 0.1)',
              color: 'rgb(var(--color-error))'
            }}
          >
            {isEn ? 'Advanced config →' : 'Config avancée →'}
          </a>
        </div>
      )}

      {/* Read-only Permission Notice for non-admin users */}
      {showReadOnlyNotice && (
        <div 
          className="p-4 rounded-xl flex items-start gap-4"
          style={{ 
            backgroundColor: 'rgb(var(--color-warning) / 0.05)',
            border: '1px solid rgb(var(--color-warning) / 0.2)'
          }}
        >
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgb(var(--color-warning) / 0.1)' }}
          >
            <Eye className="w-5 h-5" style={{ color: 'rgb(var(--color-warning))' }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 
                className="font-semibold text-sm"
                style={{ color: 'rgb(var(--color-warning))' }}
              >
                {isEn ? 'View-only Access' : 'Accès en lecture seule'}
              </h3>
              <span 
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ 
                  backgroundColor: 'rgb(var(--color-bg-muted))',
                  color: 'rgb(var(--color-text-muted))'
                }}
              >
                {currentTenant?.role === 'member' 
                  ? (isEn ? 'Member' : 'Membre') 
                  : (isEn ? 'Viewer' : 'Lecteur')}
              </span>
            </div>
            <p 
              className="text-sm"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'You can view connected data sources but cannot connect or disconnect accounting systems. Contact an Administrator or Owner to manage connections.'
                : 'Vous pouvez voir les sources de données connectées mais ne pouvez pas connecter ou déconnecter les systèmes comptables. Contactez un Administrateur ou Propriétaire pour gérer les connexions.'}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Shield className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
              <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn 
                  ? 'Only Owners and Administrators can manage connections'
                  : 'Seuls les Propriétaires et Administrateurs peuvent gérer les connexions'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Step-by-step explanation */}
      {showHelp && !isInternalStaff && (
        <InfoBanner
          type="info"
          title={isEn ? 'How it works' : 'Comment ça fonctionne'}
          description={isEn 
            ? '1. Choose your accounting software below → 2. Authorize read-only access → 3. Your data syncs automatically → 4. Generate your financial reports'
            : '1. Choisissez votre logiciel comptable ci-dessous → 2. Autorisez l\'accès en lecture seule → 3. Vos données se synchronisent automatiquement → 4. Générez vos rapports financiers'}
          dismissible
          onDismiss={() => setShowHelp(false)}
        />
      )}
      
      {/* Getting Started Banner */}
      {connectedCount === 0 && (
        <div 
          className="rounded-xl p-4 flex flex-col sm:flex-row items-start gap-4"
          style={{ 
            backgroundColor: 'rgb(var(--color-info) / 0.05)',
            border: '1px solid rgb(var(--color-info) / 0.2)'
          }}
        >
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgb(var(--color-info) / 0.1)' }}
          >
            <Link2 className="w-5 h-5" style={{ color: 'rgb(var(--color-info))' }} />
          </div>
          <div>
            <h3 
              className="font-semibold text-sm sm:text-base"
              style={{ color: 'rgb(var(--color-info))' }}
            >
              {isEn ? 'Step 1: Connect your accounting software' : 'Étape 1: Connectez votre logiciel comptable'}
            </h3>
            <p 
              className="text-sm mt-1"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'PlainLedger syncs with your existing data to detect anomalies and generate clear financial reports.'
                : 'PlainLedger se synchronise avec vos données existantes pour détecter les anomalies et générer des rapports financiers clairs.'}
            </p>
            <p 
              className="text-sm font-medium mt-2"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn 
                ? 'Your data remains read-only and encrypted with AES-256.'
                : 'Vos données restent en lecture seule et sont chiffrées avec AES-256.'}
            </p>
          </div>
        </div>
      )}
      
      {/* Provider Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {providerList.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onSync={handleSync}
            isInternalStaff={isInternalStaff}
            isEn={isEn}
            readOnly={!canManageConnections}
          />
        ))}
      </div>
      
      {/* Quick Start Demo Card */}
      {connectedCount === 0 && (
        <div 
          className="rounded-2xl p-6 sm:p-8 relative overflow-hidden"
          style={{ 
            background: 'linear-gradient(135deg, rgb(var(--color-primary-600)), rgb(var(--color-primary-700)))',
          }}
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{ background: 'white', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-10" style={{ background: 'white', transform: 'translate(-30%, 30%)' }} />
          
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-yellow-300" />
                <span className="text-sm font-semibold text-white/80 uppercase tracking-wide">
                  {isEn ? 'Quick Start' : 'Démarrage rapide'}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                {isEn ? 'Try PlainLedger instantly' : 'Essayez PlainLedger instantanément'}
              </h3>
              <p className="text-white/80 text-sm sm:text-base">
                {isEn 
                  ? 'No accounting software? No problem. Load demo data to explore all features with realistic financial data.'
                  : 'Pas de logiciel comptable? Pas de problème. Chargez des données démo pour explorer toutes les fonctionnalités.'}
              </p>
            </div>
            <button
              onClick={() => {
                const demoProvider = providerList.find(p => p.id === 'quickbooks');
                if (demoProvider) {
                  setSelectedProvider(demoProvider);
                  setShowModal(true);
                }
              }}
              className="px-6 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center gap-2 whitespace-nowrap hover:scale-105"
              style={{ 
                backgroundColor: 'white',
                color: 'rgb(var(--color-primary-700))',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              }}
            >
              <Zap className="w-4 h-4" />
              {isEn ? 'Load Demo Data' : 'Charger données démo'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Coming Soon */}
      <div 
        className="rounded-2xl p-8 text-center relative overflow-hidden group cursor-pointer hover:border-blue-400 transition-colors duration-300"
        style={{ 
          backgroundColor: 'rgb(var(--color-bg-muted))',
          border: '2px dashed rgb(var(--color-border))'
        }}
      >
        <div 
          className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
          style={{ 
            background: 'linear-gradient(135deg, rgb(var(--color-primary-100)), rgb(var(--color-primary-50)))',
          }}
        >
          <Plus className="w-8 h-8" style={{ color: 'rgb(var(--color-primary-600))' }} />
        </div>
        <h3 
          className="text-lg font-bold mb-2"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          {isEn ? 'More connectors coming soon' : 'Plus de connecteurs à venir'}
        </h3>
        <p 
          className="text-sm mb-5 max-w-md mx-auto"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          {isEn 
            ? 'We\'re constantly adding support for more accounting platforms. Have a suggestion?'
            : 'Nous ajoutons constamment le support pour plus de plateformes comptables. Une suggestion?'}
        </p>
        <button 
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 inline-flex items-center gap-2"
          style={{ 
            backgroundColor: 'rgb(var(--color-primary-600))',
            color: 'white',
          }}
          onClick={() => alert(isEn ? 'Contact us at support@plainledger.ca with your connector suggestion!' : 'Contactez-nous à support@plainledger.ca avec votre suggestion!')}
        >
          <HelpCircle className="w-4 h-4" />
          {isEn ? 'Suggest a connector' : 'Suggérer un connecteur'}
        </button>
      </div>
      
      {/* Connection Modal */}
      {showModal && (
        <ConnectionModal
          provider={selectedProvider}
          onClose={() => {
            setShowModal(false);
            setSelectedProvider(null);
          }}
          onConfirm={handleConfirmConnection}
          isEn={isEn}
        />
      )}
    </div>
  );
}
