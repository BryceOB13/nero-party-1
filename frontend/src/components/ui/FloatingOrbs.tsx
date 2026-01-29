import { forwardRef, useMemo } from 'react';
import { motion, HTMLMotionProps, Variants } from 'framer-motion';

export interface OrbConfig {
  /** Size of the orb in pixels */
  size: number;
  /** X position as percentage (0-100) */
  x: number;
  /** Y position as percentage (0-100) */
  y: number;
  /** Color of the orb (CSS color value) */
  color: string;
  /** Animation duration in seconds */
  duration: number;
  /** Animation delay in seconds */
  delay: number;
  /** Blur amount in pixels */
  blur: number;
  /** Opacity (0-1) */
  opacity: number;
}

export interface FloatingOrbsProps
  extends Omit<HTMLMotionProps<'div'>, 'children'> {
  /** Number of orbs to render */
  orbCount?: number;
  /** Custom orb configurations (overrides orbCount if provided) */
  orbs?: OrbConfig[];
  /** Colors to use for orbs (defaults to neon accent colors) */
  colors?: string[];
  /** Minimum animation duration in seconds */
  minDuration?: number;
  /** Maximum animation duration in seconds */
  maxDuration?: number;
  /** Minimum orb size in pixels */
  minSize?: number;
  /** Maximum orb size in pixels */
  maxSize?: number;
  /** Minimum blur amount in pixels */
  minBlur?: number;
  /** Maximum blur amount in pixels */
  maxBlur?: number;
  /** Minimum opacity (0-1) */
  minOpacity?: number;
  /** Maximum opacity (0-1) */
  maxOpacity?: number;
  /** Whether to animate the orbs */
  animate?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// Default neon accent colors from design spec
const DEFAULT_COLORS = [
  '#a855f7', // Purple (purple-500)
  '#06b6d4', // Cyan (cyan-500)
  '#ec4899', // Pink (pink-500)
  '#8b5cf6', // Violet (violet-500)
  '#22d3ee', // Cyan light (cyan-400)
  '#f472b6', // Pink light (pink-400)
];

/**
 * Generates a seeded random number for consistent orb generation
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Generates random orb configurations
 */
function generateOrbs(
  count: number,
  colors: string[],
  minDuration: number,
  maxDuration: number,
  minSize: number,
  maxSize: number,
  minBlur: number,
  maxBlur: number,
  minOpacity: number,
  maxOpacity: number
): OrbConfig[] {
  return Array.from({ length: count }, (_, i) => {
    const seed = i * 1000;
    const colorIndex = Math.floor(seededRandom(seed + 1) * colors.length);
    
    return {
      size: minSize + seededRandom(seed + 2) * (maxSize - minSize),
      x: seededRandom(seed + 3) * 100,
      y: seededRandom(seed + 4) * 100,
      color: colors[colorIndex],
      duration: minDuration + seededRandom(seed + 5) * (maxDuration - minDuration),
      delay: seededRandom(seed + 6) * 5,
      blur: minBlur + seededRandom(seed + 7) * (maxBlur - minBlur),
      opacity: minOpacity + seededRandom(seed + 8) * (maxOpacity - minOpacity),
    };
  });
}

/**
 * Creates floating animation variants for an orb
 */
function createFloatAnimation(orb: OrbConfig): Variants {
  // Create a gentle floating motion with slight drift
  const xDrift = 20 + seededRandom(orb.x * 100) * 30;
  const yDrift = 20 + seededRandom(orb.y * 100) * 30;
  
  return {
    initial: {
      x: 0,
      y: 0,
      scale: 1,
    },
    animate: {
      x: [0, xDrift, -xDrift / 2, xDrift / 2, 0],
      y: [0, -yDrift, yDrift / 2, -yDrift / 2, 0],
      scale: [1, 1.1, 0.95, 1.05, 1],
      transition: {
        duration: orb.duration,
        delay: orb.delay,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };
}

/**
 * FloatingOrbs - Background decoration component with animated gradient orbs
 * 
 * Features:
 * - Multiple gradient orbs with blur effect
 * - Floating/drifting animation using Framer Motion
 * - Neon accent colors (purple, cyan, pink) by default
 * - Fixed/absolute positioning as background layer
 * - pointer-events: none to not interfere with user interactions
 * - Customizable orb count, colors, sizes, and animation speed
 * 
 * @example
 * // Basic usage - renders behind other content
 * <FloatingOrbs />
 * 
 * @example
 * // Custom configuration
 * <FloatingOrbs 
 *   orbCount={8} 
 *   colors={['#ff0000', '#00ff00', '#0000ff']}
 *   minDuration={10}
 *   maxDuration={20}
 * />
 * 
 * @example
 * // With custom orbs
 * <FloatingOrbs 
 *   orbs={[
 *     { size: 200, x: 20, y: 30, color: '#a855f7', duration: 15, delay: 0, blur: 80, opacity: 0.3 }
 *   ]}
 * />
 */
export const FloatingOrbs = forwardRef<HTMLDivElement, FloatingOrbsProps>(
  (
    {
      orbCount = 6,
      orbs: customOrbs,
      colors = DEFAULT_COLORS,
      minDuration = 15,
      maxDuration = 25,
      minSize = 150,
      maxSize = 400,
      minBlur = 60,
      maxBlur = 120,
      minOpacity = 0.15,
      maxOpacity = 0.35,
      animate = true,
      className = '',
      ...motionProps
    },
    ref
  ) => {
    // Generate or use custom orbs
    const orbConfigs = useMemo(() => {
      if (customOrbs) {
        return customOrbs;
      }
      return generateOrbs(
        orbCount,
        colors,
        minDuration,
        maxDuration,
        minSize,
        maxSize,
        minBlur,
        maxBlur,
        minOpacity,
        maxOpacity
      );
    }, [
      customOrbs,
      orbCount,
      colors,
      minDuration,
      maxDuration,
      minSize,
      maxSize,
      minBlur,
      maxBlur,
      minOpacity,
      maxOpacity,
    ]);

    const containerClasses = [
      'fixed',
      'inset-0',
      'overflow-hidden',
      'pointer-events-none',
      'z-0',
    ].join(' ');

    return (
      <motion.div
        ref={ref}
        className={`${containerClasses} ${className}`}
        aria-hidden="true"
        data-testid="floating-orbs"
        {...motionProps}
      >
        {orbConfigs.map((orb, index) => {
          const floatAnimation = createFloatAnimation(orb);
          
          return (
            <motion.div
              key={index}
              className="absolute rounded-full"
              data-testid={`floating-orb-${index}`}
              style={{
                width: orb.size,
                height: orb.size,
                left: `${orb.x}%`,
                top: `${orb.y}%`,
                background: `radial-gradient(circle at 30% 30%, ${orb.color}, transparent 70%)`,
                filter: `blur(${orb.blur}px)`,
                opacity: orb.opacity,
                transform: 'translate(-50%, -50%)',
              }}
              variants={floatAnimation}
              initial="initial"
              animate={animate ? 'animate' : 'initial'}
            />
          );
        })}
      </motion.div>
    );
  }
);

FloatingOrbs.displayName = 'FloatingOrbs';

export default FloatingOrbs;
