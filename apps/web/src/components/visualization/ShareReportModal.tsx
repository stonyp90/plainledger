/**
 * ShareReportModal Component
 * 
 * Enhanced sharing modal for reports and dashboards with:
 * - Share individual charts
 * - Share entire reports/dashboards
 * - Export options (PDF, PNG, CSV)
 * - Embed code generation
 * - Email sharing with preview
 * - Link sharing with expiration
 * - Theme customization for shared content
 * 
 * Bilingual support (EN/FR)
 */

import { useState, useCallback } from 'react';
import {
  X,
  Link2,
  Mail,
  Code,
  Download,
  Copy,
  Check,
  Eye,
  Calendar,
  Lock,
  Unlock,
  Palette,
  FileImage,
  FileText,
  FileSpreadsheet,
  Share2,
  Users,
  Globe,
  Clock,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import type { ShareConfig, ChartColorPreset } from './types';
import { FPA_COLOR_PRESETS } from './types';

// =====================================================
// TYPES
// =====================================================

interface ShareReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  titleEn: string;
  contentType: 'chart' | 'dashboard' | 'report';
  onShare?: (config: ShareConfig) => Promise<string>; // Returns share URL
  onExport?: (format: 'pdf' | 'png' | 'csv') => Promise<void>;
  previewImage?: string;
  showDownloadOption?: boolean;
  showEmbedOption?: boolean;
  showEmailOption?: boolean;
}

// =====================================================
// TAB DEFINITIONS
// =====================================================

type TabId = 'link' | 'email' | 'embed' | 'export';

const TABS: { id: TabId; label: string; labelEn: string; icon: typeof Link2 }[] = [
  { id: 'link', label: 'Lien', labelEn: 'Link', icon: Link2 },
  { id: 'email', label: 'Email', labelEn: 'Email', icon: Mail },
  { id: 'embed', label: 'Intégrer', labelEn: 'Embed', icon: Code },
  { id: 'export', label: 'Exporter', labelEn: 'Export', icon: Download },
];

// =====================================================
// EXPIRATION OPTIONS
// =====================================================

const EXPIRATION_OPTIONS = [
  { value: '1d', label: '1 jour', labelEn: '1 day' },
  { value: '7d', label: '7 jours', labelEn: '7 days' },
  { value: '30d', label: '30 jours', labelEn: '30 days' },
  { value: '90d', label: '90 jours', labelEn: '90 days' },
  { value: 'never', label: 'Jamais', labelEn: 'Never' },
];

// =====================================================
// LINK TAB
// =====================================================

interface LinkTabProps {
  shareUrl: string;
  onGenerateLink: () => void;
  isGenerating: boolean;
  expiration: string;
  onExpirationChange: (value: string) => void;
  requirePassword: boolean;
  onRequirePasswordChange: (value: boolean) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  requireAuth: boolean;
  onRequireAuthChange: (value: boolean) => void;
  isEn: boolean;
}

