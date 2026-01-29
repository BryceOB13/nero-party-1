import { motion } from 'framer-motion';
import { LeaderboardEntry } from '../../types';
import LockIcon from '@mui/icons-material/Lock';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import PersonIcon from '@mui/icons-material/Person';
import TheaterComedyIcon from '@mui/icons-material/TheaterComedy';
import PetsIcon from '@mui/icons-material/Pets';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';

interface ScoresFrozenProps {
  standings: LeaderboardEntry[];
  currentPlayerAlias: string | null;
}

// Silhouette icons for anonymous players - using MUI icons
const getSilhouetteIcon = (silhouette: string) => {
  const iconMap: Record<string, JSX.Element> = {
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
  return iconMap[silhouette] || iconMap['default'];
};

// Get rank badge styling
const getRankBadge = (rank: number): { icon: JSX.Element; color: string } => {
  switch (rank) {
    case 1:
      return { icon: <WorkspacePremiumIcon className="text-yellow-400" />, color: 'from-yellow-500 to-amber-500' };
    case 2:
      return { icon: <MilitaryTechIcon className="text-gray-300" />, color: 'from-gray-400 to-gray-300' };
    case 3:
      return { icon: <MilitaryTechIcon className="text-orange-400" />, color: 'from-orange-600 to-orange-500' };
    default:
      return { icon: <span className="text-lg font-bold">{rank}</span>, color: 'from-gray-600 to-gray-500' };
  }
};

export function ScoresFrozen({ standings, currentPlayerAlias }: ScoresFrozenProps) {
  const sortedStandings = [...standings].sort((a, b) => a.rank - b.rank);

  return (
    <div className="space-y-8">
      {/* Scores Locked Banner */}
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          type: 'spring', 
          stiffness: 200, 
          damping: 15,
          delay: 0.2 
        }}
        className="text-center"
      >
        <motion.div
          animate={{
            boxShadow: [
              '0 0 20px rgba(168, 85, 247, 0.4)',
              '0 0 40px rgba(168, 85, 247, 0.6)',
              '0 0 20px rgba(168, 85, 247, 0.4)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="inline-flex items-center gap-4 px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600/30 to-pink-600/30 border-2 border-purple-500/50 backdrop-blur-md"
        >
          <motion.span
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
            className="text-4xl"
          >
            <LockIcon sx={{ fontSize: 40 }} className="text-purple-400" />
          </motion.span>
          <div>
            <h2 className="text-3xl font-bold text-white">Scores Locked</h2>
            <p className="text-purple-300 text-sm mt-1">Final standings before bonus reveals</p>
          </div>
          <motion.span
            animate={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
            className="text-4xl"
          >
            <LockIcon sx={{ fontSize: 40 }} className="text-purple-400" />
          </motion.span>
        </motion.div>
      </motion.div>

      {/* Frozen Leaderboard */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10"
      >
        <h3 className="text-xl font-semibold text-white mb-6 text-center flex items-center justify-center gap-2">
          <EmojiEventsIcon className="text-purple-400" />
          Anonymous Standings
          <EmojiEventsIcon className="text-purple-400" />
        </h3>

        <div className="space-y-3">
          {sortedStandings.map((entry, index) => {
            const rankBadge = getRankBadge(entry.rank);
            const silhouetteIcon = getSilhouetteIcon(entry.silhouette);
            const isCurrentPlayer = entry.alias === currentPlayerAlias;

            return (
              <motion.div
                key={entry.alias}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ 
                  delay: 0.7 + index * 0.1,
                  type: 'spring',
                  stiffness: 200,
                  damping: 20,
                }}
                className={`
                  relative flex items-center gap-4 p-4 rounded-xl
                  ${isCurrentPlayer 
                    ? 'bg-purple-500/20 border-2 border-purple-500/50' 
                    : 'bg-white/5 border border-white/10'
                  }
                `}
              >
                {/* Pulsing glow for current player */}
                {isCurrentPlayer && (
                  <motion.div
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-xl bg-purple-500/10 pointer-events-none"
                  />
                )}

                {/* Rank Badge */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ 
                    delay: 0.9 + index * 0.1,
                    type: 'spring',
                    stiffness: 500,
                  }}
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center
                    bg-gradient-to-br ${rankBadge.color}
                    text-white font-bold shadow-lg
                  `}
                >
                  {entry.rank <= 3 ? (
                    <span className="text-2xl">{rankBadge.icon}</span>
                  ) : (
                    <span className="text-lg">{entry.rank}</span>
                  )}
                </motion.div>

                {/* Player Avatar/Silhouette */}
                <motion.div
                  animate={{
                    boxShadow: isCurrentPlayer
                      ? [
                          `0 0 10px ${entry.color}40`,
                          `0 0 20px ${entry.color}60`,
                          `0 0 10px ${entry.color}40`,
                        ]
                      : 'none',
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                  style={{ backgroundColor: entry.color + '40' }}
                >
                  {silhouetteIcon}
                </motion.div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`
                      font-semibold text-lg
                      ${isCurrentPlayer ? 'text-purple-300' : 'text-white'}
                    `}>
                      {entry.alias}
                    </span>
                    
                    {isCurrentPlayer && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-xs px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300"
                      >
                        You
                      </motion.span>
                    )}
                  </div>
                  
                  <span className="text-sm text-gray-400">
                    {entry.songCount} song{entry.songCount !== 1 ? 's' : ''} submitted
                  </span>
                </div>

                {/* Score */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ 
                    delay: 1.0 + index * 0.1,
                    type: 'spring',
                    stiffness: 300,
                  }}
                  className="text-right"
                >
                  <div className="text-2xl font-bold text-white">
                    {entry.score.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-400">points</div>
                </motion.div>

                {/* Mystery indicator */}
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-2xl"
                >
                  <HelpOutlineIcon className="text-gray-400" />
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Suspense message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-6 text-center"
        >
          <motion.p
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-gray-400 text-sm"
          >
            Who will claim the bonus categories? Who is behind each alias?
          </motion.p>
          <motion.p
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            className="text-purple-400 text-lg font-semibold mt-2"
          >
            The reveals are about to begin...
          </motion.p>
        </motion.div>
      </motion.div>
    </div>
  );
}
