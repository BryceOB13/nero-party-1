import { prisma } from '../lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import {
  Vote,
  SongScore,
  FinalStanding,
  PartySettings,
  Song,
  BonusCategory,
  BonusResult,
  AppError,
  ClientErrorCode,
  ScoreBreakdown,
  PlayerAchievement,
  DEFAULT_PARTY_SETTINGS,
} from '../types';
import { predictionService } from './prediction.service';
import { themeService } from './theme.service';
import { eventService } from './event.service';

/**
 * ScoringService handles vote management and score calculation.
 * 
 * **Validates: Requirements 5.4, 5.5, 5.6, 6.1-6.8**
 */
export class ScoringService {
  /**
   * Casts a vote for a song with validation.
   * 
   * **Validates: Requirements 5.4, 5.5, 5.6, 14.5, 15.1, 15.2, 15.3, 15.4**
   * - 5.4: WHEN a Player votes on a song, THE Backend SHALL validate the rating is between 1 and 10
   * - 5.5: WHEN a Player attempts to vote on their own song, THE Backend SHALL reject the vote
   * - 5.6: WHEN a Player submits a vote, THE Backend SHALL lock the vote (votes are immutable once submitted)
   * - 14.5: WHEN validation fails, THE Backend SHALL return specific error messages indicating which field is invalid
   * - 15.1: WHEN a player has at least 2 points, THE Voting_System SHALL allow using a Super_Vote
   * - 15.2: WHEN a Super_Vote is used, THE Voting_System SHALL deduct 2 points from the voter
   * - 15.3: WHEN a Super_Vote is used, THE Scoring_System SHALL count that vote as 1.5x weight
   * - 15.4: THE Vote model SHALL store whether a vote is a Super_Vote
   * 
   * **Property 20: Self-Vote Prevention**
   * For any player attempting to vote on their own song, the vote should be rejected.
   * 
   * **Property 21: Vote Immutability**
   * For any submitted vote, subsequent attempts to change that vote should be rejected.
   * 
   * **Property 22: Vote Range Validation**
   * For any vote submission, the rating must be between 1 and 10.
   * 
   * **Property 16: Super Vote Mechanics**
   * For any super vote attempt, if the voter has >= 2 points, the vote SHALL be recorded with superVote=true,
   * 2 points SHALL be deducted, and the vote SHALL contribute 1.5x weight to the song's average calculation;
   * if points < 2, the super vote SHALL be rejected.
   * 
   * @param songId - The ID of the song being voted on
   * @param voterId - The ID of the player casting the vote
   * @param rating - The rating value (1-10)
   * @param superVote - Optional flag to use a super vote (costs 2 points, counts as 1.5x weight)
   * @returns The created vote
   * @throws AppError if song does not exist (SONG_NOT_FOUND)
   * @throws AppError if voter does not exist (PLAYER_NOT_FOUND)
   * @throws AppError if rating is not between 1 and 10 (INVALID_VOTE_RATING)
   * @throws AppError if voter is the song submitter (CANNOT_VOTE_OWN_SONG)
   * @throws AppError if vote already exists and is locked (VOTE_LOCKED)
   * @throws AppError if superVote is true but voter has insufficient points (INSUFFICIENT_POINTS)
   */
  async castVote(songId: string, voterId: string, rating: number, superVote: boolean = false): Promise<Vote> {
    // Get the song
    const songRecord = await prisma.song.findUnique({
      where: { id: songId },
    });

    if (!songRecord) {
      throw new AppError(ClientErrorCode.SONG_NOT_FOUND, 'Song does not exist');
    }

    // Get the voter
    const voterRecord = await prisma.player.findUnique({
      where: { id: voterId },
    });

    if (!voterRecord) {
      throw new AppError(ClientErrorCode.PLAYER_NOT_FOUND, 'Player does not exist');
    }

    // Requirement 5.4 / Property 22: Validate rating is between 1 and 10
    if (!this.isValidRating(rating)) {
      throw new AppError(
        ClientErrorCode.INVALID_VOTE_RATING,
        'Rating must be between 1 and 10',
        'rating'
      );
    }

    // Requirement 5.5 / Property 20: Prevent voting on own songs
    if (songRecord.submitterId === voterId) {
      throw new AppError(ClientErrorCode.CANNOT_VOTE_OWN_SONG, 'Cannot vote on your own song');
    }

    // Check if vote already exists
    const existingVote = await prisma.vote.findUnique({
      where: {
        songId_voterId: {
          songId,
          voterId,
        },
      },
    });

    // Requirement 5.6 / Property 21: Votes are immutable once submitted (locked)
    if (existingVote) {
      throw new AppError(ClientErrorCode.VOTE_LOCKED, 'Vote is locked and cannot be changed');
    }

    // Requirement 15.1, 15.2 / Property 16: Super Vote validation and point deduction
    if (superVote) {
      // Validate player has at least 2 points for super vote
      if (voterRecord.powerUpPoints < 2) {
        throw new AppError(
          ClientErrorCode.INSUFFICIENT_POINTS,
          `Insufficient points for super vote. Player has ${voterRecord.powerUpPoints} points but needs 2.`
        );
      }

      // Deduct 2 points from the voter
      await prisma.player.update({
        where: { id: voterId },
        data: {
          powerUpPoints: {
            decrement: 2,
          },
        },
      });
    }

    // Create the vote - votes are locked immediately on submission (Requirement 5.6)
    const now = new Date();
    const voteId = uuidv4();
    const voteRecord = await prisma.vote.create({
      data: {
        id: voteId,
        songId,
        voterId,
        rating,
        isLocked: true, // Votes are locked on submission
        votedAt: now,
        lockedAt: now, // Lock timestamp is same as vote timestamp
        superVote, // Requirement 15.4: Store whether this is a super vote
      },
    });

    // Convert to typed interface
    const vote: Vote = {
      id: voteRecord.id,
      songId: voteRecord.songId,
      voterId: voteRecord.voterId,
      rating: voteRecord.rating,
      isLocked: voteRecord.isLocked,
      votedAt: voteRecord.votedAt,
      lockedAt: voteRecord.lockedAt,
      superVote: voteRecord.superVote,
      comment: voteRecord.comment,
    };

    return vote;
  }

