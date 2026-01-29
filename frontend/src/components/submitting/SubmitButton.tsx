import AutorenewIcon from '@mui/icons-material/Autorenew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import SearchIcon from '@mui/icons-material/Search';

interface SubmitButtonProps {
  onSubmit: () => void;
  disabled: boolean;
  isSubmitting?: boolean;
  hasSelectedTrack: boolean;
  currentSubmissions: number;
  maxSubmissions: number;
}

export function SubmitButton({
  onSubmit,
  disabled,
  isSubmitting = false,
  hasSelectedTrack,
  currentSubmissions,
  maxSubmissions,
}: SubmitButtonProps) {
  const isAtLimit = currentSubmissions >= maxSubmissions;
  const canSubmit = hasSelectedTrack && !isAtLimit && !disabled && !isSubmitting;

  let buttonText = 'Submit Song';
  let buttonSubtext = `${currentSubmissions}/${maxSubmissions} submitted`;
  
  if (isSubmitting) {
    buttonText = 'Submitting...';
  } else if (isAtLimit) {
    buttonText = 'All Songs Submitted';
    buttonSubtext = 'Waiting for other players...';
  } else if (!hasSelectedTrack) {
    buttonText = 'Select a Song';
    buttonSubtext = 'Search and select a track above';
  }

  const getIcon = () => {
    if (isSubmitting) return <AutorenewIcon sx={{ fontSize: 20 }} className="animate-spin" />;
    if (isAtLimit) return <CheckCircleIcon sx={{ fontSize: 20 }} />;
    if (hasSelectedTrack) return <MusicNoteIcon sx={{ fontSize: 20 }} />;
    return <SearchIcon sx={{ fontSize: 20 }} />;
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className={`
          w-full py-3 px-6 rounded-xl font-bold text-base
          transition-all duration-200 relative overflow-hidden
          ${canSubmit
            ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40'
            : 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
          }
        `}
      >
        <div className="flex flex-col items-center">
          <span className="flex items-center gap-2">
            {getIcon()}
            {buttonText}
          </span>
          <span className={`text-xs mt-0.5 ${canSubmit ? 'text-white/70' : 'text-gray-500'}`}>
            {buttonSubtext}
          </span>
        </div>
      </button>

      {/* Progress bar */}
      <div className="mt-2">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Your progress</span>
          <span>{currentSubmissions}/{maxSubmissions}</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${isAtLimit ? 'bg-green-500' : 'bg-gradient-to-r from-purple-500 to-cyan-500'}`}
            style={{ width: `${(currentSubmissions / maxSubmissions) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
