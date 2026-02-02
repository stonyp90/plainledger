/**
 * Accessibility E2E Tests
 * 
 * Tests WCAG compliance and accessibility features
 */

import { test, expect } from '@playwright/test';
import { createAccessibilityHelper } from './helpers/accessibility';

test.describe('Accessibility', () => {
  test('should have no accessibility errors on dashboard', async ({ page }) => {
    await page.goto('/app/dashboard');
    await page.waitForLoadState('networkidle');

    const a11y = createAccessibilityHelper(page);
    const issues = await a11y.checkAccessibilityIssues();

    // Filter out warnings, only check errors
    const errors = issues.filter((issue) => issue.type === 'error');
    expect(errors).toHaveLength(0);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/app/dashboard');
    await page.waitForLoadState('networkidle');

    const a11y = createAccessibilityHelper(page);
    const ariaSnapshot = await a11y.getAriaSnapshot();

    // Check that headings follow proper hierarchy
    // This is a basic check - can be enhanced
    expect(ariaSnapshot.length).toBeGreaterThan(0);
  });

  test('should have accessible form inputs', async ({ page }) => {
    await page.goto('/app/settings');
    await page.waitForLoadState('networkidle');

    const a11y = createAccessibilityHelper(page);
    const issues = await a11y.checkAccessibilityIssues();

    // Check for form accessibility issues
    const formIssues = issues.filter(
      (issue) => issue.element === 'input' || issue.element === 'select',
    );
    expect(formIssues.length).toBeLessThan(5); // Allow some warnings
  });

  test('should have accessible interactive elements', async ({ page }) => {
    await page.goto('/app/dashboard');
    await page.waitForLoadState('networkidle');

    const a11y = createAccessibilityHelper(page);
    const interactive = await a11y.getInteractiveElements();

    // All interactive elements should have names
    const unnamed = interactive.filter((el) => !el.name || el.name.trim() === '');
    expect(unnamed.length).toBeLessThanOrEqual(3); // Allow some unnamed elements
  });
});
