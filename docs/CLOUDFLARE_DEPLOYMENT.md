# Website Hosting on Cloudflare (Free Plan)

The public website (`apps/web`) runs on Cloudflare Workers with static assets. It costs **$0/month**:
static asset requests are free and unlimited, and DNS is free. The only cost is the GoDaddy domain renewal.

| Hostname                           | Served by                         | Behaviour                                                                                                            |
| ---------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `plainledger.ca`                   | Worker `plainledger-web`          | The Vite build (all pages, deep links via SPA fallback)                                                              |
| `plainledger.ca/api/*`, `/graphql` | same Worker, `worker/index.ts`    | Proxied to `API_ORIGIN` when set; otherwise a JSON 503 that the login/signup pages show as "temporarily unavailable" |
| `www.plainledger.ca`               | Worker `plainledger-www-redirect` | 301 to `https://plainledger.ca` (same path and query)                                                                |

Without a backend the app runs in **guest mode**: every public page works, and `/app/*` sends visitors to the login page.

## One-time setup (about 10 minutes)

1. **Add the domain to Cloudflare**: [dash.cloudflare.com](https://dash.cloudflare.com) → _Add a domain_ → `plainledger.ca` → **Free** plan.
   Cloudflare then shows two nameservers (`<name>.ns.cloudflare.com`). No DNS records are needed for the website; the Workers create their own.
2. **Point GoDaddy at Cloudflare**: GoDaddy → _My Products_ → `plainledger.ca` → _DNS_ → _Nameservers_ → _Change nameservers_ →
   _I'll use my own nameservers_ → enter the two Cloudflare nameservers → _Save_.
   The registry still lists the old AWS Route 53 nameservers, which no longer answer; that is why the domain does not resolve today.
3. **Create a Cloudflare API token**: _My Profile_ → _API Tokens_ → _Create Token_ → template **Edit Cloudflare Workers**.
   Set _Account Resources_ to your account and _Zone Resources_ to _Specific zone_ → `plainledger.ca`, add the permission
   **Zone → Zone → Read**, then create the token. The **Account ID** is shown on the _Workers & Pages_ overview page.
4. **Add GitHub secrets**: repository _Settings_ → _Secrets and variables_ → _Actions_ → add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
5. **Deploy**: merge to `main`, or run _Actions_ → **Deploy Website (Cloudflare)** → _Run workflow_.
   The first run publishes to `plainledger-web.<account-subdomain>.workers.dev`. Once Cloudflare marks the zone **Active**
   (usually within an hour of the nameserver change), run the workflow again: it attaches `plainledger.ca` and `www.plainledger.ca`
   and Cloudflare issues the certificates. While the zone is pending, the job summary lists the nameservers to set at GoDaddy.

## How deploys work

`.github/workflows/deploy-website.yml` runs on every push to `main` that touches `apps/web/**`:

1. Builds the site (`npm run build`) with the repository variables below.
2. Checks the zone status through the Cloudflare API.
3. `wrangler deploy` (adds `--domain plainledger.ca` once the zone is active), then deploys the www redirect.
4. Smoke-tests the deployment and writes a summary.

Without the Cloudflare secrets the workflow skips with a warning instead of failing.

Optional repository **variables** (_Settings_ → _Secrets and variables_ → _Actions_ → _Variables_):

| Variable                                         | Purpose                                                                                            |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `API_ORIGIN`                                     | Backend origin that `/api` and `/graphql` are proxied to, e.g. `https://api-origin.plainledger.ca` |
| `VITE_KEYCLOAK_URL`                              | Keycloak URL, e.g. `https://auth.plainledger.ca`; leave empty for guest mode                       |
| `VITE_KEYCLOAK_REALM`, `VITE_KEYCLOAK_CLIENT_ID` | Default to `plainledger` / `plainledger-web`                                                       |
| `VITE_API_URL`                                   | Only needed if the API is not served from the same origin                                          |
| `AWS_DEPLOY_ENABLED`                             | Set to `true` to re-enable the legacy AWS jobs in `ci.yml` and `storybook.yml` (skipped otherwise) |

## Bringing sign-in and the app back

Host the backend stack (API, Keycloak, PostgreSQL, Redis), set `API_ORIGIN` and `VITE_KEYCLOAK_URL`, and re-run the workflow.
The web app keeps calling the same-origin `/api` and `/graphql` URLs, so no code changes are needed.

## Local testing

```bash
cd apps/web
npm run build
npx wrangler@4.137.0 dev                        # http://localhost:8787, Cloudflare runtime
npx wrangler@4.137.0 dev --var API_ORIGIN:http://localhost:3001   # proxy /api to a local API
npx vitest run worker/                          # Worker unit tests
```

Source maps are generated but not uploaded (`public/.assetsignore`), so the original source is not published.
