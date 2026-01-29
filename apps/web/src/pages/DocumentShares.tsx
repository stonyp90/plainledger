/**
 * Document Shares Page
 * 
 * Upload and manage password-protected document shares.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload,
  File,
  Link2,
  Clock,
  Download,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Shield,
  Calendar,
  Hash,
  X,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  Presentation,
  UploadCloud,
} from 'lucide-react';
import { apiClient } from '../infrastructure/api/client';
import { useI18n } from '../lib/i18n';

interface ShareInfo {
  id: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  description?: string;
  expiresAt: string;
  downloadCount: number;
  maxDownloads?: number;
  createdAt: string;
  isActive: boolean;
}

interface ShareResult {
  id: string;
  shareUrl: string;
  shareToken: string;
  expiresAt: string;
  maxDownloads?: number;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString: string, language: 'en' | 'fr'): string {
  return new Date(dateString).toLocaleDateString(language === 'en' ? 'en-CA' : 'fr-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getFileIcon(mimeType: string) {
  if (mimeType.includes('pdf')) return FileText;
  if (mimeType.includes('word') || mimeType.includes('document')) return FileText;
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return FileSpreadsheet;
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return Presentation;
  if (mimeType.includes('image')) return FileImage;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return FileArchive;
  return File;
}

function getFileColor(mimeType: string): string {
  if (mimeType.includes('pdf')) return 'rgb(var(--color-error))';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'rgb(59, 130, 246)';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'rgb(34, 197, 94)';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'rgb(249, 115, 22)';
  if (mimeType.includes('image')) return 'rgb(168, 85, 247)';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'rgb(107, 114, 128)';
  return 'rgb(var(--color-primary-500))';
}

export default function DocumentShares() {
  const { language } = useI18n();
  const [shares, setShares] = useState<ShareInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newShareResult, setNewShareResult] = useState<ShareResult | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const dragCounter = useRef(0);

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState(168); // 7 days
  const [maxDownloads, setMaxDownloads] = useState<number | ''>('');
  const [description, setDescription] = useState('');

  // Translations
  const t = {
    title: language === 'en' ? 'Document Shares' : 'Partage de documents',
    subtitle: language === 'en' ? 'Share documents with password-protected links' : 'Partagez des documents avec un lien protégé par mot de passe',
    newShare: language === 'en' ? 'New Share' : 'Nouveau partage',
    yourShares: language === 'en' ? 'Your Shares' : 'Vos partages',
    noShares: language === 'en' ? 'No shares yet' : 'Aucun partage pour le moment',
    createFirst: language === 'en' ? 'Create your first share' : 'Créer votre premier partage',
    dropZone: language === 'en' ? 'Drop your file here' : 'Déposez votre fichier ici',
    dragOrClick: language === 'en' ? 'Drag and drop a file here, or click to browse' : 'Glissez-déposez un fichier ici, ou cliquez pour parcourir',
    maxSize: language === 'en' ? 'PDF, Word, Excel, images, archives - Max 100 MB' : 'PDF, Word, Excel, images, archives - Max 100 Mo',
    password: language === 'en' ? 'Password' : 'Mot de passe',
    passwordMin: language === 'en' ? 'Minimum 6 characters' : 'Minimum 6 caractères',
    expiration: language === 'en' ? 'Expiration' : 'Expiration',
    downloadLimit: language === 'en' ? 'Download limit (optional)' : 'Limite de téléchargements (optionnel)',
    unlimited: language === 'en' ? 'Unlimited' : 'Illimité',
    description: language === 'en' ? 'Description (optional)' : 'Description (optionnel)',
    descriptionHint: language === 'en' ? 'Note visible to the recipient' : 'Note visible par le destinataire',
    cancel: language === 'en' ? 'Cancel' : 'Annuler',
    createShare: language === 'en' ? 'Create Share' : 'Créer le partage',
    uploading: language === 'en' ? 'Uploading...' : 'Téléversement...',
    success: language === 'en' ? 'Share created!' : 'Partage créé!',
    expiresOn: language === 'en' ? 'Expires on' : 'Expire le',
    shareLink: language === 'en' ? 'Share link' : 'Lien de partage',
    important: language === 'en' ? 'Important' : 'Important',
    passwordWarning: language === 'en' ? 'Share the password separately and securely.' : 'Partagez le mot de passe séparément et en toute sécurité.',
    close: language === 'en' ? 'Close' : 'Fermer',
    expired: language === 'en' ? 'Expired' : 'Expiré',
    downloads: language === 'en' ? 'download' : 'téléchargement',
    copyLink: language === 'en' ? 'Copy link' : 'Copier le lien',
    deactivate: language === 'en' ? 'Deactivate' : 'Désactiver',
    delete: language === 'en' ? 'Delete' : 'Supprimer',
    loadError: language === 'en' ? 'Unable to load your shares' : 'Impossible de charger vos partages',
    fileTooLarge: language === 'en' ? 'File exceeds maximum size of 100 MB' : 'Le fichier dépasse la taille maximale de 100 Mo',
    passwordTooShort: language === 'en' ? 'Password must be at least 6 characters' : 'Le mot de passe doit contenir au moins 6 caractères',
    uploadFailed: language === 'en' ? 'Upload failed. Please try again.' : 'Échec du téléversement. Veuillez réessayer.',
    deactivateFailed: language === 'en' ? 'Deactivation failed' : 'Échec de la désactivation',
    deleteFailed: language === 'en' ? 'Deletion failed' : 'Échec de la suppression',
    confirmDeactivate: language === 'en' ? 'Do you want to deactivate this share?' : 'Voulez-vous vraiment désactiver ce partage?',
    confirmDelete: language === 'en' ? 'Do you want to delete this share? This action cannot be undone.' : 'Voulez-vous vraiment supprimer ce partage? Cette action est irréversible.',
    day1: language === 'en' ? '1 day' : '1 jour',
    days3: language === 'en' ? '3 days' : '3 jours',
    days7: language === 'en' ? '7 days' : '7 jours',
    days14: language === 'en' ? '14 days' : '14 jours',
    days30: language === 'en' ? '30 days' : '30 jours',
    document: language === 'en' ? 'Document' : 'Document',
  };

  // Fetch shares
  const fetchShares = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get<ShareInfo[]>('/api/v1/document-shares/my');
      setShares(response.data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch shares:', err);
      setError(t.loadError);
    } finally {
      setIsLoading(false);
    }
  }, [t.loadError]);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  // Validate and set file
  const validateAndSetFile = (file: File) => {
    // Validate file size (100MB)
    if (file.size > 100 * 1024 * 1024) {
      setError(t.fileTooLarge);
      return false;
    }
    setUploadFile(file);
    setError(null);
    return true;
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateAndSetFile(file)) {
        // If not already in modal, open it
        if (!showUploadModal) {
          setShowUploadModal(true);
        }
      }
    }
  };

  // Handle upload
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !password) return;

    if (password.length < 6) {
      setError(t.passwordTooShort);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const response = await apiClient.upload<ShareResult>(
        '/api/v1/document-shares',
        uploadFile,
        'file',
        {
          password,
          expiresInHours: expiresInHours.toString(),
          ...(maxDownloads ? { maxDownloads: maxDownloads.toString() } : {}),
          ...(description ? { description } : {}),
        }
      );

      setNewShareResult(response.data);
      setShowUploadModal(false);
      
      // Reset form
      setUploadFile(null);
      setPassword('');
      setExpiresInHours(168);
      setMaxDownloads('');
      setDescription('');
      
      // Refresh list
      fetchShares();
    } catch (err) {
      console.error('Upload failed:', err);
      setError(t.uploadFailed);
    } finally {
      setIsUploading(false);
    }
  };

  // Copy link to clipboard
  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Deactivate share
  const handleDeactivate = async (shareId: string) => {
    if (!confirm(t.confirmDeactivate)) return;

    try {
      await apiClient.post(`/api/v1/document-shares/${shareId}/deactivate`, { reason: 'Manual deactivation' });
      fetchShares();
    } catch (err) {
      console.error('Failed to deactivate:', err);
      setError(t.deactivateFailed);
    }
  };

  // Delete share
  const handleDelete = async (shareId: string) => {
    if (!confirm(t.confirmDelete)) return;

    try {
      await apiClient.delete(`/api/v1/document-shares/${shareId}`);
      fetchShares();
    } catch (err) {
      console.error('Failed to delete:', err);
      setError(t.deleteFailed);
    }
  };

  // Close modal and reset form
  const handleCloseModal = () => {
    setShowUploadModal(false);
    setUploadFile(null);
    setPassword('');
    setError(null);
  };

  return (
    <div 
      className="max-w-4xl mx-auto"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Global drop overlay */}
      {isDragging && (
        <div 
          className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
          style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
        >
          <div 
            className="p-8 rounded-2xl border-2 border-dashed flex flex-col items-center gap-4"
            style={{ 
              borderColor: 'rgb(var(--color-primary-500))',
              backgroundColor: 'rgb(var(--color-surface))',
              boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)'
            }}
          >
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <UploadCloud className="w-8 h-8" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <p className="text-lg font-medium" style={{ color: 'rgb(var(--color-text))' }}>
              {t.dropZone}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
              {t.title}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {t.subtitle}
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {t.newShare}
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div 
          className="mb-6 p-4 rounded-xl flex items-center gap-3"
          style={{ 
            backgroundColor: 'rgb(var(--color-error) / 0.1)',
            border: '1px solid rgb(var(--color-error) / 0.2)'
          }}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(var(--color-error))' }} />
          <p className="text-sm flex-1" style={{ color: 'rgb(var(--color-error))' }}>{error}</p>
          <button 
            onClick={() => setError(null)} 
            className="p-1 rounded-lg hover:bg-black/5 transition-colors"
          >
            <X className="w-4 h-4" style={{ color: 'rgb(var(--color-error))' }} />
          </button>
        </div>
      )}

      {/* Success modal for new share */}
      {newShareResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div 
            className="w-full max-w-md p-6 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200"
            style={{ backgroundColor: 'rgb(var(--color-surface))' }}
          >
            <div className="flex items-center gap-4 mb-6">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}
              >
                <Check className="w-6 h-6" style={{ color: 'rgb(var(--color-success))' }} />
              </div>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  {t.success}
                </h3>
                <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {t.expiresOn} {formatDate(newShareResult.expiresAt, language as 'en' | 'fr')}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {t.shareLink}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newShareResult.shareUrl}
                    readOnly
                    className="input text-sm font-mono flex-1"
                    style={{ fontSize: '12px' }}
                  />
                  <button
                    onClick={() => copyToClipboard(newShareResult.shareUrl, 'new-share')}
                    className="btn-secondary flex items-center gap-1 px-3"
                  >
                    {copiedId === 'new-share' ? (
                      <Check className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div 
                className="p-4 rounded-xl flex items-start gap-3"
                style={{ 
                  backgroundColor: 'rgb(var(--color-warning) / 0.1)',
                  border: '1px solid rgb(var(--color-warning) / 0.2)'
                }}
              >
                <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-warning))' }} />
                <p className="text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                  <strong>{t.important}:</strong> {t.passwordWarning}
                </p>
              </div>
            </div>

            <button
              onClick={() => setNewShareResult(null)}
              className="btn-primary w-full mt-6"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div 
            className="w-full max-w-lg rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden"
            style={{ backgroundColor: 'rgb(var(--color-surface))' }}
          >
            {/* Modal Header */}
            <div 
              className="px-6 py-4 border-b flex items-center justify-between"
              style={{ borderColor: 'rgb(var(--color-border))' }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                >
                  <Upload className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
                </div>
                <h3 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  {t.newShare}
                </h3>
              </div>
              <button 
                onClick={handleCloseModal}
                className="p-2 rounded-lg hover:bg-black/5 transition-colors"
              >
                <X className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-5">
              {/* File drop zone */}
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'rgb(var(--color-text))' }}>
                  {t.document}
                </label>
                <div
                  ref={dropZoneRef}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    uploadFile ? '' : 'hover:border-primary-500 hover:bg-primary-500/5'
                  }`}
                  style={{ 
                    borderColor: uploadFile ? 'rgb(var(--color-success))' : 'rgb(var(--color-border))',
                    backgroundColor: uploadFile ? 'rgb(var(--color-success) / 0.05)' : 'transparent'
                  }}
                  onClick={() => !uploadFile && document.getElementById('file-input')?.click()}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  {uploadFile ? (
                    <div className="flex items-center justify-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${getFileColor(uploadFile.type)}20` }}
                      >
                        {(() => {
                          const FileIcon = getFileIcon(uploadFile.type);
                          return <FileIcon className="w-6 h-6" style={{ color: getFileColor(uploadFile.type) }} />;
                        })()}
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="font-medium text-sm truncate" style={{ color: 'rgb(var(--color-text))' }}>
                          {uploadFile.name}
                        </p>
                        <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                          {formatFileSize(uploadFile.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadFile(null);
                        }}
                        className="p-2 rounded-lg hover:bg-black/5 transition-colors"
                      >
                        <X className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div 
                        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
                        style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                      >
                        <UploadCloud className="w-7 h-7" style={{ color: 'rgb(var(--color-primary-500))' }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                          {t.dragOrClick}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                          {t.maxSize}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  id="file-input"
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.zip,.rar,.7z"
                />
              </div>

              {/* Password */}
              <div>
                <label className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
                  <Shield className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
                  {t.password}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.passwordMin}
                    className="input pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-black/5 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                    ) : (
                      <Eye className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                    )}
                  </button>
                </div>
              </div>

              {/* Two columns for expiration and max downloads */}
              <div className="grid grid-cols-2 gap-4">
                {/* Expiration */}
                <div>
                  <label className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
                    <Calendar className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
                    {t.expiration}
                  </label>
                  <select
                    value={expiresInHours}
                    onChange={(e) => setExpiresInHours(Number(e.target.value))}
                    className="select"
                  >
                    <option value={24}>{t.day1}</option>
                    <option value={72}>{t.days3}</option>
                    <option value={168}>{t.days7}</option>
                    <option value={336}>{t.days14}</option>
                    <option value={720}>{t.days30}</option>
                  </select>
                </div>

                {/* Max downloads */}
                <div>
                  <label className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
                    <Hash className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
                    {t.downloadLimit}
                  </label>
                  <input
                    type="number"
                    value={maxDownloads}
                    onChange={(e) => setMaxDownloads(e.target.value ? Number(e.target.value) : '')}
                    placeholder={t.unlimited}
                    className="input"
                    min={1}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'rgb(var(--color-text))' }}>
                  {t.description}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.descriptionHint}
                  className="input resize-none"
                  rows={2}
                />
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary flex-1"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || !password || isUploading}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t.uploading}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      {t.createShare}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shares list */}
      <div 
        className="rounded-2xl border overflow-hidden"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          borderColor: 'rgb(var(--color-border))'
        }}
      >
        <div 
          className="px-6 py-4 border-b"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {t.yourShares}
          </h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'rgb(var(--color-primary-500))' }} />
          </div>
        ) : shares.length === 0 ? (
          <div 
            className="relative flex flex-col items-center justify-center min-h-[300px] px-6 cursor-pointer transition-all hover:bg-primary-500/5"
            onClick={() => setShowUploadModal(true)}
            style={{
              background: `
                linear-gradient(90deg, rgb(var(--color-border)) 50%, transparent 50%) repeat-x,
                linear-gradient(90deg, rgb(var(--color-border)) 50%, transparent 50%) repeat-x,
                linear-gradient(0deg, rgb(var(--color-border)) 50%, transparent 50%) repeat-y,
                linear-gradient(0deg, rgb(var(--color-border)) 50%, transparent 50%) repeat-y
              `,
              backgroundSize: '12px 2px, 12px 2px, 2px 12px, 2px 12px',
              backgroundPosition: '0 0, 0 100%, 0 0, 100% 0',
            }}
          >
            {/* Inner content area with solid background */}
            <div 
              className="absolute inset-3 rounded-xl"
              style={{ backgroundColor: 'rgb(var(--color-surface))' }}
            />
            
            {/* Content */}
            <div className="relative z-10 flex flex-col items-center">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
              >
                <UploadCloud className="w-8 h-8" style={{ color: 'rgb(var(--color-primary-500))' }} />
              </div>
              <p className="text-sm mb-1 text-center font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                {t.noShares}
              </p>
              <p className="text-xs mb-4 text-center" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {t.dragOrClick}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUploadModal(true);
                }}
                className="btn-primary"
              >
                {t.createFirst}
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgb(var(--color-border))' }}>
            {shares.map((share) => {
              const FileIcon = getFileIcon(share.mimeType);
              const fileColor = getFileColor(share.mimeType);
              
              return (
                <div
                  key={share.id}
                  className={`p-5 transition-all ${
                    share.isActive ? 'hover:bg-black/[0.02]' : 'opacity-60'
                  }`}
                  style={{ 
                    backgroundColor: share.isActive ? 'transparent' : 'rgb(var(--color-bg-muted) / 0.3)'
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${fileColor}15` }}
                    >
                      <FileIcon className="w-6 h-6" style={{ color: fileColor }} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>
                          {share.originalFilename}
                        </h4>
                        {!share.isActive && (
                          <span 
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ 
                              backgroundColor: 'rgb(var(--color-error) / 0.1)',
                              color: 'rgb(var(--color-error))'
                            }}
                          >
                            {t.expired}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        <span className="flex items-center gap-1">
                          <File className="w-3.5 h-3.5" />
                          {formatFileSize(share.fileSize)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(share.expiresAt, language as 'en' | 'fr')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="w-3.5 h-3.5" />
                          {share.downloadCount} {t.downloads}{share.downloadCount !== 1 ? 's' : ''}
                          {share.maxDownloads && ` / ${share.maxDownloads}`}
                        </span>
                      </div>
                      
                      {share.description && (
                        <p className="text-xs mt-2 truncate" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                          {share.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {share.isActive && (
                        <button
                          onClick={() => copyToClipboard(`${window.location.origin}/shared/${share.id}`, share.id)}
                          className="btn-secondary btn-sm flex items-center gap-1"
                          title={t.copyLink}
                        >
                          {copiedId === share.id ? (
                            <Check className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
                          ) : (
                            <Link2 className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      {share.isActive && (
                        <button
                          onClick={() => handleDeactivate(share.id)}
                          className="btn-secondary btn-sm"
                          title={t.deactivate}
                        >
                          <EyeOff className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(share.id)}
                        className="btn-secondary btn-sm text-error hover:bg-error/10 hover:border-error/30"
                        title={t.delete}
                        style={{ color: 'rgb(var(--color-error))' }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
