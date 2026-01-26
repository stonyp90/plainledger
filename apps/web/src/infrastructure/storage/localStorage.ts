/**
 * Local Storage Service - Infrastructure Layer
 * 
 * Provides type-safe access to browser localStorage with
 * JSON serialization and error handling.
 */

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'plainledger-auth-token',
  CURRENT_TENANT: 'plainledger-current-tenant',
  THEME: 'plainledger-theme',
  LOCALE: 'plainledger-locale',
  CHART_FAVORITES: 'plainledger-chart-favorites',
  SIDEBAR_STATE: 'plainledger-sidebar-collapsed',
} as const;

type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

export const storage = {
  get<T>(key: StorageKey, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue ?? null;
      return JSON.parse(item) as T;
    } catch {
      return defaultValue ?? null;
    }
  },

  getString(key: StorageKey, defaultValue?: string): string | null {
    return localStorage.getItem(key) ?? defaultValue ?? null;
  },

  set<T>(key: StorageKey, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to save to localStorage: ${key}`, error);
    }
  },

  setString(key: StorageKey, value: string): void {
    localStorage.setItem(key, value);
  },

  remove(key: StorageKey): void {
    localStorage.removeItem(key);
  },

  clear(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  },
};

export default storage;
