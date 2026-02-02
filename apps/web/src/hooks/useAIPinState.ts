import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../infrastructure/api/client';

/**
 * AI Pin State Hook
 * 
 * Manages pin/unpin state for AI toolbar with persistence
 */

interface AIPinState {
  isPinned: boolean;
  isExpanded: boolean;
  position: 'top-right' | 'bottom-right';
  lastQuery?: string;
}

const AI_PIN_STATE_KEY = 'plainledger:ai:pin-state';

export function useAIPinState() {
  // Load from localStorage on mount
  const [state, setState] = useState<AIPinState>(() => {
    try {
      const saved = localStorage.getItem(AI_PIN_STATE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('[useAIPinState] Failed to load saved state:', error);
    }
    
    // Default state
    return {
      isPinned: false,
      isExpanded: false,
      position: 'bottom-right' as const,
    };
  });

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(AI_PIN_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('[useAIPinState] Failed to save state:', error);
    }
  }, [state]);

  // Sync to backend for cross-device persistence (optional, best-effort)
  const syncToBackend = useCallback(async () => {
    try {
      await apiClient.patch('/users/me/preferences', {
        aiPinState: state,
      });
    } catch (error) {
      // Silently fail - localStorage is the source of truth
      if (process.env.NODE_ENV === 'development') {
        console.debug('[useAIPinState] Failed to sync to backend:', error);
      }
    }
  }, [state]);

  // Sync to backend on state change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      syncToBackend();
    }, 1000); // Debounce by 1 second

    return () => clearTimeout(timeoutId);
  }, [state, syncToBackend]);

  return {
    isPinned: state.isPinned,
    isExpanded: state.isExpanded,
    position: state.position,
    togglePin: () => {
      setState(prev => ({
        ...prev,
        isPinned: !prev.isPinned,
        // Auto-expand when pinning
        isExpanded: !prev.isPinned ? true : prev.isExpanded,
      }));
    },
    toggleExpanded: () => {
      setState(prev => ({
        ...prev,
        isExpanded: !prev.isExpanded,
      }));
    },
    setPosition: (pos: AIPinState['position']) => {
      setState(prev => ({
        ...prev,
        position: pos,
      }));
    },
    collapse: () => {
      setState(prev => ({
        ...prev,
        isExpanded: false,
      }));
    },
  };
}
