# Approved PlainLedger entrance — 2026-10-19

Owner requested the approved tile assembly on the public website, not only a branch or downloadable preview. The original renderer and outlined wordmark are retained and hash-checked.

## Pre-deployment checks

- `node --test apps/web/tests/brand-entry.test.mjs`: 3/3 pass.
- `node --check apps/web/public/brand/splash/entry.js`: pass.
- `VITE_MOCK_AUTH=false VITE_API_URL= VITE_KEYCLOAK_URL= npm run build` in apps/web: pass.
- `apps/web/tests/brand-entry.browser.cjs` against the compiled dist: 11/11 checks pass in macOS headless Chrome.
- Viewports: 1440×900, 390×844, 320×568 and 768×1024. Automatic playback, page handoff, replay on full reload, pause, Escape, French skip label, reduced-motion bypass and missing-scene escape verified.

Run the same browser test with `SITE_URL=https://plainledger.ca/` after publishing to verify the actual deployment. Set PLAYWRIGHT_MODULE to an installed Playwright package and EVIDENCE_DIR to the screenshot/report destination. No dependencies, application routes, backend settings or existing iOS splash assets were changed.
