/**
 * API Service with Multi-Tenant Support
 * 
 * All API requests automatically include:
 * - Authorization header with JWT token
 * - X-Tenant-ID header for tenant isolation
 * - Content-Type header
 */

import config from './config';

// Types
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

// Storage keys (Keycloak stores token as kc_token in sessionStorage)
const TOKEN_KEY = 'kc_token';
const TENANT_KEY = 'plainledger-current-tenant';

// API Error class
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

// Request interceptors
type RequestInterceptor = (config: RequestInit & { url: string }) => RequestInit & { url: string };
type ResponseInterceptor = (response: Response) => Response | Promise<Response>;

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];

// Add request interceptor
export function addRequestInterceptor(interceptor: RequestInterceptor) {
  requestInterceptors.push(interceptor);
  return () => {
    const index = requestInterceptors.indexOf(interceptor);
    if (index > -1) requestInterceptors.splice(index, 1);
  };
}

// Add response interceptor
export function addResponseInterceptor(interceptor: ResponseInterceptor) {
  responseInterceptors.push(interceptor);
  return () => {
    const index = responseInterceptors.indexOf(interceptor);
    if (index > -1) responseInterceptors.splice(index, 1);
  };
}

// Build URL with query params
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

// Get auth token
function getAuthToken(): string | null {
  // Try to get from Keycloak instance first (if available)
  if (typeof window !== 'undefined' && (window as unknown as { keycloak?: { token?: string } }).keycloak?.token) {
    return (window as unknown as { keycloak: { token: string } }).keycloak.token;
  }
  // Fall back to sessionStorage where Keycloak stores tokens
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

// Get current tenant ID
function getCurrentTenantId(): string | null {
  return localStorage.getItem(TENANT_KEY);
}

// Base fetch with interceptors
async function baseFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { params, timeout = config.api.timeout, ...fetchOptions } = options;
  
  // Build URL
  const url = buildUrl(path, params);
  
  // Prepare headers
  const headers = new Headers(fetchOptions.headers);
  
  // Add default headers
  if (!headers.has('Content-Type') && fetchOptions.body) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');
  
  // Add auth token
  const token = getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  // Add tenant ID for multi-tenant isolation
  const tenantId = getCurrentTenantId();
  if (tenantId) {
    headers.set('X-Tenant-ID', tenantId);
  }
  
  // Add request ID for tracing
  headers.set('X-Request-ID', generateRequestId());
  
  // Prepare config
  let requestConfig: RequestInit & { url: string } = {
    ...fetchOptions,
    headers,
    url,
  };
  
  // Apply request interceptors
  for (const interceptor of requestInterceptors) {
    requestConfig = interceptor(requestConfig);
  }
  
  // Create abort controller for timeout
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
    
    // Handle non-OK responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiException({
        code: errorData.code || 'UNKNOWN_ERROR',
        message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        details: errorData.details,
        statusCode: response.status,
      });
    }
    
    // Parse response
    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof ApiException) {
      throw error;
    }
    
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiException({
        code: 'TIMEOUT',
        message: 'La requête a expiré',
        statusCode: 408,
      });
    }
    
    throw new ApiException({
      code: 'NETWORK_ERROR',
      message: error instanceof Error ? error.message : 'Erreur réseau',
      statusCode: 0,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

// Generate request ID
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// API client
export const api = {
  // GET request
  get<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return baseFetch<T>(path, { ...options, method: 'GET' });
  },
  
  // POST request
  post<T>(path: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return baseFetch<T>(path, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },
  
  // PUT request
  put<T>(path: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return baseFetch<T>(path, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },
  
  // PATCH request
  patch<T>(path: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return baseFetch<T>(path, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  },
  
  // DELETE request
  delete<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return baseFetch<T>(path, { ...options, method: 'DELETE' });
  },
  
  // Upload file
  async upload<T>(path: string, file: File, fieldName = 'file', additionalData?: Record<string, string>): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append(fieldName, file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }
    
    // Don't set Content-Type - let browser set it with boundary
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
        message: errorData.message || 'Échec du téléchargement',
        statusCode: response.status,
      });
    }
    
    return response.json();
  },
};

// Convenience functions for common endpoints

// Auth
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    api.post<{ token: string; user: unknown }>('/auth/login', credentials),
  
  logout: () => api.post('/auth/logout'),
  
  refreshToken: () => api.post<{ token: string }>('/auth/refresh'),
  
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
};

// Tenants
export const tenantsApi = {
  list: () => api.get<unknown[]>('/tenants'),
  
  get: (id: string) => api.get<unknown>(`/tenants/${id}`),
  
  create: (data: { name: string; slug?: string }) =>
    api.post<unknown>('/tenants', data),
  
  update: (id: string, data: Partial<{ name: string; settings: unknown }>) =>
    api.patch<unknown>(`/tenants/${id}`, data),
  
  delete: (id: string) => api.delete(`/tenants/${id}`),
  
  // Members
  getMembers: (tenantId: string) =>
    api.get<unknown[]>(`/tenants/${tenantId}/members`),
  
  inviteMember: (tenantId: string, data: { email: string; role: string }) =>
    api.post<unknown>(`/tenants/${tenantId}/invitations`, data),
  
  updateMember: (tenantId: string, memberId: string, data: { role: string }) =>
    api.patch<unknown>(`/tenants/${tenantId}/members/${memberId}`, data),
  
  removeMember: (tenantId: string, memberId: string) =>
    api.delete(`/tenants/${tenantId}/members/${memberId}`),
};

