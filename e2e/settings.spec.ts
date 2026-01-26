import { test, expect } from '@playwright/test';

/**
 * Settings Page Tests (Authenticated)
 * Tests the settings functionality including subscriptions and Power BI
 */
test.describe('Settings Page - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/settings');
  });

  test('should display settings page with all tabs', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Paramètres' })).toBeVisible();
    
    // Check all tabs are present
    await expect(page.getByRole('button', { name: 'Organisation' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Profil' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abonnement' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Power BI' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Notifications' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sécurité' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Intégrations' })).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    // Click on Profil tab
    await page.getByRole('button', { name: 'Profil' }).click();
    await expect(page.getByText('Informations du profil')).toBeVisible();
    
    // Click on Abonnement tab
    await page.getByRole('button', { name: 'Abonnement' }).click();
    await expect(page.getByText('Plan actuel')).toBeVisible();
    
    // Click back to Organisation
    await page.getByRole('button', { name: 'Organisation' }).click();
    await expect(page.getByText("Informations de l'organisation")).toBeVisible();
  });
});

test.describe('Settings Page - Organization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/settings');
  });

  test('should display organization form fields', async ({ page }) => {
    await expect(page.getByLabel("Nom de l'organisation")).toBeVisible();
    await expect(page.getByLabel('Raison sociale')).toBeVisible();
    await expect(page.getByLabel("Numéro d'entreprise (NEQ)")).toBeVisible();
    await expect(page.getByLabel('Devise')).toBeVisible();
    await expect(page.getByLabel("Fin d'exercice (mois)")).toBeVisible();
    await expect(page.getByLabel("Secteur d'activité")).toBeVisible();
  });

  test('should have save button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Enregistrer les modifications' })).toBeVisible();
  });

  test('should have currency options', async ({ page }) => {
    const deviseSelect = page.getByLabel('Devise');
    await deviseSelect.click();
    
    await expect(page.getByRole('option', { name: /CAD/ })).toBeVisible();
    await expect(page.getByRole('option', { name: /USD/ })).toBeVisible();
    await expect(page.getByRole('option', { name: /EUR/ })).toBeVisible();
  });
});

test.describe('Settings Page - Profile', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/settings');
    await page.getByRole('button', { name: 'Profil' }).click();
  });

  test('should display user profile information', async ({ page }) => {
    await expect(page.getByText('Informations du profil')).toBeVisible();
    await expect(page.getByLabel('Prénom')).toBeVisible();
    await expect(page.getByLabel('Nom')).toBeVisible();
    await expect(page.getByLabel('Courriel')).toBeVisible();
  });

  test('should display user roles', async ({ page }) => {
    await expect(page.getByText('Rôles')).toBeVisible();
  });

  test('should have disabled email field with explanation', async ({ page }) => {
    const emailField = page.getByLabel('Courriel');
    await expect(emailField).toBeDisabled();
    await expect(page.getByText(/géré par votre compte Keycloak/)).toBeVisible();
  });
});

test.describe('Settings Page - Subscription', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/settings');
    await page.getByRole('button', { name: 'Abonnement' }).click();
  });

  test('should display current plan information', async ({ page }) => {
    await expect(page.getByText('Plan actuel')).toBeVisible();
    
    // Should show one of the plan names
    const planNames = ['Gratuit', 'Starter', 'Professional', 'Enterprise'];
    const planVisible = await Promise.any(
      planNames.map(plan => 
        page.getByText(new RegExp(plan, 'i')).isVisible()
          .then(visible => visible ? Promise.resolve(true) : Promise.reject())
      )
    ).catch(() => false);
    
    expect(planVisible).toBeTruthy();
  });

  test('should display usage information', async ({ page }) => {
    await expect(page.getByText('Utilisation ce mois')).toBeVisible();
    await expect(page.getByText('Connexions de données')).toBeVisible();
    await expect(page.getByText('Rapports générés')).toBeVisible();
  });

  test('should display entitlements/features', async ({ page }) => {
    await expect(page.getByText('Fonctionnalités incluses')).toBeVisible();
    
    // Check some feature items
    await expect(page.getByText('Rapports IBCS')).toBeVisible();
    await expect(page.getByText('Power BI Embedded')).toBeVisible();
  });

  test('should have change plan button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Changer de plan' })).toBeVisible();
  });

  test('should display renewal date', async ({ page }) => {
    await expect(page.getByText(/Prochain renouvellement/)).toBeVisible();
  });
});

test.describe('Settings Page - Power BI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/settings');
    await page.getByRole('button', { name: 'Power BI' }).click();
  });

  test('should display Power BI configuration section', async ({ page }) => {
    await expect(page.getByText('Configuration Power BI')).toBeVisible();
  });

  test('should show enabled status for Professional plan', async ({ page }) => {
    // Should show either enabled or upgrade message
    const enabledVisible = await page.getByText('Activé').isVisible();
    const upgradeVisible = await page.getByText(/Mettre à niveau/).isVisible();
    
    expect(enabledVisible || upgradeVisible).toBeTruthy();
  });

  test('should display Azure configuration fields when enabled', async ({ page }) => {
    // Check if Power BI is enabled
    const isEnabled = await page.getByText('Activé').isVisible();
    
    if (isEnabled) {
      await expect(page.getByLabel('Azure Tenant ID')).toBeVisible();
      await expect(page.getByLabel(/Azure Client ID/)).toBeVisible();
      await expect(page.getByLabel(/Power BI Workspace ID/)).toBeVisible();
    }
  });

  test('should display configuration required info', async ({ page }) => {
    const isEnabled = await page.getByText('Activé').isVisible();
    
    if (isEnabled) {
      await expect(page.getByText('Configuration requise')).toBeVisible();
      await expect(page.getByText(/Azure AD App Registration/)).toBeVisible();
    }
  });
});

test.describe('Settings Page - Integrations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/settings');
    await page.getByRole('button', { name: 'Intégrations' }).click();
  });

  test('should display integrations list', async ({ page }) => {
    await expect(page.getByText('Intégrations de données')).toBeVisible();
  });

  test('should display provider integration items', async ({ page }) => {
    await expect(page.getByText('QuickBooks')).toBeVisible();
    await expect(page.getByText('Xero')).toBeVisible();
    await expect(page.getByText('Sage')).toBeVisible();
  });

  test('should show connection status for each provider', async ({ page }) => {
    // Should show either "Non connecté", "Connecté", or "Non disponible"
    const statuses = ['Non connecté', 'Connecté', 'Non disponible dans votre plan'];
    
    const hasStatus = await Promise.any(
      statuses.map(status => 
        page.getByText(status).first().isVisible()
          .then(visible => visible ? Promise.resolve(true) : Promise.reject())
      )
    ).catch(() => false);
    
    expect(hasStatus).toBeTruthy();
  });

  test('should have action buttons for providers', async ({ page }) => {
    // Should have either "Connecter", "Gérer", or "Upgrade" buttons
    const buttons = ['Connecter', 'Gérer', 'Upgrade'];
    
    const hasButton = await Promise.any(
      buttons.map(btn => 
        page.getByRole('button', { name: btn }).first().isVisible()
          .then(visible => visible ? Promise.resolve(true) : Promise.reject())
      )
    ).catch(() => false);
    
    expect(hasButton).toBeTruthy();
  });
});
