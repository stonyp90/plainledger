/**
 * API Service with Multi-Tenant Support
 * 
 * Session-authenticated API requests automatically include:
 * - Authorization header with JWT token
 * - X-Organization-ID header for tenant isolation
 * - Content-Type header
 */

import config from './config';
import { getAuthenticatedRequestHeaders, getRequestScopeRevision } from './authRequestContext';

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
  /** Explicitly public endpoints must not depend on the current sign-in session. */
  authentication?: 'session' | 'none';
}

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

// Every REST controller lives below /api. Accept either an API origin or /api base.
function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const base = new URL(config.api.baseUrl || '/', window.location.origin);
  const basePath = base.pathname.replace(/\/$/, '').replace(/\/api$/, '');
  const requestPath = path.replace(/^\//, '').replace(/^api(?:\/|$)/, '');
  const url = new URL(`${basePath}/api/${requestPath}`, base.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

function normalizeResponse<T>(payload: unknown): ApiResponse<T> {
  if (payload !== null && typeof payload === 'object' && !Array.isArray(payload) && 'data' in payload) {
    return payload as ApiResponse<T>;
  }
  // Nest controllers return raw DTOs/arrays; retain the public api.get().data contract.
  return { data: payload as T };
}

async function baseFetch<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const { params, timeout = config.api.timeout, signal: callerSignal, authentication = 'session', ...fetchOptions } = options;
  const revision = getRequestScopeRevision();
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort(callerSignal?.reason);
  if (callerSignal?.aborted) abortFromCaller();
  else callerSignal?.addEventListener('abort', abortFromCaller, { once: true });
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeout);

  try {
    const headers = authentication === 'none'
      ? new Headers(fetchOptions.headers)
      : await getAuthenticatedRequestHeaders(fetchOptions.headers);
    if (authentication === 'none') {
      headers.delete('authorization');
      headers.delete('x-tenant-id');
      headers.delete('x-organization-id');
    }
    const isForm = typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData;
    if (isForm) headers.delete('Content-Type');
    else if (!headers.has('Content-Type') && fetchOptions.body !== undefined && fetchOptions.body !== null) {
      headers.set('Content-Type', 'application/json');
    }
    headers.set('Accept', 'application/json');
    headers.set('X-Request-ID', generateRequestId());
    let requestConfig: RequestInit & { url: string } = {
      ...fetchOptions, headers, url: buildUrl(path, params), signal: controller.signal,
      ...(authentication === 'none' ? { credentials: 'omit' as const } : {}),
    };
    for (const interceptor of requestInterceptors) requestConfig = interceptor(requestConfig);
    if (controller.signal.aborted) throw new DOMException('The request was aborted.', 'AbortError');
    let response = await fetch(requestConfig.url, requestConfig);
    for (const interceptor of responseInterceptors) response = await interceptor(response);
    if (authentication === 'session' && revision !== getRequestScopeRevision()) {
      throw new ApiException({ code: 'SESSION_CHANGED', message: 'Organization changed. Refresh the data.', statusCode: 0 });
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const errorData = payload && typeof payload === 'object' ? payload : {};
      const message = Array.isArray(errorData.message) ? errorData.message.join('; ') : errorData.message;
      throw new ApiException({
        code: typeof errorData.code === 'string' ? errorData.code : 'HTTP_ERROR',
        message: typeof message === 'string' ? message : `HTTP ${response.status}: ${response.statusText}`,
        details: errorData.details,
        statusCode: response.status,
      });
    }
    if (response.status === 204 || response.status === 205) return { data: undefined as T };
    try {
      return normalizeResponse<T>(await response.json());
    } catch {
      throw new ApiException({ code: 'INVALID_RESPONSE', message: 'The server returned an invalid response.', statusCode: response.status });
    }
  } catch (error) {
    if (error instanceof ApiException) throw error;
    if (controller.signal.aborted) {
      throw new ApiException({
        code: timedOut ? 'TIMEOUT' : 'ABORTED',
        message: timedOut ? 'The request timed out.' : 'The request was cancelled.',
        statusCode: timedOut ? 408 : 0,
      });
    }
    throw new ApiException({
      code: 'NETWORK_ERROR',
      message: error instanceof Error ? error.message : 'Network error',
      statusCode: 0,
    });
  } finally {
    clearTimeout(timeoutId);
    callerSignal?.removeEventListener('abort', abortFromCaller);
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
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
  },
  
  // PUT request
  put<T>(path: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return baseFetch<T>(path, {
      ...options,
      method: 'PUT',
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
  },
  
  // PATCH request
  patch<T>(path: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return baseFetch<T>(path, {
      ...options,
      method: 'PATCH',
      body: data !== undefined ? JSON.stringify(data) : undefined,
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
    
    return baseFetch<T>(path, { method: 'POST', body: formData });
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

// Admin - Jobs Management (Super Admin only)
export interface JobConfiguration {
  id: string;
  nameEn: string;
  nameFr: string;
  descriptionEn?: string;
  descriptionFr?: string;
  category: 'sync' | 'cleanup' | 'reporting' | 'ai' | 'notifications';
  isEnabled: boolean;
  cronExpression: string;
  timezone: string;
  timeoutSeconds: number;
  maxRetries: number;
  retryDelaySeconds: number;
  alertOnFailure: boolean;
  alertOnSuccess: boolean;
  alertOnChangesDetected: boolean;
  alertEmails: string[];
  alertSlackWebhook?: string;
  lastRunAt?: string;
  lastRunStatus?: 'success' | 'failed' | 'partial' | 'skipped';
  lastRunDurationMs?: number;
  nextRunAt?: string;
}

export interface JobExecution {
  id: string;
  jobId: string;
  runId: string;
  triggerType: 'scheduled' | 'manual' | 'retry';
  triggeredBy?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  errorMessage?: string;
}

export const adminJobsApi = {
  getAll: () => api.get<JobConfiguration[]>('/api/admin/jobs'),
  
  get: (jobId: string) => api.get<JobConfiguration>(`/api/admin/jobs/${jobId}`),
  
  update: (jobId: string, updates: Partial<JobConfiguration>) =>
    api.patch<JobConfiguration>(`/api/admin/jobs/${jobId}`, updates),
  
  getExecutions: (jobId: string, limit?: number) =>
    api.get<JobExecution[]>(`/api/admin/jobs/${jobId}/executions`, {
      params: { limit },
    }),
  
  trigger: (jobId: string) =>
    api.post<{ message: string; runId: string }>(`/api/admin/jobs/${jobId}/run`),
  
  toggle: (jobId: string) =>
    api.post<JobConfiguration>(`/api/admin/jobs/${jobId}/toggle`),
};

// Share Visualization
export const shareApi = {
  shareVisualization: (data: {
    recipients: string[];
    title: string;
    message?: string;
    imageData: string; // Base64 PNG
    shareUrl: string;
    password?: string;
    expiresIn: string;
  }) => api.post<{ success: boolean; messageId?: string }>('/share/visualization', data),
};

// Admin - Notifications Management (Platform Admin only)
export interface AdminNotification {
  id: string;
  title: string;
  titleFr?: string;
  message: string;
  messageFr?: string;
  channel: 'in_app' | 'email' | 'push' | 'sms';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'cancelled';
  targetType: 'all' | 'organization' | 'user' | 'industry' | 'plan';
  targetIds?: string[];
  recipientsCount: number;
  deliveredCount: number;
  readCount: number;
  actionUrl?: string;
  actionLabel?: string;
  actionLabelFr?: string;
  scheduledAt?: string;
  expiresAt?: string;
  createdAt: string;
  sentAt?: string;
  createdByAdminId: string;
  createdByAdminEmail: string;
}

export interface AdminNotificationStats {
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  failed: number;
  cancelled: number;
  lastWeekSent: number;
  lastWeekDeliveryRate: number;
}

export interface AdminNotificationSegments {
  organizations: { id: string; name: string }[];
  industries: string[];
  plans: string[];
}

export interface CreateAdminNotificationDto {
  title: string;
  titleFr?: string;
  message: string;
  messageFr?: string;
  channel?: 'in_app' | 'email' | 'push' | 'sms';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  targetType: 'all' | 'organization' | 'user' | 'industry' | 'plan';
  targetIds?: string[];
  actionUrl?: string;
  actionLabel?: string;
  actionLabelFr?: string;
  scheduledAt?: string;
  expiresAt?: string;
}

export const adminNotificationsApi = {
  // Create and send a notification
  create: (data: CreateAdminNotificationDto) =>
    api.post<AdminNotification>('/api/admin/notifications', data),
  
  // List notifications with filters
  list: (params?: {
    status?: string;
    targetType?: string;
    channel?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => api.get<{ notifications: AdminNotification[]; total: number; page: number; limit: number }>(
    '/api/admin/notifications',
    { params }
  ),
  
  // Get notification statistics
  getStats: () =>
    api.get<AdminNotificationStats>('/api/admin/notifications/stats'),
  
  // Get targetable segments (organizations, industries, plans)
  getSegments: () =>
    api.get<AdminNotificationSegments>('/api/admin/notifications/segments'),
  
  // Get single notification details
  get: (id: string) =>
    api.get<AdminNotification>(`/api/admin/notifications/${id}`),
  
  // Cancel a pending notification
  cancel: (id: string) =>
    api.post<{ success: boolean }>(`/api/admin/notifications/${id}/cancel`),
  
  // Resend a notification
  resend: (id: string) =>
    api.post<{ success: boolean }>(`/api/admin/notifications/${id}/resend`),
};

export default api;
