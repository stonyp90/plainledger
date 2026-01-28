import { test, expect } from '@playwright/test';

/**
 * Authentication Flow Tests (Unauthenticated)
 * Tests the complete authentication flow via Keycloak
 */
test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ context }) => {
    // Clear all cookies and storage to ensure unauthenticated state
    await context.clearCookies();
  });

  test('should show landing page at root', async ({ page }) => {
    await page.goto('/');
    
    // Should show landing page elements
    await expect(page.locator('nav').getByText('PlainLedger')).toBeVisible();
    await expect(page.locator('nav').getByRole('button', { name: 'Connexion' })).toBeVisible();
  });

  test('should display Keycloak login page with PlainLedger theme', async ({ page }) => {
    await page.goto('/');
    
    // Click login
    await page.getByRole('button', { name: 'Connexion' }).click();
    
    // Wait for Keycloak
    await page.waitForURL(/localhost:8080/);
    
    // Check PlainLedger branding
    await expect(page.getByText('PlainLedger')).toBeVisible();
    
    // Check French labels
    await expect(page.getByLabel('Courriel')).toBeVisible();
    await expect(page.getByLabel('Mot de passe')).toBeVisible();
  });

  test('should have forgot password link', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Connexion' }).click();
    await page.waitForURL(/localhost:8080/);
    
    await expect(page.getByRole('link', { name: /Mot de passe oublié/i })).toBeVisible();
  });

  test('should have create account link', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Connexion' }).click();
    await page.waitForURL(/localhost:8080/);
    
    await expect(page.getByRole('link', { name: /Créer un compte/i })).toBeVisible();
  });

  test('should have language switcher', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Connexion' }).click();
    await page.waitForURL(/localhost:8080/);
    
    // Check for language options
    await expect(page.getByRole('button', { name: 'Langues' })).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Connexion' }).click();
    await page.waitForURL(/localhost:8080/);
    
    // Enter invalid credentials
    await page.getByLabel('Courriel').fill('invalid@test.com');
    await page.getByLabel('Mot de passe').fill('wrongpassword');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    
    // Should show error message
    await expect(page.getByText(/invalide|incorrect|erreur/i)).toBeVisible({ timeout: 10000 });
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Connexion' }).click();
    await page.waitForURL(/localhost:8080/);
    
    // Enter valid credentials
    await page.getByLabel('Courriel').fill('demo@plainledger.ca');
    await page.getByLabel('Mot de passe').fill('DemoPass123!@#');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    
    // Should redirect to app
    await page.waitForURL(/localhost:5173\/app/, { timeout: 15000 });
    
    // Should see dashboard
    await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Connexion' }).click();
    await page.waitForURL(/localhost:8080/);
    
    // Click forgot password
    await page.getByRole('link', { name: /Mot de passe oublié/i }).click();
    
    // Should show password reset form
    await expect(page.getByLabel('Courriel')).toBeVisible();
    await expect(page.getByRole('button', { name: /Envoyer|Soumettre|Réinitialiser/i })).toBeVisible();
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Connexion' }).click();
    await page.waitForURL(/localhost:8080/);
    
    // Click create account
    await page.getByRole('link', { name: /Créer un compte/i }).click();
    
    // Should show registration form with name fields
    await expect(page.getByRole('textbox', { name: /Prénom/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /famille/i })).toBeVisible();
  });
});

test.describe('Registration Flow', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('should display registration form fields', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Connexion' }).click();
    await page.waitForURL(/localhost:8080/);
    await page.getByRole('link', { name: /Créer un compte/i }).click();
    
    // Check all required fields using role selectors
    await expect(page.getByRole('textbox', { name: /Prénom/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /famille/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /Courriel/i })).toBeVisible();
  });

  test('should have back to login link', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Connexion' }).click();
    await page.waitForURL(/localhost:8080/);
    await page.getByRole('link', { name: /Créer un compte/i }).click();
    
    await expect(page.getByRole('link', { name: /Retour|Connexion|Se connecter/i })).toBeVisible();
  });
});
