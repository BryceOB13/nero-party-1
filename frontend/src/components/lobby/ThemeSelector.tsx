import { useState, useCallback, ReactNode } from 'react';
import { PartyTheme, ThemeConstraints, PARTY_THEMES } from '../../types';
import { GlassButton } from '../ui';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import PaletteIcon from '@mui/icons-material/Palette';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import FlashlightOnIcon from '@mui/icons-material/FlashlightOn';
import BoltIcon from '@mui/icons-material/Bolt';
import WavesIcon from '@mui/icons-material/Waves';
import SentimentVerySatisfiedIcon from '@mui/icons-material/SentimentVerySatisfied';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import NightlifeIcon from '@mui/icons-material/Nightlife';
import FavoriteIcon from '@mui/icons-material/Favorite';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import CelebrationIcon from '@mui/icons-material/Celebration';
import HeadphonesIcon from '@mui/icons-material/Headphones';

export interface ThemeSelectorProps {
  themes: PartyTheme[];
  selectedTheme: string | null;
  onSelect: (themeId: string) => void;
  allowCustom?: boolean;
  onCustomThemeCreate?: (theme: Omit<PartyTheme, 'id' | 'isCustom'>) => void;
  disabled?: boolean;
  className?: string;
}

// Map theme IDs to MUI icons
function getThemeIcon(themeId: string, themeName: string, size: number = 22): ReactNode {
  const iconMap: Record<string, ReactNode> = {
    'anything-goes': <MusicNoteIcon sx={{ fontSize: size }} />,
    'throwback-party': <FastRewindIcon sx={{ fontSize: size }} />,
    'underground-only': <FlashlightOnIcon sx={{ fontSize: size }} />,
    'high-energy': <BoltIcon sx={{ fontSize: size }} />,
    'chill-vibes': <WavesIcon sx={{ fontSize: size }} />,
    'guilty-pleasures': <SentimentVerySatisfiedIcon sx={{ fontSize: size }} />,
    'one-hit-wonders': <AutoAwesomeIcon sx={{ fontSize: size }} />,
    'decade-battle': <CalendarMonthIcon sx={{ fontSize: size }} />,
  };

  if (iconMap[themeId]) return iconMap[themeId];

  // Fallback based on name keywords
  const name = themeName.toLowerCase();
  if (name.includes('throwback') || name.includes('retro')) return <FastRewindIcon sx={{ fontSize: size }} />;
  if (name.includes('underground') || name.includes('indie')) return <FlashlightOnIcon sx={{ fontSize: size }} />;
  if (name.includes('energy') || name.includes('hype')) return <BoltIcon sx={{ fontSize: size }} />;
  if (name.includes('chill') || name.includes('relax')) return <WavesIcon sx={{ fontSize: size }} />;
  if (name.includes('guilty') || name.includes('pleasure')) return <SentimentVerySatisfiedIcon sx={{ fontSize: size }} />;
  if (name.includes('one hit') || name.includes('wonder')) return <AutoAwesomeIcon sx={{ fontSize: size }} />;
  if (name.includes('decade') || name.includes('battle')) return <CalendarMonthIcon sx={{ fontSize: size }} />;
  if (name.includes('party') || name.includes('dance')) return <NightlifeIcon sx={{ fontSize: size }} />;
  if (name.includes('love') || name.includes('romance')) return <FavoriteIcon sx={{ fontSize: size }} />;
  if (name.includes('fire') || name.includes('hot')) return <LocalFireDepartmentIcon sx={{ fontSize: size }} />;
  if (name.includes('road') || name.includes('drive')) return <DirectionsCarIcon sx={{ fontSize: size }} />;
  if (name.includes('celebration')) return <CelebrationIcon sx={{ fontSize: size }} />;

  return <HeadphonesIcon sx={{ fontSize: size }} />;
}

