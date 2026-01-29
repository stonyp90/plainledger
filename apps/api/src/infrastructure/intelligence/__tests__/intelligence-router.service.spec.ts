/**
 * IntelligenceRouterService Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { IntelligenceRouterService } from '../intelligence-router.service';
import { APIIntelligenceAdapter } from '../adapters/api.adapter';
import { BedrockIntelligenceAdapter } from '../adapters/bedrock.adapter';
import { SageMakerIntelligenceAdapter } from '../adapters/sagemaker.adapter';
import { IntelligenceRequest, DecisionContext } from '@application/ports/outbound/IIntelligenceEngine';
import { IntelligenceRecommendation } from '../../../../../web/src/domain/IntelligenceRecommendation';
import { Money } from '../../../../../web/src/domain/value-objects/Money';

describe('IntelligenceRouterService', () => {
  let router: IntelligenceRouterService;
  let mockApiAdapter: jest.Mocked<APIIntelligenceAdapter>;
  let mockBedrockAdapter: jest.Mocked<BedrockIntelligenceAdapter>;
  let mockSagemakerAdapter: jest.Mocked<SageMakerIntelligenceAdapter>;

  const mockContext: DecisionContext = {
    industry: 'restaurant',
    businessSize: 'small',
    trigger: {
      metric: 'food_cost',
      currentValue: Money.create(35000),
      benchmarkValue: Money.create(30000),
      gapPercentage: 16.7,
    },
  };

  const mockRecommendation = IntelligenceRecommendation.create({
    context: 'Test context',
    recommendation: 'Test recommendation',
    supportingPatterns: [],
    similarDecisions: [],
    confidence: 'high',
    sampleSize: 10,
    successProbability: 85,
    expectedOutcome: Money.create(5000),
    timeToResult: '2-4 weeks',
  });

  beforeEach(async () => {
    // Create mocks
    mockApiAdapter = {
      generateInsight: jest.fn().mockResolvedValue(mockRecommendation),
      queryPatterns: jest.fn(),
      findSimilarDecisions: jest.fn(),
    } as any;

    mockBedrockAdapter = {
      generateInsight: jest.fn().mockResolvedValue(mockRecommendation),
      queryPatterns: jest.fn().mockResolvedValue([]),
      findSimilarDecisions: jest.fn(),
    } as any;

    mockSagemakerAdapter = {
      generateInsight: jest.fn().mockResolvedValue(mockRecommendation),
      queryPatterns: jest.fn(),
      findSimilarDecisions: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntelligenceRouterService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'NODE_ENV') return 'test';
              return null;
            }),
          },
        },
        {
          provide: APIIntelligenceAdapter,
          useValue: mockApiAdapter,
        },
        {
          provide: BedrockIntelligenceAdapter,
          useValue: mockBedrockAdapter,
        },
        {
          provide: SageMakerIntelligenceAdapter,
          useValue: mockSagemakerAdapter,
        },
      ],
    }).compile();

    router = module.get<IntelligenceRouterService>(IntelligenceRouterService);
  });

  describe('route selection', () => {
    it('should route pattern_lookup to pure data query', async () => {
      const request: IntelligenceRequest = {
        type: 'pattern_lookup',
        context: mockContext,
      };

      await router.route(request);

      expect(mockBedrockAdapter.queryPatterns).toHaveBeenCalledWith(mockContext);
      expect(mockApiAdapter.generateInsight).not.toHaveBeenCalled();
    });

    it('should route quick_suggestion to Bedrock RAG', async () => {
      const request: IntelligenceRequest = {
        type: 'quick_suggestion',
        context: mockContext,
      };

      const result = await router.route(request);

      expect(mockBedrockAdapter.generateInsight).toHaveBeenCalledWith(request);
      expect(result).toBeDefined();
    });

    it('should route deep_analysis to API full tier', async () => {
      const request: IntelligenceRequest = {
        type: 'deep_analysis',
        context: mockContext,
      };

      await router.route(request);

      expect(mockApiAdapter.generateInsight).toHaveBeenCalledWith(request);
    });

    it('should fallback when primary provider fails', async () => {
      mockBedrockAdapter.generateInsight.mockRejectedValueOnce(new Error('Bedrock unavailable'));

      const request: IntelligenceRequest = {
        type: 'quick_suggestion',
        context: mockContext,
      };

      const result = await router.route(request);

      expect(mockApiAdapter.generateInsight).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('cost optimization', () => {
    it('should prefer Bedrock for cost efficiency', async () => {
      const request: IntelligenceRequest = {
        type: 'standard',
        context: mockContext,
      };

      await router.route(request);

      expect(mockBedrockAdapter.generateInsight).toHaveBeenCalled();
    });

    it('should route low-latency requests to SageMaker when healthy', async () => {
      router.setSagemakerHealth(true);
      const request: IntelligenceRequest = {
        type: 'standard',
        requiresLowLatency: true,
        context: mockContext,
      };

      await router.route(request);

      expect(mockSagemakerAdapter.generateInsight).toHaveBeenCalled();
    });
  });
});
