/**
 * OpEx/CapEx Projection Chart Component
 * 
 * Fully customizable chart for operating and capital expenditure projections
 * with interactive controls, multiple view modes, and export capabilities
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Settings,
  Download,
  Eye,
  EyeOff,
  BarChart3,
  LineChart,
  PieChart,
  Calendar,
  DollarSign,
  Layers,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Info,
  Plus,
  Minus,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useI18n } from '../../lib/i18n';

// Types
interface ExpenseCategory {
  id: string;
  name: string;
  nameEn: string;
  type: 'opex' | 'capex';
  color: string;
  icon?: typeof DollarSign;
}

interface ExpenseDataPoint {
  month: string;
  categories: Record<string, number>;
  total: number;
}

interface ProjectionSettings {
  growthRate: number;
  seasonalityEnabled: boolean;
  inflationRate: number;
  scenarioMultiplier: number;
}

interface ChartConfig {
  chartType: 'bar' | 'line' | 'area' | 'stacked';
  showOpex: boolean;
  showCapex: boolean;
  showTotal: boolean;
  showProjection: boolean;
  showBudget: boolean;
  timeRange: '6m' | '12m' | '24m' | 'all';
  groupBy: 'month' | 'quarter' | 'year';
  compareMode: 'none' | 'yoy' | 'budget';
}

interface OpExCapExChartProps {
  historicalData?: ExpenseDataPoint[];
  projectedData?: ExpenseDataPoint[];
  budgetData?: ExpenseDataPoint[];
  categories?: ExpenseCategory[];
  currentMonth?: string;
  onSettingsChange?: (settings: ProjectionSettings) => void;
  onExport?: (format: 'csv' | 'json' | 'png') => void;
}

// Default categories
const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: 'salaries', name: 'Salaires', nameEn: 'Salaries', type: 'opex', color: '#3B82F6' },
  { id: 'rent', name: 'Loyer', nameEn: 'Rent', type: 'opex', color: '#8B5CF6' },
  { id: 'marketing', name: 'Marketing', nameEn: 'Marketing', type: 'opex', color: '#EC4899' },
  { id: 'software', name: 'Logiciels', nameEn: 'Software', type: 'opex', color: '#14B8A6' },
  { id: 'utilities', name: 'Services publics', nameEn: 'Utilities', type: 'opex', color: '#F59E0B' },
  { id: 'equipment', name: 'Équipement', nameEn: 'Equipment', type: 'capex', color: '#EF4444' },
  { id: 'property', name: 'Immobilier', nameEn: 'Property', type: 'capex', color: '#10B981' },
  { id: 'vehicles', name: 'Véhicules', nameEn: 'Vehicles', type: 'capex', color: '#6366F1' },
];

// Generate sample data
function generateSampleData(months: number, categories: ExpenseCategory[]): ExpenseDataPoint[] {
  const data: ExpenseDataPoint[] = [];
  const now = new Date();
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = date.toISOString().slice(0, 7);
    
    const categoryData: Record<string, number> = {};
    let total = 0;
    
    categories.forEach(cat => {
      // Base values with some randomness and growth
      const baseValues: Record<string, number> = {
        salaries: 45000 + Math.random() * 5000,
        rent: 8000,
        marketing: 5000 + Math.random() * 3000,
        software: 2000 + Math.random() * 1000,
        utilities: 1500 + Math.random() * 500,
        equipment: Math.random() > 0.7 ? 10000 + Math.random() * 15000 : 0,
        property: Math.random() > 0.9 ? 50000 + Math.random() * 50000 : 0,
        vehicles: Math.random() > 0.95 ? 25000 + Math.random() * 25000 : 0,
      };
      
      const value = Math.round(baseValues[cat.id] || 1000 + Math.random() * 2000);
      categoryData[cat.id] = value;
      total += value;
    });
    
    data.push({ month: monthStr, categories: categoryData, total });
  }
  
  return data;
}

// Generate projections
function generateProjections(
  historical: ExpenseDataPoint[],
  months: number,
  settings: ProjectionSettings,
  categories: ExpenseCategory[]
): ExpenseDataPoint[] {
  if (historical.length === 0) return [];
  
  const lastData = historical[historical.length - 1];
  const projections: ExpenseDataPoint[] = [];
  const lastDate = new Date(lastData.month + '-01');
  
  for (let i = 1; i <= months; i++) {
    const date = new Date(lastDate.getFullYear(), lastDate.getMonth() + i, 1);
    const monthStr = date.toISOString().slice(0, 7);
    
    const categoryData: Record<string, number> = {};
    let total = 0;
    
    categories.forEach(cat => {
      const lastValue = lastData.categories[cat.id] || 0;
      const monthlyGrowth = Math.pow(1 + settings.growthRate / 100, 1 / 12);
      const inflation = Math.pow(1 + settings.inflationRate / 100, 1 / 12);
      
      let value = lastValue * Math.pow(monthlyGrowth * inflation, i);
      
      // Apply seasonality for certain categories
      if (settings.seasonalityEnabled) {
        const month = date.getMonth();
        if (cat.id === 'marketing') {
          // Higher marketing in Q4
          if (month >= 9 && month <= 11) value *= 1.3;
        }
        if (cat.id === 'utilities') {
          // Higher utilities in winter/summer
          if (month === 0 || month === 1 || month === 6 || month === 7) value *= 1.2;
        }
      }
      
      // Apply scenario multiplier
      value *= settings.scenarioMultiplier;
      
      categoryData[cat.id] = Math.round(value);
      total += Math.round(value);
    });
    
    projections.push({ month: monthStr, categories: categoryData, total });
  }
  
  return projections;
}

export default function OpExCapExChart({
  historicalData,
  projectedData,
  budgetData,
  categories = DEFAULT_CATEGORIES,
  currentMonth,
  onSettingsChange,
  onExport,
}: OpExCapExChartProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  // State
  const [config, setConfig] = useState<ChartConfig>({
    chartType: 'stacked',
    showOpex: true,
    showCapex: true,
    showTotal: true,
    showProjection: true,
    showBudget: false,
    timeRange: '12m',
    groupBy: 'month',
    compareMode: 'none',
  });
  
  const [settings, setSettings] = useState<ProjectionSettings>({
    growthRate: 5,
    seasonalityEnabled: true,
    inflationRate: 2.5,
    scenarioMultiplier: 1,
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{ month: string; x: number; y: number } | null>(null);
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(new Set(categories.map(c => c.id)));
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Handle Escape key to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setIsFullscreen(false);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isFullscreen]);
  
  const historical = historicalData || [];
  const projected = useMemo(() => {
    if (projectedData && projectedData.length > 0) return projectedData;
    return generateProjections(historical, 12, settings, categories);
  }, [projectedData, historical, settings, categories]);
  
  // Filter data by time range
  const filteredData = useMemo(() => {
    const allData = [...historical, ...projected];
    const now = new Date();
    let startDate: Date;
    
    switch (config.timeRange) {
      case '6m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case '12m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case '24m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 12, 1);
        break;
      default:
        startDate = new Date(0);
    }
    
    return allData.filter(d => new Date(d.month + '-01') >= startDate);
  }, [historical, projected, config.timeRange]);
  
  // Calculate totals
  const totals = useMemo(() => {
    const opexCategories = categories.filter(c => c.type === 'opex').map(c => c.id);
    const capexCategories = categories.filter(c => c.type === 'capex').map(c => c.id);
    
    let totalOpex = 0;
    let totalCapex = 0;
    let projectedOpex = 0;
    let projectedCapex = 0;
    
    historical.forEach(d => {
      opexCategories.forEach(id => { totalOpex += d.categories[id] || 0; });
      capexCategories.forEach(id => { totalCapex += d.categories[id] || 0; });
    });
    
    projected.forEach(d => {
      opexCategories.forEach(id => { projectedOpex += d.categories[id] || 0; });
      capexCategories.forEach(id => { projectedCapex += d.categories[id] || 0; });
    });
    
    return { totalOpex, totalCapex, projectedOpex, projectedCapex };
  }, [historical, projected, categories]);
  
  // Chart dimensions
  const chartHeight = isFullscreen ? 500 : 300;
  const maxValue = useMemo(() => {
    return Math.max(...filteredData.map(d => {
      let sum = 0;
      categories.forEach(cat => {
        if (visibleCategories.has(cat.id)) {
          if ((cat.type === 'opex' && config.showOpex) || (cat.type === 'capex' && config.showCapex)) {
            sum += d.categories[cat.id] || 0;
          }
        }
      });
      return sum;
    })) * 1.1;
  }, [filteredData, categories, visibleCategories, config]);
  
  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };
  
  const formatMonth = (monthStr: string) => {
    const date = new Date(monthStr + '-01');
    return date.toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { month: 'short', year: '2-digit' });
  };
  
  const toggleCategory = (id: string) => {
    setVisibleCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  const handleSettingsChange = (newSettings: Partial<ProjectionSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    onSettingsChange?.(updated);
  };
  
  const handleExport = (format: 'csv' | 'json' | 'png') => {
    if (onExport) {
      onExport(format);
      return;
    }
    
    // Default export implementation
    if (format === 'json') {
      const data = { historical, projected, settings, categories };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `opex-capex-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      const headers = ['Month', ...categories.map(c => isEn ? c.nameEn : c.name), 'Total'];
      const rows = [...historical, ...projected].map(d => [
        d.month,
        ...categories.map(c => d.categories[c.id] || 0),
        d.total,
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `opex-capex-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };
  
  // Get visible categories sorted
  const getVisibleCategories = useCallback(() => {
    return [...categories]
      .filter(cat => {
        if (!visibleCategories.has(cat.id)) return false;
        if (cat.type === 'opex' && !config.showOpex) return false;
        if (cat.type === 'capex' && !config.showCapex) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.type === 'opex' && b.type === 'capex') return -1;
        if (a.type === 'capex' && b.type === 'opex') return 1;
        return 0;
      });
  }, [categories, visibleCategories, config.showOpex, config.showCapex]);

  // Return null if no real data - no fallback to sample data (after all hooks)
  if (!historicalData || historicalData.length === 0) {
    return null;
  }

  // Render stacked bar chart
  const renderStackedBars = () => {
    const barWidth = 100 / filteredData.length - 2;
    const historicalMonths = new Set(historical.map(d => d.month));
    const visibleCats = getVisibleCategories();
    
    return filteredData.map((data, index) => {
      const isProjected = !historicalMonths.has(data.month);
      const x = (index / filteredData.length) * 100 + 1;
      let yOffset = 0;
      
      const bars: JSX.Element[] = [];
      
      visibleCats.forEach(cat => {
        const value = data.categories[cat.id] || 0;
        const height = (value / maxValue) * 100;
        const y = 100 - yOffset - height;
        
        bars.push(
          <rect
            key={`${data.month}-${cat.id}`}
            x={`${x}%`}
            y={`${y}%`}
            width={`${barWidth}%`}
            height={`${height}%`}
            fill={cat.color}
            opacity={isProjected ? 0.6 : 1}
            rx="2"
            className="transition-all duration-200"
            style={{ 
              filter: hoveredPoint?.month === data.month ? 'brightness(1.1)' : undefined,
              strokeDasharray: isProjected ? '4,2' : undefined,
              stroke: isProjected ? cat.color : undefined,
              strokeWidth: isProjected ? 1 : 0,
            }}
          />
        );
        
        yOffset += height;
      });
      
      return (
        <g 
          key={data.month}
          onMouseEnter={(e) => setHoveredPoint({ month: data.month, x: e.clientX, y: e.clientY })}
          onMouseLeave={() => setHoveredPoint(null)}
          className="cursor-pointer"
        >
          {bars}
        </g>
      );
    });
  };

  // Render grouped bar chart (side by side bars)
  const renderGroupedBars = () => {
    const historicalMonths = new Set(historical.map(d => d.month));
    const visibleCats = getVisibleCategories();
    const numCategories = visibleCats.length;
    if (numCategories === 0) return null;
    
    const groupWidth = 100 / filteredData.length - 1;
    const barWidth = groupWidth / numCategories - 0.5;
    
    return filteredData.map((data, index) => {
      const isProjected = !historicalMonths.has(data.month);
      const groupX = (index / filteredData.length) * 100 + 0.5;
      
      return (
        <g 
          key={data.month}
          onMouseEnter={(e) => setHoveredPoint({ month: data.month, x: e.clientX, y: e.clientY })}
          onMouseLeave={() => setHoveredPoint(null)}
          className="cursor-pointer"
        >
          {visibleCats.map((cat, catIndex) => {
            const value = data.categories[cat.id] || 0;
            const height = (value / maxValue) * 100;
            const x = groupX + catIndex * (barWidth + 0.5);
            const y = 100 - height;
            
            return (
              <rect
                key={`${data.month}-${cat.id}`}
                x={`${x}%`}
                y={`${y}%`}
                width={`${barWidth}%`}
                height={`${height}%`}
                fill={cat.color}
                opacity={isProjected ? 0.6 : 1}
                rx="1"
                className="transition-all duration-200"
                style={{ 
                  filter: hoveredPoint?.month === data.month ? 'brightness(1.1)' : undefined,
                }}
              />
            );
          })}
        </g>
      );
    });
  };

  // Render line chart
  const renderLineChart = () => {
    const historicalMonths = new Set(historical.map(d => d.month));
    const visibleCats = getVisibleCategories();
    
    return visibleCats.map(cat => {
      // Build path for this category
      const points = filteredData.map((data, index) => {
        const value = data.categories[cat.id] || 0;
        const x = (index / (filteredData.length - 1)) * 100;
        const y = 100 - (value / maxValue) * 100;
        return { x, y, isProjected: !historicalMonths.has(data.month) };
      });
      
      // Separate historical and projected points
      const historicalPoints = points.filter(p => !p.isProjected);
      const projectedPoints = points.filter(p => p.isProjected);
      
      // Create path strings
      const historicalPath = historicalPoints.length > 1 
        ? `M ${historicalPoints.map(p => `${p.x},${p.y}`).join(' L ')}`
        : '';
      
      // Connect last historical to first projected
      const connectionPath = historicalPoints.length > 0 && projectedPoints.length > 0
        ? `M ${historicalPoints[historicalPoints.length - 1].x},${historicalPoints[historicalPoints.length - 1].y} L ${projectedPoints[0].x},${projectedPoints[0].y}`
        : '';
      
      const projectedPath = projectedPoints.length > 1
        ? `M ${projectedPoints.map(p => `${p.x},${p.y}`).join(' L ')}`
        : '';
      
      return (
        <g key={cat.id}>
          {/* Historical line */}
          {historicalPath && (
            <path
              d={historicalPath}
              fill="none"
              stroke={cat.color}
              strokeWidth="2"
              className="transition-all duration-200"
            />
          )}
          
          {/* Connection line (dashed) */}
          {connectionPath && (
            <path
              d={connectionPath}
              fill="none"
              stroke={cat.color}
              strokeWidth="1.5"
              strokeDasharray="4,2"
              opacity="0.6"
            />
          )}
          
          {/* Projected line (dashed) */}
          {projectedPath && (
            <path
              d={projectedPath}
              fill="none"
              stroke={cat.color}
              strokeWidth="2"
              strokeDasharray="4,2"
              opacity="0.6"
            />
          )}
          
          {/* Data points */}
          {points.map((point, i) => (
            <circle
              key={i}
              cx={`${point.x}%`}
              cy={`${point.y}%`}
              r={hoveredPoint?.month === filteredData[i]?.month ? 5 : 3}
              fill={cat.color}
              opacity={point.isProjected ? 0.6 : 1}
              className="transition-all duration-200"
              onMouseEnter={(e) => {
                if (filteredData[i]) {
                  setHoveredPoint({ month: filteredData[i].month, x: e.clientX, y: e.clientY });
                }
              }}
              onMouseLeave={() => setHoveredPoint(null)}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </g>
      );
    });
  };

  // Render chart based on type
  const renderChart = () => {
    switch (config.chartType) {
      case 'stacked':
        return renderStackedBars();
      case 'bar':
        return renderGroupedBars();
      case 'line':
        return renderLineChart();
      default:
        return renderStackedBars();
    }
  };
  
  return (
    <div 
      className={`card transition-all ${isFullscreen ? 'fixed inset-4 z-50 overflow-auto' : ''}`}
      style={{ 
        backgroundColor: 'rgb(var(--color-bg))',
        zIndex: isFullscreen ? 9997 : undefined, // Use same z-index as TrendChart/WaterfallChart
      }}
    >
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
              <BarChart3 className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
              {isEn ? 'OpEx / CapEx Projection' : 'Projection OpEx / CapEx'}
            </h3>
            <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Operating and capital expenditure analysis' : 'Analyse des dépenses opérationnelles et en capital'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Time range selector */}
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgb(var(--color-border))' }}>
              {(['6m', '12m', '24m', 'all'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setConfig(c => ({ ...c, timeRange: range }))}
                  className="px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: config.timeRange === range ? 'rgb(var(--color-primary-500))' : 'transparent',
                    color: config.timeRange === range ? 'white' : 'rgb(var(--color-text-muted))',
                  }}
                >
                  {range === 'all' ? (isEn ? 'All' : 'Tout') : range}
                </button>
              ))}
            </div>
            
            {/* Chart type selector */}
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgb(var(--color-border))' }}>
              {[
                { type: 'stacked' as const, icon: Layers },
                { type: 'bar' as const, icon: BarChart3 },
                { type: 'line' as const, icon: LineChart },
              ].map(({ type, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => setConfig(c => ({ ...c, chartType: type }))}
                  className="p-2 transition-colors"
                  style={{
                    backgroundColor: config.chartType === type ? 'rgb(var(--color-primary-500))' : 'transparent',
                    color: config.chartType === type ? 'white' : 'rgb(var(--color-text-muted))',
                  }}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg transition-colors"
              style={{
                backgroundColor: showSettings ? 'rgb(var(--color-primary-500) / 0.1)' : 'transparent',
                color: showSettings ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))',
              }}
            >
              <Settings className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => handleExport('csv')}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              <Download className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg transition-colors"
              style={{ 
                color: isFullscreen ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))',
                backgroundColor: isFullscreen ? 'rgb(var(--color-primary-500) / 0.1)' : 'transparent',
              }}
              title={isEn ? (isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen') : (isFullscreen ? 'Quitter plein écran (Esc)' : 'Plein écran')}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        {/* Settings Panel */}
        {showSettings && (
          <div 
            className="mt-4 p-4 sm:p-5 rounded-xl"
            style={{ backgroundColor: 'rgb(var(--color-bg-subtle))', border: '1px solid rgb(var(--color-border))' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
              <span className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Projection Settings' : 'Paramètres de projection'}
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Growth Rate */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'Annual Growth' : 'Croissance annuelle'}
                  </label>
                  <span 
                    className="text-sm font-bold px-2 py-0.5 rounded"
                    style={{ 
                      backgroundColor: settings.growthRate > 0 ? 'rgb(var(--color-success) / 0.1)' : settings.growthRate < 0 ? 'rgb(var(--color-error) / 0.1)' : 'rgb(var(--color-bg))',
                      color: settings.growthRate > 0 ? 'rgb(var(--color-success))' : settings.growthRate < 0 ? 'rgb(var(--color-error))' : 'rgb(var(--color-text-muted))',
                    }}
                  >
                    {settings.growthRate > 0 ? '+' : ''}{settings.growthRate}%
                  </span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="30"
                  step="0.5"
                  value={settings.growthRate}
                  onChange={(e) => handleSettingsChange({ growthRate: parseFloat(e.target.value) })}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{ 
                    background: `linear-gradient(to right, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-500)) ${((settings.growthRate + 10) / 40) * 100}%, rgb(var(--color-border)) ${((settings.growthRate + 10) / 40) * 100}%, rgb(var(--color-border)) 100%)`,
                  }}
                />
                <div className="flex justify-between text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  <span>-10%</span>
                  <span>+30%</span>
                </div>
              </div>
              
              {/* Inflation Rate */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'Inflation Rate' : 'Taux d\'inflation'}
                  </label>
                  <span 
                    className="text-sm font-bold px-2 py-0.5 rounded"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-warning) / 0.1)',
                      color: 'rgb(var(--color-warning))',
                    }}
                  >
                    {settings.inflationRate}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={settings.inflationRate}
                  onChange={(e) => handleSettingsChange({ inflationRate: parseFloat(e.target.value) })}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{ 
                    background: `linear-gradient(to right, rgb(var(--color-warning)) 0%, rgb(var(--color-warning)) ${(settings.inflationRate / 10) * 100}%, rgb(var(--color-border)) ${(settings.inflationRate / 10) * 100}%, rgb(var(--color-border)) 100%)`,
                  }}
                />
                <div className="flex justify-between text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  <span>0%</span>
                  <span>10%</span>
                </div>
              </div>
              
              {/* Scenario Multiplier */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'Scenario Multiplier' : 'Multiplicateur'}
                  </label>
                  <span 
                    className="text-sm font-bold px-2 py-0.5 rounded"
                    style={{ 
                      backgroundColor: settings.scenarioMultiplier > 1 ? 'rgb(var(--color-error) / 0.1)' : settings.scenarioMultiplier < 1 ? 'rgb(var(--color-success) / 0.1)' : 'rgb(var(--color-bg))',
                      color: settings.scenarioMultiplier > 1 ? 'rgb(var(--color-error))' : settings.scenarioMultiplier < 1 ? 'rgb(var(--color-success))' : 'rgb(var(--color-text-muted))',
                    }}
                  >
                    {settings.scenarioMultiplier.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={settings.scenarioMultiplier}
                  onChange={(e) => handleSettingsChange({ scenarioMultiplier: parseFloat(e.target.value) })}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{ 
                    background: `linear-gradient(to right, rgb(var(--color-info)) 0%, rgb(var(--color-info)) ${((settings.scenarioMultiplier - 0.5) / 1.5) * 100}%, rgb(var(--color-border)) ${((settings.scenarioMultiplier - 0.5) / 1.5) * 100}%, rgb(var(--color-border)) 100%)`,
                  }}
                />
                <div className="flex justify-between text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  <span>0.5x</span>
                  <span>1x</span>
                  <span>2x</span>
                </div>
              </div>
              
              {/* Seasonality Toggle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'Seasonality' : 'Saisonnalité'}
                  </label>
                </div>
                <button
                  onClick={() => handleSettingsChange({ seasonalityEnabled: !settings.seasonalityEnabled })}
                  className="w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: settings.seasonalityEnabled ? 'rgb(var(--color-success))' : 'rgb(var(--color-bg))',
                    color: settings.seasonalityEnabled ? 'white' : 'rgb(var(--color-text-muted))',
                    border: `1px solid ${settings.seasonalityEnabled ? 'rgb(var(--color-success))' : 'rgb(var(--color-border))'}`,
                  }}
                >
                  {settings.seasonalityEnabled ? (
                    <>
                      <Eye className="w-4 h-4" />
                      {isEn ? 'Enabled' : 'Activé'}
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4" />
                      {isEn ? 'Disabled' : 'Désactivé'}
                    </>
                  )}
                </button>
                <p className="text-[10px] text-center" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Apply seasonal patterns' : 'Appliquer les tendances saisonnières'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
        <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.05)' }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}>
              <TrendingDown className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Total OpEx' : 'Total OpEx'}
            </span>
          </div>
          <p className="text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            {formatCurrency(totals.totalOpex)}
          </p>
          <p className="text-xs flex items-center gap-1" style={{ color: 'rgb(var(--color-success))' }}>
            <ArrowUpRight className="w-3 h-3" />
            {formatCurrency(totals.projectedOpex)} {isEn ? 'projected' : 'projeté'}
          </p>
        </div>
        
        <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgb(var(--color-warning) / 0.05)' }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--color-warning) / 0.1)' }}>
              <TrendingUp className="w-4 h-4" style={{ color: 'rgb(var(--color-warning))' }} />
            </div>
            <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Total CapEx' : 'Total CapEx'}
            </span>
          </div>
          <p className="text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            {formatCurrency(totals.totalCapex)}
          </p>
          <p className="text-xs flex items-center gap-1" style={{ color: 'rgb(var(--color-warning))' }}>
            <ArrowUpRight className="w-3 h-3" />
            {formatCurrency(totals.projectedCapex)} {isEn ? 'projected' : 'projeté'}
          </p>
        </div>
        
        <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgb(var(--color-success) / 0.05)' }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}>
              <Target className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
            </div>
            <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Monthly Avg' : 'Moy. mensuelle'}
            </span>
          </div>
          <p className="text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            {formatCurrency((totals.totalOpex + totals.totalCapex) / historical.length)}
          </p>
          <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {historical.length} {isEn ? 'months data' : 'mois de données'}
          </p>
        </div>
        
        <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgb(var(--color-info) / 0.05)' }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--color-info) / 0.1)' }}>
              <Calendar className="w-4 h-4" style={{ color: 'rgb(var(--color-info))' }} />
            </div>
            <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Projection' : 'Projection'}
            </span>
          </div>
          <p className="text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            {projected.length} {isEn ? 'months' : 'mois'}
          </p>
          <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {settings.growthRate}% {isEn ? 'growth' : 'croissance'}
          </p>
        </div>
      </div>
      
      {/* Category Toggle */}
      <div className="px-4 pb-3 flex flex-wrap gap-2">
        <button
          onClick={() => setConfig(c => ({ ...c, showOpex: !c.showOpex }))}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
          style={{
            backgroundColor: config.showOpex ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-bg-muted))',
            color: config.showOpex ? 'white' : 'rgb(var(--color-text-muted))',
          }}
        >
          {config.showOpex ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          OpEx
        </button>
        <button
          onClick={() => setConfig(c => ({ ...c, showCapex: !c.showCapex }))}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
          style={{
            backgroundColor: config.showCapex ? 'rgb(var(--color-warning))' : 'rgb(var(--color-bg-muted))',
            color: config.showCapex ? 'white' : 'rgb(var(--color-text-muted))',
          }}
        >
          {config.showCapex ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          CapEx
        </button>
        
        <div className="w-px h-6 mx-1" style={{ backgroundColor: 'rgb(var(--color-border))' }} />
        
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => toggleCategory(cat.id)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
            style={{
              backgroundColor: visibleCategories.has(cat.id) ? `${cat.color}20` : 'rgb(var(--color-bg-muted))',
              color: visibleCategories.has(cat.id) ? cat.color : 'rgb(var(--color-text-muted))',
              border: visibleCategories.has(cat.id) ? `1px solid ${cat.color}` : '1px solid transparent',
            }}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: visibleCategories.has(cat.id) ? cat.color : 'rgb(var(--color-text-muted))' }} />
            {isEn ? cat.nameEn : cat.name}
          </button>
        ))}
      </div>
      
      {/* Chart */}
      <div className="px-4 pb-4">
        <div className="relative" style={{ height: chartHeight }}>
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Grid */}
            {[0, 25, 50, 75, 100].map(y => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke="rgb(var(--color-border))"
                strokeWidth="0.2"
                strokeDasharray="1,1"
                opacity="0.5"
              />
            ))}
            
            {/* Projection divider */}
            {(() => {
              const projectionStart = historical.length / filteredData.length * 100;
              if (projectionStart > 0 && projectionStart < 100) {
                return (
                  <line
                    x1={projectionStart}
                    y1="0"
                    x2={projectionStart}
                    y2="100"
                    stroke="rgb(var(--color-text-muted))"
                    strokeWidth="0.3"
                    strokeDasharray="2,2"
                  />
                );
              }
              return null;
            })()}
            
            {/* Chart content based on type */}
            {renderChart()}
          </svg>
          
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] -ml-1 pointer-events-none" style={{ color: 'rgb(var(--color-text-muted))' }}>
            <span>{formatCurrency(maxValue)}</span>
            <span>{formatCurrency(maxValue / 2)}</span>
            <span>$0</span>
          </div>
          
          {/* Hover tooltip */}
          {hoveredPoint && (() => {
            const data = filteredData.find(d => d.month === hoveredPoint.month);
            if (!data) return null;
            
            const isProjected = !historical.find(h => h.month === hoveredPoint.month);
            
            return (
              <div
                className="fixed z-50 p-3 rounded-xl shadow-xl text-xs"
                style={{
                  left: hoveredPoint.x + 10,
                  top: hoveredPoint.y - 10,
                  backgroundColor: 'rgb(30, 30, 30)',
                  border: '1px solid rgb(50, 50, 50)',
                  minWidth: 200,
                }}
              >
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-700">
                  <span className="font-semibold text-white">{formatMonth(data.month)}</span>
                  {isProjected && (
                    <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.2)', color: 'rgb(var(--color-primary-400))' }}>
                      {isEn ? 'Projected' : 'Projeté'}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  {categories.filter(c => visibleCategories.has(c.id)).map(cat => (
                    <div key={cat.id} className="flex justify-between gap-4">
                      <span className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? cat.nameEn : cat.name}</span>
                      </span>
                      <span className="text-white font-medium">{formatCurrency(data.categories[cat.id] || 0)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between gap-4 pt-1 mt-1 border-t border-gray-700">
                    <span className="text-gray-400">{isEn ? 'Total' : 'Total'}</span>
                    <span className="text-white font-bold">{formatCurrency(data.total)}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
        
        {/* X-axis labels */}
        <div className="flex justify-between mt-2 text-[10px] px-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {filteredData.filter((_, i) => i % Math.ceil(filteredData.length / 8) === 0).map((d, i) => (
            <span key={i}>{formatMonth(d.month)}</span>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgb(var(--color-primary-500))' }} />
            <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Historical' : 'Historique'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded opacity-60" style={{ backgroundColor: 'rgb(var(--color-primary-500))', border: '1px dashed rgb(var(--color-primary-500))' }} />
            <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Projected' : 'Projeté'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
