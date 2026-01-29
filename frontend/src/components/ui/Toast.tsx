import { forwardRef, useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type ToastType = 'error' | 'warning' | 'info' | 'success';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  type: ToastType;
  message: string;
  duration?: number;
  action?: ToastAction;
}

export interface Toast extends ToastOptions {
  id: string;
}

export interface ToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const typeStyles: Record<ToastType, { bg: string; border: string; icon: string }> = {
  error: {
    bg: 'bg-red-500/20',
    border: 'border-red-500/40',
    icon: '❌',
  },
  warning: {
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/40',
    icon: '⚠️',
  },
  info: {
    bg: 'bg-cyan-500/20',
    border: 'border-cyan-500/40',
    icon: 'ℹ️',
  },
  success: {
    bg: 'bg-green-500/20',
    border: 'border-green-500/40',
    icon: '✅',
  },
};

/**
 * Toast - Individual toast notification component
 * 
 * Features:
 * - Multiple types (error, warning, info, success)
 * - Auto-dismiss after configurable duration
 * - Manual dismiss with close button
 * - Optional action button
 * - Framer Motion animations
 */
export const ToastItem = forwardRef<HTMLDivElement, ToastProps>(
  ({ toast, onDismiss }, ref) => {
    const { id, type, message, duration = 5000, action } = toast;
    const styles = typeStyles[type];

    useEffect(() => {
      if (duration > 0) {
        const timer = setTimeout(() => {
          onDismiss(id);
        }, duration);
        return () => clearTimeout(timer);
      }
    }, [id, duration, onDismiss]);

    return (
      <motion.div
        ref={ref}
        layout
        initial={{ opacity: 0, x: 100, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 100, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`
          flex items-start gap-3 p-4 rounded-xl
          backdrop-blur-md border shadow-lg
          ${styles.bg} ${styles.border}
          min-w-[280px] max-w-[400px]
        `}
        role="alert"
        aria-live="polite"
      >
        <span className="text-lg flex-shrink-0" aria-hidden="true">
          {styles.icon}
        </span>
        
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium break-words">
            {message}
          </p>
          
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 text-sm font-medium text-white/80 hover:text-white underline underline-offset-2 transition-colors"
            >
              {action.label}
            </button>
          )}
        </div>
        
        <button
          onClick={() => onDismiss(id)}
          className="flex-shrink-0 text-white/60 hover:text-white transition-colors p-1 -m-1"
          aria-label="Dismiss notification"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </motion.div>
    );
  }
);

ToastItem.displayName = 'ToastItem';

export interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

/**
 * ToastContainer - Container for rendering multiple toasts
 * 
 * Renders toasts in the top-right corner with proper stacking
 */
export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastItem;
