import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PredictionResult, PredictionType, PREDICTION_POINTS } from '../../types';
import { GlassCard } from '../ui';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import EqualizerIcon from '@mui/icons-material/Equalizer';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import StarIcon from '@mui/icons-material/Star';

/**
 * Props for the PredictionResults component.
 * **Validates: Requirement 16.4** - Reveal prediction results during the finale
 */
export interface PredictionResultsProps {
  /** Array of prediction results to display */
  results: PredictionResult[];
  /** Player name who made these predictions */
  playerName: string;
  /** Callback when all predictions have been revealed */
  onRevealComplete: () => void;
  /** Whether this is the current player's predictions */
  isCurrentPlayer?: boolean;
}

/**
 * Configuration for prediction type styling
 */
const PREDICTION_TYPE_CONFIG: Record<PredictionType, {
  icon: React.ReactNode;
  label: string;
  gradient: string;
  gradientBg: string;
  glow: string;
  description: string;
}> = {
  winner: {
    icon: <EmojiEventsIcon sx={{ fontSize: 28 }} />,
    label: 'Winner',
    gradient: 'from-yellow-400 to-amber-500',
    gradientBg: 'from-yellow-500/20 to-amber-600/20',
    glow: 'rgba(234, 179, 8, 0.4)',
    description: 'Predicted the highest-scoring song',
  },
  loser: {
    icon: <TrendingDownIcon sx={{ fontSize: 28 }} />,
    label: 'Lowest',
    gradient: 'from-red-400 to-rose-500',
    gradientBg: 'from-red-500/20 to-rose-600/20',
    glow: 'rgba(239, 68, 68, 0.4)',
    description: 'Predicted the lowest-scoring song',
  },
  average: {
    icon: <EqualizerIcon sx={{ fontSize: 28 }} />,
    label: 'Average',
    gradient: 'from-cyan-400 to-blue-500',
    gradientBg: 'from-cyan-500/20 to-blue-600/20',
    glow: 'rgba(6, 182, 212, 0.4)',
    description: 'Predicted the round average rating',
  },
};

/**
 * Sparkle effect for correct predictions
 */
