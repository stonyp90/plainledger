# Graph Configuration System

## Overview

The Graph Configuration System exposes configurable parameters for all graphs and charts, designed from both **Entrepreneur** and **CPA** perspectives. This ensures that graphs can be customized to meet the specific needs of different user types while maintaining accounting accuracy.

## Architecture

### Configuration Hierarchy

Configuration is merged in the following priority order (highest to lowest):

1. **Chart-level overrides** - Specific settings for individual charts
2. **User preferences** - Personal defaults stored in localStorage
3. **Organization settings** - Tenant-level defaults from database
4. **System defaults** - Fallback values

### Key Components

- **`apps/web/src/lib/graphConfig.ts`** - Core configuration types and defaults
- **`apps/web/src/hooks/useGraphConfig.ts`** - Hook to access configuration
- **`apps/web/src/components/charts/GraphConfigPanel.tsx`** - UI for configuring graphs

## Configuration Categories

### 1. Period & Date Range (`PeriodConfig`)

**Entrepreneur Perspective:**
- Quick period presets (MTD, QTD, YTD)
- Growth comparisons (YoY, QoQ, MoM)
- Custom date ranges for ad-hoc analysis

**CPA Perspective:**
- Fiscal year alignment
- Comparative periods for audit
- Period-over-period variance analysis

**Key Parameters:**
- `defaultPeriod`: Period preset (mtd, qtd, ytd, last_month, etc.)
- `fiscalYearStartMonth`: Fiscal year start (1-12)
- `comparisonMode`: Comparison type (previousYear, budget, benchmark, etc.)
- `aggregationLevel`: Data aggregation (daily, weekly, monthly, quarterly, annual)

### 2. Display & Formatting (`DisplayConfig`)

**Entrepreneur Perspective:**
- Clean, readable formats
- Compact notation for large numbers (K, M, B)
- Growth indicators and visual cues

**CPA Perspective:**
- Accounting format (negative in parentheses)
- Precise decimal places
- Account codes and types
- Audit trail visibility

**Key Parameters:**
- `currency`: Currency code (CAD, USD, EUR)
- `numberFormat`: Format style (thousands, millions, billions, actual)
- `currencyDecimals`: Decimal places for currency (0-4)
- `percentageDecimals`: Decimal places for percentages (0-4)
- `useAccountingFormat`: Negative values in parentheses
- `showZeroValues`: Display zero values

### 3. Chart Visualization (`ChartVisualConfig`)

**Common Parameters:**
- `height`: Chart height in pixels
- `showGrid`: Show grid lines
- `showLegend`: Show legend
- `showMovingAverage`: Show moving average line
- `movingAveragePeriod`: Period for moving average (default: 3)
- `showThresholdBands`: Show warning/critical bands
- `showBudget`: Show budget line
- `showForecast`: Show forecast/projection
- `forecastMonths`: Months ahead for forecast

### 4. Entrepreneur-Focused Configuration (`EntrepreneurConfig`)

**Business Metrics:**
- `showGrowthIndicators`: Trending up/down arrows
- `showGoals`: Goal/target lines
- `showBenchmarks`: Industry benchmarks
- `showKPICards`: KPI summary cards
- `showCashRunway`: Cash runway projection
- `showBurnRate`: Burn rate calculation
- `showGrowthRate`: Revenue growth rate
- `showMargins`: Profit margins

**Alert Thresholds:**
- `cashRunwayDays`: Alert if cash runway < X days
- `burnRateIncrease`: Alert if burn rate increases > X%
- `revenueDecline`: Alert if revenue declines > X%
- `marginDecline`: Alert if margin declines > X%

**Significant Change:**
- `significantChangeThreshold`: Threshold for highlighting changes (%)

### 5. CPA-Focused Configuration (`CPAConfig`)

**Accounting Accuracy:**
- `materialityThreshold`: Materiality threshold (%)
- `varianceThreshold`: Variance threshold (%)
- `roundingTolerance`: Rounding tolerance
- `accountingMethod`: Cash vs Accrual

**Analysis & Reporting:**
- `showAccountCodes`: Display account codes
- `showAccountTypes`: Display account types
- `showVarianceAnalysis`: Variance analysis
- `showAgingAnalysis`: Aging analysis
- `showTrialBalance`: Trial balance view
- `showReconciliation`: Account reconciliation
- `showAuditTrail`: Audit trail

**Comparisons:**
- `showPriorYear`: Prior year comparison
- `showComparativePeriods`: Multiple period comparison
- `showBudgetVsActual`: Budget vs actual
- `showPeriodOverPeriod`: Period-over-period changes

**Aging Buckets:**
- `agingBuckets.current`: Current threshold (days)
- `agingBuckets.warning`: Warning threshold (days)
- `agingBuckets.critical`: Critical threshold (days)

**Anomaly Detection Thresholds:**
- `thresholds`: Full threshold configuration (variance, ratios, aging, etc.)

### 6. Waterfall Chart Configuration (`WaterfallConfig`)

- `varianceThreshold`: Threshold for highlighting significant items (%)
- `highlightSignificantItems`: Highlight items exceeding threshold
- `groupSmallItems`: Group small items into "Other"
- `groupingThreshold`: Threshold for grouping (%)
- `showCumulativeTotals`: Show cumulative totals
- `showPercentageOfTotal`: Show percentage of total

