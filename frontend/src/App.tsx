import { useEffect, useState, useCallback } from 'react';
import { HomeScreen } from './components/home';
import { LobbyScreen } from './components/lobby';
import { SubmittingScreen } from './components/submitting';
import { PlayingScreen } from './components/playing';
import { FinaleScreen } from './components/finale';
import { ToastProvider, useToast, ErrorBoundary, ReconnectionIndicator } from './components/ui';
import { useGameStore } from './store/gameStore';
import { socket } from './lib/socket';
import { PartyStatus, Player, PartySettings } from './types';

/**
 * AppContent - Main application content with socket handling
 * 
 * Separated from App to allow useToast hook usage within ToastProvider
 */
function AppContent() {
  const { 
    gameState, 
    party,
    isConnected,
    setConnected, 
    setParty, 
    setPlayers, 
    addPlayer, 
    removePlayer, 
    setCurrentPlayer,
    updateSettings,
    setSongs
  } = useGameStore();

  const { showToast } = useToast();
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // Handle socket errors with toast notifications
  const handleSocketError = useCallback((error: { code?: string; message?: string }) => {
    showToast({
      type: 'error',
      message: error.message || 'Connection error occurred',
      duration: 5000,
    });
  }, [showToast]);

  useEffect(() => {
    // Socket event handlers
    socket.on('connect', () => {
      setConnected(true, socket.id ?? null);
      setIsReconnecting(false);
      
      // If we were in a party, try to reconnect to restore session
      const currentPlayer = useGameStore.getState().currentPlayer;
      if (currentPlayer) {
        // Re-authenticate to rejoin the party room
        socket.emit('connection:reconnect', { playerId: currentPlayer.id });
      }
      
      // Show success toast on reconnection
      if (reconnectAttempt > 0) {
        showToast({
          type: 'success',
          message: 'Connection restored!',
          duration: 3000,
        });
      }
      
      setReconnectAttempt(0);
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
      
      // Only show reconnection indicator for unexpected disconnects
      if (reason !== 'io client disconnect') {
        setIsReconnecting(true);
      }
    });

    // Handle reconnection attempts
    socket.io.on('reconnect_attempt', (attempt) => {
      setReconnectAttempt(attempt);
      setIsReconnecting(true);
    });

    socket.io.on('reconnect_failed', () => {
      setIsReconnecting(false);
      showToast({
        type: 'error',
        message: 'Failed to reconnect. Please refresh the page.',
        duration: 0, // Don't auto-dismiss
        action: {
          label: 'Refresh',
          onClick: () => window.location.reload(),
        },
      });
    });

    // Handle server-sent errors
    socket.on('error', handleSocketError);

    socket.on('connection:established', (data: { playerId: string; partyId: string; party: any; player: Player; players: Player[]; gameState?: any }) => {
      setParty(data.party);
      setCurrentPlayer(data.player);
      setPlayers(data.players);
      // If gameState is provided (reconnection), update songs
      if (data.gameState?.songs) {
        useGameStore.getState().setSongs(data.gameState.songs);
      }
      if (data.gameState?.status) {
        useGameStore.getState().setGameState(data.gameState.status);
      }
    });

    // Handle session restoration after reconnection
    socket.on('session:restored', (data: { playerId: string; partyId: string; party: any; player: Player; players: Player[]; gameState?: any }) => {
      setParty(data.party);
      setCurrentPlayer(data.player);
      setPlayers(data.players);
      // Restore game state including songs
      if (data.gameState?.songs) {
        useGameStore.getState().setSongs(data.gameState.songs);
      }
      if (data.gameState?.status) {
        useGameStore.getState().setGameState(data.gameState.status);
      }
    });

    // Handle identity assignment (triggers state change to SUBMITTING)
    socket.on('identity:assigned', (data: { yourIdentity: any; allAliases: string[] }) => {
      // Store the player's identity
      useGameStore.getState().setMyIdentity(data.yourIdentity);
    });

    socket.on('lobby:player_joined', (data: { player: Player }) => {
      addPlayer(data.player);
    });

    socket.on('lobby:player_left', (data: { playerId: string }) => {
      removePlayer(data.playerId);
    });

    socket.on('lobby:settings_updated', (data: { settings: PartySettings }) => {
      updateSettings(data.settings);
    });

    socket.on('state:changed', (data: { newState: PartyStatus; data?: { party?: any; players?: Player[]; songs?: any[]; frozenStandings?: any[] } }) => {
      const store = useGameStore.getState();
      
      // Update party first (but it will set gameState to party.status)
      if (data.data?.party) {
        store.setParty(data.data.party);
      }
      // Then override gameState with the new state (in case party.status wasn't updated yet)
      store.setGameState(data.newState);
      
      if (data.data?.players) {
        store.setPlayers(data.data.players);
      }
      // Update songs if provided (for state transitions)
      if (data.data?.songs) {
        store.setSongs(data.data.songs);
      }
      // Store frozen standings for FINALE (before FinaleScreen mounts)
      if (data.data?.frozenStandings) {
        store.setLeaderboard(data.data.frozenStandings);
      }
    });

    // Handle song submission broadcasts (global handler for all states)
    socket.on('submission:song_added', (data: { song: any }) => {
      const currentSongs = useGameStore.getState().songs;
      // Only add if we don't already have this song
      if (!currentSongs.some(s => s.id === data.song.id)) {
        useGameStore.getState().setSongs([...currentSongs, data.song]);
      }
    });

    socket.on('submission:song_removed', (data: { songId: string }) => {
      const currentSongs = useGameStore.getState().songs;
      useGameStore.getState().setSongs(currentSongs.filter(s => s.id !== data.songId));
    });

    // Connect socket
    socket.connect();

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('error');
      socket.off('connection:established');
      socket.off('session:restored');
      socket.off('identity:assigned');
      socket.off('lobby:player_joined');
      socket.off('lobby:player_left');
      socket.off('lobby:settings_updated');
      socket.off('state:changed');
      socket.off('submission:song_added');
      socket.off('submission:song_removed');
      socket.io.off('reconnect_attempt');
      socket.io.off('reconnect_failed');
      socket.disconnect();
    };
  }, [setConnected, setParty, setPlayers, addPlayer, removePlayer, setCurrentPlayer, updateSettings, setSongs, showToast, handleSocketError, reconnectAttempt]);

  // Render based on game state
  const renderScreen = () => {
    // Show home screen if not in a party yet
    if (!party) {
      return <HomeScreen />;
    }

    switch (gameState) {
      case PartyStatus.LOBBY:
        return <LobbyScreen />;
      case PartyStatus.SUBMITTING:
        return <SubmittingScreen />;
      case PartyStatus.PLAYING:
        return <PlayingScreen />;
      case PartyStatus.FINALE:
        return <FinaleScreen />;
      case PartyStatus.COMPLETE:
        return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Game Complete!</div>;
      default:
        return <LobbyScreen />;
    }
  };

  return (
    <>
      <ReconnectionIndicator 
        isVisible={!isConnected && isReconnecting}
        isReconnecting={isReconnecting}
        attemptCount={reconnectAttempt}
      />
      {renderScreen()}
    </>
  );
}

/**
 * App - Root application component
 * 
 * Wraps the application with:
 * - ErrorBoundary for catching React errors
 * - ToastProvider for toast notifications
 */
function App() {
  return (
    <ErrorBoundary>
      <ToastProvider maxToasts={5}>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
