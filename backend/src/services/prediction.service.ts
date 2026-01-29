import { prisma } from '../lib/prisma';
import {
  PredictionInput,
  RoundPrediction,
  PredictionResult,
  PredictionType,
  PREDICTION_POINTS,
  AppError,
  ClientErrorCode,
  PartyStatus,
} from '../types';

/**
 * PredictionService handles prediction submission, evaluation, and point awarding.
 * 
 * **Validates: Requirements 16.1, 16.2, 16.3**
 * - 16.1: THE Prediction_System SHALL allow players to submit predictions before each round
 * - 16.2: THE Prediction_System SHALL support prediction types: winner, loser, and average
 * - 16.3: THE Prediction_System SHALL evaluate predictions after each round and award points
 */
export class PredictionService {
  /**
   * Submits predictions for a player for a specific round.
   * 
   * **Validates: Requirements 16.1, 16.2**
   * - 16.1: THE Prediction_System SHALL allow players to submit predictions before each round
   * - 16.2: THE Prediction_System SHALL support prediction types: winner, loser, and average
   * 
   * @param playerId - The ID of the player submitting predictions
   * @param partyId - The ID of the party
   * @param roundNumber - The round number to predict for
   * @param predictions - Array of predictions (winner, loser, average)
   * @returns The created RoundPrediction record
   * @throws AppError if player does not exist (PLAYER_NOT_FOUND)
   * @throws AppError if party does not exist (PARTY_NOT_FOUND)
   * @throws AppError if player is not in the party (PLAYER_NOT_IN_PARTY)
   * @throws AppError if round has already started (INVALID_STATE)
   * @throws AppError if prediction already exists for this round (INVALID_STATE)
   */
  async submitPrediction(
    playerId: string,
    partyId: string,
    roundNumber: number,
    predictions: PredictionInput[]
  ): Promise<RoundPrediction> {
    // Verify the player exists
    const playerRecord = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!playerRecord) {
      throw new AppError(ClientErrorCode.PLAYER_NOT_FOUND, 'Player does not exist');
    }

    // Verify the party exists and get its status
    const partyRecord = await prisma.party.findUnique({
      where: { id: partyId },
    });

    if (!partyRecord) {
      throw new AppError(ClientErrorCode.PARTY_NOT_FOUND, 'Party does not exist');
    }

    // Verify the player is in the party
    if (playerRecord.partyId !== partyId) {
      throw new AppError(ClientErrorCode.PLAYER_NOT_IN_PARTY, 'Player is not in this party');
    }

    // Check if round has already started (songs are being played)
    // Predictions must be submitted before the round begins
    const roundSongs = await prisma.song.findMany({
      where: {
        partyId,
        roundNumber,
      },
    });

    // If any song in the round has votes, the round has started
    const roundStarted = await prisma.vote.findFirst({
      where: {
        song: {
          partyId,
          roundNumber,
        },
      },
    });

    if (roundStarted) {
      throw new AppError(
        ClientErrorCode.INVALID_STATE,
        'Cannot submit predictions after the round has started'
      );
    }

    // Check if prediction already exists for this player/party/round
    const existingPrediction = await prisma.roundPrediction.findUnique({
      where: {
        playerId_partyId_roundNumber: {
          playerId,
          partyId,
          roundNumber,
        },
      },
    });

    if (existingPrediction) {
      throw new AppError(
        ClientErrorCode.INVALID_STATE,
        'Prediction already submitted for this round'
      );
    }

    // Validate prediction types
    for (const prediction of predictions) {
      if (!['winner', 'loser', 'average'].includes(prediction.type)) {
        throw new AppError(
          ClientErrorCode.INVALID_STATE,
          `Invalid prediction type: ${prediction.type}`
        );
      }
    }

    // Create the prediction record
    const predictionRecord = await prisma.roundPrediction.create({
      data: {
        playerId,
        partyId,
        roundNumber,
        predictions: JSON.stringify(predictions),
      },
    });

