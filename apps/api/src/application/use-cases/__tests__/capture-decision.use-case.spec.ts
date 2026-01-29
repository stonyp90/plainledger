/**
 * CaptureDecisionUseCase Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CaptureDecisionUseCase } from '../capture-decision.use-case';
import { IDecisionRepository } from '../../ports/outbound/IDecisionRepository';
import { DecisionEvent } from '../../../../../web/src/domain/DecisionEvent';
import { Money } from '../../../../../web/src/domain/value-objects/Money';

describe('CaptureDecisionUseCase', () => {
  let useCase: CaptureDecisionUseCase;
  let mockRepository: jest.Mocked<IDecisionRepository>;

  const validInput = {
    organizationId: 'org-123',
    industry: 'restaurant',
    businessSize: 'small' as const,
    trigger: {
      metric: 'food_cost',
      currentValue: 35000,
      benchmarkValue: 30000,
      gapPercentage: 16.7,
    },
    decision: {
      actionType: 'reduce_costs',
      description: 'Renegotiate supplier contracts',
      reasoning: 'Based on industry patterns',
      expectedImpact: 5000,
      confidence: 'high' as const,
    },
    source: 'user' as const,
  };

  beforeEach(async () => {
    mockRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findByOrganization: jest.fn(),
      findByIndustry: jest.fn(),
      findWithOutcomes: jest.fn(),
      aggregatePatterns: jest.fn(),
      findSimilar: jest.fn(),
      countByIndustry: jest.fn(),
      getStatistics: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaptureDecisionUseCase,
        {
          provide: IDecisionRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get<CaptureDecisionUseCase>(CaptureDecisionUseCase);
  });

  it('should capture a new decision', async () => {
    const result = await useCase.execute(validInput);

    expect(result.id).toBeDefined();
    expect(result.organizationId).toBe('org-123');
    expect(result.industry).toBe('restaurant');
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should validate industry before saving', async () => {
    await expect(useCase.execute({
      ...validInput,
      industry: 'invalid',
    })).rejects.toThrow('Invalid industry');
  });

  it('should use organizationId from input', async () => {
    const result = await useCase.execute(validInput);

    expect(result.organizationId).toBe('org-123');
  });

  it('should default source to user if not provided', async () => {
    const inputWithoutSource = { ...validInput };
    delete (inputWithoutSource as any).source;

    const result = await useCase.execute(inputWithoutSource);

    expect(result.source).toBe('user');
  });

  it('should create decision event with correct structure', async () => {
    const result = await useCase.execute(validInput);

    expect(result.trigger.metric).toBe('food_cost');
    expect(result.trigger.currentValue.amount).toBe(35000);
    expect(result.decision.actionType).toBe('reduce_costs');
    expect(result.decision.confidence).toBe('high');
  });
});
