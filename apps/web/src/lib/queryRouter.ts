/**
 * Query Router - Classification Gateway
 * 
 * Routes queries to the most cost-effective handler:
 * - local_nlq: Simple data queries (no LLM)
 * - local_template: Pattern-matched responses (no LLM)
 * - llm_lite: Use cheaper models (GPT-3.5, Claude Haiku)
 * - llm_full: Complex strategic advice (GPT-4, Claude Opus)
 */

export type QueryHandler = 'local_nlq' | 'local_template' | 'llm_lite' | 'llm_full';

export type QueryIntent = 
  | 'data_query'      // Simple data retrieval
  | 'calculation'     // Financial calculations
  | 'hiring_analysis' // Hiring affordability
  | 'runway_analysis' // Runway calculations
  | 'strategy'        // Strategic advice
  | 'initiative'      // Initiative generation
  | 'okr'            // OKR generation
  | 'general';       // General conversation

export interface QueryClassification {
  handler: QueryHandler;
  intent: QueryIntent;
  confidence: number;
  reasoning: string;
}

// Patterns for local NLQ handling (data queries)
const LOCAL_NLQ_PATTERNS = [
  /^(show|what|how much|combien|montre|quel).*(revenue|sales|income|expenses|cash|balance|ventes|revenus|dépenses|encaisse)/i,
  /^(what|quel).*(is|are|est|sont).*(current|total|montant)/i,
  /^(show|display|affiche).*(trend|evolution|tendance|évolution)/i,
  /^(compare|comparer).*(to|vs|versus|avec)/i,
  /^(breakdown|break down|répartition|détail)/i,
  /^(top|highest|lowest|plus grand|plus petit)\s+\d+/i,
];

// Patterns for local template responses (calculations)
const LOCAL_TEMPLATE_PATTERNS = [
  /^(what|how long|combien).*(runway|autonomie)/i,
  /^(can|should|do).*(afford|hire|embaucher)/i,
  /^(calculate|compute|calcule).*(burn|rate|taux)/i,
  /^(how much|combien).*(can|should|peut|devrait).*(spend|spending|dépenser)/i,
  /^(project|forecast|projection|prévision).*(runway|months|mois)/i,
];

// Patterns for LLM Lite (moderate complexity)
const LLM_LITE_PATTERNS = [
  /^(suggest|recommend|suggère|recommand).*(cost|expense|dépense|coût)/i,
  /^(what|quel).*(strategies|strategie).*(reduce|réduire)/i,
  /^(analyze|analyse).*(variance|change|changement)/i,
  /^(explain|explique).*(why|pourquoi).*(increase|decrease|augmentation|diminution)/i,
];

// Patterns for LLM Full (complex strategic advice)
const LLM_FULL_PATTERNS = [
  /^(generate|create|génère|crée).*(initiative|okr|strategy|stratégie)/i,
  /^(plan|planning|planifie).*(quarter|year|trimestre|année)/i,
  /^(what|quel).*(funding|financing|financement).*(strategy|stratégie)/i,
  /^(optimize|optimise).*(scenario|scénario)/i,
  /^(provide|fournis).*(strategic|stratégique).*(advice|conseil)/i,
];

/**
 * Classify query and determine best handler
 */
export function classifyQuery(query: string): QueryClassification {
  const normalizedQuery = query.toLowerCase().trim();
  
  // Check local NLQ patterns (highest priority - cheapest)
  for (const pattern of LOCAL_NLQ_PATTERNS) {
    if (pattern.test(normalizedQuery)) {
      return {
        handler: 'local_nlq',
        intent: 'data_query',
        confidence: 0.85,
        reasoning: 'Matches local NLQ pattern - can be handled without LLM',
      };
    }
  }
  
  // Check local template patterns (calculations)
  for (const pattern of LOCAL_TEMPLATE_PATTERNS) {
    if (pattern.test(normalizedQuery)) {
      // Determine specific intent
      let intent: QueryIntent = 'calculation';
      if (/hire|embaucher|afford/i.test(normalizedQuery)) {
        intent = 'hiring_analysis';
      } else if (/runway|autonomie/i.test(normalizedQuery)) {
        intent = 'runway_analysis';
      }
      
      return {
        handler: 'local_template',
        intent,
        confidence: 0.80,
        reasoning: 'Matches local template pattern - can be calculated locally',
      };
    }
  }
  
  // Check LLM Lite patterns
  for (const pattern of LLM_LITE_PATTERNS) {
    if (pattern.test(normalizedQuery)) {
      return {
        handler: 'llm_lite',
        intent: 'strategy',
        confidence: 0.75,
        reasoning: 'Moderate complexity - can use cheaper LLM model',
      };
    }
  }
  
  // Check LLM Full patterns
  for (const pattern of LLM_FULL_PATTERNS) {
    if (pattern.test(normalizedQuery)) {
      let intent: QueryIntent = 'strategy';
      if (/initiative/i.test(normalizedQuery)) {
        intent = 'initiative';
      } else if (/okr/i.test(normalizedQuery)) {
        intent = 'okr';
      }
      
      return {
        handler: 'llm_full',
        intent,
        confidence: 0.90,
        reasoning: 'Complex query requiring full LLM capabilities',
      };
    }
  }
  
  // Default: use LLM Lite for unknown queries (safer than full)
  return {
    handler: 'llm_lite',
    intent: 'general',
    confidence: 0.50,
    reasoning: 'Unknown pattern - defaulting to LLM Lite for safety',
  };
}

/**
 * Get model tier based on handler
 */
export function getModelTier(handler: QueryHandler): 'lite' | 'full' {
  switch (handler) {
    case 'local_nlq':
    case 'local_template':
      throw new Error('No model tier for local handlers');
    case 'llm_lite':
      return 'lite';
    case 'llm_full':
      return 'full';
  }
}

/**
 * Check if query can be handled locally (no LLM)
 */
export function isLocalHandler(handler: QueryHandler): boolean {
  return handler === 'local_nlq' || handler === 'local_template';
}
