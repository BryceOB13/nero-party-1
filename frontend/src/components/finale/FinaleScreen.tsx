import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { socket } from '../../lib/socket';
import { LeaderboardEntry, BonusCategory, BonusResult, FinalStanding, Achievement } from '../../types';
import { ScoresFrozen } from './ScoresFrozen';
import { BonusCategoryReveal } from './BonusCategoryReveal';
import { IdentityReveal } from './IdentityReveal';
import { ChampionCrowned } from './ChampionCrowned';
import { AchievementReveal } from './AchievementReveal';
import { CompactLayout } from '../ui/CompactLayout';
import CelebrationIcon from '@mui/icons-material/Celebration';

// Finale phases
type FinalePhase = 'frozen' | 'achievements' | 'categories' | 'identities' | 'champion';

interface FinaleStartEvent {
  frozenStandings: LeaderboardEntry[];
}

interface CategoryRevealEvent {
  category: BonusCategory;
  winner: BonusResult;
}

/**
 * Vote comment data structure for displaying comments during identity reveals.
 * **Validates: Requirement 18.3** - Display vote comments during finale
 */
interface VoteComment {
  voterAlias: string;
  voterColor: string;
  rating: number;
  comment: string;
  superVote: boolean;
}

/**
 * Extended song data that includes vote comments for finale display.
 * **Validates: Requirement 18.3**
 */
interface SongWithComments {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string;
  finalScore: number | null;
  confidence: 1 | 2 | 3 | 4 | 5;
  comments?: VoteComment[];
}

interface IdentityRevealedEvent {
  alias: string;
  realName: string;
  songs: SongWithComments[];
  playerId: string;
  rank: number;
  finalScore: number;
}

interface ChampionEvent {
  champion: FinalStanding;
}

// Achievement types for the competitive edition
interface PlayerAchievementData {
  achievement: Achievement;
  playerName: string;
  playerId: string;
}

interface AchievementRevealEvent {
  achievement: Achievement;
  playerName: string;
  playerId: string;
  bonusPoints: number;
}

// Event for starting achievement reveal sequence
interface AchievementRevealStartEvent {
  achievements: AchievementRevealEvent[];
}

// Score breakdown for displaying achievement bonuses
// (Used for type checking in the component)

// Rarity color mappings for achievement overlays
const rarityColors: Record<Achievement['rarity'], string> = {
  common: 'from-gray-500 to-gray-400',
  uncommon: 'from-green-500 to-emerald-400',
  rare: 'from-blue-500 to-cyan-400',
  legendary: 'from-yellow-500 to-amber-400',
};

const rarityGlow: Record<Achievement['rarity'], string> = {
  common: 'rgba(156, 163, 175, 0.5)',
  uncommon: 'rgba(34, 197, 94, 0.5)',
  rare: 'rgba(59, 130, 246, 0.5)',
  legendary: 'rgba(234, 179, 8, 0.6)',
};

/**
 * Card-flip container component for dramatic reveals
 * Implements card-flip mechanics per Requirement 5.2
 */
interface CardFlipContainerProps {
  isFlipped: boolean;
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  className?: string;
}

function CardFlipContainer({ isFlipped, frontContent, backContent, className = '' }: CardFlipContainerProps) {
  return (
    <div className={`perspective-1000 ${className}`}>
      <motion.div
        className="relative w-full h-full preserve-3d"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.8, type: 'spring', stiffness: 100 }}
      >
        {/* Front of card */}
        <div className="absolute inset-0 backface-hidden">
          {frontContent}
        </div>
        {/* Back of card (revealed content) */}
        <div 
          className="absolute inset-0 backface-hidden"
          style={{ transform: 'rotateY(180deg)' }}
        >
          {backContent}
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Achievement overlay props
 * Implements overlay system per Requirement 5.1, 5.4
 */
interface AchievementOverlayProps {
  achievement: PlayerAchievementData | null;
  onComplete: () => void;
}

/**
 * Achievement reveal overlay component
 * Implements overlay system per Requirement 5.1, 5.4
 */
