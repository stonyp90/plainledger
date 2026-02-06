import { useI18n } from '../../lib/i18n';
import { config } from '../../lib/config';
import {
  FileCode,
  ExternalLink,
  Copy,
  Lock,
  CheckCircle2,
  Book,
  Zap,
} from 'lucide-react';

export default function AdminApiDocs() {
  const { language } = useI18n();
  const isEn = language === 'en';
  const apiUrl = `${config.api.baseUrl}/api/docs`;

  const copyUrl = () => {
    navigator.clipboard.writeText(apiUrl);
  };

  const endpoints = [
    { name: isEn ? 'Organizations' : 'Organisations', desc: isEn ? 'Manage tenant organizations' : 'Gérer les organisations', color: 'primary' },
    { name: isEn ? 'Users' : 'Utilisateurs', desc: isEn ? 'User management and permissions' : 'Gestion des utilisateurs et permissions', color: 'info' },
    { name: isEn ? 'Financial Reports' : 'Rapports financiers', desc: isEn ? 'Generate and retrieve reports' : 'Générer et récupérer des rapports', color: 'success' },
    { name: isEn ? 'Data Sync' : 'Synchronisation', desc: isEn ? 'Trigger and monitor data synchronization' : 'Déclencher et surveiller la synchronisation', color: 'warning' },
    { name: isEn ? 'Health' : 'Santé', desc: isEn ? 'System health checks and status' : 'Vérifications de santé système', color: 'error' },
    { name: 'Analytics', desc: isEn ? 'Business intelligence and metrics' : 'Intelligence d\'affaires et métriques', color: 'accent' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'API Documentation' : 'Documentation API'}
        </h1>
        <p className="mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
          {isEn ? 'Interactive API documentation powered by Swagger/OpenAPI' : 'Documentation API interactive propulsée par Swagger/OpenAPI'}
        </p>
      </div>

      {/* Swagger Link Card */}
      <div
        className="rounded-xl border p-6"
        style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}
      >
        <div className="flex items-start gap-4">
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
          >
            <FileCode className="w-6 h-6" style={{ color: 'rgb(var(--color-primary-600))' }} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
              Swagger UI
            </h2>
            <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn ? 'Explore and test all available API endpoints' : 'Explorez et testez tous les endpoints API disponibles'}
            </p>
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-lg mb-4"
              style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
            >
              <span className="text-sm font-mono flex-1 truncate" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {apiUrl}
              </span>
              <button
                onClick={copyUrl}
                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title={isEn ? 'Copy URL' : 'Copier l\'URL'}
              >
                <Copy className="w-4 h-4" style={{ color: 'rgb(var(--color-text-secondary))' }} />
              </button>
            </div>
            <div className="flex gap-3">
              <a
                href={apiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
              >
                <ExternalLink className="w-4 h-4" />
                {isEn ? 'Open Swagger UI' : 'Ouvrir Swagger UI'}
              </a>
              <button
                onClick={copyUrl}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                style={{ borderColor: 'rgb(var(--color-border))', color: 'rgb(var(--color-text))' }}
              >
                <Copy className="w-4 h-4" />
                {isEn ? 'Copy URL' : 'Copier l\'URL'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Authentication Info */}
      <div
        className="rounded-xl border p-6"
        style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}
      >
        <div className="flex items-start gap-4">
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: 'rgb(var(--color-warning) / 0.1)' }}
          >
            <Lock className="w-6 h-6" style={{ color: 'rgb(var(--color-warning))' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Authentication' : 'Authentification'}
            </h2>
            <p className="text-sm mb-3" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn
                ? 'The API uses Bearer token authentication. Use the "Authorize" button in Swagger UI to authenticate with your access token.'
                : 'L\'API utilise l\'authentification Bearer token. Utilisez le bouton "Authorize" dans Swagger UI pour vous authentifier.'}
            </p>
            <code
              className="text-xs px-3 py-2 rounded block"
              style={{ backgroundColor: 'rgb(var(--color-bg-muted))', color: 'rgb(var(--color-text-secondary))' }}
            >
              Authorization: Bearer &lt;token&gt;
            </code>
          </div>
        </div>
      </div>

      {/* Endpoints Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className="rounded-xl border p-6"
          style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
            <Book className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-600))' }} />
            {isEn ? 'API Endpoints' : 'Endpoints API'}
          </h3>
          <ul className="space-y-3">
            {endpoints.map((ep) => (
              <li key={ep.name} className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 mt-0.5" style={{ color: 'rgb(var(--color-success))' }} />
                <div>
                  <div className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>{ep.name}</div>
                  <div className="text-xs" style={{ color: 'rgb(var(--color-text-secondary))' }}>{ep.desc}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div
          className="rounded-xl border p-6"
          style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
            <Zap className="w-5 h-5" style={{ color: 'rgb(var(--color-accent-500))' }} />
            {isEn ? 'Quick Tips' : 'Conseils rapides'}
          </h3>
          <ul className="space-y-3 text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            <li className="flex items-start gap-2">
              <span style={{ color: 'rgb(var(--color-primary-600))' }}>•</span>
              {isEn ? 'Use "Try it out" in Swagger UI to test endpoints directly' : 'Utilisez "Try it out" dans Swagger UI pour tester les endpoints'}
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: 'rgb(var(--color-primary-600))' }}>•</span>
              {isEn ? 'All requests require a valid JWT token in the Authorization header' : 'Toutes les requêtes nécessitent un token JWT valide'}
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: 'rgb(var(--color-primary-600))' }}>•</span>
              {isEn ? 'Response schemas are documented for each endpoint' : 'Les schémas de réponse sont documentés pour chaque endpoint'}
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: 'rgb(var(--color-primary-600))' }}>•</span>
              {isEn ? 'Download the OpenAPI spec from /api/docs-json' : 'Téléchargez la spec OpenAPI depuis /api/docs-json'}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
