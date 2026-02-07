import { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import {
  Users,
  Search,
  MoreVertical,
  Mail,
  Shield,
  UserX,
  UserCheck,
  Key,
  Trash2,
  Plus,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  roles: string[];
  status: 'active' | 'disabled' | 'pending';
  lastLoginAt?: string;
  createdAt: string;
}

// Status Badge
function StatusBadge({ status }: { status: User['status'] }) {
  const config = {
    active: { color: 'success', label: 'Active' },
    disabled: { color: 'error', label: 'Disabled' },
    pending: { color: 'warning', label: 'Pending' },
  };
  const { color, label } = config[status];
  
  return (
    <span 
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ 
        backgroundColor: `rgb(var(--color-${color}) / 0.1)`,
        color: `rgb(var(--color-${color}))`,
      }}
    >
      {label}
    </span>
  );
}

// User Actions Dropdown
function UserActions({ 
  user, 
  onDisable, 
  onEnable, 
  onResetPassword 
}: { 
  user: User;
  onDisable: () => void;
  onEnable: () => void;
  onResetPassword: () => void;
}) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg transition-colors"
        style={{ backgroundColor: 'transparent' }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--color-bg-muted))'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <MoreVertical className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div 
            className="absolute right-0 top-full mt-1 w-48 rounded-lg shadow-lg border z-20 py-1"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              borderColor: 'rgb(var(--color-border))',
            }}
          >
            <button
              onClick={() => { onResetPassword(); setIsOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors"
              style={{ color: 'rgb(var(--color-text))', backgroundColor: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--color-bg-muted))'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Key className="w-4 h-4" />
              {isEn ? 'Reset Password' : 'Réinitialiser le mot de passe'}
            </button>
            {user.status === 'active' ? (
              <button
                onClick={() => { onDisable(); setIsOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors"
                style={{ color: 'rgb(var(--color-error))', backgroundColor: 'transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--color-bg-muted))'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <UserX className="w-4 h-4" />
                {isEn ? 'Disable User' : 'Désactiver l\'utilisateur'}
              </button>
            ) : (
              <button
                onClick={() => { onEnable(); setIsOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors"
                style={{ color: 'rgb(var(--color-success))', backgroundColor: 'transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--color-bg-muted))'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <UserCheck className="w-4 h-4" />
                {isEn ? 'Enable User' : 'Activer l\'utilisateur'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminUsers() {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<User['status'] | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // TODO: Replace with actual API call
        setUsers([
          {
            id: '1',
            email: 'john.doe@example.com',
            firstName: 'John',
            lastName: 'Doe',
            organizationName: 'Acme Corp',
            roles: ['admin', 'viewer'],
            status: 'active',
            lastLoginAt: new Date(Date.now() - 3600000).toISOString(),
            createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
          },
          {
            id: '2',
            email: 'jane.smith@example.com',
            firstName: 'Jane',
            lastName: 'Smith',
            organizationName: 'Tech Solutions',
            roles: ['viewer'],
            status: 'active',
            lastLoginAt: new Date(Date.now() - 86400000).toISOString(),
            createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
          },
          {
            id: '3',
            email: 'bob@restaurant.com',
            firstName: 'Bob',
            lastName: 'Wilson',
            organizationName: 'Bob\'s Diner',
            roles: ['admin'],
            status: 'disabled',
            createdAt: new Date(Date.now() - 86400000 * 90).toISOString(),
          },
          {
            id: '4',
            email: 'new.user@example.com',
            firstName: 'New',
            lastName: 'User',
            roles: [],
            status: 'pending',
            createdAt: new Date().toISOString(),
          },
        ]);
        setTotalPages(3);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [currentPage]);

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.organizationName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Actions
  const handleDisableUser = async (userId: string) => {
    // TODO: API call
    setUsers(users.map(u => u.id === userId ? { ...u, status: 'disabled' as const } : u));
  };

  const handleEnableUser = async (userId: string) => {
    // TODO: API call
    setUsers(users.map(u => u.id === userId ? { ...u, status: 'active' as const } : u));
  };

  const handleResetPassword = async (userId: string) => {
    // TODO: API call
    console.log('Reset password for user:', userId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Users' : 'Utilisateurs'}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn ? 'Manage platform users' : 'Gérer les utilisateurs de la plateforme'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border"
            style={{ 
              borderColor: 'rgb(var(--color-border))',
              color: 'rgb(var(--color-text))',
            }}
          >
            <Download className="w-4 h-4" />
            {isEn ? 'Export' : 'Exporter'}
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white"
            style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
          >
            <Plus className="w-4 h-4" />
            {isEn ? 'Invite User' : 'Inviter un utilisateur'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
            style={{ color: 'rgb(var(--color-text-muted))' }} 
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isEn ? 'Search users...' : 'Rechercher des utilisateurs...'}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm"
            style={{ 
              borderColor: 'rgb(var(--color-border))',
              backgroundColor: 'rgb(var(--color-surface))',
              color: 'rgb(var(--color-text))',
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as User['status'] | 'all')}
          className="px-4 py-2.5 rounded-lg border text-sm"
          style={{ 
            borderColor: 'rgb(var(--color-border))',
            backgroundColor: 'rgb(var(--color-surface))',
            color: 'rgb(var(--color-text))',
          }}
        >
          <option value="all">{isEn ? 'All Status' : 'Tous les statuts'}</option>
          <option value="active">{isEn ? 'Active' : 'Actif'}</option>
          <option value="disabled">{isEn ? 'Disabled' : 'Désactivé'}</option>
          <option value="pending">{isEn ? 'Pending' : 'En attente'}</option>
        </select>
      </div>

      {/* Users Table */}
      <div 
        className="rounded-xl border overflow-hidden"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          borderColor: 'rgb(var(--color-border))',
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div 
              className="hidden md:grid grid-cols-6 gap-4 px-4 py-3 text-sm font-medium border-b"
              style={{ 
                backgroundColor: 'rgb(var(--color-bg-muted))',
                borderColor: 'rgb(var(--color-border))',
                color: 'rgb(var(--color-text-secondary))',
              }}
            >
              <div className="col-span-2">{isEn ? 'User' : 'Utilisateur'}</div>
              <div>{isEn ? 'Organization' : 'Organisation'}</div>
              <div>{isEn ? 'Status' : 'Statut'}</div>
              <div>{isEn ? 'Last Login' : 'Dernière connexion'}</div>
              <div className="text-right">{isEn ? 'Actions' : 'Actions'}</div>
            </div>

            {/* Table Body */}
            <div className="divide-y" style={{ borderColor: 'rgb(var(--color-border))' }}>
              {filteredUsers.map((user) => (
                <div 
                  key={user.id}
                  className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 items-center transition-colors"
                  style={{ backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--color-bg-subtle))'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {/* User */}
                  <div className="md:col-span-2 flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                    >
                      <span className="font-semibold text-sm" style={{ color: 'rgb(var(--color-primary-500))' }}>
                        {user.firstName?.[0] || user.email[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>
                        {user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}`
                          : user.email.split('@')[0]
                        }
                      </p>
                      <p className="text-sm truncate" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                        {user.email}
                      </p>
                    </div>
                  </div>

                  {/* Organization */}
                  <div>
                    <span className="text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                      {user.organizationName || '-'}
                    </span>
                  </div>

                  {/* Status */}
                  <div>
                    <StatusBadge status={user.status} />
                  </div>

                  {/* Last Login */}
                  <div>
                    <span className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      {user.lastLoginAt 
                        ? new Date(user.lastLoginAt).toLocaleDateString()
                        : isEn ? 'Never' : 'Jamais'
                      }
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end">
                    <UserActions
                      user={user}
                      onDisable={() => handleDisableUser(user.id)}
                      onEnable={() => handleEnableUser(user.id)}
                      onResetPassword={() => handleResetPassword(user.id)}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div 
              className="flex items-center justify-between px-4 py-3 border-t"
              style={{ borderColor: 'rgb(var(--color-border))' }}
            >
              <span className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn 
                  ? `Showing ${filteredUsers.length} users`
                  : `Affichage de ${filteredUsers.length} utilisateurs`
                }
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border disabled:opacity-50"
                  style={{ borderColor: 'rgb(var(--color-border))' }}
                >
                  <ChevronLeft className="w-4 h-4" style={{ color: 'rgb(var(--color-text-secondary))' }} />
                </button>
                <span className="text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border disabled:opacity-50"
                  style={{ borderColor: 'rgb(var(--color-border))' }}
                >
                  <ChevronRight className="w-4 h-4" style={{ color: 'rgb(var(--color-text-secondary))' }} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
