import { PrismaClient } from '@prisma/client';
import { PredictionService, predictionService } from '../prediction.service';
import { PartyStatus, PREDICTION_POINTS } from '../../types';

// Create a test database client
const prisma = new PrismaClient();

describe('PredictionService', () => {
  // Clean up database before each test
  beforeEach(async () => {
    // Delete all records in reverse order of dependencies
    await prisma.roundPrediction.deleteMany();
    await prisma.playerAchievement.deleteMany();
    await prisma.bonusResult.deleteMany();
    await prisma.vote.deleteMany();
    await prisma.song.deleteMany();
    await prisma.partyIdentity.deleteMany();
    await prisma.playerPowerUp.deleteMany();
    await prisma.player.deleteMany();
    await prisma.round.deleteMany();
    await prisma.party.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Helper function to create a test party with players
  async function createTestParty(playerCount: number = 3) {
    const party = await prisma.party.create({
      data: {
        code: 'TEST',
        status: PartyStatus.PLAYING,
        hostId: 'host-id',
        settings: JSON.stringify({
          songsPerPlayer: 2,
          playDuration: 45,
          enableConfidenceBetting: true,
          enableProgressiveWeighting: true,
          bonusCategoryCount: 2,
        }),
      },
    });

    const players = [];
    for (let i = 0; i < playerCount; i++) {
      const player = await prisma.player.create({
        data: {
          name: `Player${i + 1}`,
          partyId: party.id,
          isHost: i === 0,
          powerUpPoints: 10, // Give players some starting points
        },
      });
      players.push(player);
    }

    // Update hostId to first player
    await prisma.party.update({
      where: { id: party.id },
      data: { hostId: players[0].id },
    });

    return { party, players };
  }

  // Helper function to create a song with votes and final score
  async function createSongWithScore(
    partyId: string,
    submitterId: string,
    roundNumber: number,
    finalScore: number,
    votes: { voterId: string; rating: number }[] = []
  ) {
    const song = await prisma.song.create({
      data: {
        partyId,
        submitterId,
        soundcloudId: Math.floor(Math.random() * 1000000),
        title: 'Test Song',
        artist: 'Test Artist',
        artworkUrl: 'https://example.com/art.jpg',
        duration: 180000,
        permalinkUrl: 'https://soundcloud.com/test',
        confidence: 3,
        roundNumber,
        queuePosition: 1,
        rawAverage: finalScore,
        weightedScore: finalScore,
        finalScore,
      },
    });

    // Create votes if provided
    for (const vote of votes) {
      await prisma.vote.create({
        data: {
          songId: song.id,
          voterId: vote.voterId,
          rating: vote.rating,
          isLocked: true,
        },
      });
    }

    return song;
  }

  describe('submitPrediction', () => {
    /**
     * Tests for Requirements 16.1, 16.2:
     * - 16.1: THE Prediction_System SHALL allow players to submit predictions before each round
     * - 16.2: THE Prediction_System SHALL support prediction types: winner, loser, and average
     */
    it('should create a prediction record with winner prediction', async () => {
      const { party, players } = await createTestParty();

      const prediction = await predictionService.submitPrediction(
        players[0].id,
        party.id,
        1,
        [{ type: 'winner', value: players[1].id }]
      );

      expect(prediction.playerId).toBe(players[0].id);
      expect(prediction.partyId).toBe(party.id);
      expect(prediction.roundNumber).toBe(1);
      expect(prediction.predictions).toHaveLength(1);
      expect(prediction.predictions[0].type).toBe('winner');
      expect(prediction.predictions[0].value).toBe(players[1].id);
      expect(prediction.pointsEarned).toBe(0);
      expect(prediction.submittedAt).toBeInstanceOf(Date);
      expect(prediction.evaluatedAt).toBeNull();
    });

    it('should create a prediction record with loser prediction', async () => {
      const { party, players } = await createTestParty();

      const prediction = await predictionService.submitPrediction(
        players[0].id,
        party.id,
        1,
        [{ type: 'loser', value: players[2].id }]
      );

      expect(prediction.predictions[0].type).toBe('loser');
      expect(prediction.predictions[0].value).toBe(players[2].id);
    });

    it('should create a prediction record with average prediction', async () => {
      const { party, players } = await createTestParty();

      const prediction = await predictionService.submitPrediction(
        players[0].id,
        party.id,
        1,
        [{ type: 'average', value: '7.5' }]
      );

      expect(prediction.predictions[0].type).toBe('average');
      expect(prediction.predictions[0].value).toBe('7.5');
    });

    it('should support multiple predictions in one submission', async () => {
      const { party, players } = await createTestParty();

      const prediction = await predictionService.submitPrediction(
        players[0].id,
        party.id,
        1,
        [
          { type: 'winner', value: players[1].id },
          { type: 'loser', value: players[2].id },
          { type: 'average', value: '6.5' },
        ]
      );

      expect(prediction.predictions).toHaveLength(3);
    });

    it('should persist prediction to database', async () => {
      const { party, players } = await createTestParty();

      const prediction = await predictionService.submitPrediction(
        players[0].id,
        party.id,
        1,
        [{ type: 'winner', value: players[1].id }]
      );

      const dbPrediction = await prisma.roundPrediction.findUnique({
        where: { id: prediction.id },
      });

      expect(dbPrediction).not.toBeNull();
      expect(dbPrediction?.playerId).toBe(players[0].id);
    });

    it('should throw error for non-existent player', async () => {
      const { party } = await createTestParty();

      await expect(
        predictionService.submitPrediction(
          'non-existent-player',
          party.id,
          1,
          [{ type: 'winner', value: 'some-id' }]
        )
      ).rejects.toThrow('Player does not exist');
    });

    it('should throw error for non-existent party', async () => {
      const { players } = await createTestParty();

      await expect(
        predictionService.submitPrediction(
          players[0].id,
          'non-existent-party',
          1,
          [{ type: 'winner', value: 'some-id' }]
        )
      ).rejects.toThrow('Party does not exist');
    });

    it('should throw error if player is not in the party', async () => {
      const { party: party1, players: players1 } = await createTestParty();
      
      // Create a second party with different code
      const party2 = await prisma.party.create({
        data: {
          code: 'TST2',
          status: PartyStatus.PLAYING,
          hostId: 'host-id-2',
          settings: '{}',
        },
      });

      const player2 = await prisma.player.create({
        data: {
          name: 'OtherPlayer',
          partyId: party2.id,
          isHost: true,
        },
      });

      await expect(
        predictionService.submitPrediction(
          player2.id,
          party1.id,
          1,
          [{ type: 'winner', value: 'some-id' }]
        )
      ).rejects.toThrow('Player is not in this party');
    });

    it('should throw error if prediction already exists for round', async () => {
      const { party, players } = await createTestParty();

      // Submit first prediction
      await predictionService.submitPrediction(
        players[0].id,
        party.id,
        1,
        [{ type: 'winner', value: players[1].id }]
      );

      // Try to submit another prediction for the same round
      await expect(
        predictionService.submitPrediction(
          players[0].id,
          party.id,
          1,
          [{ type: 'loser', value: players[2].id }]
        )
      ).rejects.toThrow('Prediction already submitted for this round');
    });

    it('should throw error if round has already started', async () => {
      const { party, players } = await createTestParty();

      // Create a song and vote for it (indicating round has started)
      const song = await createSongWithScore(party.id, players[1].id, 1, 7.0);
      await prisma.vote.create({
        data: {
          songId: song.id,
          voterId: players[0].id,
          rating: 7,
          isLocked: true,
        },
      });

      await expect(
        predictionService.submitPrediction(
          players[0].id,
          party.id,
          1,
          [{ type: 'winner', value: players[1].id }]
        )
      ).rejects.toThrow('Cannot submit predictions after the round has started');
    });

    it('should throw error for invalid prediction type', async () => {
      const { party, players } = await createTestParty();

      await expect(
        predictionService.submitPrediction(
          players[0].id,
          party.id,
          1,
          [{ type: 'invalid' as any, value: 'some-value' }]
        )
      ).rejects.toThrow('Invalid prediction type');
    });
  });

  describe('evaluatePredictions', () => {
    /**
     * Tests for Requirement 16.3:
     * THE Prediction_System SHALL evaluate predictions after each round and award points
     */
    it('should award points for correct winner prediction', async () => {
      const { party, players } = await createTestParty();

      // Create songs with scores - player 1 wins with highest score
      await createSongWithScore(party.id, players[0].id, 1, 6.0);
      await createSongWithScore(party.id, players[1].id, 1, 9.0); // Winner
      await createSongWithScore(party.id, players[2].id, 1, 5.0);

      // Submit prediction that player 1 will win
      await predictionService.submitPrediction(
        players[0].id,
        party.id,
        1,
        [{ type: 'winner', value: players[1].id }]
      );

      const results = await predictionService.evaluatePredictions(party.id, 1);

      expect(results).toHaveLength(1);
      expect(results[0].predictionType).toBe('winner');
      expect(results[0].correct).toBe(true);
      expect(results[0].pointsAwarded).toBe(PREDICTION_POINTS.winner);
    });

    it('should award points for correct loser prediction', async () => {
      const { party, players } = await createTestParty();

      // Create songs with scores - player 2 loses with lowest score
      await createSongWithScore(party.id, players[0].id, 1, 6.0);
      await createSongWithScore(party.id, players[1].id, 1, 9.0);
      await createSongWithScore(party.id, players[2].id, 1, 3.0); // Loser

      // Submit prediction that player 2 will lose
      await predictionService.submitPrediction(
        players[0].id,
        party.id,
        1,
        [{ type: 'loser', value: players[2].id }]
      );

      const results = await predictionService.evaluatePredictions(party.id, 1);

      expect(results).toHaveLength(1);
      expect(results[0].predictionType).toBe('loser');
      expect(results[0].correct).toBe(true);
      expect(results[0].pointsAwarded).toBe(PREDICTION_POINTS.loser);
    });

    it('should award points for correct average prediction (within 0.5)', async () => {
      const { party, players } = await createTestParty();

      // Create songs with scores - average is 6.0
      await createSongWithScore(party.id, players[0].id, 1, 5.0);
      await createSongWithScore(party.id, players[1].id, 1, 6.0);
      await createSongWithScore(party.id, players[2].id, 1, 7.0);
      // Average: (5 + 6 + 7) / 3 = 6.0

      // Submit prediction of 6.3 (within 0.5 of 6.0)
      await predictionService.submitPrediction(
        players[0].id,
        party.id,
        1,
        [{ type: 'average', value: '6.3' }]
      );

      const results = await predictionService.evaluatePredictions(party.id, 1);

      expect(results).toHaveLength(1);
      expect(results[0].predictionType).toBe('average');
      expect(results[0].correct).toBe(true);
      expect(results[0].pointsAwarded).toBe(PREDICTION_POINTS.average);
    });

    it('should not award points for incorrect winner prediction', async () => {
      const { party, players } = await createTestParty();

      // Create songs with scores - player 1 wins
      await createSongWithScore(party.id, players[0].id, 1, 6.0);
      await createSongWithScore(party.id, players[1].id, 1, 9.0); // Winner
      await createSongWithScore(party.id, players[2].id, 1, 5.0);

      // Submit incorrect prediction that player 2 will win
      await predictionService.submitPrediction(
        players[0].id,
        party.id,
        1,
        [{ type: 'winner', value: players[2].id }]
      );

      const results = await predictionService.evaluatePredictions(party.id, 1);

      expect(results).toHaveLength(1);
      expect(results[0].correct).toBe(false);
      expect(results[0].pointsAwarded).toBe(0);
    });

    it('should not award points for average prediction outside 0.5 range', async () => {
      const { party, players } = await createTestParty();

      // Create songs with scores - average is 6.0
      await createSongWithScore(party.id, players[0].id, 1, 5.0);
      await createSongWithScore(party.id, players[1].id, 1, 6.0);
      await createSongWithScore(party.id, players[2].id, 1, 7.0);

      // Submit prediction of 7.0 (more than 0.5 away from 6.0)
      await predictionService.submitPrediction(
        players[0].id,
        party.id,
        1,
        [{ type: 'average', value: '7.0' }]
      );

      const results = await predictionService.evaluatePredictions(party.id, 1);

      expect(results).toHaveLength(1);
      expect(results[0].correct).toBe(false);
      expect(results[0].pointsAwarded).toBe(0);
    });

    it('should update prediction record with points earned and evaluatedAt', async () => {
      const { party, players } = await createTestParty();

      await createSongWithScore(party.id, players[1].id, 1, 9.0);

      const prediction = await predictionService.submitPrediction(
        players[0].id,
        party.id,
        1,
        [{ type: 'winner', value: players[1].id }]
      );

      await predictionService.evaluatePredictions(party.id, 1);

      const updatedPrediction = await prisma.roundPrediction.findUnique({
        where: { id: prediction.id },
      });

      expect(updatedPrediction?.pointsEarned).toBe(PREDICTION_POINTS.winner);
      expect(updatedPrediction?.evaluatedAt).not.toBeNull();
    });

    it('should award power-up points to player for correct predictions', async () => {
      const { party, players } = await createTestParty();

      const initialPoints = players[0].powerUpPoints;

      await createSongWithScore(party.id, players[1].id, 1, 9.0);

      await predictionService.submitPrediction(
        players[0].id,
        party.id,
        1,
        [{ type: 'winner', value: players[1].id }]
      );

      await predictionService.evaluatePredictions(party.id, 1);

      const updatedPlayer = await prisma.player.findUnique({
        where: { id: players[0].id },
      });

      expect(updatedPlayer?.powerUpPoints).toBe(initialPoints + PREDICTION_POINTS.winner);
    });

    it('should not re-evaluate already evaluated predictions', async () => {
      const { party, players } = await createTestParty();

      await createSongWithScore(party.id, players[1].id, 1, 9.0);

      await predictionService.submitPrediction(
        players[0].id,
        party.id,
        1,
        [{ type: 'winner', value: players[1].id }]
      );

      // First evaluation
      const firstResults = await predictionService.evaluatePredictions(party.id, 1);
      expect(firstResults).toHaveLength(1);

      // Second evaluation should return empty (already evaluated)
      const secondResults = await predictionService.evaluatePredictions(party.id, 1);
      expect(secondResults).toHaveLength(0);
    });

    it('should return empty array for round with no predictions', async () => {
      const { party, players } = await createTestParty();

      await createSongWithScore(party.id, players[0].id, 1, 7.0);

      const results = await predictionService.evaluatePredictions(party.id, 1);

      expect(results).toHaveLength(0);
    });

    it('should return empty array for round with no songs', async () => {
      const { party, players } = await createTestParty();

      await predictionService.submitPrediction(
        players[0].id,
        party.id,
        1,
        [{ type: 'winner', value: players[1].id }]
      );

      const results = await predictionService.evaluatePredictions(party.id, 1);

      expect(results).toHaveLength(0);
    });

    it('should throw error for non-existent party', async () => {
      await expect(
        predictionService.evaluatePredictions('non-existent-party', 1)
      ).rejects.toThrow('Party does not exist');
    });
  });

  describe('getPlayerPredictions', () => {
    it('should return all predictions for a player', async () => {
      const { party, players } = await createTestParty();

      // Submit predictions for multiple rounds
      await predictionService.submitPrediction(
        players[0].id,
        party.id,
        1,
        [{ type: 'winner', value: players[1].id }]
      );

      await predictionService.submitPrediction(
        players[0].id,
        party.id,
        2,
        [{ type: 'loser', value: players[2].id }]
      );

      const predictions = await predictionService.getPlayerPredictions(players[0].id);

      expect(predictions).toHaveLength(2);
    });

    it('should filter by party when partyId is provided', async () => {
      const { party: party1, players: players1 } = await createTestParty();
      
      // Create second party with the same player
      const party2 = await prisma.party.create({
        data: {
          code: 'TST2',
          status: PartyStatus.PLAYING,
          hostId: players1[0].id,
          settings: '{}',
        },
      });

      // Update player to be in party2 temporarily for prediction
      await prisma.player.update({
        where: { id: players1[0].id },
        data: { partyId: party1.id },
      });

      await predictionService.submitPrediction(
        players1[0].id,
        party1.id,
        1,
        [{ type: 'winner', value: players1[1].id }]
      );

      const party1Predictions = await predictionService.getPlayerPredictions(
        players1[0].id,
        party1.id
      );

      expect(party1Predictions).toHaveLength(1);
      expect(party1Predictions[0].partyId).toBe(party1.id);
    });

    it('should return empty array for player with no predictions', async () => {
      const { players } = await createTestParty();

      const predictions = await predictionService.getPlayerPredictions(players[0].id);

      expect(predictions).toHaveLength(0);
    });

    it('should throw error for non-existent player', async () => {
      await expect(
        predictionService.getPlayerPredictions('non-existent-player')
      ).rejects.toThrow('Player does not exist');
    });
  });

  describe('getRoundPredictions', () => {
    it('should return all predictions for a round', async () => {
      const { party, players } = await createTestParty();

      // Multiple players submit predictions for the same round
      await predictionService.submitPrediction(
        players[0].id,
        party.id,
        1,
        [{ type: 'winner', value: players[1].id }]
      );

      await predictionService.submitPrediction(
        players[1].id,
        party.id,
        1,
        [{ type: 'winner', value: players[0].id }]
      );

      const predictions = await predictionService.getRoundPredictions(party.id, 1);

      expect(predictions).toHaveLength(2);
    });

    it('should return empty array for round with no predictions', async () => {
      const { party } = await createTestParty();

      const predictions = await predictionService.getRoundPredictions(party.id, 1);

      expect(predictions).toHaveLength(0);
    });

    it('should throw error for non-existent party', async () => {
      await expect(
        predictionService.getRoundPredictions('non-existent-party', 1)
      ).rejects.toThrow('Party does not exist');
    });
  });

  describe('getPrediction', () => {
    it('should return a specific prediction by ID', async () => {
      const { party, players } = await createTestParty();

      const created = await predictionService.submitPrediction(
        players[0].id,
        party.id,
        1,
        [{ type: 'winner', value: players[1].id }]
      );

      const prediction = await predictionService.getPrediction(created.id);

      expect(prediction.id).toBe(created.id);
      expect(prediction.playerId).toBe(players[0].id);
    });

    it('should throw error for non-existent prediction', async () => {
      await expect(
        predictionService.getPrediction('non-existent-prediction')
      ).rejects.toThrow('Prediction does not exist');
    });
  });

  describe('getPlayerPredictionBonus', () => {
    it('should return total prediction bonus points for a player', async () => {
      const { party, players } = await createTestParty();

      // Create songs and submit correct predictions
      await createSongWithScore(party.id, players[1].id, 1, 9.0);
      await createSongWithScore(party.id, players[2].id, 2, 8.0);

      await predictionService.submitPrediction(
        players[0].id,
        party.id,
        1,
        [{ type: 'winner', value: players[1].id }]
      );

      await predictionService.submitPrediction(
        players[0].id,
        party.id,
        2,
        [{ type: 'winner', value: players[2].id }]
      );

      // Evaluate both rounds
      await predictionService.evaluatePredictions(party.id, 1);
      await predictionService.evaluatePredictions(party.id, 2);

      const bonus = await predictionService.getPlayerPredictionBonus(players[0].id, party.id);

      expect(bonus).toBe(PREDICTION_POINTS.winner * 2);
    });

    it('should return 0 for player with no evaluated predictions', async () => {
      const { party, players } = await createTestParty();

      const bonus = await predictionService.getPlayerPredictionBonus(players[0].id, party.id);

      expect(bonus).toBe(0);
    });
  });
});
