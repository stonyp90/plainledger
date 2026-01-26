/**
 * API Client - Infrastructure Layer
 * 
 * Core HTTP client with multi-tenant support.
 * All feature modules use this client for API calls.
 */

import { config } from './config';

// ============================================================================
// TYPES
// ============================================================================

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  statusCode: number;
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TOKEN_KEY = 'plainledger-auth-token';
const TENANT_KEY = 'plainledger-current-tenant';

// ============================================================================
// API EXCEPTION
// ============================================================================

export class ApiException extends Error {
  code: string;
  statusCode: number;
  details?: Record<string, string[]>;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiException';
    this.code = error.code;
    this.statusCode = error.statusCode;
    this.details = error.details;
  }
}

// ============================================================================
// INTERCEPTORS
// ============================================================================

type RequestInterceptor = (config: RequestInit & { url: string }) => RequestInit & { url: string };
type ResponseInterceptor = (response: Response) => Response | Promise<Response>;

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];

export function addRequestInterceptor(interceptor: RequestInterceptor): () => void {
  requestInterceptors.push(interceptor);
  return () => {
    const index = requestInterceptors.indexOf(interceptor);
    if (index > -1) requestInterceptors.splice(index, 1);
  };
}

export function addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
  responseInterceptors.push(interceptor);
  return () => {
    const index = responseInterceptors.indexOf(interceptor);
    if (index > -1) responseInterceptors.splice(index, 1);
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const baseUrl = config.api.baseUrl.replace(/\/$/, '');
  const url = new URL(path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  
  return url.toString();
}

function getAuthToken(): string | null {
  if (typeof window !== 'undefined' && (window as unknown as { keycloak?: { token?: string } }).keycloak?.token) {
    return (window as unknown as { keycloak: { token: string } }).keycloak.token;
  }
  return localStorage.getItem(TOKEN_KEY);
}

function getCurrentTenantId(): string | null {
  return localStorage.getItem(TENANT_KEY);
}

function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// BASE FETCH
// ============================================================================

async function baseFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { params, timeout = config.api.timeout, ...fetchOptions } = options;
  
  const url = buildUrl(path, params);
  const headers = new Headers(fetchOptions.headers);
  
  // Default headers
  if (!headers.has('Content-Type') && fetchOptions.body) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');
  
  // Auth & tenant headers
  const token = getAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  
  const tenantId = getCurrentTenantId();
  if (tenantId) headers.set('X-Tenant-ID', tenantId);
  
  headers.set('X-Request-ID', generateRequestId());
  
  // Apply request interceptors
  let requestConfig: RequestInit & { url: string } = { ...fetchOptions, headers, url };
  for (const interceptor of requestInterceptors) {
    requestConfig = interceptor(requestConfig);
  }
  
  // Timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    let response = await fetch(requestConfig.url, {
      ...requestConfig,
      signal: controller.signal,
    });
    
    // Apply response interceptors
    for (const interceptor of responseInterceptors) {
      response = await interceptor(response);
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiException({
        code: errorData.code || 'UNKNOWN_ERROR',
        message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        details: errorData.details,
        statusCode: response.status,
      });
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof ApiException) throw error;
    
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiException({
        code: 'TIMEOUT',
        message: 'Request timed out',
        statusCode: 408,
      });
    }
    
    throw new ApiException({
      code: 'NETWORK_ERROR',
      message: error instanceof Error ? error.message : 'Network error',
      statusCode: 0,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// API CLIENT
// ============================================================================

export const apiClient = {
  get<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return baseFetch<T>(path, { ...options, method: 'GET' });
  },
  
  post<T>(path: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return baseFetch<T>(path, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },
  
  put<T>(path: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return baseFetch<T>(path, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },
  
  patch<T>(path: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return baseFetch<T>(path, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  },
  
  delete<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return baseFetch<T>(path, { ...options, method: 'DELETE' });
  },
  
  async upload<T>(
    path: string, 
    file: File, 
    fieldName = 'file', 
    additionalData?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append(fieldName, file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }
    
    const headers = new Headers();
    const token = getAuthToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const tenantId = getCurrentTenantId();
    if (tenantId) headers.set('X-Tenant-ID', tenantId);
    
    const response = await fetch(buildUrl(path), {
      method: 'POST',
      headers,
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiException({
        code: errorData.code || 'UPLOAD_ERROR',
        message: errorData.message || 'Upload failed',
        statusCode: response.status,
      });
    }
    
    return response.json();
  },
};

export default apiClient;
