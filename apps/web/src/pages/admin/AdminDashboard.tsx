import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../lib/i18n';
import {
  Users,
  Building2,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  RefreshCw,
  MessageSquare,
  Bell,
  ArrowRight,
  Zap,
} from 'lucide-react';

interface DashboardStats {
  organizations: {
    total: number;
    active: number;
    byIndustry: Record<string, number>;
  };
  users: {
    total: number;
    active: number;
    activeToday: number;
    newThisMonth: number;
  };
  syncJobs: {
    total24h: number;
    completed: number;
    failed: number;
    running: number;
    byProvider: Record<string, number>;
  };
  health: {
    overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    degradedServices: number;
    unhealthyServices: number;
  };
  chat: {
    onlineCustomers: number;
    waitingSessions: number;
    activeSessions: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    adminEmail: string;
    resourceType: string;
    resourceName?: string;
    createdAt: string;
  }>;
}

// Stat Card Component
function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  color = 'primary' 
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string; 
  icon: typeof Users; 
  trend?: { value: number; positive: boolean };
  color?: 'primary' | 'success' | 'warning' | 'error';
}) {
  const colorMap = {
    primary: 'rgb(var(--color-primary-500))',
    success: 'rgb(var(--color-success))',
    warning: 'rgb(var(--color-warning))',
    error: 'rgb(var(--color-error))',
  };
  
  return (
    <div 
      className="rounded-xl p-5 border"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        borderColor: 'rgb(var(--color-border))',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {title}
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
              {value}
            </span>
            {trend && (
              <span 
                className="text-xs font-medium flex items-center"
                style={{ color: trend.positive ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))' }}
              >
                {trend.positive ? '+' : ''}{trend.value}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {subtitle}
            </p>
          )}
        </div>
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${colorMap[color]}15` }}
        >
          <Icon className="w-5 h-5" style={{ color: colorMap[color] }} />
        </div>
      </div>
    </div>
  );
}

// Health Status Badge
function HealthBadge({ status }: { status: 'healthy' | 'degraded' | 'unhealthy' }) {
  const config = {
    healthy: { color: 'success', icon: CheckCircle, label: 'Healthy' },
    degraded: { color: 'warning', icon: AlertTriangle, label: 'Degraded' },
    unhealthy: { color: 'error', icon: AlertTriangle, label: 'Unhealthy' },
  };
  
  const { color, icon: Icon, label } = config[status];
  
  return (
    <span 
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ 
        backgroundColor: `rgb(var(--color-${color}) / 0.1)`,
        color: `rgb(var(--color-${color}))`,
      }}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

// Quick Action Card
function QuickAction({ 
  title, 
  description, 
  icon: Icon, 
  href, 
  color = 'primary' 
}: { 
  title: string; 
  description: string; 
  icon: typeof Users; 
  href: string;
  color?: string;
}) {
  return (
    <Link
      to={href}
      className="group flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-md"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        borderColor: 'rgb(var(--color-border))',
      }}
    >
      <div 
        className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
        style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
      >
        <Icon className="w-6 h-6" style={{ color: 'rgb(var(--color-primary-500))' }} />
      </div>
      <div className="flex-1">
        <h3 className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{title}</h3>
        <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{description}</p>
      </div>
      <ArrowRight 
        className="w-5 h-5 transition-transform group-hover:translate-x-1" 
        style={{ color: 'rgb(var(--color-text-muted))' }} 
      />
    </Link>
  );
}

export default function AdminDashboard() {
  const { language } = useI18n();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const isEn = language === 'en';

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // TODO: Replace with actual API call
        // const response = await fetch('/api/admin/dashboard/stats');
        // const data = await response.json();
        
        // Mock data for now
        setStats({
          organizations: {
            total: 156,
            active: 142,
            byIndustry: {
              'real_estate': 45,
              'restaurant': 32,
              'retail': 28,
              'construction': 20,
              'professional_services': 31,
            },
          },
          users: {
            total: 523,
            active: 412,
            activeToday: 87,
            newThisMonth: 34,
          },
          syncJobs: {
            total24h: 234,
            completed: 218,
            failed: 8,
            running: 8,
            byProvider: {
              'quickbooks': 180,
              'xero': 42,
              'sage': 12,
            },
          },
          health: {
            overallStatus: 'healthy',
            degradedServices: 0,
            unhealthyServices: 0,
          },
          chat: {
            onlineCustomers: 12,
            waitingSessions: 3,
            activeSessions: 5,
          },
          recentActivity: [
            { id: '1', action: 'user:create', adminEmail: 'admin@example.com', resourceType: 'user', resourceName: 'John Doe', createdAt: new Date().toISOString() },
            { id: '2', action: 'org:update', adminEmail: 'admin@example.com', resourceType: 'organization', resourceName: 'Acme Corp', createdAt: new Date(Date.now() - 3600000).toISOString() },
            { id: '3', action: 'notification:send', adminEmail: 'admin@example.com', resourceType: 'notification', resourceName: 'System Update', createdAt: new Date(Date.now() - 7200000).toISOString() },
          ],
        });
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [lastRefresh]);

  const handleRefresh = () => {
    setIsLoading(true);
    setLastRefresh(new Date());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin" style={{ color: 'rgb(var(--color-primary-500))' }} />
          <span style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn ? 'Loading dashboard...' : 'Chargement du tableau de bord...'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Admin Dashboard' : 'Tableau de bord Admin'}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn ? 'Overview of your platform' : 'Aperçu de votre plateforme'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HealthBadge status={stats?.health.overallStatus || 'healthy'} />
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors"
            style={{ 
              borderColor: 'rgb(var(--color-border))',
              color: 'rgb(var(--color-text-secondary))',
            }}
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-sm">{isEn ? 'Refresh' : 'Actualiser'}</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={isEn ? 'Total Users' : 'Utilisateurs totaux'}
          value={stats?.users.total || 0}
          subtitle={`${stats?.users.activeToday || 0} ${isEn ? 'active today' : 'actifs aujourd\'hui'}`}
          icon={Users}
          trend={{ value: 12, positive: true }}
          color="primary"
        />
        <StatCard
          title={isEn ? 'Organizations' : 'Organisations'}
          value={stats?.organizations.total || 0}
          subtitle={`${stats?.organizations.active || 0} ${isEn ? 'active' : 'actives'}`}
          icon={Building2}
          trend={{ value: 8, positive: true }}
          color="success"
        />
        <StatCard
          title={isEn ? 'Sync Jobs (24h)' : 'Jobs de sync (24h)'}
          value={stats?.syncJobs.total24h || 0}
          subtitle={`${stats?.syncJobs.failed || 0} ${isEn ? 'failed' : 'échoués'}`}
          icon={Database}
          color={stats?.syncJobs.failed && stats.syncJobs.failed > 5 ? 'warning' : 'success'}
        />
        <StatCard
          title={isEn ? 'Online Customers' : 'Clients en ligne'}
          value={stats?.chat.onlineCustomers || 0}
          subtitle={`${stats?.chat.waitingSessions || 0} ${isEn ? 'waiting for support' : 'en attente'}`}
          icon={MessageSquare}
          color={stats?.chat.waitingSessions && stats.chat.waitingSessions > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Quick Actions' : 'Actions rapides'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickAction
            title={isEn ? 'Send Notification' : 'Envoyer une notification'}
            description={isEn ? 'Push notifications to users' : 'Envoyer des notifications aux utilisateurs'}
            icon={Bell}
            href="/admin/notifications"
          />
          <QuickAction
            title={isEn ? 'Live Chat' : 'Chat en direct'}
            description={
              stats?.chat.waitingSessions 
                ? `${stats.chat.waitingSessions} ${isEn ? 'waiting' : 'en attente'}`
                : isEn ? 'Chat with online customers' : 'Discuter avec les clients'
            }
            icon={MessageSquare}
            href="/admin/chat"
          />
          <QuickAction
            title={isEn ? 'View Audit Logs' : 'Voir les journaux'}
            description={isEn ? 'Review admin activity' : 'Examiner l\'activité admin'}
            icon={Clock}
            href="/admin/audit"
          />
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div 
          className="rounded-xl border p-5"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            borderColor: 'rgb(var(--color-border))',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Recent Activity' : 'Activité récente'}
            </h2>
            <Link 
              to="/admin/audit"
              className="text-sm font-medium"
              style={{ color: 'rgb(var(--color-primary-500))' }}
            >
              {isEn ? 'View all' : 'Voir tout'}
            </Link>
          </div>
          <div className="space-y-3">
            {stats?.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                >
                  <Activity className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                    <span className="font-medium">{activity.action}</span>
                    {activity.resourceName && (
                      <span style={{ color: 'rgb(var(--color-text-secondary))' }}>
                        {' '}{isEn ? 'on' : 'sur'} {activity.resourceName}
                      </span>
                    )}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {activity.adminEmail} • {new Date(activity.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sync Jobs by Provider */}
        <div 
          className="rounded-xl border p-5"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            borderColor: 'rgb(var(--color-border))',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Sync Jobs by Provider' : 'Jobs de sync par fournisseur'}
            </h2>
            <Link 
              to="/admin/connections"
              className="text-sm font-medium"
              style={{ color: 'rgb(var(--color-primary-500))' }}
            >
              {isEn ? 'View all' : 'Voir tout'}
            </Link>
          </div>
          <div className="space-y-3">
            {Object.entries(stats?.syncJobs.byProvider || {}).map(([provider, count]) => (
              <div key={provider} className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                >
                  <Database className="w-5 h-5" style={{ color: 'rgb(var(--color-text-secondary))' }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize" style={{ color: 'rgb(var(--color-text))' }}>
                      {provider}
                    </span>
                    <span className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      {count} {isEn ? 'jobs' : 'jobs'}
                    </span>
                  </div>
                  <div 
                    className="h-2 rounded-full mt-2"
                    style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                  >
                    <div 
                      className="h-full rounded-full"
                      style={{ 
                        width: `${(count / (stats?.syncJobs.total24h || 1)) * 100}%`,
                        backgroundColor: 'rgb(var(--color-primary-500))',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
