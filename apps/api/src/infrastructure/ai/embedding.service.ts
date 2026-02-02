import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";

/**
 * Embedding Service
 * Generates vector embeddings using OpenAI's text-embedding-3-small model
 * for semantic search and similarity matching
 */
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly openai: OpenAI | null = null;
  private readonly model = "text-embedding-3-small";
  private readonly dimensions = 1536;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>("OPENAI_API_KEY");
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.logger.log("OpenAI EmbeddingService initialized");
    } else {
      this.logger.warn(
        "OPENAI_API_KEY not configured, embedding generation disabled",
      );
    }
  }

  /**
   * Check if embedding service is available
   */
  isAvailable(): boolean {
    return this.openai !== null;
  }

  /**
   * Generate embedding for a single text
   * @param text Text to generate embedding for
   * @returns Vector embedding as number array (1536 dimensions)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured");
    }

    if (!text || text.trim().length === 0) {
      throw new Error("Text cannot be empty");
    }

    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text.trim(),
        dimensions: this.dimensions,
      });

      return response.data[0].embedding;
    } catch (error) {
      this.logger.error(`Failed to generate embedding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   * @param texts Array of texts to generate embeddings for
   * @returns Array of vector embeddings
   */
  async batchGenerateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured");
    }

    if (texts.length === 0) {
      return [];
    }

    // Filter out empty texts
    const validTexts = texts.filter((text) => text && text.trim().length > 0);
    if (validTexts.length === 0) {
      throw new Error("No valid texts provided");
    }

    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: validTexts.map((text) => text.trim()),
        dimensions: this.dimensions,
      });

      return response.data.map(
        (item: { embedding: number[] }) => item.embedding,
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate batch embeddings: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Generate embedding text representation for an account
   * Combines account name, type, and code into a searchable string
   */
  generateAccountEmbeddingText(
    name: string,
    accountType: string,
    code?: string,
  ): string {
    const parts = [name];
    if (code) {
      parts.push(`Code: ${code}`);
    }
    parts.push(`Type: ${accountType}`);
    return parts.join(" | ");
  }

  /**
   * Generate embedding text representation for a transaction
   * Combines description, memo, and reference number
   */
  generateTransactionEmbeddingText(
    description: string,
    memo?: string,
    referenceNumber?: string,
  ): string {
    const parts = [description];
    if (memo) {
      parts.push(`Memo: ${memo}`);
    }
    if (referenceNumber) {
      parts.push(`Ref: ${referenceNumber}`);
    }
    return parts.join(" | ");
  }

  /**
   * Convert embedding array to PostgreSQL vector string format
   */
  embeddingToVectorString(embedding: number[]): string {
    return `[${embedding.join(",")}]`;
  }

  /**
   * Parse PostgreSQL vector string to embedding array
   */
  vectorStringToEmbedding(vectorString: string): number[] {
    // Remove brackets and split by comma
    const cleaned = vectorString.replace(/[\[\]]/g, "");
    return cleaned.split(",").map((val) => parseFloat(val.trim()));
  }
}
