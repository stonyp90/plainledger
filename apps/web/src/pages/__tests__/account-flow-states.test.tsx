import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Signup from '../Signup';
import JoinOrganization from '../JoinOrganization';

const { post, auth } = vi.hoisted(() => ({
  post: vi.fn(),
  auth: { initialized: true, authenticated: false, authError: null as string | null,
    user: null as { email: string; emailVerified: boolean } | null,
    keycloak: { updateToken: vi.fn() } },
}));
vi.mock('../../lib/api', async importOriginal => ({ ...await importOriginal<typeof import('../../lib/api')>(), default: { post } }));
vi.mock('../../lib/keycloak', () => ({ useKeycloak: () => auth }));
vi.mock('../../lib/i18n', () => ({ useI18n: () => ({ language: 'en' }) }));
vi.mock('../../components/PublicHeader', () => ({ default: () => <header>PlainLedger</header> }));

const token = 'a'.repeat(43);
const savedLocalValues = new Map<string, string>();
const preview = { tenantId: 'test-org', organizationName: 'Fixture Organization', email: 'invited@example.test', role: 'member', expiresAt: '2099-01-01T00:00:00Z' };
const mount = (element: React.ReactNode) => render(<MemoryRouter>{element}</MemoryRouter>);
const fillSignup = () => {
  for (const [id, value] of Object.entries({
    'signup-first-name': 'Test', 'signup-last-name': 'Person', 'signup-email': 'test@example.test',
    'signup-province': 'QC', 'signup-password': 'Fixture-Password-2026!', 'signup-confirm-password': 'Fixture-Password-2026!',
  })) fireEvent.change(document.getElementById(id)!, { target: { value } });
  fireEvent.click(screen.getByRole('checkbox'));
};

beforeEach(() => {
  savedLocalValues.clear();
  vi.mocked(localStorage.getItem).mockImplementation(key => savedLocalValues.get(key) ?? null);
  vi.mocked(localStorage.setItem).mockImplementation((key, value) => { savedLocalValues.set(key, String(value)); });
  vi.mocked(localStorage.removeItem).mockImplementation(key => { savedLocalValues.delete(key); });
  vi.mocked(localStorage.clear).mockImplementation(() => savedLocalValues.clear());
  post.mockReset();
  auth.initialized = true; auth.authenticated = false; auth.authError = null; auth.user = null;
  auth.keycloak.updateToken.mockReset().mockResolvedValue(true);
  localStorage.clear(); sessionStorage.clear();
  window.history.replaceState({}, '', '/');
});
afterEach(cleanup);

