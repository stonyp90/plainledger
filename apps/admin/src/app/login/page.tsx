'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useKeycloak } from '@/hooks/useKeycloak';
import { setAuthToken } from '@/lib/api';
import { Eye, EyeOff, Loader2, Sun, Moon } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Theme = 'light' | 'dark';

export default function LoginPage() {
  const router = useRouter();
  const { authenticated } = useKeycloak();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');

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

  // Toggle theme
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
      // Login via API
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store token
      if (data.accessToken) {
        setAuthToken(data.accessToken);
        // Store in sessionStorage for persistence
        sessionStorage.setItem('admin_token', data.accessToken);
        
        // Reload to initialize admin context
        window.location.href = '/';
      } else {
        throw new Error('No access token received');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

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
          color: 'var(--admin-text-muted)'
        }}
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <Sun className="w-5 h-5" />
        ) : (
          <Moon className="w-5 h-5" />
        )}
      </button>

      <div className="w-full max-w-md">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <h1 
            className="text-3xl font-bold mb-2"
            style={{ color: 'var(--admin-text)' }}
          >
            PlainLedger
          </h1>
          <p style={{ color: 'var(--admin-text-muted)' }}>Admin Console</p>
        </div>

        {/* Login Card */}
        <div 
          className="rounded-xl p-8 shadow-2xl transition-colors duration-200"
          style={{ 
            backgroundColor: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)'
          }}
        >
          <h2 
            className="text-2xl font-semibold mb-6"
            style={{ color: 'var(--admin-text)' }}
          >
            Sign in to your account
          </h2>

          {error && (
            <div 
              className="mb-4 p-3 rounded-lg"
              style={{ 
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--admin-error)'
              }}
            >
              <p className="text-sm" style={{ color: 'var(--admin-error)' }}>{error}</p>
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
                style={{ 
                  backgroundColor: 'var(--admin-input-bg)',
                  border: '1px solid var(--admin-border)',
                  color: 'var(--admin-text)',
                  '--tw-ring-color': 'var(--admin-primary)'
                } as React.CSSProperties}
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
                  style={{ 
                    backgroundColor: 'var(--admin-input-bg)',
                    border: '1px solid var(--admin-border)',
                    color: 'var(--admin-text)',
                    '--tw-ring-color': 'var(--admin-primary)'
                  } as React.CSSProperties}
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
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: loading ? 'var(--admin-primary)' : 'var(--admin-primary)',
              }}
              onMouseOver={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--admin-primary-hover)')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--admin-primary)')}
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
