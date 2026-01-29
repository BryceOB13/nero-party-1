import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Achievement } from '../../types';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import StarIcon from '@mui/icons-material/Star';

/**
 * Props for the AchievementReveal component.
 * **Validates: Requirements 5.4, 10.1, 10.2, 10.3**
 */
export interface AchievementRevealProps {
  /** Array of achievements to reveal with player information */
  achievements: Array<{
    achievement: Achievement;
    playerName: string;
    playerId: string;
  }>;
  /** Map of player IDs to player information */
  players: Map<string, { name: string; alias: string; color: string }>;
  /** Callback when all achievements have been revealed */
  onRevealComplete: () => void;
  /** Current player's alias for highlighting */
  currentPlayerAlias?: string | null;
}

/**
 * Rarity-based styling configuration
 */
const RARITY_STYLES: Record<Achievement['rarity'], {
  gradient: string;
  gradientBg: string;
  glow: string;
  border: string;
  badge: string;
  confettiColors: string[];
  starColor: string;
}> = {
  common: {
    gradient: 'from-gray-400 to-gray-500',
    gradientBg: 'from-gray-500/20 to-gray-600/20',
    glow: 'rgba(156, 163, 175, 0.4)',
    border: 'border-gray-400/40',
    badge: 'bg-gray-500/30 text-gray-300',
    confettiColors: ['#9ca3af', '#6b7280', '#d1d5db'],
    starColor: '#9ca3af',
  },
  uncommon: {
    gradient: 'from-green-400 to-emerald-500',
    gradientBg: 'from-green-500/20 to-emerald-600/20',
    glow: 'rgba(34, 197, 94, 0.4)',
    border: 'border-green-400/40',
    badge: 'bg-green-500/30 text-green-300',
    confettiColors: ['#22c55e', '#10b981', '#4ade80'],
    starColor: '#22c55e',
  },
  rare: {
    gradient: 'from-purple-400 to-pink-500',
    gradientBg: 'from-purple-500/20 to-pink-600/20',
    glow: 'rgba(168, 85, 247, 0.4)',
    border: 'border-purple-400/40',
    badge: 'bg-purple-500/30 text-purple-300',
    confettiColors: ['#a855f7', '#ec4899', '#c084fc'],
    starColor: '#a855f7',
  },
  legendary: {
    gradient: 'from-yellow-400 via-amber-400 to-orange-500',
    gradientBg: 'from-yellow-500/20 via-amber-500/20 to-orange-600/20',
    glow: 'rgba(234, 179, 8, 0.5)',
    border: 'border-yellow-400/50',
    badge: 'bg-yellow-500/30 text-yellow-300',
    confettiColors: ['#eab308', '#f59e0b', '#fbbf24', '#f97316'],
    starColor: '#eab308',
  },
};

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
 * Confetti burst effect for achievement reveals
 */
