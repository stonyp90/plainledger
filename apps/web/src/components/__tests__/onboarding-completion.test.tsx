import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Onboarding, { type OnboardingData } from '../Onboarding';
import OnboardingCompletion from '../OnboardingCompletion';
import config from '../../lib/config';
import { invalidateRequestScope, selectRequestOrganization } from '../../lib/authRequestContext';

const state = vi.hoisted(() => ({
  language: 'en',
  auth: { authenticated: true, user: { id: 'fixture-user', email: 'owner@example.test', emailVerified: true, organization: 'fixture-tenant' } },
  tenant: {
    currentTenant: { id: 'fixture-tenant', organizationId: 'fixture-organization', name: 'Fixture organization', industry: 'retail', role: 'owner', settings: { currency: 'CAD', fiscalYearEnd: '12-31' } } as null | { id: string; organizationId?: string; name: string; industry: string; role: string; settings: { currency: string; fiscalYearEnd: string } },
    isLoading: false, error: null as string | null, canManageSettings: true, canManageMembers: true, refreshTenants: vi.fn(),
  },
  completed: vi.fn(), crmCompleted: vi.fn(), crmProgress: vi.fn(),
}));
vi.mock('../../lib/keycloak', () => ({ useAuth: () => state.auth }));
vi.mock('../../contexts/TenantContext', () => ({ useTenant: () => state.tenant }));
vi.mock('../../contexts/ThemeContext', () => ({ useTheme: () => ({ resolvedTheme: 'light' }) }));
vi.mock('../../lib/i18n', () => ({ useI18n: () => ({ language: state.language }), LanguageToggle: () => null }));
vi.mock('../ThemeToggle', () => ({ default: () => null }));
vi.mock('../../lib/analytics', () => ({ analytics: { trackOnboardingStep: vi.fn(), trackOnboardingStarted: vi.fn(), trackOnboardingCompleted: state.completed } }));
vi.mock('../../lib/crm', () => ({ crmService: { trackOnboardingProgress: state.crmProgress, trackOnboardingCompleted: state.crmCompleted } }));
vi.mock('../../lib/industries', () => {
  const industry = { id: 'retail', name: { en: 'Retail', fr: 'Commerce de détail' }, description: { en: 'Retail metrics', fr: 'Indicateurs du commerce' } };
  return { getAllIndustries: () => [industry], getIndustryTemplate: (id: string) => id === 'retail' ? industry : null };
});
vi.mock('../../lib/industryKPIs', () => ({ getKPIsForIndustry: () => [] }));

const fetchMock = vi.fn();
const client = { authenticated: true, token: 'old-token', tokenParsed: { organization: 'fixture-tenant' }, updateToken: vi.fn(), isTokenExpired: vi.fn() };
const result = { success: true, organizationId: 'fixture-organization', tenantId: 'fixture-tenant', teamInvitationsSent: 0 };
const draft: OnboardingData = { accountType: 'business', companyName: 'Fixture organization', companySize: '2-10', industry: 'retail', fiscalYearEnd: 12, currency: 'CAD', primarySource: 'quickbooks', skipSource: false, teamEmails: ['colleague@example.test'], skipTeam: false };
const json = (payload: unknown, status = 200) => new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });
const mountCompletion = (onFinish = vi.fn()) => ({ ...render(<OnboardingCompletion data={draft} onFinish={onFinish} onBack={vi.fn()} />), onFinish });
const save = () => fireEvent.click(screen.getByRole('button', { name: /^(Save and connect a data source|Enregistrer et connecter une source)$/ }));
function Destination() { const location = useLocation(); return <h1>{location.pathname + location.search}</h1>; }
const wizard = () => <MemoryRouter initialEntries={['/onboarding']}><Routes><Route path="/onboarding" element={<Onboarding />} /><Route path="*" element={<Destination />} /></Routes></MemoryRouter>;
const advance = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  await screen.findByRole('heading', { name: 'Your Industry KPIs' });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  await screen.findByRole('heading', { name: 'Review and save your setup' });
};

beforeEach(() => {
  state.language = 'en';
  state.auth.authenticated = true;
  state.auth.user = { id: 'fixture-user', email: 'owner@example.test', emailVerified: true, organization: 'fixture-tenant' };
  Object.assign(state.tenant, { currentTenant: { id: 'fixture-tenant', organizationId: 'fixture-organization', name: 'Fixture organization', industry: 'retail', role: 'owner', settings: { currency: 'CAD', fiscalYearEnd: '12-31' } }, isLoading: false, error: null, canManageSettings: true, canManageMembers: true });
  state.tenant.refreshTenants.mockReset().mockResolvedValue(undefined);
  state.crmProgress.mockReset().mockResolvedValue(undefined); state.crmCompleted.mockReset().mockResolvedValue(undefined); state.completed.mockReset();
  fetchMock.mockReset().mockResolvedValue(json(result)); vi.stubGlobal('fetch', fetchMock);
  config.api.baseUrl = '';
  invalidateRequestScope(true); selectRequestOrganization('fixture-tenant');
  Object.assign(client, { authenticated: true, token: 'old-token', tokenParsed: { organization: 'fixture-tenant' } });
  client.updateToken.mockReset().mockImplementation(async () => { client.token = 'refreshed-token'; return true; });
  client.isTokenExpired.mockReset().mockReturnValue(false);
  Object.assign(window, { keycloak: client });
  vi.mocked(localStorage.setItem).mockReset();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); invalidateRequestScope(true); Object.assign(window, { keycloak: undefined }); });

