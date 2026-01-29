import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

export interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  /** Content to render inside the card */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Whether to apply hover effects */
  hoverable?: boolean;
  /** Intensity of the blur effect */
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  /** Background opacity level */
  opacity?: 'light' | 'medium' | 'dark';
  /** Border style */
  border?: 'subtle' | 'medium' | 'bright';
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** Whether to animate on mount */
  animate?: boolean;
}

const blurClasses = {
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md',
  lg: 'backdrop-blur-lg',
  xl: 'backdrop-blur-xl',
};

const opacityClasses = {
  light: 'bg-white/5',
  medium: 'bg-white/10',
  dark: 'bg-white/20',
};

const borderClasses = {
  subtle: 'border-white/10',
  medium: 'border-white/20',
  bright: 'border-white/30',
};

const paddingClasses = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
};

/**
 * GlassCard - A glassmorphism card component with frosted glass effect
 * 
 * Features:
 * - Frosted glass effect with backdrop blur
 * - Semi-transparent backgrounds
 * - Subtle borders
 * - Rounded corners
 * - Optional hover effects
 * - Configurable blur, opacity, and border intensity
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      children,
      className = '',
      hoverable = false,
      blur = 'md',
      opacity = 'medium',
      border = 'medium',
      padding = 'md',
      animate = true,
      ...motionProps
    },
    ref
  ) => {
    const baseClasses = [
      'rounded-2xl',
      'border',
      blurClasses[blur],
      opacityClasses[opacity],
      borderClasses[border],
      paddingClasses[padding],
      'shadow-lg',
      'shadow-black/10',
    ].join(' ');

    const hoverClasses = hoverable
      ? 'transition-all duration-300 hover:bg-white/15 hover:border-purple-400/30 hover:shadow-purple-500/10'
      : '';

    const animationProps = animate
      ? {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.3 },
        }
      : {};

    return (
      <motion.div
        ref={ref}
        className={`${baseClasses} ${hoverClasses} ${className}`}
        {...animationProps}
        {...motionProps}
      >
        {children}
      </motion.div>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export default GlassCard;
