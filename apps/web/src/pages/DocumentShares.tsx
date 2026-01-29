/**
 * Document Shares Page
 * 
 * Upload and manage password-protected document shares.
 */

import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { apiClient } from '../infrastructure/api/client';

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

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getFileIcon(mimeType: string): string {
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
  if (mimeType.includes('image')) return '🖼️';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return '📦';
  if (mimeType.includes('text')) return '📃';
  return '📎';
}

export default function DocumentShares() {
  const [shares, setShares] = useState<ShareInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newShareResult, setNewShareResult] = useState<ShareResult | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState(168); // 7 days
  const [maxDownloads, setMaxDownloads] = useState<number | ''>('');
  const [description, setDescription] = useState('');

  // Fetch shares
  const fetchShares = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get<ShareInfo[]>('/api/v1/document-shares/my');
      setShares(response.data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch shares:', err);
      setError('Impossible de charger vos partages');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (100MB)
      if (file.size > 100 * 1024 * 1024) {
        setError('Le fichier dépasse la taille maximale de 100 Mo');
        return;
      }
      setUploadFile(file);
      setError(null);
    }
  };

  // Handle upload
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !password) return;

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
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
      setError('Échec du téléversement. Veuillez réessayer.');
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
    if (!confirm('Voulez-vous vraiment désactiver ce partage?')) return;

    try {
      await apiClient.post(`/api/v1/document-shares/${shareId}/deactivate`, { reason: 'Manual deactivation' });
      fetchShares();
    } catch (err) {
      console.error('Failed to deactivate:', err);
      setError('Échec de la désactivation');
    }
  };

  // Delete share
  const handleDelete = async (shareId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce partage? Cette action est irréversible.')) return;

    try {
      await apiClient.delete(`/api/v1/document-shares/${shareId}`);
      fetchShares();
    } catch (err) {
      console.error('Failed to delete:', err);
      setError('Échec de la suppression');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            Partage de documents
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
            Partagez des documents avec un lien protégé par mot de passe
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Nouveau partage
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div 
          className="p-4 rounded-lg flex items-center gap-3"
          style={{ 
            backgroundColor: 'rgb(var(--color-danger) / 0.1)',
            border: '1px solid rgb(var(--color-danger) / 0.2)'
          }}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(var(--color-danger))' }} />
          <p className="text-sm" style={{ color: 'rgb(var(--color-danger))' }}>{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" style={{ color: 'rgb(var(--color-danger))' }} />
          </button>
        </div>
      )}

      {/* Success modal for new share */}
      {newShareResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div 
            className="w-full max-w-md p-6 rounded-xl shadow-xl"
            style={{ backgroundColor: 'rgb(var(--color-surface))' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}
              >
                <Check className="w-5 h-5" style={{ color: 'rgb(var(--color-success))' }} />
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  Partage créé avec succès!
                </h3>
                <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  Expire le {formatDate(newShareResult.expiresAt)}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  Lien de partage
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
                    className="btn-secondary btn-sm flex items-center gap-1"
                  >
                    {copiedId === 'new-share' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div 
                className="p-3 rounded-lg text-xs"
                style={{ 
                  backgroundColor: 'rgb(var(--color-warning) / 0.1)',
                  border: '1px solid rgb(var(--color-warning) / 0.2)'
                }}
              >
                <p style={{ color: 'rgb(var(--color-warning-dark))' }}>
                  <strong>Important:</strong> Partagez le mot de passe séparément et en toute sécurité.
                </p>
              </div>
            </div>

            <button
              onClick={() => setNewShareResult(null)}
              className="btn-primary w-full mt-4"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div 
            className="w-full max-w-lg p-6 rounded-xl shadow-xl"
            style={{ backgroundColor: 'rgb(var(--color-surface))' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                Nouveau partage de document
              </h3>
              <button onClick={() => setShowUploadModal(false)}>
                <X className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              {/* File input */}
              <div>
                <label className="label">Document</label>
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary-500 transition-colors"
                  style={{ borderColor: 'rgb(var(--color-border))' }}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  {uploadFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-2xl">{getFileIcon(uploadFile.type)}</span>
                      <div className="text-left">
                        <p className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
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
                        className="ml-2 p-1 rounded hover:bg-gray-100"
                      >
                        <X className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgb(var(--color-text-muted))' }} />
                      <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        Cliquez pour sélectionner un fichier
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        PDF, Word, Excel, images, archives - Max 100 Mo
                      </p>
                    </>
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
                <label className="label flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 caractères"
                    className="input pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                    ) : (
                      <Eye className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                    )}
                  </button>
                </div>
              </div>

              {/* Expiration */}
              <div>
                <label className="label flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Expiration
                </label>
                <select
                  value={expiresInHours}
                  onChange={(e) => setExpiresInHours(Number(e.target.value))}
                  className="select"
                >
                  <option value={24}>1 jour</option>
                  <option value={72}>3 jours</option>
                  <option value={168}>7 jours</option>
                  <option value={336}>14 jours</option>
                  <option value={720}>30 jours</option>
                </select>
              </div>

              {/* Max downloads */}
              <div>
                <label className="label flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Limite de téléchargements (optionnel)
                </label>
                <input
                  type="number"
                  value={maxDownloads}
                  onChange={(e) => setMaxDownloads(e.target.value ? Number(e.target.value) : '')}
                  placeholder="Illimité"
                  className="input"
                  min={1}
                />
              </div>

              {/* Description */}
              <div>
                <label className="label">Description (optionnel)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Note visible par le destinataire"
                  className="input"
                  rows={2}
                />
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="btn-secondary flex-1"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || !password || isUploading}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Téléversement...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Créer le partage
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shares list */}
      <div className="card">
        <h3 className="font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
          Vos partages
        </h3>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'rgb(var(--color-primary-500))' }} />
          </div>
        ) : shares.length === 0 ? (
          <div className="text-center py-12">
            <File className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgb(var(--color-text-muted))' }} />
            <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Aucun partage pour le moment
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-primary btn-sm mt-4"
            >
              Créer votre premier partage
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {shares.map((share) => (
              <div
                key={share.id}
                className={`p-4 rounded-lg border transition-all ${
                  share.isActive ? 'hover:shadow-md' : 'opacity-60'
                }`}
                style={{ 
                  borderColor: 'rgb(var(--color-border))',
                  backgroundColor: share.isActive ? 'transparent' : 'rgb(var(--color-bg-muted) / 0.3)'
                }}
              >
                <div className="flex items-start gap-4">
                  <span className="text-2xl">{getFileIcon(share.mimeType)}</span>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>
                        {share.originalFilename}
                      </h4>
                      {!share.isActive && (
                        <span 
                          className="text-xs px-2 py-0.5 rounded"
                          style={{ 
                            backgroundColor: 'rgb(var(--color-danger) / 0.1)',
                            color: 'rgb(var(--color-danger))'
                          }}
                        >
                          Expiré
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      <span className="flex items-center gap-1">
                        <File className="w-3 h-3" />
                        {formatFileSize(share.fileSize)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Expire: {formatDate(share.expiresAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        {share.downloadCount} téléchargement{share.downloadCount !== 1 ? 's' : ''}
                        {share.maxDownloads && ` / ${share.maxDownloads}`}
                      </span>
                    </div>
                    
                    {share.description && (
                      <p className="text-xs mt-2 truncate" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                        {share.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {share.isActive && (
                      <button
                        onClick={() => copyToClipboard(`${window.location.origin}/shared/${share.id}`, share.id)}
                        className="btn-secondary btn-sm flex items-center gap-1"
                        title="Copier le lien"
                      >
                        {copiedId === share.id ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Link2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    {share.isActive && (
                      <button
                        onClick={() => handleDeactivate(share.id)}
                        className="btn-secondary btn-sm"
                        title="Désactiver"
                      >
                        <EyeOff className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(share.id)}
                      className="btn-danger-outline btn-sm"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
