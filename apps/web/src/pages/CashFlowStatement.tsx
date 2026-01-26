import { useState, useMemo } from 'react';
import { ArrowLeft, Download, Calendar, RefreshCw, Printer, Share2, Loader2, AlertTriangle, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { InfoBanner } from '../components/HelpTooltip';
import { useFinancialData } from '../hooks/useFinancialData';
import { useTenant } from '../contexts/TenantContext';
import { useI18n } from '../lib/i18n';
import { ChartTooltip } from '../components/charts/ChartTooltip';

// Period presets type
type PeriodPreset = 'mtd' | 'qtd' | 'ytd' | 'last_month' | 'last_quarter' | 'last_year' | 'custom';

// Helper to get date ranges
function getDateRange(preset: PeriodPreset, customStart?: string, customEnd?: string): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const quarter = Math.floor(month / 3);
  
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  
  switch (preset) {
    case 'mtd':
      return {
        start: formatDate(new Date(year, month, 1)),
        end: formatDate(now),
      };
    case 'qtd':
      return {
        start: formatDate(new Date(year, quarter * 3, 1)),
        end: formatDate(now),
      };
    case 'ytd':
      return {
        start: formatDate(new Date(year, 0, 1)),
        end: formatDate(now),
      };
    case 'last_month':
      const lastMonth = month === 0 ? 11 : month - 1;
      const lastMonthYear = month === 0 ? year - 1 : year;
      return {
        start: formatDate(new Date(lastMonthYear, lastMonth, 1)),
        end: formatDate(new Date(lastMonthYear, lastMonth + 1, 0)),
      };
    case 'last_quarter':
      const lastQuarter = quarter === 0 ? 3 : quarter - 1;
      const lastQuarterYear = quarter === 0 ? year - 1 : year;
      return {
        start: formatDate(new Date(lastQuarterYear, lastQuarter * 3, 1)),
        end: formatDate(new Date(lastQuarterYear, lastQuarter * 3 + 3, 0)),
      };
    case 'last_year':
      return {
        start: formatDate(new Date(year - 1, 0, 1)),
        end: formatDate(new Date(year - 1, 11, 31)),
      };
    case 'custom':
    default:
      return {
        start: customStart || formatDate(new Date(year, 0, 1)),
        end: customEnd || formatDate(now),
      };
  }
}

