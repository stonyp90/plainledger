import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock, Link2, Loader2, RefreshCw, Search, Shield, Unplug, X } from 'lucide-react';
import { useTenant, useCanPerform } from '../contexts/TenantContext';
import { useI18n } from '../lib/i18n';
import api from '../lib/api';

interface Connection {
  id: string; provider: string; name: string; companyName?: string; status: string;
  createdAt: string; updatedAt: string; lastSyncAt?: string;
  accountsCount?: number; transactionsCount?: number;
}
interface Provider { id: string; name: string; supported: boolean; description?: string; }
const PAGE_SIZE = 50;
const validDate = (value?: string) => value && Number.isFinite(Date.parse(value));

export default function Connections() {
  const { currentTenant } = useTenant();
  const { canManageConnections, canViewConnections } = useCanPerform();
  const { language } = useI18n();
  const isEn = language === 'en';
  const [searchParams, setSearchParams] = useSearchParams();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);
  const [authorizationError, setAuthorizationError] = useState<string | null>(null);
  const [authorizing, setAuthorizing] = useState(false);
  const [busyConnection, setBusyConnection] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const generation = useRef(0);
  const modal = useRef<HTMLDialogElement>(null);
  const tenantId = currentTenant?.id;

  const load = useCallback(async () => {
    const currentGeneration = ++generation.current;
    setLoading(true);
    setError(null);
    if (!tenantId || !canViewConnections) { setLoading(false); return; }
    try {
      const [saved, available] = await Promise.all([
        api.get<Connection[]>('/datasources'), api.get<Provider[]>('/datasources/providers/available'),
      ]);
      if (currentGeneration !== generation.current) return;
      if (!Array.isArray(saved.data) || !Array.isArray(available.data) ||
          saved.data.some(row => !row.id || !row.provider || typeof row.status !== 'string') ||
          available.data.some(provider => !provider.id || !provider.name || typeof provider.supported !== 'boolean')) {
        throw new Error(isEn ? 'The connection response is incomplete.' : 'La réponse des connexions est incomplète.');
      }
      setConnections(saved.data);
      setProviders(available.data);
    } catch (cause) {
      if (currentGeneration === generation.current) setError(cause instanceof Error ? cause.message : (isEn ? 'Unable to load connections.' : 'Impossible de charger les connexions.'));
    } finally { if (currentGeneration === generation.current) setLoading(false); }
  }, [tenantId, canViewConnections, isEn]);
  useEffect(() => {
    setConnections([]); setProviders([]); setSelectedProvider(null); setNotice(null); setPage(1);
    void load();
    return () => { generation.current += 1; };
  }, [load]);

  useEffect(() => {
    if (loading || error) return;
    const expectedId = searchParams.get('datasourceId');
    const expectedProvider = searchParams.get('provider');
    if (searchParams.get('success') === 'true') {
      const saved = connections.find(connection => connection.id === expectedId && connection.provider.toLowerCase() === expectedProvider?.toLowerCase() && connection.status.toLowerCase() === 'active');
      if (saved) setNotice(isEn ? `Connection saved for ${saved.companyName || saved.name}. Sync its ledger when you are ready.` : `Connexion enregistrée pour ${saved.companyName || saved.name}. Synchronisez le grand livre lorsque vous êtes prêt.`);
      else setError(isEn ? 'The connection could not be confirmed for this organization. Refresh or start authorization again.' : 'La connexion n’a pas pu être confirmée pour cette organisation. Actualisez ou recommencez l’autorisation.');
    } else if (searchParams.has('error')) {
      setError(isEn ? 'Provider authorization was declined or could not be completed. You can start again.' : 'L’autorisation du fournisseur a été refusée ou n’a pas pu être terminée. Vous pouvez recommencer.');
    } else return;
    const cleaned = new URLSearchParams(searchParams);
    for (const key of ['success', 'provider', 'datasourceId', 'error']) cleaned.delete(key);
    setSearchParams(cleaned, { replace: true });
  }, [connections, loading, error, searchParams, setSearchParams, isEn]);

  useEffect(() => {
    if (selectedProvider && modal.current && !modal.current.open) modal.current.showModal();
    else if (!selectedProvider && modal.current?.open) modal.current.close();
  }, [selectedProvider]);

  const beginAuthorization = async () => {
    if (!selectedProvider?.supported || !canManageConnections || authorizing) return;
    setAuthorizing(true); setAuthorizationError(null); setAuthorizationUrl(null);
    const currentGeneration = generation.current;
    try {
      const { data } = await api.post<{ url: string; state: string; provider: string }>(`/datasources/${encodeURIComponent(selectedProvider.id)}/oauth/url`);
      const target = new URL(data.url);
      if (data.provider !== selectedProvider.id || target.protocol !== 'https:' || target.hostname !== 'appcenter.intuit.com' ||
          target.pathname !== '/connect/oauth2' || target.searchParams.get('state') !== data.state || !/^[A-Za-z0-9_-]{43}$/.test(data.state)) {
        throw new Error(isEn ? 'The provider authorization URL is invalid.' : 'L’adresse d’autorisation du fournisseur est invalide.');
      }
      if (currentGeneration === generation.current) setAuthorizationUrl(target.href);
    } catch (cause) { if (currentGeneration === generation.current) setAuthorizationError(cause instanceof Error ? cause.message : 'Unable to start authorization.'); }
    finally { setAuthorizing(false); }
  };
  const runSync = async (connection: Connection) => {
    if (!canManageConnections || busyConnection) return;
    setBusyConnection(connection.id); setError(null); setNotice(null);
    try {
      const { data } = await api.post<{ success: boolean; message?: string }>(`/datasources/${encodeURIComponent(connection.id)}/sync`);
      if (data.success !== true) throw new Error(data.message || (isEn ? 'The server did not confirm synchronization.' : 'Le serveur n’a pas confirmé la synchronisation.'));
      setNotice(data.message || (isEn ? 'Synchronization completed.' : 'Synchronisation terminée.'));
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : (isEn ? 'Synchronization failed.' : 'La synchronisation a échoué.')); }
    finally { setBusyConnection(null); }
  };
  const disconnect = async (connection: Connection) => {
    if (!canManageConnections || busyConnection || !window.confirm(isEn ? `Disconnect ${connection.companyName || connection.name}? You will need to authorize it again before the next sync.` : `Déconnecter ${connection.companyName || connection.name} ? Une nouvelle autorisation sera nécessaire avant la prochaine synchronisation.`)) return;
    setBusyConnection(connection.id); setError(null); setNotice(null);
    try {
      await api.delete(`/datasources/${encodeURIComponent(connection.id)}`);
      await load();
      setNotice(isEn ? 'The connection has been disconnected.' : 'La connexion a été déconnectée.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : (isEn ? 'Unable to disconnect.' : 'Impossible de déconnecter.')); }
    finally { setBusyConnection(null); }
  };
  const filtered = useMemo(() => connections.filter(connection => `${connection.companyName || ''} ${connection.name} ${connection.provider}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())), [connections, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const activeCount = connections.filter(connection => connection.status.toLowerCase() === 'active').length;
  const canAdd = canManageConnections && currentTenant?.limits.connections !== 0 && (currentTenant?.limits.connections === -1 || activeCount < (currentTenant?.limits.connections ?? 0));
  const statusLabel = (status: string) => ({ active: isEn ? 'Connected' : 'Connectée', disconnected: isEn ? 'Disconnected' : 'Déconnectée', syncing: isEn ? 'Syncing' : 'Synchronisation', error: isEn ? 'Needs attention' : 'À vérifier' })[status.toLowerCase()] || (isEn ? 'Status unavailable' : 'État indisponible');

  return <div className="min-w-0 space-y-6">
    <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div className="min-w-0"><h1 className="text-2xl font-bold">{isEn ? 'Connections' : 'Connexions'}</h1><p className="mt-2 text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{isEn ? 'Manage the accounting sources connected to your organization.' : 'Gérez les sources comptables connectées à votre organisation.'}</p></div>
      <button className="btn-secondary self-start" type="button" onClick={() => void load()} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{isEn ? 'Refresh' : 'Actualiser'}</button>
    </header>
    {!canViewConnections ? <p role="alert" className="card">{isEn ? 'You do not have permission to view connections.' : 'Vous n’avez pas la permission de consulter les connexions.'}</p> : <>
      {error && <div role="alert" className="card flex items-start gap-3"><AlertCircle className="h-5 w-5 shrink-0" /><p className="break-words">{error}</p></div>}
      {notice && <div role="status" className="card flex items-start gap-3"><CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: 'rgb(var(--color-primary-500))' }} /><p className="break-words">{notice}</p></div>}
      {loading && <p role="status" className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />{isEn ? 'Loading saved connections…' : 'Chargement des connexions enregistrées…'}</p>}
      {!loading && !error && connections.length === 0 && <section className="card py-9 text-center space-y-3"><Link2 className="h-9 w-9 mx-auto" /><h2 className="text-lg font-semibold">{isEn ? 'No accounting sources connected' : 'Aucune source comptable connectée'}</h2><p>{isEn ? 'Choose an available provider below to authorize a connection.' : 'Choisissez un fournisseur disponible ci-dessous pour autoriser une connexion.'}</p></section>}
      {connections.length > 0 && <section className="space-y-4" aria-label={isEn ? 'Saved connections' : 'Connexions enregistrées'}>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between"><h2 className="text-lg font-semibold">{isEn ? 'Your connections' : 'Vos connexions'} ({connections.length})</h2><label className="relative block w-full sm:max-w-xs"><Search className="absolute left-3 top-3 h-4 w-4" /><span className="sr-only">{isEn ? 'Search connections' : 'Rechercher des connexions'}</span><input className="w-full rounded-lg border py-2 pl-9 pr-3" style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }} value={search} maxLength={255} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label></div>
        {!filtered.length && <p role="status">{isEn ? 'No connections match your search.' : 'Aucune connexion ne correspond à votre recherche.'}</p>}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{visible.map(connection => <article key={connection.id} className="card min-w-0 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-semibold break-words">{connection.companyName || connection.name}</h3><p className="text-sm opacity-70">{connection.provider}</p></div><span className="text-sm rounded-full border px-3 py-1">{statusLabel(connection.status)}</span></div>
          <dl className="text-sm space-y-2"><div className="flex flex-wrap gap-x-3"><dt className="opacity-70">{isEn ? 'Last successful sync' : 'Dernière synchronisation réussie'}</dt><dd>{validDate(connection.lastSyncAt) ? new Date(connection.lastSyncAt!).toLocaleString(isEn ? 'en-CA' : 'fr-CA') : (isEn ? 'Not yet synced' : 'Pas encore synchronisée')}</dd></div>{typeof connection.accountsCount === 'number' && Number.isFinite(connection.accountsCount) && <div><dt className="inline opacity-70">{isEn ? 'Accounts: ' : 'Comptes : '}</dt><dd className="inline">{connection.accountsCount.toLocaleString()}</dd></div>}{typeof connection.transactionsCount === 'number' && Number.isFinite(connection.transactionsCount) && <div><dt className="inline opacity-70">{isEn ? 'Transactions: ' : 'Transactions : '}</dt><dd className="inline">{connection.transactionsCount.toLocaleString()}</dd></div>}</dl>
          {canManageConnections && connection.status.toLowerCase() !== 'disconnected' && <div className="flex flex-wrap gap-3"><button type="button" className="btn-secondary" disabled={Boolean(busyConnection) || loading || connection.status.toLowerCase() !== 'active'} onClick={() => void runSync(connection)}><RefreshCw className={`h-4 w-4 ${busyConnection === connection.id ? 'animate-spin' : ''}`} />{isEn ? 'Sync ledger' : 'Synchroniser le grand livre'}</button><button type="button" className="btn-secondary" disabled={Boolean(busyConnection) || loading} onClick={() => void disconnect(connection)}><Unplug className="h-4 w-4" />{isEn ? 'Disconnect' : 'Déconnecter'}</button></div>}
        </article>)}</div>
        {totalPages > 1 && <nav className="flex flex-wrap justify-between items-center gap-3" aria-label={isEn ? 'Connection pages' : 'Pages des connexions'}><button className="btn-secondary" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>{isEn ? 'Previous' : 'Précédent'}</button><span>{currentPage} / {totalPages}</span><button className="btn-secondary" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>{isEn ? 'Next' : 'Suivant'}</button></nav>}
      </section>}
      <section className="space-y-4"><h2 className="text-lg font-semibold">{isEn ? 'Add an accounting source' : 'Ajouter une source comptable'}</h2>
        {!canManageConnections ? <p>{isEn ? 'An owner or administrator can manage connections.' : 'Un propriétaire ou un administrateur peut gérer les connexions.'}</p> : !canAdd && !loading && <p>{isEn ? 'Your plan’s connection limit has been reached. Review your organization subscription in ' : 'La limite de connexions de votre forfait est atteinte. Consultez l’abonnement de votre organisation dans les '}<Link className="underline" to="/app/settings">{isEn ? 'Settings' : 'paramètres'}</Link>.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{providers.map(provider => <article key={provider.id} className="card min-w-0 flex flex-col gap-3"><Link2 className="h-6 w-6" style={{ color: 'rgb(var(--color-primary-500))' }} /><h3 className="font-semibold break-words">{provider.name}</h3><p className="text-sm flex-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>{provider.supported ? (isEn ? 'Authorize your accounting account securely with the provider.' : 'Autorisez votre compte comptable de façon sécurisée auprès du fournisseur.') : (isEn ? 'This provider is not available in this environment yet.' : 'Ce fournisseur n’est pas encore disponible dans cet environnement.')}</p><button type="button" disabled={!provider.supported || !canAdd || loading} className="btn-secondary justify-center disabled:opacity-50" onClick={() => { setAuthorizationUrl(null); setAuthorizationError(null); setSelectedProvider(provider); }}>{provider.supported ? (isEn ? 'Connect' : 'Connecter') : (isEn ? 'Unavailable' : 'Indisponible')}</button></article>)}</div>
      </section>
    </>}
    <dialog ref={modal} aria-labelledby="connection-dialog-title" onCancel={event => { event.preventDefault(); setSelectedProvider(null); }} onClick={event => { if (event.target === event.currentTarget) setSelectedProvider(null); }} className="m-auto w-[calc(100%-2rem)] max-w-lg max-h-[85dvh] overflow-auto rounded-2xl border p-0 backdrop:bg-black/50" style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))', color: 'rgb(var(--color-text))' }}>
      <div className="p-5 sm:p-7 space-y-5"><div className="flex items-start justify-between gap-4"><h2 id="connection-dialog-title" className="text-xl font-semibold">{isEn ? 'Connect ' : 'Connecter '}{selectedProvider?.name}</h2><button aria-label={isEn ? 'Close' : 'Fermer'} type="button" className="p-2" onClick={() => setSelectedProvider(null)}><X className="h-5 w-5" /></button></div><p>{isEn ? 'You will continue to your accounting provider to sign in, review the requested access, and choose the company to connect.' : 'Vous continuerez vers votre fournisseur comptable pour vous connecter, consulter les accès demandés et choisir l’entreprise à connecter.'}</p><p className="flex items-start gap-2 text-sm"><Shield className="h-5 w-5 shrink-0" />{isEn ? 'Your provider password stays with the provider. A connection is confirmed only after authorization is saved.' : 'Votre mot de passe demeure chez le fournisseur. La connexion est confirmée après l’enregistrement de l’autorisation.'}</p>{authorizationError && <p role="alert" className="break-words">{authorizationError}</p>}{authorizationUrl ? <a className="btn-primary flex justify-center" href={authorizationUrl}>{isEn ? 'Continue to ' : 'Continuer vers '}{selectedProvider?.name}</a> : <button type="button" className="btn-primary w-full" onClick={() => void beginAuthorization()} disabled={authorizing}>{authorizing ? (isEn ? 'Preparing authorization…' : 'Préparation de l’autorisation…') : (isEn ? 'Authorize connection' : 'Autoriser la connexion')}</button>}</div>
    </dialog>
  </div>;
}
