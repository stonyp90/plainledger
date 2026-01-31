/**
 * James AI Service - Enterprise Grade
 * 
 * Service layer with:
 * - Request debouncing
 * - Error recovery
 * - Context optimization
 * - Performance monitoring
 * - Retry logic
 */

import { apiClient } from '../infrastructure/api/client';
import {
  buildConversationPrompt,
  buildStrategyPrompt,
  buildInitiativeGenerationPrompt,
  buildOKRGenerationPrompt,
  FinancialContext,
} from './jamesPrompts';
import { Initiative } from './strategicPlanning';
import { OKR, generateOKRId } from './okrTypes';
import { generatePlanningId } from './strategicPlanning';
import { jamesAnalytics } from './jamesAnalytics';
import { classifyQuery, getModelTier, isLocalHandler, QueryHandler } from './queryRouter';
import { pruneContext, buildPrunedContextString } from './contextPruner';
import { enforceTokenBudget, getBudgetInfo } from './tokenBudget';
import { validateAIResponse } from './responseGuardrails';
import { ChatMessage, ChatResponse, ChatStreamChunk } from './chatTypes';

// Re-export types for backward compatibility
export type { ChatMessage, ChatResponse, ChatStreamChunk };

interface PendingRequest {
  abortController: AbortController;
  timestamp: number;
}

class JamesAIService {
  private conversationHistory: ChatMessage[] = [];
  private maxHistoryLength = 20;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEBOUNCE_MS = 300;
  private readonly REQUEST_TIMEOUT = 30000;
  private readonly MAX_RETRIES = 3;

  /**
   * Add message to conversation history with optimization
   */
  addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const fullMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    
    this.conversationHistory.push(fullMessage);
    
    // Optimize history: keep only recent messages and compress old ones
    if (this.conversationHistory.length > this.maxHistoryLength) {
      // Keep last 10 messages full, summarize older ones
      const recent = this.conversationHistory.slice(-10);
      const older = this.conversationHistory.slice(0, -10);
      
      // Compress older messages (in production, could use summarization)
      const compressed = older.map(msg => ({
        ...msg,
        content: msg.content.length > 200 ? `${msg.content.substring(0, 200)}...` : msg.content,
      }));
      
      this.conversationHistory = [...compressed, ...recent].slice(-this.maxHistoryLength);
    }
    
