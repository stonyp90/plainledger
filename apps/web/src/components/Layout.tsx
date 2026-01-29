import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/keycloak';
import { useTenant } from '../contexts/TenantContext';
import { useI18n, LanguageToggle } from '../lib/i18n';
import { useTheme } from '../contexts/ThemeContext';
import NotificationPanel from './NotificationPanel';
import ThemeToggle from './ThemeToggle';
import OrganizationSwitcher from './OrganizationSwitcher';
import SearchModal, { useSearchModal } from './SearchModal';
import { crispUtils } from './CrispChat';
import { PremiumBadge, type PremiumFeature } from './PremiumFeatureGate';
import config from '../lib/config';
import {
  LayoutDashboard,
  FileText,
  Settings,
  LogOut,
  Link2,
  HelpCircle,
  Search,
  MessageCircle,
  AlertTriangle,
  Command,
  Menu,
  X,
  BarChart3,
  Presentation,
  Target,
  ChevronLeft,
  ChevronRight,
  Building2,
  BookOpen,
  TrendingUp,
  Receipt,
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

// Help/Knowledge Base Button - navigates directly to Knowledge Base
function HelpButton() {
  const navigate = useNavigate();
  const { language } = useI18n();
  
  return (
    <button 
      className="icon-btn" 
      onClick={() => navigate('/help/knowledge-base')}
      title={language === 'en' ? 'Knowledge Base' : 'Base de connaissances'}
    >
      <BookOpen className="w-5 h-5" />
    </button>
  );
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { currentTenant, hasPermission, isInternalStaff } = useTenant();
  const { t, language, setLanguage, formatDate } = useI18n();
  const { toggleTheme } = useTheme();
  const searchModal = useSearchModal();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    // Check localStorage for saved preference
    try {
      return localStorage.getItem('pl-sidebar-collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const navigation: {
    name: string;
    href: string;
    icon: typeof LayoutDashboard;
    permission: 'view:dashboard' | 'view:reports' | 'view:connections' | 'view:settings';
    premiumFeature?: PremiumFeature;
  }[] = [
    { name: t('nav.dashboard'), href: '/app', icon: LayoutDashboard, permission: 'view:dashboard' },
    { name: t('nav.visualizations') || 'Visualisations', href: '/app/visualizations', icon: BarChart3, permission: 'view:reports', premiumFeature: 'advancedAnalytics' },
    { name: language === 'en' ? 'Market Analysis' : 'Analyse de marché', href: '/app/market-analysis', icon: TrendingUp, permission: 'view:reports', premiumFeature: 'marketAnalysis' },
    { name: language === 'en' ? 'Tax Credits' : 'Crédits d\'impôt', href: '/app/tax-credits', icon: Receipt, permission: 'view:reports', premiumFeature: 'taxCredits' },
    { name: language === 'en' ? 'Strategic Planning' : 'Planification stratégique', href: '/app/strategic-planning', icon: Target, permission: 'view:reports', premiumFeature: 'strategicPlanning' },
    { name: t('nav.anomalies'), href: '/app/anomalies', icon: AlertTriangle, permission: 'view:reports' },
    { name: t('nav.connections'), href: '/app/connections', icon: Link2, permission: 'view:connections' },
    { name: t('nav.reports'), href: '/app/reports', icon: FileText, permission: 'view:reports' },
    { name: t('nav.boardMeeting') || (language === 'en' ? 'Board Meeting' : 'Réunion CA'), href: '/app/board-meeting', icon: Presentation, permission: 'view:reports', premiumFeature: 'boardMeeting' },
    { name: t('nav.settings'), href: '/app/settings', icon: Settings, permission: 'view:settings' },
  ];

  const isActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app';
    return location.pathname.startsWith(path);
  };

  const filteredNavigation = navigation.filter(item => hasPermission(item.permission));

  return (
    <div className="h-screen w-full flex flex-col lg:flex-row overflow-hidden" style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
      {/* Mobile Header - Optimized for touch */}
      <header 
        className="lg:hidden sticky top-0 z-50 flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4 border-b safe-area-top"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          borderColor: 'rgb(var(--color-border))'
        }}
      >
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="icon-btn flex-shrink-0"
          aria-label={language === 'en' ? 'Open menu' : 'Ouvrir le menu'}
        >
          <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <Link to="/app/dashboard" className="flex items-center gap-1.5 sm:gap-2 min-w-0 group">
            <div 
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
              style={{ 
                background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-700)) 100%)',
                boxShadow: '0 2px 8px rgb(var(--color-primary-500) / 0.3)'
              }}
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="5" width="3" height="22" rx="1" fill="rgba(255,255,255,0.5)"/>
                <rect x="8" y="5" width="20" height="22" rx="2" fill="white"/>
                <line x1="11" y1="10" x2="25" y2="10" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="11" y1="15" x2="25" y2="15" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="11" y1="20" x2="20" y2="20" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M17 21 L20 24 L26 17" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </Link>
          {/* Mobile Industry KPI Badge - Compact */}
          <div 
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
            style={{ 
              background: 'rgb(var(--color-primary-600))',
              animation: 'pulse-subtle 3s ease-in-out infinite',
            }}
          >
            <Building2 
              className="w-3 h-3" 
              style={{ color: 'white' }} 
            />
            <span 
              className="text-[10px] font-semibold hidden sm:inline"
              style={{ color: 'white' }}
            >
              {language === 'en' ? 'Real Estate KPIs' : 'KPIs Immobilier'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
          <ThemeToggle />
          <NotificationPanel />
        </div>
      </header>

      {/* Mobile Menu Overlay - Always rendered but visibility controlled via opacity for smooth transitions */}
      <div 
        className={`
          lg:hidden fixed inset-0 z-40 transition-all duration-300 ease-out
          ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Mobile Sidebar - Full height, optimized for touch */}
      <aside 
        className={`
          lg:hidden fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[320px] flex flex-col
          transform transition-transform duration-300 ease-out safe-area-top safe-area-bottom
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          boxShadow: isMobileMenuOpen ? '4px 0 24px rgba(0, 0, 0, 0.15)' : 'none'
        }}
      >
        {/* Mobile Sidebar Header */}
        <div 
          className="h-14 sm:h-16 flex items-center justify-between px-3 sm:px-4 border-b flex-shrink-0"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <Link to="/app/dashboard" className="flex items-center gap-2 group" onClick={() => setIsMobileMenuOpen(false)}>
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
              style={{ 
                background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-700)) 100%)',
                boxShadow: '0 2px 8px rgb(var(--color-primary-500) / 0.3)'
              }}
            >
              <svg className="w-6 h-6" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="5" width="3" height="22" rx="1" fill="rgba(255,255,255,0.5)"/>
                <rect x="8" y="5" width="20" height="22" rx="2" fill="white"/>
                <line x1="11" y1="10" x2="25" y2="10" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="11" y1="15" x2="25" y2="15" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="11" y1="20" x2="20" y2="20" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M17 21 L20 24 L26 17" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span 
              className="font-semibold text-sm tracking-tight"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              Plain<span style={{ color: 'rgb(var(--color-primary-500))' }}>Ledger</span>
            </span>
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="icon-btn"
            aria-label={language === 'en' ? 'Close menu' : 'Fermer le menu'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Organization Selector */}
        <div className="p-3 sm:p-4 border-b flex-shrink-0" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <OrganizationSwitcher />
        </div>

        {/* Mobile Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1" style={{ WebkitOverflowScrolling: 'touch' }}>
          {filteredNavigation.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1 truncate">{item.name}</span>
              {item.premiumFeature && <PremiumBadge feature={item.premiumFeature} isActive={isActive(item.href)} />}
              <ChevronRight className="w-4 h-4 opacity-50 flex-shrink-0" />
            </Link>
          ))}
        </nav>

        {/* Mobile User Menu - Fixed at bottom */}
        <div className="p-3 sm:p-4 border-t flex-shrink-0" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <div className="flex items-center gap-3 mb-3">
            {/* User Avatar */}
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden border-2 transition-all"
              style={{ 
                backgroundColor: user?.picture ? 'transparent' : 'rgb(var(--color-bg-muted))',
                borderColor: 'rgb(var(--color-border))'
              }}
            >
              {user?.picture ? (
                <img 
                  src={user.picture} 
                  alt={user?.name || (language === 'en' ? 'User' : 'Utilisateur')}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const fallback = document.createElement('span');
                      fallback.className = 'font-semibold text-sm';
                      fallback.style.color = 'rgb(var(--color-text-secondary))';
                      const initials = (user?.firstName?.[0] || '') + (user?.lastName?.[0] || '');
                      fallback.textContent = initials || user?.name?.[0] || 'U';
                      parent.appendChild(fallback);
                    }
                  }}
                />
              ) : (
                <span className="font-semibold text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {(user?.firstName?.[0] || '') + (user?.lastName?.[0] || '') || 'U'}
                </span>
              )}
            </div>
            
            {/* User Details */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>
                {user?.name || user?.firstName || (language === 'en' ? 'User' : 'Utilisateur')}
              </p>
              <p className="text-xs truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {user?.email || ''}
              </p>
            </div>
          </div>
          
          {/* Logout Button - Full width, touch-friendly */}
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm rounded-lg transition-all active:scale-98"
            style={{ 
              color: 'rgb(var(--color-error))',
              backgroundColor: 'rgb(var(--color-error) / 0.08)',
              minHeight: '48px',
            }}
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">{t('nav.logout')}</span>
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside 
        className={`hidden lg:flex flex-col border-r flex-shrink-0 transition-all duration-300 h-full ${
          isSidebarCollapsed ? 'w-16' : 'w-64'
        }`}
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          borderColor: 'rgb(var(--color-border))'
        }}
      >
        {/* Logo */}
        <div 
          className="h-16 flex items-center justify-between px-4 sm:px-6 border-b flex-shrink-0 relative"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <Link 
            to="/app/dashboard" 
            className={`flex items-center gap-2.5 group transition-all ${
              isSidebarCollapsed ? 'justify-center w-full' : ''
            }`}
          >
            <div 
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-all group-hover:scale-105 group-hover:shadow-lg flex-shrink-0"
              style={{ 
                background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-700)) 100%)',
                boxShadow: '0 2px 8px rgb(var(--color-primary-500) / 0.25)'
              }}
            >
              <svg className="w-6 h-6" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Ledger book spine */}
                <rect x="4" y="5" width="3" height="22" rx="1" fill="rgba(255,255,255,0.5)"/>
                {/* Ledger pages */}
                <rect x="8" y="5" width="20" height="22" rx="2" fill="white"/>
                {/* Ledger lines */}
                <line x1="11" y1="10" x2="25" y2="10" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="11" y1="15" x2="25" y2="15" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="11" y1="20" x2="20" y2="20" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
                {/* Checkmark */}
                <path d="M17 21 L20 24 L26 17" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            {!isSidebarCollapsed && (
              <span 
                className="font-semibold text-base tracking-tight"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                Plain<span style={{ color: 'rgb(var(--color-primary-500))' }}>Ledger</span>
              </span>
            )}
          </Link>
          
          {/* Collapse Toggle */}
          <button
            onClick={() => {
              const newState = !isSidebarCollapsed;
              setIsSidebarCollapsed(newState);
              try {
                localStorage.setItem('pl-sidebar-collapsed', String(newState));
              } catch {}
            }}
            className="group absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center z-10"
            style={{
              backgroundColor: 'rgb(var(--color-surface))',
              border: '2px solid rgb(var(--color-border))',
              boxShadow: '0 2px 8px rgb(0 0 0 / 0.08)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-500))';
              e.currentTarget.style.borderColor = 'rgb(var(--color-primary-500))';
              e.currentTarget.style.boxShadow = '0 4px 12px rgb(var(--color-primary-500) / 0.3)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface))';
              e.currentTarget.style.borderColor = 'rgb(var(--color-border))';
              e.currentTarget.style.boxShadow = '0 2px 8px rgb(0 0 0 / 0.08)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            }}
            title={isSidebarCollapsed ? (language === 'en' ? 'Expand sidebar' : 'Agrandir la barre latérale') : (language === 'en' ? 'Collapse sidebar' : 'Réduire la barre latérale')}
          >
            <ChevronLeft 
              className="w-4 h-4 transition-all duration-300 ease-out group-hover:text-white"
              style={{ 
                color: 'rgb(var(--color-text-muted))',
                transform: isSidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
              }} 
            />
          </button>
          {isInternalStaff && (
            <span 
              className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide"
              style={{ 
                backgroundColor: 'rgb(var(--color-error) / 0.15)',
                color: 'rgb(var(--color-error))'
              }}
              title={language === 'en' ? 'Internal mode - Advanced features visible' : 'Mode interne - Fonctionnalités avancées visibles'}
            >
              Staff
            </span>
          )}
        </div>

        {/* Organization Selector */}
        {!isSidebarCollapsed && (
          <div className="p-4 border-b flex-shrink-0" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <OrganizationSwitcher />
          </div>
        )}

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto transition-all min-h-0 ${
          isSidebarCollapsed ? 'p-2' : 'p-4'
        }`}>
          <div className="space-y-1">
            {filteredNavigation.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`nav-item ${isActive(item.href) ? 'active' : ''} ${
                  isSidebarCollapsed ? 'justify-center px-2 w-full' : ''
                }`}
                title={isSidebarCollapsed ? item.name : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!isSidebarCollapsed && (
                  <>
                    <span className="flex-1">{item.name}</span>
                    {item.premiumFeature && <PremiumBadge feature={item.premiumFeature} isActive={isActive(item.href)} />}
                  </>
                )}
              </Link>
            ))}
          </div>
        </nav>

        {/* User Menu - Bottom Left */}
        {!isSidebarCollapsed && (
          <div 
            className="p-3 sm:p-4 border-t flex-shrink-0 mt-auto"
            style={{ 
              borderColor: 'rgb(var(--color-border))',
              backgroundColor: 'rgb(var(--color-surface))',
            }}
          >
            {/* User Info - Clickable row */}
            <Link
              to="/app/settings?tab=profile"
              className="flex items-center gap-3 mb-2 min-w-0 p-2 -mx-2 rounded-lg transition-all cursor-pointer"
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgb(var(--color-bg-muted))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {/* User Avatar */}
              <div 
                className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden border-2 transition-all"
                style={{ 
                  backgroundColor: user?.picture ? 'transparent' : 'rgb(var(--color-bg-muted))',
                  borderColor: 'rgb(var(--color-border))'
                }}
              >
                {user?.picture ? (
                  <img 
                    src={user.picture} 
                    alt={user?.name || (language === 'en' ? 'User' : 'Utilisateur')}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        const fallback = document.createElement('span');
                        fallback.className = 'font-semibold text-sm';
                        fallback.style.color = 'rgb(var(--color-text-secondary))';
                        const initials = (user?.firstName?.[0] || '') + (user?.lastName?.[0] || '');
                        fallback.textContent = initials || user?.name?.[0] || 'U';
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                ) : (
                  <span className="font-semibold text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {((user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')) || (user?.name?.[0] || 'U')}
                  </span>
                )}
              </div>
              
              {/* User Details */}
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-sm font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>
                  {user?.name || user?.firstName || (language === 'en' ? 'User' : 'Utilisateur')}
                </p>
                <p className="text-xs truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {user?.email || ''}
                </p>
              </div>
            </Link>
            
            {/* Logout Button */}
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-all active:scale-[0.98]"
              style={{ 
                color: 'rgb(var(--color-error))',
                backgroundColor: 'rgb(var(--color-error) / 0.05)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgb(var(--color-error) / 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgb(var(--color-error) / 0.05)';
              }}
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{t('nav.logout')}</span>
            </button>
          </div>
        )}
        
        {/* Collapsed User Avatar */}
        {isSidebarCollapsed && (
          <div className="p-2 border-t flex-shrink-0" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border-2 mx-auto cursor-pointer transition-all hover:scale-110"
              style={{ 
                backgroundColor: user?.picture ? 'transparent' : 'rgb(var(--color-bg-muted))',
                borderColor: 'rgb(var(--color-border))'
              }}
              title={user?.name || user?.email || ''}
            >
              {user?.picture ? (
                <img 
                  src={user.picture} 
                  alt={user?.name || ''}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-semibold text-xs" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {((user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')) || (user?.name?.[0] || 'U')}
                </span>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main 
        className="flex-1 flex flex-col min-w-0 w-full lg:w-auto h-full overflow-hidden"
        style={{ backgroundColor: 'rgb(var(--color-surface))' }}
      >
        {/* Desktop Header */}
        <header 
          className="hidden lg:flex h-16 items-center justify-between px-6 sticky top-0 z-40 border-b flex-shrink-0"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            borderColor: 'rgb(var(--color-border))'
          }}
        >
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {navigation.find((n) => isActive(n.href))?.name || 'PlainLedger'}
            </h1>
            
            {/* Industry KPI Badge - Real Estate Focus */}
            <div 
              className="flex items-center gap-1.5 px-2 py-1 rounded-md group cursor-default"
              style={{ 
                background: 'rgb(var(--color-primary-600))',
                animation: 'pulse-subtle 3s ease-in-out infinite',
              }}
            >
              <Building2 
                className="w-3.5 h-3.5 transition-transform group-hover:scale-110" 
                style={{ color: 'white' }} 
              />
              <span 
                className="text-xs font-semibold"
                style={{ color: 'white' }}
              >
                {language === 'en' ? 'Real Estate KPIs' : 'KPIs Immobilier'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Search */}
            <button 
              onClick={searchModal.open}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all border hover:shadow-sm"
              style={{ 
                backgroundColor: 'transparent',
                borderColor: 'rgb(var(--color-border))',
                color: 'rgb(var(--color-text-muted))'
              }}
              title={`${t('common.search')} (⌘K)`}
            >
              <Search className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">{t('common.search')}</span>
              <kbd 
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] border"
                style={{ 
                  borderColor: 'rgb(var(--color-border))',
                  color: 'rgb(var(--color-text-muted))'
                }}
              >
                <Command className="w-3 h-3" />K
              </kbd>
            </button>
            
            {/* Help Center */}
            <HelpButton />

            {/* Live Chat */}
            {config.crisp.enabled && (
              <button 
                className="icon-btn relative" 
                onClick={() => crispUtils.open()}
                title={language === 'en' ? 'Live chat' : 'Chat en direct'}
              >
                <MessageCircle className="w-5 h-5" />
                <span 
                  className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full animate-pulse"
                  style={{ backgroundColor: 'rgb(var(--color-success))' }}
                  title={language === 'en' ? 'Support online' : 'Support en ligne'}
                />
              </button>
            )}

            {/* Language Toggle */}
            <LanguageToggle />

            {/* Theme Toggle */}
            <ThemeToggle />
            
            {/* Notifications */}
            <NotificationPanel />
            
            {/* Date */}
            <span 
              className="text-sm hidden xl:block pl-3 ml-2 border-l"
              style={{ 
                color: 'rgb(var(--color-text-muted))',
                borderColor: 'rgb(var(--color-border))'
              }}
            >
              {formatDate(new Date(), {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </span>
          </div>
        </header>

        {/* Page Content - Responsive padding */}
        <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          {children}
        </div>
      </main>

      {/* Search Modal */}
      <SearchModal isOpen={searchModal.isOpen} onClose={searchModal.close} />
    </div>
  );
}