export function ThemeSelector({
  themes = PARTY_THEMES,
  selectedTheme,
  onSelect,
  allowCustom = true,
  onCustomThemeCreate,
  disabled = false,
  className = '',
}: ThemeSelectorProps) {
  const [showCustomModal, setShowCustomModal] = useState(false);

  const handleThemeSelect = useCallback(
    (themeId: string) => {
      if (!disabled) {
        onSelect(themeId);
      }
    },
    [disabled, onSelect]
  );

  const handleCustomThemeCreate = useCallback(
    (theme: Omit<PartyTheme, 'id' | 'isCustom'>) => {
      onCustomThemeCreate?.(theme);
      setShowCustomModal(false);
    },
    [onCustomThemeCreate]
  );

  const selectedThemeData = themes.find((t) => t.id === selectedTheme);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Selected Theme Display */}
      {selectedThemeData && (
        <SelectedThemeDisplay theme={selectedThemeData} />
      )}

      {/* Theme Grid */}
      <div className="grid grid-cols-2 gap-2">
        {themes.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isSelected={selectedTheme === theme.id}
            onSelect={handleThemeSelect}
            disabled={disabled}
          />
        ))}

        {/* Custom Theme Button */}
        {allowCustom && (
          <button
            onClick={() => setShowCustomModal(true)}
            disabled={disabled}
            className={`
              relative p-3 rounded-xl
              bg-white/5 border border-dashed border-white/20
              flex items-center justify-center gap-2
              min-h-[56px]
              transition-all duration-150
              ${disabled 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-white/10 hover:border-purple-400/50 cursor-pointer'
              }
            `}
          >
            <AddCircleOutlineIcon className="text-purple-400" sx={{ fontSize: 20 }} />
            <span className="text-xs text-gray-400 font-medium">Custom Theme</span>
          </button>
        )}
      </div>

      {/* Custom Theme Modal */}
      {showCustomModal && (
        <CustomThemeModal
          onClose={() => setShowCustomModal(false)}
          onCreate={handleCustomThemeCreate}
        />
      )}
    </div>
  );
}

interface ThemeCardProps {
  theme: PartyTheme;
  isSelected: boolean;
  onSelect: (themeId: string) => void;
  disabled: boolean;
}

