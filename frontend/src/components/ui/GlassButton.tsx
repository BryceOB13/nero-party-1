import { forwardRef, ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

export type GlassButtonVariant = 'default' | 'primary' | 'outline' | 'ghost';
export type GlassButtonSize = 'sm' | 'md' | 'lg';

export interface GlassButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'children'> {
  /** Content to render inside the button */
  children: ReactNode;
  /** Button variant style */
  variant?: GlassButtonVariant;
  /** Button size */
  size?: GlassButtonSize;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Icon to display before the text */
  leftIcon?: ReactNode;
  /** Icon to display after the text */
  rightIcon?: ReactNode;
  /** Whether the button should take full width */
  fullWidth?: boolean;
}

const variantClasses: Record<GlassButtonVariant, string> = {
  default:
    'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 hover:border-white/30',
  primary:
    'bg-gradient-to-r from-purple-500/80 to-cyan-500/80 backdrop-blur-md border border-purple-400/30 text-white hover:from-purple-500 hover:to-cyan-500 hover:border-purple-400/50 shadow-lg shadow-purple-500/20',
  outline:
    'bg-transparent backdrop-blur-sm border-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50',
  ghost:
    'bg-transparent text-white/80 hover:bg-white/10 hover:text-white border border-transparent',
};

const sizeClasses: Record<GlassButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-4 py-2 text-base rounded-xl gap-2',
  lg: 'px-6 py-3 text-lg rounded-2xl gap-2.5',
};

const disabledClasses =
  'opacity-50 cursor-not-allowed pointer-events-none';

const loadingClasses = 'cursor-wait';

/**
 * GlassButton - A glassmorphism button component with multiple variants
 * 
 * Variants:
 * - default: Standard glass button with subtle background
 * - primary: Gradient background with purple/cyan colors
 * - outline: Transparent with visible border
 * - ghost: Minimal styling, transparent until hovered
 * 
 * Features:
 * - Frosted glass effect with backdrop blur
 * - Smooth hover transitions
 * - Loading state with spinner
 * - Icon support (left and right)
 * - Multiple sizes
 */
export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  (
    {
      children,
      variant = 'default',
      size = 'md',
      disabled = false,
      loading = false,
      className = '',
      leftIcon,
      rightIcon,
      fullWidth = false,
      type = 'button',
      ...motionProps
    },
    ref
  ) => {
    const baseClasses = [
      'inline-flex items-center justify-center',
      'font-medium',
      'transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:ring-offset-2 focus:ring-offset-transparent',
      variantClasses[variant],
      sizeClasses[size],
      disabled ? disabledClasses : '',
      loading ? loadingClasses : '',
      fullWidth ? 'w-full' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <motion.button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={`${baseClasses} ${className}`}
        whileHover={!disabled && !loading ? { scale: 1.02 } : undefined}
        whileTap={!disabled && !loading ? { scale: 0.98 } : undefined}
        {...motionProps}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4 mr-2"
            xmlns="http://www.w3.org/2000/svg"
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
        {!loading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!loading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </motion.button>
    );
  }
);

GlassButton.displayName = 'GlassButton';

export default GlassButton;
