# Accessibility

## What every screen does

- **Focus.** `:focus-visible` draws a 2px solid `color-focus-ring` outline with a 2px offset on every control. Toggles and checkboxes use the equivalent ring (`ring-2 ring-offset-2`). Never remove the outline without drawing another.
- **Touch.** Under 768px, targets are at least `size-touch` (44px), and nav items are 48px.
- **Motion.** `prefers-reduced-motion` turns animation off, and script-driven motion checks `useReducedMotion()`.
- **Language.** Labels, `aria-label`s, `<title>` and `<desc>` exist in English and French. Set `lang` on `<html>` to match.
- **Colour is never alone.** Badges carry a word, toasts and alerts carry an icon and a title, variances print their sign and percentage, and trends carry an arrow.
- **Charts are readable.** IBCS marks have `role="graphics-symbol"`, `aria-label`, `aria-roledescription`, `<title>` and `<desc>`, and pins can be reached with Tab.
- **Controls say what they are.** Toggles are `role="switch"` with `aria-checked`. Checkboxes are `role="checkbox"` and use `aria-checked="mixed"` when indeterminate. Toggle groups are `radiogroup` with `radio` options.

## Contrast that holds

| Pair                                                              | Light                 | Dark    |
| ----------------------------------------------------------------- | --------------------- | ------- |
| `color-text` on `color-surface`                                   | 17.9                  | 16.3    |
| `color-text-secondary` on `color-surface`                         | 10.4                  | 12.0    |
| `color-text-muted` on `color-surface`                             | 7.6                   | 7.0     |
| `color-text-muted` on `color-bg-muted`                            | 6.9                   | 6.5     |
| `color-interactive` on `color-surface`                            | 3.8 (large text only) | 9.3     |
| `color-error` on `color-surface`                                  | 4.8                   | 6.5     |
| Badge text on its wash (default, primary, success, warning, info) | 4.5–5.0               | 6.0–9.6 |
| `ibcs-actual` on `color-surface`                                  | 14.6                  | 14.5    |

## Pairs that miss, with the proposed fix

These pairs are the brand's own values, so they are kept exact here. Each has a proposed fix; apply it by changing the named role token, never by editing a component.

| Theme | Pair                                                           | Ratio     | Where it shows                                                              | Proposed fix                                                                          |
| ----- | -------------------------------------------------------------- | --------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Light | `color-interactive` #059669 on white                           | 3.8       | Links and `btn-primary` text at 13px                                        | Text in `color-interactive-hover` #047857 (5.5). Keep #059669 for outlines and marks. |
| Light | Active nav text #059669 on its 10% wash                        | 3.3       | The selected sidebar item                                                   | Text in #047857 (4.9 on the wash)                                                     |
| Light | `badge-error` text #dc2626 on its 10% wash                     | 4.2       | Error badges                                                                | Text in `color-error-dark` #b91c1c                                                    |
| Light | `color-focus-ring` #10b981 on white                            | 2.5       | Every focus outline                                                         | A #059669 ring (3.8)                                                                  |
| Light | `color-accent-500` #f59e0b on white                            | 2.2       | `btn-accent` text and outline                                               | Text #b45309, `color-accent-700` (5.0); outline #d97706 (3.2)                         |
| Light | `color-success` #16a34a on white                               | 3.3       | `amount-positive`, positive metric change                                   | `color-success-dark` #15803d (5.0)                                                    |
| Light | `color-warning` #d97706 / `color-info` #3b82f6 as text         | 3.2 / 3.7 | Warning and info copy                                                       | Their `-dark` steps (5.0 / 5.2), as the badges already use                            |
| Light | `color-border-strong` #94a3b8 on white                         | 2.6       | Input outlines                                                              | `color-border-emphasis` #64748b (4.8) at rest                                         |
| Both  | White on `color-primary-500`                                   | 2.5       | The check in a checked checkbox, toggle-group badges                        | Fill checked controls with `color-primary-600` (3.8)                                  |
| Light | White text on `color-primary-600` #059669                      | 3.8       | The filled button in HTML emails (`emailTemplates.tsx`, the Keycloak theme) | Fill with `color-primary-700` #047857 (5.5)                                           |
| Dark  | `color-text-subtle` #64748b on #0f172a                         | 3.7       | Placeholders                                                                | `color-gray-300` #94a3b8 (7.0)                                                        |
| Dark  | `ibcs-unfavorable` #dc2626 / `ibcs-neutral` #6b7280 on #0f172a | 3.7 / 3.7 | Variance pins and labels                                                    | `color-error` (#f87171, 6.5) and `color-gray-300` (7.0) in Dark                       |
| Dark  | `color-border-strong` #273346 on the input ground #151f30      | 1.3       | Input outlines                                                              | `color-gray-400` #64748b (3.5)                                                        |

## Checking new work

- Check text against the ground its token's usage note names, in both themes. Body text needs 4.5:1. Text at 24px or larger, or bold 19px or larger, needs 3:1.
- Borders that identify a control, focus rings and meaningful icons need 3:1.
- Success and error are a green and a red. Never let them differ by hue alone: add the word, the sign or an icon.
