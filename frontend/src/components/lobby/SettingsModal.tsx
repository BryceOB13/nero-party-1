import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PartySettings, COMPETITIVE_PRESETS, MiniEventFrequency } from '../../types';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import CasinoIcon from '@mui/icons-material/Casino';
import BoltIcon from '@mui/icons-material/Bolt';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PaletteIcon from '@mui/icons-material/Palette';
import ChatIcon from '@mui/icons-material/Chat';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PartySettings;
  onSettingsChange: (settings: Partial<PartySettings>) => void;
  disabled?: boolean;
}

type CompetitivePreset = 'casual' | 'competitive' | 'chaos' | 'custom';

function getCurrentPreset(settings: PartySettings): CompetitivePreset {
  const presets = ['casual', 'competitive', 'chaos'] as const;
  for (const preset of presets) {
    const presetSettings = COMPETITIVE_PRESETS[preset];
    const matches = Object.entries(presetSettings).every(
      ([key, value]) => settings[key as keyof PartySettings] === value
    );
    if (matches) return preset;
  }
  return 'custom';
}

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
  description: string;
  icon?: React.ReactNode;
}

function ToggleSwitch({ enabled, onChange, disabled = false, label, description, icon }: ToggleSwitchProps) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      type="button"
      className={`
        w-full p-3 rounded-xl transition-all duration-200 flex items-center justify-between gap-3
        ${enabled 
          ? 'bg-purple-500/15 border border-purple-400/30' 
          : 'bg-white/5 border border-white/10 hover:bg-white/10'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="min-w-0 flex-1 text-left pointer-events-none">
        <span className="text-xs sm:text-sm font-semibold text-gray-100 flex items-center gap-2 mb-0.5">
          {icon && <span className="text-purple-400">{icon}</span>}
          {label}
        </span>
        <p className="text-[10px] sm:text-xs text-gray-500">{description}</p>
      </div>
      
      <div
        className={`
          relative w-12 h-6 rounded-full flex-shrink-0 transition-colors duration-200 pointer-events-none
          ${enabled ? 'bg-purple-500' : 'bg-gray-600'}
        `}
      >
        <div
          className={`
            absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200
            ${enabled ? 'translate-x-7' : 'translate-x-1'}
          `}
        />
      </div>
    </button>
  );
}

export function SettingsModal({ 
  isOpen, 
  onClose, 
  settings, 
  onSettingsChange, 
  disabled = false 
}: SettingsModalProps) {
  const currentPreset = getCurrentPreset(settings);

  const applyPreset = (preset: 'casual' | 'competitive' | 'chaos') => {
    onSettingsChange(COMPETITIVE_PRESETS[preset]);
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90vh] bg-gray-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <SettingsIcon sx={{ fontSize: 20 }} className="text-purple-400" />
                Game Settings
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <CloseIcon sx={{ fontSize: 20 }} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Basic Settings - Button Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs font-medium text-gray-300 mb-2">Songs Per Player</span>
                  <div className="flex gap-2">
                    {([1, 2, 3] as const).map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => onSettingsChange({ songsPerPlayer: num })}
                        disabled={disabled}
                        className={`
                          flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150
                          ${settings.songsPerPlayer === num
                            ? 'bg-purple-500/30 border-2 border-purple-400 text-purple-300'
                            : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                          }
                          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <span className="block text-xs font-medium text-gray-300 mb-2">Play Duration</span>
                  <div className="flex gap-2">
                    {([30, 45, 60, 90] as const).map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => onSettingsChange({ playDuration: sec })}
                        disabled={disabled}
                        className={`
                          flex-1 px-2 py-2 rounded-lg text-xs font-semibold transition-all duration-150
                          ${settings.playDuration === sec
                            ? 'bg-purple-500/30 border-2 border-purple-400 text-purple-300'
                            : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                          }
                          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preset Selector */}
              <div>
                <span className="block text-xs font-semibold text-gray-300 mb-2">Quick Preset</span>
                <div className="grid grid-cols-3 gap-2">
                  {(['casual', 'competitive', 'chaos'] as const).map((preset) => {
                    const isActive = currentPreset === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        disabled={disabled}
                        className={`
                          px-3 py-2.5 rounded-lg text-xs sm:text-sm font-semibold capitalize
                          transition-all duration-200
                          ${isActive 
                            ? preset === 'casual' 
                              ? 'bg-green-500/30 border-2 border-green-400 text-green-300'
                              : preset === 'competitive'
                                ? 'bg-purple-500/30 border-2 border-purple-400 text-purple-300'
                                : 'bg-red-500/30 border-2 border-red-400 text-red-300'
                            : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                          }
                          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Feature Toggles */}
              <div className="space-y-2.5">
                <ToggleSwitch
                  enabled={settings.enableConfidenceBetting}
                  onChange={() => onSettingsChange({ enableConfidenceBetting: !settings.enableConfidenceBetting })}
                  disabled={disabled}
                  label="Confidence Betting"
                  description="Risk/reward system for submissions"
                />
                
                <ToggleSwitch
                  enabled={settings.enableMiniEvents}
                  onChange={() => onSettingsChange({ enableMiniEvents: !settings.enableMiniEvents })}
                  disabled={disabled}
                  label="Mini-Events"
                  description="Random events that shake up standings"
                  icon={<CasinoIcon sx={{ fontSize: 16 }} />}
                />

                {settings.enableMiniEvents && (
                  <div className="pl-4 border-l-2 border-purple-500/30">
                    <div className="flex gap-1.5">
                      {(['rare', 'normal', 'chaos'] as const).map((freq) => (
                        <button
                          key={freq}
                          type="button"
                          onClick={() => onSettingsChange({ miniEventFrequency: freq as MiniEventFrequency })}
                          disabled={disabled}
                          className={`
                            flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors
                            ${settings.miniEventFrequency === freq 
                              ? 'bg-purple-500/30 border-2 border-purple-400 text-purple-300'
                              : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                            }
                          `}
                        >
                          {freq}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <ToggleSwitch
                  enabled={settings.enablePowerUps}
                  onChange={() => onSettingsChange({ enablePowerUps: !settings.enablePowerUps })}
                  disabled={disabled}
                  label="Power-Ups"
                  description="Strategic items to gain advantages"
                  icon={<BoltIcon sx={{ fontSize: 16 }} />}
                />

                <ToggleSwitch
                  enabled={settings.enableAchievements}
                  onChange={() => onSettingsChange({ enableAchievements: !settings.enableAchievements })}
                  disabled={disabled}
                  label="Achievements"
                  description="Unlock awards for memorable plays"
                  icon={<EmojiEventsIcon sx={{ fontSize: 16 }} />}
                />

                <ToggleSwitch
                  enabled={settings.enablePredictions}
                  onChange={() => onSettingsChange({ enablePredictions: !settings.enablePredictions })}
                  disabled={disabled}
                  label="Predictions"
                  description="Guess outcomes for bonus points"
                  icon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />}
                />

                <ToggleSwitch
                  enabled={settings.enableThemes}
                  onChange={() => onSettingsChange({ enableThemes: !settings.enableThemes })}
                  disabled={disabled}
                  label="Themes"
                  description="Party and round themes"
                  icon={<PaletteIcon sx={{ fontSize: 16 }} />}
                />

                <ToggleSwitch
                  enabled={settings.enableVoteComments}
                  onChange={() => onSettingsChange({ enableVoteComments: !settings.enableVoteComments })}
                  disabled={disabled}
                  label="Vote Comments"
                  description="Leave comments revealed in finale"
                  icon={<ChatIcon sx={{ fontSize: 16 }} />}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
