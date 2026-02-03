const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface FetchOptions extends RequestInit {
  token?: string;
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
    credentials: 'include',
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
    return fetchApi<{ organizations: any[]; total: number }>(`/admin/organizations${query}`);
  },
  get: (id: string) => fetchApi<any>(`/admin/organizations/${id}`),
  create: (data: any) =>
    fetchApi<any>('/admin/organizations', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    fetchApi<any>(`/admin/organizations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    fetchApi<void>(`/admin/organizations/${id}`, { method: 'DELETE' }),
  getStats: () => fetchApi<any>('/admin/organizations/stats'),
  getUsers: (id: string) => fetchApi<any[]>(`/admin/organizations/${id}/users`),
};

// Users
export const usersApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return fetchApi<{ users: any[]; total: number }>(`/admin/users${query}`);
  },
  get: (id: string) => fetchApi<any>(`/admin/users/${id}`),
  create: (data: any) =>
    fetchApi<any>('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    fetchApi<any>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  disable: (id: string) =>
    fetchApi<void>(`/admin/users/${id}/disable`, { method: 'POST' }),
  enable: (id: string) =>
    fetchApi<void>(`/admin/users/${id}/enable`, { method: 'POST' }),
  resetPassword: (id: string) =>
    fetchApi<void>(`/admin/users/${id}/reset-password`, { method: 'POST' }),
  forceLogout: (id: string) =>
    fetchApi<void>(`/admin/users/${id}/force-logout`, { method: 'POST' }),
  delete: (id: string) =>
    fetchApi<void>(`/admin/users/${id}`, { method: 'DELETE' }),
  invite: (data: { email: string; organizationId: string; role?: string }) =>
    fetchApi<any>('/admin/users/invite', { method: 'POST', body: JSON.stringify(data) }),
  getStats: () => fetchApi<any>('/admin/users/stats'),
};

// Audit
export const auditApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return fetchApi<{ logs: any[]; total: number }>(`/admin/audit${query}`);
  },
  getActions: () => fetchApi<string[]>('/admin/audit/actions'),
  getResourceTypes: () => fetchApi<string[]>('/admin/audit/resource-types'),
};

// Admin users
export const adminsApi = {
  getPermissions: () => fetchApi<Record<string, any[]>>('/admin/admins/permissions'),
  getGroups: () => fetchApi<any[]>('/admin/admins/groups'),
  getMe: () => fetchApi<any>('/admin/admins/me'),
  create: (data: any) =>
    fetchApi<any>('/admin/admins', { method: 'POST', body: JSON.stringify(data) }),
  assignGroups: (id: string, groupIds: string[]) =>
    fetchApi<void>(`/admin/admins/${id}/groups`, {
      method: 'PUT',
      body: JSON.stringify({ groupIds }),
    }),
  disable: (id: string) =>
    fetchApi<void>(`/admin/admins/${id}/disable`, { method: 'POST' }),
  enable: (id: string) =>
    fetchApi<void>(`/admin/admins/${id}/enable`, { method: 'POST' }),
};