function ConfettiBurst({ colors, particleCount = 40 }: { colors: string[]; particleCount?: number }) {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);

  useEffect(() => {
    const newParticles: ConfettiParticle[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        x: 50 + (Math.random() - 0.5) * 80,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.3,
        duration: 1.5 + Math.random() * 1,
        rotation: Math.random() * 360,
        size: 6 + Math.random() * 8,
      });
    }
    
    setParticles(newParticles);
  }, [colors, particleCount]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
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
            y: ['50%', '-20%', '120%'],
            x: `${particle.x + (Math.random() - 0.5) * 40}%`,
            scale: [0, 1.2, 0.5],
            opacity: [0, 1, 0],
            rotate: particle.rotation + 720,
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
function SparkleRing({ color }: { color: string }) {
  return (
    <>
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 1, 0],
            scale: [0, 1.2, 0],
          }}
          transition={{ 
            duration: 1.5,
            delay: i * 0.1,
            repeat: Infinity,
            repeatDelay: 0.3,
          }}
          className="absolute"
          style={{
            top: `${50 + Math.sin(i * Math.PI / 4) * 55}%`,
            left: `${50 + Math.cos(i * Math.PI / 4) * 55}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <AutoAwesomeIcon 
            sx={{ fontSize: 14 }} 
            style={{ color }} 
          />
        </motion.div>
      ))}
    </>
  );
}

/**
 * Card flip container for dramatic reveal animation
 * **Validates: Requirement 5.2** - Card-flip mechanics for achievement reveals
 */
interface CardFlipProps {
  isFlipped: boolean;
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  className?: string;
}

function CardFlip({ isFlipped, frontContent, backContent, className = '' }: CardFlipProps) {
  return (
    <div className={`perspective-1000 ${className}`} style={{ perspective: '1000px' }}>
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.8, type: 'spring', stiffness: 80, damping: 15 }}
      >
        {/* Front of card (mystery) */}
        <div 
          className="absolute inset-0"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {frontContent}
        </div>
        {/* Back of card (revealed achievement) */}
        <div 
          className="absolute inset-0"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {backContent}
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Individual achievement reveal card
 * **Validates: Requirements 10.2, 10.3** - Display achievement details and player
 */
interface AchievementCardProps {
  achievement: Achievement;
  playerName: string;
  isActive: boolean;
  onComplete: () => void;
}

function AchievementCard({ achievement, playerName, isActive, onComplete }: AchievementCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const styles = RARITY_STYLES[achievement.rarity];

  useEffect(() => {
    if (!isActive) return;

    // Start flip animation after a short delay
    const flipTimer = setTimeout(() => {
      setIsFlipped(true);
      setShowConfetti(true);
    }, 800);

    // Stop confetti after burst
    const confettiTimer = setTimeout(() => {
      setShowConfetti(false);
    }, 2500);

    // Auto-advance after animation completes
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 5000);

    return () => {
      clearTimeout(flipTimer);
      clearTimeout(confettiTimer);
      clearTimeout(completeTimer);
    };
  }, [isActive, onComplete]);

  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Confetti Effect */}
      {showConfetti && <ConfettiBurst colors={styles.confettiColors} />}

      <CardFlip
        isFlipped={isFlipped}
        className="w-full h-[420px]"
        frontContent={
          <motion.div
            animate={isActive ? {
              boxShadow: [
                `0 0 30px ${styles.glow}`,
                `0 0 60px ${styles.glow}`,
                `0 0 30px ${styles.glow}`,
              ],
            } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={`
              w-full h-full rounded-2xl
              bg-gradient-to-br from-purple-900/80 via-indigo-900/80 to-gray-900/80
              border-2 ${styles.border}
              flex flex-col items-center justify-center
              backdrop-blur-md
            `}
          >
            {/* Mystery Icon */}
            <motion.div
              animate={isActive ? { 
                rotate: [0, 5, -5, 0], 
                scale: [1, 1.1, 1] 
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              className="relative"
            >
              <div className={`
                w-24 h-24 rounded-2xl
                bg-gradient-to-br ${styles.gradient}
                flex items-center justify-center
                shadow-lg
              `}>
                <EmojiEventsIcon sx={{ fontSize: 56 }} className="text-white" />
              </div>
              {isActive && <SparkleRing color={styles.starColor} />}
            </motion.div>

            {/* Mystery Text */}
            <motion.p
              animate={isActive ? { opacity: [0.5, 1, 0.5] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
              className={`mt-6 text-lg font-semibold bg-gradient-to-r ${styles.gradient} bg-clip-text text-transparent`}
            >
              Achievement Unlocked!
            </motion.p>
            <p className="mt-2 text-gray-400 text-sm">Revealing...</p>
          </motion.div>
        }
        backContent={
          <motion.div
            animate={{
              boxShadow: [
                `0 0 40px ${styles.glow}`,
                `0 0 80px ${styles.glow}`,
                `0 0 40px ${styles.glow}`,
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`
              w-full h-full rounded-2xl
              bg-gradient-to-br ${styles.gradientBg}
              border-2 ${styles.border}
              p-6 flex flex-col items-center justify-center text-center
              backdrop-blur-md
              overflow-hidden
            `}
          >
            {/* Background Glow */}
            <motion.div
              animate={{ opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} opacity-10 blur-2xl`}
            />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center">
              {/* Achievement Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
                className="relative"
              >
                <motion.div
                  animate={{
                    boxShadow: [
                      `0 0 20px ${styles.glow}`,
                      `0 0 40px ${styles.glow}`,
                      `0 0 20px ${styles.glow}`,
                    ],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className={`
                    w-20 h-20 rounded-2xl
                    bg-gradient-to-br ${styles.gradient}
                    flex items-center justify-center
                    text-4xl shadow-xl
                  `}
                >
                  {achievement.icon}
                </motion.div>
                <SparkleRing color={styles.starColor} />
              </motion.div>

              {/* Achievement Name */}
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className={`mt-4 text-2xl font-bold bg-gradient-to-r ${styles.gradient} bg-clip-text text-transparent`}
              >
                {achievement.name}
              </motion.h3>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-2 text-gray-300 text-sm max-w-xs"
              >
                {achievement.description}
              </motion.p>

              {/* Player Name */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-4"
              >
                <span className="text-gray-400 text-sm">Earned by</span>
                <p className="text-white font-semibold text-lg">{playerName}</p>
              </motion.div>

              {/* Bonus Points */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.7, type: 'spring', stiffness: 300 }}
                className={`
                  mt-4 px-5 py-2 rounded-full
                  bg-gradient-to-r ${styles.gradient}
                  text-white font-bold text-lg
                  shadow-lg flex items-center gap-2
                `}
              >
                <StarIcon sx={{ fontSize: 20 }} />
                <span>+{achievement.bonusPoints} pts</span>
              </motion.div>

              {/* Rarity Badge */}
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className={`
                  mt-3 px-4 py-1 rounded-full text-xs font-semibold uppercase tracking-wider
                  ${styles.badge}
                `}
              >
                {achievement.rarity}
              </motion.span>
            </div>
          </motion.div>
        }
      />
    </div>
  );
}

