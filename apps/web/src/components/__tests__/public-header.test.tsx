import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PublicHeader from '../PublicHeader';

const state = vi.hoisted(() => ({ language: 'en', authenticated: false, register: vi.fn() }));
vi.mock('../../lib/keycloak', () => ({ useAuth: () => ({ authenticated: state.authenticated, register: state.register }) }));
vi.mock('../../contexts/ThemeContext', () => ({ useTheme: () => ({ resolvedTheme: 'dark' }) }));
vi.mock('../../lib/i18n', () => ({ useI18n: () => ({ language: state.language }), LanguageToggle: () => null }));
vi.mock('../ThemeToggle', () => ({ default: () => null }));

beforeEach(() => { state.language = 'en'; state.authenticated = false; state.register.mockReset(); });
afterEach(cleanup);
const mount = (props: React.ComponentProps<typeof PublicHeader> = {}) => render(<MemoryRouter><PublicHeader {...props} /></MemoryRouter>);
const openMenu = () => fireEvent.click(screen.getByRole('button', { name: /^(Open menu|Ouvrir le menu)$/ }));

describe('Public navigation on mobile and tablet', () => {
  it.each(['en', 'fr'])('exposes expanded state and returns keyboard focus after Escape in %s', language => {
    state.language = language;
    mount({ fullMenu: true });
    const toggle = screen.getByRole('button', { name: /^(Open menu|Ouvrir le menu)$/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    openMenu();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const navigation = screen.getByRole('navigation', { name: /Mobile navigation|Navigation mobile/ });
    expect(navigation.parentElement?.id).toBe(toggle.getAttribute('aria-controls'));
    const link = within(navigation).getByRole('link', { name: /^(Sign in|Connexion)$/ });
    expect(link).toHaveAttribute('href', '/login');
    link.focus();
    fireEvent.keyDown(link, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    expect(screen.queryByRole('navigation', { name: /Mobile navigation|Navigation mobile/ })).not.toBeInTheDocument();
  });

  it.each([false, true])('gives an authenticated visitor access to the dashboard with fullMenu=%s', fullMenu => {
    state.authenticated = true;
    mount({ fullMenu });
    openMenu();
    const nav = screen.getByRole('navigation', { name: 'Mobile navigation' });
    const dashboard = within(nav).getByRole('link', { name: 'Go to Dashboard' });
    expect(dashboard).toHaveAttribute('href', '/app');
    expect(within(nav).queryByText('Sign in')).not.toBeInTheDocument();
    fireEvent.click(dashboard);
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument();
  });

  it('closes the Québec menu after a section or its main action is selected', () => {
    state.language = 'fr';
    const scroll = vi.fn();
    const start = vi.fn();
    mount({ badge: 'Québec', customMenuItems: [{ labelEn: 'Tax Credits', labelFr: 'Crédits d’impôt', scrollTo: 'credits' }], onScrollToSection: scroll, customAction: { labelEn: 'Get started', labelFr: 'Commencer', onClick: start } });
    openMenu();
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Navigation mobile' })).getByRole('button', { name: 'Crédits d’impôt' }));
    expect(scroll).toHaveBeenCalledExactlyOnceWith('credits');
    expect(screen.getByRole('button', { name: 'Ouvrir le menu' })).toHaveAttribute('aria-expanded', 'false');
    openMenu();
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Navigation mobile' })).getByRole('button', { name: 'Commencer' }));
    expect(start).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Ouvrir le menu' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('starts registration once and closes the public menu', () => {
    mount({ fullMenu: true });
    openMenu();
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Mobile navigation' })).getByRole('button', { name: 'Start free' }));
    expect(state.register).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument();
  });
});
