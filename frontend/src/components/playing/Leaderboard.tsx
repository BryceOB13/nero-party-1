import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LeaderboardEntry, ActiveEvent, MINI_EVENTS } from '../../types';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PersonIcon from '@mui/icons-material/Person';
import MasksIcon from '@mui/icons-material/Masks';
import PetsIcon from '@mui/icons-material/Pets';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ShieldIcon from '@mui/icons-material/Shield';
import CasinoIcon from '@mui/icons-material/Casino';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';
import StarIcon from '@mui/icons-material/Star';
import BarChartIcon from '@mui/icons-material/BarChart';
import DarkModeIcon from '@mui/icons-material/DarkMode';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentPlayerAlias: string | null;
  showScores?: boolean;
  /** Compact mode for sidebar display */
  compact?: boolean;
  /** List of active events affecting the leaderboard */
  activeEvents?: ActiveEvent[];
  /** Whether Score Blackout is active (hides all scores) */
  isBlackout?: boolean;
}

/**
 * Get event modifier badges for a player based on active events.
 * Returns an array of badge objects with label and tooltip.
 */
const getEventModifierBadges = (
  playerAlias: string,
  activeEvents: ActiveEvent[]
): { label: string; tooltip: string; color: string }[] => {
  const badges: { label: string; tooltip: string; color: string }[] = [];

  for (const activeEvent of activeEvents) {
    // Skip resolved events
    if (activeEvent.resolved) continue;

    // Find the event definition
    const eventDef = MINI_EVENTS.find(e => e.id === activeEvent.eventId);
    if (!eventDef) continue;

    // Check if this player is affected
    const isAffected = activeEvent.affectedPlayers.includes(playerAlias);
    if (!isAffected) continue;

    // Add badge based on event type
    switch (eventDef.id) {
      case 'golden-record':
        badges.push({ label: '2x', tooltip: 'Golden Record: 2x points', color: 'bg-yellow-500' });
        break;
      case 'underdog-bonus':
        badges.push({ label: '1.5x', tooltip: 'Underdog Bonus: 1.5x points', color: 'bg-blue-500' });
        break;
      case 'immunity-idol':
        badges.push({ label: 'IMM', tooltip: 'Immunity: Protected from point loss', color: 'bg-green-500' });
        break;
      case 'double-or-nothing':
        badges.push({ label: 'D/N', tooltip: 'Double or Nothing active', color: 'bg-purple-500' });
        break;
      default:
        // For other events, show the event name abbreviated
        if (eventDef.name) {
          badges.push({ label: eventDef.name.substring(0, 3).toUpperCase(), tooltip: eventDef.name, color: 'bg-gray-500' });
        }
    }
  }

  return badges;
};

// Get rank badge styling - returns icon component and color
const getRankBadge = (rank: number): { icon: 'gold' | 'silver' | 'bronze' | 'number'; color: string } => {
  switch (rank) {
    case 1:
      return { icon: 'gold', color: 'from-yellow-500 to-amber-500' };
    case 2:
      return { icon: 'silver', color: 'from-gray-400 to-gray-300' };
    case 3:
      return { icon: 'bronze', color: 'from-orange-600 to-orange-500' };
    default:
      return { icon: 'number', color: 'from-gray-600 to-gray-500' };
  }
};

// Get movement indicator
const getMovementIndicator = (movement: LeaderboardEntry['movement']): { type: 'up' | 'down' | 'new' | 'same'; color: string } => {
  switch (movement) {
    case 'up':
      return { type: 'up', color: 'text-green-400' };
    case 'down':
      return { type: 'down', color: 'text-red-400' };
    case 'new':
      return { type: 'new', color: 'text-yellow-400' };
    default:
      return { type: 'same', color: 'text-gray-500' };
  }
};

interface LeaderboardEntryItemProps {
  entry: LeaderboardEntry;
  isCurrentPlayer: boolean;
  showScores: boolean;
  index: number;
  compact?: boolean;
  /** Event modifier badges for this player */
  eventBadges?: { label: string; tooltip: string; color: string }[];
  /** Whether Score Blackout is active */
  isBlackout?: boolean;
}

/**
 * Renders event modifier badges next to a player's info.
 */
