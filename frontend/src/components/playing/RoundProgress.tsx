import { motion } from 'framer-motion';
import CheckIcon from '@mui/icons-material/Check';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import BoltIcon from '@mui/icons-material/Bolt';
import BarChartIcon from '@mui/icons-material/BarChart';

interface RoundProgressProps {
  currentRound: number;
  totalRounds: number;
  currentSongInRound: number;
  totalSongsInRound: number;
  weightMultiplier: number;
  /** Compact mode for sidebar display */
  compact?: boolean;
}

// Get round color based on weight multiplier
const getRoundColor = (multiplier: number): string => {
  if (multiplier >= 2.0) return 'from-yellow-500 to-orange-500';
  if (multiplier >= 1.5) return 'from-purple-500 to-pink-500';
  return 'from-blue-500 to-cyan-500';
};

export function RoundProgress({
  currentRound,
  totalRounds,
  currentSongInRound,
  totalSongsInRound,
  weightMultiplier,
  compact = false,
}: RoundProgressProps) {
  const roundProgress = (currentRound / totalRounds) * 100;
  const songProgress = (currentSongInRound / totalSongsInRound) * 100;
  const roundColor = getRoundColor(weightMultiplier);

  // Compact mode: simplified display for sidebar
  if (compact) {
    return (
      <div className="space-y-3">
        {/* Round Progress - Compact */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Round</span>
            <span className="text-xs font-bold text-white">
              {currentRound}/{totalRounds}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${roundColor}`}
              initial={{ width: 0 }}
              animate={{ width: `${roundProgress}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            />
          </div>
        </div>

        {/* Song Progress - Compact */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Song</span>
            <span className="text-xs text-white">
              {currentSongInRound}/{totalSongsInRound}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
              initial={{ width: 0 }}
              animate={{ width: `${songProgress}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            />
          </div>
        </div>

        {/* Weight Multiplier - Compact */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <span className="text-xs text-gray-400">Multiplier</span>
          <motion.div
            key={weightMultiplier}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className={`
              px-2 py-0.5 rounded-full text-xs font-bold
              bg-gradient-to-r ${roundColor}
            `}
          >
            {weightMultiplier}x
          </motion.div>
        </div>
      </div>
    );
  }

  // Full mode: original display
  return (
    <div className="p-3 sm:p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
      {/* Round Progress */}
      <div className="mb-3 sm:mb-4">
        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
          <h4 className="text-xs sm:text-sm font-medium text-gray-400">Round Progress</h4>
          <span className="text-xs sm:text-sm font-bold text-white">
            Round {currentRound} of {totalRounds}
          </span>
        </div>
        
        {/* Round Progress Bar */}
        <div className="h-1.5 sm:h-2 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${roundColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${roundProgress}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          />
        </div>

        {/* Round Indicators */}
        <div className="flex justify-between mt-1.5 sm:mt-2">
          {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => (
            <motion.div
              key={round}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: round * 0.1 }}
              className={`
                w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold
                ${round < currentRound 
                  ? 'bg-green-500 text-white' 
                  : round === currentRound 
                    ? `bg-gradient-to-r ${roundColor} text-white ring-2 ring-white/30` 
                    : 'bg-white/10 text-gray-500'
                }
              `}
            >
              {round < currentRound ? <CheckIcon sx={{ fontSize: 12 }} /> : round}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Song Progress within Round */}
      <div>
        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
          <h4 className="text-xs sm:text-sm font-medium text-gray-400">Song Progress</h4>
          <span className="text-xs sm:text-sm text-white">
            Song {currentSongInRound} of {totalSongsInRound}
          </span>
        </div>
        
        {/* Song Progress Bar */}
        <div className="h-1.5 sm:h-2 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
            initial={{ width: 0 }}
            animate={{ width: `${songProgress}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          />
        </div>

        {/* Song Dots */}
        <div className="flex justify-center gap-1.5 sm:gap-2 mt-2 sm:mt-3">
          {Array.from({ length: totalSongsInRound }, (_, i) => i + 1).map((song) => (
            <motion.div
              key={song}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: song * 0.05 }}
              className={`
                w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300
                ${song < currentSongInRound 
                  ? 'bg-green-500' 
                  : song === currentSongInRound 
                    ? 'bg-purple-500 ring-2 ring-purple-500/50 animate-pulse' 
                    : 'bg-white/20'
                }
              `}
            />
          ))}
        </div>
      </div>

      {/* Weight Multiplier Info */}
      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm text-gray-400">Points Multiplier</span>
          <motion.div
            key={weightMultiplier}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className={`
              px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-bold
              bg-gradient-to-r ${roundColor}
            `}
          >
            {weightMultiplier}x
          </motion.div>
        </div>
        <p className="text-[10px] sm:text-xs text-gray-500 mt-1.5 sm:mt-2 flex items-center gap-1">
          {weightMultiplier >= 2.0 
            ? <><WhatshotIcon sx={{ fontSize: 14 }} className="text-orange-400" /> Final round! Maximum points available!</> 
            : weightMultiplier >= 1.5 
              ? <><BoltIcon sx={{ fontSize: 14 }} className="text-yellow-400" /> Points are increasing!</> 
              : <><BarChartIcon sx={{ fontSize: 14 }} className="text-blue-400" /> Standard scoring round</>
          }
        </p>
      </div>
    </div>
  );
}
