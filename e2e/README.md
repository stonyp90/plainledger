# Verification and E2E Coverage

This is a map of the checked-in verification scope, not a record of passing runs or a production certification. Associate any result with its exact Git commit, workflow URL, target environment and retained artifacts. A successful public website deployment does not establish that customer accounts, accounting providers or billing work.

## Required verification workflow

[`.github/workflows/verify.yml`](../.github/workflows/verify.yml) runs on pushes to `main` and `fix/plainledger-*`, pull requests to `main`, and manual dispatch. It has no nightly schedule.

| Job | What it executes | Boundary |
| --- | --- | --- |
| `quality` | Locked installs, TypeScript checks and builds for API, web and admin. API and web unit tests. | Admin has build/type verification, not an admin browser suite. Unit tests may use dependency doubles. |
| `oracle-config` | Python tests for the Oracle deployment helpers. | Archive, configuration, SSH and response-validation fixtures. Does not contact or provision an Oracle host. |
| `real-stack` | Empty-database bootstrap and repeat-bootstrap rejection, real PostgreSQL, Redis and Keycloak, production API/web builds, strict browser suite, and real S3 storage harness. | Disposable loopback infrastructure and synthetic tenants. `NODE_ENV=production` is an application mode, not a production deployment. |

The real stack creates one human owner in Keycloak and two organizations in PostgreSQL. Registration and email verification are disabled in the generated test realm, SMTP is empty, and invitation email delivery is disabled. Mock authentication and TypeORM schema synchronization remain disabled.

## Strict browser coverage

[`playwright.strict.config.ts`](../playwright.strict.config.ts) selects only `*.public.spec.ts`, `keycloak-auth.spec.ts` and `real-ledger.spec.ts`. The current selection expands to 14 browser/API tests. Both projects use Chromium. Public-page tests change viewport dimensions but do not run Safari, Firefox or device-specific browser engines.

| Actor and workflow | Assertions in the selected suite | Evidence source |
| --- | --- | --- |
| Anonymous visitor | Seven fixture pages at 360, 768 and 1440 pixels in EN and FR settings. Visible expected headings, no document overflow, no invalid SVG coordinates and no uncaught page errors. | [`public-states.public.spec.ts`](public-states.public.spec.ts), [`public-pages.json`](../fixtures/ui/public-pages.json) |
| Anonymous visitor at protected pages | `/app/reports` redirects to sign-in. The application does not collect a password. Empty/malformed contact fields do not submit. | `public-states.public.spec.ts` |
| Owner signing in | Actual Keycloak authorization-code flow with S256 PKCE, invalid-password feedback, access/ID subject consistency, token refresh, expected API audience, reload persistence and logout. | [`keycloak-auth.spec.ts`](keycloak-auth.spec.ts), [`helpers/real-auth.ts`](helpers/real-auth.ts) |
| Anonymous or forged identity | Protected REST rejects absent/unsigned tokens. GraphQL rejects anonymous access. Authenticated requests targeting the other tenant are forbidden. | `keycloak-auth.spec.ts`, [`real-ledger.spec.ts`](real-ledger.spec.ts) |
| Owner reading financial reports | GraphQL income statements and balance sheets reconcile to dated posted SQL fixtures for two periods and an empty period. Draft/foreign amounts are excluded. Reversed date ranges and oversized pagination are rejected. | `real-ledger.spec.ts`, [`isolated-ledger.sql`](../fixtures/accounting/isolated-ledger.sql) |
| Owner changing organization settings | General/threshold settings persist and read back. Invalid thresholds and foreign organization writes fail. Feature output is tenant scoped. | `real-ledger.spec.ts` |
| Owner managing membership and invitations | Member listing, last-owner demotion/removal protection, invitation creation/preview, wrong-account acceptance rejection, resend token rotation and revocation. Delivery explicitly remains `unsent`. | `real-ledger.spec.ts` |
| Owner viewing accounting connections | Empty connections are returned. Unconfigured providers are marked unsupported and QuickBooks connection initiation fails explicitly. | `real-ledger.spec.ts` |

The report, settings and invitation assertions make authenticated HTTP requests using a token from a real browser login. They do not click through every corresponding application screen. Public locale coverage establishes rendering under each setting, not completeness of every translation or accessibility requirement.

## Actual storage and accounting synchronization

[`datalake-real-storage.cjs`](datalake-real-storage.cjs) exercises 14 named checks using real loopback S3, PostgreSQL and Redis. QuickBooks responses are synthetic fixtures. The harness never imports the full application module or calls an accounting provider.

Its assertions cover empty/missing files, pagination across 1,005 partitions, file/row/object limits, snapshot replacement and deletion, duplicate keys, tenant scoping, malformed payloads, balanced SQL journals, immutable committed S3 snapshots, negative balances and reversals, deterministic repeated synchronization, independent tenant snapshots, partial S3 staging failure, SQL transaction rollback and cache invalidation after an empty replacement.

The CI workflow builds the exact upstream MinIO source revision with its pinned compiler and records source/module/binary provenance. This enables a real storage compatibility test. It does not qualify a production storage image, provider account or cloud network configuration.