  /**
   * Locks an existing vote (though votes are already locked on submission).
   * This method exists for API completeness but votes are immutable once cast.
   * 
   * @param songId - The ID of the song
   * @param voterId - The ID of the voter
   * @returns The locked vote
   * @throws AppError if vote does not exist (VOTE_NOT_FOUND)
   */
  async lockVote(songId: string, voterId: string): Promise<Vote> {
    // Find the existing vote
    const existingVote = await prisma.vote.findUnique({
      where: {
        songId_voterId: {
          songId,
          voterId,
        },
      },
    });

    if (!existingVote) {
      throw new AppError(ClientErrorCode.VOTE_NOT_FOUND, 'Vote does not exist');
    }

    // If already locked, just return it
    if (existingVote.isLocked) {
      return {
        id: existingVote.id,
        songId: existingVote.songId,
        voterId: existingVote.voterId,
        rating: existingVote.rating,
        isLocked: existingVote.isLocked,
        votedAt: existingVote.votedAt,
        lockedAt: existingVote.lockedAt,
        superVote: existingVote.superVote,
        comment: existingVote.comment,
      };
    }

    // Lock the vote
    const now = new Date();
    const updatedVote = await prisma.vote.update({
      where: {
        songId_voterId: {
          songId,
          voterId,
        },
      },
      data: {
        isLocked: true,
        lockedAt: now,
      },
    });

    return {
      id: updatedVote.id,
      songId: updatedVote.songId,
      voterId: updatedVote.voterId,
      rating: updatedVote.rating,
      isLocked: updatedVote.isLocked,
      votedAt: updatedVote.votedAt,
      lockedAt: updatedVote.lockedAt,
      superVote: updatedVote.superVote,
      comment: updatedVote.comment,
    };
  }

  /**
   * Gets a vote by song and voter IDs.
   * 
   * @param songId - The ID of the song
   * @param voterId - The ID of the voter
   * @returns The vote if found, null otherwise
   */
  async getVote(songId: string, voterId: string): Promise<Vote | null> {
    const voteRecord = await prisma.vote.findUnique({
      where: {
        songId_voterId: {
          songId,
          voterId,
        },
      },
    });

    if (!voteRecord) {
      return null;
    }

    return {
      id: voteRecord.id,
      songId: voteRecord.songId,
      voterId: voteRecord.voterId,
      rating: voteRecord.rating,
      isLocked: voteRecord.isLocked,
      votedAt: voteRecord.votedAt,
      lockedAt: voteRecord.lockedAt,
      superVote: voteRecord.superVote,
      comment: voteRecord.comment,
    };
  }

  /**
   * Gets all votes for a song.
   * 
   * @param songId - The ID of the song
   * @returns Array of votes for the song
   */
  async getVotesForSong(songId: string): Promise<Vote[]> {
    const voteRecords = await prisma.vote.findMany({
      where: { songId },
    });

    return voteRecords.map(record => ({
      id: record.id,
      songId: record.songId,
      voterId: record.voterId,
      rating: record.rating,
      isLocked: record.isLocked,
      votedAt: record.votedAt,
      lockedAt: record.lockedAt,
      superVote: record.superVote,
      comment: record.comment,
    }));
  }

  /**
   * Gets all votes cast by a player.
   * 
   * @param voterId - The ID of the voter
   * @returns Array of votes cast by the player
   */
  async getVotesByPlayer(voterId: string): Promise<Vote[]> {
    const voteRecords = await prisma.vote.findMany({
      where: { voterId },
    });

    return voteRecords.map(record => ({
      id: record.id,
      songId: record.songId,
      voterId: record.voterId,
      rating: record.rating,
      isLocked: record.isLocked,
      votedAt: record.votedAt,
      lockedAt: record.lockedAt,
      superVote: record.superVote,
      comment: record.comment,
    }));
  }

  /**
   * Validates that a rating is between 1 and 10 (inclusive).
   * 
   * **Validates: Requirements 5.4**
   * 
   * @param rating - The rating value to validate
   * @returns true if valid, false otherwise
   */
  private isValidRating(rating: number): boolean {
    return Number.isInteger(rating) && rating >= 1 && rating <= 10;
  }

  /**
   * Applies confidence modifier to a song's score.
   * 
   * **Validates: Requirements 6.5, 6.6**
   * - 6.5: WHERE confidence_betting is enabled AND Confidence is 4 or 5 AND average Vote is 7 or higher, THE Backend SHALL add 2 bonus points
   * - 6.6: WHERE confidence_betting is enabled AND Confidence is 4 or 5 AND average Vote is 4 or lower, THE Backend SHALL subtract 2 penalty points
   * 
   * **Property 28: Confidence Bonus**
   * For any song with confidence ≥ 4 and average vote ≥ 7 (when confidence betting is enabled), the final score should include a +2 bonus.
   * 
   * **Property 29: Confidence Penalty**
   * For any song with confidence ≥ 4 and average vote ≤ 4 (when confidence betting is enabled), the final score should include a -2 penalty.
   * 
   * @param rawAverage - The raw average vote for the song
   * @param confidence - The confidence level (1-5) set by the submitter
   * @param enableConfidenceBetting - Whether confidence betting is enabled in party settings
   * @returns The confidence modifier (+2, -2, or 0)
   */
  applyConfidenceModifier(rawAverage: number, confidence: number, enableConfidenceBetting: boolean): number {
    // Only apply modifiers when confidence betting is enabled
    if (!enableConfidenceBetting) {
      return 0;
    }

    // Only apply modifiers when confidence is 4 or higher
    if (confidence < 4) {
      return 0;
    }

    // Requirement 6.5 / Property 28: +2 bonus for high confidence + high score
    if (rawAverage >= 7) {
      return 2;
    }

    // Requirement 6.6 / Property 29: -2 penalty for high confidence + low score
    if (rawAverage <= 4) {
      return -2;
    }

    // No modifier when rawAverage is between 4 and 7 (exclusive)
    return 0;
  }

