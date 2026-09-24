/**
 * PlainLedger Web - www redirect Worker (www.plainledger.ca)
 *
 * Permanently redirects www.<domain>/<path>?<query> to https://<domain>/<path>?<query>.
 * Kept separate from the main Worker so the website's static assets are still served
 * without invoking any Worker code (free and not subject to request limits).
 */
export default {
  fetch(request: Request): Response {
    const url = new URL(request.url);
    url.protocol = 'https:';
    url.hostname = url.hostname.replace(/^www\./, '');
    url.port = '';

    return new Response(null, {
      status: 301,
      headers: { Location: url.toString(), 'Cache-Control': 'public, max-age=86400' },
    });
  },
};
