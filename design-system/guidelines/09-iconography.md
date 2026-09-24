# Iconography

PlainLedger uses **Lucide**: `lucide-react` 0.475.0 in the web app and 0.462.0 in the admin console. The app imports 257 distinct icons. The ledger grid is the only custom glyph.

## Drawing

- 24px grid, 2px stroke, round caps and joins, no fill, `currentColor`. Don't change the stroke width per icon.
- Icons take the colour of the text beside them: `color-text-muted` in inactive nav, `color-interactive` in an active item, and the status colour inside alerts and toasts.
- No emoji anywhere in the product. Industry and feature icons are Lucide glyphs.

## Sizes

| Size | Class         | Where                                            |
| ---- | ------------- | ------------------------------------------------ |
| 12px | `w-3 h-3`     | KPI meta rows (ROI, action hint), compact trends |
| 14px | `w-3.5 h-3.5` | Compact KPI icon, checkbox check                 |
| 16px | `w-4 h-4`     | Buttons, nav items, dropdown items, inputs       |
| 20px | `w-5 h-5`     | Alert and toast icons, settings rows             |
| 64px | `w-16 h-16`   | Empty states, in `color-text-subtle`             |

## Icon tiles

- **Notification tile:** 40px, `radius-lg`, `color-bg-muted`. It scales to 1.05 when its row is hovered.
- **KPI tile:** 28 to 32px, `radius-lg`, `color-primary-500` at 10% with the icon in `color-primary-500`.
- **Store feature tile:** 48px, `radius-xl`, with a `store-feature-*-bg` wash and a `store-feature-*` icon.

## The app's vocabulary

| Meaning                | Icon                                            |
| ---------------------- | ----------------------------------------------- |
| Dashboard, overview    | `LayoutDashboard`                               |
| Analytics              | `BarChart3`, `PieChart`, `LineChart`            |
| Trends                 | `TrendingUp`, `TrendingDown`                    |
| Anomalies, warnings    | `AlertTriangle`                                 |
| Reports, statements    | `FileText`, `Receipt`                           |
| Board meeting          | `Presentation`                                  |
| Planning, targets      | `Target`                                        |
| Connections, data      | `Link2`, `Database`                             |
| Organization, team     | `Building2`, `Users`, `User`                    |
| Security, access       | `Shield`, `Lock`                                |
| Billing                | `CreditCard`, `DollarSign`                      |
| Notifications, support | `Bell`, `LifeBuoy`                              |
| Language               | `Globe`                                         |
| AI insight             | `Sparkles`, `Lightbulb`, `Zap`                  |
| Loading                | `Loader2`, spinning                             |
| Status                 | `CheckCircle`, `AlertCircle`, `Info`, `XCircle` |

## The uploaded set

The Icons group holds 50 of the most-used icons, generated from lucide-react 0.475.0's own paths. An `<img>` cannot inherit `currentColor`, so these files are drawn in #64748b (`color-text-subtle`). In code, import the component from `lucide-react` instead of using the files.
