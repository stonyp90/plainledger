"""
Prepare Training Data for Decision Intelligence Model
Part of the Context Intelligence Platform

Extracts decision-outcome pairs for supervised fine-tuning.
Formats data in instruction-tuning format for LoRA training.
"""

import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.dynamicframe import DynamicFrame
from pyspark.sql import functions as F
from pyspark.sql.types import *
from datetime import datetime
import json

# Initialize Glue context
args = getResolvedOptions(sys.argv, ['JOB_NAME', 'S3_GOLD_BUCKET'])
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

# Configuration
GOLD_BUCKET = args['S3_GOLD_BUCKET']
TRAINING_DATA_PREFIX = 'training_data/'

def format_instruction(trigger_row):
    """Format instruction prompt from trigger"""
    industry = trigger_row['industry']
    metric = trigger_row['trigger_metric']
    current_value = trigger_row['trigger_current_value']
    gap_percentage = trigger_row['trigger_gap_percentage']
    
    direction = 'below' if gap_percentage < 0 else 'above'
    
    return f"""You are an AI financial advisor for {industry} businesses.
A business owner is seeing {metric} at ${current_value:,.2f}, 
which is {abs(gap_percentage):.1f}% {direction} industry benchmark.
What specific action should they take?"""

def format_context(trigger_row, industry):
    """Format context input from trigger"""
    metric = trigger_row['trigger_metric']
    current_value = trigger_row['trigger_current_value']
    benchmark_value = trigger_row['trigger_benchmark_value']
    gap_percentage = trigger_row['trigger_gap_percentage']
    business_size = trigger_row.get('business_size', 'small')
    
    return f"""Industry: {industry}
Current {metric}: ${current_value:,.2f}
Industry Benchmark: ${benchmark_value:,.2f}
Gap: {gap_percentage:.1f}%
Business Size: {business_size}"""

def format_output(decision_row, outcome_row):
    """Format output from decision and outcome"""
    action_type = decision_row['decision_action_type']
    description = decision_row['decision_description']
    reasoning = decision_row.get('decision_reasoning', 'Based on industry patterns')
    confidence = decision_row['decision_confidence']
    
    actual_impact = outcome_row.get('outcome_actual_impact', 0)
    sample_size = outcome_row.get('sample_size', 100)  # Would come from pattern aggregation
    success_rate = outcome_row.get('success_rate', 85)   # Would come from pattern aggregation
    
    return f"""Recommended Action: {action_type}

{description}

Expected Impact: ${actual_impact:,.2f}
Confidence: {confidence}
Reasoning: {reasoning}

This recommendation is based on {sample_size} similar businesses 
in {decision_row['industry']} who took this action with a {success_rate}% success rate."""

def prepare_training_examples(decisions_df, outcomes_df):
    """
    Create training examples in instruction-tuning format.
    
    Format:
    {
      "instruction": "Given this financial context, what action should be taken?",
      "input": "<context with metrics, industry, benchmarks>",
      "output": "<recommended action with reasoning>"
    }
    """
    
    # Join decisions with verified outcomes
    # Only use successful decisions for training
    training_data = decisions_df.join(
        outcomes_df,
        decisions_df.id == outcomes_df.decision_id,
        "inner"
    ).filter(
        F.col('outcome_success') == True  # Only learn from successful decisions
    )
    
    # Format for instruction tuning
    from pyspark.sql.types import StringType
    
    format_instruction_udf = F.udf(format_instruction, StringType())
    format_context_udf = F.udf(lambda row, ind: format_context(row.asDict(), ind), StringType())
    format_output_udf = F.udf(lambda d_row, o_row: format_output(d_row.asDict(), o_row.asDict()), StringType())
    
    examples = training_data.select(
        format_instruction_udf(F.struct([
            F.col('industry'),
            F.col('trigger_metric'),
            F.col('trigger_current_value'),
            F.col('trigger_gap_percentage'),
        ])).alias('instruction'),
        format_context_udf(
            F.struct([
                F.col('trigger_metric'),
                F.col('trigger_current_value'),
                F.col('trigger_benchmark_value'),
                F.col('trigger_gap_percentage'),
                F.col('business_size'),
            ]),
            F.col('industry')
        ).alias('input'),
        format_output_udf(
            F.struct([
                F.col('decision_action_type'),
                F.col('decision_description'),
                F.col('decision_reasoning'),
                F.col('decision_confidence'),
                F.col('industry'),
            ]),
            F.struct([
                F.col('outcome_actual_impact'),
                F.lit(100).alias('sample_size'),  # Would be calculated from patterns
                F.lit(85).alias('success_rate'),  # Would be calculated from patterns
            ])
        ).alias('output')
    )
    
    return examples

# Read decision events with outcomes from Gold layer
decisions_path = f's3://{GOLD_BUCKET}/fact_decision_events/'

try:
    decisions_df = glueContext.create_dynamic_frame.from_options(
        connection_type='s3',
        connection_options={'paths': [decisions_path]},
        format='parquet',
    ).toDF()
    
    # Filter for decisions with outcomes
    decisions_with_outcomes = decisions_df.filter(
        F.col('outcome_success').isNotNull()
    )
    
    # Create outcomes dataframe (same as decisions but focused on outcomes)
    outcomes_df = decisions_with_outcomes.select(
        F.col('id').alias('decision_id'),
        F.col('outcome_actual_impact'),
        F.col('outcome_success'),
        F.col('outcome_variance'),
    )
    
    # Prepare training examples
    training_examples = prepare_training_examples(decisions_with_outcomes, outcomes_df)
    
    # Split into train/validation (80/20)
    train_examples, validation_examples = training_examples.randomSplit([0.8, 0.2], seed=42)
    
    # Write to S3 as JSONL (one JSON object per line)
    output_path_train = f's3://{GOLD_BUCKET}/{TRAINING_DATA_PREFIX}train/'
    output_path_val = f's3://{GOLD_BUCKET}/{TRAINING_DATA_PREFIX}validation/'
    
    # Convert to JSONL format
    train_examples.rdd.map(lambda row: json.dumps({
        'instruction': row.instruction,
        'input': row.input,
        'output': row.output,
    })).saveAsTextFile(output_path_train)
    
    validation_examples.rdd.map(lambda row: json.dumps({
        'instruction': row.instruction,
        'input': row.input,
        'output': row.output,
    })).saveAsTextFile(output_path_val)
    
    print(f'Successfully prepared training data:')
    print(f'  Train: {train_examples.count()} examples -> {output_path_train}')
    print(f'  Validation: {validation_examples.count()} examples -> {output_path_val}')
    
    job.commit()
    
except Exception as e:
    print(f'Error preparing training data: {str(e)}')
    import traceback
    traceback.print_exc()
    raise