function EventModifierBadges({ badges }: { badges: { label: string; tooltip: string; color: string }[] }) {
  if (badges.length === 0) return null;

  return (
    <div className="flex items-center gap-0.5">
      {badges.map((badge, index) => (
        <motion.span
          key={`${badge.label}-${index}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: index * 0.1 }}
          className={`
            inline-flex items-center justify-center
            px-1 py-0.5 rounded text-[9px] font-bold
            ${badge.color} text-white
            shadow-sm
          `}
          title={badge.tooltip}
        >
          {badge.label}
        </motion.span>
      ))}
    </div>
  );
}

/**
 * Renders movement indicator icon
 */
function MovementIndicator({ type, color }: { type: 'up' | 'down' | 'new' | 'same'; color: string }) {
  switch (type) {
    case 'up':
      return <TrendingUpIcon sx={{ fontSize: 14 }} className={color} />;
    case 'down':
      return <TrendingDownIcon sx={{ fontSize: 14 }} className={color} />;
    case 'new':
      return <StarIcon sx={{ fontSize: 14 }} className={color} />;
    default:
      return <RemoveIcon sx={{ fontSize: 14 }} className={color} />;
  }
}

function LeaderboardEntryItem({ 
  entry, 
  isCurrentPlayer, 
  showScores, 
  index, 
  compact = false,
  eventBadges = [],
  isBlackout = false
}: LeaderboardEntryItemProps) {
  const rankBadge = getRankBadge(entry.rank);
  const movementIndicator = getMovementIndicator(entry.movement);

  // Compact mode: smaller, more condensed display
  if (compact) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ 
          layout: { type: 'spring', stiffness: 300, damping: 30 },
          delay: index * 0.03 
        }}
        className={`
          relative flex items-center gap-2 p-2 rounded-lg
          ${isCurrentPlayer 
            ? 'bg-purple-500/20 border border-purple-500/50' 
            : 'bg-white/5'
          }
          ${isBlackout ? 'opacity-80' : ''}
          transition-all duration-300
        `}
      >
        {/* Rank Badge - Compact */}
        <div className={`
          w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
          bg-gradient-to-br ${rankBadge.color}
          text-white font-bold text-[10px] shadow-sm
        `}>
          {entry.rank <= 3 ? (
            <EmojiEventsIcon sx={{ fontSize: 14 }} />
          ) : (
            <span>{entry.rank}</span>
          )}
        </div>

        {/* Player Avatar - Compact */}
        <div 
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: entry.color + '40' }}
        >
          {entry.isRevealed ? (
            <PersonIcon sx={{ fontSize: 14 }} className="text-white" />
          ) : (
            <MasksIcon sx={{ fontSize: 14 }} className="text-white/70" />
          )}
        </div>

        {/* Player Info - Compact */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className={`
              font-medium truncate text-xs
              ${isCurrentPlayer ? 'text-purple-300' : 'text-white'}
            `}>
              {entry.isRevealed ? entry.revealedName : entry.alias}
              {isCurrentPlayer && <span className="text-purple-400 ml-1">•</span>}
            </span>
            {/* Event Modifier Badges - Compact */}
            {eventBadges.length > 0 && (
              <EventModifierBadges badges={eventBadges} />
            )}
          </div>
        </div>

        {/* Score - Compact (with Blackout support) */}
        {showScores && (
          <div className="text-right flex-shrink-0">
            {isBlackout ? (
              <span className="font-bold text-xs text-gray-500">???</span>
            ) : (
              <motion.div
                key={entry.score}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                className="font-bold text-xs text-white"
              >
                {entry.score.toFixed(1)}
              </motion.div>
            )}
          </div>
        )}

        {/* Movement - Compact (hidden during blackout) */}
        {!isBlackout && (
          <span className="flex-shrink-0">
            <MovementIndicator type={movementIndicator.type} color={movementIndicator.color} />
          </span>
        )}
      </motion.div>
    );
  }

  // Full mode: original display
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ 
        layout: { type: 'spring', stiffness: 300, damping: 30 },
        delay: index * 0.05 
      }}
      className={`
        relative flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl
        ${isCurrentPlayer 
          ? 'bg-purple-500/20 border-2 border-purple-500/50 ring-2 ring-purple-500/30' 
          : 'bg-white/5 border border-white/10'
        }
        ${isBlackout ? 'opacity-80' : ''}
        transition-all duration-300
      `}
    >
      {/* Rank Badge */}
      <div className={`
        w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0
        bg-gradient-to-br ${rankBadge.color}
        text-white font-bold text-xs sm:text-sm shadow-lg
      `}>
        {entry.rank <= 3 ? (
          <EmojiEventsIcon sx={{ fontSize: 20 }} />
        ) : (
          <span>{entry.rank}</span>
        )}
      </div>

      {/* Player Avatar/Silhouette */}
      <div 
        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: entry.color + '40' }}
      >
        {entry.isRevealed ? (
          <PersonIcon sx={{ fontSize: 20 }} className="text-white" />
        ) : (
          <MasksIcon sx={{ fontSize: 20 }} className="text-white/70" />
        )}
      </div>

      {/* Player Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <span className={`
            font-semibold truncate text-sm sm:text-base
            ${isCurrentPlayer ? 'text-purple-300' : 'text-white'}
          `}>
            {entry.isRevealed ? entry.revealedName : entry.alias}
          </span>
          
          {isCurrentPlayer && (
            <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300">
              You
            </span>
          )}

          {/* Event Modifier Badges */}
          {eventBadges.length > 0 && (
            <EventModifierBadges badges={eventBadges} />
          )}
        </div>
        
        {showScores && !isBlackout && (
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs sm:text-sm text-gray-400">
              {entry.songCount} song{entry.songCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Score (with Blackout support) */}
      {showScores && (
        <div className="text-right flex-shrink-0">
          {isBlackout ? (
            <span className="font-bold text-sm sm:text-lg text-gray-500">???</span>
          ) : (
            <>
              <motion.div
                key={entry.score}
                initial={{ scale: 1.2, color: '#a855f7' }}
                animate={{ scale: 1, color: '#ffffff' }}
                className="font-bold text-sm sm:text-lg"
              >
                {entry.score.toFixed(1)}
              </motion.div>
              
              {entry.previousScore !== null && entry.previousScore !== entry.score && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-[10px] sm:text-xs ${entry.score > entry.previousScore ? 'text-green-400' : 'text-red-400'}`}
                >
                  {entry.score > entry.previousScore ? '+' : ''}
                  {(entry.score - entry.previousScore).toFixed(1)}
                </motion.div>
              )}
            </>
          )}
        </div>
      )}

      {/* Movement Indicator (hidden during blackout) */}
      {!isBlackout && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center flex-shrink-0"
        >
          <MovementIndicator type={movementIndicator.type} color={movementIndicator.color} />
        </motion.div>
      )}

      {/* Glow effect for current player */}
      {isCurrentPlayer && (
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-xl bg-purple-500/10 pointer-events-none"
        />
      )}
    </motion.div>
  );
}

