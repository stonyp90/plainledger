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
5. **Deploy**: merge to `main` and wait for **PlainLedger verification** to pass. Its completion triggers the website deployment.
   To repeat a deployment, run _Actions_ → **Deploy Website (Cloudflare)** → _Run workflow_ on `main`; the current commit must already have a successful verification run.
   The first run publishes to `plainledger-web.<account-subdomain>.workers.dev`. Once Cloudflare marks the zone **Active**
   after the nameserver change, run the workflow again: it attaches `plainledger.ca` and `www.plainledger.ca`
   and Cloudflare issues the certificates. While the zone is pending, the job summary lists the nameservers to set at GoDaddy.

## How deploys work

`.github/workflows/deploy-website.yml` runs after **PlainLedger verification** completes on `main`, or by manual dispatch on `main`:

1. Requires a successful `verify.yml` run from this repository's `main` branch for the exact source commit. Pull request and fork runs cannot authorize deployment. The newest matching push or manual run must be successful; an older success cannot hide a newer failure or an unfinished run.
2. Rejects a stale commit if `main` has advanced, checks the Cloudflare credentials, and checks out the verified SHA explicitly. For a `workflow_run` event, the source is the triggering run's `head_sha`, not the deployment event's default-branch SHA.
3. Installs the locked dependencies and builds the site (`npm run build`) with the repository variables below. The lockfile already includes the Linux Rollup binary.
4. Checks the zone status through the Cloudflare API and rechecks the current `main` SHA immediately before publishing.
5. Runs `wrangler deploy` (adds `--domain plainledger.ca` once the zone is active), then deploys the www redirect.
6. Retries the complete smoke-test contracts during edge propagation and writes the verified SHA, verification run and deployment results to the summary.

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
