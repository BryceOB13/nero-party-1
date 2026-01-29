import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BonusCategory, BonusResult, LeaderboardEntry } from '../../types';
import StarIcon from '@mui/icons-material/Star';
import TheaterComedyIcon from '@mui/icons-material/TheaterComedy';
import DiamondIcon from '@mui/icons-material/Diamond';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

interface BonusCategoryRevealProps {
  currentCategory: { category: BonusCategory; winner: BonusResult } | null;
  revealedCategories: { category: BonusCategory; winner: BonusResult }[];
  standings: LeaderboardEntry[];
  currentPlayerAlias: string | null;
  /** Achievement bonuses per player (keyed by player name/alias) */
  achievementBonuses?: Map<string, { bonus: number; count: number }>;
}

// Category icons mapping
const getCategoryIcon = (categoryId: string) => {
  const iconMap: Record<string, JSX.Element> = {
    'crowd-favorite': <StarIcon sx={{ fontSize: 32 }} />,
    'cult-classic': <TheaterComedyIcon sx={{ fontSize: 32 }} />,
    'hidden-gem': <DiamondIcon sx={{ fontSize: 32 }} />,
    'bold-move': <GpsFixedIcon sx={{ fontSize: 32 }} />,
    'default': <EmojiEventsIcon sx={{ fontSize: 32 }} />,
  };
  return iconMap[categoryId] || iconMap['default'];
};

// Category colors
const CATEGORY_COLORS: Record<string, { from: string; to: string; glow: string }> = {
  'crowd-favorite': { from: 'from-yellow-500', to: 'to-amber-500', glow: 'rgba(234, 179, 8, 0.5)' },
  'cult-classic': { from: 'from-purple-500', to: 'to-pink-500', glow: 'rgba(168, 85, 247, 0.5)' },
  'hidden-gem': { from: 'from-cyan-500', to: 'to-blue-500', glow: 'rgba(6, 182, 212, 0.5)' },
  'bold-move': { from: 'from-red-500', to: 'to-orange-500', glow: 'rgba(239, 68, 68, 0.5)' },
  'default': { from: 'from-gray-500', to: 'to-gray-400', glow: 'rgba(156, 163, 175, 0.5)' },
};

// Category icons (emoji) for mini cards
const CATEGORY_ICONS: Record<string, string> = {
  'crowd-favorite': '⭐',
  'cult-classic': '🎭',
  'hidden-gem': '💎',
  'bold-move': '🎯',
  'default': '🏆',
};

interface CategoryCardProps {
  category: BonusCategory;
  winner: BonusResult;
  isRevealing: boolean;
  isRevealed: boolean;
}

