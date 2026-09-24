# Web Agent Guide

This is a specialized agent guide for the PlainLedger Web app (React frontend). For general project guidance, see the [main agent.md](../../agent.md).

## 🤖 Using Skills and Sub-Agents

**ALWAYS** check for available skills and use sub-agents when appropriate:
- Use skills for specialized tasks (component generation, testing, styling)
- Reference this file for React/frontend-specific patterns
- Delegate to domain-specific agents when working on complex features
- Update this file when discovering better patterns

## Quick Reference

- **Main Agent Guide:** [`../../agent.md`](../../agent.md)
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** TailwindCSS with CSS variables
- **Testing:** Vitest (unit), Playwright (E2E)
- **State Management:** React Context + Hooks
- **Local Setup:** See `LOCAL_SETUP.md` for development setup

**Token Optimization:** Use semantic search for specific patterns, reference code by path.

## Frontend-Specific Patterns

### Component Organization

**Directory Structure:**
```
src/
├── components/           # Shared/global components
│   ├── visualization/    # Feature-specific component group (index.ts exports all)
│   │   ├── ChartPreview.tsx
│   │   ├── DataSourceSelector.tsx
│   │   ├── FieldPicker.tsx
│   │   ├── FilterBuilder.tsx
│   │   ├── JoinBuilder.tsx
│   │   ├── MetadataEditor.tsx
│   │   ├── VisualizationBuilder.tsx    # Main entry component
│   │   └── index.ts                     # Re-exports all
│   ├── charts/           # Chart components group
│   ├── strategic/        # Strategic planning components
│   └── Layout.tsx        # Standalone shared components
├── hooks/                # Custom hooks (global)
├── lib/                  # Utilities, types, services
│   ├── visualizationTypes.ts   # Types for visualization feature
│   ├── goldSchema.ts           # Data schema definitions
│   └── chartFavorites.ts       # Chart utilities
└── pages/                # Page components
```

**Component Grouping Rules:**
1. **Feature groups** (3+ related components) → Create subdirectory with `index.ts`
2. **Standalone components** → Keep in root `components/`
3. **Page-specific components** → Co-locate in same file or create page-specific subdirectory
4. **Shared utilities** → Put in `lib/` with descriptive filename

### Component Structure Template

```tsx
/**
 * ComponentName - Brief description
 * 
 * Features:
 * - Feature 1
 * - Feature 2
 * - Bilingual support (EN/FR)
 */

import { useState, useMemo, useCallback } from 'react';
import { IconName } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { usePremiumFeature } from '@/components/PremiumFeatureGate';

// =====================================================
// TYPES
// =====================================================

interface ComponentProps {
  data: DataType;
  onChange: (value: DataType) => void;
  className?: string;
}

// =====================================================
// CONSTANTS
// =====================================================

const SOME_OPTIONS = [
  { id: 'option1', labelEn: 'English', labelFr: 'Français' },
] as const;

// =====================================================
// SUB-COMPONENTS (if needed)
// =====================================================

function SubComponent({ item, isEn }: { item: typeof SOME_OPTIONS[number]; isEn: boolean }) {
  return <div>{isEn ? item.labelEn : item.labelFr}</div>;
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function ComponentName({ data, onChange, className }: ComponentProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const { hasAccess } = usePremiumFeature('yourFeature');

  // State
  const [localState, setLocalState] = useState<string>('');

  // Computed values (memoized)
  const computedValue = useMemo(() => {
    return data.filter(d => d.active);
  }, [data]);

  // Handlers (memoized for child components)
  const handleChange = useCallback((value: string) => {
    setLocalState(value);
    onChange({ ...data, value });
  }, [data, onChange]);

  // Early return for loading/error/empty states
  if (!data) {
    return <EmptyState message={isEn ? 'No data' : 'Aucune donnée'} />;
  }

  return (
    <div className={className}>
      {/* Component JSX */}
    </div>
  );
}

export default ComponentName;
```

