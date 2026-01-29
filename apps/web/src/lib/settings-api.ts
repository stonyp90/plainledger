/**
 * Settings API Service
 * Provides functions to interact with the settings API endpoints
 */

import config from './config';

const API_BASE = config.apiUrl || 'http://localhost:3000/api/v1';

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
    
    // Fallback: Check localStorage/sessionStorage (for compatibility)
    if (!token) {
      token = localStorage.getItem('keycloak-token') || 
              sessionStorage.getItem('keycloak-token') ||
              localStorage.getItem('plainledger-auth-token') ||
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

    return response.json();
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

    return response.json();
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

    return response.json();
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

    return response.json();
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

    return response.json();
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
    const response = await fetch(`${API_BASE}/settings/user`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    if (!response.ok) {
      // 404 means no settings exist yet, return empty object
      if (response.status === 404) {
        return {};
      }
      throw new Error(`Failed to fetch user settings: ${response.statusText}`);
    }

    return response.json();
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

    return response.json();
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

    return response.json();
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

    return response.json();
  },
};
