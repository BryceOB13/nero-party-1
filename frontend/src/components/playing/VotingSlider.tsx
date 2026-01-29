import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StarIcon from '@mui/icons-material/Star';
import LockIcon from '@mui/icons-material/Lock';
import BoltIcon from '@mui/icons-material/Bolt';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import CheckIcon from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningIcon from '@mui/icons-material/Warning';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied';
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral';
import SentimentSatisfiedIcon from '@mui/icons-material/SentimentSatisfied';
import SentimentVerySatisfiedIcon from '@mui/icons-material/SentimentVerySatisfied';
import MoodIcon from '@mui/icons-material/Mood';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

interface VotingSliderProps {
  value: number;
  onChange: (value: number) => void;
  onLock: (superVote?: boolean, comment?: string) => void;
  isLocked: boolean;
  isOwnSong: boolean;
  disabled?: boolean;
  playerPoints?: number;
  superVote?: boolean;
  onSuperVoteChange?: (enabled: boolean) => void;
  comment?: string;
  onCommentChange?: (comment: string) => void;
}

const SUPER_VOTE_COST = 2;
const SUPER_VOTE_WEIGHT = 1.5;
const MAX_COMMENT_LENGTH = 280;

// Rating levels with MUI icons
const RATING_LEVELS = [
  { value: 1, icon: SentimentVeryDissatisfiedIcon, label: 'Terrible', color: 'bg-red-600' },
  { value: 2, icon: SentimentVeryDissatisfiedIcon, label: 'Bad', color: 'bg-red-500' },
  { value: 3, icon: SentimentDissatisfiedIcon, label: 'Meh', color: 'bg-orange-500' },
  { value: 4, icon: SentimentNeutralIcon, label: 'Okay', color: 'bg-orange-400' },
  { value: 5, icon: SentimentSatisfiedIcon, label: 'Decent', color: 'bg-yellow-500' },
  { value: 6, icon: SentimentSatisfiedIcon, label: 'Good', color: 'bg-yellow-400' },
  { value: 7, icon: MoodIcon, label: 'Great', color: 'bg-lime-500' },
  { value: 8, icon: SentimentVerySatisfiedIcon, label: 'Awesome', color: 'bg-green-500' },
  { value: 9, icon: WhatshotIcon, label: 'Amazing', color: 'bg-green-400' },
  { value: 10, icon: AutoAwesomeIcon, label: 'Perfect', color: 'bg-emerald-500' },
];

const getGradientColor = (value: number): string => {
  if (value <= 2) return 'from-red-600 to-red-500';
  if (value <= 4) return 'from-orange-500 to-orange-400';
  if (value <= 6) return 'from-yellow-500 to-yellow-400';
  if (value <= 8) return 'from-lime-500 to-green-500';
  return 'from-green-500 to-emerald-500';
};