### Reusable Component Patterns

**1. Compound Components (for complex UI):**
```tsx
// Parent manages state, children render parts
export function DataTable({ children, data }: DataTableProps) {
  return <table>{children}</table>;
}

DataTable.Header = function Header({ columns }: HeaderProps) { /*...*/ };
DataTable.Body = function Body({ rows }: BodyProps) { /*...*/ };
DataTable.Footer = function Footer({ summary }: FooterProps) { /*...*/ };

// Usage
<DataTable data={data}>
  <DataTable.Header columns={columns} />
  <DataTable.Body rows={rows} />
</DataTable>
```

**2. Render Props (for flexible rendering):**
```tsx
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
}

export function List<T>({ items, renderItem, renderEmpty }: ListProps<T>) {
  if (items.length === 0 && renderEmpty) {
    return <>{renderEmpty()}</>;
  }
  return <div>{items.map((item, i) => renderItem(item, i))}</div>;
}
```

**3. HOC for Cross-Cutting Concerns:**
```tsx
// Error boundary HOC
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback: React.ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ChartErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ChartErrorBoundary>
    );
  };
}
```

### Custom Hooks Patterns

**1. Feature Hook (encapsulates feature logic):**
```tsx
// hooks/useVisualization.ts
export function useVisualization(initialConfig: VisualizationConfig) {
  const [config, setConfig] = useState(initialConfig);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateConfig = useCallback((updates: Partial<VisualizationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const executeQuery = useCallback(async () => {
    setIsLoading(true);
    try {
      // Execute query
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  return { config, updateConfig, executeQuery, isLoading, error };
}
```

**2. UI State Hook:**
```tsx
// hooks/useMultiStep.ts
export function useMultiStep<T extends string>(steps: T[], initialStep?: T) {
  const [currentStep, setCurrentStep] = useState<T>(initialStep || steps[0]);
  
  const currentIndex = steps.indexOf(currentStep);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === steps.length - 1;

  const goNext = useCallback(() => {
    if (!isLast) setCurrentStep(steps[currentIndex + 1]);
  }, [currentIndex, isLast, steps]);

  const goPrevious = useCallback(() => {
    if (!isFirst) setCurrentStep(steps[currentIndex - 1]);
  }, [currentIndex, isFirst, steps]);

  const goTo = useCallback((step: T) => {
    if (steps.includes(step)) setCurrentStep(step);
  }, [steps]);

  return { currentStep, currentIndex, isFirst, isLast, goNext, goPrevious, goTo };
}
```

**3. Data Fetching Hook:**
```tsx
// hooks/useDataSource.ts
export function useDataSource(sourceId: string) {
  const [data, setData] = useState<DataSource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    
    async function fetchData() {
      try {
        setIsLoading(true);
        const result = await api.getDataSource(sourceId);
        if (!cancelled) setData(result);
      } catch (e) {
        if (!cancelled) setError(e as Error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [sourceId]);

  return { data, isLoading, error };
}
```

### Page Composition Patterns

**1. Layout + Content Pattern:**
```tsx
// pages/Dashboard.tsx
export default function Dashboard() {
  return (
    <PageLayout title="Dashboard" titleFr="Tableau de bord">
      <DashboardHeader />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricsSection />
        <ChartsSection />
      </div>
      <RecentActivitySection />
    </PageLayout>
  );
}
```

**2. Feature Flag + Fallback Pattern:**
```tsx
// pages/Analytics.tsx
export default function Analytics() {
  return (
    <PremiumFeatureGate 
      feature="advancedAnalytics"
      fallback={<AnalyticsUpgradePrompt />}
    >
      <AnalyticsDashboard />
    </PremiumFeatureGate>
  );
}
```

**3. Data + Loading + Error Pattern:**
```tsx
// pages/Reports.tsx
export default function Reports() {
  const { data, isLoading, error, refetch } = useReports();
  
  if (isLoading) return <ReportsLoadingSkeleton />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!data?.length) return <EmptyState onAction={() => {}} />;
  
  return <ReportsList reports={data} />;
}
```

