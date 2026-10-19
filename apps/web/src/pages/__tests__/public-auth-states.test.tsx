import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Signup from '../Signup';
import Login from '../Login';
import JoinOrganization from '../JoinOrganization';
import { ApiException } from '../../lib/api';

const state = vi.hoisted(() => ({
  language: 'en', post: vi.fn(), login: vi.fn(), updateToken: vi.fn(),
  auth: { initialized: true, authenticated: false, authError: null as string | null, user: null as { email: string; emailVerified: boolean } | null },
}));
vi.mock('../../lib/api', async importOriginal => ({ ...await importOriginal<typeof import('../../lib/api')>(), default: { post: state.post } }));
vi.mock('../../lib/keycloak', () => ({ useKeycloak: () => ({ ...state.auth, login: state.login, keycloak: { updateToken: state.updateToken } }) }));
vi.mock('../../lib/i18n', () => ({ useI18n: () => ({ language: state.language }), LanguageToggle: () => null }));
vi.mock('../../components/PublicHeader', () => ({ default: () => null }));
vi.mock('../../components/ThemeToggle', () => ({ default: () => null }));
vi.mock('../../lib/analytics', () => ({ analytics: { track: vi.fn(), page: vi.fn() } }));

const registration = { success: true, userId: 'fixture-user', email: 'owner@example.test', requiresEmailVerification: true, verificationEmailSent: true };
const preview = () => ({ tenantId: 'fixture-tenant', organizationName: 'Fixture organization', email: 'owner@example.test', role: 'member', expiresAt: new Date(Date.now() + 60_000).toISOString() });
const serviceError = () => new ApiException({ code: 'HTTP_ERROR', statusCode: 503, message: 'Upstream service failure' });
const mount = (component: React.ReactNode, path = '/') => render(<MemoryRouter initialEntries={[path]}>{component}</MemoryRouter>);
const change = (id: string, value: string) => fireEvent.change(document.getElementById(id)!, { target: { value } });
const fillSignup = (invited = false) => {
  change('signup-first-name', 'Taylor'); change('signup-last-name', 'Fixture');
  if (!invited) change('signup-email', 'OWNER@example.test');
  change('signup-province', 'QC'); change('signup-password', 'ExamplePassword2026!'); change('signup-confirm-password', 'ExamplePassword2026!');
  fireEvent.click(screen.getByRole('checkbox'));
};
const submitSignup = () => fireEvent.click(screen.getByRole('button', { name: /^(Create account|Créer un compte)$/ }));
const signedInInvite = () => {
  sessionStorage.setItem('plainledger-pending-invitation', 'fixture-invitation');
  state.auth.authenticated = true;
  state.auth.user = { email: 'owner@example.test', emailVerified: true };
};

