import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SecuritySettings from '../SecuritySettings';

const state = vi.hoisted(() => ({
  language: 'en', accountManagement: vi.fn(),
  auth: { authenticated: true, initialized: true, user: { id: 'fixture-user' } },
  available: true,
}));
vi.mock('../../lib/keycloak', () => ({ useKeycloak: () => ({ ...state.auth, keycloak: state.available ? { accountManagement: state.accountManagement } : null }) }));
vi.mock('../../lib/i18n', () => ({ useI18n: () => ({ language: state.language }) }));
const fetchMock = vi.fn();

beforeEach(() => {
  state.language = 'en'; state.available = true;
  Object.assign(state.auth, { authenticated: true, initialized: true, user: { id: 'fixture-user' } });
  state.accountManagement.mockReset().mockResolvedValue(undefined);
  fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Honest account security state', () => {
  it.each(['en', 'fr'])('shows unavailable security data without fabricated sessions or MFA status in %s', language => {
    state.language = language; render(<SecuritySettings />);
    const mfa = screen.getByRole('region', { name: language === 'en' ? 'Two-factor authentication' : 'Authentification à deux facteurs' });
    expect(within(mfa).getByText(language === 'en' ? 'Status unavailable' : 'État indisponible')).toBeInTheDocument();
    expect(screen.getByText(language === 'en' ? 'Session details unavailable' : 'Détails des sessions indisponibles')).toBeInTheDocument();
    expect(screen.getByText(language === 'en' ? 'History unavailable' : 'Historique indisponible')).toBeInTheDocument();
    expect(screen.queryByText(/MacBook Pro|Chrome 120|192\.168\.1\.[12]|Montréal, QC|Toronto, ON|Disabled|Désactivé/)).not.toBeInTheDocument();
    expect(document.querySelector('input[type="password"]')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('opens the configured sign-in account once while navigation is pending', async () => {
    let finish!: () => void;
    state.accountManagement.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
    render(<SecuritySettings />);
    const button = screen.getByRole('button', { name: 'Open sign-in account' });
    act(() => { fireEvent.click(button); fireEvent.click(button); });
    expect(state.accountManagement).toHaveBeenCalledExactlyOnceWith();
    expect(screen.getByRole('button', { name: 'Opening account…' })).toBeDisabled();
    await act(async () => { finish(); });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/Password changed|MFA enabled|Session revoked/i)).not.toBeInTheDocument();
  });

  it.each(['en', 'fr'])('makes failed account navigation retryable in %s', async language => {
    state.language = language;
    state.accountManagement.mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValueOnce(undefined);
    render(<SecuritySettings />);
    fireEvent.click(screen.getByRole('button', { name: language === 'en' ? 'Open sign-in account' : 'Ouvrir le compte de connexion' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(language === 'en' ? 'Please try again' : 'Veuillez réessayer');
    fireEvent.click(screen.getByRole('button', { name: language === 'en' ? 'Try opening your account again' : 'Réessayer d’ouvrir votre compte' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(state.accountManagement).toHaveBeenCalledTimes(2);
  });

  it.each(['signed-out', 'initializing', 'missing-account-management'])('does not offer an unavailable account action for %s', situation => {
    if (situation === 'signed-out') state.auth.authenticated = false;
    if (situation === 'initializing') state.auth.initialized = false;
    if (situation === 'missing-account-management') state.available = false;
    render(<SecuritySettings />);
    const button = screen.getByRole('button', { name: 'Open sign-in account' });
    expect(button).toBeDisabled(); fireEvent.click(button);
    expect(screen.getByRole('status')).toHaveTextContent('Account management is unavailable for this session');
    expect(state.accountManagement).not.toHaveBeenCalled();
  });
});
