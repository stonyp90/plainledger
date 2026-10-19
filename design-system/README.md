# PlainLedger design system

PlainLedger turns a small business's books into plain numbers. It connects QuickBooks, Xero or Sage, reads the ledger into industry KPIs and IBCS statements, and flags what moved before the accountant has to ask. Owners and their CPAs across Canada use it in English and French. The identity is a ledger grid in emerald on corporate navy, Inter set tight, and money in a mono face that lines up. It should feel like a careful CPA, not a trading app: calm surfaces, outlined actions, and colour that always means something.

This folder is the source of truth for that identity. The browsable version, with a live preview of every component in both themes, is the **PlainLedger** Design System artifact: https://claude.ai/artifact/7H67WeQxHbhm2kCVHzje89 (private until shared from its Share menu).

## What lives here

| Path               | What it is                                                                                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokens.json`      | Every colour (Light and Dark), text style, spacing step, radius, shadow, transition, opacity, z-index, breakpoint and fixed size, each with a usage note.                                               |
| `build-tokens.mjs` | Generates `apps/web/src/styles/tokens.css` from `tokens.json`. Run `npm run tokens` after any change. CI runs the same check (`npm run tokens:check`) in the Lint Web job and fails when the two drift. |
| `guidelines/`      | The brand book: voice, logo, colour, type, layout, motion, data and IBCS, brand moments, iconography, accessibility and surfaces.                                                                       |

## Changing a token

1. Edit `design-system/tokens.json`. Colours take hex, `rgba()` or an alias such as `"{color-primary-600}"`, per theme: `{ "light": …, "dark": … }`.
2. Run `npm run tokens` from the repository root.
3. Commit `tokens.json` and `apps/web/src/styles/tokens.css` together.

Never edit `tokens.css` by hand. The CI check will reject it.

## Using it in code

- **Colours.** The app stores colours as R G B channels so Tailwind can add alpha. Write `rgb(var(--color-surface))` or `rgb(var(--color-primary-500) / 0.1)` in CSS and inline styles. Tailwind exposes the same names: `bg-surface`, `text-text-muted`, `border-border`, `bg-primary-600/10`, `text-accent`. Never hard-code a hex value in a component.
- **Build with roles, not ramps.** Use `color-bg`, `color-surface`, `color-text*`, `color-border*`, `color-interactive*` and `color-focus-ring`. These change between Light and Dark. The ramps (`color-gray-*`, `color-primary-*`, `color-accent-*`) stay fixed across themes.
- **Component classes first.** `apps/web/src/styles/globals.css` defines `btn-*`, `card*`, `input`, `select`, `textarea`, `label`, `badge-*`, `financial-table`, `amount*`, `nav-item`, `metric-card`, `toast-*`, `modal*`, `dropdown-*`, `progress-bar*`, `tabs` and `tab`, `icon-btn*`, `status-dot-*`, `alert-*`, `tooltip` and `kbd`. Reach for these before writing utilities.
- **Charts.** Use the IBCS helpers in `apps/web/src/lib/ibcs/` and the components in `apps/web/src/components/charts/ibcs/`. The `--ibcs-*` variables mirror `IBCSColors` for CSS.
- **Copy.** Every string needs `en` and `fr` through `useI18n()`. Use the report or chart formatter for detailed amounts and `formatCurrency()` for summary figures. Keep the currency and locale explicit.
- **Icons.** `lucide-react`, 2px stroke, in the colour of the text beside it. No emoji.

## The ten rules

1. **Tokens only.** Every colour reads a token. In app code that is `rgb(var(--color-surface))`, or `rgb(var(--color-primary-500) / 0.1)` for a wash. Never put a hex value in a component. The only literal palettes left are the HTML emails and the IBCS constants, and both mirror tokens named here.
2. **Actions are outlined.** A button is transparent, with a 1px outline in its colour at `opacity-outline` (40%) and text in that colour at weight 500. Hover adds an `opacity-wash` (10%) fill and raises the outline to `opacity-outline-hover` (70%). `btn-primary` is emerald (`color-interactive`), `btn-accent` is gold, `btn-secondary` is neutral (`color-border-strong`), `btn-ghost` has no outline, and `btn-danger` is `color-error`. Solid fills are for state (a checked toggle or checkbox, a status dot, a progress bar), for the app icon, and for James's launcher, which is the one filled action in the app.
3. **Emerald means trust, gold means upgrade.** `color-primary-*` carries the brand, links, focus and favourable variance. `color-accent-*` (gold) appears only on premium and upgrade moments (Store, Enterprise, pricing). Never set gold as body text on white. Blue (`color-info`) means information, never brand.
4. **Dark is the default.** The signed-in app opens in Dark (`plainledger-theme`, class `dark` on `<html>`). Light is the base the CSS is written against and the admin console's default. Design both, and check Dark first.
5. **Numbers line up.** Money in tables is JetBrains Mono (`amount`) with tabular numerals, right-aligned. KPI figures use `metric-value` with `tabular-nums`. Detailed financial reports, chart tables and recorded-value labels preserve cents with two decimal places, such as `$47,500.25` in English and `47 500,25 $` in French. Set both fraction-digit limits explicitly so runtime locale defaults cannot change the display. Summary KPIs may use whole dollars, and chart axes may use compact notation. Never abbreviate or round away cents in recorded-value tables or exports.
6. **Charts speak IBCS.** Actuals (AC) are solid `ibcs-actual`. Plan (PL) is a 2px `ibcs-plan-stroke` outline. Forecast (FC) is dashed `ibcs-forecast`. Prior year (PY) is `ibcs-prior-year` at 60%. Colour a variance by what the metric means: revenue above plan is favourable, expenses above plan are not, and anything inside ±2% is neutral. Write the codes (AC, PL, ΔPY%) in `ibcs-code`.
7. **Cards are flat.** A card is `color-surface` with a 1px `color-border` and `radius-lg`. Shadows (`shadow-lg` to `shadow-2xl`) belong to things that float: menus, tooltips, toasts, dialogs. An interactive card earns `shadow-sm` on hover only.
8. **Radii are refined, not playful.** Badges are `radius-sm` (4px), controls `radius-md` (6px), cards `radius-lg` (8px), floating panels and KPI cards `radius-xl` (12px), dialogs `radius-2xl` (16px). Only toggles, avatars, status dots, progress bars and trust badges are fully round.
9. **Every word exists in both languages.** All copy lives in English and Canadian French through `useI18n()`. `en-CA` is the default and `fr-CA` is first-class. Keep labels short enough to fit in both.
10. **Three speeds, one curve.** Use `transition-fast` (100ms) for colour changes, `transition-normal` (150ms) for surfaces and `transition-slow` (200ms) for entrances, all ease-out. `prefers-reduced-motion` collapses everything to 0.01ms.

## Themes

There are two themes, **Light** and **Dark**.

- Dark ("corporate navy") is the default in the web app. `color-bg` #080f1e sits under `color-surface` #0f172a, with text in `color-text` #f1f5f9. `index.html` paints #0f172a before React loads, so there is no white flash.
- Light is white on white. `color-bg` and `color-surface` are both #ffffff, separated by `color-border` lines, with `color-bg-subtle` and `color-bg-muted` for washes and hovers.
- The choice is stored as `plainledger-theme` (web) or `admin-theme` (admin console). There is no "system" option: a saved "system" becomes Dark on the web and Light in the admin console.
- Status colours brighten in Dark (`color-success` #16a34a becomes #22c55e) so they hold contrast on navy. The IBCS actual bar flips from `ibcs-actual` #1e293b to #e2e8f0.

## Brand moments

- **The ledger grid:** the 3×3 mark of rounded cells. It goes from a 16px favicon to the 1024px relief mark, and the sidebar draws it inline in `color-primary-500`.
- **The splash:** the iOS launch screens place the filled emerald app tile at the centre of #0f172a.
- **The loader:** the wordmark over a processing animation and three emerald dots that bounce 150ms apart.
- **The orbit:** on the landing hero, six disciplines circle the customer on three rings, taking 42 to 72 seconds per turn.
- **James:** the AI assistant's launcher is an emerald gradient (`color-primary-500` to `color-primary-700`) carrying the Bot glyph and ⌘K. While James thinks, three emerald dots bounce beside "Thinking...".

## Known gaps

These are documented in `guidelines/` and left for follow-up work:

- **Contrast.** Several brand pairs miss WCAG AA. Examples: `color-interactive` text on white (3.8:1), the Light focus ring (2.5:1), gold button text (2.2:1), input outlines, and IBCS red in Dark. `guidelines/10-accessibility.md` lists each pair with a proposed token fix.
- **Admin console.** `apps/admin` still runs its own `--admin-*` palette. `guidelines/11-surfaces.md` maps each variable to its role token.
- **Page loader.** `PageLoader` draws a generic cube instead of the ledger grid.
- **Avatar.** `Avatar` uses `color-text` as a ground colour, and that hides the white initials in Dark.
- **Invalid colour values.** The landing orbit and `KPICard`'s sparkline append hex alpha to `rgb(var(...))` strings, and browsers ignore the result.
- **Retired logo.** `public/screenshot-dashboard.png`, the PWA screenshot, still shows a retired logo.
