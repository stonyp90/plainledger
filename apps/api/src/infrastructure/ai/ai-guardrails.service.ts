/**
 * AI Guardrails Service
 *
 * Prevents hallucinations by:
 * - Validating responses against provided context
 * - Detecting invented numbers or facts
 * - Checking for unsupported claims
 * - Adding confidence scores
 * - Flagging potentially hallucinated content
 */

import { Logger } from "@nestjs/common";

export interface GuardrailResult {
  passed: boolean;
  confidence: number; // 0-100
  warnings: string[];
  errors: string[];
  validatedResponse?: string;
  detectedMetrics?: {
    claimed: string[];
    supported: string[];
    unsupported: string[];
  };
}

export interface FinancialContext {
  currentCash?: number;
  monthlyRevenue?: number;
  monthlyExpenses?: number;
  burnRate?: number;
  runwayMonths?: number;
  [key: string]: any;
}

export class AIGuardrailsService {
  private readonly logger = new Logger(AIGuardrailsService.name);

  /**
   * Validate AI response against provided context
   */
  validateResponse(
    response: string,
    context: FinancialContext,
    originalPrompt: string,
  ): GuardrailResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    let confidence = 100;

    // Extract claimed financial metrics from response
    const claimedMetrics = this.extractFinancialMetrics(response);
    const supportedMetrics = this.extractSupportedMetrics(context);

    // Check for unsupported claims
    const unsupportedMetrics = claimedMetrics.filter(
      (metric) => !supportedMetrics.includes(metric),
    );

    if (unsupportedMetrics.length > 0) {
      warnings.push(
        `Response mentions metrics not in provided context: ${unsupportedMetrics.join(", ")}`,
      );
      confidence -= unsupportedMetrics.length * 10;
    }

    // Check for invented numbers
    const inventedNumbers = this.detectInventedNumbers(response, context);
    if (inventedNumbers.length > 0) {
      errors.push(
        `Response contains numbers not supported by context: ${inventedNumbers.join(", ")}`,
      );
      confidence -= inventedNumbers.length * 20;
    }

    // Check for unsupported calculations
    const calculationIssues = this.validateCalculations(response, context);
    if (calculationIssues.length > 0) {
      warnings.push(...calculationIssues);
      confidence -= calculationIssues.length * 5;
    }

    // Check for hallucinated facts
    const hallucinatedFacts = this.detectHallucinatedFacts(
      response,
      originalPrompt,
    );
    if (hallucinatedFacts.length > 0) {
      warnings.push(...hallucinatedFacts);
      confidence -= hallucinatedFacts.length * 15;
    }

    // Check for confidence statements without basis
    const falseConfidence = this.detectFalseConfidence(response, context);
    if (falseConfidence) {
      warnings.push(
        "Response expresses confidence without sufficient data basis",
      );
      confidence -= 10;
    }

    // Ensure confidence doesn't go below 0
    confidence = Math.max(0, confidence);

    const passed = errors.length === 0 && confidence >= 50;

    // Add disclaimer if confidence is low
    let validatedResponse = response;
    if (
      confidence < 70 &&
      !response.includes("⚠️") &&
      !response.includes("Note:")
    ) {
      validatedResponse = this.addConfidenceDisclaimer(response, confidence);
    }

