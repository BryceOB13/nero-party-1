import { useState, useEffect, useCallback, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { socket } from '../../lib/socket';
import { Song, LeaderboardEntry, RoundTheme, PartyTheme, PARTY_THEMES } from '../../types';
import { CurrentSongDisplay } from './CurrentSongDisplay';
import { SoundCloudPlayer } from './SoundCloudPlayer';
import { VotingSlider } from './VotingSlider';
import { ThemeAdherenceSlider } from './ThemeAdherenceSlider';
import { Leaderboard } from './Leaderboard';
import { RoundProgress } from './RoundProgress';
import { RoundThemeBanner } from './RoundThemeBanner';
import { CompactLayout } from '../ui/CompactLayout';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import TimelineIcon from '@mui/icons-material/Timeline';

interface RoundInfo {
  roundNumber: number;
  totalRounds: number;
  songInRound: number;
  totalSongsInRound: number;
  weightMultiplier: number;
}

interface SongStartEvent {
  song: Song;
  roundInfo: RoundInfo;
}

interface VotesUpdatedEvent {
  songId: string;
  voteCount: number;
}

interface ResultsEvent {
  songResults: {
    songId: string;
    rawAverage: number;
    weightedScore: number;
    finalScore: number;
  };
  standings: LeaderboardEntry[];
}

/**
 * PlayingScreen - Compact playing interface with two-column layout
 * 
 * Layout:
 * - Uses CompactLayout for 100vh constraint with no body scroll
 * - Two-column layout: player/voting on left, leaderboard/progress on right
 * - Dockable overlay container for events and power-ups
 * - Internal scrolling for leaderboard
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
export function PlayingScreen() {
  const { 
    party, 
    currentPlayer, 
    currentSong, 
    setCurrentSong,
    myIdentity,
    leaderboard,
    setLeaderboard,
    myVotes,
    castVote,
    updateVoteProgress,
  } = useGameStore();

  const [roundInfo, setRoundInfo] = useState<RoundInfo>({
    roundNumber: 1,
    totalRounds: party?.settings.songsPerPlayer ?? 2,
    songInRound: 1,
    totalSongsInRound: 3,
    weightMultiplier: 1.0,
  });

  const [currentVote, setCurrentVote] = useState(5);
  const [isVoteLocked, setIsVoteLocked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Theme adherence state (Requirements 22.8, 8.1, 8.2)
  const [themeAdherence, setThemeAdherence] = useState(0);
  
  // Theme state for round and party themes (Requirements 22.2, 3.3, 3.4)
  const [currentRoundTheme, setCurrentRoundTheme] = useState<RoundTheme | null>(null);
  const [currentPartyTheme, setCurrentPartyTheme] = useState<PartyTheme | null>(null);
  
  // Overlay state for events and power-ups (Requirements 4.3, 4.5)
  // Note: setActiveOverlay will be used by event/power-up socket handlers in future phases
  const [activeOverlay, setActiveOverlay] = useState<ReactNode | null>(null);
  
  // Expose setActiveOverlay for future event/power-up integration
  // This will be called by socket event handlers when mini-events or power-ups trigger
  void setActiveOverlay; // Suppress unused warning until event system is integrated

  // Check if current song is the player's own song
  const isOwnSong = currentSong?.submitterId === currentPlayer?.id;

  // Get current vote for this song if exists
  const existingVote = currentSong ? myVotes.get(currentSong.id) : null;

  // Reset vote state when song changes
  useEffect(() => {
    if (currentSong) {
      if (existingVote) {
        setCurrentVote(existingVote.rating);
        setIsVoteLocked(existingVote.isLocked);
      } else {
        setCurrentVote(5);
        setIsVoteLocked(false);
      }
      // Reset theme adherence when song changes
      setThemeAdherence(0);
    }
  }, [currentSong?.id, existingVote]);

  // Handle vote change
  const handleVoteChange = useCallback((rating: number) => {
    if (!currentSong || isVoteLocked || isOwnSong) return;
    
    setCurrentVote(rating);
    castVote(currentSong.id, rating);
    
    // Emit vote to server
    socket.emit('playing:vote', { songId: currentSong.id, rating });
  }, [currentSong, isVoteLocked, isOwnSong, castVote]);

  // Handle vote lock
  const handleLockVote = useCallback(() => {
    if (!currentSong || isVoteLocked || isOwnSong) return;
    
    setIsVoteLocked(true);
    
    // Emit lock to server
    socket.emit('playing:lock_vote', { songId: currentSong.id });
  }, [currentSong, isVoteLocked, isOwnSong]);

  // Handle theme adherence change (Requirements 22.8, 8.1, 8.2)
  const handleThemeAdherenceChange = useCallback((rating: number) => {
    if (!currentSong || isVoteLocked || isOwnSong) return;
    
    setThemeAdherence(rating);
    
    // Emit theme adherence vote to server
    socket.emit('theme:adherence_vote', { songId: currentSong.id, rating });
  }, [currentSong, isVoteLocked, isOwnSong]);

  // Socket event handlers
  useEffect(() => {
    const handleSongStart = (data: SongStartEvent) => {
      setCurrentSong(data.song);
      if (data.roundInfo) {
        setRoundInfo(data.roundInfo);
      }
      setIsVoteLocked(false);
      setCurrentVote(5);
    };

    const handleSongUpcoming = (data: SongStartEvent) => {
      // Preview of upcoming song - could show notification
      void data;
    };

    const handleVotesUpdated = (data: VotesUpdatedEvent) => {
      updateVoteProgress(data.songId, data.voteCount);
    };

    const handleResults = (data: ResultsEvent) => {
      setLeaderboard(data.standings);
    };

    socket.on('playing:song_start', handleSongStart);
    socket.on('playing:song_upcoming', handleSongUpcoming);
    socket.on('playing:votes_updated', handleVotesUpdated);
    socket.on('playing:results', handleResults);

    return () => {
      socket.off('playing:song_start', handleSongStart);
      socket.off('playing:song_upcoming', handleSongUpcoming);
      socket.off('playing:votes_updated', handleVotesUpdated);
      socket.off('playing:results', handleResults);
    };
  }, [setCurrentSong, setLeaderboard, updateVoteProgress]);

  // Theme socket event handlers (Requirements 22.2, 3.3, 3.4)
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

  // Playback event handlers
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleFinish = useCallback(() => {
    setIsPlaying(false);
    // Auto-lock vote when song finishes if not already locked
    if (!isVoteLocked && !isOwnSong && currentSong) {
      handleLockVote();
    }
  }, [isVoteLocked, isOwnSong, currentSong, handleLockVote]);

  // Header component with title
  const header = (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-2 sm:py-3 px-3 sm:px-4"
    >
      <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
        Now Playing
      </h1>
      <p className="text-gray-400 mt-0.5 text-xs sm:text-sm">
        Listen and rate each song!
      </p>
    </motion.div>
  );

  // Footer component with playing status indicator
  const footer = isPlaying ? (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-2 sm:py-3 px-3 sm:px-4 flex justify-center"
    >
      <div className="px-4 sm:px-6 py-1.5 sm:py-2 rounded-full bg-green-500/20 border border-green-500/30 backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-3">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500"
          />
          <span className="text-green-400 font-medium text-xs sm:text-sm">Playing</span>
        </div>
      </div>
    </motion.div>
  ) : null;

  // Overlay content for events and power-ups (Requirements 4.3, 4.5)
  const overlayContent = activeOverlay ? (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-lg"
      >
        {activeOverlay}
      </motion.div>
    </div>
  ) : null;

  return (
    <CompactLayout
      header={header}
      footer={footer}
      overlay={overlayContent}
      background="gradient"
      withOrbs={true}
      contentClassName="max-w-7xl mx-auto"
    >
      {/* Two-column split layout - Requirements 4.1, 4.2 */}
      <div className="playing-split-layout flex-fill min-h-0">
        {/* Left Column - Player info and voting controls (Requirement 4.1) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="playing-left-column flex flex-col min-h-0 gap-3 sm:gap-4"
        >
          {/* Round Theme Banner - Requirements 22.2, 3.3, 3.4 */}
          {currentRoundTheme && (
            <div className="flex-shrink-0">
              <RoundThemeBanner
                theme={currentRoundTheme}
                partyTheme={currentPartyTheme ?? undefined}
                compact={true}
              />
            </div>
          )}

          {/* Current Song Display */}
          <div className="flex-shrink-0">
            <CurrentSongDisplay
              song={currentSong}
              roundNumber={roundInfo.roundNumber}
              totalRounds={roundInfo.totalRounds}
              weightMultiplier={roundInfo.weightMultiplier}
            />
          </div>

          {/* SoundCloud Player */}
          <div className="flex-shrink-0">
            <SoundCloudPlayer
              song={currentSong}
              autoPlay={true}
              onPlay={handlePlay}
              onPause={handlePause}
              onFinish={handleFinish}
            />
          </div>

          {/* Voting Slider */}
          <div className="flex-shrink-0">
            <VotingSlider
              value={currentVote}
              onChange={handleVoteChange}
              onLock={handleLockVote}
              isLocked={isVoteLocked}
              isOwnSong={isOwnSong}
              disabled={!currentSong}
            />
          </div>

          {/* Theme Adherence Slider - Requirements 22.8, 8.1, 8.2 */}
          {currentRoundTheme && !isOwnSong && (
            <div className="flex-shrink-0">
              <ThemeAdherenceSlider
                value={themeAdherence}
                onChange={handleThemeAdherenceChange}
                disabled={!currentSong || isVoteLocked}
                themeName={currentRoundTheme.name}
                compact={true}
              />
            </div>
          )}
          
          {/* Spacer to push content up on desktop */}
          <div className="hidden lg:block flex-fill" />
        </motion.div>

        {/* Right Column - Leaderboard and round progress (Requirement 4.2) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="playing-right-column flex flex-col min-h-0 gap-3 sm:gap-4"
        >
          {/* Round Progress - Fixed height */}
          <div className="flex-shrink-0">
            <CollapsibleSection
              title="Round Progress"
              icon={<TimelineIcon fontSize="small" />}
              defaultOpen={true}
              collapsible={false}
            >
              <RoundProgress
                currentRound={roundInfo.roundNumber}
                totalRounds={roundInfo.totalRounds}
                currentSongInRound={roundInfo.songInRound}
                totalSongsInRound={roundInfo.totalSongsInRound}
                weightMultiplier={roundInfo.weightMultiplier}
                compact
              />
            </CollapsibleSection>
          </div>

          {/* Leaderboard - Scrollable, fills remaining space */}
          <div className="flex-fill min-h-0 flex flex-col">
            <CollapsibleSection
              title="Leaderboard"
              icon={<LeaderboardIcon fontSize="small" />}
              defaultOpen={true}
              badge={
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                  {leaderboard.length}
                </span>
              }
              className="flex-fill min-h-0 flex flex-col"
              contentClassName="flex-fill min-h-0"
            >
              <div className="scroll-container scrollbar-thin h-full">
                <Leaderboard
                  entries={leaderboard}
                  currentPlayerAlias={myIdentity?.alias ?? null}
                  showScores={true}
                  compact
                />
              </div>
            </CollapsibleSection>
          </div>
        </motion.div>
      </div>

      {/* Mobile-only: Collapsible leaderboard at bottom */}
      <div className="lg:hidden mt-3">
        <CollapsibleSection
          title="Leaderboard"
          icon={<LeaderboardIcon fontSize="small" />}
          defaultOpen={false}
          badge={
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
              {leaderboard.length}
            </span>
          }
        >
          <div className="max-h-48 scroll-container scrollbar-thin">
            <Leaderboard
              entries={leaderboard}
              currentPlayerAlias={myIdentity?.alias ?? null}
              showScores={true}
              compact
            />
          </div>
        </CollapsibleSection>
      </div>
    </CompactLayout>
  );
}
