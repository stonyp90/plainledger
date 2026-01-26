import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/keycloak';
import { useTenant } from '../contexts/TenantContext';
import { useI18n, LanguageToggle } from '../lib/i18n';
import NotificationPanel from './NotificationPanel';
import ThemeToggle from './ThemeToggle';
import OrganizationSwitcher from './OrganizationSwitcher';
import SearchModal, { useSearchModal } from './SearchModal';
import { crispUtils } from './CrispChat';
import { HelpCenter } from './HelpCenter';
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
  Crown,
  Shield,
  AlertCircle,
  Command,
  Menu,
  X,
  ChevronRight,
  BarChart3,
  Presentation,
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

// Help Center Button with modal
function HelpCenterButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useI18n();
  
  return (
    <>
      <button 
        className="icon-btn" 
        onClick={() => setIsOpen(true)}
        title={t('nav.help')}
      >
        <HelpCircle className="w-5 h-5" />
      </button>
      <HelpCenter isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { currentTenant, isOwner, isAdmin, hasPermission, isInternalStaff } = useTenant();
  const { t, language, formatDate } = useI18n();
  const searchModal = useSearchModal();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const navigation = [
    { name: t('nav.dashboard'), href: '/app', icon: LayoutDashboard, permission: 'view:dashboard' as const },
    { name: t('nav.visualizations') || 'Visualisations', href: '/app/visualizations', icon: BarChart3, permission: 'view:reports' as const },
    { name: t('nav.anomalies'), href: '/app/anomalies', icon: AlertTriangle, permission: 'view:reports' as const },
    { name: t('nav.connections'), href: '/app/connections', icon: Link2, permission: 'view:connections' as const },
    { name: t('nav.reports'), href: '/app/reports', icon: FileText, permission: 'view:reports' as const },
    { name: t('nav.boardMeeting') || (language === 'en' ? 'Board Meeting' : 'Réunion CA'), href: '/app/board-meeting', icon: Presentation, permission: 'view:reports' as const },
    { name: t('nav.settings'), href: '/app/settings', icon: Settings, permission: 'view:settings' as const },
  ];

  const isActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app';
    return location.pathname.startsWith(path);
  };

  const filteredNavigation = navigation.filter(item => hasPermission(item.permission));

  const getRoleLabel = () => {
    if (isOwner) return t('settings.team.roles.owner');
    if (isAdmin) return t('settings.team.roles.admin');
    return currentTenant?.role || '';
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}>
      {/* Mobile Header */}
      <header 
        className="lg:hidden sticky top-0 z-50 flex items-center justify-between h-16 px-4 border-b"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          borderColor: 'rgb(var(--color-border))'
        }}
      >
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="icon-btn"
          aria-label={language === 'en' ? 'Open menu' : 'Ouvrir le menu'}
        >
          <Menu className="w-6 h-6" />
        </button>

        <Link to="/app/dashboard" className="flex items-center gap-2">
          <div 
            className="w-7 h-7 rounded flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--color-primary-600))', color: 'white' }}
          >
            <span className="text-sm font-bold">PL</span>
          </div>
          <span className="font-semibold text-sm tracking-tight" style={{ color: 'rgb(var(--color-text))' }}>PlainLedger</span>
        </Link>

        <div className="flex items-center gap-1">
          <NotificationPanel />
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-50 bg-black/50 animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside 
        className={`
          lg:hidden fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col
          transform transition-transform duration-300 ease-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ backgroundColor: 'rgb(var(--color-surface))' }}
      >
        {/* Mobile Sidebar Header */}
        <div 
          className="h-16 flex items-center justify-between px-4 border-b flex-shrink-0"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <Link to="/app/dashboard" className="flex items-center gap-2">
            <div 
              className="w-7 h-7 rounded flex items-center justify-center"
              style={{ backgroundColor: 'rgb(var(--color-primary-600))', color: 'white' }}
            >
              <span className="text-sm font-bold">PL</span>
            </div>
            <span className="font-semibold text-sm tracking-tight" style={{ color: 'rgb(var(--color-text))' }}>PlainLedger</span>
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
        <div className="p-4 border-b flex-shrink-0" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <OrganizationSwitcher />
        </div>

        {/* Mobile Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {filteredNavigation.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
            >
              <item.icon className="w-5 h-5" />
              <span className="flex-1">{item.name}</span>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </Link>
          ))}
        </nav>

        {/* Mobile User Menu */}
        <div className="p-4 border-t flex-shrink-0" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
            >
              <span className="font-semibold text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>
                {user?.name || (language === 'en' ? 'User' : 'Utilisateur')}
              </p>
              <p className="text-xs truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {user?.email}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mb-4">
            <LanguageToggle />
            <ThemeToggle />
          </div>

          <button
            onClick={logout}
            className="w-full btn-ghost justify-start text-error"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside 
        className="hidden lg:flex w-64 flex-col border-r flex-shrink-0"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          borderColor: 'rgb(var(--color-border))'
        }}
      >
        {/* Logo */}
        <div 
          className="h-16 flex items-center justify-between px-6 border-b flex-shrink-0"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <Link to="/app/dashboard" className="flex items-center gap-2.5">
            <div 
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{ backgroundColor: 'rgb(var(--color-primary-600))', color: 'white' }}
            >
              <span className="text-sm font-bold">PL</span>
            </div>
            <span className="font-semibold tracking-tight" style={{ color: 'rgb(var(--color-text))' }}>PlainLedger</span>
          </Link>
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
        <div className="p-4 border-b flex-shrink-0" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <OrganizationSwitcher />
          
          {currentTenant && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span 
                className="badge text-[10px]"
                style={{ 
                  backgroundColor: currentTenant.plan === 'enterprise' 
                    ? 'rgb(var(--color-warning) / 0.2)'
                    : currentTenant.plan === 'professional'
                    ? 'rgb(var(--color-success) / 0.2)'
                    : undefined,
                  color: currentTenant.plan === 'enterprise'
                    ? 'rgb(var(--color-warning))'
                    : currentTenant.plan === 'professional'
                    ? 'rgb(var(--color-success))'
                    : undefined
                }}
              >
                {currentTenant.plan}
              </span>
              
              <span className="badge text-[10px] flex items-center gap-1">
                {isOwner ? <Crown className="w-3 h-3" /> : isAdmin ? <Shield className="w-3 h-3" /> : null}
                {getRoleLabel()}
              </span>
              
              {currentTenant.status === 'trial' && currentTenant.trialEndsAt && (
                <span className="badge badge-warning text-[10px] flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {t('organization.trial')} {Math.ceil((new Date(currentTenant.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}{language === 'en' ? 'd' : 'j'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredNavigation.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* User Menu */}
        <div className="p-4 border-t flex-shrink-0" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <div className="flex items-center gap-3 mb-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
            >
              <span className="font-semibold" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>
                {user?.name || (language === 'en' ? 'User' : 'Utilisateur')}
              </p>
              <p className="text-xs truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors hover:bg-[rgb(var(--color-error)/0.1)]"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            <LogOut className="w-4 h-4" />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
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
          </div>
          
          <div className="flex items-center gap-2">
            {/* Search */}
            <button 
              onClick={searchModal.open}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
              style={{ 
                backgroundColor: 'rgb(var(--color-bg-muted))',
                color: 'rgb(var(--color-text-muted))'
              }}
              title={t('common.search')}
            >
              <Search className="w-4 h-4" />
              <span className="text-sm">{t('common.search')}</span>
              <kbd className="hidden xl:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}>
                <Command className="w-3 h-3" />K
              </kbd>
            </button>
            
            {/* Help Center */}
            <HelpCenterButton />

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

        {/* Page Content */}
        <div className="flex-1 p-4 sm:p-6 overflow-auto">
          {children}
        </div>
      </main>

      {/* Search Modal */}
      <SearchModal isOpen={searchModal.isOpen} onClose={searchModal.close} />
    </div>
  );
}
