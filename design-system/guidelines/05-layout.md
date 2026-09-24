# Layout

## The app shell

- **Header:** `size-header` (64px), `color-surface`, with a 1px `color-border` bottom rule. The mark sits left and the organization switcher, notifications and account menu sit right.
- **Sidebar:** `size-sidebar` (256px), or `size-sidebar-collapsed` (64px) when collapsed, on `color-surface`. The logo bar is 64px tall. Nav groups are Overview, Analytics, Reports, Planning and Data, and Settings opens a flyout. The sidebar docks at `screen-lg` and becomes a drawer below it.
- **Content:** `color-bg` behind `color-surface` cards. In Light both are white, so cards separate by their `color-border` line alone.

## Spacing

- Use Tailwind's 4px scale through utilities (`p-4`, `gap-3`). The tokens are named after the class suffix, so `space-4` is 16px.
- Card padding grows with the screen: `space-4` (16px) on phones, `space-5` (20px) from 640px, `space-6` (24px) from 1024px. The compact card uses 12px, then 16px.
- Put `space-6` (24px) between dashboard sections and `space-8` (32px) between page sections.
- Inside a component, use `space-2` (8px) between an icon and its label and `space-1.5` (6px) between a label and its field.
- Use `gap` in flex and grid layouts rather than margins between siblings.

## Grids

- `.grid-cards` is one column, then 2 from `screen-sm`, 3 from `screen-lg` and 4 from `screen-xl`.
- KPI rows fill whole rows. Pick a column count the tiles divide into, rather than leaving one tile alone on the last row.
- Statements and tables scroll horizontally inside their card on phones. The page itself never scrolls sideways.

## Mobile

- Under `screen-md` (768px), every button, link, input and select is at least `size-touch` (44px) tall. Nav items are 48px with 12px × 16px padding.
- Under `screen-sm` (640px):
  - Modals become bottom sheets with `radius-2xl` top corners and a 90dvh maximum. `.modal-fullscreen-mobile` fills the screen.
  - Toasts span the width with 16px insets.
  - The notification panel drops from the header at full width.
- Respect the safe areas with `.safe-area-top`, `.safe-area-bottom` and `.safe-area-x` on anything fixed to an edge.

## Layers

Use the `zIndex` tokens, in order from the bottom:

| Token              | Value | What sits there                                  |
| ------------------ | ----- | ------------------------------------------------ |
| `z-base`           | 0     | Chart and card backgrounds                       |
| `z-chart`          | 10    | Chart titles, headers and legends                |
| `z-controls`       | 20    | Inline chart controls and resize handles         |
| `z-dropdown`       | 30    | Menus opened from those controls                 |
| `z-floating`       | 40    | Popovers and floating panels                     |
| `z-overlay`        | 50    | Tooltips, the notification panel, modal overlays |
| `z-modal-backdrop` | 60    | Dialog backdrops                                 |
| `z-modal`          | 70    | Dialogs and drawers                              |
| `z-fullscreen`     | 9997  | Fullscreen charts                                |
| `z-toast`          | 9998  | Toasts, above fullscreen charts                  |
| `z-critical`       | 99999 | Blocking overlays only                           |

Chart controls go in the corners, at least 40px below the chart's top edge, so they never cover a title. Their menus open downward, and close on an outside click or Escape.

## Surfaces and lines

- A card is `color-surface`, a 1px `color-border` line and `radius-lg`, with no shadow.
- A highlighted card (`card-highlight`) swaps the line to `color-primary-500` and fills with `color-primary-50`, or `color-primary-900` at 20% in Dark.
- Use `color-border-subtle` for rows inside a card and `color-border-strong` for the rule above a total row.
- Floating layers take shadows: `shadow-lg` for menus and tooltips, `shadow-xl` for toasts and `shadow-2xl` for dialogs and the notification panel.
