/**
 * SageMakerIntelligenceAdapter Integration Tests
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { SageMakerIntelligenceAdapter } from "../adapters/sagemaker.adapter";
import {
  IntelligenceRequest,
  DecisionContext,
} from "@application/ports/outbound/IIntelligenceEngine";
import { Money } from "@domain/value-objects/Money";

// Mock AWS SDK
jest.mock("@aws-sdk/client-sagemaker-runtime", () => ({
  SageMakerRuntimeClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  InvokeEndpointCommand: jest.fn(),
}));

describe("SageMakerIntelligenceAdapter", () => {
  let adapter: SageMakerIntelligenceAdapter;
  let mockSagemakerClient: any;

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
    const { SageMakerRuntimeClient } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("@aws-sdk/client-sagemaker-runtime");
    mockSagemakerClient = {
      send: jest.fn(),
    };
    SageMakerRuntimeClient.mockImplementation(() => mockSagemakerClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SageMakerIntelligenceAdapter,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "AWS_REGION") return "ca-central-1";
              if (key === "SAGEMAKER_ENDPOINT_NAME") return "test-endpoint";
              return null;
            }),
          },
        },
      ],
    }).compile();

    adapter = module.get<SageMakerIntelligenceAdapter>(
      SageMakerIntelligenceAdapter,
    );
  });

  it("should invoke endpoint for inference", async () => {
    mockSagemakerClient.send.mockResolvedValueOnce({
      Body: Buffer.from(
        JSON.stringify({
          recommendation: "Reduce food costs by 5%",
          confidence: 0.89,
          success_probability: 85,
          expected_outcome: 5000,
          time_to_result: "2-4 weeks",
          context: "Test context",
        }),
      ),
    });

    const request: IntelligenceRequest = {
      type: "quick_suggestion",
      context: mockContext,
    };

    const result = await adapter.generateInsight(request);

    expect(result.recommendation).toBe("Reduce food costs by 5%");
    expect(result.confidence).toBe("high"); // 0.89 >= 0.8
    expect(result.successProbability).toBe(85);
    expect(mockSagemakerClient.send).toHaveBeenCalled();
  });

  it("should handle endpoint timeout gracefully", async () => {
    mockSagemakerClient.send.mockRejectedValueOnce(
      new Error("Endpoint timeout"),
    );

    const request: IntelligenceRequest = {
      type: "quick_suggestion",
      context: mockContext,
    };

    await expect(adapter.generateInsight(request)).rejects.toThrow();
  });

  it("should map confidence levels correctly", async () => {
    // Test high confidence
    mockSagemakerClient.send.mockResolvedValueOnce({
      Body: Buffer.from(
        JSON.stringify({
          recommendation: "Test",
          confidence: 0.9,
        }),
      ),
    });

    const result1 = await adapter.generateInsight({
      type: "quick_suggestion",
      context: mockContext,
    });
    expect(result1.confidence).toBe("high");

    // Test medium confidence
    mockSagemakerClient.send.mockResolvedValueOnce({
      Body: Buffer.from(
        JSON.stringify({
          recommendation: "Test",
          confidence: 0.7,
        }),
      ),
    });

    const result2 = await adapter.generateInsight({
      type: "quick_suggestion",
      context: mockContext,
    });
    expect(result2.confidence).toBe("medium");

    // Test low confidence
    mockSagemakerClient.send.mockResolvedValueOnce({
      Body: Buffer.from(
        JSON.stringify({
          recommendation: "Test",
          confidence: 0.5,
        }),
      ),
    });

    const result3 = await adapter.generateInsight({
      type: "quick_suggestion",
      context: mockContext,
    });
    expect(result3.confidence).toBe("low");
  });

  it("should handle string confidence values", async () => {
    mockSagemakerClient.send.mockResolvedValueOnce({
      Body: Buffer.from(
        JSON.stringify({
          recommendation: "Test",
          confidence: "high",
        }),
      ),
    });

    const result = await adapter.generateInsight({
      type: "quick_suggestion",
      context: mockContext,
    });

    expect(result.confidence).toBe("high");
  });

  it("should throw error when endpoint not configured", async () => {
    const moduleWithoutConfig: TestingModule = await Test.createTestingModule({
      providers: [
        SageMakerIntelligenceAdapter,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => null),
          },
        },
      ],
    }).compile();

    const adapterWithoutConfig =
      moduleWithoutConfig.get<SageMakerIntelligenceAdapter>(
        SageMakerIntelligenceAdapter,
      );

    await expect(
      adapterWithoutConfig.generateInsight({
        type: "quick_suggestion",
        context: mockContext,
      }),
    ).rejects.toThrow("SageMaker endpoint not configured");
  });
});
