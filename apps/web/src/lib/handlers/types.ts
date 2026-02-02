/**
 * Local Handler Types
 * 
 * Type definitions for local handlers that process queries without LLM calls
 */

import { QueryHandler } from '../queryRouter';

/**
 * Response from local handlers
 */
export interface LocalResponse {
  /** The formatted response message */
  message: string;
  
  /** Which handler processed this query */
  handlerType: 'local_nlq' | 'local_template';
  
  /** Tokens used (always 0 for local handlers) */
  tokensUsed: 0;
  
  /** Processing latency in milliseconds */
  latencyMs: number;
  
  /** Confidence score (0-1) that this is the correct response */
  confidence: number;
  
  /** Optional structured data */
  metadata?: {
    /** Metrics returned in the response */
    metricsReturned?: string[];
    
    /** Raw extracted value (for single-metric queries) */
    extractedValue?: number;
    
    /** Comparison data (for comparison queries) */
    comparison?: {
      difference: number;
      isProfit?: boolean;
      monthsImpact?: number;
    };
    
    /** Calculation breakdown (for template responses) */
    calculation?: {
      formula: string;
      inputs: Record<string, number>;
      result: number;
    };
    
    /** Hiring analysis result */
    hiringAnalysis?: {
      canAfford: boolean;
      maxSalary: number;
      impactOnRunway: number;
      recommendation: string;
    };
    
    /** Runway projection */
    runwayProjection?: {
      currentRunway: number;
      projectedRunway: number;
      zeroDate: string;
      burnRate: number;
    };
  };
}

/**
 * Input context for local handlers
 */
export interface LocalHandlerContext {
  /** Current cash balance */
  currentCash: number;
  
  /** Monthly revenue */
  monthlyRevenue: number;
  
  /** Monthly expenses */
  monthlyExpenses: number;
  
  /** Monthly burn rate (expenses - revenue) */
  burnRate: number;
  
  /** Runway in months */
  runwayMonths: number;
  
  /** Projected zero cash date */
  zeroDate?: string;
}

/**
 * Options for local template handler
 */
export interface TemplateOptions {
  /** Language preference */
  language?: 'en' | 'fr';
  
  /** Additional salary for hiring analysis */
  proposedSalary?: number;
  
  /** Minimum acceptable runway (months) */
  minAcceptableRunway?: number;
  
  /** Target runway buffer (percentage) */
  runwayBufferPercent?: number;
}
