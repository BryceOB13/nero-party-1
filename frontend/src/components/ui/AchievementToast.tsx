import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Achievement } from '../../types';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

/**
 * Props for the AchievementToast component.
 * **Validates: Requirement 22.6** - Achievement_Toast component for celebration animations
 */
export interface AchievementToastProps {
  /** The achievement that was unlocked */
  achievement: Achievement;
  /** Name of the player who earned the achievement */
  playerName: string;
  /** Callback when the toast should be dismissed */
  onDismiss: () => void;
  /** Duration in ms before auto-dismiss (default: 5000) */
  duration?: number;
}

/**
 * Confetti particle configuration
 */
interface ConfettiParticle {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  rotation: number;
  size: number;
}

/**
 * Rarity-based styling configuration
 */
const RARITY_STYLES: Record<Achievement['rarity'], {
  gradient: string;
  glow: string;
  border: string;
  badge: string;
  confettiColors: string[];
}> = {
  common: {
    gradient: 'from-gray-400 to-gray-500',
    glow: 'rgba(156, 163, 175, 0.4)',
    border: 'border-gray-400/40',
    badge: 'bg-gray-500/30 text-gray-300',
    confettiColors: ['#9ca3af', '#6b7280', '#d1d5db'],
  },
  uncommon: {
    gradient: 'from-green-400 to-emerald-500',
    glow: 'rgba(34, 197, 94, 0.4)',
    border: 'border-green-400/40',
    badge: 'bg-green-500/30 text-green-300',
    confettiColors: ['#22c55e', '#10b981', '#4ade80'],
  },
  rare: {
    gradient: 'from-purple-400 to-pink-500',
    glow: 'rgba(168, 85, 247, 0.4)',
    border: 'border-purple-400/40',
    badge: 'bg-purple-500/30 text-purple-300',
    confettiColors: ['#a855f7', '#ec4899', '#c084fc'],
  },
  legendary: {
    gradient: 'from-yellow-400 via-amber-400 to-orange-500',
    glow: 'rgba(234, 179, 8, 0.5)',
    border: 'border-yellow-400/50',
    badge: 'bg-yellow-500/30 text-yellow-300',
    confettiColors: ['#eab308', '#f59e0b', '#fbbf24', '#f97316'],
  },
};

/**
 * Mini confetti effect for the achievement toast
 */
