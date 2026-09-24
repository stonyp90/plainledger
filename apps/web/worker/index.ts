/**
 * PlainLedger Web - Cloudflare Worker entry point (plainledger.ca)
 *
 * The Vite build in ./dist is served directly by Cloudflare static assets, so page and
 * asset requests never reach this script. It only runs for the paths listed in
 * `assets.run_worker_first` (wrangler.jsonc): the same-origin /api and /graphql endpoints
 * the web app calls.
 *
 * - API_ORIGIN set (e.g. https://api-origin.plainledger.ca): requests are proxied to the
 *   backend, keeping the /api and /graphql URLs the ALB used to route.
 * - API_ORIGIN unset (website-only mode): a JSON 503 is returned, which the login and
 *   signup pages already surface as a friendly "try again later" error.
 *
 * Only the default export is allowed here: workerd treats every named export of the
 * entry module as an additional entrypoint.
 */

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  API_ORIGIN?: string;
}

const API_PREFIXES = ['/api', '/graphql'];

const API_UNAVAILABLE_MESSAGE =
  'PlainLedger accounts are temporarily unavailable. Contact support@plainledger.ca. / ' +
  'Les comptes PlainLedger sont temporairement indisponibles. Écrivez à support@plainledger.ca.';

function isApiPath(pathname: string): boolean {
  return API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (!isApiPath(url.pathname)) {
      return env.ASSETS.fetch(request);
    }

    if (env.API_ORIGIN) {
      const target = new URL(url.pathname + url.search, env.API_ORIGIN);
      // Copying the incoming request keeps method, headers, body and redirect: 'manual'
      return fetch(new Request(target.toString(), request));
    }

    return new Response(
      JSON.stringify({
        statusCode: 503,
        error: 'SERVICE_UNAVAILABLE',
        message: API_UNAVAILABLE_MESSAGE,
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'Retry-After': '3600',
        },
      },
    );
  },
};
