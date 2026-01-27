/**
 * Board Panel Renderer Component
 * Renders different panel types with their specific content
 */

import { useState, useMemo } from 'react';
import {
  Settings,
  Trash2,
  GripVertical,
  Maximize2,
  Minimize2,
  Edit3,
  Check,
  X,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Scale,
  PieChart,
  Activity,
  Target,
  Layers,
  Heart,
} from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { type BoardPanel, type PanelSize } from '../../lib/boardMeeting';

interface BoardPanelRendererProps {
  panel: BoardPanel;
  onUpdate: (panel: BoardPanel) => void;
  onDelete: (panelId: string) => void;
  onResize: (panelId: string, size: PanelSize) => void;
  isDragging?: boolean;
  financialData?: any;
  anomalyData?: any;
  montageData?: any;
  strategicData?: any;
}

export default function BoardPanelRenderer({
  panel,
  onUpdate,
  onDelete,
  onResize,
  isDragging = false,
  financialData,
  anomalyData,
  montageData,
  strategicData,
}: BoardPanelRendererProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(isEn ? panel.titleEn : panel.title);
  const [showSettings, setShowSettings] = useState(false);

  const handleSaveTitle = () => {
    onUpdate({
      ...panel,
      title: isEn ? panel.title : editTitle,
      titleEn: isEn ? editTitle : panel.titleEn,
      updatedAt: new Date().toISOString(),
    });
    setIsEditing(false);
  };

  const sizeClasses: Record<PanelSize, string> = {
    small: 'col-span-1',
    medium: 'col-span-1 md:col-span-2',
    large: 'col-span-1 md:col-span-2 lg:col-span-3',
    full: 'col-span-full',
  };

  const renderPanelContent = () => {
    switch (panel.type) {
      case 'balance_sheet':
        return <BalanceSheetPanel data={financialData} isEn={isEn} />;
      case 'income_statement':
        return <IncomeStatementPanel data={financialData} isEn={isEn} />;
      case 'cash_flow':
        return <CashFlowPanel data={financialData} isEn={isEn} />;
      case 'anomaly_summary':
        return <AnomalySummaryPanel data={anomalyData} isEn={isEn} />;
      case 'anomaly_list':
        return <AnomalyListPanel data={anomalyData} isEn={isEn} />;
      case 'montage_financier':
        return <MontageFinancierPanel data={montageData} isEn={isEn} />;
      case 'kpi_metrics':
        return <KPIMetricsPanel data={financialData} isEn={isEn} />;
      case 'health_score':
        return <HealthScorePanel data={anomalyData} isEn={isEn} />;
      case 'runway_chart':
        return <RunwayChartPanel data={strategicData} isEn={isEn} />;
      case 'expense_breakdown':
        return <ExpenseBreakdownPanel data={financialData} isEn={isEn} />;
      case 'revenue_trend':
        return <RevenueTrendPanel data={financialData} isEn={isEn} />;
      case 'ratio_analysis':
        return <RatioAnalysisPanel data={financialData} isEn={isEn} />;
      case 'strategic_metrics':
        return <StrategicMetricsPanel data={strategicData} isEn={isEn} />;
      case 'cash_forecast':
        return <CashForecastPanel data={strategicData} isEn={isEn} />;
      case 'variance_analysis':
        return <VarianceAnalysisPanel data={financialData} isEn={isEn} />;
      case 'action_items':
        return <ActionItemsPanel data={financialData} isEn={isEn} />;
      case 'text_block':
        return <TextBlockPanel panel={panel} onUpdate={onUpdate} isEn={isEn} />;
      case 'custom_chart':
        return <CustomChartPanel panel={panel} data={financialData} isEn={isEn} />;
      default:
        return (
          <div className="flex items-center justify-center h-48 text-center">
            <p style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Panel content not available' : 'Contenu du panneau non disponible'}
            </p>
          </div>
        );
    }
  };

  return (
    <div 
      className={`rounded-xl border overflow-hidden transition-all ${sizeClasses[panel.size]} ${isDragging ? 'opacity-50 scale-95' : ''}`}
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        borderColor: 'rgb(var(--color-border))',
      }}
    >
      {/* Panel Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'rgb(var(--color-border))' }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="cursor-move p-1 rounded hover:bg-black/5" title={isEn ? 'Drag to reorder' : 'Glisser pour réorganiser'}>
            <GripVertical className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
          </div>
          
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="flex-1 px-2 py-1 rounded border text-sm font-medium"
                style={{
                  backgroundColor: 'rgb(var(--color-bg-muted))',
                  borderColor: 'rgb(var(--color-border))',
                  color: 'rgb(var(--color-text))',
                }}
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
              />
              <button 
                onClick={handleSaveTitle}
                className="p-1 rounded hover:bg-black/5"
              >
                <Check className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
              </button>
              <button 
                onClick={() => setIsEditing(false)}
                className="p-1 rounded hover:bg-black/5"
              >
                <X className="w-4 h-4" style={{ color: 'rgb(var(--color-error))' }} />
              </button>
            </div>
          ) : (
            <h3 
              className="font-medium text-sm truncate cursor-pointer hover:text-primary-600"
              onClick={() => setIsEditing(true)}
              style={{ color: 'rgb(var(--color-text))' }}
              title={isEn ? 'Click to edit title' : 'Cliquer pour modifier le titre'}
            >
              {isEn ? panel.titleEn : panel.title}
            </h3>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded hover:bg-black/5 transition-colors"
            title={isEn ? 'Settings' : 'Paramètres'}
          >
            <Settings className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
          </button>
          <button
            onClick={() => onDelete(panel.id)}
            className="p-1.5 rounded hover:bg-red-50 transition-colors"
            title={isEn ? 'Remove panel' : 'Supprimer le panneau'}
          >
            <Trash2 className="w-4 h-4" style={{ color: 'rgb(var(--color-error))' }} />
          </button>
        </div>
      </div>

      {/* Panel Settings */}
      {showSettings && (
        <div 
          className="px-4 py-3 border-b"
          style={{ 
            backgroundColor: 'rgb(var(--color-bg-muted))',
            borderColor: 'rgb(var(--color-border))',
          }}
        >
          <div className="flex items-center gap-4">
            <label className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn ? 'Panel size:' : 'Taille du panneau:'}
            </label>
            <div className="flex gap-2">
              {(['small', 'medium', 'large', 'full'] as PanelSize[]).map(size => (
                <button
                  key={size}
                  onClick={() => onResize(panel.id, size)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    panel.size === size ? 'text-white' : ''
                  }`}
                  style={{
                    backgroundColor: panel.size === size 
                      ? 'rgb(var(--color-primary-500))' 
                      : 'rgb(var(--color-surface))',
                    color: panel.size === size 
                      ? 'white' 
                      : 'rgb(var(--color-text-secondary))',
                  }}
                >
                  {size === 'small' && (isEn ? 'Small' : 'Petit')}
                  {size === 'medium' && (isEn ? 'Medium' : 'Moyen')}
                  {size === 'large' && (isEn ? 'Large' : 'Grand')}
                  {size === 'full' && (isEn ? 'Full' : 'Plein')}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Panel Content */}
      <div className="p-4">
        {renderPanelContent()}
      </div>
    </div>
  );
}

// ============================================================================
// Individual Panel Components
// ============================================================================

function BalanceSheetPanel({ data, isEn }: { data: any; isEn: boolean }) {
  // Mock data for demonstration
  const mockData = {
    totalAssets: 598000,
    totalLiabilities: 183000,
    equity: 415000,
    currentAssets: 245000,
    fixedAssets: 353000,
    currentLiabilities: 73000,
    longTermDebt: 110000,
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 }).format(value);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div 
          className="p-3 rounded-lg"
          style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
        >
          <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Total Assets' : 'Total Actifs'}
          </p>
          <p className="text-lg font-bold" style={{ color: 'rgb(var(--color-primary-600))' }}>
            {formatCurrency(mockData.totalAssets)}
          </p>
        </div>
        <div 
          className="p-3 rounded-lg"
          style={{ backgroundColor: 'rgb(var(--color-warning) / 0.1)' }}
        >
          <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Liabilities' : 'Passifs'}
          </p>
          <p className="text-lg font-bold" style={{ color: 'rgb(var(--color-warning))' }}>
            {formatCurrency(mockData.totalLiabilities)}
          </p>
        </div>
        <div 
          className="p-3 rounded-lg"
          style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}
        >
          <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Equity' : 'Capitaux propres'}
          </p>
          <p className="text-lg font-bold" style={{ color: 'rgb(var(--color-success))' }}>
            {formatCurrency(mockData.equity)}
          </p>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span style={{ color: 'rgb(var(--color-text-secondary))' }}>{isEn ? 'Current Assets' : 'Actifs courants'}</span>
          <span className="font-mono" style={{ color: 'rgb(var(--color-text))' }}>{formatCurrency(mockData.currentAssets)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: 'rgb(var(--color-text-secondary))' }}>{isEn ? 'Fixed Assets' : 'Immobilisations'}</span>
          <span className="font-mono" style={{ color: 'rgb(var(--color-text))' }}>{formatCurrency(mockData.fixedAssets)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: 'rgb(var(--color-text-secondary))' }}>{isEn ? 'Current Liabilities' : 'Passifs courants'}</span>
          <span className="font-mono" style={{ color: 'rgb(var(--color-text))' }}>{formatCurrency(mockData.currentLiabilities)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: 'rgb(var(--color-text-secondary))' }}>{isEn ? 'Long-term Debt' : 'Dette long terme'}</span>
          <span className="font-mono" style={{ color: 'rgb(var(--color-text))' }}>{formatCurrency(mockData.longTermDebt)}</span>
        </div>
      </div>
    </div>
  );
}

function IncomeStatementPanel({ data, isEn }: { data: any; isEn: boolean }) {
  const mockData = {
    revenue: 193596,
    expenses: 158000,
    grossProfit: 82230,
    netProfit: 35596,
    grossMargin: 42.5,
    netMargin: 18.4,
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 }).format(value);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs mb-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Revenue' : 'Revenus'}
          </p>
          <p className="text-xl font-bold" style={{ color: 'rgb(var(--color-success))' }}>
            {formatCurrency(mockData.revenue)}
          </p>
        </div>
        <div>
          <p className="text-xs mb-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Expenses' : 'Dépenses'}
          </p>
          <p className="text-xl font-bold" style={{ color: 'rgb(var(--color-error))' }}>
            {formatCurrency(mockData.expenses)}
          </p>
        </div>
      </div>
      
      <div 
        className="p-4 rounded-lg"
        style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}
      >
        <p className="text-sm mb-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
          {isEn ? 'Net Profit' : 'Bénéfice net'}
        </p>
        <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-success))' }}>
          {formatCurrency(mockData.netProfit)}
        </p>
        <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-success))' }}>
          {mockData.netMargin.toFixed(1)}% {isEn ? 'margin' : 'marge'}
        </p>
      </div>
    </div>
  );
}

function CashFlowPanel({ data, isEn }: { data: any; isEn: boolean }) {
  const mockData = {
    operating: 85000,
    investing: -45000,
    financing: -25000,
    netChange: 15000,
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, signDisplay: 'always' }).format(value);

  return (
    <div className="space-y-3">
      {[
        { label: isEn ? 'Operating' : 'Opérations', value: mockData.operating },
        { label: isEn ? 'Investing' : 'Investissement', value: mockData.investing },
        { label: isEn ? 'Financing' : 'Financement', value: mockData.financing },
      ].map((item, i) => (
        <div key={i} className="flex justify-between items-center">
          <span className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{item.label}</span>
          <span 
            className="font-mono font-medium"
            style={{ color: item.value >= 0 ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))' }}
          >
            {formatCurrency(item.value)}
          </span>
        </div>
      ))}
      <div 
        className="pt-3 mt-2 border-t flex justify-between items-center"
        style={{ borderColor: 'rgb(var(--color-border))' }}
      >
        <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Net Change' : 'Variation nette'}
        </span>
        <span 
          className="font-mono font-bold text-lg"
          style={{ color: mockData.netChange >= 0 ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))' }}
        >
          {formatCurrency(mockData.netChange)}
        </span>
      </div>
    </div>
  );
}

function AnomalySummaryPanel({ data, isEn }: { data: any; isEn: boolean }) {
  const mockData = {
    healthScore: 72,
    critical: 3,
    warning: 7,
    info: 10,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgb(var(--color-border))" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={mockData.healthScore >= 70 ? 'rgb(var(--color-success))' : mockData.healthScore >= 50 ? 'rgb(var(--color-warning))' : 'rgb(var(--color-error))'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${mockData.healthScore * 2.51} 251`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>{mockData.healthScore}</span>
            <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>/100</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-error) / 0.1)' }}>
          <p className="text-lg font-bold" style={{ color: 'rgb(var(--color-error))' }}>{mockData.critical}</p>
          <p className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Critical' : 'Critiques'}
          </p>
        </div>
        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-warning) / 0.1)' }}>
          <p className="text-lg font-bold" style={{ color: 'rgb(var(--color-warning))' }}>{mockData.warning}</p>
          <p className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>Attention</p>
        </div>
        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-info) / 0.1)' }}>
          <p className="text-lg font-bold" style={{ color: 'rgb(var(--color-info))' }}>{mockData.info}</p>
          <p className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>Info</p>
        </div>
      </div>
    </div>
  );
}

