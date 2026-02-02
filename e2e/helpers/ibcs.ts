/**
 * IBCS E2E Test Helpers
 * 
 * Utilities for testing IBCS compliance in Playwright tests.
 * Includes selectors, assertions, and visual regression helpers.
 */

import { Page, Locator, expect } from '@playwright/test';

// =====================================================
// IBCS SELECTORS
// =====================================================

/**
 * CSS selectors for IBCS elements
 */
export const IBCSSelectors = {
  // Variance pins
  variancePin: '[data-testid*="variance-pin"]',
  variancePinFavorable: '[data-favorable="true"]',
  variancePinUnfavorable: '[data-favorable="false"]',
  
  // Scenario bars
  scenarioBar: '[data-testid*="scenario-bar"]',
  actualBar: '[data-scenario="actual"]',
  planBar: '[data-scenario="plan"]',
  forecastBar: '[data-scenario="forecast"]',
  
  // Headers and legends
  ibcsHeader: '[data-testid="ibcs-header"]',
  ibcsLegend: '.ibcs-legend, .variance-pin',
  
  // Charts with IBCS mode
  ibcsChart: '[data-ibcs-mode="true"]',
  
  // Abbreviations (AC, PL, FC, etc.)
  abbreviationAC: ':text("AC")',
  abbreviationPL: ':text("PL")',
  abbreviationFC: ':text("FC")',
  abbreviationDelta: ':text("ΔPL"), :text("ΔPL%")',
};

// =====================================================
// IBCS COLORS
// =====================================================

/**
 * Expected IBCS colors for validation
 */
export const IBCSExpectedColors = {
  actual: {
    light: 'rgb(30, 41, 59)',  // slate-800
    dark: 'rgb(241, 245, 249)', // slate-100
  },
  planStroke: {
    light: 'rgb(30, 41, 59)',
    dark: 'rgb(203, 213, 225)',
  },
  variance: {
    favorable: 'rgb(34, 197, 94)', // green-500
    unfavorable: 'rgb(239, 68, 68)', // red-500
    neutral: 'rgb(148, 163, 184)', // slate-400
  },
};

// =====================================================
// TEST HELPERS
// =====================================================

/**
 * Check if a page has IBCS-compliant variance pins
 */
export async function hasVariancePins(page: Page): Promise<boolean> {
  const pins = await page.locator(IBCSSelectors.variancePin).count();
  return pins > 0;
}

/**
 * Get all variance pins on the page
 */
export async function getVariancePins(page: Page): Promise<Locator> {
  return page.locator(IBCSSelectors.variancePin);
}

/**
 * Verify variance pin colors match IBCS standards
 */
export async function verifyVariancePinColors(page: Page): Promise<void> {
  const pins = await page.locator(IBCSSelectors.variancePin).all();
  
  for (const pin of pins) {
    const favorable = await pin.getAttribute('data-favorable');
    const svgElements = await pin.locator('circle, line').all();
    
    for (const el of svgElements) {
      const fill = await el.getAttribute('fill');
      const stroke = await el.getAttribute('stroke');
      const color = fill || stroke;
      
      if (color) {
        if (favorable === 'true') {
          // Should be green
          expect(color).toContain('34, 197, 94');
        } else if (favorable === 'false') {
          // Should be red
          expect(color).toContain('239, 68, 68');
        }
      }
    }
  }
}

/**
 * Verify IBCS abbreviations are present
 */
export async function verifyIBCSAbbreviations(
  page: Page,
  expectedAbbreviations: ('AC' | 'PL' | 'FC' | 'ΔPL' | 'ΔPL%')[] = ['AC', 'PL']
): Promise<void> {
  for (const abbr of expectedAbbreviations) {
    const locator = page.getByText(abbr, { exact: true });
    await expect(locator.first()).toBeVisible();
  }
}

/**
 * Verify IBCS header structure
 */
