import { create } from 'zustand';
import { Party, Player, PartyIdentity, Song, Vote, PartyStatus, BonusResult, FinalStanding, LeaderboardEntry, PartySettings } from '../types';

interface GameStore {
  // Connection
  isConnected: boolean;
  socketId: string | null;
  
  // Party state
  party: Party | null;
  gameState: PartyStatus;
  players: Player[];
  currentPlayer: Player | null;
  
  // Identity
  myIdentity: PartyIdentity | null;
  identities: Map<string, PartyIdentity>;
  
  // Gameplay
  currentSong: Song | null;
  songs: Song[];
  rounds: { roundNumber: number; songs: Song[]; weightMultiplier: number; isComplete: boolean }[];
  currentRound: number;
  
  // Voting
  myVotes: Map<string, Vote>;
  voteProgress: Map<string, number>;
  
  // Finale
  bonusResults: BonusResult[];
  finalStandings: FinalStanding[];
  revealProgress: number;
  leaderboard: LeaderboardEntry[];
  
  // Actions
  setConnected: (connected: boolean, socketId?: string | null) => void;
  setParty: (party: Party | null) => void;
  setGameState: (state: PartyStatus) => void;
  setPlayers: (players: Player[]) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  setCurrentPlayer: (player: Player | null) => void;
  setMyIdentity: (identity: PartyIdentity | null) => void;
  setIdentities: (identities: PartyIdentity[]) => void;
  updateSettings: (settings: Partial<PartySettings>) => void;
  setCurrentSong: (song: Song | null) => void;
  setSongs: (songs: Song[]) => void;
  setLeaderboard: (leaderboard: LeaderboardEntry[]) => void;
  castVote: (songId: string, rating: number) => void;
  updateVoteProgress: (songId: string, count: number) => void;
  setBonusResults: (results: BonusResult[]) => void;
  setFinalStandings: (standings: FinalStanding[]) => void;
  setRevealProgress: (progress: number) => void;
  reset: () => void;
}

const initialState = {
  isConnected: false,
  socketId: null,
  party: null,
  gameState: PartyStatus.LOBBY,
  players: [],
  currentPlayer: null,
  myIdentity: null,
  identities: new Map<string, PartyIdentity>(),
  currentSong: null,
  songs: [],
  rounds: [],
  currentRound: 1,
  myVotes: new Map<string, Vote>(),
  voteProgress: new Map<string, number>(),
  bonusResults: [],
  finalStandings: [],
  revealProgress: 0,
  leaderboard: [],
};

export const useGameStore = create<GameStore>((set, _get) => ({
  ...initialState,
  
  setConnected: (connected, socketId = null) => set({ isConnected: connected, socketId }),
  
  setParty: (party) => set({ party, gameState: party?.status ?? PartyStatus.LOBBY }),
  
  setGameState: (state) => set({ gameState: state }),
  
  setPlayers: (players) => set((state) => {
    // Also update currentPlayer if it exists in the new players array
    const updatedCurrentPlayer = state.currentPlayer 
      ? players.find(p => p.id === state.currentPlayer?.id) ?? state.currentPlayer
      : null;
    return { players, currentPlayer: updatedCurrentPlayer };
  }),
  
  addPlayer: (player) => set((state) => ({
    players: [...state.players.filter(p => p.id !== player.id), player]
  })),
  
  removePlayer: (playerId) => set((state) => ({
    players: state.players.filter(p => p.id !== playerId)
  })),
  
  updatePlayer: (playerId, updates) => set((state) => ({
    players: state.players.map(p => p.id === playerId ? { ...p, ...updates } : p)
  })),
  
  setCurrentPlayer: (player) => set({ currentPlayer: player }),
  
  setMyIdentity: (identity) => set({ myIdentity: identity }),
  
  setIdentities: (identities) => {
    const identityMap = new Map<string, PartyIdentity>();
    identities.forEach(identity => {
      identityMap.set(identity.playerId, identity);
    });
    set({ identities: identityMap });
  },
  
  updateSettings: (settings) => set((state) => {
    if (!state.party) return state;
    return {
      party: {
        ...state.party,
        settings: { ...state.party.settings, ...settings }
      }
    };
  }),
  
  setCurrentSong: (song) => set({ currentSong: song }),
  
  setSongs: (songs) => set({ songs }),
  
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  
  castVote: (songId, rating) => set((state) => {
    const newVotes = new Map(state.myVotes);
    const existingVote = newVotes.get(songId);
    if (existingVote) {
      newVotes.set(songId, { ...existingVote, rating });
    } else {
      newVotes.set(songId, {
        id: `temp-${songId}`,
        songId,
        voterId: state.currentPlayer?.id ?? '',
        rating,
        isLocked: false,
        votedAt: new Date(),
        lockedAt: null,
        superVote: false,
        comment: null
      });
    }
    return { myVotes: newVotes };
  }),
  
  updateVoteProgress: (songId, count) => set((state) => {
    const newProgress = new Map(state.voteProgress);
    newProgress.set(songId, count);
    return { voteProgress: newProgress };
  }),
  
  setBonusResults: (results) => set({ bonusResults: results }),
  
  setFinalStandings: (standings) => set({ finalStandings: standings }),
  
  setRevealProgress: (progress) => set({ revealProgress: progress }),
  
  reset: () => set(initialState),
}));
