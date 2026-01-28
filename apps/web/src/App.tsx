import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useKeycloak } from './lib/keycloak';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import BalanceSheet from './pages/BalanceSheet';
import IncomeStatement from './pages/IncomeStatement';
import CashFlowStatement from './pages/CashFlowStatement';
import TrialBalance from './pages/TrialBalance';
import Connections from './pages/Connections';
import Settings from './pages/Settings';
import Landing from './pages/Landing';
import NewsletterPage from './pages/NewsletterPage';
import AnomalyDashboard from './pages/AnomalyDashboard';
import CustomDashboard from './pages/CustomDashboard';
import BoardMeeting from './pages/BoardMeeting';
import StrategicPlanning from './pages/StrategicPlanning';
import FinancialModel from './pages/FinancialModel';
import MontageFinancier from './pages/MontageFinancier';
// Store removed - using Landing as main website
import Onboarding from './components/Onboarding';
import Signup from './pages/Signup';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import EmailConfirmation from './pages/EmailConfirmation';
import MFASetup from './pages/MFASetup';
import MFAVerify from './pages/MFAVerify';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import PowerBIAnalytics from './pages/PowerBIAnalytics';
import OrgFeaturesConfig from './pages/OrgFeaturesConfig';
import CrispChat from './components/CrispChat';
import { AnalyticsVisibilityProvider } from './contexts/AnalyticsVisibilityContext';
import config from './lib/config';
import { analytics } from './lib/analytics';
import { useEffect, useState } from 'react';

// Check if user has completed onboarding
function hasCompletedOnboarding(): boolean {
  // Allow skipping onboarding via URL parameter for development/testing
  if (window.location.search.includes('skipOnboarding=true')) {
    localStorage.setItem('pl_onboarding_completed', 'true');
    return true;
  }
  // Allow resetting onboarding for testing
  if (window.location.search.includes('resetOnboarding=true')) {
    localStorage.removeItem('pl_onboarding_completed');
    return false;
  }
  // Allow forcing onboarding via URL parameter
  if (window.location.search.includes('startOnboarding=true')) {
    return false;
  }
  return localStorage.getItem('pl_onboarding_completed') === 'true';
}

// Note: shouldRequireOnboarding was removed as onboarding is now optional
// Users can access dashboard directly and start onboarding from settings

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authenticated, initialized, login, user } = useKeycloak();
  const location = useLocation();

  if (!initialized) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}
      >
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 loading-spinner"></div>
          <p style={{ color: 'rgb(var(--color-text-secondary))' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    // Redirect to custom login page instead of Keycloak's UI
    // This maintains our custom UI/UX while using Keycloak securely via API
    return <Navigate to="/login" replace />;
  }

  // Check if email verification is needed (skip for verify-email route itself)
  // In production, this checks the emailVerified flag from Keycloak
  // Allow bypass with URL parameter for development/testing
  // IMPORTANT: Only redirect if we KNOW email is not verified (emailVerified === false)
  // If emailVerified is undefined, allow access (assume verified - better UX)
  const skipEmailVerification = window.location.search.includes('skipEmailVerification=true');
  if (!skipEmailVerification && user && user.emailVerified === false && !location.pathname.includes('/verify-email')) {
    return <Navigate to="/verify-email" replace />;
  }

  // Onboarding is now optional - users can go directly to dashboard
  // They can start onboarding later from settings or by navigating to /onboarding
  // Removed: forced redirect to /onboarding

  return <>{children}</>;
}

// Login redirect - redirects to custom login page
function LoginRedirect() {
  const { authenticated } = useKeycloak();

  if (authenticated) {
    return <Navigate to="/app" replace />;
  }

  // Redirect to custom login page instead of Keycloak's UI
  return <Navigate to="/login" replace />;
}

