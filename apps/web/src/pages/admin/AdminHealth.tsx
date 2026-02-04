import { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import {
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  Server,
  RefreshCw,
  Clock,
  Cpu,
  HardDrive,
  Zap,
  Globe,
} from 'lucide-react';

type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy';

interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  latency?: number;
  uptime?: number;
  lastCheck: string;
  details?: string;
}

interface SystemMetrics {
  requestsPerMinute: number;
  errorRate: number;
  avgResponseTime: number;
  activeConnections: number;
  cpuUsage?: number;
  memoryUsage?: number;
}

// Status Icon
function StatusIcon({ status }: { status: ServiceStatus }) {
  const config = {
    healthy: { icon: CheckCircle, color: 'success' },
    degraded: { icon: AlertTriangle, color: 'warning' },
    unhealthy: { icon: XCircle, color: 'error' },
  };
  
  const { icon: Icon, color } = config[status];
  
  return (
    <Icon className="w-5 h-5" style={{ color: `rgb(var(--color-${color}))` }} />
  );
}

// Status Badge
function StatusBadge({ status }: { status: ServiceStatus }) {
  const config = {
    healthy: { color: 'success', label: 'Healthy' },
    degraded: { color: 'warning', label: 'Degraded' },
    unhealthy: { color: 'error', label: 'Unhealthy' },
  };
  
  const { color, label } = config[status];
  
  return (
    <span 
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ 
        backgroundColor: `rgb(var(--color-${color}) / 0.1)`,
        color: `rgb(var(--color-${color}))`,
      }}
    >
      <StatusIcon status={status} />
      {label}
    </span>
  );
}

// Service Card
function ServiceCard({ service }: { service: ServiceHealth }) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  return (
    <div 
      className="rounded-lg border p-4"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        borderColor: service.status === 'unhealthy' 
          ? 'rgb(var(--color-error) / 0.5)' 
          : service.status === 'degraded'
            ? 'rgb(var(--color-warning) / 0.5)'
            : 'rgb(var(--color-border))',
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <StatusIcon status={service.status} />
          <div>
            <h3 className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
              {service.name}
            </h3>
            {service.details && (
              <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {service.details}
              </p>
            )}
          </div>
        </div>
        <StatusBadge status={service.status} />
      </div>
      
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
        {service.latency !== undefined && (
          <div>
            <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Latency' : 'Latence'}
            </p>
            <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
              {service.latency}ms
            </p>
          </div>
        )}
        {service.uptime !== undefined && (
          <div>
            <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Uptime' : 'Disponibilité'}
            </p>
            <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
              {service.uptime}%
            </p>
          </div>
        )}
        <div>
          <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Last Check' : 'Dernière vérif.'}
          </p>
          <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
            {new Date(service.lastCheck).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </div>
  );
}

