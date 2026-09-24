# Data and IBCS

Financial statements and charts follow the International Business Communication Standards (IBCS). They read like a CPA's working papers: the same notation on every chart, variances coloured by meaning, and codes instead of legends where possible. IBCS mode is on by default for the income statement, balance sheet and cash-flow statement. A toggle switches back to the traditional layout.

## Scenarios

| Code | Scenario      | Français         | Mark                                      | Token                                         |
| ---- | ------------- | ---------------- | ----------------------------------------- | --------------------------------------------- |
| AC   | Actual        | Réel             | Solid bar                                 | `ibcs-actual` (#1e293b, #e2e8f0 in Dark)      |
| PL   | Plan / budget | Plan             | 2px outline, no fill                      | `ibcs-plan-stroke` (#64748b, #94a3b8 in Dark) |
| FC   | Forecast      | Prévision        | 2px dashed outline (4, 2), or a 4px hatch | `ibcs-forecast` (#94a3b8)                     |
| PY   | Prior year    | Année précédente | Solid bar at 60%                          | `ibcs-prior-year` (#cbd5e1)                   |

- Pair AC with PL, or AC with PY, side by side. The pair takes the full slot: each bar is 45% of it with a 10% gap between them.
- Bars have a 2px radius and are never shorter than 2px.
- Write the codes in `ibcs-code` (mono, 600) in column headers: AC, PY, ΔPY, ΔPY%. The legend reads "AC (Actual)", with the code in mono and the label muted.

## Variance

- **Sign by meaning.** For revenue and profit, above plan is favourable. For expenses, below plan is favourable. Ratios are decided by the caller. `isFavorable(variance, metricType)` in `lib/ibcs` is the only place this is decided.
- **Bands.** Within ±2% is neutral (`ibcs-neutral`). Beyond 10% is a warning, and beyond 20% is critical. Favourable stays favourable at any size.
- **Colour.** `ibcs-favorable` (`color-primary-600`), `ibcs-unfavorable` (#dc2626) or `ibcs-neutral` (#6b7280). Cell washes use the matching `-light` token.
- **The pin.** The variance pin is IBCS's lollipop. A 2px line joins the actual and plan values, with a 4px dot at the better end and a 9px mono label (`+12%`) beside it. The compact pin, used in tables and KPI tiles, is a 1.5px line with a 3px dot and a 12px mono label.
- Always print the sign and the percentage. Colour is never the only signal.

## Money

- Format with `formatCurrency()`: CAD, whole dollars, locale-aware (`$1,284,905` / `1 284 905 $`).
- In statements, amounts are `amount` (JetBrains Mono, tabular) and right-aligned. The total row is weight 600 in `color-text`, with a 2px `color-border-strong` rule above it and no rule below.
- Positive and negative amounts use `amount-positive` (`color-success`, `color-success-light` in Dark) and `amount-negative` (`color-error`, `color-error-light` in Dark). Only colour an amount when its sign is the point, as in a variance column. Revenue is not "positive" in green just because it is revenue.

## KPI tiles

- A KPI tile holds, in order: an icon tile, the label, the value, the target, and a variance pin or a trend.
- The trend icon is `TrendingUp`, `TrendingDown` or `Target` (stable). Its colour follows `isGoodWhenDown`: for a cost, down is `color-success`.
- IBCS tiles add an ROI line (`DollarSign`, in `ibcs-favorable`) and an action hint (`Lightbulb`, in `color-warning`).
- A benchmark reads "vs Industry: 4.2x" in `color-text-muted`.

## Sparklines

- The line is 2px in `color-primary-600`, over an area fill of the same colour at about 8%, with a 3px dot at the last point.
- The industry benchmark is a 1.5px dashed line (4, 3) in slate-400 at 60%, with a 2px end dot.
- Draw both lines on one shared scale so they compare honestly.

## Benchmarks and highlights

- An industry benchmark on a chart is a dashed `ibcs-benchmark` (#3b82f6) line.
- Use `ibcs-highlight` (#d4af37) for the one bar or cell a reader should look at first. There is only one per chart.

## Accessibility

Every IBCS mark is an SVG group with `role="graphics-symbol"`, a bilingual `aria-label` ("Favorable variance: +15%" / "Écart favorable : +15 %"), `aria-roledescription`, and a `<title>` and `<desc>`. Pins are focusable (`tabIndex=0`). Keep this contract on anything new.

## Where the rules live

`apps/web/src/lib/ibcs/` holds the colours, notation, thresholds and labels. `apps/web/src/components/charts/ibcs/` holds `VariancePin`, `ScenarioBar`, `IBCSLegend` and `IBCSHeader`. The older table in `agent.md` lists different variance colours (green 34 197 94, red 239 68 68, grey 148 163 184). The code is correct, so use the tokens above.
