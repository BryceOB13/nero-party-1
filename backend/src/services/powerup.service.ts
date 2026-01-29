import { prisma } from '../lib/prisma';
import {
  PowerUp,
  PlayerPowerUp,
  PowerUpEffectResult,
  POWER_UPS,
  AppError,
  ClientErrorCode,
} from '../types';

/**
 * PowerUpService handles power-up management, purchasing, and usage.
 * 
 * **Validates: Requirements 13.4, 13.5, 13.6**
 * - 13.4: THE Power_Up_System SHALL allow players to purchase power-ups using earned points
 * - 13.5: THE Power_Up_System SHALL validate that players have sufficient points before purchase
 * - 13.6: THE Power_Up_System SHALL limit each power-up to one per player per game (maxPerPlayer)
 */
export class PowerUpService {
  /**
   * Gets all predefined power-ups.
   * 
   * **Validates: Requirements 13.1, 13.2**
   * - 13.1: THE Power_Up_System SHALL define power-ups with id, name, description, icon, cost, max per game, timing, and effect
   * - 13.2: THE Power_Up_System SHALL support power-up timings: submission, voting, and anytime
   * 
   * @returns Array of predefined power-ups
   */
  getPowerUps(): PowerUp[] {
    return POWER_UPS;
  }

  /**
   * Gets a specific power-up by ID.
   * 
   * @param powerUpId - The ID of the power-up to retrieve
   * @returns The power-up if found, null otherwise
   */
  getPowerUp(powerUpId: string): PowerUp | null {
    return POWER_UPS.find(p => p.id === powerUpId) || null;
  }

  /**
   * Gets all power-ups owned by a player.
   * 
   * @param playerId - The ID of the player
   * @returns Array of PlayerPowerUp records
   * @throws AppError if player does not exist (PLAYER_NOT_FOUND)
   */
  async getPlayerPowerUps(playerId: string): Promise<PlayerPowerUp[]> {
    // Verify the player exists
    const playerRecord = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!playerRecord) {
      throw new AppError(ClientErrorCode.PLAYER_NOT_FOUND, 'Player does not exist');
    }

    // Get all power-ups for the player
    const powerUpRecords = await prisma.playerPowerUp.findMany({
      where: { playerId },
      orderBy: { purchasedAt: 'asc' },
    });

