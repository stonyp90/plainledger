import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { KeycloakProvider } from './lib/keycloak';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { TenantProvider } from './contexts/TenantContext';
import { ToastProvider } from './contexts/ToastContext';
import { DemoModeProvider } from './contexts/DemoModeContext';
import { I18nProvider } from './lib/i18n';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider defaultLanguage="fr">
      <ThemeProvider defaultTheme="light">
        <KeycloakProvider>
          <TenantProvider>
            <DemoModeProvider>
              <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                  <NotificationProvider>
                    <ToastProvider>
                      <App />
                    </ToastProvider>
                  </NotificationProvider>
                </BrowserRouter>
              </QueryClientProvider>
            </DemoModeProvider>
          </TenantProvider>
        </KeycloakProvider>
      </ThemeProvider>
    </I18nProvider>
  </React.StrictMode>,
);