/**
 * Mini card for previously revealed achievements
 */
interface MiniAchievementCardProps {
  achievement: Achievement;
  playerName: string;
  isCurrentPlayer: boolean;
}

function MiniAchievementCard({ achievement, playerName, isCurrentPlayer }: MiniAchievementCardProps) {
  const styles = RARITY_STYLES[achievement.rarity];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        p-3 rounded-xl backdrop-blur-md border
        ${isCurrentPlayer 
          ? `bg-gradient-to-br ${styles.gradientBg} ${styles.border}` 
          : 'bg-white/5 border-white/10'
        }
      `}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className={`
          w-10 h-10 rounded-lg flex-shrink-0
          bg-gradient-to-br ${styles.gradient}
          flex items-center justify-center text-xl
        `}>
          {achievement.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm truncate">{achievement.name}</p>
          <p className="text-gray-400 text-xs truncate">{playerName}</p>
        </div>

        {/* Points */}
        <div className={`
          px-2 py-1 rounded-full text-xs font-bold
          bg-gradient-to-r ${styles.gradient} text-white
        `}>
          +{achievement.bonusPoints}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * AchievementReveal - Component for revealing achievements during the finale
 * 
 * Features:
 * - Card-flip reveal animation for dramatic effect
 * - Displays achievement icon, name, description, and bonus points
 * - Shows which player earned each achievement
 * - Confetti and sparkle effects based on rarity
 * - Integrates with finale sequence
 * 
 * **Validates: Requirements 5.4, 10.1, 10.2, 10.3**
 */
export function AchievementReveal({
  achievements,
  players,
  onRevealComplete,
  currentPlayerAlias,
}: AchievementRevealProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealedAchievements, setRevealedAchievements] = useState<typeof achievements>([]);

  // Handle completion of current achievement reveal
  const handleAchievementComplete = useCallback(() => {
    // Add current achievement to revealed list
    if (currentIndex < achievements.length) {
      setRevealedAchievements(prev => [...prev, achievements[currentIndex]]);
    }

    // Move to next achievement or complete
    if (currentIndex < achievements.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // All achievements revealed
      setTimeout(onRevealComplete, 1000);
    }
  }, [currentIndex, achievements, onRevealComplete]);

  // Get current achievement
  const currentAchievement = achievements[currentIndex];

  // Check if a player is the current player
  const isCurrentPlayer = (playerName: string) => {
    const player = Array.from(players.values()).find(p => p.name === playerName);
    return player?.alias === currentPlayerAlias;
  };

  // If no achievements, complete immediately
  useEffect(() => {
    if (achievements.length === 0) {
      onRevealComplete();
    }
  }, [achievements.length, onRevealComplete]);

  if (achievements.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No achievements to reveal</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
          <EmojiEventsIcon sx={{ fontSize: 36 }} className="text-yellow-400" />
          Achievement Reveals
          <EmojiEventsIcon sx={{ fontSize: 36 }} className="text-yellow-400" />
        </h2>
        <p className="text-gray-400">
          Celebrating outstanding performances!
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {currentIndex + 1} of {achievements.length}
        </p>
      </motion.div>

      {/* Progress Indicator */}
      <div className="flex justify-center gap-2">
        {achievements.map((_, index) => (
          <motion.div
            key={index}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className={`
              w-3 h-3 rounded-full transition-colors duration-300
              ${index < currentIndex 
                ? 'bg-purple-500' 
                : index === currentIndex 
                  ? 'bg-yellow-400' 
                  : 'bg-gray-600'
              }
            `}
          />
        ))}
      </div>

      {/* Current Achievement Reveal */}
      <AnimatePresence mode="wait">
        {currentAchievement && (
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <AchievementCard
              achievement={currentAchievement.achievement}
              playerName={currentAchievement.playerName}
              isActive={true}
              onComplete={handleAchievementComplete}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Previously Revealed Achievements */}
      {revealedAchievements.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <h3 className="text-lg font-semibold text-gray-400 text-center">
            Revealed Achievements
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl mx-auto">
            {revealedAchievements.map((item, index) => (
              <motion.div
                key={`${item.achievement.id}-${item.playerId}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <MiniAchievementCard
                  achievement={item.achievement}
                  playerName={item.playerName}
                  isCurrentPlayer={isCurrentPlayer(item.playerName)}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Remaining Count */}
      {currentIndex < achievements.length - 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.p
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-gray-400 text-sm"
          >
            {achievements.length - currentIndex - 1} more achievement{achievements.length - currentIndex - 1 !== 1 ? 's' : ''} to reveal...
          </motion.p>
        </motion.div>
      )}
    </div>
  );
}

export default AchievementReveal;
