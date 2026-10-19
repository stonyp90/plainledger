import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Link, MemoryRouter } from 'react-router-dom';
import SEOHead from './SEOHead';

vi.mock('../lib/i18n', () => ({ useI18n: () => ({ language: 'fr' }) }));

beforeEach(() => { document.head.innerHTML = ''; });
afterEach(cleanup);

describe('public discovery metadata', () => {
  it('resets noindex and page identity after navigating from a private page', () => {
    render(<MemoryRouter initialEntries={['/app/settings']}><SEOHead /><Link to="/privacy">Privacy</Link></MemoryRouter>);
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow');
    expect(document.querySelector('script[data-plainledger-schema]')).toBeNull();
    fireEvent.click(screen.getByText('Privacy'));
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('index, follow');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).not.toContain('noindex');
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://plainledger.ca/privacy');
    expect(document.title).toContain('confidentialité');
  });

  it('removes public schema when navigating into account routes', () => {
    render(<MemoryRouter><SEOHead /><Link to="/shared/example-token">Shared</Link></MemoryRouter>);
    expect(document.querySelector('script[data-plainledger-schema]')).not.toBeNull();
    fireEvent.click(screen.getByText('Shared'));
    expect(document.querySelector('script[data-plainledger-schema]')).toBeNull();
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow');
  });

  it('canonicalizes actual aliases without advertising language query variants', () => {
    document.head.innerHTML = '<link rel="alternate" hreflang="fr-CA" href="/?lang=fr">';
    render(<MemoryRouter initialEntries={['/qc?lang=fr']}><SEOHead /></MemoryRouter>);
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://plainledger.ca/quebec');
    expect(document.querySelector('link[hreflang]')).toBeNull();
    expect(document.documentElement.lang).toBe('fr-CA');
    const schema = JSON.parse(document.querySelector('script[data-plainledger-schema]')!.textContent!);
    expect(schema['@type']).toBe('WebPage');
    expect(schema).not.toHaveProperty('aggregateRating');
    expect(schema).not.toHaveProperty('offers');
  });
});
