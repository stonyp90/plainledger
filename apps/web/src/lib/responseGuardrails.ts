/**
 * Frontend Response Guardrails
 * 
 * Validates AI responses on the client side to prevent displaying
 * hallucinated or inaccurate information
 */

import { FinancialContext } from './jamesPrompts';

export interface ValidationResult {
  isValid: boolean;
  confidence: number; // 0-100
  warnings: string[];
  issues: string[];
  sanitizedMessage?: string;
}

/**
 * Validate AI response against financial context
 */
export function validateAIResponse(
  message: string,
  context: FinancialContext
): ValidationResult {
  const warnings: string[] = [];
  const issues: string[] = [];
  let confidence = 100;

  // Extract numbers mentioned in response
  const numbers = extractNumbers(message);
  
  // Check if numbers match context
  const contextNumbers = {
    cash: context.currentCash,
    revenue: context.monthlyRevenue,
    expenses: context.monthlyExpenses,
    burnRate: context.burnRate,
    runway: context.runwayMonths,
  };

  // Validate each number against context
  numbers.forEach(num => {
    const isCloseToContext = Object.values(contextNumbers).some(
      ctxNum => ctxNum !== undefined && Math.abs(num - ctxNum) / Math.abs(ctxNum) < 0.05
    );

    if (!isCloseToContext && num > 1000) {
      // Large number not matching context - potential hallucination
      warnings.push(`Number $${num.toLocaleString()} doesn't match provided context`);
      confidence -= 10;
    }
  });

  // Check for unsupported claims
  const unsupportedClaims = detectUnsupportedClaims(message, context);
  if (unsupportedClaims.length > 0) {
    warnings.push(...unsupportedClaims);
    confidence -= unsupportedClaims.length * 5;
  }

  // Check for invented metrics
  const inventedMetrics = detectInventedMetrics(message, context);
  if (inventedMetrics.length > 0) {
    issues.push(...inventedMetrics);
    confidence -= inventedMetrics.length * 15;
  }

  // Sanitize message
  let sanitizedMessage = sanitizeMessage(message);
  
  // Add warning if confidence is low
  if (confidence < 70 && !sanitizedMessage.includes('⚠️')) {
    sanitizedMessage = addWarningBanner(sanitizedMessage, confidence);
  }

  confidence = Math.max(0, confidence);

  const isValid = issues.length === 0 && confidence >= 50;

  return {
    isValid,
    confidence,
    warnings,
    issues,
    sanitizedMessage: isValid ? sanitizedMessage : undefined,
  };
}

/**
 * Extract all dollar amounts from message
 */
function extractNumbers(message: string): number[] {
  const numbers: number[] = [];
  const matches = message.match(/\$[\d,]+(?:\.\d{2})?/g) || [];
  
  matches.forEach(match => {
    const num = parseFloat(match.replace(/[$,]/g, ''));
    if (!isNaN(num)) {
      numbers.push(num);
    }
  });

  return numbers;
}

/**
 * Detect unsupported claims
 */
function detectUnsupportedClaims(message: string, context: FinancialContext): string[] {
  const issues: string[] = [];
  const lowerMessage = message.toLowerCase();

  // Check for industry benchmarks without context
  if (/industry.*average|benchmark/i.test(lowerMessage) && 
      !context.scenarios && !context.initiatives) {
    issues.push('Mentions industry benchmarks without supporting context');
  }

  // Check for research citations
  if (/according to|research shows|studies indicate/i.test(lowerMessage)) {
    issues.push('Cites research/studies not in provided context');
  }

  return issues;
}

/**
 * Detect invented metrics
 */
function detectInventedMetrics(message: string, context: FinancialContext): string[] {
  const issues: string[] = [];
  const lowerMessage = message.toLowerCase();

  // Check for metrics not in context
  const contextHasMetrics = 
    context.currentCash !== undefined ||
    context.monthlyRevenue !== undefined ||
    context.monthlyExpenses !== undefined;

  // If message claims specific metrics but context is empty
  if (!contextHasMetrics && 
      (/\$[\d,]+.*cash|\$[\d,]+.*revenue|\$[\d,]+.*expense/i.test(lowerMessage))) {
    issues.push('Claims specific financial metrics without context data');
  }

  return issues;
}

/**
 * Sanitize message content
 */
function sanitizeMessage(message: string): string {
  let sanitized = message;

  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove javascript: links
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');

  return sanitized;
}

/**
 * Add warning banner to message
 */
function addWarningBanner(message: string, confidence: number): string {
  const warning = `\n\n⚠️ **Note:** This response has ${confidence}% confidence. Please verify all numbers and calculations against your actual financial data.`;
  
  if (message.includes('⚠️') || message.includes('Note:')) {
    return message;
  }

  return message + warning;
}

/**
 * Check if response contains potentially hallucinated content
 */
export function hasHallucinationIndicators(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  const indicators = [
    /definitely.*\$[\d,]+/i, // Definite claims about specific numbers
    /guaranteed.*\$[\d,]+/i,
    /without a doubt.*\$[\d,]+/i,
    /industry.*average.*\$[\d,]+/i, // Industry benchmarks with numbers
    /research shows.*\$[\d,]+/i, // Research citations with numbers
  ];

  return indicators.some(pattern => pattern.test(lowerMessage));
}