function ThemeCard({ theme, isSelected, onSelect, disabled }: ThemeCardProps) {
  return (
    <button
      onClick={() => onSelect(theme.id)}
      disabled={disabled}
      className={`
        relative p-3 rounded-xl border
        flex items-center gap-3
        min-h-[56px]
        transition-all duration-150
        ${isSelected
          ? 'bg-purple-500/20 border-purple-400/50'
          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {/* Theme icon */}
      <span className={`flex-shrink-0 ${isSelected ? 'text-purple-300' : 'text-gray-300'}`}>
        {getThemeIcon(theme.id, theme.name, 20)}
      </span>

      {/* Theme name */}
      <span
        className={`
          text-xs font-medium text-left leading-tight flex-1
          ${isSelected ? 'text-white' : 'text-gray-300'}
        `}
      >
        {theme.name}
      </span>

      {/* Selection indicator */}
      {isSelected && (
        <span className="flex-shrink-0">
          <CheckCircleIcon className="text-purple-400" sx={{ fontSize: 16 }} />
        </span>
      )}
    </button>
  );
}

interface SelectedThemeDisplayProps {
  theme: PartyTheme;
}

function SelectedThemeDisplay({ theme }: SelectedThemeDisplayProps) {
  const constraintsList = getConstraintsList(theme.constraints);

  return (
    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-400/20">
      <div className="flex items-start gap-3">
        {/* Theme icon */}
        <span className="text-purple-300 flex-shrink-0">
          {getThemeIcon(theme.id, theme.name, 24)}
        </span>

        {/* Theme details */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="truncate">{theme.name}</span>
            {theme.isCustom && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 flex-shrink-0">
                Custom
              </span>
            )}
          </h4>
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
            {theme.description}
          </p>

          {/* Constraints */}
          {constraintsList.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {constraintsList.map((constraint, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-gray-300"
                >
                  {constraint}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface CustomThemeModalProps {
  onClose: () => void;
  onCreate: (theme: Omit<PartyTheme, 'id' | 'isCustom'>) => void;
}

function CustomThemeModal({ onClose, onCreate }: CustomThemeModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [constraints, setConstraints] = useState<ThemeConstraints>({});

  const availableGenres = ['Pop', 'Rock', 'Hip-Hop', 'Electronic', 'R&B', 'Jazz', 'Classical', 'Country', 'Indie', 'Metal'];
  const availableDecades = ['1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];
  const availableMoods = ['energetic', 'chill', 'happy', 'sad', 'romantic', 'aggressive', 'nostalgic', 'upbeat'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate({
        name: name.trim(),
        description: description.trim() || `Custom theme: ${name.trim()}`,
        icon: '',
        constraints,
      });
    }
  };

  const toggleArrayConstraint = (
    key: 'genres' | 'decades' | 'moods',
    value: string
  ) => {
    setConstraints((prev) => {
      const current = prev[key] || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return {
        ...prev,
        [key]: updated.length > 0 ? updated : undefined,
      };
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[85vh] overflow-hidden rounded-2xl bg-gray-900 border border-white/10 shadow-2xl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <PaletteIcon className="text-purple-400" sx={{ fontSize: 20 }} />
            Create Custom Theme
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <CloseIcon className="text-gray-400" sx={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto max-h-[calc(85vh-130px)]">
          {/* Theme Name */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Theme Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Summer Vibes"
              maxLength={30}
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm
                         placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          {/* Theme Description */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your theme..."
              maxLength={100}
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm
                         placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
            />
          </div>

          {/* Genre Constraints */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Genres (optional)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableGenres.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggleArrayConstraint('genres', genre)}
                  className={`
                    px-2.5 py-1 rounded-full text-xs font-medium
                    transition-all duration-200
                    ${constraints.genres?.includes(genre)
                      ? 'bg-purple-500/30 text-purple-300 border border-purple-400/50'
                      : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                    }
                  `}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Decade Constraints */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Decades (optional)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableDecades.map((decade) => (
                <button
                  key={decade}
                  type="button"
                  onClick={() => toggleArrayConstraint('decades', decade)}
                  className={`
                    px-2.5 py-1 rounded-full text-xs font-medium
                    transition-all duration-200
                    ${constraints.decades?.includes(decade)
                      ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50'
                      : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                    }
                  `}
                >
                  {decade}
                </button>
              ))}
            </div>
          </div>

          {/* Mood Constraints */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Moods (optional)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableMoods.map((mood) => (
                <button
                  key={mood}
                  type="button"
                  onClick={() => toggleArrayConstraint('moods', mood)}
                  className={`
                    px-2.5 py-1 rounded-full text-xs font-medium capitalize
                    transition-all duration-200
                    ${constraints.moods?.includes(mood)
                      ? 'bg-pink-500/30 text-pink-300 border border-pink-400/50'
                      : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                    }
                  `}
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10">
          <GlassButton variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </GlassButton>
          <GlassButton
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!name.trim()}
          >
            Create Theme
          </GlassButton>
        </div>
      </div>
    </div>
  );
}

function getConstraintsList(constraints: ThemeConstraints): string[] {
  const list: string[] = [];

  if (constraints.genres?.length) {
    list.push(`Genres: ${constraints.genres.join(', ')}`);
  }

  if (constraints.decades?.length) {
    list.push(`Decades: ${constraints.decades.join(', ')}`);
  }

  if (constraints.moods?.length) {
    list.push(`Moods: ${constraints.moods.join(', ')}`);
  }

  if (constraints.bpmRange) {
    list.push(`BPM: ${constraints.bpmRange.min}-${constraints.bpmRange.max}`);
  }

  if (constraints.explicit !== undefined && constraints.explicit !== null) {
    list.push(constraints.explicit ? 'Explicit allowed' : 'Clean only');
  }

  if (constraints.artistRestrictions) {
    list.push(constraints.artistRestrictions);
  }

  return list;
}

export default ThemeSelector;