### Index File Pattern

**Always create index.ts for component groups:**
```tsx
// components/visualization/index.ts
/**
 * Visualization Components
 * 
 * Advanced visualization builder system.
 * Provides Looker/Power BI-like capabilities.
 */

// Main entry point
export { VisualizationBuilder } from './VisualizationBuilder';

// Sub-components (for advanced use)
export { DataSourceSelector } from './DataSourceSelector';
export { FieldPicker } from './FieldPicker';
export { JoinBuilder } from './JoinBuilder';
export { FilterBuilder } from './FilterBuilder';
export { MetadataEditor } from './MetadataEditor';
export { ChartPreview } from './ChartPreview';

// Error handling
export { ChartErrorBoundary, withChartErrorBoundary } from './ChartErrorBoundary';

// Usage in other files:
// import { VisualizationBuilder } from '@/components/visualization';
// import { DataSourceSelector, FieldPicker } from '@/components/visualization';
```

### Brand Compliance

**ALWAYS follow [`design-system/README.md`](../../design-system/README.md)**: the ten rules, the tokens and the brand book in `design-system/guidelines/`. In short:

1. **Logo:** The ledger grid (nine rounded cells) in `rgb(var(--color-primary-500))`, never gray and never a generic glyph
   - Reference: [`src/components/Layout.tsx`](src/components/Layout.tsx) (the inline sidebar mark)
   - The app tile is flat `color-primary-600` with #e9fff6 cells; only the relief mark carries a gradient

2. **Colors:** Use CSS variables, never hardcoded
   - Primary: `rgb(var(--color-primary-500))`
   - Background: `rgb(var(--color-bg))`
   - Text: `rgb(var(--color-text))`
   - Tokens are generated into `src/styles/tokens.css` from `design-system/tokens.json`. Change the JSON, then run `npm run tokens` from the repository root; never edit `tokens.css` by hand

3. **Components:** Use design system classes
   - Buttons: `btn-primary`, `btn-accent`, `btn-secondary`
   - Cards: `card`, `card-interactive`, `card-highlight`

### Internationalization Pattern

**ALWAYS support both EN/FR:**

```tsx
import { useI18n } from '@/lib/i18n';

const { language } = useI18n();
const isEn = language === 'en';

return (
  <div>
    {isEn ? 'English Text' : 'Texte français'}
  </div>
);
```

### Feature Gating Pattern

```tsx
import PremiumFeatureGate, { usePremiumFeature } from '@/components/PremiumFeatureGate';

// Option 1: Wrap component
<PremiumFeatureGate feature="aiInsights">
  <YourPremiumComponent />
</PremiumFeatureGate>

// Option 2: Programmatic check
const { hasAccess, requiredPlan } = usePremiumFeature('aiInsights');
if (!hasAccess) {
  return <UpgradePrompt requiredPlan={requiredPlan} />;
}
```

### Demo Mode Pattern

```tsx
const isDemoSignupUser = user?.organization === 'demo-signup';

{isDemoSignupUser && (
  <DemoSignupWelcome />
)}
```

### CTA Pattern

**ALWAYS offer both options:**

```tsx
const [showEmailForm, setShowEmailForm] = useState(false);
const CALENDLY_URL = 'https://calendly.com/anthonypaquet1508';

{showEmailForm ? (
  <UpgradeRequestForm
    feature={feature}
    showCalendlyOption={true}
    onSubmitted={() => setShowEmailForm(false)}
  />
) : (
  <div className="flex gap-3">
    <button onClick={() => setShowEmailForm(true)}>
      Request Information
    </button>
    <button onClick={() => window.open(CALENDLY_URL, '_blank')}>
      Schedule Call
    </button>
  </div>
)}
```

## Reference Implementation: Visualization System

The `visualization/` component group is a reference implementation of best practices:

