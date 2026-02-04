import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/keycloak';
import { useI18n, LanguageToggle } from '../../lib/i18n';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import NotificationPanel from '../../components/NotificationPanel';
import {
  LayoutDashboard,
  Users,
  Building2,
  Bell,
  MessageSquare,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  Activity,
  Database,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

// Admin navigation items
const adminNavItems = [
  { 
    name: { en: 'Dashboard', fr: 'Tableau de bord' }, 
    href: '/admin', 
    icon: LayoutDashboard 
  },
  { 
    name: { en: 'Users', fr: 'Utilisateurs' }, 
    href: '/admin/users', 
    icon: Users 
  },
  { 
    name: { en: 'Organizations', fr: 'Organisations' }, 
    href: '/admin/organizations', 
    icon: Building2 
  },
  { 
    name: { en: 'Notifications', fr: 'Notifications' }, 
    href: '/admin/notifications', 
    icon: Bell 
  },
  { 
    name: { en: 'Live Chat', fr: 'Chat en direct' }, 
    href: '/admin/chat', 
    icon: MessageSquare,
    badge: true,
  },
  { 
    name: { en: 'Audit Logs', fr: 'Journaux d\'audit' }, 
    href: '/admin/audit', 
    icon: ClipboardList 
  },
  { 
    name: { en: 'Connections', fr: 'Connexions' }, 
    href: '/admin/connections', 
    icon: Database 
  },
  { 
    name: { en: 'System Health', fr: 'Santé système' }, 
    href: '/admin/health', 
    icon: Activity 
  },
];

// Custom Theme Selector for Admin
function AdminThemeSelector() {
  const { theme, setTheme } = useTheme();
  const { language } = useI18n();
  
  const themes = [
    { value: 'light', icon: Sun, label: { en: 'Light', fr: 'Clair' } },
    { value: 'dark', icon: Moon, label: { en: 'Dark', fr: 'Sombre' } },
    { value: 'system', icon: Monitor, label: { en: 'System', fr: 'Système' } },
  ] as const;
  
  return (
    <div 
      className="flex items-center gap-1 p-1 rounded-lg border"
      style={{ 
        backgroundColor: 'rgb(var(--color-bg-muted))',
        borderColor: 'rgb(var(--color-border-subtle))',
      }}
    >
      {themes.map((t) => {
        const Icon = t.icon;
        const isActive = theme === t.value;
        return (
          <button
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              isActive ? 'shadow-sm' : 'opacity-60 hover:opacity-100'
            }`}
            style={{
              backgroundColor: isActive ? 'rgb(var(--color-surface))' : 'transparent',
              color: isActive ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-secondary))',
              border: isActive ? '1px solid rgb(var(--color-border))' : '1px solid transparent',
            }}
            title={t.label[language as 'en' | 'fr']}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.label[language as 'en' | 'fr']}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { language } = useI18n();
  const { resolvedTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [onlineCustomers, setOnlineCustomers] = useState(0);
  const [unreadChats, setUnreadChats] = useState(0);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // TODO: Fetch online customers and unread chat count from API
  useEffect(() => {
    // Simulated - replace with actual API call
    const fetchChatStats = async () => {
      try {
        // const response = await fetch('/api/admin/chat/stats');
        // const data = await response.json();
        // setOnlineCustomers(data.onlineCustomers);
        // setUnreadChats(data.waitingSessions);
        setOnlineCustomers(3);
        setUnreadChats(2);
      } catch (error) {
        console.error('Failed to fetch chat stats:', error);
      }
    };
    
    fetchChatStats();
    const interval = setInterval(fetchChatStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="h-screen w-full flex flex-col lg:flex-row overflow-hidden" style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
      {/* Mobile Header */}
      <header 
        className="lg:hidden sticky top-0 z-50 flex items-center justify-between h-14 px-4 border-b"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          borderColor: 'rgb(var(--color-border))'
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
            <span className="font-semibold text-sm" style={{ color: 'rgb(var(--color-text))' }}>
              Admin
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationPanel />
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside 
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col transform transition-transform duration-300 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: 'rgb(var(--color-surface))' }}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6" style={{ color: 'rgb(var(--color-primary-500))' }} />
            <span className="font-bold" style={{ color: 'rgb(var(--color-text))' }}>
              Admin Panel
            </span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)}>
            <X className="w-5 h-5" style={{ color: 'rgb(var(--color-text-secondary))' }} />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {adminNavItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive(item.href) ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                }`}
                style={{
                  backgroundColor: isActive(item.href) ? 'rgb(var(--color-primary-500) / 0.1)' : 'transparent',
                  color: isActive(item.href) ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text))',
                }}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1">{item.name[language as 'en' | 'fr']}</span>
                {item.badge && unreadChats > 0 && (
                  <span 
                    className="px-1.5 py-0.5 text-xs font-medium rounded-full"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-error))',
                      color: 'white',
                    }}
                  >
                    {unreadChats}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </nav>

        {/* Mobile User Section */}
        <div className="p-4 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <span className="font-semibold text-sm" style={{ color: 'rgb(var(--color-primary-600))' }}>
                {user?.firstName?.[0] || user?.name?.[0] || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>
                {user?.name || user?.firstName || 'Admin'}
              </p>
              <p className="text-xs truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/app')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 mb-2 text-sm rounded-lg transition-colors"
            style={{ 
              backgroundColor: 'rgb(var(--color-bg-muted))',
              color: 'rgb(var(--color-text))',
            }}
          >
            <ChevronLeft className="w-4 h-4" />
            {language === 'en' ? 'Back to App' : 'Retour à l\'app'}
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors"
            style={{ 
              backgroundColor: 'rgb(var(--color-error) / 0.1)',
              color: 'rgb(var(--color-error))',
            }}
          >
            <LogOut className="w-4 h-4" />
            {language === 'en' ? 'Logout' : 'Déconnexion'}
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
          className="h-16 flex items-center justify-between px-4 border-b relative"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <div className={`flex items-center gap-2 ${isSidebarCollapsed ? 'justify-center w-full' : ''}`}>
            <div 
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ 
                background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-700)) 100%)',
              }}
            >
              <Shield className="w-5 h-5 text-white" />
            </div>
            {!isSidebarCollapsed && (
              <span className="font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                Admin
              </span>
            )}
          </div>
          
          {/* Collapse Toggle */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center z-10 border-2 transition-all hover:scale-110"
            style={{
              backgroundColor: 'rgb(var(--color-surface))',
              borderColor: 'rgb(var(--color-border))',
            }}
          >
            <ChevronLeft 
              className={`w-3.5 h-3.5 transition-transform ${isSidebarCollapsed ? 'rotate-180' : ''}`}
              style={{ color: 'rgb(var(--color-text-muted))' }}
            />
          </button>
        </div>

        {/* Online Customers Indicator */}
        {!isSidebarCollapsed && onlineCustomers > 0 && (
          <div 
            className="mx-4 mt-4 p-3 rounded-lg"
            style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}
          >
            <div className="flex items-center gap-2">
              <span 
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: 'rgb(var(--color-success))' }}
              />
              <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-success))' }}>
                {onlineCustomers} {language === 'en' ? 'customers online' : 'clients en ligne'}
              </span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto ${isSidebarCollapsed ? 'p-2' : 'p-4'}`}>
          <div className="space-y-1">
            {adminNavItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isSidebarCollapsed ? 'justify-center' : ''
                }`}
                style={{
                  backgroundColor: isActive(item.href) ? 'rgb(var(--color-primary-500) / 0.1)' : 'transparent',
                  color: isActive(item.href) ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text))',
                }}
                title={isSidebarCollapsed ? item.name[language as 'en' | 'fr'] : undefined}
              >
                <div className="relative">
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {item.badge && unreadChats > 0 && isSidebarCollapsed && (
                    <span 
                      className="absolute -top-1 -right-1 w-4 h-4 text-[10px] font-bold rounded-full flex items-center justify-center"
                      style={{ 
                        backgroundColor: 'rgb(var(--color-error))',
                        color: 'white',
                      }}
                    >
                      {unreadChats}
                    </span>
                  )}
                </div>
                {!isSidebarCollapsed && (
                  <>
                    <span className="flex-1">{item.name[language as 'en' | 'fr']}</span>
                    {item.badge && unreadChats > 0 && (
                      <span 
                        className="px-1.5 py-0.5 text-xs font-medium rounded-full"
                        style={{ 
                          backgroundColor: 'rgb(var(--color-error))',
                          color: 'white',
                        }}
                      >
                        {unreadChats}
                      </span>
                    )}
                  </>
                )}
              </Link>
            ))}
          </div>
        </nav>

        {/* User Section */}
        {!isSidebarCollapsed && (
          <div className="p-4 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <div className="flex items-center gap-3 mb-3">
              <div 
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
              >
                <span className="font-semibold text-sm" style={{ color: 'rgb(var(--color-primary-600))' }}>
                  {user?.firstName?.[0] || user?.name?.[0] || 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>
                  {user?.name || 'Admin'}
                </p>
                <p className="text-xs truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  Administrator
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/app')}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 mb-2 text-sm rounded-lg transition-colors"
              style={{ 
                backgroundColor: 'rgb(var(--color-bg-muted))',
                color: 'rgb(var(--color-text))',
              }}
            >
              <ChevronLeft className="w-4 h-4" />
              {language === 'en' ? 'Back to App' : 'Retour'}
            </button>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors"
              style={{ 
                backgroundColor: 'rgb(var(--color-error) / 0.1)',
                color: 'rgb(var(--color-error))',
              }}
            >
              <LogOut className="w-4 h-4" />
              {language === 'en' ? 'Logout' : 'Déconnexion'}
            </button>
          </div>
        )}
        
        {/* Collapsed User */}
        {isSidebarCollapsed && (
          <div className="p-2 border-t flex flex-col gap-2" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <button
              onClick={() => navigate('/app')}
              className="w-full p-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
              title={language === 'en' ? 'Back to App' : 'Retour à l\'app'}
            >
              <ChevronLeft className="w-5 h-5 mx-auto" style={{ color: 'rgb(var(--color-text-secondary))' }} />
            </button>
            <button
              onClick={logout}
              className="w-full p-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'rgb(var(--color-error) / 0.1)' }}
              title={language === 'en' ? 'Logout' : 'Déconnexion'}
            >
              <LogOut className="w-5 h-5 mx-auto" style={{ color: 'rgb(var(--color-error))' }} />
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Desktop Header */}
        <header 
          className="hidden lg:flex h-16 items-center justify-between px-6 border-b"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            borderColor: 'rgb(var(--color-border))'
          }}
        >
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {adminNavItems.find((n) => isActive(n.href))?.name[language as 'en' | 'fr'] || 'Admin'}
            </h1>
            <span 
              className="px-2 py-0.5 text-xs font-medium rounded"
              style={{ 
                backgroundColor: 'rgb(var(--color-warning) / 0.1)',
                color: 'rgb(var(--color-warning))',
              }}
            >
              {language === 'en' ? 'Admin Mode' : 'Mode Admin'}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <AdminThemeSelector />
            <NotificationPanel />
            <LanguageToggle />
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
