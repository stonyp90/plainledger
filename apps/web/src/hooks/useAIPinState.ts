import { useState, useEffect } from 'react';

/**
 * AI Pin State Hook
 * 
 * Manages pin/unpin state for AI toolbar with persistence.
 * Uses localStorage only - this is non-critical UI state that doesn't
 * need cross-device sync (user settings via GraphQL handle critical settings).
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
