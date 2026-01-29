import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PartySettings, COMPETITIVE_PRESETS, MiniEventFrequency, PARTY_THEMES } from '../../types';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { ThemeSelector } from './ThemeSelector';
import SettingsIcon from '@mui/icons-material/Settings';
import CasinoIcon from '@mui/icons-material/Casino';
import BoltIcon from '@mui/icons-material/Bolt';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PaletteIcon from '@mui/icons-material/Palette';
import ChatIcon from '@mui/icons-material/Chat';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';

interface SettingsPanelProps {
  settings: PartySettings;
  onSettingsChange: (settings: Partial<PartySettings>) => void;
  onThemeSelect?: (themeId: string) => void;
  selectedThemeId?: string | null;
  disabled?: boolean;
}

// Preset type for competitive settings
type CompetitivePreset = 'casual' | 'competitive' | 'chaos' | 'custom';

// Helper to determine current preset based on settings
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

// Toggle component for reuse
interface ToggleSwitchProps {
  enabled: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
  description: string;
  icon?: string | React.ReactNode;
}

function ToggleSwitch({ enabled, onChange, disabled = false, label, description, icon }: ToggleSwitchProps) {
  return (
    <motion.button
      onClick={onChange}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.01 } : {}}
      whileTap={!disabled ? { scale: 0.99 } : {}}
      className={`
        w-full p-3 rounded-xl transition-all duration-300 flex items-center justify-between gap-3
        ${enabled 
          ? 'bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-400/30 shadow-lg shadow-purple-500/10' 
          : 'bg-white/5 border border-white/10 hover:bg-white/10'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="min-w-0 flex-1 text-left">
        <label className="text-xs sm:text-sm font-semibold text-gray-100 flex items-center gap-2 mb-0.5">
          {typeof icon === 'string' ? <span>{icon}</span> : icon && <span className="text-purple-400">{icon}</span>}
          {label}
        </label>
        <p className="text-[10px] sm:text-xs text-gray-500">
          {description}
        </p>
      </div>
      
      {/* Enhanced Toggle Switch */}
      <motion.div
        animate={{ 
          backgroundColor: enabled ? '#a855f7' : '#4b5563',
          boxShadow: enabled ? '0 0 12px rgba(168, 85, 247, 0.4)' : 'none'
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="relative w-14 h-8 rounded-full flex-shrink-0 flex items-center"
      >
        <motion.div
          animate={{ 
            x: enabled ? 24 : 4,
            backgroundColor: enabled ? '#ffffff' : '#e5e7eb'
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="absolute w-6 h-6 rounded-full shadow-md"
        />
      </motion.div>
    </motion.button>
  );
}

export function SettingsPanel({ settings, onSettingsChange, onThemeSelect, selectedThemeId, disabled = false }: SettingsPanelProps) {
  const [competitiveOpen, setCompetitiveOpen] = useState(true);
  const currentPreset = getCurrentPreset(settings);

  // Apply a competitive preset
  const applyPreset = (preset: 'casual' | 'competitive' | 'chaos') => {
    onSettingsChange(COMPETITIVE_PRESETS[preset]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full p-4 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10"
    >
      <h3 className="text-base sm:text-lg font-semibold text-white mb-4 sm:mb-6 flex items-center gap-2">
        <SettingsIcon className="text-purple-400" fontSize="small" />
        Game Settings
      </h3>
      
      <div className="space-y-4 sm:space-y-6">
        {/* Songs Per Player */}
        <div>
          <label htmlFor="songs-per-player" className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">
            Songs Per Player
          </label>
          <select
            id="songs-per-player"
            value={settings.songsPerPlayer}
            onChange={(e) => onSettingsChange({ songsPerPlayer: Number(e.target.value) as 1 | 2 | 3 })}
            disabled={disabled}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm sm:text-base
                       focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200"
          >
            <option value={1} className="bg-gray-900">1 song</option>
            <option value={2} className="bg-gray-900">2 songs</option>
            <option value={3} className="bg-gray-900">3 songs</option>
          </select>
          <p className="mt-1 text-[10px] sm:text-xs text-gray-500">
            More songs = longer game with more rounds
          </p>
        </div>
        
        {/* Play Duration */}
        <div>
          <label htmlFor="play-duration" className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">
            Play Duration
          </label>
          <select
            id="play-duration"
            value={settings.playDuration}
            onChange={(e) => onSettingsChange({ playDuration: Number(e.target.value) as 30 | 45 | 60 | 90 })}
            disabled={disabled}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm sm:text-base
                       focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200"
          >
            <option value={30} className="bg-gray-900">30 seconds</option>
            <option value={45} className="bg-gray-900">45 seconds</option>
            <option value={60} className="bg-gray-900">60 seconds</option>
            <option value={90} className="bg-gray-900">90 seconds</option>
          </select>
          <p className="mt-1 text-[10px] sm:text-xs text-gray-500">
            How long each song plays before voting ends
          </p>
        </div>
        
        {/* Bonus Categories */}
        <div>
          <label htmlFor="bonus-categories" className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">
            Bonus Categories
          </label>
          <select
            id="bonus-categories"
            value={settings.bonusCategoryCount}
            onChange={(e) => onSettingsChange({ bonusCategoryCount: Number(e.target.value) as 0 | 1 | 2 | 3 })}
            disabled={disabled}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm sm:text-base
                       focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200"
          >
            <option value={0} className="bg-gray-900">None</option>
            <option value={1} className="bg-gray-900">1 category</option>
            <option value={2} className="bg-gray-900">2 categories</option>
            <option value={3} className="bg-gray-900">3 categories</option>
          </select>
          <p className="mt-1 text-[10px] sm:text-xs text-gray-500">
            Special awards revealed during finale (+10 points each)
          </p>
        </div>
        
        {/* Core Toggles */}
        <div className="space-y-3 sm:space-y-4 pt-2">
          <ToggleSwitch
            enabled={settings.enableConfidenceBetting}
            onChange={() => onSettingsChange({ enableConfidenceBetting: !settings.enableConfidenceBetting })}
            disabled={disabled}
            label="Confidence Betting"
            description="Risk/reward system for song submissions"
          />
          
          <ToggleSwitch
            enabled={settings.enableProgressiveWeighting}
            onChange={() => onSettingsChange({ enableProgressiveWeighting: !settings.enableProgressiveWeighting })}
            disabled={disabled}
            label="Progressive Weighting"
            description="Later rounds worth more points"
          />
        </div>

        {/* Competitive Features Section */}
        <div className="pt-2">
          <CollapsibleSection
            title="Competitive Features"
            icon={<SportsEsportsIcon fontSize="small" />}
            defaultOpen={competitiveOpen}
            onToggle={setCompetitiveOpen}
            glass={false}
            className="!bg-white/5 !border-white/10"
            headerClassName="!px-3"
            contentClassName="!px-3"
          >
            <div className="space-y-2.5">
              {/* Preset Selector */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-2">
                  Quick Preset
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['casual', 'competitive', 'chaos'] as const).map((preset) => {
                    const isActive = currentPreset === preset;
                    const presetConfig = {
                      casual: { label: 'Casual', color: 'green' },
                      competitive: { label: 'Competitive', color: 'purple' },
                      chaos: { label: 'Chaos', color: 'red' },
                    };
                    const config = presetConfig[preset];
                    
                    return (
                      <motion.button
                        key={preset}
                        onClick={() => applyPreset(preset)}
                        disabled={disabled}
                        whileHover={!disabled ? { scale: 1.02 } : {}}
                        whileTap={!disabled ? { scale: 0.98 } : {}}
                        className={`
                          px-2 py-2.5 rounded-lg text-xs sm:text-sm font-semibold
                          transition-all duration-300
                          ${isActive 
                            ? preset === 'casual' 
                              ? 'bg-green-500/30 border-2 border-green-400 text-green-300 shadow-lg shadow-green-500/20'
                              : preset === 'competitive'
                                ? 'bg-purple-500/30 border-2 border-purple-400 text-purple-300 shadow-lg shadow-purple-500/20'
                                : 'bg-red-500/30 border-2 border-red-400 text-red-300 shadow-lg shadow-red-500/20'
                            : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                          }
                          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                      >
                        {config.label}
                      </motion.button>
                    );
                  })}
                </div>
                {currentPreset === 'custom' && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1.5 text-[10px] sm:text-xs text-amber-400/80"
                  >
                    Custom configuration
                  </motion.p>
                )}
              </div>

              {/* Feature Toggles */}
              <ToggleSwitch
                enabled={settings.enableMiniEvents}
                onChange={() => onSettingsChange({ enableMiniEvents: !settings.enableMiniEvents })}
                disabled={disabled}
                label="Mini-Events"
                description="Random events that shake up standings"
                icon={<CasinoIcon fontSize="small" />}
              />
              
              <ToggleSwitch
                enabled={settings.enablePowerUps}
                onChange={() => onSettingsChange({ enablePowerUps: !settings.enablePowerUps })}
                disabled={disabled}
                label="Power-Ups"
                description="Strategic items to gain advantages"
                icon={<BoltIcon fontSize="small" />}
              />

              <ToggleSwitch
                enabled={settings.enableAchievements}
                onChange={() => onSettingsChange({ enableAchievements: !settings.enableAchievements })}
                disabled={disabled}
                label="Achievements"
                description="Unlock awards for memorable plays"
                icon={<EmojiEventsIcon fontSize="small" />}
              />

              <ToggleSwitch
                enabled={settings.enablePredictions}
                onChange={() => onSettingsChange({ enablePredictions: !settings.enablePredictions })}
                disabled={disabled}
                label="Predictions"
                description="Guess round outcomes for bonus points"
                icon={<AutoAwesomeIcon fontSize="small" />}
              />

              <ToggleSwitch
                enabled={settings.enableThemes}
                onChange={() => onSettingsChange({ enableThemes: !settings.enableThemes })}
                disabled={disabled}
                label="Themes"
                description="Party and round themes for song selection"
                icon={<PaletteIcon fontSize="small" />}
              />

              <ToggleSwitch
                enabled={settings.enableVoteComments}
                onChange={() => onSettingsChange({ enableVoteComments: !settings.enableVoteComments })}
                disabled={disabled}
                label="Vote Comments"
                description="Leave comments revealed during finale"
                icon={<ChatIcon fontSize="small" />}
              />

              {/* Mini-Events Frequency - Nested */}
              <AnimatePresence>
                {settings.enableMiniEvents && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-4 pt-2 border-l-2 border-purple-500/30 space-y-1.5">
                      <label className="block text-[10px] sm:text-xs text-gray-400 font-semibold">
                        Event Frequency
                      </label>
                      <div className="flex gap-1.5">
                        {(['rare', 'normal', 'chaos'] as const).map((freq) => {
                          const isActive = settings.miniEventFrequency === freq;
                          const freqConfig = {
                            rare: { label: 'Rare', desc: '5%' },
                            normal: { label: 'Normal', desc: '15%' },
                            chaos: { label: 'Chaos', desc: '30%' },
                          };
                          
                          return (
                            <motion.button
                              key={freq}
                              onClick={() => onSettingsChange({ miniEventFrequency: freq as MiniEventFrequency })}
                              disabled={disabled}
                              whileHover={!disabled ? { scale: 1.02 } : {}}
                              whileTap={!disabled ? { scale: 0.98 } : {}}
                              className={`
                                flex-1 px-2 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold
                                transition-all duration-300
                                ${isActive 
                                  ? 'bg-purple-500/30 border-2 border-purple-400 text-purple-300 shadow-lg shadow-purple-500/15'
                                  : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                                }
                                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                              `}
                            >
                              {freqConfig[freq].label}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Power-Ups Starting Points - Nested */}
              <AnimatePresence>
                {settings.enablePowerUps && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-4 pt-2 border-l-2 border-purple-500/30">
                      <label htmlFor="starting-points" className="block text-[10px] sm:text-xs text-gray-400 font-semibold mb-1.5">
                        Starting Points
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          id="starting-points"
                          type="number"
                          min={0}
                          max={50}
                          value={settings.startingPowerUpPoints}
                          onChange={(e) => {
                            const value = Math.max(0, Math.min(50, Number(e.target.value) || 0));
                            onSettingsChange({ startingPowerUpPoints: value });
                          }}
                          disabled={disabled}
                          className="w-20 px-2 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-xs sm:text-sm
                                     focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50
                                     disabled:opacity-50 disabled:cursor-not-allowed
                                     transition-all duration-200"
                        />
                        <span className="text-[10px] sm:text-xs text-gray-500">
                          (0 = earn only)
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Theme Selector - Nested */}
              <AnimatePresence>
                {settings.enableThemes && onThemeSelect && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-4 pt-2 border-l-2 border-purple-500/30">
                      <label className="block text-[10px] sm:text-xs text-gray-400 font-semibold mb-2">
                        Select Party Theme
                      </label>
                      <ThemeSelector
                        themes={PARTY_THEMES}
                        selectedTheme={selectedThemeId ?? 'anything-goes'}
                        onSelect={onThemeSelect}
                        allowCustom={false}
                        disabled={disabled}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </motion.div>
  );
}
