import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../ui';
import StyleIcon from '@mui/icons-material/Style';
import CloseIcon from '@mui/icons-material/Close';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import RemoveIcon from '@mui/icons-material/Remove';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';

/**
 * ThemeAdherenceSlider - A 1-5 slider for rating how well a song fits the round theme
 * 
 * Features:
 * - 1-5 rating scale for theme fit
 * - Optional (can be skipped)
 * - Glassmorphism design system
 * - Animated feedback
 * - Integrates with VotingSlider
 * 
 * Requirements: 22.8, 8.1, 8.2
 * - THE UI SHALL include a Theme_Adherence_Slider component for theme fit voting
 * - WHEN voting on a song with an active Round_Theme, THE Voting_System SHALL display a theme adherence slider (1-5)
 * - THE Voting_System SHALL make theme adherence voting optional but encouraged
 */

export interface ThemeAdherenceSliderProps {
  /** Current value (1-5, or 0 if not set) */
  value: number;
  /** Callback when value changes */
  onChange: (value: number) => void;
  /** Whether the slider is disabled */
  disabled?: boolean;
  /** Optional theme name to display */
  themeName?: string;
  /** Whether to show in compact mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// Theme adherence levels with MUI icons and colors
const ADHERENCE_LEVELS = [
  { value: 1, icon: CloseIcon, label: 'Off Theme', color: 'bg-red-500', description: 'Doesn\'t fit at all' },
  { value: 2, icon: HelpOutlineIcon, label: 'Stretch', color: 'bg-orange-500', description: 'Barely fits' },
  { value: 3, icon: RemoveIcon, label: 'Okay', color: 'bg-yellow-500', description: 'Somewhat fits' },
  { value: 4, icon: ThumbUpIcon, label: 'Good Fit', color: 'bg-lime-500', description: 'Fits well' },
  { value: 5, icon: GpsFixedIcon, label: 'Perfect', color: 'bg-green-500', description: 'Nailed it!' },
];

// Get gradient color based on adherence value
const getGradientColor = (value: number): string => {
  if (value <= 1) return 'from-red-500 to-red-400';
  if (value <= 2) return 'from-orange-500 to-orange-400';
  if (value <= 3) return 'from-yellow-500 to-yellow-400';
  if (value <= 4) return 'from-lime-500 to-lime-400';
  return 'from-green-500 to-green-400';
};

/**
 * ThemeAdherenceSlider component for rating theme fit
 */
export function ThemeAdherenceSlider({
  value,
  onChange,
  disabled = false,
  themeName,
  compact = false,
  className = '',
}: ThemeAdherenceSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isSkipped, setIsSkipped] = useState(value === 0);
  
