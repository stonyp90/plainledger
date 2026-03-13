'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useKeycloak } from '@/hooks/useKeycloak';
import { setAuthToken } from '@/lib/api';
import { hasKeycloakCallbackParams } from '@/lib/keycloak-sso';
import Image from 'next/image';
import { Eye, EyeOff, Loader2, Sun, Moon, Shield } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Theme = 'light' | 'dark';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { authenticated, loginWithGoogle, loginWithSSO } = useKeycloak();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ssoProcessing, setSsoProcessing] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');

  // Detect SSO callback on mount
  useEffect(() => {
    if (hasKeycloakCallbackParams()) {
      setSsoProcessing(true);
    }
  }, []);

  // Load theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('admin-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('admin-theme', newTheme);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (authenticated) {
      router.push('/');
    }
  }, [authenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (data.accessToken) {
        setAuthToken(data.accessToken);
        sessionStorage.setItem('admin_token', data.accessToken);
        sessionStorage.setItem('admin_auth_source', 'api');

        if (data.refreshToken) {
          sessionStorage.setItem('admin_refresh_token', data.refreshToken);
        }
        if (data.expiresIn) {
          const expiryTime = Date.now() + (data.expiresIn - 60) * 1000;
          sessionStorage.setItem('admin_token_expiry', expiryTime.toString());
        }

        window.location.href = '/';
      } else {
        throw new Error('No access token received');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  // Show processing state when handling SSO callback
  if (ssoProcessing) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--admin-bg)' }}
      >
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" style={{ color: 'var(--admin-primary)' }} />
          <p style={{ color: 'var(--admin-text-muted)' }}>Completing sign-in...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 transition-colors duration-200"
      style={{ backgroundColor: 'var(--admin-bg)' }}
    >
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-lg transition-colors"
        style={{
          backgroundColor: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
          color: 'var(--admin-text-muted)',
        }}
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="w-full max-w-md">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <Image
            src={theme === 'dark' ? '/logo-full-dark.svg' : '/logo-full.svg'}
            alt="PlainLedger"
            width={280}
            height={75}
            className="mx-auto mb-2"
            priority
          />
          <p style={{ color: 'var(--admin-text-muted)' }}>Admin Console</p>
        </div>

        {/* Login Card */}
        <div
          className="rounded-xl p-8 shadow-2xl transition-colors duration-200"
          style={{
            backgroundColor: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--admin-text)' }}>
            Sign in to your account
          </h2>

          {error && (
            <div
              className="mb-4 p-3 rounded-lg"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--admin-error)',
              }}
            >
              <p className="text-sm" style={{ color: 'var(--admin-error)' }}>
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--admin-text-muted)' }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg transition-all focus:outline-none focus:ring-2"
                style={
                  {
                    backgroundColor: 'var(--admin-input-bg)',
                    border: '1px solid var(--admin-border)',
                    color: 'var(--admin-text)',
                    '--tw-ring-color': 'var(--admin-primary)',
                  } as React.CSSProperties
                }
                placeholder="admin@plainledger.ca"
                disabled={loading}
              />
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--admin-text-muted)' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg transition-all focus:outline-none focus:ring-2 pr-12"
                  style={
                    {
                      backgroundColor: 'var(--admin-input-bg)',
                      border: '1px solid var(--admin-border)',
                      color: 'var(--admin-text)',
                      '--tw-ring-color': 'var(--admin-primary)',
                    } as React.CSSProperties
                  }
                  placeholder="Enter your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--admin-text-muted)' }}
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--admin-primary)',
                border: '1px solid color-mix(in srgb, var(--admin-primary) 40%, transparent)',
              }}
              onMouseOver={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor =
                    'color-mix(in srgb, var(--admin-primary) 10%, transparent)';
                  e.currentTarget.style.borderColor =
                    'color-mix(in srgb, var(--admin-primary) 70%, transparent)';
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor =
                  'color-mix(in srgb, var(--admin-primary) 40%, transparent)';
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--admin-border)' }} />
            <span className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
              or
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--admin-border)' }} />
          </div>

          {/* SSO Buttons */}
          <div className="space-y-3">
            <div className="relative group">
              <button
                type="button"
                disabled
                className="w-full py-3 rounded-lg flex items-center justify-center gap-3 opacity-50 cursor-not-allowed"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--admin-text)',
                  border: '1px solid var(--admin-border)',
                }}
              >
                <GoogleIcon className="w-5 h-5" />
                <span className="font-medium">Sign in with Google</span>
              </button>
              <div
                className="absolute left-1/2 -translate-x-1/2 -top-9 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{
                  backgroundColor: 'var(--admin-text)',
                  color: 'var(--admin-bg)',
                }}
              >
                Coming soon — under development
              </div>
            </div>

            <div className="relative group">
              <button
                type="button"
                disabled
                className="w-full py-3 rounded-lg flex items-center justify-center gap-3 opacity-50 cursor-not-allowed"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--admin-text)',
                  border: '1px solid var(--admin-border)',
                }}
              >
                <Shield className="w-5 h-5" />
                <span className="font-medium">Sign in with SSO</span>
              </button>
              <div
                className="absolute left-1/2 -translate-x-1/2 -top-9 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{
                  backgroundColor: 'var(--admin-text)',
                  color: 'var(--admin-bg)',
                }}
              >
                Coming soon — under development
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
              Forgot your password?{' '}
              <a
                href="#"
                className="transition-colors"
                style={{ color: 'var(--admin-primary)' }}
                onMouseOver={(e) => (e.currentTarget.style.color = 'var(--admin-primary-hover)')}
                onMouseOut={(e) => (e.currentTarget.style.color = 'var(--admin-primary)')}
              >
                Contact support
              </a>
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            Secure access to PlainLedger Admin Console
          </p>
        </div>
      </div>
    </div>
  );
}
