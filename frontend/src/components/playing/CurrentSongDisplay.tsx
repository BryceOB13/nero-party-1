import { motion } from 'framer-motion';
import { Song } from '../../types';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PersonIcon from '@mui/icons-material/Person';

interface CurrentSongDisplayProps {
  song: Song | null;
  roundNumber: number;
  totalRounds: number;
  weightMultiplier: number;
}

// Weight multiplier badge colors
const getMultiplierColor = (multiplier: number): string => {
  if (multiplier >= 2.0) return 'from-yellow-500 to-orange-500';
  if (multiplier >= 1.5) return 'from-purple-500 to-pink-500';
  return 'from-blue-500 to-cyan-500';
};

export function CurrentSongDisplay({
  song,
  roundNumber,
  totalRounds,
  weightMultiplier,
}: CurrentSongDisplayProps) {
  if (!song) {
    return (
      <div className="p-4 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
        <div className="flex flex-col items-center justify-center py-8 sm:py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="text-3xl sm:text-4xl mb-3 sm:mb-4"
          >
            <MusicNoteIcon sx={{ fontSize: 48 }} className="text-purple-400" />
          </motion.div>
          <p className="text-gray-400 text-sm sm:text-base">Loading next song...</p>
        </div>
      </div>
    );
  }

  const artworkUrl = song.artworkUrl || 'https://via.placeholder.com/300?text=No+Artwork';

  return (
    <div className="p-4 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
      {/* Round Info Badge */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm text-gray-400">
            Round {roundNumber} of {totalRounds}
          </span>
        </div>
        
        {/* Weight Multiplier Badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          className={`
            px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-bold
            bg-gradient-to-r ${getMultiplierColor(weightMultiplier)}
            shadow-lg
          `}
        >
          {weightMultiplier}x Points
        </motion.div>
      </div>

      {/* Song Artwork */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative mb-4 sm:mb-6"
      >
        <div className="aspect-square rounded-xl overflow-hidden shadow-2xl shadow-purple-500/20 max-w-xs sm:max-w-none mx-auto">
          <img
            src={artworkUrl}
            alt={`${song.title} artwork`}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=No+Artwork';
            }}
          />
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>

        {/* Now Playing Indicator */}
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute top-2 sm:top-3 left-2 sm:left-3 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-green-500/90 text-white text-[10px] sm:text-xs font-bold flex items-center gap-1"
        >
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white animate-pulse" />
          Now Playing
        </motion.div>
      </motion.div>

      {/* Song Info */}
      <div className="text-center">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-lg sm:text-2xl font-bold text-white mb-1 sm:mb-2 line-clamp-2"
        >
          {song.title}
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm sm:text-lg text-gray-400 mb-3 sm:mb-4"
        >
          {song.artist}
        </motion.p>

        {/* Submitter (Hidden) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/5 border border-white/10"
        >
          <PersonIcon className="text-purple-400 text-sm sm:text-base" sx={{ fontSize: 18 }} />
          <span className="text-gray-400 text-xs sm:text-sm">Submitted by ???</span>
        </motion.div>
      </div>
    </div>
  );
}
