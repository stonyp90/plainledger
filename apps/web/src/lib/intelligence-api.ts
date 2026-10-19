/**
 * Intelligence API
 * 
 * API calls for Context Intelligence Platform features.
 */

import { apiClient } from '../infrastructure/api';
import type { DecisionEvent } from '../domain/DecisionEvent';
import type { IntelligenceMetrics } from '../components/IntelligenceDashboard';

export interface CaptureDecisionRequest {
  organizationId: string;
  industry: string;
  businessSize: 'micro' | 'small' | 'medium' | 'large';
  trigger: {
    metric: string;
    currentValue: number;
    benchmarkValue: number;
    gapPercentage: number;
    chartContext?: string;
  };
  decision: {
    actionType: string;
    description: string;
    reasoning?: string;
    expectedImpact: number;
    confidence: 'low' | 'medium' | 'high';
  };
  source?: 'user' | 'ai_suggested' | 'imported';
}

export interface RecordOutcomeRequest {
  actualImpact: number;
  measuredAt: string;
  success: boolean;
  learnings?: string;
}

export interface GenerateIntelligenceRequest {
  industry: string;
  businessSize: 'micro' | 'small' | 'medium' | 'large';
  trigger: {
    metric: string;
    currentValue: number;
    benchmarkValue: number;
    gapPercentage: number;
  };
  type?: 'pattern_lookup' | 'quick_suggestion' | 'deep_analysis' | 'standard';
  requiresLowLatency?: boolean;
}

export const intelligenceApi = {
  /**
   * Capture a new decision
   */
  captureDecision: (data: CaptureDecisionRequest) =>
    apiClient.post<{ id: string; organizationId: string; industry: string; createdAt: string; reminderScheduled: boolean }>('/v1/decisions', data),

  /**
   * Record outcome for a decision
   */
  recordOutcome: (decisionId: string, data: RecordOutcomeRequest) =>
    apiClient.post<{ id: string; outcome: { success: boolean; variance: number; roi: number | null } }>(
      `/v1/decisions/${decisionId}/outcome`,
      data
    ),

  /**
   * Get decision by ID
   */
  getDecision: (id: string) =>
    apiClient.get<DecisionEvent>(`/v1/decisions/${id}`),

  /**
   * Get decisions for organization
   */
  getDecisions: () =>
    apiClient.get<DecisionEvent[]>('/v1/decisions'),

  /**
   * Get decision statistics
   */
  getStatistics: () =>
    apiClient.get<{
      totalDecisions: number;
      decisionsWithOutcomes: number;
      avgSuccessRate: number;
      avgVariance: number;
    }>('/v1/decisions/statistics'),

  /**
   * Generate intelligence recommendation
   */
  generateIntelligence: (data: GenerateIntelligenceRequest) =>
    apiClient.post<any>('/v1/intelligence/generate', data),

  /**
   * Get intelligence metrics
   */
  getMetrics: () =>
    apiClient.get<IntelligenceMetrics>('/v1/intelligence/metrics'),
};

export default intelligenceApi;