export function VotingSlider({
  value,
  onChange,
  onLock,
  isLocked,
  isOwnSong,
  disabled = false,
  playerPoints,
  superVote = false,
  onSuperVoteChange,
  comment = '',
  onCommentChange,
}: VotingSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isCommentExpanded, setIsCommentExpanded] = useState(false);
  
  const currentLevel = RATING_LEVELS.find(l => l.value === value) || RATING_LEVELS[4];
  const CurrentIcon = currentLevel.icon;
  const isDisabled = disabled || isLocked || isOwnSong;
  
  const canUseSuperVote = playerPoints !== undefined && playerPoints >= SUPER_VOTE_COST;
  const showSuperVoteOption = onSuperVoteChange !== undefined;
  const showCommentOption = onCommentChange !== undefined;
  const commentLength = comment.length;
  const isCommentValid = commentLength <= MAX_COMMENT_LENGTH;

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDisabled) return;
    onChange(parseInt(e.target.value, 10));
  }, [isDisabled, onChange]);

  const handleRatingClick = useCallback((rating: number) => {
    if (isDisabled) return;
    onChange(rating);
  }, [isDisabled, onChange]);

  const handleSuperVoteToggle = useCallback(() => {
    if (!onSuperVoteChange || !canUseSuperVote) return;
    onSuperVoteChange(!superVote);
  }, [onSuperVoteChange, canUseSuperVote, superVote]);

  const handleCommentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!onCommentChange) return;
    const newComment = e.target.value;
    if (newComment.length <= MAX_COMMENT_LENGTH || newComment.length < comment.length) {
      onCommentChange(newComment);
    }
  }, [onCommentChange, comment.length]);

  const handleLockVote = useCallback(() => {
    onLock(superVote, comment || undefined);
  }, [onLock, superVote, comment]);

  if (isOwnSong) {
    return (
      <div className="p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/10">
        <div className="text-center py-4">
          <MusicNoteIcon className="text-purple-400 mb-2" sx={{ fontSize: 32 }} />
          <h3 className="text-sm font-semibold text-white mb-1">Your Song</h3>
          <p className="text-gray-400 text-xs">
            You can't vote on your own song
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/10">
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <StarIcon className="text-purple-400" sx={{ fontSize: 18 }} />
        Rate This Song
      </h3>

      {/* Current Rating Display */}
      <AnimatePresence mode="wait">
        <motion.div
          key={value}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={`mb-3 p-3 rounded-xl text-center bg-gradient-to-r ${getGradientColor(value)} ${isLocked ? 'ring-2 ring-white/30' : ''}`}
        >
          <motion.div
            key={`icon-${value}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          >
            <CurrentIcon sx={{ fontSize: 36 }} className="text-white mb-1" />
          </motion.div>
          <p className="text-white font-bold text-lg">{value}/10</p>
          <p className="text-white/80 text-xs">{currentLevel.label}</p>
          
          {isLocked && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-1 flex items-center justify-center gap-1 text-white/90 text-xs"
            >
              <LockIcon sx={{ fontSize: 12 }} />
              <span>Vote Locked</span>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Slider */}
      <div className="relative mb-3">
        <div className="h-2 rounded-full bg-white/10 relative overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
            animate={{ width: `${((value - 1) / 9) * 100}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>
        <input
          type="range"
          min="1"
          max="10"
          value={value}
          onChange={handleSliderChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          disabled={isDisabled}
          className={`absolute inset-0 w-full h-2 opacity-0 cursor-pointer ${isDisabled ? 'cursor-not-allowed' : ''}`}
        />
        <motion.div
          className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-lg flex items-center justify-center ${isDisabled ? 'opacity-50' : ''}`}
          style={{ left: `calc(${((value - 1) / 9) * 100}% - 10px)` }}
          animate={{ scale: isDragging ? 1.25 : 1 }}
        >
          <span className="text-[10px] font-bold text-gray-800">{value}</span>
        </motion.div>
      </div>

      {/* Rating Buttons */}
      <div className="grid grid-cols-5 gap-1 mb-3">
        {RATING_LEVELS.map((level) => {
          const Icon = level.icon;
          return (
            <motion.button
              key={level.value}
              type="button"
              onClick={() => handleRatingClick(level.value)}
              disabled={isDisabled}
              whileHover={!isDisabled ? { scale: 1.1 } : undefined}
              whileTap={!isDisabled ? { scale: 0.95 } : undefined}
              className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-all ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${value === level.value ? `${level.color} ring-2 ring-white/50` : 'bg-white/5 hover:bg-white/10'}`}
            >
              <Icon sx={{ fontSize: 16 }} className={value === level.value ? 'text-white' : 'text-gray-400'} />
              <span className={`text-[10px] font-medium ${value === level.value ? 'text-white' : 'text-gray-400'}`}>
                {level.value}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Super Vote Toggle */}
      {showSuperVoteOption && !isLocked && (
        <div className={`mb-3 p-3 rounded-xl border transition-all ${superVote ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-500/50' : 'bg-white/5 border-white/10'}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <BoltIcon sx={{ fontSize: 16 }} className="text-amber-400" />
                <span className="text-xs font-semibold text-white">Super Vote</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${superVote ? 'bg-amber-500 text-black' : 'bg-amber-500/30 text-amber-300'}`}>
                  {SUPER_VOTE_WEIGHT}x
                </span>
              </div>
              <p className="text-gray-400 text-[10px]">Make your vote count more</p>
            </div>
            <button
              type="button"
              onClick={handleSuperVoteToggle}
              disabled={!canUseSuperVote && !superVote}
              className={`relative w-12 h-6 rounded-full transition-all ${superVote ? 'bg-gradient-to-r from-amber-500 to-yellow-500' : canUseSuperVote ? 'bg-white/20' : 'bg-white/10 opacity-50'}`}
            >
              <motion.div
                className={`absolute top-0.5 w-5 h-5 rounded-full flex items-center justify-center ${superVote ? 'bg-white' : 'bg-gray-400'}`}
                animate={{ left: superVote ? 'calc(100% - 22px)' : '2px' }}
              >
                {superVote ? <BoltIcon sx={{ fontSize: 12 }} className="text-amber-500" /> : null}
              </motion.div>
            </button>
          </div>
          {!canUseSuperVote && !superVote && playerPoints !== undefined && (
            <p className="mt-1.5 text-red-400 text-[10px] flex items-center gap-1">
              <WarningIcon sx={{ fontSize: 12 }} />
              Not enough points ({playerPoints}/{SUPER_VOTE_COST})
            </p>
          )}
        </div>
      )}

      {/* Comment Section */}
      {showCommentOption && !isLocked && (
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setIsCommentExpanded(!isCommentExpanded)}
            className={`w-full flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all ${isCommentExpanded ? 'bg-white/10 border-purple-500/50' : 'bg-white/5 border-white/10'}`}
          >
            <div className="flex items-center gap-1.5">
              <ChatBubbleOutlineIcon sx={{ fontSize: 16 }} className="text-purple-400" />
              <span className="text-xs font-medium text-white">
                {comment.length > 0 ? 'Edit Comment' : 'Add Comment'}
              </span>
              {comment.length > 0 && !isCommentExpanded && (
                <span className="text-[10px] text-purple-400 bg-purple-500/20 px-1.5 py-0.5 rounded-full">
                  {commentLength}
                </span>
              )}
            </div>
            <motion.div animate={{ rotate: isCommentExpanded ? 180 : 0 }}>
              <ExpandMoreIcon sx={{ fontSize: 16 }} className="text-gray-400" />
            </motion.div>
          </button>
          <AnimatePresence>
            {isCommentExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-2">
                  <textarea
                    value={comment}
                    onChange={handleCommentChange}
                    placeholder="Leave a comment... (optional)"
                    maxLength={MAX_COMMENT_LENGTH}
                    rows={2}
                    className={`w-full p-2.5 rounded-xl resize-none bg-white/5 border text-white placeholder-gray-500 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${!isCommentValid ? 'border-red-500/50' : 'border-white/10'}`}
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-[10px] text-gray-500">Revealed during finale</p>
                    <span className={`text-[10px] ${commentLength > MAX_COMMENT_LENGTH * 0.9 ? 'text-amber-400' : 'text-gray-500'}`}>
                      {commentLength}/{MAX_COMMENT_LENGTH}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Lock Vote Button */}
      {!isLocked && (
        <button
          type="button"
          onClick={handleLockVote}
          disabled={disabled || !isCommentValid}
          className={`w-full py-2.5 px-4 rounded-xl font-bold text-sm text-white shadow-lg transition-all ${superVote ? 'bg-gradient-to-r from-amber-500 to-yellow-500 shadow-amber-500/25' : 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-purple-500/25'} ${disabled || !isCommentValid ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className="flex items-center justify-center gap-2">
            {superVote ? <BoltIcon sx={{ fontSize: 16 }} /> : <LockIcon sx={{ fontSize: 16 }} />}
            {superVote ? 'Lock Super Vote' : 'Lock Vote'}
            {comment.length > 0 && <ChatBubbleOutlineIcon sx={{ fontSize: 14 }} />}
          </span>
        </button>
      )}

      {/* Locked State */}
      {isLocked && (
        <div className={`text-center p-2.5 rounded-xl border ${superVote ? 'bg-amber-500/20 border-amber-500/30' : 'bg-green-500/20 border-green-500/30'}`}>
          <span className={`font-medium flex items-center justify-center gap-1.5 text-xs ${superVote ? 'text-amber-400' : 'text-green-400'}`}>
            {superVote ? <BoltIcon sx={{ fontSize: 14 }} /> : <CheckIcon sx={{ fontSize: 14 }} />}
            {superVote ? `Super Vote submitted! (${SUPER_VOTE_WEIGHT}x)` : 'Vote submitted!'}
          </span>
        </div>
      )}
    </div>
  );
}
