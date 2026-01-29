import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { EventEffectResult, Player } from '../../types';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PersonIcon from '@mui/icons-material/Person';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

/**
 * Props for the EventEffectDisplay component.
 * **Validates: Requirement 11.4** - Show affected players and score changes with animations
 */
export interface EventEffectDisplayProps {
  /** The result of applying an event effect */
  effect: EventEffectResult;
  /** Map of player IDs to player objects for displaying names */
  players: Map<string, Player> | Player[];
  /** Optional callback when the display should be dismissed */
  onDismiss?: () => void;
  /** Duration in ms before auto-dismiss (default: 5000) */
  duration?: number;
  /** Whether to show the component in compact mode */
  compact?: boolean;
}

/**
 * Score change entry for display
 */
interface ScoreChangeEntry {
  playerId: string;
  playerName: string;
  change: number;
  isPositive: boolean;
}

/**
 * Animation variants for the container
 */
const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: { duration: 0.3 },
  },
};

/**
 * Animation variants for individual score change items
 */
const itemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
};

/**
 * Animation variants for score numbers
 */
const scoreVariants: Variants = {
  hidden: { opacity: 0, scale: 0 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 15,
      delay: 0.2,
    },
  },
};

/**
 * Sparkle effect for positive score changes
 */
function ScoreSparkle({ color }: { color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 1, 0],
        scale: [0, 1.2, 0],
        rotate: [0, 180],
      }}
      transition={{
        duration: 1,
        repeat: Infinity,
        repeatDelay: 0.5,
      }}
      className="absolute -right-1 -top-1"
    >
      <AutoAwesomeIcon sx={{ fontSize: 12 }} style={{ color }} />
    </motion.div>
  );
}

/**
 * Individual score change row component
 */
function ScoreChangeRow({
  entry,
  index,
  compact,
}: {
  entry: ScoreChangeEntry;
  index: number;
  compact?: boolean;
}) {
  const isPositive = entry.isPositive;
  const gradientClass = isPositive
    ? 'from-green-400 to-emerald-500'
    : 'from-red-400 to-rose-500';
  const glowColor = isPositive ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)';
  const bgClass = isPositive ? 'bg-green-500/20' : 'bg-red-500/20';
  const borderClass = isPositive ? 'border-green-400/30' : 'border-red-400/30';

  return (
    <motion.div
      variants={itemVariants}
      className={`
        flex items-center justify-between gap-3
        ${compact ? 'p-2' : 'p-3'}
        rounded-xl
        ${bgClass}
        border ${borderClass}
        backdrop-blur-sm
      `}
    >
      {/* Player Info */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div
          className={`
            flex items-center justify-center
            ${compact ? 'w-7 h-7' : 'w-9 h-9'}
            rounded-full
            bg-white/10
            border border-white/20
          `}
        >
          <PersonIcon sx={{ fontSize: compact ? 16 : 20 }} className="text-white/70" />
        </div>
        <span
          className={`
            ${compact ? 'text-sm' : 'text-base'}
            font-medium text-white truncate
          `}
        >
          {entry.playerName}
        </span>
      </div>

      {/* Score Change */}
      <motion.div
        variants={scoreVariants}
        className="relative flex items-center gap-1"
      >
        {isPositive && <ScoreSparkle color="#22c55e" />}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatDelay: 1,
            delay: index * 0.1,
          }}
          className={`
            flex items-center gap-1
            ${compact ? 'px-2 py-1' : 'px-3 py-1.5'}
            rounded-full
            bg-gradient-to-r ${gradientClass}
            text-white font-bold
            ${compact ? 'text-sm' : 'text-base'}
            shadow-lg
          `}
          style={{
            boxShadow: `0 0 15px ${glowColor}`,
          }}
        >
          {isPositive ? (
            <TrendingUpIcon sx={{ fontSize: compact ? 14 : 18 }} />
          ) : (
            <TrendingDownIcon sx={{ fontSize: compact ? 14 : 18 }} />
          )}
          <span>
            {isPositive ? '+' : ''}
            {entry.change.toFixed(1)}
          </span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/**
 * EventEffectDisplay - Shows affected players and score changes with animations
 *
 * Features:
 * - Displays list of affected players with their score changes
 * - Animated score modifications with positive/negative styling
 * - Glassmorphism design matching other UI components
 * - Auto-dismiss after duration
 * - Compact mode for smaller displays
 *
 * **Validates: Requirement 11.4** - Show affected players and score changes
 */