function AchievementOverlay({ achievement, onComplete }: AchievementOverlayProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (achievement) {
      // Start flip animation after a short delay
      const flipTimer = setTimeout(() => setIsFlipped(true), 500);
      // Auto-dismiss after animation completes
      const dismissTimer = setTimeout(onComplete, 4000);
      
      return () => {
        clearTimeout(flipTimer);
        clearTimeout(dismissTimer);
      };
    }
  }, [achievement, onComplete]);

  if (!achievement) return null;

  const rarity = achievement.achievement.rarity;
  const rarityColor = rarityColors[rarity];
  const rarityGlowColor = rarityGlow[rarity];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <CardFlipContainer
        isFlipped={isFlipped}
        className="w-80 h-96"
        frontContent={
          <motion.div
            animate={{
              boxShadow: [
                `0 0 20px ${rarityGlowColor}`,
                `0 0 40px ${rarityGlowColor}`,
                `0 0 20px ${rarityGlowColor}`,
              ],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-full h-full rounded-2xl bg-gradient-to-br from-purple-900/80 to-gray-900/80 border-2 border-purple-500/50 flex items-center justify-center"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-6xl"
            >
              🏆
            </motion.div>
            <p className="absolute bottom-8 text-purple-300 text-sm">Achievement Unlocked!</p>
          </motion.div>
        }
        backContent={
          <motion.div
            animate={{
              boxShadow: [
                `0 0 30px ${rarityGlowColor}`,
                `0 0 60px ${rarityGlowColor}`,
                `0 0 30px ${rarityGlowColor}`,
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`w-full h-full rounded-2xl bg-gradient-to-br ${rarityColor}/20 border-2 border-white/30 p-6 flex flex-col items-center justify-center text-center`}
          >
            <span className="text-5xl mb-4">{achievement.achievement.icon}</span>
            <h3 className={`text-2xl font-bold bg-gradient-to-r ${rarityColor} bg-clip-text text-transparent mb-2`}>
              {achievement.achievement.name}
            </h3>
            <p className="text-gray-300 text-sm mb-4">{achievement.achievement.description}</p>
            <div className="text-white font-semibold mb-2">
              Earned by: <span className="text-purple-300">{achievement.playerName}</span>
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
              className={`px-4 py-2 rounded-full bg-gradient-to-r ${rarityColor} text-white font-bold`}
            >
              +{achievement.achievement.bonusPoints} points
            </motion.div>
            <span className="mt-3 text-xs uppercase tracking-wider text-gray-400">
              {achievement.achievement.rarity}
            </span>
          </motion.div>
        }
      />
    </motion.div>
  );
}

/**
 * FinaleScreen - Refactored for full viewport with card-flip mechanics
 * 
 * Requirements:
 * - 5.1: Full viewport for dramatic reveals
 * - 5.2: Card-flip mechanics for identity and achievement reveals
 * - 5.3: Fit entirely within 100vh without body scroll
 * - 5.4: Animate achievements one-by-one with celebration effects
 */
export function FinaleScreen() {
  const { 
    myIdentity,
    setLeaderboard,
    setBonusResults,
    setFinalStandings,
  } = useGameStore();

  const [phase, setPhase] = useState<FinalePhase>('frozen');
  const [frozenStandings, setFrozenStandings] = useState<LeaderboardEntry[]>([]);
  const [currentCategory, setCurrentCategory] = useState<{ category: BonusCategory; winner: BonusResult } | null>(null);
  const [revealedCategories, setRevealedCategories] = useState<{ category: BonusCategory; winner: BonusResult }[]>([]);
  const [currentReveal, setCurrentReveal] = useState<IdentityRevealedEvent | null>(null);
  const [revealedIdentities, setRevealedIdentities] = useState<IdentityRevealedEvent[]>([]);
  const [champion, setChampion] = useState<FinalStanding | null>(null);
  const [updatedStandings, setUpdatedStandings] = useState<LeaderboardEntry[]>([]);
  
  // Achievement state for the dedicated achievement reveal phase
  const [achievementsToReveal, setAchievementsToReveal] = useState<PlayerAchievementData[]>([]);
  const [achievementBonuses, setAchievementBonuses] = useState<Map<string, { bonus: number; count: number }>>(new Map());
  
  // Achievement overlay state (for individual reveals during other phases)
  const [, setAchievementQueue] = useState<PlayerAchievementData[]>([]);
  const [currentAchievement, setCurrentAchievement] = useState<PlayerAchievementData | null>(null);
  
  // Player map for achievement reveal component
  const [playerMap, setPlayerMap] = useState<Map<string, { name: string; alias: string; color: string }>>(new Map());

  // Handle achievement reveal completion (for overlay during other phases)
  const handleAchievementComplete = useCallback(() => {
    setCurrentAchievement(null);
    // Process next achievement in queue
    setAchievementQueue(prev => {
      if (prev.length > 0) {
        const [next, ...rest] = prev;
        setTimeout(() => setCurrentAchievement(next), 500);
        return rest;
      }
      return prev;
    });
  }, []);

  // Handle completion of the achievement reveal phase
  const handleAchievementPhaseComplete = useCallback(() => {
    // Transition to categories phase after achievements are revealed
    setPhase('categories');
  }, []);

  // Socket event handlers
  useEffect(() => {
    const handleFinaleStart = (data: FinaleStartEvent) => {
      setFrozenStandings(data.frozenStandings);
      setUpdatedStandings(data.frozenStandings);
      setLeaderboard(data.frozenStandings);
      setPhase('frozen');
      
      // Build player map from standings for achievement reveal
      const newPlayerMap = new Map<string, { name: string; alias: string; color: string }>();
      data.frozenStandings.forEach(entry => {
        newPlayerMap.set(entry.alias, {
          name: entry.revealedName || entry.alias,
          alias: entry.alias,
          color: entry.color,
        });
      });
      setPlayerMap(newPlayerMap);
      
      // Auto-transition to achievements phase after 5 seconds
      // If no achievements, will skip to categories
      setTimeout(() => {
        setPhase('achievements');
      }, 5000);
    };

    // Handler for starting the achievement reveal sequence
    const handleAchievementRevealStart = (data: AchievementRevealStartEvent) => {
      const achievements: PlayerAchievementData[] = data.achievements.map(a => ({
        achievement: a.achievement,
        playerName: a.playerName,
        playerId: a.playerId,
      }));
      setAchievementsToReveal(achievements);
      
      // Pre-calculate total achievement bonuses per player
      const bonusMap = new Map<string, { bonus: number; count: number }>();
      data.achievements.forEach(a => {
        const existing = bonusMap.get(a.playerName) || { bonus: 0, count: 0 };
        bonusMap.set(a.playerName, {
          bonus: existing.bonus + a.bonusPoints,
          count: existing.count + 1,
        });
      });
      setAchievementBonuses(bonusMap);
      
      // Transition to achievements phase
      setPhase('achievements');
    };

    const handleCategoryReveal = (data: CategoryRevealEvent) => {
      setPhase('categories');
      setCurrentCategory(data);
      setRevealedCategories(prev => [...prev, data]);
      
      // Update standings with bonus points
      setUpdatedStandings(prev => {
        return prev.map(entry => {
          // Find if this player won the bonus
          if (entry.alias === data.winner.winnerPlayerId) {
            return {
              ...entry,
              score: entry.score + data.winner.points,
              previousScore: entry.score,
            };
          }
          return entry;
        });
      });
    };

    const handleIdentityRevealed = (data: IdentityRevealedEvent) => {
      setPhase('identities');
      setCurrentReveal(data);
      setRevealedIdentities(prev => [...prev, data]);
      
      // Update standings to show revealed identity
      setUpdatedStandings(prev => {
        return prev.map(entry => {
          if (entry.alias === data.alias) {
            return {
              ...entry,
              isRevealed: true,
              revealedName: data.realName,
            };
          }
          return entry;
        });
      });
    };

    const handleChampion = (data: ChampionEvent) => {
      setPhase('champion');
      setChampion(data.champion);
      setFinalStandings([data.champion]);
    };

    // Achievement reveal handler for individual achievements during the reveal phase
    const handleAchievementReveal = (data: AchievementRevealEvent) => {
      const playerAchievement: PlayerAchievementData = {
        achievement: data.achievement,
        playerName: data.playerName,
        playerId: data.playerId,
      };
      
      // If we're in the achievements phase, add to the reveal list
      // Otherwise, show as overlay
      if (phase === 'achievements') {
        setAchievementsToReveal(prev => [...prev, playerAchievement]);
      } else {
        // Queue achievement for overlay display
        if (!currentAchievement) {
          setCurrentAchievement(playerAchievement);
        } else {
          setAchievementQueue(prev => [...prev, playerAchievement]);
        }
      }
      
      // Update achievement bonuses tracking
      setAchievementBonuses(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(data.playerName) || { bonus: 0, count: 0 };
        newMap.set(data.playerName, {
          bonus: existing.bonus + data.bonusPoints,
          count: existing.count + 1,
        });
        return newMap;
      });
      
      // Update standings with achievement bonus
      setUpdatedStandings(prev => {
        return prev.map(entry => {
          // Match by alias (which corresponds to the player's display name in standings)
          if (entry.alias === data.playerName || entry.revealedName === data.playerName) {
            return {
              ...entry,
              score: entry.score + data.bonusPoints,
              previousScore: entry.score,
            };
          }
          return entry;
        });
      });
    };

    socket.on('finale:start', handleFinaleStart);
    socket.on('finale:achievement_reveal_start', handleAchievementRevealStart);
    socket.on('finale:category_reveal', handleCategoryReveal);
    socket.on('finale:identity_revealed', handleIdentityRevealed);
    socket.on('finale:champion', handleChampion);
    socket.on('achievement:reveal', handleAchievementReveal);

    return () => {
      socket.off('finale:start', handleFinaleStart);
      socket.off('finale:achievement_reveal_start', handleAchievementRevealStart);
      socket.off('finale:category_reveal', handleCategoryReveal);
      socket.off('finale:identity_revealed', handleIdentityRevealed);
      socket.off('finale:champion', handleChampion);
      socket.off('achievement:reveal', handleAchievementReveal);
    };
  }, [setLeaderboard, setBonusResults, setFinalStandings, currentAchievement, phase]);

  // Header component for CompactLayout
  const header = (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-3 sm:py-4"
    >
      <motion.h1
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{ duration: 5, repeat: Infinity }}
        className="text-2xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 via-cyan-400 to-purple-400 bg-[length:200%_auto] bg-clip-text text-transparent flex items-center justify-center gap-2 sm:gap-3"
      >
        <CelebrationIcon sx={{ fontSize: { xs: 28, sm: 36, md: 40 } }} className="text-purple-400" />
        The Finale
        <CelebrationIcon sx={{ fontSize: { xs: 28, sm: 36, md: 40 } }} className="text-purple-400" />
      </motion.h1>
    </motion.div>
  );

  // Achievement overlay for the overlay prop
  const achievementOverlay = currentAchievement ? (
    <AchievementOverlay
      achievement={currentAchievement}
      onComplete={handleAchievementComplete}
    />
  ) : undefined;

  return (
    <CompactLayout
      header={header}
      overlay={achievementOverlay}
      background="gradient"
      withOrbs={true}
      contentClassName="finale-content"
    >
      {/* Main content area - fills remaining space within 100vh */}
      <div className="flex-fill min-h-0 flex flex-col overflow-hidden">
        {/* Phase Content with internal scrolling */}
        <div className="flex-fill min-h-0 scroll-container scrollbar-thin px-2 sm:px-4">
          <div className="max-w-6xl mx-auto py-2 sm:py-4">
            <AnimatePresence mode="wait">
              {phase === 'frozen' && (
                <motion.div
                  key="frozen"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5 }}
                >
                  <ScoresFrozen 
                    standings={frozenStandings} 
                    currentPlayerAlias={myIdentity?.alias ?? null}
                  />
                </motion.div>
              )}

              {phase === 'achievements' && (
                <motion.div
                  key="achievements"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5 }}
                >
                  {achievementsToReveal.length > 0 ? (
                    <AchievementReveal
                      achievements={achievementsToReveal}
                      players={playerMap}
                      onRevealComplete={handleAchievementPhaseComplete}
                      currentPlayerAlias={myIdentity?.alias ?? null}
                    />
                  ) : (
                    // No achievements to reveal, show brief message and auto-transition
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onAnimationComplete={() => {
                        // Auto-transition to categories after brief delay
                        setTimeout(handleAchievementPhaseComplete, 2000);
                      }}
                      className="text-center py-12"
                    >
                      <p className="text-gray-400 text-lg">No achievements unlocked this game</p>
                      <p className="text-gray-500 text-sm mt-2">Moving to bonus categories...</p>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {phase === 'categories' && (
                <motion.div
                  key="categories"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5 }}
                >
                  <BonusCategoryReveal
                    currentCategory={currentCategory}
                    revealedCategories={revealedCategories}
                    standings={updatedStandings}
                    currentPlayerAlias={myIdentity?.alias ?? null}
                    achievementBonuses={achievementBonuses}
                  />
                </motion.div>
              )}

              {phase === 'identities' && (
                <motion.div
                  key="identities"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5 }}
                >
                  <IdentityReveal
                    currentReveal={currentReveal}
                    revealedIdentities={revealedIdentities}
                    standings={updatedStandings}
                    currentPlayerAlias={myIdentity?.alias ?? null}
                    achievementBonuses={achievementBonuses}
                  />
                </motion.div>
              )}

              {phase === 'champion' && champion && (
                <motion.div
                  key="champion"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5 }}
                >
                  <ChampionCrowned 
                    champion={champion} 
                    achievementBonuses={achievementBonuses}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </CompactLayout>
  );
}