// Protected route for email verification (doesn't redirect to verify-email again)
// Allows unauthenticated users if they have an email query param (coming from signup)
function ProtectedEmailVerificationRoute({ children }: { children: React.ReactNode }) {
  const { authenticated, initialized, user } = useKeycloak();
  const emailFromQuery = new URLSearchParams(window.location.search).get('email');

  if (!initialized) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}
      >
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 loading-spinner"></div>
          <p style={{ color: 'rgb(var(--color-text-secondary))' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  // Allow unauthenticated users if they have an email query param (coming from signup)
  // This is needed because after signup, the user has an account but hasn't logged in yet
  if (!authenticated && !emailFromQuery) {
    // No email param = not coming from signup, redirect to login
    return <Navigate to="/login" replace />;
  }

  // If authenticated and email already verified, proceed to onboarding or dashboard
  if (authenticated && user?.emailVerified) {
    if (!hasCompletedOnboarding()) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}

// Protected route for onboarding (doesn't redirect to onboarding again)
function ProtectedOnboardingRoute({ children }: { children: React.ReactNode }) {
  const { authenticated, initialized, user } = useKeycloak();

  if (!initialized) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}
      >
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 loading-spinner"></div>
          <p style={{ color: 'rgb(var(--color-text-secondary))' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    // Redirect to custom login page instead of Keycloak's UI
    return <Navigate to="/login" replace />;
  }

  // Check if email verification is needed first
  const skipEmailVerification = window.location.search.includes('skipEmailVerification=true');
  if (!skipEmailVerification && user && !user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  // Allow users to redo onboarding if they want - no redirect to dashboard
  // They can manually navigate to onboarding from settings or directly via /onboarding

  return <>{children}</>;
}

// App Layout wrapper for authenticated routes
function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout>
      {children}
    </Layout>
  );
}

function App() {
  const { initialized, authenticated } = useKeycloak();

  // Track page views - must be called before any conditional returns
  useEffect(() => {
    if (initialized) {
      analytics.page();
    }
  }, [initialized]);

  // Show loading while Keycloak initializes (only for initial load)
  if (!initialized) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}
      >
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 loading-spinner"></div>
          <p style={{ color: 'rgb(var(--color-text-secondary))' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <AnalyticsVisibilityProvider>
      {/* Crisp Live Chat */}
      {config.crisp.enabled && config.crisp.websiteId && (
        <CrispChat websiteId={config.crisp.websiteId} />
      )}
      
      <Routes>
        {/* Public routes - Main marketing website at root */}
        <Route 
          path="/" 
          element={authenticated ? <Navigate to="/app" replace /> : <Landing />} 
        />
        
        {/* Legacy routes redirect to root */}
        <Route 
          path="/store" 
          element={<Navigate to="/" replace />} 
        />
        <Route 
          path="/landing" 
          element={<Navigate to="/" replace />} 
        />
        
        {/* Signup - custom registration form or redirect if authenticated */}
        <Route 
          path="/signup" 
          element={authenticated ? <Navigate to="/onboarding" replace /> : <Signup />} 
        />
        
        {/* Register - alias for signup */}
        <Route 
          path="/register" 
          element={authenticated ? <Navigate to="/onboarding" replace /> : <Signup />} 
        />
        
        {/* Login - custom UI */}
        <Route 
          path="/login" 
          element={authenticated ? <Navigate to="/app" replace /> : <Login />} 
        />
        
        {/* Signin - alias for login */}
        <Route 
          path="/signin" 
          element={authenticated ? <Navigate to="/app" replace /> : <Login />} 
        />
        
        {/* Forgot Password */}
        <Route 
          path="/forgot-password" 
          element={authenticated ? <Navigate to="/app" replace /> : <ForgotPassword />} 
        />
        
        {/* Reset Password - custom UI for setting new password */}
        <Route 
          path="/reset-password" 
          element={authenticated ? <Navigate to="/app" replace /> : <ResetPassword />} 
        />

        {/* MFA Setup - authenticated users only */}
        <Route 
          path="/mfa/setup" 
          element={authenticated ? <MFASetup /> : <Navigate to="/login" replace />} 
        />

        {/* MFA Verify - during login when MFA is required */}
        <Route 
          path="/mfa/verify" 
          element={<MFAVerify />} 
        />
        
        <Route 
          path="/newsletter" 
          element={<NewsletterPage />} 
        />

        {/* Terms of Service - public page */}
        <Route 
          path="/terms" 
          element={<TermsOfService />} 
        />

        {/* Privacy Policy - public page */}
        <Route 
          path="/privacy" 
          element={<PrivacyPolicy />} 
        />

        {/* Email Verification - protected but separate from main app */}
        <Route
          path="/verify-email"
          element={
            <ProtectedEmailVerificationRoute>
              <EmailConfirmation />
            </ProtectedEmailVerificationRoute>
          }
        />
        
        {/* Onboarding - protected but separate from main app */}
        <Route
          path="/onboarding"
          element={
            <ProtectedOnboardingRoute>
              <Onboarding />
            </ProtectedOnboardingRoute>
          }
        />
      
      {/* Protected app routes */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/connections"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Connections />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/reports"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Reports />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/reports/balance-sheet"
        element={
          <ProtectedRoute>
            <AppLayout>
              <BalanceSheet />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/reports/income-statement"
        element={
          <ProtectedRoute>
            <AppLayout>
              <IncomeStatement />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/reports/cash-flow"
        element={
          <ProtectedRoute>
            <AppLayout>
              <CashFlowStatement />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/reports/trial-balance"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TrialBalance />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/settings"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Settings />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/analytics/powerbi"
        element={
          <ProtectedRoute>
            <AppLayout>
              <PowerBIAnalytics />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/admin/org-features"
        element={
          <ProtectedRoute>
            <AppLayout>
              <OrgFeaturesConfig />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/anomalies"
        element={
          <ProtectedRoute>
            <AppLayout>
              <AnomalyDashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/visualizations"
        element={
          <ProtectedRoute>
            <AppLayout>
              <CustomDashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/board-meeting"
        element={
          <ProtectedRoute>
            <AppLayout>
              <BoardMeeting />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/strategic-planning"
        element={
          <ProtectedRoute>
            <AppLayout>
              <StrategicPlanning />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/financial-model"
        element={
          <ProtectedRoute>
            <AppLayout>
              <FinancialModel />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/montage-financier"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MontageFinancier />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnalyticsVisibilityProvider>
  );
}

export default App;
