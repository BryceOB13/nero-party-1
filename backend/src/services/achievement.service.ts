import { prisma } from '../lib/prisma';
import {
  Achievement,
  AchievementCondition,
  PlayerAchievement,
  ACHIEVEMENTS,
  AppError,
  ClientErrorCode,
} from '../types';

/**
 * AchievementService handles achievement tracking, checking, and unlocking.
 * 
 * **Validates: Requirements 9.3, 9.4**
 * - 9.3: THE Achievement_System SHALL track achievements in real-time during gameplay
 * - 9.4: WHEN a player meets an achievement condition, THE Achievement_System SHALL record the achievement with timestamp and party reference
 */
export class AchievementService {
  /**
   * Gets all predefined achievements.
   * 
   * **Validates: Requirements 9.1, 9.2**
   * - 9.1: THE Achievement_System SHALL define achievements with id, name, description, icon, rarity, bonus points, and condition
   * - 9.2: THE Achievement_System SHALL support achievement rarities: common, uncommon, rare, and legendary
   * 
   * @returns Array of predefined achievements
   */
  getAchievements(): Achievement[] {
    return ACHIEVEMENTS;
  }

  /**
   * Checks all achievement conditions for a player and returns newly unlocked achievements.
   * 
   * **Validates: Requirement 9.3**
   * - THE Achievement_System SHALL track achievements in real-time during gameplay
   * 
   * **Property 8: Achievement Condition Evaluation**
   * For any player in a party, when a game event occurs that could trigger an achievement,
   * the Achievement_System SHALL evaluate all applicable conditions.
   * 
   * @param playerId - The ID of the player to check achievements for
   * @param partyId - The ID of the party
   * @returns Array of newly unlocked achievements
   * @throws AppError if player does not exist (PLAYER_NOT_FOUND)
   * @throws AppError if party does not exist (PARTY_NOT_FOUND)
   */
  async checkAchievements(playerId: string, partyId: string): Promise<Achievement[]> {
    // Verify the player exists
    const playerRecord = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!playerRecord) {
      throw new AppError(ClientErrorCode.PLAYER_NOT_FOUND, 'Player does not exist');
    }

    // Verify the party exists
    const partyRecord = await prisma.party.findUnique({
      where: { id: partyId },
    });

    if (!partyRecord) {
      throw new AppError(ClientErrorCode.PARTY_NOT_FOUND, 'Party does not exist');
    }

    // Get already unlocked achievements for this player in this party
    const existingAchievements = await prisma.playerAchievement.findMany({
      where: {
        playerId,
        partyId,
      },
    });

    const unlockedAchievementIds = new Set(existingAchievements.map(a => a.achievementId));

    // Get player's songs with scores
    const playerSongs = await prisma.song.findMany({
      where: {
        submitterId: playerId,
        partyId,
      },
      include: {
        votes: true,
      },
    });

    // Get all songs in the party for position calculations
    const allSongs = await prisma.song.findMany({
      where: { partyId },
      include: {
        votes: true,
      },
    });

    // Get bonus results for sweep achievement
    const bonusResults = await prisma.bonusResult.findMany({
      where: {
        partyId,
        winnerPlayerId: playerId,
      },
    });

    // Build context for achievement evaluation
    const context: AchievementContext = {
      playerId,
      partyId,
      playerSongs,
      allSongs,
      bonusResults,
    };

    // Check each achievement
    const newlyUnlocked: Achievement[] = [];

    for (const achievement of ACHIEVEMENTS) {
      // Skip if already unlocked
      if (unlockedAchievementIds.has(achievement.id)) {
        continue;
      }

      // Evaluate the condition
      const isUnlocked = await this.evaluateCondition(achievement.condition, context);

      if (isUnlocked) {
        newlyUnlocked.push(achievement);
      }
    }

