/**
 * Auth Feature - Types
 * 
 * Type definitions for authentication.
 */

// ============================================================================
// USER
// ============================================================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: UserRole;
  permissions: Permission[];
  createdAt: string;
  lastLoginAt?: string;
}

export type UserRole = 'owner' | 'admin' | 'accountant' | 'viewer';

export type Permission = 
  | 'read:reports'
  | 'write:reports'
  | 'read:connections'
  | 'write:connections'
  | 'read:accounts'
  | 'write:accounts'
  | 'read:settings'
  | 'write:settings'
  | 'manage:users';

// ============================================================================
// AUTH OPERATIONS
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  expiresAt: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

// ============================================================================
// AUTH STATE
// ============================================================================

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
