/**
 * Settings API Service
 * Provides functions to interact with the settings API endpoints
 */

import config from './config';

const API_BASE = `/api/v1`;

/**
 * Safely parse JSON response, handling non-JSON responses (e.g., 502 HTML error pages)
 */
async function safeJsonParse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type');
  
  // If content-type doesn't indicate JSON, throw a friendly error
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Server error. Please try again later.');
  }
  
  // Try to parse as JSON, catch any parsing errors
  try {
    return await response.json();
  } catch (parseError) {
    // JSON parsing failed (e.g., gateway returned HTML with wrong content-type)
    throw new Error('Server error. Please try again later.');
  }
}

/**
 * Get authentication headers
 * Gets token from Keycloak instance (exposed on window.keycloak)
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  let token: string | undefined = undefined;
  
  if (typeof window !== 'undefined') {
    // Get token from Keycloak instance (exposed by keycloak.tsx)
    const keycloakInstance = (window as any).keycloak;
    if (keycloakInstance?.token) {
      token = keycloakInstance.token;
    } else if (keycloakInstance?.getToken) {
      // If token needs refresh, get fresh token
      try {
        token = await keycloakInstance.getToken();
      } catch (error) {
        console.warn('Failed to get Keycloak token:', error);
      }
    }
    
    // Fallback: Check sessionStorage (where Keycloak stores tokens)
    if (!token) {
      token = sessionStorage.getItem('kc_token') || 
              localStorage.getItem('kc_token') ||
              undefined;
    }
  }
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

/**
 * Organization Settings API
 */
export const organizationSettingsApi = {
  /**
   * Get organization settings
   */
  async get(): Promise<any> {
    const response = await fetch(`${API_BASE}/settings/organization`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch organization settings: ${response.statusText}`);
    }

    return safeJsonParse(response);
  },

  /**
   * Update organization settings
   */
  async update(settings: any): Promise<any> {
    const response = await fetch(`${API_BASE}/settings/organization`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      throw new Error(`Failed to update organization settings: ${response.statusText}`);
    }

    return safeJsonParse(response);
  },

  /**
   * Update threshold settings
   */
  async updateThresholds(thresholds: any): Promise<any> {
    const response = await fetch(`${API_BASE}/settings/organization/thresholds`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(thresholds),
    });

    if (!response.ok) {
      throw new Error(`Failed to update thresholds: ${response.statusText}`);
    }

    return safeJsonParse(response);
  },

  /**
   * Update branding settings
   */
  async updateBranding(branding: any): Promise<any> {
    const response = await fetch(`${API_BASE}/settings/organization/branding`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(branding),
    });

    if (!response.ok) {
      throw new Error(`Failed to update branding: ${response.statusText}`);
    }

    return safeJsonParse(response);
  },

  /**
   * Update notification integrations
   */
  async updateNotificationIntegrations(integrations: any): Promise<any> {
    const response = await fetch(`${API_BASE}/settings/organization/notifications`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(integrations),
    });

    if (!response.ok) {
      throw new Error(`Failed to update notification integrations: ${response.statusText}`);
    }

    return safeJsonParse(response);
  },
};

/**
 * User Settings API
 */
export const userSettingsApi = {
  /**
   * Get user settings
   */
  async get(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/settings/user`, {
        method: 'GET',
        headers: await getAuthHeaders(),
      });

      if (!response.ok) {
        // 404 means no settings exist yet, 403 means user doesn't have permissions yet
        // Both are expected states - silently return defaults
        if (response.status === 404 || response.status === 403) {
          return {
            notificationPreferences: undefined,
            uiPreferences: undefined,
          };
        }
        throw new Error(`Failed to fetch user settings: ${response.statusText}`);
      }

      return safeJsonParse(response);
    } catch (error) {
      // Network errors, JSON parse errors, or other issues - silently return empty object
      // This is expected during initial load or for users without full permissions
      return {
        notificationPreferences: undefined,
        uiPreferences: undefined,
      };
    }
  },

  /**
   * Update user settings
   */
  async update(settings: any): Promise<any> {
    const response = await fetch(`${API_BASE}/settings/user`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      throw new Error(`Failed to update user settings: ${response.statusText}`);
    }

    return safeJsonParse(response);
  },

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(preferences: any): Promise<any> {
    const response = await fetch(`${API_BASE}/settings/user/notifications`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(preferences),
    });

    if (!response.ok) {
      throw new Error(`Failed to update notification preferences: ${response.statusText}`);
    }

    return safeJsonParse(response);
  },

  /**
   * Update UI preferences
   */
  async updateUIPreferences(preferences: any): Promise<any> {
    const response = await fetch(`${API_BASE}/settings/user/ui`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(preferences),
    });

    if (!response.ok) {
      throw new Error(`Failed to update UI preferences: ${response.statusText}`);
    }

    return safeJsonParse(response);
  },
};
