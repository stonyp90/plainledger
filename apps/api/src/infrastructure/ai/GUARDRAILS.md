# AI Guardrails Documentation

## Overview

Comprehensive guardrails system to prevent AI hallucinations and ensure accuracy in financial AI responses.

## Components

### 1. Backend Guardrails Service (`ai-guardrails.service.ts`)

**Purpose**: Validate AI responses before returning to clients

**Features**:
- **Financial Metric Validation**: Checks that claimed metrics match provided context
- **Invented Number Detection**: Identifies numbers not supported by context
- **Calculation Verification**: Validates runway, burn rate, and other calculations
- **Hallucinated Fact Detection**: Flags unsupported claims (industry benchmarks, research citations)
- **False Confidence Detection**: Identifies overconfident statements without data basis
- **Response Sanitization**: Removes dangerous content (scripts, XSS attempts)
- **Confidence Scoring**: Provides 0-100 confidence score for each response

**Validation Process**:
1. Extract financial metrics from response
2. Compare against provided context
3. Detect invented numbers
4. Validate calculations
5. Check for hallucinated facts
6. Sanitize response
7. Add disclaimers if confidence < 70%

**Rejection Criteria**:
- Response fails validation if confidence < 50%
- Errors (not just warnings) cause rejection
- Invalid calculations cause rejection

### 2. Frontend Response Guardrails (`responseGuardrails.ts`)

**Purpose**: Client-side validation as additional safety layer

**Features**:
- Number extraction and validation
- Unsupported claim detection
- Invented metric detection
- Message sanitization
- Warning banners for low confidence

### 3. Enhanced Prompts (`jamesPrompts.ts`)

**Anti-Hallucination Rules Added**:
- Explicit instructions to never invent numbers
- Prohibition against citing unsupported research
- Requirement to state "I don't have enough information" when uncertain
- Mandatory qualification of statements with "based on the data provided"

## Integration Points

### Backend (`ai.service.ts`)
- Guardrails applied after LLM response, before caching
- Responses rejected if guardrails fail
- Warnings/errors logged for monitoring
- Confidence score included in logs

### Frontend (`jamesAI.ts`)
- Additional validation layer on client side
- Warning banners added to low-confidence responses
- Invalid responses flagged with disclaimers

## Validation Rules

### Financial Metrics
- ✅ Allowed: Metrics explicitly in context
- ❌ Rejected: Metrics not in context
- ⚠️ Warning: Metrics close to but not exactly matching context

### Numbers
- ✅ Allowed: Numbers within 5% of context values
- ⚠️ Warning: Numbers within 10% of context values
- ❌ Rejected: Numbers >10% different from context

### Calculations
- ✅ Allowed: Calculations matching expected formulas
- ❌ Rejected: Calculations with >10% variance from expected

### Claims
- ✅ Allowed: Statements grounded in provided context
- ❌ Rejected: Industry benchmarks without context
- ❌ Rejected: Research citations without context
- ❌ Rejected: Definite statements without data basis

## Confidence Scoring

- **100%**: Perfect match with context, no issues
- **90-99%**: Minor warnings, mostly accurate
- **70-89%**: Some warnings, use caution
- **50-69%**: Multiple warnings, verify carefully
- **<50%**: Rejected - too many issues

## Monitoring

All guardrail violations are logged:
- Warnings: Logged at WARN level
- Errors: Logged at ERROR level
- Confidence scores: Included in response logs
- Metrics: Tracked for analytics

## Example Scenarios

### ✅ Valid Response
```
Context: Cash: $100K, Revenue: $50K/mo, Expenses: $75K/mo
Response: "Based on your cash of $100,000 and monthly burn rate of $25,000..."
Result: PASS (100% confidence)
```

### ⚠️ Warning Response
```
Context: Cash: $100K
Response: "Your runway is approximately 4 months..."
Result: WARNING (85% confidence) - Runway calculation not verified
```

### ❌ Rejected Response
```
Context: Cash: $100K
Response: "According to industry research, companies typically have $500K cash..."
Result: REJECTED (30% confidence) - Cites unsupported research, invented number
```

## Best Practices

1. **Always provide context**: More context = better validation
2. **Monitor warnings**: Review guardrail logs regularly
3. **User education**: Inform users about confidence scores
4. **Fallback handling**: Have fallback responses for rejected queries
5. **Continuous improvement**: Update patterns based on false positives/negatives
