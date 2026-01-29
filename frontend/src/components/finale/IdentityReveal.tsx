import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Song, LeaderboardEntry } from '../../types';
import PersonIcon from '@mui/icons-material/Person';
import TheaterComedyIcon from '@mui/icons-material/TheaterComedy';
import PetsIcon from '@mui/icons-material/Pets';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import StarIcon from '@mui/icons-material/Star';

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
interface SongWithComments extends Omit<Song, 'voteDistribution' | 'submittedAt' | 'partyId' | 'submitterId' | 'soundcloudId' | 'duration' | 'permalinkUrl' | 'roundNumber' | 'queuePosition' | 'rawAverage' | 'weightedScore' | 'confidenceModifier'> {
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

interface IdentityRevealProps {
  currentReveal: IdentityRevealedEvent | null;
  revealedIdentities: IdentityRevealedEvent[];
  standings: LeaderboardEntry[];
  currentPlayerAlias: string | null;
  /** Achievement bonuses per player (keyed by player name/alias) */
  achievementBonuses?: Map<string, { bonus: number; count: number }>;
}

// Silhouette icons for anonymous players - using MUI icons
const SILHOUETTE_ICONS: Record<string, JSX.Element> = {
  'silhouette-1': <PersonIcon />,
  'silhouette-2': <TheaterComedyIcon />,
  'silhouette-3': <PetsIcon />,
  'silhouette-4': <PetsIcon />,
  'silhouette-5': <PetsIcon />,
  'silhouette-6': <PetsIcon />,
  'silhouette-7': <PetsIcon />,
  'silhouette-8': <PetsIcon />,
  'silhouette-9': <AutoAwesomeIcon />,
  'silhouette-10': <PetsIcon />,
  'default': <PersonIcon />,
};

// Get rank icon
const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <WorkspacePremiumIcon sx={{ fontSize: 48 }} className="text-yellow-400" />;
    case 2:
      return <MilitaryTechIcon sx={{ fontSize: 48 }} className="text-gray-300" />;
    case 3:
      return <MilitaryTechIcon sx={{ fontSize: 48 }} className="text-orange-400" />;
    default:
      return <span className="text-2xl font-bold">#{rank}</span>;
  }
};

// Typewriter effect hook
function useTypewriter(text: string, speed: number = 100, delay: number = 0) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayText('');
    setIsComplete(false);
    
    const startTimeout = setTimeout(() => {
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayText(text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          setIsComplete(true);
          clearInterval(interval);
        }
      }, speed);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(startTimeout);
  }, [text, speed, delay]);

  return { displayText, isComplete };
}

interface RevealCardProps {
  reveal: IdentityRevealedEvent;
  isActive: boolean;
  silhouette: string;
  color: string;
  achievementBonus?: { bonus: number; count: number };
}