function MiniConfetti({ colors, particleCount = 30 }: { colors: string[]; particleCount?: number }) {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);

  useEffect(() => {
    const newParticles: ConfettiParticle[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        x: 50 + (Math.random() - 0.5) * 100, // Center around middle
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
        duration: 1.5 + Math.random() * 1,
        rotation: Math.random() * 360,
        size: 4 + Math.random() * 6,
      });
    }
    
    setParticles(newParticles);
  }, [colors, particleCount]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{ 
            y: '50%',
            x: `${particle.x}%`,
            scale: 0,
            opacity: 1,
          }}
          animate={{ 
            y: ['50%', '-50%', '120%'],
            x: `${particle.x + (Math.random() - 0.5) * 30}%`,
            scale: [0, 1, 0.5],
            opacity: [0, 1, 0],
            rotate: particle.rotation + 360,
          }}
          transition={{ 
            duration: particle.duration,
            delay: particle.delay,
            ease: 'easeOut',
          }}
          style={{
            position: 'absolute',
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
}

/**
 * Sparkle effect around the achievement icon
 */
function SparkleEffect({ color }: { color: string }) {
  return (
    <>
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{ 
            duration: 1.2,
            delay: i * 0.15,
            repeat: Infinity,
            repeatDelay: 0.5,
          }}
          className="absolute"
          style={{
            top: `${50 + Math.sin(i * Math.PI / 3) * 45}%`,
            left: `${50 + Math.cos(i * Math.PI / 3) * 45}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <AutoAwesomeIcon 
            sx={{ fontSize: 12 }} 
            style={{ color }} 
          />
        </motion.div>
      ))}
    </>
  );
}

/**
 * AchievementToast - Celebration animation component for achievement unlocks
 * 
 * Features:
 * - Dramatic entrance animation with scale and glow effects
 * - Rarity-based styling (common, uncommon, rare, legendary)
 * - Mini confetti burst effect
 * - Sparkle animations around the achievement icon
 * - Displays achievement icon, name, description, and bonus points
 * - Auto-dismisses after animation completes
 * 
 * **Validates: Requirement 22.6** - Achievement_Toast component for celebration animations
 */
export function AchievementToast({
  achievement,
  playerName,
  onDismiss,
  duration = 5000,
}: AchievementToastProps) {
  const [showConfetti, setShowConfetti] = useState(true);
  const styles = RARITY_STYLES[achievement.rarity];

  // Auto-dismiss after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  // Stop confetti after initial burst
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.9 }}
      transition={{ 
        type: 'spring',
        stiffness: 400,
        damping: 25,
      }}
      className="relative"
    >
      {/* Confetti Effect */}
      {showConfetti && <MiniConfetti colors={styles.confettiColors} />}

      {/* Main Toast Container */}
      <motion.div
        animate={{
          boxShadow: [
            `0 0 20px ${styles.glow}`,
            `0 0 40px ${styles.glow}`,
            `0 0 20px ${styles.glow}`,
          ],
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className={`
          relative overflow-hidden
          p-5 rounded-2xl backdrop-blur-xl
          bg-gradient-to-br from-black/60 to-black/40
          border-2 ${styles.border}
          min-w-[320px] max-w-[400px]
          shadow-2xl
        `}
      >
        {/* Background Glow Effect */}
        <motion.div
          animate={{
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} opacity-20 blur-xl`}
        />

        {/* Content */}
        <div className="relative z-10">
          {/* Header with Trophy Icon */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 mb-3"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <EmojiEventsIcon 
                sx={{ fontSize: 20 }} 
                className={`bg-gradient-to-r ${styles.gradient} bg-clip-text`}
                style={{ color: styles.confettiColors[0] }}
              />
            </motion.div>
            <span className={`text-sm font-semibold uppercase tracking-wider bg-gradient-to-r ${styles.gradient} bg-clip-text text-transparent`}>
              Achievement Unlocked!
            </span>
          </motion.div>

          {/* Achievement Icon and Info */}
          <div className="flex items-start gap-4">
            {/* Icon Container with Sparkles */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: 'spring',
                stiffness: 500,
                delay: 0.3,
              }}
              className="relative flex-shrink-0"
            >
              <motion.div
                animate={{
                  boxShadow: [
                    `0 0 15px ${styles.glow}`,
                    `0 0 25px ${styles.glow}`,
                    `0 0 15px ${styles.glow}`,
                  ],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className={`
                  w-16 h-16 rounded-xl
                  bg-gradient-to-br ${styles.gradient}
                  flex items-center justify-center
                  text-3xl
                `}
              >
                {achievement.icon}
              </motion.div>
              <SparkleEffect color={styles.confettiColors[0]} />
            </motion.div>

            {/* Achievement Details */}
            <div className="flex-1 min-w-0">
              <motion.h3
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg font-bold text-white mb-1 truncate"
              >
                {achievement.name}
              </motion.h3>
              
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="text-sm text-gray-300 mb-2 line-clamp-2"
              >
                {achievement.description}
              </motion.p>

              {/* Player Name */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-xs text-gray-400"
              >
                Earned by <span className="text-white font-medium">{playerName}</span>
              </motion.p>
            </div>
          </div>

          {/* Footer with Rarity Badge and Points */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex items-center justify-between mt-4 pt-3 border-t border-white/10"
          >
            {/* Rarity Badge */}
            <span className={`
              px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide
              ${styles.badge}
            `}>
              {achievement.rarity}
            </span>

            {/* Bonus Points */}
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-full
                bg-gradient-to-r ${styles.gradient}
                text-white font-bold text-sm
                shadow-lg
              `}
            >
              <span>+{achievement.bonusPoints}</span>
              <span className="text-xs font-normal opacity-90">pts</span>
            </motion.div>
          </motion.div>
        </div>

        {/* Close Button */}
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 text-white/40 hover:text-white/80 transition-colors p-1"
          aria-label="Dismiss achievement notification"
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
      </motion.div>
    </motion.div>
  );
}

/**
 * Props for the AchievementToastContainer component.
 */
export interface AchievementToastContainerProps {
  /** Array of achievement notifications to display */
  achievements: Array<{
    id: string;
    achievement: Achievement;
    playerName: string;
  }>;
  /** Callback when an achievement toast is dismissed */
  onDismiss: (id: string) => void;
}

/**
 * AchievementToastContainer - Container for rendering multiple achievement toasts
 * 
 * Renders achievement toasts in the top-center of the screen with proper stacking
 * and animations for entering/exiting toasts.
 */
export function AchievementToastContainer({
  achievements,
  onDismiss,
}: AchievementToastContainerProps) {
  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-3"
      aria-label="Achievement notifications"
    >
      <AnimatePresence mode="popLayout">
        {achievements.map((item) => (
          <AchievementToast
            key={item.id}
            achievement={item.achievement}
            playerName={item.playerName}
            onDismiss={() => onDismiss(item.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default AchievementToast;