function AnomalyListPanel({ data, isEn }: { data: any; isEn: boolean }) {
  const mockAnomalies = [
    { severity: 'critical', title: isEn ? 'AR aging increasing' : 'Vieillissement CR en hausse', value: '+25%' },
    { severity: 'critical', title: isEn ? 'Inventory turnover low' : 'Rotation stocks faible', value: '2.1x' },
    { severity: 'warning', title: isEn ? 'Operating expense variance' : 'Variance charges exploitation', value: '+8%' },
    { severity: 'warning', title: isEn ? 'Revenue below forecast' : 'Revenus sous prévision', value: '-5%' },
  ];

  const severityColors = {
    critical: 'rgb(var(--color-error))',
    warning: 'rgb(var(--color-warning))',
    info: 'rgb(var(--color-info))',
  };

  return (
    <div className="space-y-2">
      {mockAnomalies.map((anomaly, i) => (
        <div 
          key={i}
          className="flex items-center gap-3 p-2 rounded-lg border-l-2"
          style={{ 
            backgroundColor: 'rgb(var(--color-bg-muted))',
            borderColor: severityColors[anomaly.severity as keyof typeof severityColors],
          }}
        >
          <AlertTriangle 
            className="w-4 h-4 flex-shrink-0" 
            style={{ color: severityColors[anomaly.severity as keyof typeof severityColors] }} 
          />
          <span className="flex-1 text-sm" style={{ color: 'rgb(var(--color-text))' }}>
            {anomaly.title}
          </span>
          <span 
            className="text-sm font-mono font-medium"
            style={{ color: severityColors[anomaly.severity as keyof typeof severityColors] }}
          >
            {anomaly.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function MontageFinancierPanel({ data, isEn }: { data: any; isEn: boolean }) {
  const mockData = {
    totalProject: 500000,
    totalFinancing: 480000,
    sources: [
      { name: isEn ? 'Bank Loan' : 'Prêt bancaire', amount: 250000, type: 'debt' },
      { name: isEn ? 'Equity' : 'Fonds propres', amount: 150000, type: 'equity' },
      { name: isEn ? 'Grant' : 'Subvention', amount: 80000, type: 'grant' },
    ],
    gap: 20000,
  };

  const typeColors = {
    debt: 'rgb(var(--color-warning))',
    equity: 'rgb(var(--color-success))',
    grant: 'rgb(var(--color-primary-500))',
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 }).format(value);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
          <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Project Cost' : 'Coût du projet'}
          </p>
          <p className="text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            {formatCurrency(mockData.totalProject)}
          </p>
        </div>
        <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
          <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Financing' : 'Financement'}
          </p>
          <p className="text-lg font-bold" style={{ color: 'rgb(var(--color-success))' }}>
            {formatCurrency(mockData.totalFinancing)}
          </p>
        </div>
      </div>
      
      <div className="space-y-2">
        {mockData.sources.map((source, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: typeColors[source.type as keyof typeof typeColors] }}
              />
              <span style={{ color: 'rgb(var(--color-text-secondary))' }}>{source.name}</span>
            </div>
            <span className="font-mono" style={{ color: 'rgb(var(--color-text))' }}>
              {formatCurrency(source.amount)}
            </span>
          </div>
        ))}
      </div>
      
      {mockData.gap > 0 && (
        <div 
          className="p-2 rounded-lg text-center"
          style={{ backgroundColor: 'rgb(var(--color-error) / 0.1)' }}
        >
          <p className="text-xs" style={{ color: 'rgb(var(--color-error))' }}>
            {isEn ? 'Financing Gap' : 'Écart de financement'}: {formatCurrency(mockData.gap)}
          </p>
        </div>
      )}
    </div>
  );
}

function KPIMetricsPanel({ data, isEn }: { data: any; isEn: boolean }) {
  const mockKPIs = [
    { name: isEn ? 'Current Ratio' : 'Ratio liquidité', value: '3.51x', target: '2.0x', good: true },
    { name: isEn ? 'Quick Ratio' : 'Ratio immédiat', value: '2.99x', target: '1.5x', good: true },
    { name: 'DSO', value: '38d', target: '45d', good: true },
    { name: isEn ? 'Gross Margin' : 'Marge brute', value: '42.5%', target: '40%', good: true },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {mockKPIs.map((kpi, i) => (
        <div 
          key={i}
          className="p-3 rounded-lg border"
          style={{ 
            borderColor: kpi.good ? 'rgb(var(--color-success) / 0.3)' : 'rgb(var(--color-warning) / 0.3)',
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{kpi.name}</span>
            {kpi.good ? (
              <CheckCircle className="w-3 h-3" style={{ color: 'rgb(var(--color-success))' }} />
            ) : (
              <AlertCircle className="w-3 h-3" style={{ color: 'rgb(var(--color-warning))' }} />
            )}
          </div>
          <p className="text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>{kpi.value}</p>
          <p className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Target' : 'Cible'}: {kpi.target}
          </p>
        </div>
      ))}
    </div>
  );
}

function HealthScorePanel({ data, isEn }: { data: any; isEn: boolean }) {
  const score = 72;
  const status = score >= 70 ? 'good' : score >= 50 ? 'warning' : 'critical';
  
  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div className="relative w-24 h-24 mb-3">
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgb(var(--color-border))" strokeWidth="10" />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={status === 'good' ? 'rgb(var(--color-success))' : status === 'warning' ? 'rgb(var(--color-warning))' : 'rgb(var(--color-error))'}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${score * 2.51} 251`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Heart 
            className="w-8 h-8" 
            style={{ color: status === 'good' ? 'rgb(var(--color-success))' : status === 'warning' ? 'rgb(var(--color-warning))' : 'rgb(var(--color-error))' }}
          />
        </div>
      </div>
      <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>{score}/100</p>
      <p className="text-sm" style={{ color: status === 'good' ? 'rgb(var(--color-success))' : status === 'warning' ? 'rgb(var(--color-warning))' : 'rgb(var(--color-error))' }}>
        {status === 'good' && (isEn ? 'Healthy' : 'Sain')}
        {status === 'warning' && (isEn ? 'Needs attention' : 'À surveiller')}
        {status === 'critical' && (isEn ? 'Critical' : 'Critique')}
      </p>
    </div>
  );
}

function RunwayChartPanel({ data, isEn }: { data: any; isEn: boolean }) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const values = [850, 780, 710, 640, 570, 500, 430, 360, 290, 220, 150, 80];
  const maxValue = Math.max(...values);

  return (
    <div className="h-48">
      <svg viewBox="0 0 400 150" className="w-full h-full">
        {/* Grid */}
        {[0, 1, 2, 3].map(i => (
          <line
            key={i}
            x1="40"
            y1={20 + i * 40}
            x2="390"
            y2={20 + i * 40}
            stroke="rgb(var(--color-border))"
            strokeWidth="0.5"
            strokeDasharray="2"
          />
        ))}
        
        {/* Area */}
        <path
          d={`M 40 140 ${values.map((v, i) => `L ${40 + (i * 30)} ${140 - (v / maxValue * 120)}`).join(' ')} L 370 140 Z`}
          fill="rgb(var(--color-error))"
          fillOpacity="0.1"
        />
        
        {/* Line */}
        <path
          d={`M ${values.map((v, i) => `${40 + (i * 30)} ${140 - (v / maxValue * 120)}`).join(' L ')}`}
          fill="none"
          stroke="rgb(var(--color-error))"
          strokeWidth="2"
          strokeLinecap="round"
        />
        
        {/* Zero line warning */}
        <line x1="40" y1="140" x2="390" y2="140" stroke="rgb(var(--color-error))" strokeWidth="1" strokeDasharray="4" />
      </svg>
      
      <div className="flex justify-between px-4 mt-2">
        {months.filter((_, i) => i % 3 === 0).map((m, i) => (
          <span key={i} className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>{m}</span>
        ))}
      </div>
    </div>
  );
}

function ExpenseBreakdownPanel({ data, isEn }: { data: any; isEn: boolean }) {
  const expenses = [
    { name: isEn ? 'Payroll' : 'Salaires', value: 45, color: '#3B82F6' },
    { name: isEn ? 'Operations' : 'Opérations', value: 25, color: '#10B981' },
    { name: 'Marketing', value: 15, color: '#F59E0B' },
    { name: 'R&D', value: 10, color: '#8B5CF6' },
    { name: isEn ? 'Other' : 'Autres', value: 5, color: '#6B7280' },
  ];

  return (
    <div className="flex items-center gap-4">
      <div className="w-24 h-24 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
          {(() => {
            let cumulative = 0;
            return expenses.map((d, i) => {
              const start = cumulative;
              cumulative += d.value;
              const startAngle = (start / 100) * 2 * Math.PI;
              const endAngle = (cumulative / 100) * 2 * Math.PI;
              const x1 = 50 + 40 * Math.cos(startAngle);
              const y1 = 50 + 40 * Math.sin(startAngle);
              const x2 = 50 + 40 * Math.cos(endAngle);
              const y2 = 50 + 40 * Math.sin(endAngle);
              const largeArc = d.value > 50 ? 1 : 0;
              
              return (
                <path
                  key={i}
                  d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={d.color}
                />
              );
            });
          })()}
        </svg>
      </div>
      <div className="flex-1 space-y-1">
        {expenses.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
            <span className="flex-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>{d.name}</span>
            <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevenueTrendPanel({ data, isEn }: { data: any; isEn: boolean }) {
  const values = [142, 138, 155, 148, 162, 171, 165, 178, 185, 192, 198, 193];
  const maxValue = Math.max(...values);

  return (
    <div className="h-32">
      <svg viewBox="0 0 300 100" className="w-full h-full">
        <path
          d={`M 10 90 ${values.map((v, i) => `L ${10 + i * 25} ${90 - (v / maxValue * 70)}`).join(' ')}`}
          fill="none"
          stroke="rgb(var(--color-success))"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {values.map((v, i) => (
          <circle
            key={i}
            cx={10 + i * 25}
            cy={90 - (v / maxValue * 70)}
            r="3"
            fill="rgb(var(--color-success))"
          />
        ))}
      </svg>
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn ? 'Last 12 months' : '12 derniers mois'}
        </span>
        <div className="flex items-center gap-1">
          <TrendingUp className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
          <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-success))' }}>+36%</span>
        </div>
      </div>
    </div>
  );
}

function RatioAnalysisPanel({ data, isEn }: { data: any; isEn: boolean }) {
  const ratios = [
    { name: isEn ? 'Current Ratio' : 'Ratio liquidité', value: 3.51, benchmark: 2.0 },
    { name: isEn ? 'Quick Ratio' : 'Ratio immédiat', value: 2.99, benchmark: 1.5 },
    { name: isEn ? 'Debt/Equity' : 'Dette/Capitaux', value: 0.45, benchmark: 0.5 },
  ];

  return (
    <div className="space-y-3">
      {ratios.map((r, i) => {
        const percentage = Math.min(100, (r.value / (r.benchmark * 2)) * 100);
        return (
          <div key={i}>
            <div className="flex justify-between text-sm mb-1">
              <span style={{ color: 'rgb(var(--color-text-secondary))' }}>{r.name}</span>
              <span className="font-mono font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                {r.value.toFixed(2)}x
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
              <div 
                className="h-full rounded-full"
                style={{ 
                  width: `${percentage}%`,
                  backgroundColor: r.value >= r.benchmark ? 'rgb(var(--color-success))' : 'rgb(var(--color-warning))',
                }}
              />
            </div>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Benchmark' : 'Référence'}: {r.benchmark.toFixed(1)}x
            </p>
          </div>
        );
      })}
    </div>
  );
}

function StrategicMetricsPanel({ data, isEn }: { data: any; isEn: boolean }) {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 }).format(value);

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}>
        <DollarSign className="w-4 h-4 mb-1" style={{ color: 'rgb(var(--color-success))' }} />
        <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn ? 'Cash' : 'Trésorerie'}
        </p>
        <p className="text-lg font-bold" style={{ color: 'rgb(var(--color-success))' }}>
          {formatCurrency(850000)}
        </p>
      </div>
      <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-error) / 0.1)' }}>
        <TrendingDown className="w-4 h-4 mb-1" style={{ color: 'rgb(var(--color-error))' }} />
        <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Burn Rate</p>
        <p className="text-lg font-bold" style={{ color: 'rgb(var(--color-error))' }}>
          {formatCurrency(115417)}/mo
        </p>
      </div>
      <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}>
        <Activity className="w-4 h-4 mb-1" style={{ color: 'rgb(var(--color-primary-500))' }} />
        <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn ? 'Runway' : 'Autonomie'}
        </p>
        <p className="text-lg font-bold" style={{ color: 'rgb(var(--color-primary-600))' }}>
          7.4 {isEn ? 'months' : 'mois'}
        </p>
      </div>
      <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}>
        <CheckCircle className="w-4 h-4 mb-1" style={{ color: 'rgb(var(--color-success))' }} />
        <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn ? 'Status' : 'Statut'}
        </p>
        <p className="text-lg font-bold" style={{ color: 'rgb(var(--color-success))' }}>
          {isEn ? 'Sustainable' : 'Durable'}
        </p>
      </div>
    </div>
  );
}

