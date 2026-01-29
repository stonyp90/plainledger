import { useState, useMemo } from 'react';
import { ArrowLeft, Download, Calendar, RefreshCw, Loader2, AlertTriangle, Printer, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBalanceSheet } from '../hooks/useFinancialData';
import { useTenant } from '../contexts/TenantContext';
import { useI18n } from '../lib/i18n';
import ShareModal from '../components/ShareModal';

// Date preset type
type DatePreset = 'today' | 'month_end' | 'quarter_end' | 'year_end' | 'last_month_end' | 'last_quarter_end' | 'last_year_end' | 'custom';

// Helper to get preset dates
function getPresetDate(preset: DatePreset, customDate?: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const quarter = Math.floor(month / 3);
  
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  
  switch (preset) {
    case 'today':
      return formatDate(now);
    case 'month_end':
      return formatDate(new Date(year, month + 1, 0));
    case 'quarter_end':
      return formatDate(new Date(year, (quarter + 1) * 3, 0));
    case 'year_end':
      return formatDate(new Date(year, 11, 31));
    case 'last_month_end':
      return formatDate(new Date(year, month, 0));
    case 'last_quarter_end': {
      const lastQuarter = quarter === 0 ? 3 : quarter - 1;
      const lastQuarterYear = quarter === 0 ? year - 1 : year;
      return formatDate(new Date(lastQuarterYear, (lastQuarter + 1) * 3, 0));
    }
    case 'last_year_end':
      return formatDate(new Date(year - 1, 11, 31));
    case 'custom':
    default:
      return customDate || formatDate(now);
  }
}