```
components/visualization/
├── index.ts                  # Re-exports all components
├── VisualizationBuilder.tsx  # Main modal (orchestrates sub-components)
├── DataSourceSelector.tsx    # Step 1: Multi-select data sources
├── JoinBuilder.tsx           # Step 2: Visual join configuration
├── FieldPicker.tsx           # Step 3: Drag-drop field selection
├── FilterBuilder.tsx         # Step 4: Type-aware filter UI
├── MetadataEditor.tsx        # Step 5: Title, description, tags
├── ChartPreview.tsx          # Live preview panel
└── ChartErrorBoundary.tsx    # Error isolation

lib/
├── visualizationTypes.ts     # TypeScript types for feature
└── goldSchema.ts             # Static data schema definition
```

**Key Patterns Demonstrated:**
- Feature-scoped types in `lib/` with descriptive filename
- Main component orchestrates sub-components via props
- Each sub-component is independently testable
- Index file for clean imports
- Error boundary for graceful failure handling
- Bilingual support in every component
- Brand-compliant styling throughout

## Common Tasks

### Adding a New Feature (Complex - 3+ components)

1. **Plan component structure:**
   - Main entry component (orchestrator)
   - Sub-components for each concern
   - Types file in `lib/`
   - Custom hooks if needed

2. **Create feature directory:**
   ```bash
   mkdir src/components/your-feature
   touch src/components/your-feature/index.ts
   ```

3. **Build bottom-up:**
   - Create types first
   - Build smallest sub-components
   - Build main component last
   - Create index.ts to export all

4. **Add to page/route**
5. **Write tests for each component**

### Adding a New Page

1. **Create page component** in `src/pages/`
2. **Add route** in `src/App.tsx`
3. **Add navigation** if needed
4. **Add i18n support** (EN/FR)
5. **Add feature gating** if premium feature
6. **Write E2E tests** in `e2e/`

### Adding a New Component (Simple)

1. **Create component** in `src/components/`
2. **Use design system classes**
3. **Support i18n** (EN/FR)
4. **Add TypeScript types**
5. **Follow brand guidelines**
6. **Add unit tests** if complex logic

### Styling Guidelines

**DO:**
- Use TailwindCSS utility classes
- Use CSS variables for colors
- Follow design system patterns
- Use responsive classes (`sm:`, `md:`, `lg:`)

**DON'T:**
- Hardcode colors
- Use gray backgrounds (use CSS variables)
- Create custom CSS unless necessary
- Use inline styles

### State Management

**Prefer:**
- React Context for global state
- Local state (`useState`) for component state
- Custom hooks for reusable logic

**Example:**
```tsx
// Create context
export const YourContext = createContext<YourType | null>(null);

// Use context
const yourValue = useContext(YourContext);
```

### Provider-Agnostic Frontend Patterns

**CRITICAL:** Frontend code should also be provider-agnostic where possible. Use abstractions to decouple from specific libraries/services.

**1. Service Layer Abstraction:**
```tsx
// lib/services/types.ts
export interface IAnalyticsService {
  track(event: string, properties?: Record<string, unknown>): void;
  identify(userId: string, traits?: Record<string, unknown>): void;
  page(name: string, properties?: Record<string, unknown>): void;
}

// lib/services/analytics/mixpanel.ts
export class MixpanelAnalytics implements IAnalyticsService {
  track(event: string, properties?: Record<string, unknown>) {
    mixpanel.track(event, properties);
  }
  // ...
}

// lib/services/analytics/segment.ts
export class SegmentAnalytics implements IAnalyticsService {
  track(event: string, properties?: Record<string, unknown>) {
    analytics.track(event, properties);
  }
}

// lib/services/analytics/index.ts
export const analytics: IAnalyticsService = 
  import.meta.env.VITE_ANALYTICS_PROVIDER === 'segment'
    ? new SegmentAnalytics()
    : new MixpanelAnalytics();
```

