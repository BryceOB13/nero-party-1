import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PowerUp } from '../../types';
import CloseIcon from '@mui/icons-material/Close';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import BoltIcon from '@mui/icons-material/Bolt';
import PersonIcon from '@mui/icons-material/Person';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

/**
 * Target option for power-ups that require target selection
 */
export interface TargetOption {
  id: string;
  name: string;
  alias?: string;
  title?: string;
}

/**
 * Props for the PowerUpModal component.
 * **Validates: Requirement 13.4** - Allow players to purchase power-ups using earned points
 */
export interface PowerUpModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** The power-up being used or purchased */
  powerUp: PowerUp;
  /** Whether purchasing or using the power-up */
  mode: 'purchase' | 'use';
  /** Current points for purchase mode */
  playerPoints?: number;
  /** Available players for target selection (Unmask power-up) */
  players?: TargetOption[];
  /** Available songs for target selection (Insurance, Second Chance) */
  songs?: TargetOption[];
  /** Callback when confirmed with optional target ID */
  onConfirm: (targetId?: string) => void;
}

/**
 * Get timing badge color based on timing type
 */
function getTimingBadgeStyle(timing: string): string {
  switch (timing) {
    case 'submission':
      return 'bg-blue-500/30 text-blue-300 border-blue-400/40';
    case 'voting':
      return 'bg-purple-500/30 text-purple-300 border-purple-400/40';
    case 'anytime':
      return 'bg-green-500/30 text-green-300 border-green-400/40';
    default:
      return 'bg-gray-500/30 text-gray-300 border-gray-400/40';
  }
}

/**
 * Determine if a power-up requires target selection
 */
function requiresTarget(powerUp: PowerUp): 'player' | 'song' | null {
  // Unmask requires selecting a player
  if (powerUp.id === 'unmask') {
    return 'player';
  }
  // Insurance Policy and Second Chance require selecting a song
  if (powerUp.id === 'insurance-policy' || powerUp.id === 'second-chance') {
    return 'song';
  }
  return null;
}

/**
 * Get effect description for display
 */
function getEffectDescription(powerUp: PowerUp): string {
  const { effect } = powerUp;
  switch (effect.type) {
    case 'peek':
      return effect.target === 'vote' 
        ? 'Reveals one random vote before results are shown'
        : 'Reveals the real identity of a selected player';
    case 'boost':
      return `Your vote will count as ${effect.multiplier}x weight`;
    case 'insurance':
      return 'Removes the lowest vote from your song\'s average';
    case 'second_chance':
      return `If your song scores below ${effect.threshold}, you can re-submit`;
    case 'anonymous_vote':
      return 'Your vote will be hidden from vote-reveal events';
    default:
      return powerUp.description;
  }
}

/**
 * PowerUpModal - Confirmation modal for power-up purchase and use
 * 
 * Features:
 * - Full-screen overlay with backdrop blur
 * - Centered modal card with glassmorphism styling
 * - Shows power-up icon, name, description, and effect
 * - For purchase mode: shows cost and confirm/cancel buttons
 * - For use mode: shows target selection if applicable
 * - Animated entrance/exit with framer-motion
 * - Disable confirm if no target selected when required
 * 
 * **Validates: Requirement 13.4** - Allow players to purchase power-ups using earned points
 */