export async function verifyIBCSHeader(page: Page, options?: {
  expectTitle?: boolean;
  expectColumns?: boolean;
}): Promise<void> {
  const header = page.locator(IBCSSelectors.ibcsHeader);
  
  if (options?.expectTitle !== false) {
    await expect(header.locator('h3')).toBeVisible();
  }
  
  if (options?.expectColumns !== false) {
    // Check for column headers (AC, PL, etc.)
    const columns = header.locator('[text-align="right"]');
    await expect(columns.first()).toBeVisible();
  }
}

/**
 * Get all IBCS charts on the page
 */
export async function getIBCSCharts(page: Page): Promise<Locator[]> {
  // Look for charts with IBCS features
  const chartsWithPins = await page.locator(':has(' + IBCSSelectors.variancePin + ')').all();
  const chartsWithBars = await page.locator(':has(' + IBCSSelectors.scenarioBar + ')').all();
  
  return [...chartsWithPins, ...chartsWithBars];
}

/**
 * Verify scenario bar styling matches IBCS standards
 */
export async function verifyScenarioBarStyles(page: Page): Promise<void> {
  // Actual bars should be solid
  const actualBars = await page.locator(IBCSSelectors.actualBar).all();
  for (const bar of actualBars) {
    const fill = await bar.locator('rect').first().getAttribute('fill');
    expect(fill).toBeTruthy();
    expect(fill).not.toBe('transparent');
    expect(fill).not.toBe('none');
  }
  
  // Plan bars should be outline only
  const planBars = await page.locator(IBCSSelectors.planBar).all();
  for (const bar of planBars) {
    const rect = bar.locator('rect').first();
    const fill = await rect.getAttribute('fill');
    const stroke = await rect.getAttribute('stroke');
    
    // Plan bars should have stroke but transparent/no fill
    expect(stroke).toBeTruthy();
  }
}

// =====================================================
// VISUAL REGRESSION HELPERS
// =====================================================

/**
 * Take a screenshot of IBCS elements for visual regression
 */
export async function screenshotIBCSElements(
  page: Page,
  name: string
): Promise<void> {
  // Find container with IBCS elements
  const ibcsContainer = page.locator(':has(' + IBCSSelectors.variancePin + ')').first();
  
  if (await ibcsContainer.count() > 0) {
    await expect(ibcsContainer).toHaveScreenshot(`ibcs-${name}.png`, {
      animations: 'disabled',
      threshold: 0.1, // Allow 10% pixel difference
    });
  }
}

/**
 * Compare IBCS chart colors to expected values
 */
export async function assertIBCSColors(page: Page): Promise<void> {
  // Get variance favorable colors
  const favorablePins = await page.locator(IBCSSelectors.variancePinFavorable + ' circle').all();
  for (const pin of favorablePins) {
    const fill = await pin.getAttribute('fill');
    if (fill) {
      expect(fill.toLowerCase()).toContain('34, 197, 94');
    }
  }
  
  // Get variance unfavorable colors
  const unfavorablePins = await page.locator(IBCSSelectors.variancePinUnfavorable + ' circle').all();
  for (const pin of unfavorablePins) {
    const fill = await pin.getAttribute('fill');
    if (fill) {
      expect(fill.toLowerCase()).toContain('239, 68, 68');
    }
  }
}

// =====================================================
// ACCESSIBILITY HELPERS
// =====================================================

/**
 * Verify IBCS elements have proper accessibility attributes
 */
export async function verifyIBCSAccessibility(page: Page): Promise<void> {
  // Variance pins should have aria labels or data attributes
  const pins = await page.locator(IBCSSelectors.variancePin).all();
  for (const pin of pins) {
    const variance = await pin.getAttribute('data-variance-pct');
    expect(variance).toBeTruthy();
  }
  
  // Scenario bars should have data attributes
  const bars = await page.locator(IBCSSelectors.scenarioBar).all();
  for (const bar of bars) {
    const scenario = await bar.getAttribute('data-scenario');
    expect(['actual', 'plan', 'forecast', 'priorYear']).toContain(scenario);
  }
}

