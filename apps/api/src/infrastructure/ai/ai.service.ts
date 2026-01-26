/**
 * AI Service - Enterprise Grade
 * 
 * Handles LLM integration for James AI strategic advisor with:
 * - Retry logic with exponential backoff
 * - Rate limiting and token tracking
 * - Comprehensive error handling
 * - Request validation
 * - Performance monitoring
 * - Circuit breaker pattern
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AIGenerationOptions {
  stream?: boolean;
  tenantId?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  retries?: number;
}

export interface AIResponse {
  message: string;
  initiatives?: any[];
  okrs?: any[];
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  latency?: number;
}

export interface RateLimitInfo {
  remaining: number;
  resetAt: Date;
  limit: number;
}

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly openaiApiKey: string | undefined;
  private readonly anthropicApiKey: string | undefined;
  private readonly useOpenAI: boolean;
  private readonly maxRetries: number;
  private readonly requestTimeout: number;
  private readonly maxTokensPerRequest: number;
  private readonly rateLimitPerTenant: Map<string, RateLimitInfo> = new Map();
  private readonly circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private readonly requestCache: Map<string, { response: AIResponse; expiresAt: number }> = new Map();
  private readonly tokenUsage: Map<string, { total: number; lastReset: Date }> = new Map();

  // Rate limits: requests per minute per tenant
  private readonly RATE_LIMIT_REQUESTS = 30;
  private readonly RATE_LIMIT_WINDOW_MS = 60 * 1000;
  
  // Circuit breaker thresholds
  private readonly CIRCUIT_BREAKER_FAILURE_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_RESET_TIMEOUT = 60 * 1000; // 1 minute
  
  // Cache TTL: 5 minutes
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  constructor(private readonly configService: ConfigService) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.anthropicApiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    this.useOpenAI = !!this.openaiApiKey;
    this.maxRetries = parseInt(this.configService.get<string>('AI_MAX_RETRIES') || '3', 10);
    this.requestTimeout = parseInt(this.configService.get<string>('AI_REQUEST_TIMEOUT') || '30000', 10);
    this.maxTokensPerRequest = parseInt(this.configService.get<string>('AI_MAX_TOKENS') || '4000', 10);
  }

  /**
   * Generate AI response with enterprise-grade error handling
   */
  async generateResponse(prompt: string, options: AIGenerationOptions = {}): Promise<AIResponse> {
    const startTime = Date.now();
    const tenantId = options.tenantId || 'default';
    
    try {
      // Input validation
      this.validateInput(prompt, options);

      // Rate limiting check
      if (!this.checkRateLimit(tenantId)) {
        this.logger.warn(`Rate limit exceeded for tenant: ${tenantId}`);
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      // Check circuit breaker
      if (!this.checkCircuitBreaker('ai-service')) {
        this.logger.warn('Circuit breaker is open, using fallback');
        return this.generateSimulatedResponse(prompt);
      }

      // Check cache
      const cacheKey = this.generateCacheKey(prompt, options);
      const cached = this.requestCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        this.logger.debug(`Cache hit for prompt: ${prompt.substring(0, 50)}...`);
        return cached.response;
      }

      // Generate response with retry logic
      let lastError: Error | null = null;
      const maxAttempts = options.retries || this.maxRetries;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          let response: AIResponse;

          if (this.useOpenAI && this.openaiApiKey) {
            response = await this.generateWithOpenAI(prompt, options);
          } else if (this.anthropicApiKey) {
            response = await this.generateWithAnthropic(prompt, options);
          } else {
            this.logger.warn('No AI API keys configured, using simulated response');
            return this.generateSimulatedResponse(prompt);
          }

          // Track token usage
          if (response.tokensUsed) {
            this.trackTokenUsage(tenantId, response.tokensUsed.total);
          }

          // Record success
          this.recordSuccess('ai-service');

          // Cache response
          response.latency = Date.now() - startTime;
          this.requestCache.set(cacheKey, {
            response,
            expiresAt: Date.now() + this.CACHE_TTL_MS,
          });

          // Log metrics
          this.logger.log(`AI response generated in ${response.latency}ms for tenant: ${tenantId}`);

          return response;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          this.logger.warn(`Attempt ${attempt + 1}/${maxAttempts} failed: ${lastError.message}`);

          if (attempt < maxAttempts - 1) {
            // Exponential backoff
            const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
            await this.sleep(delay);
          }
        }
      }

      // All retries failed
      this.recordFailure('ai-service');
      this.logger.error(`All ${maxAttempts} attempts failed. Last error: ${lastError?.message}`);

      // Fallback to simulated response
      return this.generateSimulatedResponse(prompt);
    } catch (error) {
      this.logger.error(`Error generating AI response: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  /**
   * Validate input parameters
   */
  private validateInput(prompt: string, options: AIGenerationOptions): void {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Prompt must be a non-empty string');
    }

    if (prompt.length > 10000) {
      throw new Error('Prompt exceeds maximum length of 10,000 characters');
    }

    if (options.maxTokens && (options.maxTokens < 1 || options.maxTokens > this.maxTokensPerRequest)) {
      throw new Error(`maxTokens must be between 1 and ${this.maxTokensPerRequest}`);
    }

    if (options.temperature && (options.temperature < 0 || options.temperature > 2)) {
      throw new Error('Temperature must be between 0 and 2');
    }

    // Sanitize prompt (remove potential injection attempts)
    if (this.containsSuspiciousContent(prompt)) {
      this.logger.warn('Suspicious content detected in prompt');
      throw new Error('Invalid input detected');
    }
  }

  /**
   * Check for suspicious content
   */
  private containsSuspiciousContent(prompt: string): boolean {
    // Basic checks for potential injection attempts
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\(/i,
      /exec\(/i,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(prompt));
  }

  /**
   * Check rate limit for tenant
   */
  private checkRateLimit(tenantId: string): boolean {
    const now = Date.now();
    const limit = this.rateLimitPerTenant.get(tenantId);

    if (!limit || limit.resetAt.getTime() < now) {
      // Reset or initialize
      this.rateLimitPerTenant.set(tenantId, {
        remaining: this.RATE_LIMIT_REQUESTS - 1,
        resetAt: new Date(now + this.RATE_LIMIT_WINDOW_MS),
        limit: this.RATE_LIMIT_REQUESTS,
      });
      return true;
    }

    if (limit.remaining <= 0) {
      return false;
    }

    limit.remaining--;
    return true;
  }

  /**
   * Check circuit breaker state
   */
  private checkCircuitBreaker(service: string): boolean {
    const breaker = this.circuitBreakers.get(service) || {
      failures: 0,
      lastFailureTime: 0,
      state: 'closed' as const,
    };

    if (breaker.state === 'open') {
      const timeSinceLastFailure = Date.now() - breaker.lastFailureTime;
      if (timeSinceLastFailure > this.CIRCUIT_BREAKER_RESET_TIMEOUT) {
        breaker.state = 'half-open';
        breaker.failures = 0;
      } else {
        return false;
      }
    }

    this.circuitBreakers.set(service, breaker);
    return true;
  }

  /**
   * Record successful request
   */
  private recordSuccess(service: string): void {
    const breaker = this.circuitBreakers.get(service);
    if (breaker) {
      breaker.failures = 0;
      breaker.state = 'closed';
      this.circuitBreakers.set(service, breaker);
    }
  }

  /**
   * Record failed request
   */
  private recordFailure(service: string): void {
    const breaker = this.circuitBreakers.get(service) || {
      failures: 0,
      lastFailureTime: 0,
      state: 'closed' as const,
    };

    breaker.failures++;
    breaker.lastFailureTime = Date.now();

    if (breaker.failures >= this.CIRCUIT_BREAKER_FAILURE_THRESHOLD) {
      breaker.state = 'open';
      this.logger.warn(`Circuit breaker opened for ${service} after ${breaker.failures} failures`);
    }

    this.circuitBreakers.set(service, breaker);
  }

  /**
   * Track token usage per tenant
   */
  private trackTokenUsage(tenantId: string, tokens: number): void {
    const usage = this.tokenUsage.get(tenantId) || {
      total: 0,
      lastReset: new Date(),
    };

    // Reset daily
    const now = new Date();
    if (now.getTime() - usage.lastReset.getTime() > 24 * 60 * 60 * 1000) {
      usage.total = 0;
      usage.lastReset = now;
    }

    usage.total += tokens;
    this.tokenUsage.set(tenantId, usage);

    // Log if approaching limits (e.g., 100k tokens/day)
    if (usage.total > 80000) {
      this.logger.warn(`High token usage for tenant ${tenantId}: ${usage.total} tokens`);
    }
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(prompt: string, options: AIGenerationOptions): string {
    const key = `${prompt.substring(0, 100)}_${options.temperature || 0.7}_${options.maxTokens || 2000}`;
    return Buffer.from(key).toString('base64').substring(0, 50);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate response with OpenAI
   */
  private async generateWithOpenAI(prompt: string, options: AIGenerationOptions): Promise<AIResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.requestTimeout);

    try {
      const fetch = (await import('node-fetch')).default;
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: 'You are James, an expert AI strategic advisor specializing in cashflow management and executive strategic planning.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: options.temperature || 0.7,
          max_tokens: Math.min(options.maxTokens || 2000, this.maxTokensPerRequest),
          stream: options.stream || false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || response.statusText;
        
        // Handle specific error codes
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else if (response.status === 401) {
          throw new Error('Invalid API key');
        } else if (response.status >= 500) {
          throw new Error('AI service temporarily unavailable');
        }
        
        throw new Error(`OpenAI API error: ${errorMessage}`);
      }

      const data = await response.json();
      const message = data.choices[0]?.message?.content || '';
      const usage = data.usage || {};

      // Parse structured data
      const parsed = this.parseStructuredResponse(message);

      return {
        message,
        ...parsed,
        tokensUsed: {
          prompt: usage.prompt_tokens || 0,
          completion: usage.completion_tokens || 0,
          total: usage.total_tokens || 0,
        },
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Generate response with Anthropic
   */
  private async generateWithAnthropic(prompt: string, options: AIGenerationOptions): Promise<AIResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.requestTimeout);

    try {
      const fetch = (await import('node-fetch')).default;
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicApiKey!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-opus-20240229',
          max_tokens: Math.min(options.maxTokens || 2000, this.maxTokensPerRequest),
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          system: 'You are James, an expert AI strategic advisor specializing in cashflow management and executive strategic planning.',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || response.statusText;
        
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else if (response.status === 401) {
          throw new Error('Invalid API key');
        } else if (response.status >= 500) {
          throw new Error('AI service temporarily unavailable');
        }
        
        throw new Error(`Anthropic API error: ${errorMessage}`);
      }

      const data = await response.json();
      const message = data.content[0]?.text || '';
      const usage = data.usage || {};

      const parsed = this.parseStructuredResponse(message);

      return {
        message,
        ...parsed,
        tokensUsed: {
          prompt: usage.input_tokens || 0,
          completion: usage.output_tokens || 0,
          total: (usage.input_tokens || 0) + (usage.output_tokens || 0),
        },
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Parse structured response with validation
   */
  private parseStructuredResponse(message: string): { initiatives?: any[]; okrs?: any[] } {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = message.match(/```json\s*([\s\S]*?)\s*```/) || message.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[1].trim();
        const parsed = JSON.parse(jsonStr);
        
        // Validate and sanitize
        if (Array.isArray(parsed)) {
          if (parsed.length > 0 && parsed[0].name) {
            return { initiatives: this.validateInitiatives(parsed) };
          } else if (parsed.length > 0 && parsed[0].objective) {
            return { okrs: this.validateOKRs(parsed) };
          }
        } else if (parsed.objective) {
          return { okrs: this.validateOKRs([parsed]) };
        } else if (parsed.initiatives) {
          return { initiatives: this.validateInitiatives(parsed.initiatives) };
        } else if (parsed.okrs) {
          return { okrs: this.validateOKRs(parsed.okrs) };
        }
      }

      // Try to parse JSON directly
      const directJsonMatch = message.match(/\{[\s\S]*\}/);
      if (directJsonMatch) {
        const parsed = JSON.parse(directJsonMatch[0]);
        if (parsed.initiatives) return { initiatives: this.validateInitiatives(parsed.initiatives) };
        if (parsed.okrs) return { okrs: this.validateOKRs(parsed.okrs) };
        if (parsed.objective) return { okrs: this.validateOKRs([parsed]) };
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name) {
          return { initiatives: this.validateInitiatives(parsed) };
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to parse structured response: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {};
  }

  /**
   * Validate and sanitize initiatives
   */
  private validateInitiatives(initiatives: any[]): any[] {
    return initiatives
      .filter(init => init && typeof init === 'object')
      .slice(0, 10) // Limit to 10 initiatives
      .map(init => ({
        name: String(init.name || init.nameEn || 'New Initiative').substring(0, 200),
        nameEn: String(init.nameEn || init.name || 'New Initiative').substring(0, 200),
        category: ['growth', 'operations', 'product', 'people', 'infrastructure'].includes(init.category) 
          ? init.category 
          : 'operations',
        description: String(init.description || '').substring(0, 1000),
        startDate: this.validateDate(init.startDate),
        endDate: this.validateDate(init.endDate),
        cashImpact: {
          type: ['one_time', 'recurring'].includes(init.cashImpact?.type) 
            ? init.cashImpact.type 
            : 'one_time',
          amount: this.validateNumber(init.cashImpact?.amount, -10000000, 10000000),
          frequency: ['monthly', 'quarterly', 'annual'].includes(init.cashImpact?.frequency)
            ? init.cashImpact.frequency
            : undefined,
        },
        confidence: this.validateNumber(init.confidence, 0, 100, 75),
      }));
  }

  /**
   * Validate and sanitize OKRs
   */
  private validateOKRs(okrs: any[]): any[] {
    return okrs
      .filter(okr => okr && typeof okr === 'object')
      .slice(0, 5) // Limit to 5 OKRs
      .map(okr => ({
        objective: String(okr.objective || okr.objectiveEn || '').substring(0, 500),
        objectiveEn: String(okr.objectiveEn || okr.objective || '').substring(0, 500),
        quarter: ['Q1', 'Q2', 'Q3', 'Q4'].includes(okr.quarter) ? okr.quarter : 'Q1',
        year: this.validateNumber(okr.year, 2020, 2100, new Date().getFullYear()),
        keyResults: (okr.keyResults || [])
          .slice(0, 10) // Limit to 10 key results per OKR
          .map((kr: any) => ({
            description: String(kr.description || kr.descriptionEn || '').substring(0, 500),
            descriptionEn: String(kr.descriptionEn || kr.description || '').substring(0, 500),
            targetValue: this.validateNumber(kr.targetValue, -1000000000, 1000000000),
            unit: String(kr.unit || 'number').substring(0, 50),
            dueDate: this.validateDate(kr.dueDate),
            confidence: this.validateNumber(kr.confidence, 0, 100, 75),
          })),
      }));
  }

  /**
   * Validate date string
   */
  private validateDate(dateStr: any): string {
    if (!dateStr) return new Date().toISOString();
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  }

  /**
   * Validate number within range
   */
  private validateNumber(value: any, min: number, max: number, defaultValue?: number): number {
    const num = typeof value === 'number' ? value : parseFloat(String(value || defaultValue || 0));
    if (isNaN(num)) return defaultValue || 0;
    return Math.max(min, Math.min(max, num));
  }

  /**
   * Generate simulated response for development/fallback
   */
  private generateSimulatedResponse(prompt: string): AIResponse {
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('initiative') || lowerPrompt.includes('generate initiative')) {
      return {
        message: "I've generated strategic initiatives based on your goals. These initiatives are designed to improve your cash position while advancing your strategic objectives.",
        initiatives: [
          {
            name: 'Revenue Optimization',
            nameEn: 'Revenue Optimization',
            category: 'growth',
            description: 'Focus on optimizing existing revenue streams and identifying quick wins.',
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            cashImpact: {
              type: 'recurring',
              amount: 50000,
              frequency: 'monthly',
            },
            confidence: 75,
          },
        ],
      };
    }

    if (lowerPrompt.includes('okr') || lowerPrompt.includes('objective')) {
      return {
        message: "I've created OKRs aligned with your strategic initiatives. These objectives are measurable and tied to your quarterly goals.",
        okrs: [
          {
            objective: 'Extend Cash Runway',
            objectiveEn: 'Extend Cash Runway',
            quarter: 'Q1',
            year: new Date().getFullYear(),
            keyResults: [
              {
                description: 'Reduce monthly burn rate by 20%',
                descriptionEn: 'Reduce monthly burn rate by 20%',
                targetValue: 20,
                unit: 'percentage',
                dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
                confidence: 75,
              },
            ],
          },
        ],
      };
    }

    return {
      message: "Based on your current financial position, I recommend focusing on extending your runway through a combination of revenue optimization and expense management. Here are three strategic approaches:\n\n1. **Revenue Acceleration**: Identify quick wins in your existing customer base through upselling or expansion.\n\n2. **Cost Optimization**: Review your monthly expenses and identify non-essential costs that can be deferred or eliminated.\n\n3. **Strategic Funding**: Consider raising capital before your runway becomes critical.",
    };
  }

  /**
   * Get rate limit info for tenant
   */
  getRateLimitInfo(tenantId: string): RateLimitInfo | null {
    return this.rateLimitPerTenant.get(tenantId) || null;
  }

  /**
   * Get token usage for tenant
   */
  getTokenUsage(tenantId: string): number {
    const usage = this.tokenUsage.get(tenantId);
    return usage ? usage.total : 0;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.requestCache.clear();
  }
}
