import { useState, Suspense } from 'react';
import { useGameStore } from '../../store/gameStore';
import { socket } from '../../lib/socket';
import { JoinCodeDisplay } from './JoinCodeDisplay';
import { PlayerList } from './PlayerList';
import { ThemeSelector } from './ThemeSelector';
import { SettingsModal } from './SettingsModal';
import { NeroLogo, CompactLayout } from '../ui';
import { PartySettings, PARTY_THEMES } from '../../types';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import GroupIcon from '@mui/icons-material/Group';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsIcon from '@mui/icons-material/Settings';
import PaletteIcon from '@mui/icons-material/Palette';

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full border-3 border-purple-500/30 border-t-purple-500 animate-spin" />
        <p className="text-gray-400 text-sm">Loading lobby...</p>
      </div>
    </div>
  );
}

// Main lobby content
function LobbyContent() {
  const { party, players, currentPlayer } = useGameStore();
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>('anything-goes');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const isHost = currentPlayer?.isHost ?? false;
  const partyCode = party?.code ?? '----';
  const settings = party?.settings;

  const handleSettingsChange = (newSettings: Partial<PartySettings>) => {
    socket.emit('lobby:settings_updated', { settings: newSettings });
  };

  const handleThemeSelect = (themeId: string) => {
    setSelectedThemeId(themeId);
    socket.emit('theme:party_set', { themeId });
  };

  const handleKickPlayer = (playerId: string) => {
    socket.emit('lobby:kick', { playerId });
  };

  const handleStartGame = () => {
    socket.emit('lobby:start', {});
  };

  // Header component
  const header = (
    <div className="px-4 pt-4 pb-3 text-center border-b border-white/10 flex-shrink-0">
      <NeroLogo className="mx-auto w-28 sm:w-32 h-auto mb-2" width={128} height={36} />
      <JoinCodeDisplay code={partyCode} compact />
    </div>
  );

  // Footer component
  const footer = (
    <div className="px-4 py-3 border-t border-white/10 bg-black/20 backdrop-blur-sm flex items-center justify-between gap-3 flex-shrink-0">
      <button
        onClick={() => window.history.back()}
        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all duration-150"
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}
      >
        <ArrowBackIcon fontSize="small" />
      </button>
      {isHost ? (
        <button
          onClick={handleStartGame}
          disabled={players.length < 3}
          className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm
                     bg-gradient-to-r from-green-600 to-emerald-600 text-white
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-150"
          style={{ boxShadow: '0 4px 20px rgba(34, 197, 94, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)' }}
        >
          Start Game
        </button>
      ) : (
        <div className="flex-1 text-center text-xs text-gray-400">
          Waiting for host...
        </div>
      )}
    </div>
  );

  return (
    <CompactLayout
      header={header}
      footer={footer}
      background="gradient"
      withOrbs={true}
      contentClassName="animate-fadeIn"
    >
      {/* Main Content - Two Panel Layout */}
      <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">
        {/* Left Panel: Theme Selector */}
        <div className="hidden lg:flex lg:w-80 flex-col min-h-0 p-4 rounded-2xl glass-panel overflow-hidden">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2 flex-shrink-0">
            <PaletteIcon sx={{ fontSize: 18 }} className="text-purple-400" />
            Pick Your Vibe
          </h3>
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
            {settings?.enableThemes ? (
              <ThemeSelector
                themes={PARTY_THEMES}
                selectedTheme={selectedThemeId ?? 'anything-goes'}
                onSelect={handleThemeSelect}
                allowCustom={false}
                disabled={!isHost}
              />
            ) : (
              <div className="text-xs text-gray-400 text-center py-8">
                Enable themes in settings to customize
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Players + Settings Button */}
        <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
          {/* Settings Button (Host Only) */}
          {isHost && settings && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-full p-4 rounded-2xl glass-panel hover:bg-white/10 hover:border-purple-500/30 transition-all duration-150 flex items-center justify-between flex-shrink-0"
            >
              <div className="flex items-center gap-3">
                <SettingsIcon className="text-purple-400" sx={{ fontSize: 24 }} />
                <div className="text-left">
                  <h3 className="text-sm font-semibold text-white">Game Settings</h3>
                  <p className="text-xs text-gray-400">
                    {settings.songsPerPlayer} songs, {settings.playDuration}s play time
                  </p>
                </div>
              </div>
              <span className="text-gray-400 text-xs">Tap to edit</span>
            </button>
          )}

          {/* Non-host waiting message */}
          {!isHost && (
            <div className="p-4 rounded-2xl glass-panel flex items-center gap-3 flex-shrink-0">
              <HourglassEmptyIcon className="text-purple-400" sx={{ fontSize: 24 }} />
              <div>
                <h3 className="text-sm font-semibold text-white">Waiting for Host</h3>
                <p className="text-xs text-gray-400">Host is configuring game settings</p>
              </div>
            </div>
          )}

          {/* Players Panel */}
          <div className="flex-1 min-h-0 p-4 rounded-2xl glass-panel flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <GroupIcon fontSize="small" className="text-purple-400" />
                Players
              </h3>
              <span className="text-xs text-gray-400 bg-white/10 px-2 py-1 rounded-full"
                    style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}>
                {players.length}
              </span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
              <PlayerList
                players={players}
                currentPlayerId={currentPlayer?.id ?? null}
                isHost={isHost}
                onKick={isHost ? handleKickPlayer : undefined}
              />
            </div>
          </div>

          {/* Mobile Theme Selector */}
          <div className="lg:hidden p-4 rounded-2xl glass-panel flex-shrink-0">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <PaletteIcon sx={{ fontSize: 18 }} className="text-purple-400" />
              Pick Your Vibe
            </h3>
            {settings?.enableThemes ? (
              <ThemeSelector
                themes={PARTY_THEMES}
                selectedTheme={selectedThemeId ?? 'anything-goes'}
                onSelect={handleThemeSelect}
                allowCustom={false}
                disabled={!isHost}
              />
            ) : (
              <div className="text-xs text-gray-400 text-center py-4">
                Enable themes in settings
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {settings && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSettingsChange={handleSettingsChange}
          disabled={!isHost}
        />
      )}
    </CompactLayout>
  );
}

export function LobbyScreen() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <LobbyContent />
    </Suspense>
  );
}
