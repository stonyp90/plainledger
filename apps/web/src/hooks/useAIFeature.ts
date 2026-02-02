import { useState, useCallback, useEffect } from 'react';
import { usePremiumFeature } from '../components/PremiumFeatureGate';
import { jamesAI, ChatResponse } from '../lib/jamesAI';
import { FinancialContext } from '../lib/jamesPrompts';
import { aiAnalytics } from '../lib/aiAnalytics';
import { estimateCost } from '../lib/tokenBudget';

/**
 * Standardized AI Feature Hook
 * 
 * Provides consistent AI functionality across pages with:
 * - Premium access checking
 * - Toggle state management (with/without AI)
 * - Cost tracking
 * - Usage analytics
 */
interface UseAIFeatureResult {
  /** Whether AI is currently enabled */
  isAIEnabled: boolean;
  
  /** Toggle AI on/off */
  toggleAI: () => void;
  
  /** Last AI response */
  aiResponse: ChatResponse | null;
  
  /** Whether AI request is in progress */
  isLoading: boolean;
  
  /** Send a query to AI */
  sendQuery: (query: string) => Promise<void>;
  
  /** Estimated cost of last query */
  estimatedCost: number;
  
  /** Whether user has AI access */
  hasAIAccess: boolean;
  
  /** Clear AI response */
  clearResponse: () => void;
}

interface UseAIFeatureOptions {
  /** Feature name for analytics tracking */
  featureName: string;
  
  /** Financial context for AI queries */
  financialContext?: FinancialContext;
  
  /** Default enabled state */
  defaultEnabled?: boolean;
  
  /** Query type for AI service */
  queryType?: 'strategy' | 'initiative' | 'okr' | 'general';
}

const FEATURE_STATE_KEY_PREFIX = 'plainledger:ai:feature:';

export function useAIFeature({
  featureName,
  financialContext,
  defaultEnabled = false,
  queryType = 'general',
}: UseAIFeatureOptions): UseAIFeatureResult {
  const { hasAccess } = usePremiumFeature('aiInsights');
  const [isAIEnabled, setIsAIEnabled] = useState(() => {
    if (!hasAccess) return false;
    
    try {
      const saved = localStorage.getItem(`${FEATURE_STATE_KEY_PREFIX}${featureName}`);
      return saved ? JSON.parse(saved) : defaultEnabled;
    } catch {
      return defaultEnabled;
    }
  });
  
  const [aiResponse, setAiResponse] = useState<ChatResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState(0);

  // Persist enabled state
  useEffect(() => {
    if (!hasAccess) {
      setIsAIEnabled(false);
      return;
    }
    
    try {
      localStorage.setItem(
        `${FEATURE_STATE_KEY_PREFIX}${featureName}`,
        JSON.stringify(isAIEnabled)
      );
    } catch (error) {
      console.warn(`[useAIFeature] Failed to save state for ${featureName}:`, error);
    }
  }, [isAIEnabled, hasAccess, featureName]);

  const toggleAI = useCallback(() => {
    if (!hasAccess) return;
    setIsAIEnabled(prev => !prev);
    
    // Track toggle event
    aiAnalytics.track({
      type: 'message_sent',
      metadata: {
        messageType: `${featureName}_toggle`,
      },
    });
  }, [hasAccess, featureName]);

  const sendQuery = useCallback(async (query: string) => {
    if (!hasAccess || !isAIEnabled || !financialContext) {
      return;
    }

    setIsLoading(true);
    setAiResponse(null);
    setEstimatedCost(0);

    try {
      const startTime = Date.now();
      
      const response = await jamesAI.sendMessage(query, financialContext, {
        type: queryType,
        debounce: false,
      });

      const latency = Date.now() - startTime;
      
      // Estimate cost from response metadata
      const tokens = response.metadata?.tokensUsed || 0;
      const modelTier = queryType === 'general' ? 'lite' : 'full';
      const cost = estimateCost(tokens, tokens * 0.3, modelTier); // Rough estimate
      
      setAiResponse(response);
      setEstimatedCost(cost);
      
      // Track usage
      aiAnalytics.trackAIUsage(featureName, tokens, modelTier);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setAiResponse({
        message: '',
        error: errorMessage,
        metadata: {
          type: queryType,
        },
      });
      
      aiAnalytics.trackError('query_failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [hasAccess, isAIEnabled, financialContext, featureName, queryType]);

  const clearResponse = useCallback(() => {
    setAiResponse(null);
    setEstimatedCost(0);
  }, []);

  return {
    isAIEnabled: hasAccess && isAIEnabled,
    toggleAI,
    aiResponse,
    isLoading,
    sendQuery,
    estimatedCost,
    hasAIAccess: hasAccess,
    clearResponse,
  };
}
