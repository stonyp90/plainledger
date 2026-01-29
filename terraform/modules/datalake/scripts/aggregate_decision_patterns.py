"""
Aggregate Decision Patterns ETL Job
Part of the Context Intelligence Platform

Aggregates decision events into industry patterns for intelligence generation.
Runs daily to update pattern statistics.
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

# Initialize Glue context
args = getResolvedOptions(sys.argv, ['JOB_NAME', 'S3_GOLD_BUCKET'])
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

# Configuration
GOLD_BUCKET = args['S3_GOLD_BUCKET']
PATTERNS_PREFIX = 'fact_industry_patterns/'

def aggregate_patterns(decisions_df):
    """
    Aggregate decisions into industry patterns.
    
    Returns DataFrame with columns:
    - industry
    - trigger_metric
    - trigger_operator
    - trigger_value_low
    - trigger_value_high
    - sample_size
    - statistical_significance
    - common_actions (JSONB)
    - success_rates (JSONB)
    - top_performers (JSONB)
    - last_updated
    """
    
    # Filter decisions with outcomes (for success rate calculation)
    decisions_with_outcomes = decisions_df.filter(
        F.col('outcome_success').isNotNull()
    )
    
    # Group by industry and trigger conditions
    patterns = decisions_df.groupBy(
        'industry',
        'trigger_metric',
        F.when(F.col('trigger_gap_percentage') < 0, 'below')
         .when(F.col('trigger_gap_percentage') > 0, 'above')
         .otherwise('between')
         .alias('trigger_operator'),
        F.floor(F.col('trigger_gap_percentage') / 10) * 10
         .alias('trigger_value_low'),  # Bucket by 10% increments
    ).agg(
        F.count('*').alias('sample_size'),
        F.collect_list('decision_action_type').alias('actions'),
        F.collect_list('outcome_success').alias('outcomes'),
        F.collect_list('outcome_actual_impact').alias('impacts'),
        F.max('created_at').alias('last_updated'),
    )
    
    # Calculate common actions
    def calculate_common_actions(actions_list):
        """Calculate action frequencies"""
        from collections import Counter
        action_counts = Counter(actions_list)
        total = len(actions_list)
        
        common_actions = []
        for action, count in action_counts.most_common(5):
            common_actions.append({
                'action': action,
                'frequency': count,
                'percentage': round((count / total) * 100, 2),
            })
        
        return common_actions
    
    # Calculate success rates
    def calculate_success_rates(actions_list, outcomes_list):
        """Calculate success rates by action"""
        from collections import defaultdict
        
        action_outcomes = defaultdict(lambda: {'success': 0, 'total': 0})
        
        for action, outcome in zip(actions_list, outcomes_list):
            if outcome is not None:
                action_outcomes[action]['total'] += 1
                if outcome:
                    action_outcomes[action]['success'] += 1
        
        success_rates = {}
        overall_success = 0
        overall_total = 0
        
        for action, stats in action_outcomes.items():
            rate = (stats['success'] / stats['total'] * 100) if stats['total'] > 0 else 0
            success_rates[action] = round(rate, 2)
            overall_success += stats['success']
            overall_total += stats['total']
        
        overall_rate = (overall_success / overall_total * 100) if overall_total > 0 else 0
        
        return {
            'overallSuccessRate': round(overall_rate, 2),
            'byAction': success_rates,
        }
    
    # Calculate top performers
    def calculate_top_performers(actions_list, impacts_list, outcomes_list):
        """Calculate top performing actions"""
        from collections import defaultdict
        
        action_stats = defaultdict(lambda: {'impacts': [], 'successes': 0, 'total': 0})
        
        for action, impact, outcome in zip(actions_list, impacts_list, outcomes_list):
            if impact is not None and impact > 0:
                action_stats[action]['impacts'].append(impact)
            if outcome is not None:
                action_stats[action]['total'] += 1
                if outcome:
                    action_stats[action]['successes'] += 1
        
        # Find top action by average impact
        top_action = None
        top_avg_impact = 0
        top_success_rate = 0
        
        for action, stats in action_stats.items():
            if stats['impacts']:
                avg_impact = sum(stats['impacts']) / len(stats['impacts'])
                success_rate = (stats['successes'] / stats['total'] * 100) if stats['total'] > 0 else 0
                
                if avg_impact > top_avg_impact:
                    top_action = action
                    top_avg_impact = avg_impact
                    top_success_rate = success_rate
        
        return {
            'topActions': [top_action] if top_action else [],
            'avgImpact': round(top_avg_impact, 2),
            'successRate': round(top_success_rate, 2),
            'sampleSize': len([i for i in impacts_list if i is not None]),
        }
    
    # Calculate statistical significance (simplified)
    def calculate_significance(sample_size, success_rate):
        """Calculate statistical significance (0-1)"""
        if sample_size < 10:
            return 0.5
        if sample_size < 20:
            return 0.7
        if sample_size < 50:
            return 0.85
        return 0.95
    
    # Apply UDFs
    from pyspark.sql.types import ArrayType, MapType, StringType, DoubleType, IntegerType
    
    calculate_common_actions_udf = F.udf(calculate_common_actions, ArrayType(MapType(StringType(), StringType())))
    calculate_success_rates_udf = F.udf(calculate_success_rates, MapType(StringType(), DoubleType()))
    calculate_top_performers_udf = F.udf(calculate_top_performers, MapType(StringType(), StringType()))
    calculate_significance_udf = F.udf(calculate_significance, DoubleType())
    
    patterns = patterns.withColumn(
        'common_actions',
        calculate_common_actions_udf(F.col('actions'))
    ).withColumn(
        'success_rates',
        calculate_success_rates_udf(F.col('actions'), F.col('outcomes'))
    ).withColumn(
        'top_performers',
        calculate_top_performers_udf(F.col('actions'), F.col('impacts'), F.col('outcomes'))
    ).withColumn(
        'statistical_significance',
        calculate_significance_udf(F.col('sample_size'), F.col('success_rates')['overallSuccessRate'])
    )
    
    # Select final columns
    result = patterns.select(
        'industry',
        'trigger_metric',
        'trigger_operator',
        'trigger_value_low',
        F.col('trigger_value_low') + 10.0.alias('trigger_value_high'),
        'sample_size',
        'statistical_significance',
        'common_actions',
        'success_rates',
        'top_performers',
        'last_updated',
    )
    
    return result

# Read decision events from Gold layer
# Assuming decisions are stored as Parquet files
decisions_path = f's3://{GOLD_BUCKET}/fact_decision_events/'

try:
    decisions_df = glueContext.create_dynamic_frame.from_options(
        connection_type='s3',
        connection_options={'paths': [decisions_path]},
        format='parquet',
    ).toDF()
    
    # Aggregate patterns
    patterns_df = aggregate_patterns(decisions_df)
    
    # Write to Gold layer
    output_path = f's3://{GOLD_BUCKET}/{PATTERNS_PREFIX}'
    
    patterns_dynamic = DynamicFrame.fromDF(patterns_df, glueContext, 'patterns')
    
    glueContext.write_dynamic_frame.from_options(
        frame=patterns_dynamic,
        connection_type='s3',
        connection_options={
            'path': output_path,
            'partitionKeys': ['industry'],
        },
        format='parquet',
    )
    
    job.commit()
    print(f'Successfully aggregated patterns to {output_path}')
    
except Exception as e:
    print(f'Error aggregating patterns: {str(e)}')
    raise