    return powerUpRecords.map(record => ({
      id: record.id,
      playerId: record.playerId,
      powerUpId: record.powerUpId,
      purchasedAt: record.purchasedAt,
      usedAt: record.usedAt,
      usedOnSongId: record.usedOnSongId,
    }));
  }

  /**
   * Gets a player's current power-up points balance.
   * 
   * @param playerId - The ID of the player
   * @returns The player's current power-up points
   * @throws AppError if player does not exist (PLAYER_NOT_FOUND)
   */
  async getPlayerPoints(playerId: string): Promise<number> {
    const playerRecord = await prisma.player.findUnique({
      where: { id: playerId },
      select: { powerUpPoints: true },
    });

    if (!playerRecord) {
      throw new AppError(ClientErrorCode.PLAYER_NOT_FOUND, 'Player does not exist');
    }

    return playerRecord.powerUpPoints;
  }

  /**
   * Awards points to a player.
   * 
   * @param playerId - The ID of the player
   * @param points - The number of points to award (must be positive)
   * @returns The player's new point balance
   * @throws AppError if player does not exist (PLAYER_NOT_FOUND)
   * @throws AppError if points is not positive (INVALID_STATE)
   */
  async awardPoints(playerId: string, points: number): Promise<number> {
    if (points <= 0) {
      throw new AppError(ClientErrorCode.INVALID_STATE, 'Points to award must be positive');
    }

    // Verify the player exists
    const playerRecord = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!playerRecord) {
      throw new AppError(ClientErrorCode.PLAYER_NOT_FOUND, 'Player does not exist');
    }

    // Update the player's points
    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: {
        powerUpPoints: {
          increment: points,
        },
      },
      select: { powerUpPoints: true },
    });

    return updatedPlayer.powerUpPoints;
  }

  /**
   * Deducts points from a player.
   * 
   * @param playerId - The ID of the player
   * @param points - The number of points to deduct (must be positive)
   * @returns The player's new point balance
   * @throws AppError if player does not exist (PLAYER_NOT_FOUND)
   * @throws AppError if points is not positive (INVALID_STATE)
   * @throws AppError if player has insufficient points (INVALID_STATE)
   */
  async deductPoints(playerId: string, points: number): Promise<number> {
    if (points <= 0) {
      throw new AppError(ClientErrorCode.INVALID_STATE, 'Points to deduct must be positive');
    }

    // Verify the player exists and has sufficient points
    const playerRecord = await prisma.player.findUnique({
      where: { id: playerId },
      select: { powerUpPoints: true },
    });

    if (!playerRecord) {
      throw new AppError(ClientErrorCode.PLAYER_NOT_FOUND, 'Player does not exist');
    }

    if (playerRecord.powerUpPoints < points) {
      throw new AppError(
        ClientErrorCode.INVALID_STATE,
        `Insufficient points. Player has ${playerRecord.powerUpPoints} points but needs ${points}.`
      );
    }

    // Update the player's points
    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: {
        powerUpPoints: {
          decrement: points,
        },
      },
      select: { powerUpPoints: true },
    });

    return updatedPlayer.powerUpPoints;
  }

  /**
   * Purchases a power-up for a player.
   * 
   * **Validates: Requirements 13.4, 13.5, 13.6**
   * - 13.4: THE Power_Up_System SHALL allow players to purchase power-ups using earned points
   * - 13.5: THE Power_Up_System SHALL validate that players have sufficient points before purchase
   * - 13.6: THE Power_Up_System SHALL limit each power-up to one per player per game (maxPerPlayer)
   * 
   * **Property 14: Power-Up Purchase Validation**
   * For any power-up purchase attempt, if the player's points >= power-up cost AND the player's
   * count of that power-up type < maxPerPlayer, the purchase SHALL succeed and deduct the cost;
   * otherwise, the purchase SHALL fail with an appropriate error.
   * 
   * @param playerId - The ID of the player purchasing the power-up
   * @param powerUpId - The ID of the power-up to purchase
   * @returns The created PlayerPowerUp record
   * @throws AppError if player does not exist (PLAYER_NOT_FOUND)
   * @throws AppError if power-up does not exist (INVALID_STATE)
   * @throws AppError if player has insufficient points (INVALID_STATE)
   * @throws AppError if player has reached max limit for this power-up (INVALID_STATE)
   */
  async purchasePowerUp(playerId: string, powerUpId: string): Promise<PlayerPowerUp> {
    // Verify the power-up exists
    const powerUp = this.getPowerUp(powerUpId);

    if (!powerUp) {
      throw new AppError(ClientErrorCode.INVALID_STATE, 'Power-up does not exist');
    }

    // Verify the player exists and get their current points
    const playerRecord = await prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true, powerUpPoints: true, partyId: true },
    });

    if (!playerRecord) {
      throw new AppError(ClientErrorCode.PLAYER_NOT_FOUND, 'Player does not exist');
    }

    // Validate sufficient points (Requirement 13.5)
    if (playerRecord.powerUpPoints < powerUp.cost) {
      throw new AppError(
        ClientErrorCode.INVALID_STATE,
        `Insufficient points. Power-up costs ${powerUp.cost} points but player only has ${playerRecord.powerUpPoints}.`
      );
    }

    // Validate max per player limit (Requirement 13.6)
    // Count how many of this power-up type the player already has in this party
    const existingCount = await prisma.playerPowerUp.count({
      where: {
        playerId,
        powerUpId,
        // Only count power-ups from the current party (player's current party)
        player: {
          partyId: playerRecord.partyId,
        },
      },
    });

    if (existingCount >= powerUp.maxPerPlayer) {
      throw new AppError(
        ClientErrorCode.INVALID_STATE,
        `Maximum limit reached. Player can only have ${powerUp.maxPerPlayer} of this power-up per game.`
      );
    }

    // Perform the purchase in a transaction
    const [, playerPowerUpRecord] = await prisma.$transaction([
      // Deduct points from player
      prisma.player.update({
        where: { id: playerId },
        data: {
          powerUpPoints: {
            decrement: powerUp.cost,
          },
        },
      }),
      // Create the PlayerPowerUp record
      prisma.playerPowerUp.create({
        data: {
          playerId,
          powerUpId,
        },
      }),
    ]);

    return {
      id: playerPowerUpRecord.id,
      playerId: playerPowerUpRecord.playerId,
      powerUpId: playerPowerUpRecord.powerUpId,
      purchasedAt: playerPowerUpRecord.purchasedAt,
      usedAt: playerPowerUpRecord.usedAt,
      usedOnSongId: playerPowerUpRecord.usedOnSongId,
    };
  }

  /**
   * Marks a power-up as used.
   * 
   * @param playerPowerUpId - The ID of the PlayerPowerUp record to mark as used
   * @param songId - Optional song ID if the power-up was used on a specific song
   * @returns The updated PlayerPowerUp record
   * @throws AppError if the PlayerPowerUp does not exist (INVALID_STATE)
   * @throws AppError if the power-up has already been used (INVALID_STATE)
   */
  async usePowerUp(playerPowerUpId: string, songId?: string): Promise<PlayerPowerUp> {
    // Get the PlayerPowerUp record
    const playerPowerUpRecord = await prisma.playerPowerUp.findUnique({
      where: { id: playerPowerUpId },
    });

    if (!playerPowerUpRecord) {
      throw new AppError(ClientErrorCode.INVALID_STATE, 'Player power-up does not exist');
    }

    if (playerPowerUpRecord.usedAt !== null) {
      throw new AppError(ClientErrorCode.INVALID_STATE, 'Power-up has already been used');
    }

    // If songId is provided, verify the song exists
    if (songId) {
      const songRecord = await prisma.song.findUnique({
        where: { id: songId },
      });

      if (!songRecord) {
        throw new AppError(ClientErrorCode.SONG_NOT_FOUND, 'Song does not exist');
      }
    }

    // Update the record to mark as used
    const updatedRecord = await prisma.playerPowerUp.update({
      where: { id: playerPowerUpId },
      data: {
        usedAt: new Date(),
        usedOnSongId: songId ?? null,
      },
    });

    return {
      id: updatedRecord.id,
      playerId: updatedRecord.playerId,
      powerUpId: updatedRecord.powerUpId,
      purchasedAt: updatedRecord.purchasedAt,
      usedAt: updatedRecord.usedAt,
      usedOnSongId: updatedRecord.usedOnSongId,
    };
  }

  /**
   * Gets all unused power-ups for a player.
   * 
   * @param playerId - The ID of the player
   * @returns Array of unused PlayerPowerUp records
   * @throws AppError if player does not exist (PLAYER_NOT_FOUND)
   */
  async getUnusedPowerUps(playerId: string): Promise<PlayerPowerUp[]> {
    // Verify the player exists
    const playerRecord = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!playerRecord) {
      throw new AppError(ClientErrorCode.PLAYER_NOT_FOUND, 'Player does not exist');
    }

    // Get all unused power-ups for the player
    const powerUpRecords = await prisma.playerPowerUp.findMany({
      where: {
        playerId,
        usedAt: null,
      },
      orderBy: { purchasedAt: 'asc' },
    });

    return powerUpRecords.map(record => ({
      id: record.id,
      playerId: record.playerId,
      powerUpId: record.powerUpId,
      purchasedAt: record.purchasedAt,
      usedAt: record.usedAt,
      usedOnSongId: record.usedOnSongId,
    }));
  }

  /**
   * Gets power-ups available for a specific timing.
   * 
   * @param timing - The timing to filter by ('submission', 'voting', or 'anytime')
   * @returns Array of power-ups available at the specified timing
   */
  getPowerUpsByTiming(timing: 'submission' | 'voting' | 'anytime'): PowerUp[] {
    return POWER_UPS.filter(p => p.timing === timing || p.timing === 'anytime');
  }

  /**
   * Gets a specific PlayerPowerUp record by ID.
   * 
   * @param playerPowerUpId - The ID of the PlayerPowerUp record
   * @returns The PlayerPowerUp record
   * @throws AppError if the PlayerPowerUp does not exist (INVALID_STATE)
   */
  async getPlayerPowerUp(playerPowerUpId: string): Promise<PlayerPowerUp> {
    const playerPowerUpRecord = await prisma.playerPowerUp.findUnique({
      where: { id: playerPowerUpId },
    });

    if (!playerPowerUpRecord) {
      throw new AppError(ClientErrorCode.INVALID_STATE, 'Player power-up does not exist');
    }

    return {
      id: playerPowerUpRecord.id,
      playerId: playerPowerUpRecord.playerId,
      powerUpId: playerPowerUpRecord.powerUpId,
      purchasedAt: playerPowerUpRecord.purchasedAt,
      usedAt: playerPowerUpRecord.usedAt,
      usedOnSongId: playerPowerUpRecord.usedOnSongId,
    };
  }

  /**
   * Applies a power-up effect based on its type.
   * 
   * **Validates: Requirements 13.3, 14.1-14.6**
   * - 13.3: THE Power_Up_System SHALL apply power-up effects according to their type
   * - 14.1: Sneak Peek - See one random vote before it's locked
   * - 14.2: Unmask - Reveal one player's identity early
   * - 14.3: Critic Bomb - Your next vote counts as 1.5x weight
   * - 14.4: Insurance Policy - Protect your song from the lowest vote
   * - 14.5: Second Chance - Re-submit one song if it scores below 5
   * - 14.6: Anonymous Critic - Hide your identity on one vote
   * 
   * @param playerPowerUpId - The ID of the PlayerPowerUp record to apply
   * @param context - Optional context for the effect (songId, targetPlayerId)
   * @returns The result of applying the power-up effect
   * @throws AppError if the PlayerPowerUp does not exist (INVALID_STATE)
   * @throws AppError if the power-up has already been used (INVALID_STATE)
   * @throws AppError if the power-up type is unknown (INVALID_STATE)
   */
  async applyPowerUpEffect(
    playerPowerUpId: string,
    context?: { songId?: string; targetPlayerId?: string }
  ): Promise<PowerUpEffectResult> {
    // Get the PlayerPowerUp record
    const playerPowerUpRecord = await prisma.playerPowerUp.findUnique({
      where: { id: playerPowerUpId },
    });

    if (!playerPowerUpRecord) {
      throw new AppError(ClientErrorCode.INVALID_STATE, 'Player power-up does not exist');
    }

    if (playerPowerUpRecord.usedAt !== null) {
      throw new AppError(ClientErrorCode.INVALID_STATE, 'Power-up has already been used');
    }

    // Get the power-up definition
    const powerUp = this.getPowerUp(playerPowerUpRecord.powerUpId);

    if (!powerUp) {
      throw new AppError(ClientErrorCode.INVALID_STATE, 'Power-up definition not found');
    }

    // Create the PlayerPowerUp object for handlers
    const playerPowerUp: PlayerPowerUp = {
      id: playerPowerUpRecord.id,
      playerId: playerPowerUpRecord.playerId,
      powerUpId: playerPowerUpRecord.powerUpId,
      purchasedAt: playerPowerUpRecord.purchasedAt,
      usedAt: playerPowerUpRecord.usedAt,
      usedOnSongId: playerPowerUpRecord.usedOnSongId,
    };

    // Dispatch to the appropriate effect handler based on power-up type
    let result: PowerUpEffectResult;

    switch (powerUp.effect.type) {
      case 'peek':
        result = await this.applyPeekEffect(playerPowerUp, powerUp, context);
        break;
      case 'boost':
        result = await this.applyBoostEffect(playerPowerUp, powerUp);
        break;
      case 'insurance':
        if (!context?.songId) {
          throw new AppError(ClientErrorCode.INVALID_STATE, 'Insurance effect requires a songId');
        }
        result = await this.applyInsuranceEffect(playerPowerUp, powerUp, context.songId);
        break;
      case 'second_chance':
        if (!context?.songId) {
          throw new AppError(ClientErrorCode.INVALID_STATE, 'Second chance effect requires a songId');
        }
        result = await this.applySecondChanceEffect(playerPowerUp, powerUp, context.songId);
        break;
      case 'anonymous_vote':
        result = await this.applyAnonymousVoteEffect(playerPowerUp, powerUp);
        break;
      default:
        throw new AppError(ClientErrorCode.INVALID_STATE, `Unknown power-up effect type`);
    }

    // Mark the power-up as used
    await this.usePowerUp(playerPowerUpId, context?.songId);

    return result;
  }

  /**
   * Applies the peek effect (Sneak Peek, Unmask).
   * 
   * **Validates: Requirements 14.1, 14.2**
   * - 14.1: Sneak Peek - See one random vote before it's locked
   * - 14.2: Unmask - Reveal one player's identity early
   * 
   * @param playerPowerUp - The PlayerPowerUp record
   * @param powerUp - The PowerUp definition
   * @param context - Optional context (songId for vote peek, targetPlayerId for identity peek)
   * @returns The result containing the peeked vote or identity
   */
  private async applyPeekEffect(
    playerPowerUp: PlayerPowerUp,
    powerUp: PowerUp,
    context?: { songId?: string; targetPlayerId?: string }
  ): Promise<PowerUpEffectResult> {
    const effect = powerUp.effect as { type: 'peek'; target: 'vote' | 'identity' };

    if (effect.target === 'vote') {
      // Sneak Peek: Return a random unlocked vote for the current song
      if (!context?.songId) {
        return {
          type: 'peek',
          success: false,
          message: 'No song specified for vote peek',
        };
      }

      // Get all unlocked votes for the song (excluding the player's own vote)
      const votes = await prisma.vote.findMany({
        where: {
          songId: context.songId,
          isLocked: false,
          voterId: { not: playerPowerUp.playerId },
        },
      });

      if (votes.length === 0) {
        return {
          type: 'peek',
          success: false,
          message: 'No unlocked votes available to peek',
        };
      }

      // Select a random vote
      const randomVote = votes[Math.floor(Math.random() * votes.length)];

      return {
        type: 'peek',
        success: true,
        message: 'Successfully peeked at a vote',
        data: {
          vote: {
            voterId: randomVote.voterId,
            rating: randomVote.rating,
          },
        },
      };
    } else if (effect.target === 'identity') {
      // Unmask: Reveal the real identity of a target player
      if (!context?.targetPlayerId) {
        return {
          type: 'peek',
          success: false,
          message: 'No target player specified for identity peek',
        };
      }

      // Get the player's identity
      const identity = await prisma.partyIdentity.findUnique({
        where: { playerId: context.targetPlayerId },
        include: { player: true },
      });

      if (!identity) {
        return {
          type: 'peek',
          success: false,
          message: 'Target player identity not found',
        };
      }

      return {
        type: 'peek',
        success: true,
        message: `Revealed ${identity.alias}'s true identity`,
        data: {
          identity: {
            playerId: context.targetPlayerId,
            realName: identity.player.name,
          },
        },
      };
    }

    return {
      type: 'peek',
      success: false,
      message: 'Invalid peek target',
    };
  }

  /**
   * Applies the boost effect (Critic Bomb).
   * 
   * **Validates: Requirement 14.3**
   * - 14.3: Critic Bomb - Your next vote counts as 1.5x weight
   * 
   * This marks the player's next vote to use the multiplier.
   * The actual weight application happens in the voting/scoring service.
   * The Vote.superVote field is used to track boosted votes.
   * 
   * @param playerPowerUp - The PlayerPowerUp record
   * @param powerUp - The PowerUp definition
   * @returns The result indicating the boost is ready
   */
  private async applyBoostEffect(
    playerPowerUp: PlayerPowerUp,
    powerUp: PowerUp
  ): Promise<PowerUpEffectResult> {
    const effect = powerUp.effect as { type: 'boost'; target: 'vote'; multiplier: number };

    // The boost effect is tracked via the PlayerPowerUp being marked as used
    // When the player submits their next vote, the voting service should check
    // for an active boost power-up and apply the multiplier via Vote.superVote
    
    return {
      type: 'boost',
      success: true,
      message: `Your next vote will count as ${effect.multiplier}x weight`,
      data: {
        multiplier: effect.multiplier,
      },
    };
  }

  /**
   * Applies the insurance effect (Insurance Policy).
   * 
   * **Validates: Requirement 14.4**
   * - 14.4: Insurance Policy - Protect your song from the lowest vote
   * 
   * This marks the song as protected from the lowest vote.
   * The scoring service should check for this protection when calculating scores.
   * 
   * @param playerPowerUp - The PlayerPowerUp record
   * @param powerUp - The PowerUp definition
   * @param songId - The ID of the song to protect
   * @returns The result indicating the song is protected
   */
  private async applyInsuranceEffect(
    playerPowerUp: PlayerPowerUp,
    powerUp: PowerUp,
    songId: string
  ): Promise<PowerUpEffectResult> {
    // Verify the song exists and belongs to the player
    const song = await prisma.song.findUnique({
      where: { id: songId },
    });

    if (!song) {
      return {
        type: 'insurance',
        success: false,
        message: 'Song not found',
      };
    }

    if (song.submitterId !== playerPowerUp.playerId) {
      return {
        type: 'insurance',
        success: false,
        message: 'You can only protect your own songs',
      };
    }

    // The insurance protection is tracked via the PlayerPowerUp.usedOnSongId
    // When scoring, the scoring service should check for insurance power-ups
    // used on the song and exclude the lowest vote from the calculation
    
    return {
      type: 'insurance',
      success: true,
      message: 'Your song is now protected from the lowest vote',
      data: {
        protected: true,
      },
    };
  }

  /**
   * Applies the second chance effect (Second Chance).
   * 
   * **Validates: Requirement 14.5**
   * - 14.5: Second Chance - Re-submit one song if it scores below 5
   * 
   * This checks if the song scored below the threshold and returns eligibility.
   * The actual re-submission is handled by the submission service.
   * 
   * @param playerPowerUp - The PlayerPowerUp record
   * @param powerUp - The PowerUp definition
   * @param songId - The ID of the song to check
   * @returns The result indicating whether the song is eligible for re-submission
   */
  private async applySecondChanceEffect(
    playerPowerUp: PlayerPowerUp,
    powerUp: PowerUp,
    songId: string
  ): Promise<PowerUpEffectResult> {
    const effect = powerUp.effect as { type: 'second_chance'; threshold: number };

    // Verify the song exists and belongs to the player
    const song = await prisma.song.findUnique({
      where: { id: songId },
    });

    if (!song) {
      return {
        type: 'second_chance',
        success: false,
        message: 'Song not found',
      };
    }

    if (song.submitterId !== playerPowerUp.playerId) {
      return {
        type: 'second_chance',
        success: false,
        message: 'You can only use second chance on your own songs',
      };
    }

    // Check if the song has been scored
    if (song.finalScore === null) {
      return {
        type: 'second_chance',
        success: false,
        message: 'Song has not been scored yet',
      };
    }

    // Check if the song scored below the threshold
    const eligible = song.finalScore < effect.threshold;

    if (eligible) {
      return {
        type: 'second_chance',
        success: true,
        message: `Song scored ${song.finalScore.toFixed(1)}, which is below ${effect.threshold}. You can re-submit!`,
        data: {
          eligible: true,
        },
      };
    } else {
      return {
        type: 'second_chance',
        success: false,
        message: `Song scored ${song.finalScore.toFixed(1)}, which is above the threshold of ${effect.threshold}`,
        data: {
          eligible: false,
        },
      };
    }
  }

  /**
   * Applies the anonymous vote effect (Anonymous Critic).
   * 
   * **Validates: Requirement 14.6**
   * - 14.6: Anonymous Critic - Hide your identity on one vote
   * 
   * This marks the player's next vote as anonymous.
   * The vote will not be revealed during vote-reveal events or finale.
   * 
   * @param playerPowerUp - The PlayerPowerUp record
   * @param powerUp - The PowerUp definition
   * @returns The result indicating the anonymous vote is ready
   */
  private async applyAnonymousVoteEffect(
    playerPowerUp: PlayerPowerUp,
    powerUp: PowerUp
  ): Promise<PowerUpEffectResult> {
    // The anonymous vote effect is tracked via the PlayerPowerUp being marked as used
    // When the player submits their next vote, the voting service should check
    // for an active anonymous vote power-up and mark the vote accordingly
    // This affects how the vote is displayed during finale and vote-reveal events
    
    return {
      type: 'anonymous_vote',
      success: true,
      message: 'Your next vote will be anonymous',
    };
  }

  /**
   * Checks if a player has an active (unused) power-up of a specific type.
   * 
   * @param playerId - The ID of the player
   * @param powerUpId - The ID of the power-up type to check for
   * @returns The active PlayerPowerUp if found, null otherwise
   */
  async getActivePowerUp(playerId: string, powerUpId: string): Promise<PlayerPowerUp | null> {
    const record = await prisma.playerPowerUp.findFirst({
      where: {
        playerId,
        powerUpId,
        usedAt: null,
      },
      orderBy: { purchasedAt: 'asc' },
    });

    if (!record) {
      return null;
    }

    return {
      id: record.id,
      playerId: record.playerId,
      powerUpId: record.powerUpId,
      purchasedAt: record.purchasedAt,
      usedAt: record.usedAt,
      usedOnSongId: record.usedOnSongId,
    };
  }

  /**
   * Checks if a song has insurance protection (from Insurance Policy power-up).
   * 
   * @param songId - The ID of the song to check
   * @returns True if the song has insurance protection, false otherwise
   */
  async hasInsuranceProtection(songId: string): Promise<boolean> {
    const insurancePowerUp = await prisma.playerPowerUp.findFirst({
      where: {
        usedOnSongId: songId,
        powerUpId: 'insurance-policy',
        usedAt: { not: null },
      },
    });

    return insurancePowerUp !== null;
  }
}

// Export singleton instance
export const powerUpService = new PowerUpService();