  /**
   * Gets the weight multiplier for a round based on total rounds.
   * 
   * **Validates: Requirements 6.2, 6.3, 6.4**
   * - 6.2: WHEN songs_per_player is 1, THE Backend SHALL apply a 1.5x weight multiplier to all songs
   * - 6.3: WHEN songs_per_player is 2, THE Backend SHALL apply 1.0x to Round 1 songs and 2.0x to Round 2 songs
   * - 6.4: WHEN songs_per_player is 3, THE Backend SHALL apply 1.0x to Round 1, 1.5x to Round 2, and 2.0x to Round 3 songs
   * 
   * **Property 25: Progressive Weighting (1 Song)**
   * For songs_per_player = 1, all songs have 1.5x multiplier.
   * 
   * **Property 26: Progressive Weighting (2 Songs)**
   * For songs_per_player = 2, round 1 = 1.0x, round 2 = 2.0x.
   * 
   * **Property 27: Progressive Weighting (3 Songs)**
   * For songs_per_player = 3, round 1 = 1.0x, round 2 = 1.5x, round 3 = 2.0x.
   * 
   * @param roundNumber - The round number (1-indexed)
   * @param totalRounds - The total number of rounds (1, 2, or 3)
   * @returns The weight multiplier for the round
   */
  getWeightMultiplier(roundNumber: number, totalRounds: number): number {
    // Requirement 6.2: 1 song per player = 1.5x for all
    if (totalRounds === 1) {
      return 1.5;
    }
    
    // Requirement 6.3: 2 songs per player = 1.0x for round 1, 2.0x for round 2
    if (totalRounds === 2) {
      return roundNumber === 1 ? 1.0 : 2.0;
    }
    
    // Requirement 6.4: 3 songs per player = 1.0x, 1.5x, 2.0x
    if (totalRounds === 3) {
      if (roundNumber === 1) return 1.0;
      if (roundNumber === 2) return 1.5;
      return 2.0;
    }
    
    // Default fallback (should not happen with valid settings)
    return 1.0;
  }

  /**
   * Calculates the vote distribution for a song.
   * Returns an array of 10 elements where index i represents the count of votes with rating (i+1).
   * 
   * @param votes - Array of votes for the song
   * @returns Array of vote counts per rating (1-10)
   */
  private calculateVoteDistribution(votes: Vote[]): number[] {
    // Initialize array with 10 zeros (for ratings 1-10)
    const distribution = new Array(10).fill(0);
    
    for (const vote of votes) {
      // Rating is 1-10, so index is rating - 1
      const index = vote.rating - 1;
      if (index >= 0 && index < 10) {
        distribution[index]++;
      }
    }
    
    return distribution;
  }

  /**
   * Calculates the score for a song based on votes.
   * 
   * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 15.3**
   * - 6.1: WHEN a song finishes playing, THE Backend SHALL calculate the raw average of all votes for that song
   * - 6.2: WHEN songs_per_player is 1, THE Backend SHALL apply a 1.5x weight multiplier to all songs
   * - 6.3: WHEN songs_per_player is 2, THE Backend SHALL apply 1.0x to Round 1 songs and 2.0x to Round 2 songs
   * - 6.4: WHEN songs_per_player is 3, THE Backend SHALL apply 1.0x to Round 1, 1.5x to Round 2, and 2.0x to Round 3 songs
   * - 15.3: WHEN a Super_Vote is used, THE Scoring_System SHALL count that vote as 1.5x weight
   * 
   * **Property 24: Base Score Calculation**
   * For any song with votes, the base score should equal the arithmetic mean of all vote ratings.
   * 
   * **Property 25: Progressive Weighting (1 Song)**
   * For songs_per_player = 1, all songs have 1.5x multiplier.
   * 
   * **Property 26: Progressive Weighting (2 Songs)**
   * For songs_per_player = 2, round 1 = 1.0x, round 2 = 2.0x.
   * 
   * **Property 27: Progressive Weighting (3 Songs)**
   * For songs_per_player = 3, round 1 = 1.0x, round 2 = 1.5x, round 3 = 2.0x.
   * 
   * **Property 16: Super Vote Mechanics**
   * For any super vote, the vote SHALL contribute 1.5x weight to the song's average calculation.
   * 
   * @param songId - The ID of the song
   * @returns The calculated song score
   * @throws Error if song does not exist (SONG_NOT_FOUND)
   */
  async calculateSongScore(songId: string): Promise<SongScore> {
    // Get the song with its party settings
    const songRecord = await prisma.song.findUnique({
      where: { id: songId },
      include: {
        party: true,
      },
    });

    if (!songRecord) {
      throw new AppError(ClientErrorCode.SONG_NOT_FOUND, 'Song does not exist');
    }

    // Get all votes for this song
    const votes = await this.getVotesForSong(songId);

    // Calculate raw average with super vote weighting (Requirement 6.1, 15.3 / Property 24, 16)
    // Super votes count as 1.5x weight in the weighted average calculation
    let rawAverage = 0;
    if (votes.length > 0) {
      let totalWeight = 0;
      let weightedSum = 0;
      
      for (const vote of votes) {
        // Super votes count as 1.5x weight (Requirement 15.3)
        const voteWeight = vote.superVote ? 1.5 : 1.0;
        weightedSum += vote.rating * voteWeight;
        totalWeight += voteWeight;
      }
      
      rawAverage = weightedSum / totalWeight;
    }

    // Parse party settings to get songsPerPlayer (which equals totalRounds)
    const settings: PartySettings = JSON.parse(songRecord.party.settings);
    const totalRounds = settings.songsPerPlayer;

    // Get weight multiplier based on round (Requirements 6.2, 6.3, 6.4 / Properties 25, 26, 27)
    const weightMultiplier = this.getWeightMultiplier(songRecord.roundNumber, totalRounds);

    // Calculate weighted score
    const weightedScore = rawAverage * weightMultiplier;

    // Apply confidence modifier (Requirements 6.5, 6.6 / Properties 28, 29)
    const enableConfidenceBetting = settings.enableConfidenceBetting ?? false;
    const confidenceModifier = this.applyConfidenceModifier(rawAverage, songRecord.confidence, enableConfidenceBetting);

    // Final score = weighted score + confidence modifier
    const finalScore = weightedScore + confidenceModifier;

    // Calculate vote distribution
    const voteDistribution = this.calculateVoteDistribution(votes);

    // Update the song record with calculated scores
    await prisma.song.update({
      where: { id: songId },
      data: {
        rawAverage,
        weightedScore,
        confidenceModifier,
        finalScore,
        voteDistribution: JSON.stringify(voteDistribution),
      },
    });

    // Return the SongScore object
    return {
      songId,
      rawAverage,
      weightMultiplier,
      weightedScore,
      confidenceModifier,
      finalScore,
      voteCount: votes.length,
      voteDistribution,
    };
  }

