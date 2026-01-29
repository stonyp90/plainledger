/**
 * Demo Mode Context
 * Manages demo/test data mode for showcasing features without real connections
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from '../lib/keycloak';

// Storage key for demo mode preference
const DEMO_MODE_STORAGE_KEY = 'plainledger-demo-mode';

interface DemoModeContextType {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  enableDemoMode: () => void;
  disableDemoMode: () => void;
}

const DemoModeContext = createContext<DemoModeContextType | null>(null);

interface DemoModeProviderProps {
  children: ReactNode;
}

export function DemoModeProvider({ children }: DemoModeProviderProps) {
  const { user } = useAuth();
  
  // Check if user is in demo-signup organization - auto-enable demo mode
  const isDemoSignupUser = user?.organization === 'demo-signup';
  
  // Load demo mode preference from localStorage or auto-enable for demo-signup users
  const [isDemoMode, setIsDemoModeState] = useState<boolean>(() => {
    // Auto-enable for demo-signup users
    if (isDemoSignupUser) {
      return true;
    }
    const saved = localStorage.getItem(DEMO_MODE_STORAGE_KEY);
    return saved === 'true';
  });
  
  // Auto-enable demo mode when user is in demo-signup org
  useEffect(() => {
    if (isDemoSignupUser && !isDemoMode) {
      setIsDemoModeState(true);
    }
  }, [isDemoSignupUser, isDemoMode]);

  // Save to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(DEMO_MODE_STORAGE_KEY, String(isDemoMode));
  }, [isDemoMode]);

  const setIsDemoMode = useCallback((value: boolean) => {
    setIsDemoModeState(value);
  }, []);

  const toggleDemoMode = useCallback(() => {
    setIsDemoMode(!isDemoMode);
  }, [isDemoMode, setIsDemoMode]);

  const enableDemoMode = useCallback(() => {
    setIsDemoMode(true);
  }, [setIsDemoMode]);

  const disableDemoMode = useCallback(() => {
    setIsDemoMode(false);
  }, [setIsDemoMode]);

  const value: DemoModeContextType = {
    isDemoMode,
    toggleDemoMode,
    enableDemoMode,
    disableDemoMode,
  };

  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode(): DemoModeContextType {
  const context = useContext(DemoModeContext);
  if (!context) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
}

export default DemoModeContext;
