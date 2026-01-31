/**
 * Chat Types - Shared Type Definitions
 * 
 * This file contains shared type definitions used across AI chat modules
 * to avoid circular dependencies.
 */

import { Initiative } from './strategicPlanning';
import { OKR } from './okrTypes';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    initiatives?: Initiative[];
    okrs?: OKR[];
    type?: 'strategy' | 'initiative' | 'okr' | 'general';
    error?: string;
    retryCount?: number;
  };
}

export interface ChatResponse {
  message: string;
  streaming?: boolean;
  metadata?: {
    initiatives?: Initiative[];
    okrs?: OKR[];
    type?: 'strategy' | 'initiative' | 'okr' | 'general';
    tokensUsed?: number;
    latency?: number;
  };
  error?: string;
}

export interface ChatStreamChunk {
  content: string;
  done: boolean;
  error?: string;
}
