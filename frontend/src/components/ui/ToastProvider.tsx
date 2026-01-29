import { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import { ToastContainer, Toast, ToastOptions } from './Toast';

interface ToastContextValue {
  showToast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
  dismissAllToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastIdCounter = 0;

function generateToastId(): string {
  return `toast-${++toastIdCounter}-${Date.now()}`;
}

export interface ToastProviderProps {
  children: ReactNode;
  /** Maximum number of toasts to show at once */
  maxToasts?: number;
}

/**
 * ToastProvider - Context provider for toast notifications
 * 
 * Wrap your app with this provider to enable toast notifications.
 * Use the useToast hook to show toasts from any component.
 * 
 * Features:
 * - Manages toast state
 * - Limits maximum visible toasts
 * - Provides showToast, dismissToast, and dismissAllToasts functions
 */
export const ToastProvider: React.FC<ToastProviderProps> = ({ 
  children, 
  maxToasts = 5 
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((options: ToastOptions): string => {
    const id = generateToastId();
    const newToast: Toast = { ...options, id };
    
    setToasts((prev) => {
      // Remove oldest toasts if we exceed maxToasts
      const updated = [...prev, newToast];
      if (updated.length > maxToasts) {
        return updated.slice(-maxToasts);
      }
      return updated;
    });
    
    return id;
  }, [maxToasts]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const dismissAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast, dismissAllToasts }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

/**
 * useToast - Hook for showing toast notifications
 * 
 * Must be used within a ToastProvider.
 * 
 * @example
 * ```tsx
 * const { showToast } = useToast();
 * 
 * showToast({
 *   type: 'success',
 *   message: 'Operation completed!',
 *   duration: 3000,
 * });
 * 
 * showToast({
 *   type: 'error',
 *   message: 'Something went wrong.',
 *   action: {
 *     label: 'Retry',
 *     onClick: () => retryOperation(),
 *   },
 * });
 * ```
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  return context;
}

export default ToastProvider;
