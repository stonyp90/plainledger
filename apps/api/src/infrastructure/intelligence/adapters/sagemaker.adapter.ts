/**
 * SageMakerIntelligenceAdapter
 *
 * AWS SageMaker adapter for fine-tuned model inference.
 * Part of the Context Intelligence Platform.
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  IIntelligenceEngine,
  IntelligenceRequest,
} from "@application/ports/outbound/IIntelligenceEngine";
import { IntelligenceRecommendation } from "@domain/IntelligenceRecommendation";
import { IndustryPattern } from "@domain/IndustryPattern";
import { DecisionEvent } from "@domain/DecisionEvent";
import { Money } from "@domain/value-objects/Money";

// AWS SDK v3 imports
import {
  SageMakerRuntimeClient,
  InvokeEndpointCommand,
  InvokeEndpointCommandInput,
} from "@aws-sdk/client-sagemaker-runtime";
import {
  SageMakerClient,
  CreateTrainingJobCommand,
  CreateTrainingJobCommandInput,
} from "@aws-sdk/client-sagemaker";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

@Injectable()
export class SageMakerIntelligenceAdapter implements IIntelligenceEngine {
  private readonly logger = new Logger(SageMakerIntelligenceAdapter.name);
  private readonly client: SageMakerRuntimeClient;
  private readonly sagemakerClient: SageMakerClient;
  private readonly s3Client: S3Client;
  private readonly endpointName: string;
  private readonly region: string;
  private readonly trainingJobName: string;
  private readonly trainingDataBucket: string;
  private readonly trainingRoleArn: string;
  private readonly contentType = "application/json";
  private readonly accept = "application/json";

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get("AWS_REGION") || "ca-central-1";
    this.endpointName = this.configService.get("SAGEMAKER_ENDPOINT_NAME") || "";
    this.trainingJobName =
      this.configService.get("SAGEMAKER_TRAINING_JOB_NAME") ||
      "plainledger-decision-model";
    this.trainingDataBucket =
      this.configService.get("SAGEMAKER_TRAINING_DATA_BUCKET") || "";
    this.trainingRoleArn =
      this.configService.get("SAGEMAKER_TRAINING_ROLE_ARN") || "";

    this.client = new SageMakerRuntimeClient({
      region: this.region,
    });

    this.sagemakerClient = new SageMakerClient({
      region: this.region,
    });

    this.s3Client = new S3Client({
      region: this.region,
    });

    if (!this.endpointName) {
      this.logger.warn("SageMaker endpoint name not configured");
    }
  }

  /**
   * Generate insight using fine-tuned SageMaker model
   */
  async generateInsight(
    request: IntelligenceRequest,
  ): Promise<IntelligenceRecommendation> {
    if (!this.endpointName) {
      throw new Error("SageMaker endpoint not configured");
    }

    const startTime = Date.now();

    try {
      // Prepare input payload for the model
      const payload = this.prepareModelInput(request);

      const input: InvokeEndpointCommandInput = {
        EndpointName: this.endpointName,
        ContentType: this.contentType,
        Accept: this.accept,
        Body: JSON.stringify(payload),
      };

      const command = new InvokeEndpointCommand(input);
      const response = await this.client.send(command);

      // Parse model response
      const modelOutput = JSON.parse(Buffer.from(response.Body!).toString());
      const latency = Date.now() - startTime;

      // Convert model output to IntelligenceRecommendation
      return this.parseModelOutput(modelOutput, request, latency);
    } catch (error) {
      this.logger.error(
        `SageMaker inference failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Query patterns (not applicable for SageMaker - use Bedrock)
   */
  async queryPatterns(_context: any): Promise<IndustryPattern[]> {
    throw new Error(
      "SageMaker adapter does not support pattern queries. Use Bedrock adapter.",
    );
  }

  /**
   * Find similar decisions (not applicable for SageMaker)
   */
  async findSimilarDecisions(
    _context: any,
    _limit?: number,
  ): Promise<DecisionEvent[]> {
    throw new Error(
      "SageMaker adapter does not support decision queries. Use repository.",
    );
  }

  /**
   * Prepare input payload for the model
   */
  private prepareModelInput(request: IntelligenceRequest): Record<string, any> {
    return {
      industry: request.context.industry,
      businessSize: request.context.businessSize,
      trigger: {
        metric: request.context.trigger.metric,
        currentValue: request.context.trigger.currentValue.amount,
        benchmarkValue: request.context.trigger.benchmarkValue.amount,
        gapPercentage: request.context.trigger.gapPercentage,
      },
      requestType: request.type,
    };
  }

  /**
   * Parse model output into IntelligenceRecommendation
   */
  private parseModelOutput(
    modelOutput: any,
    request: IntelligenceRequest,
    _latency: number,
  ): IntelligenceRecommendation {
    return IntelligenceRecommendation.create({
      context:
        modelOutput.context ||
        `Industry: ${request.context.industry}, Metric: ${request.context.trigger.metric}`,
      recommendation:
        modelOutput.recommendation ||
        modelOutput.output ||
        "No recommendation available",
      supportingPatterns: [], // SageMaker model doesn't return patterns
      similarDecisions: [],
      confidence: this.mapConfidence(
        modelOutput.confidence || modelOutput.confidence_score,
      ),
      sampleSize: modelOutput.sample_size || 0,
      successProbability:
        modelOutput.success_probability || modelOutput.probability || 75,
      expectedOutcome: Money.create(
        modelOutput.expected_outcome || modelOutput.expected_impact || 0,
      ),
      timeToResult: modelOutput.time_to_result || "2-4 weeks",
    });
  }

  /**
   * Map numeric confidence to confidence level
   */
  private mapConfidence(
    confidence: number | string,
  ): "low" | "medium" | "high" {
    if (typeof confidence === "string") {
      return confidence as "low" | "medium" | "high";
    }

    if (confidence >= 0.8) return "high";
    if (confidence >= 0.6) return "medium";
    return "low";
  }

  /**
   * Trigger model retraining with new decision data
   */
  async triggerRetraining(newDecisions: DecisionEvent[]): Promise<string> {
    this.logger.log(
      `Triggering retraining with ${newDecisions.length} new decisions`,
    );

    if (!this.trainingDataBucket || !this.trainingRoleArn) {
      this.logger.warn(
        "SageMaker training configuration incomplete. Missing bucket or role ARN.",
      );
      throw new Error(
        "SageMaker training not configured. Set SAGEMAKER_TRAINING_DATA_BUCKET and SAGEMAKER_TRAINING_ROLE_ARN",
      );
    }

    try {
      // 1. Prepare training data from new decisions
      const trainingData = this.prepareTrainingData(newDecisions);
      const trainingDataJson = JSON.stringify(trainingData, null, 2);

      // 2. Upload to S3
      const timestamp = Date.now();
      const s3Key = `training_data/decisions_${timestamp}.jsonl`;

      // Convert to JSONL format (one JSON object per line)
      const jsonlData = trainingData.map((d) => JSON.stringify(d)).join("\n");

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.trainingDataBucket,
          Key: s3Key,
          Body: Buffer.from(jsonlData),
          ContentType: "application/jsonl",
        }),
      );

      this.logger.log(
        `Training data uploaded to s3://${this.trainingDataBucket}/${s3Key}`,
      );

      // 3. Trigger SageMaker training job
      const jobName = `${this.trainingJobName}-${timestamp}`;
      const trainingInput: CreateTrainingJobCommandInput = {
        TrainingJobName: jobName,
        RoleArn: this.trainingRoleArn,
        AlgorithmSpecification: {
          TrainingImage: `763104351884.dkr.ecr.${this.region}.amazonaws.com/huggingface-pytorch-training:2.0.0-transformers4.28.1-gpu-py310-cu118-ubuntu20.04`,
          TrainingInputMode: "File",
        },
        InputDataConfig: [
          {
            ChannelName: "training",
            DataSource: {
              S3DataSource: {
                S3DataType: "S3Prefix",
                S3Uri: `s3://${this.trainingDataBucket}/${s3Key}`,
                S3DataDistributionType: "FullyReplicated",
              },
            },
            ContentType: "application/jsonl",
          },
        ],
        OutputDataConfig: {
          S3OutputPath: `s3://${this.trainingDataBucket}/models/`,
        },
        ResourceConfig: {
          InstanceType: "ml.g5.2xlarge",
          InstanceCount: 1,
          VolumeSizeInGB: 100,
        },
        StoppingCondition: {
          MaxRuntimeInSeconds: 7200, // 2 hours
        },
        HyperParameters: {
          "model-name": "mistralai/Mistral-7B-Instruct-v0.2",
          epochs: "3",
          "batch-size": "4",
          "learning-rate": "2e-4",
          "lora-r": "16",
          "lora-alpha": "32",
        },
      };

      const command = new CreateTrainingJobCommand(trainingInput);
      const response = await this.sagemakerClient.send(command);

      this.logger.log(
        `SageMaker training job ${jobName} started: ${response.TrainingJobArn}`,
      );

      return response.TrainingJobArn || jobName;
    } catch (error) {
      this.logger.error(
        `Failed to trigger SageMaker training: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Prepare training data from decision events
   */
  private prepareTrainingData(decisions: DecisionEvent[]): Array<{
    instruction: string;
    input: string;
    output: string;
  }> {
    return decisions
      .filter((d) => d.outcome && d.outcome.success) // Only successful decisions
      .map((d) => ({
        instruction: `You are an AI financial advisor for ${d.industry} businesses. A business owner is seeing ${d.trigger.metric} at ${d.trigger.currentValue.amount}, which is ${d.trigger.gapPercentage}% ${d.trigger.gapPercentage < 0 ? "below" : "above"} industry benchmark. What specific action should they take?`,
        input: `Industry: ${d.industry}\nBusiness Size: ${d.businessSize}\nCurrent ${d.trigger.metric}: ${d.trigger.currentValue.amount}\nIndustry Benchmark: ${d.trigger.benchmarkValue.amount}\nGap: ${d.trigger.gapPercentage}%`,
        output: `Recommended Action: ${d.decision.actionType}\n\n${d.decision.description}\n\nExpected Impact: ${d.decision.expectedImpact.amount}\nConfidence: ${d.decision.confidence}\nReasoning: ${d.decision.reasoning || "Based on industry patterns"}\n\nThis recommendation is based on similar businesses in ${d.industry} who took this action with success.`,
      }));
  }
}
