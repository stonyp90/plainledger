import { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Link,
  Lock,
  Shield,
  Copy,
  CheckCircle,
  Mail,
  Send,
  Loader2,
  ExternalLink,
  Eye,
  Download,
} from 'lucide-react';
import Toggle from './Toggle';
import { useI18n } from '../lib/i18n';

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Title of what's being shared (e.g., "Balance Sheet", "Board Meeting") */
  title: string;
  /** English title if different */
  titleEn?: string;
  /** Optional subtitle (e.g., date, meeting name) */
  subtitle?: string;
  /** The base URL to share (will be modified with share token) */
  shareUrl?: string;
  /** Type of content for customization */
  contentType?: 'report' | 'chart' | 'presentation' | 'document';
  /** Whether to show download permission option */
  showDownloadOption?: boolean;
  /** Whether to show embed tab */
  showEmbedOption?: boolean;
  /** Callback when share is created */
  onShare?: (shareConfig: ShareConfig) => void;
}

export interface ShareConfig {
  url: string;
  password: string | null;
  expiresIn: string;
  allowDownload: boolean;
  requireAuth: boolean;
  emails: string[];
}

type Tab = 'link' | 'email' | 'embed';

export default function ShareModal({
  isOpen,
  onClose,
  title,
  titleEn,
  subtitle,
  shareUrl,
  contentType = 'document',
  showDownloadOption = true,
  showEmbedOption = false,
  onShare,
}: ShareModalProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  // State
  const [activeTab, setActiveTab] = useState<Tab>('link');
  const [password, setPassword] = useState('');
  const [enablePassword, setEnablePassword] = useState(true);
  const [expiresIn, setExpiresIn] = useState('7d');
  const [allowDownload, setAllowDownload] = useState(true);
  const [requireAuth, setRequireAuth] = useState(false);
  const [emails, setEmails] = useState('');
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  
  // Generate random password
  useEffect(() => {
    if (enablePassword && !password) {
      generateNewPassword();
    }
  }, [enablePassword]);
  
  const generateNewPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pwd = '';
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pwd);
  };
  
  // Build share URL
  const baseUrl = shareUrl || `${window.location.origin}/share/${contentType}/${Date.now()}`;
  const fullShareUrl = enablePassword 
    ? `${baseUrl}?p=${password}` 
    : baseUrl;
  
  // Embed code
  const embedCode = `<iframe src="${baseUrl}?embed=true" width="100%" height="600" frameborder="0"></iframe>`;
  
  const handleCopyLink = () => {
    const textToCopy = enablePassword 
      ? `${fullShareUrl}\n\n${isEn ? 'Password' : 'Mot de passe'}: ${password}`
      : fullShareUrl;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleSendEmails = async () => {
    if (!emails.trim()) return;
    setSending(true);
    
    const shareConfig: ShareConfig = {
      url: fullShareUrl,
      password: enablePassword ? password : null,
      expiresIn,
      allowDownload,
      requireAuth,
      emails: emails.split(',').map(e => e.trim()).filter(e => e.includes('@')),
    };
    
    // Call onShare callback if provided
    if (onShare) {
      onShare(shareConfig);
    }
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSending(false);
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setEmails('');
    }, 3000);
  };
  
  if (!isOpen) return null;
  
  const displayTitle = isEn && titleEn ? titleEn : title;
  
  // Content type labels
  const contentLabels = {
    report: { en: 'Share Report', fr: 'Partager le rapport' },
    chart: { en: 'Share Chart', fr: 'Partager le graphique' },
    presentation: { en: 'Share Presentation', fr: 'Partager la présentation' },
    document: { en: 'Share Document', fr: 'Partager le document' },
  };
  
  const tabs: Array<{ id: Tab; label: string; icon: typeof Link }> = [
    { id: 'link', label: isEn ? 'Link' : 'Lien', icon: Link },
    { id: 'email', label: isEn ? 'Email' : 'Courriel', icon: Mail },
  ];
  
  if (showEmbedOption) {
    tabs.push({ id: 'embed', label: isEn ? 'Embed' : 'Intégrer', icon: ExternalLink });
  }
  
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)', zIndex: 9999 }}
    >
      <div 
        className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: 'rgb(var(--color-surface))' }}
      >
        {/* Header */}
        <div 
          className="p-6 border-b flex items-center justify-between"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <Share2 className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                {contentLabels[contentType][isEn ? 'en' : 'fr']}
              </h2>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {displayTitle}{subtitle ? ` - ${subtitle}` : ''}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-lg hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
          </button>
        </div>
        
        {/* Tabs */}
        <div 
          className="flex border-b"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors"
              style={{
                borderBottom: activeTab === tab.id ? '2px solid rgb(var(--color-primary-500))' : '2px solid transparent',
                color: activeTab === tab.id ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))',
              }}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {activeTab === 'link' && (
            <>
              {/* Shareable Link */}
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Shareable Link' : 'Lien de partage'}
                </label>
                <div 
                  className="flex items-center gap-2 p-3 rounded-xl border"
                  style={{ borderColor: 'rgb(var(--color-border))' }}
                >
                  <Link className="w-4 h-4 flex-shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
                  <input
                    type="text"
                    value={fullShareUrl}
                    readOnly
                    className="flex-1 bg-transparent text-sm outline-none truncate"
                    style={{ color: 'rgb(var(--color-text))' }}
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 flex-shrink-0"
                    style={{ 
                      backgroundColor: copied ? 'rgb(var(--color-success))' : 'rgb(var(--color-primary-500))',
                      color: 'white',
                    }}
                  >
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? (isEn ? 'Copied!' : 'Copié!') : (isEn ? 'Copy' : 'Copier')}
                  </button>
                </div>
              </div>
              
              {/* Password Protection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
                    <Lock className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
                    {isEn ? 'Password Protection' : 'Protection par mot de passe'}
                  </label>
                  <Toggle
                    checked={enablePassword}
                    onChange={setEnablePassword}
                    size="sm"
                  />
                </div>
                {enablePassword && (
                  <div 
                    className="flex items-center gap-2 p-3 rounded-xl border"
                    style={{ borderColor: 'rgb(var(--color-border))' }}
                  >
                    <Shield className="w-4 h-4 flex-shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isEn ? 'Enter password' : 'Entrer le mot de passe'}
                      className="flex-1 bg-transparent text-sm outline-none font-mono"
                      style={{ color: 'rgb(var(--color-text))' }}
                    />
                    <button
                      onClick={generateNewPassword}
                      className="text-xs px-2 py-1 rounded-lg transition-colors"
                      style={{ 
                        backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                        color: 'rgb(var(--color-primary-500))',
                      }}
                    >
                      {isEn ? 'Generate' : 'Générer'}
                    </button>
                  </div>
                )}
              </div>
              
              {/* Options Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? 'Link Expires' : 'Expiration'}
                  </label>
                  <select
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(e.target.value)}
                    className="w-full p-3 rounded-xl border text-sm"
                    style={{ 
                      backgroundColor: 'transparent',
                      borderColor: 'rgb(var(--color-border))',
                      color: 'rgb(var(--color-text))',
                    }}
                  >
                    <option value="1d">{isEn ? '1 day' : '1 jour'}</option>
                    <option value="7d">{isEn ? '7 days' : '7 jours'}</option>
                    <option value="30d">{isEn ? '30 days' : '30 jours'}</option>
                    <option value="90d">{isEn ? '90 days' : '90 jours'}</option>
                    <option value="never">{isEn ? 'Never' : 'Jamais'}</option>
                  </select>
                </div>
                
                <div className="space-y-3">
                  {showDownloadOption && (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowDownload}
                        onChange={(e) => setAllowDownload(e.target.checked)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: 'rgb(var(--color-primary-500))' }}
                      />
                      <span className="text-sm flex items-center gap-1.5" style={{ color: 'rgb(var(--color-text))' }}>
                        <Download className="w-3.5 h-3.5" />
                        {isEn ? 'Allow download' : 'Autoriser téléchargement'}
                      </span>
                    </label>
                  )}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requireAuth}
                      onChange={(e) => setRequireAuth(e.target.checked)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: 'rgb(var(--color-primary-500))' }}
                    />
                    <span className="text-sm flex items-center gap-1.5" style={{ color: 'rgb(var(--color-text))' }}>
                      <Eye className="w-3.5 h-3.5" />
                      {isEn ? 'Require login' : 'Connexion requise'}
                    </span>
                  </label>
                </div>
              </div>
            </>
          )}
          
          {activeTab === 'email' && (
            <div 
              className="p-4 rounded-xl border"
              style={{ borderColor: 'rgb(var(--color-border))' }}
            >
              <label className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
                <Mail className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
                {isEn ? 'Send by Email' : 'Envoyer par courriel'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  placeholder={isEn ? 'Enter email addresses (comma separated)' : 'Entrer les courriels (séparés par virgule)'}
                  className="flex-1 p-3 rounded-xl border text-sm"
                  style={{ 
                    backgroundColor: 'transparent',
                    borderColor: 'rgb(var(--color-border))',
                    color: 'rgb(var(--color-text))',
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendEmails()}
                />
                <button
                  onClick={handleSendEmails}
                  disabled={!emails.trim() || sending}
                  className="px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                  style={{ 
                    backgroundColor: sent ? 'rgb(var(--color-success))' : 'rgb(var(--color-primary-500))',
                    color: 'white',
                  }}
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : sent ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {sent ? (isEn ? 'Sent!' : 'Envoyé!') : (isEn ? 'Send' : 'Envoyer')}
                </button>
              </div>
              <p className="text-xs mt-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {enablePassword 
                  ? (isEn 
                      ? 'Recipients will receive an email with the link and password'
                      : 'Les destinataires recevront un courriel avec le lien et le mot de passe')
                  : (isEn 
                      ? 'Recipients will receive an email with the link'
                      : 'Les destinataires recevront un courriel avec le lien')}
              </p>
            </div>
          )}
          
          {activeTab === 'embed' && showEmbedOption && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Embed Code' : 'Code d\'intégration'}
                </label>
                <div 
                  className="p-3 rounded-xl border font-mono text-xs overflow-x-auto"
                  style={{ 
                    borderColor: 'rgb(var(--color-border))',
                    color: 'rgb(var(--color-text))',
                  }}
                >
                  {embedCode}
                </div>
              </div>
              <button
                onClick={handleCopyEmbed}
                className="w-full py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                style={{ 
                  backgroundColor: copied ? 'rgb(var(--color-success))' : 'rgb(var(--color-primary-500))',
                  color: 'white',
                }}
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? (isEn ? 'Copied!' : 'Copié!') : (isEn ? 'Copy Embed Code' : 'Copier le code')}
              </button>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div 
          className="p-4 border-t flex justify-end gap-3"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-black/5"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'Close' : 'Fermer'}
          </button>
          <button
            onClick={handleCopyLink}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            style={{ 
              backgroundColor: 'rgb(var(--color-primary-500))',
              color: 'white',
            }}
          >
            <Copy className="w-4 h-4" />
            {enablePassword 
              ? (isEn ? 'Copy Link & Password' : 'Copier lien et mot de passe')
              : (isEn ? 'Copy Link' : 'Copier le lien')}
          </button>
        </div>
      </div>
    </div>
  );
}
