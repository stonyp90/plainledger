# Website Hosting on Cloudflare (Free Plan)

The public website (`apps/web`) runs on Cloudflare Workers with static assets. It costs **$0/month**:
static asset requests are free and unlimited, and DNS is free. The only cost is the GoDaddy domain renewal.

| Hostname                           | Served by                         | Behaviour                                                                                                            |
| ---------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `plainledger.ca`                   | Worker `plainledger-web`          | The Vite build (all pages, deep links via SPA fallback)                                                              |
| `plainledger.ca/api/*`, `/graphql`, `/health/*` | same Worker, `worker/index.ts` | Proxied to `API_ORIGIN` when set; otherwise a JSON 503. Health checks never use the HTML SPA fallback. |
| `www.plainledger.ca`               | Worker `plainledger-www-redirect` | 301 to `https://plainledger.ca` (same path and query)                                                                |

Without a backend the app runs in **guest mode**: every public page works, and `/app/*` sends visitors to the login page.

## One-time setup (about 10 minutes)

1. **Add the domain to Cloudflare**: [dash.cloudflare.com](https://dash.cloudflare.com) → _Add a domain_ → `plainledger.ca` → **Free** plan.
   Cloudflare then shows two nameservers (`<name>.ns.cloudflare.com`). No DNS records are needed for the website; the Workers create their own.
2. **Point GoDaddy at Cloudflare**: GoDaddy → _My Products_ → `plainledger.ca` → _DNS_ → _Nameservers_ → _Change nameservers_ →
   _I'll use my own nameservers_ → enter the two Cloudflare nameservers → _Save_.
3. **Create a Cloudflare API token**: _My Profile_ → _API Tokens_ → _Create Token_ → template **Edit Cloudflare Workers**.
   Set _Account Resources_ to your account and _Zone Resources_ to _Specific zone_ → `plainledger.ca`, add the permission
   **Zone → Zone → Read**, then create the token. The **Account ID** is shown on the _Workers & Pages_ overview page.
4. **Add GitHub secrets**: repository _Settings_ → _Secrets and variables_ → _Actions_ → add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
5. **Deploy**: merge to `main` and wait for both **PlainLedger verification** and **CI/CD Pipeline** to pass for that commit. Completion of either workflow triggers a website deployment attempt; publishing remains blocked until both qualify.
   To repeat a deployment, run _Actions_ → **Deploy Website (Cloudflare)** → _Run workflow_ on `main`; the current commit must already satisfy both workflows and all required CI jobs below.
   The first run publishes to `plainledger-web.<account-subdomain>.workers.dev`. Once Cloudflare marks the zone **Active**
   after the nameserver change, run the workflow again: it attaches `plainledger.ca` and `www.plainledger.ca`
   and Cloudflare issues the certificates. While the zone is pending, the job summary lists the nameservers to set at GoDaddy.

## How deploys work

`.github/workflows/deploy-website.yml` runs after **PlainLedger verification** or **CI/CD Pipeline** completes on `main`, or by manual dispatch on `main`:

1. Validates the source before checkout: the triggering completion must belong to the exact `verify.yml` or `ci.yml` workflow in this repository, run on `main` by push or manual dispatch, and finish successfully. A manual deployment must also target `main`. The source SHA must still be the current `main` commit. Pull request, fork and stale runs cannot authorize checkout. For a `workflow_run` event, the source is its `head_sha`.
2. Runs `.github/scripts/require_production_quality.py` from that immutable Git commit. The newest exact-commit `verify.yml` **and** `ci.yml` runs must both be completed successfully. The latest CI attempt must contain exactly one successful **Lint API**, **Lint Web**, **Test API** and **Test Web** job. Missing, pending, failed, cancelled or skipped evidence blocks publishing; an older success cannot hide it. Manual inputs that skip required jobs do not qualify.
3. Checks the Cloudflare credentials, installs locked dependencies and builds the site (`npm run build`) with the repository variables below. The lockfile already includes the Linux Rollup binary. Cloudflare credentials are available only to the steps that need them.
4. Checks the zone status through the Cloudflare API, then repeats the complete current-main and quality checks immediately before publishing the website Worker. The gate uses a read-only GitHub token and receives no Cloudflare credentials.
5. Runs `wrangler deploy` (adds `--domain plainledger.ca` once the zone is active). It repeats the same gate again immediately before publishing the www redirect.
6. Retries the complete smoke-test contracts during edge propagation and writes the verified SHA, both quality-run URLs and deployment results to the summary.

An early automatic attempt can be blocked while the other workflow is still running. Its later successful completion starts another attempt. Fix genuine lint, test or coverage failures before retrying; passing functional tests alone does not satisfy the existing coverage thresholds. When retrying CI, use **Re-run all jobs** if a failed-only retry would omit any of the four required jobs from the latest attempt.

The gate also returns `verification_run_id` and `verification_run_attempt` for consumers that bind qualified artifacts to an exact verification attempt. Its isolated metadata fixtures run with `python3 -m unittest discover -s deploy/oracle/tests -p test_production_quality_gate.py -v`; they make no GitHub or cloud calls.

The automatic `workflow_run` trigger becomes available when this workflow is present on the default branch.
The workflow uses `contents: read` and `actions: read` for its GitHub checks. Deployment runs share one concurrency group and do not cancel an active publish.
See [GitHub's workflow-run event documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run) for the event and source-SHA behavior.

Without the Cloudflare secrets the deployment fails at preflight and reports the missing configuration.
The summary marks the website verified only after the public site, readiness response and www redirect checks pass.
Each HTTP smoke request has a five-second connect timeout and a twenty-second total timeout, with up to twelve attempts.
Configured backends must return HTTP 200 JSON with connected database and cache on `/health/ready`; website-only mode must return the explicit HTTP 503 JSON contract.
The www check requires a direct HTTP 301 with the exact canonical hostname, path and query, without following the redirect.

Optional repository **variables** (_Settings_ → _Secrets and variables_ → _Actions_ → _Variables_):

| Variable                                         | Purpose                                                                                            |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `API_ORIGIN`                                     | Backend origin that `/api`, `/graphql` and `/health` are proxied to, e.g. `https://api-origin.plainledger.ca` |
| `VITE_KEYCLOAK_URL`                              | Keycloak URL, e.g. `https://auth.plainledger.ca`; leave empty for guest mode                       |
| `VITE_KEYCLOAK_REALM`, `VITE_KEYCLOAK_CLIENT_ID` | Default to `plainledger` / `plainledger-web`                                                       |
| `VITE_API_URL`                                   | Only needed if the API is not served from the same origin                                          |
| `AWS_DEPLOY_ENABLED`                             | Set to `true` to re-enable the legacy AWS jobs in `ci.yml` and `storybook.yml` (skipped otherwise) |

## Bringing sign-in and the app back

Host the backend stack (API, Keycloak, PostgreSQL, Redis), set `API_ORIGIN` and `VITE_KEYCLOAK_URL`, and re-run the workflow.
The web app keeps calling the same-origin `/api` and `/graphql` URLs, so no code changes are needed.

Production readiness requires `/health/ready` to return HTTP 200 **JSON** with connected database and cache.
An HTTP 200 website page, a guest-mode frontend, or a 503 from an unconfigured backend does not qualify.
Keep the health paths in both the Worker route classifier and `assets.run_worker_first`.

## Local testing

```bash
cd apps/web
npm run build
npx wrangler@4.137.0 dev                        # http://localhost:8787, Cloudflare runtime
npx wrangler@4.137.0 dev --var API_ORIGIN:http://localhost:3001   # proxy /api to a local API
npx vitest run worker/                          # Worker unit tests
```

Source maps are generated but not uploaded (`public/.assetsignore`), so the original source is not published.
