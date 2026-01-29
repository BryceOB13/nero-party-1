import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import CalculateIcon from '@mui/icons-material/Calculate';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassInput } from '../ui/GlassInput';
import { PredictionInput, PREDICTION_POINTS } from '../../types';
import { socket } from '../../lib/socket';

/**
 * Player option for prediction selection
 */
export interface PlayerOption {
  id: string;
  alias: string;
  silhouette: string;
  color: string;
}

/**
 * Props for the PredictionModal component.
 * **Validates: Requirements 22.5, 16.1, 16.2**
 */
export interface PredictionModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Current round number */
  roundNumber: number;
  /** Available players to predict (excluding self) */
  players: PlayerOption[];
  /** Party ID for socket emission */
  partyId: string;
  /** Player ID for socket emission */
  playerId: string;
}

/**
 * PredictionModal - Quick prediction UI before each round
 * 
 * Features:
 * - Full-screen overlay with backdrop blur
 * - Three prediction types: winner, loser, average
 * - Shows point values for each prediction type
 * - Player selection for winner/loser predictions
 * - Number input for average prediction (1-10)
 * - Skip button to close without predictions
 * - Submit button to send predictions via socket
 * - Animated entrance/exit with framer-motion
 * 
 * **Validates: Requirements 22.5, 16.1, 16.2**
 */
