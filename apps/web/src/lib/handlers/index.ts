/**
 * Local Handlers - Cost-Free Query Processing
 * 
 * These handlers process queries without making LLM API calls,
 * reducing costs and latency for simple queries.
 * 
 * Estimated savings: 30-40% of queries can be handled locally
 */

export * from './types';
export { handleLocalNLQ, canHandleLocalNLQ } from './localNLQHandler';
export { handleLocalTemplate, canHandleLocalTemplate } from './localTemplateHandler';

import { FinancialContext } from '../jamesPrompts';
import { QueryIntent } from '../queryRouter';
import { LocalResponse } from './types';
import { handleLocalNLQ, canHandleLocalNLQ } from './localNLQHandler';
import { handleLocalTemplate, canHandleLocalTemplate } from './localTemplateHandler';

/**
 * Try to handle query locally without LLM
 * 
 * @param query - User's natural language query
 * @param intent - Classified query intent
 * @param context - Financial context data
 * @returns LocalResponse if handled, null if needs LLM
 */
export function tryLocalHandlers(
  query: string,
  intent: QueryIntent,
  context: FinancialContext
): LocalResponse | null {
  // Try template handler first (more specific patterns)
  if (canHandleLocalTemplate(query)) {
    const response = handleLocalTemplate(query, intent, context);
    if (response) {
      console.log('[LocalHandler] Query handled by template handler (cost: $0)');
      return response;
    }
  }
  
  // Try NLQ handler for data queries
  if (canHandleLocalNLQ(query)) {
    const response = handleLocalNLQ(query, context);
    if (response) {
      console.log('[LocalHandler] Query handled by NLQ handler (cost: $0)');
      return response;
    }
  }
  
  // Cannot handle locally
  return null;
}

/**
 * Check if a query can potentially be handled locally
 * (Quick check without full processing)
 */
export function canHandleLocally(query: string): boolean {
  return canHandleLocalNLQ(query) || canHandleLocalTemplate(query);
}

/**
 * Convert local response to chat response format
 */
export function localResponseToChatResponse(localResponse: LocalResponse): {
  message: string;
  metadata: {
    type: 'general';
    tokensUsed: number;
    latency: number;
    handledLocally: boolean;
  };
} {
  return {
    message: localResponse.message,
    metadata: {
      type: 'general',
      tokensUsed: localResponse.tokensUsed,
      latency: localResponse.latencyMs,
      handledLocally: true,
    },
  };
}
