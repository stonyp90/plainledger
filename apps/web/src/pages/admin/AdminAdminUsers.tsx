import { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import {
  UserCog,
  Shield,
  Plus,
  Search,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Mail,
} from 'lucide-react';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'support';
  status: 'active' | 'inactive';
  lastAccess: string;
}

export default function AdminAdminUsers() {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setUsers([
      { id: '1', name: 'Admin User', email: 'admin@plainledger.ca', role: 'super_admin', status: 'active', lastAccess: 'Just now' },
      { id: '2', name: 'Support Team', email: 'support@plainledger.ca', role: 'support', status: 'active', lastAccess: '2 hours ago' },
      { id: '3', name: 'Tech Admin', email: 'tech@plainledger.ca', role: 'admin', status: 'inactive', lastAccess: '3 days ago' },
    ]);
  }, []);

  const getRoleBadge = (role: AdminUser['role']) => {
    const styles = {
      super_admin: { bg: 'rgb(var(--color-primary-500) / 0.1)', color: 'rgb(var(--color-primary-600))' },
      admin: { bg: 'rgb(var(--color-info) / 0.1)', color: 'rgb(var(--color-info))' },
      support: { bg: 'rgb(var(--color-warning) / 0.1)', color: 'rgb(var(--color-warning))' },
    };
    const labels = {
      super_admin: isEn ? 'Super Admin' : 'Super Admin',
      admin: isEn ? 'Admin' : 'Admin',
      support: isEn ? 'Support' : 'Support',
    };
    return (
      <span
        className="px-2 py-1 text-xs font-medium rounded-full"
        style={{ backgroundColor: styles[role].bg, color: styles[role].color }}
      >
        {labels[role]}
      </span>
    );
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Admin Users' : 'Utilisateurs admin'}
          </h1>
          <p className="mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn ? 'Manage platform administrators' : 'Gérer les administrateurs de la plateforme'}
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
        >
          <Plus className="w-4 h-4" />
          {isEn ? 'Add Admin' : 'Ajouter admin'}
        </button>
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-lg border"
        style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}
      >
        <Search className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
        <input
          type="text"
          placeholder={isEn ? 'Search admin users...' : 'Rechercher des admins...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-sm"
          style={{ color: 'rgb(var(--color-text))' }}
        />
      </div>

      {/* Users List */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}
      >
        <table className="w-full">
          <thead style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'User' : 'Utilisateur'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Role' : 'Rôle'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Status' : 'Statut'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Last Access' : 'Dernier accès'}
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Actions' : 'Actions'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'rgb(var(--color-border))' }}>
            {filteredUsers.map((user) => (
              <tr 
              key={user.id} 
              className="transition-colors"
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--color-bg-subtle))'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                    >
                      <span className="font-semibold" style={{ color: 'rgb(var(--color-primary-600))' }}>
                        {user.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{user.name}</div>
                      <div className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {user.status === 'active' ? (
                      <CheckCircle2 className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
                    ) : (
                      <XCircle className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                    )}
                    <span style={{ color: user.status === 'active' ? 'rgb(var(--color-success))' : 'rgb(var(--color-text-muted))' }}>
                      {user.status === 'active' ? (isEn ? 'Active' : 'Actif') : (isEn ? 'Inactive' : 'Inactif')}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4" style={{ color: 'rgb(var(--color-text-secondary))' }}>{user.lastAccess}</td>
                <td className="px-6 py-4 text-right">
                  <button 
                    className="p-2 rounded-lg transition-colors"
                    style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--color-bg-muted))'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <MoreVertical className="w-4 h-4" style={{ color: 'rgb(var(--color-text-secondary))' }} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
