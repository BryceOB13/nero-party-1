import { forwardRef, useEffect, useState, useRef } from 'react';
import { motion, useSpring, useTransform, HTMLMotionProps } from 'framer-motion';

export type ScoreDisplaySize = 'sm' | 'md' | 'lg';

export interface ScoreDisplayProps
  extends Omit<HTMLMotionProps<'div'>, 'children'> {
  /** The current score value to display */
  score: number;
  /** The previous score value (used to calculate delta) */
  previousScore?: number | null;
  /** Size variant */
  size?: ScoreDisplaySize;
  /** Whether to show the delta indicator (+/-) */
  showDelta?: boolean;
  /** Number of decimal places to display */
  decimals?: number;
  /** Duration of the counting animation in seconds */
  animationDuration?: number;
  /** Whether to animate on mount */
  animate?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Prefix to display before the score (e.g., currency symbol) */
  prefix?: string;
  /** Suffix to display after the score (e.g., "pts") */
  suffix?: string;
}

const sizeClasses: Record<ScoreDisplaySize, { score: string; delta: string; container: string }> = {
  sm: {
    score: 'text-lg font-bold',
    delta: 'text-xs',
    container: 'gap-1',
  },
  md: {
    score: 'text-2xl font-bold',
    delta: 'text-sm',
    container: 'gap-1.5',
  },
  lg: {
    score: 'text-4xl font-bold',
    delta: 'text-base',
    container: 'gap-2',
  },
};

/**
 * AnimatedNumber - Internal component for animated number counting
 */
function AnimatedNumber({
  value,
  decimals,
  duration,
  className,
}: {
  value: number;
  decimals: number;
  duration: number;
  className?: string;
}) {
  const spring = useSpring(value, {
    stiffness: 100,
    damping: 30,
    duration: duration,
  });

  const display = useTransform(spring, (current) => current.toFixed(decimals));
  const [displayValue, setDisplayValue] = useState(value.toFixed(decimals));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    const unsubscribe = display.on('change', (latest) => {
      setDisplayValue(latest);
    });
    return unsubscribe;
  }, [display]);

  return <span className={className}>{displayValue}</span>;
}

/**
 * ScoreDisplay - A component for displaying scores with animated counting and delta indicators
 * 
 * Features:
 * - Animated counting up/down effect using Framer Motion springs
 * - Delta indicator showing score change (+/- with color coding)
 * - Multiple sizes (sm, md, lg)
 * - Glassmorphism styling consistent with other UI components
 * - Configurable decimal places
 * - Optional prefix/suffix
 * 
 * @example
 * // Basic usage
 * <ScoreDisplay score={85.5} />
 * 
 * @example
 * // With delta indicator
 * <ScoreDisplay score={85.5} previousScore={80.0} showDelta />
 * 
 * @example
 * // Large size with suffix
 * <ScoreDisplay score={1250} size="lg" suffix=" pts" />
 */
export const ScoreDisplay = forwardRef<HTMLDivElement, ScoreDisplayProps>(
  (
    {
      score,
      previousScore = null,
      size = 'md',
      showDelta = true,
      decimals = 1,
      animationDuration = 0.8,
      animate = true,
      className = '',
      prefix = '',
      suffix = '',
      ...motionProps
    },
    ref
  ) => {
    const sizeConfig = sizeClasses[size];
    const delta = previousScore !== null ? score - previousScore : null;
    const hasDelta = delta !== null && delta !== 0;
    const isPositive = delta !== null && delta > 0;
    const isNegative = delta !== null && delta < 0;

    // Track if this is the initial render
    const isInitialRender = useRef(true);
    useEffect(() => {
      isInitialRender.current = false;
    }, []);

    const baseClasses = [
      'inline-flex flex-col items-end',
      sizeConfig.container,
    ].join(' ');

    const scoreClasses = [
      sizeConfig.score,
      'text-white',
      'tabular-nums',
    ].join(' ');

    const deltaClasses = [
      sizeConfig.delta,
      'font-semibold',
      'tabular-nums',
      isPositive ? 'text-green-400' : '',
      isNegative ? 'text-red-400' : '',
    ].filter(Boolean).join(' ');

    const mountAnimation = animate
      ? {
          initial: { opacity: 0, scale: 0.9 },
          animate: { opacity: 1, scale: 1 },
          transition: { duration: 0.3 },
        }
      : {};

    return (
      <motion.div
        ref={ref}
        className={`${baseClasses} ${className}`}
        {...mountAnimation}
        {...motionProps}
      >
        {/* Main Score */}
        <motion.div
          className={scoreClasses}
          key={score}
          initial={animate && !isInitialRender.current ? { scale: 1.1, color: '#a855f7' } : undefined}
          animate={animate ? { scale: 1, color: '#ffffff' } : undefined}
          transition={{ duration: 0.3 }}
        >
          {prefix}
          {animate ? (
            <AnimatedNumber
              value={score}
              decimals={decimals}
              duration={animationDuration}
            />
          ) : (
            score.toFixed(decimals)
          )}
          {suffix}
        </motion.div>

        {/* Delta Indicator */}
        {showDelta && hasDelta && (
          <motion.div
            className={deltaClasses}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.2 }}
          >
            <span className="inline-flex items-center gap-0.5">
              {isPositive && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                >
                  +
                </motion.span>
              )}
              {delta!.toFixed(decimals)}
            </span>
          </motion.div>
        )}
      </motion.div>
    );
  }
);

ScoreDisplay.displayName = 'ScoreDisplay';

export default ScoreDisplay;