**2. Chart Library Abstraction:**
```tsx
// lib/charts/types.ts
export interface IChartRenderer {
  renderLine(data: ChartData, options: ChartOptions): React.ReactNode;
  renderBar(data: ChartData, options: ChartOptions): React.ReactNode;
  renderPie(data: ChartData, options: ChartOptions): React.ReactNode;
}

// lib/charts/recharts.renderer.tsx
export class RechartsRenderer implements IChartRenderer {
  renderLine(data: ChartData, options: ChartOptions) {
    return <LineChart data={data.series}>...</LineChart>;
  }
}

// lib/charts/custom.renderer.tsx (our SVG implementation)
export class CustomSVGRenderer implements IChartRenderer {
  renderLine(data: ChartData, options: ChartOptions) {
    return <CustomLineChart data={data} />;
  }
}
```

**3. API Client Abstraction:**
```tsx
// lib/api/types.ts
export interface IApiClient {
  get<T>(url: string): Promise<T>;
  post<T>(url: string, data: unknown): Promise<T>;
  put<T>(url: string, data: unknown): Promise<T>;
  delete(url: string): Promise<void>;
}

// lib/api/fetch.client.ts
export class FetchApiClient implements IApiClient {
  async get<T>(url: string): Promise<T> {
    const response = await fetch(url, { headers: this.headers });
    return response.json();
  }
}

// lib/api/graphql.client.ts
export class GraphQLApiClient implements IApiClient {
  // GraphQL implementation
}
```

**4. Storage Abstraction:**
```tsx
// lib/storage/types.ts
export interface IStorageService {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
}

// lib/storage/localStorage.ts
export class LocalStorageService implements IStorageService {
  get<T>(key: string): T | null {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  }
}

// lib/storage/sessionStorage.ts
export class SessionStorageService implements IStorageService {
  // Session storage implementation
}
```

**When to Abstract on Frontend:**

| Service | Abstract? | Reason |
|---------|-----------|--------|
| Analytics | Yes | May switch providers (Mixpanel → Segment) |
| Auth | Yes | Already abstracted via Keycloak/OAuth |
| API Client | Yes | May add GraphQL alongside REST |
| Charts | Maybe | Currently custom SVG, may add library |
| Storage | Yes | LocalStorage vs SessionStorage vs IndexedDB |
| i18n | No | Deep integration, unlikely to change |
| Styling | No | TailwindCSS is fundamental |

## IBCS (International Business Communication Standards) Patterns

### Overview

All financial charts and reports follow IBCS compliance for consistent, professional financial communication. IBCS provides standardized notation, colors, and variance indicators.

### IBCS Library Structure

```
src/lib/ibcs/
├── theme.ts          # Color definitions (AC, PL, FC, PY, variance colors)
├── notation.ts       # Abbreviations (AC, PL, ΔPL, ΔPL%)
├── variance.ts       # Variance calculation utilities
├── formatters.ts    # Number/currency/percentage formatting
└── index.ts         # Re-exports all modules
```

### IBCS Components

```
src/components/charts/ibcs/
├── VariancePin.tsx       # Lollipop variance indicator
├── ScenarioBar.tsx       # AC|PL|FC bars with correct styling
├── IBCSLegend.tsx        # Standard legend
├── IBCSHeader.tsx        # Chart headers with column abbreviations
└── index.ts             # Re-exports all
```

### Chart Configuration System

**File:** `src/lib/chartConfig.ts`

Provides unified interfaces for multi-data source charts:

```typescript
interface IBCSChartConfig {
  dataSources: ChartDataSource[];  // Multiple data sources (AC, PL, FC, PY)
  labels: ChartLabels;              // Bilingual labels
  ibcsMode: boolean;                // Enable IBCS compliance
  showVariancePins: boolean;        // Show variance indicators
  showLegend: boolean;              // Show IBCS legend
  metricType: IBCSMetricType;      // 'revenue' | 'expense' | 'profit' | 'ratio'
  accessibility: {                  // ARIA labels
    ariaLabel: string;
    ariaLabelEn?: string;
    description: string;
    descriptionEn?: string;
  };
}
```

