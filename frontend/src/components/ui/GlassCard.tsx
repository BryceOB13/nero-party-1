import { forwardRef, ReactNode } from 'react';
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
  /** Whether to show texture overlay */
  texture?: boolean;
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
 * - Subtle borders with inner glow
 * - Noise texture overlay for realistic glass
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
      texture = true,
      ...motionProps
    },
    ref
  ) => {
    const baseClasses = [
      'rounded-2xl',
      'border',
      'relative',
      blurClasses[blur],
      opacityClasses[opacity],
      borderClasses[border],
      paddingClasses[padding],
    ].join(' ');

    const hoverClasses = hoverable
      ? 'transition-all duration-300 hover:bg-white/15 hover:border-purple-400/30'
      : '';

    const animationProps = animate
      ? {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.3 },
        }
      : {};

    // Inline styles for glass effect
    const glassStyle = {
      boxShadow: hoverable
        ? '0 4px 30px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
        : '0 4px 30px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    };

    return (
      <motion.div
        ref={ref}
        className={`${baseClasses} ${hoverClasses} ${className}`}
        style={glassStyle}
        {...animationProps}
        {...motionProps}
      >
        {/* Noise texture overlay */}
        {texture && (
          <div 
            className="absolute inset-0 rounded-2xl pointer-events-none opacity-[0.03] mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
        )}
        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </motion.div>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export default GlassCard;
