import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  TrendingUp, 
  DollarSign, 
  ListChecks, 
  ArrowRight, 
  Calendar, 
  Download, 
  Eye, 
  Sparkles,
  X,
  Loader2,
  Search,
  CheckCircle,
} from 'lucide-react';
import { InfoBanner } from '../components/HelpTooltip';
import { useI18n } from '../lib/i18n';
import { useToast } from '../contexts/ToastContext';

// Report Preview Modal with actual data
function ReportPreviewModal({ 
  report, 
  isEn, 
  onClose, 
  onDownload 
}: { 
  report: any; 
  isEn: boolean; 
  onClose: () => void;
  onDownload: () => void;
}) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get report-specific preview data based on report type
  const getReportPreviewContent = () => {
    // Use type field if available, otherwise check name
    const reportType = report.type || '';
    const reportName = (report.nameEn || report.nameFr || '').toLowerCase();
    
    if (reportType === 'cash-flow' || reportName.includes('cash flow') || reportName.includes('flux')) {
      return (
        <div className="space-y-4">
          {/* Cash Flow Statement Preview */}
          <div className="text-center mb-6">
            <h4 className="text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Cash Flow Statement' : 'État des flux de trésorerie'}
            </h4>
            <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>Q3 2025</p>
          </div>
          
          {/* Operating Activities */}
          <div className="rounded-lg p-4" style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
            <h5 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
              <div className="w-2 h-2 rounded-full bg-green-500" />
              {isEn ? 'Operating Activities' : 'Activités d\'exploitation'}
            </h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Net Income' : 'Bénéfice net'}</span>
                <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{formatCurrency(125000)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Depreciation' : 'Amortissement'}</span>
                <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{formatCurrency(15000)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Changes in Working Capital' : 'Variation du fonds de roulement'}</span>
                <span className="font-medium text-red-500">({formatCurrency(8500)})</span>
              </div>
              <div className="flex justify-between pt-2 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
                <span className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{isEn ? 'Net Cash from Operations' : 'Flux net d\'exploitation'}</span>
                <span className="font-bold text-green-500">{formatCurrency(131500)}</span>
              </div>
            </div>
          </div>

          {/* Investing Activities */}
          <div className="rounded-lg p-4" style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
            <h5 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              {isEn ? 'Investing Activities' : 'Activités d\'investissement'}
            </h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Equipment Purchases' : 'Achat d\'équipement'}</span>
                <span className="font-medium text-red-500">({formatCurrency(45000)})</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Software Investments' : 'Investissements logiciels'}</span>
                <span className="font-medium text-red-500">({formatCurrency(12000)})</span>
              </div>
              <div className="flex justify-between pt-2 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
                <span className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{isEn ? 'Net Cash from Investing' : 'Flux net d\'investissement'}</span>
                <span className="font-bold text-red-500">({formatCurrency(57000)})</span>
              </div>
            </div>
          </div>

          {/* Financing Activities */}
          <div className="rounded-lg p-4" style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
            <h5 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              {isEn ? 'Financing Activities' : 'Activités de financement'}
            </h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Loan Repayments' : 'Remboursements d\'emprunts'}</span>
                <span className="font-medium text-red-500">({formatCurrency(25000)})</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Dividends Paid' : 'Dividendes versés'}</span>
                <span className="font-medium text-red-500">({formatCurrency(10000)})</span>
              </div>
              <div className="flex justify-between pt-2 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
                <span className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{isEn ? 'Net Cash from Financing' : 'Flux net de financement'}</span>
                <span className="font-bold text-red-500">({formatCurrency(35000)})</span>
              </div>
            </div>
          </div>

          {/* Net Change */}
          <div className="rounded-lg p-4" style={{ 
            backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
            border: '1px solid rgb(var(--color-primary-500) / 0.3)'
          }}>
            <div className="flex justify-between items-center">
              <span className="font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Net Change in Cash' : 'Variation nette de trésorerie'}
              </span>
              <span className="text-xl font-bold text-green-500">{formatCurrency(39500)}</span>
            </div>
          </div>
        </div>
      );
    }

    if (reportType === 'income-statement' || reportName.includes('income') || reportName.includes('résultat') || reportName.includes('profit')) {
      return (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h4 className="text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Income Statement' : 'État des résultats'}
            </h4>
            <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>Q3 2025</p>
          </div>
          
          <div className="rounded-lg p-4" style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between font-semibold text-green-500">
                <span>{isEn ? 'Revenue' : 'Revenus'}</span>
                <span>{formatCurrency(485000)}</span>
              </div>
              <div className="flex justify-between" style={{ color: 'rgb(var(--color-text-muted))' }}>
                <span className="pl-4">{isEn ? 'Cost of Goods Sold' : 'Coût des ventes'}</span>
                <span>({formatCurrency(195000)})</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t" style={{ borderColor: 'rgb(var(--color-border))', color: 'rgb(var(--color-text))' }}>
                <span>{isEn ? 'Gross Profit' : 'Bénéfice brut'}</span>
                <span>{formatCurrency(290000)}</span>
              </div>
              <div className="flex justify-between" style={{ color: 'rgb(var(--color-text-muted))' }}>
                <span className="pl-4">{isEn ? 'Operating Expenses' : 'Charges d\'exploitation'}</span>
                <span>({formatCurrency(125000)})</span>
              </div>
              <div className="flex justify-between" style={{ color: 'rgb(var(--color-text-muted))' }}>
                <span className="pl-4">{isEn ? 'Marketing' : 'Marketing'}</span>
                <span>({formatCurrency(28000)})</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t" style={{ borderColor: 'rgb(var(--color-border))', color: 'rgb(var(--color-text))' }}>
                <span>{isEn ? 'Operating Income' : 'Résultat d\'exploitation'}</span>
                <span>{formatCurrency(137000)}</span>
              </div>
              <div className="flex justify-between" style={{ color: 'rgb(var(--color-text-muted))' }}>
                <span className="pl-4">{isEn ? 'Interest & Taxes' : 'Intérêts et impôts'}</span>
                <span>({formatCurrency(12000)})</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg p-4" style={{ 
            backgroundColor: 'rgb(var(--color-success) / 0.1)',
            border: '1px solid rgb(var(--color-success) / 0.3)'
          }}>
            <div className="flex justify-between items-center">
              <span className="font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Net Income' : 'Bénéfice net'}
              </span>
              <span className="text-xl font-bold text-green-500">{formatCurrency(125000)}</span>
            </div>
          </div>
        </div>
      );
    }

    if (reportType === 'balance-sheet' || reportName.includes('balance sheet') || reportName.includes('bilan')) {
      return (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h4 className="text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Balance Sheet' : 'Bilan'}
            </h4>
            <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'As of' : 'Au'} Sep 30, 2025</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Assets */}
            <div className="rounded-lg p-4" style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
              <h5 className="font-semibold mb-3 text-blue-500">{isEn ? 'Assets' : 'Actifs'}</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Cash' : 'Encaisse'}</span>
                  <span style={{ color: 'rgb(var(--color-text))' }}>{formatCurrency(245000)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Accounts Receivable' : 'Comptes clients'}</span>
                  <span style={{ color: 'rgb(var(--color-text))' }}>{formatCurrency(125000)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Fixed Assets' : 'Immobilisations'}</span>
                  <span style={{ color: 'rgb(var(--color-text))' }}>{formatCurrency(380000)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-semibold" style={{ borderColor: 'rgb(var(--color-border))', color: 'rgb(var(--color-text))' }}>
                  <span>{isEn ? 'Total Assets' : 'Total actifs'}</span>
                  <span>{formatCurrency(750000)}</span>
                </div>
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div className="rounded-lg p-4" style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
              <h5 className="font-semibold mb-3 text-purple-500">{isEn ? 'Liabilities & Equity' : 'Passifs et capitaux'}</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Accounts Payable' : 'Comptes fournisseurs'}</span>
                  <span style={{ color: 'rgb(var(--color-text))' }}>{formatCurrency(85000)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Long-term Debt' : 'Dette à long terme'}</span>
                  <span style={{ color: 'rgb(var(--color-text))' }}>{formatCurrency(165000)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Equity' : 'Capitaux propres'}</span>
                  <span style={{ color: 'rgb(var(--color-text))' }}>{formatCurrency(500000)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-semibold" style={{ borderColor: 'rgb(var(--color-border))', color: 'rgb(var(--color-text))' }}>
                  <span>{isEn ? 'Total' : 'Total'}</span>
                  <span>{formatCurrency(750000)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (reportType === 'trial-balance' || reportName.includes('trial') || reportName.includes('vérification')) {
      return (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h4 className="text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Trial Balance' : 'Balance de vérification'}
            </h4>
            <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>Q3 2025</p>
          </div>

          <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
                  <th className="text-left p-3 font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{isEn ? 'Account' : 'Compte'}</th>
                  <th className="text-right p-3 font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{isEn ? 'Debit' : 'Débit'}</th>
                  <th className="text-right p-3 font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{isEn ? 'Credit' : 'Crédit'}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { account: isEn ? 'Cash' : 'Encaisse', debit: 245000, credit: 0 },
                  { account: isEn ? 'Accounts Receivable' : 'Comptes clients', debit: 125000, credit: 0 },
                  { account: isEn ? 'Accounts Payable' : 'Comptes fournisseurs', debit: 0, credit: 85000 },
                  { account: isEn ? 'Revenue' : 'Revenus', debit: 0, credit: 485000 },
                  { account: isEn ? 'Expenses' : 'Dépenses', debit: 360000, credit: 0 },
                  { account: isEn ? 'Equity' : 'Capitaux propres', debit: 0, credit: 160000 },
                ].map((row, i) => (
                  <tr key={i} style={{ borderTop: '1px solid rgb(var(--color-border))' }}>
                    <td className="p-3" style={{ color: 'rgb(var(--color-text))' }}>{row.account}</td>
                    <td className="p-3 text-right" style={{ color: row.debit ? 'rgb(var(--color-text))' : 'rgb(var(--color-text-muted))' }}>
                      {row.debit ? formatCurrency(row.debit) : '-'}
                    </td>
                    <td className="p-3 text-right" style={{ color: row.credit ? 'rgb(var(--color-text))' : 'rgb(var(--color-text-muted))' }}>
                      {row.credit ? formatCurrency(row.credit) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}>
                  <td className="p-3 font-bold" style={{ color: 'rgb(var(--color-text))' }}>{isEn ? 'Total' : 'Total'}</td>
                  <td className="p-3 text-right font-bold" style={{ color: 'rgb(var(--color-text))' }}>{formatCurrency(730000)}</td>
                  <td className="p-3 text-right font-bold" style={{ color: 'rgb(var(--color-text))' }}>{formatCurrency(730000)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex items-center justify-center gap-2 p-3 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}>
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="font-medium text-green-500">{isEn ? 'Balanced' : 'Équilibré'}</span>
          </div>
        </div>
      );
    }

    // Default generic preview
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h4 className="text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? report.nameEn : report.nameFr}
          </h4>
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{report.date}</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: isEn ? 'Total Revenue' : 'Revenus totaux', value: formatCurrency(485000), color: 'text-green-500' },
            { label: isEn ? 'Total Expenses' : 'Dépenses totales', value: formatCurrency(360000), color: 'text-red-500' },
            { label: isEn ? 'Net Result' : 'Résultat net', value: formatCurrency(125000), color: 'text-blue-500' },
          ].map((stat, i) => (
            <div key={i} className="rounded-lg p-4 text-center" style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
              <p className="text-xs mb-1" style={{ color: 'rgb(var(--color-text-muted))' }}>{stat.label}</p>
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg p-4" style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn 
              ? 'This report provides a comprehensive overview of your financial position. Download the full report for detailed analysis and supporting documentation.'
              : 'Ce rapport fournit un aperçu complet de votre situation financière. Téléchargez le rapport complet pour une analyse détaillée et la documentation justificative.'}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div 
        className="relative w-full max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: 'rgb(var(--color-surface))' }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <FileText className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? report.nameEn : report.nameFr}
              </h3>
              <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Report Preview' : 'Aperçu du rapport'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
          >
            <X className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
          </button>
        </div>

        {/* Preview Content */}
        <div className="p-6 overflow-y-auto max-h-[65vh]">
          <div 
            className="rounded-xl p-6"
            style={{ 
              backgroundColor: 'rgb(var(--color-bg-muted))',
              border: '1px solid rgb(var(--color-border))'
            }}
          >
            {getReportPreviewContent()}
          </div>
        </div>

        {/* Footer */}
        <div 
          className="flex items-center justify-end gap-3 p-4 border-t"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-medium transition-colors"
            style={{ 
              backgroundColor: 'rgb(var(--color-bg-muted))',
              color: 'rgb(var(--color-text))'
            }}
          >
            {isEn ? 'Close' : 'Fermer'}
          </button>
          <button
            onClick={onDownload}
            className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
            style={{
              backgroundColor: 'rgb(var(--color-primary-500))',
              color: 'white',
            }}
          >
            <Download className="w-4 h-4" />
            {isEn ? 'Download Excel' : 'Télécharger Excel'}
          </button>
        </div>
      </div>
    </div>
  );
}

// All Reports Modal
function AllReportsModal({ 
  reports, 
  isEn, 
  onClose,
  onView,
  onDownload,
  formatDate,
}: { 
  reports: any[];
  isEn: boolean; 
  onClose: () => void;
  onView: (report: any) => void;
  onDownload: (report: any) => void;
  formatDate: (date: string) => string;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredReports = reports.filter(report => {
    const name = isEn ? report.nameEn : report.nameFr;
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || report.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div 
        className="relative w-full max-w-2xl max-h-[80vh] rounded-2xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: 'rgb(var(--color-surface))' }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <h3 className="font-semibold text-lg" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'All Reports' : 'Tous les rapports'}
          </h3>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
          </button>
        </div>

        {/* Search & Filter */}
        <div 
          className="p-4 border-b flex flex-col sm:flex-row gap-3"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isEn ? 'Search reports...' : 'Rechercher...'}
              className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
              style={{ 
                backgroundColor: 'rgb(var(--color-bg-muted))',
                border: '1px solid rgb(var(--color-border))',
                color: 'rgb(var(--color-text))'
              }}
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ 
              backgroundColor: 'rgb(var(--color-bg-muted))',
              border: '1px solid rgb(var(--color-border))',
              color: 'rgb(var(--color-text))'
            }}
          >
            <option value="all">{isEn ? 'All Types' : 'Tous les types'}</option>
            <option value="balance-sheet">{isEn ? 'Balance Sheet' : 'Bilan'}</option>
            <option value="income-statement">{isEn ? 'Income Statement' : 'État des résultats'}</option>
            <option value="cash-flow">{isEn ? 'Cash Flow' : 'Flux de trésorerie'}</option>
            <option value="trial-balance">{isEn ? 'Trial Balance' : 'Balance de vérification'}</option>
          </select>
        </div>

        {/* Reports List */}
        <div className="p-4 overflow-y-auto max-h-[50vh] space-y-2">
          {filteredReports.length > 0 ? (
            filteredReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div 
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgb(var(--color-surface))' }}
                  >
                    <FileText className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? report.nameEn : report.nameFr}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(report.generatedAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span 
                    className="px-2 py-0.5 text-xs font-medium rounded"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-bg-emphasis))',
                      color: 'rgb(var(--color-text-secondary))'
                    }}
                  >
                    {report.format}
                  </span>
                  <button 
                    onClick={() => onView(report)}
                    className="p-2 rounded-lg transition-colors hover:bg-surface"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                    title={isEn ? 'View' : 'Visualiser'}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onDownload(report)}
                    className="p-2 rounded-lg transition-colors hover:bg-surface"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                    title={isEn ? 'Download' : 'Télécharger'}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <FileText className="w-10 h-10 mx-auto mb-3 text-muted" />
              <p className="text-muted">
                {isEn ? 'No reports found' : 'Aucun rapport trouvé'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          className="flex items-center justify-between p-4 border-t"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <p className="text-xs text-muted">
            {filteredReports.length} {isEn ? 'report(s)' : 'rapport(s)'}
          </p>
          <button onClick={onClose} className="btn-secondary">
            {isEn ? 'Close' : 'Fermer'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Reports() {
  const { language } = useI18n();
  const isEn = language === 'en';
  const toast = useToast();
  const [showTip, setShowTip] = useState(true);
  const [previewReport, setPreviewReport] = useState<any | null>(null);
  const [showAllReports, setShowAllReports] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const reportTypes = [
    {
      id: 'balance-sheet',
      nameEn: 'Balance Sheet',
      nameFr: 'Bilan',
      descEn: 'Financial position at a specific date',
      descFr: 'État de la situation financière à une date donnée',
      icon: FileText,
      href: '/app/reports/balance-sheet',
    },
    {
      id: 'income-statement',
      nameEn: 'Income Statement',
      nameFr: 'État des résultats',
      descEn: 'Financial performance over a period',
      descFr: 'Performance financière sur une période',
      icon: TrendingUp,
      href: '/app/reports/income-statement',
    },
    {
      id: 'cash-flow',
      nameEn: 'Cash Flow Statement',
      nameFr: 'Flux de trésorerie',
      descEn: 'Cash movements by activity',
      descFr: 'Mouvements de trésorerie par activité',
      icon: DollarSign,
      href: '/app/reports/cash-flow',
    },
    {
      id: 'trial-balance',
      nameEn: 'Trial Balance',
      nameFr: 'Balance de vérification',
      descEn: 'All accounts with balances',
      descFr: 'Liste de tous les comptes avec soldes',
      icon: ListChecks,
      href: '/app/reports/trial-balance',
    },
  ];

  // All available reports (expanded list for "View All")
  const allReports = [
    {
      id: '1',
      nameEn: 'Balance Sheet - Dec 31, 2025',
      nameFr: 'Bilan au 31 décembre 2025',
      type: 'balance-sheet',
      generatedAt: '2025-01-15T10:30:00',
      format: 'PDF',
    },
    {
      id: '2',
      nameEn: 'Income Statement - Q4 2025',
      nameFr: 'État des résultats - Q4 2025',
      type: 'income-statement',
      generatedAt: '2025-01-10T14:20:00',
      format: 'Excel',
    },
    {
      id: '3',
      nameEn: 'Balance Sheet - Nov 30, 2025',
      nameFr: 'Bilan au 30 novembre 2025',
      type: 'balance-sheet',
      generatedAt: '2024-12-05T09:15:00',
      format: 'PDF',
    },
    {
      id: '4',
      nameEn: 'Cash Flow Statement - Q4 2025',
      nameFr: 'Flux de trésorerie - Q4 2025',
      type: 'cash-flow',
      generatedAt: '2025-01-08T11:45:00',
      format: 'PDF',
    },
    {
      id: '5',
      nameEn: 'Trial Balance - Dec 2025',
      nameFr: 'Balance de vérification - Déc 2025',
      type: 'trial-balance',
      generatedAt: '2025-01-05T16:20:00',
      format: 'Excel',
    },
    {
      id: '6',
      nameEn: 'Income Statement - Q3 2025',
      nameFr: 'État des résultats - Q3 2025',
      type: 'income-statement',
      generatedAt: '2024-10-12T09:30:00',
      format: 'PDF',
    },
    {
      id: '7',
      nameEn: 'Balance Sheet - Sep 30, 2025',
      nameFr: 'Bilan au 30 septembre 2025',
      type: 'balance-sheet',
      generatedAt: '2024-10-08T14:15:00',
      format: 'PDF',
    },
    {
      id: '8',
      nameEn: 'Cash Flow Statement - Q3 2025',
      nameFr: 'Flux de trésorerie - Q3 2025',
      type: 'cash-flow',
      generatedAt: '2024-10-05T10:00:00',
      format: 'Excel',
    },
  ];

  // Show only recent 3 in main view
  const recentReports = allReports.slice(0, 3);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDownload = async (report: any) => {
    const reportName = isEn ? report.nameEn : report.nameFr;
    setDownloadingId(report.id);
    
    // Simulate download delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success(
      isEn ? 'Download Complete' : 'Téléchargement terminé',
      isEn 
        ? `"${reportName}" has been downloaded as ${report.format}`
        : `"${reportName}" a été téléchargé au format ${report.format}`
    );
    
    setDownloadingId(null);
    setPreviewReport(null);
  };

  const handleView = (report: any) => {
    setPreviewReport(report);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h2 
          className="text-xl sm:text-2xl font-semibold"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          {isEn ? 'Financial Reports' : 'Rapports financiers'}
        </h2>
        <p 
          className="text-sm mt-1"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          {isEn 
            ? 'Generate clear financial reports with integrated anomaly detection'
            : 'Générez des rapports financiers clairs avec détection d\'anomalies intégrée'}
        </p>
      </div>

      {/* Helpful tip */}
      {showTip && (
        <InfoBanner
          type="tip"
          title={isEn ? 'Optimized reports' : 'Rapports optimisés'}
          description={isEn 
            ? 'Our reports are designed for maximum readability with automatic highlighting of anomalies and significant variations. Choose a report type below to get started.'
            : 'Nos rapports sont conçus pour une lisibilité maximale avec mise en évidence automatique des anomalies et variations significatives. Choisissez un type de rapport ci-dessous pour commencer.'}
          dismissible
          onDismiss={() => setShowTip(false)}
        />
      )}

      {/* Report Types Grid - Unified monochromatic icons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reportTypes.map((report) => (
          <Link
            key={report.id}
            to={report.href}
            className="group p-4 sm:p-5 rounded-xl transition-all hover:shadow-md"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              border: '1px solid rgb(var(--color-border))'
            }}
          >
            <div className="flex items-start gap-4">
              <div 
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
              >
                <report.icon 
                  className="w-5 h-5" 
                  style={{ color: 'rgb(var(--color-text-secondary))' }} 
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 
                    className="font-semibold text-sm sm:text-base"
                    style={{ color: 'rgb(var(--color-text))' }}
                  >
                    {isEn ? report.nameEn : report.nameFr}
                  </h3>
                  <ArrowRight 
                    className="w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-1" 
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  />
                </div>
                <p 
                  className="text-sm mt-1"
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                >
                  {isEn ? report.descEn : report.descFr}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Reports */}
      <div 
        className="rounded-xl p-4 sm:p-5"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          border: '1px solid rgb(var(--color-border))'
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 
              className="font-semibold"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? 'Recent Reports' : 'Rapports récents'}
            </h3>
            <p 
              className="text-xs mt-0.5"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn 
                ? 'Quickly access your latest generated reports'
                : 'Accédez rapidement à vos derniers rapports générés'}
            </p>
          </div>
          <button 
            onClick={() => setShowAllReports(true)}
            className="text-sm font-medium flex items-center gap-1 hover:underline"
            style={{ color: 'rgb(var(--color-interactive))' }}
          >
            {isEn ? 'View all' : 'Voir tous'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {recentReports.length > 0 ? (
          <div className="space-y-2">
            {recentReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div 
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgb(var(--color-surface))' }}
                  >
                    <FileText 
                      className="w-4 h-4" 
                      style={{ color: 'rgb(var(--color-text-muted))' }} 
                    />
                  </div>
                  <div className="min-w-0">
                    <p 
                      className="font-medium text-sm truncate"
                      style={{ color: 'rgb(var(--color-text))' }}
                    >
                      {isEn ? report.nameEn : report.nameFr}
                    </p>
                    <div 
                      className="flex items-center gap-1 text-xs"
                      style={{ color: 'rgb(var(--color-text-muted))' }}
                    >
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(report.generatedAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <span 
                    className="px-2 py-0.5 text-xs font-medium rounded"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-bg-emphasis))',
                      color: 'rgb(var(--color-text-secondary))'
                    }}
                  >
                    {report.format}
                  </span>
                  <button 
                    onClick={() => handleView(report)}
                    className="p-2 rounded-lg transition-colors hover:bg-surface"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                    title={isEn ? 'View report' : 'Visualiser le rapport'}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDownload(report)}
                    disabled={downloadingId === report.id}
                    className="p-2 rounded-lg transition-colors hover:bg-surface disabled:opacity-50"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                    title={isEn ? 'Download report' : 'Télécharger le rapport'}
                  >
                    {downloadingId === report.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText 
              className="w-10 h-10 mx-auto mb-3" 
              style={{ color: 'rgb(var(--color-text-muted))' }} 
            />
            <p style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'No reports generated yet' : 'Aucun rapport généré pour le moment'}
            </p>
            <p 
              className="text-sm mt-1"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn 
                ? 'Select a report type above to get started'
                : 'Sélectionnez un type de rapport ci-dessus pour commencer'}
            </p>
          </div>
        )}
      </div>

      {/* Anomaly Detection Info */}
      <div 
        className="rounded-xl p-4 sm:p-5"
        style={{ 
          backgroundColor: 'rgb(var(--color-bg-muted))',
          border: '1px solid rgb(var(--color-border))'
        }}
      >
        <div className="flex items-start gap-4">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgb(var(--color-text))' }}
          >
            <Sparkles className="w-5 h-5" style={{ color: 'rgb(var(--color-bg))' }} />
          </div>
          <div>
            <h4 
              className="font-semibold"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? 'Automatic anomaly detection' : 'Détection automatique des anomalies'}
            </h4>
            <p 
              className="text-sm mt-1"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? 'All our reports include automatic analysis to identify significant variances, unusual trends, and inconsistencies in your financial data.'
                : 'Tous nos rapports intègrent une analyse automatique pour identifier les écarts significatifs, les tendances inhabituelles et les incohérences dans vos données financières.'}
            </p>
            <Link
              to="/app/anomalies"
              className="text-sm font-medium mt-2 inline-flex items-center gap-1"
              style={{ color: 'rgb(var(--color-interactive))' }}
            >
              {isEn ? 'View anomalies dashboard' : 'Voir le tableau de bord anomalies'}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Report Preview Modal */}
      {previewReport && (
        <ReportPreviewModal
          report={previewReport}
          isEn={isEn}
          onClose={() => setPreviewReport(null)}
          onDownload={() => handleDownload(previewReport)}
        />
      )}

      {/* All Reports Modal */}
      {showAllReports && (
        <AllReportsModal
          reports={allReports}
          isEn={isEn}
          onClose={() => setShowAllReports(false)}
          onView={handleView}
          onDownload={handleDownload}
          formatDate={formatDate}
        />
      )}
    </div>
  );
}
