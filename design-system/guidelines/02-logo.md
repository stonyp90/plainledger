# Logo

The PlainLedger mark is a ledger grid: nine rounded cells in a 3×3 grid, like the cells of a ledger or a spreadsheet. The wordmark sets the name in Inter 800 in two colours: **Plain** in ink and **Ledger** in emerald.

## The mark

- **Geometry.** On the 512 grid each cell is 102.4 units square with a corner radius of 22.53 (22% of the cell). Cells sit 30.72 apart (30% of a cell), with a 71.68 margin to the edge. Keep these proportions when you redraw the mark at any size.
- **Colour.** The flat mark is `color-primary-500` (#10b981) on any ground. The relief mark (`mark-relief-*.png`) shades each cell from `color-primary-400` at the top to `color-primary-600` at the bottom; use it at 128px and above.
- **In the app.** The sidebar and header draw the mark inline on a 32×32 view box (6px cells at 5, 13 and 21, radius 1.3) in `rgb(var(--color-primary-500))`: 36px in the sidebar, 28 to 32px in the header. On hover it scales to 1.05.

## The app icon

- `app-icon.svg` is a `color-primary-600` (#059669) tile with an 18% corner radius (92.16 on 512). It holds nine #e9fff6 cells under a soft 12% shadow.
- The same tile is the favicon (`favicon.svg`, 32px), the Apple touch icon (180px) and the PWA icons (192 and 512, plus maskable versions with a safe zone).
- The PWA `theme_color` is `color-primary-500` #10b981 and its `background_color` is #0f172a.

## Lockups

| File                          | Use                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `logo-full.svg` / `.png`      | Horizontal lockup on light grounds: Plain #0f172a, Ledger #10b981.              |
| `logo-full-dark.svg` / `.png` | Horizontal lockup on navy: Plain #ffffff, Ledger #34d399 (`color-primary-400`). |
| `logo-stacked.svg` / `.png`   | Mark above the wordmark, centred, for square placements.                        |
| `logo-mark.svg`               | The mark alone, flat emerald on a transparent ground.                           |

The SVG lockups set the wordmark as live Inter text, so they need Inter 800 installed. Use the PNGs anywhere Inter is not guaranteed (email, documents, other sites).

## Wordmark

- Inter 800 with -1.5 tracking at 140px (`wordmark`, -0.011em). One word, two colours, never all caps.
- In the product, the wordmark sits beside the mark at `section-title` size. Plain takes `color-text` and Ledger takes `color-primary-500` in Light or `color-primary-400` in Dark.

## Clear space and size

- Keep one cell-width clear around the mark, and one cell-height between the mark and the wordmark.
- The smallest mark is 16px (`mark-16.png`). Below 24px, use the filled app tile rather than the flat grid, because the cells need a ground to read.

## Don't

- Don't colour the cells individually or animate them out of the grid.
- Don't swap the mark for a generic glyph. The page loader still draws a Lucide-style cube; it should show the ledger grid.
- Don't use the retired document-and-check logo that still appears in `screenshot-dashboard.png`.
- Don't put the light lockup on navy or the dark lockup on white.
- Don't make the gradient app tile from the old agent notes ("green gradient"). The tile is flat `color-primary-600`, and only the relief mark carries a gradient.
