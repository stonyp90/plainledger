/**
 * James AI Prompt Templates
 * 
 * Optimized prompts for strategic cashflow planning and OKR generation
 */

import { Scenario, RunwayAnalysis, Initiative } from './strategicPlanning';
import { OKR, Quarter } from './okrTypes';
import { QueryIntent } from './queryRouter';

export const JAMES_SYSTEM_PROMPT = `You are James, an expert AI strategic advisor specializing in cashflow management and executive strategic planning. You help executive teams make data-driven decisions about their financial runway, strategic initiatives, and quarterly OKRs.

Your expertise:
- Cashflow analysis and runway management
- Strategic initiative planning and prioritization
- OKR (Objectives and Key Results) framework
- Financial scenario modeling
- Executive communication and decision-making

Your communication style:
- Clear, concise, and executive-friendly
- Data-driven with specific recommendations
- Actionable insights tied to financial metrics
- Respectful of executive time and attention
- Proactive in identifying risks and opportunities

CRITICAL GUIDELINES:
- Always base recommendations on the provided financial data
- Never invent or assume financial metrics not provided
- When uncertain, clearly state limitations and ask clarifying questions
- Focus on actionable strategies that impact cashflow
- Link initiatives to measurable outcomes (OKRs)
- Consider quarterly planning cycles and timing
- Be conservative with projections when data is limited

ANTI-HALLUCINATION RULES:
- NEVER mention numbers, metrics, or financial data that wasn't explicitly provided in the context
- NEVER cite industry benchmarks, research, or studies unless explicitly mentioned in the user's data
- NEVER make up calculations or projections beyond what can be directly computed from provided data
- If you don't have enough data to answer confidently, say "I don't have enough information" rather than guessing
- Always qualify statements with "based on the data provided" when referencing specific numbers
- If asked about metrics not in context, respond with "I don't have that information in the provided context"
- Use phrases like "approximately" or "roughly" when making estimates, never state exact numbers without basis`;

export interface FinancialContext {
  currentCash: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  runwayMonths: number;
  zeroDate?: string;
  burnRate: number;
  scenarios?: Scenario[];
  activeScenario?: Scenario;
  initiatives?: Initiative[];
}

/**
 * Build context string from financial data (optimized with intent-based selection)
 */
export function buildFinancialContext(
  context: FinancialContext,
  intent?: QueryIntent
): string {
  const parts: string[] = [];
  
  // Always include core metrics (minimal)
  parts.push(`Current Financial Position:`);
  parts.push(`- Cash: $${context.currentCash.toLocaleString()}`);
  parts.push(`- Revenue: $${context.monthlyRevenue.toLocaleString()}/mo`);
  parts.push(`- Expenses: $${context.monthlyExpenses.toLocaleString()}/mo`);
  parts.push(`- Burn Rate: $${context.burnRate.toLocaleString()}/mo`);
  parts.push(`- Runway: ${context.runwayMonths.toFixed(1)} months`);
  
  if (context.zeroDate) {
    parts.push(`- Zero Cash Date: ${new Date(context.zeroDate).toLocaleDateString()}`);
  }
  
  // Conditional sections based on intent
  if (intent === 'hiring_analysis' || intent === 'runway_analysis' || intent === 'calculation') {
    // Include burn rate details for hiring/runway queries
    // Already included above, but could add more detail if needed
  }
  
  // Include initiatives only for strategic queries
  if (intent === 'strategy' || intent === 'initiative' || intent === 'okr') {
    if (context.activeScenario) {
      parts.push(`\nActive Scenario: ${context.activeScenario.nameEn || context.activeScenario.name}`);
      parts.push(`- Initiatives: ${context.activeScenario.initiatives.length}`);
    }
    
    if (context.initiatives && context.initiatives.length > 0) {
      // Include only top 3 initiatives by impact for strategic queries
      const topInitiatives = [...context.initiatives]
        .sort((a, b) => Math.abs(b.cashImpact.amount) - Math.abs(a.cashImpact.amount))
        .slice(0, 3);
      
      parts.push(`\nTop Initiatives:`);
      topInitiatives.forEach((init, i) => {
        parts.push(`${i + 1}. ${init.nameEn || init.name} (${init.category})`);
        parts.push(`   Cash Impact: $${init.cashImpact.amount.toLocaleString()}`);
      });
    }
  }
  
  return parts.join('\n');
}

/**
 * Build prompt for strategy generation
 */
export function buildStrategyPrompt(
  userQuery: string,
  context: FinancialContext,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
  intent?: QueryIntent
): string {
  let prompt = `${JAMES_SYSTEM_PROMPT}\n\n`;
  
  prompt += `Financial Context:\n${buildFinancialContext(context, intent || 'strategy')}\n\n`;
  
  if (conversationHistory && conversationHistory.length > 0) {
    // Limit conversation history based on intent
    const historyLimit = intent === 'strategy' ? 6 : 4;
    prompt += `Conversation History:\n`;
    conversationHistory.slice(-historyLimit).forEach(msg => {
      prompt += `${msg.role === 'user' ? 'User' : 'James'}: ${msg.content}\n`;
    });
    prompt += `\n`;
  }
  
  prompt += `User Query: ${userQuery}\n\n`;
  
  prompt += `Please provide strategic advice addressing the user's query. Your response should:
1. Acknowledge the specific question or concern
2. Analyze the financial context relevant to the query
3. Provide 2-3 actionable strategic recommendations
4. If applicable, suggest specific initiatives that could help
5. Consider timing and quarterly planning cycles
6. Be specific about expected cashflow impacts

Format your response as natural conversation, but be ready to structure initiatives and OKRs when requested.`;
  
  return prompt;
}

