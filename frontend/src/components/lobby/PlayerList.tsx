import { motion, AnimatePresence } from 'framer-motion';
import { Player } from '../../types';
import GroupIcon from '@mui/icons-material/Group';
import StarIcon from '@mui/icons-material/Star';

interface PlayerListProps {
  players: Player[];
  currentPlayerId: string | null;
  isHost: boolean;
  onKick?: (playerId: string) => void;
}

export function PlayerList({ players, currentPlayerId, isHost, onKick }: PlayerListProps) {
  return (
    <div className="w-full">
      <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
        <GroupIcon className="text-purple-400" />
        Players ({players.length})
      </h3>
      
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {players.map((player, index) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
              className={`
                flex items-center justify-between p-2 sm:p-3 rounded-xl
                bg-white/5 backdrop-blur-sm border border-white/10
                ${player.id === currentPlayerId ? 'ring-2 ring-purple-500/50' : ''}
                hover:bg-white/10 transition-colors duration-200
              `}
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                {/* Avatar placeholder */}
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm sm:text-base flex-shrink-0">
                  {player.name.charAt(0).toUpperCase()}
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    <span className="text-white font-medium text-sm sm:text-base truncate">
                      {player.name}
                    </span>
                    {player.id === currentPlayerId && (
                      <span className="text-[10px] sm:text-xs text-purple-400">(You)</span>
                    )}
                  </div>
                  
                  {player.isHost && (
                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-yellow-400">
                      <StarIcon sx={{ fontSize: 12 }} /> Host
                    </span>
                  )}
                </div>
              </div>
              
              {/* Kick button - only show for host, not for self or other host */}
              {isHost && !player.isHost && player.id !== currentPlayerId && onKick && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onKick(player.id)}
                  className="p-1.5 sm:p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors flex-shrink-0 ml-2"
                  title="Kick player"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </motion.button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {players.length === 0 && (
          <div className="text-center py-6 sm:py-8 text-gray-400 text-sm sm:text-base">
            Waiting for players to join...
          </div>
        )}
      </div>
    </div>
  );
}