describe('Authenticated onboarding completion', () => {
  it('refreshes the token, scopes the save, waits for confirmation and prevents duplicate submission', async () => {
    let finish!: (value: Response) => void;
    fetchMock.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const { onFinish } = mountCompletion();
    act(() => { save(); save(); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(onFinish).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Saving organization setup');
    const [url, request] = fetchMock.mock.calls[0];
    expect(new URL(url).pathname).toBe('/api/onboarding/complete');
    expect(request.method).toBe('POST');
    const headers = new Headers(request.headers);
    expect(headers.get('authorization')).toBe('Bearer refreshed-token');
    expect(headers.get('x-organization-id')).toBe('fixture-tenant');
    expect(JSON.parse(request.body)).toEqual({ email: 'owner@example.test', companyName: 'Fixture organization', companySize: '2-10', industry: 'retail', fiscalYearEnd: 12, currency: 'CAD', skipSource: true, skipTeam: true });
    finish(json(result));
    await waitFor(() => expect(onFinish).toHaveBeenCalledExactlyOnceWith(result, '/app/connections'));
    expect(screen.getByRole('status')).toHaveTextContent('Organization setup saved');
    save();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(['en', 'fr'])('keeps a rejected save retryable without completing in %s', async language => {
    state.language = language;
    fetchMock.mockResolvedValueOnce(json({ message: 'Service failure' }, 503)).mockResolvedValueOnce(json(result));
    const { onFinish } = mountCompletion(); save();
    expect(await screen.findByRole('alert')).toHaveTextContent(language === 'en' ? 'temporarily unavailable' : 'temporairement indisponible');
    expect(onFinish).not.toHaveBeenCalled();
    expect(localStorage.setItem).not.toHaveBeenCalled();
    save();
    await waitFor(() => expect(onFinish).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each(['en', 'fr'])('explains network failure without claiming completion in %s', async language => {
    state.language = language; fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { onFinish } = mountCompletion(); save();
    expect(await screen.findByRole('alert')).toHaveTextContent(language === 'en' ? 'Check your internet connection' : 'Vérifiez votre connexion Internet');
    expect(onFinish).not.toHaveBeenCalled();
  });

  it.each([
    { success: false }, { success: true }, { ...result, tenantId: 'another-tenant' },
    { ...result, organizationId: 'another-organization' }, { ...result, teamInvitationsSent: -1 },
  ])('rejects incomplete or mismatched confirmation %j', async response => {
    fetchMock.mockResolvedValue(json(response));
    const { onFinish } = mountCompletion(); save();
    expect(await screen.findByRole('alert')).toHaveTextContent('did not confirm setup for this organization');
    expect(onFinish).not.toHaveBeenCalled();
    expect(screen.queryByText('Organization setup saved.')).not.toBeInTheDocument();
  });

  it.each(['signed-out', 'unverified', 'missing-organization', 'wrong-tenant'])('blocks submission with %s context', situation => {
    if (situation === 'signed-out') state.auth.authenticated = false;
    if (situation === 'unverified') state.auth.user.emailVerified = false;
    if (situation === 'missing-organization') state.tenant.currentTenant = null;
    if (situation === 'wrong-tenant') state.auth.user.organization = 'another-tenant';
    const { onFinish } = mountCompletion(); save();
    expect(screen.getByRole('alert')).toHaveTextContent('verified account and its active organization');
    expect(fetchMock).not.toHaveBeenCalled(); expect(onFinish).not.toHaveBeenCalled();
  });

  it('discards confirmation when the request organization changes in flight', async () => {
    let finish!: (value: Response) => void;
    fetchMock.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const { onFinish } = mountCompletion(); save();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    selectRequestOrganization('another-tenant'); finish(json(result));
    expect(await screen.findByRole('alert')).toHaveTextContent('Organization changed');
    expect(onFinish).not.toHaveBeenCalled();
  });

  it('discards confirmation after leaving the setup page', async () => {
    let finish!: (value: Response) => void;
    fetchMock.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const { onFinish, unmount } = mountCompletion(); save();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce()); unmount();
    await act(async () => { finish(json(result)); });
    expect(onFinish).not.toHaveBeenCalled();
  });

  it.each(['member', 'viewer'])('completes %s onboarding without sending organization changes or offering team management', async role => {
    state.tenant.currentTenant!.role = role; state.tenant.canManageSettings = false; state.tenant.canManageMembers = false;
    const { onFinish } = mountCompletion();
    expect(screen.queryByRole('button', { name: 'Save and manage team invitations' })).not.toBeInTheDocument();
    save(); await waitFor(() => expect(onFinish).toHaveBeenCalledOnce());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: 'owner@example.test', companyName: 'Fixture organization', companySize: '2-10', skipSource: true, skipTeam: true });
  });

  it('opens actual team settings only after the server confirms setup', async () => {
    const { onFinish } = mountCompletion();
    fireEvent.click(screen.getByRole('button', { name: 'Save and manage team invitations' }));
    await waitFor(() => expect(onFinish).toHaveBeenCalledExactlyOnceWith(result, '/app/settings?tab=team'));
    expect(screen.queryByText(/team members? invited/i)).not.toBeInTheDocument();
  });
});

describe('Onboarding wizard persistence and navigation', () => {
  it('loads the verified organization before allowing setup, with a retry for loading failure', async () => {
    state.tenant.isLoading = true;
    const view = render(wizard());
    expect(screen.getByRole('status')).toHaveTextContent('Loading your organization');
    state.tenant.isLoading = false; state.tenant.error = 'Unavailable'; view.rerender(wizard());
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(state.tenant.refreshTenants).toHaveBeenCalledOnce();
    state.tenant.error = null; view.rerender(wizard());
    expect(screen.getByLabelText('Company / Organization Name *')).toHaveValue('Fixture organization');
    expect(localStorage.setItem).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preserves an unsuccessful setup and marks completion only after a successful retry', async () => {
    fetchMock.mockResolvedValueOnce(json({ message: 'Service failure' }, 503)).mockResolvedValueOnce(json(result));
    render(wizard()); await advance(); save();
    await screen.findByRole('alert');
    expect(localStorage.setItem).not.toHaveBeenCalled(); expect(state.completed).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Skip and continue/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save and open dashboard' }));
    await screen.findByRole('heading', { name: '/app/dashboard' });
    expect(localStorage.setItem).toHaveBeenCalledWith('pl_onboarding_completed', 'true');
    expect(state.completed).toHaveBeenCalledWith(expect.objectContaining({ sourceConnected: false, teamInvited: false }));
    expect(state.crmCompleted).toHaveBeenCalledWith('owner@example.test', expect.objectContaining({ sourceConnected: false, teamInvited: false }));
    const stored = vi.mocked(localStorage.setItem).mock.calls.find(([key]) => key === 'pl_onboarding_data')!;
    expect(JSON.parse(stored[1])).toEqual(expect.objectContaining({ tenantId: 'fixture-tenant', primarySource: '', teamEmails: [] }));
  });

  it('navigates after confirmed save even when browser storage and CRM are unavailable', async () => {
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw new Error('Storage blocked'); });
    state.crmCompleted.mockRejectedValue(new Error('CRM unavailable'));
    render(wizard()); await advance(); save();
    await screen.findByRole('heading', { name: '/app/connections' });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('starts a fresh draft when the signed-in organization changes', async () => {
    const view = render(wizard());
    fireEvent.change(screen.getByLabelText('Company / Organization Name *'), { target: { value: 'Unsaved company' } });
    await advance();
    state.auth.user.organization = 'another-tenant';
    state.tenant.currentTenant = { ...state.tenant.currentTenant!, id: 'another-tenant', organizationId: 'another-organization', name: 'Another organization' };
    view.rerender(wizard());
    expect(screen.getByLabelText('Company / Organization Name *')).toHaveValue('Another organization');
    expect(screen.queryByRole('heading', { name: 'Review and save your setup' })).not.toBeInTheDocument();
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it('keeps organization fields read-only for a member while allowing onboarding to continue', async () => {
    state.tenant.currentTenant!.role = 'member'; state.tenant.canManageSettings = false; state.tenant.canManageMembers = false;
    render(wizard());
    expect(screen.getByLabelText('Company / Organization Name *')).toBeDisabled();
    expect(screen.getByLabelText('Fiscal Year End')).toBeDisabled();
    expect(screen.getByLabelText('Currency')).toBeDisabled();
    await advance(); save();
    await screen.findByRole('heading', { name: '/app/connections' });
  });

  it('skips an optional industry preview and still lets the user return to company details', async () => {
    state.tenant.currentTenant!.industry = '';
    render(wizard());
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByRole('heading', { name: 'Review and save your setup' });
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByLabelText('Company / Organization Name *')).toHaveValue('Fixture organization');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
