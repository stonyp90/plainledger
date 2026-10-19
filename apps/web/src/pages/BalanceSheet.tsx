import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, Download, RefreshCw, Printer, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBalanceSheet } from '../hooks/useFinancialData';
import { useTenant } from '../contexts/TenantContext';
import { useI18n } from '../lib/i18n';
import type { AccountBalanceExtended } from '../lib/financialData';

const PAGE_SIZE = 100;
const sum = (lines: AccountBalanceExtended[]) => lines.reduce((total, line) => total + line.current, 0);
const csvCell = (value: string | number) => {
  const text = typeof value === 'string' && /^[=+@\-\t\r]/.test(value) ? `'${value}` : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};
const validDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

/** Posted ledger balances, with every source section preserved. */
export default function BalanceSheet() {
  const { currentTenant } = useTenant();
  const { language } = useI18n();
  const isEn = language === 'en';
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [draftDate, setDraftDate] = useState(asOfDate);
  const [dateError, setDateError] = useState('');
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [actionError, setActionError] = useState('');
  const { data, isLoading, error, refresh } = useBalanceSheet(asOfDate);

  const sections = useMemo(() => data ? [
    { key: 'current-assets', label: isEn ? 'Current assets' : 'Actif courant', group: 'assets', lines: data.assets.currentAssets },
    { key: 'fixed-assets', label: isEn ? 'Fixed assets' : 'Immobilisations', group: 'assets', lines: data.assets.fixedAssets },
    { key: 'other-assets', label: isEn ? 'Other assets' : 'Autres actifs', group: 'assets', lines: data.assets.otherAssets ?? [] },
    { key: 'unclassified-assets', label: isEn ? 'Assets awaiting classification' : 'Actifs à classer', group: 'assets', lines: data.assets.unclassifiedAssets ?? [] },
    { key: 'current-liabilities', label: isEn ? 'Current liabilities' : 'Passif courant', group: 'liabilities', lines: data.liabilities.currentLiabilities },
    { key: 'long-term-liabilities', label: isEn ? 'Long-term liabilities' : 'Passif à long terme', group: 'liabilities', lines: data.liabilities.longTermLiabilities },
    { key: 'unclassified-liabilities', label: isEn ? 'Liabilities awaiting classification' : 'Passifs à classer', group: 'liabilities', lines: data.liabilities.unclassifiedLiabilities ?? [] },
    { key: 'equity', label: isEn ? 'Equity' : 'Capitaux propres', group: 'equity', lines: data.equity },
  ] : [], [data, isEn]);
  const rows = useMemo(() => sections.flatMap(section => section.lines.map((line, index) => ({
    ...line, section: section.label, rowKey: `${section.key}:${line.code}:${index}`,
  }))), [sections]);
  const total = (group: string) => sections.filter(section => section.group === group).reduce((value, section) => value + sum(section.lines), 0);
  const assets = total('assets');
  const liabilities = total('liabilities');
  const equity = total('equity');
  const difference = assets - liabilities - equity;
  const invalidData = rows.some(row => !Number.isFinite(row.current)) || ![assets, liabilities, equity, difference].every(Number.isFinite);
  const unbalanced = !invalidData && Math.abs(difference) >= 0.01;
  const hasData = rows.length > 0 && !invalidData;
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = printing ? rows : rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const currency = data?.currency || currentTenant?.settings.currency || 'CAD';
  const formatter = useMemo(() => {
    try { return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', { style: 'currency', currency }); }
    catch { return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', { minimumFractionDigits: 2 }); }
  }, [currency, isEn]);
  const money = (value: number) => formatter.format(value);

  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener('afterprint', done, { once: true });
    const frame = requestAnimationFrame(() => window.print());
    return () => { cancelAnimationFrame(frame); window.removeEventListener('afterprint', done); };
  }, [printing]);

  const applyDate = (event: FormEvent) => {
    event.preventDefault();
    if (!validDay(draftDate)) {
      setDateError(isEn ? 'Choose a valid statement date.' : 'Choisissez une date de bilan valide.');
      return;
    }
    setDateError(''); setPage(1); setAsOfDate(draftDate);
  };
  const reload = async () => {
    setRefreshing(true); setActionError('');
    try { await refresh(); }
    catch { setActionError(isEn ? 'Refresh failed. Try again.' : 'Actualisation impossible. Réessayez.'); }
    finally { setRefreshing(false); }
  };
  const exportCsv = () => {
    if (!hasData || error) return;
    const lines: (string | number)[][] = [
      isEn ? ['Section', 'Code', 'Account', 'Balance', 'Currency', 'As of'] : ['Section', 'Code', 'Compte', 'Solde', 'Devise', 'Au'],
      ...rows.map(row => [row.section, row.code, isEn ? row.nameEn || row.name : row.name, row.current, currency, asOfDate]),
      [isEn ? 'Total assets' : 'Total de l’actif', '', '', assets, currency, asOfDate],
      [isEn ? 'Total liabilities' : 'Total du passif', '', '', liabilities, currency, asOfDate],
      [isEn ? 'Total equity' : 'Total des capitaux propres', '', '', equity, currency, asOfDate],
      [isEn ? 'Balance difference' : 'Écart du bilan', '', '', difference, currency, asOfDate],
    ];
    const blob = new Blob(['\uFEFF', lines.map(line => line.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `balance-sheet-${asOfDate}.csv`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="min-w-0 space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Link to="/app/reports" className="rounded-lg p-2 shrink-0 print:hidden" aria-label={isEn ? 'Back to reports' : 'Retour aux rapports'}><ArrowLeft className="h-5 w-5" /></Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold break-words">{isEn ? 'Balance Sheet' : 'Bilan'}</h1>
            <p className="mt-1 text-sm text-muted break-words">{data?.organizationName || currentTenant?.name} · {currency} · {asOfDate}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button type="button" className="btn-secondary" onClick={() => void reload()} disabled={refreshing || isLoading}><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />{isEn ? 'Refresh' : 'Actualiser'}</button>
          <button type="button" className="btn-secondary" onClick={exportCsv} disabled={!hasData || isLoading || !!error}><Download className="h-4 w-4" />{isEn ? 'Export CSV' : 'Exporter CSV'}</button>
          <button type="button" className="btn-secondary" onClick={() => setPrinting(true)} disabled={!hasData || isLoading || !!error || printing}><Printer className="h-4 w-4" />{isEn ? 'Print / save PDF' : 'Imprimer / PDF'}</button>
        </div>
      </header>

      <form onSubmit={applyDate} className="card grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] print:hidden">
        <label className="min-w-0 space-y-1 text-sm" htmlFor="balance-as-of"><span>{isEn ? 'Statement date' : 'Date du bilan'}</span>
          <input id="balance-as-of" required type="date" className="input w-full min-w-0" value={draftDate} onChange={event => setDraftDate(event.target.value)} />
        </label>
        <button type="submit" className="btn-primary self-end" disabled={isLoading}>{isEn ? 'Apply date' : 'Appliquer la date'}</button>
        {dateError && <p role="alert" className="text-error sm:col-span-2">{dateError}</p>}
      </form>
      {actionError && <p role="alert" className="text-error">{actionError}</p>}
      {data?.isDemoData && <p role="note" className="card">{isEn ? 'Sample data for development. These are not your organization’s balances.' : 'Données de démonstration. Ces soldes ne sont pas ceux de votre organisation.'}</p>}

      {isLoading ? (
        <section role="status" aria-live="polite" className="card space-y-4"><p>{isEn ? 'Loading balance sheet…' : 'Chargement du bilan…'}</p><div className="h-32 animate-pulse rounded-lg bg-[rgb(var(--color-bg-muted))]" /></section>
      ) : error || invalidData ? (
        <section role="alert" className="card space-y-3"><AlertTriangle className="h-7 w-7 text-error" /><h2 className="text-lg font-semibold">{isEn ? 'Balance sheet unavailable' : 'Bilan indisponible'}</h2>
          <p>{invalidData ? (isEn ? 'Some balances are invalid. Correct the source data and refresh.' : 'Certains soldes sont invalides. Corrigez les données sources et actualisez.') : (isEn ? 'The server could not load this statement. Try again or verify that posted entries are available for this date.' : 'Le serveur n’a pas pu charger ce bilan. Réessayez ou vérifiez les écritures comptabilisées à cette date.')}</p>
          <button type="button" className="btn-secondary" onClick={() => void reload()} disabled={refreshing}>{isEn ? 'Try again' : 'Réessayer'}</button>
        </section>
      ) : !hasData ? (
        <section role="status" className="card space-y-3"><h2 className="text-lg font-semibold">{isEn ? 'No balances for this date' : 'Aucun solde à cette date'}</h2><p>{isEn ? 'Choose another date or import and post your ledger entries to prepare a balance sheet.' : 'Choisissez une autre date ou importez et comptabilisez vos écritures pour préparer le bilan.'}</p><Link to="/app/connections" className="btn-secondary print:hidden">{isEn ? 'Manage data sources' : 'Gérer les sources'}</Link></section>
      ) : (
        <>
          {unbalanced && <p role="alert" className="card text-error">{isEn ? `This statement does not balance. Assets less liabilities and equity: ${money(difference)}. Review the source entries.` : `Ce bilan n’est pas équilibré. Actif moins passif et capitaux propres : ${money(difference)}. Vérifiez les écritures sources.`}</p>}
          <section className="grid gap-3 sm:grid-cols-3" aria-label={isEn ? 'Statement totals' : 'Totaux du bilan'}>
            {[{ label: isEn ? 'Total assets' : 'Total de l’actif', value: assets }, { label: isEn ? 'Total liabilities' : 'Total du passif', value: liabilities }, { label: isEn ? 'Total equity' : 'Capitaux propres', value: equity }].map(item => <div className="card min-w-0" key={item.label}><h2 className="text-sm text-muted">{item.label}</h2><p className="mt-2 text-xl font-semibold break-words tabular-nums">{money(item.value)}</p></div>)}
          </section>
          <section className="card overflow-hidden !p-0">
            <div className="overflow-x-auto print:overflow-visible" tabIndex={0} role="region" aria-label={isEn ? 'Balance sheet accounts' : 'Comptes du bilan'}>
              <table className="w-full min-w-[640px] text-sm"><caption className="px-4 py-3 text-left font-semibold">{isEn ? 'Balances by account' : 'Soldes par compte'} · {asOfDate}</caption><thead><tr className="border-y border-[rgb(var(--color-border))] text-left"><th scope="col" className="px-4 py-3">{isEn ? 'Section' : 'Section'}</th><th scope="col" className="px-4 py-3">Code</th><th scope="col" className="px-4 py-3">{isEn ? 'Account' : 'Compte'}</th><th scope="col" className="px-4 py-3 text-right">{isEn ? 'Balance' : 'Solde'}</th></tr></thead>
                <tbody>{visibleRows.map(row => <tr key={row.rowKey} className="border-b border-[rgb(var(--color-border))] align-top"><td className="px-4 py-3 max-w-52 break-words text-muted">{row.section}</td><td className="px-4 py-3 max-w-36 break-all">{row.code}</td><th scope="row" className="px-4 py-3 max-w-lg break-words text-left font-normal">{isEn ? row.nameEn || row.name : row.name}</th><td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">{money(row.current)}</td></tr>)}</tbody>
                <tfoot>{sections.filter(section => section.lines.length > 0).map(section => <tr key={section.key} className="border-t border-[rgb(var(--color-border))]"><th scope="row" colSpan={3} className="px-4 py-3 text-left">{isEn ? 'Total' : 'Total'} · {section.label}</th><td className="px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap">{money(sum(section.lines))}</td></tr>)}</tfoot>
              </table>
            </div>
            <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgb(var(--color-border))] p-4 print:hidden" aria-label={isEn ? 'Account pages' : 'Pages de comptes'}><p className="text-sm text-muted">{rows.length} {isEn ? 'accounts' : 'comptes'} · {currentPage} / {totalPages}</p><div className="flex gap-2"><button type="button" className="btn-secondary" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>{isEn ? 'Previous' : 'Précédent'}</button><button type="button" className="btn-secondary" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>{isEn ? 'Next' : 'Suivant'}</button></div></nav>
          </section>
        </>
      )}
    </div>
  );
}
