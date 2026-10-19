import { describe, it, expect, vi, afterEach } from 'vitest';
import worker from './index';
import wwwRedirect from './www-redirect';

const assetResponse = new Response('<html>spa</html>', {
  headers: { 'Content-Type': 'text/html' },
});

function makeEnv(apiOrigin?: string) {
  return {
    ASSETS: { fetch: vi.fn().mockResolvedValue(assetResponse) },
    API_ORIGIN: apiOrigin,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('website worker', () => {
  it('serves non-API paths from static assets', async () => {
    const env = makeEnv();
    const response = await worker.fetch(new Request('https://plainledger.ca/apixyz'), env);

    expect(env.ASSETS.fetch).toHaveBeenCalledOnce();
    expect(response).toBe(assetResponse);
  });

  it.each(['/api', '/api/auth/login', '/graphql', '/graphql/subscriptions', '/health', '/health/ready', '/api/health/ready'])(
    'returns a JSON 503 for %s when no backend is configured',
    async (path) => {
      const env = makeEnv();
      const response = await worker.fetch(
        new Request(`https://plainledger.ca${path}`, { method: 'POST', body: '{}' }),
        env,
      );

      expect(response.status).toBe(503);
      expect(response.headers.get('Content-Type')).toContain('application/json');
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      const body = await response.json();
      expect(body.error).toBe('SERVICE_UNAVAILABLE');
      expect(body.message).toContain('support@plainledger.ca');
      expect(env.ASSETS.fetch).not.toHaveBeenCalled();
    },
  );

  it('returns unavailable JSON for readiness instead of a successful HTML website', async () => {
    const env = makeEnv();
    const response = await worker.fetch(new Request('https://plainledger.ca/health/ready'), env);

    expect(response.status).toBe(503);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(await response.json()).toMatchObject({ statusCode: 503, error: 'SERVICE_UNAVAILABLE' });
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
  });

  it('preserves an unhealthy backend readiness response', async () => {
    const env = makeEnv('https://api-origin.plainledger.ca');
    const upstream = new Response(JSON.stringify({ status: 'unhealthy', database: false, cache: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
    const fetchMock = vi.fn().mockResolvedValue(upstream);
    vi.stubGlobal('fetch', fetchMock);

    const response = await worker.fetch(new Request('https://plainledger.ca/health/ready'), env);

    expect(response).toBe(upstream);
    expect(fetchMock.mock.calls[0][0].url).toBe('https://api-origin.plainledger.ca/health/ready');
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
  });

  it('proxies API requests to API_ORIGIN, keeping path, query, method and headers', async () => {
    const upstream = new Response('{"ok":true}', { status: 201 });
    const fetchMock = vi.fn().mockResolvedValue(upstream);
    vi.stubGlobal('fetch', fetchMock);

    const response = await worker.fetch(
      new Request('https://plainledger.ca/api/auth/login?next=%2Fapp', {
        method: 'POST',
        headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
        body: '{"email":"a@b.c"}',
      }),
      makeEnv('https://api-origin.plainledger.ca'),
    );

    expect(response).toBe(upstream);
    const forwarded: Request = fetchMock.mock.calls[0][0];
    expect(forwarded.url).toBe('https://api-origin.plainledger.ca/api/auth/login?next=%2Fapp');
    expect(forwarded.method).toBe('POST');
    expect(forwarded.headers.get('Authorization')).toBe('Bearer token');
    expect(await forwarded.text()).toBe('{"email":"a@b.c"}');
  });
});

describe('www redirect worker', () => {
  it('permanently redirects www to the apex domain over https, keeping path and query', () => {
    const response = wwwRedirect.fetch(
      new Request('http://www.plainledger.ca/quebec/montreal?lang=fr'),
    );

    expect(response.status).toBe(301);
    expect(response.headers.get('Location')).toBe('https://plainledger.ca/quebec/montreal?lang=fr');
  });
});
