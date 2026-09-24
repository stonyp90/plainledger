# Type

One sans face does almost everything and one mono face handles money and codes. **Inter** sets the interface, headings and the wordmark. **JetBrains Mono** sets amounts in tables, IBCS codes, variance labels and keyboard keys.

## Loading

- Both faces come from Google Fonts: `family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500`.
- Load all five Inter weights. With only 400, 500 and 600 loaded, `font-bold` (page titles, compact KPI values) and the 800 wordmark fall back to 600.
- Fallback stacks: `sans` is Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif. `mono` is JetBrains Mono, SF Mono, Monaco, monospace.
- The app turns on Inter's `cv02`, `cv03`, `cv04` and `cv11` (open 4, 6 and 9, single-storey a) on `<html>`, with antialiased smoothing. Keep them on so figures stay open and easy to tell apart.

## Scale

| Style                 | Size / leading          | Weight | Tracking           | Use                                 |
| --------------------- | ----------------------- | ------ | ------------------ | ----------------------------------- |
| `page-title`          | 24 / 32                 | 700    | -0.006em           | The one title per page              |
| `h1`                  | 32 (clamp 24–32) / 1.2  | 600    | -0.025em           | Marketing and empty-state headlines |
| `h2`                  | 24 (clamp 20–24) / 1.25 | 600    | -0.02em            | Section headlines                   |
| `h3`, `section-title` | 18 / 1.3                | 600    | -0.015em           | Card and section titles             |
| `h4`                  | 16 / 1.35               | 600    | -0.01em            | Chart titles, sub-sections          |
| `h5`                  | 14 / 1.4                | 600    | 0                  | Group labels                        |
| `body`                | 14 / 1.5                | 400    | -0.006em           | Default UI text                     |
| `paragraph`           | 14 / 1.6                | 400    | -0.006em           | Prose, max 65ch                     |
| `label`               | 14 / 20                 | 500    | 0                  | Form labels, nav items              |
| `button`              | 13 / 1.5                | 500    | -0.006em           | Buttons (12 small, 14 large)        |
| `caption`             | 12 / 16                 | 400    | +0.01em            | Badges, timestamps, legends         |
| `metric-value`        | 24 / 32                 | 600    | -0.02em            | KPI figures, tabular                |
| `metric-label`        | 12 / 16                 | 500    | +0.05em, UPPERCASE | KPI labels                          |
| `table-head`          | 12 / 16                 | 600    | +0.05em, UPPERCASE | Table headers                       |
| `amount`              | 14 / 20 mono            | 400    | 0                  | Money in tables, tabular            |
| `ibcs-code`           | 12 / 16 mono            | 600    | 0                  | AC, PL, ΔPY%, +12%                  |

The dashboard also reads fluid variables for dense tiles. `--text-value` is clamp(18px, 1rem + 0.5vw, 24px), `--text-title` is clamp(16px, 0.9rem + 0.4vw, 20px), `--text-label` is clamp(12px, 0.7rem + 0.25vw, 14px) and `--text-subtitle` is clamp(12px, 0.7rem + 0.2vw, 13px). The compact versions run 14–18px for values, 10–11px for labels and 9–10px for subtitles.

## Rules

- Headings are weight 600 (the page title is 700) and always `color-text`. Colour carries data, never a heading.
- Headings get `text-wrap: balance` and negative tracking that grows with size.
- Only metric labels and table headers are uppercase, always with +0.05em tracking. Everything else is sentence case.
- Every column of numbers uses tabular figures (`font-variant-numeric: tabular-nums`, or the `.tabular-nums` utility) and aligns right.
- Money in statements and tables is `amount` (mono). Money in KPI tiles is `metric-value` (sans, tabular). Don't mix the two in one column.
- Under 375px, body text drops to 13px and headings step down (h1 22px, h2 18px, h3 16px). Don't add further breakpoints.
- The smallest text is 10px (compact KPI labels and subtitles). The 9px compact subtitle on phones is below the floor; don't use it in new work.
