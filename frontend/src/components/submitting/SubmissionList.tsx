import { motion, AnimatePresence } from 'framer-motion';
import { Song, Player } from '../../types';
import BarChartIcon from '@mui/icons-material/BarChart';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import TheaterComedyIcon from '@mui/icons-material/TheaterComedy';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CheckIcon from '@mui/icons-material/Check';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral';
import SentimentSatisfiedIcon from '@mui/icons-material/SentimentSatisfied';
import SentimentVerySatisfiedIcon from '@mui/icons-material/SentimentVerySatisfied';
import MoodIcon from '@mui/icons-material/Mood';

interface SubmissionListProps {
  songs: Song[];
  players: Player[];
  currentPlayerId: string | null;
  songsPerPlayer: number;
  onRemoveSong?: (songId: string) => void;
}

// Format duration from milliseconds to mm:ss
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Get confidence icon component
function getConfidenceIcon(confidence: number) {
  const icons = [
    <SentimentNeutralIcon key={1} sx={{ fontSize: 14 }} className="text-gray-400" />,
    <SentimentSatisfiedIcon key={2} sx={{ fontSize: 14 }} className="text-blue-400" />,
    <MoodIcon key={3} sx={{ fontSize: 14 }} className="text-green-400" />,
    <SentimentVerySatisfiedIcon key={4} sx={{ fontSize: 14 }} className="text-yellow-400" />,
    <WhatshotIcon key={5} sx={{ fontSize: 14 }} className="text-orange-400" />,
  ];
  return icons[confidence - 1] || icons[0];
}

export function SubmissionList({
  songs,
  players,
  currentPlayerId,
  songsPerPlayer,
  onRemoveSong,
}: SubmissionListProps) {
  // Get current player's songs
  const mySongs = songs.filter(song => song.submitterId === currentPlayerId);
  
  // Get other songs (displayed anonymously)
  const otherSongs = songs.filter(song => song.submitterId !== currentPlayerId);

  // Calculate submission progress for each player
  const playerProgress = players.map(player => {
    const playerSongs = songs.filter(s => s.submitterId === player.id);
    return {
      player,
      submitted: playerSongs.length,
      required: songsPerPlayer,
      isComplete: playerSongs.length >= songsPerPlayer,
      isCurrentPlayer: player.id === currentPlayerId,
    };
  });

  const totalSubmitted = songs.length;
  const totalRequired = players.length * songsPerPlayer;

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {/* Submission Progress Overview */}
      <div className="p-3 sm:p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
        <h3 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3 flex items-center gap-2">
          <BarChartIcon className="text-purple-400" />
          Submission Progress
        </h3>

        {/* Overall Progress Bar */}
        <div className="mb-3 sm:mb-4">
          <div className="flex justify-between text-xs sm:text-sm mb-1">
            <span className="text-gray-400">Total Progress</span>
            <span className="text-white">{totalSubmitted} / {totalRequired}</span>
          </div>
          <div className="h-1.5 sm:h-2 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-500"
              initial={{ width: 0 }}
              animate={{ width: `${(totalSubmitted / totalRequired) * 100}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            />
          </div>
        </div>

        {/* Player Progress List */}
        <div className="space-y-1.5 sm:space-y-2">
          {playerProgress.map(({ player, submitted, required, isComplete, isCurrentPlayer }) => (
            <div
              key={player.id}
              className={`
                flex items-center justify-between p-1.5 sm:p-2 rounded-lg
                ${isCurrentPlayer ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-white/5'}
              `}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                {/* Avatar */}
                <div className={`
                  w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0
                  ${isComplete 
                    ? 'bg-gradient-to-br from-green-500 to-emerald-500' 
                    : 'bg-gradient-to-br from-purple-500 to-cyan-500'
                  }
                `}>
                  {isComplete ? <CheckIcon sx={{ fontSize: 14 }} /> : player.name.charAt(0).toUpperCase()}
                </div>
                <span className={`text-xs sm:text-sm truncate ${isCurrentPlayer ? 'text-white font-medium' : 'text-gray-300'}`}>
                  {isCurrentPlayer ? 'You' : player.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <span className={`text-xs sm:text-sm ${isComplete ? 'text-green-400' : 'text-gray-400'}`}>
                  {submitted}/{required}
                </span>
                {isComplete && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-green-400 text-xs sm:text-sm"
                  >
                    <CheckIcon sx={{ fontSize: 14 }} />
                  </motion.span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* My Submissions */}
      <div className="p-3 sm:p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
        <h3 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3 flex items-center gap-2">
          <MusicNoteIcon className="text-purple-400" />
          Your Submissions ({mySongs.length}/{songsPerPlayer})
        </h3>

        <AnimatePresence mode="popLayout">
          {mySongs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-4 sm:py-6 text-gray-400"
            >
              <QueueMusicIcon className="text-4xl sm:text-5xl block mb-2 mx-auto text-gray-500" />
              <p className="text-sm sm:text-base">You haven't submitted any songs yet.</p>
              <p className="text-xs sm:text-sm mt-1">Search for a song above to get started!</p>
            </motion.div>
          ) : (
            <div className="space-y-2">
              {mySongs.map((song, index) => (
                <motion.div
                  key={song.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  {/* Artwork */}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                    {song.artworkUrl ? (
                      <img
                        src={song.artworkUrl.replace('-large', '-t200x200')}
                        alt={song.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg sm:text-xl">
                        <MusicNoteIcon className="text-gray-500" />
                      </div>
                    )}
                  </div>

                  {/* Song Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate text-xs sm:text-sm">{song.title}</p>
                    <p className="text-gray-400 text-[10px] sm:text-xs truncate">{song.artist}</p>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1 flex-wrap">
                      <span className="text-purple-400 text-[10px] sm:text-xs">{formatDuration(song.duration)}</span>
                      <span className="text-gray-500 hidden sm:inline">•</span>
                      <span className="text-[10px] sm:text-xs" title={`Confidence: ${song.confidence}`}>
                        {getConfidenceIcon(song.confidence)}
                      </span>
                      <span className="text-gray-500 text-[10px] sm:text-xs">R{song.roundNumber}</span>
                    </div>
                  </div>

                  {/* Remove Button */}
                  {onRemoveSong && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onRemoveSong(song.id)}
                      className="p-1.5 sm:p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors flex-shrink-0"
                      title="Remove song"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </motion.button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Other Submissions (Anonymous) */}
      {otherSongs.length > 0 && (
        <div className="p-3 sm:p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3 flex items-center gap-2">
            <TheaterComedyIcon className="text-purple-400" />
            Other Submissions ({otherSongs.length})
          </h3>

          <div className="space-y-1.5 sm:space-y-2">
            <AnimatePresence mode="popLayout">
              {otherSongs.map((song, index) => (
                <motion.div
                  key={song.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-white/5 border border-white/10"
                >
                  {/* Mystery Artwork */}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0 flex items-center justify-center">
                    <HelpOutlineIcon className="text-2xl sm:text-3xl text-gray-500" />
                  </div>

                  {/* Anonymous Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-400 font-medium text-xs sm:text-sm">Mystery Song #{index + 1}</p>
                    <p className="text-gray-500 text-[10px] sm:text-xs">Submitted by ???</p>
                  </div>

                  {/* Hidden Badge */}
                  <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-purple-500/20 text-purple-400 text-[10px] sm:text-xs flex-shrink-0">
                    Hidden
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <p className="text-[10px] sm:text-xs text-gray-500 text-center mt-2 sm:mt-3">
            Song details will be revealed during gameplay
          </p>
        </div>
      )}
    </div>
  );
}