The harness refuses non-CI execution, non-loopback dependencies, a database without the expected bootstrap marker, an occupied storage bucket or existing fixture identities. Do not aim it at production or weaken those guards to reuse customer data.

## Concrete gaps before a full production claim

| Capability | Why the present gate does not establish it |
| --- | --- |
| New account, email verification, password reset and completed onboarding | The strict realm starts with a pre-created, verified owner and disables registration and SMTP. Onboarding unit tests do not complete a new-user journey against deployed identity and email services. |
| Successful invited-user acceptance and the role matrix | The selected suite creates an invitation but attempts acceptance only from the wrong account. No invited viewer, accountant or organization administrator logs in. Membership unit tests cover several permission rules with dependency doubles. |
| Platform administration | The admin app is compiled and type checked. It is not started or navigated in the strict job, and no platform administrator identity is exercised there. |
| Real accounting-provider authorization and synchronization | Strict CI supplies no QuickBooks OAuth configuration, and the storage harness supplies fixture provider responses. Live authorization, callback, token renewal, source reconciliation and disconnect still need a dedicated provider tenant. `AccountingConnectionsService` currently marks Xero, Sage, FreshBooks and Wave unsupported. |
| Stripe and transactional messages | The strict workflow supplies no Stripe credentials/webhook secret and asserts no payment or subscription lifecycle. Invitations stay unsent and no contact, verification or reset message delivery is asserted. |
| Remaining product screens and outputs | Strict assertions target balance sheet/income statement API results and selected organization APIs. Cash-flow UI, report exports/downloads, document uploads/sharing, Power BI, AI outputs and the older dashboard/industry/settings browser suites are outside this selection. |
| Production operation | A healthy loopback stack does not exercise Cloudflare origin routing, public OIDC, production storage policy, backup restoration, monitoring alert delivery, or load/scaling behavior. These require the deployed services and their own evidence. |

Some boundaries also have API or web unit coverage. Count that as the corresponding unit coverage, not as a completed browser, external-service or production journey.

## Legacy suites and their limits

`npm run test:e2e` uses [`playwright.config.ts`](../playwright.config.ts), not the strict configuration. Testcontainers are enabled only when `USE_TESTCONTAINERS=true` or `npm run test:e2e:containers` is used.

Older files such as `quickbooks-real-data.spec.ts`, `full-flow-premium.spec.ts`, `etl-flow.spec.ts`, `accessibility.spec.ts` and `performance.spec.ts` are not selected by `verify.yml`'s strict command. Review their prerequisites and assertions before treating them as a gate:

- `quickbooks-real-data.spec.ts` skips without refresh-token/realm configuration. Some assertions accept an empty state or run only when a response is successful. A present filename or a skipped run cannot prove live QuickBooks integration.
- `full-flow-premium.spec.ts` writes `mock_auth_user` and plan/tenant values into local storage. It does not establish real authentication or provider data correctness.
- Accessibility and performance files are outside the strict selection. The public rendering test checks specific geometry/runtime problems, not a complete accessibility audit or performance benchmark.

Keep provider credentials outside checked-in documentation and fixtures. Use only a dedicated, authorized sandbox when intentionally running an external-service suite.

## Running the selected checks

Use the workflow for the complete disposable stack. It records the exact dependency setup, bootstrap, realm generation, builds and runtime checks. Running Playwright alone does not create these dependencies.

```bash
# Dependency-free readiness response regressions
node --test e2e/wait-for-http.test.cjs

# Public-only checks against an explicitly selected, already running target
BASE_URL=http://localhost:5173 npx --no-install playwright test --config playwright.strict.config.ts --project=public

# Entire strict suite after provisioning the disposable stack and its dedicated identity
npx --no-install playwright test --config playwright.strict.config.ts
```

The authenticated tests require `E2E_USERNAME` and `E2E_PASSWORD`. `real-ledger.spec.ts` changes settings and invitations in the expected fixture tenant. Do not substitute a customer account or run this write-capable suite against production as a generic smoke test.

## Deployment gates and retained evidence

Cloudflare website delivery requires the workflow-accessible `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Missing values fail deployment preflight. An active DNS zone or signed-in dashboard does not supply those workflow credentials. Customer sign-in additionally needs a real API origin, public identity provider and the corresponding build variables. See [`CLOUDFLARE_DEPLOYMENT.md`](../docs/CLOUDFLARE_DEPLOYMENT.md).

The Oracle candidate requires an existing authorized host, protected host configuration, reviewed image pins, deployment identity/host verification and a successful verification run for the exact commit. Its activation phase checks public routing, expected release, real readiness, OIDC and storage boundaries. See [`deploy/oracle/README.md`](../deploy/oracle/README.md).

Review the workflow conclusion and every job, including failures/skips. The `real-stack-browser-results` artifact retains `playwright-report/`, `test-results/e2e-results.xml`, runtime logs, storage build provenance and the storage harness result JSON when completed. Failed browser cases retain traces/screenshots. Storage provenance without a completed harness result is not a passing storage result.