    return this.mapToPrediction(predictionRecord);
  }

  /**
   * Evaluates all predictions for a round after it completes.
   * 
   * **Validates: Requirement 16.3**
   * - THE Prediction_System SHALL evaluate predictions after each round and award points
   * 
   * @param partyId - The ID of the party
   * @param roundNumber - The round number to evaluate
   * @returns Array of PredictionResult for each prediction
   * @throws AppError if party does not exist (PARTY_NOT_FOUND)
   */
  async evaluatePredictions(partyId: string, roundNumber: number): Promise<PredictionResult[]> {
    // Verify the party exists
    const partyRecord = await prisma.party.findUnique({
      where: { id: partyId },
    });

    if (!partyRecord) {
      throw new AppError(ClientErrorCode.PARTY_NOT_FOUND, 'Party does not exist');
    }

    // Get all predictions for this round
    const predictionRecords = await prisma.roundPrediction.findMany({
      where: {
        partyId,
        roundNumber,
        evaluatedAt: null, // Only evaluate unevaluated predictions
      },
    });

    if (predictionRecords.length === 0) {
      return [];
    }

    // Get round results (songs with scores)
    const roundSongs = await prisma.song.findMany({
      where: {
        partyId,
        roundNumber,
      },
      orderBy: {
        finalScore: 'desc',
      },
    });

    if (roundSongs.length === 0) {
      return [];
    }

    // Calculate round statistics
    const songsWithScores = roundSongs.filter(s => s.finalScore !== null);
    
    if (songsWithScores.length === 0) {
      return [];
    }

    // Find winner (highest score) and loser (lowest score)
    const winnerSong = songsWithScores[0];
    const loserSong = songsWithScores[songsWithScores.length - 1];
    const winnerId = winnerSong.submitterId;
    const loserId = loserSong.submitterId;

    // Calculate round average
    const totalScore = songsWithScores.reduce((sum, s) => sum + (s.finalScore || 0), 0);
    const roundAverage = totalScore / songsWithScores.length;

    // Evaluate each prediction
    const results: PredictionResult[] = [];

    for (const predictionRecord of predictionRecords) {
      const predictions: PredictionInput[] = JSON.parse(predictionRecord.predictions);
      let totalPointsEarned = 0;

      for (const prediction of predictions) {
        const result = this.evaluateSinglePrediction(
          prediction,
          winnerId,
          loserId,
          roundAverage
        );
        results.push(result);
        totalPointsEarned += result.pointsAwarded;
      }

      // Update the prediction record with points earned
      await prisma.roundPrediction.update({
        where: { id: predictionRecord.id },
        data: {
          pointsEarned: totalPointsEarned,
          evaluatedAt: new Date(),
        },
      });

      // Award power-up points to the player for correct predictions
      if (totalPointsEarned > 0) {
        await prisma.player.update({
          where: { id: predictionRecord.playerId },
          data: {
            powerUpPoints: {
              increment: totalPointsEarned,
            },
          },
        });
      }
    }

    return results;
  }

  /**
   * Evaluates a single prediction against actual results.
   * 
   * @param prediction - The prediction to evaluate
   * @param winnerId - The ID of the player who won the round
   * @param loserId - The ID of the player who lost the round
   * @param roundAverage - The actual round average score
   * @returns PredictionResult with correctness and points
   */
  private evaluateSinglePrediction(
    prediction: PredictionInput,
    winnerId: string,
    loserId: string,
    roundAverage: number
  ): PredictionResult {
    let correct = false;
    let actual: string;

    switch (prediction.type) {
      case 'winner':
        correct = prediction.value === winnerId;
        actual = winnerId;
        break;

      case 'loser':
        correct = prediction.value === loserId;
        actual = loserId;
        break;

      case 'average':
        // Average prediction is correct if within 0.5 of actual
        const predictedAvg = parseFloat(prediction.value);
        correct = Math.abs(predictedAvg - roundAverage) <= 0.5;
        actual = roundAverage.toFixed(2);
        break;

      default:
        actual = 'unknown';
    }

    return {
      predictionType: prediction.type,
      predicted: prediction.value,
      actual,
      correct,
      pointsAwarded: correct ? PREDICTION_POINTS[prediction.type] : 0,
    };
  }

  /**
   * Gets all predictions made by a player, optionally filtered by party.
   * 
   * @param playerId - The ID of the player
   * @param partyId - Optional party ID to filter by
   * @returns Array of RoundPrediction records
   * @throws AppError if player does not exist (PLAYER_NOT_FOUND)
   */
  async getPlayerPredictions(playerId: string, partyId?: string): Promise<RoundPrediction[]> {
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

    // Get predictions
    const predictionRecords = await prisma.roundPrediction.findMany({
      where: whereClause,
      orderBy: [
        { partyId: 'asc' },
        { roundNumber: 'asc' },
      ],
    });

    return predictionRecords.map(record => this.mapToPrediction(record));
  }

  /**
   * Gets all predictions for a specific round in a party.
   * 
   * @param partyId - The ID of the party
   * @param roundNumber - The round number
   * @returns Array of RoundPrediction records
   * @throws AppError if party does not exist (PARTY_NOT_FOUND)
   */
  async getRoundPredictions(partyId: string, roundNumber: number): Promise<RoundPrediction[]> {
    // Verify the party exists
    const partyRecord = await prisma.party.findUnique({
      where: { id: partyId },
    });

    if (!partyRecord) {
      throw new AppError(ClientErrorCode.PARTY_NOT_FOUND, 'Party does not exist');
    }

    // Get all predictions for the round
    const predictionRecords = await prisma.roundPrediction.findMany({
      where: {
        partyId,
        roundNumber,
      },
      orderBy: { submittedAt: 'asc' },
    });

    return predictionRecords.map(record => this.mapToPrediction(record));
  }

  /**
   * Gets a specific prediction by ID.
   * 
   * @param predictionId - The ID of the prediction
   * @returns The RoundPrediction record
   * @throws AppError if prediction does not exist (INVALID_STATE)
   */
  async getPrediction(predictionId: string): Promise<RoundPrediction> {
    const predictionRecord = await prisma.roundPrediction.findUnique({
      where: { id: predictionId },
    });

    if (!predictionRecord) {
      throw new AppError(ClientErrorCode.INVALID_STATE, 'Prediction does not exist');
    }

    return this.mapToPrediction(predictionRecord);
  }

  /**
   * Gets all predictions for a party across all rounds.
   * 
   * @param partyId - The ID of the party
   * @returns Array of RoundPrediction records
   * @throws AppError if party does not exist (PARTY_NOT_FOUND)
   */
  async getPartyPredictions(partyId: string): Promise<RoundPrediction[]> {
    // Verify the party exists
    const partyRecord = await prisma.party.findUnique({
      where: { id: partyId },
    });

    if (!partyRecord) {
      throw new AppError(ClientErrorCode.PARTY_NOT_FOUND, 'Party does not exist');
    }

    // Get all predictions for the party
    const predictionRecords = await prisma.roundPrediction.findMany({
      where: { partyId },
      orderBy: [
        { roundNumber: 'asc' },
        { submittedAt: 'asc' },
      ],
    });

    return predictionRecords.map(record => this.mapToPrediction(record));
  }

  /**
   * Gets the total prediction bonus points for a player in a party.
   * Used for score breakdown calculation.
   * 
   * @param playerId - The ID of the player
   * @param partyId - The ID of the party
   * @returns Total prediction bonus points earned
   */
  async getPlayerPredictionBonus(playerId: string, partyId: string): Promise<number> {
    const result = await prisma.roundPrediction.aggregate({
      where: {
        playerId,
        partyId,
        evaluatedAt: { not: null },
      },
      _sum: {
        pointsEarned: true,
      },
    });

    return result._sum.pointsEarned || 0;
  }

  /**
   * Maps a Prisma RoundPrediction record to the RoundPrediction interface.
   * 
   * @param record - The Prisma record to map
   * @returns RoundPrediction interface object
   */
  private mapToPrediction(record: {
    id: string;
    playerId: string;
    roundNumber: number;
    partyId: string;
    predictions: string;
    pointsEarned: number;
    submittedAt: Date;
    evaluatedAt: Date | null;
  }): RoundPrediction {
    return {
      id: record.id,
      playerId: record.playerId,
      roundNumber: record.roundNumber,
      partyId: record.partyId,
      predictions: JSON.parse(record.predictions),
      pointsEarned: record.pointsEarned,
      submittedAt: record.submittedAt,
      evaluatedAt: record.evaluatedAt,
    };
  }
}

// Export singleton instance
export const predictionService = new PredictionService();
