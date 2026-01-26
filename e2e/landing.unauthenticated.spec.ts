import { test, expect } from '@playwright/test';

/**
 * Landing Page Tests (Unauthenticated)
 * Tests the public marketing landing page
 */
test.describe('Landing Page', () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear cookies to ensure unauthenticated state
    await context.clearCookies();
    await page.goto('/');
  });

  test('should display the landing page hero section', async ({ page }) => {
    // Check logo and brand in nav
    await expect(page.locator('nav').getByText('PlainLedger')).toBeVisible();
    
    // Check hero heading
    await expect(page.getByRole('heading', { name: /Rapports financiers/ })).toBeVisible();
    
    // Check CTA buttons
    await expect(page.getByRole('button', { name: 'Commencer gratuitement' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Voir la démo' })).toBeVisible();
  });

  test('should display navigation with login buttons', async ({ page }) => {
    // Check navigation links in nav bar
    const nav = page.locator('nav');
    await expect(nav.getByRole('link', { name: 'Fonctionnalités' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Tarifs' })).toBeVisible();
    
    // Check login buttons in nav
    await expect(nav.getByRole('button', { name: 'Connexion' })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Essai gratuit' })).toBeVisible();
  });

  test('should display pricing tiers', async ({ page }) => {
    // Scroll to pricing section
    const pricingSection = page.locator('section#pricing, section:has-text("Tarification simple")').first();
    await pricingSection.scrollIntoViewIfNeeded();
    
    // Check all three tiers exist by heading with exact match
    await expect(page.getByRole('heading', { name: 'Starter', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Professional', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Enterprise', exact: true })).toBeVisible();
    
    // Check some pricing features
    await expect(page.getByText('Pour les petites entreprises')).toBeVisible();
    await expect(page.getByText('Pour les PME en croissance')).toBeVisible();
  });

  test('should display features section', async ({ page }) => {
    // Check features heading
    await expect(page.getByRole('heading', { name: 'Tout ce dont vous avez besoin' })).toBeVisible();
    
    // Check feature cards exist
    await expect(page.getByText('Connectez vos données')).toBeVisible();
    await expect(page.getByText('Rapports IBCS')).toBeVisible();
    await expect(page.getByText('Power BI Intégré')).toBeVisible();
    await expect(page.getByText('Sécurité Enterprise')).toBeVisible();
  });

  test('should display integrations section', async ({ page }) => {
    // Check integrations heading
    await expect(page.getByRole('heading', { name: 'Connectez vos outils existants' })).toBeVisible();
    
    // Check provider names with exact match
    await expect(page.getByText('QuickBooks', { exact: true })).toBeVisible();
    await expect(page.getByText('Xero', { exact: true })).toBeVisible();
    await expect(page.getByText('Sage', { exact: true })).toBeVisible();
  });

  test('should display footer with links', async ({ page }) => {
    // Scroll to footer
    await page.getByRole('contentinfo').scrollIntoViewIfNeeded();
    
    // Check footer sections
    await expect(page.getByRole('heading', { name: 'Produit' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ressources' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Légal' })).toBeVisible();
    
    // Check copyright
    await expect(page.getByText(/© \d{4} PlainLedger/)).toBeVisible();
  });

  test('should redirect to Keycloak on login click', async ({ page }) => {
    // Click login button
    await page.getByRole('button', { name: 'Connexion' }).click();
    
    // Should redirect to Keycloak
    await page.waitForURL(/localhost:8080.*\/auth/, { timeout: 10000 });
    
    // Check we're on Keycloak login page
    await expect(page.getByLabel('Courriel')).toBeVisible();
    await expect(page.getByLabel('Mot de passe')).toBeVisible();
  });
});