function LinkTab({
  shareUrl,
  onGenerateLink,
  isGenerating,
  expiration,
  onExpirationChange,
  requirePassword,
  onRequirePasswordChange,
  password,
  onPasswordChange,
  requireAuth,
  onRequireAuthChange,
  isEn,
}: LinkTabProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl]);

  return (
    <div className="space-y-4">
      {/* Link URL */}
      <div>
        <label
          className="block text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          {isEn ? 'Shareable Link' : 'Lien de partage'}
        </label>
        <div className="flex gap-2">
          <div
            className="flex-1 flex items-center px-3 py-2.5 rounded-lg"
            style={{
              backgroundColor: 'rgb(var(--color-bg-muted))',
              border: '1px solid rgb(var(--color-border))',
            }}
          >
            <span
              className="text-sm truncate"
              style={{ color: shareUrl ? 'rgb(var(--color-text))' : 'rgb(var(--color-text-muted))' }}
            >
              {shareUrl || (isEn ? 'Click "Generate Link" to create a share link' : 'Cliquez sur "Générer le lien" pour créer un lien')}
            </span>
          </div>
          {shareUrl ? (
            <button
              onClick={handleCopy}
              className="px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors"
              style={{
                backgroundColor: copied ? 'rgb(var(--color-success))' : 'rgb(var(--color-primary-500))',
                color: 'white',
              }}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? (isEn ? 'Copied!' : 'Copié!') : (isEn ? 'Copy' : 'Copier')}
            </button>
          ) : (
            <button
              onClick={onGenerateLink}
              disabled={isGenerating}
              className="px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
              style={{
                backgroundColor: 'rgb(var(--color-primary-500))',
                color: 'white',
              }}
            >
              {isGenerating ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              {isEn ? 'Generate Link' : 'Générer le lien'}
            </button>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Expiration */}
        <div>
          <label
            className="block text-xs font-medium mb-2"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            <Clock className="w-3 h-3 inline mr-1" />
            {isEn ? 'Link expiration' : 'Expiration du lien'}
          </label>
          <select
            value={expiration}
            onChange={(e) => onExpirationChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              backgroundColor: 'rgb(var(--color-bg))',
              border: '1px solid rgb(var(--color-border))',
              color: 'rgb(var(--color-text))',
            }}
          >
            {EXPIRATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {isEn ? opt.labelEn : opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Password protection */}
        <div>
          <label
            className="flex items-center gap-2 text-xs font-medium mb-2 cursor-pointer"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            <input
              type="checkbox"
              checked={requirePassword}
              onChange={(e) => onRequirePasswordChange(e.target.checked)}
              className="rounded"
            />
            <Lock className="w-3 h-3" />
            {isEn ? 'Password protect' : 'Protéger par mot de passe'}
          </label>
          {requirePassword && (
            <input
              type="text"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder={isEn ? 'Enter password' : 'Entrer le mot de passe'}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: 'rgb(var(--color-bg))',
                border: '1px solid rgb(var(--color-border))',
                color: 'rgb(var(--color-text))',
              }}
            />
          )}
        </div>
      </div>

      {/* Require authentication */}
      <label
        className="flex items-center gap-2 text-sm cursor-pointer"
        style={{ color: 'rgb(var(--color-text))' }}
      >
        <input
          type="checkbox"
          checked={requireAuth}
          onChange={(e) => onRequireAuthChange(e.target.checked)}
          className="rounded"
        />
        <Users className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
        {isEn ? 'Require sign-in to view' : 'Exiger une connexion pour voir'}
      </label>
    </div>
  );
}

// =====================================================
// EMAIL TAB
// =====================================================

interface EmailTabProps {
  recipients: string[];
  onRecipientsChange: (recipients: string[]) => void;
  message: string;
  onMessageChange: (message: string) => void;
  onSend: () => void;
  isSending: boolean;
  previewImage?: string;
  isEn: boolean;
}

