import { prisma } from '../lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { PartyIdentity, Player, LeaderboardEntry, PlayerStatus } from '../types';
import { ALIAS_POOL, AVATAR_SILHOUETTES, PLAYER_COLORS } from '../constants/identity';

/**
 * IdentityService handles anonymous identity assignment and reveals.
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3**
 * - 2.1: WHEN a Player joins a Party, THE Backend SHALL assign them a random Alias from a pool of at least 32 unique names
 * - 2.2: WHEN an Alias is assigned, THE Backend SHALL ensure no two Players in the same Party have the same Alias
 * - 2.3: WHEN a Player is assigned an Alias, THE Backend SHALL also assign them a unique Silhouette shape and color
 */
export class IdentityService {
  /**
   * Fisher-Yates shuffle algorithm to randomize an array.
   * Creates a new shuffled array without modifying the original.
   * 
   * @param array - The array to shuffle
   * @returns A new shuffled array
   */
  private shuffle<T>(array: readonly T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Assigns unique anonymous identities to all players in a party.
   * Each player receives a unique alias, silhouette, and color combination.
   * 
   * **Validates: Requirements 2.1, 2.2, 2.3**
   * - 2.1: Assigns random alias from pool of 32+ unique names
   * - 2.2: Ensures no duplicate aliases within the party
   * - 2.3: Assigns unique silhouette and color to each player
   * 
   * @param partyId - The ID of the party
   * @param players - Array of players to assign identities to
   * @returns Array of created PartyIdentity records
   * @throws Error if there are more players than available aliases
   */
  async assignIdentities(partyId: string, players: Player[]): Promise<PartyIdentity[]> {
    const playerCount = players.length;

    // Validate we have enough identities for all players
    if (playerCount > ALIAS_POOL.length) {
      throw new Error(
        `Cannot assign identities: ${playerCount} players exceeds alias pool size of ${ALIAS_POOL.length}`
      );
    }

    if (playerCount > AVATAR_SILHOUETTES.length) {
      throw new Error(
        `Cannot assign identities: ${playerCount} players exceeds silhouette pool size of ${AVATAR_SILHOUETTES.length}`
      );
    }

    if (playerCount > PLAYER_COLORS.length) {
      throw new Error(
        `Cannot assign identities: ${playerCount} players exceeds color pool size of ${PLAYER_COLORS.length}`
      );
    }

    // Shuffle all pools to ensure random assignment
    const shuffledAliases = this.shuffle(ALIAS_POOL);
    const shuffledSilhouettes = this.shuffle(AVATAR_SILHOUETTES);
    const shuffledColors = this.shuffle(PLAYER_COLORS);

    // Create identity records for each player
    const identityData = players.map((player, index) => ({
      id: uuidv4(),
      partyId,
      playerId: player.id,
      alias: shuffledAliases[index],
      silhouette: shuffledSilhouettes[index],
      color: shuffledColors[index],
      isRevealed: false,
      revealedAt: null,
      revealOrder: null,
    }));

    // Insert all identities in a transaction
    await prisma.$transaction(
      identityData.map((data) =>
        prisma.partyIdentity.create({ data })
      )
    );

    // Convert to typed interfaces and return
    const identities: PartyIdentity[] = identityData.map((data) => ({
      id: data.id,
      partyId: data.partyId,
      playerId: data.playerId,
      alias: data.alias,
      silhouette: data.silhouette,
      color: data.color,
      isRevealed: data.isRevealed,
      revealedAt: data.revealedAt,
      revealOrder: data.revealOrder,
    }));

    return identities;
  }

  /**
   * Retrieves the identity for a specific player.
   * 
   * @param playerId - The ID of the player
   * @returns The player's PartyIdentity if found, null otherwise
   */
  async getIdentity(playerId: string): Promise<PartyIdentity | null> {
    const identityRecord = await prisma.partyIdentity.findUnique({
      where: { playerId },
    });

    if (!identityRecord) {
      return null;
    }

    return {
      id: identityRecord.id,
      partyId: identityRecord.partyId,
      playerId: identityRecord.playerId,
      alias: identityRecord.alias,
      silhouette: identityRecord.silhouette,
      color: identityRecord.color,
      isRevealed: identityRecord.isRevealed,
      revealedAt: identityRecord.revealedAt,
      revealOrder: identityRecord.revealOrder,
    };
  }

  /**
   * Retrieves all identities for a party.
   * 
   * @param partyId - The ID of the party
   * @returns Array of PartyIdentity records for the party
   */
  async getIdentities(partyId: string): Promise<PartyIdentity[]> {
    const identityRecords = await prisma.partyIdentity.findMany({
      where: { partyId },
    });

    return identityRecords.map((record) => ({
      id: record.id,
      partyId: record.partyId,
      playerId: record.playerId,
      alias: record.alias,
      silhouette: record.silhouette,
      color: record.color,
      isRevealed: record.isRevealed,
      revealedAt: record.revealedAt,
      revealOrder: record.revealOrder,
    }));
  }

  /**
   * Marks a player's identity as revealed during the finale sequence.
   * Sets the reveal timestamp and order number.
   * 
   * **Validates: Requirements 2.6**
   * - 2.6: WHEN the Party enters FINALE state, THE Backend SHALL reveal Player identities in reverse score order
   * 
   * @param partyId - The ID of the party
   * @param playerId - The ID of the player whose identity is being revealed
   * @param order - The reveal order number (1 = first revealed, which is last place)
   * @returns The updated PartyIdentity record
   * @throws Error if identity not found for the player in the party
   */
  async revealIdentity(partyId: string, playerId: string, order: number): Promise<PartyIdentity> {
    // Find the identity for this player in this party
    const existingIdentity = await prisma.partyIdentity.findFirst({
      where: {
        partyId,
        playerId,
      },
    });

    if (!existingIdentity) {
      throw new Error(`Identity not found for player ${playerId} in party ${partyId}`);
    }

    // Update the identity to mark it as revealed
    const updatedIdentity = await prisma.partyIdentity.update({
      where: { id: existingIdentity.id },
      data: {
        isRevealed: true,
        revealedAt: new Date(),
        revealOrder: order,
      },
    });

    return {
      id: updatedIdentity.id,
      partyId: updatedIdentity.partyId,
      playerId: updatedIdentity.playerId,
      alias: updatedIdentity.alias,
      silhouette: updatedIdentity.silhouette,
      color: updatedIdentity.color,
      isRevealed: updatedIdentity.isRevealed,
      revealedAt: updatedIdentity.revealedAt,
      revealOrder: updatedIdentity.revealOrder,
    };
  }

  /**
   * Gets the reveal order for players in a party during the finale.
   * Returns players sorted by score ascending (last place first).
   * This is the order in which identities should be revealed.
   * 
   * **Validates: Requirements 2.6**
   * - 2.6: WHEN the Party enters FINALE state, THE Backend SHALL reveal Player identities in reverse score order
   * 
   * @param partyId - The ID of the party
   * @returns Array of Player objects sorted by score ascending (last to first place)
   */
  async getRevealOrder(partyId: string): Promise<Player[]> {
    // Get all players with their identities and songs
    const players = await prisma.player.findMany({
      where: { partyId },
      include: {
        submittedSongs: true,
      },
    });

    if (players.length === 0) {
      return [];
    }

    // Calculate total score for each player
    const playersWithScores = players.map((player) => {
      const totalScore = player.submittedSongs.reduce((sum, song) => {
        return sum + (song.finalScore ?? 0);
      }, 0);

      return {
        player: {
          id: player.id,
          name: player.name,
          avatarUrl: player.avatarUrl,
          partyId: player.partyId,
          isHost: player.isHost,
          isReady: player.isReady,
          status: player.status as PlayerStatus,
          socketId: player.socketId,
          joinedAt: player.joinedAt,
        } as Player,
        score: totalScore,
      };
    });

    // Sort by score ascending (last place first, first place last)
    playersWithScores.sort((a, b) => a.score - b.score);

    // Return just the players in reveal order
    return playersWithScores.map((p) => p.player);
  }

  /**
   * Retrieves the anonymous leaderboard for a party.
   * Returns leaderboard entries with aliases instead of real names.
   * 
   * **Validates: Requirements 2.4**
   * - 2.4: WHILE the Party status is LOBBY, SUBMITTING, or PLAYING, THE Frontend SHALL display only Aliases and Silhouettes
   * 
   * @param partyId - The ID of the party
   * @param previousScores - Optional map of playerId to previous score for calculating movement
   * @returns Array of LeaderboardEntry sorted by score descending
   */
  async getAnonymousLeaderboard(
    partyId: string,
    previousScores?: Map<string, number>
  ): Promise<LeaderboardEntry[]> {
    // Get all identities for the party with their players
    const identities = await prisma.partyIdentity.findMany({
      where: { partyId },
      include: {
        player: {
          include: {
            submittedSongs: true,
          },
        },
      },
    });

    if (identities.length === 0) {
      return [];
    }

    // Calculate scores for each player
    const playerScores: Array<{
      playerId: string;
      alias: string;
      silhouette: string;
      color: string;
      score: number;
      songCount: number;
      isRevealed: boolean;
      revealedName: string | null;
    }> = [];

    for (const identity of identities) {
      // Calculate total score from all songs' finalScore values
      const songs = identity.player.submittedSongs;
      const score = songs.reduce((total, song) => {
        return total + (song.finalScore ?? 0);
      }, 0);

      playerScores.push({
        playerId: identity.playerId,
        alias: identity.alias,
        silhouette: identity.silhouette,
        color: identity.color,
        score,
        songCount: songs.length,
        isRevealed: identity.isRevealed,
        revealedName: identity.isRevealed ? identity.player.name : null,
      });
    }

    // Sort by score descending
    playerScores.sort((a, b) => b.score - a.score);

    // Build leaderboard entries with ranks and movement indicators
    const leaderboard: LeaderboardEntry[] = playerScores.map((player, index) => {
      const rank = index + 1;
      const previousScore = previousScores?.get(player.playerId) ?? null;
      
      // Calculate movement indicator
      let movement: 'up' | 'down' | 'same' | 'new';
      if (previousScore === null) {
        movement = 'new';
      } else if (player.score > previousScore) {
        movement = 'up';
      } else if (player.score < previousScore) {
        movement = 'down';
      } else {
        movement = 'same';
      }

      return {
        rank,
        alias: player.alias,
        silhouette: player.silhouette,
        color: player.color,
        score: player.score,
        previousScore,
        movement,
        songCount: player.songCount,
        isRevealed: player.isRevealed,
        revealedName: player.revealedName,
      };
    });

    return leaderboard;
  }
}

// Export singleton instance
export const identityService = new IdentityService();
