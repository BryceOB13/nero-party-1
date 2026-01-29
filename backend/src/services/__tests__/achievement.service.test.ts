import { PrismaClient } from '@prisma/client';
import { AchievementService, achievementService } from '../achievement.service';
import { PartyStatus, ACHIEVEMENTS } from '../../types';

// Create a test database client
const prisma = new PrismaClient();

describe('AchievementService', () => {
  // Clean up database before each test
  beforeEach(async () => {
    // Delete all records in reverse order of dependencies
    await prisma.playerAchievement.deleteMany();
    await prisma.bonusResult.deleteMany();
    await prisma.vote.deleteMany();
    await prisma.song.deleteMany();
    await prisma.partyIdentity.deleteMany();
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

  // Helper function to create a song with votes
  async function createSongWithVotes(
    partyId: string,
    submitterId: string,
    roundNumber: number,
    votes: { voterId: string; rating: number }[]
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
      },
    });

    // Calculate raw average
    let rawAverage = 0;
    if (votes.length > 0) {
      const sum = votes.reduce((acc, v) => acc + v.rating, 0);
      rawAverage = sum / votes.length;
    }

    // Create votes
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

    // Update song with calculated scores
    const updatedSong = await prisma.song.update({
      where: { id: song.id },
      data: {
        rawAverage,
        weightedScore: rawAverage,
        finalScore: rawAverage,
        voteDistribution: JSON.stringify(calculateVoteDistribution(votes.map(v => v.rating))),
      },
    });

    return updatedSong;
  }

  function calculateVoteDistribution(ratings: number[]): number[] {
    const distribution = new Array(10).fill(0);
    for (const rating of ratings) {
      distribution[rating - 1]++;
    }
    return distribution;
  }

  describe('getAchievements', () => {
    /**
     * Tests for Requirements 9.1, 9.2:
     * - 9.1: THE Achievement_System SHALL define achievements with id, name, description, icon, rarity, bonus points, and condition
     * - 9.2: THE Achievement_System SHALL support achievement rarities: common, uncommon, rare, and legendary
     */
    it('should return all predefined achievements', () => {
      const achievements = achievementService.getAchievements();

      expect(achievements).toEqual(ACHIEVEMENTS);
      expect(achievements.length).toBeGreaterThan(0);
    });

    it('should return achievements with all required fields', () => {
      const achievements = achievementService.getAchievements();

      for (const achievement of achievements) {
        expect(achievement).toHaveProperty('id');
        expect(achievement).toHaveProperty('name');
        expect(achievement).toHaveProperty('description');
        expect(achievement).toHaveProperty('icon');
        expect(achievement).toHaveProperty('rarity');
        expect(achievement).toHaveProperty('bonusPoints');
        expect(achievement).toHaveProperty('condition');
      }
    });

    it('should only have valid rarity values', () => {
      const achievements = achievementService.getAchievements();
      const validRarities = ['common', 'uncommon', 'rare', 'legendary'];

      for (const achievement of achievements) {
        expect(validRarities).toContain(achievement.rarity);
      }
    });
  });

  describe('unlockAchievement', () => {
    /**
     * Tests for Requirement 9.4:
     * WHEN a player meets an achievement condition, THE Achievement_System SHALL record the achievement with timestamp and party reference
     */
    it('should create a PlayerAchievement record', async () => {
      const { party, players } = await createTestParty();
      const player = players[0];

      const playerAchievement = await achievementService.unlockAchievement(
        player.id,
        'crowd-pleaser',
        party.id
      );

      expect(playerAchievement.playerId).toBe(player.id);
      expect(playerAchievement.achievementId).toBe('crowd-pleaser');
      expect(playerAchievement.partyId).toBe(party.id);
      expect(playerAchievement.bonusPoints).toBe(5); // Crowd Pleaser bonus
      expect(playerAchievement.unlockedAt).toBeInstanceOf(Date);
    });

    it('should persist achievement to database', async () => {
      const { party, players } = await createTestParty();
      const player = players[0];

      const playerAchievement = await achievementService.unlockAchievement(
        player.id,
        'crowd-pleaser',
        party.id
      );

      const dbAchievement = await prisma.playerAchievement.findUnique({
        where: { id: playerAchievement.id },
      });

      expect(dbAchievement).not.toBeNull();
      expect(dbAchievement?.playerId).toBe(player.id);
      expect(dbAchievement?.achievementId).toBe('crowd-pleaser');
    });

    it('should return existing achievement if already unlocked (idempotent)', async () => {
      const { party, players } = await createTestParty();
      const player = players[0];

      const first = await achievementService.unlockAchievement(
        player.id,
        'crowd-pleaser',
        party.id
      );

      const second = await achievementService.unlockAchievement(
        player.id,
        'crowd-pleaser',
        party.id
      );

      expect(second.id).toBe(first.id);
    });

    it('should throw error for non-existent player', async () => {
      const { party } = await createTestParty();

      await expect(
        achievementService.unlockAchievement('non-existent-player', 'crowd-pleaser', party.id)
      ).rejects.toThrow('Player does not exist');
    });

    it('should throw error for non-existent achievement', async () => {
      const { party, players } = await createTestParty();

      await expect(
        achievementService.unlockAchievement(players[0].id, 'non-existent-achievement', party.id)
      ).rejects.toThrow('Achievement does not exist');
    });
  });

  describe('getPlayerAchievements', () => {
    it('should return all achievements for a player', async () => {
      const { party, players } = await createTestParty();
      const player = players[0];

      // Unlock multiple achievements
      await achievementService.unlockAchievement(player.id, 'crowd-pleaser', party.id);
      await achievementService.unlockAchievement(player.id, 'comeback-kid', party.id);

      const achievements = await achievementService.getPlayerAchievements(player.id);

      expect(achievements).toHaveLength(2);
      expect(achievements.map(a => a.achievementId)).toContain('crowd-pleaser');
      expect(achievements.map(a => a.achievementId)).toContain('comeback-kid');
    });

    it('should filter by party when partyId is provided', async () => {
      const { party: party1, players: players1 } = await createTestParty();
      
      // Create second party
      const party2 = await prisma.party.create({
        data: {
          code: 'TST2',
          status: PartyStatus.PLAYING,
          hostId: players1[0].id,
          settings: '{}',
        },
      });

      // Unlock achievements in both parties
      await achievementService.unlockAchievement(players1[0].id, 'crowd-pleaser', party1.id);
      await achievementService.unlockAchievement(players1[0].id, 'comeback-kid', party2.id);

      const party1Achievements = await achievementService.getPlayerAchievements(
        players1[0].id,
        party1.id
      );

      expect(party1Achievements).toHaveLength(1);
      expect(party1Achievements[0].achievementId).toBe('crowd-pleaser');
    });

    it('should return empty array for player with no achievements', async () => {
      const { players } = await createTestParty();

      const achievements = await achievementService.getPlayerAchievements(players[0].id);

      expect(achievements).toHaveLength(0);
    });

    it('should throw error for non-existent player', async () => {
      await expect(
        achievementService.getPlayerAchievements('non-existent-player')
      ).rejects.toThrow('Player does not exist');
    });
  });

  describe('getPartyAchievements', () => {
    it('should return all achievements in a party', async () => {
      const { party, players } = await createTestParty();

      // Unlock achievements for different players
      await achievementService.unlockAchievement(players[0].id, 'crowd-pleaser', party.id);
      await achievementService.unlockAchievement(players[1].id, 'comeback-kid', party.id);

      const achievements = await achievementService.getPartyAchievements(party.id);

      expect(achievements).toHaveLength(2);
    });

    it('should return empty array for party with no achievements', async () => {
      const { party } = await createTestParty();

      const achievements = await achievementService.getPartyAchievements(party.id);

      expect(achievements).toHaveLength(0);
    });

    it('should throw error for non-existent party', async () => {
      await expect(
        achievementService.getPartyAchievements('non-existent-party')
      ).rejects.toThrow('Party does not exist');
    });
  });

  describe('getAchievementRevealOrder', () => {
    /**
     * Tests for Requirement 10.1:
     * WHEN the finale begins, THE Finale_Screen SHALL reveal achievements one-by-one with animations
     */
    it('should order achievements by rarity (common first, legendary last)', async () => {
      const { party, players } = await createTestParty();

      // Unlock achievements of different rarities
      // perfect-10 is legendary, crowd-pleaser is uncommon, comeback-kid is uncommon
      await achievementService.unlockAchievement(players[0].id, 'perfect-10', party.id);
      await achievementService.unlockAchievement(players[1].id, 'crowd-pleaser', party.id);
      await achievementService.unlockAchievement(players[2].id, 'love-hate', party.id); // rare

      const orderedAchievements = await achievementService.getAchievementRevealOrder(party.id);

      expect(orderedAchievements).toHaveLength(3);
      
      // Get rarities in order
      const rarities = orderedAchievements.map(pa => {
        const achievement = ACHIEVEMENTS.find(a => a.id === pa.achievementId);
        return achievement?.rarity;
      });

      // Uncommon should come before rare, rare before legendary
      const rarityOrder = ['common', 'uncommon', 'rare', 'legendary'];
      for (let i = 1; i < rarities.length; i++) {
        const prevIndex = rarityOrder.indexOf(rarities[i - 1]!);
        const currIndex = rarityOrder.indexOf(rarities[i]!);
        expect(currIndex).toBeGreaterThanOrEqual(prevIndex);
      }
    });

    it('should throw error for non-existent party', async () => {
      await expect(
        achievementService.getAchievementRevealOrder('non-existent-party')
      ).rejects.toThrow('Party does not exist');
    });
  });

  describe('checkAchievements', () => {
    /**
     * Tests for Requirement 9.3:
     * THE Achievement_System SHALL track achievements in real-time during gameplay
     */
    describe('score_threshold condition (Crowd Pleaser)', () => {
      /**
       * Tests for Requirement 9.5:
       * "Crowd Pleaser" (9+ average)
       */
      it('should unlock Crowd Pleaser when song has 9+ average', async () => {
        const { party, players } = await createTestParty();

        // Create a song with 9+ average for player 0
        await createSongWithVotes(party.id, players[0].id, 1, [
          { voterId: players[1].id, rating: 9 },
          { voterId: players[2].id, rating: 10 },
        ]);

        const newAchievements = await achievementService.checkAchievements(
          players[0].id,
          party.id
        );

        expect(newAchievements.map(a => a.id)).toContain('crowd-pleaser');
      });

      it('should not unlock Crowd Pleaser when song has less than 9 average', async () => {
        const { party, players } = await createTestParty();

        // Create a song with less than 9 average
        await createSongWithVotes(party.id, players[0].id, 1, [
          { voterId: players[1].id, rating: 7 },
          { voterId: players[2].id, rating: 8 },
        ]);

        const newAchievements = await achievementService.checkAchievements(
          players[0].id,
          party.id
        );

        expect(newAchievements.map(a => a.id)).not.toContain('crowd-pleaser');
      });
    });

    describe('perfect_score condition (Perfect 10)', () => {
      /**
       * Tests for Requirement 9.5:
       * "Perfect 10" (10.0 average)
       */
      it('should unlock Perfect 10 when song has 10.0 average', async () => {
        const { party, players } = await createTestParty();

        // Create a song with perfect 10 average
        await createSongWithVotes(party.id, players[0].id, 1, [
          { voterId: players[1].id, rating: 10 },
          { voterId: players[2].id, rating: 10 },
        ]);

        const newAchievements = await achievementService.checkAchievements(
          players[0].id,
          party.id
        );

        expect(newAchievements.map(a => a.id)).toContain('perfect-10');
      });

      it('should not unlock Perfect 10 when song has less than 10.0 average', async () => {
        const { party, players } = await createTestParty();

        // Create a song with 9.5 average
        await createSongWithVotes(party.id, players[0].id, 1, [
          { voterId: players[1].id, rating: 9 },
          { voterId: players[2].id, rating: 10 },
        ]);

        const newAchievements = await achievementService.checkAchievements(
          players[0].id,
          party.id
        );

        expect(newAchievements.map(a => a.id)).not.toContain('perfect-10');
      });
    });

    describe('consistency condition (Consistent King)', () => {
      /**
       * Tests for Requirement 9.5:
       * "Consistent King" (all songs within 1 point)
       */
      it('should unlock Consistent King when all songs are within 1 point', async () => {
        const { party, players } = await createTestParty();

        // Create two songs with scores within 1 point
        await createSongWithVotes(party.id, players[0].id, 1, [
          { voterId: players[1].id, rating: 7 },
          { voterId: players[2].id, rating: 7 },
        ]); // Average: 7.0

        await createSongWithVotes(party.id, players[0].id, 2, [
          { voterId: players[1].id, rating: 8 },
          { voterId: players[2].id, rating: 7 },
        ]); // Average: 7.5

        const newAchievements = await achievementService.checkAchievements(
          players[0].id,
          party.id
        );

        expect(newAchievements.map(a => a.id)).toContain('consistent-king');
      });

      it('should not unlock Consistent King when songs differ by more than 1 point', async () => {
        const { party, players } = await createTestParty();

        // Create two songs with scores more than 1 point apart
        await createSongWithVotes(party.id, players[0].id, 1, [
          { voterId: players[1].id, rating: 5 },
          { voterId: players[2].id, rating: 5 },
        ]); // Average: 5.0

        await createSongWithVotes(party.id, players[0].id, 2, [
          { voterId: players[1].id, rating: 8 },
          { voterId: players[2].id, rating: 8 },
        ]); // Average: 8.0

        const newAchievements = await achievementService.checkAchievements(
          players[0].id,
          party.id
        );

        expect(newAchievements.map(a => a.id)).not.toContain('consistent-king');
      });

      it('should not unlock Consistent King with only one song', async () => {
        const { party, players } = await createTestParty();

        // Create only one song
        await createSongWithVotes(party.id, players[0].id, 1, [
          { voterId: players[1].id, rating: 7 },
          { voterId: players[2].id, rating: 7 },
        ]);

        const newAchievements = await achievementService.checkAchievements(
          players[0].id,
          party.id
        );

        expect(newAchievements.map(a => a.id)).not.toContain('consistent-king');
      });
    });

    describe('polarizing condition (Love/Hate)', () => {
      /**
       * Tests for Requirement 9.7:
       * "Love/Hate" (receive both 1 and 10 on same song)
       */
      it('should unlock Love/Hate when song receives both 1 and 10', async () => {
        const { party, players } = await createTestParty(4); // Need 4 players for this test

        // Create a song with both 1 and 10 ratings
        await createSongWithVotes(party.id, players[0].id, 1, [
          { voterId: players[1].id, rating: 1 },
          { voterId: players[2].id, rating: 10 },
          { voterId: players[3].id, rating: 5 },
        ]);

        const newAchievements = await achievementService.checkAchievements(
          players[0].id,
          party.id
        );

        expect(newAchievements.map(a => a.id)).toContain('love-hate');
      });

      it('should not unlock Love/Hate without both extreme ratings', async () => {
        const { party, players } = await createTestParty();

        // Create a song without extreme ratings
        await createSongWithVotes(party.id, players[0].id, 1, [
          { voterId: players[1].id, rating: 5 },
          { voterId: players[2].id, rating: 6 },
        ]);

        const newAchievements = await achievementService.checkAchievements(
          players[0].id,
          party.id
        );

        expect(newAchievements.map(a => a.id)).not.toContain('love-hate');
      });
    });

    describe('sweep condition (Category Sweep)', () => {
      /**
       * Tests for Requirement 9.7:
       * "Category Sweep" (win 2+ bonus categories)
       */
      it('should unlock Category Sweep when player wins 2+ bonus categories', async () => {
        const { party, players } = await createTestParty();

        // Create a song for the player
        const song = await createSongWithVotes(party.id, players[0].id, 1, [
          { voterId: players[1].id, rating: 9 },
          { voterId: players[2].id, rating: 9 },
        ]);

        // Create bonus results for the player
        await prisma.bonusResult.create({
          data: {
            partyId: party.id,
            categoryId: 'crowd-favorite',
            categoryName: 'Crowd Favorite',
            winningSongId: song.id,
            winnerPlayerId: players[0].id,
            points: 10,
            revealOrder: 1,
          },
        });

        await prisma.bonusResult.create({
          data: {
            partyId: party.id,
            categoryId: 'hidden-gem',
            categoryName: 'Hidden Gem',
            winningSongId: song.id,
            winnerPlayerId: players[0].id,
            points: 10,
            revealOrder: 2,
          },
        });

        const newAchievements = await achievementService.checkAchievements(
          players[0].id,
          party.id
        );

        expect(newAchievements.map(a => a.id)).toContain('category-sweep');
      });

      it('should not unlock Category Sweep with only 1 bonus category win', async () => {
        const { party, players } = await createTestParty();

        // Create a song for the player
        const song = await createSongWithVotes(party.id, players[0].id, 1, [
          { voterId: players[1].id, rating: 9 },
          { voterId: players[2].id, rating: 9 },
        ]);

        // Create only one bonus result
        await prisma.bonusResult.create({
          data: {
            partyId: party.id,
            categoryId: 'crowd-favorite',
            categoryName: 'Crowd Favorite',
            winningSongId: song.id,
            winnerPlayerId: players[0].id,
            points: 10,
            revealOrder: 1,
          },
        });

        const newAchievements = await achievementService.checkAchievements(
          players[0].id,
          party.id
        );

        expect(newAchievements.map(a => a.id)).not.toContain('category-sweep');
      });
    });

    it('should not return already unlocked achievements', async () => {
      const { party, players } = await createTestParty();

      // Create a song with 9+ average
      await createSongWithVotes(party.id, players[0].id, 1, [
        { voterId: players[1].id, rating: 9 },
        { voterId: players[2].id, rating: 10 },
      ]);

      // First check should return the achievement
      const firstCheck = await achievementService.checkAchievements(
        players[0].id,
        party.id
      );
      expect(firstCheck.map(a => a.id)).toContain('crowd-pleaser');

      // Unlock the achievement
      await achievementService.unlockAchievement(players[0].id, 'crowd-pleaser', party.id);

      // Second check should not return the already unlocked achievement
      const secondCheck = await achievementService.checkAchievements(
        players[0].id,
        party.id
      );
      expect(secondCheck.map(a => a.id)).not.toContain('crowd-pleaser');
    });

    it('should throw error for non-existent player', async () => {
      const { party } = await createTestParty();

      await expect(
        achievementService.checkAchievements('non-existent-player', party.id)
      ).rejects.toThrow('Player does not exist');
    });

    it('should throw error for non-existent party', async () => {
      const { players } = await createTestParty();

      await expect(
        achievementService.checkAchievements(players[0].id, 'non-existent-party')
      ).rejects.toThrow('Party does not exist');
    });
  });
});