function CashForecastPanel({ data, isEn }: { data: any; isEn: boolean }) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const inflows = [150, 160, 155, 170, 165, 180];
  const outflows = [140, 145, 150, 155, 145, 160];
  const maxValue = Math.max(...inflows, ...outflows);

  return (
    <div className="h-40">
      <svg viewBox="0 0 300 120" className="w-full h-full">
        {/* Inflows */}
        <path
          d={`M 25 ${100 - (inflows[0] / maxValue * 80)} ${inflows.map((v, i) => `L ${25 + i * 55} ${100 - (v / maxValue * 80)}`).join(' ')}`}
          fill="none"
          stroke="rgb(var(--color-success))"
          strokeWidth="2"
        />
        {/* Outflows */}
        <path
          d={`M 25 ${100 - (outflows[0] / maxValue * 80)} ${outflows.map((v, i) => `L ${25 + i * 55} ${100 - (v / maxValue * 80)}`).join(' ')}`}
          fill="none"
          stroke="rgb(var(--color-error))"
          strokeWidth="2"
          strokeDasharray="4"
        />
      </svg>
      <div className="flex justify-center gap-6 mt-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5" style={{ backgroundColor: 'rgb(var(--color-success))' }} />
          <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Inflows' : 'Entrées'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 border-dashed" style={{ borderBottom: '2px dashed rgb(var(--color-error))' }} />
          <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Outflows' : 'Sorties'}
          </span>
        </div>
      </div>
    </div>
  );
}

