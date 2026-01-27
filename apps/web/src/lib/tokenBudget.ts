/**
 * Token Budget Manager
 * 
 * Estimates token usage and enforces budgets per handler type
 * to control costs and optimize prompt sizes
 */

import { QueryHandler } from './queryRouter';

export interface TokenBudget {
  maxTokens: number;
  estimatedCost: number; // in USD
}

// Token budgets per handler (approximate)
export const TOKEN_BUDGETS: Record<QueryHandler, TokenBudget> = {
  local_nlq: {
    maxTokens: 0,
    estimatedCost: 0,
  },
  local_template: {
    maxTokens: 0,
    estimatedCost: 0,
  },
  llm_lite: {
    maxTokens: 1000, // ~$0.001 per query
    estimatedCost: 0.001,
  },
  llm_full: {
    maxTokens: 4000, // ~$0.04 per query
    estimatedCost: 0.04,
  },
};

// Token costs per 1K tokens (approximate, varies by provider)
const TOKEN_COSTS = {
  lite: {
    input: 0.0005,  // $0.50 per 1M tokens
    output: 0.0015, // $1.50 per 1M tokens
  },
  full: {
    input: 0.01,    // $10 per 1M tokens
    output: 0.03,   // $30 per 1M tokens
  },
};

/**
 * Estimate token count from text (rough: ~4 chars per token)
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Rough estimate: 4 characters per token (conservative)
  return Math.ceil(text.length / 4);
}

/**
 * Estimate cost for a prompt/response pair
 */
export function estimateCost(
  promptTokens: number,
  responseTokens: number,
  tier: 'lite' | 'full'
): number {
  const costs = TOKEN_COSTS[tier];
  const inputCost = (promptTokens / 1000) * costs.input;
  const outputCost = (responseTokens / 1000) * costs.output;
  return inputCost + outputCost;
}

/**
 * Enforce token budget by pruning prompt if needed
 */
export function enforceTokenBudget(
  prompt: string,
  handler: QueryHandler,
  maxTokens?: number
): {
  prunedPrompt: string;
  originalTokens: number;
  prunedTokens: number;
  wasPruned: boolean;
} {
  const budget = maxTokens || TOKEN_BUDGETS[handler].maxTokens;
  
  // No budget for local handlers
  if (budget === 0) {
    return {
      prunedPrompt: prompt,
      originalTokens: estimateTokens(prompt),
      prunedTokens: estimateTokens(prompt),
      wasPruned: false,
    };
  }
  
  const originalTokens = estimateTokens(prompt);
  
  if (originalTokens <= budget) {
    return {
      prunedPrompt: prompt,
      originalTokens,
      prunedTokens: originalTokens,
      wasPruned: false,
    };
  }
  
  // Need to prune - remove sections progressively
  const prunedPrompt = prunePromptProgressive(prompt, budget);
  const prunedTokens = estimateTokens(prunedPrompt);
  
  return {
    prunedPrompt,
    originalTokens,
    prunedTokens,
    wasPruned: true,
  };
}

/**
 * Prune prompt progressively by removing less important sections
 */
function prunePromptProgressive(prompt: string, targetTokens: number): string {
  const lines = prompt.split('\n');
  const sections: Array<{ start: number; end: number; priority: number; content: string }> = [];
  
  // Identify sections (by headers or patterns)
  let currentSection: { start: number; priority: number; content: string[] } | null = null;
  
  lines.forEach((line, index) => {
    const isHeader = /^#{1,3}\s/.test(line) || /^[A-Z][^:]*:$/.test(line);
    
    if (isHeader) {
      // Save previous section
      if (currentSection) {
        sections.push({
          start: currentSection.start,
          end: index - 1,
          priority: currentSection.priority,
          content: currentSection.content.join('\n'),
        });
      }
      
      // Determine priority
      let priority = 3; // Default: low priority
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('financial context') || lowerLine.includes('user query')) {
        priority = 1; // High priority - always keep
      } else if (lowerLine.includes('conversation') || lowerLine.includes('history')) {
        priority = 2; // Medium priority
      }
      
      currentSection = {
        start: index,
        priority,
        content: [line],
      };
    } else if (currentSection) {
      currentSection.content.push(line);
    }
  });
  
  // Add last section
  if (currentSection) {
    sections.push({
      start: currentSection.start,
      end: lines.length - 1,
      priority: currentSection.priority,
      content: currentSection.content.join('\n'),
    });
  }
  
  // Sort by priority (keep high priority sections)
  sections.sort((a, b) => a.priority - b.priority);
  
  // Build pruned prompt
  let pruned = '';
  let currentTokens = 0;
  
  for (const section of sections) {
    const sectionTokens = estimateTokens(section.content);
    
    if (currentTokens + sectionTokens <= targetTokens) {
      pruned += section.content + '\n';
      currentTokens += sectionTokens;
    } else {
      // Truncate this section if we have room
      const remainingTokens = targetTokens - currentTokens;
      if (remainingTokens > 100) { // Only if meaningful space left
        const truncated = truncateToTokens(section.content, remainingTokens);
        pruned += truncated + '\n';
      }
      break;
    }
  }
  
  return pruned.trim();
}

/**
 * Truncate text to approximately target token count
 */
function truncateToTokens(text: string, targetTokens: number): string {
  const targetChars = targetTokens * 4; // ~4 chars per token
  if (text.length <= targetChars) return text;
  
  // Try to truncate at sentence boundary
  const truncated = text.substring(0, targetChars);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastNewline = truncated.lastIndexOf('\n');
  const cutPoint = Math.max(lastPeriod, lastNewline);
  
  if (cutPoint > targetChars * 0.7) {
    return truncated.substring(0, cutPoint + 1) + '...';
  }
  
  return truncated + '...';
}

/**
 * Get budget info for handler
 */
export function getBudgetInfo(handler: QueryHandler): TokenBudget {
  return TOKEN_BUDGETS[handler];
}

/**
 * Check if prompt exceeds budget
 */
export function exceedsBudget(prompt: string, handler: QueryHandler): boolean {
  const budget = TOKEN_BUDGETS[handler].maxTokens;
  if (budget === 0) return false; // No budget for local handlers
  return estimateTokens(prompt) > budget;
}