  /**
   * Calculates the total score for a player in a party.
   * 
   * **Validates: Requirements 6.7**
   * - 6.7: WHEN calculating a Player's total score, THE Backend SHALL sum all their songs' weighted scores including confidence modifiers
   * 
   * **Property 30: Player Score Summation**
   * For any player, their total score should equal the sum of all their songs' weighted scores (including confidence modifiers).
   * 
   * @param playerId - The ID of the player
   * @param partyId - The ID of the party
   * @returns The player's total score (sum of all finalScore values from their songs)
   * @throws Error if player does not exist (PLAYER_NOT_FOUND)
   * @throws Error if party does not exist (PARTY_NOT_FOUND)
   */
  async calculatePlayerScore(playerId: string, partyId: string): Promise<number> {
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

    // Get all songs submitted by the player in this party
    const songs = await prisma.song.findMany({
      where: {
        submitterId: playerId,
        partyId: partyId,
      },
    });

    // If player has no songs, return 0
    if (songs.length === 0) {
      return 0;
    }

    // Calculate score for each song (if not already calculated) and sum the finalScores
    let totalScore = 0;

    for (const song of songs) {
      // If the song doesn't have a calculated finalScore yet, calculate it
      if (song.finalScore === null) {
        const songScore = await this.calculateSongScore(song.id);
        totalScore += songScore.finalScore;
      } else {
        // Use the already calculated finalScore
        totalScore += song.finalScore;
      }
    }

    return totalScore;
  }

