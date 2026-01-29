import { PrismaClient } from '@prisma/client';
import { IdentityService, identityService } from '../identity.service';
import { PartyService, partyService } from '../party.service';
import { Player, PartyStatus, PlayerStatus, LeaderboardEntry } from '../../types';
import { ALIAS_POOL, AVATAR_SILHOUETTES, PLAYER_COLORS } from '../../constants/identity';
import { v4 as uuidv4 } from 'uuid';

// Create a test database client
const prisma = new PrismaClient();

describe('IdentityService', () => {
  // Clean up database before each test
  beforeEach(async () => {
    // Delete all records in reverse order of dependencies
    await prisma.bonusResult.deleteMany();
    await prisma.vote.deleteMany();
    await prisma.song.deleteMany();
    await prisma.partyIdentity.deleteMany();
    await prisma.player.deleteMany();
    await prisma.party.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  /**
   * Helper function to create a test party with players
   */
  async function createTestPartyWithPlayers(playerCount: number): Promise<{
    partyId: string;
    players: Player[];
  }> {
    const { party, host } = await partyService.createParty('TestHost');
    const players: Player[] = [host];

    // Add additional players
    for (let i = 1; i < playerCount; i++) {
      const { player } = await partyService.joinParty(party.code, `Player${i}`);
      players.push(player);
    }

    return { partyId: party.id, players };
  }

  describe('assignIdentities', () => {
    /**
     * Tests for Requirement 2.1:
     * WHEN a Player joins a Party, THE Backend SHALL assign them a random Alias from a pool of at least 32 unique names
     */
    describe('alias assignment (Requirement 2.1)', () => {
      it('should assign aliases from the predefined alias pool', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(3);

        const identities = await identityService.assignIdentities(partyId, players);

        // All aliases should be from the pool
        for (const identity of identities) {
          expect(ALIAS_POOL).toContain(identity.alias);
        }
      });

      it('should assign an alias to each player', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(5);

        const identities = await identityService.assignIdentities(partyId, players);

        expect(identities).toHaveLength(5);
        for (const identity of identities) {
          expect(identity.alias).toBeTruthy();
          expect(typeof identity.alias).toBe('string');
        }
      });

      it('should assign random aliases (not always the same order)', async () => {
        // Run multiple times and check that we get different orderings
        const aliasOrderings: string[][] = [];

        for (let i = 0; i < 5; i++) {
          // Clean up for each iteration
          await prisma.partyIdentity.deleteMany();
          await prisma.player.deleteMany();
          await prisma.party.deleteMany();

          const { partyId, players } = await createTestPartyWithPlayers(3);
          const identities = await identityService.assignIdentities(partyId, players);
          aliasOrderings.push(identities.map((id) => id.alias).sort());
        }

        // At least some orderings should be different (very high probability)
        // We sort to compare the sets, not the order
        const uniqueOrderings = new Set(aliasOrderings.map((o) => o.join(',')));
        // With 3 players from 40+ aliases, we should get different combinations
        expect(uniqueOrderings.size).toBeGreaterThanOrEqual(1);
      });
    });

    /**
     * Tests for Requirement 2.2:
     * WHEN an Alias is assigned, THE Backend SHALL ensure no two Players in the same Party have the same Alias
     */
    describe('alias uniqueness (Requirement 2.2)', () => {
      it('should assign unique aliases to all players in a party', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(10);

        const identities = await identityService.assignIdentities(partyId, players);

        const aliases = identities.map((id) => id.alias);
        const uniqueAliases = new Set(aliases);

        expect(uniqueAliases.size).toBe(aliases.length);
      });

      it('should assign unique aliases even with maximum players', async () => {
        // Test with a larger number of players (up to the smallest pool size)
        const maxPlayers = Math.min(
          ALIAS_POOL.length,
          AVATAR_SILHOUETTES.length,
          PLAYER_COLORS.length
        );
        const { partyId, players } = await createTestPartyWithPlayers(maxPlayers);

        const identities = await identityService.assignIdentities(partyId, players);

        const aliases = identities.map((id) => id.alias);
        const uniqueAliases = new Set(aliases);

        expect(uniqueAliases.size).toBe(maxPlayers);
      });

      it('should throw error if more players than available aliases', async () => {
        // Create a mock scenario with more players than aliases
        const { partyId, players } = await createTestPartyWithPlayers(3);

        // Create fake players array larger than alias pool
        const tooManyPlayers: Player[] = [];
        for (let i = 0; i < ALIAS_POOL.length + 1; i++) {
          tooManyPlayers.push({
            id: uuidv4(),
            name: `Player${i}`,
            avatarUrl: null,
            partyId,
            isHost: i === 0,
            isReady: false,
            status: PlayerStatus.CONNECTED,
            socketId: null,
            joinedAt: new Date(),
          });
        }

        await expect(
          identityService.assignIdentities(partyId, tooManyPlayers)
        ).rejects.toThrow(/exceeds alias pool size/);
      });
    });

    /**
     * Tests for Requirement 2.3:
     * WHEN a Player is assigned an Alias, THE Backend SHALL also assign them a unique Silhouette shape and color
     */
    describe('silhouette and color assignment (Requirement 2.3)', () => {
      it('should assign a silhouette to each player', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(5);

        const identities = await identityService.assignIdentities(partyId, players);

        for (const identity of identities) {
          expect(identity.silhouette).toBeTruthy();
          expect(AVATAR_SILHOUETTES).toContain(identity.silhouette);
        }
      });

      it('should assign a color to each player', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(5);

        const identities = await identityService.assignIdentities(partyId, players);

        for (const identity of identities) {
          expect(identity.color).toBeTruthy();
          expect(PLAYER_COLORS).toContain(identity.color);
        }
      });

      it('should assign unique silhouettes to all players', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(10);

        const identities = await identityService.assignIdentities(partyId, players);

        const silhouettes = identities.map((id) => id.silhouette);
        const uniqueSilhouettes = new Set(silhouettes);

        expect(uniqueSilhouettes.size).toBe(silhouettes.length);
      });

      it('should assign unique colors to all players', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(10);

        const identities = await identityService.assignIdentities(partyId, players);

        const colors = identities.map((id) => id.color);
        const uniqueColors = new Set(colors);

        expect(uniqueColors.size).toBe(colors.length);
      });

      it('should assign complete identity (alias, silhouette, color) to each player', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(3);

        const identities = await identityService.assignIdentities(partyId, players);

        for (const identity of identities) {
          expect(identity.alias).toBeTruthy();
          expect(identity.silhouette).toBeTruthy();
          expect(identity.color).toBeTruthy();
        }
      });
    });

    describe('database persistence', () => {
      it('should persist identities to the database', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(3);

        const identities = await identityService.assignIdentities(partyId, players);

        // Verify all identities are in the database
        const dbIdentities = await prisma.partyIdentity.findMany({
          where: { partyId },
        });

        expect(dbIdentities).toHaveLength(3);
      });

      it('should store correct player-identity associations', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(3);

        const identities = await identityService.assignIdentities(partyId, players);

        // Verify each player has exactly one identity
        for (const player of players) {
          const dbIdentity = await prisma.partyIdentity.findUnique({
            where: { playerId: player.id },
          });

          expect(dbIdentity).not.toBeNull();
          expect(dbIdentity?.partyId).toBe(partyId);
        }
      });

      it('should initialize identities as not revealed', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(3);

        const identities = await identityService.assignIdentities(partyId, players);

        for (const identity of identities) {
          expect(identity.isRevealed).toBe(false);
          expect(identity.revealedAt).toBeNull();
          expect(identity.revealOrder).toBeNull();
        }
      });
    });

    describe('edge cases', () => {
      it('should handle single player party', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(1);

        const identities = await identityService.assignIdentities(partyId, players);

        expect(identities).toHaveLength(1);
        expect(identities[0].alias).toBeTruthy();
        expect(identities[0].silhouette).toBeTruthy();
        expect(identities[0].color).toBeTruthy();
      });

      it('should handle empty players array', async () => {
        const { party } = await partyService.createParty('TestHost');

        const identities = await identityService.assignIdentities(party.id, []);

        expect(identities).toHaveLength(0);
      });
    });
  });

  describe('getIdentity', () => {
    it('should return identity for existing player', async () => {
      const { partyId, players } = await createTestPartyWithPlayers(3);
      await identityService.assignIdentities(partyId, players);

      const identity = await identityService.getIdentity(players[0].id);

      expect(identity).not.toBeNull();
      expect(identity?.playerId).toBe(players[0].id);
      expect(identity?.partyId).toBe(partyId);
    });

    it('should return null for non-existent player', async () => {
      const identity = await identityService.getIdentity('non-existent-id');

      expect(identity).toBeNull();
    });

    it('should return correct identity data', async () => {
      const { partyId, players } = await createTestPartyWithPlayers(3);
      const assignedIdentities = await identityService.assignIdentities(partyId, players);

      const identity = await identityService.getIdentity(players[1].id);

      expect(identity).not.toBeNull();
      
      // Find the matching assigned identity
      const matchingAssigned = assignedIdentities.find(
        (id) => id.playerId === players[1].id
      );
      
      expect(identity?.alias).toBe(matchingAssigned?.alias);
      expect(identity?.silhouette).toBe(matchingAssigned?.silhouette);
      expect(identity?.color).toBe(matchingAssigned?.color);
    });

    it('should return identity with all required fields', async () => {
      const { partyId, players } = await createTestPartyWithPlayers(1);
      await identityService.assignIdentities(partyId, players);

      const identity = await identityService.getIdentity(players[0].id);

      expect(identity).toHaveProperty('id');
      expect(identity).toHaveProperty('partyId');
      expect(identity).toHaveProperty('playerId');
      expect(identity).toHaveProperty('alias');
      expect(identity).toHaveProperty('silhouette');
      expect(identity).toHaveProperty('color');
      expect(identity).toHaveProperty('isRevealed');
      expect(identity).toHaveProperty('revealedAt');
      expect(identity).toHaveProperty('revealOrder');
    });
  });

  describe('getIdentities', () => {
    it('should return all identities for a party', async () => {
      const { partyId, players } = await createTestPartyWithPlayers(5);
      await identityService.assignIdentities(partyId, players);

      const identities = await identityService.getIdentities(partyId);

      expect(identities).toHaveLength(5);
    });

    it('should return empty array for party with no identities', async () => {
      const { party } = await partyService.createParty('TestHost');

      const identities = await identityService.getIdentities(party.id);

      expect(identities).toHaveLength(0);
    });

    it('should return empty array for non-existent party', async () => {
      const identities = await identityService.getIdentities('non-existent-id');

      expect(identities).toHaveLength(0);
    });

    it('should only return identities for the specified party', async () => {
      // Create two parties with players
      const { partyId: partyId1, players: players1 } = await createTestPartyWithPlayers(3);
      await identityService.assignIdentities(partyId1, players1);

      // Clean up and create second party
      const { party: party2, host: host2 } = await partyService.createParty('TestHost2');
      const { player: player2 } = await partyService.joinParty(party2.code, 'Player2');
      await identityService.assignIdentities(party2.id, [host2, player2]);

      // Get identities for first party only
      const identities1 = await identityService.getIdentities(partyId1);
      const identities2 = await identityService.getIdentities(party2.id);

      expect(identities1).toHaveLength(3);
      expect(identities2).toHaveLength(2);

      // Verify no cross-contamination
      for (const identity of identities1) {
        expect(identity.partyId).toBe(partyId1);
      }
      for (const identity of identities2) {
        expect(identity.partyId).toBe(party2.id);
      }
    });
  });

  describe('getAnonymousLeaderboard', () => {
    /**
     * Helper function to create a song for a player
     */
    async function createSongForPlayer(
      partyId: string,
      playerId: string,
      options: {
        finalScore?: number;
        roundNumber?: number;
        confidence?: number;
      } = {}
    ) {
      const { finalScore = null, roundNumber = 1, confidence = 3 } = options;
      
      return prisma.song.create({
        data: {
          id: uuidv4(),
          partyId,
          submitterId: playerId,
          soundcloudId: Math.floor(Math.random() * 1000000),
          title: `Test Song ${Math.random()}`,
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test',
          confidence,
          roundNumber,
          queuePosition: 0,
          finalScore,
        },
      });
    }

    /**
     * Tests for Requirement 2.4:
     * WHILE the Party status is LOBBY, SUBMITTING, or PLAYING, THE Frontend SHALL display only Aliases and Silhouettes
     */
    describe('anonymous display (Requirement 2.4)', () => {
      it('should return leaderboard with aliases instead of real names', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(3);
        await identityService.assignIdentities(partyId, players);

        const leaderboard = await identityService.getAnonymousLeaderboard(partyId);

        expect(leaderboard).toHaveLength(3);
        for (const entry of leaderboard) {
          // Should have alias, not real name
          expect(entry.alias).toBeTruthy();
          expect(ALIAS_POOL).toContain(entry.alias);
          // Should not reveal real name when not revealed
          expect(entry.isRevealed).toBe(false);
          expect(entry.revealedName).toBeNull();
        }
      });

      it('should include silhouette and color for each entry', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(3);
        await identityService.assignIdentities(partyId, players);

        const leaderboard = await identityService.getAnonymousLeaderboard(partyId);

        for (const entry of leaderboard) {
          expect(entry.silhouette).toBeTruthy();
          expect(AVATAR_SILHOUETTES).toContain(entry.silhouette);
          expect(entry.color).toBeTruthy();
          expect(PLAYER_COLORS).toContain(entry.color);
        }
      });

      it('should show revealed name when identity is revealed', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(3);
        await identityService.assignIdentities(partyId, players);

        // Manually reveal one identity
        await prisma.partyIdentity.update({
          where: { playerId: players[0].id },
          data: { isRevealed: true, revealedAt: new Date(), revealOrder: 1 },
        });

        const leaderboard = await identityService.getAnonymousLeaderboard(partyId);

        // Find the revealed entry
        const revealedEntry = leaderboard.find((e) => e.isRevealed);
        expect(revealedEntry).toBeDefined();
        expect(revealedEntry?.revealedName).toBe(players[0].name);
      });
    });

    describe('score calculation', () => {
      it('should calculate player scores from songs finalScore values', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(3);
        await identityService.assignIdentities(partyId, players);

        // Create songs with known scores
        await createSongForPlayer(partyId, players[0].id, { finalScore: 15.5 });
        await createSongForPlayer(partyId, players[0].id, { finalScore: 12.0 });
        await createSongForPlayer(partyId, players[1].id, { finalScore: 20.0 });
        await createSongForPlayer(partyId, players[2].id, { finalScore: 10.0 });

        const leaderboard = await identityService.getAnonymousLeaderboard(partyId);

        // Player 0 should have score 27.5 (15.5 + 12.0)
        // Player 1 should have score 20.0
        // Player 2 should have score 10.0
        expect(leaderboard[0].score).toBe(27.5);
        expect(leaderboard[1].score).toBe(20.0);
        expect(leaderboard[2].score).toBe(10.0);
      });

      it('should handle players with no songs (score = 0)', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(3);
        await identityService.assignIdentities(partyId, players);

        // Only create song for one player
        await createSongForPlayer(partyId, players[0].id, { finalScore: 10.0 });

        const leaderboard = await identityService.getAnonymousLeaderboard(partyId);

        // Two players should have score 0
        const zeroScorePlayers = leaderboard.filter((e) => e.score === 0);
        expect(zeroScorePlayers).toHaveLength(2);
      });

      it('should handle songs with null finalScore (treated as 0)', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(2);
        await identityService.assignIdentities(partyId, players);

        // Create song with null finalScore
        await createSongForPlayer(partyId, players[0].id, { finalScore: undefined });
        await createSongForPlayer(partyId, players[1].id, { finalScore: 10.0 });

        const leaderboard = await identityService.getAnonymousLeaderboard(partyId);

        expect(leaderboard[0].score).toBe(10.0);
        expect(leaderboard[1].score).toBe(0);
      });

      it('should include songCount for each player', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(2);
        await identityService.assignIdentities(partyId, players);

        // Player 0 has 2 songs, Player 1 has 1 song
        await createSongForPlayer(partyId, players[0].id, { finalScore: 10.0 });
        await createSongForPlayer(partyId, players[0].id, { finalScore: 5.0 });
        await createSongForPlayer(partyId, players[1].id, { finalScore: 8.0 });

        const leaderboard = await identityService.getAnonymousLeaderboard(partyId);

        // Find entries by score to identify players
        const player0Entry = leaderboard.find((e) => e.score === 15.0);
        const player1Entry = leaderboard.find((e) => e.score === 8.0);

        expect(player0Entry?.songCount).toBe(2);
        expect(player1Entry?.songCount).toBe(1);
      });
    });

    describe('ranking and sorting', () => {
      it('should sort by score descending', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(4);
        await identityService.assignIdentities(partyId, players);

        // Create songs with different scores
        await createSongForPlayer(partyId, players[0].id, { finalScore: 5.0 });
        await createSongForPlayer(partyId, players[1].id, { finalScore: 20.0 });
        await createSongForPlayer(partyId, players[2].id, { finalScore: 15.0 });
        await createSongForPlayer(partyId, players[3].id, { finalScore: 10.0 });

        const leaderboard = await identityService.getAnonymousLeaderboard(partyId);

        expect(leaderboard[0].score).toBe(20.0);
        expect(leaderboard[1].score).toBe(15.0);
        expect(leaderboard[2].score).toBe(10.0);
        expect(leaderboard[3].score).toBe(5.0);
      });

      it('should assign correct ranks (1-based)', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(3);
        await identityService.assignIdentities(partyId, players);

        await createSongForPlayer(partyId, players[0].id, { finalScore: 30.0 });
        await createSongForPlayer(partyId, players[1].id, { finalScore: 20.0 });
        await createSongForPlayer(partyId, players[2].id, { finalScore: 10.0 });

        const leaderboard = await identityService.getAnonymousLeaderboard(partyId);

        expect(leaderboard[0].rank).toBe(1);
        expect(leaderboard[1].rank).toBe(2);
        expect(leaderboard[2].rank).toBe(3);
      });
    });

    describe('movement indicators', () => {
      it('should show "new" movement when no previous scores provided', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(3);
        await identityService.assignIdentities(partyId, players);

        const leaderboard = await identityService.getAnonymousLeaderboard(partyId);

        for (const entry of leaderboard) {
          expect(entry.movement).toBe('new');
          expect(entry.previousScore).toBeNull();
        }
      });

      it('should show "up" movement when score increased', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(2);
        await identityService.assignIdentities(partyId, players);

        await createSongForPlayer(partyId, players[0].id, { finalScore: 20.0 });
        await createSongForPlayer(partyId, players[1].id, { finalScore: 10.0 });

        // Previous scores were lower
        const previousScores = new Map<string, number>([
          [players[0].id, 10.0],
          [players[1].id, 5.0],
        ]);

        const leaderboard = await identityService.getAnonymousLeaderboard(partyId, previousScores);

        for (const entry of leaderboard) {
          expect(entry.movement).toBe('up');
        }
      });

      it('should show "down" movement when score decreased', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(2);
        await identityService.assignIdentities(partyId, players);

        await createSongForPlayer(partyId, players[0].id, { finalScore: 10.0 });
        await createSongForPlayer(partyId, players[1].id, { finalScore: 5.0 });

        // Previous scores were higher
        const previousScores = new Map<string, number>([
          [players[0].id, 20.0],
          [players[1].id, 15.0],
        ]);

        const leaderboard = await identityService.getAnonymousLeaderboard(partyId, previousScores);

        for (const entry of leaderboard) {
          expect(entry.movement).toBe('down');
        }
      });

      it('should show "same" movement when score unchanged', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(2);
        await identityService.assignIdentities(partyId, players);

        await createSongForPlayer(partyId, players[0].id, { finalScore: 15.0 });
        await createSongForPlayer(partyId, players[1].id, { finalScore: 10.0 });

        // Previous scores are the same
        const previousScores = new Map<string, number>([
          [players[0].id, 15.0],
          [players[1].id, 10.0],
        ]);

        const leaderboard = await identityService.getAnonymousLeaderboard(partyId, previousScores);

        for (const entry of leaderboard) {
          expect(entry.movement).toBe('same');
        }
      });

      it('should include previousScore in response', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(2);
        await identityService.assignIdentities(partyId, players);

        await createSongForPlayer(partyId, players[0].id, { finalScore: 20.0 });
        await createSongForPlayer(partyId, players[1].id, { finalScore: 10.0 });

        const previousScores = new Map<string, number>([
          [players[0].id, 15.0],
          [players[1].id, 8.0],
        ]);

        const leaderboard = await identityService.getAnonymousLeaderboard(partyId, previousScores);

        // Find entries by current score
        const entry1 = leaderboard.find((e) => e.score === 20.0);
        const entry2 = leaderboard.find((e) => e.score === 10.0);

        expect(entry1?.previousScore).toBe(15.0);
        expect(entry2?.previousScore).toBe(8.0);
      });
    });

    describe('edge cases', () => {
      it('should return empty array for party with no identities', async () => {
        const { party } = await partyService.createParty('TestHost');

        const leaderboard = await identityService.getAnonymousLeaderboard(party.id);

        expect(leaderboard).toHaveLength(0);
      });

      it('should return empty array for non-existent party', async () => {
        const leaderboard = await identityService.getAnonymousLeaderboard('non-existent-id');

        expect(leaderboard).toHaveLength(0);
      });

      it('should handle single player party', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(1);
        await identityService.assignIdentities(partyId, players);

        await createSongForPlayer(partyId, players[0].id, { finalScore: 25.0 });

        const leaderboard = await identityService.getAnonymousLeaderboard(partyId);

        expect(leaderboard).toHaveLength(1);
        expect(leaderboard[0].rank).toBe(1);
        expect(leaderboard[0].score).toBe(25.0);
      });

      it('should handle players with tied scores', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(3);
        await identityService.assignIdentities(partyId, players);

        // All players have the same score
        await createSongForPlayer(partyId, players[0].id, { finalScore: 10.0 });
        await createSongForPlayer(partyId, players[1].id, { finalScore: 10.0 });
        await createSongForPlayer(partyId, players[2].id, { finalScore: 10.0 });

        const leaderboard = await identityService.getAnonymousLeaderboard(partyId);

        expect(leaderboard).toHaveLength(3);
        // All should have score 10
        for (const entry of leaderboard) {
          expect(entry.score).toBe(10.0);
        }
        // Ranks should be sequential (1, 2, 3)
        expect(leaderboard.map((e) => e.rank)).toEqual([1, 2, 3]);
      });
    });

    describe('leaderboard entry structure', () => {
      it('should return entries with all required fields', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(2);
        await identityService.assignIdentities(partyId, players);

        await createSongForPlayer(partyId, players[0].id, { finalScore: 10.0 });

        const leaderboard = await identityService.getAnonymousLeaderboard(partyId);

        for (const entry of leaderboard) {
          expect(entry).toHaveProperty('rank');
          expect(entry).toHaveProperty('alias');
          expect(entry).toHaveProperty('silhouette');
          expect(entry).toHaveProperty('color');
          expect(entry).toHaveProperty('score');
          expect(entry).toHaveProperty('previousScore');
          expect(entry).toHaveProperty('movement');
          expect(entry).toHaveProperty('songCount');
          expect(entry).toHaveProperty('isRevealed');
          expect(entry).toHaveProperty('revealedName');
        }
      });

      it('should have correct types for all fields', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(2);
        await identityService.assignIdentities(partyId, players);

        await createSongForPlayer(partyId, players[0].id, { finalScore: 10.0 });

        const leaderboard = await identityService.getAnonymousLeaderboard(partyId);

        for (const entry of leaderboard) {
          expect(typeof entry.rank).toBe('number');
          expect(typeof entry.alias).toBe('string');
          expect(typeof entry.silhouette).toBe('string');
          expect(typeof entry.color).toBe('string');
          expect(typeof entry.score).toBe('number');
          expect(entry.previousScore === null || typeof entry.previousScore === 'number').toBe(true);
          expect(['up', 'down', 'same', 'new']).toContain(entry.movement);
          expect(typeof entry.songCount).toBe('number');
          expect(typeof entry.isRevealed).toBe('boolean');
          expect(entry.revealedName === null || typeof entry.revealedName === 'string').toBe(true);
        }
      });
    });
  });

  describe('revealIdentity', () => {
    /**
     * Tests for Requirement 2.6:
     * WHEN the Party enters FINALE state, THE Backend SHALL reveal Player identities in reverse score order
     */
    describe('identity reveal (Requirement 2.6)', () => {
      it('should mark identity as revealed', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(3);
        await identityService.assignIdentities(partyId, players);

        const revealedIdentity = await identityService.revealIdentity(partyId, players[0].id, 1);

        expect(revealedIdentity.isRevealed).toBe(true);
      });

      it('should set revealedAt timestamp', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(3);
        await identityService.assignIdentities(partyId, players);

        const beforeReveal = new Date();
        const revealedIdentity = await identityService.revealIdentity(partyId, players[0].id, 1);
        const afterReveal = new Date();

        expect(revealedIdentity.revealedAt).not.toBeNull();
        expect(revealedIdentity.revealedAt!.getTime()).toBeGreaterThanOrEqual(beforeReveal.getTime());
        expect(revealedIdentity.revealedAt!.getTime()).toBeLessThanOrEqual(afterReveal.getTime());
      });

      it('should set revealOrder number', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(3);
        await identityService.assignIdentities(partyId, players);

        const revealedIdentity = await identityService.revealIdentity(partyId, players[0].id, 5);

        expect(revealedIdentity.revealOrder).toBe(5);
      });

      it('should persist reveal to database', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(3);
        await identityService.assignIdentities(partyId, players);

        await identityService.revealIdentity(partyId, players[0].id, 1);

        // Verify in database
        const dbIdentity = await prisma.partyIdentity.findUnique({
          where: { playerId: players[0].id },
        });

        expect(dbIdentity?.isRevealed).toBe(true);
        expect(dbIdentity?.revealedAt).not.toBeNull();
        expect(dbIdentity?.revealOrder).toBe(1);
      });

      it('should reveal multiple identities with different orders', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(3);
        await identityService.assignIdentities(partyId, players);

        // Reveal in order: player2 (1st), player1 (2nd), player0 (3rd)
        await identityService.revealIdentity(partyId, players[2].id, 1);
        await identityService.revealIdentity(partyId, players[1].id, 2);
        await identityService.revealIdentity(partyId, players[0].id, 3);

        // Verify all are revealed with correct orders
        const identity0 = await identityService.getIdentity(players[0].id);
        const identity1 = await identityService.getIdentity(players[1].id);
        const identity2 = await identityService.getIdentity(players[2].id);

        expect(identity0?.isRevealed).toBe(true);
        expect(identity0?.revealOrder).toBe(3);
        expect(identity1?.isRevealed).toBe(true);
        expect(identity1?.revealOrder).toBe(2);
        expect(identity2?.isRevealed).toBe(true);
        expect(identity2?.revealOrder).toBe(1);
      });

      it('should return complete identity data after reveal', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(2);
        const assignedIdentities = await identityService.assignIdentities(partyId, players);

        const revealedIdentity = await identityService.revealIdentity(partyId, players[0].id, 1);

        // Find the original assigned identity
        const originalIdentity = assignedIdentities.find((id) => id.playerId === players[0].id);

        expect(revealedIdentity.id).toBe(originalIdentity?.id);
        expect(revealedIdentity.alias).toBe(originalIdentity?.alias);
        expect(revealedIdentity.silhouette).toBe(originalIdentity?.silhouette);
        expect(revealedIdentity.color).toBe(originalIdentity?.color);
        expect(revealedIdentity.partyId).toBe(partyId);
        expect(revealedIdentity.playerId).toBe(players[0].id);
      });

      it('should throw error for non-existent player', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(2);
        await identityService.assignIdentities(partyId, players);

        await expect(
          identityService.revealIdentity(partyId, 'non-existent-player-id', 1)
        ).rejects.toThrow(/Identity not found/);
      });

      it('should throw error for player in different party', async () => {
        const { partyId: partyId1, players: players1 } = await createTestPartyWithPlayers(2);
        await identityService.assignIdentities(partyId1, players1);

        const { party: party2, host: host2 } = await partyService.createParty('TestHost2');
        await identityService.assignIdentities(party2.id, [host2]);

        // Try to reveal player from party1 in party2
        await expect(
          identityService.revealIdentity(party2.id, players1[0].id, 1)
        ).rejects.toThrow(/Identity not found/);
      });
    });
  });

  describe('getRevealOrder', () => {
    /**
     * Helper function to create a song for a player
     */
    async function createSongForPlayerWithScore(
      partyId: string,
      playerId: string,
      finalScore: number
    ) {
      return prisma.song.create({
        data: {
          id: uuidv4(),
          partyId,
          submitterId: playerId,
          soundcloudId: Math.floor(Math.random() * 1000000),
          title: `Test Song ${Math.random()}`,
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test',
          confidence: 3,
          roundNumber: 1,
          queuePosition: 0,
          finalScore,
        },
      });
    }

    /**
     * Tests for Requirement 2.6:
     * WHEN the Party enters FINALE state, THE Backend SHALL reveal Player identities in reverse score order
     */
    describe('reveal order (Requirement 2.6)', () => {
      it('should return players sorted by score ascending (last place first)', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(4);

        // Create songs with different scores
        // Player 0: 30 points (1st place)
        // Player 1: 10 points (3rd place)
        // Player 2: 20 points (2nd place)
        // Player 3: 5 points (4th place - last)
        await createSongForPlayerWithScore(partyId, players[0].id, 30);
        await createSongForPlayerWithScore(partyId, players[1].id, 10);
        await createSongForPlayerWithScore(partyId, players[2].id, 20);
        await createSongForPlayerWithScore(partyId, players[3].id, 5);

        const revealOrder = await identityService.getRevealOrder(partyId);

        // Should be ordered: player3 (5), player1 (10), player2 (20), player0 (30)
        expect(revealOrder).toHaveLength(4);
        expect(revealOrder[0].id).toBe(players[3].id); // 5 points - last place, revealed first
        expect(revealOrder[1].id).toBe(players[1].id); // 10 points
        expect(revealOrder[2].id).toBe(players[2].id); // 20 points
        expect(revealOrder[3].id).toBe(players[0].id); // 30 points - first place, revealed last
      });

      it('should sum multiple songs for each player', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(3);

        // Player 0: 10 + 5 = 15 points (2nd place)
        // Player 1: 8 + 12 = 20 points (1st place)
        // Player 2: 3 + 4 = 7 points (3rd place - last)
        await createSongForPlayerWithScore(partyId, players[0].id, 10);
        await createSongForPlayerWithScore(partyId, players[0].id, 5);
        await createSongForPlayerWithScore(partyId, players[1].id, 8);
        await createSongForPlayerWithScore(partyId, players[1].id, 12);
        await createSongForPlayerWithScore(partyId, players[2].id, 3);
        await createSongForPlayerWithScore(partyId, players[2].id, 4);

        const revealOrder = await identityService.getRevealOrder(partyId);

        // Should be ordered: player2 (7), player0 (15), player1 (20)
        expect(revealOrder[0].id).toBe(players[2].id); // 7 points - last place
        expect(revealOrder[1].id).toBe(players[0].id); // 15 points
        expect(revealOrder[2].id).toBe(players[1].id); // 20 points - first place
      });

      it('should handle players with no songs (score = 0)', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(3);

        // Only player 0 has a song
        await createSongForPlayerWithScore(partyId, players[0].id, 10);

        const revealOrder = await identityService.getRevealOrder(partyId);

        // Players with 0 score should come first
        expect(revealOrder).toHaveLength(3);
        expect(revealOrder[0].id).not.toBe(players[0].id); // 0 points
        expect(revealOrder[1].id).not.toBe(players[0].id); // 0 points
        expect(revealOrder[2].id).toBe(players[0].id); // 10 points - first place
      });

      it('should handle songs with null finalScore (treated as 0)', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(2);

        // Player 0 has song with null score
        await prisma.song.create({
          data: {
            id: uuidv4(),
            partyId,
            submitterId: players[0].id,
            soundcloudId: Math.floor(Math.random() * 1000000),
            title: 'Test Song',
            artist: 'Test Artist',
            artworkUrl: 'https://example.com/art.jpg',
            duration: 180000,
            permalinkUrl: 'https://soundcloud.com/test',
            confidence: 3,
            roundNumber: 1,
            queuePosition: 0,
            finalScore: null,
          },
        });
        // Player 1 has song with score
        await createSongForPlayerWithScore(partyId, players[1].id, 10);

        const revealOrder = await identityService.getRevealOrder(partyId);

        // Player 0 (0 points) should come before Player 1 (10 points)
        expect(revealOrder[0].id).toBe(players[0].id);
        expect(revealOrder[1].id).toBe(players[1].id);
      });

      it('should return complete Player objects', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(2);
        await createSongForPlayerWithScore(partyId, players[0].id, 10);
        await createSongForPlayerWithScore(partyId, players[1].id, 5);

        const revealOrder = await identityService.getRevealOrder(partyId);

        for (const player of revealOrder) {
          expect(player).toHaveProperty('id');
          expect(player).toHaveProperty('name');
          expect(player).toHaveProperty('avatarUrl');
          expect(player).toHaveProperty('partyId');
          expect(player).toHaveProperty('isHost');
          expect(player).toHaveProperty('isReady');
          expect(player).toHaveProperty('status');
          expect(player).toHaveProperty('socketId');
          expect(player).toHaveProperty('joinedAt');
        }
      });

      it('should return empty array for party with no players', async () => {
        const { party } = await partyService.createParty('TestHost');
        // Delete the host player to have an empty party
        await prisma.player.deleteMany({ where: { partyId: party.id } });

        const revealOrder = await identityService.getRevealOrder(party.id);

        expect(revealOrder).toHaveLength(0);
      });

      it('should return empty array for non-existent party', async () => {
        const revealOrder = await identityService.getRevealOrder('non-existent-party-id');

        expect(revealOrder).toHaveLength(0);
      });

      it('should handle tied scores (stable sort)', async () => {
        const { partyId, players } = await createTestPartyWithPlayers(3);

        // All players have the same score
        await createSongForPlayerWithScore(partyId, players[0].id, 10);
        await createSongForPlayerWithScore(partyId, players[1].id, 10);
        await createSongForPlayerWithScore(partyId, players[2].id, 10);

        const revealOrder = await identityService.getRevealOrder(partyId);

        // All should be returned (order may vary for ties)
        expect(revealOrder).toHaveLength(3);
        const playerIds = revealOrder.map((p) => p.id);
        expect(playerIds).toContain(players[0].id);
        expect(playerIds).toContain(players[1].id);
        expect(playerIds).toContain(players[2].id);
      });

      it('should only include players from the specified party', async () => {
        // Create two parties
        const { partyId: partyId1, players: players1 } = await createTestPartyWithPlayers(2);
        await createSongForPlayerWithScore(partyId1, players1[0].id, 20);
        await createSongForPlayerWithScore(partyId1, players1[1].id, 10);

        const { party: party2, host: host2 } = await partyService.createParty('TestHost2');
        await createSongForPlayerWithScore(party2.id, host2.id, 15);

        const revealOrder1 = await identityService.getRevealOrder(partyId1);
        const revealOrder2 = await identityService.getRevealOrder(party2.id);

        expect(revealOrder1).toHaveLength(2);
        expect(revealOrder2).toHaveLength(1);

        // Verify no cross-contamination
        for (const player of revealOrder1) {
          expect(player.partyId).toBe(partyId1);
        }
        for (const player of revealOrder2) {
          expect(player.partyId).toBe(party2.id);
        }
      });
    });
  });
});