export default function CashFlowStatement() {
  const { currentTenant } = useTenant();
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const currentYear = new Date().getFullYear();
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('ytd');
  const [customStart, setCustomStart] = useState(`${currentYear}-01-01`);
  const [customEnd, setCustomEnd] = useState(`${currentYear}-12-31`);
  const [showComparison, setShowComparison] = useState(true);
  const [showHelp, setShowHelp] = useState(true);

  // Calculate actual dates based on preset
  const { start: periodStart, end: periodEnd } = getDateRange(
    periodPreset, 
    customStart, 
    customEnd
  );

  // Update custom dates when manually edited
  const handleStartChange = (value: string) => {
    setCustomStart(value);
    setPeriodPreset('custom');
  };

  const handleEndChange = (value: string) => {
    setCustomEnd(value);
    setPeriodPreset('custom');
  };

  const { data: financialData, isLoading, error, refresh } = useFinancialData();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const handleExportPDF = () => {
    const filename = `cash-flow-${periodEnd}.pdf`;
    alert(isEn 
      ? `Generating PDF "${filename}"...\n\nThe report will download automatically.`
      : `Génération du PDF "${filename}"...\n\nLe rapport sera téléchargé automatiquement.`
    );
  };

  const handlePrint = () => window.print();
  
  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: isEn ? 'Cash Flow Statement' : 'Flux de trésorerie', url });
    } else {
      navigator.clipboard.writeText(url);
      alert(isEn ? 'Link copied!' : 'Lien copié!');
    }
  };

  const formatCurrency = (value: number) => {
    const currency = currentTenant?.settings?.currency || 'CAD';
    return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const calculateVariance = (current: number, prior: number) => {
    if (prior === 0) return current === 0 ? 0 : 100;
    return ((current - prior) / Math.abs(prior)) * 100;
  };

  // Generate cash flow data
  const cashFlowData = useMemo(() => {
    if (!financialData) return null;

    return {
      operating: [
        { code: 'OP1', name: 'Résultat net', nameEn: 'Net Income', current: 185000, prior: 162000 },
        { code: 'OP2', name: 'Amortissement', nameEn: 'Depreciation', current: 30000, prior: 28000 },
        { code: 'OP3', name: 'Variation des comptes clients', nameEn: 'Change in Accounts Receivable', current: -29000, prior: -18000 },
        { code: 'OP4', name: 'Variation des stocks', nameEn: 'Change in Inventory', current: 4000, prior: -8000 },
        { code: 'OP5', name: 'Variation des frais payés d\'avance', nameEn: 'Change in Prepaid Expenses', current: -2000, prior: 1000 },
        { code: 'OP6', name: 'Variation des comptes fournisseurs', nameEn: 'Change in Accounts Payable', current: 13000, prior: 8000 },
        { code: 'OP7', name: 'Variation des charges à payer', nameEn: 'Change in Accrued Expenses', current: 7000, prior: 5000 },
      ],
      investing: [
        { code: 'IN1', name: 'Achat d\'immobilisations', nameEn: 'Purchase of Fixed Assets', current: -60000, prior: -45000 },
        { code: 'IN2', name: 'Vente d\'immobilisations', nameEn: 'Sale of Fixed Assets', current: 5000, prior: 8000 },
        { code: 'IN3', name: 'Investissements', nameEn: 'Investments', current: -15000, prior: -10000 },
      ],
      financing: [
        { code: 'FI1', name: 'Émission d\'actions', nameEn: 'Issuance of Shares', current: 0, prior: 50000 },
        { code: 'FI2', name: 'Remboursement de dette', nameEn: 'Debt Repayment', current: -25000, prior: -25000 },
        { code: 'FI3', name: 'Dividendes versés', nameEn: 'Dividends Paid', current: -50000, prior: -40000 },
        { code: 'FI4', name: 'Nouveaux emprunts', nameEn: 'New Borrowings', current: 0, prior: 0 },
      ],
      openingCash: { current: 198000, prior: 152000 },
    };
  }, [financialData]);

  // Calculate totals
  const totals = useMemo(() => {
    if (!cashFlowData) return null;

    const sumSection = (items: Array<{ current: number; prior: number }>) => ({
      current: items.reduce((sum, item) => sum + item.current, 0),
      prior: items.reduce((sum, item) => sum + item.prior, 0),
    });

    const operatingTotal = sumSection(cashFlowData.operating);
    const investingTotal = sumSection(cashFlowData.investing);
    const financingTotal = sumSection(cashFlowData.financing);

    const netChange = {
      current: operatingTotal.current + investingTotal.current + financingTotal.current,
      prior: operatingTotal.prior + investingTotal.prior + financingTotal.prior,
    };

    const closingCash = {
      current: cashFlowData.openingCash.current + netChange.current,
      prior: cashFlowData.openingCash.prior + netChange.prior,
    };

    return {
      operatingTotal,
      investingTotal,
      financingTotal,
      netChange,
      openingCash: cashFlowData.openingCash,
      closingCash,
    };
  }, [cashFlowData]);

  if (isLoading && !financialData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
          <p className="text-muted">{isEn ? 'Loading...' : 'Chargement...'}</p>
        </div>
      </div>
    );
  }

  if (error || !cashFlowData || !totals) {
    return (
      <div className="card p-8 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-error" />
        <h3 className="font-semibold text-lg mb-2">{isEn ? 'Error' : 'Erreur'}</h3>
        <p className="text-muted mb-4">{error?.message || (isEn ? 'Failed to load' : 'Échec du chargement')}</p>
        <button onClick={handleRefresh} className="btn-primary">{isEn ? 'Retry' : 'Réessayer'}</button>
      </div>
    );
  }

  const renderRow = (item: { code: string; name: string; nameEn?: string; current: number; prior: number }, section: string) => {
    const variance = calculateVariance(item.current, item.prior);
    const displayName = isEn && item.nameEn ? item.nameEn : item.name;
    const isPositive = item.current >= 0;
    const isHovered = hoveredRow === item.code;
    const absoluteChange = item.current - item.prior;
    
    // Determine if this is a significant change (>20%)
    const isSignificant = Math.abs(variance) > 20;
    
    return (
      <tr 
        key={item.code} 
        className="transition-colors cursor-pointer relative"
        style={{ 
          backgroundColor: isHovered 
            ? 'rgb(var(--color-primary-500) / 0.08)' 
            : 'transparent' 
        }}
        onMouseEnter={(e) => {
          setHoveredRow(item.code);
          setTooltipPosition({ x: e.clientX, y: e.clientY });
        }}
        onMouseMove={(e) => {
          setTooltipPosition({ x: e.clientX, y: e.clientY });
        }}
        onMouseLeave={() => setHoveredRow(null)}
      >
        <td className="py-2 px-4" style={{ color: isHovered ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text))' }}>
          <div className="flex items-center gap-2">
            {isPositive ? (
              <TrendingUp className="w-3 h-3" style={{ color: 'rgb(var(--color-success))' }} />
            ) : (
              <TrendingDown className="w-3 h-3" style={{ color: 'rgb(var(--color-error))' }} />
            )}
            {displayName}
            {isSignificant && (
              <span 
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: variance >= 0 ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))' }}
              />
            )}
          </div>
        </td>
        <td className="py-2 px-4 text-right font-mono tabular-nums" style={{ color: isPositive ? 'rgb(var(--color-text))' : 'rgb(var(--color-error))' }}>
          {formatCurrency(item.current)}
        </td>
        {showComparison && (
          <>
            <td className="py-2 px-4 text-right font-mono tabular-nums" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {formatCurrency(item.prior)}
            </td>
            <td className="py-2 px-4 text-right font-mono tabular-nums" style={{ color: variance >= 0 ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))' }}>
              {variance >= 0 ? '+' : ''}{variance.toFixed(1)}%
            </td>
          </>
        )}
        
        {/* Tooltip */}
        {isHovered && (
          <ChartTooltip visible={true} position={tooltipPosition}>
            <div className="min-w-[220px]">
              {/* Header */}
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">
                  {section}
                </span>
                {isSignificant && (
                  <AlertTriangle className={`w-4 h-4 ${variance >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                )}
              </div>
              
              {/* Name */}
              <p className="text-white font-medium mb-3">{displayName}</p>
              
              {/* Values */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">{isEn ? 'Current Period' : 'Période actuelle'}</span>
                  <span className={`font-bold ${isPositive ? 'text-white' : 'text-red-400'}`}>
                    {formatCurrency(item.current)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">{isEn ? 'Prior Period' : 'Période précédente'}</span>
                  <span className="text-gray-300">{formatCurrency(item.prior)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-700">
                  <span className="text-gray-400 text-sm">{isEn ? 'Change' : 'Variation'}</span>
                  <span className={`font-medium flex items-center gap-1 ${absoluteChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {absoluteChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {formatCurrency(absoluteChange)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">{isEn ? 'Variance' : 'Écart'}</span>
                  <span className={`font-mono ${variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {variance >= 0 ? '+' : ''}{variance.toFixed(1)}%
                  </span>
                </div>
              </div>
              
              {/* Insight */}
              {isSignificant && (
                <div className={`mt-3 pt-2 border-t border-gray-700 text-xs ${variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {variance >= 0 
                    ? (isEn ? '↑ Significant increase vs prior period' : '↑ Augmentation significative vs période précédente')
                    : (isEn ? '↓ Significant decrease vs prior period' : '↓ Diminution significative vs période précédente')}
                </div>
              )}
              
              {/* Cash flow impact */}
              <div className="mt-3 pt-2 border-t border-gray-700 text-xs text-gray-500">
                {isPositive 
                  ? (isEn ? 'Cash inflow (positive impact)' : 'Entrée de fonds (impact positif)')
                  : (isEn ? 'Cash outflow (negative impact)' : 'Sortie de fonds (impact négatif)')}
              </div>
            </div>
          </ChartTooltip>
        )}
      </tr>
    );
  };

  const renderTotalRow = (label: string, labelEn: string, values: { current: number; prior: number }, isGrandTotal = false) => {
    const variance = calculateVariance(values.current, values.prior);
    const displayLabel = isEn ? labelEn : label;
    const isPositive = values.current >= 0;
    
    return (
      <tr 
        className={isGrandTotal ? 'font-bold' : 'font-semibold'}
        style={{ backgroundColor: isGrandTotal ? 'rgb(var(--color-primary-500) / 0.1)' : 'rgb(var(--color-bg-muted))' }}
      >
        <td className="py-3 px-4" style={{ color: 'rgb(var(--color-text))' }}>{displayLabel}</td>
        <td className="py-3 px-4 text-right font-mono tabular-nums" style={{ color: isPositive ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))' }}>
          {formatCurrency(values.current)}
        </td>
        {showComparison && (
          <>
            <td className="py-3 px-4 text-right font-mono tabular-nums" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {formatCurrency(values.prior)}
            </td>
            <td className="py-3 px-4 text-right font-mono tabular-nums" style={{ color: variance >= 0 ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))' }}>
              {variance >= 0 ? '+' : ''}{variance.toFixed(1)}%
            </td>
          </>
        )}
      </tr>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link to="/app/reports" className="p-2 rounded-lg transition-colors flex-shrink-0" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold truncate" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Cash Flow Statement' : 'Flux de trésorerie'}
            </h2>
            <p className="text-sm hidden sm:block" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn ? 'Statement of Cash Flows' : 'État des flux de trésorerie'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={handleRefresh} disabled={isRefreshing} className="btn-secondary flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? (isEn ? 'Loading...' : 'Chargement...') : (isEn ? 'Refresh' : 'Actualiser')}</span>
          </button>
          <button onClick={handlePrint} className="btn-secondary p-2.5"><Printer className="w-4 h-4" /></button>
          <button onClick={handleShare} className="btn-secondary p-2.5"><Share2 className="w-4 h-4" /></button>
          <button onClick={handleExportPDF} className="btn-primary flex items-center gap-2 whitespace-nowrap">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{isEn ? 'Export PDF' : 'Exporter PDF'}</span>
          </button>
        </div>
      </div>

      {showHelp && (
        <InfoBanner
          type="info"
          title={isEn ? 'Understanding Cash Flow' : 'Comprendre les flux de trésorerie'}
          description={isEn 
            ? 'The cash flow statement shows how cash moves in and out of your business through operations, investments, and financing activities.'
            : 'Le flux de trésorerie montre comment l\'argent entre et sort de votre entreprise à travers les opérations, investissements et activités de financement.'}
          dismissible
          onDismiss={() => setShowHelp(false)}
        />
      )}

      {/* Controls */}
      <div className="card">
        <div className="flex flex-col gap-4">
          {/* Period Presets */}
          <div>
            <label className="label mb-2">{isEn ? 'Quick Period Selection' : 'Sélection rapide de période'}</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'mtd' as PeriodPreset, labelEn: 'Month to Date', labelFr: 'Mois en cours' },
                { id: 'qtd' as PeriodPreset, labelEn: 'Quarter to Date', labelFr: 'Trimestre en cours' },
                { id: 'ytd' as PeriodPreset, labelEn: 'Year to Date', labelFr: 'Année en cours' },
                { id: 'last_month' as PeriodPreset, labelEn: 'Last Month', labelFr: 'Mois dernier' },
                { id: 'last_quarter' as PeriodPreset, labelEn: 'Last Quarter', labelFr: 'Trimestre dernier' },
                { id: 'last_year' as PeriodPreset, labelEn: 'Last Year', labelFr: 'Année dernière' },
                { id: 'custom' as PeriodPreset, labelEn: 'Custom', labelFr: 'Personnalisé' },
              ].map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setPeriodPreset(preset.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    periodPreset === preset.id ? '' : 'hover:bg-[rgb(var(--color-bg-muted))]'
                  }`}
                  style={{
                    backgroundColor: periodPreset === preset.id 
                      ? 'rgb(var(--color-primary-500))' 
                      : 'transparent',
                    color: periodPreset === preset.id 
                      ? 'white' 
                      : 'rgb(var(--color-text-secondary))',
                    border: periodPreset === preset.id
                      ? 'none'
                      : '1px solid rgb(var(--color-border))',
                  }}
                >
                  {isEn ? preset.labelEn : preset.labelFr}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Range (visible when custom is selected or always for clarity) */}
          <div 
            className="flex flex-wrap items-end gap-4 p-4 rounded-xl transition-all"
            style={{ 
              backgroundColor: periodPreset === 'custom' ? 'rgb(var(--color-bg-muted))' : 'transparent',
              border: periodPreset === 'custom' ? '1px solid rgb(var(--color-border))' : 'none',
            }}
          >
            <div className="flex-1 min-w-[200px]">
              <label className="label">{isEn ? 'Start Date' : 'Date de début'}</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                <input 
                  type="date" 
                  value={periodPreset === 'custom' ? customStart : periodStart} 
                  onChange={(e) => handleStartChange(e.target.value)} 
                  className="input pl-10 w-full"
                  disabled={periodPreset !== 'custom'}
                />
              </div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="label">{isEn ? 'End Date' : 'Date de fin'}</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                <input 
                  type="date" 
                  value={periodPreset === 'custom' ? customEnd : periodEnd} 
                  onChange={(e) => handleEndChange(e.target.value)} 
                  className="input pl-10 w-full"
                  disabled={periodPreset !== 'custom'}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pb-1">
              <input 
                type="checkbox" 
                id="showComparison" 
                checked={showComparison} 
                onChange={(e) => setShowComparison(e.target.checked)} 
                className="w-4 h-4 rounded" 
                style={{ accentColor: 'rgb(var(--color-primary-500))' }} 
              />
              <label htmlFor="showComparison" className="text-sm whitespace-nowrap" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Show Prior Year' : 'Afficher année précédente'}
              </label>
            </div>
          </div>

          {/* Current Period Summary */}
          <div className="flex items-center gap-2 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            <Calendar className="w-4 h-4" />
            <span>
              {isEn ? 'Showing data from' : 'Données du'}{' '}
              <strong style={{ color: 'rgb(var(--color-text))' }}>
                {new Date(periodStart).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
              </strong>
              {' '}{isEn ? 'to' : 'au'}{' '}
              <strong style={{ color: 'rgb(var(--color-text))' }}>
                {new Date(periodEnd).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Cash Flow Statement Table */}
      <div className="card p-0 overflow-hidden">
        <div className="p-6 border-b" style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-bg-muted))' }}>
          <h3 className="text-xl font-bold text-center" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'STATEMENT OF CASH FLOWS' : 'ÉTAT DES FLUX DE TRÉSORERIE'}
          </h3>
          <p className="text-center mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn 
              ? `For the period ending ${new Date(periodEnd).toLocaleDateString('en-CA')}`
              : `Pour la période terminant le ${new Date(periodEnd).toLocaleDateString('fr-CA')}`}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
              <tr>
                <th className="py-3 px-4 text-left text-sm font-semibold" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Description' : 'Description'}
                </th>
                <th className="py-3 px-4 text-right text-sm font-semibold w-32" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {new Date(periodEnd).getFullYear()}
                </th>
                {showComparison && (
                  <>
                    <th className="py-3 px-4 text-right text-sm font-semibold w-32" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      {new Date(periodEnd).getFullYear() - 1}
                    </th>
                    <th className="py-3 px-4 text-right text-sm font-semibold w-24" style={{ color: 'rgb(var(--color-text-secondary))' }}>Var.</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {/* Operating Activities */}
              <tr style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}>
                <td colSpan={showComparison ? 4 : 2} className="py-3 px-4 font-bold" style={{ color: 'rgb(var(--color-primary-600))' }}>
                  {isEn ? 'OPERATING ACTIVITIES' : 'ACTIVITÉS D\'EXPLOITATION'}
                </td>
              </tr>
              {cashFlowData.operating.map(item => renderRow(item, isEn ? 'Operations' : 'Exploitation'))}
              {renderTotalRow('Flux net - Exploitation', 'Net Cash from Operations', totals.operatingTotal, true)}

              {/* Investing Activities */}
              <tr style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}>
                <td colSpan={showComparison ? 4 : 2} className="py-3 px-4 font-bold" style={{ color: 'rgb(var(--color-primary-600))' }}>
                  {isEn ? 'INVESTING ACTIVITIES' : 'ACTIVITÉS D\'INVESTISSEMENT'}
                </td>
              </tr>
              {cashFlowData.investing.map(item => renderRow(item, isEn ? 'Investing' : 'Investissement'))}
              {renderTotalRow('Flux net - Investissement', 'Net Cash from Investing', totals.investingTotal, true)}

              {/* Financing Activities */}
              <tr style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}>
                <td colSpan={showComparison ? 4 : 2} className="py-3 px-4 font-bold" style={{ color: 'rgb(var(--color-primary-600))' }}>
                  {isEn ? 'FINANCING ACTIVITIES' : 'ACTIVITÉS DE FINANCEMENT'}
                </td>
              </tr>
              {cashFlowData.financing.map(item => renderRow(item, isEn ? 'Financing' : 'Financement'))}
              {renderTotalRow('Flux net - Financement', 'Net Cash from Financing', totals.financingTotal, true)}

              {/* Summary */}
              {renderTotalRow('Variation nette de trésorerie', 'Net Change in Cash', totals.netChange, true)}
              {renderTotalRow('Trésorerie d\'ouverture', 'Opening Cash Balance', totals.openingCash)}
              
              {/* Closing Balance */}
              <tr style={{ backgroundColor: 'rgb(var(--color-primary-600))', color: 'white' }}>
                <td className="py-4 px-4 font-bold">{isEn ? 'CLOSING CASH BALANCE' : 'TRÉSORERIE DE CLÔTURE'}</td>
                <td className="py-4 px-4 text-right font-mono tabular-nums font-bold">{formatCurrency(totals.closingCash.current)}</td>
                {showComparison && (
                  <>
                    <td className="py-4 px-4 text-right font-mono tabular-nums font-bold">{formatCurrency(totals.closingCash.prior)}</td>
                    <td className="py-4 px-4 text-right font-mono tabular-nums font-bold">
                      {calculateVariance(totals.closingCash.current, totals.closingCash.prior).toFixed(1)}%
                    </td>
                  </>
                )}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Cash Flow Summary Cards */}
        <div className="p-4 grid grid-cols-3 gap-4" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
          {[
            { 
              key: 'operating',
              label: isEn ? 'From Operations' : 'Exploitation',
              labelFull: isEn ? 'Cash from Operating Activities' : 'Flux de trésorerie d\'exploitation',
              value: totals.operatingTotal,
              description: isEn 
                ? 'Cash generated from core business operations including net income and working capital changes.'
                : 'Liquidités générées par les opérations principales incluant le résultat net et les variations du fonds de roulement.'
            },
            { 
              key: 'investing',
              label: isEn ? 'From Investing' : 'Investissement',
              labelFull: isEn ? 'Cash from Investing Activities' : 'Flux de trésorerie d\'investissement',
              value: totals.investingTotal,
              description: isEn 
                ? 'Cash used for or generated from investments in assets, equipment, and acquisitions.'
                : 'Liquidités utilisées ou générées par les investissements en actifs, équipements et acquisitions.'
            },
            { 
              key: 'financing',
              label: isEn ? 'From Financing' : 'Financement',
              labelFull: isEn ? 'Cash from Financing Activities' : 'Flux de trésorerie de financement',
              value: totals.financingTotal,
              description: isEn 
                ? 'Cash from debt, equity financing, and dividend payments to shareholders.'
                : 'Liquidités provenant de la dette, du financement par actions et des dividendes versés aux actionnaires.'
            },
          ].map(item => {
            const isHovered = hoveredRow === item.key;
            const variance = calculateVariance(item.value.current, item.value.prior);
            
            return (
              <div 
                key={item.key}
                className="text-center p-3 rounded-lg cursor-pointer transition-all relative"
                style={{ 
                  backgroundColor: isHovered ? 'rgb(var(--color-primary-500) / 0.1)' : 'rgb(var(--color-surface))',
                  boxShadow: isHovered ? '0 0 20px rgb(var(--color-primary-500) / 0.2)' : undefined,
                }}
                onMouseEnter={(e) => {
                  setHoveredRow(item.key);
                  setTooltipPosition({ x: e.clientX, y: e.clientY });
                }}
                onMouseMove={(e) => {
                  setTooltipPosition({ x: e.clientX, y: e.clientY });
                }}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: isHovered ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))' }}>
                  {item.label}
                </p>
                <p className="text-lg font-bold transition-transform" style={{ 
                  color: item.value.current >= 0 ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))',
                  transform: isHovered ? 'scale(1.05)' : undefined,
                }}>
                  {formatCurrency(item.value.current)}
                </p>
                
                {/* Tooltip */}
                {isHovered && (
                  <ChartTooltip visible={true} position={tooltipPosition}>
                    <div className="min-w-[240px]">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="w-4 h-4 text-gray-400" />
                        <span className="text-white font-medium">{item.labelFull}</span>
                      </div>
                      
                      {/* Description */}
                      <p className="text-gray-400 text-xs mb-3">{item.description}</p>
                      
                      {/* Values */}
                      <div className="space-y-2 border-t border-gray-700 pt-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400 text-sm">{isEn ? 'Current' : 'Actuel'}</span>
                          <span className={`font-bold ${item.value.current >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(item.value.current)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400 text-sm">{isEn ? 'Prior Year' : 'Année préc.'}</span>
                          <span className="text-gray-300">{formatCurrency(item.value.prior)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-gray-700">
                          <span className="text-gray-400 text-sm">{isEn ? 'YoY Change' : 'Var. annuelle'}</span>
                          <span className={`font-medium flex items-center gap-1 ${variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {variance >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {variance >= 0 ? '+' : ''}{variance.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      
                      {/* Net change contribution */}
                      {totals.netChange.current !== 0 && (
                        <div className="mt-3 pt-2 border-t border-gray-700">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">{isEn ? '% of Net Cash Change' : '% du flux net'}</span>
                            <span className="text-gray-300">
                              {Math.abs((item.value.current / totals.netChange.current) * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </ChartTooltip>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