export function Leaderboard({ 
  entries, 
  currentPlayerAlias, 
  showScores = true, 
  compact = false,
  activeEvents = [],
  isBlackout = false
}: LeaderboardProps) {
  const prevEntriesRef = useRef<LeaderboardEntry[]>([]);

  // Track position changes for animation
  useEffect(() => {
    prevEntriesRef.current = entries;
  }, [entries]);

  // Sort entries by rank
  const sortedEntries = [...entries].sort((a, b) => a.rank - b.rank);

  // Compact mode: simplified container
  if (compact) {
    return (
      <div className="relative">
        {/* Score Blackout Overlay - Compact */}
        {isBlackout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute -top-1 left-0 right-0 z-10 flex items-center justify-center gap-1 py-1 px-2 rounded-t-lg bg-gray-900/90 border-b border-gray-700"
          >
            <DarkModeIcon sx={{ fontSize: 14 }} className="text-gray-400" />
            <span className="text-[10px] font-medium text-gray-400">Scores Hidden</span>
          </motion.div>
        )}
        
        <div className={`space-y-1.5 ${isBlackout ? 'pt-6' : ''}`}>
          {sortedEntries.length === 0 ? (
            <div className="text-center py-4">
              <BarChartIcon sx={{ fontSize: 28 }} className="text-gray-500 mb-2" />
              <p className="text-gray-400 text-xs">No standings yet</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {sortedEntries.map((entry, index) => (
                <LeaderboardEntryItem
                  key={entry.alias}
                  entry={entry}
                  isCurrentPlayer={entry.alias === currentPlayerAlias}
                  showScores={showScores}
                  index={index}
                  compact
                  eventBadges={getEventModifierBadges(entry.alias, activeEvents)}
                  isBlackout={isBlackout}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    );
  }

  // Full mode: original display
  return (
    <div className="relative p-4 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
      {/* Score Blackout Overlay - Full */}
      {isBlackout && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center gap-2 py-2 px-4 rounded-t-2xl bg-gray-900/95 border-b border-gray-700"
        >
          <motion.div 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <DarkModeIcon sx={{ fontSize: 20 }} className="text-gray-400" />
          </motion.div>
          <span className="text-sm font-medium text-gray-300">Score Blackout Active</span>
          <span className="text-xs text-gray-500">• Scores hidden until finale</span>
        </motion.div>
      )}

      <h3 className={`text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2 ${isBlackout ? 'mt-8' : ''}`}>
        <EmojiEventsIcon sx={{ fontSize: 20 }} className="text-purple-400" />
        Leaderboard
        {isBlackout && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400 ml-auto">
            Hidden
          </span>
        )}
      </h3>

      {sortedEntries.length === 0 ? (
        <div className="text-center py-6 sm:py-8">
          <BarChartIcon sx={{ fontSize: 40 }} className="text-gray-500 mb-3 sm:mb-4" />
          <p className="text-gray-400 text-sm sm:text-base">No standings yet</p>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            Scores will appear after the first song
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {sortedEntries.map((entry, index) => (
              <LeaderboardEntryItem
                key={entry.alias}
                entry={entry}
                isCurrentPlayer={entry.alias === currentPlayerAlias}
                showScores={showScores}
                index={index}
                eventBadges={getEventModifierBadges(entry.alias, activeEvents)}
                isBlackout={isBlackout}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Legend (hidden during blackout) */}
      {!isBlackout && (
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/10">
          <div className="flex items-center justify-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1">
              <TrendingUpIcon sx={{ fontSize: 12 }} className="text-green-400" /> Moved up
            </span>
            <span className="flex items-center gap-1">
              <TrendingDownIcon sx={{ fontSize: 12 }} className="text-red-400" /> Moved down
            </span>
            <span className="flex items-center gap-1">
              <RemoveIcon sx={{ fontSize: 12 }} className="text-gray-500" /> No change
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
