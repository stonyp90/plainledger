/**
 * PlainLedger Help Center
 * 
 * Integrated help system with:
 * - Crisp live chat integration
 * - Contextual help based on current page
 * - FAQ/Knowledge base
 * - Contact options
 */

import { useState, useEffect, useRef } from 'react';
import { 
  HelpCircle, 
  MessageCircle, 
  Book, 
  Mail, 
  Phone, 
  Search,
  ChevronRight,
  X,
  Sparkles,
  FileText,
  BarChart3,
  Link2,
  AlertTriangle,
  Settings,
  ExternalLink,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { crispUtils } from './CrispChat';
import config from '../lib/config';
import { useLocation, useNavigate } from 'react-router-dom';

// =====================================================
// HELP TOPICS
// =====================================================

interface HelpTopic {
  id: string;
  icon: typeof HelpCircle;
  title: { en: string; fr: string };
  description: { en: string; fr: string };
  articles: {
    id: string;
    title: { en: string; fr: string };
    url?: string;
    kbUrl?: string; // Knowledge base URL
  }[];
}

const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'getting-started',
    icon: Sparkles,
    title: { en: 'Getting Started', fr: 'Démarrage' },
    description: { en: 'Learn the basics of PlainLedger', fr: 'Apprenez les bases de PlainLedger' },
    articles: [
      { id: 'quick-start', title: { en: 'Quick Start Guide', fr: 'Guide de démarrage rapide' }, url: '/app', kbUrl: '/help/knowledge-base/getting-started/quick-start' },
      { id: 'first-connection', title: { en: 'Connect Your First Data Source', fr: 'Connecter votre première source' }, url: '/app/connections', kbUrl: '/help/knowledge-base/getting-started/first-connection' },
      { id: 'dashboard-overview', title: { en: 'Dashboard Overview', fr: 'Aperçu du tableau de bord' }, url: '/app', kbUrl: '/help/knowledge-base/getting-started/dashboard-overview' },
    ],
  },
  {
    id: 'reports',
    icon: FileText,
    title: { en: 'Financial Reports', fr: 'Rapports financiers' },
    description: { en: 'Generate and customize reports', fr: 'Générer et personnaliser les rapports' },
    articles: [
      { id: 'balance-sheet', title: { en: 'Balance Sheet Report', fr: 'Rapport de bilan' }, url: '/app/reports/balance-sheet', kbUrl: '/help/knowledge-base/reports/balance-sheet' },
      { id: 'income-statement', title: { en: 'Income Statement', fr: 'Compte de résultat' }, url: '/app/reports/income-statement', kbUrl: '/help/knowledge-base/reports/income-statement' },
      { id: 'cash-flow', title: { en: 'Cash Flow Statement', fr: 'Flux de trésorerie' }, url: '/app/reports/cash-flow', kbUrl: '/help/knowledge-base/reports/cash-flow' },
      { id: 'export-reports', title: { en: 'Exporting Reports', fr: 'Exporter les rapports' }, url: '/app/reports', kbUrl: '/help/knowledge-base/reports/export-reports' },
    ],
  },
  {
    id: 'connections',
    icon: Link2,
    title: { en: 'Data Connections', fr: 'Connexions de données' },
    description: { en: 'Connect and manage data sources', fr: 'Connecter et gérer les sources' },
    articles: [
      { id: 'connect-quickbooks', title: { en: 'Connect QuickBooks', fr: 'Connecter QuickBooks' }, url: '/app/connections', kbUrl: '/help/knowledge-base/connections/connect-quickbooks' },
      { id: 'connect-xero', title: { en: 'Connect Xero', fr: 'Connecter Xero' }, url: '/app/connections', kbUrl: '/help/knowledge-base/connections/connect-xero' },
      { id: 'connect-sage', title: { en: 'Connect Sage', fr: 'Connecter Sage' }, url: '/app/connections', kbUrl: '/help/knowledge-base/connections/connect-sage' },
      { id: 'import-csv', title: { en: 'Import CSV Data', fr: 'Importer des données CSV' }, url: '/app/connections', kbUrl: '/help/knowledge-base/connections/import-csv' },
    ],
  },
  {
    id: 'anomalies',
    icon: AlertTriangle,
    title: { en: 'Anomaly Detection', fr: 'Détection d\'anomalies' },
    description: { en: 'Understand and resolve anomalies', fr: 'Comprendre et résoudre les anomalies' },
    articles: [
      { id: 'anomaly-types', title: { en: 'Types of Anomalies', fr: 'Types d\'anomalies' }, url: '/app/anomalies', kbUrl: '/help/knowledge-base/anomalies/anomaly-types' },
      { id: 'threshold-config', title: { en: 'Configure Thresholds', fr: 'Configurer les seuils' }, url: '/app/settings?tab=anomalies', kbUrl: '/help/knowledge-base/anomalies/threshold-config' },
      { id: 'false-positives', title: { en: 'Managing False Positives', fr: 'Gérer les faux positifs' }, url: '/app/anomalies', kbUrl: '/help/knowledge-base/anomalies/false-positives' },
    ],
  },
  {
    id: 'dashboard',
    icon: BarChart3,
    title: { en: 'Dashboard & Analytics', fr: 'Tableau de bord & Analyses' },
    description: { en: 'Understand your financial metrics', fr: 'Comprendre vos métriques' },
    articles: [
      { id: 'health-score', title: { en: 'Financial Health Score', fr: 'Score de santé financière' }, url: '/app/anomalies', kbUrl: '/help/knowledge-base/dashboard/health-score' },
      { id: 'kpi-explained', title: { en: 'KPIs Explained', fr: 'KPIs expliqués' }, url: '/app', kbUrl: '/help/knowledge-base/dashboard/kpi-explained' },
      { id: 'trends', title: { en: 'Understanding Trends', fr: 'Comprendre les tendances' }, url: '/app/visualizations', kbUrl: '/help/knowledge-base/dashboard/trends' },
    ],
  },
  {
    id: 'settings',
    icon: Settings,
    title: { en: 'Account & Settings', fr: 'Compte & Paramètres' },
    description: { en: 'Manage your account and team', fr: 'Gérer votre compte et équipe' },
    articles: [
      { id: 'team-management', title: { en: 'Team Management', fr: 'Gestion d\'équipe' }, url: '/app/settings?tab=organization', kbUrl: '/help/knowledge-base/settings/team-management' },
      { id: 'billing', title: { en: 'Billing & Subscriptions', fr: 'Facturation & Abonnements' }, url: '/app/settings?tab=billing', kbUrl: '/help/knowledge-base/settings/billing' },
      { id: 'security', title: { en: 'Security Settings', fr: 'Paramètres de sécurité' }, url: '/app/settings?tab=security', kbUrl: '/help/knowledge-base/settings/security' },
    ],
  },
];

