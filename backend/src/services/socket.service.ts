import { Server, Socket } from 'socket.io';
import { prisma } from '../lib/prisma';
import { partyService } from './party.service';
import { identityService } from './identity.service';
import { songService } from './song.service';
import { scoringService } from './scoring.service';
import { themeService } from './theme.service';
import { achievementService } from './achievement.service';
import { eventService } from './event.service';
import { powerUpService } from './powerup.service';
import { predictionService } from './prediction.service';
import { soundcloudService } from './soundcloud.service';
import { Player, Party, PartyStatus, PlayerStatus, PartyIdentity, PartySettings, SoundCloudTrack, Song, SongScore, LeaderboardEntry, PartyTheme, RoundTheme, Achievement, PlayerAchievement, ACHIEVEMENTS, MiniEvent, ActiveEvent, EventEffectResult, EventTiming, PowerUp, PlayerPowerUp, PowerUpEffectResult, POWER_UPS, PredictionInput, RoundPrediction, PredictionResult } from '../types';

// Reconnection timeout in milliseconds (5 minutes)
const RECONNECTION_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * SocketService handles Socket.IO connection management, authentication,
 * and session restoration.
 * 
 * **Validates: Requirements 10.1, 10.2, 10.3**
 * - 10.1: WHEN a Player joins a Party, THE Backend SHALL establish a Socket.IO connection and store the socketId
 * - 10.2: WHEN a Player disconnects, THE Backend SHALL update their status to DISCONNECTED
 * - 10.3: WHEN a Player reconnects within 5 minutes, THE Backend SHALL restore their session
 */
export class SocketService {
  private io: Server | null = null;
  
  // Store disconnect timestamps for reconnection logic
  private disconnectTimestamps: Map<string, Date> = new Map();

  /**
   * Initialize the socket service with a Socket.IO server instance.
   * 
   * @param io - The Socket.IO server instance
   */
  initialize(io: Server): void {
    this.io = io;
  }

  /**
   * Get the Socket.IO server instance.
   * 
   * @returns The Socket.IO server instance
   * @throws Error if the service has not been initialized
   */
  getIO(): Server {
    if (!this.io) {
      throw new Error('SocketService has not been initialized');
    }
    return this.io;
  }

  /**
   * Handle a new socket connection.
   * This is called when a client connects to the Socket.IO server.
   * 
   * @param socket - The connected socket
   */
  async handleConnection(socket: Socket): Promise<void> {
    console.log('Client connected:', socket.id);
    
    // Set up event listeners for this socket
    this.setupSocketEventListeners(socket);
  }

  /**
   * Set up event listeners for a socket.
   * 
   * @param socket - The socket to set up listeners for
   */
  private setupSocketEventListeners(socket: Socket): void {
    // Handle authentication
    socket.on('connection:authenticate', async (data: { playerId: string; partyId: string }) => {
      await this.handleAuthenticate(socket, data);
    });

    // Handle reconnection
    socket.on('connection:reconnect', async (data: { playerId: string }) => {
      await this.handleReconnect(socket, data);
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      await this.handleDisconnect(socket);
    });

    // Handle theme:party_set - host sets party theme
    socket.on('theme:party_set', async (data: { themeId: string }) => {
      await this.handleThemePartySet(socket, data);
    });

    // Handle theme:round_revealed - round theme is announced
    socket.on('theme:round_revealed', async (data: { roundId: string; themeId: string }) => {
      await this.handleThemeRoundRevealed(socket, data);
    });

    // Handle theme:adherence_vote - player rates theme adherence
    socket.on('theme:adherence_vote', async (data: { voteId: string; rating: number }) => {
      await this.handleThemeAdherenceVote(socket, data);
    });

    // Handle powerup:purchase - player purchases a power-up
    socket.on('powerup:purchase', async (data: { powerUpId: string }) => {
      await this.handlePowerUpPurchase(socket, data);
    });

    // Handle powerup:use - player uses a power-up
    socket.on('powerup:use', async (data: { playerPowerUpId: string; targetId?: string; songId?: string }) => {
      await this.handlePowerUpUse(socket, data);
    });

    // Handle prediction:submit - player submits predictions for a round
    socket.on('prediction:submit', async (data: { roundNumber: number; predictions: PredictionInput[] }) => {
      await this.handlePredictionSubmit(socket, data);
    });
  }

  /**
   * Handle player authentication.
   * Validates the player exists and belongs to the party, stores socketId,
   * joins the socket to the party room, and emits connection:established.
   * 
   * **Validates: Requirements 10.1**
   * - 10.1: WHEN a Player joins a Party, THE Backend SHALL establish a Socket.IO connection and store the socketId
   * 
   * @param socket - The socket to authenticate
   * @param data - The authentication data containing playerId and partyId
   */
  async handleAuthenticate(
    socket: Socket,
    data: { playerId: string; partyId: string }
  ): Promise<void> {
    const { playerId, partyId } = data;

    try {
      // Validate player exists
      const player = await partyService.getPlayer(playerId);
      if (!player) {
        socket.emit('connection:error', {
          code: 'PLAYER_NOT_FOUND',
          message: 'Player does not exist'
        });
        return;
      }

      // Validate player belongs to the party
      if (player.partyId !== partyId) {
        socket.emit('connection:error', {
          code: 'INVALID_PARTY',
          message: 'Player does not belong to this party'
        });
        return;
      }

      // Validate party exists
      const party = await partyService.getParty(partyId);
      if (!party) {
        socket.emit('connection:error', {
          code: 'PARTY_NOT_FOUND',
          message: 'Party does not exist'
        });
        return;
      }

      // Store socketId in player record and update status to CONNECTED
      await prisma.player.update({
        where: { id: playerId },
        data: {
          socketId: socket.id,
          status: PlayerStatus.CONNECTED
        }
      });

      // Join socket to party room
      socket.join(`party:${partyId}`);

      // Get all players in the party
      const players = await partyService.getPlayers(partyId);

      // Get player's identity if assigned
      let identity: PartyIdentity | null = null;
      try {
        identity = await identityService.getIdentity(playerId);
      } catch {
        // Identity may not be assigned yet (in LOBBY state)
      }

      // Emit connection:established with player and party state
      socket.emit('connection:established', {
        playerId,
        partyId,
        player: {
          ...player,
          socketId: socket.id,
          status: PlayerStatus.CONNECTED
        },
        party,
        players,
        identity
      });

      // Notify other players in the party that this player connected
      socket.to(`party:${partyId}`).emit('player:connected', {
        playerId,
        playerName: player.name
      });

      console.log(`Player ${player.name} (${playerId}) authenticated and joined party ${party.code}`);
    } catch (error) {
      console.error('Error during authentication:', error);
      socket.emit('connection:error', {
        code: 'AUTHENTICATION_FAILED',
        message: 'Failed to authenticate'
      });
    }
  }