function RevealCard({ reveal, isActive, silhouette, color, achievementBonus }: RevealCardProps) {
  const [phase, setPhase] = useState<'spotlight' | 'morph' | 'name' | 'songs'>('spotlight');
  const { displayText: typedName, isComplete: nameComplete } = useTypewriter(
    reveal.realName,
    80,
    phase === 'name' ? 0 : 10000 // Only start typing when in name phase
  );

  const silhouetteIcon = SILHOUETTE_ICONS[silhouette] || SILHOUETTE_ICONS['default'];

  useEffect(() => {
    if (!isActive) return;

    // Phase transitions
    const timers = [
      setTimeout(() => setPhase('morph'), 1500),
      setTimeout(() => setPhase('name'), 3000),
      setTimeout(() => setPhase('songs'), 5000),
    ];

    return () => timers.forEach(clearTimeout);
  }, [isActive]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="max-w-lg mx-auto"
    >
      {/* Spotlight Container */}
      <motion.div
        animate={isActive ? {
          boxShadow: [
            `0 0 30px ${color}40`,
            `0 0 60px ${color}60`,
            `0 0 30px ${color}40`,
          ],
        } : {}}
        transition={{ duration: 2, repeat: Infinity }}
        className="p-8 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border-2 border-white/20"
      >
        {/* Rank Badge */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-6"
        >
          <span className="text-6xl">
            {getRankIcon(reveal.rank)}
          </span>
          <p className="text-gray-400 mt-2">
            {reveal.rank === 1 ? 'First Place' : 
             reveal.rank === 2 ? 'Second Place' : 
             reveal.rank === 3 ? 'Third Place' : 
             `${reveal.rank}th Place`}
          </p>
        </motion.div>

        {/* Avatar/Silhouette Morph */}
        <div className="flex justify-center mb-6">
          <motion.div
            animate={phase === 'spotlight' ? {
              scale: [1, 1.1, 1],
              boxShadow: [
                `0 0 20px ${color}40`,
                `0 0 40px ${color}80`,
                `0 0 20px ${color}40`,
              ],
            } : {}}
            transition={{ duration: 1.5, repeat: phase === 'spotlight' ? Infinity : 0 }}
            className="relative"
          >
            {/* Silhouette (fades out) */}
            <motion.div
              animate={{
                opacity: phase === 'spotlight' ? 1 : 0,
                scale: phase === 'spotlight' ? 1 : 0.5,
              }}
              transition={{ duration: 0.8 }}
              className="w-32 h-32 rounded-full flex items-center justify-center text-6xl"
              style={{ backgroundColor: color + '40' }}
            >
              {silhouetteIcon}
            </motion.div>

            {/* Real Avatar (fades in) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{
                opacity: phase !== 'spotlight' ? 1 : 0,
                scale: phase !== 'spotlight' ? 1 : 0.5,
              }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 w-32 h-32 rounded-full flex items-center justify-center text-6xl bg-gradient-to-br from-purple-500 to-pink-500"
            >
              <span className="text-white">
                {reveal.realName.charAt(0).toUpperCase()}
              </span>
            </motion.div>

            {/* Morph particles */}
            {phase === 'morph' && (
              <>
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ 
                      x: 0, 
                      y: 0, 
                      opacity: 1,
                      scale: 1,
                    }}
                    animate={{ 
                      x: Math.cos(i * Math.PI / 4) * 80,
                      y: Math.sin(i * Math.PI / 4) * 80,
                      opacity: 0,
                      scale: 0,
                    }}
                    transition={{ duration: 0.8, delay: i * 0.05 }}
                    className="absolute top-1/2 left-1/2 w-4 h-4 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </>
            )}
          </motion.div>
        </div>

        {/* Alias */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-4"
        >
          <span className="text-gray-400 text-sm">Known as</span>
          <motion.p
            animate={phase === 'spotlight' ? {
              textShadow: [
                `0 0 10px ${color}`,
                `0 0 20px ${color}`,
                `0 0 10px ${color}`,
              ],
            } : {}}
            transition={{ duration: 1.5, repeat: phase === 'spotlight' ? Infinity : 0 }}
            className="text-2xl font-bold"
            style={{ color }}
          >
            {reveal.alias}
          </motion.p>
        </motion.div>

        {/* Real Name (Typewriter) */}
        <AnimatePresence>
          {(phase === 'name' || phase === 'songs') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-6"
            >
              <span className="text-gray-400 text-sm">Is actually</span>
              <div className="text-3xl font-bold text-white mt-1 min-h-[2.5rem]">
                {typedName}
                {!nameComplete && (
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="text-purple-400"
                  >
                    |
                  </motion.span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Songs Display */}
        <AnimatePresence>
          {phase === 'songs' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              <h4 className="text-gray-400 text-sm text-center mb-3">
                Submitted Songs
              </h4>
              {reveal.songs.map((song, index) => (
                <motion.div
                  key={song.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.2 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
                >
                  {/* Song Artwork */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={song.artworkUrl || 'https://via.placeholder.com/48?text=♪'}
                      alt={song.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48?text=♪';
                      }}
                    />
                  </div>
                  
                  {/* Song Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{song.title}</p>
                    <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                  </div>
                  
                  {/* Score */}
                  <div className="text-right">
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.6 + index * 0.2, type: 'spring' }}
                      className="text-lg font-bold text-purple-400"
                    >
                      {song.finalScore?.toFixed(1) ?? '-'}
                    </motion.span>
                    <p className="text-xs text-gray-500">pts</p>
                  </div>
                </motion.div>
              ))}

              {/* Vote Comments Section - Requirement 18.3 */}
              {(() => {
                // Collect all comments from all songs
                const allComments = reveal.songs.flatMap(song => 
                  (song.comments || []).map(comment => ({
                    ...comment,
                    songTitle: song.title
                  }))
                );
                
                // Only show if there are comments
                if (allComments.length === 0) return null;
                
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + reveal.songs.length * 0.2 }}
                    className="mt-6 pt-4 border-t border-white/10"
                  >
                    <h4 className="text-gray-400 text-sm text-center mb-4 flex items-center justify-center gap-2">
                      <FormatQuoteIcon sx={{ fontSize: 16 }} />
                      What People Said
                      <FormatQuoteIcon sx={{ fontSize: 16, transform: 'scaleX(-1)' }} />
                    </h4>
                    <div className="space-y-3 max-h-48 overflow-y-auto scrollbar-thin pr-1">
                      {allComments.map((comment, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 1 + idx * 0.15 }}
                          className="relative"
                        >
                          {/* Quote bubble */}
                          <div className="bg-white/5 rounded-2xl rounded-tl-sm p-3 border border-white/10">
                            {/* Comment text */}
                            <p className="text-white/90 text-sm italic leading-relaxed">
                              "{comment.comment}"
                            </p>
                            
                            {/* Attribution row */}
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                              {/* Voter info */}
                              <div className="flex items-center gap-2">
                                <span 
                                  className="text-xs font-medium"
                                  style={{ color: comment.voterColor }}
                                >
                                  {comment.voterAlias}
                                </span>
                                {comment.superVote && (
                                  <span className="text-yellow-400 text-xs" title="Super Vote">
                                    ⚡
                                  </span>
                                )}
                              </div>
                              
                              {/* Rating */}
                              <div className="flex items-center gap-1">
                                <StarIcon sx={{ fontSize: 14 }} className="text-yellow-400" />
                                <span className="text-yellow-400 text-xs font-bold">
                                  {comment.rating}
                                </span>
                              </div>
                            </div>
                            
                            {/* Song reference (if multiple songs) */}
                            {reveal.songs.length > 1 && (
                              <p className="text-gray-500 text-xs mt-1 truncate">
                                on "{comment.songTitle}"
                              </p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Final Score */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center"
        >
          <span className="text-gray-400 text-sm">Final Score</span>
          <motion.p
            animate={{
              textShadow: [
                '0 0 10px rgba(168, 85, 247, 0.5)',
                '0 0 20px rgba(168, 85, 247, 0.8)',
                '0 0 10px rgba(168, 85, 247, 0.5)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-4xl font-bold text-white"
          >
            {reveal.finalScore.toFixed(1)}
          </motion.p>
          {/* Achievement bonus display */}
          {achievementBonus && achievementBonus.bonus > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="mt-2 flex items-center justify-center gap-2"
            >
              <span className="text-yellow-400 text-lg">🏆</span>
              <span className="text-yellow-400 font-semibold">
                +{achievementBonus.bonus} from {achievementBonus.count} achievement{achievementBonus.count !== 1 ? 's' : ''}
              </span>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export function IdentityReveal({
  currentReveal,
  revealedIdentities,
  standings,
  currentPlayerAlias,
  achievementBonuses,
}: IdentityRevealProps) {
  // Find the standing entry for the current reveal to get silhouette and color
  const currentStanding = currentReveal 
    ? standings.find(s => s.alias === currentReveal.alias)
    : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
          <TheaterComedyIcon className="text-purple-400" /> Identity Reveals <TheaterComedyIcon className="text-purple-400" />
        </h2>
        <p className="text-gray-400">
          From last place to first... who is behind each alias?
        </p>
      </motion.div>

      {/* Current Reveal */}
      <AnimatePresence mode="wait">
        {currentReveal && currentStanding && (
          <RevealCard
            key={currentReveal.alias}
            reveal={currentReveal}
            isActive={true}
            silhouette={currentStanding.silhouette}
            color={currentStanding.color}
            achievementBonus={achievementBonuses?.get(currentReveal.alias) || achievementBonuses?.get(currentReveal.realName)}
          />
        )}
      </AnimatePresence>

      {/* Previously Revealed */}
      {revealedIdentities.length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <h3 className="text-lg font-semibold text-gray-400 text-center">
            Already Revealed
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {revealedIdentities.slice(0, -1).map((identity, index) => {
              const standing = standings.find(s => s.alias === identity.alias);
              const isCurrentPlayer = identity.alias === currentPlayerAlias;
              
              return (
                <motion.div
                  key={identity.alias}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`
                    p-3 rounded-xl backdrop-blur-md border
                    ${isCurrentPlayer 
                      ? 'bg-purple-500/20 border-purple-500/30' 
                      : 'bg-white/5 border-white/10'
                    }
                  `}
                >
                  <div className="text-center">
                    <div 
                      className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-lg bg-gradient-to-br from-purple-500 to-pink-500"
                    >
                      {identity.realName.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-white font-medium text-sm truncate">
                      {identity.realName}
                    </p>
                    <p className="text-xs mt-1" style={{ color: standing?.color ?? '#9ca3af' }}>
                      {identity.alias}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      #{identity.rank} • {identity.finalScore.toFixed(1)} pts
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Remaining Mystery Players */}
      {standings.filter(s => !s.isRevealed).length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <p className="text-gray-400 text-sm">
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {standings.filter(s => !s.isRevealed).length} player{standings.filter(s => !s.isRevealed).length !== 1 ? 's' : ''} remaining...
            </motion.span>
          </p>
        </motion.div>
      )}
    </div>
  );
}