describe('Account creation uses confirmed API outcomes', () => {
  it('rejects empty fields, invalid email, mismatched passwords and missing consent', () => {
    mount(<Signup />);
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
    fillSignup();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
    fireEvent.change(document.getElementById('signup-email')!, { target: { value: 'invalid' } });
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
    fireEvent.change(document.getElementById('signup-email')!, { target: { value: 'test@example.test' } });
    fireEvent.change(document.getElementById('signup-confirm-password')!, { target: { value: 'Different-Password-2026!' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match');
    expect(post).not.toHaveBeenCalled();
  });

  it('removes legacy plaintext-password progress and never persists new passwords', () => {
    localStorage.setItem('pl_signup_form_data', JSON.stringify({ email: 'old@example.test', password: 'legacy-secret', confirmPassword: 'legacy-secret' }));
    mount(<Signup />);
    fillSignup();
    expect(localStorage.getItem('pl_signup_form_data')).toBeNull();
    expect([...savedLocalValues.values()].join(' ')).not.toContain('Fixture-Password-2026!');
    expect(Array.from({ length: sessionStorage.length }, (_, index) => sessionStorage.getItem(sessionStorage.key(index)!)).join(' ')).not.toContain('Fixture-Password-2026!');
  });

  it('keeps a failed registration retryable and never claims account creation', async () => {
    post.mockRejectedValue(new Error('Identity provider unavailable'));
    mount(<Signup />); fillSignup();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Identity provider unavailable');
    expect(screen.queryByRole('heading', { name: 'Your account is created' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
  });

  it('rejects a malformed successful HTTP response', async () => {
    post.mockResolvedValue({ data: { success: true } });
    mount(<Signup />); fillSignup();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('did not confirm account creation');
  });

  it.each([true, false])('reports actual verification delivery=%s without unauthenticated onboarding writes', async sent => {
    post.mockResolvedValue({ data: { success: true, userId: 'new-user', email: 'test@example.test', requiresEmailVerification: true, verificationEmailSent: sent } });
    mount(<Signup />); fillSignup();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await screen.findByRole('heading', { name: 'Your account is created' });
    expect(screen.getByText(sent ? /Check test@example.test for a verification link/ : /verification email could not be sent/)).toBeInTheDocument();
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0]).toBe('/auth/register');
    expect(screen.getByRole('link', { name: 'Continue to sign in' })).toHaveAttribute('href', '/login');
  });

  it('previews invitations and sends their one-use token instead of creating another organization', async () => {
    sessionStorage.setItem('plainledger-pending-invitation', token);
    post.mockResolvedValueOnce({ data: preview }).mockResolvedValueOnce({ data: { success: true, userId: 'new-member', email: preview.email, requiresEmailVerification: true, verificationEmailSent: false } });
    mount(<Signup />);
    await screen.findByText(/You are joining Fixture Organization/);
    fillSignup();
    // The browser prevents edits to the invited address; use the actual readonly value.
    fireEvent.change(document.getElementById('signup-email')!, { target: { value: preview.email } });
    expect(document.getElementById('signup-email')).toHaveAttribute('readonly');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await screen.findByRole('heading', { name: 'Your account is created' });
    expect(post.mock.calls[1][1]).toMatchObject({ email: preview.email, invitationToken: token });
    expect(post.mock.calls[1][1]).not.toHaveProperty('organizationName');
    expect(sessionStorage.getItem('plainledger-pending-invitation')).toBeNull();
  });

  it('blocks signup from an expired invitation without silently creating a personal organization', async () => {
    sessionStorage.setItem('plainledger-pending-invitation', token);
    post.mockRejectedValue(new Error('Invitation expired'));
    mount(<Signup />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Invitation expired');
    fillSignup();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
    expect(post).toHaveBeenCalledTimes(1);
  });
});

describe('Invitation review and acceptance', () => {
  it('shows a useful missing-link state without API calls', () => {
    mount(<JoinOrganization />);
    expect(screen.getByRole('alert')).toHaveTextContent('invitation link is incomplete');
    expect(post).not.toHaveBeenCalled();
  });

  it('keeps the invitation in the URL fragment out of navigation URLs and preserves sign-in return', async () => {
    window.history.replaceState({}, '', `/join#token=${token}`);
    post.mockResolvedValue({ data: preview });
    mount(<JoinOrganization />);
    await screen.findByText('Fixture Organization');
    expect(window.location.hash).toBe('');
    expect(sessionStorage.getItem('plainledger-pending-invitation')).toBe(token);
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login?redirect=%2Fjoin');
  });

  it.each([
    { email: 'other@example.test', emailVerified: true, message: /Sign out and use/ },
    { email: preview.email, emailVerified: false, message: /Verify your email address before accepting/ },
  ])('blocks acceptance for an ineligible signed-in identity %#', async ({ email, emailVerified, message }) => {
    sessionStorage.setItem('plainledger-pending-invitation', token);
    auth.authenticated = true; auth.user = { email, emailVerified };
    post.mockResolvedValue({ data: preview });
    mount(<JoinOrganization />);
    await screen.findByText(message);
    expect(screen.queryByRole('button', { name: 'Accept invitation' })).not.toBeInTheDocument();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('refreshes the signed tenant claim only after a confirmed membership save', async () => {
    sessionStorage.setItem('plainledger-pending-invitation', token);
    auth.authenticated = true; auth.user = { email: preview.email, emailVerified: true };
    post.mockResolvedValueOnce({ data: preview }).mockResolvedValueOnce({ data: { tenantId: preview.tenantId, refreshSession: true } });
    mount(<JoinOrganization />);
    fireEvent.click(await screen.findByRole('button', { name: 'Accept invitation' }));
    await screen.findByText('You have joined Fixture Organization.');
    expect(post).toHaveBeenLastCalledWith('/organizations/invitations/accept', { token });
    expect(auth.keycloak.updateToken).toHaveBeenCalledWith(-1);
    expect(sessionStorage.getItem('plainledger-pending-invitation')).toBeNull();
  });

  it('keeps rejected membership acceptance retryable', async () => {
    sessionStorage.setItem('plainledger-pending-invitation', token);
    auth.authenticated = true; auth.user = { email: preview.email, emailVerified: true };
    post.mockResolvedValueOnce({ data: preview }).mockRejectedValueOnce(new Error('Invitation already used'));
    mount(<JoinOrganization />);
    fireEvent.click(await screen.findByRole('button', { name: 'Accept invitation' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invitation already used');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Accept invitation' })).toBeEnabled());
    expect(auth.keycloak.updateToken).not.toHaveBeenCalled();
  });
});
