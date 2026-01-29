/**
 * Shared Document Access Page
 * 
 * Public page for accessing password-protected shared documents.
 * No authentication required.
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  File,
  Download,
  Lock,
  Clock,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  CheckCircle,
  XCircle,
  ArrowLeft,
} from 'lucide-react';
import config from '../lib/config';

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

interface DownloadResult {
  downloadUrl: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  expiresInSeconds: number;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-CA', {
    year: 'numeric',
    month: 'long',
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

export default function SharedDocumentAccess() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Fetch share info
  useEffect(() => {
    const fetchShareInfo = async () => {
      if (!shareToken) {
        setError('Lien de partage invalide');
        setIsLoading(false);
        return;
      }

      try {
        const baseUrl = config.api.baseUrl || '';
        const response = await fetch(`${baseUrl}/api/v1/document-shares/public/${shareToken}/info`);
        const data = await response.json();

        if (data.error) {
          setError(data.error === 'Share not found' ? 'Ce partage n\'existe pas ou a été supprimé' : data.error);
        } else {
          setShareInfo(data);
        }
      } catch (err) {
        console.error('Failed to fetch share info:', err);
        setError('Impossible de charger les informations du partage');
      } finally {
        setIsLoading(false);
      }
    };

    fetchShareInfo();
  }, [shareToken]);

  // Handle download
  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      setError('Veuillez entrer le mot de passe');
      return;
    }

    setIsDownloading(true);
    setError(null);

    try {
      const baseUrl = config.api.baseUrl || '';
      const response = await fetch(`${baseUrl}/api/v1/document-shares/public/${shareToken}/access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          setError('Mot de passe incorrect');
        } else if (response.status === 410) {
          setError(errorData.message || 'Ce partage a expiré ou n\'est plus disponible');
        } else {
          setError(errorData.message || 'Une erreur est survenue');
        }
        return;
      }

      const result: DownloadResult = await response.json();
      
      // Trigger download
      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccess(true);
      setPassword('');
      
      // Refresh share info to update download count
      const infoResponse = await fetch(`${baseUrl}/api/v1/document-shares/public/${shareToken}/info`);
      const newInfo = await infoResponse.json();
      if (!newInfo.error) {
        setShareInfo(newInfo);
      }
    } catch (err) {
      console.error('Download failed:', err);
      setError('Échec du téléchargement. Veuillez réessayer.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}
      >
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" style={{ color: 'rgb(var(--color-primary-500))' }} />
          <p style={{ color: 'rgb(var(--color-text-secondary))' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  // Error state (share not found)
  if (error && !shareInfo) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}
      >
        <div 
          className="w-full max-w-md p-8 rounded-2xl text-center"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            boxShadow: '0 4px 20px rgb(0 0 0 / 0.1)'
          }}
        >
          <div 
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--color-danger) / 0.1)' }}
          >
            <XCircle className="w-8 h-8" style={{ color: 'rgb(var(--color-danger))' }} />
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
            Partage non disponible
          </h1>
          <p className="text-sm mb-6" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {error}
          </p>
          <Link 
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium"
            style={{ color: 'rgb(var(--color-primary-500))' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  // Share expired or inactive
  if (shareInfo && !shareInfo.isActive) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}
      >
        <div 
          className="w-full max-w-md p-8 rounded-2xl text-center"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            boxShadow: '0 4px 20px rgb(0 0 0 / 0.1)'
          }}
        >
          <div 
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--color-warning) / 0.1)' }}
          >
            <Clock className="w-8 h-8" style={{ color: 'rgb(var(--color-warning))' }} />
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
            Partage expiré
          </h1>
          <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
            Ce partage n'est plus disponible. Il a peut-être expiré ou a été désactivé par son propriétaire.
          </p>
          <div 
            className="p-3 rounded-lg text-sm"
            style={{ 
              backgroundColor: 'rgb(var(--color-bg-muted))',
              color: 'rgb(var(--color-text-muted))'
            }}
          >
            Fichier: {shareInfo.originalFilename}
          </div>
          <Link 
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium mt-6"
            style={{ color: 'rgb(var(--color-primary-500))' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  // Main content - password form
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}
    >
      <div 
        className="w-full max-w-md p-8 rounded-2xl"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          boxShadow: '0 4px 20px rgb(0 0 0 / 0.1)'
        }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div 
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
          >
            <Shield className="w-8 h-8" style={{ color: 'rgb(var(--color-primary-500))' }} />
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            Document partagé
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
            Ce document est protégé par mot de passe
          </p>
        </div>

        {/* File info card */}
        {shareInfo && (
          <div 
            className="p-4 rounded-xl mb-6"
            style={{ 
              backgroundColor: 'rgb(var(--color-bg-muted))',
              border: '1px solid rgb(var(--color-border))'
            }}
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl">{getFileIcon(shareInfo.mimeType)}</span>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold truncate" style={{ color: 'rgb(var(--color-text))' }}>
                  {shareInfo.originalFilename}
                </h2>
                <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  <span className="flex items-center gap-1">
                    <File className="w-3 h-3" />
                    {formatFileSize(shareInfo.fileSize)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Expire: {formatDate(shareInfo.expiresAt)}
                  </span>
                </div>
                {shareInfo.description && (
                  <p className="text-xs mt-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {shareInfo.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Download success message */}
        {downloadSuccess && (
          <div 
            className="p-4 rounded-lg mb-4 flex items-center gap-3"
            style={{ 
              backgroundColor: 'rgb(var(--color-success) / 0.1)',
              border: '1px solid rgb(var(--color-success) / 0.2)'
            }}
          >
            <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(var(--color-success))' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-success))' }}>
                Téléchargement réussi!
              </p>
              <p className="text-xs" style={{ color: 'rgb(var(--color-success))' }}>
                Le fichier devrait apparaître dans vos téléchargements.
              </p>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div 
            className="p-3 rounded-lg mb-4 flex items-center gap-2"
            style={{ 
              backgroundColor: 'rgb(var(--color-danger) / 0.1)',
              border: '1px solid rgb(var(--color-danger) / 0.2)'
            }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'rgb(var(--color-danger))' }} />
            <p className="text-sm" style={{ color: 'rgb(var(--color-danger))' }}>{error}</p>
          </div>
        )}

        {/* Password form */}
        <form onSubmit={handleDownload}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
              Mot de passe
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <Lock className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                  setDownloadSuccess(false);
                }}
                placeholder="Entrez le mot de passe"
                className="input pl-10 pr-10 w-full"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                ) : (
                  <Eye className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!password || isDownloading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Vérification...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Télécharger
              </>
            )}
          </button>
        </form>

        {/* Download stats */}
        {shareInfo && shareInfo.maxDownloads && (
          <p className="text-center text-xs mt-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {shareInfo.downloadCount} / {shareInfo.maxDownloads} téléchargements utilisés
          </p>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 text-center" style={{ borderTop: '1px solid rgb(var(--color-border))' }}>
          <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            Partage sécurisé par{' '}
            <Link to="/" className="font-medium" style={{ color: 'rgb(var(--color-primary-500))' }}>
              PlainLedger
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
