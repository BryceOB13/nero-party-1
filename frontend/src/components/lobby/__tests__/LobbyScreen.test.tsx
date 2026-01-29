import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LobbyScreen } from '../LobbyScreen';
import { useGameStore } from '../../../store/gameStore';
import { socket } from '../../../lib/socket';
import { PartyStatus, PlayerStatus, DEFAULT_PARTY_SETTINGS } from '../../../types';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  forwardRef: (component: any) => component,
}));

describe('LobbyScreen', () => {
  beforeEach(() => {
    // Reset the store before each test
    useGameStore.setState({
      party: {
        id: 'test-party-id',
        code: 'ABCD',
        status: PartyStatus.LOBBY,
        hostId: 'host-player-id',
        settings: DEFAULT_PARTY_SETTINGS,
        createdAt: new Date(),
        startedAt: null,
        completedAt: null,
      },
      players: [
        {
          id: 'host-player-id',
          name: 'Host Player',
          avatarUrl: null,
          partyId: 'test-party-id',
          isHost: true,
          isReady: false,
          status: PlayerStatus.CONNECTED,
          socketId: 'socket-1',
          joinedAt: new Date(),
        },
        {
          id: 'player-2-id',
          name: 'Player Two',
          avatarUrl: null,
          partyId: 'test-party-id',
          isHost: false,
          isReady: false,
          status: PlayerStatus.CONNECTED,
          socketId: 'socket-2',
          joinedAt: new Date(),
        },
      ],
      currentPlayer: {
        id: 'host-player-id',
        name: 'Host Player',
        avatarUrl: null,
        partyId: 'test-party-id',
        isHost: true,
        isReady: false,
        status: PlayerStatus.CONNECTED,
        socketId: 'socket-1',
        joinedAt: new Date(),
      },
      gameState: PartyStatus.LOBBY,
    });
    
    vi.clearAllMocks();
  });

  it('should display the party code prominently', () => {
    render(<LobbyScreen />);
    
    expect(screen.getByText('ABCD')).toBeInTheDocument();
    // Compact layout shows "Code:" label instead of "Party Code"
    expect(screen.getByText('Code:')).toBeInTheDocument();
  });

  it('should display the list of joined players with real names', () => {
    render(<LobbyScreen />);
    
    expect(screen.getByText('Host Player')).toBeInTheDocument();
    expect(screen.getByText('Player Two')).toBeInTheDocument();
    // New layout shows "Players" header with count in separate badge
    expect(screen.getByText('Players')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should show host badge for the host player', () => {
    render(<LobbyScreen />);
    
    // Host badge appears in player list and settings section badge
    expect(screen.getAllByText('Host').length).toBeGreaterThan(0);
  });

  it('should show settings panel for host', () => {
    render(<LobbyScreen />);
    
    // Settings appear in collapsible section (may appear multiple times for mobile/desktop)
    expect(screen.getAllByText('Game Settings').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Songs Per Player').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Play Duration').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bonus Categories').length).toBeGreaterThan(0);
  });

  it('should show start button for host', () => {
    render(<LobbyScreen />);
    
    expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument();
  });

  it('should disable start button when player count < 3', () => {
    render(<LobbyScreen />);
    
    const startButton = screen.getByRole('button', { name: /start game/i });
    expect(startButton).toBeDisabled();
    expect(screen.getByText(/need 1 more player/i)).toBeInTheDocument();
  });

  it('should enable start button when player count >= 3', () => {
    useGameStore.setState({
      players: [
        ...useGameStore.getState().players,
        {
          id: 'player-3-id',
          name: 'Player Three',
          avatarUrl: null,
          partyId: 'test-party-id',
          isHost: false,
          isReady: false,
          status: PlayerStatus.CONNECTED,
          socketId: 'socket-3',
          joinedAt: new Date(),
        },
      ],
    });
    
    render(<LobbyScreen />);
    
    const startButton = screen.getByRole('button', { name: /start game/i });
    expect(startButton).not.toBeDisabled();
  });

  it('should emit lobby:start event when start button is clicked', () => {
    useGameStore.setState({
      players: [
        ...useGameStore.getState().players,
        {
          id: 'player-3-id',
          name: 'Player Three',
          avatarUrl: null,
          partyId: 'test-party-id',
          isHost: false,
          isReady: false,
          status: PlayerStatus.CONNECTED,
          socketId: 'socket-3',
          joinedAt: new Date(),
        },
      ],
    });
    
    render(<LobbyScreen />);
    
    const startButton = screen.getByRole('button', { name: /start game/i });
    fireEvent.click(startButton);
    
    expect(socket.emit).toHaveBeenCalledWith('lobby:start', {});
  });

  it('should show kick button for host on other players', () => {
    render(<LobbyScreen />);
    
    // There should be a kick button for Player Two (non-host)
    const kickButtons = screen.getAllByTitle('Kick player');
    expect(kickButtons.length).toBe(1);
  });

  it('should emit lobby:kick event when kick button is clicked', () => {
    render(<LobbyScreen />);
    
    const kickButton = screen.getByTitle('Kick player');
    fireEvent.click(kickButton);
    
    expect(socket.emit).toHaveBeenCalledWith('lobby:kick', { playerId: 'player-2-id' });
  });

  it('should not show settings panel for non-host players', () => {
    useGameStore.setState({
      currentPlayer: {
        id: 'player-2-id',
        name: 'Player Two',
        avatarUrl: null,
        partyId: 'test-party-id',
        isHost: false,
        isReady: false,
        status: PlayerStatus.CONNECTED,
        socketId: 'socket-2',
        joinedAt: new Date(),
      },
    });
    
    render(<LobbyScreen />);
    
    expect(screen.queryByText('Game Settings')).not.toBeInTheDocument();
    expect(screen.getByText('Waiting for Host')).toBeInTheDocument();
  });

  it('should not show start button for non-host players', () => {
    useGameStore.setState({
      currentPlayer: {
        id: 'player-2-id',
        name: 'Player Two',
        avatarUrl: null,
        partyId: 'test-party-id',
        isHost: false,
        isReady: false,
        status: PlayerStatus.CONNECTED,
        socketId: 'socket-2',
        joinedAt: new Date(),
      },
    });
    
    render(<LobbyScreen />);
    
    expect(screen.queryByRole('button', { name: /start game/i })).not.toBeInTheDocument();
    expect(screen.getByText(/waiting for the host to start/i)).toBeInTheDocument();
  });
});