function VarianceAnalysisPanel({ data, isEn }: { data: any; isEn: boolean }) {
  const variances = [
    { account: isEn ? 'Revenue' : 'Revenus', budget: 180000, actual: 193596, variance: 7.5 },
    { account: isEn ? 'COGS' : 'CMV', budget: 100000, actual: 111366, variance: -11.4 },
    { account: isEn ? 'OpEx' : 'Charges', budget: 45000, actual: 46634, variance: -3.6 },
    { account: isEn ? 'Net Income' : 'Bénéfice net', budget: 35000, actual: 35596, variance: 1.7 },
  ];

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 }).format(value);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid rgb(var(--color-border))' }}>
            <th className="text-left py-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>{isEn ? 'Account' : 'Compte'}</th>
            <th className="text-right py-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>Budget</th>
            <th className="text-right py-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>{isEn ? 'Actual' : 'Réel'}</th>
            <th className="text-right py-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>Var.</th>
          </tr>
        </thead>
        <tbody>
          {variances.map((v, i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgb(var(--color-border) / 0.5)' }}>
              <td className="py-2" style={{ color: 'rgb(var(--color-text))' }}>{v.account}</td>
              <td className="text-right font-mono py-2" style={{ color: 'rgb(var(--color-text-muted))' }}>{formatCurrency(v.budget)}</td>
              <td className="text-right font-mono py-2" style={{ color: 'rgb(var(--color-text))' }}>{formatCurrency(v.actual)}</td>
              <td 
                className="text-right font-mono font-medium py-2"
                style={{ color: v.variance >= 0 ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))' }}
              >
                {v.variance >= 0 ? '+' : ''}{v.variance.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActionItemsPanel({ data, isEn }: { data: any; isEn: boolean }) {
  const items = [
    { task: isEn ? 'Review AR aging report' : 'Revoir rapport CR', owner: 'CFO', due: '2026-02-15', priority: 'high' },
    { task: isEn ? 'Optimize inventory' : 'Optimiser stocks', owner: 'Ops', due: '2026-02-28', priority: 'medium' },
    { task: isEn ? 'Cost reduction plan' : 'Plan réduction coûts', owner: 'Finance', due: '2026-03-15', priority: 'medium' },
  ];

  const priorityColors = {
    high: 'rgb(var(--color-error))',
    medium: 'rgb(var(--color-warning))',
    low: 'rgb(var(--color-info))',
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div 
          key={i}
          className="flex items-center gap-3 p-2 rounded-lg border-l-2"
          style={{ 
            backgroundColor: 'rgb(var(--color-bg-muted))',
            borderColor: priorityColors[item.priority as keyof typeof priorityColors],
          }}
        >
          <Target className="w-4 h-4 flex-shrink-0" style={{ color: priorityColors[item.priority as keyof typeof priorityColors] }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate" style={{ color: 'rgb(var(--color-text))' }}>{item.task}</p>
            <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{item.owner} • {item.due}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TextBlockPanel({ panel, onUpdate, isEn }: { panel: BoardPanel; onUpdate: (panel: BoardPanel) => void; isEn: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(panel.customContent || '');

  const handleSave = () => {
    onUpdate({
      ...panel,
      customContent: content,
      updatedAt: new Date().toISOString(),
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          className="w-full p-3 rounded-lg border text-sm resize-none"
          rows={4}
          style={{
            backgroundColor: 'rgb(var(--color-bg-muted))',
            borderColor: 'rgb(var(--color-border))',
            color: 'rgb(var(--color-text))',
          }}
          placeholder={isEn ? 'Enter your notes here...' : 'Entrez vos notes ici...'}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setIsEditing(false)}
            className="px-3 py-1.5 rounded text-sm"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            {isEn ? 'Cancel' : 'Annuler'}
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 rounded text-sm text-white"
            style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
          >
            {isEn ? 'Save' : 'Enregistrer'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-[80px] p-3 rounded-lg cursor-pointer hover:bg-black/5 transition-colors"
      style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
      onClick={() => setIsEditing(true)}
    >
      {content ? (
        <p className="text-sm whitespace-pre-wrap" style={{ color: 'rgb(var(--color-text))' }}>{content}</p>
      ) : (
        <p className="text-sm italic" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn ? 'Click to add notes...' : 'Cliquer pour ajouter des notes...'}
        </p>
      )}
    </div>
  );
}

function CustomChartPanel({ panel, data, isEn }: { panel: BoardPanel; data: any; isEn: boolean }) {
  return (
    <div className="flex items-center justify-center h-40 text-center">
      <div>
        <PieChart className="w-12 h-12 mx-auto mb-2 opacity-30" style={{ color: 'rgb(var(--color-text-muted))' }} />
        <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn ? 'Custom chart configuration' : 'Configuration graphique personnalisé'}
        </p>
        <button
          className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ 
            backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
            color: 'rgb(var(--color-primary-600))',
          }}
        >
          {isEn ? 'Configure' : 'Configurer'}
        </button>
      </div>
    </div>
  );
}
