/**
 * WeeklyRetrainingJob Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { WeeklyRetrainingJob } from '../weekly-retraining.job';
import { IDecisionRepository } from '@application/ports/outbound/IDecisionRepository';
import { SageMakerIntelligenceAdapter } from '../../intelligence/adapters/sagemaker.adapter';
import { DecisionEvent } from '../../../../../web/src/domain/DecisionEvent';
import { Money } from '../../../../../web/src/domain/value-objects/Money';

describe('WeeklyRetrainingJob', () => {
  let job: WeeklyRetrainingJob;
  let mockDecisionRepository: jest.Mocked<IDecisionRepository>;
  let mockSagemakerAdapter: jest.Mocked<SageMakerIntelligenceAdapter>;

  const createDecision = () => {
    const decision = DecisionEvent.create({
      organizationId: 'org-123',
      industry: 'restaurant',
      businessSize: 'small',
      trigger: {
        metric: 'food_cost',
        currentValue: Money.create(35000),
        benchmarkValue: Money.create(30000),
        gapPercentage: 16.7,
      },
      decision: {
        actionType: 'reduce_costs',
        description: 'Renegotiate supplier contracts',
        expectedImpact: Money.create(5000),
        confidence: 'high',
      },
      source: 'user',
    });

    decision.addOutcome({
      actualImpact: Money.create(6000),
      measuredAt: new Date(),
      success: true,
      variance: 20,
    });

    return decision;
  };

  beforeEach(async () => {
    mockDecisionRepository = {
      findWithOutcomes: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      findByOrganization: jest.fn(),
      findByIndustry: jest.fn(),
      aggregatePatterns: jest.fn(),
      findSimilar: jest.fn(),
      countByIndustry: jest.fn(),
      getStatistics: jest.fn(),
    } as any;

    mockSagemakerAdapter = {
      triggerRetraining: jest.fn().mockResolvedValue('job-123'),
      generateInsight: jest.fn(),
      queryPatterns: jest.fn(),
      findSimilarDecisions: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeeklyRetrainingJob,
        {
          provide: IDecisionRepository,
          useValue: mockDecisionRepository,
        },
        {
          provide: SageMakerIntelligenceAdapter,
          useValue: mockSagemakerAdapter,
        },
      ],
    }).compile();

    job = module.get<WeeklyRetrainingJob>(WeeklyRetrainingJob);
  });

  it('should trigger retraining when threshold is met', async () => {
    // Create 100+ decisions (above threshold)
    const decisions = Array(150).fill(null).map(() => createDecision());
    mockDecisionRepository.findWithOutcomes.mockResolvedValue(decisions);

    await job.triggerRetrainingForIndustry('restaurant');

    expect(mockSagemakerAdapter.triggerRetraining).toHaveBeenCalled();
  });

  it('should not retrain if insufficient new data', async () => {
    // Create only 5 decisions (below threshold)
    const decisions = Array(5).fill(null).map(() => createDecision());
    mockDecisionRepository.findWithOutcomes.mockResolvedValue(decisions);

    await job.triggerRetrainingForIndustry('restaurant');

    expect(mockSagemakerAdapter.triggerRetraining).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    mockDecisionRepository.findWithOutcomes.mockRejectedValue(new Error('Database error'));

    await expect(job.triggerRetrainingForIndustry('restaurant')).resolves.not.toThrow();
  });
});
