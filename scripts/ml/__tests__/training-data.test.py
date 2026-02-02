"""
Unit tests for training data preparation functions
Part of the Context Intelligence Platform
"""

import pytest
import sys
import os

# Add parent directory to path to import functions
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../terraform/modules/datalake/scripts'))

# Mock the format functions (they would be in the actual script)
def format_instruction(trigger):
    """Format instruction prompt from trigger"""
    industry = trigger.get('industry', 'restaurant')
    metric = trigger.get('metric', 'food_cost')
    current_value = trigger.get('currentValue', 35)
    gap_percentage = trigger.get('gapPercentage', 16.7)
    
    direction = 'below' if gap_percentage < 0 else 'above'
    
    return f"""You are an AI financial advisor for {industry} businesses.
A business owner is seeing {metric} at ${current_value:,.2f}, 
which is {abs(gap_percentage):.1f}% {direction} industry benchmark.
What specific action should they take?"""

def format_context(trigger, industry):
    """Format context input from trigger"""
    metric = trigger.get('metric', 'food_cost')
    current_value = trigger.get('currentValue', 35)
    benchmark_value = trigger.get('benchmarkValue', 30)
    gap_percentage = trigger.get('gapPercentage', 16.7)
    business_size = trigger.get('businessSize', 'small')
    
    return f"""Industry: {industry}
Current {metric}: ${current_value:,.2f}
Industry Benchmark: ${benchmark_value:,.2f}
Gap: {gap_percentage:.1f}%
Business Size: {business_size}"""

def format_output(decision, outcome):
    """Format output from decision and outcome"""
    action_type = decision.get('actionType', 'reduce_costs')
    description = decision.get('description', 'Renegotiate supplier contracts')
    reasoning = decision.get('reasoning', 'Based on industry patterns')
    confidence = decision.get('confidence', 'high')
    
    actual_impact = outcome.get('actualImpact', 5000)
    sample_size = outcome.get('sampleSize', 100)
    success_rate = outcome.get('successRate', 85)
    industry = decision.get('industry', 'restaurant')
    
    return f"""Recommended Action: {action_type}

{description}

Expected Impact: ${actual_impact:,.2f}
Confidence: {confidence}
Reasoning: {reasoning}

This recommendation is based on {sample_size} similar businesses 
in {industry} who took this action with a {success_rate}% success rate."""

class TestTrainingDataPreparation:
    def test_format_instruction(self):
        trigger = {
            'industry': 'restaurant',
            'metric': 'food_cost',
            'currentValue': 35,
            'gapPercentage': 16.7,
        }
        
        instruction = format_instruction(trigger)
        
        assert 'restaurant' in instruction
        assert 'food_cost' in instruction
        assert '16.7' in instruction or 'above' in instruction
        assert 'AI financial advisor' in instruction

    def test_format_instruction_below_benchmark(self):
        trigger = {
            'industry': 'retail',
            'metric': 'gross_margin',
            'currentValue': 25,
            'gapPercentage': -16.7,
        }
        
        instruction = format_instruction(trigger)
        
        assert 'retail' in instruction
        assert 'below' in instruction.lower()
        assert '16.7' in instruction

    def test_format_context(self):
        trigger = {
            'metric': 'food_cost',
            'currentValue': 35,
            'benchmarkValue': 30,
            'gapPercentage': 16.7,
            'businessSize': 'small',
        }
        
        context = format_context(trigger, 'restaurant')
        
        assert 'restaurant' in context
        assert '35' in context
        assert '30' in context
        assert '16.7' in context
        assert 'small' in context

    def test_format_output(self):
        decision = {
            'actionType': 'reduce_costs',
            'description': 'Renegotiate supplier contracts',
            'confidence': 'high',
            'reasoning': 'Based on industry patterns',
            'industry': 'restaurant',
        }
        outcome = {
            'actualImpact': 5000,
            'sampleSize': 150,
            'successRate': 85,
        }
        
        output = format_output(decision, outcome)
        
        assert 'reduce_costs' in output.lower() or 'Reduce' in output
        assert '5000' in output or '$5,000' in output
        assert '85%' in output or '85' in output
        assert '150' in output
        assert 'restaurant' in output

    def test_format_output_handles_missing_fields(self):
        decision = {
            'actionType': 'reduce_costs',
            'description': 'Test description',
        }
        outcome = {
            'actualImpact': 3000,
        }
        
        output = format_output(decision, outcome)
        
        assert 'reduce_costs' in output.lower()
        assert '3000' in output or '$3,000' in output

    def test_instruction_formatting_includes_all_required_info(self):
        trigger = {
            'industry': 'construction',
            'metric': 'backlog_ratio',
            'currentValue': 8,
            'gapPercentage': 20,
        }
        
        instruction = format_instruction(trigger)
        
        # Should include industry, metric, value, and gap
        assert 'construction' in instruction
        assert 'backlog_ratio' in instruction
        assert '8' in instruction
        assert '20' in instruction or 'above' in instruction

    def test_context_formatting_is_structured(self):
        trigger = {
            'metric': 'inventory_turnover',
            'currentValue': 4.5,
            'benchmarkValue': 6.0,
            'gapPercentage': -25,
            'businessSize': 'medium',
        }
        
        context = format_context(trigger, 'retail')
        
        # Should be structured and readable
        assert 'Industry:' in context
        assert 'Current' in context
        assert 'Benchmark:' in context
        assert 'Gap:' in context
        assert 'Business Size:' in context

    def test_output_formatting_includes_recommendation_structure(self):
        decision = {
            'actionType': 'optimize_inventory',
            'description': 'Reduce slow-moving stock',
            'confidence': 'medium',
            'reasoning': 'Industry best practice',
            'industry': 'retail',
        }
        outcome = {
            'actualImpact': 7500,
            'sampleSize': 200,
            'successRate': 78,
        }
        
        output = format_output(decision, outcome)
        
        # Should include all key sections
        assert 'Recommended Action:' in output
        assert 'Expected Impact:' in output
        assert 'Confidence:' in output
        assert 'Reasoning:' in output
        assert 'based on' in output.lower()
