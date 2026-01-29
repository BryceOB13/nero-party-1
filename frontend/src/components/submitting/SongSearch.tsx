import { useState } from 'react';
import { motion } from 'framer-motion';
import { SoundCloudTrack } from '../../types';
import { SongSearchModal } from './SongSearchModal';
import SearchIcon from '@mui/icons-material/Search';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import CloseIcon from '@mui/icons-material/Close';

interface SongSearchProps {
  onSelectTrack: (track: SoundCloudTrack) => void;
  selectedTrack: SoundCloudTrack | null;
  disabled?: boolean;
}

// Format duration from milliseconds to mm:ss
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function SongSearch({ onSelectTrack, selectedTrack, disabled = false }: SongSearchProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClearSelection = () => {
    onSelectTrack(null as unknown as SoundCloudTrack);
  };

  return (
    <div className="w-full">
      <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
        <SearchIcon className="text-purple-400" sx={{ fontSize: 20 }} />
        Search for a Song
      </h3>

      {/* Selected Track Display */}
      {selectedTrack && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 sm:mb-4 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Artwork */}
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
              {selectedTrack.artwork_url ? (
                <img
                  src={selectedTrack.artwork_url.replace('-large', '-t200x200')}
                  alt={selectedTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <MusicNoteIcon className="text-gray-500" sx={{ fontSize: 24 }} />
                </div>
              )}
            </div>

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate text-sm sm:text-base">{selectedTrack.title}</p>
              <p className="text-gray-400 text-xs sm:text-sm truncate">{selectedTrack.user.username}</p>
              <p className="text-purple-400 text-[10px] sm:text-xs">{formatDuration(selectedTrack.duration)}</p>
            </div>

            {/* Clear Button */}
            {!disabled && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleClearSelection}
                className="p-1.5 sm:p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors flex-shrink-0"
                title="Remove selection"
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </motion.button>
            )}
          </div>
        </motion.div>
      )}

      {/* Search Button - Opens Modal */}
      {!selectedTrack && (
        <motion.button
          type="button"
          onClick={() => !disabled && setIsModalOpen(true)}
          disabled={disabled}
          whileHover={!disabled ? { scale: 1.02 } : undefined}
          whileTap={!disabled ? { scale: 0.98 } : undefined}
          className={`
            w-full px-4 py-4 rounded-xl
            bg-white/5 backdrop-blur-sm border border-white/10
            text-white
            flex items-center justify-center gap-3
            transition-all duration-200
            ${disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-white/10 hover:border-purple-500/30 cursor-pointer'
            }
          `}
        >
          <SearchIcon sx={{ fontSize: 24 }} className="text-purple-400" />
          <span className="text-sm sm:text-base">Search SoundCloud</span>
        </motion.button>
      )}

      {/* SoundCloud Attribution */}
      <div className="mt-2 sm:mt-3 flex items-center justify-center gap-2 text-[10px] sm:text-xs text-gray-500">
        <span>Powered by</span>
        <a
          href="https://soundcloud.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-400 hover:text-orange-300 transition-colors"
        >
          SoundCloud
        </a>
      </div>

      {/* Search Modal */}
      <SongSearchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectTrack={onSelectTrack}
      />
    </div>
  );
}