function SparkleEffect({ color }: { color: string }) {
  return (
    <>
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 1, 0],
            scale: [0, 1.2, 0],
          }}
          transition={{ 
            duration: 1.2,
            delay: i * 0.15,
            repeat: Infinity,
            repeatDelay: 0.5,
          }}
          className="absolute"
          style={{
            top: `${50 + Math.sin(i * Math.PI / 3) * 45}%`,
            left: `${50 + Math.cos(i * Math.PI / 3) * 45}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <AutoAwesomeIcon 
            sx={{ fontSize: 12 }} 
            style={{ color }} 
          />
        </motion.div>
      ))}
    </>
  );
}

/**
 * Individual prediction result card with reveal animation
 */
interface PredictionCardProps {
  result: PredictionResult;
  isActive: boolean;
  onComplete: () => void;
  index: number;
}

function PredictionCard({ result, isActive, onComplete, index }: PredictionCardProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const config = PREDICTION_TYPE_CONFIG[result.predictionType];

  useEffect(() => {
    if (!isActive) return;

    // Start reveal animation after a short delay
    const revealTimer = setTimeout(() => {
      setIsRevealed(true);
    }, 600);

    // Auto-advance after animation completes
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3500);

    return () => {
      clearTimeout(revealTimer);
      clearTimeout(completeTimer);
    };
  }, [isActive, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative"
    >
      <motion.div
        animate={isActive && !isRevealed ? {
          boxShadow: [
            `0 0 20px ${config.glow}`,
            `0 0 40px ${config.glow}`,
            `0 0 20px ${config.glow}`,
          ],
        } : isRevealed && result.correct ? {
          boxShadow: `0 0 30px rgba(34, 197, 94, 0.4)`,
        } : {}}
        transition={{ duration: 1.5, repeat: isActive && !isRevealed ? Infinity : 0 }}
        className={`
          relative overflow-hidden rounded-2xl border-2 p-5
          backdrop-blur-md transition-all duration-500
          ${isRevealed 
            ? result.correct 
              ? 'bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-400/40'
              : 'bg-gradient-to-br from-gray-500/20 to-gray-600/20 border-gray-400/30'
            : `bg-gradient-to-br ${config.gradientBg} border-white/20`
          }
        `}
      >
        {/* Sparkle effect for correct predictions */}
        {isRevealed && result.correct && (
          <SparkleEffect color="#22c55e" />
        )}

        {/* Pre-reveal state */}
        <AnimatePresence mode="wait">
          {!isRevealed ? (
            <motion.div
              key="hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-4"
            >
              {/* Icon */}
              <motion.div
                animate={isActive ? { rotate: [0, 5, -5, 0], scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
                className={`
                  w-14 h-14 rounded-xl flex-shrink-0
                  bg-gradient-to-br ${config.gradient}
                  flex items-center justify-center text-white
                  shadow-lg
                `}
              >
                {config.icon}
              </motion.div>

              {/* Info */}
              <div className="flex-1">
                <p className={`font-bold text-lg bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}>
                  {config.label} Prediction
                </p>
                <p className="text-gray-400 text-sm">{config.description}</p>
              </div>

              {/* Points indicator */}
              <div className="text-right">
                <p className="text-gray-400 text-xs">Potential</p>
                <p className={`font-bold bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}>
                  +{PREDICTION_POINTS[result.predictionType]} pts
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="revealed"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="space-y-4"
            >
              {/* Header with result */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className={`
                    w-12 h-12 rounded-xl flex-shrink-0
                    ${result.correct 
                      ? 'bg-gradient-to-br from-green-400 to-emerald-500' 
                      : 'bg-gradient-to-br from-gray-400 to-gray-500'
                    }
                    flex items-center justify-center text-white
                    shadow-lg
                  `}>
                    {config.icon}
                  </div>
                  <div>
                    <p className={`font-bold ${result.correct ? 'text-green-400' : 'text-gray-400'}`}>
                      {config.label} Prediction
                    </p>
                    <p className="text-gray-500 text-xs">{config.description}</p>
                  </div>
                </div>

                {/* Result indicator */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 500 }}
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${result.correct 
                      ? 'bg-green-500/30 text-green-400' 
                      : 'bg-red-500/30 text-red-400'
                    }
                  `}
                >
                  {result.correct 
                    ? <CheckCircleIcon sx={{ fontSize: 24 }} />
                    : <CancelIcon sx={{ fontSize: 24 }} />
                  }
                </motion.div>
              </div>

              {/* Prediction vs Actual */}
              <div className="grid grid-cols-2 gap-3">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-3 rounded-xl bg-white/5 border border-white/10"
                >
                  <p className="text-gray-500 text-xs mb-1">Predicted</p>
                  <p className="text-white font-semibold truncate">{result.predicted}</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="p-3 rounded-xl bg-white/5 border border-white/10"
                >
                  <p className="text-gray-500 text-xs mb-1">Actual</p>
                  <p className="text-white font-semibold truncate">{result.actual}</p>
                </motion.div>
              </div>

              {/* Points awarded */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
                className="flex justify-center"
              >
                <div className={`
                  inline-flex items-center gap-2 px-4 py-2 rounded-full
                  ${result.correct 
                    ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' 
                    : 'bg-gray-500/30 text-gray-400'
                  }
                  font-bold shadow-lg
                `}>
                  <StarIcon sx={{ fontSize: 18 }} />
                  <span>
                    {result.correct 
                      ? `+${result.pointsAwarded} points!` 
                      : '0 points'
                    }
                  </span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/**
 * Mini card for displaying a single prediction result in summary
 */
interface MiniPredictionCardProps {
  result: PredictionResult;
}

function MiniPredictionCard({ result }: MiniPredictionCardProps) {
  const config = PREDICTION_TYPE_CONFIG[result.predictionType];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        p-3 rounded-xl backdrop-blur-md border
        ${result.correct 
          ? 'bg-green-500/10 border-green-400/30' 
          : 'bg-white/5 border-white/10'
        }
      `}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className={`
          w-8 h-8 rounded-lg flex-shrink-0
          ${result.correct 
            ? 'bg-gradient-to-br from-green-400 to-emerald-500' 
            : 'bg-gradient-to-br from-gray-400 to-gray-500'
          }
          flex items-center justify-center text-white text-sm
        `}>
          {result.correct 
            ? <CheckCircleIcon sx={{ fontSize: 16 }} />
            : <CancelIcon sx={{ fontSize: 16 }} />
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${result.correct ? 'text-green-400' : 'text-gray-400'}`}>
            {config.label}
          </p>
        </div>

        {/* Points */}
        <div className={`
          px-2 py-1 rounded-full text-xs font-bold
          ${result.correct 
            ? 'bg-green-500/30 text-green-400' 
            : 'bg-gray-500/30 text-gray-500'
          }
        `}>
          {result.correct ? `+${result.pointsAwarded}` : '0'}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * PredictionResults - Component for displaying prediction outcomes during the finale
 * 
 * Features:
 * - Animated reveal for each prediction result
 * - Shows prediction type with appropriate icon
 * - Displays what was predicted vs what actually happened
 * - Shows whether prediction was correct (checkmark/X)
 * - Shows points awarded (0 if incorrect)
 * - Shows total points earned from predictions
 * 
 * **Validates: Requirement 16.4** - Reveal prediction results during the finale
 */
export function PredictionResults({
  results,
  playerName,
  onRevealComplete,
  isCurrentPlayer = false,
}: PredictionResultsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealedResults, setRevealedResults] = useState<PredictionResult[]>([]);

  // Calculate total points
  const totalPoints = results.reduce((sum, r) => sum + r.pointsAwarded, 0);
  const correctCount = results.filter(r => r.correct).length;

  // Handle completion of current prediction reveal
  const handlePredictionComplete = useCallback(() => {
    // Add current result to revealed list
    if (currentIndex < results.length) {
      setRevealedResults(prev => [...prev, results[currentIndex]]);
    }

    // Move to next prediction or complete
    if (currentIndex < results.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // All predictions revealed
      setTimeout(onRevealComplete, 1500);
    }
  }, [currentIndex, results, onRevealComplete]);

  // Get current result
  const currentResult = results[currentIndex];

  // If no predictions, complete immediately
  useEffect(() => {
    if (results.length === 0) {
      onRevealComplete();
    }
  }, [results.length, onRevealComplete]);

  if (results.length === 0) {
    return (
      <GlassCard padding="lg" className="text-center">
        <p className="text-gray-400">No predictions to reveal</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-3">
          <EqualizerIcon sx={{ fontSize: 32 }} className="text-cyan-400" />
          Prediction Results
          <EqualizerIcon sx={{ fontSize: 32 }} className="text-cyan-400" />
        </h2>
        <p className="text-gray-400">
          {isCurrentPlayer ? 'Your' : `${playerName}'s`} predictions revealed!
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {currentIndex + 1} of {results.length}
        </p>
      </motion.div>

      {/* Progress Indicator */}
      <div className="flex justify-center gap-2">
        {results.map((_, index) => (
          <motion.div
            key={index}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className={`
              w-3 h-3 rounded-full transition-colors duration-300
              ${index < currentIndex 
                ? results[index].correct ? 'bg-green-500' : 'bg-gray-500'
                : index === currentIndex 
                  ? 'bg-cyan-400' 
                  : 'bg-gray-600'
              }
            `}
          />
        ))}
      </div>

      {/* Current Prediction Reveal */}
      <AnimatePresence mode="wait">
        {currentResult && (
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="max-w-md mx-auto"
          >
            <PredictionCard
              result={currentResult}
              isActive={true}
              onComplete={handlePredictionComplete}
              index={0}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Previously Revealed Predictions */}
      {revealedResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          <h3 className="text-sm font-semibold text-gray-400 text-center">
            Revealed Predictions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-w-lg mx-auto">
            {revealedResults.map((result, index) => (
              <motion.div
                key={`${result.predictionType}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <MiniPredictionCard result={result} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Total Points Summary (shown after all revealed) */}
      {revealedResults.length === results.length && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
          className="text-center"
        >
          <GlassCard 
            padding="lg" 
            className="max-w-sm mx-auto"
            opacity={totalPoints > 0 ? 'dark' : 'light'}
            border={totalPoints > 0 ? 'bright' : 'subtle'}
          >
            <div className="space-y-3">
              <p className="text-gray-400 text-sm">
                {correctCount} of {results.length} predictions correct
              </p>
              <motion.div
                animate={totalPoints > 0 ? {
                  scale: [1, 1.1, 1],
                } : {}}
                transition={{ duration: 0.5, repeat: 2 }}
                className={`
                  inline-flex items-center gap-2 px-6 py-3 rounded-full
                  ${totalPoints > 0 
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white' 
                    : 'bg-gray-500/30 text-gray-400'
                  }
                  font-bold text-xl shadow-lg
                `}
              >
                <StarIcon sx={{ fontSize: 24 }} />
                <span>
                  {totalPoints > 0 
                    ? `+${totalPoints} Total Points!` 
                    : 'No Points Earned'
                  }
                </span>
              </motion.div>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}

export default PredictionResults;
