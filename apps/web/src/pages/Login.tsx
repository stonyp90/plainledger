import { useAuth } from '../lib/keycloak';

export default function Login() {
  const { login } = useAuth();

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}
    >
      <div className="w-full max-w-md">
        {/* Login Card */}
        <div className="card p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div 
              className="w-10 h-10 rounded flex items-center justify-center"
              style={{ backgroundColor: 'rgb(var(--color-primary-600))', color: 'white' }}
            >
              <span className="text-base font-bold">PL</span>
            </div>
            <span 
              className="text-xl font-semibold tracking-tight"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              PlainLedger
            </span>
          </div>

          {/* Tagline */}
          <div className="text-center mb-8">
            <h1 
              className="text-lg font-semibold mb-2"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              Financial Reporting Platform
            </h1>
            <p 
              className="text-sm"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              Enterprise-grade reports with anomaly detection
            </p>
          </div>

          {/* Login Button */}
          <button
            onClick={() => login()}
            className="btn-primary w-full py-2.5 mb-6"
          >
            Sign in to your account
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div 
              className="absolute inset-0 flex items-center"
            >
              <div 
                className="w-full border-t"
                style={{ borderColor: 'rgb(var(--color-border))' }}
              />
            </div>
            <div className="relative flex justify-center text-xs">
              <span 
                className="px-3"
                style={{ 
                  backgroundColor: 'rgb(var(--color-surface))',
                  color: 'rgb(var(--color-text-muted))'
                }}
              >
                Integrated with your accounting software
              </span>
            </div>
          </div>

          {/* Features */}
          <div 
            className="grid grid-cols-3 gap-4 text-center text-xs"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            <div>
              <div 
                className="font-medium mb-1"
                style={{ color: 'rgb(var(--color-text-secondary))' }}
              >
                Balance Sheets
              </div>
              <div style={{ color: 'rgb(var(--color-text-subtle))' }}>Real-time</div>
            </div>
            <div>
              <div 
                className="font-medium mb-1"
                style={{ color: 'rgb(var(--color-text-secondary))' }}
              >
                Income Statements
              </div>
              <div style={{ color: 'rgb(var(--color-text-subtle))' }}>Automated</div>
            </div>
            <div>
              <div 
                className="font-medium mb-1"
                style={{ color: 'rgb(var(--color-text-secondary))' }}
              >
                Cash Flow
              </div>
              <div style={{ color: 'rgb(var(--color-text-subtle))' }}>AI-powered</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p 
          className="text-center text-xs mt-6"
          style={{ color: 'rgb(var(--color-text-subtle))' }}
        >
          Built by CPAs for CPAs · Bank-level encryption · Data in Quebec
        </p>
      </div>
    </div>
  );
}
