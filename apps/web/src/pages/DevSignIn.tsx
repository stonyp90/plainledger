/**
 * Development Sign-In Page
 * Allows developers to quickly sign in as different roles for testing.
 * Only shown when VITE_MOCK_AUTH is enabled (local development).
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Crown, Users, Eye, Calculator, ChevronRight, Code2 } from 'lucide-react';
import { useKeycloak, MOCK_USERS, type MockUserProfile } from '../lib/keycloak';

const ROLE_ICONS: Record<string, React.ElementType> = {
  Owner: Crown,
  Admin: Shield,
  Accountant: Calculator,
  Member: Users,
  Viewer: Eye,
};

const TIER_STYLES: Record<string, { bg: string; border: string; badge: string; badgeBg: string }> =
  {
    enterprise: {
      bg: 'rgba(16, 185, 129, 0.06)',
      border: 'rgba(16, 185, 129, 0.25)',
      badge: 'rgb(5, 150, 105)',
      badgeBg: 'rgba(16, 185, 129, 0.1)',
    },
    professional: {
      bg: 'rgba(245, 158, 11, 0.06)',
      border: 'rgba(245, 158, 11, 0.25)',
      badge: 'rgb(217, 119, 6)',
      badgeBg: 'rgba(245, 158, 11, 0.1)',
    },
    free: {
      bg: 'rgba(100, 116, 139, 0.06)',
      border: 'rgba(100, 116, 139, 0.25)',
      badge: 'rgb(71, 85, 105)',
      badgeBg: 'rgba(100, 116, 139, 0.1)',
    },
  };

export default function DevSignIn() {
  const { selectMockUser } = useKeycloak();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (user: MockUserProfile) => {
    setSelectedId(user.id);
    setTimeout(() => {
      selectMockUser(user);
      navigate('/app');
    }, 250);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ backgroundColor: '#f8fafb' }}
    >
      {/* Decorative top gradient bar */}
      <div
        className="fixed top-0 left-0 right-0 h-1 z-50"
        style={{
          background: 'linear-gradient(90deg, #10b981, #34d399, #fbbf24, #f59e0b)',
        }}
      />

      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <img src="/logo-full.png" alt="PlainLedger" className="h-11" />
          </div>

          {/* Dev badge */}
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-4"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#059669',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            <Code2 className="w-3.5 h-3.5" />
            Development Mode
          </div>

          <h1 className="text-xl font-bold mb-1" style={{ color: '#0f172a' }}>
            Choose a role to sign in
          </h1>
          <p className="text-sm" style={{ color: '#64748b' }}>
            Select a user profile to test different permission levels
          </p>
        </div>

        {/* Role cards */}
        <div className="space-y-3">
          {MOCK_USERS.map((user) => {
            const Icon = ROLE_ICONS[user.roleLabel] || Users;
            const tier = TIER_STYLES[user.tier];
            const isSelected = selectedId === user.id;
            const isFaded = selectedId !== null && !isSelected;

            return (
              <button
                key={user.id}
                onClick={() => handleSelect(user)}
                disabled={!!selectedId}
                className="w-full text-left rounded-xl p-4 flex items-center gap-4 group border transition-all duration-200"
                style={{
                  backgroundColor: isSelected ? tier.bg : '#ffffff',
                  borderColor: isSelected ? tier.badge : '#e2e8f0',
                  opacity: isFaded ? 0.45 : 1,
                  boxShadow: isSelected
                    ? `0 0 0 2px ${tier.badge}, 0 4px 12px rgba(0,0,0,0.08)`
                    : '0 1px 3px rgba(0, 0, 0, 0.05)',
                  transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                  cursor: selectedId ? 'default' : 'pointer',
                }}
              >
                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: tier.badgeBg,
                    border: `1px solid ${tier.border}`,
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: tier.badge }} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm" style={{ color: '#0f172a' }}>
                      {user.label}
                    </span>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: tier.badgeBg,
                        color: tier.badge,
                        border: `1px solid ${tier.border}`,
                      }}
                    >
                      {user.tier}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                    {user.description}
                  </p>
                </div>

                {/* Arrow */}
                <ChevronRight
                  className="w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5"
                  style={{ color: '#94a3b8' }}
                />
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs" style={{ color: '#94a3b8' }}>
            Or{' '}
            <a
              href="/login?real=true"
              className="font-medium underline underline-offset-2 hover:opacity-80 transition-opacity"
              style={{ color: '#10b981' }}
            >
              sign in with Keycloak
            </a>{' '}
            for real authentication
          </p>
        </div>
      </div>
    </div>
  );
}
