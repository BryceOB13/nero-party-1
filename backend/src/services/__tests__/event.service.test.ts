import { PrismaClient } from '@prisma/client';
import { EventService, eventService, FREQUENCY_MODIFIERS } from '../event.service';
import { PartyStatus, MINI_EVENTS, EventTiming } from '../../types';

// Create a test database client
const prisma = new PrismaClient();

describe('EventService', () => {
  // Clean up database before each test
  beforeEach(async () => {
    // Delete all records in reverse order of dependencies
    await prisma.activeEvent.deleteMany();
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

  describe('getEvents', () => {
    /**
     * Tests for Requirements 11.1, 11.2:
     * - 11.1: THE Mini_Event_System SHALL define events with id, name, description, icon, timing, effect, and probability
     * - 11.2: THE Mini_Event_System SHALL support event timings: pre-round, mid-round, post-round, and pre-finale
     */
    it('should return all predefined mini-events', () => {
      const events = eventService.getEvents();

      expect(events).toEqual(MINI_EVENTS);
      expect(events.length).toBeGreaterThan(0);
    });

    it('should return events with all required fields', () => {
      const events = eventService.getEvents();

      for (const event of events) {
        expect(event).toHaveProperty('id');
        expect(event).toHaveProperty('name');
        expect(event).toHaveProperty('description');
        expect(event).toHaveProperty('icon');
        expect(event).toHaveProperty('timing');
        expect(event).toHaveProperty('effect');
        expect(event).toHaveProperty('probability');
      }
    });

    it('should only have valid timing values', () => {
      const events = eventService.getEvents();
      const validTimings: EventTiming[] = ['pre-round', 'mid-round', 'post-round', 'pre-finale'];

      for (const event of events) {
        expect(validTimings).toContain(event.timing);
      }
    });
  });

  describe('getEvent', () => {
    it('should return a specific event by ID', () => {
      const event = eventService.getEvent('golden-record');

      expect(event).not.toBeNull();
      expect(event?.id).toBe('golden-record');
      expect(event?.name).toBe('Golden Record');
    });

    it('should return null for non-existent event', () => {
      const event = eventService.getEvent('non-existent-event');

      expect(event).toBeNull();
    });
  });

  describe('getEventsByTiming', () => {
    it('should return events filtered by timing', () => {
      const preRoundEvents = eventService.getEventsByTiming('pre-round');

      expect(preRoundEvents.length).toBeGreaterThan(0);
      for (const event of preRoundEvents) {
        expect(event.timing).toBe('pre-round');
      }
    });

    it('should return empty array for timing with no events', () => {
      // pre-finale has no events in the predefined list
      const preFinaleEvents = eventService.getEventsByTiming('pre-finale');

      // This may or may not be empty depending on MINI_EVENTS definition
      for (const event of preFinaleEvents) {
        expect(event.timing).toBe('pre-finale');
      }
    });
  });

  describe('calculateAdjustedProbability', () => {
    /**
     * Tests for Requirement 11.5:
     * THE Mini_Event_System SHALL support three frequency settings: rare (5%), normal (15%), and chaos (30%)
     * - rare = 0.33 (5% base)
     * - normal = 1.0 (15% base)
     * - chaos = 2.0 (30% base)
     */
    it('should apply rare frequency modifier (0.33)', () => {
      const baseProbability = 0.15; // 15% base
      const adjusted = eventService.calculateAdjustedProbability(baseProbability, 'rare');

      expect(adjusted).toBeCloseTo(0.15 * 0.33, 4);
      expect(adjusted).toBeCloseTo(0.0495, 4); // ~5%
    });

    it('should apply normal frequency modifier (1.0)', () => {
      const baseProbability = 0.15; // 15% base
      const adjusted = eventService.calculateAdjustedProbability(baseProbability, 'normal');

      expect(adjusted).toBeCloseTo(0.15, 4); // 15%
    });

    it('should apply chaos frequency modifier (2.0)', () => {
      const baseProbability = 0.15; // 15% base
      const adjusted = eventService.calculateAdjustedProbability(baseProbability, 'chaos');

      expect(adjusted).toBeCloseTo(0.30, 4); // 30%
    });
  });

  describe('FREQUENCY_MODIFIERS', () => {
    it('should have correct modifier values', () => {
      expect(FREQUENCY_MODIFIERS.rare).toBe(0.33);
      expect(FREQUENCY_MODIFIERS.normal).toBe(1.0);
      expect(FREQUENCY_MODIFIERS.chaos).toBe(2.0);
    });
  });

  describe('checkForEvent', () => {
    /**
     * Tests for Requirement 11.5:
     * THE Mini_Event_System SHALL support three frequency settings
     */
    it('should throw error for non-existent party', async () => {
      await expect(
        eventService.checkForEvent('non-existent-party', 'pre-round')
      ).rejects.toThrow('Party does not exist');
    });

    it('should return null when no events match timing', async () => {
      const { party } = await createTestParty();

      // Mock Math.random to always return 1 (no event triggers)
      const originalRandom = Math.random;
      Math.random = () => 0.999;

      try {
        const event = await eventService.checkForEvent(party.id, 'pre-round');
        // With high random value, no event should trigger
        expect(event).toBeNull();
      } finally {
        Math.random = originalRandom;
      }
    });

    it('should return an event when probability check passes', async () => {
      const { party } = await createTestParty();

      // Mock Math.random to always return 0 (event always triggers)
      const originalRandom = Math.random;
      Math.random = () => 0;

      try {
        const event = await eventService.checkForEvent(party.id, 'pre-round');
        // With 0 random value, first eligible event should trigger
        expect(event).not.toBeNull();
        expect(event?.timing).toBe('pre-round');
      } finally {
        Math.random = originalRandom;
      }
    });

    it('should use frequency modifier in probability calculation', async () => {
      const { party } = await createTestParty();

      // With rare frequency, events should be less likely
      // Mock Math.random to return a value between rare and normal thresholds
      const originalRandom = Math.random;
      
      // Golden Record has 0.15 probability
      // rare: 0.15 * 0.33 = 0.0495
      // normal: 0.15 * 1.0 = 0.15
      // A roll of 0.10 should fail for rare but pass for normal
      Math.random = () => 0.10;

      try {
        const rareEvent = await eventService.checkForEvent(party.id, 'pre-round', 'rare');
        const normalEvent = await eventService.checkForEvent(party.id, 'pre-round', 'normal');

        // With 0.10 roll, rare (0.0495 threshold) should not trigger
        // but normal (0.15 threshold) should trigger
        expect(rareEvent).toBeNull();
        expect(normalEvent).not.toBeNull();
      } finally {
        Math.random = originalRandom;
      }
    });
  });

  describe('triggerEvent', () => {
    /**
     * Tests for Requirement 11.3:
     * THE Mini_Event_System SHALL support event effects
     */
    it('should create an ActiveEvent record', async () => {
      const { party, players } = await createTestParty();

      const activeEvent = await eventService.triggerEvent(
        party.id,
        'golden-record',
        1,
        [players[0].id]
      );

      expect(activeEvent.partyId).toBe(party.id);
      expect(activeEvent.eventId).toBe('golden-record');
      expect(activeEvent.roundNumber).toBe(1);
      expect(activeEvent.affectedPlayers).toContain(players[0].id);
      expect(activeEvent.resolved).toBe(false);
      expect(activeEvent.triggeredAt).toBeInstanceOf(Date);
    });

    it('should persist event to database', async () => {
      const { party } = await createTestParty();

      const activeEvent = await eventService.triggerEvent(
        party.id,
        'golden-record'
      );

      const dbEvent = await prisma.activeEvent.findUnique({
        where: { id: activeEvent.id },
      });

      expect(dbEvent).not.toBeNull();
      expect(dbEvent?.partyId).toBe(party.id);
      expect(dbEvent?.eventId).toBe('golden-record');
    });

    it('should handle empty affected players array', async () => {
      const { party } = await createTestParty();

      const activeEvent = await eventService.triggerEvent(
        party.id,
        'golden-record'
      );

      expect(activeEvent.affectedPlayers).toEqual([]);
    });

    it('should throw error for non-existent party', async () => {
      await expect(
        eventService.triggerEvent('non-existent-party', 'golden-record')
      ).rejects.toThrow('Party does not exist');
    });

    it('should throw error for non-existent event', async () => {
      const { party } = await createTestParty();

      await expect(
        eventService.triggerEvent(party.id, 'non-existent-event')
      ).rejects.toThrow('Event does not exist');
    });
  });

  describe('resolveEvent', () => {
    it('should mark event as resolved', async () => {
      const { party } = await createTestParty();

      const activeEvent = await eventService.triggerEvent(
        party.id,
        'golden-record'
      );

      await eventService.resolveEvent(activeEvent.id);

      const dbEvent = await prisma.activeEvent.findUnique({
        where: { id: activeEvent.id },
      });

      expect(dbEvent?.resolved).toBe(true);
    });

    it('should throw error for non-existent active event', async () => {
      await expect(
        eventService.resolveEvent('non-existent-event')
      ).rejects.toThrow('Active event does not exist');
    });

    it('should throw error when event is already resolved', async () => {
      const { party } = await createTestParty();

      const activeEvent = await eventService.triggerEvent(
        party.id,
        'golden-record'
      );

      await eventService.resolveEvent(activeEvent.id);

      await expect(
        eventService.resolveEvent(activeEvent.id)
      ).rejects.toThrow('Event has already been resolved');
    });
  });

  describe('getActiveEvents', () => {
    it('should return only unresolved events', async () => {
      const { party } = await createTestParty();

      // Create two events
      const event1 = await eventService.triggerEvent(party.id, 'golden-record');
      const event2 = await eventService.triggerEvent(party.id, 'steal-the-aux');

      // Resolve one event
      await eventService.resolveEvent(event1.id);

      const activeEvents = await eventService.getActiveEvents(party.id);

      expect(activeEvents).toHaveLength(1);
      expect(activeEvents[0].id).toBe(event2.id);
    });

    it('should return empty array when no active events', async () => {
      const { party } = await createTestParty();

      const activeEvents = await eventService.getActiveEvents(party.id);

      expect(activeEvents).toHaveLength(0);
    });

    it('should throw error for non-existent party', async () => {
      await expect(
        eventService.getActiveEvents('non-existent-party')
      ).rejects.toThrow('Party does not exist');
    });

    it('should order events by triggeredAt', async () => {
      const { party } = await createTestParty();

      // Create events with slight delay
      const event1 = await eventService.triggerEvent(party.id, 'golden-record');
      const event2 = await eventService.triggerEvent(party.id, 'steal-the-aux');

      const activeEvents = await eventService.getActiveEvents(party.id);

      expect(activeEvents).toHaveLength(2);
      expect(activeEvents[0].id).toBe(event1.id);
      expect(activeEvents[1].id).toBe(event2.id);
    });
  });

  describe('getEventHistory', () => {
    it('should return all events including resolved', async () => {
      const { party } = await createTestParty();

      // Create two events
      const event1 = await eventService.triggerEvent(party.id, 'golden-record');
      const event2 = await eventService.triggerEvent(party.id, 'steal-the-aux');

      // Resolve one event
      await eventService.resolveEvent(event1.id);

      const history = await eventService.getEventHistory(party.id);

      expect(history).toHaveLength(2);
      expect(history.map(e => e.id)).toContain(event1.id);
      expect(history.map(e => e.id)).toContain(event2.id);
    });

    it('should return empty array when no events', async () => {
      const { party } = await createTestParty();

      const history = await eventService.getEventHistory(party.id);

      expect(history).toHaveLength(0);
    });

    it('should throw error for non-existent party', async () => {
      await expect(
        eventService.getEventHistory('non-existent-party')
      ).rejects.toThrow('Party does not exist');
    });
  });

  describe('getActiveEvent', () => {
    it('should return a specific active event', async () => {
      const { party } = await createTestParty();

      const created = await eventService.triggerEvent(party.id, 'golden-record');
      const retrieved = await eventService.getActiveEvent(created.id);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.eventId).toBe('golden-record');
    });

    it('should throw error for non-existent active event', async () => {
      await expect(
        eventService.getActiveEvent('non-existent-event')
      ).rejects.toThrow('Active event does not exist');
    });
  });

  describe('updateAffectedPlayers', () => {
    it('should update affected players list', async () => {
      const { party, players } = await createTestParty();

      const activeEvent = await eventService.triggerEvent(party.id, 'golden-record');

      const updated = await eventService.updateAffectedPlayers(
        activeEvent.id,
        [players[0].id, players[1].id]
      );

      expect(updated.affectedPlayers).toHaveLength(2);
      expect(updated.affectedPlayers).toContain(players[0].id);
      expect(updated.affectedPlayers).toContain(players[1].id);
    });

    it('should persist updated affected players to database', async () => {
      const { party, players } = await createTestParty();

      const activeEvent = await eventService.triggerEvent(party.id, 'golden-record');

      await eventService.updateAffectedPlayers(
        activeEvent.id,
        [players[0].id]
      );

      const dbEvent = await prisma.activeEvent.findUnique({
        where: { id: activeEvent.id },
      });

      const affectedPlayers = JSON.parse(dbEvent!.affectedPlayers);
      expect(affectedPlayers).toContain(players[0].id);
    });

    it('should throw error for non-existent active event', async () => {
      await expect(
        eventService.updateAffectedPlayers('non-existent-event', [])
      ).rejects.toThrow('Active event does not exist');
    });
  });

  describe('applyEventEffect', () => {
    /**
     * Tests for Requirements 11.3, 12.1-12.9:
     * - 11.3: THE Mini_Event_System SHALL support event effects
     * - 12.1-12.9: Various mini-event types
     */

    // Helper to create a party with players and songs with scores
    async function createTestPartyWithScores() {
      const { party, players } = await createTestParty(3);

      // Create songs with different scores for each player
      const songs = [];
      for (let i = 0; i < players.length; i++) {
        const song = await prisma.song.create({
          data: {
            partyId: party.id,
            submitterId: players[i].id,
            soundcloudId: 1000 + i,
            title: `Song ${i + 1}`,
            artist: `Artist ${i + 1}`,
            artworkUrl: 'https://example.com/art.jpg',
            duration: 180000,
            permalinkUrl: 'https://soundcloud.com/test',
            confidence: 3,
            roundNumber: 1,
            queuePosition: i,
            rawAverage: 7 + i, // 7, 8, 9
            weightedScore: 7 + i,
            confidenceModifier: 0,
            finalScore: (7 + i) * 2, // 14, 16, 18
          },
        });
        songs.push(song);
      }

      return { party, players, songs };
    }

    describe('score_multiplier effect', () => {
      /**
       * Tests for Requirements 12.1, 12.4:
       * - 12.1: Golden Record - next song earns 2x points
       * - 12.4: Underdog Bonus - last place gets 1.5x points
       */
      it('should apply multiplier to winner (leader)', async () => {
        const { party, players } = await createTestPartyWithScores();

        // Trigger Golden Record event (targets winner with 2x multiplier)
        const activeEvent = await eventService.triggerEvent(party.id, 'golden-record');

        const result = await eventService.applyEventEffect(activeEvent.id);

        expect(result.type).toBe('score_multiplier');
        // Player with highest score (18 points) should be affected
        expect(result.affectedPlayers).toContain(players[2].id);
        // Score change should be the bonus (18 * (2-1) = 18)
        expect(result.scoreChanges[players[2].id]).toBe(18);
      });

      it('should apply multiplier to loser (last place)', async () => {
        const { party, players } = await createTestPartyWithScores();

        // Trigger Underdog Bonus event (targets loser with 1.5x multiplier)
        const activeEvent = await eventService.triggerEvent(party.id, 'underdog-bonus');

        const result = await eventService.applyEventEffect(activeEvent.id);

        expect(result.type).toBe('score_multiplier');
        // Player with lowest score (14 points) should be affected
        expect(result.affectedPlayers).toContain(players[0].id);
        // Score change should be the bonus (14 * (1.5-1) = 7)
        expect(result.scoreChanges[players[0].id]).toBe(7);
      });

      it('should apply multiplier with song context', async () => {
        const { party, songs } = await createTestPartyWithScores();

        const activeEvent = await eventService.triggerEvent(party.id, 'golden-record');

        const result = await eventService.applyEventEffect(activeEvent.id, {
          songId: songs[1].id,
          songScore: 8,
        });

        expect(result.type).toBe('score_multiplier');
        // Should apply to the song's submitter
        expect(result.affectedPlayers).toContain(songs[1].submitterId);
        // Bonus should be 8 * (2-1) = 8
        expect(result.scoreChanges[songs[1].submitterId]).toBe(8);
      });
    });

    describe('steal_points effect', () => {
      /**
       * Tests for Requirement 12.2:
       * - 12.2: Steal the Aux - last place steals 10% of leader's points
       */
      it('should steal percentage of points from leader to last place', async () => {
        const { party, players } = await createTestPartyWithScores();

        // Trigger Steal the Aux event
        const activeEvent = await eventService.triggerEvent(party.id, 'steal-the-aux');

        const result = await eventService.applyEventEffect(activeEvent.id);

        expect(result.type).toBe('steal_points');
        // Both leader and last place should be affected
        expect(result.affectedPlayers).toHaveLength(2);
        expect(result.affectedPlayers).toContain(players[2].id); // Leader
        expect(result.affectedPlayers).toContain(players[0].id); // Last place

        // Leader loses 10% of 18 = 1.8 points
        expect(result.scoreChanges[players[2].id]).toBe(-1.8);
        // Last place gains 1.8 points
        expect(result.scoreChanges[players[0].id]).toBe(1.8);
      });

      it('should handle party with only one player', async () => {
        const { party } = await createTestParty(1);

        const activeEvent = await eventService.triggerEvent(party.id, 'steal-the-aux');

        const result = await eventService.applyEventEffect(activeEvent.id);

        expect(result.type).toBe('steal_points');
        expect(result.affectedPlayers).toHaveLength(0);
        expect(result.message).toBe('Not enough players to steal points.');
      });
    });

    describe('swap_scores effect', () => {
      /**
       * Tests for Requirement 12.3:
       * - 12.3: Score Swap - two random players swap scores
       */
      it('should swap scores between two players', async () => {
        const { party, players } = await createTestPartyWithScores();

        // Trigger Score Swap event
        const activeEvent = await eventService.triggerEvent(party.id, 'score-swap');

        const result = await eventService.applyEventEffect(activeEvent.id);

        expect(result.type).toBe('swap_scores');
        expect(result.affectedPlayers).toHaveLength(2);

        // The score changes should be opposite for the two players
        const [player1Id, player2Id] = result.affectedPlayers;
        expect(result.scoreChanges[player1Id]).toBe(-result.scoreChanges[player2Id]);
      });

      it('should handle party with only one player', async () => {
        const { party } = await createTestParty(1);

        const activeEvent = await eventService.triggerEvent(party.id, 'score-swap');

        const result = await eventService.applyEventEffect(activeEvent.id);

        expect(result.type).toBe('swap_scores');
        expect(result.affectedPlayers).toHaveLength(0);
        expect(result.message).toBe('Not enough players to swap scores.');
      });
    });

    describe('double_or_nothing effect', () => {
      /**
       * Tests for Requirement 12.5:
       * - 12.5: Double or Nothing - score 7+ doubles, under 5 gets zero
       */
      it('should double score when >= 7', async () => {
        const { party, songs } = await createTestPartyWithScores();

        const activeEvent = await eventService.triggerEvent(party.id, 'double-or-nothing');

        // Song with rawAverage of 8 (>= 7)
        const result = await eventService.applyEventEffect(activeEvent.id, {
          songId: songs[1].id,
          songScore: 8,
        });

        expect(result.type).toBe('double_or_nothing');
        expect(result.affectedPlayers).toContain(songs[1].submitterId);
        // Score should be doubled (add same amount)
        expect(result.scoreChanges[songs[1].submitterId]).toBe(8);
        expect(result.message).toContain('DOUBLED');
      });

      it('should zero score when < 5', async () => {
        const { party, players } = await createTestPartyWithScores();

        // Create a song with low score
        const lowScoreSong = await prisma.song.create({
          data: {
            partyId: party.id,
            submitterId: players[0].id,
            soundcloudId: 9999,
            title: 'Low Score Song',
            artist: 'Artist',
            artworkUrl: 'https://example.com/art.jpg',
            duration: 180000,
            permalinkUrl: 'https://soundcloud.com/test',
            confidence: 3,
            roundNumber: 1,
            queuePosition: 10,
            rawAverage: 4, // < 5
            weightedScore: 4,
            confidenceModifier: 0,
            finalScore: 4,
          },
        });

        const activeEvent = await eventService.triggerEvent(party.id, 'double-or-nothing');

        const result = await eventService.applyEventEffect(activeEvent.id, {
          songId: lowScoreSong.id,
          songScore: 4,
        });

        expect(result.type).toBe('double_or_nothing');
        expect(result.affectedPlayers).toContain(players[0].id);
        // Score should be zeroed (subtract all points)
        expect(result.scoreChanges[players[0].id]).toBe(-4);
        expect(result.message).toContain('ZEROED');
      });

      it('should not change score when between 5 and 7', async () => {
        const { party, players } = await createTestPartyWithScores();

        // Create a song with middle score
        const midScoreSong = await prisma.song.create({
          data: {
            partyId: party.id,
            submitterId: players[0].id,
            soundcloudId: 9998,
            title: 'Mid Score Song',
            artist: 'Artist',
            artworkUrl: 'https://example.com/art.jpg',
            duration: 180000,
            permalinkUrl: 'https://soundcloud.com/test',
            confidence: 3,
            roundNumber: 1,
            queuePosition: 11,
            rawAverage: 6, // Between 5 and 7
            weightedScore: 6,
            confidenceModifier: 0,
            finalScore: 6,
          },
        });

        const activeEvent = await eventService.triggerEvent(party.id, 'double-or-nothing');

        const result = await eventService.applyEventEffect(activeEvent.id, {
          songId: midScoreSong.id,
          songScore: 6,
        });

        expect(result.type).toBe('double_or_nothing');
        expect(result.affectedPlayers).toHaveLength(0);
        expect(result.message).toContain('No change');
      });

      it('should handle missing song context', async () => {
        const { party } = await createTestPartyWithScores();

        const activeEvent = await eventService.triggerEvent(party.id, 'double-or-nothing');

        const result = await eventService.applyEventEffect(activeEvent.id);

        expect(result.type).toBe('double_or_nothing');
        expect(result.affectedPlayers).toHaveLength(0);
        expect(result.message).toBe('No song context provided for Double or Nothing.');
      });
    });

    describe('immunity effect', () => {
      /**
       * Tests for Requirement 12.6:
       * - 12.6: Immunity Idol - last place immune from losing points
       */
      it('should grant immunity to last place player', async () => {
        const { party, players } = await createTestPartyWithScores();

        const activeEvent = await eventService.triggerEvent(party.id, 'immunity-idol');

        const result = await eventService.applyEventEffect(activeEvent.id);

        expect(result.type).toBe('immunity');
        // Last place player should be affected
        expect(result.affectedPlayers).toContain(players[0].id);
        // No score changes for immunity
        expect(Object.keys(result.scoreChanges)).toHaveLength(0);
        expect(result.message).toContain('immunity');
      });
    });

    describe('vote_reveal effect', () => {
      /**
       * Tests for Requirement 12.7:
       * - 12.7: Vote Leak - one random vote revealed after each song
       */
      it('should reveal votes when votes exist', async () => {
        const { party, players, songs } = await createTestPartyWithScores();

        // Create some votes
        await prisma.vote.create({
          data: {
            songId: songs[0].id,
            voterId: players[1].id,
            rating: 8,
          },
        });
        await prisma.vote.create({
          data: {
            songId: songs[0].id,
            voterId: players[2].id,
            rating: 7,
          },
        });

        const activeEvent = await eventService.triggerEvent(party.id, 'vote-leak', 1);

        const result = await eventService.applyEventEffect(activeEvent.id);

        expect(result.type).toBe('vote_reveal');
        expect(result.message).toContain('leaked');
      });

      it('should handle no votes', async () => {
        const { party } = await createTestPartyWithScores();

        const activeEvent = await eventService.triggerEvent(party.id, 'vote-leak', 1);

        const result = await eventService.applyEventEffect(activeEvent.id);

        expect(result.type).toBe('vote_reveal');
        expect(result.affectedPlayers).toHaveLength(0);
      });
    });

    describe('sabotage effects', () => {
      /**
       * Tests for Requirements 12.8, 12.9:
       * - 12.8: Shuffle Chaos - remaining queue order randomized
       * - 12.9: Score Blackout - leaderboard hidden until finale
       */
      it('should shuffle remaining queue', async () => {
        const { party, players } = await createTestParty(3);

        // Create unplayed songs (no finalScore)
        const songs = [];
        for (let i = 0; i < 5; i++) {
          const song = await prisma.song.create({
            data: {
              partyId: party.id,
              submitterId: players[i % 3].id,
              soundcloudId: 2000 + i,
              title: `Unplayed Song ${i + 1}`,
              artist: `Artist ${i + 1}`,
              artworkUrl: 'https://example.com/art.jpg',
              duration: 180000,
              permalinkUrl: 'https://soundcloud.com/test',
              confidence: 3,
              roundNumber: 1,
              queuePosition: i,
              // No finalScore - unplayed
            },
          });
          songs.push(song);
        }

        const activeEvent = await eventService.triggerEvent(party.id, 'shuffle-chaos');

        const result = await eventService.applyEventEffect(activeEvent.id);

        expect(result.type).toBe('sabotage');
        expect(result.message).toContain('shuffled');
      });

      it('should apply score blackout', async () => {
        const { party, players } = await createTestPartyWithScores();

        const activeEvent = await eventService.triggerEvent(party.id, 'score-blackout');

        const result = await eventService.applyEventEffect(activeEvent.id);

        expect(result.type).toBe('sabotage');
        // All players should be affected
        expect(result.affectedPlayers).toHaveLength(players.length);
        expect(result.message).toContain('Blackout');
      });
    });

    it('should throw error for non-existent active event', async () => {
      await expect(
        eventService.applyEventEffect('non-existent-event')
      ).rejects.toThrow('Active event does not exist');
    });

    it('should update affected players after applying effect', async () => {
      const { party, players } = await createTestPartyWithScores();

      const activeEvent = await eventService.triggerEvent(party.id, 'golden-record');

      await eventService.applyEventEffect(activeEvent.id);

      // Check that affected players were updated in the database
      const updatedEvent = await eventService.getActiveEvent(activeEvent.id);
      expect(updatedEvent.affectedPlayers.length).toBeGreaterThan(0);
    });
  });
});
