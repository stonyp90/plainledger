import { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import {
  Building2,
  Search,
  MoreVertical,
  Users,
  Database,
  TrendingUp,
  Download,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  industry?: string;
  usersCount: number;
  connectionsCount: number;
  onboardingStatus: 'trial' | 'active' | 'churned' | 'expired';
  createdAt: string;
  lastActivityAt?: string;
}

// Status Badge
function StatusBadge({ status }: { status: Organization['onboardingStatus'] }) {
  const config = {
    trial: { color: 'warning', label: 'Trial' },
    active: { color: 'success', label: 'Active' },
    churned: { color: 'error', label: 'Churned' },
    expired: { color: 'text-muted', label: 'Expired' },
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

// Industry Badge
function IndustryBadge({ industry }: { industry: string }) {
  const industryLabels: Record<string, string> = {
    real_estate: 'Real Estate',
    restaurant: 'Restaurant',
    retail: 'Retail',
    construction: 'Construction',
    professional_services: 'Services',
    manufacturing: 'Manufacturing',
    healthcare: 'Healthcare',
    technology: 'Technology',
  };
  
  return (
    <span 
      className="inline-flex items-center px-2 py-0.5 rounded text-xs capitalize"
      style={{ 
        backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
        color: 'rgb(var(--color-primary-600))',
      }}
    >
      {industryLabels[industry] || industry.replace('_', ' ')}
    </span>
  );
}

export default function AdminOrganizations() {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Organization['onboardingStatus'] | 'all'>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        // TODO: Replace with actual API call
        setOrganizations([
          {
            id: '1',
            name: 'Acme Corp',
            industry: 'real_estate',
            usersCount: 12,
            connectionsCount: 3,
            onboardingStatus: 'active',
            createdAt: new Date(Date.now() - 86400000 * 90).toISOString(),
            lastActivityAt: new Date().toISOString(),
          },
          {
            id: '2',
            name: 'Tech Solutions Inc',
            industry: 'technology',
            usersCount: 45,
            connectionsCount: 5,
            onboardingStatus: 'active',
            createdAt: new Date(Date.now() - 86400000 * 180).toISOString(),
            lastActivityAt: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: '3',
            name: 'Bob\'s Diner',
            industry: 'restaurant',
            usersCount: 3,
            connectionsCount: 1,
            onboardingStatus: 'trial',
            createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
            lastActivityAt: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: '4',
            name: 'Old Company Ltd',
            industry: 'retail',
            usersCount: 2,
            connectionsCount: 0,
            onboardingStatus: 'expired',
            createdAt: new Date(Date.now() - 86400000 * 365).toISOString(),
          },
          {
            id: '5',
            name: 'Former Client Co',
            industry: 'construction',
            usersCount: 8,
            connectionsCount: 2,
            onboardingStatus: 'churned',
            createdAt: new Date(Date.now() - 86400000 * 200).toISOString(),
            lastActivityAt: new Date(Date.now() - 86400000 * 60).toISOString(),
          },
        ]);
        setTotalPages(3);
      } catch (error) {
        console.error('Failed to fetch organizations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganizations();
  }, [currentPage]);

  // Get unique industries
  const industries = [...new Set(organizations.map(o => o.industry).filter(Boolean))];

  // Filter organizations
  const filteredOrganizations = organizations.filter((org) => {
    const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || org.onboardingStatus === statusFilter;
    const matchesIndustry = industryFilter === 'all' || org.industry === industryFilter;
    return matchesSearch && matchesStatus && matchesIndustry;
  });

  // Stats
  const stats = {
    total: organizations.length,
    active: organizations.filter(o => o.onboardingStatus === 'active').length,
    trial: organizations.filter(o => o.onboardingStatus === 'trial').length,
    churned: organizations.filter(o => o.onboardingStatus === 'churned').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Organizations' : 'Organisations'}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn ? 'Manage organizations on your platform' : 'Gérer les organisations de votre plateforme'}
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
            {isEn ? 'Add Organization' : 'Ajouter une organisation'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: isEn ? 'Total' : 'Total', value: stats.total, color: 'primary' },
          { label: isEn ? 'Active' : 'Actifs', value: stats.active, color: 'success' },
          { label: isEn ? 'Trial' : 'Essai', value: stats.trial, color: 'warning' },
          { label: isEn ? 'Churned' : 'Perdus', value: stats.churned, color: 'error' },
        ].map((stat) => (
          <div 
            key={stat.label}
            className="rounded-lg border p-4"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              borderColor: 'rgb(var(--color-border))',
            }}
          >
            <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{stat.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: `rgb(var(--color-${stat.color}))` }}>
              {stat.value}
            </p>
          </div>
        ))}
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
            placeholder={isEn ? 'Search organizations...' : 'Rechercher des organisations...'}
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
          onChange={(e) => setStatusFilter(e.target.value as Organization['onboardingStatus'] | 'all')}
          className="px-4 py-2.5 rounded-lg border text-sm"
          style={{ 
            borderColor: 'rgb(var(--color-border))',
            backgroundColor: 'rgb(var(--color-surface))',
            color: 'rgb(var(--color-text))',
          }}
        >
          <option value="all">{isEn ? 'All Status' : 'Tous les statuts'}</option>
          <option value="active">{isEn ? 'Active' : 'Actif'}</option>
          <option value="trial">{isEn ? 'Trial' : 'Essai'}</option>
          <option value="churned">{isEn ? 'Churned' : 'Perdus'}</option>
          <option value="expired">{isEn ? 'Expired' : 'Expiré'}</option>
        </select>
        <select
          value={industryFilter}
          onChange={(e) => setIndustryFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border text-sm"
          style={{ 
            borderColor: 'rgb(var(--color-border))',
            backgroundColor: 'rgb(var(--color-surface))',
            color: 'rgb(var(--color-text))',
          }}
        >
          <option value="all">{isEn ? 'All Industries' : 'Toutes les industries'}</option>
          {industries.map((industry) => (
            <option key={industry} value={industry} className="capitalize">
              {industry?.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Organizations Table */}
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
              className="hidden md:grid grid-cols-7 gap-4 px-4 py-3 text-sm font-medium border-b"
              style={{ 
                backgroundColor: 'rgb(var(--color-bg-muted))',
                borderColor: 'rgb(var(--color-border))',
                color: 'rgb(var(--color-text-secondary))',
              }}
            >
              <div className="col-span-2">{isEn ? 'Organization' : 'Organisation'}</div>
              <div>{isEn ? 'Industry' : 'Industrie'}</div>
              <div>{isEn ? 'Users' : 'Utilisateurs'}</div>
              <div>{isEn ? 'Connections' : 'Connexions'}</div>
              <div>{isEn ? 'Status' : 'Statut'}</div>
              <div className="text-right">{isEn ? 'Actions' : 'Actions'}</div>
            </div>

            {/* Table Body */}
            <div className="divide-y" style={{ borderColor: 'rgb(var(--color-border))' }}>
              {filteredOrganizations.map((org) => (
                <div 
                  key={org.id}
                  className="grid grid-cols-1 md:grid-cols-7 gap-4 p-4 items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  {/* Organization */}
                  <div className="md:col-span-2 flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                    >
                      <Building2 className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>
                        {org.name}
                      </p>
                      <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        {isEn ? 'Created' : 'Créé'} {new Date(org.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Industry */}
                  <div>
                    {org.industry && <IndustryBadge industry={org.industry} />}
                  </div>

                  {/* Users */}
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                    <span className="text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                      {org.usersCount}
                    </span>
                  </div>

                  {/* Connections */}
                  <div className="flex items-center gap-1">
                    <Database className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                    <span className="text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                      {org.connectionsCount}
                    </span>
                  </div>

                  {/* Status */}
                  <div>
                    <StatusBadge status={org.onboardingStatus} />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-1">
                    <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Eye className="w-4 h-4" style={{ color: 'rgb(var(--color-text-secondary))' }} />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Edit className="w-4 h-4" style={{ color: 'rgb(var(--color-text-secondary))' }} />
                    </button>
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
                  ? `Showing ${filteredOrganizations.length} organizations`
                  : `Affichage de ${filteredOrganizations.length} organisations`
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
