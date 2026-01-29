import { prisma } from '../../lib/prisma';
import { demoService, DemoService } from '../demo.service';
import { PartyStatus, PlayerStatus, DEMO_PERSONALITIES, DEMO_TIMING_CONFIG } from '../../types';

// Clean up database before each test
beforeEach(async () => {
  // Delete all records in reverse order of dependencies
  await prisma.vote.deleteMany();
  await prisma.bonusResult.deleteMany();
  await prisma.song.deleteMany();
  await prisma.partyIdentity.deleteMany();
  await prisma.player.deleteMany();
  await prisma.party.deleteMany();
});

// Clean up after all tests
afterAll(async () => {
  await prisma.vote.deleteMany();
  await prisma.bonusResult.deleteMany();
  await prisma.song.deleteMany();
  await prisma.partyIdentity.deleteMany();
  await prisma.player.deleteMany();
  await prisma.party.deleteMany();
  await prisma.$disconnect();
});

describe('DemoService', () => {
  describe('createDemoParty', () => {
    /**
     * **Validates: Requirements 9.1**
     * WHEN demo mode is enabled, THE System SHALL create a Party with 4 simulated Players
     */
    it('should create a party with exactly 4 simulated players', async () => {
      const { party, players } = await demoService.createDemoParty();

      // Verify party was created
      expect(party).toBeDefined();
      expect(party.id).toBeDefined();
      expect(party.code).toHaveLength(4);
      expect(party.status).toBe(PartyStatus.LOBBY);

      // Verify exactly 4 players were created
      expect(players).toHaveLength(4);

      // Verify all players belong to the party
      for (const player of players) {
        expect(player.partyId).toBe(party.id);
        expect(player.status).toBe(PlayerStatus.CONNECTED);
      }

      // Verify one player is the host
      const hosts = players.filter(p => p.isHost);
      expect(hosts).toHaveLength(1);
      expect(hosts[0].id).toBe(party.hostId);
    });

    it('should assign demo-specific names to players', async () => {
      const { players } = await demoService.createDemoParty();

      // Verify players have demo names
      const expectedNames = ['Demo Alex', 'Demo Blake', 'Demo Casey', 'Demo Drew'];
      const playerNames = players.map(p => p.name);

      for (const expectedName of expectedNames) {
        expect(playerNames).toContain(expectedName);
      }
    });

    it('should assign identities to all players', async () => {
      const { party, players } = await demoService.createDemoParty();

      // Verify identities were assigned
      const identities = await prisma.partyIdentity.findMany({
        where: { partyId: party.id },
      });

      expect(identities).toHaveLength(4);

      // Verify each player has an identity
      for (const player of players) {
        const identity = identities.find(i => i.playerId === player.id);
        expect(identity).toBeDefined();
        expect(identity?.alias).toBeDefined();
        expect(identity?.silhouette).toBeDefined();
        expect(identity?.color).toBeDefined();
      }
    });

    it('should mark the party as demo mode', async () => {
      const { party } = await demoService.createDemoParty();

      // Verify party is marked as demo mode in database
      const partyRecord = await prisma.party.findUnique({
        where: { id: party.id },
      });

      expect(partyRecord?.isDemoMode).toBe(true);
    });
  });

  describe('populateDemoSongs', () => {
    /**
     * **Validates: Requirements 9.2**
     * WHEN demo mode is enabled, THE System SHALL auto-submit songs from a curated demo playlist
     */
    it('should auto-submit songs from the demo playlist', async () => {
      const { party, players } = await demoService.createDemoParty();

      const songs = await demoService.populateDemoSongs(party.id);

      // With 4 players and 2 songs per player, we should have 8 songs
      expect(songs).toHaveLength(8);

      // Verify each song has required fields
      for (const song of songs) {
        expect(song.partyId).toBe(party.id);
        expect(song.soundcloudId).toBeDefined();
        expect(song.title).toBeDefined();
        expect(song.artist).toBeDefined();
        expect(song.confidence).toBeGreaterThanOrEqual(1);
        expect(song.confidence).toBeLessThanOrEqual(5);
      }
    });

    it('should assign varied confidence levels', async () => {
      const { party } = await demoService.createDemoParty();

      const songs = await demoService.populateDemoSongs(party.id);

      // Collect all confidence levels
      const confidenceLevels = songs.map(s => s.confidence);

      // Verify we have varied confidence levels (not all the same)
      const uniqueConfidences = new Set(confidenceLevels);
      expect(uniqueConfidences.size).toBeGreaterThan(1);
    });

    it('should transition party to SUBMITTING state', async () => {
      const { party } = await demoService.createDemoParty();

      await demoService.populateDemoSongs(party.id);

      // Verify party status changed
      const updatedParty = await prisma.party.findUnique({
        where: { id: party.id },
      });

      expect(updatedParty?.status).toBe(PartyStatus.SUBMITTING);
    });

    it('should throw error for non-existent party', async () => {
      await expect(demoService.populateDemoSongs('non-existent-id'))
        .rejects.toThrow('Party does not exist');
    });
  });

  describe('simulateVoting', () => {
    /**
     * **Validates: Requirements 9.3, 9.6**
     * - 9.3: Simulate voting with varied personality patterns
     * - 9.6: Generate realistic vote distributions
     */
    it('should generate votes based on personality patterns', async () => {
      const { party, players } = await demoService.createDemoParty();
      const songs = await demoService.populateDemoSongs(party.id);

      // Get voters (all players except the song submitter)
      const song = songs[0];
      const voters = players.filter(p => p.id !== song.submitterId);

      const votes = await demoService.simulateVoting(song.id, voters);

      // Should have votes from all eligible voters
      expect(votes.length).toBe(voters.length);

      // Verify each vote is valid
      for (const vote of votes) {
        expect(vote.songId).toBe(song.id);
        expect(vote.rating).toBeGreaterThanOrEqual(1);
        expect(vote.rating).toBeLessThanOrEqual(10);
        expect(vote.isLocked).toBe(true);
      }
    });

    it('should not allow voting on own song', async () => {
      const { party, players } = await demoService.createDemoParty();
      const songs = await demoService.populateDemoSongs(party.id);

      const song = songs[0];
      // Include the submitter in voters list
      const votes = await demoService.simulateVoting(song.id, players);

      // Should have votes from all players except the submitter
      expect(votes.length).toBe(players.length - 1);

      // Verify submitter did not vote
      const submitterVote = votes.find(v => v.voterId === song.submitterId);
      expect(submitterVote).toBeUndefined();
    });

    it('should generate varied ratings based on personalities', async () => {
      const { party, players } = await demoService.createDemoParty();
      const songs = await demoService.populateDemoSongs(party.id);

      // Simulate voting on multiple songs to get a distribution
      const allRatings: number[] = [];

      for (const song of songs.slice(0, 4)) {
        const voters = players.filter(p => p.id !== song.submitterId);
        const votes = await demoService.simulateVoting(song.id, voters);
        allRatings.push(...votes.map(v => v.rating));
      }

      // Verify we have varied ratings (not all the same)
      const uniqueRatings = new Set(allRatings);
      expect(uniqueRatings.size).toBeGreaterThan(1);

      // Verify ratings are within valid range
      for (const rating of allRatings) {
        expect(rating).toBeGreaterThanOrEqual(1);
        expect(rating).toBeLessThanOrEqual(10);
      }
    });

    it('should throw error for non-existent song', async () => {
      const { players } = await demoService.createDemoParty();

      await expect(demoService.simulateVoting('non-existent-id', players))
        .rejects.toThrow('Song does not exist');
    });
  });

  describe('getDemoPlaylist', () => {
    it('should return the curated demo playlist', () => {
      const playlist = demoService.getDemoPlaylist();

      expect(playlist).toBeDefined();
      expect(playlist.length).toBeGreaterThan(0);

      // Verify each track has required fields
      for (const track of playlist) {
        expect(track.soundcloudId).toBeDefined();
        expect(track.title).toBeDefined();
        expect(track.artist).toBeDefined();
        expect(track.expectedScore).toBeDefined();
      }
    });
  });

  describe('getVoterPersonalities', () => {
    it('should return the voter personalities', () => {
      const personalities = demoService.getVoterPersonalities();

      expect(personalities).toBeDefined();
      expect(personalities).toHaveLength(4);

      // Verify we have the expected personalities
      const names = personalities.map(p => p.name);
      expect(names).toContain('Harsh Critic');
      expect(names).toContain('Generous Fan');
      expect(names).toContain('Balanced Voter');
      expect(names).toContain('Wildcard');
    });

    it('should have valid personality configurations', () => {
      const personalities = demoService.getVoterPersonalities();

      for (const personality of personalities) {
        expect(personality.meanRating).toBeGreaterThanOrEqual(1);
        expect(personality.meanRating).toBeLessThanOrEqual(10);
        expect(personality.variance).toBeGreaterThan(0);
        expect(['generous', 'harsh', 'balanced']).toContain(personality.bias);
      }
    });
  });

  describe('getDemoTimingConfig', () => {
    /**
     * **Validates: Requirements 9.4, 9.5**
     * - 9.4: Override play_duration to 15 seconds in demo mode
     * - 9.5: Accelerate finale animations to 2x speed
     */
    it('should return demo timing configuration', () => {
      const config = demoService.getDemoTimingConfig();

      expect(config).toBeDefined();
      expect(config.playDuration).toBe(15);
      expect(config.finaleAnimationSpeed).toBe(2.0);
    });
  });

  describe('getEffectivePlayDuration', () => {
    /**
     * **Validates: Requirements 9.4**
     * WHEN demo mode is enabled, THE System SHALL override play_duration to 15 seconds
     */
    it('should return 15 seconds for demo mode parties', async () => {
      const { party } = await demoService.createDemoParty();

      const duration = await demoService.getEffectivePlayDuration(party.id);

      expect(duration).toBe(15);
    });

    it('should return configured duration for non-demo parties', async () => {
      // Create a regular party (not demo)
      const partyId = 'test-party-id';
      await prisma.party.create({
        data: {
          id: partyId,
          code: 'TEST',
          status: PartyStatus.LOBBY,
          hostId: 'test-host',
          isDemoMode: false,
          settings: JSON.stringify({
            songsPerPlayer: 2,
            playDuration: 45,
            submissionTimerMinutes: null,
            enableConfidenceBetting: true,
            enableProgressiveWeighting: true,
            bonusCategoryCount: 2,
          }),
        },
      });

      const duration = await demoService.getEffectivePlayDuration(partyId);

      expect(duration).toBe(45);
    });

    it('should throw error for non-existent party', async () => {
      await expect(demoService.getEffectivePlayDuration('non-existent-id'))
        .rejects.toThrow('Party does not exist');
    });
  });

  describe('getEffectiveFinaleAnimationSpeed', () => {
    /**
     * **Validates: Requirements 9.5**
     * WHEN demo mode is enabled, THE System SHALL accelerate finale animations to 2x speed
     */
    it('should return 2x speed for demo mode parties', async () => {
      const { party } = await demoService.createDemoParty();

      const speed = await demoService.getEffectiveFinaleAnimationSpeed(party.id);

      expect(speed).toBe(2.0);
    });

    it('should return 1x speed for non-demo parties', async () => {
      // Create a regular party (not demo)
      const partyId = 'test-party-id-2';
      await prisma.party.create({
        data: {
          id: partyId,
          code: 'TST2',
          status: PartyStatus.LOBBY,
          hostId: 'test-host-2',
          isDemoMode: false,
          settings: JSON.stringify({
            songsPerPlayer: 2,
            playDuration: 45,
            submissionTimerMinutes: null,
            enableConfidenceBetting: true,
            enableProgressiveWeighting: true,
            bonusCategoryCount: 2,
          }),
        },
      });

      const speed = await demoService.getEffectiveFinaleAnimationSpeed(partyId);

      expect(speed).toBe(1.0);
    });

    it('should throw error for non-existent party', async () => {
      await expect(demoService.getEffectiveFinaleAnimationSpeed('non-existent-id'))
        .rejects.toThrow('Party does not exist');
    });
  });

  describe('isDemoMode', () => {
    it('should return true for demo parties', async () => {
      const { party } = await demoService.createDemoParty();

      const isDemo = await demoService.isDemoMode(party.id);

      expect(isDemo).toBe(true);
    });

    it('should return false for non-demo parties', async () => {
      // Create a regular party
      const partyId = 'test-party-id-3';
      await prisma.party.create({
        data: {
          id: partyId,
          code: 'TST3',
          status: PartyStatus.LOBBY,
          hostId: 'test-host-3',
          isDemoMode: false,
          settings: JSON.stringify({
            songsPerPlayer: 2,
            playDuration: 45,
            submissionTimerMinutes: null,
            enableConfidenceBetting: true,
            enableProgressiveWeighting: true,
            bonusCategoryCount: 2,
          }),
        },
      });

      const isDemo = await demoService.isDemoMode(partyId);

      expect(isDemo).toBe(false);
    });

    it('should throw error for non-existent party', async () => {
      await expect(demoService.isDemoMode('non-existent-id'))
        .rejects.toThrow('Party does not exist');
    });
  });

  describe('advanceDemo', () => {
    it('should transition from LOBBY to SUBMITTING', async () => {
      const { party } = await demoService.createDemoParty();

      await demoService.advanceDemo(party.id);

      const updatedParty = await prisma.party.findUnique({
        where: { id: party.id },
      });

      expect(updatedParty?.status).toBe(PartyStatus.SUBMITTING);
    });

    it('should transition from SUBMITTING to PLAYING', async () => {
      const { party } = await demoService.createDemoParty();

      // First advance to SUBMITTING
      await demoService.advanceDemo(party.id);

      // Then advance to PLAYING
      await demoService.advanceDemo(party.id);

      const updatedParty = await prisma.party.findUnique({
        where: { id: party.id },
      });

      expect(updatedParty?.status).toBe(PartyStatus.PLAYING);
    });

    it('should transition from PLAYING to FINALE', async () => {
      const { party } = await demoService.createDemoParty();

      // Advance through states
      await demoService.advanceDemo(party.id); // LOBBY -> SUBMITTING
      await demoService.advanceDemo(party.id); // SUBMITTING -> PLAYING
      await demoService.advanceDemo(party.id); // PLAYING -> FINALE

      const updatedParty = await prisma.party.findUnique({
        where: { id: party.id },
      });

      expect(updatedParty?.status).toBe(PartyStatus.FINALE);
    });

    it('should transition from FINALE to COMPLETE', async () => {
      const { party } = await demoService.createDemoParty();

      // Advance through all states
      await demoService.advanceDemo(party.id); // LOBBY -> SUBMITTING
      await demoService.advanceDemo(party.id); // SUBMITTING -> PLAYING
      await demoService.advanceDemo(party.id); // PLAYING -> FINALE
      await demoService.advanceDemo(party.id); // FINALE -> COMPLETE

      const updatedParty = await prisma.party.findUnique({
        where: { id: party.id },
      });

      expect(updatedParty?.status).toBe(PartyStatus.COMPLETE);
      expect(updatedParty?.completedAt).toBeDefined();
    });

    it('should throw error for non-existent party', async () => {
      await expect(demoService.advanceDemo('non-existent-id'))
        .rejects.toThrow('Party does not exist');
    });
  });
});