function EmailTab({
  recipients,
  onRecipientsChange,
  message,
  onMessageChange,
  onSend,
  isSending,
  previewImage,
  isEn,
}: EmailTabProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAddRecipient = () => {
    if (inputValue && inputValue.includes('@')) {
      onRecipientsChange([...recipients, inputValue]);
      setInputValue('');
    }
  };

  const handleRemoveRecipient = (email: string) => {
    onRecipientsChange(recipients.filter((r) => r !== email));
  };

  return (
    <div className="space-y-4">
      {/* Recipients */}
      <div>
        <label
          className="block text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          {isEn ? 'Recipients' : 'Destinataires'}
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="email"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddRecipient()}
            placeholder={isEn ? 'Enter email address' : 'Entrer l\'adresse email'}
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{
              backgroundColor: 'rgb(var(--color-bg))',
              border: '1px solid rgb(var(--color-border))',
              color: 'rgb(var(--color-text))',
            }}
          />
          <button
            onClick={handleAddRecipient}
            className="px-3 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: 'rgb(var(--color-primary-500))',
              color: 'white',
            }}
          >
            {isEn ? 'Add' : 'Ajouter'}
          </button>
        </div>
        {recipients.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {recipients.map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                style={{
                  backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                  color: 'rgb(var(--color-primary-500))',
                }}
              >
                {email}
                <button
                  onClick={() => handleRemoveRecipient(email)}
                  className="hover:opacity-70"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Message */}
      <div>
        <label
          className="block text-xs font-medium mb-2"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          {isEn ? 'Message (optional)' : 'Message (optionnel)'}
        </label>
        <textarea
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          rows={3}
          placeholder={isEn ? 'Add a personal message...' : 'Ajouter un message personnel...'}
          className="w-full px-3 py-2 rounded-lg text-sm resize-none"
          style={{
            backgroundColor: 'rgb(var(--color-bg))',
            border: '1px solid rgb(var(--color-border))',
            color: 'rgb(var(--color-text))',
          }}
        />
      </div>

      {/* Preview */}
      {previewImage && (
        <div>
          <label
            className="block text-xs font-medium mb-2"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn ? 'Preview' : 'Aperçu'}
          </label>
          <div
            className="rounded-lg overflow-hidden"
            style={{
              backgroundColor: 'rgb(var(--color-bg-muted))',
              border: '1px solid rgb(var(--color-border))',
            }}
          >
            <img
              src={previewImage}
              alt="Preview"
              className="w-full h-32 object-cover"
            />
          </div>
        </div>
      )}

      {/* Send button */}
      <button
        onClick={onSend}
        disabled={recipients.length === 0 || isSending}
        className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        style={{
          backgroundColor: 'rgb(var(--color-primary-500))',
          color: 'white',
        }}
      >
        {isSending ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Mail className="w-4 h-4" />
        )}
        {isEn ? 'Send Email' : 'Envoyer l\'email'}
      </button>
    </div>
  );
}

// =====================================================
// EMBED TAB
// =====================================================

interface EmbedTabProps {
  embedCode: string;
  theme: 'light' | 'dark' | 'auto';
  onThemeChange: (theme: 'light' | 'dark' | 'auto') => void;
  width: string;
  onWidthChange: (width: string) => void;
  height: string;
  onHeightChange: (height: string) => void;
  isEn: boolean;
}

function EmbedTab({
  embedCode,
  theme,
  onThemeChange,
  width,
  onWidthChange,
  height,
  onHeightChange,
  isEn,
}: EmbedTabProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Embed code */}
      <div>
        <label
          className="block text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          {isEn ? 'Embed Code' : 'Code d\'intégration'}
        </label>
        <div
          className="p-3 rounded-lg font-mono text-xs overflow-x-auto"
          style={{
            backgroundColor: 'rgb(var(--color-bg-muted))',
            border: '1px solid rgb(var(--color-border))',
            color: 'rgb(var(--color-text))',
          }}
        >
          <code>{embedCode}</code>
        </div>
        <button
          onClick={handleCopy}
          className="mt-2 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          style={{
            backgroundColor: copied ? 'rgb(var(--color-success))' : 'rgb(var(--color-primary-500))',
            color: 'white',
          }}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? (isEn ? 'Copied!' : 'Copié!') : (isEn ? 'Copy Code' : 'Copier le code')}
        </button>
      </div>

      {/* Options */}
      <div className="grid grid-cols-3 gap-4">
        {/* Theme */}
        <div>
          <label
            className="block text-xs font-medium mb-2"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn ? 'Theme' : 'Thème'}
          </label>
          <select
            value={theme}
            onChange={(e) => onThemeChange(e.target.value as any)}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              backgroundColor: 'rgb(var(--color-bg))',
              border: '1px solid rgb(var(--color-border))',
              color: 'rgb(var(--color-text))',
            }}
          >
            <option value="auto">{isEn ? 'Auto' : 'Auto'}</option>
            <option value="light">{isEn ? 'Light' : 'Clair'}</option>
            <option value="dark">{isEn ? 'Dark' : 'Sombre'}</option>
          </select>
        </div>

        {/* Width */}
        <div>
          <label
            className="block text-xs font-medium mb-2"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn ? 'Width' : 'Largeur'}
          </label>
          <input
            type="text"
            value={width}
            onChange={(e) => onWidthChange(e.target.value)}
            placeholder="100%"
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              backgroundColor: 'rgb(var(--color-bg))',
              border: '1px solid rgb(var(--color-border))',
              color: 'rgb(var(--color-text))',
            }}
          />
        </div>

        {/* Height */}
        <div>
          <label
            className="block text-xs font-medium mb-2"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn ? 'Height' : 'Hauteur'}
          </label>
          <input
            type="text"
            value={height}
            onChange={(e) => onHeightChange(e.target.value)}
            placeholder="400px"
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              backgroundColor: 'rgb(var(--color-bg))',
              border: '1px solid rgb(var(--color-border))',
              color: 'rgb(var(--color-text))',
            }}
          />
        </div>
      </div>
    </div>
  );
}

