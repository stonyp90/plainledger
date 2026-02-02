/**
 * Playwright Accessibility Helpers
 * 
 * Provides accessibility testing capabilities:
 * - ARIA snapshot capture
 * - Accessibility tree inspection
 * - WCAG compliance checks
 */

import { Page } from '@playwright/test';

export interface AriaNode {
  role: string;
  name: string;
  level?: number;
  children?: AriaNode[];
}

export interface AccessibilityIssue {
  type: 'error' | 'warning';
  rule: string;
  element: string;
  message: string;
}

/**
 * Accessibility Helper Class
 */
export class AccessibilityHelper {
  constructor(private page: Page) {}

  /**
   * Get ARIA snapshot of the page
   */
  async getAriaSnapshot(selector?: string): Promise<AriaNode[]> {
    return await this.page.evaluate((sel) => {
      const root = sel ? document.querySelector(sel) : document.body;
      if (!root) return [];

      function getAriaTree(element: Element, level = 0): AriaNode {
        const role = element.getAttribute('role') || element.tagName.toLowerCase();
        const name =
          element.getAttribute('aria-label') ||
          element.getAttribute('aria-labelledby') ||
          element.textContent?.trim().substring(0, 100) ||
          '';

        const children: AriaNode[] = [];
        for (const child of Array.from(element.children)) {
          children.push(getAriaTree(child, level + 1));
        }

        return {
          role,
          name,
          level,
          children: children.length > 0 ? children : undefined,
        };
      }

      return [getAriaTree(root)];
    }, selector);
  }

  /**
   * Get accessibility tree using Playwright's accessibility API
   */
  async getAccessibilityTree(selector?: string): Promise<any> {
    if (selector) {
      const element = await this.page.locator(selector).first();
      return await element.evaluate((el) => {
        // Use browser's accessibility API if available
        if ((window as any).chrome?.accessibility) {
          return (window as any).chrome.accessibility.getTree();
        }
        return null;
      });
    }
    return await this.page.accessibility.snapshot();
  }

  /**
   * Check for common accessibility issues
   */
  async checkAccessibilityIssues(): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    // Check for missing alt text on images
    const imagesWithoutAlt = await this.page.locator('img:not([alt])').count();
    if (imagesWithoutAlt > 0) {
      issues.push({
        type: 'error',
        rule: 'WCAG 1.1.1',
        element: 'img',
        message: `Found ${imagesWithoutAlt} images without alt text`,
      });
    }

    // Check for missing labels on form inputs
    const inputsWithoutLabel = await this.page
      .locator('input:not([aria-label]):not([aria-labelledby]):not([id])')
      .count();
    if (inputsWithoutLabel > 0) {
      issues.push({
        type: 'warning',
        rule: 'WCAG 2.4.6',
        element: 'input',
        message: `Found ${inputsWithoutLabel} inputs without labels`,
      });
    }

    // Check for missing heading hierarchy
    const headings = await this.page.locator('h1, h2, h3, h4, h5, h6').all();
    let lastLevel = 0;
    for (const heading of headings) {
      const tagName = await heading.evaluate((el) => el.tagName.toLowerCase());
      const level = parseInt(tagName.substring(1));
      if (level > lastLevel + 1) {
        issues.push({
          type: 'warning',
          rule: 'WCAG 1.3.1',
          element: tagName,
          message: `Heading level skipped: ${tagName} after h${lastLevel}`,
        });
      }
      lastLevel = level;
    }

    // Check for color contrast (basic check)
    const lowContrastElements = await this.page
      .locator('[style*="color"], [style*="background"]')
      .count();
    if (lowContrastElements > 0) {
      issues.push({
        type: 'warning',
        rule: 'WCAG 1.4.3',
        element: '*',
        message: 'Some elements may have low contrast. Manual review recommended.',
      });
    }

    return issues;
  }

  /**
   * Assert no accessibility errors
   */
  async assertNoAccessibilityErrors(): Promise<void> {
    const issues = await this.checkAccessibilityIssues();
    const errors = issues.filter((issue) => issue.type === 'error');
    if (errors.length > 0) {
      throw new Error(
        `Found ${errors.length} accessibility errors:\n${errors.map((e) => `  - ${e.rule}: ${e.message}`).join('\n')}`,
      );
    }
  }

  /**
   * Get all interactive elements
   */
  async getInteractiveElements(): Promise<Array<{ selector: string; role: string; name: string }>> {
    return await this.page.evaluate(() => {
      const interactive = Array.from(
        document.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="link"], [tabindex]'),
      );

      return interactive.map((el) => {
        const role = el.getAttribute('role') || el.tagName.toLowerCase();
        const name =
          el.getAttribute('aria-label') ||
          el.getAttribute('aria-labelledby') ||
          el.textContent?.trim().substring(0, 100) ||
          '';

        // Generate selector
        let selector = role;
        if (el.id) selector = `#${el.id}`;
        else if (el.className) selector = `.${el.className.split(' ')[0]}`;

        return { selector, role, name };
      });
    });
  }
}

/**
 * Create accessibility helper for a page
 */
export function createAccessibilityHelper(page: Page): AccessibilityHelper {
  return new AccessibilityHelper(page);
}
