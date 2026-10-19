/** File uploads use the same refreshed, tenant-scoped transport as other API calls. */
import { api } from './api';

export interface UploadResult {
  success: boolean;
  url: string;
  key: string;
  error?: string;
}

interface UploadResponse {
  success: boolean;
  url?: string;
  publicUrl?: string;
  key: string;
}

async function uploadImage(path: string, file: File): Promise<UploadResult> {
  const validation = validateImageFile(file);
  if (!validation.valid) return { success: false, url: '', key: '', error: validation.error };
  try {
    const { data } = await api.upload<UploadResponse>(path, file);
    const url = data?.url || data?.publicUrl;
    if (data?.success !== true || !url || !data.key) {
      throw new Error('The upload did not return a valid image. Please try again.');
    }
    return { success: true, url, key: data.key };
  } catch (error) {
    return { success: false, url: '', key: '', error: error instanceof Error ? error.message : 'Upload failed' };
  }
}

async function deleteImage(path: string): Promise<boolean> {
  try {
    const { data } = await api.delete<{ success: boolean }>(path);
    return data?.success === true;
  } catch {
    return false;
  }
}

export async function uploadLogo(file: File, tenantId: string): Promise<UploadResult> {
  if (!tenantId.trim()) return { success: false, url: '', key: '', error: 'Select an organization first.' };
  return uploadImage(`/uploads/logo/${encodeURIComponent(tenantId)}`, file);
}

export async function deleteLogo(tenantId: string): Promise<boolean> {
  return tenantId.trim() ? deleteImage(`/uploads/logo/${encodeURIComponent(tenantId)}`) : false;
}

export async function uploadProfilePicture(file: File): Promise<UploadResult> {
  return uploadImage('/uploads/profile-picture', file);
}

export async function deleteProfilePicture(): Promise<boolean> {
  return deleteImage('/uploads/profile-picture');
}

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  if (file.size === 0) return { valid: false, error: 'Choose a nonempty image file.' };

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