// Metric Card
function MetricCard({ 
  label, 
  value, 
  unit, 
  icon: Icon, 
  trend,
  color = 'primary' 
}: { 
  label: string; 
  value: number; 
  unit?: string; 
  icon: typeof Activity;
  trend?: { value: number; positive: boolean };
  color?: string;
}) {
  return (
    <div 
      className="rounded-lg border p-4"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        borderColor: 'rgb(var(--color-border))',
      }}
    >
      <div className="flex items-center justify-between">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `rgb(var(--color-${color}) / 0.1)` }}
        >
          <Icon className="w-5 h-5" style={{ color: `rgb(var(--color-${color}))` }} />
        </div>
        {trend && (
          <span 
            className="text-xs font-medium"
            style={{ color: trend.positive ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))' }}
          >
            {trend.positive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
          {value.toLocaleString()}{unit && <span className="text-sm font-normal ml-1">{unit}</span>}
        </p>
        <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
          {label}
        </p>
      </div>
    </div>
  );
}

export default function AdminHealth() {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch health data
  useEffect(() => {
    const fetchHealthData = async () => {
      try {
        // TODO: Replace with actual API calls
        setServices([
          {
            name: 'PostgreSQL',
            status: 'healthy',
            latency: 12,
            uptime: 99.99,
            lastCheck: new Date().toISOString(),
            details: 'Primary database',
          },
          {
            name: 'Redis Cache',
            status: 'healthy',
            latency: 2,
            uptime: 99.95,
            lastCheck: new Date().toISOString(),
            details: 'Session & cache store',
          },
          {
            name: 'Keycloak',
            status: 'healthy',
            latency: 45,
            uptime: 99.9,
            lastCheck: new Date().toISOString(),
            details: 'Authentication service',
          },
          {
            name: 'QuickBooks API',
            status: 'healthy',
            latency: 234,
            uptime: 99.5,
            lastCheck: new Date().toISOString(),
            details: 'External integration',
          },
          {
            name: 'Email Service (SES)',
            status: 'healthy',
            latency: 89,
            uptime: 99.9,
            lastCheck: new Date().toISOString(),
            details: 'Transactional emails',
          },
          {
            name: 'ETL Pipeline',
            status: 'healthy',
            latency: 156,
            uptime: 99.8,
            lastCheck: new Date().toISOString(),
            details: 'Data synchronization',
          },
        ]);
        
        setMetrics({
          requestsPerMinute: 1247,
          errorRate: 0.12,
          avgResponseTime: 145,
          activeConnections: 89,
          cpuUsage: 34,
          memoryUsage: 62,
        });
      } catch (error) {
        console.error('Failed to fetch health data:', error);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    };

    fetchHealthData();
  }, [lastRefresh]);

  // Calculate overall status
  const overallStatus: ServiceStatus = services.some(s => s.status === 'unhealthy')
    ? 'unhealthy'
    : services.some(s => s.status === 'degraded')
      ? 'degraded'
      : 'healthy';

  const healthyCount = services.filter(s => s.status === 'healthy').length;
  const degradedCount = services.filter(s => s.status === 'degraded').length;
  const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setLastRefresh(new Date());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin" style={{ color: 'rgb(var(--color-primary-500))' }} />
          <span style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn ? 'Loading health status...' : 'Chargement de l\'état de santé...'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'System Health' : 'Santé du système'}
            </h1>
            <StatusBadge status={overallStatus} />
          </div>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn ? 'Monitor platform services and performance' : 'Surveiller les services et performances'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Last updated:' : 'Dernière mise à jour:'} {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border transition-colors disabled:opacity-50"
            style={{ 
              borderColor: 'rgb(var(--color-border))',
              color: 'rgb(var(--color-text))',
            }}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isEn ? 'Refresh' : 'Actualiser'}
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <div 
        className="rounded-xl border p-6"
        style={{ 
          backgroundColor: overallStatus === 'healthy' 
            ? 'rgb(var(--color-success) / 0.05)'
            : overallStatus === 'degraded'
              ? 'rgb(var(--color-warning) / 0.05)'
              : 'rgb(var(--color-error) / 0.05)',
          borderColor: overallStatus === 'healthy' 
            ? 'rgb(var(--color-success) / 0.2)'
            : overallStatus === 'degraded'
              ? 'rgb(var(--color-warning) / 0.2)'
              : 'rgb(var(--color-error) / 0.2)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-xl flex items-center justify-center"
              style={{ 
                backgroundColor: overallStatus === 'healthy' 
                  ? 'rgb(var(--color-success) / 0.1)'
                  : overallStatus === 'degraded'
                    ? 'rgb(var(--color-warning) / 0.1)'
                    : 'rgb(var(--color-error) / 0.1)',
              }}
            >
              <Activity 
                className="w-8 h-8" 
                style={{ 
                  color: overallStatus === 'healthy' 
                    ? 'rgb(var(--color-success))'
                    : overallStatus === 'degraded'
                      ? 'rgb(var(--color-warning))'
                      : 'rgb(var(--color-error))',
                }} 
              />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                {overallStatus === 'healthy' 
                  ? (isEn ? 'All Systems Operational' : 'Tous les systèmes opérationnels')
                  : overallStatus === 'degraded'
                    ? (isEn ? 'Some Systems Degraded' : 'Certains systèmes dégradés')
                    : (isEn ? 'System Issues Detected' : 'Problèmes système détectés')
                }
              </h2>
              <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {healthyCount} {isEn ? 'healthy' : 'sains'} • {degradedCount} {isEn ? 'degraded' : 'dégradés'} • {unhealthyCount} {isEn ? 'unhealthy' : 'défaillants'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard
            label={isEn ? 'Requests/min' : 'Requêtes/min'}
            value={metrics.requestsPerMinute}
            icon={Zap}
            color="primary"
          />
          <MetricCard
            label={isEn ? 'Error Rate' : 'Taux d\'erreur'}
            value={metrics.errorRate}
            unit="%"
            icon={AlertTriangle}
            color={metrics.errorRate > 1 ? 'error' : 'success'}
          />
          <MetricCard
            label={isEn ? 'Avg Response' : 'Rép. moyenne'}
            value={metrics.avgResponseTime}
            unit="ms"
            icon={Clock}
            color="primary"
          />
          <MetricCard
            label={isEn ? 'Connections' : 'Connexions'}
            value={metrics.activeConnections}
            icon={Globe}
            color="primary"
          />
          {metrics.cpuUsage !== undefined && (
            <MetricCard
              label={isEn ? 'CPU Usage' : 'Utilisation CPU'}
              value={metrics.cpuUsage}
              unit="%"
              icon={Cpu}
              color={metrics.cpuUsage > 80 ? 'error' : metrics.cpuUsage > 60 ? 'warning' : 'success'}
            />
          )}
          {metrics.memoryUsage !== undefined && (
            <MetricCard
              label={isEn ? 'Memory' : 'Mémoire'}
              value={metrics.memoryUsage}
              unit="%"
              icon={HardDrive}
              color={metrics.memoryUsage > 80 ? 'error' : metrics.memoryUsage > 60 ? 'warning' : 'success'}
            />
          )}
        </div>
      )}

      {/* Services */}
      <div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Services' : 'Services'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <ServiceCard key={service.name} service={service} />
          ))}
        </div>
      </div>
    </div>
  );
}
