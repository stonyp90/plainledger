# Brand moments

A handful of moments carry the brand beyond ordinary screens. Keep each one exactly as specified, and don't invent new ones in feature work.

## The ledger grid

- The nine-cell mark appears in the sidebar, the header, the favicon, the PWA icons, the social cards and every email header.
- It is always `color-primary-500` on the product's own ground, or #e9fff6 cells on a `color-primary-600` tile when it stands alone as an icon.
- Ordinary in-app marks do not animate cell by cell. The app header retains its 1.05 hover scale.
- Owner-approved exception (2026-10-19): the public website entrance and Scaleforged portfolio card use the approved nine-tile assembly. The original renderer and outlined wordmark are retained in `apps/web/public/brand/splash/scene.html`; approval and hashes are in `approval.json`.

## The splash

- The public homepage plays the approved tile assembly on every full visit, not every client-side navigation. Its five-second visual score plays in three seconds, followed by a 320 ms fade into the existing website.
- Pause, Skip, Escape, French/English labels, reduced-motion bypass and a six-second failed-load escape are required. The website is never gated by session storage.

- The iOS launch screens (`apple-splash-*.png`, seven sizes from 1170×2532 to 2048×2732) centre the filled app tile on #0f172a.
- The PWA `background_color` is #0f172a, so Android shows the same navy.
- `index.html` paints the saved theme's ground (#0f172a for Dark, #f8fafc for Light) before the app loads, so the splash hands over without a flash.

## The loader

- `PageLoader` fills the screen with `color-bg`. It shows the mark in a 48px tile of `color-primary-500` at 10%, the word PlainLedger in bold, a processing animation, the message ("Loading..." / "Chargement...") in `color-text-muted`, and three 6px `color-primary-500` dots that bounce 150ms apart.
- The loader currently draws a generic cube where the ledger grid belongs. Use the ledger grid.
- Variants: `analytics` (a chart animation) and `minimal` (a spinning `Loader2` in `color-primary-500`).

## The orbit

- On the landing hero, the customer sits at the centre inside a conic emerald ring, with a halo that breathes over 4s.
- Six disciplines circle on three rings:
  - Accounting and Finance in emerald at radius 110.
  - Credits and Taxes in gold at 165.
  - Market and Investors in light emerald at 220.
- Each takes 42 to 72 seconds per turn, and alternate rings turn in opposite directions.
- Each discipline is a 40px round tile with a Lucide icon and a 1.5px outline at 25% of its colour.
- With reduced motion the orbit stops and a smaller static set is drawn.
- The tiles' outline, wash and glow are written by appending hex alpha to an `rgb(var(...))` string (`${color}40`). Browsers reject that value, so today the tiles render without them. Build tints with `rgb(var(--color-primary-600) / 0.25)` instead. The KPI sparkline's area fill has the same fault.

## James

- James is the AI assistant for questions about the numbers. The launcher sits at the bottom right. It is a `radius-2xl` button filled with a 135° gradient from `color-primary-500` to `color-primary-700`, with `shadow-2xl`, the white `Bot` glyph, "AI Assistant" over "⌘K", and a `Sparkles` glyph. A small green dot pulses on the glyph.
- The launcher is the one filled action in the app. Don't copy the treatment for other buttons.
- While James composes an answer, a 32px gradient tile with `Bot` sits beside a bubble. The bubble has a `color-bg` ground and a `color-border` line, and holds three 8px `color-primary-500` dots that bounce 150ms apart, with "Thinking..." / "Réflexion en cours..." in `color-text-muted`.
- The answer arrives as ordinary text in `color-text`. The figures it cites use `amount` or `metric-value`.

## The upgrade glint

- On Store and Enterprise surfaces, a premium card can take `card-gradient-border`: an emerald-gold-emerald border that circulates over 3s on hover.
- It is the only place emerald and gold meet in one mark, and it never appears inside the signed-in app.