  // Get current level info (default to middle if not set)
  const displayValue = value || 3;
  const currentLevel = ADHERENCE_LEVELS.find(l => l.value === displayValue) || ADHERENCE_LEVELS[2];

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const newValue = parseInt(e.target.value, 10);
    setIsSkipped(false);
    onChange(newValue);
  }, [disabled, onChange]);

  const handleRatingClick = useCallback((rating: number) => {
    if (disabled) return;
    setIsSkipped(false);
    onChange(rating);
  }, [disabled, onChange]);

  const handleSkip = useCallback(() => {
    if (disabled) return;
    setIsSkipped(true);
    onChange(0);
  }, [disabled, onChange]);

  return (
    <GlassCard
      className={`overflow-hidden ${className}`}
      padding={compact ? 'sm' : 'md'}
      opacity="light"
      border="medium"
      animate={true}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StyleIcon 
            className="text-purple-400" 
            style={{ fontSize: compact ? 16 : 20 }} 
          />
          <h4 className={`font-semibold text-white ${compact ? 'text-sm' : 'text-base'}`}>
            Theme Fit
          </h4>
          {themeName && (
            <span className={`text-gray-400 ${compact ? 'text-xs' : 'text-sm'}`}>
              • {themeName}
            </span>
          )}
        </div>
        
        {/* Optional Badge */}
        <span className={`
          px-2 py-0.5 rounded-full
          bg-purple-500/20 border border-purple-400/30
          text-purple-300 font-medium
          ${compact ? 'text-[10px]' : 'text-xs'}
        `}>
          Optional
        </span>
      </div>

      {/* Skipped State */}
      {isSkipped ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-4"
        >
          <p className={`text-gray-400 mb-3 ${compact ? 'text-xs' : 'text-sm'}`}>
            You skipped theme rating
          </p>
          <motion.button
            onClick={() => {
              setIsSkipped(false);
              onChange(3);
            }}
            disabled={disabled}
            whileHover={!disabled ? { scale: 1.02 } : undefined}
            whileTap={!disabled ? { scale: 0.98 } : undefined}
            className={`
              px-4 py-2 rounded-lg font-medium
              bg-purple-500/20 border border-purple-400/30
              text-purple-300 hover:bg-purple-500/30
              transition-colors duration-200
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              ${compact ? 'text-xs' : 'text-sm'}
            `}
          >
            Rate Theme Fit
          </motion.button>
        </motion.div>
      ) : (
        <>
          {/* Current Rating Display */}
          <AnimatePresence mode="wait">
            <motion.div
              key={displayValue}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`
                mb-3 p-2 sm:p-3 rounded-xl text-center
                bg-gradient-to-r ${getGradientColor(displayValue)}
              `}
            >
              <motion.div
                key={`icon-${displayValue}`}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                className="mb-1"
              >
                {(() => {
                  const Icon = currentLevel.icon;
                  return <Icon sx={{ fontSize: compact ? 28 : 36 }} className="text-white" />;
                })()}
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-white font-bold ${compact ? 'text-base' : 'text-lg sm:text-xl'}`}
              >
                {displayValue}/5
              </motion.p>
              <p className={`text-white/80 mt-0.5 ${compact ? 'text-[10px]' : 'text-xs sm:text-sm'}`}>
                {currentLevel.label}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Slider */}
          <div className="relative mb-3">
            {/* Background Track */}
            <div className="h-2 rounded-full bg-white/10 relative overflow-hidden">
              {/* Gradient Fill */}
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                initial={false}
                animate={{ width: `${((displayValue - 1) / 4) * 100}%` }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            </div>

            {/* Range Input */}
            <input
              type="range"
              min="1"
              max="5"
              value={displayValue}
              onChange={handleSliderChange}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onTouchStart={() => setIsDragging(true)}
              onTouchEnd={() => setIsDragging(false)}
              disabled={disabled}
              className={`
                absolute inset-0 w-full h-2 opacity-0 cursor-pointer
                ${disabled ? 'cursor-not-allowed' : ''}
              `}
              style={{ margin: 0 }}
            />

            {/* Thumb Indicator */}
            <motion.div
              className={`
                absolute top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 rounded-full
                bg-white shadow-lg shadow-black/30
                flex items-center justify-center
                ${isDragging ? 'scale-125' : ''}
                ${disabled ? 'opacity-50' : ''}
              `}
              style={{ left: `calc(${((displayValue - 1) / 4) * 100}% - 8px)` }}
              animate={{ scale: isDragging ? 1.25 : 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              <span className="text-[8px] sm:text-[10px] font-bold text-gray-700">{displayValue}</span>
            </motion.div>
          </div>

          {/* Rating Buttons */}
          <div className="grid grid-cols-5 gap-1 sm:gap-1.5 mb-3">
            {ADHERENCE_LEVELS.map((level) => {
              const Icon = level.icon;
              return (
                <motion.button
                  key={level.value}
                  type="button"
                  onClick={() => handleRatingClick(level.value)}
                  disabled={disabled}
                  whileHover={!disabled ? { scale: 1.05 } : undefined}
                  whileTap={!disabled ? { scale: 0.95 } : undefined}
                  className={`
                    relative flex flex-col items-center gap-0.5 p-1.5 sm:p-2 rounded-lg transition-all
                    ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                    ${displayValue === level.value 
                      ? `${level.color} ring-2 ring-white/50` 
                      : 'bg-white/5 hover:bg-white/10'
                    }
                  `}
                  title={level.description}
                >
                  <Icon sx={{ fontSize: compact ? 14 : 18 }} className={displayValue === level.value ? 'text-white' : 'text-gray-400'} />
                  <span className={`
                    font-medium
                    ${displayValue === level.value ? 'text-white' : 'text-gray-400'}
                    ${compact ? 'text-[9px]' : 'text-[10px] sm:text-xs'}
                  `}>
                    {level.value}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Skip Button */}
          <motion.button
            onClick={handleSkip}
            disabled={disabled}
            whileHover={!disabled ? { scale: 1.01 } : undefined}
            whileTap={!disabled ? { scale: 0.99 } : undefined}
            className={`
              w-full py-2 px-3 rounded-lg font-medium
              bg-white/5 border border-white/10
              text-gray-400 hover:text-gray-300 hover:bg-white/10
              transition-colors duration-200
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              ${compact ? 'text-xs' : 'text-sm'}
            `}
          >
            Skip Theme Rating
          </motion.button>
        </>
      )}

      {/* Helper Text */}
      <p className={`
        text-gray-500 text-center mt-2
        ${compact ? 'text-[10px]' : 'text-xs'}
      `}>
        Rate how well this song fits the theme (optional)
      </p>
    </GlassCard>
  );
}

export default ThemeAdherenceSlider;
