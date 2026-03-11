'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  RefreshCw,
  Shield,
  FileText,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Plug,
  UserCheck,
  Sun,
  Moon,
  Code2,
} from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { useTheme } from '@/hooks/useTheme';
import { useKeycloak } from '@/hooks/useKeycloak';
import { NotificationsButton } from './NotificationsButton';

// Theme Selector Component
function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  
  const themes = [
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
  ];
  
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-admin-800/50 border border-admin-700/50">
      {themes.map((t) => {
        const Icon = t.icon;
        const isActive = theme === t.value;
        return (
          <button
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              isActive
                ? 'border border-primary-600/40 bg-primary-600/10 text-primary-400 shadow-sm'
                : 'text-admin-400 hover:text-primary-400 hover:bg-primary-600/20'
            }`}
            title={t.label}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Organizations', href: '/organizations', icon: Building2 },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Onboarding', href: '/onboarding', icon: UserCheck },
  { name: 'Integrations', href: '/integrations', icon: Plug },
  { name: 'Billing', href: '/billing', icon: CreditCard },
  { name: 'Sync Jobs', href: '/sync-jobs', icon: RefreshCw },
  { name: 'Subscription Plans', href: '/subscription-plans', icon: CreditCard },
  { name: 'Roles & Permissions', href: '/roles-permissions', icon: Shield },
  { name: 'Audit Logs', href: '/audit', icon: FileText },
  { name: 'Admin Users', href: '/admin-users', icon: Shield },
  { name: 'API Docs', href: '/api-docs', icon: Code2 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { admin } = useAdmin();
  const { logout } = useKeycloak();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [userMenuOpen]);

  return (
    <div className="min-h-screen bg-admin-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-admin-800 border-r border-admin-700 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-admin-700">
          <Link href="/" className="flex items-center gap-2.5">
            <img 
              src="/logo-mark.svg" 
              alt="PlainLedger" 
              className="w-8 h-8"
            />
            <span className="text-lg font-extrabold tracking-tight">
              <span className="text-logo-primary">Plain</span>
              <span className="text-emerald-500">Ledger</span>
            </span>
          </Link>
          <button
            className="lg:hidden text-admin-400 hover:text-primary-400 transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'border border-primary-600/40 bg-primary-600/10 text-primary-400'
                    : 'text-admin-400 hover:bg-primary-600/20 hover:text-primary-400'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-admin-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600/20 border border-primary-600/30 rounded-full flex items-center justify-center">
              <span className="text-primary-600 font-medium">
                {admin?.user?.displayName?.charAt(0) || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-theme-heading truncate">
                {admin?.user?.displayName || 'Admin User'}
              </p>
              <p className="text-xs text-admin-400 truncate">
                {admin?.groups?.[0] || 'Platform Admin'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="h-16 bg-admin-800 border-b border-admin-700 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden text-admin-400 hover:text-primary-400 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Search */}
            <div className="hidden md:flex items-center gap-2 bg-admin-800/50 border border-admin-700/50 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-admin-400" />
              <input
                type="text"
                placeholder="Search organizations, users..."
                className="bg-transparent border-none outline-none text-white placeholder-admin-400 w-64"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Selector */}
            <ThemeSelector />
            
            {/* Notifications */}
            <NotificationsButton />

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                className="flex items-center gap-2 text-admin-400 hover:text-primary-400 transition-colors"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="w-8 h-8 bg-primary-600/20 border border-primary-600/30 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {admin?.user?.displayName?.charAt(0) || 'A'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-admin-800 border border-admin-700 rounded-xl shadow-xl py-2 z-50">
                  <div className="px-4 py-3 border-b border-admin-700">
                    <p className="text-sm font-semibold text-white">
                      {admin?.user?.displayName || 'Admin'}
                    </p>
                    <p className="text-xs text-admin-400 truncate">{admin?.user?.email}</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {admin?.groups?.[0] || 'Platform Admin'}
                      </span>
                    </div>
                  </div>
                  <div className="p-2">
                    <button 
                      onClick={logout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all group"
                    >
                      <div className="p-1.5 rounded-md bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <span className="font-medium">Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      </div>
    </div>
  );
}
