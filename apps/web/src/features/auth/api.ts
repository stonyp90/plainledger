/**
 * Auth Feature - API Layer
 *
 * API calls for authentication.
 */

import { apiClient } from '../../infrastructure/api';
import type { LoginRequest, LoginResponse, RegisterRequest, User } from './types';

// ============================================================================
// AUTH API
// ============================================================================

export const authApi = {
  /**
   * Login with email and password
   */
  login: (credentials: LoginRequest) =>
    apiClient.post<LoginResponse>('/api/auth/login', credentials),

  /**
   * Logout current user
   */
  logout: () => apiClient.post('/api/auth/logout'),

  /**
   * Refresh auth token
   */
  refreshToken: () => apiClient.post<{ token: string; expiresAt: string }>('/api/auth/refresh'),

  /**
   * Register new user
   */
  register: (data: RegisterRequest) => apiClient.post<LoginResponse>('/api/auth/register', data),

  /**
   * Get current user profile
   */
  getProfile: () => apiClient.get<User>('/api/auth/profile'),

  /**
   * Update user profile
   */
  updateProfile: (data: Partial<Pick<User, 'firstName' | 'lastName' | 'avatar'>>) =>
    apiClient.patch<User>('/api/auth/profile', data),

  /**
   * Request password reset
   */
  forgotPassword: (email: string) => apiClient.post('/api/auth/forgot-password', { email }),

  /**
   * Reset password with token
   */
  resetPassword: (token: string, password: string) =>
    apiClient.post('/api/auth/reset-password', { token, password }),

  /**
   * Change password (authenticated)
   */
  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post('/api/auth/change-password', { currentPassword, newPassword }),

  /**
   * Verify email with token
   */
  verifyEmail: (token: string) => apiClient.post('/api/auth/verify-email', { token }),

  /**
   * Resend verification email
   */
  resendVerification: () => apiClient.post('/api/auth/resend-verification'),
};

export default authApi;
