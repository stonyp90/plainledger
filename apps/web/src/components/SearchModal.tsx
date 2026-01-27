import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  FileText,
  LayoutDashboard,
  Link2,
  Settings,
  AlertTriangle,
  Clock,
  ArrowRight,
  Command,
  BarChart2,
  Users,
  CreditCard,
  Bell,
  Shield,
  Zap,
  TrendingUp,
  Wallet,
  PieChart,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';

// ============================================================================
// TYPES
// ============================================================================

interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: 'navigation' | 'reports' | 'anomalies' | 'settings' | 'help';
  icon: React.ReactNode;
  path: string;
  keywords: string[];
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================================
// SEARCH DATA
// ============================================================================

const getSearchData = (t: (key: string) => string): SearchResult[] => [
  // Navigation
  {
    id: 'nav-dashboard',
    title: t('nav.dashboard'),
    description: t('dashboard.subtitle'),
    category: 'navigation',
    icon: <LayoutDashboard className="w-4 h-4" />,
    path: '/app',
    keywords: ['dashboard', 'tableau de bord', 'home', 'accueil', 'overview', 'aperçu'],
  },
  {
    id: 'nav-anomalies',
    title: t('nav.anomalies'),
    description: t('anomalies.subtitle'),
    category: 'navigation',
    icon: <AlertTriangle className="w-4 h-4" />,
    path: '/app/anomalies',
    keywords: ['anomalies', 'anomaly', 'detection', 'détection', 'inconsistency', 'incohérence', 'alert', 'alerte'],
  },
  {
    id: 'nav-connections',
    title: t('nav.connections'),
    description: t('connections.subtitle'),
    category: 'navigation',
    icon: <Link2 className="w-4 h-4" />,
    path: '/app/connections',
    keywords: ['connections', 'connexions', 'quickbooks', 'xero', 'sage', 'accounting', 'comptable', 'sync', 'synchronisation'],
  },
  {
    id: 'nav-reports',
    title: t('nav.reports'),
    description: t('reports.subtitle'),
    category: 'navigation',
    icon: <FileText className="w-4 h-4" />,
    path: '/app/reports',
    keywords: ['reports', 'rapports', 'financial', 'financier', 'statements'],
  },
  {
    id: 'nav-settings',
    title: t('nav.settings'),
    description: 'settings.organization.name',
    category: 'navigation',
    icon: <Settings className="w-4 h-4" />,
    path: '/app/settings',
    keywords: ['settings', 'paramètres', 'configuration', 'preferences', 'préférences'],
  },

  // Reports
  {
    id: 'report-balance-sheet',
    title: t('reports.balanceSheet'),
    description: 'Assets, liabilities and equity / Actifs, passifs et capitaux propres',
    category: 'reports',
    icon: <BarChart2 className="w-4 h-4" />,
    path: '/app/reports/balance-sheet',
    keywords: ['balance sheet', 'bilan', 'assets', 'actifs', 'liabilities', 'passifs', 'equity', 'capitaux propres'],
  },
  {
    id: 'report-income-statement',
    title: t('reports.incomeStatement'),
    description: 'Revenue and expenses / Revenus et dépenses',
    category: 'reports',
    icon: <TrendingUp className="w-4 h-4" />,
    path: '/app/reports/income-statement',
    keywords: ['income statement', 'état des résultats', 'revenue', 'revenus', 'expenses', 'dépenses', 'profit', 'bénéfice', 'loss', 'perte'],
  },
  {
    id: 'report-cash-flow',
    title: t('reports.cashFlowStatement'),
    description: 'Operating, investing and financing / Opérations, investissement et financement',
    category: 'reports',
    icon: <Wallet className="w-4 h-4" />,
    path: '/app/reports/cash-flow',
    keywords: ['cash flow', 'flux de trésorerie', 'operating', 'opérations', 'investing', 'investissement', 'financing', 'financement'],
  },

  // Anomalies
  {
    id: 'anomaly-variance',
    title: 'Variance Analysis',
    description: 'Compare current vs prior periods / Comparer période actuelle vs précédente',
    category: 'anomalies',
    icon: <PieChart className="w-4 h-4" />,
    path: '/app/anomalies?filter=variance',
    keywords: ['variance', 'écart', 'comparison', 'comparaison', 'budget', 'actual', 'réel'],
  },
  {
    id: 'anomaly-trend',
    title: 'Trend Analysis',
    description: 'Identify unusual trends / Identifier tendances inhabituelles',
    category: 'anomalies',
    icon: <TrendingUp className="w-4 h-4" />,
    path: '/app/anomalies?filter=trend',
    keywords: ['trend', 'tendance', 'pattern', 'modèle', 'historical', 'historique'],
  },
  {
    id: 'anomaly-threshold',
    title: t('settings.thresholds.title'),
    description: t('settings.thresholds.description'),
    category: 'anomalies',
    icon: <Zap className="w-4 h-4" />,
    path: '/app/settings?tab=anomalies',
    keywords: ['threshold', 'seuil', 'sensitivity', 'sensibilité', 'configure', 'configurer'],
  },

  // Settings
  {
    id: 'settings-organization',
    title: t('settings.tabs.organization'),
    description: 'Company information / Informations entreprise',
    category: 'settings',
    icon: <Settings className="w-4 h-4" />,
    path: '/app/settings?tab=organization',
    keywords: ['organization', 'organisation', 'company', 'entreprise', 'name', 'nom', 'industry', 'industrie'],
  },
  {
    id: 'settings-team',
    title: t('settings.tabs.team'),
    description: 'Team members and roles / Membres et rôles',
    category: 'settings',
    icon: <Users className="w-4 h-4" />,
    path: '/app/settings?tab=team',
    keywords: ['team', 'équipe', 'members', 'membres', 'invite', 'inviter', 'roles', 'rôles', 'permissions'],
  },
  {
    id: 'settings-subscription',
    title: t('settings.tabs.subscription'),
    description: 'Plan and billing / Forfait et facturation',
    category: 'settings',
    icon: <CreditCard className="w-4 h-4" />,
    path: '/app/settings?tab=subscription',
    keywords: ['subscription', 'abonnement', 'plan', 'forfait', 'billing', 'facturation', 'payment', 'paiement', 'invoice', 'facture'],
  },
  {
    id: 'settings-notifications',
    title: t('settings.tabs.notifications'),
    description: 'Notification preferences / Préférences de notification',
    category: 'settings',
    icon: <Bell className="w-4 h-4" />,
    path: '/app/settings?tab=notifications',
    keywords: ['notifications', 'email', 'courriel', 'alerts', 'alertes', 'push', 'sms'],
  },
  {
    id: 'settings-security',
    title: t('settings.tabs.security'),
    description: 'Password and 2FA / Mot de passe et 2FA',
    category: 'settings',
    icon: <Shield className="w-4 h-4" />,
    path: '/app/settings?tab=security',
    keywords: ['security', 'sécurité', 'password', 'mot de passe', '2fa', 'two-factor', 'authentication', 'authentification'],
  },

  // Help
  {
    id: 'help-anomaly',
    title: 'Anomaly Detection',
    description: 'Intelligent detection of accounting inconsistencies, powered by our AI',
    category: 'help',
    icon: <AlertTriangle className="w-4 h-4" />,
    path: '/app/anomalies',
    keywords: ['anomaly', 'anomalie', 'detection', 'ai', 'inconsistency', 'error'],
  },
  {
    id: 'help-quickbooks',
    title: 'QuickBooks Integration',
    description: 'Connect your QuickBooks account / Connecter votre compte QuickBooks',
    category: 'help',
    icon: <Link2 className="w-4 h-4" />,
    path: '/app/connections',
    keywords: ['quickbooks', 'intuit', 'integration', 'intégration', 'connect', 'connecter'],
  },
  {
    id: 'help-xero',
    title: 'Xero Integration',
    description: 'Connect your Xero account / Connecter votre compte Xero',
    category: 'help',
    icon: <Link2 className="w-4 h-4" />,
    path: '/app/connections',
    keywords: ['xero', 'integration', 'intégration', 'connect', 'connecter'],
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const stored = localStorage.getItem('plainledger-recent-searches');
    return stored ? JSON.parse(stored) : [];
  });

  const searchData = useMemo(() => getSearchData(t), [t]);

  // Filter results based on query
  const results = useMemo(() => {
    if (!query.trim()) return [];
    
    const normalizedQuery = query.toLowerCase().trim();
    const words = normalizedQuery.split(/\s+/);
    
    return searchData
      .map(item => {
        // Calculate relevance score
        let score = 0;
        const searchText = [
          item.title.toLowerCase(),
          item.description.toLowerCase(),
          ...item.keywords.map(k => k.toLowerCase()),
        ].join(' ');
        
        // Exact match in title gets highest score
        if (item.title.toLowerCase().includes(normalizedQuery)) {
          score += 100;
        }
        
        // Match all words
        const matchedWords = words.filter(word => searchText.includes(word));
        score += matchedWords.length * 20;
        
        // Keyword matches
        item.keywords.forEach(keyword => {
          if (keyword.toLowerCase().includes(normalizedQuery)) {
            score += 30;
          }
          words.forEach(word => {
            if (keyword.toLowerCase().includes(word)) {
              score += 10;
            }
          });
        });
        
        return { ...item, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [query, searchData]);

  // Group results by category
  const groupedResults = useMemo(() => {
    const groups: Record<string, typeof results> = {};
    results.forEach(result => {
      if (!groups[result.category]) {
        groups[result.category] = [];
      }
      groups[result.category].push(result);
    });
    return groups;
  }, [results]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const totalResults = results.length;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(totalResults, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + Math.max(totalResults, 1)) % Math.max(totalResults, 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  }, [results, selectedIndex, onClose]);

  // Handle result selection
  const handleSelect = (result: SearchResult) => {
    // Save to recent searches
    const newRecent = [result.title, ...recentSearches.filter(s => s !== result.title)].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem('plainledger-recent-searches', JSON.stringify(newRecent));
    
    // Navigate
    navigate(result.path);
    onClose();
  };

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('plainledger-recent-searches');
  };

  // Get category label
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, { en: string; fr: string }> = {
      navigation: { en: 'Navigation', fr: 'Navigation' },
      reports: { en: 'Reports', fr: 'Rapports' },
      anomalies: { en: 'Anomalies', fr: 'Anomalies' },
      settings: { en: 'Settings', fr: 'Paramètres' },
      help: { en: 'Help', fr: 'Aide' },
    };
    return labels[category]?.[language] || category;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'rgb(var(--color-black) / 0.6)' }}
      />
      
      {/* Modal */}
      <div 
        className="relative w-[calc(100%-2rem)] sm:w-full max-w-xl mx-4 sm:mx-0 rounded-xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'rgb(var(--color-surface))' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div 
          className="flex items-center gap-3 px-4 py-3 border-b"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <Search className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={language === 'en' ? 'Search anything...' : 'Rechercher...'}
            className="flex-1 bg-transparent outline-none text-base"
            style={{ color: 'rgb(var(--color-text))' }}
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="p-1 rounded hover:bg-white/10"
            >
              <X className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
            </button>
          )}
          <div 
            className="flex items-center gap-1 px-2 py-1 rounded text-xs"
            style={{ 
              backgroundColor: 'rgb(var(--color-bg-muted))',
              color: 'rgb(var(--color-text-muted))'
            }}
          >
            <span>esc</span>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {/* No query - show recent searches */}
          {!query.trim() && recentSearches.length > 0 && (
            <div className="p-2">
              <div className="flex items-center justify-between px-3 py-2">
                <span 
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                >
                  <Clock className="w-3 h-3 inline mr-1" />
                  {language === 'en' ? 'Recent' : 'Récents'}
                </span>
                <button 
                  onClick={clearRecentSearches}
                  className="text-xs hover:underline"
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                >
                  {language === 'en' ? 'Clear' : 'Effacer'}
                </button>
              </div>
              {recentSearches.map((search, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(search)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-white/5"
                >
                  <Clock className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                  <span style={{ color: 'rgb(var(--color-text))' }}>{search}</span>
                </button>
              ))}
            </div>
          )}

          {/* No query - show quick links */}
          {!query.trim() && recentSearches.length === 0 && (
            <div className="p-4 text-center">
              <p 
                className="text-sm mb-4"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {language === 'en' 
                  ? 'Start typing to search reports, settings, and more...' 
                  : 'Commencez à taper pour rechercher rapports, paramètres, et plus...'}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {['Dashboard', 'Rapports', 'Anomalies', 'Connexions'].map(term => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="px-3 py-1.5 rounded-full text-sm"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-bg-muted))',
                      color: 'rgb(var(--color-text-muted))'
                    }}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search results */}
          {query.trim() && results.length > 0 && (
            <div className="p-2">
              {Object.entries(groupedResults).map(([category, items]) => (
                <div key={category} className="mb-2">
                  <div 
                    className="px-3 py-1 text-xs font-medium uppercase tracking-wide"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  >
                    {getCategoryLabel(category)}
                  </div>
                  {items.map((result, i) => {
                    const globalIndex = results.findIndex(r => r.id === result.id);
                    const isSelected = globalIndex === selectedIndex;
                    
                    return (
                      <button
                        key={result.id}
                        onClick={() => handleSelect(result)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                        style={{ 
                          backgroundColor: isSelected ? 'rgb(var(--color-bg-muted))' : 'transparent'
                        }}
                      >
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ 
                            backgroundColor: 'rgb(var(--color-bg-subtle))',
                            color: 'rgb(var(--color-text-muted))'
                          }}
                        >
                          {result.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p 
                            className="font-medium truncate"
                            style={{ color: 'rgb(var(--color-text))' }}
                          >
                            {result.title}
                          </p>
                          <p 
                            className="text-xs truncate"
                            style={{ color: 'rgb(var(--color-text-muted))' }}
                          >
                            {result.description}
                          </p>
                        </div>
                        {isSelected && (
                          <ArrowRight 
                            className="w-4 h-4 flex-shrink-0"
                            style={{ color: 'rgb(var(--color-text-muted))' }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* No results */}
          {query.trim() && results.length === 0 && (
            <div className="p-8 text-center">
              <Search 
                className="w-12 h-12 mx-auto mb-3"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              />
              <p style={{ color: 'rgb(var(--color-text))' }}>
                {language === 'en' ? 'No results found' : 'Aucun résultat trouvé'}
              </p>
              <p 
                className="text-sm mt-1"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {language === 'en' 
                  ? `No matches for "${query}"` 
                  : `Aucune correspondance pour "${query}"`}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          className="flex items-center justify-between px-4 py-2 border-t text-xs"
          style={{ 
            borderColor: 'rgb(var(--color-border))',
            color: 'rgb(var(--color-text-muted))'
          }}
        >
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>↓</kbd>
              {language === 'en' ? 'to navigate' : 'naviguer'}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>↵</kbd>
              {language === 'en' ? 'to select' : 'sélectionner'}
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Command className="w-3 h-3" />K {language === 'en' ? 'to open' : 'pour ouvrir'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HOOK FOR GLOBAL KEYBOARD SHORTCUT
// ============================================================================

export function useSearchModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
}