export function EventEffectDisplay({
  effect,
  players,
  onDismiss,
  duration = 5000,
  compact = false,
}: EventEffectDisplayProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Convert players to Map if array
  const playerMap: Map<string, Player> =
    players instanceof Map
      ? players
      : new Map(players.map((p) => [p.id, p]));

  // Build score change entries
  const scoreChanges: ScoreChangeEntry[] = Object.entries(effect.scoreChanges)
    .map(([playerId, change]) => {
      const player = playerMap.get(playerId);
      return {
        playerId,
        playerName: player?.name || 'Unknown Player',
        change,
        isPositive: change >= 0,
      };
    })
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change)); // Sort by magnitude

  // Get affected players who don't have score changes
  const affectedWithoutScores = effect.affectedPlayers.filter(
    (id) => !(id in effect.scoreChanges)
  );

  // Auto-dismiss after duration
  useEffect(() => {
    if (duration && onDismiss) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  // Handle exit animation complete
  const handleExitComplete = () => {
    onDismiss?.();
  };

  // Determine overall effect type for styling
  const hasPositiveChanges = scoreChanges.some((s) => s.isPositive);
  const hasNegativeChanges = scoreChanges.some((s) => !s.isPositive);
  const isMixed = hasPositiveChanges && hasNegativeChanges;

  const headerGradient = isMixed
    ? 'from-purple-400 via-pink-500 to-cyan-400'
    : hasPositiveChanges
    ? 'from-green-400 to-emerald-500'
    : 'from-red-400 to-rose-500';

  const glowColor = isMixed
    ? 'rgba(168, 85, 247, 0.3)'
    : hasPositiveChanges
    ? 'rgba(34, 197, 94, 0.3)'
    : 'rgba(239, 68, 68, 0.3)';

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {isVisible && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={`
            relative overflow-hidden
            ${compact ? 'p-3' : 'p-5'}
            rounded-2xl
            backdrop-blur-xl
            bg-gradient-to-br from-black/60 to-black/40
            border border-white/20
            shadow-2xl
            ${compact ? 'max-w-sm' : 'max-w-md'}
            w-full
          `}
          style={{
            boxShadow: `0 0 30px ${glowColor}`,
          }}
        >
          {/* Background glow effect */}
          <motion.div
            animate={{
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`absolute inset-0 bg-gradient-to-br ${headerGradient} opacity-10 blur-xl`}
          />

          {/* Content */}
          <div className="relative z-10">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`${compact ? 'mb-3' : 'mb-4'}`}
            >
              <h3
                className={`
                  ${compact ? 'text-sm' : 'text-base'}
                  font-bold uppercase tracking-wider
                  bg-gradient-to-r ${headerGradient} bg-clip-text text-transparent
                `}
              >
                ⚡ Event Effect Applied
              </h3>
              {effect.message && (
                <p
                  className={`
                    ${compact ? 'text-xs mt-1' : 'text-sm mt-2'}
                    text-gray-300
                  `}
                >
                  {effect.message}
                </p>
              )}
            </motion.div>

            {/* Score Changes List */}
            {scoreChanges.length > 0 && (
              <div className={`space-y-${compact ? '2' : '3'}`}>
                {scoreChanges.map((entry, index) => (
                  <ScoreChangeRow
                    key={entry.playerId}
                    entry={entry}
                    index={index}
                    compact={compact}
                  />
                ))}
              </div>
            )}

            {/* Affected Players without score changes */}
            {affectedWithoutScores.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className={`
                  ${scoreChanges.length > 0 ? (compact ? 'mt-3 pt-3' : 'mt-4 pt-4') : ''}
                  ${scoreChanges.length > 0 ? 'border-t border-white/10' : ''}
                `}
              >
                <p
                  className={`
                    ${compact ? 'text-xs' : 'text-sm'}
                    text-gray-400 mb-2
                  `}
                >
                  Also affected:
                </p>
                <div className="flex flex-wrap gap-2">
                  {affectedWithoutScores.map((playerId) => {
                    const player = playerMap.get(playerId);
                    return (
                      <motion.span
                        key={playerId}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`
                          ${compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}
                          rounded-full
                          bg-white/10
                          border border-white/20
                          text-gray-300
                        `}
                      >
                        {player?.name || 'Unknown'}
                      </motion.span>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Empty state */}
            {scoreChanges.length === 0 && affectedWithoutScores.length === 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`
                  ${compact ? 'text-xs' : 'text-sm'}
                  text-gray-400 text-center py-4
                `}
              >
                No players were affected by this event.
              </motion.p>
            )}
          </div>

          {/* Dismiss button */}
          {onDismiss && (
            <button
              onClick={() => setIsVisible(false)}
              className="absolute top-2 right-2 text-white/40 hover:text-white/80 transition-colors p-1"
              aria-label="Dismiss event effect display"
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
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Props for the EventEffectDisplayContainer component.
 */
export interface EventEffectDisplayContainerProps {
  /** Array of event effects to display */
  effects: Array<{
    id: string;
    effect: EventEffectResult;
  }>;
  /** Map of player IDs to player objects */
  players: Map<string, Player> | Player[];
  /** Callback when an effect display is dismissed */
  onDismiss: (id: string) => void;
  /** Position of the container */
  position?: 'top-center' | 'bottom-center' | 'top-right' | 'bottom-right';
}

/**
 * EventEffectDisplayContainer - Container for rendering multiple event effect displays
 *
 * Renders event effect displays in a stacked layout with proper positioning
 * and animations for entering/exiting displays.
 */
export function EventEffectDisplayContainer({
  effects,
  players,
  onDismiss,
  position = 'bottom-center',
}: EventEffectDisplayContainerProps) {
  const positionClasses: Record<string, string> = {
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 flex flex-col gap-3`}
      aria-label="Event effect notifications"
    >
      <AnimatePresence mode="popLayout">
        {effects.map((item) => (
          <EventEffectDisplay
            key={item.id}
            effect={item.effect}
            players={players}
            onDismiss={() => onDismiss(item.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default EventEffectDisplay;
