import { useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, Download, RefreshCw, Printer, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useIncomeStatement } from '../hooks/useFinancialData';
import { useTenant } from '../contexts/TenantContext';
import { useI18n } from '../lib/i18n';
import type { AccountBalanceExtended } from '../lib/financialData';

const PAGE_SIZE = 100;
const sum = (lines: AccountBalanceExtended[]) => lines.reduce((total, line) => total + line.current, 0);
const csvCell = (value: string | number) => {
  const text = typeof value === 'string' && /^[=+@\-\t\r]/.test(value) ? `'${value}` : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

/** A dated statement from actual account lines. No inferred accounts or prior-year values. */
export default function IncomeStatement() {
  const { currentTenant } = useTenant();
  const { language } = useI18n();
  const isEn = language === 'en';
  const today = new Date().toISOString().slice(0, 10);
  const [period, setPeriod] = useState({ start: `${today.slice(0, 4)}-01-01`, end: today });
  const [draft, setDraft] = useState(period);
  const [dateError, setDateError] = useState('');
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState('');
  const { data, isLoading, error, refresh } = useIncomeStatement(period.start, period.end);

  const sections = useMemo(() => data ? [
    { key: 'revenue', label: isEn ? 'Revenue' : 'Revenus', lines: data.revenue },
    { key: 'cogs', label: isEn ? 'Cost of goods sold' : 'Coût des ventes', lines: data.costOfGoodsSold },
    { key: 'operating', label: isEn ? 'Operating expenses' : "Charges d’exploitation", lines: data.operatingExpenses },
    { key: 'other-income', label: isEn ? 'Other income' : 'Autres revenus', lines: data.otherIncome },
    { key: 'other-expenses', label: isEn ? 'Other expenses' : 'Autres charges', lines: data.otherExpenses },
    { key: 'unclassified', label: isEn ? 'Expenses awaiting classification' : 'Charges à classer', lines: data.unclassifiedExpenses ?? [] },
  ] : [], [data, isEn]);
  const rows = useMemo(() => sections.flatMap(section => section.lines.map((line, index) => ({
    ...line, section: section.label, rowKey: `${section.key}:${line.code}:${index}`,
  }))), [sections]);
  const invalidData = rows.some(row => !Number.isFinite(row.current) ||
    (data?.hasComparison && !Number.isFinite(row.prior)));
  const totalRevenue = data ? sum(data.revenue) + sum(data.otherIncome) : 0;
  const totalExpenses = data ? sum(data.costOfGoodsSold) + sum(data.operatingExpenses) +
    sum(data.otherExpenses) + sum(data.unclassifiedExpenses ?? []) : 0;
  const netIncome = totalRevenue - totalExpenses;
  const invalidTotals = ![totalRevenue, totalExpenses, netIncome].every(Number.isFinite);
  const hasData = rows.length > 0 && !invalidData && !invalidTotals;
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const currency = data?.currency || currentTenant?.settings.currency || 'CAD';
  const currencyFormatter = useMemo(() => {
    try { return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', { style: 'currency', currency }); }
    catch { return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', { minimumFractionDigits: 2 }); }
  }, [currency, isEn]);
  const money = (value: number) => currencyFormatter.format(value);

  const applyPeriod = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.start || !draft.end || draft.start > draft.end ||
        !Number.isFinite(Date.parse(draft.start)) || !Number.isFinite(Date.parse(draft.end))) {
      setDateError(isEn ? 'Choose a valid start date on or before the end date.' : 'Choisissez une date de début valide antérieure ou égale à la date de fin.');
      return;
    }
    setDateError('');
    setPage(1);
    setPeriod({ ...draft });
  };
  const reload = async () => {
    setRefreshing(true);
    setActionError('');
    try { await refresh(); }
    catch { setActionError(isEn ? 'Refresh failed. Try again.' : 'Actualisation impossible. Réessayez.'); }
    finally { setRefreshing(false); }
  };
  const exportCsv = () => {
    if (!hasData) return;
    const headers = isEn ? ['Section', 'Code', 'Account', 'Amount', 'Currency'] : ['Section', 'Code', 'Compte', 'Montant', 'Devise'];
    const lines = [headers, ...rows.map(row => [row.section, row.code,
      isEn ? row.nameEn || row.name : row.name, row.current, currency]),
      [isEn ? 'Net income' : 'Résultat net', '', '', netIncome, currency]];
    const file = new Blob(['\uFEFF', lines.map(line => line.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `income-statement-${period.start}-${period.end}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="min-w-0 space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Link to="/app/reports" className="rounded-lg p-2 shrink-0" aria-label={isEn ? 'Back to reports' : 'Retour aux rapports'}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold break-words">{isEn ? 'Income statement' : 'État des résultats'}</h1>
            <p className="mt-1 text-sm text-muted break-words">{currentTenant?.name} · {currency}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button type="button" className="btn-secondary" onClick={() => void reload()} disabled={refreshing || isLoading}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />{isEn ? 'Refresh' : 'Actualiser'}
          </button>
          <button type="button" className="btn-secondary" onClick={exportCsv} disabled={!hasData || isLoading || !!error}>
            <Download className="h-4 w-4" />{isEn ? 'Export CSV' : 'Exporter CSV'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => window.print()} disabled={!hasData || isLoading || !!error}>
            <Printer className="h-4 w-4" />{isEn ? 'Print / save PDF' : 'Imprimer / PDF'}
          </button>
        </div>
      </header>

      <form onSubmit={applyPeriod} className="card grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_auto] print:hidden">
        <label className="min-w-0 space-y-1 text-sm" htmlFor="income-period-start">
          <span>{isEn ? 'Period start' : 'Début de période'}</span>
          <input id="income-period-start" required type="date" className="input w-full min-w-0" value={draft.start}
            max={draft.end || undefined} onChange={event => setDraft(value => ({ ...value, start: event.target.value }))} />
        </label>
        <label className="min-w-0 space-y-1 text-sm" htmlFor="income-period-end">
          <span>{isEn ? 'Period end' : 'Fin de période'}</span>
          <input id="income-period-end" required type="date" className="input w-full min-w-0" value={draft.end}
            min={draft.start || undefined} onChange={event => setDraft(value => ({ ...value, end: event.target.value }))} />
        </label>
        <button type="submit" className="btn-primary self-end" disabled={isLoading}>{isEn ? 'Apply dates' : 'Appliquer les dates'}</button>
        {dateError && <p role="alert" className="text-error sm:col-span-2">{dateError}</p>}
      </form>
      {actionError && <p role="alert" className="text-error">{actionError}</p>}

      {isLoading ? (
        <section role="status" aria-live="polite" className="card space-y-4" aria-label={isEn ? 'Loading income statement' : 'Chargement des résultats'}>
          <p>{isEn ? 'Loading income statement…' : 'Chargement de l’état des résultats…'}</p>
          <div className="h-16 animate-pulse rounded-lg bg-[rgb(var(--color-bg-muted))]" />
          <div className="h-32 animate-pulse rounded-lg bg-[rgb(var(--color-bg-muted))]" />
        </section>
      ) : error || invalidData || invalidTotals ? (
        <section role="alert" className="card space-y-3">
          <AlertTriangle className="h-7 w-7 text-error" />
          <h2 className="text-lg font-semibold">{isEn ? 'Statement unavailable' : 'État indisponible'}</h2>
          <p>{invalidData || invalidTotals
            ? (isEn ? 'Some account amounts are invalid. Correct the source data and refresh the statement.' : 'Certains montants sont invalides. Corrigez les données sources et actualisez l’état.')
            : (isEn ? 'The statement could not be loaded. Check your connection and try again.' : 'Impossible de charger l’état. Vérifiez votre connexion et réessayez.')}</p>
          <button type="button" className="btn-primary" onClick={() => void reload()}>{isEn ? 'Try again' : 'Réessayer'}</button>
        </section>
      ) : !hasData ? (
        <section role="status" className="card space-y-3">
          <h2 className="text-lg font-semibold">{isEn ? 'No transactions in this period' : 'Aucune opération pour cette période'}</h2>
          <p className="text-muted">{isEn ? 'Choose another date range, or connect and synchronize your accounting data.' : 'Choisissez une autre période ou connectez et synchronisez vos données comptables.'}</p>
          <Link className="btn-secondary inline-flex" to="/app/connections">{isEn ? 'Manage connections' : 'Gérer les connexions'}</Link>
        </section>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: isEn ? 'Total revenue' : 'Total des revenus', value: totalRevenue },
              { label: isEn ? 'Total expenses' : 'Total des charges', value: totalExpenses },
              { label: isEn ? 'Net income' : 'Résultat net', value: netIncome },
            ].map(metric => <div key={metric.label} className="card min-w-0">
              <p className="text-sm text-muted">{metric.label}</p>
              <p className="mt-2 break-words text-xl font-semibold tabular-nums">{money(metric.value)}</p>
            </div>)}
          </div>
          {(data?.unclassifiedExpenses?.length ?? 0) > 0 && <p className="rounded-lg bg-[rgb(var(--color-bg-muted))] p-4 text-sm" role="note">
            {isEn ? 'Some expense accounts have no source classification. They are included in total expenses and net income; gross and operating margins are unavailable until these accounts are classified.' : 'Certains comptes de charges ne sont pas classés à la source. Ils sont inclus dans le total des charges et le résultat net; les marges brute et d’exploitation seront disponibles après leur classement.'}
          </p>}
          <section className="card min-w-0 p-0 overflow-hidden" aria-label={isEn ? 'Income statement account lines' : 'Comptes de l’état des résultats'}>
            <div className="border-b p-4" style={{ borderColor: 'rgb(var(--color-border))' }}>
              <p className="font-semibold">{period.start} — {period.end}</p>
              {!data?.hasComparison && <p className="mt-1 text-sm text-muted">{isEn ? 'Prior-period comparison is not available for this report.' : 'La comparaison avec la période précédente n’est pas disponible pour ce rapport.'}</p>}
            </div>
            <div className="overflow-x-auto" role="region" tabIndex={0} aria-label={isEn ? 'Scrollable account table' : 'Tableau des comptes défilant'}>
              <table className="w-full min-w-[640px] text-sm">
                <caption className="sr-only">{isEn ? 'Actual income statement account balances' : 'Soldes réels des comptes de résultats'}</caption>
                <thead className="bg-[rgb(var(--color-bg-muted))]"><tr>
                  <th scope="col" className="p-3 text-left">{isEn ? 'Section' : 'Section'}</th>
                  <th scope="col" className="p-3 text-left">Code</th>
                  <th scope="col" className="p-3 text-left">{isEn ? 'Account' : 'Compte'}</th>
                  <th scope="col" className="p-3 text-right">{isEn ? 'Actual' : 'Réel'}</th>
                  {data?.hasComparison && <th scope="col" className="p-3 text-right">{isEn ? 'Prior period' : 'Période précédente'}</th>}
                </tr></thead>
                <tbody>{visibleRows.map(row => <tr key={row.rowKey} className="border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
                  <td className="p-3 text-muted">{row.section}</td>
                  <td className="p-3 font-mono">{row.code}</td>
                  <th scope="row" className="max-w-sm break-words p-3 text-left font-normal">{isEn ? row.nameEn || row.name : row.name}</th>
                  <td className="whitespace-nowrap p-3 text-right tabular-nums">{money(row.current)}</td>
                  {data?.hasComparison && <td className="whitespace-nowrap p-3 text-right tabular-nums">{money(row.prior)}</td>}
                </tr>)}</tbody>
                <tfoot className="bg-[rgb(var(--color-bg-muted))] font-semibold"><tr>
                  <th scope="row" colSpan={3} className="p-3 text-left">{isEn ? 'Net income · all accounts' : 'Résultat net · tous les comptes'}</th>
                  <td className="p-3 text-right tabular-nums">{money(netIncome)}</td>
                  {data?.hasComparison && <td />}
                </tr></tfoot>
              </table>
            </div>
            {totalPages > 1 && <nav className="flex flex-wrap items-center justify-between gap-3 border-t p-4 print:hidden" aria-label={isEn ? 'Account pages' : 'Pages des comptes'}>
              <button className="btn-secondary" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>{isEn ? 'Previous' : 'Précédent'}</button>
              <p className="text-sm" aria-live="polite">{isEn ? `Page ${currentPage} of ${totalPages} · ${rows.length} accounts` : `Page ${currentPage} sur ${totalPages} · ${rows.length} comptes`}</p>
              <button className="btn-secondary" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>{isEn ? 'Next' : 'Suivant'}</button>
            </nav>}
          </section>
        </>
      )}
    </div>
  );
}
