# Email logo URL correction — 15 October 2026

The Keycloak email shell and the API Handlebars base referenced
`/logo-white.png`. A live GET returned HTTP 200 **text/html**, the website
fallback rather than an image. Status alone concealed the broken logo.

Both shells now use the existing first-party `/logo-full.png`. Its live GET
returns `image/png`, PNG signature bytes and 1200 × 320 dimensions; SHA-256
`5d968f0224770f47e4042f2f9588511f3bb763b12c22c67abfcb8538c476e84d`
matches the committed asset exactly.

## Design and architecture

AI design judgment: reuse the existing `EmailTemplatesService` presentation,
with a white header, the full 200px logo at its native proportion and a muted
tagline. Navy and green lettering is poorly suited to the previous green
header, and the former 32px/48px square constraints would distort the full
lockup. The wordmark already includes the brand name, so the separate large
text duplicate is removed. Alt text remains `PlainLedger`.

The header background and essential image dimensions remain inline for clients
that strip stylesheets. No asset is generated or changed. The API keeps its
configured `baseUrl`; Keycloak retains its existing first-party origin. Existing
FreeMarker directives and Handlebars interpolation semantics are unchanged.
This is a presentation correction to two existing templates, with no domain,
port, adapter, HTTP API, provider or infrastructure behavior change.

The branch starts at `origin/main` commit
`cd46ed5d9e586be4fffd292a6f25883061895d3b`. The primary `merge-all-prs` checkout
has unrelated changes and was preserved. The isolated worktree is inside
`.claude/worktrees/email-logo-url`; `.gitignore` now excludes that directory
family as required by the owner's worktree convention.

## Verification and limits

Eight Chromium presentation checks pass: each shell at 390px and 800px, with
its full stylesheet and with `<style>` removed. All load the actual current
PNG at 200px, retain its proportion, expose alt text, keep a white background
and use the readable muted tagline. Four full-layout screenshots were inspected.
These fixtures substitute sample content explicitly; they are not execution
of Keycloak/FreeMarker or the Handlebars runtime. FreeMarker directive tokens
were compared with the original source and remain identical.

The small reversible presentation correction adds no test that merely repeats
the replacement string. Focused evidence lives in the current chat's
`outputs/email-branding/plainledger/preview-evidence.json`, four screenshots
and `live-assets.json`. `git diff --check` passes. No full build, Keycloak
container, mailbox send, delivery qualification or deployment was performed.

## Official sources and actual versions

Checked 2026-10-15. Node used for the preview is 22.16.0 and the existing
Playwright installation is 1.63.0. No dependency was installed or upgraded.
The API lockfile pins Handlebars 4.7.8. The production Keycloak Dockerfile uses
23.0, while local Compose specifies 26.1; this pre-existing difference remains.

- [Keycloak 23.0 theme guidance](https://github.com/keycloak/keycloak/blob/23.0.0/docs/documentation/server_development/topics/themes.adoc)
  describes custom email/FreeMarker templates extending the existing theme.
- [Keycloak 26.1 theme guidance](https://github.com/keycloak/keycloak/blob/26.1.0/docs/documentation/server_development/topics/themes.adoc)
  confirms the same custom-template boundary for the local Compose version.
- [Handlebars 4.7.8 compiler](https://github.com/handlebars-lang/handlebars.js/blob/v4.7.8/lib/handlebars/compiler/compiler.js)
  and [compilation documentation](https://handlebarsjs.com/api-reference/compilation.html)
  confirm the existing interpolation/compilation approach. No template
  expression or rendering option changes.

This draft corrects prepared source. It does not establish that a production
Keycloak image or API deployment contains these templates or displays them in
a recipient's mail client.