    return newlyUnlocked;
  }

  /**
   * Unlocks an achievement for a player and records it with bonus points.
   * 
   * **Validates: Requirement 9.4**
   * - WHEN a player meets an achievement condition, THE Achievement_System SHALL record the achievement with timestamp and party reference
   * 
   * @param playerId - The ID of the player
   * @param achievementId - The ID of the achievement to unlock
   * @param partyId - The ID of the party
   * @returns The created PlayerAchievement record
   * @throws AppError if player does not exist (PLAYER_NOT_FOUND)
   * @throws AppError if achievement does not exist (INVALID_ACHIEVEMENT)
   * @throws AppError if achievement is already unlocked (ACHIEVEMENT_ALREADY_UNLOCKED)
   */
  async unlockAchievement(
    playerId: string,
    achievementId: string,
    partyId: string
  ): Promise<PlayerAchievement> {
    // Verify the player exists
    const playerRecord = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!playerRecord) {
      throw new AppError(ClientErrorCode.PLAYER_NOT_FOUND, 'Player does not exist');
    }

    // Find the achievement definition
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);

    if (!achievement) {
      throw new AppError(ClientErrorCode.INVALID_ACHIEVEMENT, 'Achievement does not exist');
    }

    // Check if already unlocked
    const existingAchievement = await prisma.playerAchievement.findFirst({
      where: {
        playerId,
        achievementId,
        partyId,
      },
    });

    if (existingAchievement) {
      // Return existing achievement instead of throwing error (idempotent behavior)
      return {
        id: existingAchievement.id,
        playerId: existingAchievement.playerId,
        achievementId: existingAchievement.achievementId,
        unlockedAt: existingAchievement.unlockedAt,
        partyId: existingAchievement.partyId,
        bonusPoints: existingAchievement.bonusPoints,
      };
    }

    // Create the PlayerAchievement record
    const playerAchievementRecord = await prisma.playerAchievement.create({
      data: {
        playerId,
        achievementId,
        partyId,
        bonusPoints: achievement.bonusPoints,
      },
    });

    return {
      id: playerAchievementRecord.id,
      playerId: playerAchievementRecord.playerId,
      achievementId: playerAchievementRecord.achievementId,
      unlockedAt: playerAchievementRecord.unlockedAt,
      partyId: playerAchievementRecord.partyId,
      bonusPoints: playerAchievementRecord.bonusPoints,
    };
  }

  /**
   * Gets all achievements unlocked by a player, optionally filtered by party.
   * 
   * @param playerId - The ID of the player
   * @param partyId - Optional party ID to filter by
   * @returns Array of PlayerAchievement records
   * @throws AppError if player does not exist (PLAYER_NOT_FOUND)
   */
  async getPlayerAchievements(playerId: string, partyId?: string): Promise<PlayerAchievement[]> {
    // Verify the player exists
    const playerRecord = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!playerRecord) {
      throw new AppError(ClientErrorCode.PLAYER_NOT_FOUND, 'Player does not exist');
    }

    // Build query filter
    const whereClause: { playerId: string; partyId?: string } = { playerId };
    if (partyId) {
      whereClause.partyId = partyId;
    }

    // Get achievements
    const achievementRecords = await prisma.playerAchievement.findMany({
      where: whereClause,
      orderBy: { unlockedAt: 'asc' },
    });

    return achievementRecords.map(record => ({
      id: record.id,
      playerId: record.playerId,
      achievementId: record.achievementId,
      unlockedAt: record.unlockedAt,
      partyId: record.partyId,
      bonusPoints: record.bonusPoints,
    }));
  }

  /**
   * Gets all achievements unlocked in a party by all players.
   * 
   * @param partyId - The ID of the party
   * @returns Array of PlayerAchievement records
   * @throws AppError if party does not exist (PARTY_NOT_FOUND)
   */
  async getPartyAchievements(partyId: string): Promise<PlayerAchievement[]> {
    // Verify the party exists
    const partyRecord = await prisma.party.findUnique({
      where: { id: partyId },
    });

    if (!partyRecord) {
      throw new AppError(ClientErrorCode.PARTY_NOT_FOUND, 'Party does not exist');
    }

    // Get all achievements for the party
    const achievementRecords = await prisma.playerAchievement.findMany({
      where: { partyId },
      orderBy: { unlockedAt: 'asc' },
    });

    return achievementRecords.map(record => ({
      id: record.id,
      playerId: record.playerId,
      achievementId: record.achievementId,
      unlockedAt: record.unlockedAt,
      partyId: record.partyId,
      bonusPoints: record.bonusPoints,
    }));
  }

  /**
   * Gets achievements in reveal order for the finale sequence.
   * Orders achievements by rarity (common first, legendary last) for dramatic effect.
   * 
   * **Validates: Requirement 10.1**
   * - WHEN the finale begins, THE Finale_Screen SHALL reveal achievements one-by-one with animations
   * 
   * @param partyId - The ID of the party
   * @returns Array of PlayerAchievement records in reveal order
   * @throws AppError if party does not exist (PARTY_NOT_FOUND)
   */
  async getAchievementRevealOrder(partyId: string): Promise<PlayerAchievement[]> {
    // Get all party achievements
    const achievements = await this.getPartyAchievements(partyId);

    // Define rarity order (common first, legendary last for dramatic reveal)
    const rarityOrder: Record<string, number> = {
      common: 1,
      uncommon: 2,
      rare: 3,
      legendary: 4,
    };

    // Sort by rarity, then by unlock time
    const sortedAchievements = achievements.sort((a, b) => {
      const achievementA = ACHIEVEMENTS.find(ach => ach.id === a.achievementId);
      const achievementB = ACHIEVEMENTS.find(ach => ach.id === b.achievementId);

      const rarityA = achievementA ? rarityOrder[achievementA.rarity] || 0 : 0;
      const rarityB = achievementB ? rarityOrder[achievementB.rarity] || 0 : 0;

      // Sort by rarity first
      if (rarityA !== rarityB) {
        return rarityA - rarityB;
      }

      // Then by unlock time
      return a.unlockedAt.getTime() - b.unlockedAt.getTime();
    });

    return sortedAchievements;
  }

  /**
   * Evaluates an achievement condition against the current game context.
   * 
   * @param condition - The achievement condition to evaluate
   * @param context - The game context for evaluation
   * @returns true if the condition is met, false otherwise
   */
  private async evaluateCondition(
    condition: AchievementCondition,
    context: AchievementContext
  ): Promise<boolean> {
    switch (condition.type) {
      case 'score_threshold':
        return this.evaluateScoreThreshold(condition, context);

      case 'perfect_score':
        return this.evaluatePerfectScore(context);

      case 'consistency':
        return this.evaluateConsistency(condition, context);

      case 'comeback':
        return this.evaluateComeback(condition, context);

      case 'underdog':
        return this.evaluateUnderdog(condition, context);

      case 'polarizing':
        return this.evaluatePolarizing(condition, context);

      case 'sweep':
        return this.evaluateSweep(condition, context);

      case 'streak':
        return this.evaluateStreak(condition, context);

      default:
        return false;
    }
  }

  /**
   * Evaluates score_threshold condition (Crowd Pleaser).
   * 
   * **Validates: Requirement 9.5**
   * - "Crowd Pleaser" (9+ average)
   */
  private evaluateScoreThreshold(
    condition: { type: 'score_threshold'; song: 'any' | 'all'; threshold: number },
    context: AchievementContext
  ): boolean {
    const songsWithScores = context.playerSongs.filter(s => s.rawAverage !== null);

    if (songsWithScores.length === 0) {
      return false;
    }

    if (condition.song === 'any') {
      // At least one song meets the threshold
      return songsWithScores.some(s => (s.rawAverage ?? 0) >= condition.threshold);
    } else {
      // All songs meet the threshold
      return songsWithScores.every(s => (s.rawAverage ?? 0) >= condition.threshold);
    }
  }

  /**
   * Evaluates perfect_score condition (Perfect 10).
   * 
   * **Validates: Requirement 9.5**
   * - "Perfect 10" (10.0 average)
   */
  private evaluatePerfectScore(context: AchievementContext): boolean {
    return context.playerSongs.some(s => s.rawAverage === 10.0);
  }

  /**
   * Evaluates consistency condition (Consistent King).
   * 
   * **Validates: Requirement 9.5**
   * - "Consistent King" (all songs within 1 point)
   */
  private evaluateConsistency(
    condition: { type: 'consistency'; variance: number },
    context: AchievementContext
  ): boolean {
    const songsWithScores = context.playerSongs.filter(s => s.rawAverage !== null);

    // Need at least 2 songs to evaluate consistency
    if (songsWithScores.length < 2) {
      return false;
    }

    const scores = songsWithScores.map(s => s.rawAverage!);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);

    // All songs within the variance threshold
    return (maxScore - minScore) <= condition.variance;
  }

  /**
   * Evaluates comeback condition (Comeback Kid).
   * 
   * **Validates: Requirement 9.6**
   * - "Comeback Kid" (gain 3+ positions)
   */
  private evaluateComeback(
    condition: { type: 'comeback'; positionsGained: number },
    context: AchievementContext
  ): boolean {
    // Calculate player rankings by round
    const roundScores = this.calculateRoundScores(context);

    // Need at least 2 rounds to evaluate comeback
    if (roundScores.length < 2) {
      return false;
    }

    // Check if player gained required positions between any consecutive rounds
    for (let i = 1; i < roundScores.length; i++) {
      const previousPosition = roundScores[i - 1].position;
      const currentPosition = roundScores[i].position;

      // Position improvement (lower is better, so previous - current = gain)
      const positionsGained = previousPosition - currentPosition;

      if (positionsGained >= condition.positionsGained) {
        return true;
      }
    }

    return false;
  }

  /**
   * Evaluates underdog condition (Underdog Victory).
   * 
   * **Validates: Requirement 9.6**
   * - "Underdog Victory" (win from last place)
   */
  private evaluateUnderdog(
    condition: { type: 'underdog'; startPosition: number; endPosition: number },
    context: AchievementContext
  ): boolean {
    const roundScores = this.calculateRoundScores(context);

    // Need at least 2 rounds
    if (roundScores.length < 2) {
      return false;
    }

    // Get first and last round positions
    const firstRoundPosition = roundScores[0].position;
    const lastRoundPosition = roundScores[roundScores.length - 1].position;
    const totalPlayers = roundScores[0].totalPlayers;

    // startPosition of -1 means "last place"
    const requiredStartPosition = condition.startPosition === -1 
      ? totalPlayers 
      : condition.startPosition;

    // Check if started at required position and ended at required position
    return firstRoundPosition === requiredStartPosition && lastRoundPosition === condition.endPosition;
  }

  /**
   * Evaluates polarizing condition (Love/Hate).
   * 
   * **Validates: Requirement 9.7**
   * - "Love/Hate" (receive both 1 and 10 on same song)
   */
  private evaluatePolarizing(
    condition: { type: 'polarizing'; minVariance: number },
    context: AchievementContext
  ): boolean {
    // Check if any song received both a 1 and a 10
    for (const song of context.playerSongs) {
      const ratings = song.votes.map(v => v.rating);
      
      if (ratings.includes(1) && ratings.includes(10)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Evaluates sweep condition (Category Sweep).
   * 
   * **Validates: Requirement 9.7**
   * - "Category Sweep" (win 2+ bonus categories)
   */
  private evaluateSweep(
    condition: { type: 'sweep'; categoriesWon: number },
    context: AchievementContext
  ): boolean {
    return context.bonusResults.length >= condition.categoriesWon;
  }

  /**
   * Evaluates streak condition.
   * Currently a placeholder for future streak-based achievements.
   */
  private evaluateStreak(
    condition: { type: 'streak'; streakType: 'voting' | 'winning'; count: number },
    context: AchievementContext
  ): boolean {
    // Streak achievements require tracking across multiple games
    // For now, return false as this would need additional data
    return false;
  }

  /**
   * Calculates player positions by round for comeback/underdog achievements.
   */
  private calculateRoundScores(context: AchievementContext): RoundPosition[] {
    // Group all songs by round
    const songsByRound = new Map<number, typeof context.allSongs>();

    for (const song of context.allSongs) {
      const round = song.roundNumber;
      if (!songsByRound.has(round)) {
        songsByRound.set(round, []);
      }
      songsByRound.get(round)!.push(song);
    }

    // Calculate cumulative scores and positions for each round
    const roundPositions: RoundPosition[] = [];
    const cumulativeScores = new Map<string, number>();

    // Get all unique submitter IDs
    const allSubmitters = new Set(context.allSongs.map(s => s.submitterId));

    // Initialize cumulative scores
    for (const submitterId of allSubmitters) {
      cumulativeScores.set(submitterId, 0);
    }

    // Process rounds in order
    const roundNumbers = Array.from(songsByRound.keys()).sort((a, b) => a - b);

    for (const roundNumber of roundNumbers) {
      const roundSongs = songsByRound.get(roundNumber)!;

      // Add round scores to cumulative totals
      for (const song of roundSongs) {
        const currentScore = cumulativeScores.get(song.submitterId) || 0;
        cumulativeScores.set(song.submitterId, currentScore + (song.finalScore || 0));
      }

      // Calculate positions based on cumulative scores
      const sortedPlayers = Array.from(cumulativeScores.entries())
        .sort((a, b) => b[1] - a[1]); // Higher score = better position

      // Find player's position
      const playerIndex = sortedPlayers.findIndex(([id]) => id === context.playerId);
      
      if (playerIndex !== -1) {
        roundPositions.push({
          roundNumber,
          position: playerIndex + 1, // 1-indexed position
          totalPlayers: sortedPlayers.length,
          score: cumulativeScores.get(context.playerId) || 0,
        });
      }
    }

    return roundPositions;
  }
}

/**
 * Context for achievement evaluation containing all relevant game data.
 */
interface AchievementContext {
  playerId: string;
  partyId: string;
  playerSongs: Array<{
    id: string;
    rawAverage: number | null;
    finalScore: number | null;
    roundNumber: number;
    votes: Array<{ rating: number }>;
  }>;
  allSongs: Array<{
    id: string;
    submitterId: string;
    rawAverage: number | null;
    finalScore: number | null;
    roundNumber: number;
    votes: Array<{ rating: number }>;
  }>;
  bonusResults: Array<{
    id: string;
    categoryId: string;
    winnerPlayerId: string;
  }>;
}

/**
 * Represents a player's position in a specific round.
 */
interface RoundPosition {
  roundNumber: number;
  position: number;
  totalPlayers: number;
  score: number;
}

// Export singleton instance
export const achievementService = new AchievementService();
