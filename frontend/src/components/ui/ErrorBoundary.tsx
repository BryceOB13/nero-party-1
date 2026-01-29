import { Component, ErrorInfo, ReactNode } from 'react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';

export interface ErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode;
  /** Optional fallback UI to render on error */
  fallback?: ReactNode;
  /** Optional callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Optional callback to show toast notification */
  showToast?: (options: { type: 'error'; message: string; action?: { label: string; onClick: () => void } }) => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary - Catches React errors and displays fallback UI
 * 
 * Wraps components to catch JavaScript errors anywhere in the child
 * component tree, log those errors, and display a fallback UI.
 * 
 * Features:
 * - Catches render errors in child components
 * - Displays user-friendly error message
 * - Provides refresh button to recover
 * - Optionally shows toast notification
 * - Logs errors to console
 * 
 * Validates: Requirements 14.6
 * 
 * @example
 * ```tsx
 * <ErrorBoundary
 *   onError={(error) => console.error(error)}
 *   showToast={showToast}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console
    console.error('React error:', error, errorInfo);
    
    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Show toast notification if available
    if (this.props.showToast) {
      this.props.showToast({
        type: 'error',
        message: 'Something went wrong. Please refresh the page.',
        action: {
          label: 'Refresh',
          onClick: () => window.location.reload(),
        },
      });
    }
  }

  handleRefresh = (): void => {
    window.location.reload();
  };

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Render custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
          <GlassCard className="max-w-md w-full text-center" padding="lg">
            {/* Error icon */}
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            {/* Error message */}
            <h2 className="text-xl font-bold text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-white/60 mb-6">
              An unexpected error occurred. Please try refreshing the page.
            </p>

            {/* Error details (development only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-left">
                <p className="text-xs text-red-400 font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <GlassButton
                variant="primary"
                onClick={this.handleRefresh}
                leftIcon={
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
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                }
              >
                Refresh Page
              </GlassButton>
              
              <GlassButton
                variant="outline"
                onClick={this.handleRetry}
              >
                Try Again
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