export default function BalanceSheet() {
  const { currentTenant } = useTenant();
  const { language } = useI18n();
  const isEn = language === 'en';
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [showComparison, setShowComparison] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);

  // Calculate actual date based on preset
  const asOfDate = getPresetDate(datePreset, customDate);

  // Handle custom date change
  const handleDateChange = (value: string) => {
    setCustomDate(value);
    setDatePreset('custom');
  };

  // Fetch balance sheet data from the financial data service
  const { data: balanceSheetData, isLoading, error, refresh } = useBalanceSheet(asOfDate);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const handleExportPDF = () => {
    const filename = `bilan-${asOfDate}.pdf`;
    alert(language === 'en' 
      ? `Generating PDF "${filename}"...\n\nThe report will download automatically.`
      : `Génération du PDF "${filename}"...\n\nLe rapport sera téléchargé automatiquement.`
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const formatCurrency = (value: number) => {
    const currency = balanceSheetData?.currency || currentTenant?.settings?.currency || 'CAD';
    return new Intl.NumberFormat(language === 'en' ? 'en-CA' : 'fr-CA', {
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

  const sumSection = (items: Array<{ current: number; prior: number }>) => ({
    current: items.reduce((sum, item) => sum + item.current, 0),
    prior: items.reduce((sum, item) => sum + item.prior, 0),
  });

  // Calculate totals from dynamic data
  const totals = useMemo(() => {
    if (!balanceSheetData) return null;

    const currentAssetsTotal = sumSection(balanceSheetData.assets.currentAssets);
    const fixedAssetsTotal = sumSection(balanceSheetData.assets.fixedAssets);
    const totalAssets = {
      current: currentAssetsTotal.current + fixedAssetsTotal.current,
      prior: currentAssetsTotal.prior + fixedAssetsTotal.prior,
    };

    const currentLiabilitiesTotal = sumSection(balanceSheetData.liabilities.currentLiabilities);
    const longTermLiabilitiesTotal = sumSection(balanceSheetData.liabilities.longTermLiabilities);
    const totalLiabilities = {
      current: currentLiabilitiesTotal.current + longTermLiabilitiesTotal.current,
      prior: currentLiabilitiesTotal.prior + longTermLiabilitiesTotal.prior,
    };

    const equityTotal = sumSection(balanceSheetData.equity);
    const totalLiabilitiesAndEquity = {
      current: totalLiabilities.current + equityTotal.current,
      prior: totalLiabilities.prior + equityTotal.prior,
    };

    return {
      currentAssetsTotal,
      fixedAssetsTotal,
      totalAssets,
      currentLiabilitiesTotal,
      longTermLiabilitiesTotal,
      totalLiabilities,
      equityTotal,
      totalLiabilitiesAndEquity,
    };
  }, [balanceSheetData]);

  // Loading state
  if (isLoading && !balanceSheetData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
          <p className="text-muted">{language === 'en' ? 'Loading balance sheet...' : 'Chargement du bilan...'}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !balanceSheetData || !totals) {
    return (
      <div className="card p-8 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-error" />
        <h3 className="font-semibold text-lg mb-2">{language === 'en' ? 'Error' : 'Erreur'}</h3>
        <p className="text-muted mb-4">{error?.message || (language === 'en' ? 'Failed to load balance sheet data' : 'Échec du chargement des données du bilan')}</p>
        <button onClick={handleRefresh} className="btn-primary">
          {language === 'en' ? 'Retry' : 'Réessayer'}
        </button>
      </div>
    );
  }

  const { 
    currentAssetsTotal, 
    fixedAssetsTotal, 
    totalAssets, 
    currentLiabilitiesTotal, 
    longTermLiabilitiesTotal, 
    totalLiabilities, 
    equityTotal, 
    totalLiabilitiesAndEquity 
  } = totals;

  const renderRow = (item: { code: string; name: string; nameEn?: string; current: number; prior: number }) => {
    const variance = calculateVariance(item.current, item.prior);
    const displayName = language === 'en' && item.nameEn ? item.nameEn : item.name;
    return (
      <tr key={item.code} className="hover:bg-[rgb(var(--color-bg-muted))]">
        <td className="py-2 px-3 sm:px-4 font-mono text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{item.code}</td>
        <td className="py-2 px-3 sm:px-4 text-sm" style={{ color: 'rgb(var(--color-text))' }}>{displayName}</td>
        <td className="py-2 px-3 sm:px-4 text-right font-mono tabular-nums text-sm" style={{ color: 'rgb(var(--color-text))' }}>
          {formatCurrency(item.current)}
        </td>
        {showComparison && (
          <>
            <td className="py-2 px-3 sm:px-4 text-right font-mono tabular-nums text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {formatCurrency(item.prior)}
            </td>
            <td className="py-2 px-3 sm:px-4 text-right font-mono tabular-nums text-sm" style={{ color: variance >= 0 ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))' }}>
              {variance >= 0 ? '+' : ''}{variance.toFixed(1)}%
            </td>
          </>
        )}
      </tr>
    );
  };

  const renderTotalRow = (label: string, totals: { current: number; prior: number }, isGrandTotal = false) => {
    const variance = calculateVariance(totals.current, totals.prior);
    return (
      <tr 
        className={`${isGrandTotal ? 'font-bold' : 'font-semibold'}`}
        style={{ backgroundColor: isGrandTotal ? 'rgb(var(--color-primary-500) / 0.1)' : 'rgb(var(--color-bg-muted))' }}
      >
        <td className="py-2 sm:py-3 px-3 sm:px-4"></td>
        <td className="py-2 sm:py-3 px-3 sm:px-4 text-sm" style={{ color: 'rgb(var(--color-text))' }}>{label}</td>
        <td className="py-2 sm:py-3 px-3 sm:px-4 text-right font-mono tabular-nums text-sm" style={{ color: 'rgb(var(--color-text))' }}>
          {formatCurrency(totals.current)}
        </td>
        {showComparison && (
          <>
            <td className="py-2 sm:py-3 px-3 sm:px-4 text-right font-mono tabular-nums text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {formatCurrency(totals.prior)}
            </td>
            <td className="py-2 sm:py-3 px-3 sm:px-4 text-right font-mono tabular-nums text-sm" style={{ color: variance >= 0 ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))' }}>
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
          <Link
            to="/app/reports"
            className="p-2 rounded-lg transition-colors flex-shrink-0"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
            title={isEn ? 'Back to reports' : 'Retour aux rapports'}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold truncate" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Balance Sheet' : 'Bilan'}
            </h2>
            <p className="text-sm hidden sm:block" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn ? 'Statement of Financial Position' : 'État de la situation financière'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-secondary flex items-center gap-2"
            title={isEn ? 'Refresh data' : 'Actualiser les données'}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? (isEn ? 'Loading...' : 'Chargement...') : (isEn ? 'Refresh' : 'Actualiser')}</span>
          </button>
          <button 
            onClick={handlePrint}
            className="btn-secondary p-2.5"
            title={isEn ? 'Print' : 'Imprimer'}
          >
            <Printer className="w-4 h-4" />
          </button>
          <button 
            onClick={handleShare}
            className="btn-secondary p-2.5"
            title={isEn ? 'Share' : 'Partager'}
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button 
            onClick={handleExportPDF}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
            title={isEn ? 'Export to PDF' : 'Exporter en PDF'}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{isEn ? 'Export PDF' : 'Exporter PDF'}</span>
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="card">
        <div className="flex flex-col gap-4">
          {/* Date Presets */}
          <div>
            <label className="label mb-2">{isEn ? 'Quick Date Selection' : 'Sélection rapide de date'}</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'today' as DatePreset, labelEn: 'Today', labelFr: "Aujourd'hui" },
                { id: 'month_end' as DatePreset, labelEn: 'End of Month', labelFr: 'Fin du mois' },
                { id: 'quarter_end' as DatePreset, labelEn: 'End of Quarter', labelFr: 'Fin du trimestre' },
                { id: 'year_end' as DatePreset, labelEn: 'End of Year', labelFr: 'Fin d\'année' },
                { id: 'last_month_end' as DatePreset, labelEn: 'Last Month End', labelFr: 'Fin mois dernier' },
                { id: 'last_quarter_end' as DatePreset, labelEn: 'Last Quarter End', labelFr: 'Fin trim. dernier' },
                { id: 'last_year_end' as DatePreset, labelEn: 'Last Year End', labelFr: 'Fin année dernière' },
                { id: 'custom' as DatePreset, labelEn: 'Custom', labelFr: 'Personnalisé' },
              ].map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setDatePreset(preset.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    datePreset === preset.id ? '' : 'hover:bg-[rgb(var(--color-bg-muted))]'
                  }`}
                  style={{
                    backgroundColor: datePreset === preset.id 
                      ? 'rgb(var(--color-primary-500))' 
                      : 'transparent',
                    color: datePreset === preset.id 
                      ? 'white' 
                      : 'rgb(var(--color-text-secondary))',
                    border: datePreset === preset.id
                      ? 'none'
                      : '1px solid rgb(var(--color-border))',
                  }}
                >
                  {isEn ? preset.labelEn : preset.labelFr}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date & Comparison */}
          <div 
            className="flex flex-wrap items-end gap-4 p-4 rounded-xl transition-all"
            style={{ 
              backgroundColor: datePreset === 'custom' ? 'rgb(var(--color-bg-muted))' : 'transparent',
              border: datePreset === 'custom' ? '1px solid rgb(var(--color-border))' : 'none',
            }}
          >
            <div className="min-w-[200px]">
              <label className="label">{isEn ? 'Balance Sheet Date' : 'Date du bilan'}</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                <input
                  type="date"
                  value={datePreset === 'custom' ? customDate : asOfDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="input pl-10 w-full"
                  disabled={datePreset !== 'custom'}
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

          {/* Selected Date Summary */}
          <div className="flex items-center gap-2 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            <Calendar className="w-4 h-4" />
            <span>
              {isEn ? 'Balance sheet as of' : 'Bilan au'}{' '}
              <strong style={{ color: 'rgb(var(--color-text))' }}>
                {new Date(asOfDate).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Balance Sheet Table */}
      <div className="card p-0 overflow-hidden">
        {/* Report Header */}
        <div 
          className="p-4 sm:p-6 border-b"
          style={{ 
            borderColor: 'rgb(var(--color-border))',
            backgroundColor: 'rgb(var(--color-bg-muted))'
          }}
        >
          <h3 className="text-lg sm:text-xl font-bold text-center" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'BALANCE SHEET' : 'BILAN'}
          </h3>
          <p className="text-center text-sm mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn 
              ? `As of ${new Date(asOfDate).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}`
              : `Au ${new Date(asOfDate).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })}`}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
              <tr>
                <th className="py-3 px-3 sm:px-4 text-left text-xs sm:text-sm font-semibold w-16 sm:w-20" style={{ color: 'rgb(var(--color-text-secondary))' }}>Code</th>
                <th className="py-3 px-3 sm:px-4 text-left text-xs sm:text-sm font-semibold" style={{ color: 'rgb(var(--color-text-secondary))' }}>{isEn ? 'Account' : 'Compte'}</th>
                <th className="py-3 px-3 sm:px-4 text-right text-xs sm:text-sm font-semibold w-24 sm:w-32" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {new Date(asOfDate).getFullYear()}
                </th>
                {showComparison && (
                  <>
                    <th className="py-3 px-3 sm:px-4 text-right text-xs sm:text-sm font-semibold w-24 sm:w-32" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      {new Date(asOfDate).getFullYear() - 1}
                    </th>
                    <th className="py-3 px-3 sm:px-4 text-right text-xs sm:text-sm font-semibold w-16 sm:w-24" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      Var.
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {/* ASSETS */}
              <tr style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}>
                <td colSpan={showComparison ? 5 : 3} className="py-3 px-3 sm:px-4 font-bold" style={{ color: 'rgb(var(--color-primary-600))' }}>
                  {isEn ? 'ASSETS' : 'ACTIF'}
                </td>
              </tr>

              {/* Current Assets */}
              <tr style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
                <td colSpan={showComparison ? 5 : 3} className="py-2 px-3 sm:px-4 font-semibold" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Current Assets' : 'Actifs courants'}
                </td>
              </tr>
            {balanceSheetData.assets.currentAssets.map(renderRow)}
            {renderTotalRow(isEn ? 'Total Current Assets' : 'Total actifs courants', currentAssetsTotal)}

            {/* Fixed Assets */}
            <tr style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
              <td colSpan={showComparison ? 5 : 3} className="py-2 px-3 sm:px-4 font-semibold" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Fixed Assets' : 'Immobilisations'}
              </td>
            </tr>
            {balanceSheetData.assets.fixedAssets.map(renderRow)}
            {renderTotalRow(isEn ? 'Total Fixed Assets' : 'Total immobilisations', fixedAssetsTotal)}

            {renderTotalRow(isEn ? 'TOTAL ASSETS' : 'TOTAL ACTIF', totalAssets, true)}

            {/* LIABILITIES */}
            <tr style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}>
              <td colSpan={showComparison ? 5 : 3} className="py-3 px-3 sm:px-4 font-bold" style={{ color: 'rgb(var(--color-primary-600))' }}>
                {isEn ? 'LIABILITIES' : 'PASSIF'}
              </td>
            </tr>

            {/* Current Liabilities */}
            <tr style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
              <td colSpan={showComparison ? 5 : 3} className="py-2 px-3 sm:px-4 font-semibold" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Current Liabilities' : 'Passifs courants'}
              </td>
            </tr>
            {balanceSheetData.liabilities.currentLiabilities.map(renderRow)}
            {renderTotalRow(isEn ? 'Total Current Liabilities' : 'Total passifs courants', currentLiabilitiesTotal)}

            {/* Long-term Liabilities */}
            <tr style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
              <td colSpan={showComparison ? 5 : 3} className="py-2 px-3 sm:px-4 font-semibold" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'Long-term Liabilities' : 'Passifs à long terme'}
              </td>
            </tr>
            {balanceSheetData.liabilities.longTermLiabilities.map(renderRow)}
            {renderTotalRow(isEn ? 'Total Long-term Liabilities' : 'Total passifs à long terme', longTermLiabilitiesTotal)}

            {renderTotalRow(isEn ? 'TOTAL LIABILITIES' : 'TOTAL PASSIF', totalLiabilities, true)}

            {/* EQUITY */}
            <tr style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}>
              <td colSpan={showComparison ? 5 : 3} className="py-3 px-3 sm:px-4 font-bold" style={{ color: 'rgb(var(--color-primary-600))' }}>
                {isEn ? 'EQUITY' : 'CAPITAUX PROPRES'}
              </td>
            </tr>
            {balanceSheetData.equity.map(renderRow)}
            {renderTotalRow(isEn ? 'TOTAL EQUITY' : 'TOTAL CAPITAUX PROPRES', equityTotal, true)}

            {/* Grand Total */}
            <tr style={{ backgroundColor: 'rgb(var(--color-primary-600))', color: 'white' }}>
              <td className="py-3 sm:py-4 px-3 sm:px-4"></td>
              <td className="py-3 sm:py-4 px-3 sm:px-4 font-bold text-sm sm:text-base">
                {isEn ? 'TOTAL LIABILITIES & EQUITY' : 'TOTAL PASSIF ET CAPITAUX PROPRES'}
              </td>
              <td className="py-3 sm:py-4 px-3 sm:px-4 text-right font-mono tabular-nums font-bold text-sm sm:text-base">
                {formatCurrency(totalLiabilitiesAndEquity.current)}
              </td>
              {showComparison && (
                <>
                  <td className="py-3 sm:py-4 px-3 sm:px-4 text-right font-mono tabular-nums font-bold text-sm sm:text-base">
                    {formatCurrency(totalLiabilitiesAndEquity.prior)}
                  </td>
                  <td className="py-3 sm:py-4 px-3 sm:px-4 text-right font-mono tabular-nums font-bold text-sm sm:text-base">
                    {calculateVariance(totalLiabilitiesAndEquity.current, totalLiabilitiesAndEquity.prior).toFixed(1)}%
                  </td>
                </>
              )}
            </tr>
            </tbody>
          </table>
        </div>

        {/* Balance Check */}
        <div 
          className="p-3 sm:p-4"
          style={{ 
            backgroundColor: totalAssets.current === totalLiabilitiesAndEquity.current 
              ? 'rgb(var(--color-success) / 0.1)' 
              : 'rgb(var(--color-error) / 0.1)'
          }}
        >
          <p 
            className="text-center text-xs sm:text-sm font-medium"
            style={{ 
              color: totalAssets.current === totalLiabilitiesAndEquity.current 
                ? 'rgb(var(--color-success))' 
                : 'rgb(var(--color-error))'
            }}
          >
            {totalAssets.current === totalLiabilitiesAndEquity.current
              ? (isEn ? 'Balance sheet is balanced' : 'Le bilan est équilibré')
              : (isEn 
                  ? `Warning: Out of balance by ${formatCurrency(Math.abs(totalAssets.current - totalLiabilitiesAndEquity.current))}`
                  : `Attention: Écart de ${formatCurrency(Math.abs(totalAssets.current - totalLiabilitiesAndEquity.current))}`)}
          </p>
        </div>
      </div>

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Bilan"
        titleEn="Balance Sheet"
        subtitle={new Date(asOfDate).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
        contentType="report"
        showDownloadOption={true}
      />
    </div>
  );
}
