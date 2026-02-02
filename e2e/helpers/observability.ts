/**
 * Playwright Observability Helpers
 * 
 * Inspired by browser-devtools-mcp, these helpers provide:
 * - Console message capture
 * - HTTP request monitoring
 * - Web Vitals collection
 * - Performance metrics
 */

import { Page, ConsoleMessage, Request, Response } from '@playwright/test';

export interface ConsoleLog {
  type: 'log' | 'info' | 'warn' | 'error' | 'debug';
  text: string;
  timestamp: number;
  location?: { url: string; line: number; column: number };
}

export interface HttpRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  postData?: string;
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body?: string;
  };
  timestamp: number;
  duration?: number;
}

export interface WebVitals {
  lcp?: number; // Largest Contentful Paint
  inp?: number; // Interaction to Next Paint
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
  fcp?: number; // First Contentful Paint
}

/**
 * Observability Helper Class
 * Captures console logs, network requests, and performance metrics
 */
export class ObservabilityHelper {
  private consoleLogs: ConsoleLog[] = [];
  private httpRequests: HttpRequest[] = [];
  private webVitals: WebVitals = {};

  constructor(private page: Page) {
    this.setupConsoleCapture();
    this.setupNetworkCapture();
    this.setupWebVitalsCapture();
  }

  /**
   * Setup console message capture
   */
  private setupConsoleCapture(): void {
    this.page.on('console', (msg: ConsoleMessage) => {
      this.consoleLogs.push({
        type: msg.type() as ConsoleLog['type'],
        text: msg.text(),
        timestamp: Date.now(),
        location: msg.location(),
      });
    });
  }

  /**
   * Setup network request/response capture
   */
  private setupNetworkCapture(): void {
    this.page.on('request', (request: Request) => {
      const httpRequest: HttpRequest = {
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData() || undefined,
        timestamp: Date.now(),
      };

      this.httpRequests.push(httpRequest);

      // Capture response when available
      request.response().then(
        (response: Response | null) => {
          if (response) {
            const requestIndex = this.httpRequests.length - 1;
            const duration = Date.now() - this.httpRequests[requestIndex].timestamp;

            this.httpRequests[requestIndex].response = {
              status: response.status(),
              statusText: response.statusText(),
              headers: response.headers(),
            };
            this.httpRequests[requestIndex].duration = duration;

            // Capture response body for small responses
            response.body().then(
              (body) => {
                if (body.length < 10000) {
                  // Only capture small responses
                  this.httpRequests[requestIndex].response!.body = body.toString();
                }
              },
              () => {
                // Ignore body capture errors
              },
            );
          }
        },
        () => {
          // Request failed, no response
        },
      );
    });
  }

