/**
 * IntelligenceModule
 * 
 * NestJS module for Context Intelligence Platform.
 * Provides intelligence generation, decision capture, and pattern aggregation.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIService } from '../ai/ai.service';
import { IntelligenceRouterService } from './intelligence-router.service';
import { APIIntelligenceAdapter } from './adapters/api.adapter';
import { BedrockIntelligenceAdapter } from './adapters/bedrock.adapter';
import { SageMakerIntelligenceAdapter } from './adapters/sagemaker.adapter';
import { DecisionRepository } from '../persistence/decision.repository';
import { PatternAggregationService } from '@application/services/pattern-aggregation.service';
import { OutcomeTrackingService } from '@application/services/outcome-tracking.service';
import { CaptureDecisionUseCase } from '@application/use-cases/capture-decision.use-case';
import { DecisionsController } from '@application/controllers/decisions.controller';
import { IntelligenceController } from '@application/controllers/intelligence.controller';
import { WeeklyRetrainingJob } from '../jobs/weekly-retraining.job';
import { DecisionEventEntity } from '../persistence/postgres/entities/decision-event.entity';
import { IndustryPatternEntity } from '../persistence/postgres/entities/industry-pattern.entity';
import { IDecisionRepository } from '@application/ports/outbound/IDecisionRepository';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([DecisionEventEntity, IndustryPatternEntity]),
  ],
  providers: [
    // Core services
    AIService,
    IntelligenceRouterService,
    
    // Adapters (depend on AIService and ConfigService)
    APIIntelligenceAdapter,
    BedrockIntelligenceAdapter,
    SageMakerIntelligenceAdapter,
    
    // Repositories
    DecisionRepository,
    {
      provide: IDecisionRepository,
      useClass: DecisionRepository,
    },
    
    // Application services
    PatternAggregationService,
    OutcomeTrackingService,
    CaptureDecisionUseCase,
    
    // Scheduled jobs
    WeeklyRetrainingJob,
  ],
  controllers: [
    DecisionsController,
    IntelligenceController,
  ],
  exports: [
    IntelligenceRouterService,
    CaptureDecisionUseCase,
    OutcomeTrackingService,
    PatternAggregationService,
    APIIntelligenceAdapter,
    BedrockIntelligenceAdapter,
    SageMakerIntelligenceAdapter,
  ],
})
export class IntelligenceModule {}
