# Surfaces

The same system runs on five surfaces. Each has its own constraints.

## Web app (`apps/web`)

- Vite, React 19 and Tailwind 3, with tokens as CSS variables in `src/styles/tokens.css` (generated) and components in `src/styles/globals.css`.
- Dark by default. Everything on this page applies here first.
- Shared classes: `btn-*`, `card*`, `input`, `select`, `textarea`, `label`, `badge-*`, `financial-table`, `amount*`, `nav-item`, `metric-card`, `toast-*`, `modal*`, `dropdown-*`, `progress-bar*`, `tabs`/`tab`, `icon-btn*`, `status-dot-*`, `alert-*`, `tooltip`, `kbd`. Reach for these before writing utilities.

## Marketing (Landing and Store)

- The same tokens, plus the `store-*` aliases.
- The Light nav is a warm off-white, rgba(254, 253, 251, 0.92) with blur. The Dark nav is navy at 92%.
- The gold call to action is `.store-cta-button`: a 2px `color-accent-500` outline at 50%, weight 600, 14 × 32px padding, `radius-xl`, with a 10% gold wash on hover.
- The trust badge is a pill with an emerald-to-gold 10% gradient and a `store-trust-primary-border` outline.
- The feature card is `radius-2xl` with 24px padding, and lifts with `shadow-lg` and a 1.02 scale on hover.
- The pricing highlight has a 2px `color-primary-500` border over an emerald-to-gold 10% gradient.
- The orbit and the upgrade glint live only here.

## Admin console (`apps/admin`)

- Next.js 14. It opens in **Light** and stores `admin-theme`.
- It still runs its own palette: `--admin-*` variables, a Tailwind `admin-*` ramp equal to Tailwind slate, primary emerald 400–700 and accent amber 400–600. On top of that sit light-theme override rules for `.bg-admin-*` classes.
- Move it onto the role tokens with this mapping:

| Admin variable                    | Dark    | Light   | Map to                                                                           |
| --------------------------------- | ------- | ------- | -------------------------------------------------------------------------------- |
| `--admin-bg`                      | #0f172a | #f8fafc | `color-bg`                                                                       |
| `--admin-surface`, `--admin-card` | #1e293b | #ffffff | `color-surface`                                                                  |
| `--admin-border`                  | #334155 | #e2e8f0 | `color-border`                                                                   |
| `--admin-text`                    | #f8fafc | #1e293b | `color-text`                                                                     |
| `--admin-text-muted`              | #94a3b8 | #64748b | `color-text-muted`                                                               |
| `--admin-primary`                 | #10b981 | #059669 | `color-interactive`                                                              |
| `--admin-accent`                  | #f59e0b | #d97706 | `color-accent`                                                                   |
| `--admin-success`                 | #10b981 | #059669 | `color-success` (the admin console uses emerald for success; the app uses green) |
| `--admin-warning`                 | #f59e0b | #d97706 | `color-warning`                                                                  |
| `--admin-error`                   | #ef4444 | #dc2626 | `color-error`                                                                    |
| `--admin-info`                    | #3b82f6 | #2563eb | `color-info`                                                                     |

- The admin console already shares the radius, shadow and transition values with the app.

## Email

- HTML email can't read CSS variables, so `BRAND_COLORS` in `apps/web/src/lib/emailTemplates.tsx` and the Keycloak theme (`keycloak/themes/plainledger/email`) hold literal values. They are all from this system: #059669 primary, #10b981 light, #047857 dark, #f59e0b accent, #0f172a text, #64748b muted, #e2e8f0 border, #f8fafc ground.
- Email is Light only. It uses a white card with a `color-border` line and a 12px radius on an #f8fafc ground, with the 40px emerald mark tile in the header.
- Email is the one surface where the main action is a **filled** `color-primary-600` button: white text at weight 500, 12 × 24px padding, 8px radius. Clients don't render outline and hover states reliably.
- Copy opens with "Hi {name}," and closes with "The PlainLedger Team". Every template has French strings (`messages_fr.properties`).

## Installed app (PWA)

- `manifest.json` sets `theme_color` #10b981, `background_color` #0f172a and `display: standalone`. The icons are 192 and 512, each also maskable.
- The iOS launch images are listed under The splash, in Brand moments.
- The PWA screenshots should show the current app. `screenshot-dashboard.png` still shows the retired logo.
