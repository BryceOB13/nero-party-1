import { motion } from 'framer-motion';

interface StartButtonProps {
  playerCount: number;
  minPlayers?: number;
  onStart: () => void;
  disabled?: boolean;
}

export function StartButton({ 
  playerCount, 
  minPlayers = 3, 
  onStart, 
  disabled = false 
}: StartButtonProps) {
  const canStart = playerCount >= minPlayers && !disabled;
  const playersNeeded = minPlayers - playerCount;

  return (
    <div className="relative">
      <motion.button
        onClick={onStart}
        disabled={!canStart}
        whileHover={canStart ? { scale: 1.02 } : {}}
        whileTap={canStart ? { scale: 0.98 } : {}}
        className={`
          w-full py-4 px-8 rounded-xl font-bold text-lg
          transition-all duration-300
          ${canStart 
            ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40' 
            : 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
          }
        `}
      >
        {canStart ? (
          <span className="flex items-center justify-center gap-2">
            <span>🎮</span>
            Start Game
          </span>
        ) : (
          <span>Start Game</span>
        )}
      </motion.button>
      
      {/* Tooltip showing why button is disabled */}
      {!canStart && playersNeeded > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
        >
          <span className="text-sm text-yellow-400 flex items-center gap-1">
            <span>⚠️</span>
            Need {playersNeeded} more player{playersNeeded > 1 ? 's' : ''} to start
          </span>
        </motion.div>
      )}
    </div>
  );
}
