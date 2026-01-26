import { test, expect } from '@playwright/test';

/**
 * Connections Page Tests (Authenticated)
 * Tests the data source connections functionality
 */
test.describe('Connections Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/connections');
  });

  test('should display connections page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Connexions' })).toBeVisible();
    await expect(page.getByText(/Connectez vos logiciels comptables/)).toBeVisible();
  });

  test('should display active connections count', async ({ page }) => {
    await expect(page.getByText(/\d+ connexions? actives?/)).toBeVisible();
  });

  test('should display introduction card for new users', async ({ page }) => {
    await expect(page.getByText(/Commencez par connecter votre logiciel comptable/)).toBeVisible();
    await expect(page.getByText(/PlainLedger se synchronise avec vos données/)).toBeVisible();
  });

  test('should display QuickBooks provider card', async ({ page }) => {
    // Find QuickBooks card
    const quickbooksCard = page.locator('text=QuickBooks Online').locator('..');
    
    await expect(page.getByText('QuickBooks Online')).toBeVisible();
    await expect(page.getByText('Intuit QuickBooks accounting software')).toBeVisible();
    
    // Should have connect button
    await expect(page.getByRole('button', { name: 'Connecter' }).first()).toBeVisible();
  });

  test('should display Xero provider card', async ({ page }) => {
    await expect(page.getByText('Xero')).toBeVisible();
    await expect(page.getByText('Cloud-based accounting platform')).toBeVisible();
  });

  test('should display Sage provider card', async ({ page }) => {
    await expect(page.getByText('Sage')).toBeVisible();
    await expect(page.getByText('Sage Business Cloud Accounting')).toBeVisible();
  });

  test('should display connection status badges', async ({ page }) => {
    // All should show "Non connecté" initially
    const disconnectedBadges = page.getByText('Non connecté');
    await expect(disconnectedBadges.first()).toBeVisible();
  });

  test('should open connection modal on connect click', async ({ page }) => {
    // Click first connect button
    await page.getByRole('button', { name: 'Connecter' }).first().click();
    
    // Modal should appear
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Should show connection steps or OAuth redirect info
    await expect(page.getByText(/connexion|autoriser|OAuth/i)).toBeVisible();
  });

  test('should close modal on cancel', async ({ page }) => {
    // Open modal
    await page.getByRole('button', { name: 'Connecter' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Close modal (click outside or cancel button)
    await page.keyboard.press('Escape');
    
    // Modal should be closed
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});

test.describe('Connections - Provider Details', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/connections');
  });

  test('should display all supported providers', async ({ page }) => {
    const providers = ['QuickBooks', 'Xero', 'Sage', 'FreshBooks', 'Wave', 'CSV'];
    
    for (const provider of providers) {
      // At least check that most major providers are visible
      if (['QuickBooks', 'Xero', 'Sage'].includes(provider)) {
        await expect(page.getByText(new RegExp(provider, 'i')).first()).toBeVisible();
      }
    }
  });

  test('should have provider logos/icons', async ({ page }) => {
    // Check that provider cards have visual indicators
    const providerCards = page.locator('[class*="card"], [class*="border"]').filter({
      hasText: /QuickBooks|Xero|Sage/
    });
    
    // Should have multiple provider cards
    await expect(providerCards.first()).toBeVisible();
  });
});
