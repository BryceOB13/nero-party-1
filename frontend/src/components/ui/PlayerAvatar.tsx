import { forwardRef } from 'react';
import { motion, HTMLMotionProps, Variants } from 'framer-motion';

export type PlayerAvatarSize = 'sm' | 'md' | 'lg';

export interface PlayerAvatarProps
  extends Omit<HTMLMotionProps<'div'>, 'children'> {
  /** The silhouette emoji or icon to display */
  silhouette: string;
  /** The player's assigned color (hex or CSS color) */
  color: string;
  /** Whether the player's identity has been revealed */
  isRevealed?: boolean;
  /** The real avatar URL (shown when revealed) */
  avatarUrl?: string | null;
  /** The player's real name (shown when revealed) */
  realName?: string;
  /** The player's rank (1st, 2nd, 3rd, etc.) */
  rank?: number;
  /** Size variant */
  size?: PlayerAvatarSize;
  /** Whether to show the animated glow effect */
  showGlow?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to animate on mount */
  animate?: boolean;
}

const sizeClasses: Record<PlayerAvatarSize, { container: string; silhouette: string; badge: string }> = {
  sm: {
    container: 'w-10 h-10',
    silhouette: 'text-xl',
    badge: 'w-4 h-4 text-[10px] -top-1 -right-1',
  },
  md: {
    container: 'w-14 h-14',
    silhouette: 'text-2xl',
    badge: 'w-5 h-5 text-xs -top-1 -right-1',
  },
  lg: {
    container: 'w-20 h-20',
    silhouette: 'text-4xl',
    badge: 'w-6 h-6 text-sm -top-1 -right-1',
  },
};

const rankBadgeColors: Record<number, string> = {
  1: 'bg-gradient-to-br from-yellow-400 to-amber-500 text-yellow-900', // Gold
  2: 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700', // Silver
  3: 'bg-gradient-to-br from-amber-600 to-amber-700 text-amber-100', // Bronze
};

const defaultBadgeColor = 'bg-gradient-to-br from-purple-500 to-purple-600 text-white';

const glowAnimation: Variants = {
  initial: {
    boxShadow: '0 0 0px rgba(0, 0, 0, 0)',
  },
  animate: {
    boxShadow: [
      '0 0 10px rgba(var(--glow-color), 0.3)',
      '0 0 20px rgba(var(--glow-color), 0.5)',
      '0 0 10px rgba(var(--glow-color), 0.3)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

const revealAnimation: Variants = {
  hidden: {
    scale: 0.8,
    opacity: 0,
    rotateY: 180,
  },
  visible: {
    scale: 1,
    opacity: 1,
    rotateY: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

/**
 * Converts a hex color to RGB values for CSS custom properties
 */
function hexToRgb(hex: string): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  
  // Handle shorthand hex (e.g., #fff)
  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map(c => c + c).join('')
    : cleanHex;
  
  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);
  
  // Return as comma-separated RGB values
  return `${r}, ${g}, ${b}`;
}

/**
 * PlayerAvatar - Displays a player's anonymous silhouette or revealed avatar
 * 
 * Features:
 * - Silhouette display with customizable color
 * - Revealed state showing real avatar/name
 * - Rank badge (1st, 2nd, 3rd with special colors)
 * - Animated glow effect using player's color
 * - Multiple sizes (sm, md, lg)
 * - Framer Motion animations
 */
export const PlayerAvatar = forwardRef<HTMLDivElement, PlayerAvatarProps>(
  (
    {
      silhouette,
      color,
      isRevealed = false,
      avatarUrl,
      realName,
      rank,
      size = 'md',
      showGlow = false,
      className = '',
      animate = true,
      ...motionProps
    },
    ref
  ) => {
    const sizeConfig = sizeClasses[size];
    const badgeColor = rank && rank <= 3 ? rankBadgeColors[rank] : defaultBadgeColor;
    
    // Convert color to RGB for glow effect
    const glowRgb = color.startsWith('#') ? hexToRgb(color) : '168, 85, 247'; // Default purple
    
    const baseClasses = [
      'relative',
      'rounded-full',
      'flex items-center justify-center',
      'overflow-hidden',
      sizeConfig.container,
    ].join(' ');

    const mountAnimation = animate
      ? {
          initial: { opacity: 0, scale: 0.8 },
          animate: { opacity: 1, scale: 1 },
          transition: { duration: 0.3 },
        }
      : {};

    return (
      <motion.div
        ref={ref}
        className={`${baseClasses} ${className}`}
        style={{
          '--glow-color': glowRgb,
          backgroundColor: isRevealed ? 'transparent' : `${color}20`,
          borderColor: color,
          borderWidth: '2px',
          borderStyle: 'solid',
        } as React.CSSProperties}
        {...mountAnimation}
        {...(showGlow && !isRevealed
          ? {
              animate: {
                boxShadow: [
                  `0 0 10px ${color}4D`,
                  `0 0 20px ${color}80`,
                  `0 0 10px ${color}4D`,
                ],
              },
              transition: {
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              },
            }
          : {})}
        {...motionProps}
      >
        {/* Silhouette (shown when not revealed) */}
        {!isRevealed && (
          <motion.span
            className={`${sizeConfig.silhouette} select-none`}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
            initial={animate ? { scale: 0 } : undefined}
            animate={animate ? { scale: 1 } : undefined}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          >
            {silhouette}
          </motion.span>
        )}

        {/* Real Avatar (shown when revealed) */}
        {isRevealed && (
          <motion.div
            className="w-full h-full flex items-center justify-center"
            variants={revealAnimation}
            initial="hidden"
            animate="visible"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={realName || 'Player avatar'}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center rounded-full text-white font-bold"
                style={{ backgroundColor: color }}
              >
                <span className={sizeConfig.silhouette}>
                  {realName ? realName.charAt(0).toUpperCase() : '?'}
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* Rank Badge */}
        {rank !== undefined && (
          <motion.div
            className={`absolute ${sizeConfig.badge} ${badgeColor} rounded-full flex items-center justify-center font-bold shadow-lg`}
            initial={animate ? { scale: 0, opacity: 0 } : undefined}
            animate={animate ? { scale: 1, opacity: 1 } : undefined}
            transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
          >
            {rank}
          </motion.div>
        )}
      </motion.div>
    );
  }
);

PlayerAvatar.displayName = 'PlayerAvatar';

export default PlayerAvatar;
