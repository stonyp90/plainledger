/**
 * Context Pruner - Intelligent Context Selection
 * 
 * Selects only relevant context based on query intent and keywords
 * to reduce token usage while maintaining response quality
 */

import { FinancialContext } from './jamesPrompts';
import { ChatMessage } from './chatTypes';
import { QueryIntent } from './queryRouter';
import { Initiative } from './strategicPlanning';

export interface PrunedContext {
  financialSummary: MinimalFinancialSummary;
  relevantAccounts?: string[];
  relevantInitiatives?: Initiative[];
  conversationSummary?: string;
  tokenEstimate: number;
}

export interface MinimalFinancialSummary {
  currentCash: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  burnRate: number;
  runwayMonths: number;
  zeroDate?: string;
}

/**
 * Extract keywords from query to identify relevant context
 */
function extractKeywords(query: string): {
  accounts: string[];
  metrics: string[];
  topics: string[];
} {
  const normalized = query.toLowerCase();
  
  const accountKeywords: Record<string, string[]> = {
    revenue: ['revenue', 'sales', 'income', 'ventes', 'revenus'],
    expenses: ['expense', 'cost', 'spending', 'dépenses', 'coûts'],
    cash: ['cash', 'liquidity', 'encaisse', 'liquidité'],
    receivables: ['receivable', 'ar', 'accounts receivable', 'créances'],
    payables: ['payable', 'ap', 'accounts payable', 'dettes'],
  };
  
  const metricKeywords: Record<string, string[]> = {
    burnRate: ['burn', 'burn rate', 'taux de brûlage'],
    runway: ['runway', 'autonomie', 'months', 'mois'],
    profit: ['profit', 'net income', 'bénéfice'],
    margin: ['margin', 'marge'],
  };
  
  const topicKeywords: Record<string, string[]> = {
    hiring: ['hire', 'hiring', 'employee', 'team', 'embaucher', 'employé'],
    initiatives: ['initiative', 'project', 'projet'],
    okr: ['okr', 'objective', 'key result', 'objectif'],
    scenario: ['scenario', 'scénario', 'planning'],
  };
  
  const accounts: string[] = [];
  const metrics: string[] = [];
  const topics: string[] = [];
  
  for (const [key, keywords] of Object.entries(accountKeywords)) {
    if (keywords.some(kw => normalized.includes(kw))) {
      accounts.push(key);
    }
  }
  
  for (const [key, keywords] of Object.entries(metricKeywords)) {
    if (keywords.some(kw => normalized.includes(kw))) {
      metrics.push(key);
    }
  }
  
  for (const [key, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(kw => normalized.includes(kw))) {
      topics.push(key);
    }
  }
  
  return { accounts, metrics, topics };
}

/**
 * Summarize conversation history intelligently
 */
function summarizeConversation(messages: ChatMessage[]): string {
  if (messages.length === 0) return '';
  
  // Keep last 3 messages full, summarize older ones
  if (messages.length <= 3) {
    return messages.map(m => `${m.role}: ${m.content.substring(0, 100)}`).join('\n');
  }
  
  const recent = messages.slice(-3);
  const older = messages.slice(0, -3);
  
  // Extract key topics from older messages
  const topics = new Set<string>();
  older.forEach(msg => {
    const content = msg.content.toLowerCase();
    if (content.includes('runway')) topics.add('runway');
    if (content.includes('hire')) topics.add('hiring');
    if (content.includes('initiative')) topics.add('initiatives');
    if (content.includes('cost')) topics.add('cost optimization');
  });
  
  const summary = topics.size > 0
    ? `Previous discussion covered: ${Array.from(topics).join(', ')}`
    : 'Previous conversation context';
  
  const recentText = recent.map(m => `${m.role}: ${m.content.substring(0, 150)}`).join('\n');
  
  return `${summary}\n\nRecent messages:\n${recentText}`;
}

/**
 * Prune context based on query intent and keywords
 */
