import { prisma } from '../lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import {
  Party,
  Player,
  PartySettings,
  PartyStatus,
  PlayerStatus,
  DEFAULT_PARTY_SETTINGS,
  AppError,
  ClientErrorCode,
} from '../types';

// Characters used for party code generation (uppercase alphanumeric)
const CODE_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 4;
const MAX_CODE_GENERATION_ATTEMPTS = 100;

/**
 * PartyService handles party lifecycle and state transitions.
 * 
 * **Validates: Requirements 1.1, 1.2**
 */
export class PartyService {
  /**
   * Generates a random 4-character alphanumeric code.
   * Uses uppercase letters (A-Z) and digits (0-9).
   * 
   * @returns A 4-character uppercase alphanumeric code
   */
  private generateRandomCode(): string {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * CODE_CHARACTERS.length);
      code += CODE_CHARACTERS[randomIndex];
    }
    return code;
  }

  /**
   * Generates a unique party code that doesn't conflict with any active parties.
   * Active parties are those with status not equal to COMPLETE.
   * 
   * **Validates: Requirements 1.1, 1.2**
   * - 1.1: WHEN a user requests to create a party, THE Backend SHALL generate a unique 4-character alphanumeric code
   * - 1.2: WHEN a party code is generated, THE Backend SHALL ensure it does not conflict with any active Party codes
   * 
   * @returns A unique 4-character alphanumeric code
   * @throws Error if unable to generate a unique code after max attempts
   */
  async generateCode(): Promise<string> {
    for (let attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt++) {
      const code = this.generateRandomCode();
      
      // Check if code conflicts with any active party (status not COMPLETE)
      const existingParty = await prisma.party.findFirst({
        where: {
          code,
          status: {
            not: PartyStatus.COMPLETE,
          },
        },
      });

      // If no conflict found, return the code
      if (!existingParty) {
        return code;
      }
    }

    // This should be extremely rare given 36^4 = 1,679,616 possible codes
    throw new Error('Unable to generate unique party code after maximum attempts');
  }

  /**
   * Creates a new party with the given host name and optional settings.
   * The creator is automatically designated as the host.
   * 
   * **Validates: Requirements 1.5**
   * - 1.5: WHEN a Party is created, THE Backend SHALL designate the creator as the Host
   * 
   * @param hostName - The name of the player creating the party
   * @param settings - Optional partial settings to override defaults
   * @returns The created party and host player
   */
  async createParty(
    hostName: string,
    settings?: Partial<PartySettings>
  ): Promise<{ party: Party; host: Player }> {
    const code = await this.generateCode();
    const partyId = uuidv4();
    const hostId = uuidv4();

    // Merge provided settings with defaults
    const partySettings: PartySettings = {
      ...DEFAULT_PARTY_SETTINGS,
      ...settings,
    };

    // Create party and host player in a transaction
    const [partyRecord, hostRecord] = await prisma.$transaction([
      prisma.party.create({
        data: {
          id: partyId,
          code,
          status: PartyStatus.LOBBY,
          hostId,
          settings: JSON.stringify(partySettings),
        },
      }),
      prisma.player.create({
        data: {
          id: hostId,
          name: hostName,
          partyId,
          isHost: true,
          status: PlayerStatus.CONNECTED,
        },
      }),
    ]);

    // Convert to typed interfaces
    const party: Party = {
      id: partyRecord.id,
      code: partyRecord.code,
      status: partyRecord.status as PartyStatus,
      hostId: partyRecord.hostId,
      settings: JSON.parse(partyRecord.settings) as PartySettings,
      createdAt: partyRecord.createdAt,
      startedAt: partyRecord.startedAt,
      completedAt: partyRecord.completedAt,
    };

    const host: Player = {
      id: hostRecord.id,
      name: hostRecord.name,
      avatarUrl: hostRecord.avatarUrl,
      partyId: hostRecord.partyId,
      isHost: hostRecord.isHost,
      isReady: hostRecord.isReady,
      status: hostRecord.status as PlayerStatus,
      socketId: hostRecord.socketId,
      joinedAt: hostRecord.joinedAt,
    };

    return { party, host };
  }

  /**
   * Gets a party by its unique code.
   * 
   * @param code - The 4-character party code
   * @returns The party if found, null otherwise
   */
  async getPartyByCode(code: string): Promise<Party | null> {
    const partyRecord = await prisma.party.findUnique({
      where: { code },
    });

    if (!partyRecord) {
      return null;
    }

    return {
      id: partyRecord.id,
      code: partyRecord.code,
      status: partyRecord.status as PartyStatus,
      hostId: partyRecord.hostId,
      settings: JSON.parse(partyRecord.settings) as PartySettings,
      createdAt: partyRecord.createdAt,
      startedAt: partyRecord.startedAt,
      completedAt: partyRecord.completedAt,
    };
  }

  /**
   * Gets a party by its ID.
   * 
   * @param partyId - The party's unique ID
   * @returns The party if found, null otherwise
   */
  async getParty(partyId: string): Promise<Party | null> {
    const partyRecord = await prisma.party.findUnique({
      where: { id: partyId },
    });

    if (!partyRecord) {
      return null;
    }

    return {
      id: partyRecord.id,
      code: partyRecord.code,
      status: partyRecord.status as PartyStatus,
      hostId: partyRecord.hostId,
      settings: JSON.parse(partyRecord.settings) as PartySettings,
      createdAt: partyRecord.createdAt,
      startedAt: partyRecord.startedAt,
      completedAt: partyRecord.completedAt,
    };
  }

  /**
   * Checks if a party code is available (not used by any active party).
   * 
   * @param code - The code to check
   * @returns true if the code is available, false otherwise
   */
  async isCodeAvailable(code: string): Promise<boolean> {
    const existingParty = await prisma.party.findFirst({
      where: {
        code,
        status: {
          not: PartyStatus.COMPLETE,
        },
      },
    });

    return !existingParty;
  }

  /**
   * Gets a player by their ID.
   * 
   * @param playerId - The player's unique ID
   * @returns The player if found, null otherwise
   */
  async getPlayer(playerId: string): Promise<Player | null> {
    const playerRecord = await prisma.player.findUnique({
      where: { id: playerId },
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
      joinedAt: playerRecord.joinedAt,
    };
  }

  /**
   * Updates party settings with validation.
   * 
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.7, 14.5**
   * - 3.1: WHILE the Party status is LOBBY, THE Host SHALL be able to modify game settings
   * - 3.2: WHEN the Host modifies settings, THE Backend SHALL validate that songs_per_player is 1, 2, or 3
   * - 3.3: WHEN the Host modifies settings, THE Backend SHALL validate that play_duration is 30, 45, 60, or 90 seconds
   * - 3.4: WHEN the Host modifies settings, THE Backend SHALL allow enabling or disabling confidence_betting
   * - 3.5: WHEN the Host modifies settings, THE Backend SHALL allow selecting 0, 1, 2, or 3 Bonus_Categories
   * - 3.7: WHEN a non-Host Player attempts to modify settings, THE Backend SHALL reject the request with an error
   * - 14.5: WHEN validation fails, THE Backend SHALL return specific error messages indicating which field is invalid
   * 
   * @param partyId - The party's unique ID
   * @param playerId - The ID of the player attempting to modify settings
   * @param settings - Partial settings to update
   * @returns The updated party
   * @throws AppError if party does not exist (PARTY_NOT_FOUND)
   * @throws AppError if player does not exist (PLAYER_NOT_FOUND)
   * @throws AppError if player is not the host (NOT_HOST)
   * @throws AppError if party is not in LOBBY state (INVALID_STATE)
   * @throws AppError if settings validation fails (INVALID_SETTINGS)
   */
  async updateSettings(
    partyId: string,
    playerId: string,
    settings: Partial<PartySettings>
  ): Promise<Party> {
    // Get the party
    const party = await this.getParty(partyId);
    if (!party) {
      throw new AppError(ClientErrorCode.PARTY_NOT_FOUND, 'Party does not exist');
    }

    // Get the player
    const player = await this.getPlayer(playerId);
    if (!player) {
      throw new AppError(ClientErrorCode.PLAYER_NOT_FOUND, 'Player does not exist');
    }

    // Requirement 3.7: Only host can modify settings
    if (!player.isHost || player.partyId !== partyId) {
      throw new AppError(ClientErrorCode.NOT_HOST, 'Only the host can modify settings');
    }

    // Requirement 3.1: Only allow modifications in LOBBY state
    if (party.status !== PartyStatus.LOBBY) {
      throw new AppError(ClientErrorCode.INVALID_STATE, 'Settings can only be modified in LOBBY state');
    }

    // Validate settings - throws AppError with field-specific errors
    this.validateSettings(settings);

    // Merge new settings with existing settings
    const updatedSettings: PartySettings = {
      ...party.settings,
      ...settings,
    };

    // Update the party in the database
    const updatedPartyRecord = await prisma.party.update({
      where: { id: partyId },
      data: {
        settings: JSON.stringify(updatedSettings),
      },
    });

    return {
      id: updatedPartyRecord.id,
      code: updatedPartyRecord.code,
      status: updatedPartyRecord.status as PartyStatus,
      hostId: updatedPartyRecord.hostId,
      settings: JSON.parse(updatedPartyRecord.settings) as PartySettings,
      createdAt: updatedPartyRecord.createdAt,
      startedAt: updatedPartyRecord.startedAt,
      completedAt: updatedPartyRecord.completedAt,
    };
  }

  /**
   * Validates party settings and throws AppError with field-specific errors.
   * 
   * **Validates: Requirements 3.2, 3.3, 3.5, 14.5**
   * - 3.2: songs_per_player must be 1, 2, or 3
   * - 3.3: play_duration must be 30, 45, 60, or 90
   * - 3.5: bonusCategoryCount must be 0, 1, 2, or 3
   * - 14.5: WHEN validation fails, THE Backend SHALL return specific error messages indicating which field is invalid
   * 
   * @param settings - The settings to validate
   * @throws AppError with field-specific error if validation fails
   */
  private validateSettings(settings: Partial<PartySettings>): void {
    // Requirement 3.2: Validate songs_per_player
    if (settings.songsPerPlayer !== undefined) {
      if (![1, 2, 3].includes(settings.songsPerPlayer)) {
        throw new AppError(
          ClientErrorCode.INVALID_SETTINGS,
          'songsPerPlayer must be 1, 2, or 3',
          'songsPerPlayer'
        );
      }
    }

    // Requirement 3.3: Validate play_duration
    if (settings.playDuration !== undefined) {
      if (![30, 45, 60, 90].includes(settings.playDuration)) {
        throw new AppError(
          ClientErrorCode.INVALID_SETTINGS,
          'playDuration must be 30, 45, 60, or 90 seconds',
          'playDuration'
        );
      }
    }

    // Requirement 3.5: Validate bonusCategoryCount
    if (settings.bonusCategoryCount !== undefined) {
      if (![0, 1, 2, 3].includes(settings.bonusCategoryCount)) {
        throw new AppError(
          ClientErrorCode.INVALID_SETTINGS,
          'bonusCategoryCount must be 0, 1, 2, or 3',
          'bonusCategoryCount'
        );
      }
    }

    // Requirement 3.4: enableConfidenceBetting is a boolean, no validation needed beyond type
    // TypeScript handles this at compile time
  }

  /**
   * Gets all players in a party.
   * 
   * @param partyId - The party's unique ID
   * @returns Array of players in the party
   */
  async getPlayers(partyId: string): Promise<Player[]> {
    const playerRecords = await prisma.player.findMany({
      where: { partyId },
    });

    return playerRecords.map(record => ({
      id: record.id,
      name: record.name,
      avatarUrl: record.avatarUrl,
      partyId: record.partyId,
      isHost: record.isHost,
      isReady: record.isReady,
      status: record.status as PlayerStatus,
      socketId: record.socketId,
      joinedAt: record.joinedAt,
    }));
  }

  /**
   * Checks if all players in a party have submitted their required number of songs.
   * 
   * **Validates: Requirements 4.7**
   * - 4.7: WHEN all Players have submitted their required songs, THE Backend SHALL transition the Party to PLAYING state
   * 
   * @param partyId - The party's unique ID
   * @returns true if all players have submitted their required songs, false otherwise
   */
  async allPlayersSubmittedSongs(partyId: string): Promise<boolean> {
    // Get the party to check settings
    const party = await this.getParty(partyId);
    if (!party) {
      return false;
    }

    const songsPerPlayer = party.settings.songsPerPlayer;

    // Get all players in the party
    const players = await this.getPlayers(partyId);
    if (players.length === 0) {
      return false;
    }

    // Count songs for each player
    for (const player of players) {
      const songCount = await prisma.song.count({
        where: {
          partyId,
          submitterId: player.id,
        },
      });

      if (songCount < songsPerPlayer) {
        return false;
      }
    }

    return true;
  }

  /**
   * Transitions a party from SUBMITTING to PLAYING state.
   * 
   * **Validates: Requirements 4.7**
   * - 4.7: WHEN all Players have submitted their required songs, THE Backend SHALL transition the Party to PLAYING state
   * 
   * @param partyId - The party's unique ID
   * @returns The updated party
   * @throws AppError if party does not exist (PARTY_NOT_FOUND)
   * @throws AppError if party is not in SUBMITTING state (INVALID_STATE)
   * @throws AppError if not all players have submitted their required songs (INVALID_STATE)
   */
  async transitionToPlaying(partyId: string): Promise<Party> {
    // Get the party
    const party = await this.getParty(partyId);
    if (!party) {
      throw new AppError(ClientErrorCode.PARTY_NOT_FOUND, 'Party does not exist');
    }

    // Verify party is in SUBMITTING state
    if (party.status !== PartyStatus.SUBMITTING) {
      throw new AppError(ClientErrorCode.INVALID_STATE, 'Party must be in SUBMITTING state to transition to PLAYING');
    }

    // Check if all players have submitted their required songs
    const allSubmitted = await this.allPlayersSubmittedSongs(partyId);
    if (!allSubmitted) {
      throw new AppError(ClientErrorCode.SUBMISSIONS_INCOMPLETE, 'Not all players have submitted their required songs');
    }

    // Update the party status to PLAYING
    const updatedPartyRecord = await prisma.party.update({
      where: { id: partyId },
      data: {
        status: PartyStatus.PLAYING,
      },
    });

    return {
      id: updatedPartyRecord.id,
      code: updatedPartyRecord.code,
      status: updatedPartyRecord.status as PartyStatus,
      hostId: updatedPartyRecord.hostId,
      settings: JSON.parse(updatedPartyRecord.settings) as PartySettings,
      createdAt: updatedPartyRecord.createdAt,
      startedAt: updatedPartyRecord.startedAt,
      completedAt: updatedPartyRecord.completedAt,
    };
  }

  /**
   * Starts a party, transitioning it from LOBBY to SUBMITTING state.
   * Only the host can start the party.
   * 
   * @param partyId - The party's unique ID
   * @param playerId - The ID of the player attempting to start the party
   * @returns The updated party
   * @throws AppError if party does not exist (PARTY_NOT_FOUND)
   * @throws AppError if player does not exist (UNAUTHORIZED)
   * @throws AppError if player is not the host (NOT_HOST)
   * @throws AppError if party is not in LOBBY state (INVALID_STATE)
   */
  async startParty(partyId: string, playerId: string): Promise<Party> {
    // Get the party
    const party = await this.getParty(partyId);
    if (!party) {
      throw new AppError(ClientErrorCode.PARTY_NOT_FOUND, 'Party does not exist');
    }

    // Get the player
    const player = await this.getPlayer(playerId);
    if (!player) {
      throw new AppError(ClientErrorCode.PLAYER_NOT_FOUND, 'Player does not exist');
    }

    // Only host can start the party
    if (!player.isHost || player.partyId !== partyId) {
      throw new AppError(ClientErrorCode.NOT_HOST, 'Only the host can start the party');
    }

    // Only allow starting from LOBBY state
    if (party.status !== PartyStatus.LOBBY) {
      throw new AppError(ClientErrorCode.INVALID_STATE, 'Party can only be started from LOBBY state');
    }

    // Update the party status to SUBMITTING
    const updatedPartyRecord = await prisma.party.update({
      where: { id: partyId },
      data: {
        status: PartyStatus.SUBMITTING,
        startedAt: new Date(),
      },
    });

    return {
      id: updatedPartyRecord.id,
      code: updatedPartyRecord.code,
      status: updatedPartyRecord.status as PartyStatus,
      hostId: updatedPartyRecord.hostId,
      settings: JSON.parse(updatedPartyRecord.settings) as PartySettings,
      createdAt: updatedPartyRecord.createdAt,
      startedAt: updatedPartyRecord.startedAt,
      completedAt: updatedPartyRecord.completedAt,
    };
  }

  /**
   * Transitions a party from PLAYING to FINALE state.
   * 
   * **Validates: Requirements 8.2**
   * - 8.2: WHEN the game transitions to FINALE, THE Backend SHALL freeze the leaderboard and display "Scores Locked"
   * 
   * @param partyId - The party's unique ID
   * @returns The updated party
   * @throws AppError if party does not exist (PARTY_NOT_FOUND)
   * @throws AppError if party is not in PLAYING state (INVALID_STATE)
   */
  async transitionToFinale(partyId: string): Promise<Party> {
    // Get the party
    const party = await this.getParty(partyId);
    if (!party) {
      throw new AppError(ClientErrorCode.PARTY_NOT_FOUND, 'Party does not exist');
    }

    // Verify party is in PLAYING state
    if (party.status !== PartyStatus.PLAYING) {
      throw new AppError(ClientErrorCode.INVALID_STATE, 'Party must be in PLAYING state to transition to FINALE');
    }

    // Update the party status to FINALE
    const updatedPartyRecord = await prisma.party.update({
      where: { id: partyId },
      data: {
        status: PartyStatus.FINALE,
      },
    });

    return {
      id: updatedPartyRecord.id,
      code: updatedPartyRecord.code,
      status: updatedPartyRecord.status as PartyStatus,
      hostId: updatedPartyRecord.hostId,
      settings: JSON.parse(updatedPartyRecord.settings) as PartySettings,
      createdAt: updatedPartyRecord.createdAt,
      startedAt: updatedPartyRecord.startedAt,
      completedAt: updatedPartyRecord.completedAt,
    };
  }

  /**
   * Transitions a party from FINALE to COMPLETE state.
   * 
   * @param partyId - The party's unique ID
   * @returns The updated party
   * @throws AppError if party does not exist (PARTY_NOT_FOUND)
   * @throws AppError if party is not in FINALE state (INVALID_STATE)
   */
  async transitionToComplete(partyId: string): Promise<Party> {
    // Get the party
    const party = await this.getParty(partyId);
    if (!party) {
      throw new AppError(ClientErrorCode.PARTY_NOT_FOUND, 'Party does not exist');
    }

    // Verify party is in FINALE state
    if (party.status !== PartyStatus.FINALE) {
      throw new AppError(ClientErrorCode.INVALID_STATE, 'Party must be in FINALE state to transition to COMPLETE');
    }

    // Update the party status to COMPLETE
    const updatedPartyRecord = await prisma.party.update({
      where: { id: partyId },
      data: {
        status: PartyStatus.COMPLETE,
        completedAt: new Date(),
      },
    });

    return {
      id: updatedPartyRecord.id,
      code: updatedPartyRecord.code,
      status: updatedPartyRecord.status as PartyStatus,
      hostId: updatedPartyRecord.hostId,
      settings: JSON.parse(updatedPartyRecord.settings) as PartySettings,
      createdAt: updatedPartyRecord.createdAt,
      startedAt: updatedPartyRecord.startedAt,
      completedAt: updatedPartyRecord.completedAt,
    };
  }

  /**
   * Kicks a player from a party.
   * Only the host can kick players, and the host cannot kick themselves.
   * 
   * @param partyId - The party's unique ID
   * @param hostPlayerId - The ID of the host player performing the kick
   * @param targetPlayerId - The ID of the player to kick
   * @throws AppError if party does not exist (PARTY_NOT_FOUND)
   * @throws AppError if host player does not exist (UNAUTHORIZED)
   * @throws AppError if host player is not the host (NOT_HOST)
   * @throws AppError if target player does not exist (PARTY_NOT_FOUND)
   * @throws AppError if trying to kick self (NOT_HOST)
   * @throws AppError if party is not in LOBBY state (INVALID_STATE)
   */
  async kickPlayer(partyId: string, hostPlayerId: string, targetPlayerId: string): Promise<void> {
    // Get the party
    const party = await this.getParty(partyId);
    if (!party) {
      throw new AppError(ClientErrorCode.PARTY_NOT_FOUND, 'Party does not exist');
    }

    // Get the host player
    const hostPlayer = await this.getPlayer(hostPlayerId);
    if (!hostPlayer) {
      throw new AppError(ClientErrorCode.PLAYER_NOT_FOUND, 'Player does not exist');
    }

    // Only host can kick players
    if (!hostPlayer.isHost || hostPlayer.partyId !== partyId) {
      throw new AppError(ClientErrorCode.NOT_HOST, 'Only the host can kick players');
    }

    // Only allow kicking in LOBBY state
    if (party.status !== PartyStatus.LOBBY) {
      throw new AppError(ClientErrorCode.INVALID_STATE, 'Players can only be kicked in LOBBY state');
    }

    // Cannot kick self
    if (hostPlayerId === targetPlayerId) {
      throw new AppError(ClientErrorCode.CANNOT_KICK_SELF, 'Cannot kick yourself');
    }

    // Get the target player
    const targetPlayer = await this.getPlayer(targetPlayerId);
    if (!targetPlayer || targetPlayer.partyId !== partyId) {
      throw new AppError(ClientErrorCode.TARGET_NOT_FOUND, 'Target player not found in this party');
    }

    // Update the player status to KICKED
    await prisma.player.update({
      where: { id: targetPlayerId },
      data: {
        status: PlayerStatus.KICKED,
        socketId: null,
      },
    });
  }

  /**
   * Joins an existing party with the given code.
   * 
   * **Validates: Requirements 1.3, 1.4, 1.6, 14.1**
   * - 1.3: WHEN a user provides a valid party code, THE Backend SHALL add them to the corresponding Party
   * - 1.4: WHEN a user provides an invalid party code, THE Backend SHALL return an error message indicating the party does not exist
   * - 1.6: WHEN a Player joins a Party, THE Backend SHALL reject the request if Party status is not LOBBY
   * - 14.1: WHEN a Player attempts to join a full Party, THE Backend SHALL return an error indicating "Party is full"
   * 
   * @param code - The 4-character party code
   * @param playerName - The name of the player joining
   * @returns The party and the newly created player
   * @throws AppError if party does not exist (PARTY_NOT_FOUND)
   * @throws AppError if party is not in LOBBY state (PARTY_STARTED)
   * @throws AppError if party is full (PARTY_FULL)
   */
  async joinParty(
    code: string,
    playerName: string
  ): Promise<{ party: Party; player: Player }> {
    // Find the party by code
    const partyRecord = await prisma.party.findUnique({
      where: { code },
    });

    // Requirement 1.4: Return error if party does not exist
    if (!partyRecord) {
      throw new AppError(ClientErrorCode.PARTY_NOT_FOUND, 'Party does not exist');
    }

    // Requirement 1.6: Reject if party is not in LOBBY state
    if (partyRecord.status !== PartyStatus.LOBBY) {
      throw new AppError(ClientErrorCode.PARTY_STARTED, 'Party has already started');
    }

    // Requirement 14.1: Check if party is full (max 20 players)
    const playerCount = await prisma.player.count({
      where: { partyId: partyRecord.id },
    });
    if (playerCount >= 20) {
      throw new AppError(ClientErrorCode.PARTY_FULL, 'Party is full');
    }

    // Requirement 1.3: Add player to the party
    const playerId = uuidv4();
    const playerRecord = await prisma.player.create({
      data: {
        id: playerId,
        name: playerName,
        partyId: partyRecord.id,
        isHost: false,
        status: PlayerStatus.CONNECTED,
      },
    });

    // Convert to typed interfaces
    const party: Party = {
      id: partyRecord.id,
      code: partyRecord.code,
      status: partyRecord.status as PartyStatus,
      hostId: partyRecord.hostId,
      settings: JSON.parse(partyRecord.settings) as PartySettings,
      createdAt: partyRecord.createdAt,
      startedAt: partyRecord.startedAt,
      completedAt: partyRecord.completedAt,
    };

    const player: Player = {
      id: playerRecord.id,
      name: playerRecord.name,
      avatarUrl: playerRecord.avatarUrl,
      partyId: playerRecord.partyId,
      isHost: playerRecord.isHost,
      isReady: playerRecord.isReady,
      status: playerRecord.status as PlayerStatus,
      socketId: playerRecord.socketId,
      joinedAt: playerRecord.joinedAt,
    };

    return { party, player };
  }

  /**
   * Cleans up completed parties that are older than 24 hours.
   * Deletes parties with status COMPLETE and completedAt timestamp older than 24 hours.
   * Related records (players, songs, votes, identities, bonus results) are cascade deleted.
   * 
   * **Validates: Requirements 15.6**
   * - 15.6: THE Backend SHALL clean up completed Parties older than 24 hours to free resources
   * 
   * @returns The number of parties deleted
   */
  async cleanupCompletedParties(): Promise<number> {
    // Calculate the cutoff time (24 hours ago)
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 24);

    // Find all parties that are COMPLETE and have completedAt older than 24 hours
    const partiesToDelete = await prisma.party.findMany({
      where: {
        status: PartyStatus.COMPLETE,
        completedAt: {
          lt: cutoffTime,
        },
      },
      select: {
        id: true,
      },
    });

    if (partiesToDelete.length === 0) {
      return 0;
    }

    // Delete the parties (cascade delete will handle related records)
    const deleteResult = await prisma.party.deleteMany({
      where: {
        id: {
          in: partiesToDelete.map(p => p.id),
        },
      },
    });

    return deleteResult.count;
  }
}

// Export singleton instance
export const partyService = new PartyService();
