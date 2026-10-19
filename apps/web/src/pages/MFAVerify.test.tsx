import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MFAVerify from './MFAVerify';

const mocks = vi.hoisted(() => ({
  auth: { initialized: true, authenticated: false, authError: null as string | null, login: vi.fn() },
}));
vi.mock('../lib/keycloak', async importOriginal => ({
  ...await importOriginal<typeof import('../lib/keycloak')>(), useKeycloak: () => mocks.auth,
}));
vi.mock('../lib/i18n', () => ({ useI18n: () => ({ language: 'en' }) }));
vi.mock('../components/PublicHeader', () => ({ default: () => <header>PlainLedger</header> }));
function Destination() {
  const location = useLocation();
  return <output data-testid="destination">{location.pathname + location.search + location.hash}</output>;
}
function Page({ entry = '/mfa/verify' }: { entry?: string }) {
  return <MemoryRouter initialEntries={[entry]}><Routes>
    <Route path="/mfa/verify" element={<MFAVerify />} />
    <Route path="*" element={<Destination />} />
  </Routes></MemoryRouter>;
}
beforeEach(() => {
  mocks.auth.initialized = true; mocks.auth.authenticated = false; mocks.auth.authError = null;
  mocks.auth.login.mockReset().mockResolvedValue(undefined); sessionStorage.clear();
});

describe('MFA browser-flow handoff (adapter mocked)', () => {
  it('restarts adapter sign-in without accepting a legacy session or storing tokens', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { container } = render(<Page entry="/mfa/verify?session=untrusted&email=user%40example.test" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Complete secure sign-in');
    expect(container.querySelector('input')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Continue secure sign-in' }));
    await waitFor(() => expect(mocks.auth.login).toHaveBeenCalledOnce());
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('kc_token')).toBeNull();
    expect(sessionStorage.getItem('kc_refresh_token')).toBeNull();
    fetchSpy.mockRestore();
  });
  it('renders immediately and waits for callback initialization before returning', async () => {
    mocks.auth.initialized = false; mocks.auth.authenticated = true;
    const { rerender } = render(<Page />);
    expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Checking your session');
    expect(screen.getByRole('button', { name: 'Continue secure sign-in' })).toBeDisabled();
    expect(screen.queryByTestId('destination')).not.toBeInTheDocument();
    mocks.auth.initialized = true; rerender(<Page />);
    expect(await screen.findByTestId('destination')).toHaveTextContent('/app');
  });
  it.each(['https://attacker.example/steal', '/mfa/verify', '//attacker.example/steal'])('keeps an unsafe or looping return %s inside the app', async target => {
    mocks.auth.authenticated = true;
    render(<Page entry={`/mfa/verify?redirect=${encodeURIComponent(target)}`} />);
    expect(await screen.findByTestId('destination')).toHaveTextContent(/^\/app$/);
  });
  it('preserves an authenticated same-origin return path', async () => {
    mocks.auth.authenticated = true;
    render(<Page entry="/mfa/verify?redirect=%2Fapp%2Freports%3Fperiod%3D2026%23income" />);
    expect(await screen.findByTestId('destination')).toHaveTextContent('/app/reports?period=2026#income');
  });
  it('retains a failed handoff for retry and prevents duplicate in-flight calls', async () => {
    let reject!: (error: Error) => void;
    mocks.auth.login.mockImplementationOnce(() => new Promise((_, rejectPromise) => { reject = rejectPromise; }));
    render(<Page />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue secure sign-in' }));
    expect(screen.getByRole('button', { name: 'Continue secure sign-in' })).toBeDisabled();
    await act(async () => { reject(new Error('Offline')); });
    expect(screen.getByRole('alert')).toHaveTextContent('could not start');
    fireEvent.click(screen.getByRole('button', { name: 'Continue secure sign-in' }));
    await waitFor(() => expect(mocks.auth.login).toHaveBeenCalledTimes(2));
  });
  it('shows a reload action after adapter initialization fails', () => {
    mocks.auth.authError = 'Secure sign-in is unavailable';
    render(<Page />);
    expect(screen.getByRole('alert')).toHaveTextContent('unavailable');
    expect(screen.getByRole('button', { name: 'Reload secure sign-in' })).toBeVisible();
    expect(mocks.auth.login).not.toHaveBeenCalled();
  });
});