    return {
      passed,
      confidence,
      warnings,
      errors,
      validatedResponse: passed ? validatedResponse : undefined,
      detectedMetrics: {
        claimed: claimedMetrics,
        supported: supportedMetrics,
        unsupported: unsupportedMetrics,
      },
    };
  }

  /**
   * Extract financial metrics mentioned in response
   */
  private extractFinancialMetrics(response: string): string[] {
    const metrics: string[] = [];
    const lowerResponse = response.toLowerCase();

    const metricPatterns: Record<string, RegExp[]> = {
      cash: [/\$[\d,]+.*cash/i, /cash.*\$[\d,]+/i, /cash.*balance/i],
      revenue: [
        /\$[\d,]+.*revenue/i,
        /revenue.*\$[\d,]+/i,
        /monthly.*revenue/i,
      ],
      expenses: [
        /\$[\d,]+.*expense/i,
        /expense.*\$[\d,]+/i,
        /monthly.*expense/i,
      ],
      burnRate: [/\$[\d,]+.*burn/i, /burn.*rate/i, /burn.*\$[\d,]+/i],
      runway: [/runway.*\d+/i, /\d+.*months.*runway/i, /runway.*months/i],
      profit: [/\$[\d,]+.*profit/i, /profit.*\$[\d,]+/i, /net.*income/i],
      margin: [/margin.*\d+%/i, /\d+%.*margin/i],
    };

    for (const [metric, patterns] of Object.entries(metricPatterns)) {
      if (patterns.some((pattern) => pattern.test(lowerResponse))) {
        metrics.push(metric);
      }
    }

    return metrics;
  }

  /**
   * Extract metrics that are actually supported by context
   */
  private extractSupportedMetrics(context: FinancialContext): string[] {
    const supported: string[] = [];

    if (context.currentCash !== undefined) supported.push("cash");
    if (context.monthlyRevenue !== undefined) supported.push("revenue");
    if (context.monthlyExpenses !== undefined) supported.push("expenses");
    if (context.burnRate !== undefined) supported.push("burnRate");
    if (context.runwayMonths !== undefined) supported.push("runway");

    return supported;
  }

  /**
   * Detect invented numbers that don't match context
   */
  private detectInventedNumbers(
    response: string,
    context: FinancialContext,
  ): string[] {
    const issues: string[] = [];
    const lowerResponse = response.toLowerCase();

    // Extract all dollar amounts from response
    const dollarMatches = response.match(/\$[\d,]+(?:\.\d{2})?/g) || [];

    // Check if any claimed amounts are significantly different from context
    dollarMatches.forEach((match) => {
      const amount = parseFloat(match.replace(/[$,]/g, ""));

      // Check against context values (allow 5% variance for rounding)
      if (
        context.currentCash &&
        Math.abs(amount - context.currentCash) / context.currentCash > 0.05
      ) {
        // Check if it's near cash amount (might be legitimate reference)
        if (
          Math.abs(amount - context.currentCash) / context.currentCash >
          0.1
        ) {
          // Check other metrics
          const isCloseToRevenue =
            context.monthlyRevenue &&
            Math.abs(amount - context.monthlyRevenue) / context.monthlyRevenue <
              0.05;
          const isCloseToExpenses =
            context.monthlyExpenses &&
            Math.abs(amount - context.monthlyExpenses) /
              context.monthlyExpenses <
              0.05;

          if (!isCloseToRevenue && !isCloseToExpenses && amount > 1000) {
            // This might be an invented number
            issues.push(`${match} (not matching context values)`);
          }
        }
      }
    });

    return issues;
  }

  /**
   * Validate calculations mentioned in response
   */
  private validateCalculations(
    response: string,
    context: FinancialContext,
  ): string[] {
    const issues: string[] = [];
    const lowerResponse = response.toLowerCase();

    // Check runway calculations
    if (
      lowerResponse.includes("runway") &&
      context.burnRate &&
      context.currentCash
    ) {
      const expectedRunway =
        context.burnRate > 0
          ? context.currentCash / context.burnRate
          : Infinity;

      // Extract claimed runway from response
      const runwayMatch =
        response.match(/(\d+(?:\.\d+)?)\s*months?.*runway/i) ||
        response.match(/runway.*(\d+(?:\.\d+)?)\s*months?/i);

      if (runwayMatch) {
        const claimedRunway = parseFloat(runwayMatch[1]);
        const variance =
          Math.abs(claimedRunway - expectedRunway) / expectedRunway;

        if (variance > 0.1) {
          // More than 10% difference
          issues.push(
            `Runway calculation mismatch: claimed ${claimedRunway}mo, expected ${expectedRunway.toFixed(1)}mo`,
          );
        }
      }
    }

    // Check burn rate calculations
    if (
      lowerResponse.includes("burn") &&
      context.monthlyRevenue &&
      context.monthlyExpenses
    ) {
      const expectedBurnRate = context.monthlyExpenses - context.monthlyRevenue;

      const burnMatch =
        response.match(/\$[\d,]+.*burn/i) || response.match(/burn.*\$[\d,]+/i);
      if (burnMatch) {
        const amountStr = burnMatch[0].match(/\$[\d,]+/)?.[0];
        if (amountStr) {
          const claimedBurn = parseFloat(amountStr.replace(/[$,]/g, ""));
          const variance =
            Math.abs(claimedBurn - expectedBurnRate) /
            Math.abs(expectedBurnRate || 1);

          if (variance > 0.1) {
            issues.push(
              `Burn rate calculation mismatch: claimed $${claimedBurn.toLocaleString()}, expected $${expectedBurnRate.toLocaleString()}`,
            );
          }
        }
      }
    }

    return issues;
  }

  /**
   * Detect hallucinated facts not grounded in prompt
   */
  private detectHallucinatedFacts(
    response: string,
    originalPrompt: string,
  ): string[] {
    const issues: string[] = [];
    const lowerResponse = response.toLowerCase();
    const lowerPrompt = originalPrompt.toLowerCase();

    // Common hallucination patterns
    const hallucinationPatterns = [
      {
        pattern: /industry.*average|benchmark.*industry|typical.*industry/i,
        check: () =>
          !lowerPrompt.includes("industry") &&
          !lowerPrompt.includes("benchmark"),
        message: "Response mentions industry benchmarks without context",
      },
      {
        pattern: /according to|research shows|studies indicate/i,
        check: () =>
          !lowerPrompt.includes("research") && !lowerPrompt.includes("study"),
        message: "Response cites research/studies not in context",
      },
      {
        pattern: /recommended.*ratio|standard.*ratio|optimal.*ratio/i,
        check: () =>
          !lowerPrompt.includes("ratio") && !lowerPrompt.includes("standard"),
        message: "Response provides ratio recommendations without context",
      },
    ];

    hallucinationPatterns.forEach(({ pattern, check, message }) => {
      if (pattern.test(lowerResponse) && check()) {
        issues.push(message);
      }
    });

    return issues;
  }

  /**
   * Detect false confidence statements
   */
  private detectFalseConfidence(
    response: string,
    context: FinancialContext,
  ): boolean {
    const lowerResponse = response.toLowerCase();

    // High confidence phrases
    const confidencePhrases = [
      /definitely/i,
      /certainly/i,
      /absolutely/i,
      /guaranteed/i,
      /without a doubt/i,
    ];

    const hasHighConfidence = confidencePhrases.some((phrase) =>
      phrase.test(lowerResponse),
    );

    // Check if context has sufficient data
    const hasSufficientData =
      context.currentCash !== undefined &&
      context.monthlyRevenue !== undefined &&
      context.monthlyExpenses !== undefined;

    // False confidence: high confidence language but insufficient data
    return hasHighConfidence && !hasSufficientData;
  }

  /**
   * Add confidence disclaimer to response
   */
  private addConfidenceDisclaimer(
    response: string,
    confidence: number,
  ): string {
    const disclaimer = `\n\n⚠️ **Note:** This analysis is based on limited data. Please verify all numbers and calculations.`;

    // Don't add if already present
    if (response.includes("⚠️") || response.includes("Note:")) {
      return response;
    }

    return response + disclaimer;
  }

  /**
   * Sanitize response to remove potentially harmful content
   */
  sanitizeResponse(response: string): string {
    let sanitized = response;

    // Remove any script tags or dangerous patterns
    sanitized = sanitized.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      "",
    );
    sanitized = sanitized.replace(/javascript:/gi, "");
    sanitized = sanitized.replace(/on\w+\s*=/gi, "");

    // Limit response length
    const MAX_RESPONSE_LENGTH = 10000;
    if (sanitized.length > MAX_RESPONSE_LENGTH) {
      sanitized =
        sanitized.substring(0, MAX_RESPONSE_LENGTH) +
        "\n\n[Response truncated]";
    }

    return sanitized;
  }

  /**
   * Extract financial context from prompt for validation
   */
  extractContextFromPrompt(prompt: string): FinancialContext {
    const context: FinancialContext = {};

    // Extract cash
    const cashMatch =
      prompt.match(/cash[:\s]*\$?([\d,]+)/i) ||
      prompt.match(/\$?([\d,]+).*cash/i);
    if (cashMatch) {
      context.currentCash = parseFloat(cashMatch[1].replace(/,/g, ""));
    }

    // Extract revenue
    const revenueMatch =
      prompt.match(/revenue[:\s]*\$?([\d,]+)/i) ||
      prompt.match(/monthly.*revenue[:\s]*\$?([\d,]+)/i);
    if (revenueMatch) {
      context.monthlyRevenue = parseFloat(revenueMatch[1].replace(/,/g, ""));
    }

    // Extract expenses
    const expenseMatch =
      prompt.match(/expense[:\s]*\$?([\d,]+)/i) ||
      prompt.match(/monthly.*expense[:\s]*\$?([\d,]+)/i);
    if (expenseMatch) {
      context.monthlyExpenses = parseFloat(expenseMatch[1].replace(/,/g, ""));
    }

    // Extract burn rate
    const burnMatch = prompt.match(/burn[:\s]*\$?([\d,]+)/i);
    if (burnMatch) {
      context.burnRate = parseFloat(burnMatch[1].replace(/,/g, ""));
    }

    // Extract runway
    const runwayMatch = prompt.match(/runway[:\s]*(\d+(?:\.\d+)?)/i);
    if (runwayMatch) {
      context.runwayMonths = parseFloat(runwayMatch[1]);
    }

    return context;
  }
}