  /**
   * Handle player disconnect.
   * Updates player status to DISCONNECTED and stores disconnect timestamp.
   * 
   * **Validates: Requirements 10.2**
   * - 10.2: WHEN a Player disconnects, THE Backend SHALL update their status to DISCONNECTED
   * 
   * @param socket - The disconnected socket
   */
  async handleDisconnect(socket: Socket): Promise<void> {
    console.log('Client disconnected:', socket.id);

    try {
      // Find the player by socketId
      const playerRecord = await prisma.player.findFirst({
        where: { socketId: socket.id }
      });

      if (playerRecord) {
        // Store disconnect timestamp for reconnection logic
        this.disconnectTimestamps.set(playerRecord.id, new Date());

        // Update player status to DISCONNECTED
        await prisma.player.update({
          where: { id: playerRecord.id },
          data: {
            status: PlayerStatus.DISCONNECTED,
            socketId: null
          }
        });

        // Notify other players in the party
        const io = this.getIO();
        io.to(`party:${playerRecord.partyId}`).emit('player:disconnected', {
          playerId: playerRecord.id,
          playerName: playerRecord.name
        });

        console.log(`Player ${playerRecord.name} (${playerRecord.id}) disconnected`);
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  }

  /**
   * Handle player reconnection.
   * Restores session if player reconnects within 5 minutes of disconnect.
   * 
   * **Validates: Requirements 10.3**
   * - 10.3: WHEN a Player reconnects within 5 minutes, THE Backend SHALL restore their session
   * 
   * @param socket - The reconnecting socket
   * @param data - The reconnection data containing playerId
   */
  async handleReconnect(
    socket: Socket,
    data: { playerId: string }
  ): Promise<void> {
    const { playerId } = data;

    try {
      // Get the player
      const player = await partyService.getPlayer(playerId);
      if (!player) {
        socket.emit('connection:error', {
          code: 'PLAYER_NOT_FOUND',
          message: 'Player does not exist'
        });
        return;
      }

      // Check if player was disconnected
      if (player.status !== PlayerStatus.DISCONNECTED) {
        // Player is not disconnected, treat as regular authentication
        await this.handleAuthenticate(socket, { playerId, partyId: player.partyId });
        return;
      }

      // Check if reconnection is within 5 minutes
      const disconnectTime = this.disconnectTimestamps.get(playerId);
      const now = new Date();
      
      if (disconnectTime) {
        const timeSinceDisconnect = now.getTime() - disconnectTime.getTime();
        
        if (timeSinceDisconnect > RECONNECTION_TIMEOUT_MS) {
          socket.emit('connection:error', {
            code: 'SESSION_EXPIRED',
            message: 'Session has expired. Please rejoin the party.'
          });
          return;
        }
      }

      // Get the party
      const party = await partyService.getParty(player.partyId);
      if (!party) {
        socket.emit('connection:error', {
          code: 'PARTY_NOT_FOUND',
          message: 'Party does not exist'
        });
        return;
      }

      // Restore session: update status to CONNECTED and store new socketId
      await prisma.player.update({
        where: { id: playerId },
        data: {
          socketId: socket.id,
          status: PlayerStatus.CONNECTED
        }
      });

      // Clear disconnect timestamp
      this.disconnectTimestamps.delete(playerId);

      // Join socket to party room
      socket.join(`party:${player.partyId}`);

      // Get all players in the party
      const players = await partyService.getPlayers(player.partyId);

      // Get player's identity if assigned
      let identity: PartyIdentity | null = null;
      try {
        identity = await identityService.getIdentity(playerId);
      } catch {
        // Identity may not be assigned yet
      }

      // Get current game state based on party status
      const gameState = await this.getGameState(party);

      // Emit session:restored with full game state
      socket.emit('session:restored', {
        playerId,
        partyId: player.partyId,
        player: {
          ...player,
          socketId: socket.id,
          status: PlayerStatus.CONNECTED
        },
        party,
        players,
        identity,
        gameState
      });

      // Notify other players that this player reconnected
      socket.to(`party:${player.partyId}`).emit('player:reconnected', {
        playerId,
        playerName: player.name
      });

      console.log(`Player ${player.name} (${playerId}) reconnected to party ${party.code}`);
    } catch (error) {
      console.error('Error during reconnection:', error);
      socket.emit('connection:error', {
        code: 'RECONNECTION_FAILED',
        message: 'Failed to reconnect'
      });
    }
  }

  /**
   * Get the current game state for a party.
   * This is used when restoring a session to provide the reconnecting player
   * with the current state of the game.
   * 
   * @param party - The party to get game state for
   * @returns The current game state
   */
  private async getGameState(party: Party): Promise<{
    status: PartyStatus;
    currentRound?: number;
    currentSong?: any;
    songs?: any[];
    leaderboard?: any[];
  }> {
    const gameState: {
      status: PartyStatus;
      currentRound?: number;
      currentSong?: any;
      songs?: any[];
      leaderboard?: any[];
    } = {
      status: party.status
    };

    // Add additional state based on party status
    if (party.status === PartyStatus.SUBMITTING || 
        party.status === PartyStatus.PLAYING || 
        party.status === PartyStatus.FINALE) {
      // Get songs for the party
      const songs = await prisma.song.findMany({
        where: { partyId: party.id },
        orderBy: [
          { roundNumber: 'asc' },
          { queuePosition: 'asc' }
        ]
      });
      gameState.songs = songs;
    }

    if (party.status === PartyStatus.PLAYING || party.status === PartyStatus.FINALE) {
      // Get leaderboard
      try {
        const leaderboard = await identityService.getAnonymousLeaderboard(party.id);
        gameState.leaderboard = leaderboard;
      } catch {
        // Leaderboard may not be available yet
      }
    }

    return gameState;
  }

  /**
   * Update a player's socketId.
   * 
   * @param playerId - The player's ID
   * @param socketId - The new socket ID
   */
  async updatePlayerSocketId(playerId: string, socketId: string): Promise<void> {
    await prisma.player.update({
      where: { id: playerId },
      data: { socketId }
    });
  }

  /**
   * Get a player by their socket ID.
   * 
   * @param socketId - The socket ID to look up
   * @returns The player if found, null otherwise
   */
  async getPlayerBySocketId(socketId: string): Promise<Player | null> {
    const playerRecord = await prisma.player.findFirst({
      where: { socketId }
    });

    if (!playerRecord) {
      return null;
    }

    return {
      id: playerRecord.id,
      name: playerRecord.name,
      avatarUrl: playerRecord.avatarUrl,
      partyId: playerRecord.partyId,
      isHost: playerRecord.isHost,
      isReady: playerRecord.isReady,
      status: playerRecord.status as PlayerStatus,
      socketId: playerRecord.socketId,
      joinedAt: playerRecord.joinedAt
    };
  }

  /**
   * Check if a player can reconnect (within 5 minutes of disconnect).
   * 
   * @param playerId - The player's ID
   * @returns true if the player can reconnect, false otherwise
   */
  canReconnect(playerId: string): boolean {
    const disconnectTime = this.disconnectTimestamps.get(playerId);
    if (!disconnectTime) {
      return false;
    }

    const now = new Date();
    const timeSinceDisconnect = now.getTime() - disconnectTime.getTime();
    return timeSinceDisconnect <= RECONNECTION_TIMEOUT_MS;
  }

  /**
   * Get the time remaining for reconnection in milliseconds.
   * 
   * @param playerId - The player's ID
   * @returns The time remaining in milliseconds, or 0 if expired
   */
  getReconnectionTimeRemaining(playerId: string): number {
    const disconnectTime = this.disconnectTimestamps.get(playerId);
    if (!disconnectTime) {
      return 0;
    }

    const now = new Date();
    const timeSinceDisconnect = now.getTime() - disconnectTime.getTime();
    const timeRemaining = RECONNECTION_TIMEOUT_MS - timeSinceDisconnect;
    return Math.max(0, timeRemaining);
  }

  /**
   * Clear disconnect timestamp for a player.
   * Called when a player successfully reconnects or when their session expires.
   * 
   * @param playerId - The player's ID
   */
  clearDisconnectTimestamp(playerId: string): void {
    this.disconnectTimestamps.delete(playerId);
  }

  /**
   * Handle lobby:create event.
   * Creates a new party with the given host name, stores socketId, joins socket to party room,
   * and emits connection:established to the host.
   * 
   * @param socket - The socket making the request
   * @param data - The create data containing hostName and optional settings
   */
  async handleLobbyCreate(
    socket: Socket,
    data: { hostName: string; settings?: Partial<PartySettings> }
  ): Promise<void> {
    const { hostName, settings } = data;

    try {
      // Create the party
      const { party, host } = await partyService.createParty(hostName, settings);

      // Store socketId in host player record
      await prisma.player.update({
        where: { id: host.id },
        data: { socketId: socket.id }
      });

      // Join socket to party room
      socket.join(`party:${party.id}`);

      // Emit connection:established to the host
      socket.emit('connection:established', {
        playerId: host.id,
        partyId: party.id,
        player: {
          ...host,
          socketId: socket.id
        },
        party,
        players: [{ ...host, socketId: socket.id }]
      });

      console.log(`Party ${party.code} created by ${hostName} (${host.id})`);
    } catch (error: any) {
      console.error('Error during lobby:create:', error);
      socket.emit('lobby:error', {
        code: error.code || 'CREATE_FAILED',
        message: error.message || 'Failed to create party'
      });
    }
  }

  /**
   * Handle lobby:join event.
   * Joins a player to a party by code, stores socketId, joins socket to party room,
   * and broadcasts player_joined to the party.
   * 
   * **Validates: Requirements 1.7**
   * - 1.7: WHEN a Player joins or leaves a Party, THE Backend SHALL broadcast the updated player list to all connected Players
   * 
   * @param socket - The socket making the request
   * @param data - The join data containing code and name
   */
  async handleLobbyJoin(
    socket: Socket,
    data: { code: string; name: string }
  ): Promise<void> {
    const { code, name } = data;

    try {
      // Join the party
      const { party, player } = await partyService.joinParty(code, name);

      // Store socketId in player record
      await prisma.player.update({
        where: { id: player.id },
        data: { socketId: socket.id }
      });

      // Join socket to party room
      socket.join(`party:${party.id}`);

      // Get all players in the party
      const players = await partyService.getPlayers(party.id);

      // Emit connection:established to the joining player
      socket.emit('connection:established', {
        playerId: player.id,
        partyId: party.id,
        player: {
          ...player,
          socketId: socket.id
        },
        party,
        players
      });

      // Broadcast lobby:player_joined to all other players in the party
      socket.to(`party:${party.id}`).emit('lobby:player_joined', {
        player: {
          ...player,
          socketId: socket.id
        }
      });

      console.log(`Player ${name} (${player.id}) joined party ${code}`);
    } catch (error: any) {
      console.error('Error during lobby:join:', error);
      socket.emit('lobby:error', {
        code: error.code || 'JOIN_FAILED',
        message: error.message || 'Failed to join party'
      });
    }
  }

  /**
   * Handle lobby:settings_updated event.
   * Updates party settings and broadcasts the new settings to all players.
   * 
   * **Validates: Requirements 3.6**
   * - 3.6: WHEN settings are updated, THE Backend SHALL broadcast the new settings to all Players in the Party
   * 
   * @param socket - The socket making the request
   * @param data - The settings update data
   */
  async handleLobbySettingsUpdated(
    socket: Socket,
    data: { settings: Partial<PartySettings> }
  ): Promise<void> {
    const { settings } = data;

    try {
      // Get the player from socket
      const player = await this.getPlayerBySocketId(socket.id);
      if (!player) {
        socket.emit('lobby:error', {
          code: 'NOT_AUTHENTICATED',
          message: 'Player not authenticated'
        });
        return;
      }

      // Update settings
      const updatedParty = await partyService.updateSettings(
        player.partyId,
        player.id,
        settings
      );

      // Broadcast lobby:settings_updated to all players in the party
      this.broadcastToParty(player.partyId, 'lobby:settings_updated', {
        settings: updatedParty.settings
      });

      console.log(`Settings updated for party ${updatedParty.code} by ${player.name}`);
    } catch (error: any) {
      console.error('Error during lobby:settings_updated:', error);
      socket.emit('lobby:error', {
        code: error.code || 'SETTINGS_UPDATE_FAILED',
        message: error.message || 'Failed to update settings'
      });
    }
  }

  /**
   * Handle lobby:start event.
   * Starts the party, transitions to SUBMITTING state, assigns identities,
   * and broadcasts state:changed to all players.
   * 
   * @param socket - The socket making the request
   */
  async handleLobbyStart(socket: Socket): Promise<void> {
    try {
      // Get the player from socket
      const player = await this.getPlayerBySocketId(socket.id);
      if (!player) {
        socket.emit('lobby:error', {
          code: 'NOT_AUTHENTICATED',
          message: 'Player not authenticated'
        });
        return;
      }

      // Start the party (transitions to SUBMITTING state)
      const updatedParty = await partyService.startParty(player.partyId, player.id);

      // Get all players in the party
      const players = await partyService.getPlayers(player.partyId);

      // Assign identities to all players
      const identities = await identityService.assignIdentities(player.partyId, players);

      // Create a map of playerId to identity for easy lookup
      const identityMap = new Map(identities.map(i => [i.playerId, i]));

      // Get all aliases for broadcasting
      const allAliases = identities.map(i => i.alias);

      // Send identity:assigned to each player with their specific identity
      for (const p of players) {
        const identity = identityMap.get(p.id);
        if (p.socketId && identity) {
          this.sendToPlayer(p.socketId, 'identity:assigned', {
            yourIdentity: identity,
            allAliases
          });
        }
      }

      // Broadcast state:changed to all players in the party
      this.broadcastToParty(player.partyId, 'state:changed', {
        newState: PartyStatus.SUBMITTING,
        data: {
          party: updatedParty,
          players
        }
      });

      // Reveal round theme for the first round (Requirement 7.2)
      // Get a random round theme and broadcast it
      const roundTheme = themeService.getRandomRoundTheme();
      this.broadcastToParty(player.partyId, 'theme:round_revealed', {
        roundId: 'round-1',
        roundNumber: 1,
        theme: roundTheme
      });

      console.log(`Party ${updatedParty.code} started by ${player.name} with round theme "${roundTheme.name}"`);
    } catch (error: any) {
      console.error('Error during lobby:start:', error);
      socket.emit('lobby:error', {
        code: error.code || 'START_FAILED',
        message: error.message || 'Failed to start party'
      });
    }
  }

  /**
   * Handle lobby:kick event.
   * Kicks a player from the party, broadcasts player_left, and emits kicked to the kicked player.
   * 
   * **Validates: Requirements 1.7**
   * - 1.7: WHEN a Player joins or leaves a Party, THE Backend SHALL broadcast the updated player list to all connected Players
   * 
   * @param socket - The socket making the request
   * @param data - The kick data containing playerId
   */
  async handleLobbyKick(
    socket: Socket,
    data: { playerId: string }
  ): Promise<void> {
    const { playerId: targetPlayerId } = data;

    try {
      // Get the host player from socket
      const hostPlayer = await this.getPlayerBySocketId(socket.id);
      if (!hostPlayer) {
        socket.emit('lobby:error', {
          code: 'NOT_AUTHENTICATED',
          message: 'Player not authenticated'
        });
        return;
      }

      // Get the target player before kicking (to get their socketId)
      const targetPlayer = await partyService.getPlayer(targetPlayerId);
      if (!targetPlayer) {
        socket.emit('lobby:error', {
          code: 'TARGET_NOT_FOUND',
          message: 'Target player not found'
        });
        return;
      }

      const targetSocketId = targetPlayer.socketId;

      // Kick the player
      await partyService.kickPlayer(hostPlayer.partyId, hostPlayer.id, targetPlayerId);

      // Broadcast lobby:player_left to all players in the party
      this.broadcastToParty(hostPlayer.partyId, 'lobby:player_left', {
        playerId: targetPlayerId
      });

      // Emit kicked to the kicked player if they have a socket connection
      if (targetSocketId) {
        this.sendToPlayer(targetSocketId, 'kicked', {
          reason: 'You have been kicked from the party'
        });

        // Get the socket and make it leave the party room
        const io = this.getIO();
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
          targetSocket.leave(`party:${hostPlayer.partyId}`);
        }
      }

      console.log(`Player ${targetPlayer.name} (${targetPlayerId}) kicked from party by ${hostPlayer.name}`);
    } catch (error: any) {
      console.error('Error during lobby:kick:', error);
      socket.emit('lobby:error', {
        code: error.code || 'KICK_FAILED',
        message: error.message || 'Failed to kick player'
      });
    }
  }

  // ============================================================================
  // THEME EVENT HANDLERS
  // ============================================================================

  /**
   * Handle theme:party_set event.
   * Sets the party theme and broadcasts the theme to all players.
   * 
   * **Validates: Requirements 20.1**
   * - 20.1: THE Socket_System SHALL emit 'theme:party_set' when host sets party theme
   * 
   * @param socket - The socket making the request
   * @param data - The theme data containing themeId
   */
  async handleThemePartySet(
    socket: Socket,
    data: { themeId: string }
  ): Promise<void> {
    const { themeId } = data;

    try {
      // Get the player from socket
      const player = await this.getPlayerBySocketId(socket.id);
      if (!player) {
        socket.emit('theme:error', {
          code: 'NOT_AUTHENTICATED',
          message: 'Player not authenticated'
        });
        return;
      }

      // Verify player is the host
      if (!player.isHost) {
        socket.emit('theme:error', {
          code: 'NOT_HOST',
          message: 'Only the host can set the party theme'
        });
        return;
      }

      // Get the party to verify state
      const party = await partyService.getParty(player.partyId);
      if (!party) {
        socket.emit('theme:error', {
          code: 'PARTY_NOT_FOUND',
          message: 'Party does not exist'
        });
        return;
      }

      // Verify party is in LOBBY state (theme can only be set before game starts)
      if (party.status !== PartyStatus.LOBBY) {
        socket.emit('theme:error', {
          code: 'INVALID_STATE',
          message: 'Party theme can only be set during LOBBY phase'
        });
        return;
      }

      // Set the party theme
      await themeService.setPartyTheme(player.partyId, themeId);

      // Get the theme details to broadcast
      const theme = await themeService.getPartyTheme(themeId);

      // Requirement 20.1: Broadcast theme:party_set to all players in the party
      this.broadcastToParty(player.partyId, 'theme:party_set', {
        theme
      });

      // Emit success to the host
      socket.emit('theme:party_set_success', {
        themeId,
        theme
      });

      console.log(`Party theme set to "${theme?.name}" for party ${party.code} by ${player.name}`);
    } catch (error: any) {
      console.error('Error during theme:party_set:', error);
      socket.emit('theme:error', {
        code: error.code || 'THEME_SET_FAILED',
        message: error.message || 'Failed to set party theme'
      });
    }
  }

  /**
   * Handle theme:round_revealed event.
   * Assigns a round theme and broadcasts it to all players.
   * 
   * **Validates: Requirements 20.2**
   * - 20.2: THE Socket_System SHALL emit 'theme:round_revealed' when round theme is announced
   * 
   * @param socket - The socket making the request
   * @param data - The theme data containing roundId and themeId
   */
  async handleThemeRoundRevealed(
    socket: Socket,
    data: { roundId: string; themeId: string }
  ): Promise<void> {
    const { roundId, themeId } = data;

    try {
      // Get the player from socket
      const player = await this.getPlayerBySocketId(socket.id);
      if (!player) {
        socket.emit('theme:error', {
          code: 'NOT_AUTHENTICATED',
          message: 'Player not authenticated'
        });
        return;
      }

      // Verify player is the host
      if (!player.isHost) {
        socket.emit('theme:error', {
          code: 'NOT_HOST',
          message: 'Only the host can reveal round themes'
        });
        return;
      }

      // Get the party to verify state
      const party = await partyService.getParty(player.partyId);
      if (!party) {
        socket.emit('theme:error', {
          code: 'PARTY_NOT_FOUND',
          message: 'Party does not exist'
        });
        return;
      }

      // Assign the round theme
      await themeService.assignRoundTheme(roundId, themeId);

      // Get the theme details to broadcast
      const theme = await themeService.getRoundTheme(themeId);

      // Get the round details
      const round = await prisma.round.findUnique({
        where: { id: roundId }
      });

      // Requirement 20.2: Broadcast theme:round_revealed to all players in the party
      this.broadcastToParty(player.partyId, 'theme:round_revealed', {
        roundId,
        roundNumber: round?.roundNumber,
        theme
      });

      console.log(`Round theme "${theme?.name}" revealed for round ${round?.roundNumber} in party ${party.code}`);
    } catch (error: any) {
      console.error('Error during theme:round_revealed:', error);
      socket.emit('theme:error', {
        code: error.code || 'ROUND_THEME_FAILED',
        message: error.message || 'Failed to reveal round theme'
      });
    }
  }

  /**
   * Handle theme:adherence_vote event.
   * Records a player's theme adherence rating for a vote.
   * 
   * **Validates: Requirements 20.3**
   * - 20.3: THE Socket_System SHALL emit 'theme:adherence_vote' when player rates theme adherence
   * 
   * @param socket - The socket making the request
   * @param data - The vote data containing voteId and rating
   */
  async handleThemeAdherenceVote(
    socket: Socket,
    data: { voteId: string; rating: number }
  ): Promise<void> {
    const { voteId, rating } = data;

    try {
      // Get the player from socket
      const player = await this.getPlayerBySocketId(socket.id);
      if (!player) {
        socket.emit('theme:error', {
          code: 'NOT_AUTHENTICATED',
          message: 'Player not authenticated'
        });
        return;
      }

      // Get the party to verify state
      const party = await partyService.getParty(player.partyId);
      if (!party) {
        socket.emit('theme:error', {
          code: 'PARTY_NOT_FOUND',
          message: 'Party does not exist'
        });
        return;
      }

      // Verify party is in PLAYING state
      if (party.status !== PartyStatus.PLAYING) {
        socket.emit('theme:error', {
          code: 'INVALID_STATE',
          message: 'Theme adherence can only be rated during PLAYING phase'
        });
        return;
      }

      // Record the theme adherence rating
      await themeService.recordThemeAdherence(voteId, rating);

      // Emit success to the player
      socket.emit('theme:adherence_vote_success', {
        voteId,
        rating
      });

      // Broadcast theme:adherence_vote to all players (for real-time updates)
      this.broadcastToParty(player.partyId, 'theme:adherence_vote', {
        voteId,
        playerId: player.id,
        rating
      });

      console.log(`Theme adherence vote recorded by ${player.name}: rating ${rating} for vote ${voteId}`);
    } catch (error: any) {
      console.error('Error during theme:adherence_vote:', error);
      socket.emit('theme:error', {
        code: error.code || 'ADHERENCE_VOTE_FAILED',
        message: error.message || 'Failed to record theme adherence vote'
      });
    }
  }

  /**
   * Emit theme:party_set event to all players in a party.
   * This is a helper method for programmatic emission.
   * 
   * **Validates: Requirements 20.1**
   * - 20.1: THE Socket_System SHALL emit 'theme:party_set' when host sets party theme
   * 
   * @param partyId - The party ID
   * @param theme - The party theme that was set
   */
  emitThemePartySet(partyId: string, theme: PartyTheme): void {
    this.broadcastToParty(partyId, 'theme:party_set', {
      theme
    });
  }

  /**
   * Emit theme:round_revealed event to all players in a party.
   * This is a helper method for programmatic emission.
   * 
   * **Validates: Requirements 20.2**
   * - 20.2: THE Socket_System SHALL emit 'theme:round_revealed' when round theme is announced
   * 
   * @param partyId - The party ID
   * @param roundId - The round ID
   * @param roundNumber - The round number
   * @param theme - The round theme that was revealed
   */
  emitThemeRoundRevealed(partyId: string, roundId: string, roundNumber: number, theme: RoundTheme): void {
    this.broadcastToParty(partyId, 'theme:round_revealed', {
      roundId,
      roundNumber,
      theme
    });
  }

  /**
   * Emit theme:adherence_vote event to all players in a party.
   * This is a helper method for programmatic emission.
   * 
   * **Validates: Requirements 20.3**
   * - 20.3: THE Socket_System SHALL emit 'theme:adherence_vote' when player rates theme adherence
   * 
   * @param partyId - The party ID
   * @param voteId - The vote ID
   * @param playerId - The player ID who voted
   * @param rating - The theme adherence rating (1-5)
   */
  emitThemeAdherenceVote(partyId: string, voteId: string, playerId: string, rating: number): void {
    this.broadcastToParty(partyId, 'theme:adherence_vote', {
      voteId,
      playerId,
      rating
    });
  }

  // ============================================================================
  // ACHIEVEMENT EVENT EMITTERS
  // ============================================================================

  /**
   * Emit achievement:unlocked event when a player earns an achievement.
   * This is called when an achievement condition is met during gameplay.
   * 
   * **Validates: Requirements 20.12**
   * - 20.12: THE Socket_System SHALL emit 'achievement:unlocked' when player earns achievement
   * 
   * @param partyId - The party ID
   * @param playerId - The player ID who earned the achievement
   * @param playerAchievement - The unlocked achievement record
   */
  emitAchievementUnlocked(
    partyId: string,
    playerId: string,
    playerAchievement: PlayerAchievement
  ): void {
    // Get the achievement definition for full details
    const achievement = ACHIEVEMENTS.find(a => a.id === playerAchievement.achievementId);

    this.broadcastToParty(partyId, 'achievement:unlocked', {
      playerId,
      achievement: achievement ? {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        rarity: achievement.rarity,
        bonusPoints: achievement.bonusPoints
      } : null,
      playerAchievement: {
        id: playerAchievement.id,
        achievementId: playerAchievement.achievementId,
        unlockedAt: playerAchievement.unlockedAt,
        bonusPoints: playerAchievement.bonusPoints
      }
    });

    console.log(`Achievement unlocked: ${achievement?.name} for player ${playerId} in party ${partyId}`);
  }

  /**
   * Emit achievement:reveal event during the finale achievement reveal sequence.
   * This is called for each achievement during the dramatic finale reveal.
   * 
   * **Validates: Requirements 20.13**
   * - 20.13: THE Socket_System SHALL emit 'achievement:reveal' during finale achievement reveal
   * 
   * @param partyId - The party ID
   * @param playerAchievement - The achievement being revealed
   * @param playerName - The name of the player who earned the achievement
   * @param playerAlias - The alias of the player who earned the achievement
   * @param revealIndex - The index of this reveal in the sequence (1-based)
   * @param totalReveals - The total number of achievements to reveal
   */
  emitAchievementReveal(
    partyId: string,
    playerAchievement: PlayerAchievement,
    playerName: string,
    playerAlias: string,
    revealIndex: number,
    totalReveals: number
  ): void {
    // Get the achievement definition for full details
    const achievement = ACHIEVEMENTS.find(a => a.id === playerAchievement.achievementId);

    this.broadcastToParty(partyId, 'achievement:reveal', {
      achievement: achievement ? {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        rarity: achievement.rarity,
        bonusPoints: achievement.bonusPoints
      } : null,
      player: {
        id: playerAchievement.playerId,
        name: playerName,
        alias: playerAlias
      },
      bonusPoints: playerAchievement.bonusPoints,
      revealIndex,
      totalReveals
    });

    console.log(`Achievement revealed: ${achievement?.name} earned by ${playerName} (${revealIndex}/${totalReveals})`);
  }

  /**
   * Handle the achievement reveal sequence during the finale.
   * Gets achievements in reveal order and emits achievement:reveal for each one.
   * 
   * **Validates: Requirements 10.1, 10.2, 10.3, 20.13**
   * - 10.1: WHEN the finale begins, THE Finale_Screen SHALL reveal achievements one-by-one with animations
   * - 10.2: THE Achievement reveal SHALL display the achievement icon, name, description, and bonus points
   * - 10.3: THE Achievement reveal SHALL show which player earned each achievement
   * - 20.13: THE Socket_System SHALL emit 'achievement:reveal' during finale achievement reveal
   * 
   * @param partyId - The party ID
   * @param delayMs - Delay between achievement reveals in milliseconds (default: 2000)
   */
  async handleFinaleRevealAchievements(partyId: string, delayMs: number = 2000): Promise<void> {
    try {
      // Get the party to verify state
      const party = await partyService.getParty(partyId);
      if (!party) {
        throw new Error('Party does not exist');
      }

      // Verify party is in FINALE state
      if (party.status !== PartyStatus.FINALE) {
        throw new Error('Party must be in FINALE state to reveal achievements');
      }

      // Get achievements in reveal order (sorted by rarity: common first, legendary last)
      const achievementsToReveal = await achievementService.getAchievementRevealOrder(partyId);

      if (achievementsToReveal.length === 0) {
        console.log(`No achievements to reveal for party ${party.code}`);
        return;
      }

      // Get all players for name lookup
      const players = await partyService.getPlayers(partyId);
      const playerMap = new Map(players.map(p => [p.id, p]));

      // Get all identities for alias lookup
      const identities = await identityService.getIdentities(partyId);
      const identityMap = new Map(identities.map(i => [i.playerId, i]));

      // Emit achievement:reveal for each achievement with timing delays
      for (let i = 0; i < achievementsToReveal.length; i++) {
        const playerAchievement = achievementsToReveal[i];
        const player = playerMap.get(playerAchievement.playerId);
        const identity = identityMap.get(playerAchievement.playerId);

        // Wait for delay before revealing (except for first achievement)
        if (i > 0) {
          await this.delay(delayMs);
        }

        // Emit the achievement reveal event
        this.emitAchievementReveal(
          partyId,
          playerAchievement,
          player?.name ?? 'Unknown',
          identity?.alias ?? 'Unknown',
          i + 1,
          achievementsToReveal.length
        );
      }

      console.log(`Achievement reveal sequence completed for party ${party.code}: ${achievementsToReveal.length} achievements revealed`);
    } catch (error: any) {
      console.error('Error during finale:reveal_achievements:', error);
      throw error;
    }
  }

  /**
   * Check and unlock achievements for a player after a game event.
   * This is called after events that could trigger achievements (e.g., song scored, round ended).
   * 
   * **Validates: Requirements 9.3, 9.4, 20.12**
   * - 9.3: THE Achievement_System SHALL track achievements in real-time during gameplay
   * - 9.4: WHEN a player meets an achievement condition, THE Achievement_System SHALL record the achievement
   * - 20.12: THE Socket_System SHALL emit 'achievement:unlocked' when player earns achievement
   * 
   * @param playerId - The player ID to check achievements for
   * @param partyId - The party ID
   * @returns Array of newly unlocked achievements
   */
  async checkAndEmitAchievements(playerId: string, partyId: string): Promise<PlayerAchievement[]> {
    try {
      // Check for newly unlocked achievements
      const newlyUnlocked = await achievementService.checkAchievements(playerId, partyId);

      // Unlock and emit each new achievement
      const unlockedRecords: PlayerAchievement[] = [];

      for (const achievement of newlyUnlocked) {
        // Unlock the achievement (creates the PlayerAchievement record)
        const playerAchievement = await achievementService.unlockAchievement(
          playerId,
          achievement.id,
          partyId
        );

        unlockedRecords.push(playerAchievement);

        // Emit the achievement:unlocked event
        this.emitAchievementUnlocked(partyId, playerId, playerAchievement);
      }

      return unlockedRecords;
    } catch (error: any) {
      console.error('Error checking achievements:', error);
      return [];
    }
  }

  // ============================================================================
  // EVENT (MINI-EVENT) SOCKET EMITTERS
  // ============================================================================

  /**
   * Emit event:triggered when a mini-event occurs.
   * This is called when a mini-event is triggered during gameplay.
   * 
   * **Validates: Requirements 20.4**
   * - 20.4: THE Socket_System SHALL emit 'event:triggered' when a mini-event occurs
   * 
   * @param partyId - The party ID
   * @param event - The mini-event that was triggered
   * @param activeEvent - The active event record
   */
  emitEventTriggered(
    partyId: string,
    event: MiniEvent,
    activeEvent: ActiveEvent
  ): void {
    this.broadcastToParty(partyId, 'event:triggered', {
      event: {
        id: event.id,
        name: event.name,
        description: event.description,
        icon: event.icon,
        timing: event.timing,
        effect: event.effect
      },
      activeEvent: {
        id: activeEvent.id,
        eventId: activeEvent.eventId,
        triggeredAt: activeEvent.triggeredAt,
        roundNumber: activeEvent.roundNumber,
        affectedPlayers: activeEvent.affectedPlayers,
        resolved: activeEvent.resolved
      }
    });

    console.log(`Event triggered: ${event.name} (${event.id}) in party ${partyId}`);
  }

  /**
   * Emit event:effect_applied when an event effect is resolved.
   * This is called after the event effect has been applied to the game state.
   * 
   * **Validates: Requirements 20.5**
   * - 20.5: THE Socket_System SHALL emit 'event:effect_applied' when event effect is resolved
   * 
   * @param partyId - The party ID
   * @param event - The mini-event whose effect was applied
   * @param activeEvent - The active event record
   * @param effectResult - The result of applying the effect
   */
  emitEventEffectApplied(
    partyId: string,
    event: MiniEvent,
    activeEvent: ActiveEvent,
    effectResult: EventEffectResult
  ): void {
    this.broadcastToParty(partyId, 'event:effect_applied', {
      event: {
        id: event.id,
        name: event.name,
        description: event.description,
        icon: event.icon
      },
      activeEventId: activeEvent.id,
      effectResult: {
        type: effectResult.type,
        affectedPlayers: effectResult.affectedPlayers,
        scoreChanges: effectResult.scoreChanges,
        message: effectResult.message
      }
    });

    console.log(`Event effect applied: ${event.name} - ${effectResult.message}`);
  }

  /**
   * Emit event:animation to trigger client-side animations for mini-events.
   * This is called to coordinate dramatic visual effects on all clients.
   * 
   * **Validates: Requirements 20.6**
   * - 20.6: THE Socket_System SHALL emit 'event:animation' to trigger client animations
   * 
   * @param partyId - The party ID
   * @param event - The mini-event to animate
   * @param animationType - The type of animation to play ('reveal', 'effect', 'resolve')
   * @param animationData - Additional data for the animation
   */
  emitEventAnimation(
    partyId: string,
    event: MiniEvent,
    animationType: 'reveal' | 'effect' | 'resolve',
    animationData?: {
      affectedPlayers?: string[];
      scoreChanges?: Record<string, number>;
      message?: string;
      duration?: number;
    }
  ): void {
    this.broadcastToParty(partyId, 'event:animation', {
      event: {
        id: event.id,
        name: event.name,
        description: event.description,
        icon: event.icon
      },
      animationType,
      animationData: animationData ?? {}
    });

    console.log(`Event animation emitted: ${event.name} - ${animationType}`);
  }

  /**
   * Check for and trigger a mini-event at a specific timing point.
   * This is a helper method that combines event checking, triggering, and emission.
   * 
   * @param partyId - The party ID
   * @param timing - The event timing to check for
   * @param frequency - The frequency setting ('rare', 'normal', or 'chaos')
   * @param roundNumber - Optional round number for context
   * @returns The triggered event and active event record, or null if no event triggered
   */
  async checkAndTriggerEvent(
    partyId: string,
    timing: EventTiming,
    frequency: 'rare' | 'normal' | 'chaos' = 'normal',
    roundNumber?: number
  ): Promise<{ event: MiniEvent; activeEvent: ActiveEvent } | null> {
    try {
      // Check if an event should trigger
      const event = await eventService.checkForEvent(partyId, timing, frequency);

      if (!event) {
        return null;
      }

      // Trigger the event (creates ActiveEvent record)
      const activeEvent = await eventService.triggerEvent(partyId, event.id, roundNumber);

      // Emit the event:triggered socket event
      this.emitEventTriggered(partyId, event, activeEvent);

      // Emit the reveal animation
      this.emitEventAnimation(partyId, event, 'reveal', {
        duration: 3000 // 3 second reveal animation
      });

      return { event, activeEvent };
    } catch (error: any) {
      console.error('Error checking/triggering event:', error);
      return null;
    }
  }

  /**
   * Apply an event effect and emit the appropriate socket events.
   * This is a helper method that combines effect application and emission.
   * 
   * @param activeEventId - The ID of the active event to apply
   * @param partyId - The party ID
   * @param context - Optional context for effect application
   * @returns The effect result, or null if application failed
   */
  async applyEventEffectAndEmit(
    activeEventId: string,
    partyId: string,
    context?: { songId?: string; songScore?: number }
  ): Promise<EventEffectResult | null> {
    try {
      // Get the active event
      const activeEvent = await eventService.getActiveEvent(activeEventId);

      // Get the event definition
      const event = eventService.getEvent(activeEvent.eventId);
      if (!event) {
        console.error(`Event definition not found for ${activeEvent.eventId}`);
        return null;
      }

      // Emit the effect animation before applying
      this.emitEventAnimation(partyId, event, 'effect', {
        duration: 2000 // 2 second effect animation
      });

      // Apply the event effect
      const effectResult = await eventService.applyEventEffect(activeEventId, context);

      // Emit the event:effect_applied socket event
      this.emitEventEffectApplied(partyId, event, activeEvent, effectResult);

      // Resolve the event
      await eventService.resolveEvent(activeEventId);

      // Emit the resolve animation
      this.emitEventAnimation(partyId, event, 'resolve', {
        affectedPlayers: effectResult.affectedPlayers,
        scoreChanges: effectResult.scoreChanges,
        message: effectResult.message,
        duration: 2000 // 2 second resolve animation
      });

      return effectResult;
    } catch (error: any) {
      console.error('Error applying event effect:', error);
      return null;
    }
  }

  // ============================================================================
  // POWER-UP EVENT HANDLERS AND EMITTERS
  // ============================================================================

  /**
   * Handle powerup:purchase event.
   * Purchases a power-up for a player and broadcasts the purchase to all players.
   * 
   * **Validates: Requirements 20.7**
   * - 20.7: THE Socket_Events SHALL include 'powerup:purchased' with playerId, powerUpId, and remainingPoints
   * 
   * @param socket - The socket making the request
   * @param data - The purchase data containing powerUpId
   */
  async handlePowerUpPurchase(
    socket: Socket,
    data: { powerUpId: string }
  ): Promise<void> {
    const { powerUpId } = data;

    try {
      // Get the player from socket
      const player = await this.getPlayerBySocketId(socket.id);
      if (!player) {
        socket.emit('powerup:error', {
          code: 'NOT_AUTHENTICATED',
          message: 'Player not authenticated'
        });
        return;
      }

      // Get the party to verify state
      const party = await partyService.getParty(player.partyId);
      if (!party) {
        socket.emit('powerup:error', {
          code: 'PARTY_NOT_FOUND',
          message: 'Party does not exist'
        });
        return;
      }

      // Verify party is in a valid state for purchasing power-ups (SUBMITTING or PLAYING)
      if (party.status !== PartyStatus.SUBMITTING && party.status !== PartyStatus.PLAYING) {
        socket.emit('powerup:error', {
          code: 'INVALID_STATE',
          message: 'Power-ups can only be purchased during SUBMITTING or PLAYING phase'
        });
        return;
      }

      // Purchase the power-up
      const playerPowerUp = await powerUpService.purchasePowerUp(player.id, powerUpId);

      // Get the power-up definition for full details
      const powerUp = powerUpService.getPowerUp(powerUpId);

      // Get the player's remaining points
      const remainingPoints = await powerUpService.getPlayerPoints(player.id);

      // Emit success to the purchasing player
      socket.emit('powerup:purchase_success', {
        playerPowerUp,
        powerUp,
        remainingPoints
      });

      // Requirement 20.7: Broadcast powerup:purchased to all players in the party
      this.emitPowerUpPurchased(player.partyId, player.id, powerUp!, remainingPoints);

      console.log(`Power-up "${powerUp?.name}" purchased by ${player.name} in party ${party.code}`);
    } catch (error: any) {
      console.error('Error during powerup:purchase:', error);
      socket.emit('powerup:error', {
        code: error.code || 'PURCHASE_FAILED',
        message: error.message || 'Failed to purchase power-up'
      });
    }
  }

  /**
   * Handle powerup:use event.
   * Uses a power-up and broadcasts the usage and effect to all players.
   * 
   * **Validates: Requirements 20.8, 20.9**
   * - 20.8: THE Socket_Events SHALL include 'powerup:used' with playerId, powerUpId, and targetInfo
   * - 20.9: THE Socket_Events SHALL include 'powerup:effect' with effectType, affectedPlayers, and result
   * 
   * @param socket - The socket making the request
   * @param data - The use data containing playerPowerUpId and optional targetId/songId
   */
  async handlePowerUpUse(
    socket: Socket,
    data: { playerPowerUpId: string; targetId?: string; songId?: string }
  ): Promise<void> {
    const { playerPowerUpId, targetId, songId } = data;

    try {
      // Get the player from socket
      const player = await this.getPlayerBySocketId(socket.id);
      if (!player) {
        socket.emit('powerup:error', {
          code: 'NOT_AUTHENTICATED',
          message: 'Player not authenticated'
        });
        return;
      }

      // Get the party to verify state
      const party = await partyService.getParty(player.partyId);
      if (!party) {
        socket.emit('powerup:error', {
          code: 'PARTY_NOT_FOUND',
          message: 'Party does not exist'
        });
        return;
      }

      // Verify party is in a valid state for using power-ups (SUBMITTING or PLAYING)
      if (party.status !== PartyStatus.SUBMITTING && party.status !== PartyStatus.PLAYING) {
        socket.emit('powerup:error', {
          code: 'INVALID_STATE',
          message: 'Power-ups can only be used during SUBMITTING or PLAYING phase'
        });
        return;
      }

      // Get the PlayerPowerUp record to verify ownership
      const playerPowerUp = await powerUpService.getPlayerPowerUp(playerPowerUpId);
      if (playerPowerUp.playerId !== player.id) {
        socket.emit('powerup:error', {
          code: 'NOT_OWNER',
          message: 'You can only use your own power-ups'
        });
        return;
      }

      // Get the power-up definition
      const powerUp = powerUpService.getPowerUp(playerPowerUp.powerUpId);
      if (!powerUp) {
        socket.emit('powerup:error', {
          code: 'POWERUP_NOT_FOUND',
          message: 'Power-up definition not found'
        });
        return;
      }

      // Apply the power-up effect
      const effectResult = await powerUpService.applyPowerUpEffect(playerPowerUpId, {
        songId,
        targetPlayerId: targetId
      });

      // Build target info for the event
      const targetInfo: { targetPlayerId?: string; targetSongId?: string } = {};
      if (targetId) {
        targetInfo.targetPlayerId = targetId;
      }
      if (songId) {
        targetInfo.targetSongId = songId;
      }

      // Emit success to the using player
      socket.emit('powerup:use_success', {
        playerPowerUpId,
        powerUp,
        effectResult
      });

      // Requirement 20.8: Broadcast powerup:used to all players in the party
      this.emitPowerUpUsed(player.partyId, player.id, powerUp, targetInfo);

      // Requirement 20.9: Broadcast powerup:effect to all players in the party
      this.emitPowerUpEffect(player.partyId, effectResult);

      console.log(`Power-up "${powerUp.name}" used by ${player.name} in party ${party.code}`);
    } catch (error: any) {
      console.error('Error during powerup:use:', error);
      socket.emit('powerup:error', {
        code: error.code || 'USE_FAILED',
        message: error.message || 'Failed to use power-up'
      });
    }
  }

  /**
   * Emit powerup:purchased event when a player buys a power-up.
   * This is called when a power-up is successfully purchased.
   * 
   * **Validates: Requirements 20.7**
   * - 20.7: THE Socket_Events SHALL include 'powerup:purchased' with playerId, powerUpId, and remainingPoints
   * 
   * @param partyId - The party ID
   * @param playerId - The player ID who purchased the power-up
   * @param powerUp - The power-up that was purchased
   * @param remainingPoints - The player's remaining power-up points after purchase
   */
  emitPowerUpPurchased(
    partyId: string,
    playerId: string,
    powerUp: PowerUp,
    remainingPoints: number
  ): void {
    this.broadcastToParty(partyId, 'powerup:purchased', {
      playerId,
      powerUpId: powerUp.id,
      powerUp: {
        id: powerUp.id,
        name: powerUp.name,
        description: powerUp.description,
        icon: powerUp.icon,
        cost: powerUp.cost,
        timing: powerUp.timing
      },
      remainingPoints
    });

    console.log(`Power-up purchased event emitted: ${powerUp.name} by player ${playerId}`);
  }

  /**
   * Emit powerup:used event when a player activates a power-up.
   * This is called when a power-up is successfully used.
   * 
   * **Validates: Requirements 20.8**
   * - 20.8: THE Socket_Events SHALL include 'powerup:used' with playerId, powerUpId, and targetInfo
   * 
   * @param partyId - The party ID
   * @param playerId - The player ID who used the power-up
   * @param powerUp - The power-up that was used
   * @param targetInfo - Information about the target (targetPlayerId, targetSongId)
   */
  emitPowerUpUsed(
    partyId: string,
    playerId: string,
    powerUp: PowerUp,
    targetInfo: { targetPlayerId?: string; targetSongId?: string }
  ): void {
    this.broadcastToParty(partyId, 'powerup:used', {
      playerId,
      powerUpId: powerUp.id,
      powerUp: {
        id: powerUp.id,
        name: powerUp.name,
        description: powerUp.description,
        icon: powerUp.icon,
        timing: powerUp.timing,
        effect: powerUp.effect
      },
      targetInfo
    });

    console.log(`Power-up used event emitted: ${powerUp.name} by player ${playerId}`);
  }

  /**
   * Emit powerup:effect event when a power-up effect is resolved.
   * This is called after the power-up effect has been applied.
   * 
   * **Validates: Requirements 20.9**
   * - 20.9: THE Socket_Events SHALL include 'powerup:effect' with effectType, affectedPlayers, and result
   * 
   * @param partyId - The party ID
   * @param effectResult - The result of applying the power-up effect
   */
  emitPowerUpEffect(
    partyId: string,
    effectResult: PowerUpEffectResult
  ): void {
    // Determine affected players based on the effect result
    const affectedPlayers: string[] = [];
    if (effectResult.data?.identity?.playerId) {
      affectedPlayers.push(effectResult.data.identity.playerId);
    }
    if (effectResult.data?.vote?.voterId) {
      affectedPlayers.push(effectResult.data.vote.voterId);
    }

    this.broadcastToParty(partyId, 'powerup:effect', {
      effectType: effectResult.type,
      affectedPlayers,
      result: {
        success: effectResult.success,
        message: effectResult.message,
        data: effectResult.data
      }
    });

    console.log(`Power-up effect event emitted: ${effectResult.type} - ${effectResult.message}`);
  }

  // ============================================================================
  // PREDICTION EVENT HANDLERS AND EMITTERS
  // ============================================================================

  /**
   * Handle prediction:submit event.
   * Submits predictions for a player for a specific round and broadcasts the submission.
   * 
   * **Validates: Requirements 20.10**
   * - 20.10: THE Socket_System SHALL emit 'prediction:submitted' when player makes prediction
   * 
   * @param socket - The socket making the request
   * @param data - The prediction data containing roundNumber and predictions
   */
  async handlePredictionSubmit(
    socket: Socket,
    data: { roundNumber: number; predictions: PredictionInput[] }
  ): Promise<void> {
    const { roundNumber, predictions } = data;

    try {
      // Get the player from socket
      const player = await this.getPlayerBySocketId(socket.id);
      if (!player) {
        socket.emit('prediction:error', {
          code: 'NOT_AUTHENTICATED',
          message: 'Player not authenticated'
        });
        return;
      }

      // Get the party to verify state
      const party = await partyService.getParty(player.partyId);
      if (!party) {
        socket.emit('prediction:error', {
          code: 'PARTY_NOT_FOUND',
          message: 'Party does not exist'
        });
        return;
      }

      // Verify party is in a valid state for predictions (SUBMITTING or PLAYING)
      if (party.status !== PartyStatus.SUBMITTING && party.status !== PartyStatus.PLAYING) {
        socket.emit('prediction:error', {
          code: 'INVALID_STATE',
          message: 'Predictions can only be submitted during SUBMITTING or PLAYING phase'
        });
        return;
      }

      // Submit the prediction
      const roundPrediction = await predictionService.submitPrediction(
        player.id,
        player.partyId,
        roundNumber,
        predictions
      );

      // Emit success to the submitting player
      socket.emit('prediction:submit_success', {
        roundPrediction
      });

      // Requirement 20.10: Broadcast prediction:submitted to all players in the party
      this.emitPredictionSubmitted(player.partyId, player.id, roundPrediction);

      console.log(`Prediction submitted by ${player.name} for round ${roundNumber} in party ${party.code}`);
    } catch (error: any) {
      console.error('Error during prediction:submit:', error);
      socket.emit('prediction:error', {
        code: error.code || 'PREDICTION_FAILED',
        message: error.message || 'Failed to submit prediction'
      });
    }
  }

  /**
   * Emit prediction:submitted event when a player makes a prediction.
   * This is called when a prediction is successfully submitted.
   * 
   * **Validates: Requirements 20.10**
   * - 20.10: THE Socket_System SHALL emit 'prediction:submitted' when player makes prediction
   * 
   * @param partyId - The party ID
   * @param playerId - The player ID who submitted the prediction
   * @param roundPrediction - The submitted prediction record
   */
  emitPredictionSubmitted(
    partyId: string,
    playerId: string,
    roundPrediction: RoundPrediction
  ): void {
    this.broadcastToParty(partyId, 'prediction:submitted', {
      playerId,
      roundNumber: roundPrediction.roundNumber,
      predictionId: roundPrediction.id,
      // Don't broadcast the actual predictions to maintain secrecy
      submittedAt: roundPrediction.submittedAt
    });

    console.log(`Prediction submitted event emitted: player ${playerId} for round ${roundPrediction.roundNumber}`);
  }

  /**
   * Emit prediction:result event when prediction outcomes are revealed.
   * This is called after a round ends and predictions are evaluated.
   * 
   * **Validates: Requirements 20.11**
   * - 20.11: THE Socket_System SHALL emit 'prediction:result' when prediction outcome revealed
   * 
   * @param partyId - The party ID
   * @param playerId - The player ID whose prediction was evaluated
   * @param roundNumber - The round number that was evaluated
   * @param results - Array of prediction results
   * @param totalPointsEarned - Total points earned from predictions
   */
  emitPredictionResult(
    partyId: string,
    playerId: string,
    roundNumber: number,
    results: PredictionResult[],
    totalPointsEarned: number
  ): void {
    this.broadcastToParty(partyId, 'prediction:result', {
      playerId,
      roundNumber,
      results: results.map(result => ({
        predictionType: result.predictionType,
        predicted: result.predicted,
        actual: result.actual,
        correct: result.correct,
        pointsAwarded: result.pointsAwarded
      })),
      totalPointsEarned
    });

    console.log(`Prediction result event emitted: player ${playerId} earned ${totalPointsEarned} points for round ${roundNumber}`);
  }

  /**
   * Evaluate predictions for a round and emit results to all players.
   * This is a helper method that combines evaluation and emission.
   * 
   * **Validates: Requirements 16.3, 20.11**
   * - 16.3: THE Prediction_System SHALL evaluate predictions after each round and award points
   * - 20.11: THE Socket_System SHALL emit 'prediction:result' when prediction outcome revealed
   * 
   * @param partyId - The party ID
   * @param roundNumber - The round number to evaluate
   * @returns Array of all prediction results
   */
  async evaluatePredictionsAndEmit(
    partyId: string,
    roundNumber: number
  ): Promise<PredictionResult[]> {
    try {
      // Get all predictions for this round before evaluation
      const roundPredictions = await predictionService.getRoundPredictions(partyId, roundNumber);

      // Evaluate all predictions for the round
      const allResults = await predictionService.evaluatePredictions(partyId, roundNumber);

      // Group results by player and emit
      const playerResultsMap = new Map<string, { results: PredictionResult[]; totalPoints: number }>();

      // Initialize map with all players who made predictions
      for (const prediction of roundPredictions) {
        playerResultsMap.set(prediction.playerId, { results: [], totalPoints: 0 });
      }

      // Group results by player (results come in order of predictions)
      let resultIndex = 0;
      for (const prediction of roundPredictions) {
        const playerData = playerResultsMap.get(prediction.playerId)!;
        const numPredictions = prediction.predictions.length;
        
        for (let i = 0; i < numPredictions && resultIndex < allResults.length; i++) {
          const result = allResults[resultIndex];
          playerData.results.push(result);
          playerData.totalPoints += result.pointsAwarded;
          resultIndex++;
        }
      }

      // Emit results for each player
      for (const [playerId, data] of playerResultsMap) {
        this.emitPredictionResult(
          partyId,
          playerId,
          roundNumber,
          data.results,
          data.totalPoints
        );
      }

      return allResults;
    } catch (error: any) {
      console.error('Error evaluating predictions:', error);
      return [];
    }
  }

  /**
   * Broadcast an event to all players in a party.
   * 
   * @param partyId - The party ID
   * @param event - The event name
   * @param data - The event data
   */
  broadcastToParty(partyId: string, event: string, data: any): void {
    const io = this.getIO();
    io.to(`party:${partyId}`).emit(event, data);
  }

  /**
   * Send an event to a specific player.
   * 
   * @param socketId - The player's socket ID
   * @param event - The event name
   * @param data - The event data
   */
  sendToPlayer(socketId: string, event: string, data: any): void {
    const io = this.getIO();
    io.to(socketId).emit(event, data);
  }

  /**
   * Handle submission:submit event.
   * Submits a song to the party, broadcasts song_added with submitter hidden as "???",
   * and checks if all players have submitted to transition to PLAYING state.
   * 
   * **Validates: Requirements 4.8**
   * - 4.8: WHEN a song is submitted, THE Backend SHALL broadcast the song to all Players with the submitter hidden as "???"
   * 
   * @param socket - The socket making the request
   * @param data - The submission data containing soundcloudData and confidence
   */
  async handleSubmissionSubmit(
    socket: Socket,
    data: { soundcloudData: SoundCloudTrack; confidence: number }
  ): Promise<void> {
    const { soundcloudData, confidence } = data;

    try {
      // Get the player from socket
      const player = await this.getPlayerBySocketId(socket.id);
      if (!player) {
        socket.emit('submission:error', {
          code: 'NOT_AUTHENTICATED',
          message: 'Player not authenticated'
        });
        return;
      }

      // Get the party to verify state
      const party = await partyService.getParty(player.partyId);
      if (!party) {
        socket.emit('submission:error', {
          code: 'PARTY_NOT_FOUND',
          message: 'Party does not exist'
        });
        return;
      }

      // Verify party is in SUBMITTING state
      if (party.status !== PartyStatus.SUBMITTING) {
        socket.emit('submission:error', {
          code: 'INVALID_STATE',
          message: 'Songs can only be submitted during SUBMITTING phase'
        });
        return;
      }

      // Submit the song
      const song = await songService.submitSong(player.partyId, player.id, {
        soundcloudId: soundcloudData.id,
        title: soundcloudData.title,
        artist: soundcloudData.user.username,
        artworkUrl: soundcloudData.artwork_url || '',
        duration: soundcloudData.duration,
        permalinkUrl: soundcloudData.permalink_url,
        confidence: confidence as 1 | 2 | 3 | 4 | 5
      });

      // Requirement 4.8: Broadcast submission:song_added to all players with submitter hidden as "???"
      this.broadcastToParty(player.partyId, 'submission:song_added', {
        song: {
          id: song.id,
          title: song.title,
          artist: song.artist,
          artworkUrl: song.artworkUrl,
          duration: song.duration,
          permalinkUrl: song.permalinkUrl,
          confidence: song.confidence,
          roundNumber: song.roundNumber
        },
        submitterAlias: '???'
      });

      // Emit success to the submitting player with full song details
      socket.emit('submission:success', {
        song
      });

      console.log(`Song "${song.title}" submitted by ${player.name} to party ${party.code}`);

      // Check if all players have submitted their required songs
      const allSubmitted = await partyService.allPlayersSubmittedSongs(player.partyId);
      if (allSubmitted) {
        // Transition to PLAYING state
        const updatedParty = await partyService.transitionToPlaying(player.partyId);

        // Organize songs into rounds
        const rounds = await songService.organizeIntoRounds(player.partyId);

        // Broadcast state:changed to all players
        this.broadcastToParty(player.partyId, 'state:changed', {
          newState: PartyStatus.PLAYING,
          data: {
            party: updatedParty,
            rounds
          }
        });

        console.log(`Party ${party.code} transitioned to PLAYING state`);

        // Check for pre-round event at the start of the first round
        // **Validates: Requirement 11.2** - pre-round timing
        await this.checkAndTriggerEvent(player.partyId, 'pre-round', 'normal', 1);

        // Start the first song
        const firstSong = await songService.getNextSong(player.partyId);
        if (firstSong) {
          await this.startSong(player.partyId, firstSong);
        }
      }
    } catch (error: any) {
      console.error('Error during submission:submit:', error);
      socket.emit('submission:error', {
        code: error.code || 'SUBMISSION_FAILED',
        message: error.message || 'Failed to submit song',
        field: error.field
      });
    }
  }

  /**
   * Handle submission:remove event.
   * Removes a song from the party and broadcasts song_removed to all players.
   * 
   * @param socket - The socket making the request
   * @param data - The removal data containing songId
   */
  async handleSubmissionRemove(
    socket: Socket,
    data: { songId: string }
  ): Promise<void> {
    const { songId } = data;

    try {
      // Get the player from socket
      const player = await this.getPlayerBySocketId(socket.id);
      if (!player) {
        socket.emit('submission:error', {
          code: 'NOT_AUTHENTICATED',
          message: 'Player not authenticated'
        });
        return;
      }

      // Get the party to verify state
      const party = await partyService.getParty(player.partyId);
      if (!party) {
        socket.emit('submission:error', {
          code: 'PARTY_NOT_FOUND',
          message: 'Party does not exist'
        });
        return;
      }

      // Verify party is in SUBMITTING state
      if (party.status !== PartyStatus.SUBMITTING) {
        socket.emit('submission:error', {
          code: 'INVALID_STATE',
          message: 'Songs can only be removed during SUBMITTING phase'
        });
        return;
      }

      // Remove the song (songService validates ownership)
      await songService.removeSong(songId, player.id);

      // Broadcast submission:song_removed to all players in the party
      this.broadcastToParty(player.partyId, 'submission:song_removed', {
        songId
      });

      // Emit success to the removing player
      socket.emit('submission:remove_success', {
        songId
      });

      console.log(`Song ${songId} removed by ${player.name} from party ${party.code}`);
    } catch (error: any) {
      console.error('Error during submission:remove:', error);
      socket.emit('submission:error', {
        code: error.code || 'REMOVAL_FAILED',
        message: error.message || 'Failed to remove song'
      });
    }
  }

  /**
   * Handle submission:ready event.
   * Marks a player as ready and broadcasts player_ready to all players.
   * 
   * @param socket - The socket making the request
   */
  async handleSubmissionReady(socket: Socket): Promise<void> {
    try {
      // Get the player from socket
      const player = await this.getPlayerBySocketId(socket.id);
      if (!player) {
        socket.emit('submission:error', {
          code: 'NOT_AUTHENTICATED',
          message: 'Player not authenticated'
        });
        return;
      }

      // Get the party to verify state
      const party = await partyService.getParty(player.partyId);
      if (!party) {
        socket.emit('submission:error', {
          code: 'PARTY_NOT_FOUND',
          message: 'Party does not exist'
        });
        return;
      }

      // Verify party is in SUBMITTING state
      if (party.status !== PartyStatus.SUBMITTING) {
        socket.emit('submission:error', {
          code: 'INVALID_STATE',
          message: 'Can only mark ready during SUBMITTING phase'
        });
        return;
      }

      // Mark player as ready in the database
      await prisma.player.update({
        where: { id: player.id },
        data: { isReady: true }
      });

      // Broadcast submission:player_ready to all players in the party
      this.broadcastToParty(player.partyId, 'submission:player_ready', {
        playerId: player.id,
        playerName: player.name
      });

      // Emit success to the player
      socket.emit('submission:ready_success', {
        playerId: player.id
      });

      console.log(`Player ${player.name} marked as ready in party ${party.code}`);
    } catch (error: any) {
      console.error('Error during submission:ready:', error);
      socket.emit('submission:error', {
        code: error.code || 'READY_FAILED',
        message: error.message || 'Failed to mark as ready'
      });
    }
  }

  /**
   * Handle submission:search event.
   * Searches SoundCloud for tracks matching the query and returns results to the player.
   * 
   * @param socket - The socket making the request
   * @param data - The search data containing the query string
   */
  async handleSubmissionSearch(
    socket: Socket,
    data: { query: string }
  ): Promise<void> {
    const { query } = data;

    try {
      const player = await this.getPlayerBySocketId(socket.id);
      if (!player) {
        socket.emit('submission:search_error', {
          code: 'NOT_AUTHENTICATED',
          message: 'Player not authenticated'
        });
        return;
      }

      // Search SoundCloud for tracks
      const results = await soundcloudService.searchTracks(query);

      // Send results back to the player
      socket.emit('submission:search_results', {
        query,
        results,
        count: results.length
      });

      console.log(`Search for "${query}" returned ${results.length} results for player ${player.name}`);
    } catch (error: any) {
      console.error('Error during submission:search:', error);
      socket.emit('submission:search_error', {
        code: error.code || 'SEARCH_FAILED',
        message: error.message || 'Failed to search for songs'
      });
    }
  }

  /**
   * Handle playing:vote event.
   * Casts a vote for a song, broadcasts votes_updated to all players,
   * and checks if all votes are in to calculate and broadcast results.
   * 
   * **Validates: Requirements 5.8, 6.8, 10.5**
   * - 5.8: WHEN all votes are submitted for a song, THE Backend SHALL calculate and display the song's score
   * - 6.8: WHEN a song's score is calculated, THE Backend SHALL update and broadcast the anonymous leaderboard
   * - 10.5: WHEN a vote is submitted, THE Backend SHALL broadcast the updated vote count to all Players
   * 
   * **Property 23: Vote Broadcast**
   * For any vote submission, all players in the party should receive updated vote count information.
   * 
   * **Property 31: Leaderboard Broadcast**
   * For any song score calculation, all players should receive an updated anonymous leaderboard.
   * 
   * @param socket - The socket making the request
   * @param data - The vote data containing songId and rating
   */
  async handlePlayingVote(
    socket: Socket,
    data: { songId: string; rating: number }
  ): Promise<void> {
    const { songId, rating } = data;

    try {
      // Get the player from socket
      const player = await this.getPlayerBySocketId(socket.id);
      if (!player) {
        socket.emit('playing:error', {
          code: 'NOT_AUTHENTICATED',
          message: 'Player not authenticated'
        });
        return;
      }

      // Get the party to verify state
      const party = await partyService.getParty(player.partyId);
      if (!party) {
        socket.emit('playing:error', {
          code: 'PARTY_NOT_FOUND',
          message: 'Party does not exist'
        });
        return;
      }

      // Verify party is in PLAYING state
      if (party.status !== PartyStatus.PLAYING) {
        socket.emit('playing:error', {
          code: 'INVALID_STATE',
          message: 'Votes can only be cast during PLAYING phase'
        });
        return;
      }

      // Get the song to check if player is voting on their own song
      const song = await songService.getSong(songId);
      if (!song) {
        socket.emit('playing:error', {
          code: 'SONG_NOT_FOUND',
          message: 'Song does not exist'
        });
        return;
      }

      // Prevent self-voting
      if (song.submitterId === player.id) {
        socket.emit('playing:error', {
          code: 'SELF_VOTE_NOT_ALLOWED',
          message: 'You cannot vote on your own song'
        });
        return;
      }

      // Cast the vote using scoringService
      const vote = await scoringService.castVote(songId, player.id, rating);

      // Get the current vote count for the song
      const votes = await scoringService.getVotesForSong(songId);
      const voteCount = votes.length;

      // Requirement 10.5 / Property 23: Broadcast votes_updated to all players
      this.broadcastToParty(player.partyId, 'playing:votes_updated', {
        songId,
        voteCount
      });

      // Emit success to the voting player
      socket.emit('playing:vote_success', {
        songId,
        rating: vote.rating,
        isLocked: vote.isLocked
      });

      console.log(`Vote cast by ${player.name} for song ${songId}: rating ${rating}`);

      // Check if all votes are in for this song
      const allVotesIn = await this.checkAllVotesSubmitted(songId, player.partyId);
      
      if (allVotesIn) {
        // Requirement 5.8: Calculate and display the song's score
        await this.endSong(player.partyId, songId);
        
        // Start the next song or transition to FINALE if no more songs
        const nextSong = await songService.getNextSong(player.partyId);
        console.log(`All votes in for song ${songId}. Next song:`, nextSong ? nextSong.title : 'NONE (finale)');
        
        if (nextSong) {
          // Small delay before starting next song to let results display
          const partyId = player.partyId;
          const songToStart = nextSong;
          setTimeout(async () => {
            try {
              console.log(`Starting next song: ${songToStart.title} in party ${partyId}`);
              await this.startSong(partyId, songToStart);
            } catch (err) {
              console.error('Error starting next song:', err);
            }
          }, 2000);
        } else {
          // No more songs - start the full finale sequence
          // This will transition to FINALE, emit events, and run the full reveal sequence
          console.log(`No more songs, starting finale sequence for party ${player.partyId}`);
          this.startFinaleSequence(player.partyId).catch(err => {
            console.error('Error running finale sequence:', err);
          });
        }
      }
    } catch (error: any) {
      console.error('Error during playing:vote:', error);
      socket.emit('playing:error', {
        code: error.code || 'VOTE_FAILED',
        message: error.message || 'Failed to cast vote',
        field: error.field
      });
    }
  }

  /**
   * Handle playing:lock_vote event.
   * Locks a vote for a song and emits confirmation to the player.
   * Note: Votes are already locked on submission, so this is mainly for API completeness.
   * 
   * @param socket - The socket making the request
   * @param data - The lock data containing songId
   */
  async handlePlayingLockVote(
    socket: Socket,
    data: { songId: string }
  ): Promise<void> {
    const { songId } = data;

    try {
      // Get the player from socket
      const player = await this.getPlayerBySocketId(socket.id);
      if (!player) {
        socket.emit('playing:error', {
          code: 'NOT_AUTHENTICATED',
          message: 'Player not authenticated'
        });
        return;
      }

      // Get the party to verify state
      const party = await partyService.getParty(player.partyId);
      if (!party) {
        socket.emit('playing:error', {
          code: 'PARTY_NOT_FOUND',
          message: 'Party does not exist'
        });
        return;
      }

      // Verify party is in PLAYING state
      if (party.status !== PartyStatus.PLAYING) {
        socket.emit('playing:error', {
          code: 'INVALID_STATE',
          message: 'Votes can only be locked during PLAYING phase'
        });
        return;
      }

      // Lock the vote using scoringService
      // If vote doesn't exist or is already locked, just return success
      try {
        const vote = await scoringService.lockVote(songId, player.id);
        
        // Emit confirmation to the player
        socket.emit('playing:lock_vote_success', {
          songId,
          isLocked: vote.isLocked
        });

        console.log(`Vote locked by ${player.name} for song ${songId}`);
      } catch (lockError: any) {
        // If vote doesn't exist or is already locked, just emit success
        if (lockError.code === 'VOTE_NOT_FOUND' || lockError.code === 'VOTE_LOCKED') {
          socket.emit('playing:lock_vote_success', {
            songId,
            isLocked: true
          });
          return;
        }
        throw lockError;
      }
    } catch (error: any) {
      console.error('Error during playing:lock_vote:', error);
      socket.emit('playing:error', {
        code: error.code || 'LOCK_VOTE_FAILED',
        message: error.message || 'Failed to lock vote'
      });
    }
  }

  /**
   * Start playing a song and broadcast song_start event to all players.
   * 
   * **Validates: Requirements 10.6, 11.2**
   * - 10.6: WHEN a song begins playing, THE Backend SHALL emit a song:start event to all Players
   * - 11.2: THE Mini_Event_System SHALL support event timings: pre-round, mid-round, post-round, and pre-finale
   * 
   * **Property 46: Song Start Event**
   * For any song beginning playback, all players should receive a song:start event containing the song details.
   * 
   * @param partyId - The party ID
   * @param song - The song to start playing
   */
  async startSong(partyId: string, song: Song): Promise<void> {
    // Get the party to verify it exists
    const party = await partyService.getParty(partyId);
    if (!party) {
      throw new Error('Party does not exist');
    }

    // Check for mid-round event before starting the song
    // **Validates: Requirement 11.2** - mid-round timing
    // Mid-round events can occur during song playback or between songs
    await this.checkAndTriggerEvent(partyId, 'mid-round', 'normal', song.roundNumber);

    // Construct the stream URL for SoundCloud widget
    // The frontend will use this with the SoundCloud Widget API
    const streamUrl = song.permalinkUrl;

    // Get party settings for round info
    const settings = party.settings;
    const totalRounds = settings.songsPerPlayer || 2;
    const playDuration = settings.playDuration || 30;
    
    // Count songs in this round to determine position
    const songsInRound = await prisma.song.count({
      where: { partyId, roundNumber: song.roundNumber }
    });
    
    // Count songs already played in this round
    const songsPlayedInRound = await prisma.song.count({
      where: { 
        partyId, 
        roundNumber: song.roundNumber,
        finalScore: { not: null }
      }
    });

    // Calculate weight multiplier for this round
    const weightMultiplier = songService.getWeightMultiplier(song.roundNumber, totalRounds);

    // Requirement 10.6 / Property 46: Broadcast song_start to all players
    this.broadcastToParty(partyId, 'playing:song_start', {
      song: {
        id: song.id,
        title: song.title,
        artist: song.artist,
        artworkUrl: song.artworkUrl,
        duration: song.duration,
        permalinkUrl: song.permalinkUrl,
        roundNumber: song.roundNumber,
        queuePosition: song.queuePosition,
        // Include submitterId so players know if it's their own song (for self-vote prevention)
        // The UI still shows "???" for anonymity, but uses this to disable voting on own songs
        submitterId: song.submitterId
      },
      streamUrl,
      roundInfo: {
        roundNumber: song.roundNumber,
        totalRounds,
        songInRound: songsPlayedInRound + 1,
        totalSongsInRound: songsInRound,
        weightMultiplier
      }
    });

    console.log(`Song started: "${song.title}" by ${song.artist} in party ${party.code}`);

    // Auto-advance timer: if not all votes are in after playDuration + 10 seconds, force advance
    const autoAdvanceDelay = (playDuration + 10) * 1000;
    const songId = song.id;
    setTimeout(async () => {
      try {
        // Check if song has already been scored (votes came in)
        const songRecord = await prisma.song.findUnique({
          where: { id: songId },
          select: { finalScore: true }
        });
        
        if (songRecord && songRecord.finalScore === null) {
          console.log(`Auto-advancing song ${songId} after timeout`);
          await this.endSong(partyId, songId);
          
          const nextSong = await songService.getNextSong(partyId);
          if (nextSong) {
            await this.startSong(partyId, nextSong);
          } else {
            this.startFinaleSequence(partyId).catch(err => {
              console.error('Error running finale sequence:', err);
            });
          }
        }
      } catch (err) {
        console.error('Error in auto-advance timer:', err);
      }
    }, autoAdvanceDelay);
  }

  /**
   * End a song, calculate its score, and broadcast results with updated leaderboard.
   * 
   * **Validates: Requirements 5.8, 6.8, 11.2**
   * - 5.8: WHEN all votes are submitted for a song, THE Backend SHALL calculate and display the song's score
   * - 6.8: WHEN a song's score is calculated, THE Backend SHALL update and broadcast the anonymous leaderboard
   * - 11.2: THE Mini_Event_System SHALL support event timings: pre-round, mid-round, post-round, and pre-finale
   * 
   * **Property 31: Leaderboard Broadcast**
   * For any song score calculation, all players should receive an updated anonymous leaderboard.
   * 
   * @param partyId - The party ID
   * @param songId - The song ID to end and calculate score for
   */
  async endSong(partyId: string, songId: string): Promise<void> {
    // Get the party to verify it exists
    const party = await partyService.getParty(partyId);
    if (!party) {
      throw new Error('Party does not exist');
    }

    // Requirement 5.8: Calculate the song's score
    const songScore = await scoringService.calculateSongScore(songId);

    // Requirement 6.8 / Property 31: Get and broadcast the updated anonymous leaderboard
    const leaderboard = await identityService.getAnonymousLeaderboard(partyId);

    // Broadcast playing:results to all players
    this.broadcastToParty(partyId, 'playing:results', {
      songResults: songScore,
      standings: leaderboard
    });

    console.log(`Song ended: ${songId} with score ${songScore.finalScore.toFixed(2)} in party ${party.code}`);

    // Get the song to determine round number for post-round event check
    const songRecord = await prisma.song.findUnique({
      where: { id: songId },
      select: { roundNumber: true }
    });

    // Check for post-round event after the song completes
    // **Validates: Requirement 11.2** - post-round timing
    if (songRecord) {
      await this.checkAndTriggerEvent(partyId, 'post-round', 'normal', songRecord.roundNumber);
    }
  }

  /**
   * Check if all votes have been submitted for a song.
   * All players except the song submitter should have voted.
   * 
   * @param songId - The song ID to check
   * @param partyId - The party ID
   * @returns true if all votes are in, false otherwise
   */
  private async checkAllVotesSubmitted(songId: string, partyId: string): Promise<boolean> {
    // Get the song to find the submitter
    const songRecord = await prisma.song.findUnique({
      where: { id: songId }
    });

    if (!songRecord) {
      return false;
    }

    // Get all players in the party (excluding the song submitter)
    const players = await partyService.getPlayers(partyId);
    const eligibleVoters = players.filter(p => p.id !== songRecord.submitterId);

    // Get all votes for this song
    const votes = await scoringService.getVotesForSong(songId);

    // Check if all eligible voters have voted
    const allVotesIn = votes.length >= eligibleVoters.length;
    console.log(`Vote check for song ${songId}: ${votes.length}/${eligibleVoters.length} votes (allVotesIn: ${allVotesIn})`);
    
    return allVotesIn;
  }

  /**
   * Broadcast an upcoming song notification to all players.
   * This is called before a song starts to give players a preview.
   * Also checks for pre-round events when starting a new round.
   * 
   * **Validates: Requirement 11.2** - pre-round timing
   * 
   * @param partyId - The party ID
   * @param song - The upcoming song
   * @param roundInfo - Information about the current round
   */
  async broadcastSongUpcoming(
    partyId: string,
    song: Song,
    roundInfo: { roundNumber: number; totalRounds: number; songIndex: number; totalSongsInRound: number }
  ): Promise<void> {
    // Check for pre-round event when starting a new round (first song of the round)
    // **Validates: Requirement 11.2** - pre-round timing
    if (roundInfo.songIndex === 0 && roundInfo.roundNumber > 1) {
      // Only check for pre-round events on rounds after the first (first round is handled in handleSubmissionSubmit)
      await this.checkAndTriggerEvent(partyId, 'pre-round', 'normal', roundInfo.roundNumber);
    }

    this.broadcastToParty(partyId, 'playing:song_upcoming', {
      song: {
        id: song.id,
        title: song.title,
        artist: song.artist,
        artworkUrl: song.artworkUrl,
        duration: song.duration,
        permalinkUrl: song.permalinkUrl,
        roundNumber: song.roundNumber,
        queuePosition: song.queuePosition
        // Note: submitterId is NOT included to maintain anonymity
      },
      roundInfo
    });
  }

  // ============================================================================
  // FINALE EVENT HANDLERS
  // ============================================================================

  /**
   * Handle finale:start event.
   * Transitions party to FINALE state, calculates final standings,
   * and broadcasts finale:start with frozen standings.
   * 
   * **Validates: Requirements 8.2, 10.7**
   * - 8.2: WHEN the game transitions to FINALE, THE Backend SHALL freeze the leaderboard and display "Scores Locked"
   * - 10.7: WHEN the finale sequence begins, THE Backend SHALL emit timed events for reveals
   * 
   * @param socket - The socket making the request
   */
  async handleFinaleStart(socket: Socket): Promise<void> {
    try {
      // Get the player from socket
      const player = await this.getPlayerBySocketId(socket.id);
      if (!player) {
        socket.emit('finale:error', {
          code: 'NOT_AUTHENTICATED',
          message: 'Player not authenticated'
        });
        return;
      }

      // Get the party to verify state
      const party = await partyService.getParty(player.partyId);
      if (!party) {
        socket.emit('finale:error', {
          code: 'PARTY_NOT_FOUND',
          message: 'Party does not exist'
        });
        return;
      }

      // Verify party is in PLAYING state
      if (party.status !== PartyStatus.PLAYING) {
        socket.emit('finale:error', {
          code: 'INVALID_STATE',
          message: 'Party must be in PLAYING state to start finale'
        });
        return;
      }

      // Transition to FINALE state
      const updatedParty = await partyService.transitionToFinale(player.partyId);

      // Calculate final standings
      const finalStandings = await scoringService.calculateFinalStandings(player.partyId);

      // Get frozen anonymous leaderboard
      const frozenStandings = await identityService.getAnonymousLeaderboard(player.partyId);

      // Requirement 8.2: Broadcast finale:start with frozen standings
      this.broadcastToParty(player.partyId, 'finale:start', {
        frozenStandings
      });

      // Broadcast state:changed to all players
      this.broadcastToParty(player.partyId, 'state:changed', {
        newState: PartyStatus.FINALE,
        data: {
          party: updatedParty,
          frozenStandings
        }
      });

      console.log(`Finale started for party ${party.code}`);
    } catch (error: any) {
      console.error('Error during finale:start:', error);
      socket.emit('finale:error', {
        code: error.code || 'FINALE_START_FAILED',
        message: error.message || 'Failed to start finale'
      });
    }
  }

  /**
   * Handle finale:reveal_categories event.
   * Selects and calculates bonus category winners, then emits
   * finale:category_reveal for each category with timing delays.
   * 
   * **Validates: Requirements 8.3, 10.7**
   * - 8.3: WHEN bonus categories are revealed, THE Backend SHALL animate each category card with winner and points
   * - 10.7: WHEN the finale sequence begins, THE Backend SHALL emit timed events for reveals
   * 
   * @param partyId - The party ID
   * @param delayMs - Delay between category reveals in milliseconds (default: 3000)
   * @returns Array of bonus results
   */
  async handleFinaleRevealCategories(partyId: string, delayMs: number = 3000): Promise<void> {
    try {
      // Get the party to verify state
      const party = await partyService.getParty(partyId);
      if (!party) {
        throw new Error('Party does not exist');
      }

      // Verify party is in FINALE state
      if (party.status !== PartyStatus.FINALE) {
        throw new Error('Party must be in FINALE state to reveal categories');
      }

      // Calculate bonus winners (this also stores them in the database)
      const bonusResults = await scoringService.calculateBonusWinners(partyId);

      // Get all songs for the party to find winning song details
      const songs = await prisma.song.findMany({
        where: { partyId }
      });

      // Create a map of songId -> song for quick lookup
      const songMap = new Map(songs.map(s => [s.id, s]));

      // Get all identities for alias lookup
      const identities = await identityService.getIdentities(partyId);
      const identityMap = new Map(identities.map(i => [i.playerId, i]));

      // Requirement 8.3 / 10.7: Emit finale:category_reveal for each category with timing delays
      for (let i = 0; i < bonusResults.length; i++) {
        const result = bonusResults[i];
        const winningSong = songMap.get(result.winningSongId);
        const winnerIdentity = identityMap.get(result.winnerPlayerId);

        // Wait for delay before revealing (except for first category)
        if (i > 0) {
          await this.delay(delayMs);
        }

        // Emit category reveal event
        this.broadcastToParty(partyId, 'finale:category_reveal', {
          category: {
            id: result.categoryId,
            name: result.categoryName,
            points: result.points
          },
          winner: {
            ...result,
            alias: winnerIdentity?.alias ?? 'Unknown',
            songTitle: winningSong?.title ?? 'Unknown',
            songArtist: winningSong?.artist ?? 'Unknown'
          }
        });

        console.log(`Category "${result.categoryName}" revealed for party ${party.code}`);
      }
    } catch (error: any) {
      console.error('Error during finale:reveal_categories:', error);
      throw error;
    }
  }

  /**
   * Handle finale:reveal_predictions event.
   * Evaluates all predictions for all rounds and emits prediction results to all players.
   * 
   * **Validates: Requirements 16.4, 17.5, 20.11**
   * - 16.4: THE Prediction_System SHALL reveal prediction results during the finale
   * - 17.5: THE Scoring_System SHALL apply prediction bonuses during the finale reveal sequence
   * - 20.11: THE Socket_System SHALL emit 'prediction:result' when prediction outcome revealed
   * 
   * @param partyId - The party ID
   */
  async handleFinaleRevealPredictions(partyId: string): Promise<void> {
    try {
      // Get the party to verify state
      const party = await partyService.getParty(partyId);
      if (!party) {
        throw new Error('Party does not exist');
      }

      // Verify party is in FINALE state
      if (party.status !== PartyStatus.FINALE) {
        throw new Error('Party must be in FINALE state to reveal predictions');
      }

      // Get party settings to determine number of rounds
      const settings = party.settings;
      const songsPerPlayer = settings.songsPerPlayer || 1;

      // Evaluate predictions for each round and emit results
      for (let roundNumber = 1; roundNumber <= songsPerPlayer; roundNumber++) {
        await this.evaluatePredictionsAndEmit(partyId, roundNumber);
      }

      // Get all players and their total prediction bonuses for the summary
      const players = await partyService.getPlayers(partyId);
      const predictionSummary: Array<{
        playerId: string;
        playerName: string;
        totalPredictionBonus: number;
      }> = [];

      for (const player of players) {
        const predictionBonus = await predictionService.getPlayerPredictionBonus(player.id, partyId);
        predictionSummary.push({
          playerId: player.id,
          playerName: player.name,
          totalPredictionBonus: predictionBonus,
        });
      }

      // Emit finale:predictions_revealed with summary of all prediction bonuses
      this.broadcastToParty(partyId, 'finale:predictions_revealed', {
        predictionSummary,
      });

      console.log(`Prediction results revealed for party ${party.code}`);
    } catch (error: any) {
      console.error('Error during finale:reveal_predictions:', error);
      // Don't throw - predictions are optional, continue with finale sequence
    }
  }

  /**
   * Handle finale:reveal_identities event.
   * Gets reveal order (last to first place) and emits finale:identity_revealed
   * for each player with timing delays.
   * 
   * **Validates: Requirements 8.4, 8.5, 10.7**
   * - 8.4: WHEN identities are revealed, THE Backend SHALL reveal players from last place to first place
   * - 8.5: WHEN a player is revealed, THE Backend SHALL display their alias, real name, and submitted songs
   * - 10.7: WHEN the finale sequence begins, THE Backend SHALL emit timed events for reveals
   * 
   * @param partyId - The party ID
   * @param delayMs - Delay between identity reveals in milliseconds (default: 5000)
   */
  async handleFinaleRevealIdentities(partyId: string, delayMs: number = 5000): Promise<void> {
    try {
      // Get the party to verify state
      const party = await partyService.getParty(partyId);
      if (!party) {
        throw new Error('Party does not exist');
      }

      // Verify party is in FINALE state
      if (party.status !== PartyStatus.FINALE) {
        throw new Error('Party must be in FINALE state to reveal identities');
      }

      // Requirement 8.4: Get reveal order (last to first place)
      const revealOrder = await identityService.getRevealOrder(partyId);

      // Get all songs for the party
      const songs = await prisma.song.findMany({
        where: { partyId }
      });

      // Convert to Song type with parsed voteDistribution
      const allSongs: Song[] = songs.map(record => ({
        id: record.id,
        partyId: record.partyId,
        submitterId: record.submitterId,
        soundcloudId: record.soundcloudId,
        title: record.title,
        artist: record.artist,
        artworkUrl: record.artworkUrl,
        duration: record.duration,
        permalinkUrl: record.permalinkUrl,
        confidence: record.confidence as 1 | 2 | 3 | 4 | 5,
        roundNumber: record.roundNumber,
        queuePosition: record.queuePosition,
        rawAverage: record.rawAverage,
        weightedScore: record.weightedScore,
        confidenceModifier: record.confidenceModifier,
        finalScore: record.finalScore,
        voteDistribution: record.voteDistribution ? JSON.parse(record.voteDistribution) : null,
        submittedAt: record.submittedAt,
      }));

      // Get all identities for the party to map voter IDs to aliases
      const allIdentities = await prisma.partyIdentity.findMany({
        where: { partyId }
      });
      const identityMap = new Map(allIdentities.map(i => [i.playerId, i]));

      // Requirement 8.4, 8.5, 10.7: Emit finale:identity_revealed for each player
      for (let i = 0; i < revealOrder.length; i++) {
        const player = revealOrder[i];
        
        // Wait for delay before revealing (except for first player)
        if (i > 0) {
          await this.delay(delayMs);
        }

        // Get player's identity
        const identity = await identityService.getIdentity(player.id);
        if (!identity) {
          continue;
        }

        // Mark identity as revealed
        await identityService.revealIdentity(partyId, player.id, i + 1);

        // Get player's songs
        const playerSongs = allSongs.filter(s => s.submitterId === player.id);

        // Requirement 18.3: Get vote comments for each song to display during identity reveal
        const songsWithComments = await Promise.all(playerSongs.map(async (song) => {
          // Get all votes for this song that have comments
          const votes = await prisma.vote.findMany({
            where: { 
              songId: song.id,
              comment: { not: null }
            }
          });

          // Filter out empty comments and map to include voter alias
          const comments = votes
            .filter(v => v.comment && v.comment.trim().length > 0)
            .map(v => {
              const voterIdentity = identityMap.get(v.voterId);
              return {
                voterAlias: voterIdentity?.alias || 'Anonymous',
                voterColor: voterIdentity?.color || '#9ca3af',
                rating: v.rating,
                comment: v.comment!,
                superVote: v.superVote
              };
            });

          return {
            id: song.id,
            title: song.title,
            artist: song.artist,
            artworkUrl: song.artworkUrl,
            finalScore: song.finalScore,
            confidence: song.confidence,
            comments
          };
        }));

        // Requirement 8.5: Emit identity reveal with alias, real name, and songs
        // Requirement 18.3: Include vote comments for display during finale
        // Calculate player's total score and rank
        const playerTotalScore = playerSongs.reduce((sum, s) => sum + (s.finalScore ?? 0), 0);
        const rank = revealOrder.length - i; // Last place is revealed first, so rank = total - index
        
        this.broadcastToParty(partyId, 'finale:identity_revealed', {
          alias: identity.alias,
          realName: player.name,
          songs: songsWithComments,
          silhouette: identity.silhouette,
          color: identity.color,
          revealOrder: i + 1,
          totalPlayers: revealOrder.length,
          playerId: player.id,
          rank: rank,
          finalScore: playerTotalScore
        });

        console.log(`Identity revealed: ${identity.alias} is ${player.name} (${i + 1}/${revealOrder.length})`);
      }
    } catch (error: any) {
      console.error('Error during finale:reveal_identities:', error);
      throw error;
    }
  }

  /**
   * Handle finale:champion event.
   * Gets the champion (first place) and emits finale:champion with winner details
   * and their highest-scoring song.
   * 
   * **Validates: Requirements 8.6**
   * - 8.6: WHEN the champion is crowned, THE Backend SHALL play their highest-scoring song
   * 
   * @param partyId - The party ID
   * @returns The champion's final standing
   */
  async handleFinaleChampion(partyId: string): Promise<void> {
    try {
      // Get the party to verify state
      const party = await partyService.getParty(partyId);
      if (!party) {
        throw new Error('Party does not exist');
      }

      // Verify party is in FINALE state
      if (party.status !== PartyStatus.FINALE) {
        throw new Error('Party must be in FINALE state to crown champion');
      }

      // Get final standings
      const finalStandings = await scoringService.calculateFinalStandings(partyId);

      if (finalStandings.length === 0) {
        throw new Error('No players found for finale');
      }

      // Get the champion (first place)
      const champion = finalStandings[0];

      // Debug logging for champion data
      console.log(`Champion data being sent:`);
      console.log(`  playerId: ${champion.playerId}`);
      console.log(`  alias: ${champion.alias}`);
      console.log(`  realName: ${champion.realName}`);
      console.log(`  rank: ${champion.rank}`);
      console.log(`  finalScore: ${champion.finalScore}`);
      console.log(`  totalBaseScore: ${champion.totalBaseScore}`);
      console.log(`  confidenceModifiers: ${champion.confidenceModifiers}`);
      console.log(`  bonusPoints: ${champion.bonusPoints}`);

      // Requirement 8.6: Emit finale:champion with winner details and highest-scoring song
      // Convert BigInt soundcloudId to Number to avoid JSON serialization error
      const sanitizedSongs = (champion.songs || []).map(s => ({
        ...s,
        soundcloudId: Number(s.soundcloudId)
      }));
      
      this.broadcastToParty(partyId, 'finale:champion', {
        champion: {
          playerId: champion.playerId,
          alias: champion.alias,
          realName: champion.realName,
          rank: champion.rank,
          finalScore: champion.finalScore,
          totalBaseScore: champion.totalBaseScore,
          confidenceModifiers: champion.confidenceModifiers,
          bonusPoints: champion.bonusPoints,
          bonusCategories: champion.bonusCategories || [],
          songs: sanitizedSongs,
          highestSong: champion.highestSong ? {
            id: champion.highestSong.id,
            title: champion.highestSong.title,
            artist: champion.highestSong.artist,
            artworkUrl: champion.highestSong.artworkUrl,
            permalinkUrl: champion.highestSong.permalinkUrl,
            finalScore: champion.highestSong.finalScore
          } : null
        }
      });

      console.log(`Champion crowned: ${champion.realName} (${champion.alias}) with score ${champion.finalScore}`);
    } catch (error: any) {
      console.error('Error during finale:champion:', error);
      throw error;
    }
  }

  /**
   * Start the complete finale sequence with proper timing.
   * Orchestrates the entire finale: start → category reveals → identity reveals → champion.
   * 
   * **Validates: Requirements 8.2, 8.3, 8.4, 8.5, 8.6, 10.7, 11.2**
   * - 8.2: WHEN the game transitions to FINALE, THE Backend SHALL freeze the leaderboard
   * - 8.3: WHEN bonus categories are revealed, THE Backend SHALL animate each category card
   * - 8.4: WHEN identities are revealed, THE Backend SHALL reveal players from last to first place
   * - 8.5: WHEN a player is revealed, THE Backend SHALL display their alias, real name, and songs
   * - 8.6: WHEN the champion is crowned, THE Backend SHALL play their highest-scoring song
   * - 10.7: WHEN the finale sequence begins, THE Backend SHALL emit timed events for reveals
   * - 11.2: THE Mini_Event_System SHALL support event timings: pre-round, mid-round, post-round, and pre-finale
   * 
   * @param partyId - The party ID
   * @param options - Timing options for the finale sequence
   */
  async startFinaleSequence(
    partyId: string,
    options: {
      categoryRevealDelayMs?: number;
      identityRevealDelayMs?: number;
      phaseDelayMs?: number;
    } = {}
  ): Promise<void> {
    const {
      categoryRevealDelayMs = 3000,  // 3 seconds between category reveals
      identityRevealDelayMs = 5000,  // 5 seconds between identity reveals
      phaseDelayMs = 2000            // 2 seconds between phases
    } = options;

    try {
      // Get the party to verify state
      const party = await partyService.getParty(partyId);
      if (!party) {
        throw new Error('Party does not exist');
      }

      // Verify party is in PLAYING state (or already in FINALE)
      if (party.status !== PartyStatus.PLAYING && party.status !== PartyStatus.FINALE) {
        throw new Error('Party must be in PLAYING or FINALE state to run finale sequence');
      }

      // If not already in FINALE, transition to it
      if (party.status === PartyStatus.PLAYING) {
        // Check for pre-finale event before transitioning to finale
        // **Validates: Requirement 11.2** - pre-finale timing
        await this.checkAndTriggerEvent(partyId, 'pre-finale', 'normal');

        // Transition to FINALE state
        const updatedParty = await partyService.transitionToFinale(partyId);

        // Calculate final standings
        await scoringService.calculateFinalStandings(partyId);

        // Get frozen anonymous leaderboard
        const frozenStandings = await identityService.getAnonymousLeaderboard(partyId);

        // Requirement 8.2: Broadcast finale:start with frozen standings
        this.broadcastToParty(partyId, 'finale:start', {
          frozenStandings
        });

        // Broadcast state:changed to all players
        this.broadcastToParty(partyId, 'state:changed', {
          newState: PartyStatus.FINALE,
          data: {
            party: updatedParty,
            frozenStandings
          }
        });

        console.log(`Finale sequence started for party ${party.code}`);
      }

      // Wait before starting category reveals
      await this.delay(phaseDelayMs);

      // Phase 1: Reveal bonus categories
      try {
        await this.handleFinaleRevealCategories(partyId, categoryRevealDelayMs);
      } catch (err) {
        console.error('Error in category reveals, continuing:', err);
      }

      // Wait before starting prediction results reveal
      await this.delay(phaseDelayMs);

      // Phase 2: Reveal prediction results
      // **Validates: Requirements 16.4, 17.5**
      // - 16.4: THE Prediction_System SHALL reveal prediction results during the finale
      // - 17.5: THE Scoring_System SHALL apply prediction bonuses during the finale reveal sequence
      try {
        await this.handleFinaleRevealPredictions(partyId);
      } catch (err) {
        console.error('Error in prediction reveals, continuing:', err);
      }

      // Wait before starting identity reveals
      await this.delay(phaseDelayMs);

      // Phase 3: Reveal identities (last to first place)
      try {
        await this.handleFinaleRevealIdentities(partyId, identityRevealDelayMs);
      } catch (err) {
        console.error('Error in identity reveals, continuing:', err);
      }

      // Wait before crowning champion
      await this.delay(phaseDelayMs);

      // Phase 4: Crown the champion
      try {
        await this.handleFinaleChampion(partyId);
      } catch (err) {
        console.error('Error crowning champion, continuing:', err);
      }

      // Transition to COMPLETE state
      try {
        await partyService.transitionToComplete(partyId);

        // Broadcast state:changed to COMPLETE
        this.broadcastToParty(partyId, 'state:changed', {
          newState: PartyStatus.COMPLETE,
          data: {}
        });
      } catch (err) {
        console.error('Error transitioning to COMPLETE:', err);
      }

      console.log(`Finale sequence completed for party ${party.code}`);
    } catch (error: any) {
      console.error('Error during finale sequence:', error);
      throw error;
    }
  }

  /**
   * Helper function to create a delay.
   * 
   * @param ms - Delay in milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const socketService = new SocketService();