// =====================================================
// EXPORT TAB
// =====================================================

interface ExportTabProps {
  onExport: (format: 'pdf' | 'png' | 'csv') => void;
  isExporting: boolean;
  exportFormat?: string;
  isEn: boolean;
}

function ExportTab({
  onExport,
  isExporting,
  exportFormat,
  isEn,
}: ExportTabProps) {
  const exportOptions = [
    {
      format: 'png' as const,
      icon: FileImage,
      label: 'PNG Image',
      labelFr: 'Image PNG',
      description: 'High-resolution image for presentations',
      descriptionFr: 'Image haute résolution pour présentations',
      color: 'rgb(var(--color-info))',
    },
    {
      format: 'pdf' as const,
      icon: FileText,
      label: 'PDF Document',
      labelFr: 'Document PDF',
      description: 'Professional document for sharing',
      descriptionFr: 'Document professionnel pour partage',
      color: 'rgb(var(--color-error))',
    },
    {
      format: 'csv' as const,
      icon: FileSpreadsheet,
      label: 'CSV Data',
      labelFr: 'Données CSV',
      description: 'Raw data for analysis',
      descriptionFr: 'Données brutes pour analyse',
      color: 'rgb(var(--color-success))',
    },
  ];

  return (
    <div className="space-y-3">
      {exportOptions.map(({ format, icon: Icon, label, labelFr, description, descriptionFr, color }) => (
        <button
          key={format}
          onClick={() => onExport(format)}
          disabled={isExporting}
          className="w-full p-4 rounded-xl text-left transition-all hover:scale-[1.01] disabled:opacity-50"
          style={{
            backgroundColor: 'rgb(var(--color-bg))',
            border: '1px solid rgb(var(--color-border))',
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${color}15` }}
            >
              {isExporting && exportFormat === format ? (
                <span
                  className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: color }}
                />
              ) : (
                <Icon className="w-6 h-6" style={{ color }} />
              )}
            </div>
            <div>
              <p
                className="font-semibold"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? label : labelFr}
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {isEn ? description : descriptionFr}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function ShareReportModal({
  isOpen,
  onClose,
  title,
  titleEn,
  contentType,
  onShare,
  onExport,
  previewImage,
  showDownloadOption = true,
  showEmbedOption = true,
  showEmailOption = true,
}: ShareReportModalProps) {
  const { language } = useI18n();
  const isEn = language === 'en';

  // State
  const [activeTab, setActiveTab] = useState<TabId>('link');
  const [shareUrl, setShareUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [expiration, setExpiration] = useState('7d');
  const [requirePassword, setRequirePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [requireAuth, setRequireAuth] = useState(false);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [embedTheme, setEmbedTheme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [embedWidth, setEmbedWidth] = useState('100%');
  const [embedHeight, setEmbedHeight] = useState('400px');
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<string>('');

  // Filter tabs based on options
  const availableTabs = TABS.filter((tab) => {
    if (tab.id === 'email' && !showEmailOption) return false;
    if (tab.id === 'embed' && !showEmbedOption) return false;
    if (tab.id === 'export' && !showDownloadOption) return false;
    return true;
  });

  // Handlers
  const handleGenerateLink = async () => {
    if (!onShare) return;
    setIsGenerating(true);
    try {
      const config: ShareConfig = {
        type: 'link',
        password: requirePassword ? password : undefined,
        expiresAt: expiration !== 'never' ? new Date(Date.now() + getExpirationMs(expiration)).toISOString() : undefined,
        permissions: {
          canDownload: true,
          canEdit: false,
          requireAuth,
        },
      };
      const url = await onShare(config);
      setShareUrl(url);
    } catch (error) {
      console.error('Failed to generate link:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!onShare) return;
    setIsSending(true);
    try {
      const config: ShareConfig = {
        type: 'email',
        recipients,
        permissions: {
          canDownload: true,
          canEdit: false,
          requireAuth: false,
        },
      };
      await onShare(config);
    } catch (error) {
      console.error('Failed to send email:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'png' | 'csv') => {
    if (!onExport) return;
    setIsExporting(true);
    setExportFormat(format);
    try {
      await onExport(format);
    } catch (error) {
      console.error('Failed to export:', error);
    } finally {
      setIsExporting(false);
      setExportFormat('');
    }
  };

  const embedCode = `<iframe src="https://app.plainledger.ca/embed/${contentType}/xxx" width="${embedWidth}" height="${embedHeight}" frameborder="0" data-theme="${embedTheme}"></iframe>`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in"
        style={{
          backgroundColor: 'rgb(var(--color-surface))',
          border: '1px solid rgb(var(--color-border))',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
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
              <h2
                className="text-lg font-semibold"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? `Share ${contentType}` : `Partager le ${contentType === 'chart' ? 'graphique' : contentType === 'dashboard' ? 'tableau de bord' : 'rapport'}`}
              </h2>
              <p
                className="text-xs"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {isEn ? titleEn : title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex border-b px-4"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          {availableTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative"
                style={{
                  color: isActive ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))',
                }}
              >
                <Icon className="w-4 h-4" />
                {isEn ? tab.labelEn : tab.label}
                {isActive && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'link' && (
            <LinkTab
              shareUrl={shareUrl}
              onGenerateLink={handleGenerateLink}
              isGenerating={isGenerating}
              expiration={expiration}
              onExpirationChange={setExpiration}
              requirePassword={requirePassword}
              onRequirePasswordChange={setRequirePassword}
              password={password}
              onPasswordChange={setPassword}
              requireAuth={requireAuth}
              onRequireAuthChange={setRequireAuth}
              isEn={isEn}
            />
          )}

          {activeTab === 'email' && (
            <EmailTab
              recipients={recipients}
              onRecipientsChange={setRecipients}
              message={message}
              onMessageChange={setMessage}
              onSend={handleSendEmail}
              isSending={isSending}
              previewImage={previewImage}
              isEn={isEn}
            />
          )}

          {activeTab === 'embed' && (
            <EmbedTab
              embedCode={embedCode}
              theme={embedTheme}
              onThemeChange={setEmbedTheme}
              width={embedWidth}
              onWidthChange={setEmbedWidth}
              height={embedHeight}
              onHeightChange={setEmbedHeight}
              isEn={isEn}
            />
          )}

          {activeTab === 'export' && (
            <ExportTab
              onExport={handleExport}
              isExporting={isExporting}
              exportFormat={exportFormat}
              isEn={isEn}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// UTILITIES
// =====================================================

function getExpirationMs(expiration: string): number {
  const day = 24 * 60 * 60 * 1000;
  switch (expiration) {
    case '1d': return day;
    case '7d': return 7 * day;
    case '30d': return 30 * day;
    case '90d': return 90 * day;
    default: return 7 * day;
  }
}

export default ShareReportModal;