// Page to topic mapping
const PAGE_TOPIC_MAP: Record<string, string> = {
  '/app': 'getting-started',
  '/app/dashboard': 'dashboard',
  '/app/anomalies': 'anomalies',
  '/app/connections': 'connections',
  '/app/reports': 'reports',
  '/app/settings': 'settings',
};

// =====================================================
// FAQ
// =====================================================

const FAQ = [
  {
    q: { en: 'How do I connect my accounting software?', fr: 'Comment connecter mon logiciel comptable?' },
    a: { 
      en: 'Go to Connections, click on your accounting software provider, and follow the OAuth flow to authorize PlainLedger.',
      fr: 'Allez dans Connexions, cliquez sur votre fournisseur de logiciel comptable, et suivez le processus OAuth pour autoriser PlainLedger.'
    },
  },
  {
    q: { en: 'Is my data secure?', fr: 'Mes données sont-elles sécurisées?' },
    a: { 
      en: 'Absolutely! Built by CPAs who understand confidentiality requirements. We use AES-256 bank-level encryption, all data is stored in Canada, and we only have read-only access to your accounting data.',
      fr: 'Absolument! Conçu par des CPA qui comprennent les exigences de confidentialité. Nous utilisons le chiffrement bancaire AES-256, toutes les données sont stockées au Canada, et nous avons uniquement un accès en lecture seule.'
    },
  },
  {
    q: { en: 'What does the health score mean?', fr: 'Que signifie le score de santé?' },
    a: { 
      en: 'The health score (0-100) reflects your overall financial health based on key ratios, anomalies detected, and trend analysis. 80+ is excellent, 60-79 is good, below 60 needs attention.',
      fr: 'Le score de santé (0-100) reflète votre santé financière globale basée sur les ratios clés, les anomalies détectées et l\'analyse des tendances. 80+ est excellent, 60-79 est bon, en dessous de 60 nécessite attention.'
    },
  },
  {
    q: { en: 'How do I add team members?', fr: 'Comment ajouter des membres d\'équipe?' },
    a: { 
      en: 'Go to Settings > Organization, click "Invite Member", enter their email, and select their role. They\'ll receive an invitation email.',
      fr: 'Allez dans Paramètres > Organisation, cliquez "Inviter un membre", entrez leur courriel, et sélectionnez leur rôle. Ils recevront un courriel d\'invitation.'
    },
  },
  {
    q: { en: 'Can I export reports to PDF?', fr: 'Puis-je exporter les rapports en PDF?' },
    a: { 
      en: 'Yes! On any report page, click the "Export PDF" button in the top-right corner. You can also export to Excel.',
      fr: 'Oui! Sur n\'importe quelle page de rapport, cliquez sur "Exporter PDF" dans le coin supérieur droit. Vous pouvez aussi exporter vers Excel.'
    },
  },
];

