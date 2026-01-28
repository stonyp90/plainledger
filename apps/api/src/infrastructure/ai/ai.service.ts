/**
 * AI Service - Enterprise Grade Multi-Provider
 *
 * Handles LLM integration for James AI strategic advisor with:
 * - Support for all major AI providers (OpenAI, Anthropic, Google, Mistral, Cohere, Azure, Ollama)
 * - Automatic fallback between providers
 * - Retry logic with exponential backoff
 * - Rate limiting and token tracking
 * - Comprehensive error handling
 * - Request validation
 * - Performance monitoring
 * - Circuit breaker pattern
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AIGuardrailsService,
  FinancialContext as GuardrailContext,
} from "./ai-guardrails.service";
import { IAIService } from "@application/ports/outbound/IAIService";

export type AIProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "mistral"
  | "cohere"
  | "azure"
  | "ollama";

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  endpoint?: string;
  enabled: boolean;
  priority: number;
}

export interface AIGenerationOptions {
  stream?: boolean;
  tenantId?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  retries?: number;
  preferredProvider?: AIProvider;
  forceProvider?: boolean;
  modelTier?: "lite" | "full"; // Model tier selection for cost optimization
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
  provider?: AIProvider;
  model?: string;
}

export interface RateLimitInfo {
  remaining: number;
  resetAt: Date;
  limit: number;
}

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: "closed" | "open" | "half-open";
}

@Injectable()
export class AIService implements IAIService {
  private readonly logger = new Logger(AIService.name);
  private readonly providers: Map<AIProvider, AIProviderConfig> = new Map();
  private readonly maxRetries: number;
  private readonly requestTimeout: number;
  private readonly maxTokensPerRequest: number;
  private readonly rateLimitPerTenant: Map<string, RateLimitInfo> = new Map();
  private readonly circuitBreakers: Map<string, CircuitBreakerState> =
    new Map();
  private readonly requestCache: Map<
    string,
    { response: AIResponse; expiresAt: number }
  > = new Map();
  private readonly tokenUsage: Map<string, { total: number; lastReset: Date }> =
    new Map();
  private readonly guardrails: AIGuardrailsService = new AIGuardrailsService();

  // Rate limits: requests per minute per tenant
  private readonly RATE_LIMIT_REQUESTS = 30;
  private readonly RATE_LIMIT_WINDOW_MS = 60 * 1000;

  // Circuit breaker thresholds
  private readonly CIRCUIT_BREAKER_FAILURE_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_RESET_TIMEOUT = 60 * 1000; // 1 minute

  // Cache TTL: 5 minutes
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  // Default models per provider (full tier)
  private readonly DEFAULT_MODELS: Record<AIProvider, string> = {
    openai: "gpt-4-turbo-preview",
    anthropic: "claude-3-opus-20240229",
    google: "gemini-1.5-pro",
    mistral: "mistral-large-latest",
    cohere: "command-r-plus",
    azure: "gpt-4",
    ollama: "llama2",
  };

  // Lite models per provider (cheaper, faster)
  private readonly LITE_MODELS: Record<AIProvider, string> = {
    openai: "gpt-3.5-turbo",
    anthropic: "claude-3-haiku-20240307",
    google: "gemini-1.5-flash",
    mistral: "mistral-small-latest",
    cohere: "command",
    azure: "gpt-35-turbo",
    ollama: "llama2",
  };

  constructor(private readonly configService: ConfigService) {
    this.maxRetries = parseInt(
      this.configService.get<string>("AI_MAX_RETRIES") || "3",
      10,
    );
    this.requestTimeout = parseInt(
      this.configService.get<string>("AI_REQUEST_TIMEOUT") || "30000",
      10,
    );
    this.maxTokensPerRequest = parseInt(
      this.configService.get<string>("AI_MAX_TOKENS") || "4000",
      10,
    );

    // Initialize all providers
    this.initializeProviders();

    // Log available providers
    const availableProviders = Array.from(this.providers.entries())
      .filter(([_, config]) => config.enabled)
      .map(([name]) => name);

    if (availableProviders.length > 0) {
      this.logger.log(
        `AI providers initialized: ${availableProviders.join(", ")}`,
      );
    } else {
      this.logger.warn(
        "No AI providers configured. Using simulated responses.",
      );
    }
  }

  /**
   * Initialize all supported AI providers from environment
   */
  private initializeProviders(): void {
    // OpenAI
    const openaiKey = this.configService.get<string>("OPENAI_API_KEY");
    this.providers.set("openai", {
      provider: "openai",
      apiKey: openaiKey,
      model:
        this.configService.get<string>("OPENAI_MODEL") ||
        this.DEFAULT_MODELS.openai,
      enabled: !!openaiKey,
      priority: 1,
    });

    // Anthropic
    const anthropicKey = this.configService.get<string>("ANTHROPIC_API_KEY");
    this.providers.set("anthropic", {
      provider: "anthropic",
      apiKey: anthropicKey,
      model:
        this.configService.get<string>("ANTHROPIC_MODEL") ||
        this.DEFAULT_MODELS.anthropic,
      enabled: !!anthropicKey,
      priority: 2,
    });

    // Google Gemini
    const googleKey = this.configService.get<string>("GOOGLE_AI_API_KEY");
    this.providers.set("google", {
      provider: "google",
      apiKey: googleKey,
      model:
        this.configService.get<string>("GOOGLE_AI_MODEL") ||
        this.DEFAULT_MODELS.google,
      enabled: !!googleKey,
      priority: 3,
    });

    // Mistral
    const mistralKey = this.configService.get<string>("MISTRAL_API_KEY");
    this.providers.set("mistral", {
      provider: "mistral",
      apiKey: mistralKey,
      model:
        this.configService.get<string>("MISTRAL_MODEL") ||
        this.DEFAULT_MODELS.mistral,
      enabled: !!mistralKey,
      priority: 4,
    });

    // Cohere
    const cohereKey = this.configService.get<string>("COHERE_API_KEY");
    this.providers.set("cohere", {
      provider: "cohere",
      apiKey: cohereKey,
      model:
        this.configService.get<string>("COHERE_MODEL") ||
        this.DEFAULT_MODELS.cohere,
      enabled: !!cohereKey,
      priority: 5,
    });

    // Azure OpenAI
    const azureKey = this.configService.get<string>("AZURE_OPENAI_API_KEY");
    const azureEndpoint = this.configService.get<string>(
      "AZURE_OPENAI_ENDPOINT",
    );
    this.providers.set("azure", {
      provider: "azure",
      apiKey: azureKey,
      endpoint: azureEndpoint,
      model:
        this.configService.get<string>("AZURE_OPENAI_DEPLOYMENT") ||
        this.DEFAULT_MODELS.azure,
      enabled: !!(azureKey && azureEndpoint),
      priority: 6,
    });

    // Ollama (local)
    const ollamaEndpoint = this.configService.get<string>("OLLAMA_ENDPOINT");
    this.providers.set("ollama", {
      provider: "ollama",
      endpoint: ollamaEndpoint || "http://localhost:11434",
      model:
        this.configService.get<string>("OLLAMA_MODEL") ||
        this.DEFAULT_MODELS.ollama,
      enabled: !!this.configService.get<string>("OLLAMA_ENABLED"),
      priority: 7,
    });
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): AIProviderConfig[] {
    return Array.from(this.providers.values())
      .filter((p) => p.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get the best available provider
   */
  private getBestProvider(preferred?: AIProvider): AIProviderConfig | null {
    if (preferred) {
      const pref = this.providers.get(preferred);
      if (pref?.enabled) return pref;
    }

    const available = this.getAvailableProviders();
    return available.length > 0 ? available[0] : null;
  }

  /**
   * Generate AI response with enterprise-grade error handling
   */
  async generateResponse(
    prompt: string,
    options: AIGenerationOptions = {},
  ): Promise<AIResponse> {
    const startTime = Date.now();
    const tenantId = options.tenantId || "default";

    try {
      // Input validation
      this.validateInput(prompt, options);

      // Rate limiting check
      if (!this.checkRateLimit(tenantId)) {
        this.logger.warn(`Rate limit exceeded for tenant: ${tenantId}`);
        throw new Error("Rate limit exceeded. Please try again later.");
      }

      // Check circuit breaker
      if (!this.checkCircuitBreaker("ai-service")) {
        this.logger.warn("Circuit breaker is open, using fallback");
        return this.generateSimulatedResponse(prompt);
      }

      // Check cache
      const cacheKey = this.generateCacheKey(prompt, options);
      const cached = this.requestCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        this.logger.debug(
          `Cache hit for prompt: ${prompt.substring(0, 50)}...`,
        );
        return cached.response;
      }

      // Get providers to try (preferred first, then by priority)
      const providersToTry = this.getProvidersToTry(
        options.preferredProvider,
        options.forceProvider,
      );

      if (providersToTry.length === 0) {
        this.logger.warn("No AI providers available, using simulated response");
        return this.generateSimulatedResponse(prompt);
      }

      // Select model based on tier
      const modelTier = options.modelTier || "full";
      const providersWithModels = providersToTry.map((p) => ({
        ...p,
        model:
          modelTier === "lite"
            ? this.LITE_MODELS[p.provider] || p.model
            : p.model || this.DEFAULT_MODELS[p.provider],
      }));

      // Generate response with retry logic and provider fallback
      let lastError: Error | null = null;
      const maxAttempts = options.retries || this.maxRetries;

      for (const provider of providersWithModels) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          try {
            let response: AIResponse;

            switch (provider.provider) {
              case "openai":
                response = await this.generateWithOpenAI(
                  prompt,
                  options,
                  provider,
                );
                break;
              case "anthropic":
                response = await this.generateWithAnthropic(
                  prompt,
                  options,
                  provider,
                );
                break;
              case "google":
                response = await this.generateWithGoogle(
                  prompt,
                  options,
                  provider,
                );
                break;
              case "mistral":
                response = await this.generateWithMistral(
                  prompt,
                  options,
                  provider,
                );
                break;
              case "cohere":
                response = await this.generateWithCohere(
                  prompt,
                  options,
                  provider,
                );
                break;
              case "azure":
                response = await this.generateWithAzure(
                  prompt,
                  options,
                  provider,
                );
                break;
              case "ollama":
                response = await this.generateWithOllama(
                  prompt,
                  options,
                  provider,
                );
                break;
              default:
                throw new Error(`Unsupported provider: ${provider.provider}`);
            }

            // Apply guardrails to prevent hallucinations
            const context = this.guardrails.extractContextFromPrompt(prompt);
            const guardrailResult = this.guardrails.validateResponse(
              response.message,
              context,
              prompt,
            );

            // Sanitize response
            response.message = this.guardrails.sanitizeResponse(
              response.message,
            );

            // Use validated response if available
            if (guardrailResult.validatedResponse) {
              response.message = guardrailResult.validatedResponse;
            }

            // Log guardrail results
            if (
              guardrailResult.warnings.length > 0 ||
              guardrailResult.errors.length > 0
            ) {
              this.logger.warn(
                `Guardrail issues detected for tenant ${tenantId}: ` +
                  `Confidence: ${guardrailResult.confidence}%, ` +
                  `Warnings: ${guardrailResult.warnings.length}, ` +
                  `Errors: ${guardrailResult.errors.length}`,
              );

              if (guardrailResult.errors.length > 0) {
                this.logger.error(
                  `Guardrail errors: ${guardrailResult.errors.join("; ")}`,
                );
              }
              if (guardrailResult.warnings.length > 0) {
                this.logger.warn(
                  `Guardrail warnings: ${guardrailResult.warnings.join("; ")}`,
                );
              }
            }

            // Reject response if guardrails failed
            if (!guardrailResult.passed) {
              this.logger.error(
                `Response failed guardrails for tenant ${tenantId}. Confidence: ${guardrailResult.confidence}%`,
              );
              throw new Error(
                `Response validation failed. Confidence: ${guardrailResult.confidence}%. ` +
                  `Errors: ${guardrailResult.errors.join("; ")}`,
              );
            }

            // Track token usage
            if (response.tokensUsed) {
              this.trackTokenUsage(tenantId, response.tokensUsed.total);
            }

            // Record success
            this.recordSuccess(`ai-${provider.provider}`);

            // Cache response
            response.latency = Date.now() - startTime;
            response.provider = provider.provider;
            response.model = provider.model;
            this.requestCache.set(cacheKey, {
              response,
              expiresAt: Date.now() + this.CACHE_TTL_MS,
            });

            // Log metrics
            this.logger.log(
              `AI response generated via ${provider.provider}/${provider.model} ` +
                `in ${response.latency}ms for tenant: ${tenantId} ` +
                `(Confidence: ${guardrailResult.confidence}%)`,
            );

            return response;
          } catch (error) {
            lastError =
              error instanceof Error ? error : new Error(String(error));
            this.logger.warn(
              `${provider.provider} attempt ${attempt + 1}/${maxAttempts} failed: ${lastError.message}`,
            );

            if (attempt < maxAttempts - 1) {
              // Exponential backoff
              const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
              await this.sleep(delay);
            }
          }
        }

        // Record failure for this provider
        this.recordFailure(`ai-${provider.provider}`);
        this.logger.warn(
          `All attempts failed for ${provider.provider}, trying next provider...`,
        );
      }

      // All providers and retries failed
      this.logger.error(
        `All providers failed. Last error: ${lastError?.message}`,
      );

      // Fallback to simulated response
      return this.generateSimulatedResponse(prompt);
    } catch (error) {
      this.logger.error(
        `Error generating AI response: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Validate input parameters
   */
  private validateInput(prompt: string, options: AIGenerationOptions): void {
    if (!prompt || typeof prompt !== "string") {
      throw new Error("Prompt must be a non-empty string");
    }

    if (prompt.length > 10000) {
      throw new Error("Prompt exceeds maximum length of 10,000 characters");
    }

    if (
      options.maxTokens &&
      (options.maxTokens < 1 || options.maxTokens > this.maxTokensPerRequest)
    ) {
      throw new Error(
        `maxTokens must be between 1 and ${this.maxTokensPerRequest}`,
      );
    }

    if (
      options.temperature &&
      (options.temperature < 0 || options.temperature > 2)
    ) {
      throw new Error("Temperature must be between 0 and 2");
    }

    // Sanitize prompt (remove potential injection attempts)
    if (this.containsSuspiciousContent(prompt)) {
      this.logger.warn("Suspicious content detected in prompt");
      throw new Error("Invalid input detected");
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

    return suspiciousPatterns.some((pattern) => pattern.test(prompt));
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
      state: "closed" as const,
    };

    if (breaker.state === "open") {
      const timeSinceLastFailure = Date.now() - breaker.lastFailureTime;
      if (timeSinceLastFailure > this.CIRCUIT_BREAKER_RESET_TIMEOUT) {
        breaker.state = "half-open";
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
      breaker.state = "closed";
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
      state: "closed" as const,
    };

    breaker.failures++;
    breaker.lastFailureTime = Date.now();

    if (breaker.failures >= this.CIRCUIT_BREAKER_FAILURE_THRESHOLD) {
      breaker.state = "open";
      this.logger.warn(
        `Circuit breaker opened for ${service} after ${breaker.failures} failures`,
      );
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
      this.logger.warn(
        `High token usage for tenant ${tenantId}: ${usage.total} tokens`,
      );
    }
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(
    prompt: string,
    options: AIGenerationOptions,
  ): string {
    const key = `${prompt.substring(0, 100)}_${options.temperature || 0.7}_${options.maxTokens || 2000}`;
    return Buffer.from(key).toString("base64").substring(0, 50);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get ordered list of providers to try
   */
  private getProvidersToTry(
    preferred?: AIProvider,
    forceProvider?: boolean,
  ): AIProviderConfig[] {
    const available = this.getAvailableProviders();

    if (preferred && forceProvider) {
      const pref = this.providers.get(preferred);
      return pref?.enabled ? [pref] : [];
    }

    if (preferred) {
      const pref = this.providers.get(preferred);
      if (pref?.enabled) {
        return [pref, ...available.filter((p) => p.provider !== preferred)];
      }
    }

    return available;
  }

  /**
   * Generate response with OpenAI
   */
  private async generateWithOpenAI(
    prompt: string,
    options: AIGenerationOptions,
    config: AIProviderConfig,
  ): Promise<AIResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options.timeout || this.requestTimeout,
    );

    try {
      const { default: fetch } = await import("node-fetch");

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model || this.DEFAULT_MODELS.openai,
            messages: [
              {
                role: "system",
                content:
                  "You are James, an expert AI strategic advisor specializing in cashflow management and executive strategic planning.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: options.temperature || 0.7,
            max_tokens: Math.min(
              options.maxTokens || 2000,
              this.maxTokensPerRequest,
            ),
            stream: options.stream || false,
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || response.statusText;

        // Handle specific error codes
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        } else if (response.status === 401) {
          throw new Error("Invalid API key");
        } else if (response.status >= 500) {
          throw new Error("AI service temporarily unavailable");
        }

        throw new Error(`OpenAI API error: ${errorMessage}`);
      }

      const data = await response.json();
      const message = data.choices[0]?.message?.content || "";
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
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout");
      }
      throw error;
    }
  }

  /**
   * Generate response with Anthropic
   */
  private async generateWithAnthropic(
    prompt: string,
    options: AIGenerationOptions,
    config: AIProviderConfig,
  ): Promise<AIResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options.timeout || this.requestTimeout,
    );

    try {
      const { default: fetch } = await import("node-fetch");

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.model || this.DEFAULT_MODELS.anthropic,
          max_tokens: Math.min(
            options.maxTokens || 2000,
            this.maxTokensPerRequest,
          ),
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          system:
            "You are James, an expert AI strategic advisor specializing in cashflow management and executive strategic planning.",
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || response.statusText;

        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        } else if (response.status === 401) {
          throw new Error("Invalid API key");
        } else if (response.status >= 500) {
          throw new Error("AI service temporarily unavailable");
        }

        throw new Error(`Anthropic API error: ${errorMessage}`);
      }

      const data = await response.json();
      const message = data.content[0]?.text || "";
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
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout");
      }
      throw error;
    }
  }

  /**
   * Generate response with Google Gemini
   */
  private async generateWithGoogle(
    prompt: string,
    options: AIGenerationOptions,
    config: AIProviderConfig,
  ): Promise<AIResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options.timeout || this.requestTimeout,
    );

    try {
      const { default: fetch } = await import("node-fetch");
      const model = config.model || this.DEFAULT_MODELS.google;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `You are James, an expert AI strategic advisor specializing in cashflow management and executive strategic planning.\n\n${prompt}`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: options.temperature || 0.7,
              maxOutputTokens: Math.min(
                options.maxTokens || 2000,
                this.maxTokensPerRequest,
              ),
            },
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Google AI API error: ${errorData.error?.message || response.statusText}`,
        );
      }

      const data = await response.json();
      const message = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const usage = data.usageMetadata || {};

      const parsed = this.parseStructuredResponse(message);

      return {
        message,
        ...parsed,
        tokensUsed: {
          prompt: usage.promptTokenCount || 0,
          completion: usage.candidatesTokenCount || 0,
          total: usage.totalTokenCount || 0,
        },
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout");
      }
      throw error;
    }
  }

  /**
   * Generate response with Mistral AI
   */
  private async generateWithMistral(
    prompt: string,
    options: AIGenerationOptions,
    config: AIProviderConfig,
  ): Promise<AIResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options.timeout || this.requestTimeout,
    );

    try {
      const { default: fetch } = await import("node-fetch");

      const response = await fetch(
        "https://api.mistral.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model || this.DEFAULT_MODELS.mistral,
            messages: [
              {
                role: "system",
                content:
                  "You are James, an expert AI strategic advisor specializing in cashflow management and executive strategic planning.",
              },
              { role: "user", content: prompt },
            ],
            temperature: options.temperature || 0.7,
            max_tokens: Math.min(
              options.maxTokens || 2000,
              this.maxTokensPerRequest,
            ),
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Mistral API error: ${errorData.message || response.statusText}`,
        );
      }

      const data = await response.json();
      const message = data.choices?.[0]?.message?.content || "";
      const usage = data.usage || {};

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
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout");
      }
      throw error;
    }
  }

  /**
   * Generate response with Cohere
   */
  private async generateWithCohere(
    prompt: string,
    options: AIGenerationOptions,
    config: AIProviderConfig,
  ): Promise<AIResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options.timeout || this.requestTimeout,
    );

    try {
      const { default: fetch } = await import("node-fetch");

      const response = await fetch("https://api.cohere.ai/v1/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model || this.DEFAULT_MODELS.cohere,
          message: prompt,
          preamble:
            "You are James, an expert AI strategic advisor specializing in cashflow management and executive strategic planning.",
          temperature: options.temperature || 0.7,
          max_tokens: Math.min(
            options.maxTokens || 2000,
            this.maxTokensPerRequest,
          ),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Cohere API error: ${errorData.message || response.statusText}`,
        );
      }

      const data = await response.json();
      const message = data.text || "";
      const usage = data.meta?.tokens || {};

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
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout");
      }
      throw error;
    }
  }

  /**
   * Generate response with Azure OpenAI
   */
  private async generateWithAzure(
    prompt: string,
    options: AIGenerationOptions,
    config: AIProviderConfig,
  ): Promise<AIResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options.timeout || this.requestTimeout,
    );

    try {
      const { default: fetch } = await import("node-fetch");
      const deployment = config.model || this.DEFAULT_MODELS.azure;

      const response = await fetch(
        `${config.endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-01`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": config.apiKey!,
          },
          body: JSON.stringify({
            messages: [
              {
                role: "system",
                content:
                  "You are James, an expert AI strategic advisor specializing in cashflow management and executive strategic planning.",
              },
              { role: "user", content: prompt },
            ],
            temperature: options.temperature || 0.7,
            max_tokens: Math.min(
              options.maxTokens || 2000,
              this.maxTokensPerRequest,
            ),
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Azure OpenAI API error: ${errorData.error?.message || response.statusText}`,
        );
      }

      const data = await response.json();
      const message = data.choices?.[0]?.message?.content || "";
      const usage = data.usage || {};

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
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout");
      }
      throw error;
    }
  }

  /**
   * Generate response with Ollama (local)
   */
  private async generateWithOllama(
    prompt: string,
    options: AIGenerationOptions,
    config: AIProviderConfig,
  ): Promise<AIResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options.timeout || this.requestTimeout,
    );

    try {
      const { default: fetch } = await import("node-fetch");
      const endpoint = config.endpoint || "http://localhost:11434";

      const response = await fetch(`${endpoint}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.model || this.DEFAULT_MODELS.ollama,
          messages: [
            {
              role: "system",
              content:
                "You are James, an expert AI strategic advisor specializing in cashflow management and executive strategic planning.",
            },
            { role: "user", content: prompt },
          ],
          stream: false,
          options: {
            temperature: options.temperature || 0.7,
            num_predict: Math.min(
              options.maxTokens || 2000,
              this.maxTokensPerRequest,
            ),
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Ollama API error: ${errorData.error || response.statusText}`,
        );
      }

      const data = await response.json();
      const message = data.message?.content || "";

      const parsed = this.parseStructuredResponse(message);

      return {
        message,
        ...parsed,
        tokensUsed: {
          prompt: data.prompt_eval_count || 0,
          completion: data.eval_count || 0,
          total: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout");
      }
      throw error;
    }
  }

  /**
   * Parse structured response with validation
   */
  private parseStructuredResponse(message: string): {
    initiatives?: any[];
    okrs?: any[];
  } {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch =
        message.match(/```json\s*([\s\S]*?)\s*```/) ||
        message.match(/```\s*([\s\S]*?)\s*```/);
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
        if (parsed.initiatives)
          return { initiatives: this.validateInitiatives(parsed.initiatives) };
        if (parsed.okrs) return { okrs: this.validateOKRs(parsed.okrs) };
        if (parsed.objective) return { okrs: this.validateOKRs([parsed]) };
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name) {
          return { initiatives: this.validateInitiatives(parsed) };
        }
      }
    } catch (error) {
      this.logger.warn(
        `Failed to parse structured response: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {};
  }

  /**
   * Validate and sanitize initiatives
   */
  private validateInitiatives(initiatives: any[]): any[] {
    return initiatives
      .filter((init) => init && typeof init === "object")
      .slice(0, 10) // Limit to 10 initiatives
      .map((init) => ({
        name: String(init.name || init.nameEn || "New Initiative").substring(
          0,
          200,
        ),
        nameEn: String(init.nameEn || init.name || "New Initiative").substring(
          0,
          200,
        ),
        category: [
          "growth",
          "operations",
          "product",
          "people",
          "infrastructure",
        ].includes(init.category)
          ? init.category
          : "operations",
        description: String(init.description || "").substring(0, 1000),
        startDate: this.validateDate(init.startDate),
        endDate: this.validateDate(init.endDate),
        cashImpact: {
          type: ["one_time", "recurring"].includes(init.cashImpact?.type)
            ? init.cashImpact.type
            : "one_time",
          amount: this.validateNumber(
            init.cashImpact?.amount,
            -10000000,
            10000000,
          ),
          frequency: ["monthly", "quarterly", "annual"].includes(
            init.cashImpact?.frequency,
          )
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
      .filter((okr) => okr && typeof okr === "object")
      .slice(0, 5) // Limit to 5 OKRs
      .map((okr) => ({
        objective: String(okr.objective || okr.objectiveEn || "").substring(
          0,
          500,
        ),
        objectiveEn: String(okr.objectiveEn || okr.objective || "").substring(
          0,
          500,
        ),
        quarter: ["Q1", "Q2", "Q3", "Q4"].includes(okr.quarter)
          ? okr.quarter
          : "Q1",
        year: this.validateNumber(
          okr.year,
          2020,
          2100,
          new Date().getFullYear(),
        ),
        keyResults: (okr.keyResults || [])
          .slice(0, 10) // Limit to 10 key results per OKR
          .map((kr: any) => ({
            description: String(
              kr.description || kr.descriptionEn || "",
            ).substring(0, 500),
            descriptionEn: String(
              kr.descriptionEn || kr.description || "",
            ).substring(0, 500),
            targetValue: this.validateNumber(
              kr.targetValue,
              -1000000000,
              1000000000,
            ),
            unit: String(kr.unit || "number").substring(0, 50),
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
    return isNaN(date.getTime())
      ? new Date().toISOString()
      : date.toISOString();
  }

  /**
   * Validate number within range
   */
  private validateNumber(
    value: any,
    min: number,
    max: number,
    defaultValue?: number,
  ): number {
    const num =
      typeof value === "number"
        ? value
        : parseFloat(String(value || defaultValue || 0));
    if (isNaN(num)) return defaultValue || 0;
    return Math.max(min, Math.min(max, num));
  }

  /**
   * Generate simulated response for development/fallback
   */
  private generateSimulatedResponse(prompt: string): AIResponse {
    const lowerPrompt = prompt.toLowerCase();

    // Handle hiring/budget questions
    if (
      lowerPrompt.includes("hire") ||
      lowerPrompt.includes("budget") ||
      lowerPrompt.includes("designer") ||
      lowerPrompt.includes("developer") ||
      lowerPrompt.includes("employee")
    ) {
      const role = lowerPrompt.includes("designer")
        ? "designer"
        : lowerPrompt.includes("developer")
          ? "developer"
          : "new team member";
      const avgSalary =
        role === "designer" ? 85000 : role === "developer" ? 120000 : 95000;
      const monthlyCost = Math.round(avgSalary / 12);

      return {
        message: `## Hiring Analysis: ${role.charAt(0).toUpperCase() + role.slice(1)}

Based on your current financial position, here's my assessment:

### Current Financial Status
- **Cash Position**: $850K
- **Monthly Burn Rate**: $25K
- **Runway**: ~34 months

### Hiring Impact Analysis
A ${role} would typically cost:
- **Annual Salary**: $${avgSalary.toLocaleString()} (market rate)
- **Monthly Cost**: ~$${monthlyCost.toLocaleString()} (with benefits/overhead)

### Recommendation: ✅ **Proceed with Caution**

With 34 months of runway and a healthy cash position, you **can afford** to hire a ${role}. However, I recommend:

1. **Start with a contract role** (3-6 months) to validate the need
2. **Set clear milestones** tied to revenue or product goals
3. **Monitor impact** on burn rate monthly

### Impact on Runway
- New burn rate: ~$${(25000 + monthlyCost).toLocaleString()}/month
- Adjusted runway: ~${Math.floor(850000 / (25000 + monthlyCost))} months

Would you like me to create an initiative to track this hiring decision?`,
      };
    }

    // Handle runway/burn rate questions
    if (
      lowerPrompt.includes("runway") ||
      lowerPrompt.includes("burn") ||
      lowerPrompt.includes("how long")
    ) {
      return {
        message: `## Runway & Burn Rate Analysis

### Current Status
| Metric | Value |
|--------|-------|
| **Cash Position** | $850,000 |
| **Monthly Revenue** | $120,000 |
| **Monthly Expenses** | $145,000 |
| **Net Burn Rate** | $25,000/month |
| **Gross Burn Rate** | $145,000/month |
| **Runway** | ~34 months |

### Key Insights

1. **Healthy Runway**: 34 months provides ample time for strategic planning and growth initiatives.

2. **Burn Rate Breakdown**:
   - Personnel: ~60% ($87K)
   - Infrastructure: ~20% ($29K)
   - Marketing: ~12% ($17K)
   - Other: ~8% ($12K)

3. **Path to Profitability**: You need to increase revenue by $25K/month (~21%) to break even.

### Recommendations
- ✅ Focus on revenue growth over cost cutting
- ✅ Consider strategic investments while runway is healthy
- ⚠️ Set alerts at 12 months runway

Would you like me to generate initiatives to extend your runway or accelerate revenue?`,
      };
    }

    // Handle cost reduction questions
    if (
      lowerPrompt.includes("reduce") ||
      lowerPrompt.includes("cost") ||
      lowerPrompt.includes("save") ||
      lowerPrompt.includes("cut")
    ) {
      return {
        message: `## Cost Optimization Strategies

Based on your current $145K monthly expenses, here are targeted reduction opportunities:

### Quick Wins (1-2 months)
| Category | Potential Savings | Action |
|----------|------------------|--------|
| Cloud Infrastructure | $3-5K/mo | Right-size instances, reserved pricing |
| SaaS Subscriptions | $2-3K/mo | Audit and consolidate tools |
| Marketing Spend | $5K/mo | Focus on highest-ROI channels |

### Medium-term (3-6 months)
1. **Renegotiate vendor contracts** - 10-15% savings potential
2. **Implement hybrid work** - Reduce office costs by 30%
3. **Automate manual processes** - Save 1 FTE equivalent

### Total Potential Impact
- **Realistic savings**: $10-15K/month
- **Extended runway**: +6-10 months

Would you like me to create initiatives for specific cost reduction areas?`,
      };
    }

    // Handle initiative generation
    if (
      lowerPrompt.includes("initiative") ||
      lowerPrompt.includes("generate initiative")
    ) {
      return {
        message:
          "I've generated strategic initiatives based on your goals. These initiatives are designed to improve your cash position while advancing your strategic objectives.",
        initiatives: [
          {
            name: "Revenue Optimization",
            nameEn: "Revenue Optimization",
            category: "growth",
            description:
              "Focus on optimizing existing revenue streams and identifying quick wins.",
            startDate: new Date().toISOString(),
            endDate: new Date(
              Date.now() + 90 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            cashImpact: {
              type: "recurring",
              amount: 50000,
              frequency: "monthly",
            },
            confidence: 75,
          },
        ],
      };
    }

    // Handle OKR generation
    if (lowerPrompt.includes("okr") || lowerPrompt.includes("objective")) {
      return {
        message:
          "I've created OKRs aligned with your strategic initiatives. These objectives are measurable and tied to your quarterly goals.",
        okrs: [
          {
            objective: "Extend Cash Runway",
            objectiveEn: "Extend Cash Runway",
            quarter: "Q1",
            year: new Date().getFullYear(),
            keyResults: [
              {
                description: "Reduce monthly burn rate by 20%",
                descriptionEn: "Reduce monthly burn rate by 20%",
                targetValue: 20,
                unit: "percentage",
                dueDate: new Date(
                  Date.now() + 90 * 24 * 60 * 60 * 1000,
                ).toISOString(),
                confidence: 75,
              },
            ],
          },
        ],
      };
    }

    // Handle revenue questions
    if (
      lowerPrompt.includes("revenue") ||
      lowerPrompt.includes("grow") ||
      lowerPrompt.includes("increase")
    ) {
      return {
        message: `## Revenue Growth Strategies

### Current State
- Monthly Revenue: $120K
- Growth needed for breakeven: +$25K (+21%)

### High-Impact Opportunities

**1. Customer Expansion (Est. +$15K/mo)**
- Upsell existing customers to higher tiers
- Launch add-on services
- Implementation time: 1-2 months

**2. Pricing Optimization (Est. +$8K/mo)**
- A/B test pricing tiers
- Introduce annual plans with discounts
- Expected conversion: 15-20% lift

**3. New Market Segments (Est. +$20K/mo)**
- Target adjacent industries
- Partner channel development
- Timeline: 3-6 months

### Recommended Priority
Start with customer expansion - lowest risk, fastest ROI.

Shall I create specific initiatives for any of these strategies?`,
      };
    }

    // Default response
    return {
      message: `## Strategic Overview

Based on your current financial position, here's my assessment:

### Financial Health
- **Cash**: $850K ✅ Healthy
- **Runway**: 34 months ✅ Strong
- **Burn Rate**: $25K/month ⚠️ Monitor

### Top 3 Recommendations

1. **Optimize for Growth**
   With 34 months runway, you can afford to invest in growth initiatives while maintaining financial discipline.

2. **Revenue Focus**
   Prioritize revenue acceleration over cost cutting. A 21% revenue increase achieves profitability.

3. **Strategic Hiring**
   Consider key hires that directly impact revenue (sales, product) rather than support roles.

### What Would You Like to Explore?
- 💼 Hiring decisions and budget impact
- 📊 Runway and burn rate analysis
- 📈 Revenue growth strategies
- 💰 Cost optimization opportunities
- 🎯 Generate OKRs or initiatives

Just ask about any of these topics!`,
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