**Hook:** `useIBCSChart(config)` - Manages IBCS chart state and calculations

### IBCS Notation Standards

| Abbreviation | Meaning | Usage |
|--------------|---------|-------|
| AC | Actual | Current period actual values |
| PL | Plan | Budget/plan values |
| FC | Forecast | Forecasted values |
| PY | Prior Year | Previous period values |
| ΔPL | Variance vs Plan | Absolute variance |
| ΔPL% | Variance % vs Plan | Percentage variance |
| ΔPY | Variance vs Prior Year | YoY absolute variance |
| ΔPY% | Variance % vs Prior Year | YoY percentage variance |

### Variance Colors

These match `IBCSColors` in `src/lib/ibcs/theme.ts` and the `--ibcs-*` tokens:

- **Favorable** (`ibcs-favorable`, emerald-600 `rgb(var(--color-primary-600))`): revenue above plan, expenses below plan
- **Unfavorable** (`ibcs-unfavorable`, #dc2626): the opposite
- **Neutral** (`ibcs-neutral`, #6b7280): within the ±2% on-target band

### Bar Styles

- **AC (Actual)**: Solid filled dark bar
- **PL (Plan)**: Outline only (transparent fill with stroke)
- **FC (Forecast)**: Hatched/dashed pattern
- **PY (Prior Year)**: Light gray, smaller

### Report Enhancement Pattern

All financial reports (Balance Sheet, Income Statement, Cash Flow) support IBCS mode:

```tsx
// 1. Add IBCS mode toggle
const [ibcsMode, setIBCSMode] = useState(true);

// 2. Add IBCS header row (when comparison enabled)
{ibcsMode && showComparison ? (
  <IBCSColumnHeaderRow
    columns={[
      { key: 'actual', abbreviation: 'AC', ... },
      { key: 'priorYear', abbreviation: 'PY', ... },
      { key: 'variance', abbreviation: 'ΔPY', ... },
      { key: 'variancePct', abbreviation: 'ΔPY%', ... },
    ]}
  />
) : null}

// 3. Update table headers to show abbreviations
<th className={ibcsMode ? 'font-mono' : ''}>
  {ibcsMode ? 'AC' : currentYear}
</th>

// 4. Use VariancePinCompact in variance cells
{ibcsMode ? (
  <>
    <td>{formatCurrency(varianceAbs)}</td>
    <td>
      <VariancePinCompact
        variancePct={variancePct}
        favorable={isFavorable}
      />
    </td>
  </>
) : (
  <td>{variancePct.toFixed(1)}%</td>
)}
```

### Accessibility Requirements

All IBCS SVG components must include:

```tsx
<g
  role="graphics-symbol"
  aria-label="Favorable variance: +15%"
  aria-roledescription="variance indicator"
  tabIndex={0}
>
  <title>Favorable variance</title>
  <desc>Variance of +15% from plan</desc>
  {/* SVG elements */}
</g>
```

### Testing IBCS Compliance

**Unit Tests:** `src/components/charts/ibcs/__tests__/`
- VariancePin.test.tsx - Color, formatting, accessibility
- ScenarioBar.test.tsx - Bar styling, keyboard navigation
- visual.test.tsx - Snapshot tests for visual consistency

**E2E Tests:** `e2e/ibcs-compliance.spec.ts`
- Verifies IBCS abbreviations appear
- Checks variance pin colors
- Validates accessibility attributes
- Tests FP&A features (action recommendations, ROI impact)

### Best Practices

1. **Always use IBCS colors** from `IBCSColors` constant
2. **Calculate favorability correctly** based on metric type:
   - Revenue: increase is favorable
   - Expenses: decrease is favorable
   - Assets: increase is favorable
   - Liabilities: decrease is favorable
3. **Use VariancePinCompact** in tables and KPI cards
4. **Use full VariancePin** in charts for visual variance indicators
5. **Support bilingual labels** using `useI18n()` hook
6. **Enable IBCS mode by default** for financial reports
7. **Provide toggle** to disable IBCS mode for users who prefer traditional format

## Testing Patterns

### Unit Tests (Vitest)

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { YourComponent } from './YourComponent';

describe('YourComponent', () => {
  it('should render correctly', () => {
    render(<YourComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### E2E Tests (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('should navigate to page', async ({ page }) => {
  await page.goto('/your-page');
  await expect(page).toHaveURL(/your-page/);
});
```

## Architecture Enforcement

### Class Size Limit: 1000 Lines Maximum

**CRITICAL:** If a component exceeds 1000 lines, it MUST be refactored:
1. Extract sub-components
2. Extract custom hooks for logic
3. Split by feature/domain
4. Use composition over large monolithic components

**Current violations (check with `npm run check:class-sizes`):**
- `NotificationSettings.tsx` (2080 lines) → Split into: NotificationPreferences, EmailSettings, PushSettings
- `ChartBuilder.tsx` (2161 lines) → Split into: ChartConfig, ChartPreview, ChartTypes
- `DemoModal.tsx` (1854 lines) → Split into: DemoContent, DemoNavigation, DemoPreview
- `DataVisualization.tsx` (1745 lines) → Split by chart type
- `OrganizationSwitcher.tsx` (1718 lines) → Extract: OrganizationList, OrganizationSearch, OrganizationCreate
- `ModelSpreadsheet.tsx` (1480 lines) → Split into: SpreadsheetGrid, SpreadsheetToolbar, SpreadsheetFormulas
- `Onboarding.tsx` (1437 lines) → Split into steps: WelcomeStep, ConnectStep, ConfigureStep
- `Layout.tsx` (1393 lines) → Extract: Sidebar, Header, Navigation
- `HealthScoreGauge.tsx` (1337 lines) → Extract: GaugeChart, ScoreCalculation, ScoreDetails
- `SearchModal.tsx` (1332 lines) → Extract: SearchInput, SearchResults, SearchFilters
- `ThresholdSettings.tsx` (1252 lines) → Split by threshold type
- `JamesChatbot.tsx` (1234 lines) → Extract: ChatMessages, ChatInput, ChatSuggestions
- `ReportManager.tsx` (1139 lines) → Extract: ReportList, ReportEditor, ReportPreview
- `SmartSpreadsheet.tsx` (1120 lines) → Extract: SpreadsheetLogic, SpreadsheetUI
- `DriverRow.tsx` (1111 lines) → Extract: DriverInput, DriverCalculation, DriverChart
- `BoardPanelRenderer.tsx` (1101 lines) → Split by panel type
- `OpExCapExChart.tsx` (1056 lines) → Extract: Chart, Legend, Tooltip
- `DecisionCapture.tsx` (1016 lines) → Extract: DecisionForm, DecisionList, DecisionPreview

**Refactoring Pattern:**
```tsx
// Before: Large component (1000+ lines)
export function LargeComponent() {
  // 1000+ lines of logic
}

// After: Split into smaller components
export function LargeComponent() {
  return (
    <div>
      <SubComponent1 />
      <SubComponent2 />
      <SubComponent3 />
    </div>
  );
}

// Extract logic to hooks
function useLargeComponentLogic() {
  // Logic here
  return { data, handlers };
}
```

## Self-Improvement

**Update this file when:**
- Discovering better React patterns
- Fixing recurring UI issues
- Adding new component patterns
- Improving accessibility or UX
- Refactoring large components

**Pattern to Follow:**
1. Implement feature
2. Document pattern if reusable
3. Update this agent.md
4. Share learnings with main agent.md if applicable
5. **Check component size** - Refactor if > 1000 lines

---

**Last Updated:** February 2026  
**Related:** [`../../agent.md`](../../agent.md)