// =====================================================
// FP&A SPECIFIC HELPERS
// =====================================================

/**
 * Verify FP&A action recommendations are visible
 */
export async function verifyActionRecommendations(page: Page): Promise<boolean> {
  // Look for action recommendation indicators
  const actions = await page.locator('[class*="Lightbulb"], :text("Action:"), :text("Recommandation:")').count();
  return actions > 0;
}

/**
 * Verify ROI impact displays are present
 */
export async function verifyROIDisplays(page: Page): Promise<boolean> {
  // Look for ROI indicators (dollar amounts with context)
  const roi = await page.locator(':text("saved"), :text("économisé"), :text("ROI"), :text("impact")').count();
  return roi > 0;
}

/**
 * Verify benchmark comparisons are shown
 */
export async function verifyBenchmarkComparisons(page: Page): Promise<boolean> {
  // Look for benchmark indicators
  const benchmarks = await page.locator(':text("vs Industry"), :text("vs Industrie"), :text("benchmark"), :text("BM")').count();
  return benchmarks > 0;
}

// =====================================================
// COMPLETE IBCS COMPLIANCE CHECK
// =====================================================

export interface IBCSComplianceResult {
  hasVariancePins: boolean;
  hasCorrectColors: boolean;
  hasAbbreviations: boolean;
  hasProperBarStyles: boolean;
  hasAccessibility: boolean;
  hasFPAFeatures: boolean;
  overallCompliant: boolean;
  details: string[];
}

/**
 * Run a complete IBCS compliance check on a page
 */
export async function checkIBCSCompliance(page: Page): Promise<IBCSComplianceResult> {
  const details: string[] = [];
  
  // Check variance pins
  const variancePins = await hasVariancePins(page);
  if (variancePins) {
    details.push('✓ Variance pins present');
  } else {
    details.push('⚠ No variance pins found');
  }
  
  // Check colors (simplified check)
  let correctColors = true;
  try {
    await verifyVariancePinColors(page);
    details.push('✓ Variance colors correct');
  } catch {
    correctColors = false;
    details.push('⚠ Variance colors may not match IBCS');
  }
  
  // Check abbreviations
  let hasAbbrev = false;
  try {
    await verifyIBCSAbbreviations(page, ['AC', 'PL']);
    hasAbbrev = true;
    details.push('✓ IBCS abbreviations present');
  } catch {
    details.push('⚠ IBCS abbreviations not found');
  }
  
  // Check bar styles
  let properBarStyles = true;
  try {
    await verifyScenarioBarStyles(page);
    details.push('✓ Bar styles IBCS compliant');
  } catch {
    properBarStyles = false;
    details.push('⚠ Bar styles may not match IBCS');
  }
  
  // Check accessibility
  let hasA11y = true;
  try {
    await verifyIBCSAccessibility(page);
    details.push('✓ Accessibility attributes present');
  } catch {
    hasA11y = false;
    details.push('⚠ Missing accessibility attributes');
  }
  
  // Check FP&A features
  const hasActions = await verifyActionRecommendations(page);
  const hasROI = await verifyROIDisplays(page);
  const hasBenchmarks = await verifyBenchmarkComparisons(page);
  const hasFPA = hasActions || hasROI || hasBenchmarks;
  
  if (hasFPA) {
    details.push('✓ FP&A features present');
  } else {
    details.push('⚠ FP&A features not detected');
  }
  
  return {
    hasVariancePins: variancePins,
    hasCorrectColors: correctColors,
    hasAbbreviations: hasAbbrev,
    hasProperBarStyles: properBarStyles,
    hasAccessibility: hasA11y,
    hasFPAFeatures: hasFPA,
    overallCompliant: variancePins && correctColors && hasAbbrev,
    details,
  };
}