beforeEach(() => {
  state.language = 'en'; state.post.mockReset(); state.login.mockReset().mockResolvedValue(undefined); state.updateToken.mockReset().mockResolvedValue(true);
  Object.assign(state.auth, { initialized: true, authenticated: false, authError: null, user: null });
  sessionStorage.clear(); window.history.replaceState(null, '', '/');
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Public account registration', () => {
  it('keeps an empty or mismatched form disabled without sending requests', () => {
    mount(<Signup />);
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
    fillSignup();
    change('signup-confirm-password', 'DifferentPassword2026!');
    expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match.');
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
    expect(state.post).not.toHaveBeenCalled();
  });

  it('creates the account once, clears passwords, and distinguishes failed email delivery', async () => {
    let finish: (value: unknown) => void = () => {};
    state.post.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    mount(<Signup />); fillSignup();
    const form = screen.getByRole('button', { name: 'Create account' }).closest('form')!;
    fireEvent.submit(form); fireEvent.submit(form);
    expect(state.post).toHaveBeenCalledExactlyOnceWith('/auth/register', { firstName: 'Taylor', lastName: 'Fixture', email: 'owner@example.test', password: 'ExamplePassword2026!', province: 'QC' });
    expect(screen.getByRole('button', { name: 'Creating account…' })).toBeDisabled();
    finish({ data: { ...registration, verificationEmailSent: false } });
    await screen.findByRole('heading', { name: 'Your account is created' });
    expect(screen.getByRole('status')).toHaveTextContent('verification email could not be sent');
    expect(document.getElementById('signup-password')).not.toBeInTheDocument();
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it.each(['en', 'fr'])('keeps network failure retryable with localized feedback in %s', async language => {
    state.language = language;
    state.post.mockRejectedValueOnce(new ApiException({ code: 'NETWORK_ERROR', statusCode: 0, message: 'Failed to fetch' })).mockResolvedValueOnce({ data: registration });
    mount(<Signup />); fillSignup(); submitSignup();
    expect(await screen.findByRole('alert')).toHaveTextContent(language === 'en' ? 'Check your internet connection' : 'Vérifiez votre connexion Internet');
    expect(screen.getByRole('button', { name: /^(Create account|Créer un compte)$/ })).toBeEnabled();
    submitSignup();
    await screen.findByRole('heading', { name: language === 'en' ? 'Your account is created' : 'Votre compte est créé' });
    expect(state.post).toHaveBeenCalledTimes(2);
  });

  it.each([{ success: false }, { success: true }])('does not claim account creation for incomplete confirmation %j', async response => {
    state.post.mockResolvedValue({ data: response });
    mount(<Signup />); fillSignup(); submitSignup();
    expect(await screen.findByRole('alert')).toHaveTextContent('did not confirm account creation');
    expect(screen.queryByRole('heading', { name: 'Your account is created' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
  });

  it('blocks an expired invitation without allowing an unrelated account signup', async () => {
    sessionStorage.setItem('plainledger-pending-invitation', 'fixture-invitation');
    state.post.mockResolvedValue({ data: { ...preview(), expiresAt: new Date(Date.now() - 1).toISOString() } });
    mount(<Signup />);
    expect(await screen.findByRole('alert')).toHaveTextContent('invalid or expired');
    fillSignup();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Review invitation' })).toHaveAttribute('href', '/join');
    expect(state.post).toHaveBeenCalledTimes(1);
  });

  it('preserves the invited address and sends the invitation in place of a new organization', async () => {
    sessionStorage.setItem('plainledger-pending-invitation', 'fixture-invitation');
    state.post.mockResolvedValueOnce({ data: preview() }).mockResolvedValueOnce({ data: registration });
    mount(<Signup />);
    await screen.findByText(/You are joining Fixture organization/);
    expect(screen.getByLabelText('Email address')).toHaveAttribute('readonly');
    expect(document.getElementById('signup-organization')).not.toBeInTheDocument();
    fillSignup(true); submitSignup();
    await screen.findByRole('heading', { name: 'Your account is created' });
    expect(state.post.mock.calls[1]).toEqual(['/auth/register', { firstName: 'Taylor', lastName: 'Fixture', email: 'owner@example.test', password: 'ExamplePassword2026!', province: 'QC', invitationToken: 'fixture-invitation' }]);
    expect(sessionStorage.getItem('plainledger-pending-invitation')).toBeNull();
  });

  it('disables invited signup when rechecking a previously valid invitation fails', async () => {
    sessionStorage.setItem('plainledger-pending-invitation', 'fixture-invitation');
    state.post.mockResolvedValueOnce({ data: preview() }).mockRejectedValueOnce(serviceError());
    const view = mount(<Signup />);
    await screen.findByText(/You are joining Fixture organization/);
    fillSignup(true);
    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
    state.language = 'fr'; view.rerender(<MemoryRouter><Signup /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Le service est temporairement indisponible');
    expect(screen.getByRole('button', { name: 'Créer un compte' })).toBeDisabled();
    expect(screen.queryByText(/Vous rejoignez Fixture organization/)).not.toBeInTheDocument();
    expect(state.post).toHaveBeenCalledTimes(2);
  });

  it('keeps verification resend failures recoverable and acknowledgments localized', async () => {
    state.language = 'fr';
    state.post.mockResolvedValueOnce({ data: { ...registration, verificationEmailSent: false } }).mockRejectedValueOnce(serviceError()).mockResolvedValueOnce({ data: { message: 'English provider acknowledgment' } });
    mount(<Signup />); fillSignup(); submitSignup();
    await screen.findByRole('heading', { name: 'Votre compte est créé' });
    fireEvent.click(screen.getByRole('button', { name: 'Renvoyer la vérification' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Le service est temporairement indisponible');
    fireEvent.click(screen.getByRole('button', { name: 'Renvoyer la vérification' }));
    await screen.findByText(/Vérification demandée/);
    expect(screen.queryByText('English provider acknowledgment')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('Secure sign-in states', () => {
  it('announces initialization and prevents login before the identity service is ready', () => {
    state.auth.initialized = false;
    mount(<Login />);
    expect(screen.getByRole('status')).toHaveTextContent('Preparing secure sign-in');
    expect(screen.getByRole('button', { name: 'Continue to sign in' })).toBeDisabled();
    expect(state.login).not.toHaveBeenCalled();
  });

  it.each(['', '  owner@example.test  '])('starts sign-in with optional email hint %j', async email => {
    mount(<Login />); change('login-email', email);
    fireEvent.click(screen.getByRole('button', { name: 'Continue to sign in' }));
    await waitFor(() => expect(state.login).toHaveBeenCalledExactlyOnceWith(email.trim() || undefined));
    expect(document.querySelector('input[type="password"]')).toBeNull();
  });

  it.each(['en', 'fr'])('announces login rejection in %s and restores the retry action', async language => {
    state.language = language; state.login.mockRejectedValue(new Error('Identity provider failed'));
    mount(<Login />);
    fireEvent.click(screen.getByRole('button', { name: /Continue to sign in|Continuer la connexion/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(language === 'en' ? 'Secure sign-in is unavailable' : 'La connexion sécurisée est indisponible');
    expect(screen.getByRole('button', { name: /Continue to sign in|Continuer la connexion/ })).toBeEnabled();
  });

  it('offers a reload after identity initialization failure', () => {
    state.auth.initialized = false; state.auth.authError = 'Identity initialization failed';
    mount(<Login />);
    expect(screen.getByRole('alert')).toHaveTextContent('Secure sign-in is unavailable');
    expect(screen.getByRole('button', { name: 'Reload sign-in' })).toBeEnabled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('Invitation failure and expiry states', () => {
  it('explains an incomplete invitation without making a request', () => {
    mount(<JoinOrganization />);
    expect(screen.getByRole('alert')).toHaveTextContent('invitation link is incomplete');
    expect(state.post).not.toHaveBeenCalled();
  });

  it('rejects an expired preview instead of enabling acceptance', async () => {
    signedInInvite(); state.post.mockResolvedValue({ data: { ...preview(), expiresAt: new Date(Date.now() - 1).toISOString() } });
    mount(<JoinOrganization />);
    expect(await screen.findByRole('alert')).toHaveTextContent('invitation has expired');
    expect(screen.queryByRole('button', { name: 'Accept invitation' })).not.toBeInTheDocument();
  });

  it('clears previously valid membership actions when a repeated preview fails', async () => {
    signedInInvite();
    state.post.mockResolvedValueOnce({ data: preview() }).mockRejectedValueOnce(new Error('Membership unavailable')).mockRejectedValueOnce(serviceError());
    mount(<JoinOrganization />);
    fireEvent.click(await screen.findByRole('button', { name: 'Accept invitation' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Membership unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Check link again' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('service is temporarily unavailable'));
    expect(screen.queryByRole('button', { name: 'Accept invitation' })).not.toBeInTheDocument();
  });

  it('rechecks expiry before acceptance if the invitation expires while the page is open', async () => {
    signedInInvite(); const invitation = preview(); state.post.mockResolvedValue({ data: invitation });
    mount(<JoinOrganization />);
    const accept = await screen.findByRole('button', { name: 'Accept invitation' });
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(invitation.expiresAt) + 1);
    fireEvent.click(accept);
    expect(screen.getByRole('alert')).toHaveTextContent('invitation has expired');
    expect(state.post).toHaveBeenCalledTimes(1);
  });

  it('does not recheck a consumed invitation when the member changes language', async () => {
    signedInInvite(); state.post.mockResolvedValueOnce({ data: preview() }).mockResolvedValueOnce({ data: { tenantId: 'fixture-tenant', refreshSession: true } });
    const view = mount(<JoinOrganization />);
    fireEvent.click(await screen.findByRole('button', { name: 'Accept invitation' }));
    await screen.findByText('You have joined Fixture organization.');
    state.language = 'fr'; view.rerender(<MemoryRouter><JoinOrganization /></MemoryRouter>);
    await screen.findByText('Vous avez rejoint Fixture organization.');
    expect(state.post).toHaveBeenCalledTimes(2);
    expect(state.updateToken).toHaveBeenCalledExactlyOnceWith(-1);
  });
});
