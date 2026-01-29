import { forwardRef, InputHTMLAttributes, ReactNode, useState } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

export type GlassInputSize = 'sm' | 'md' | 'lg';

export interface GlassInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Input size */
  size?: GlassInputSize;
  /** Label text */
  label?: string;
  /** Helper text displayed below the input */
  helperText?: string;
  /** Error message (also sets error state) */
  error?: string;
  /** Icon to display at the start of the input */
  leftIcon?: ReactNode;
  /** Icon to display at the end of the input */
  rightIcon?: ReactNode;
  /** Additional CSS classes for the container */
  containerClassName?: string;
  /** Additional CSS classes for the input */
  className?: string;
  /** Whether the input should take full width */
  fullWidth?: boolean;
}

const sizeClasses: Record<GlassInputSize, { input: string; icon: string }> = {
  sm: {
    input: 'px-3 py-1.5 text-sm rounded-lg',
    icon: 'h-4 w-4',
  },
  md: {
    input: 'px-4 py-2.5 text-base rounded-xl',
    icon: 'h-5 w-5',
  },
  lg: {
    input: 'px-5 py-3 text-lg rounded-2xl',
    icon: 'h-6 w-6',
  },
};

/**
 * GlassInput - A glassmorphism input component with focus states
 * 
 * Features:
 * - Frosted glass effect with backdrop blur
 * - Smooth focus transitions with glow effect
 * - Error state styling
 * - Icon support (left and right)
 * - Label and helper text support
 * - Multiple sizes
 */
export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  (
    {
      size = 'md',
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      containerClassName = '',
      className = '',
      fullWidth = false,
      disabled = false,
      id,
      ...inputProps
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    const inputId = id || `glass-input-${Math.random().toString(36).substr(2, 9)}`;

    const baseInputClasses = [
      'w-full',
      'bg-white/10',
      'backdrop-blur-md',
      'border',
      'text-white',
      'placeholder-white/40',
      'transition-all duration-200',
      'focus:outline-none',
      sizeClasses[size].input,
    ].join(' ');

    const stateClasses = error
      ? 'border-red-400/50 focus:border-red-400 focus:ring-2 focus:ring-red-400/30'
      : 'border-white/20 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/30 focus:bg-white/15';

    const disabledClasses = disabled
      ? 'opacity-50 cursor-not-allowed'
      : '';

    const iconPaddingLeft = leftIcon ? 'pl-10' : '';
    const iconPaddingRight = rightIcon ? 'pr-10' : '';

    return (
      <div
        className={`${fullWidth ? 'w-full' : ''} ${containerClassName}`}
      >
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-white/80 mb-1.5"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div
              className={`absolute left-3 top-1/2 -translate-y-1/2 text-white/50 ${
                isFocused ? 'text-purple-400' : ''
              } transition-colors duration-200 ${sizeClasses[size].icon}`}
            >
              {leftIcon}
            </div>
          )}
          
          <motion.div
            animate={{
              boxShadow: isFocused && !error
                ? '0 0 20px rgba(168, 85, 247, 0.15)'
                : '0 0 0px rgba(168, 85, 247, 0)',
            }}
            className="rounded-xl"
          >
            <input
              ref={ref}
              id={inputId}
              disabled={disabled}
              className={`${baseInputClasses} ${stateClasses} ${disabledClasses} ${iconPaddingLeft} ${iconPaddingRight} ${className}`}
              onFocus={(e) => {
                setIsFocused(true);
                inputProps.onFocus?.(e);
              }}
              onBlur={(e) => {
                setIsFocused(false);
                inputProps.onBlur?.(e);
              }}
              {...inputProps}
            />
          </motion.div>
          
          {rightIcon && (
            <div
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-white/50 ${
                isFocused ? 'text-purple-400' : ''
              } transition-colors duration-200 ${sizeClasses[size].icon}`}
            >
              {rightIcon}
            </div>
          )}
        </div>
        
        {(helperText || error) && (
          <p
            className={`mt-1.5 text-sm ${
              error ? 'text-red-400' : 'text-white/50'
            }`}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

GlassInput.displayName = 'GlassInput';

export default GlassInput;
