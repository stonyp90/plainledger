/**
 * BedrockIntelligenceAdapter Integration Tests
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { BedrockIntelligenceAdapter } from "../adapters/bedrock.adapter";
import {
  IntelligenceRequest,
  DecisionContext,
} from "@application/ports/outbound/IIntelligenceEngine";
import { IndustryPattern } from "@domain/IndustryPattern";
import { Money } from "@domain/value-objects/Money";

// Mock AWS SDK
jest.mock("@aws-sdk/client-bedrock-agent-runtime", () => ({
  BedrockAgentRuntimeClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  RetrieveCommand: jest.fn(),
}));

describe("BedrockIntelligenceAdapter", () => {
  let adapter: BedrockIntelligenceAdapter;
  let mockBedrockClient: any;

  const mockContext: DecisionContext = {
    organizationId: "test-org-123",
    industry: "restaurant",
    businessSize: "small",
    trigger: {
      metric: "food_cost",
      currentValue: Money.create(35000),
      benchmarkValue: Money.create(30000),
      gapPercentage: 16.7,
    },
  };

  beforeEach(async () => {
    const { BedrockAgentRuntimeClient } =
       
      require("@aws-sdk/client-bedrock-agent-runtime");
    mockBedrockClient = {
      send: jest.fn(),
    };
    BedrockAgentRuntimeClient.mockImplementation(() => mockBedrockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BedrockIntelligenceAdapter,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "AWS_REGION") return "ca-central-1";
              if (key === "BEDROCK_KNOWLEDGE_BASE_ID") return "test-kb-id";
              return null;
            }),
          },
        },
      ],
    }).compile();

    adapter = module.get<BedrockIntelligenceAdapter>(
      BedrockIntelligenceAdapter,
    );
  });

  it("should query knowledge base for patterns", async () => {
    mockBedrockClient.send.mockResolvedValueOnce({
      retrievalResults: [
        {
          content: {
            text: JSON.stringify({
              industry: "restaurant",
              triggerCondition: {
                metric: "food_cost",
                threshold: { operator: "above", value: 35 },
                industry: "restaurant",
              },
              sampleSize: 50,
              commonActions: [
                {
                  action: "reduce_costs",
                  frequency: 50,
                  percentage: 100,
                  avgExpectedImpact: { amount: 5000, currency: "CAD" },
                },
              ],
              successRates: {
                overallSuccessRate: 85,
                byAction: {
                  reduce_costs: 85,
                  increase_prices: 0,
                  optimize_inventory: 0,
                  improve_margins: 0,
                  expand_capacity: 0,
                  reduce_headcount: 0,
                  increase_marketing: 0,
                  renegotiate_contracts: 0,
                  other: 0,
                },
                avgVariance: 10,
              },
              topPerformers: {
                topActions: ["reduce_costs"],
                avgImpact: { amount: 5000, currency: "CAD" },
                successRate: 85,
                sampleSize: 50,
              },
              statisticalSignificance: 0.9,
              lastUpdated: new Date().toISOString(),
            }),
          },
          score: 0.95,
        },
      ],
    });

    const patterns = await adapter.queryPatterns(mockContext);

    expect(patterns).toHaveLength(1);
    expect(mockBedrockClient.send).toHaveBeenCalled();
  });

  it("should generate insight with RAG context", async () => {
    mockBedrockClient.send.mockResolvedValueOnce({
      retrievalResults: [
        {
          content: {
            text: JSON.stringify({
              industry: "restaurant",
              triggerCondition: {
                metric: "food_cost",
                threshold: { operator: "above", value: 35 },
                industry: "restaurant",
              },
              sampleSize: 50,
              commonActions: [
                {
                  action: "reduce_costs",
                  frequency: 50,
                  percentage: 100,
                  avgExpectedImpact: { amount: 5000, currency: "CAD" },
                },
              ],
              successRates: {
                overallSuccessRate: 85,
                byAction: {
                  reduce_costs: 85,
                  increase_prices: 0,
                  optimize_inventory: 0,
                  improve_margins: 0,
                  expand_capacity: 0,
                  reduce_headcount: 0,
                  increase_marketing: 0,
                  renegotiate_contracts: 0,
                  other: 0,
                },
                avgVariance: 10,
              },
              topPerformers: {
                topActions: ["reduce_costs"],
                avgImpact: { amount: 5000, currency: "CAD" },
                successRate: 85,
                sampleSize: 50,
              },
              statisticalSignificance: 0.9,
              lastUpdated: new Date().toISOString(),
            }),
          },
          score: 0.95,
        },
      ],
    });

    const request: IntelligenceRequest = {
      type: "quick_suggestion",
      context: mockContext,
    };

    const result = await adapter.generateInsight(request);

    expect(result.recommendation).toBeDefined();
    expect(result.supportingPatterns.length).toBeGreaterThan(0);
  });

  it("should handle knowledge base not found", async () => {
    mockBedrockClient.send.mockRejectedValueOnce(
      new Error("Knowledge base not found"),
    );

    await expect(adapter.queryPatterns(mockContext)).rejects.toThrow();
  });
});
