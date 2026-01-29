import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral';
import SentimentSatisfiedIcon from '@mui/icons-material/SentimentSatisfied';
import MoodIcon from '@mui/icons-material/Mood';
import SentimentVerySatisfiedIcon from '@mui/icons-material/SentimentVerySatisfied';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import TuneIcon from '@mui/icons-material/Tune';
import { ReactNode } from 'react';

interface ConfidenceSliderProps {
  value: 1 | 2 | 3 | 4 | 5;
  onChange: (value: 1 | 2 | 3 | 4 | 5) => void;
  disabled?: boolean;
}

const CONFIDENCE_LEVELS: Array<{
  value: 1 | 2 | 3 | 4 | 5;
  label: string;
  icon: ReactNode;
  color: string;
  bgColor: string;
}> = [
  { value: 1, label: "It's fine", icon: <SentimentNeutralIcon sx={{ fontSize: 24 }} />, color: 'text-gray-400', bgColor: 'bg-gray-500' },
  { value: 2, label: 'Pretty good', icon: <SentimentSatisfiedIcon sx={{ fontSize: 24 }} />, color: 'text-blue-400', bgColor: 'bg-blue-500' },
  { value: 3, label: 'Solid pick', icon: <MoodIcon sx={{ fontSize: 24 }} />, color: 'text-green-400', bgColor: 'bg-green-500' },
  { value: 4, label: 'Great choice', icon: <SentimentVerySatisfiedIcon sx={{ fontSize: 24 }} />, color: 'text-purple-400', bgColor: 'bg-purple-500' },
  { value: 5, label: 'Guaranteed banger', icon: <WhatshotIcon sx={{ fontSize: 24 }} />, color: 'text-orange-400', bgColor: 'bg-orange-500' },
];

export function ConfidenceSlider({ value, onChange, disabled = false }: ConfidenceSliderProps) {
  const currentLevel = CONFIDENCE_LEVELS.find(l => l.value === value) || CONFIDENCE_LEVELS[2];

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <TuneIcon className="text-purple-400" sx={{ fontSize: 18 }} />
        Confidence Level
      </h3>

      {/* Current Level Display - Compact */}
      <div className={`mb-3 p-3 rounded-xl text-center ${currentLevel.bgColor}/20 border border-white/10`}>
        <div className={`${currentLevel.color} mb-1`}>{currentLevel.icon}</div>
        <p className="text-white font-bold text-sm">{currentLevel.label}</p>
        <p className="text-white/50 text-xs mt-0.5">
          {value >= 4 ? (
            <>High confidence: <span className="text-green-400">+2</span> if avg ≥7, <span className="text-red-400">-2</span> if avg ≤4</>
          ) : (
            'No bonus or penalty'
          )}
        </p>
      </div>

      {/* Slider Track */}
      <div className="h-2 rounded-full bg-white/10 relative overflow-hidden mb-3">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gray-500 via-purple-500 to-orange-500 transition-all duration-200"
          style={{ width: `${((value - 1) / 4) * 100}%` }}
        />
      </div>

      {/* Level Buttons */}
      <div className="flex justify-between gap-1">
        {CONFIDENCE_LEVELS.map((level) => (
          <button
            key={level.value}
            type="button"
            onClick={() => !disabled && onChange(level.value)}
            disabled={disabled}
            className={`
              flex-1 flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-150
              ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
              ${value === level.value 
                ? 'bg-white/15 ring-2 ring-purple-500/50' 
                : 'hover:bg-white/10'
              }
            `}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
              ${value === level.value ? `${level.bgColor} text-white` : 'bg-white/20 text-gray-400'}
            `}>
              {level.value}
            </div>
            <span className={`text-[10px] text-center leading-tight ${value === level.value ? 'text-white' : 'text-gray-500'}`}>
              {level.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