// Connections (uses datasources API endpoint)
const CONNECTIONS_BASE = '/api/datasources';
export const connectionsApi = {
  list: () => api.get<unknown[]>(CONNECTIONS_BASE),
  
  get: (id: string) => api.get<unknown>(`${CONNECTIONS_BASE}/${id}`),
  
  create: (data: { provider: string; credentials: unknown }) =>
    api.post<unknown>(CONNECTIONS_BASE, data),
  
  update: (id: string, data: Partial<unknown>) =>
    api.patch<unknown>(`${CONNECTIONS_BASE}/${id}`, data),
  
  delete: (id: string) => api.delete(`${CONNECTIONS_BASE}/${id}`),
  
  sync: (id: string) => api.post<unknown>(`${CONNECTIONS_BASE}/${id}/sync`),
  
  test: (id: string) => api.post<{ success: boolean }>(`${CONNECTIONS_BASE}/${id}/test`),
};

// Reports
export const reportsApi = {
  list: (params?: { type?: string; page?: number; limit?: number }) =>
    api.get<unknown[]>('/reports', { params }),
  
  get: (id: string) => api.get<unknown>(`/reports/${id}`),
  
  generate: (data: { type: string; period: string; options?: unknown }) =>
    api.post<unknown>('/reports/generate', data),
  
  schedule: (data: { reportId: string; schedule: string; recipients: string[] }) =>
    api.post<unknown>('/reports/schedule', data),
  
  export: (id: string, format: 'pdf' | 'xlsx' | 'csv') =>
    api.get<{ url: string }>(`/reports/${id}/export`, { params: { format } }),
  
  delete: (id: string) => api.delete(`/reports/${id}`),
  
  // Share report
  createShareLink: (data: {
    reportId?: string;
    reportType: string;
    shareUrl: string;
    password?: string;
    expiresIn: string;
    allowDownload: boolean;
    requireAuth: boolean;
  }) => api.post<{ id: string; shareToken: string; shareUrl: string }>('/reports/share', data),
  
  getShareLink: (shareToken: string) =>
    api.get<{
      id: string;
      shareToken: string;
      shareUrl: string;
      expiresAt?: string;
      allowDownload: boolean;
      requireAuth: boolean;
      isActive: boolean;
    }>(`/reports/share/${shareToken}`),
  
  updateShareLink: (shareToken: string, data: {
    expiresIn?: string;
    allowDownload?: boolean;
    requireAuth?: boolean;
    isActive?: boolean;
  }) => api.patch(`/reports/share/${shareToken}`, data),
  
  deleteShareLink: (shareToken: string) =>
    api.delete(`/reports/share/${shareToken}`),
};

// Anomalies
export const anomaliesApi = {
  list: (params?: { severity?: string; category?: string; page?: number }) =>
    api.get<unknown[]>('/anomalies', { params }),
  
  get: (id: string) => api.get<unknown>(`/anomalies/${id}`),
  
  resolve: (id: string, resolution: { action: string; notes?: string }) =>
    api.post<unknown>(`/anomalies/${id}/resolve`, resolution),
  
  dismiss: (id: string, reason?: string) =>
    api.post<unknown>(`/anomalies/${id}/dismiss`, { reason }),
  
  getThresholds: () => api.get<unknown>('/anomalies/thresholds'),
  
  updateThresholds: (thresholds: unknown) =>
    api.put<unknown>('/anomalies/thresholds', thresholds),
};

// Accounts
export const accountsApi = {
  list: (params?: { type?: string; page?: number }) =>
    api.get<unknown[]>('/accounts', { params }),
  
  get: (id: string) => api.get<unknown>(`/accounts/${id}`),
  
  getBalance: (id: string, asOf?: string) =>
    api.get<{ balance: number }>(`/accounts/${id}/balance`, { params: { asOf } }),
  
  getTransactions: (id: string, params?: { from?: string; to?: string; page?: number }) =>
    api.get<unknown[]>(`/accounts/${id}/transactions`, { params }),
};

// Audit logs (for compliance)
export const auditApi = {
  list: (params?: { action?: string; userId?: string; from?: string; to?: string; page?: number }) =>
    api.get<unknown[]>('/audit-logs', { params }),
  
  export: (params?: { from?: string; to?: string }) =>
    api.get<{ url: string }>('/audit-logs/export', { params }),
};

// Tax Credits
export const taxCreditsApi = {
  requestConsultation: (data: {
    organizationId: string;
    taxCreditId: string;
    contactInfo: {
      name: string;
      email: string;
      phone?: string;
      companyName?: string;
      notes?: string;
    };
  }) => api.post<boolean>('/tax-credits/consultation', data),
  
  getEligibility: (organizationId: string, fiscalYear?: number) =>
    api.get<unknown[]>(`/tax-credits/eligibility/${organizationId}`, {
      params: { fiscalYear },
    }),
  
  getAvailableCredits: (params?: { industryId?: string; province?: string }) =>
    api.get<unknown[]>('/tax-credits', { params }),
};

export default api;