// =====================================================
// COMPONENTS
// =====================================================

interface HelpCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpCenter({ isOpen, onClose }: HelpCenterProps) {
  const { language } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const isEn = language === 'en';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'topics' | 'faq' | 'contact'>('topics');
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get suggested topic based on current page
  const suggestedTopicId = PAGE_TOPIC_MAP[location.pathname];

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Filter topics based on search
  const filteredTopics = HELP_TOPICS.filter(topic => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const titleMatch = (isEn ? topic.title.en : topic.title.fr).toLowerCase().includes(query);
    const descMatch = (isEn ? topic.description.en : topic.description.fr).toLowerCase().includes(query);
    const articleMatch = topic.articles.some(a => 
      (isEn ? a.title.en : a.title.fr).toLowerCase().includes(query)
    );
    return titleMatch || descMatch || articleMatch;
  });

  // Filter FAQ based on search
  const filteredFAQ = FAQ.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const qMatch = (isEn ? item.q.en : item.q.fr).toLowerCase().includes(query);
    const aMatch = (isEn ? item.a.en : item.a.fr).toLowerCase().includes(query);
    return qMatch || aMatch;
  });

  const handleOpenChat = () => {
    if (config.crisp.enabled) {
      crispUtils.open();
      onClose();
    } else {
      window.location.href = `mailto:${config.support.email}`;
    }
  };

  const handleArticleClick = (articleId: string, url?: string, kbUrl?: string) => {
    // Prefer knowledge base URL if available
    if (kbUrl) {
      navigate(kbUrl);
      onClose();
      return;
    }
    // If article has a URL, navigate to it
    if (url) {
      navigate(url);
      onClose();
      return;
    }
    // Otherwise, try Crisp help search
    if (config.crisp.enabled) {
      crispUtils.searchHelp(articleId);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-center-title"
      aria-describedby="help-center-description"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="relative w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: 'rgb(var(--color-surface))' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="p-6 border-b flex items-center justify-between"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <div>
            <h2 
              id="help-center-title"
              className="text-xl font-bold" 
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? 'Help Center' : 'Centre d\'aide'}
            </h2>
            <p 
              id="help-center-description"
              className="text-sm mt-1" 
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn ? 'Find answers and get support' : 'Trouvez des réponses et obtenez du support'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label={isEn ? 'Close help center' : 'Fermer le centre d\'aide'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <div 
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl border"
            style={{ borderColor: 'rgb(var(--color-border))' }}
          >
            <Search className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={isEn ? 'Search help articles...' : 'Rechercher dans l\'aide...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: 'rgb(var(--color-text))' }}
              aria-label={isEn ? 'Search help articles' : 'Rechercher dans l\'aide'}
            />
          </div>
        </div>

        {/* Tabs */}
        <div 
          className="flex border-b" 
          style={{ borderColor: 'rgb(var(--color-border))' }}
          role="tablist"
          aria-label={isEn ? 'Help center sections' : 'Sections du centre d\'aide'}
        >
          {[
            { id: 'topics', label: { en: 'Topics', fr: 'Sujets' }, icon: Book },
            { id: 'faq', label: { en: 'FAQ', fr: 'FAQ' }, icon: HelpCircle },
            { id: 'contact', label: { en: 'Contact', fr: 'Contact' }, icon: MessageCircle },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`help-tabpanel-${tab.id}`}
              id={`help-tab-${tab.id}`}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium
                border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
              `}
              style={{
                borderColor: activeTab === tab.id ? 'rgb(var(--color-primary-500))' : 'transparent',
                color: activeTab === tab.id ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-muted))',
                '--tw-ring-color': 'rgb(var(--color-primary-500))',
              } as React.CSSProperties}
            >
              <tab.icon className="w-4 h-4" />
              {isEn ? tab.label.en : tab.label.fr}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'topics' && (
            <div role="tabpanel" id="help-tabpanel-topics" aria-labelledby="help-tab-topics">
            <div className="space-y-4">
              {/* Suggested topic */}
              {suggestedTopicId && !searchQuery && (
                <div className="mb-6">
                  <p className="text-xs font-medium mb-3" style={{ color: 'rgb(var(--color-primary-600))' }}>
                    {isEn ? 'Suggested for this page' : 'Suggéré pour cette page'}
                  </p>
                  {HELP_TOPICS.filter(t => t.id === suggestedTopicId).map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => setSelectedTopic(topic.id)}
                      className="flex items-center gap-3 w-full p-4 rounded-xl text-left transition-all hover:scale-[1.01]"
                      style={{ 
                        borderColor: 'rgb(var(--color-primary-500))',
                        backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                      }}
                    >
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.15)' }}
                      >
                        <topic.icon className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                          {isEn ? topic.title.en : topic.title.fr}
                        </p>
                        <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                          {isEn ? topic.description.en : topic.description.fr}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 ml-auto" style={{ color: 'rgb(var(--color-primary-500))' }} />
                    </button>
                  ))}
                </div>
              )}

              {/* All topics */}
              {filteredTopics.map((topic) => (
                <div key={topic.id}>
                  <button
                    onClick={() => setSelectedTopic(selectedTopic === topic.id ? null : topic.id)}
                    className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted transition-colors text-left"
                  >
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                    >
                      <topic.icon className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                        {isEn ? topic.title.en : topic.title.fr}
                      </p>
                      <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        {topic.articles.length} {isEn ? 'articles' : 'articles'}
                      </p>
                    </div>
                    <ChevronRight 
                      className={`w-5 h-5 transition-transform ${selectedTopic === topic.id ? 'rotate-90' : ''}`} 
                      style={{ color: 'rgb(var(--color-text-muted))' }} 
                    />
                  </button>
                  
                  {/* Articles */}
                  {selectedTopic === topic.id && (
                    <div className="ml-14 mt-2 space-y-1">
                      {topic.articles.map((article) => (
                        <button
                          key={article.id}
                          onClick={() => handleArticleClick(article.id, article.url, article.kbUrl)}
                          className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted transition-colors text-left text-sm group"
                          style={{ color: 'rgb(var(--color-text-secondary))' }}
                        >
                          <FileText className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
                          <span className="help-article-link">
                            {isEn ? article.title.en : article.title.fr}
                          </span>
                          <ExternalLink 
                            className="w-3 h-3 ml-auto opacity-50 group-hover:opacity-100 transition-opacity" 
                            style={{ color: 'rgb(var(--color-primary-500))' }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {filteredTopics.length === 0 && (
                <div className="text-center py-8">
                  <p style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'No topics found' : 'Aucun sujet trouvé'}
                  </p>
                </div>
              )}
            </div>
            </div>
          )}

          {activeTab === 'faq' && (
            <div role="tabpanel" id="help-tabpanel-faq" aria-labelledby="help-tab-faq">
            <div className="space-y-4">
              {filteredFAQ.map((item, idx) => (
                <div 
                  key={idx}
                  className="p-4 rounded-xl border"
                  style={{ borderColor: 'rgb(var(--color-border))' }}
                >
                  <p className="font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? item.q.en : item.q.fr}
                  </p>
                  <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {isEn ? item.a.en : item.a.fr}
                  </p>
                </div>
              ))}

              {filteredFAQ.length === 0 && (
                <div className="text-center py-8">
                  <p style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'No FAQ found' : 'Aucune FAQ trouvée'}
                  </p>
                </div>
              )}
            </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div role="tabpanel" id="help-tabpanel-contact" aria-labelledby="help-tab-contact">
            <div className="space-y-4">
              {/* Live Chat */}
              <button
                onClick={handleOpenChat}
                className="w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-colors text-left"
                style={{ 
                  borderColor: 'rgb(var(--color-border))',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgb(var(--color-primary-500))'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgb(var(--color-border))'}
              >
                <div 
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                >
                  <MessageCircle className="w-6 h-6" style={{ color: 'rgb(var(--color-primary-500))' }} />
                </div>
                <div>
                  <p className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? 'Live Chat' : 'Chat en direct'}
                  </p>
                  <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn 
                      ? 'Chat with our support team - Available 24/7' 
                      : 'Discutez avec notre équipe de support - Disponible 24/7'}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-success))' }}>
                    {isEn ? '24/7 availability' : 'Disponibilité 24/7'}
                  </p>
                </div>
              </button>

              {/* Email */}
              <a
                href={`mailto:${config.support.email}`}
                className="w-full p-4 rounded-xl border flex items-center gap-4 hover:bg-muted transition-colors"
                style={{ borderColor: 'rgb(var(--color-border))' }}
              >
                <div 
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                >
                  <Mail className="w-6 h-6" style={{ color: 'rgb(var(--color-primary-500))' }} />
                </div>
                <div>
                  <p className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? 'Email Support' : 'Support par courriel'}
                  </p>
                  <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {config.support.email}
                  </p>
                </div>
                <ExternalLink className="w-5 h-5 ml-auto" style={{ color: 'rgb(var(--color-text-muted))' }} />
              </a>

              {/* Phone - or use Crisp live chat */}
              <a
                href={config.crisp.enabled ? '#' : `tel:${config.support.phoneTel}`}
                onClick={(e) => {
                  if (config.crisp.enabled) {
                    e.preventDefault();
                    crispUtils.open();
                  }
                }}
                className="w-full p-4 rounded-xl border flex items-center gap-4 hover:bg-muted transition-colors"
                style={{ borderColor: 'rgb(var(--color-border))' }}
              >
                <div 
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                >
                  <Phone className="w-6 h-6" style={{ color: 'rgb(var(--color-primary-500))' }} />
                </div>
                <div>
                  <p className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? 'Phone Support' : 'Support téléphonique'}
                  </p>
                  <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {config.support.phone}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-success))' }}>
                    {isEn ? 'Available 24/7' : 'Disponible 24/7'}
                  </p>
                </div>
              </a>

              {/* Knowledge Base */}
              <button
                onClick={() => {
                  navigate('/help/knowledge-base');
                  onClose();
                }}
                className="w-full p-4 rounded-xl border flex items-center gap-4 hover:bg-muted transition-colors text-left"
                style={{ borderColor: 'rgb(var(--color-border))' }}
              >
                <div 
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                >
                  <Book className="w-6 h-6" style={{ color: 'rgb(var(--color-primary-500))' }} />
                </div>
                <div>
                  <p className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? 'Knowledge Base' : 'Base de connaissances'}
                  </p>
                  <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'Browse our knowledge base' : 'Parcourez notre base de connaissances'}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 ml-auto" style={{ color: 'rgb(var(--color-primary-500))' }} />
              </button>
            </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          className="p-4 border-t text-center text-sm"
          style={{ 
            borderColor: 'rgb(var(--color-border))',
            color: 'rgb(var(--color-text-muted))'
          }}
        >
          {isEn 
            ? "Can't find what you're looking for? " 
            : "Vous ne trouvez pas ce que vous cherchez? "}
          <button
            onClick={handleOpenChat}
            className="font-medium hover:underline"
            style={{ color: 'rgb(var(--color-primary-500))' }}
          >
            {isEn ? 'Chat with us' : 'Discutez avec nous'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// HELP BUTTON
// =====================================================

interface HelpButtonProps {
  className?: string;
}

export function HelpButton({ className = '' }: HelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { language } = useI18n();
  const isEn = language === 'en';

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors ${className}`}
        title={isEn ? 'Help Center' : 'Centre d\'aide'}
      >
        <HelpCircle className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
        <span className="hidden sm:inline text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
          {isEn ? 'Help' : 'Aide'}
        </span>
      </button>
      
      <HelpCenter isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

export default HelpCenter;
