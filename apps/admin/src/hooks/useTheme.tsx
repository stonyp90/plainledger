'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('admin-theme');
    if (savedTheme) {
      // Migrate 'system' or 'dark' (old default) to 'light' if no preference saved
      const theme = savedTheme === 'system' ? 'light' : (savedTheme as Theme);
      if (theme === 'light' || theme === 'dark') {
        setThemeState(theme);
      }
    }
  }, []);

  useEffect(() => {
    // Set resolved theme directly (no system detection needed)
    setResolvedTheme(theme);
    
    // Apply theme to document
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('admin-theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