function CategoryCard({ category, winner, isRevealing, isRevealed }: CategoryCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const icon = getCategoryIcon(category.id);
  const colors = CATEGORY_COLORS[category.id] || CATEGORY_COLORS['default'];

  useEffect(() => {
    if (isRevealing) {
      // Start flip animation after a short delay
      const timer = setTimeout(() => {
        setIsFlipped(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isRevealing]);

  return (
    <motion.div
      initial={{ opacity: 0, rotateY: 180, scale: 0.8 }}
      animate={{ 
        opacity: 1, 
        rotateY: isFlipped || isRevealed ? 0 : 180,
        scale: isRevealing ? 1.05 : 1,
      }}
      transition={{ 
        duration: 0.8,
        type: 'spring',
        stiffness: 100,
      }}
      style={{ perspective: 1000 }}
      className="relative"
    >
      {/* Card Container */}
      <motion.div
        animate={isRevealing ? {
          boxShadow: [
            `0 0 20px ${colors.glow}`,
            `0 0 40px ${colors.glow}`,
            `0 0 20px ${colors.glow}`,
          ],
        } : {}}
        transition={{ duration: 1.5, repeat: isRevealing ? Infinity : 0 }}
        className={`
          p-6 rounded-2xl backdrop-blur-md border-2
          ${isFlipped || isRevealed 
            ? `bg-gradient-to-br ${colors.from}/20 ${colors.to}/20 border-white/30` 
            : 'bg-white/5 border-white/10'
          }
        `}
      >
        {/* Front of card (revealed) */}
        <AnimatePresence>
          {(isFlipped || isRevealed) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="space-y-4"
            >
              {/* Category Header */}
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ 
                    delay: 0.5,
                    type: 'spring',
                    stiffness: 500,
                  }}
                  className="text-5xl mb-2"
                >
                  {icon}
                </motion.div>
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className={`text-xl font-bold bg-gradient-to-r ${colors.from} ${colors.to} bg-clip-text text-transparent`}
                >
                  {category.name}
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="text-gray-400 text-sm mt-1"
                >
                  {category.description}
                </motion.p>
              </div>

              {/* Winner Display */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="text-center">
                  <span className="text-gray-400 text-sm">Winner</span>
                  <div className="text-lg font-semibold text-white mt-1">
                    {winner.categoryName}
                  </div>
                </div>
              </motion.div>

              {/* Points Badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  delay: 1.0,
                  type: 'spring',
                  stiffness: 500,
                }}
                className="text-center"
              >
                <span className={`
                  inline-flex items-center gap-2 px-4 py-2 rounded-full
                  bg-gradient-to-r ${colors.from} ${colors.to}
                  text-white font-bold shadow-lg
                `}>
                  <span>+{winner.points}</span>
                  <span>points</span>
                </span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Back of card (hidden) */}
        {!isFlipped && !isRevealed && (
          <div className="text-center py-8">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-5xl mb-4"
            >
              🎁
            </motion.div>
            <p className="text-gray-400">Bonus Category</p>
            <p className="text-gray-500 text-sm">Tap to reveal</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export function BonusCategoryReveal({ 
  currentCategory, 
  revealedCategories, 
  standings,
  currentPlayerAlias,
  achievementBonuses,
}: BonusCategoryRevealProps) {
  const [showScoreUpdate, setShowScoreUpdate] = useState(false);

  useEffect(() => {
    if (currentCategory) {
      // Show score update animation after card flip
      const timer = setTimeout(() => {
        setShowScoreUpdate(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentCategory]);

  // Sort standings by rank
  const sortedStandings = [...standings].sort((a, b) => a.rank - b.rank);

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
          <EmojiEventsIcon className="text-yellow-400" /> Bonus Categories <EmojiEventsIcon className="text-yellow-400" />
        </h2>
        <p className="text-gray-400">
          Special awards for outstanding performances
        </p>
      </motion.div>

      {/* Current Category Reveal */}
      {currentCategory && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md mx-auto"
        >
          <CategoryCard
            category={currentCategory.category}
            winner={currentCategory.winner}
            isRevealing={true}
            isRevealed={false}
          />
        </motion.div>
      )}

      {/* Score Update Animation */}
      <AnimatePresence>
        {showScoreUpdate && currentCategory && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center"
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.8, 1],
              }}
              transition={{ duration: 0.5, repeat: 3 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-500/20 border border-green-500/30"
            >
              <span className="text-green-400 text-xl">📈</span>
              <span className="text-green-400 font-bold">
                Score Updated: +{currentCategory.winner.points} points!
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Previously Revealed Categories */}
      {revealedCategories.length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <h3 className="text-lg font-semibold text-gray-400 text-center">
            Previously Revealed
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {revealedCategories.slice(0, -1).map((item, idx) => {
              const icon = CATEGORY_ICONS[item.category.id] || CATEGORY_ICONS['default'];
              const colors = CATEGORY_COLORS[item.category.id] || CATEGORY_COLORS['default'];
              
              return (
                <motion.div
                  key={item.category.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`
                    p-4 rounded-xl backdrop-blur-md border
                    bg-gradient-to-br ${colors.from}/10 ${colors.to}/10 border-white/10
                  `}
                >
                  <div className="text-center">
                    <span className="text-2xl">{icon}</span>
                    <p className={`text-sm font-semibold bg-gradient-to-r ${colors.from} ${colors.to} bg-clip-text text-transparent mt-1`}>
                      {item.category.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      +{item.winner.points} pts
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Updated Standings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10"
      >
        <h3 className="text-lg font-semibold text-white mb-4 text-center">
          Updated Standings
        </h3>
        
        <div className="space-y-2">
          {sortedStandings.slice(0, 5).map((entry) => {
            const isCurrentPlayer = entry.alias === currentPlayerAlias;
            const hasScoreChange = entry.previousScore !== null && entry.previousScore !== entry.score;
            const playerAchievements = achievementBonuses?.get(entry.alias) || achievementBonuses?.get(entry.revealedName ?? '');
            
            return (
              <motion.div
                key={entry.alias}
                layout
                className={`
                  flex items-center gap-3 p-3 rounded-xl
                  ${isCurrentPlayer 
                    ? 'bg-purple-500/20 border border-purple-500/30' 
                    : 'bg-white/5 border border-white/5'
                  }
                `}
              >
                <span className="w-8 text-center font-bold text-gray-400">
                  #{entry.rank}
                </span>
                <div className="flex-1">
                  <span className={`font-medium ${isCurrentPlayer ? 'text-purple-300' : 'text-white'}`}>
                    {entry.alias}
                  </span>
                  {/* Achievement bonus indicator */}
                  {playerAchievements && playerAchievements.bonus > 0 && (
                    <div className="flex items-center gap-1 text-xs mt-0.5">
                      <span className="text-yellow-400">🏆</span>
                      <span className="text-yellow-400">+{playerAchievements.bonus}</span>
                      <span className="text-gray-500">({playerAchievements.count} achievement{playerAchievements.count !== 1 ? 's' : ''})</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <motion.span
                    key={entry.score}
                    initial={hasScoreChange ? { scale: 1.3, color: '#22c55e' } : {}}
                    animate={{ scale: 1, color: '#ffffff' }}
                    className="font-bold"
                  >
                    {entry.score.toFixed(1)}
                  </motion.span>
                  {hasScoreChange && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-green-400 text-sm ml-2"
                    >
                      +{(entry.score - (entry.previousScore ?? 0)).toFixed(1)}
                    </motion.span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
