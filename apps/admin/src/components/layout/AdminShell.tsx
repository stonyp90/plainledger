'use client';

import { useState } from 'react';
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
  Activity,
  Plug,
  UserCheck,
  Mail,
} from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Organizations', href: '/organizations', icon: Building2 },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Onboarding', href: '/onboarding', icon: UserCheck },
  { name: 'Integrations', href: '/integrations', icon: Plug },
  { name: 'System Health', href: '/health', icon: Activity },
  { name: 'Communications', href: '/communications', icon: Mail },
  { name: 'Billing', href: '/billing', icon: CreditCard },
  { name: 'Sync Jobs', href: '/sync-jobs', icon: RefreshCw },
  { name: 'Audit Logs', href: '/audit', icon: FileText },
  { name: 'Admin Users', href: '/admin-users', icon: Shield },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { admin } = useAdmin();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

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
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">P</span>
            </div>
            <span className="text-white font-semibold">Admin</span>
          </Link>
          <button
            className="lg:hidden text-admin-400 hover:text-white"
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
                    ? 'bg-blue-600 text-white'
                    : 'text-admin-400 hover:bg-admin-700 hover:text-white'
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
            <div className="w-10 h-10 bg-admin-700 rounded-full flex items-center justify-center">
              <span className="text-white font-medium">
                {admin?.user?.displayName?.charAt(0) || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
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
              className="lg:hidden text-admin-400 hover:text-white"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Search */}
            <div className="hidden md:flex items-center gap-2 bg-admin-700 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-admin-400" />
              <input
                type="text"
                placeholder="Search organizations, users..."
                className="bg-transparent border-none outline-none text-white placeholder-admin-400 w-64"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button className="relative text-admin-400 hover:text-white">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                3
              </span>
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                className="flex items-center gap-2 text-admin-400 hover:text-white"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="w-8 h-8 bg-admin-700 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {admin?.user?.displayName?.charAt(0) || 'A'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-admin-800 border border-admin-700 rounded-lg shadow-lg py-1 z-50">
                  <div className="px-4 py-2 border-b border-admin-700">
                    <p className="text-sm font-medium text-white">
                      {admin?.user?.displayName}
                    </p>
                    <p className="text-xs text-admin-400">{admin?.user?.email}</p>
                  </div>
                  <button className="w-full flex items-center gap-2 px-4 py-2 text-admin-400 hover:bg-admin-700 hover:text-white">
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
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
