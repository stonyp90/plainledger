/**
 * File Upload API
 *
 * Handles uploading logos, profile pictures, and other files to the backend.
 */

import config from "./config";

export interface UploadResult {
  success: boolean;
  url: string;
  key: string;
  error?: string;
}

/**
 * Get auth token from Keycloak
 */
function getAuthToken(): string | null {
  // Try to get from Keycloak instance first (if available)
  if (typeof window !== 'undefined' && (window as unknown as { keycloak?: { token?: string } }).keycloak?.token) {
    return (window as unknown as { keycloak: { token: string } }).keycloak.token;
  }
  // Fall back to sessionStorage where Keycloak stores tokens
  return sessionStorage.getItem('kc_token') || localStorage.getItem('kc_token');
}

/**
 * Upload organization logo
 */
export async function uploadLogo(
  file: File,
  tenantId: string,
): Promise<UploadResult> {
  const token = getAuthToken();
  if (!token) {
    return { success: false, url: "", key: "", error: "Not authenticated" };
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(
      `${config.api.baseUrl}/api/uploads/logo/${tenantId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        url: "",
        key: "",
        error: errorData.message || `Upload failed: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: data.success,
      url: data.url || data.publicUrl,
      key: data.key,
    };
  } catch (error) {
    return {
      success: false,
      url: "",
      key: "",
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Delete organization logo
 */
export async function deleteLogo(tenantId: string): Promise<boolean> {
  const token = getAuthToken();
  if (!token) {
    return false;
  }

  try {
    const response = await fetch(
      `${config.api.baseUrl}/api/uploads/logo/${tenantId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.success;
  } catch {
    return false;
  }
}

/**
 * Upload user profile picture
 */
export async function uploadProfilePicture(file: File): Promise<UploadResult> {
  const token = getAuthToken();
  if (!token) {
    return { success: false, url: "", key: "", error: "Not authenticated" };
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(
      `${config.api.baseUrl}/api/uploads/profile-picture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        url: "",
        key: "",
        error: errorData.message || `Upload failed: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: data.success,
      url: data.url || data.publicUrl,
      key: data.key,
    };
  } catch (error) {
    return {
      success: false,
      url: "",
      key: "",
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Delete user profile picture
 */
export async function deleteProfilePicture(): Promise<boolean> {
  const token = getAuthToken();
  if (!token) {
    return false;
  }

  try {
    const response = await fetch(
      `${config.api.baseUrl}/api/uploads/profile-picture`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.success;
  } catch {
    return false;
  }
}

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check file size (max 5MB)
  const maxSizeMB = 5;
  if (file.size > maxSizeMB * 1024 * 1024) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
    };
  }

  // Check file type
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Invalid file type. Allowed: JPG, PNG, GIF, WebP",
    };
  }

  return { valid: true };
}
