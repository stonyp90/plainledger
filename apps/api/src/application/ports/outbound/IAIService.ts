/**
 * Port (Interface) for AI Service
 * Defines the contract for AI/LLM operations
 */

import {
  AIResponse,
  AIGenerationOptions,
  AIProviderConfig,
} from "@infrastructure/ai/ai.service";

export interface IAIService {
  /**
   * Generate AI response from a prompt
   */
  generateResponse(
    prompt: string,
    options?: AIGenerationOptions,
  ): Promise<AIResponse>;

  /**
   * Get list of available AI providers
   */
  getAvailableProviders(): AIProviderConfig[];
}