export function PowerUpModal({
  isOpen,
  onClose,
  powerUp,
  mode,
  playerPoints = 0,
  players = [],
  songs = [],
  onConfirm,
}: PowerUpModalProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  // Determine if this power-up requires target selection
  const targetType = useMemo(() => requiresTarget(powerUp), [powerUp]);

  // Get the appropriate targets based on target type
  const targets = useMemo(() => {
    if (targetType === 'player') return players;
    if (targetType === 'song') return songs;
    return [];
  }, [targetType, players, songs]);

  // Check if confirm should be disabled
  const isConfirmDisabled = useMemo(() => {
    // In purchase mode, check if player can afford
    if (mode === 'purchase' && playerPoints < powerUp.cost) {
      return true;
    }
    // In use mode with target requirement, check if target is selected
    if (mode === 'use' && targetType && !selectedTargetId) {
      return true;
    }
    return false;
  }, [mode, playerPoints, powerUp.cost, targetType, selectedTargetId]);

  // Handle confirm action
  const handleConfirm = () => {
    if (!isConfirmDisabled) {
      onConfirm(selectedTargetId || undefined);
      setSelectedTargetId(null);
    }
  };

  // Handle close and reset state
  const handleClose = () => {
    setSelectedTargetId(null);
    onClose();
  };

  // Get effect description
  const effectDescription = getEffectDescription(powerUp);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border border-white/20 shadow-2xl"
            style={{
              boxShadow: '0 0 60px rgba(139, 92, 246, 0.3), 0 0 100px rgba(139, 92, 246, 0.1)',
            }}
          >
            {/* Modal Header */}
            <div className="relative flex items-center justify-between p-4 border-b border-white/10">
              {/* Background gradient accent */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 pointer-events-none" />
              
              <div className="relative flex items-center gap-3">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl shadow-lg"
                >
                  {powerUp.icon}
                </motion.div>
                <div>
                  <h3 className="text-lg font-bold text-white">{powerUp.name}</h3>
                  <span className={`
                    inline-block px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide
                    border ${getTimingBadgeStyle(powerUp.timing)}
                  `}>
                    {powerUp.timing}
                  </span>
                </div>
              </div>
              
              <button
                onClick={handleClose}
                className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <CloseIcon className="text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-5">
              {/* Description */}
              <div className="space-y-2">
                <p className="text-gray-300 text-sm leading-relaxed">
                  {powerUp.description}
                </p>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-xs text-gray-400 mb-1">Effect:</p>
                  <p className="text-sm text-purple-300 font-medium">
                    {effectDescription}
                  </p>
                </div>
              </div>

              {/* Cost Display (Purchase Mode) */}
              {mode === 'purchase' && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-400/20">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Cost</p>
                    <p className="text-2xl font-bold text-yellow-300">
                      {powerUp.cost} <span className="text-sm font-normal">pts</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 mb-1">Your Balance</p>
                    <p className={`text-2xl font-bold ${playerPoints >= powerUp.cost ? 'text-green-400' : 'text-red-400'}`}>
                      {playerPoints} <span className="text-sm font-normal">pts</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Target Selection (Use Mode) */}
              {mode === 'use' && targetType && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {targetType === 'player' ? (
                      <PersonIcon className="text-purple-400" sx={{ fontSize: 18 }} />
                    ) : (
                      <MusicNoteIcon className="text-purple-400" sx={{ fontSize: 18 }} />
                    )}
                    <p className="text-sm font-medium text-white">
                      Select {targetType === 'player' ? 'a player' : 'a song'}
                    </p>
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {targets.length === 0 ? (
                      <p className="text-center text-gray-400 text-sm py-4">
                        No {targetType === 'player' ? 'players' : 'songs'} available
                      </p>
                    ) : (
                      targets.map((target) => (
                        <motion.button
                          key={target.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedTargetId(target.id)}
                          className={`
                            w-full p-3 rounded-xl text-left transition-all duration-200
                            ${selectedTargetId === target.id
                              ? 'bg-purple-500/30 border-purple-400/60 ring-2 ring-purple-400/40'
                              : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                            }
                            border
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-white">
                                {target.alias || target.name}
                              </p>
                              {target.title && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {target.title}
                                </p>
                              )}
                            </div>
                            {selectedTargetId === target.id && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                              >
                                <CheckCircleIcon className="text-purple-400" sx={{ fontSize: 20 }} />
                              </motion.div>
                            )}
                          </div>
                        </motion.button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10 bg-black/20">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-all"
              >
                Cancel
              </motion.button>
              
              <motion.button
                whileHover={!isConfirmDisabled ? { scale: 1.02 } : undefined}
                whileTap={!isConfirmDisabled ? { scale: 0.98 } : undefined}
                onClick={handleConfirm}
                disabled={isConfirmDisabled}
                className={`
                  px-5 py-2 rounded-xl text-sm font-semibold
                  flex items-center gap-2
                  transition-all duration-200
                  ${isConfirmDisabled
                    ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                    : mode === 'purchase'
                      ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50'
                  }
                `}
              >
                {mode === 'purchase' ? (
                  <>
                    <ShoppingCartIcon sx={{ fontSize: 18 }} />
                    Purchase
                  </>
                ) : (
                  <>
                    <BoltIcon sx={{ fontSize: 18 }} />
                    Use Power-Up
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PowerUpModal;
