const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface FetchOptions extends RequestInit {
  token?: string;
}

// Singleton to hold the current auth token
let _authToken: string | null = null;

export function setAuthToken(token: string | null) {
  _authToken = token;
}

export function getAuthToken(): string | null {
  return _authToken;
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;
  
  // Use provided token, or fall back to singleton token
  const authToken = token || _authToken;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Organizations
export const organizationsApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return fetchApi<{ organizations: any[]; total: number }>(`/api/admin/organizations${query}`);
  },
  get: (id: string) => fetchApi<any>(`/api/admin/organizations/${id}`),
  create: (data: any) =>
    fetchApi<any>('/api/admin/organizations', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    fetchApi<any>(`/api/admin/organizations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    fetchApi<void>(`/api/admin/organizations/${id}`, { method: 'DELETE' }),
  getStats: () => fetchApi<any>('/api/admin/organizations/stats'),
  getUsers: (id: string) => fetchApi<any[]>(`/api/admin/organizations/${id}/users`),
};

// Users
export const usersApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return fetchApi<{ users: any[]; total: number }>(`/api/admin/users${query}`);
  },
  get: (id: string) => fetchApi<any>(`/api/admin/users/${id}`),
  create: (data: any) =>
    fetchApi<any>('/api/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    fetchApi<any>(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  disable: (id: string) =>
    fetchApi<void>(`/api/admin/users/${id}/disable`, { method: 'POST' }),
  enable: (id: string) =>
    fetchApi<void>(`/api/admin/users/${id}/enable`, { method: 'POST' }),
  resetPassword: (id: string) =>
    fetchApi<void>(`/api/admin/users/${id}/reset-password`, { method: 'POST' }),
  forceLogout: (id: string) =>
    fetchApi<void>(`/api/admin/users/${id}/force-logout`, { method: 'POST' }),
  delete: (id: string) =>
    fetchApi<void>(`/api/admin/users/${id}`, { method: 'DELETE' }),
  invite: (data: { email: string; organizationId: string; role?: string }) =>
    fetchApi<any>('/api/admin/users/invite', { method: 'POST', body: JSON.stringify(data) }),
  getStats: () => fetchApi<any>('/api/admin/users/stats'),
};

// Audit
export const auditApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return fetchApi<{ logs: any[]; total: number }>(`/api/admin/audit${query}`);
  },
  getActions: () => fetchApi<string[]>('/api/admin/audit/actions'),
  getResourceTypes: () => fetchApi<string[]>('/api/admin/audit/resource-types'),
};

// Admin users
export const adminsApi = {
  getPermissions: () => fetchApi<Record<string, any[]>>('/api/admin/admins/permissions'),
  getGroups: () => fetchApi<any[]>('/api/admin/admins/groups'),
  getMe: () => fetchApi<any>('/api/admin/admins/me'),
  create: (data: any) =>
    fetchApi<any>('/api/admin/admins', { method: 'POST', body: JSON.stringify(data) }),
  assignGroups: (id: string, groupIds: string[]) =>
    fetchApi<void>(`/api/admin/admins/${id}/groups`, {
      method: 'PUT',
      body: JSON.stringify({ groupIds }),
    }),
  disable: (id: string) =>
    fetchApi<void>(`/api/admin/admins/${id}/disable`, { method: 'POST' }),
  enable: (id: string) =>
    fetchApi<void>(`/api/admin/admins/${id}/enable`, { method: 'POST' }),
};

// Health
export const healthApi = {
  getOverall: () => fetchApi<any>('/api/admin/dashboard/health'),
  getServices: () => fetchApi<{ services: any[] }>('/api/admin/dashboard/health/services'),
  getMetrics: () => fetchApi<any>('/api/admin/dashboard/health/metrics'),
  getSyncStats: () => fetchApi<any>('/api/admin/dashboard/sync/stats'),
};

// Integrations
export const integrationsApi = {
  listProviders: () => fetchApi<{ providers: any[] }>('/api/admin/integrations/providers'),
  getProvider: (id: string) => fetchApi<any>(`/api/admin/integrations/providers/${id}`),
  updateProvider: (id: string, data: any) =>
    fetchApi<any>(`/api/admin/integrations/providers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  listConnections: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return fetchApi<{ connections: any[]; total: number }>(
      `/api/admin/integrations/connections${query}`,
    );
  },
  getWebhookLogs: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return fetchApi<{ logs: any[]; total: number; limit: number; offset: number }>(
      `/api/admin/integrations/webhooks/logs${query}`,
    );
  },
  testProvider: (provider: string) =>
    fetchApi<any>(`/api/admin/integrations/test/${provider}`, { method: 'POST' }),
};

// Onboarding
export const onboardingApi = {
  getFunnel: () => fetchApi<any>('/api/admin/onboarding/funnel'),
  getTrials: () => fetchApi<{ trials: any[] }>('/api/admin/onboarding/trials'),
  getOrgProgress: (orgId: string) =>
    fetchApi<any>(`/api/admin/onboarding/${orgId}/progress`),
  extendTrial: (orgId: string, days: number) =>
    fetchApi<any>(`/api/admin/onboarding/${orgId}/extend`, {
      method: 'POST',
      body: JSON.stringify({ days }),
    }),
  convertOrg: (orgId: string) =>
    fetchApi<any>(`/api/admin/onboarding/${orgId}/convert`, { method: 'POST' }),
  getAtRisk: () => fetchApi<{ atRisk: any[] }>('/api/admin/onboarding/at-risk'),
};

// Billing
export const billingApi = {
  getStats: () => fetchApi<any>('/api/admin/billing/stats'),
  getTransactions: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return fetchApi<{ transactions: any[]; total: number }>(`/api/admin/billing/transactions${query}`);
  },
  getPlanDistribution: () => fetchApi<{ plans: any[] }>('/api/admin/billing/plan-distribution'),
  getRevenueTrend: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return fetchApi<{ trend: any[] }>(`/api/admin/billing/revenue-trend${query}`);
  },
};

// Communications
export const communicationsApi = {
  listTemplates: () => fetchApi<{ templates: any[] }>('/api/admin/communications/templates'),
  getTemplate: (name: string) =>
    fetchApi<{ name: string; content: string }>(`/api/admin/communications/templates/${name}`),
  updateTemplate: (name: string, content: string) =>
    fetchApi<any>(`/api/admin/communications/templates/${name}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),
  previewTemplate: (name: string, testData?: Record<string, unknown>) =>
    fetchApi<{ preview: string }>('/api/admin/communications/templates/preview', {
      method: 'POST',
      body: JSON.stringify({ name, testData }),
    }),
  sendBulk: (data: {
    templateName: string;
    recipientIds: string[];
    subject: string;
    metadata?: Record<string, unknown>;
  }) =>
    fetchApi<any>('/api/admin/communications/send', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  listCampaigns: () => fetchApi<{ campaigns: any[] }>('/api/admin/communications/campaigns'),
  getCampaign: (id: string) =>
    fetchApi<any>(`/api/admin/communications/campaigns/${id}`),
  getLogs: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return fetchApi<{ logs: any[]; total: number; limit: number; offset: number }>(
      `/api/admin/communications/logs${query}`,
    );
  },
};