export function pruneContext(
  query: string,
  fullContext: FinancialContext,
  conversationHistory: ChatMessage[],
  intent: QueryIntent
): PrunedContext {
  const keywords = extractKeywords(query);
  
  // Always include minimal financial summary
  const financialSummary: MinimalFinancialSummary = {
    currentCash: fullContext.currentCash,
    monthlyRevenue: fullContext.monthlyRevenue,
    monthlyExpenses: fullContext.monthlyExpenses,
    burnRate: fullContext.burnRate,
    runwayMonths: fullContext.runwayMonths,
    zeroDate: fullContext.zeroDate,
  };
  
  const pruned: PrunedContext = {
    financialSummary,
    tokenEstimate: 0,
  };
  
  // Add relevant accounts based on keywords
  if (keywords.accounts.length > 0) {
    pruned.relevantAccounts = keywords.accounts;
  }
  
  // Add initiatives only for strategic queries
  if (intent === 'initiative' || intent === 'okr' || intent === 'strategy') {
    if (fullContext.initiatives && fullContext.initiatives.length > 0) {
      // Include only top 3 initiatives by impact for strategic queries
      const sortedInitiatives = [...fullContext.initiatives]
        .sort((a, b) => Math.abs(b.cashImpact.amount) - Math.abs(a.cashImpact.amount))
        .slice(0, 3);
      pruned.relevantInitiatives = sortedInitiatives;
    }
  }
  
  // Summarize conversation history
  if (conversationHistory.length > 0) {
    pruned.conversationSummary = summarizeConversation(conversationHistory);
  }
  
  // Estimate tokens (rough: ~4 chars per token)
  pruned.tokenEstimate = estimateTokens(pruned);
  
  return pruned;
}

/**
 * Estimate token count for pruned context
 */
function estimateTokens(context: PrunedContext): number {
  let text = '';
  
  // Financial summary
  text += `Cash: $${context.financialSummary.currentCash}, Revenue: $${context.financialSummary.monthlyRevenue}, Expenses: $${context.financialSummary.monthlyExpenses}, Burn: $${context.financialSummary.burnRate}, Runway: ${context.financialSummary.runwayMonths}mo`;
  
  // Relevant accounts
  if (context.relevantAccounts) {
    text += ` Accounts: ${context.relevantAccounts.join(', ')}`;
  }
  
  // Initiatives
  if (context.relevantInitiatives) {
    text += ` Initiatives: ${context.relevantInitiatives.map(i => i.name).join(', ')}`;
  }
  
  // Conversation summary
  if (context.conversationSummary) {
    text += ` History: ${context.conversationSummary}`;
  }
  
  // Rough estimate: 4 characters per token
  return Math.ceil(text.length / 4);
}

/**
 * Build pruned context string for prompt
 */
export function buildPrunedContextString(context: PrunedContext): string {
  const parts: string[] = [];
  
  // Always include core metrics
  parts.push(`Current Financial Position:`);
  parts.push(`- Cash: $${context.financialSummary.currentCash.toLocaleString()}`);
  parts.push(`- Revenue: $${context.financialSummary.monthlyRevenue.toLocaleString()}/mo`);
  parts.push(`- Expenses: $${context.financialSummary.monthlyExpenses.toLocaleString()}/mo`);
  parts.push(`- Burn Rate: $${context.financialSummary.burnRate.toLocaleString()}/mo`);
  parts.push(`- Runway: ${context.financialSummary.runwayMonths.toFixed(1)} months`);
  
  if (context.financialSummary.zeroDate) {
    parts.push(`- Zero Cash Date: ${new Date(context.financialSummary.zeroDate).toLocaleDateString()}`);
  }
  
  // Add relevant accounts if specified
  if (context.relevantAccounts && context.relevantAccounts.length > 0) {
    parts.push(`\nRelevant Accounts: ${context.relevantAccounts.join(', ')}`);
  }
  
  // Add initiatives if present
  if (context.relevantInitiatives && context.relevantInitiatives.length > 0) {
    parts.push(`\nTop Initiatives:`);
    context.relevantInitiatives.forEach((init, i) => {
      parts.push(`${i + 1}. ${init.nameEn || init.name} - $${init.cashImpact.amount.toLocaleString()}`);
    });
  }
  
  // Add conversation summary
  if (context.conversationSummary) {
    parts.push(`\n${context.conversationSummary}`);
  }
  
  return parts.join('\n');
}