  /**
   * Calculates the vote variance for a song.
   * Variance = sum((vote - mean)^2) / count
   * Higher variance means more polarizing opinions.
   * 
   * @param votes - Array of vote ratings
   * @returns The variance of the votes, or 0 if no votes
   */
  calculateVoteVariance(votes: number[]): number {
    if (votes.length === 0) {
      return 0;
    }

    // Calculate mean
    const mean = votes.reduce((sum, vote) => sum + vote, 0) / votes.length;

    // Calculate variance: sum((vote - mean)^2) / count
    const squaredDiffs = votes.map(vote => Math.pow(vote - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / votes.length;

    return variance;
  }

  /**
   * Calculates the "Crowd Favorite" bonus category winner.
   * Awards to the song with the highest weighted score.
   * 
   * **Validates: Requirements 7.2**
   * - 7.2: WHEN calculating "Crowd Favorite", THE Backend SHALL award it to the song with the highest weighted score
   * 
   * **Property 32: Crowd Favorite Winner**
   * For any set of songs, the "Crowd Favorite" bonus should be awarded to the song with the highest weighted score.
   * 
   * @param songs - Array of songs to evaluate
   * @returns The winning song, or null if no songs have scores
   */
  calculateCrowdFavorite(songs: Song[]): Song | null {
    if (songs.length === 0) {
      return null;
    }

    // Filter songs that have a weighted score
    const scoredSongs = songs.filter(song => song.weightedScore !== null);

    if (scoredSongs.length === 0) {
      return null;
    }

    // Find the song with the highest weighted score
    let winner = scoredSongs[0];
    for (const song of scoredSongs) {
      if ((song.weightedScore ?? 0) > (winner.weightedScore ?? 0)) {
        winner = song;
      }
    }

    return winner;
  }

  /**
   * Calculates the "Cult Classic" bonus category winner.
   * Awards to the song with the highest vote variance (most polarizing).
   * 
   * **Validates: Requirements 7.3**
   * - 7.3: WHEN calculating "Cult Classic", THE Backend SHALL award it to the song with the highest vote variance
   * 
   * **Property 33: Cult Classic Winner**
   * For any set of songs, the "Cult Classic" bonus should be awarded to the song with the highest vote variance.
   * 
   * @param songs - Array of songs to evaluate
   * @returns The winning song, or null if no songs have votes
   */
  calculateCultClassic(songs: Song[]): Song | null {
    if (songs.length === 0) {
      return null;
    }

    // Filter songs that have vote distribution (meaning they have votes)
    const songsWithVotes = songs.filter(song => 
      song.voteDistribution !== null && song.voteDistribution.length > 0
    );

    if (songsWithVotes.length === 0) {
      return null;
    }

    // Calculate variance for each song and find the highest
    let winner: Song | null = null;
    let highestVariance = -1;

    for (const song of songsWithVotes) {
      // Convert vote distribution to individual votes
      const votes: number[] = [];
      const distribution = song.voteDistribution!;
      
      for (let rating = 1; rating <= 10; rating++) {
        const count = distribution[rating - 1] || 0;
        for (let i = 0; i < count; i++) {
          votes.push(rating);
        }
      }

      if (votes.length === 0) {
        continue;
      }

      const variance = this.calculateVoteVariance(votes);

      if (variance > highestVariance) {
        highestVariance = variance;
        winner = song;
      }
    }

    return winner;
  }

  /**
   * Calculates the "Hidden Gem" bonus category winner.
   * Awards to the highest-scoring song with confidence ≤ 2.
   * 
   * **Validates: Requirements 7.4**
   * - 7.4: WHEN calculating "Hidden Gem", THE Backend SHALL award it to the highest-scoring song with Confidence level 2 or lower
   * 
   * **Property 34: Hidden Gem Winner**
   * For any set of songs with confidence ≤ 2, the "Hidden Gem" bonus should be awarded to the highest-scoring song in that subset.
   * 
   * @param songs - Array of songs to evaluate
   * @returns The winning song, or null if no qualifying songs
   */
  calculateHiddenGem(songs: Song[]): Song | null {
    if (songs.length === 0) {
      return null;
    }

    // Filter songs with confidence ≤ 2 and that have a weighted score
    const qualifyingSongs = songs.filter(song => 
      song.confidence <= 2 && song.weightedScore !== null
    );

    if (qualifyingSongs.length === 0) {
      return null;
    }

    // Find the song with the highest weighted score among qualifying songs
    let winner = qualifyingSongs[0];
    for (const song of qualifyingSongs) {
      if ((song.weightedScore ?? 0) > (winner.weightedScore ?? 0)) {
        winner = song;
      }
    }

    return winner;
  }

  /**
   * Calculates the "Bold Move" bonus category winner.
   * Awards to the highest-scoring song with confidence = 5.
   * 
   * **Validates: Requirements 7.5**
   * - 7.5: WHEN calculating "Bold Move", THE Backend SHALL award it to the highest-scoring song with Confidence level 5
   * 
   * **Property 35: Bold Move Winner**
   * For any set of songs with confidence = 5, the "Bold Move" bonus should be awarded to the highest-scoring song in that subset.
   * 
   * @param songs - Array of songs to evaluate
   * @returns The winning song, or null if no qualifying songs
   */
  calculateBoldMove(songs: Song[]): Song | null {
    if (songs.length === 0) {
      return null;
    }

    // Filter songs with confidence = 5 and that have a weighted score
    const qualifyingSongs = songs.filter(song => 
      song.confidence === 5 && song.weightedScore !== null
    );

    if (qualifyingSongs.length === 0) {
      return null;
    }

    // Find the song with the highest weighted score among qualifying songs
    let winner = qualifyingSongs[0];
    for (const song of qualifyingSongs) {
      if ((song.weightedScore ?? 0) > (winner.weightedScore ?? 0)) {
        winner = song;
      }
    }

    return winner;
  }

  /**
   * Selects N random bonus categories based on the party settings.
   * 
   * **Validates: Requirements 7.1**
   * - 7.1: WHEN the Party enters FINALE state, THE Backend SHALL select N random Bonus_Categories where N is the bonusCategoryCount setting
   * 
   * @param partyId - The ID of the party
   * @param count - The number of bonus categories to select
   * @returns Array of selected bonus categories
   * @throws Error if party does not exist (PARTY_NOT_FOUND)
   */
  async selectBonusCategories(partyId: string, count: number): Promise<BonusCategory[]> {
    // Verify the party exists
    const partyRecord = await prisma.party.findUnique({
      where: { id: partyId },
    });

    if (!partyRecord) {
      throw new AppError(ClientErrorCode.PARTY_NOT_FOUND, 'Party does not exist');
    }

    // If count is 0 or negative, return empty array
    if (count <= 0) {
      return [];
    }

    // Get all available bonus categories
    const allCategories = [...BONUS_CATEGORIES];

    // If count is greater than or equal to available categories, return all
    if (count >= allCategories.length) {
      return allCategories;
    }

    // Shuffle the categories using Fisher-Yates algorithm
    for (let i = allCategories.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCategories[i], allCategories[j]] = [allCategories[j], allCategories[i]];
    }

    // Return the first N categories
    return allCategories.slice(0, count);
  }

  /**
   * Calculates bonus category winners for a party.
   * 
   * **Validates: Requirements 7.1, 7.6, 7.7**
   * - 7.1: WHEN the Party enters FINALE state, THE Backend SHALL select N random Bonus_Categories where N is the bonusCategoryCount setting
   * - 7.6: WHEN a Bonus_Category winner is determined, THE Backend SHALL award 10 bonus points to the winning Player
   * - 7.7: WHEN a Bonus_Category has no qualifying songs, THE Backend SHALL skip that category
   * 
   * **Property 36: Bonus Points Award**
   * For any bonus category winner, the submitting player should receive exactly 10 bonus points added to their total.
   * 
   * @param partyId - The ID of the party
   * @returns Array of BonusResult records for each category with a winner
   * @throws AppError if party does not exist (PARTY_NOT_FOUND)
   */
  async calculateBonusWinners(partyId: string): Promise<BonusResult[]> {
    // Verify the party exists and get settings
    const partyRecord = await prisma.party.findUnique({
      where: { id: partyId },
    });

    if (!partyRecord) {
      throw new AppError(ClientErrorCode.PARTY_NOT_FOUND, 'Party does not exist');
    }

    // Parse party settings to get bonusCategoryCount
    const settings: PartySettings = JSON.parse(partyRecord.settings);
    const bonusCategoryCount = settings.bonusCategoryCount ?? 0;

    // If no bonus categories are configured, return empty array
    if (bonusCategoryCount === 0) {
      return [];
    }

    // Select random bonus categories based on settings
    const selectedCategories = await this.selectBonusCategories(partyId, bonusCategoryCount);

    // Get all songs for the party with calculated scores
    const songRecords = await prisma.song.findMany({
      where: { partyId },

    });

    // Convert to Song type with parsed voteDistribution
    const songs: Song[] = songRecords.map(record => ({
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

    // Calculate scores for any songs that don't have them yet
    for (const song of songs) {
      if (song.finalScore === null) {
        await this.calculateSongScore(song.id);
      }
    }

    // Re-fetch songs with updated scores
    const updatedSongRecords = await prisma.song.findMany({
      where: { partyId },
    });

    const updatedSongs: Song[] = updatedSongRecords.map(record => ({
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

    // Calculate winners for each selected category
    const bonusResults: BonusResult[] = [];
    let revealOrder = 1;

    for (const category of selectedCategories) {
      // Call the category's calculate function to find the winner
      const winningSong = category.calculate(updatedSongs);

      // Requirement 7.7: Skip categories with no qualifying songs
      if (!winningSong) {
        continue;
      }

      // Create BonusResult record
      const bonusResultId = uuidv4();
      const bonusResult: BonusResult = {
        id: bonusResultId,
        partyId,
        categoryId: category.id,
        categoryName: category.name,
        winningSongId: winningSong.id,
        winnerPlayerId: winningSong.submitterId,
        points: category.points, // Requirement 7.6: Award 10 points
        revealOrder: revealOrder++,
      };

      // Store BonusResult in database
      await prisma.bonusResult.create({
        data: {
          id: bonusResult.id,
          partyId: bonusResult.partyId,
          categoryId: bonusResult.categoryId,
          categoryName: bonusResult.categoryName,
          winningSongId: bonusResult.winningSongId,
          winnerPlayerId: bonusResult.winnerPlayerId,
          points: bonusResult.points,
          revealOrder: bonusResult.revealOrder,
        },
      });

      bonusResults.push(bonusResult);
    }

    return bonusResults;
  }

  /**
   * Gets all bonus results for a party.
   * 
   * @param partyId - The ID of the party
   * @returns Array of BonusResult records
   */
  async getBonusResults(partyId: string): Promise<BonusResult[]> {
    const records = await prisma.bonusResult.findMany({
      where: { partyId },
      orderBy: { revealOrder: 'asc' },
    });

    return records.map(record => ({
      id: record.id,
      partyId: record.partyId,
      categoryId: record.categoryId,
      categoryName: record.categoryName,
      winningSongId: record.winningSongId,
      winnerPlayerId: record.winnerPlayerId,
      points: record.points,
      revealOrder: record.revealOrder,
    }));
  }

  /**
   * Calculates the total bonus points for a player in a party.
   * 
   * **Validates: Requirements 7.6**
   * - 7.6: WHEN a Bonus_Category winner is determined, THE Backend SHALL award 10 bonus points to the winning Player
   * 
   * @param playerId - The ID of the player
   * @param partyId - The ID of the party
   * @returns The total bonus points for the player
   */
  async calculatePlayerBonusPoints(playerId: string, partyId: string): Promise<number> {
    const bonusResults = await prisma.bonusResult.findMany({
      where: {
        partyId,
        winnerPlayerId: playerId,
      },
    });

    // Sum up all bonus points for this player
    return bonusResults.reduce((total, result) => total + result.points, 0);
  }

  /**
   * Calculates the total achievement bonus points for a player in a party.
   * 
   * **Validates: Requirements 10.4, 17.1**
   * - 10.4: WHEN an achievement is revealed, THE Scoring_System SHALL add the bonus points to the player's final score
   * - 17.1: THE Scoring_System SHALL calculate scores using achievement bonus
   * 
   * @param playerId - The ID of the player
   * @param partyId - The ID of the party
   * @returns The total achievement bonus points for the player
   */
  async calculatePlayerAchievementBonus(playerId: string, partyId: string): Promise<number> {
    const achievements = await prisma.playerAchievement.findMany({
      where: {
        playerId,
        partyId,
      },
    });

    // Sum up all achievement bonus points for this player
    return achievements.reduce((total, achievement) => total + achievement.bonusPoints, 0);
  }

  /**
   * Gets all achievements for a player in a party.
   * 
   * @param playerId - The ID of the player
   * @param partyId - The ID of the party
   * @returns Array of PlayerAchievement records
   */
  async getPlayerAchievements(playerId: string, partyId: string): Promise<PlayerAchievement[]> {
    const achievements = await prisma.playerAchievement.findMany({
      where: {
        playerId,
        partyId,
      },
      orderBy: { unlockedAt: 'asc' },
    });

    return achievements.map(record => ({
      id: record.id,
      playerId: record.playerId,
      achievementId: record.achievementId,
      unlockedAt: record.unlockedAt,
      partyId: record.partyId,
      bonusPoints: record.bonusPoints,
    }));
  }

  /**
   * Calculates the full score breakdown for a player.
   * 
   * **Validates: Requirements 17.1, 17.2**
   * - 17.1: THE Scoring_System SHALL calculate scores using: base score, round multiplier, theme bonus, 
   *         confidence modifier, power-up modifier, event modifier, achievement bonus, and prediction bonus
   * - 17.2: THE Scoring_System SHALL display a Score_Breakdown showing each component
   * 
   * @param playerId - The ID of the player
   * @param partyId - The ID of the party
   * @param playerSongs - Array of player's songs with scores
   * @returns The complete score breakdown
   */
  async calculateScoreBreakdown(
    playerId: string,
    partyId: string,
    playerSongs: Song[]
  ): Promise<ScoreBreakdown> {
    // Calculate base score (sum of weighted scores)
    const baseScore = playerSongs.reduce((sum, song) => sum + (song.weightedScore ?? 0), 0);

    // Calculate average round multiplier
    const roundMultiplier = playerSongs.length > 0
      ? playerSongs.reduce((sum, song) => {
          const partySettings = DEFAULT_PARTY_SETTINGS; // Will be overridden by actual settings
          return sum + this.getWeightMultiplier(song.roundNumber, partySettings.songsPerPlayer);
        }, 0) / playerSongs.length
      : 1.0;

    // Calculate confidence modifier (sum of all confidence modifiers)
    const confidenceModifier = playerSongs.reduce((sum, song) => sum + (song.confidenceModifier ?? 0), 0);

    // Get bonus points from bonus categories
    const bonusPoints = await this.calculatePlayerBonusPoints(playerId, partyId);

    // Get achievement bonus points
    const achievementBonus = await this.calculatePlayerAchievementBonus(playerId, partyId);

    // Get prediction bonus points (Requirement 17.5)
    // **Validates: Requirements 16.4, 17.5**
    // - 16.4: THE Prediction_System SHALL reveal prediction results during the finale
    // - 17.5: THE Scoring_System SHALL apply prediction bonuses during the finale reveal sequence
    const predictionBonus = await predictionService.getPlayerPredictionBonus(playerId, partyId);

    // Calculate theme bonus using themeService
    // **Validates: Requirements 7.4, 8.3**
    // - 7.4: WHEN a Round_Theme has a bonus multiplier, THE Scoring_System SHALL apply that multiplier to theme adherence bonuses
    // - 8.3: WHEN a song receives an average theme adherence rating of 4 or higher, THE Scoring_System SHALL apply a +0.5 theme bonus
    const themeBonus = await this.calculatePlayerThemeBonus(playerSongs);

    // Calculate power-up modifier from player's power-up effects
    // **Validates: Requirements 13.3, 17.1**
    // - 13.3: THE Power_Up_System SHALL support power-up effects
    // - 17.1: THE Scoring_System SHALL calculate scores using power-up modifier
    const powerUpModifier = await this.calculatePlayerPowerUpModifier(playerId, partyId);

    // Calculate event modifier from active events affecting the player
    // **Validates: Requirements 11.3, 17.1**
    // - 11.3: THE Mini_Event_System SHALL support event effects
    // - 17.1: THE Scoring_System SHALL calculate scores using event modifier
    const eventModifier = await this.calculatePlayerEventModifier(playerId, partyId);

    // Calculate final score using the enhanced formula
    // **Validates: Requirement 17.1**
    // finalScore = baseScore + confidenceModifier + bonusPoints + achievementBonus + predictionBonus + themeBonus + powerUpModifier + eventModifier
    const finalScore = baseScore + confidenceModifier + bonusPoints + achievementBonus + 
                       predictionBonus + themeBonus + powerUpModifier + eventModifier;

    return {
      baseScore,
      roundMultiplier,
      themeBonus,
      confidenceModifier,
      powerUpModifier,
      eventModifier,
      achievementBonus,
      predictionBonus,
      bonusPoints,
      finalScore,
    };
  }

  /**
   * Calculates the total theme bonus for a player's songs.
   * 
   * **Validates: Requirements 7.4, 8.3**
   * - 7.4: WHEN a Round_Theme has a bonus multiplier, THE Scoring_System SHALL apply that multiplier to theme adherence bonuses
   * - 8.3: WHEN a song receives an average theme adherence rating of 4 or higher, THE Scoring_System SHALL apply a +0.5 theme bonus
   * 
   * @param playerSongs - Array of player's songs
   * @returns The total theme bonus for all songs
   */
  private async calculatePlayerThemeBonus(playerSongs: Song[]): Promise<number> {
    let totalThemeBonus = 0;

    for (const song of playerSongs) {
      try {
        // Use themeService to calculate theme bonus for each song
        const songThemeBonus = await themeService.calculateThemeBonus(song.id);
        totalThemeBonus += songThemeBonus;
      } catch {
        // If theme bonus calculation fails (e.g., song not found), skip this song
        // This can happen if the song was deleted or there's a data inconsistency
        continue;
      }
    }

    return totalThemeBonus;
  }

  /**
   * Calculates the total power-up modifier for a player.
   * 
   * **Validates: Requirements 13.3, 17.1**
   * - 13.3: THE Power_Up_System SHALL support power-up effects
   * - 17.1: THE Scoring_System SHALL calculate scores using power-up modifier
   * 
   * Power-up modifiers come from effects like:
   * - Insurance Policy: May affect score calculation by excluding lowest vote
   * - Critic Bomb: Affects vote weight (handled in vote calculation)
   * 
   * Note: Most power-up effects are applied at the time of use (e.g., during voting).
   * This method calculates any residual score modifiers from power-ups.
   * 
   * @param playerId - The ID of the player
   * @param partyId - The ID of the party
   * @returns The total power-up modifier for the player
   */
  private async calculatePlayerPowerUpModifier(playerId: string, partyId: string): Promise<number> {
    // TODO: Implement power-up modifier calculation when power-up effects
    // that directly modify scores are fully implemented.
    // 
    // Currently, power-up effects like:
    // - Critic Bomb: Applied during vote weight calculation (already handled in castVote)
    // - Insurance Policy: Applied during song score calculation (needs integration)
    // - Other effects: Applied at time of use
    //
    // For now, return 0 as most power-up effects are applied at the point of use
    // rather than as a cumulative modifier.
    return 0;
  }

  /**
   * Calculates the total event modifier for a player.
   * 
   * **Validates: Requirements 11.3, 17.1**
   * - 11.3: THE Mini_Event_System SHALL support event effects
   * - 17.1: THE Scoring_System SHALL calculate scores using event modifier
   * 
   * Event modifiers come from effects like:
   * - Score Multiplier (Golden Record, Underdog Bonus)
   * - Steal Points (Steal the Aux)
   * - Swap Scores (Score Swap)
   * - Double or Nothing
   * 
   * @param playerId - The ID of the player
   * @param partyId - The ID of the party
   * @returns The total event modifier for the player
   */
  private async calculatePlayerEventModifier(playerId: string, partyId: string): Promise<number> {
    let totalEventModifier = 0;

    try {
      // Get all resolved events for the party
      const eventHistory = await eventService.getEventHistory(partyId);

      // Sum up score changes from events that affected this player
      for (const activeEvent of eventHistory) {
        // Only consider resolved events
        if (!activeEvent.resolved) {
          continue;
        }

        // Check if this player was affected by the event
        if (!activeEvent.affectedPlayers.includes(playerId)) {
          continue;
        }

        // Get the event definition to understand the effect type
        const eventDef = eventService.getEvent(activeEvent.eventId);
        if (!eventDef) {
          continue;
        }

        // Note: The actual score changes from events are typically applied
        // immediately when the event effect is resolved (via applyEventEffect).
        // This method provides a way to track cumulative event modifiers
        // for display purposes in the score breakdown.
        //
        // For now, we rely on the event effects being applied at resolution time.
        // If we need to track cumulative modifiers, we would need to store
        // the score changes in the ActiveEvent record or a separate table.
      }
    } catch {
      // If event history retrieval fails, return 0
      // This can happen if the party doesn't exist or there's a data issue
    }

    // TODO: Implement cumulative event modifier tracking when event effects
    // are stored with their score change values.
    // 
    // Currently, event effects are applied immediately when resolved:
    // - Score Multiplier: Applied to song scores at resolution
    // - Steal Points: Points transferred at resolution
    // - Swap Scores: Scores swapped at resolution
    // - Double or Nothing: Applied to song scores at resolution
    //
    // For now, return 0 as event effects are applied at resolution time.
    return totalEventModifier;
  }

  /**
   * Calculates the enhanced score for a player with all modifiers.
   * 
   * **Validates: Requirements 17.1, 17.2**
   * - 17.1: THE Scoring_System SHALL calculate scores using: base score, round multiplier, theme bonus, 
   *         confidence modifier, power-up modifier, event modifier, achievement bonus, and prediction bonus
   * - 17.2: THE Scoring_System SHALL display a Score_Breakdown showing each component
   * 
   * This is a convenience method that fetches the player's songs and calculates
   * the complete score breakdown with all modifiers integrated.
   * 
   * @param playerId - The ID of the player
   * @param partyId - The ID of the party
   * @returns The complete ScoreBreakdown with all modifiers
   * @throws AppError if player does not exist (PLAYER_NOT_FOUND)
   * @throws AppError if party does not exist (PARTY_NOT_FOUND)
   */
  async calculateEnhancedScore(playerId: string, partyId: string): Promise<ScoreBreakdown> {
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

    // Get all songs submitted by the player in this party
    const songRecords = await prisma.song.findMany({
      where: {
        submitterId: playerId,
        partyId: partyId,
      },
    });

    // Calculate scores for any songs that don't have them yet
    for (const song of songRecords) {
      if (song.finalScore === null) {
        await this.calculateSongScore(song.id);
      }
    }

    // Re-fetch songs with updated scores
    const updatedSongRecords = await prisma.song.findMany({
      where: {
        submitterId: playerId,
        partyId: partyId,
      },
    });

    // Convert to Song type with parsed voteDistribution
    const playerSongs: Song[] = updatedSongRecords.map(record => ({
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

    // Calculate and return the complete score breakdown
    return this.calculateScoreBreakdown(playerId, partyId, playerSongs);
  }

  /**
   * Calculates the final standings for all players in a party.
   * 
   * **Validates: Requirements 8.1, 10.4, 17.1**
   * - 8.1: WHEN the Party enters FINALE state, THE Backend SHALL calculate final standings by summing base scores, confidence modifiers, and bonus points
   * - 10.4: WHEN an achievement is revealed, THE Scoring_System SHALL add the bonus points to the player's final score
   * - 17.1: THE Scoring_System SHALL calculate scores using achievement bonus
   * 
   * **Property 37: Final Score Composition**
   * For any player in finale, their final score should equal (sum of weighted song scores) + (confidence modifiers) + (bonus points) + (achievement bonus).
   * 
   * @param partyId - The ID of the party
   * @returns Array of final standings sorted by rank (descending by finalScore)
   * @throws AppError if party does not exist (PARTY_NOT_FOUND)
   */
  async calculateFinalStandings(partyId: string): Promise<FinalStanding[]> {
    // Verify the party exists
    const partyRecord = await prisma.party.findUnique({
      where: { id: partyId },
    });

    if (!partyRecord) {
      throw new AppError(ClientErrorCode.PARTY_NOT_FOUND, 'Party does not exist');
    }

    // Get all players in the party
    const playerRecords = await prisma.player.findMany({
      where: { partyId },
    });

    if (playerRecords.length === 0) {
      return [];
    }

    // Get all identities for the party (for alias lookup)
    const identityRecords = await prisma.partyIdentity.findMany({
      where: { partyId },
    });

    // Create a map of playerId -> identity for quick lookup
    const identityMap = new Map<string, typeof identityRecords[0]>();
    for (const identity of identityRecords) {
      identityMap.set(identity.playerId, identity);
    }

    // Get all songs for the party
    const songRecords = await prisma.song.findMany({
      where: { partyId },
    });

    // Calculate scores for any songs that don't have them yet
    for (const song of songRecords) {
      if (song.finalScore === null) {
        await this.calculateSongScore(song.id);
      }
    }

    // Re-fetch songs with updated scores
    const updatedSongRecords = await prisma.song.findMany({
      where: { partyId },
    });

    // Convert to Song type with parsed voteDistribution
    const allSongs: Song[] = updatedSongRecords.map(record => ({
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

    // Get all bonus results for the party
    const bonusResults = await this.getBonusResults(partyId);

    // Create a map of playerId -> bonus categories won
    const playerBonusCategories = new Map<string, string[]>();
    for (const result of bonusResults) {
      const categories = playerBonusCategories.get(result.winnerPlayerId) || [];
      categories.push(result.categoryName);
      playerBonusCategories.set(result.winnerPlayerId, categories);
    }

    // Calculate standings for each player
    const standings: FinalStanding[] = [];

    for (const player of playerRecords) {
      // Get player's songs
      const playerSongs = allSongs.filter(song => song.submitterId === player.id);

      // Calculate totalBaseScore (sum of weightedScore)
      const totalBaseScore = playerSongs.reduce((sum, song) => sum + (song.weightedScore ?? 0), 0);

      // Calculate confidenceModifiers (sum of confidenceModifier)
      const confidenceModifiers = playerSongs.reduce((sum, song) => sum + (song.confidenceModifier ?? 0), 0);

      // Get bonus points from calculatePlayerBonusPoints()
      const bonusPoints = await this.calculatePlayerBonusPoints(player.id, partyId);

      // Get achievement bonus points (Requirement 10.4, 17.1)
      const achievementBonus = await this.calculatePlayerAchievementBonus(player.id, partyId);

      // Get prediction bonus points (Requirement 16.4, 17.5)
      // **Validates: Requirements 16.4, 17.5**
      // - 16.4: THE Prediction_System SHALL reveal prediction results during the finale
      // - 17.5: THE Scoring_System SHALL apply prediction bonuses during the finale reveal sequence
      const predictionBonus = await predictionService.getPlayerPredictionBonus(player.id, partyId);

      // Calculate finalScore = totalBaseScore + confidenceModifiers + bonusPoints + achievementBonus + predictionBonus
      const finalScore = totalBaseScore + confidenceModifiers + bonusPoints + achievementBonus + predictionBonus;

      // Get bonus categories won
      const bonusCategories = playerBonusCategories.get(player.id) || [];

      // Calculate full score breakdown
      const scoreBreakdown = await this.calculateScoreBreakdown(player.id, partyId, playerSongs);

      // Find highest and lowest scoring songs
      let highestSong: Song | null = null;
      let lowestSong: Song | null = null;

      if (playerSongs.length > 0) {
        // Sort by finalScore (or weightedScore if finalScore is null)
        const sortedSongs = [...playerSongs].sort((a, b) => {
          const scoreA = a.finalScore ?? a.weightedScore ?? 0;
          const scoreB = b.finalScore ?? b.weightedScore ?? 0;
          return scoreB - scoreA; // Descending
        });

        highestSong = sortedSongs[0];
        lowestSong = sortedSongs[sortedSongs.length - 1];
      }

      // Get player's identity (alias)
      const identity = identityMap.get(player.id);
      const alias = identity?.alias ?? 'Unknown';

      // Create FinalStanding entry
      const standing: FinalStanding = {
        playerId: player.id,
        alias,
        realName: player.name,
        rank: 0, // Will be assigned after sorting
        songs: playerSongs,
        totalBaseScore,
        confidenceModifiers,
        bonusPoints,
        achievementBonus,
        finalScore,
        scoreBreakdown,
        bonusCategories,
        highestSong: highestSong!, // Will be non-null if player has songs
        lowestSong: lowestSong!, // Will be non-null if player has songs
      };

      standings.push(standing);
    }

    // Sort by finalScore descending
    standings.sort((a, b) => b.finalScore - a.finalScore);

    // Assign ranks with tiebreaker logic
    // Players with same finalScore get same rank
    // Next rank skips (e.g., if two players tie for 1st, next is 3rd)
    let currentRank = 1;
    let playersAtCurrentRank = 0;

    for (let i = 0; i < standings.length; i++) {
      if (i === 0) {
        // First player gets rank 1
        standings[i].rank = currentRank;
        playersAtCurrentRank = 1;
      } else {
        // Check if this player has the same score as the previous player
        if (standings[i].finalScore === standings[i - 1].finalScore) {
          // Same score = same rank
          standings[i].rank = currentRank;
          playersAtCurrentRank++;
        } else {
          // Different score = new rank (skip based on how many tied for previous rank)
          currentRank = i + 1; // Rank is position + 1 (1-indexed)
          standings[i].rank = currentRank;
          playersAtCurrentRank = 1;
        }
      }
    }

    return standings;
  }
}

// Export singleton instance
export const scoringService = new ScoringService();

/**
 * Predefined bonus categories for the game.
 * Each category has a unique calculation function to determine the winner.
 * 
 * **Validates: Requirements 7.2, 7.3, 7.4, 7.5**
 */
export const BONUS_CATEGORIES: BonusCategory[] = [
  {
    id: 'crowd-favorite',
    name: 'Crowd Favorite',
    icon: '👑',
    description: 'The song with the highest weighted score',
    points: 10,
    calculate: (songs: Song[]) => scoringService.calculateCrowdFavorite(songs),
  },
  {
    id: 'cult-classic',
    name: 'Cult Classic',
    icon: '🎭',
    description: 'The most polarizing song with the highest vote variance',
    points: 10,
    calculate: (songs: Song[]) => scoringService.calculateCultClassic(songs),
  },
  {
    id: 'hidden-gem',
    name: 'Hidden Gem',
    icon: '💎',
    description: 'The highest-scoring song with low confidence (≤2)',
    points: 10,
    calculate: (songs: Song[]) => scoringService.calculateHiddenGem(songs),
  },
  {
    id: 'bold-move',
    name: 'Bold Move',
    icon: '🎲',
    description: 'The highest-scoring song with maximum confidence (5)',
    points: 10,
    calculate: (songs: Song[]) => scoringService.calculateBoldMove(songs),
  },
];
