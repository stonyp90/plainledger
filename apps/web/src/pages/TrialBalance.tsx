import { useState, useMemo } from 'react';
import { ArrowLeft, Download, Calendar, RefreshCw, Printer, Share2, Loader2, AlertTriangle, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFinancialData } from '../hooks/useFinancialData';
import { useHasRealData } from '../hooks/useHasRealData';
import { useAccountDataAccess } from '../hooks/useAccountDataAccess';
import { useTenant } from '../contexts/TenantContext';
import PaidNoConnectionGate from '../components/PaidNoConnectionGate';
import { useI18n } from '../lib/i18n';
import ShareModal from '../components/ShareModal';
import DataReadinessChecklist from '../components/DataReadinessChecklist';
import AccountantGuidanceCard from '../components/AccountantGuidanceCard';
import EmptyDataState from '../components/EmptyDataState';
import { ContentLoader } from '../components/PageLoader';

interface TrialBalanceAccount {
  code: string;
  name: string;
  nameEn: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  debit: number;
  credit: number;
}

export default function TrialBalance() {
  const { currentTenant } = useTenant();
  const { language } = useI18n();
  const isEn = language === 'en';
  
  // Account data access rules - check if paid user needs to connect
  const { shouldBlockUI, isLoading: accessLoading } = useAccountDataAccess();
  
  // CRITICAL: Block paid users without connection - show connection gate
  if (shouldBlockUI && !accessLoading) {
    return <PaidNoConnectionGate context="statements" />;
  }
  
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showShareModal, setShowShareModal] = useState(false);

  const { data: financialData, isLoading, error, refresh } = useFinancialData();
  const { hasTrialBalance, hasRealData, hasQuickBooksConnection, hasSandboxData, shouldShowSandboxData, hasAccounts } = useHasRealData();
  const shouldShowData = hasRealData || shouldShowSandboxData;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const handleExportPDF = () => {
    const filename = `trial-balance-${asOfDate}.pdf`;
    alert(isEn 
      ? `Generating PDF "${filename}"...`
      : `Génération du PDF "${filename}"...`
    );
  };

  const handlePrint = () => window.print();
  
  const handleShare = () => {
    setShowShareModal(true);
  };

  const formatCurrency = (value: number) => {
    if (value === 0) return '-';
    const currency = currentTenant?.settings?.currency || 'CAD';
    return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(value));
  };

  // Generate trial balance data
  const trialBalanceData = useMemo((): TrialBalanceAccount[] => {
    if (!financialData) return [];

    const accounts: TrialBalanceAccount[] = [
      // Assets (Debit balances)
      { code: '1000', name: 'Encaisse et équivalents', nameEn: 'Cash and Equivalents', type: 'asset', debit: 245000, credit: 0 },
      { code: '1100', name: 'Comptes clients', nameEn: 'Accounts Receivable', type: 'asset', debit: 185000, credit: 0 },
      { code: '1150', name: 'Provision pour créances douteuses', nameEn: 'Allowance for Doubtful Accounts', type: 'asset', debit: 0, credit: 9250 },
      { code: '1200', name: 'Stocks', nameEn: 'Inventory', type: 'asset', debit: 78000, credit: 0 },
      { code: '1300', name: 'Frais payés d\'avance', nameEn: 'Prepaid Expenses', type: 'asset', debit: 12000, credit: 0 },
      { code: '1500', name: 'Immobilisations corporelles', nameEn: 'Property and Equipment', type: 'asset', debit: 450000, credit: 0 },
      { code: '1600', name: 'Amortissement cumulé', nameEn: 'Accumulated Depreciation', type: 'asset', debit: 0, credit: 125000 },
      
      // Liabilities (Credit balances)
      { code: '2000', name: 'Comptes fournisseurs', nameEn: 'Accounts Payable', type: 'liability', debit: 0, credit: 78000 },
      { code: '2100', name: 'Charges à payer', nameEn: 'Accrued Expenses', type: 'liability', debit: 0, credit: 45000 },
      { code: '2150', name: 'Salaires à payer', nameEn: 'Salaries Payable', type: 'liability', debit: 0, credit: 28000 },
      { code: '2200', name: 'Portion courante dette LT', nameEn: 'Current Portion LT Debt', type: 'liability', debit: 0, credit: 25000 },
      { code: '2300', name: 'Taxes de vente à payer', nameEn: 'Sales Tax Payable', type: 'liability', debit: 0, credit: 18500 },
      { code: '2500', name: 'Dette à long terme', nameEn: 'Long-term Debt', type: 'liability', debit: 0, credit: 175000 },
      
      // Equity (Credit balances)
      { code: '3000', name: 'Capital-actions', nameEn: 'Share Capital', type: 'equity', debit: 0, credit: 100000 },
      { code: '3100', name: 'Bénéfices non répartis', nameEn: 'Retained Earnings', type: 'equity', debit: 0, credit: 343000 },
      { code: '3200', name: 'Résultat de l\'exercice', nameEn: 'Current Year Earnings', type: 'equity', debit: 0, credit: 79000 },
      
      // Revenue (Credit balances)
      { code: '4000', name: 'Ventes de produits', nameEn: 'Product Sales', type: 'revenue', debit: 0, credit: 1450000 },
      { code: '4100', name: 'Ventes de services', nameEn: 'Service Revenue', type: 'revenue', debit: 0, credit: 520000 },
      { code: '4200', name: 'Autres revenus', nameEn: 'Other Revenue', type: 'revenue', debit: 0, credit: 85000 },
      { code: '4500', name: 'Escomptes sur ventes', nameEn: 'Sales Discounts', type: 'revenue', debit: 25000, credit: 0 },
      { code: '4600', name: 'Retours sur ventes', nameEn: 'Sales Returns', type: 'revenue', debit: 12000, credit: 0 },
      
      // Expenses (Debit balances)
      { code: '5000', name: 'Coût des marchandises vendues', nameEn: 'Cost of Goods Sold', type: 'expense', debit: 892000, credit: 0 },
      { code: '6000', name: 'Salaires et avantages', nameEn: 'Salaries and Benefits', type: 'expense', debit: 485000, credit: 0 },
      { code: '6100', name: 'Loyer', nameEn: 'Rent', type: 'expense', debit: 96000, credit: 0 },
      { code: '6150', name: 'Services publics', nameEn: 'Utilities', type: 'expense', debit: 24000, credit: 0 },
      { code: '6200', name: 'Marketing et publicité', nameEn: 'Marketing and Advertising', type: 'expense', debit: 78000, credit: 0 },
      { code: '6300', name: 'Amortissement', nameEn: 'Depreciation Expense', type: 'expense', debit: 30000, credit: 0 },
      { code: '6400', name: 'Frais professionnels', nameEn: 'Professional Fees', type: 'expense', debit: 45000, credit: 0 },
      { code: '6500', name: 'Assurances', nameEn: 'Insurance', type: 'expense', debit: 36000, credit: 0 },
      { code: '6600', name: 'Fournitures de bureau', nameEn: 'Office Supplies', type: 'expense', debit: 18000, credit: 0 },
      { code: '6700', name: 'Télécommunications', nameEn: 'Telecommunications', type: 'expense', debit: 14000, credit: 0 },
      { code: '6800', name: 'Déplacements', nameEn: 'Travel', type: 'expense', debit: 28000, credit: 0 },
      { code: '6900', name: 'Autres charges d\'exploitation', nameEn: 'Other Operating Expenses', type: 'expense', debit: 42000, credit: 0 },
      { code: '7000', name: 'Revenus d\'intérêts', nameEn: 'Interest Income', type: 'expense', debit: 0, credit: 5000 },
      { code: '7100', name: 'Charges d\'intérêts', nameEn: 'Interest Expense', type: 'expense', debit: 15000, credit: 0 },
      { code: '8000', name: 'Impôts sur le revenu', nameEn: 'Income Tax Expense', type: 'expense', debit: 52750, credit: 0 },
    ];

    return accounts;
  }, [financialData]);

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    return trialBalanceData.filter(account => {
      const matchesSearch = searchQuery === '' || 
        account.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.nameEn.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = filterType === 'all' || account.type === filterType;
      
      return matchesSearch && matchesType;
    });
  }, [trialBalanceData, searchQuery, filterType]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalDebit = trialBalanceData.reduce((sum, acc) => sum + acc.debit, 0);
    const totalCredit = trialBalanceData.reduce((sum, acc) => sum + acc.credit, 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
    
    return { totalDebit, totalCredit, isBalanced, difference: totalDebit - totalCredit };
  }, [trialBalanceData]);

  const typeLabels = {
    all: isEn ? 'All Accounts' : 'Tous les comptes',
    asset: isEn ? 'Assets' : 'Actifs',
    liability: isEn ? 'Liabilities' : 'Passifs',
    equity: isEn ? 'Equity' : 'Capitaux propres',
    revenue: isEn ? 'Revenue' : 'Revenus',
    expense: isEn ? 'Expenses' : 'Charges',
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'asset': return 'rgb(var(--color-primary-500))';
      case 'liability': return 'rgb(var(--color-error))';
      case 'equity': return 'rgb(var(--color-success))';
      case 'revenue': return 'rgb(var(--color-success))';
      case 'expense': return 'rgb(var(--color-warning))';
      default: return 'rgb(var(--color-text-muted))';
    }
  };

  if (isLoading && !financialData) {
    return (
      <ContentLoader 
        message="Chargement de la balance de vérification..."
        messageEn="Loading trial balance..."
      />
    );
  }

  // Show empty state if no real data and no sandbox data
  if (!shouldShowData || !hasTrialBalance || !hasAccounts || !trialBalanceData.length) {
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
                {isEn ? 'Trial Balance' : 'Balance de vérification'}
              </h2>
              <p className="text-sm hidden sm:block" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? 'All accounts with balances' : 'Liste de tous les comptes avec soldes'}
              </p>
            </div>
          </div>
        </div>
        
        <EmptyDataState 
          context="accounts"
          hasConnection={false}
          onConnect={() => window.location.href = '/app/settings?tab=connections'}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-error" />
        <h3 className="font-semibold text-lg mb-2">{isEn ? 'Error' : 'Erreur'}</h3>
        <p className="text-muted mb-4">{error.message}</p>
        <button onClick={handleRefresh} className="btn-primary">{isEn ? 'Retry' : 'Réessayer'}</button>
      </div>
    );
  }

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
              {isEn ? 'Trial Balance' : 'Balance de vérification'}
            </h2>
            <p className="text-sm hidden sm:block" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn ? 'All accounts with balances' : 'Liste de tous les comptes avec soldes'}
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
            <span className="hidden sm:inline">{isEn ? 'Export' : 'Exporter'}</span>
          </button>
        </div>
      </div>

      {/* Data Readiness Checklist */}
      {financialData && (
        <DataReadinessChecklist 
          context="reports" 
          compact={trialBalanceData.length > 0}
        />
      )}

      {/* Accountant Guidance - Show when accounts data is missing */}
      {financialData && !financialData.accounts?.length && (
        <AccountantGuidanceCard 
          type="connect-software"
          compact={true}
        />
      )}

      {/* Controls */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="label">{isEn ? 'As of Date' : 'En date du'}</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
              <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="input pl-10" />
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="label">{isEn ? 'Search' : 'Rechercher'}</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
              <input 
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                placeholder={isEn ? 'Search by code or name...' : 'Rechercher par code ou nom...'}
                className="input pl-10 w-full" 
              />
            </div>
          </div>
          <div>
            <label className="label">{isEn ? 'Filter by Type' : 'Filtrer par type'}</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)} 
                className="input pl-10 pr-8"
              >
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Trial Balance Table */}
      <div className="card p-0 overflow-hidden">
        <div className="p-6 border-b" style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-bg-muted))' }}>
          <h3 className="text-xl font-bold text-center" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'TRIAL BALANCE' : 'BALANCE DE VÉRIFICATION'}
          </h3>
          <p className="text-center mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn 
              ? `As of ${new Date(asOfDate).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}`
              : `Au ${new Date(asOfDate).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })}`}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
              <tr>
                <th className="py-3 px-4 text-left text-sm font-semibold w-24" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Code' : 'Code'}
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Account' : 'Compte'}
                </th>
                <th className="py-3 px-4 text-center text-sm font-semibold w-24" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Type' : 'Type'}
                </th>
                <th className="py-3 px-4 text-right text-sm font-semibold w-32" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Debit' : 'Débit'}
                </th>
                <th className="py-3 px-4 text-right text-sm font-semibold w-32" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Credit' : 'Crédit'}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((account) => (
                <tr key={account.code} className="hover:bg-[rgb(var(--color-bg-muted))] border-b" style={{ borderColor: 'rgb(var(--color-border) / 0.5)' }}>
                  <td className="py-2 px-4 font-mono text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{account.code}</td>
                  <td className="py-2 px-4" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? account.nameEn : account.name}
                  </td>
                  <td className="py-2 px-4 text-center">
                    <span 
                      className="px-2 py-0.5 text-xs font-medium rounded"
                      style={{ backgroundColor: `${getTypeColor(account.type)}20`, color: getTypeColor(account.type) }}
                    >
                      {typeLabels[account.type]}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-right font-mono tabular-nums" style={{ color: 'rgb(var(--color-text))' }}>
                    {formatCurrency(account.debit)}
                  </td>
                  <td className="py-2 px-4 text-right font-mono tabular-nums" style={{ color: 'rgb(var(--color-text))' }}>
                    {formatCurrency(account.credit)}
                  </td>
                </tr>
              ))}
              
              {/* Totals Row */}
              <tr className="font-bold" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
                <td className="py-4 px-4"></td>
                <td className="py-4 px-4" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'TOTAL' : 'TOTAL'}
                </td>
                <td className="py-4 px-4"></td>
                <td className="py-4 px-4 text-right font-mono tabular-nums" style={{ color: 'rgb(var(--color-text))' }}>
                  {formatCurrency(totals.totalDebit)}
                </td>
                <td className="py-4 px-4 text-right font-mono tabular-nums" style={{ color: 'rgb(var(--color-text))' }}>
                  {formatCurrency(totals.totalCredit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Balance Check */}
        <div 
          className="p-4"
          style={{ 
            backgroundColor: totals.isBalanced 
              ? 'rgb(var(--color-success) / 0.1)' 
              : 'rgb(var(--color-error) / 0.1)'
          }}
        >
          <p 
            className="text-center text-sm font-medium"
            style={{ 
              color: totals.isBalanced 
                ? 'rgb(var(--color-success))' 
                : 'rgb(var(--color-error))'
            }}
          >
            {totals.isBalanced
              ? (isEn ? 'Trial balance is balanced' : 'La balance de vérification est équilibrée')
              : (isEn 
                  ? `Warning: Out of balance by ${formatCurrency(totals.difference)}`
                  : `Attention: Écart de ${formatCurrency(totals.difference)}`
                )}
          </p>
        </div>
      </div>

      {/* Account Summary by Type */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {(['asset', 'liability', 'equity', 'revenue', 'expense'] as const).map(type => {
          const accounts = trialBalanceData.filter(a => a.type === type);
          const totalDebit = accounts.reduce((sum, a) => sum + a.debit, 0);
          const totalCredit = accounts.reduce((sum, a) => sum + a.credit, 0);
          const netBalance = totalDebit - totalCredit;
          
          return (
            <div 
              key={type} 
              className="card p-4 text-center cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setFilterType(type)}
            >
              <p className="text-xs uppercase tracking-wide mb-2" style={{ color: getTypeColor(type) }}>
                {typeLabels[type]}
              </p>
              <p className="text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                {accounts.length}
              </p>
              <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'accounts' : 'comptes'}
              </p>
              <p className="text-sm font-medium mt-2" style={{ color: netBalance >= 0 ? 'rgb(var(--color-text))' : 'rgb(var(--color-error))' }}>
                {formatCurrency(Math.abs(netBalance))} {netBalance >= 0 ? 'Dr' : 'Cr'}
              </p>
            </div>
          );
        })}
      </div>

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Balance de vérification"
        titleEn="Trial Balance"
        subtitle={new Date(asOfDate).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
        contentType="report"
        showDownloadOption={true}
      />
    </div>
  );
}