### 7. Budget vs Actual Configuration (`BudgetVsActualConfig`)

- `varianceThreshold`: Variance threshold (%)
- `showPriorYear`: Show prior year column
- `showVariancePercentage`: Show variance %
- `showVarianceAmount`: Show variance amount
- `highlightFavorable`: Highlight favorable variances
- `highlightUnfavorable`: Highlight unfavorable variances
- `sortByVariance`: Sort by variance magnitude
- `expandAllRows`: Expand all rows by default

## Usage Examples

### Basic Usage

```typescript
import { useGraphConfig } from '../hooks/useGraphConfig';

function MyChart() {
  const config = useGraphConfig('revenue-trend');
  
  // Use config.display.currency for formatting
  // Use config.visual.height for chart height
  // Use config.entrepreneur.showGrowthIndicators for business view
  // Use config.cpa.materialityThreshold for CPA view
}
```

### Chart-Specific Overrides

```typescript
import { useGraphConfig } from '../hooks/useGraphConfig';

function CustomChart() {
  const config = useGraphConfig('custom-chart', {
    visual: {
      height: 400,
      showMovingAverage: true,
      movingAveragePeriod: 5,
    },
    entrepreneur: {
      showBenchmarks: true,
      significantChangeThreshold: 20,
    },
  });
}
```

### Configuration Panel

```typescript
import GraphConfigPanel from '../components/charts/GraphConfigPanel';
import { useState } from 'react';

function ChartWithConfig() {
  const [showConfig, setShowConfig] = useState(false);
  const [chartConfig, setChartConfig] = useState({});
  
  return (
    <>
      <button onClick={() => setShowConfig(true)}>Configure</button>
      {showConfig && (
        <GraphConfigPanel
          chartId="revenue-trend"
          currentConfig={chartConfig}
          onConfigChange={setChartConfig}
          onClose={() => setShowConfig(false)}
        />
      )}
    </>
  );
}
```

### Formatting Values

```typescript
import { formatCurrencyValue, formatPercentageValue } from '../lib/graphConfig';

function FormattedValue({ value, config }) {
  const currency = formatCurrencyValue(value, config.display);
  const percentage = formatPercentageValue(15.5, config.display);
  
  return <div>{currency} ({percentage})</div>;
}
```

## Integration Guide

### Step 1: Update Chart Component

```typescript
import { useGraphConfig } from '../../hooks/useGraphConfig';
import { formatCurrencyValue } from '../../lib/graphConfig';

export default function MyChart({ chartId, ...props }) {
  const config = useGraphConfig(chartId);
  
  // Use config values instead of hardcoded ones
  const height = config.visual.height;
  const currency = config.display.currency;
  const showMA = config.visual.showMovingAverage;
  const maPeriod = config.visual.movingAveragePeriod;
  
  // Format values using config
  const formattedValue = formatCurrencyValue(value, config.display);
  
  // Apply entrepreneur settings
  if (config.entrepreneur.showGrowthIndicators) {
    // Show growth indicators
  }
  
  // Apply CPA settings
  if (config.cpa.showAccountCodes) {
    // Show account codes
  }
  
  return <div>...</div>;
}
```

### Step 2: Add Configuration Button

```typescript
import { Settings2 } from 'lucide-react';
import GraphConfigPanel from './GraphConfigPanel';
import { useState } from 'react';

function ChartHeader({ chartId }) {
  const [showConfig, setShowConfig] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowConfig(true)}>
        <Settings2 className="w-4 h-4" />
      </button>
      {showConfig && (
        <GraphConfigPanel
          chartId={chartId}
          onClose={() => setShowConfig(false)}
        />
      )}
    </>
  );
}
```

## Best Practices

### For Entrepreneurs

1. **Focus on Growth**: Enable growth indicators, benchmarks, and cash runway
2. **Simplify Display**: Use compact notation (K, M, B) for large numbers
3. **Set Goals**: Configure goal values for key metrics
4. **Alert Thresholds**: Set appropriate alert thresholds for cash runway and revenue decline

### For CPAs

1. **Accounting Accuracy**: Use accounting format, show account codes
2. **Materiality**: Set appropriate materiality thresholds
3. **Variance Analysis**: Enable variance analysis and aging analysis
4. **Comparisons**: Show prior year and comparative periods
5. **Precision**: Use appropriate decimal places for currency and percentages

### For Both

1. **Period Selection**: Use appropriate period presets (MTD, QTD, YTD)
2. **Comparison Mode**: Enable relevant comparisons (previousYear, budget)
3. **Thresholds**: Configure thresholds based on business size and industry
4. **Visualization**: Balance information density with readability

## Future Enhancements

1. **Organization-Level Settings**: Store graph preferences in database
2. **Chart Templates**: Pre-configured templates for common use cases
3. **Export Configuration**: Export/import configuration presets
4. **Role-Based Defaults**: Different defaults for entrepreneurs vs CPAs
5. **Industry-Specific Defaults**: Defaults tailored to specific industries

## Migration Notes

When updating existing charts:

1. Replace hardcoded values with `config` values
2. Use formatting functions (`formatCurrencyValue`, etc.)
3. Add configuration button to chart headers
4. Test with both entrepreneur and CPA perspectives
5. Update documentation for chart-specific parameters