  /**
   * Setup Web Vitals capture using Performance API
   */
  private setupWebVitalsCapture(): void {
    this.page.addInitScript(() => {
      // Capture Web Vitals
      if ('PerformanceObserver' in window) {
        // LCP (Largest Contentful Paint)
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1] as any;
            (window as any).__playwright_web_vitals = {
              ...((window as any).__playwright_web_vitals || {}),
              lcp: lastEntry.renderTime || lastEntry.loadTime,
            };
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (e) {
          // LCP not supported
        }

        // CLS (Cumulative Layout Shift)
        try {
          let clsValue = 0;
          const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as any[]) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            }
            (window as any).__playwright_web_vitals = {
              ...((window as any).__playwright_web_vitals || {}),
              cls: clsValue,
            };
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });
        } catch (e) {
          // CLS not supported
        }

        // FCP (First Contentful Paint)
        try {
          const fcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const fcpEntry = entries.find((e) => e.name === 'first-contentful-paint');
            if (fcpEntry) {
              (window as any).__playwright_web_vitals = {
                ...((window as any).__playwright_web_vitals || {}),
                fcp: fcpEntry.startTime,
              };
            }
          });
          fcpObserver.observe({ entryTypes: ['paint'] });
        } catch (e) {
          // FCP not supported
        }
      }
    });
  }

  /**
   * Get console logs with filtering
   */
  getConsoleLogs(options?: {
    type?: ConsoleLog['type'];
    search?: string;
    limit?: number;
  }): ConsoleLog[] {
    let logs = [...this.consoleLogs];

    if (options?.type) {
      logs = logs.filter((log) => log.type === options.type);
    }

    if (options?.search) {
      const searchLower = options.search.toLowerCase();
      logs = logs.filter((log) => log.text.toLowerCase().includes(searchLower));
    }

    if (options?.limit) {
      logs = logs.slice(-options.limit);
    }

    return logs;
  }

  /**
   * Get HTTP requests with filtering
   */
  getHttpRequests(options?: {
    url?: string | RegExp;
    method?: string;
    status?: number;
    limit?: number;
  }): HttpRequest[] {
    let requests = [...this.httpRequests];

    if (options?.url) {
      if (typeof options.url === 'string') {
        requests = requests.filter((req) => req.url.includes(options.url as string));
      } else {
        requests = requests.filter((req) => options.url!.test(req.url));
      }
    }

    if (options?.method) {
      requests = requests.filter((req) => req.method === options.method);
    }

    if (options?.status && options.status !== undefined) {
      requests = requests.filter((req) => req.response?.status === options.status);
    }

    if (options?.limit) {
      requests = requests.slice(-options.limit);
    }

    return requests;
  }

  /**
   * Get Web Vitals metrics
   */
  async getWebVitals(): Promise<WebVitals> {
    return await this.page.evaluate(() => {
      return (window as any).__playwright_web_vitals || {};
    });
  }

  /**
   * Get performance timing
   */
  async getPerformanceTiming(): Promise<PerformanceTiming> {
    return await this.page.evaluate(() => {
      const perf = performance.timing;
      return {
        navigationStart: perf.navigationStart,
        domContentLoaded: perf.domContentLoadedEventEnd - perf.navigationStart,
        loadComplete: perf.loadEventEnd - perf.navigationStart,
        ttfb: perf.responseStart - perf.navigationStart,
      };
    });
  }

  /**
   * Clear all captured data
   */
  clear(): void {
    this.consoleLogs = [];
    this.httpRequests = [];
    this.webVitals = {};
  }

  /**
   * Assert no console errors
   */
  assertNoConsoleErrors(): void {
    const errors = this.getConsoleLogs({ type: 'error' });
    if (errors.length > 0) {
      throw new Error(
        `Found ${errors.length} console errors:\n${errors.map((e) => `  - ${e.text}`).join('\n')}`,
      );
    }
  }

  /**
   * Assert no failed HTTP requests
   */
  assertNoFailedRequests(): void {
    const failed = this.getHttpRequests().filter(
      (req) => req.response && (req.response.status < 200 || req.response.status >= 400),
    );
    if (failed.length > 0) {
      throw new Error(
        `Found ${failed.length} failed HTTP requests:\n${failed.map((req) => `  - ${req.method} ${req.url}: ${req.response?.status}`).join('\n')}`,
      );
    }
  }

  /**
   * Assert Web Vitals meet thresholds
   */
  async assertWebVitalsThresholds(thresholds?: {
    lcp?: number; // ms
    cls?: number; // score
    fcp?: number; // ms
  }): Promise<void> {
    const vitals = await this.getWebVitals();
    const defaults = {
      lcp: 2500, // Good threshold
      cls: 0.1, // Good threshold
      fcp: 1800, // Good threshold
    };

    const thresh = { ...defaults, ...thresholds };

    if (vitals.lcp && vitals.lcp > thresh.lcp!) {
      throw new Error(`LCP ${vitals.lcp}ms exceeds threshold ${thresh.lcp}ms`);
    }

    if (vitals.cls && vitals.cls > thresh.cls!) {
      throw new Error(`CLS ${vitals.cls} exceeds threshold ${thresh.cls}`);
    }

    if (vitals.fcp && vitals.fcp > thresh.fcp!) {
      throw new Error(`FCP ${vitals.fcp}ms exceeds threshold ${thresh.fcp}ms`);
    }
  }
}

/**
 * Create observability helper for a page
 */
export function createObservabilityHelper(page: Page): ObservabilityHelper {
  return new ObservabilityHelper(page);
}