/**
 * Build prompt for initiative generation
 */
export function buildInitiativeGenerationPrompt(
  strategy: string,
  context: FinancialContext,
  targetQuarter?: Quarter,
  targetYear?: number
): string {
  let prompt = `${JAMES_SYSTEM_PROMPT}\n\n`;
  
  prompt += `Financial Context:\n${buildFinancialContext(context)}\n\n`;
  
  prompt += `Strategy to Convert to Initiatives:\n${strategy}\n\n`;
  
  if (targetQuarter && targetYear) {
    prompt += `Target Quarter: ${targetQuarter} ${targetYear}\n\n`;
  }
  
  prompt += `Generate 2-4 strategic initiatives based on this strategy. For each initiative, provide:

1. Name (clear, action-oriented)
2. Category (growth, operations, product, people, infrastructure)
3. Description (2-3 sentences)
4. Start and end dates (within target quarter if specified)
5. Cash impact:
   - Type: one_time or recurring
   - Amount: estimated cash impact (positive for revenue, negative for expenses)
   - Frequency: if recurring (monthly, quarterly, annual)
6. Expected outcomes (what this initiative will achieve)
7. Confidence level (0-100% in the estimates)

Return as JSON array:
[
  {
    "name": "Initiative name",
    "nameEn": "Initiative name (English)",
    "category": "growth|operations|product|people|infrastructure",
    "description": "2-3 sentence description",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "cashImpact": {
      "type": "one_time|recurring",
      "amount": -50000,
      "frequency": "monthly|quarterly|annual"
    },
    "expectedOutcomes": ["Outcome 1", "Outcome 2"],
    "confidence": 75
  }
]`;
  
  return prompt;
}

/**
 * Build prompt for OKR generation
 */
export function buildOKRGenerationPrompt(
  objective: string,
  initiatives: Initiative[],
  quarter: Quarter,
  year: number
): string {
  let prompt = `${JAMES_SYSTEM_PROMPT}\n\n`;
  
  prompt += `Objective: ${objective}\n`;
  prompt += `Target Quarter: ${quarter} ${year}\n\n`;
  
  if (initiatives.length > 0) {
    prompt += `Linked Initiatives:\n`;
    initiatives.forEach((init, i) => {
      prompt += `${i + 1}. ${init.nameEn || init.name}\n`;
      prompt += `   Category: ${init.category}\n`;
      prompt += `   Cash Impact: $${init.cashImpact.amount.toLocaleString()}\n`;
      prompt += `   Timeline: ${init.startDate} to ${init.endDate}\n\n`;
    });
  }
  
  prompt += `Generate 3-5 Key Results (KRs) for this objective. Each KR should be:
- Specific and measurable
- Aligned with the linked initiatives
- Achievable within the quarter
- Tied to cashflow or strategic outcomes

For each KR, provide:
1. Description (what we're measuring)
2. Target value (the goal)
3. Unit (currency, percentage, number, days, etc.)
4. Due date (within the quarter)
5. How it relates to cashflow or strategic goals

Return as JSON:
{
  "objective": "${objective}",
  "objectiveEn": "${objective}",
  "quarter": "${quarter}",
  "year": ${year},
  "keyResults": [
    {
      "description": "KR description",
      "descriptionEn": "KR description (English)",
      "targetValue": 100000,
      "unit": "currency",
      "dueDate": "YYYY-MM-DD",
      "confidence": 75
    }
  ]
}`;
  
  return prompt;
}

/**
 * Build prompt for general conversation
 */
export function buildConversationPrompt(
  userMessage: string,
  context: FinancialContext,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  intent?: QueryIntent
): string {
  let prompt = `${JAMES_SYSTEM_PROMPT}\n\n`;
  
  prompt += `Financial Context:\n${buildFinancialContext(context, intent)}\n\n`;
  
  if (conversationHistory.length > 0) {
    // Limit conversation history based on intent (fewer for simpler queries)
    const historyLimit = (intent === 'data_query' || intent === 'calculation') ? 4 : 6;
    prompt += `Recent Conversation:\n`;
    conversationHistory.slice(-historyLimit).forEach(msg => {
      prompt += `${msg.role === 'user' ? 'User' : 'James'}: ${msg.content}\n`;
    });
    prompt += `\n`;
  }
  
  prompt += `User: ${userMessage}\n\n`;
  prompt += `James: `;
  
  return prompt;
}

/**
 * Suggested prompts for quick actions
 */
export const SUGGESTED_PROMPTS = [
  {
    id: 'extend-runway',
    en: 'How can I extend my cash runway?',
    fr: 'Comment puis-je prolonger mon autonomie de trésorerie?',
  },
  {
    id: 'reduce-burn',
    en: 'What strategies can reduce my burn rate?',
    fr: 'Quelles stratégies peuvent réduire mon taux de brûlage?',
  },
  {
    id: 'generate-initiatives',
    en: 'Generate strategic initiatives for this quarter',
    fr: 'Générer des initiatives stratégiques pour ce trimestre',
  },
  {
    id: 'create-okrs',
    en: 'Create OKRs for Q1 2026',
    fr: 'Créer des OKR pour Q1 2026',
  },
  {
    id: 'optimize-scenario',
    en: 'How can I optimize my base scenario?',
    fr: 'Comment puis-je optimiser mon scénario de base?',
  },
  {
    id: 'funding-strategy',
    en: 'What funding strategy should I consider?',
    fr: 'Quelle stratégie de financement devrais-je considérer?',
  },
];