    return fullMessage;
  }

  /**
   * Get conversation history (optimized)
   */
  getHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
    // Cancel any pending requests
    this.pendingRequests.forEach(req => req.abortController.abort());
    this.pendingRequests.clear();
  }

  /**
   * Send message with debouncing and error handling
   */
  async sendMessage(
    userMessage: string,
    context: FinancialContext,
    options?: {
      stream?: boolean;
      type?: 'strategy' | 'initiative' | 'okr' | 'general';
      debounce?: boolean;
    }
  ): Promise<ChatResponse> {
    const startTime = Date.now();

    // Validate input
    if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }

    if (userMessage.length > 10000) {
      throw new Error('Message exceeds maximum length');
    }

    // Track message sent
    jamesAnalytics.trackMessageSent(userMessage.length, options?.type);

    // Sanitize input
    const sanitizedMessage = this.sanitizeInput(userMessage.trim());

    // Debounce if requested
    if (options?.debounce) {
      return this.debouncedSend(sanitizedMessage, context, options);
    }

    return this.executeSend(sanitizedMessage, context, options);
  }

  /**
   * Debounced send (for typing scenarios)
   */
  private debouncedSend(
    message: string,
    context: FinancialContext,
    options?: { stream?: boolean; type?: 'strategy' | 'initiative' | 'okr' | 'general' }
  ): Promise<ChatResponse> {
    return new Promise((resolve, reject) => {
      const key = `${message.substring(0, 50)}_${options?.type || 'general'}`;
      
      // Clear existing timer
      const existingTimer = this.debounceTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Cancel pending request
      const pending = this.pendingRequests.get(key);
      if (pending) {
        pending.abortController.abort();
        this.pendingRequests.delete(key);
      }

      // Set new timer
      const timer = setTimeout(async () => {
        this.debounceTimers.delete(key);
        try {
          const response = await this.executeSend(message, context, options);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      }, this.DEBOUNCE_MS);

      this.debounceTimers.set(key, timer);
    });
  }

  /**
   * Execute send with retry logic and query optimization
   */
  private async executeSend(
    userMessage: string,
    context: FinancialContext,
    options?: { stream?: boolean; type?: 'strategy' | 'initiative' | 'okr' | 'general' }
  ): Promise<ChatResponse> {
    const startTime = Date.now();
    
    // Classify query to determine handler
    const classification = classifyQuery(userMessage);
    const handler: QueryHandler = classification.handler;
    const intent = classification.intent;
    
    // Check if query can be handled locally (no LLM needed)
    if (isLocalHandler(handler)) {
      // For now, we'll still send to LLM but with optimized context
      // TODO: Implement local handlers in future iteration
      console.log(`[QueryRouter] Query classified as ${handler}, but local handlers not yet implemented`);
    }
    
    // Add user message to history
    this.addMessage({
      role: 'user',
      content: userMessage,
    });

    const requestKey = `req-${Date.now()}`;
    const abortController = new AbortController();
    this.pendingRequests.set(requestKey, {
      abortController,
      timestamp: Date.now(),
    });

    // Cleanup old pending requests
    this.cleanupPendingRequests();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        // Prune context based on query intent
        const history = this.conversationHistory.slice(0, -1); // Exclude the message we just added
        const prunedContext = pruneContext(userMessage, context, history, intent);
        
        // Build prompt based on type with pruned context
        let prompt: string;
        
        if (options?.type === 'strategy') {
          prompt = buildStrategyPrompt(userMessage, context, history, intent);
        } else if (options?.type === 'initiative') {
          const strategy = history.find(m => m.metadata?.type === 'strategy')?.content || userMessage;
          prompt = buildInitiativeGenerationPrompt(strategy, context);
        } else if (options?.type === 'okr') {
          const initiatives = context.initiatives || [];
          const quarter = this.extractQuarter(userMessage) || 'Q1';
          const year = this.extractYear(userMessage) || new Date().getFullYear();
          prompt = buildOKRGenerationPrompt(userMessage, initiatives, quarter, year);
        } else {
          prompt = buildConversationPrompt(userMessage, context, history, intent);
        }
        
        // Enforce token budget
        const budgetInfo = getBudgetInfo(handler);
        const budgeted = enforceTokenBudget(prompt, handler, budgetInfo.maxTokens);
        prompt = budgeted.prunedPrompt;
        
        if (budgeted.wasPruned) {
          console.log(`[TokenBudget] Pruned prompt from ${budgeted.originalTokens} to ${budgeted.prunedTokens} tokens`);
        }

        // Call API with timeout
        const timeoutId = setTimeout(() => {
          abortController.abort();
        }, this.REQUEST_TIMEOUT);

        try {
          // Determine model tier based on handler
          const modelTier = isLocalHandler(handler) ? 'lite' : getModelTier(handler);
          
          const response = await apiClient.post<{
            success: boolean;
            message: string;
            initiatives?: any[];
            okrs?: any[];
            metadata?: {
              requestId?: string;
              latency?: number;
              tokensUsed?: { total: number };
            };
            error?: string;
          }>('/ai/chat', {
            prompt,
            stream: false,
            temperature: 0.7,
            maxTokens: 2000,
            modelTier, // Pass model tier to backend
          }, {
            signal: abortController.signal,
          } as any);

          clearTimeout(timeoutId);
          this.pendingRequests.delete(requestKey);

          if (!response.data.success) {
            throw new Error(response.data.error || response.data.message || 'Request failed');
          }

          let assistantMessage = response.data.message || '';
          
          // Validate response with guardrails
          const validation = validateAIResponse(assistantMessage, context);
          
          if (!validation.isValid) {
            console.warn(
              `Response validation failed: ${validation.issues.join('; ')}. ` +
              `Confidence: ${validation.confidence}%`
            );
            
            // Use sanitized message if available, otherwise add error
            if (validation.sanitizedMessage) {
              assistantMessage = validation.sanitizedMessage;
            } else {
              assistantMessage = 
                `⚠️ I apologize, but I couldn't verify the accuracy of my response. ` +
                `Please double-check all numbers against your financial data. ` +
                `Original response: ${assistantMessage}`;
            }
          } else if (validation.sanitizedMessage) {
            assistantMessage = validation.sanitizedMessage;
          }
          
          // Log validation warnings
          if (validation.warnings.length > 0) {
            console.warn('Response validation warnings:', validation.warnings);
          }
          
          // Parse structured data if present
          let initiatives: Initiative[] | undefined;
          let okrs: OKR[] | undefined;

          if (response.data.initiatives) {
            initiatives = this.parseInitiatives(response.data.initiatives);
          }

          if (response.data.okrs) {
            okrs = this.parseOKRs(response.data.okrs);
          }

          // Add assistant response to history
          this.addMessage({
            role: 'assistant',
            content: assistantMessage,
            metadata: {
              initiatives,
              okrs,
              type: options?.type || 'general',
            },
          });

          const responseTime = Date.now() - startTime;

          // Track analytics
          if (initiatives && initiatives.length > 0) {
            jamesAnalytics.trackInitiativeGenerated(initiatives.length);
          }
          if (okrs && okrs.length > 0) {
            jamesAnalytics.trackOKRGenerated();
          }

          return {
            message: assistantMessage,
            metadata: {
              initiatives,
              okrs,
              type: options?.type || 'general',
              tokensUsed: response.data.metadata?.tokensUsed?.total,
              latency: response.data.metadata?.latency || responseTime,
            },
          };
        } catch (error) {
          clearTimeout(timeoutId);
          
          if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timeout');
          }
          throw error;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Track error
        jamesAnalytics.trackError(
          lastError.name || 'UnknownError',
          lastError.message
        );
        
        // Log error
        console.error(`Attempt ${attempt + 1}/${this.MAX_RETRIES} failed:`, lastError.message);

        // Add error message to history on final attempt
        if (attempt === this.MAX_RETRIES - 1) {
          const errorMsg: ChatMessage = {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: this.getErrorMessage(lastError),
            timestamp: new Date(),
            metadata: {
              error: lastError.message,
              retryCount: attempt + 1,
            },
          };
          this.conversationHistory.push(errorMsg);
        }

        // Exponential backoff (except on last attempt)
        if (attempt < this.MAX_RETRIES - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed - return error response
    return {
      message: this.getErrorMessage(lastError),
      error: lastError?.message,
      metadata: {
        type: options?.type || 'general',
      },
    };
  }

  /**
   * Sanitize user input
   */
  private sanitizeInput(input: string): string {
    // Remove potential script tags and dangerous patterns
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .substring(0, 10000); // Enforce max length
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: Error | null): string {
    if (!error) {
      return "I apologize, but I encountered an error. Please try again.";
    }

    const message = error.message.toLowerCase();
    
    if (message.includes('timeout')) {
      return "The request took too long to process. Please try again with a shorter message.";
    }
    
    if (message.includes('rate limit')) {
      return "Too many requests. Please wait a moment and try again.";
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return "Network error. Please check your connection and try again.";
    }

    return "I encountered an error processing your request. Please try again.";
  }

  /**
   * Cleanup old pending requests
   */
  private cleanupPendingRequests(): void {
    const now = Date.now();
    const maxAge = 60000; // 1 minute

    this.pendingRequests.forEach((req, key) => {
      if (now - req.timestamp > maxAge) {
        req.abortController.abort();
        this.pendingRequests.delete(key);
      }
    });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Parse initiatives with validation
   */
  private parseInitiatives(data: any[]): Initiative[] {
    if (!Array.isArray(data)) return [];
    
    return data
      .filter(item => item && typeof item === 'object')
      .slice(0, 10) // Limit to 10
      .map((item: any) => ({
        id: generatePlanningId('initiative'),
        name: String(item.name || item.nameEn || 'New Initiative').substring(0, 200),
        nameEn: String(item.nameEn || item.name || 'New Initiative').substring(0, 200),
        category: ['growth', 'operations', 'product', 'people', 'infrastructure'].includes(item.category)
          ? item.category
          : 'operations',
        startDate: this.validateDate(item.startDate),
        endDate: this.validateDate(item.endDate),
        status: 'planned' as const,
        cashImpact: {
          type: ['one_time', 'recurring'].includes(item.cashImpact?.type)
            ? item.cashImpact.type
            : 'one_time',
          amount: this.validateNumber(item.cashImpact?.amount, -10000000, 10000000, 0),
          frequency: ['monthly', 'quarterly', 'annual'].includes(item.cashImpact?.frequency)
            ? item.cashImpact.frequency
            : undefined,
        },
        milestones: [],
        dependencies: [],
        confidence: this.validateNumber(item.confidence, 0, 100, 75),
        description: String(item.description || '').substring(0, 1000),
      }));
  }

  /**
   * Parse OKRs with validation
   */
  private parseOKRs(data: any): OKR[] {
    if (!data) return [];
    
    const okrData = Array.isArray(data) ? data[0] : data;
    if (!okrData || typeof okrData !== 'object') return [];
    
    const keyResults = (okrData.keyResults || [])
      .filter((kr: any) => kr && typeof kr === 'object')
      .slice(0, 10)
      .map((kr: any) => ({
        id: generateOKRId('kr'),
        description: String(kr.description || kr.descriptionEn || '').substring(0, 500),
        descriptionEn: String(kr.descriptionEn || kr.description || '').substring(0, 500),
        targetValue: this.validateNumber(kr.targetValue, -1000000000, 1000000000, 0),
        currentValue: 0,
        unit: String(kr.unit || 'number').substring(0, 50),
        dueDate: this.validateDate(kr.dueDate),
        status: 'not_started' as const,
        confidence: this.validateNumber(kr.confidence, 0, 100, 75),
      }));

    return [{
      id: generateOKRId('okr'),
      objective: String(okrData.objective || okrData.objectiveEn || '').substring(0, 500),
      objectiveEn: String(okrData.objectiveEn || okrData.objective || '').substring(0, 500),
      quarter: ['Q1', 'Q2', 'Q3', 'Q4'].includes(okrData.quarter) ? okrData.quarter : 'Q1',
      year: this.validateNumber(okrData.year, 2020, 2100, new Date().getFullYear()),
      keyResults,
      linkedInitiatives: [],
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }];
  }

  /**
   * Validate date
   */
  private validateDate(dateStr: any): string {
    if (!dateStr) return new Date().toISOString();
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  }

  /**
   * Validate number
   */
  private validateNumber(value: any, min: number, max: number, defaultValue: number = 0): number {
    const num = typeof value === 'number' ? value : parseFloat(String(value || defaultValue));
    if (isNaN(num)) return defaultValue;
    return Math.max(min, Math.min(max, num));
  }

  /**
   * Extract quarter from message
   */
  private extractQuarter(message: string): 'Q1' | 'Q2' | 'Q3' | 'Q4' | null {
    const match = message.match(/Q[1-4]/i);
    if (match) {
      return match[0].toUpperCase() as 'Q1' | 'Q2' | 'Q3' | 'Q4';
    }
    return null;
  }

  /**
   * Extract year from message
   */
  private extractYear(message: string): number | null {
    const match = message.match(/\b(20\d{2})\b/);
    if (match) {
      return parseInt(match[1], 10);
    }
    return null;
  }
}

// Export singleton instance
export const jamesAI = new JamesAIService();
export default jamesAI;
