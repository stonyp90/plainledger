/**
 * useDecisions Hook
 * 
 * React hook for managing decision events.
 * Currently uses localStorage as a fallback until the API is built.
 * 
 * Part of the Context Graphs flywheel for capturing decision context.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  type DecisionEvent,
  type IndustryType,
  type DataMetric,
  type DecisionOutcome,
  calculateOutcomeVariance,
  isOutcomeSuccessful,
} from '../lib/decisionContext';

// Storage key for localStorage
const DECISIONS_STORAGE_KEY = 'plainledger_decisions';

interface UseDecisionsOptions {
  organizationId: string;
  industry?: IndustryType;
}

interface UseDecisionsReturn {
  // Data
  decisions: DecisionEvent[];
  pendingOutcomes: DecisionEvent[];
  recentDecisions: DecisionEvent[];
  
  // Actions
  saveDecision: (decision: DecisionEvent) => Promise<DecisionEvent>;
  updateDecision: (id: string, updates: Partial<DecisionEvent>) => Promise<DecisionEvent | null>;
  recordOutcome: (id: string, outcome: DecisionOutcome) => Promise<DecisionEvent | null>;
  deleteDecision: (id: string) => Promise<boolean>;
  
  // Queries
  getDecisionById: (id: string) => DecisionEvent | undefined;
  getDecisionsByMetric: (metric: DataMetric) => DecisionEvent[];
  getDecisionsWithOutcomes: () => DecisionEvent[];
  getSuccessRate: () => number;
  
  // State
  isLoading: boolean;
  error: string | null;
}

/**
 * Load decisions from localStorage
 */
function loadDecisions(): DecisionEvent[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(DECISIONS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load decisions from localStorage:', e);
  }
  return [];
}

/**
 * Save decisions to localStorage
 */
function persistDecisions(decisions: DecisionEvent[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(DECISIONS_STORAGE_KEY, JSON.stringify(decisions));
  } catch (e) {
    console.error('Failed to save decisions to localStorage:', e);
  }
}

/**
 * Hook for managing decision events
 */
export function useDecisions({ 
  organizationId, 
  industry 
}: UseDecisionsOptions): UseDecisionsReturn {
  const [decisions, setDecisions] = useState<DecisionEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load decisions on mount
  useEffect(() => {
    setIsLoading(true);
    try {
      const allDecisions = loadDecisions();
      
      // Filter by organization and optionally by industry
      const filtered = allDecisions.filter(d => {
        if (d.organizationId !== organizationId) return false;
        if (industry && d.industry !== industry) return false;
        return true;
      });
      
      setDecisions(filtered);
      setError(null);
    } catch (e) {
      setError('Failed to load decisions');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, industry]);
  
  // Save a new decision
  const saveDecision = useCallback(async (decision: DecisionEvent): Promise<DecisionEvent> => {
    try {
      // TODO: Call API when available
      // const response = await api.post('/decisions', decision);
      // return response.data;
      
      // For now, save to localStorage
      const allDecisions = loadDecisions();
      const newDecisions = [...allDecisions, decision];
      persistDecisions(newDecisions);
      
      // Update local state
      setDecisions(prev => [...prev, decision]);
      
      return decision;
    } catch (e) {
      setError('Failed to save decision');
      throw e;
    }
  }, []);
  
  // Update an existing decision
  const updateDecision = useCallback(async (
    id: string, 
    updates: Partial<DecisionEvent>
  ): Promise<DecisionEvent | null> => {
    try {
      const allDecisions = loadDecisions();
      const index = allDecisions.findIndex(d => d.id === id);
      
      if (index === -1) return null;
      
      const updated: DecisionEvent = {
        ...allDecisions[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      allDecisions[index] = updated;
      persistDecisions(allDecisions);
      
      // Update local state
      setDecisions(prev => prev.map(d => d.id === id ? updated : d));
      
      return updated;
    } catch (e) {
      setError('Failed to update decision');
      throw e;
    }
  }, []);
  
  // Record an outcome for a decision
  const recordOutcome = useCallback(async (
    id: string, 
    outcome: DecisionOutcome
  ): Promise<DecisionEvent | null> => {
    try {
      const allDecisions = loadDecisions();
      const decision = allDecisions.find(d => d.id === id);
      
      if (!decision) return null;
      
      // Calculate variance if not provided
      const variance = outcome.variance ?? calculateOutcomeVariance(
        decision.decision.expectedImpact,
        outcome.actualImpact
      );
      
      // Determine success if not provided
      const success = outcome.success ?? isOutcomeSuccessful(
        decision.decision.expectedImpact,
        outcome.actualImpact
      );
      
      const updatedOutcome: DecisionOutcome = {
        ...outcome,
        variance,
        success,
        verifiedBy: outcome.verifiedBy || 'user',
      };
      
      return updateDecision(id, { outcome: updatedOutcome });
    } catch (e) {
      setError('Failed to record outcome');
      throw e;
    }
  }, [updateDecision]);
  
  // Delete a decision
  const deleteDecision = useCallback(async (id: string): Promise<boolean> => {
    try {
      const allDecisions = loadDecisions();
      const filtered = allDecisions.filter(d => d.id !== id);
      
      if (filtered.length === allDecisions.length) return false;
      
      persistDecisions(filtered);
      setDecisions(prev => prev.filter(d => d.id !== id));
      
      return true;
    } catch (e) {
      setError('Failed to delete decision');
      throw e;
    }
  }, []);
  
  // Get decision by ID
  const getDecisionById = useCallback((id: string): DecisionEvent | undefined => {
    return decisions.find(d => d.id === id);
  }, [decisions]);
  
  // Get decisions by metric type
  const getDecisionsByMetric = useCallback((metric: DataMetric): DecisionEvent[] => {
    return decisions.filter(d => d.trigger.metricType === metric);
  }, [decisions]);
  
  // Get decisions with recorded outcomes
  const getDecisionsWithOutcomes = useCallback((): DecisionEvent[] => {
    return decisions.filter(d => d.outcome != null);
  }, [decisions]);
  
  // Calculate overall success rate
  const getSuccessRate = useCallback((): number => {
    const withOutcomes = decisions.filter(d => d.outcome?.success != null);
    if (withOutcomes.length === 0) return 0;
    
    const successful = withOutcomes.filter(d => d.outcome?.success);
    return (successful.length / withOutcomes.length) * 100;
  }, [decisions]);
  
  // Get pending outcomes (decisions without outcomes that are past reminder date)
  const pendingOutcomes = decisions.filter(d => {
    if (d.outcome) return false;
    if (!d.reminderScheduled) return false;
    
    const createdAt = new Date(d.createdAt);
    const reminderDate = new Date(createdAt);
    reminderDate.setDate(reminderDate.getDate() + (d.reminderDays || 30));
    
    return new Date() >= reminderDate;
  });
  
  // Get recent decisions (last 10)
  const recentDecisions = [...decisions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);
  
  return {
    decisions,
    pendingOutcomes,
    recentDecisions,
    saveDecision,
    updateDecision,
    recordOutcome,
    deleteDecision,
    getDecisionById,
    getDecisionsByMetric,
    getDecisionsWithOutcomes,
    getSuccessRate,
    isLoading,
    error,
  };
}

// Export types for consumers
export type { UseDecisionsReturn };
