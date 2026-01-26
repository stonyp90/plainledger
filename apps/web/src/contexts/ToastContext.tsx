/**
 * Toast Notification System
 * Provides global toast notifications across the application
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  
  // Convenience methods
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
}

// ============================================================================
// Context
// ============================================================================

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ============================================================================
// Provider
// ============================================================================

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());

  const generateId = () => `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const removeToast = useCallback((id: string) => {
    // First add to exiting set to trigger animation
    setExitingIds(prev => new Set(prev).add(id));
    
    // Then remove after animation completes
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      setExitingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 150);
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = generateId();
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-dismiss after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }

    return id;
  }, [removeToast]);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback((title: string, message?: string) => {
    return addToast({ type: 'success', title, message });
  }, [addToast]);

  const error = useCallback((title: string, message?: string) => {
    return addToast({ type: 'error', title, message, duration: 8000 });
  }, [addToast]);

  const warning = useCallback((title: string, message?: string) => {
    return addToast({ type: 'warning', title, message, duration: 6000 });
  }, [addToast]);

  const info = useCallback((title: string, message?: string) => {
    return addToast({ type: 'info', title, message });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ 
      toasts, 
      addToast, 
      removeToast, 
      clearAllToasts,
      success,
      error,
      warning,
      info
    }}>
      {children}
      <ToastContainer toasts={toasts} exitingIds={exitingIds} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

// ============================================================================
// Toast Container Component
// ============================================================================

interface ToastContainerProps {
  toasts: Toast[];
  exitingIds: Set<string>;
  onDismiss: (id: string) => void;
}

function ToastContainer({ toasts, exitingIds, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <ToastItem 
          key={toast.id} 
          toast={toast} 
          isExiting={exitingIds.has(toast.id)}
          onDismiss={() => onDismiss(toast.id)} 
        />
      ))}
    </div>
  );
}

// ============================================================================
// Toast Item Component
// ============================================================================

interface ToastItemProps {
  toast: Toast;
  isExiting: boolean;
  onDismiss: () => void;
}

function ToastItem({ toast, isExiting, onDismiss }: ToastItemProps) {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const Icon = icons[toast.type];

  const iconColors = {
    success: 'rgb(var(--color-success))',
    error: 'rgb(var(--color-focus))',
    warning: 'rgb(var(--color-warning))',
    info: 'rgb(var(--color-text-muted))',
  };

  return (
    <div className={`toast toast-${toast.type} ${isExiting ? 'exiting' : ''}`}>
      <div 
        className="w-5 h-5 flex-shrink-0 mt-0.5"
        style={{ color: iconColors[toast.type] }}
      >
        <Icon className="w-5 h-5" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p 
          className="text-sm font-medium"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          {toast.title}
        </p>
        {toast.message && (
          <p 
            className="text-sm mt-0.5"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {toast.message}
          </p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="text-sm font-medium mt-2 hover:underline"
            style={{ color: toast.type === 'error' ? 'rgb(var(--color-focus))' : 'rgb(var(--color-text))' }}
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        onClick={onDismiss}
        className="flex-shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5"
        style={{ color: 'rgb(var(--color-text-muted))' }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default ToastProvider;
