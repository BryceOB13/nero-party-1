import { motion, AnimatePresence } from 'framer-motion';

export interface ReconnectionIndicatorProps {
  /** Whether the indicator should be visible */
  isVisible: boolean;
  /** Optional custom message */
  message?: string;
  /** Whether reconnection is in progress */
  isReconnecting?: boolean;
  /** Number of reconnection attempts */
  attemptCount?: number;
}

/**
 * ReconnectionIndicator - Shows connection status during disconnects
 * 
 * Displays a banner at the top of the screen when the socket connection
 * is lost, with a pulsing animation to indicate reconnection attempts.
 * 
 * Features:
 * - Animated entrance/exit
 * - Pulsing reconnection indicator
 * - Shows attempt count
 * - Glassmorphism styling
 * 
 * Validates: Requirements 14.4
 */
export const ReconnectionIndicator: React.FC<ReconnectionIndicatorProps> = ({
  isVisible,
  message = 'Connection lost. Reconnecting...',
  isReconnecting = true,
  attemptCount,
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-50 flex justify-center p-2"
          role="alert"
          aria-live="assertive"
        >
          <div
            className={`
              flex items-center gap-3 px-4 py-2 rounded-xl
              backdrop-blur-md border shadow-lg
              bg-amber-500/20 border-amber-500/40
              text-white
            `}
          >
            {/* Pulsing indicator */}
            {isReconnecting && (
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="w-3 h-3 rounded-full bg-amber-400"
                aria-hidden="true"
              />
            )}
            
            {/* Disconnected icon when not reconnecting */}
            {!isReconnecting && (
              <svg
                className="w-5 h-5 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
                />
              </svg>
            )}
            
            <span className="text-sm font-medium">
              {message}
            </span>
            
            {attemptCount !== undefined && attemptCount > 0 && (
              <span className="text-xs text-white/60">
                (Attempt {attemptCount})
              </span>
            )}
            
            {/* Loading spinner */}
            {isReconnecting && (
              <svg
                className="w-4 h-4 animate-spin text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReconnectionIndicator;
