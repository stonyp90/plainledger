# Colour

PlainLedger's palette has three families and two signal sets. Navy neutrals do most of the work. Emerald is the brand and the interactive colour. Gold is kept for upgrades. The status colours and the IBCS set only ever carry meaning.

## Families

- **Navy neutrals, `color-gray-25` to `color-gray-950`.** Slate, with custom navy steps at 700, 800, 850 and 950 for the dark theme. The names run one step lighter than Tailwind's slate: `color-gray-100` is slate-200 (#e2e8f0) and `color-gray-300` is slate-400 (#94a3b8). Check the hex value, not the number, when you move between the two.
- **Emerald, `color-primary-50` to `color-primary-900`.** The brand. 500 (#10b981) is the mark. 600 (#059669) is interactive in Light, and 400 (#34d399) is interactive in Dark.
- **Gold, `color-accent-50` to `color-accent-900`.** Prosperity and premium: `btn-accent`, Store figures, upgrade prompts. Amber 500 (#f59e0b) is the UI gold. The IBCS highlight uses a separate metallic gold, `ibcs-highlight` (#d4af37).
- **Status.** `color-success`, `color-warning`, `color-error` and `color-info`. Each has `-light` and `-dark` companions and brightens in Dark.
- **IBCS.** `ibcs-actual`, `ibcs-plan-stroke`, `ibcs-forecast`, `ibcs-prior-year`, `ibcs-favorable`, `ibcs-unfavorable`, `ibcs-neutral`, `ibcs-highlight` and `ibcs-benchmark`, each with a `-light` wash. See Data and IBCS.

## Roles

Build with the role tokens, not the ramps. The role tokens are what change between themes.

| Role                   | Light   | Dark    | Use                                 |
| ---------------------- | ------- | ------- | ----------------------------------- |
| `color-bg`             | #ffffff | #080f1e | Page ground                         |
| `color-bg-subtle`      | #f8fafc | #0f172a | Row hover, modal footer             |
| `color-bg-muted`       | #f1f5f9 | #151f30 | Quiet fills, ghost hover            |
| `color-bg-emphasis`    | #e2e8f0 | #1b2638 | Avatar ground, progress track       |
| `color-surface`        | #ffffff | #0f172a | Cards, sidebar, dialogs             |
| `color-surface-raised` | #ffffff | #151f30 | Inputs in Dark                      |
| `color-text`           | #0f172a | #f1f5f9 | Headings, values, totals            |
| `color-text-secondary` | #334155 | #cbd5e1 | Body, table cells, labels           |
| `color-text-muted`     | #475569 | #94a3b8 | Metadata, helper text, table heads  |
| `color-text-subtle`    | #64748b | #64748b | Placeholders and disabled text only |
| `color-border`         | #cbd5e1 | #1b2638 | Card and table lines                |
| `color-border-strong`  | #94a3b8 | #273346 | Input and secondary-button outlines |
| `color-interactive`    | #059669 | #34d399 | Links, primary outline, active tab  |
| `color-focus-ring`     | #10b981 | #34d399 | `:focus-visible` outline            |

## How much of each

- A screen is mostly neutral. Emerald appears on the mark, the active nav item, links, outlined primary actions, the focus ring and favourable numbers. It does not fill large areas. The one filled emerald element on a screen is the app icon or a checked control.
- Gold appears at most once per view, on the upgrade or premium action.
- Red and green are for money and status only: positive and negative amounts, favourable and unfavourable variance, success and error. Never use them for decoration or categories.
- Blue (`color-info`) is information: info alerts, info badges and the benchmark line. It is never a brand colour.

## Washes and outlines

The code builds tints by adding alpha to a colour's channels:

- Fills and hovers: `opacity-wash` (10%). Examples: `rgb(var(--color-primary-600) / 0.1)` for the active nav fill, `rgb(var(--color-error) / 0.1)` for the error alert.
- Badges in Dark: 15%.
- Outlines: 40% at rest and 70% on hover for primary and accent buttons. 30% at rest and 50% on hover for danger and success.
- Alert borders: 20%.

## Store and marketing tokens

The Store page reads its own aliases so marketing can be retuned in one place. Trust uses `store-trust-primary` (emerald), prosperity uses `store-prosperity-accent` (gold), and there are `store-cta-*`, `store-stat-*` and `store-feature-*`. They alias the ramps above and brighten in Dark. The Store's three gradients (trust badge, CTA section, CTA button) run emerald to gold at 135°.

## In code

- App code reads channels: `rgb(var(--color-text))`, `rgb(var(--color-primary-500) / 0.15)`. Tailwind exposes the same names (`bg-surface`, `text-text-muted`, `border-border`, `bg-primary-600/10`).
- Artifacts and previews built from this system read complete colours: `var(--color-text)`.
- Never hard-code a hex value. The only literal palettes are `BRAND_COLORS` in `lib/emailTemplates.tsx` and the Keycloak email template, because email clients ignore CSS variables. `IBCSColors` in `lib/ibcs/theme.ts` is the source of the `ibcs-*` tokens.