export function PredictionModal({
  isOpen,
  onClose,
  roundNumber,
  players,
  partyId,
  playerId,
}: PredictionModalProps) {
  // State for each prediction type
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [selectedLoser, setSelectedLoser] = useState<string | null>(null);
  const [averageValue, setAverageValue] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if any predictions have been made
  const hasPredictions = useMemo(() => {
    return selectedWinner !== null || selectedLoser !== null || averageValue !== '';
  }, [selectedWinner, selectedLoser, averageValue]);

  // Validate average value
  const averageError = useMemo(() => {
    if (averageValue === '') return undefined;
    const num = parseFloat(averageValue);
    if (isNaN(num)) return 'Please enter a valid number';
    if (num < 1 || num > 10) return 'Must be between 1 and 10';
    return undefined;
  }, [averageValue]);

  // Build predictions array
  const buildPredictions = (): PredictionInput[] => {
    const predictions: PredictionInput[] = [];
    
    if (selectedWinner) {
      predictions.push({ type: 'winner', value: selectedWinner });
    }
    if (selectedLoser) {
      predictions.push({ type: 'loser', value: selectedLoser });
    }
    if (averageValue && !averageError) {
      predictions.push({ type: 'average', value: averageValue });
    }
    
    return predictions;
  };

  // Handle submit
  const handleSubmit = async () => {
    const predictions = buildPredictions();
    if (predictions.length === 0) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    
    // Emit socket event for each prediction
    socket.emit('prediction:submit', {
      partyId,
      playerId,
      roundNumber,
      predictions,
    });

    // Reset state and close
    setTimeout(() => {
      resetState();
      setIsSubmitting(false);
      onClose();
    }, 300);
  };

  // Handle skip
  const handleSkip = () => {
    resetState();
    onClose();
  };

  // Reset all state
  const resetState = () => {
    setSelectedWinner(null);
    setSelectedLoser(null);
    setAverageValue('');
  };

  // Handle close with reset
  const handleClose = () => {
    resetState();
    onClose();
  };

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
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border border-white/20 shadow-2xl"
            style={{
              boxShadow: '0 0 60px rgba(59, 130, 246, 0.3), 0 0 100px rgba(59, 130, 246, 0.1)',
            }}
          >
            {/* Modal Header */}
            <div className="relative flex items-center justify-between p-4 border-b border-white/10">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 pointer-events-none" />
              
              <div className="relative flex items-center gap-3">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-2xl shadow-lg"
                >
                  🔮
                </motion.div>
                <div>
                  <h3 className="text-lg font-bold text-white">Round {roundNumber} Predictions</h3>
                  <p className="text-xs text-gray-400">Predict outcomes for bonus points!</p>
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
            <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {/* Winner Prediction */}
              <PredictionSection
                icon={<EmojiEventsIcon className="text-yellow-400" />}
                title="Winner Prediction"
                points={PREDICTION_POINTS.winner}
                description="Which player's song will score highest?"
              >
                <PlayerSelector
                  players={players}
                  selectedId={selectedWinner}
                  onSelect={setSelectedWinner}
                  excludeId={selectedLoser}
                />
              </PredictionSection>

              {/* Loser Prediction */}
              <PredictionSection
                icon={<ThumbDownIcon className="text-red-400" />}
                title="Loser Prediction"
                points={PREDICTION_POINTS.loser}
                description="Which player's song will score lowest?"
              >
                <PlayerSelector
                  players={players}
                  selectedId={selectedLoser}
                  onSelect={setSelectedLoser}
                  excludeId={selectedWinner}
                />
              </PredictionSection>

              {/* Average Prediction */}
              <PredictionSection
                icon={<CalculateIcon className="text-cyan-400" />}
                title="Average Prediction"
                points={PREDICTION_POINTS.average}
                description="What will be the round's average rating?"
              >
                <div className="mt-3">
                  <GlassInput
                    type="number"
                    placeholder="Enter average (1-10)"
                    value={averageValue}
                    onChange={(e) => setAverageValue(e.target.value)}
                    min={1}
                    max={10}
                    step={0.1}
                    error={averageError}
                    helperText="Correct if within 0.5 of actual average"
                    fullWidth
                  />
                </div>
              </PredictionSection>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-3 p-4 border-t border-white/10 bg-black/20">
              <GlassButton
                variant="ghost"
                onClick={handleSkip}
                leftIcon={<SkipNextIcon sx={{ fontSize: 18 }} />}
              >
                Skip
              </GlassButton>
              
              <GlassButton
                variant="primary"
                onClick={handleSubmit}
                disabled={!hasPredictions || !!averageError || isSubmitting}
                loading={isSubmitting}
                leftIcon={<SendIcon sx={{ fontSize: 18 }} />}
              >
                Submit Predictions
              </GlassButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Section wrapper for each prediction type
 */
interface PredictionSectionProps {
  icon: React.ReactNode;
  title: string;
  points: number;
  description: string;
  children: React.ReactNode;
}

function PredictionSection({ icon, title, points, description, children }: PredictionSectionProps) {
  return (
    <GlassCard padding="md" opacity="light" border="subtle" animate={false}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="text-sm font-semibold text-white">{title}</h4>
        </div>
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-300 border border-yellow-400/30">
          +{points} pts
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-3">{description}</p>
      {children}
    </GlassCard>
  );
}

/**
 * Player selection grid for winner/loser predictions
 */
interface PlayerSelectorProps {
  players: PlayerOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  excludeId?: string | null;
}

function PlayerSelector({ players, selectedId, onSelect, excludeId }: PlayerSelectorProps) {
  if (players.length === 0) {
    return (
      <p className="text-center text-gray-400 text-sm py-2">
        No players available
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {players.map((player) => {
        const isSelected = selectedId === player.id;
        const isExcluded = excludeId === player.id;
        
        return (
          <motion.button
            key={player.id}
            whileHover={!isExcluded ? { scale: 1.02 } : undefined}
            whileTap={!isExcluded ? { scale: 0.98 } : undefined}
            onClick={() => {
              if (isExcluded) return;
              onSelect(isSelected ? null : player.id);
            }}
            disabled={isExcluded}
            className={`
              relative p-3 rounded-xl text-left transition-all duration-200
              ${isSelected
                ? 'bg-purple-500/30 border-purple-400/60 ring-2 ring-purple-400/40'
                : isExcluded
                  ? 'bg-white/5 border-white/5 opacity-40 cursor-not-allowed'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
              }
              border
            `}
          >
            <div className="flex items-center gap-2">
              {/* Player silhouette/avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                style={{ backgroundColor: player.color + '40' }}
              >
                {player.silhouette}
              </div>
              <span className="text-sm font-medium text-white truncate">
                {player.alias}
              </span>
            </div>
            
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1 right-1"
              >
                <CheckCircleIcon className="text-purple-400" sx={{ fontSize: 16 }} />
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

export default PredictionModal;
