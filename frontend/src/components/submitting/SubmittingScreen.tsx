import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { socket } from '../../lib/socket';
import { SoundCloudTrack, Song, RoundTheme, PartyTheme, PARTY_THEMES } from '../../types';
import { SongSearch } from './SongSearch';
import { ConfidenceSlider } from './ConfidenceSlider';
import { SubmissionList } from './SubmissionList';
import { SubmitButton } from './SubmitButton';
import { CompactLayout } from '../ui/CompactLayout';
import { RoundThemeBanner } from '../playing/RoundThemeBanner';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StyleIcon from '@mui/icons-material/Style';

/**
 * SubmittingScreen - Refactored for split layout with 100vh constraint
 * 
 * Features:
 * - Two-column layout: search on left, submissions on right
 * - Internal scrolling for search results and submissions
 * - 100vh constraint via CompactLayout (no body scroll)
 * - Mobile-first responsive design
 * - Round theme banner display (Requirements 3.3, 3.4)
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
export function SubmittingScreen() {
  const { party, players, currentPlayer, songs, setSongs } = useGameStore();
  
  const [selectedTrack, setSelectedTrack] = useState<SoundCloudTrack | null>(null);
  const [confidence, setConfidence] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Theme state for round and party themes (Requirements 3.3, 3.4)
  const [currentRoundTheme, setCurrentRoundTheme] = useState<RoundTheme | null>(null);
  const [currentPartyTheme, setCurrentPartyTheme] = useState<PartyTheme | null>(null);

  const songsPerPlayer = party?.settings.songsPerPlayer ?? 2;
  const mySongs = songs.filter(song => song.submitterId === currentPlayer?.id);
  const hasReachedLimit = mySongs.length >= songsPerPlayer;

  // Listen for song submission events (submitter-specific handling)
  useEffect(() => {
    // Handle successful submission (for the submitter - has full song with submitterId)
    const handleSubmissionSuccess = (data: { song: Song }) => {
      const currentSongs = useGameStore.getState().songs;
      // Replace partial song if exists, or add new
      const existing = currentSongs.find(s => s.id === data.song.id);
      if (existing) {
        setSongs(currentSongs.map(s => s.id === data.song.id ? data.song : s));
      } else {
        setSongs([...currentSongs, data.song]);
      }
    };

    socket.on('submission:success', handleSubmissionSuccess);

    return () => {
      socket.off('submission:success', handleSubmissionSuccess);
    };
  }, [setSongs]);

  // Theme socket event handlers (Requirements 3.3, 3.4)
  useEffect(() => {
    // Handle round theme reveal
    const handleRoundThemeRevealed = (data: { roundId: string; roundNumber: number; theme: RoundTheme }) => {
      setCurrentRoundTheme(data.theme);
    };

    // Handle party theme set
    const handlePartyThemeSet = (data: { themeId: string; theme: PartyTheme }) => {
      setCurrentPartyTheme(data.theme);
    };

    socket.on('theme:round_revealed', handleRoundThemeRevealed);
    socket.on('theme:party_set', handlePartyThemeSet);

    return () => {
      socket.off('theme:round_revealed', handleRoundThemeRevealed);
      socket.off('theme:party_set', handlePartyThemeSet);
    };
  }, []);

  // Initialize party theme from party settings if available
  useEffect(() => {
    if (party && (party as unknown as { partyThemeId?: string }).partyThemeId) {
      const partyThemeId = (party as unknown as { partyThemeId?: string }).partyThemeId;
      const theme = PARTY_THEMES.find(t => t.id === partyThemeId);
      if (theme) {
        setCurrentPartyTheme(theme);
      }
    }
  }, [party]);

  const handleSubmit = async () => {
    if (!selectedTrack || !currentPlayer || hasReachedLimit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Emit submission event
      socket.emit('submission:submit', {
        soundcloudData: selectedTrack,
        confidence,
      });

      // Clear selection after successful submission
      setSelectedTrack(null);
      setConfidence(3);
    } catch (err) {
      setError('Failed to submit song. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveSong = (songId: string) => {
    socket.emit('submission:remove', { songId });
  };

  const handleReady = () => {
    socket.emit('submission:ready', {});
  };

  // Header component for CompactLayout
  const header = (
    <div className="text-center py-2 px-3">
      <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
        Submit Your Songs
      </h1>
      <p className="text-gray-400 text-xs">
        Choose {songsPerPlayer} song{songsPerPlayer > 1 ? 's' : ''} to submit to the party
      </p>
    </div>
  );

  // Footer component for Ready button (when all songs submitted)
  const footer = hasReachedLimit ? (
    <div className="py-2 px-3 bg-gray-900/80 border-t border-white/10">
      <button
        type="button"
        onClick={handleReady}
        className="w-full max-w-md mx-auto block py-2.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all duration-200"
      >
        <span className="flex items-center justify-center gap-2">
          <CheckCircleIcon sx={{ fontSize: 18 }} />
          I'm Ready!
        </span>
      </button>
    </div>
  ) : null;

  return (
    <CompactLayout
      header={header}
      footer={footer}
      background="gradient"
      withOrbs={true}
      contentClassName="max-w-7xl mx-auto"
    >
      {/* Error Display */}
      {error && (
        <div className="mb-2 p-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-center text-xs">
          {error}
        </div>
      )}

      {/* Round Theme Banner - Requirements 3.3, 3.4 */}
      {currentRoundTheme && (
        <div className="mb-2">
          <RoundThemeBanner
            theme={currentRoundTheme}
            partyTheme={currentPartyTheme ?? undefined}
            compact={true}
          />
        </div>
      )}

      {/* Party Theme Only Banner (when no round theme but party theme exists) */}
      {!currentRoundTheme && currentPartyTheme && currentPartyTheme.id !== 'anything-goes' && (
        <div className="mb-2 p-2 rounded-xl bg-cyan-500/10 border border-cyan-400/20 flex items-center gap-2">
          <StyleIcon className="text-cyan-400" sx={{ fontSize: 20 }} />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-cyan-400">{currentPartyTheme.name}</span>
            <span className="text-xs text-gray-400 ml-2">{currentPartyTheme.description}</span>
          </div>
        </div>
      )}

      {/* Split Layout Container - Two columns on desktop, stacked on mobile */}
      <div className="submitting-split-layout flex-fill min-h-0">
        {/* Left Column - Song Search & Controls */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="submitting-search-column flex flex-col min-h-0 gap-3 sm:gap-4"
        >
          {/* Search Section with internal scroll */}
          <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-4 rounded-2xl glass-panel overflow-hidden">
            <SongSearch
              onSelectTrack={setSelectedTrack}
              selectedTrack={selectedTrack}
              disabled={hasReachedLimit}
            />
          </div>

          {/* Confidence Slider */}
          <div className="flex-shrink-0 p-3 sm:p-4 rounded-2xl glass-panel">
            <ConfidenceSlider
              value={confidence}
              onChange={setConfidence}
              disabled={hasReachedLimit || !selectedTrack}
            />
          </div>

          {/* Submit Button */}
          <div className="flex-shrink-0 p-3 sm:p-4 rounded-2xl glass-panel">
            <SubmitButton
              onSubmit={handleSubmit}
              disabled={!selectedTrack || hasReachedLimit}
              isSubmitting={isSubmitting}
              hasSelectedTrack={!!selectedTrack}
              currentSubmissions={mySongs.length}
              maxSubmissions={songsPerPlayer}
            />
          </div>
        </motion.div>

        {/* Right Column - Submission List with internal scroll */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="submitting-submissions-column flex flex-col min-h-0 mt-3 lg:mt-0"
        >
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
            <SubmissionList
              songs={songs}
              players={players}
              currentPlayerId={currentPlayer?.id ?? null}
              songsPerPlayer={songsPerPlayer}
              onRemoveSong={handleRemoveSong}
            />
          </div>
        </motion.div>
      </div>
    </CompactLayout>
  );
}
