import { PrismaClient } from '@prisma/client';
import { ScoringService, scoringService, BONUS_CATEGORIES } from '../scoring.service';
import { partyService } from '../party.service';
import { songService } from '../song.service';
import { PartyStatus, SongSubmission } from '../../types';

// Create a test database client
const prisma = new PrismaClient();

describe('ScoringService', () => {
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

  // Helper function to create a test party with players and songs
  async function createTestPartyWithSongs() {
    // Create party
    const { party, host } = await partyService.createParty('TestHost');
    
    // Add players
    const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
    const { player: player3 } = await partyService.joinParty(party.code, 'Player3');
    
    // Transition to SUBMITTING state
    await prisma.party.update({
      where: { id: party.id },
      data: { status: PartyStatus.SUBMITTING },
    });

    // Create test song submission data
    const songData: SongSubmission = {
      soundcloudId: 123456,
      title: 'Test Song',
      artist: 'Test Artist',
      artworkUrl: 'https://example.com/art.jpg',
      duration: 180000,
      permalinkUrl: 'https://soundcloud.com/test/song',
      confidence: 3,
    };

    // Submit songs for each player
    const hostSong = await songService.submitSong(party.id, host.id, {
      ...songData,
      title: 'Host Song',
      soundcloudId: 111111,
    });
    
    const player2Song = await songService.submitSong(party.id, player2.id, {
      ...songData,
      title: 'Player2 Song',
      soundcloudId: 222222,
    });
    
    const player3Song = await songService.submitSong(party.id, player3.id, {
      ...songData,
      title: 'Player3 Song',
      soundcloudId: 333333,
    });

    return {
      party,
      host,
      player2,
      player3,
      hostSong,
      player2Song,
      player3Song,
    };
  }

  describe('castVote', () => {
    /**
     * Tests for Requirement 5.4:
     * WHEN a Player votes on a song, THE Backend SHALL validate the rating is between 1 and 10
     * 
     * **Property 22: Vote Range Validation**
     */
    describe('rating validation (Requirement 5.4, Property 22)', () => {
      it('should accept rating = 1', async () => {
        const { player2, hostSong } = await createTestPartyWithSongs();

        const vote = await scoringService.castVote(hostSong.id, player2.id, 1);

        expect(vote.rating).toBe(1);
      });

      it('should accept rating = 5', async () => {
        const { player2, hostSong } = await createTestPartyWithSongs();

        const vote = await scoringService.castVote(hostSong.id, player2.id, 5);

        expect(vote.rating).toBe(5);
      });

      it('should accept rating = 10', async () => {
        const { player2, hostSong } = await createTestPartyWithSongs();

        const vote = await scoringService.castVote(hostSong.id, player2.id, 10);

        expect(vote.rating).toBe(10);
      });

      it('should reject rating = 0', async () => {
        const { player2, hostSong } = await createTestPartyWithSongs();

        await expect(
          scoringService.castVote(hostSong.id, player2.id, 0)
        ).rejects.toThrow('Rating must be between 1 and 10');
      });

      it('should reject rating = 11', async () => {
        const { player2, hostSong } = await createTestPartyWithSongs();

        await expect(
          scoringService.castVote(hostSong.id, player2.id, 11)
        ).rejects.toThrow('Rating must be between 1 and 10');
      });

      it('should reject negative rating', async () => {
        const { player2, hostSong } = await createTestPartyWithSongs();

        await expect(
          scoringService.castVote(hostSong.id, player2.id, -1)
        ).rejects.toThrow('Rating must be between 1 and 10');
      });

      it('should reject non-integer rating', async () => {
        const { player2, hostSong } = await createTestPartyWithSongs();

        await expect(
          scoringService.castVote(hostSong.id, player2.id, 5.5)
        ).rejects.toThrow('Rating must be between 1 and 10');
      });

      it('should throw error with INVALID_VOTE_RATING code', async () => {
        const { player2, hostSong } = await createTestPartyWithSongs();

        try {
          await scoringService.castVote(hostSong.id, player2.id, 15);
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('INVALID_VOTE_RATING');
          expect(error.field).toBe('rating');
        }
      });
    });

    /**
     * Tests for Requirement 5.5:
     * WHEN a Player attempts to vote on their own song, THE Backend SHALL reject the vote
     * 
     * **Property 20: Self-Vote Prevention**
     */
    describe('self-vote prevention (Requirement 5.5, Property 20)', () => {
      it('should reject vote on own song', async () => {
        const { host, hostSong } = await createTestPartyWithSongs();

        await expect(
          scoringService.castVote(hostSong.id, host.id, 8)
        ).rejects.toThrow('Cannot vote on your own song');
      });

      it('should throw error with CANNOT_VOTE_OWN_SONG code', async () => {
        const { host, hostSong } = await createTestPartyWithSongs();

        try {
          await scoringService.castVote(hostSong.id, host.id, 8);
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('CANNOT_VOTE_OWN_SONG');
        }
      });

      it('should allow voting on other players songs', async () => {
        const { host, player2Song } = await createTestPartyWithSongs();

        const vote = await scoringService.castVote(player2Song.id, host.id, 7);

        expect(vote.songId).toBe(player2Song.id);
        expect(vote.voterId).toBe(host.id);
        expect(vote.rating).toBe(7);
      });
    });

    /**
     * Tests for Requirement 5.6:
     * WHEN a Player submits a vote, THE Backend SHALL lock the vote (votes are immutable once submitted)
     * 
     * **Property 21: Vote Immutability**
     */
    describe('vote immutability (Requirement 5.6, Property 21)', () => {
      it('should lock vote immediately on submission', async () => {
        const { player2, hostSong } = await createTestPartyWithSongs();

        const vote = await scoringService.castVote(hostSong.id, player2.id, 8);

        expect(vote.isLocked).toBe(true);
        expect(vote.lockedAt).not.toBeNull();
      });

      it('should set lockedAt timestamp on submission', async () => {
        const { player2, hostSong } = await createTestPartyWithSongs();
        const beforeVote = new Date();

        const vote = await scoringService.castVote(hostSong.id, player2.id, 8);

        expect(vote.lockedAt).not.toBeNull();
        expect(vote.lockedAt!.getTime()).toBeGreaterThanOrEqual(beforeVote.getTime());
      });

      it('should reject attempt to vote again on same song', async () => {
        const { player2, hostSong } = await createTestPartyWithSongs();

        // First vote
        await scoringService.castVote(hostSong.id, player2.id, 8);

        // Attempt to vote again
        await expect(
          scoringService.castVote(hostSong.id, player2.id, 5)
        ).rejects.toThrow();
      });

      it('should throw VOTE_LOCKED error when trying to change locked vote', async () => {
        const { player2, hostSong } = await createTestPartyWithSongs();

        // First vote
        await scoringService.castVote(hostSong.id, player2.id, 8);

        // Attempt to vote again
        try {
          await scoringService.castVote(hostSong.id, player2.id, 5);
          fail('Expected error to be thrown');
        } catch (error: any) {
          // Should be either VOTE_LOCKED or VOTE_ALREADY_EXISTS
          expect(['VOTE_LOCKED', 'VOTE_ALREADY_EXISTS']).toContain(error.code);
        }
      });

      it('should persist vote to database', async () => {
        const { player2, hostSong } = await createTestPartyWithSongs();

        const vote = await scoringService.castVote(hostSong.id, player2.id, 8);

        const dbVote = await prisma.vote.findUnique({
          where: { id: vote.id },
        });

        expect(dbVote).not.toBeNull();
        expect(dbVote?.rating).toBe(8);
        expect(dbVote?.isLocked).toBe(true);
      });
    });

    /**
     * Tests for error handling
     */
    describe('error handling', () => {
      it('should throw SONG_NOT_FOUND when song does not exist', async () => {
        const { player2 } = await createTestPartyWithSongs();

        try {
          await scoringService.castVote('non-existent-song-id', player2.id, 8);
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('SONG_NOT_FOUND');
        }
      });

      it('should throw PLAYER_NOT_FOUND when voter does not exist', async () => {
        const { hostSong } = await createTestPartyWithSongs();

        try {
          await scoringService.castVote(hostSong.id, 'non-existent-player-id', 8);
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('PLAYER_NOT_FOUND');
        }
      });
    });

    /**
     * Tests for successful voting scenarios
     */
    describe('successful voting', () => {
      it('should create vote with correct data', async () => {
        const { player2, hostSong } = await createTestPartyWithSongs();

        const vote = await scoringService.castVote(hostSong.id, player2.id, 7);

        expect(vote.songId).toBe(hostSong.id);
        expect(vote.voterId).toBe(player2.id);
        expect(vote.rating).toBe(7);
        expect(vote.isLocked).toBe(true);
        expect(vote.votedAt).toBeInstanceOf(Date);
        expect(vote.lockedAt).toBeInstanceOf(Date);
      });

      it('should allow multiple players to vote on same song', async () => {
        const { player2, player3, hostSong } = await createTestPartyWithSongs();

        const vote1 = await scoringService.castVote(hostSong.id, player2.id, 8);
        const vote2 = await scoringService.castVote(hostSong.id, player3.id, 6);

        expect(vote1.songId).toBe(hostSong.id);
        expect(vote2.songId).toBe(hostSong.id);
        expect(vote1.voterId).toBe(player2.id);
        expect(vote2.voterId).toBe(player3.id);
      });

      it('should allow player to vote on multiple songs', async () => {
        const { host, player2Song, player3Song } = await createTestPartyWithSongs();

        const vote1 = await scoringService.castVote(player2Song.id, host.id, 9);
        const vote2 = await scoringService.castVote(player3Song.id, host.id, 7);

        expect(vote1.voterId).toBe(host.id);
        expect(vote2.voterId).toBe(host.id);
        expect(vote1.songId).toBe(player2Song.id);
        expect(vote2.songId).toBe(player3Song.id);
      });
    });
  });

  describe('lockVote', () => {
    it('should return existing locked vote', async () => {
      const { player2, hostSong } = await createTestPartyWithSongs();

      // Cast vote (which is automatically locked)
      const originalVote = await scoringService.castVote(hostSong.id, player2.id, 8);

      // Lock vote again
      const lockedVote = await scoringService.lockVote(hostSong.id, player2.id);

      expect(lockedVote.id).toBe(originalVote.id);
      expect(lockedVote.isLocked).toBe(true);
    });

    it('should throw VOTE_NOT_FOUND when vote does not exist', async () => {
      const { player2, hostSong } = await createTestPartyWithSongs();

      try {
        await scoringService.lockVote(hostSong.id, player2.id);
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.code).toBe('VOTE_NOT_FOUND');
      }
    });
  });

  describe('getVote', () => {
    it('should return vote when it exists', async () => {
      const { player2, hostSong } = await createTestPartyWithSongs();

      await scoringService.castVote(hostSong.id, player2.id, 8);

      const vote = await scoringService.getVote(hostSong.id, player2.id);

      expect(vote).not.toBeNull();
      expect(vote?.rating).toBe(8);
    });

    it('should return null when vote does not exist', async () => {
      const { player2, hostSong } = await createTestPartyWithSongs();

      const vote = await scoringService.getVote(hostSong.id, player2.id);

      expect(vote).toBeNull();
    });
  });

  describe('getVotesForSong', () => {
    it('should return all votes for a song', async () => {
      const { player2, player3, hostSong } = await createTestPartyWithSongs();

      await scoringService.castVote(hostSong.id, player2.id, 8);
      await scoringService.castVote(hostSong.id, player3.id, 6);

      const votes = await scoringService.getVotesForSong(hostSong.id);

      expect(votes).toHaveLength(2);
      expect(votes.map(v => v.rating).sort()).toEqual([6, 8]);
    });

    it('should return empty array when no votes exist', async () => {
      const { hostSong } = await createTestPartyWithSongs();

      const votes = await scoringService.getVotesForSong(hostSong.id);

      expect(votes).toHaveLength(0);
    });
  });

  describe('getVotesByPlayer', () => {
    it('should return all votes cast by a player', async () => {
      const { host, player2Song, player3Song } = await createTestPartyWithSongs();

      await scoringService.castVote(player2Song.id, host.id, 9);
      await scoringService.castVote(player3Song.id, host.id, 7);

      const votes = await scoringService.getVotesByPlayer(host.id);

      expect(votes).toHaveLength(2);
      expect(votes.map(v => v.songId).sort()).toEqual([player2Song.id, player3Song.id].sort());
    });

    it('should return empty array when player has not voted', async () => {
      const { player2 } = await createTestPartyWithSongs();

      const votes = await scoringService.getVotesByPlayer(player2.id);

      expect(votes).toHaveLength(0);
    });
  });

  describe('calculateSongScore', () => {
    /**
     * Tests for Requirement 6.1:
     * WHEN a song finishes playing, THE Backend SHALL calculate the raw average of all votes for that song
     * 
     * **Property 24: Base Score Calculation**
     */
    describe('base score calculation (Requirement 6.1, Property 24)', () => {
      it('should calculate raw average as arithmetic mean of votes', async () => {
        const { player2, player3, hostSong } = await createTestPartyWithSongs();

        // Cast votes: 8, 6, 10 -> average = (8 + 6 + 10) / 3 = 8.0
        await scoringService.castVote(hostSong.id, player2.id, 8);
        await scoringService.castVote(hostSong.id, player3.id, 6);

        const score = await scoringService.calculateSongScore(hostSong.id);

        // Average of 8 and 6 = 7.0
        expect(score.rawAverage).toBe(7.0);
      });

      it('should return 0 raw average when no votes exist', async () => {
        const { hostSong } = await createTestPartyWithSongs();

        const score = await scoringService.calculateSongScore(hostSong.id);

        expect(score.rawAverage).toBe(0);
      });

      it('should calculate correct average for single vote', async () => {
        const { player2, hostSong } = await createTestPartyWithSongs();

        await scoringService.castVote(hostSong.id, player2.id, 9);

        const score = await scoringService.calculateSongScore(hostSong.id);

        expect(score.rawAverage).toBe(9.0);
      });

      it('should calculate correct average for many votes', async () => {
        // Create party with more players
        const { party, host } = await partyService.createParty('TestHost');
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        const { player: player3 } = await partyService.joinParty(party.code, 'Player3');
        const { player: player4 } = await partyService.joinParty(party.code, 'Player4');
        const { player: player5 } = await partyService.joinParty(party.code, 'Player5');

        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData: SongSubmission = {
          soundcloudId: 123456,
          title: 'Test Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test/song',
          confidence: 3,
        };

        const hostSong = await songService.submitSong(party.id, host.id, songData);

        // Cast votes: 1, 2, 3, 4 -> average = (1 + 2 + 3 + 4) / 4 = 2.5
        await scoringService.castVote(hostSong.id, player2.id, 1);
        await scoringService.castVote(hostSong.id, player3.id, 2);
        await scoringService.castVote(hostSong.id, player4.id, 3);
        await scoringService.castVote(hostSong.id, player5.id, 4);

        const score = await scoringService.calculateSongScore(hostSong.id);

        expect(score.rawAverage).toBe(2.5);
      });

      it('should include voteCount in result', async () => {
        const { player2, player3, hostSong } = await createTestPartyWithSongs();

        await scoringService.castVote(hostSong.id, player2.id, 8);
        await scoringService.castVote(hostSong.id, player3.id, 6);

        const score = await scoringService.calculateSongScore(hostSong.id);

        expect(score.voteCount).toBe(2);
      });

      it('should include vote distribution in result', async () => {
        const { player2, player3, hostSong } = await createTestPartyWithSongs();

        // Cast votes: 8 and 6
        await scoringService.castVote(hostSong.id, player2.id, 8);
        await scoringService.castVote(hostSong.id, player3.id, 6);

        const score = await scoringService.calculateSongScore(hostSong.id);

        // Distribution should have 1 at index 5 (rating 6) and 1 at index 7 (rating 8)
        expect(score.voteDistribution).toHaveLength(10);
        expect(score.voteDistribution[5]).toBe(1); // rating 6
        expect(score.voteDistribution[7]).toBe(1); // rating 8
      });
    });

    /**
     * Tests for Requirement 6.2:
     * WHEN songs_per_player is 1, THE Backend SHALL apply a 1.5x weight multiplier to all songs
     * 
     * **Property 25: Progressive Weighting (1 Song)**
     */
    describe('progressive weighting - 1 song (Requirement 6.2, Property 25)', () => {
      it('should apply 1.5x multiplier when songs_per_player is 1', async () => {
        // Create party with 1 song per player
        const { party, host } = await partyService.createParty('TestHost');
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

        // Update settings to 1 song per player (host.id is required)
        await partyService.updateSettings(party.id, host.id, { songsPerPlayer: 1 });

        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData: SongSubmission = {
          soundcloudId: 123456,
          title: 'Test Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test/song',
          confidence: 3,
        };

        const hostSong = await songService.submitSong(party.id, host.id, songData);

        // Cast vote with rating 10
        await scoringService.castVote(hostSong.id, player2.id, 10);

        const score = await scoringService.calculateSongScore(hostSong.id);

        expect(score.weightMultiplier).toBe(1.5);
        expect(score.weightedScore).toBe(15.0); // 10 * 1.5
      });
    });

    /**
     * Tests for Requirement 6.3:
     * WHEN songs_per_player is 2, THE Backend SHALL apply 1.0x to Round 1 songs and 2.0x to Round 2 songs
     * 
     * **Property 26: Progressive Weighting (2 Songs)**
     */
    describe('progressive weighting - 2 songs (Requirement 6.3, Property 26)', () => {
      it('should apply 1.0x multiplier to round 1 songs when songs_per_player is 2', async () => {
        // Default settings have songsPerPlayer = 2
        const { player2, player3, hostSong } = await createTestPartyWithSongs();

        // hostSong is round 1 (first submission)
        await scoringService.castVote(hostSong.id, player2.id, 10);

        const score = await scoringService.calculateSongScore(hostSong.id);

        expect(score.weightMultiplier).toBe(1.0);
        expect(score.weightedScore).toBe(10.0); // 10 * 1.0
      });

      it('should apply 2.0x multiplier to round 2 songs when songs_per_player is 2', async () => {
        // Create party with 2 songs per player
        const { party, host } = await partyService.createParty('TestHost');
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData: SongSubmission = {
          soundcloudId: 123456,
          title: 'Test Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test/song',
          confidence: 3,
        };

        // Submit first song (round 1)
        await songService.submitSong(party.id, host.id, {
          ...songData,
          soundcloudId: 111111,
          title: 'Round 1 Song',
        });

        // Submit second song (round 2)
        const round2Song = await songService.submitSong(party.id, host.id, {
          ...songData,
          soundcloudId: 222222,
          title: 'Round 2 Song',
        });

        // Cast vote on round 2 song
        await scoringService.castVote(round2Song.id, player2.id, 10);

        const score = await scoringService.calculateSongScore(round2Song.id);

        expect(score.weightMultiplier).toBe(2.0);
        expect(score.weightedScore).toBe(20.0); // 10 * 2.0
      });
    });

    /**
     * Tests for Requirement 6.4:
     * WHEN songs_per_player is 3, THE Backend SHALL apply 1.0x to Round 1, 1.5x to Round 2, and 2.0x to Round 3 songs
     * 
     * **Property 27: Progressive Weighting (3 Songs)**
     */
    describe('progressive weighting - 3 songs (Requirement 6.4, Property 27)', () => {
      it('should apply correct multipliers for all 3 rounds', async () => {
        // Create party with 3 songs per player
        const { party, host } = await partyService.createParty('TestHost');
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

        // Update settings to 3 songs per player (host.id is required)
        await partyService.updateSettings(party.id, host.id, { songsPerPlayer: 3 });

        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData: SongSubmission = {
          soundcloudId: 123456,
          title: 'Test Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test/song',
          confidence: 3,
        };

        // Submit 3 songs (rounds 1, 2, 3)
        const round1Song = await songService.submitSong(party.id, host.id, {
          ...songData,
          soundcloudId: 111111,
          title: 'Round 1 Song',
        });

        const round2Song = await songService.submitSong(party.id, host.id, {
          ...songData,
          soundcloudId: 222222,
          title: 'Round 2 Song',
        });

        const round3Song = await songService.submitSong(party.id, host.id, {
          ...songData,
          soundcloudId: 333333,
          title: 'Round 3 Song',
        });

        // Cast votes on all songs (rating 10 for easy calculation)
        await scoringService.castVote(round1Song.id, player2.id, 10);
        await scoringService.castVote(round2Song.id, player2.id, 10);
        await scoringService.castVote(round3Song.id, player2.id, 10);

        // Calculate scores
        const score1 = await scoringService.calculateSongScore(round1Song.id);
        const score2 = await scoringService.calculateSongScore(round2Song.id);
        const score3 = await scoringService.calculateSongScore(round3Song.id);

        // Round 1: 1.0x
        expect(score1.weightMultiplier).toBe(1.0);
        expect(score1.weightedScore).toBe(10.0);

        // Round 2: 1.5x
        expect(score2.weightMultiplier).toBe(1.5);
        expect(score2.weightedScore).toBe(15.0);

        // Round 3: 2.0x
        expect(score3.weightMultiplier).toBe(2.0);
        expect(score3.weightedScore).toBe(20.0);
      });
    });

    /**
     * Tests for score persistence
     */
    describe('score persistence', () => {
      it('should persist calculated scores to database', async () => {
        const { player2, player3, hostSong } = await createTestPartyWithSongs();

        await scoringService.castVote(hostSong.id, player2.id, 8);
        await scoringService.castVote(hostSong.id, player3.id, 6);

        await scoringService.calculateSongScore(hostSong.id);

        // Verify scores are persisted
        const dbSong = await prisma.song.findUnique({
          where: { id: hostSong.id },
        });

        expect(dbSong?.rawAverage).toBe(7.0);
        expect(dbSong?.weightedScore).toBe(7.0); // 7.0 * 1.0 (round 1, 2 songs per player)
        expect(dbSong?.confidenceModifier).toBe(0);
        expect(dbSong?.finalScore).toBe(7.0);
        expect(dbSong?.voteDistribution).toBe('[0,0,0,0,0,1,0,1,0,0]');
      });
    });

    /**
     * Tests for error handling
     */
    describe('error handling', () => {
      it('should throw SONG_NOT_FOUND when song does not exist', async () => {
        try {
          await scoringService.calculateSongScore('non-existent-song-id');
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('SONG_NOT_FOUND');
        }
      });
    });

    /**
     * Tests for finalScore (before confidence modifiers)
     */
    describe('final score calculation', () => {
      it('should set finalScore equal to weightedScore when confidence betting is disabled', async () => {
        // Create party with confidence betting disabled
        const { party, host } = await partyService.createParty('TestHost');
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

        // Explicitly disable confidence betting
        await partyService.updateSettings(party.id, host.id, { enableConfidenceBetting: false });

        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData: SongSubmission = {
          soundcloudId: 123456,
          title: 'Test Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test/song',
          confidence: 5, // High confidence but betting is disabled
        };

        const song = await songService.submitSong(party.id, host.id, songData);

        await scoringService.castVote(song.id, player2.id, 8);

        const score = await scoringService.calculateSongScore(song.id);

        // Confidence betting is disabled, so no modifier
        expect(score.confidenceModifier).toBe(0);
        expect(score.finalScore).toBe(score.weightedScore);
      });
    });

    /**
     * Tests for Requirement 6.5:
     * WHERE confidence_betting is enabled AND Confidence is 4 or 5 AND average Vote is 7 or higher, 
     * THE Backend SHALL add 2 bonus points
     * 
     * **Property 28: Confidence Bonus**
     */
    describe('confidence bonus (Requirement 6.5, Property 28)', () => {
      it('should add +2 bonus when confidence >= 4 and avg vote >= 7', async () => {
        // Create party with confidence betting enabled
        const { party, host } = await partyService.createParty('TestHost');
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

        // Enable confidence betting
        await partyService.updateSettings(party.id, host.id, { enableConfidenceBetting: true });

        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData: SongSubmission = {
          soundcloudId: 123456,
          title: 'High Confidence Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test/song',
          confidence: 4, // High confidence
        };

        const song = await songService.submitSong(party.id, host.id, songData);

        // Cast votes that average to 7 or higher
        await scoringService.castVote(song.id, player2.id, 8);
        await scoringService.castVote(song.id, player3.id, 8);

        const score = await scoringService.calculateSongScore(song.id);

        expect(score.rawAverage).toBe(8.0);
        expect(score.confidenceModifier).toBe(2);
        expect(score.finalScore).toBe(score.weightedScore + 2);
      });

      it('should add +2 bonus when confidence = 5 and avg vote = 7 exactly', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

        await partyService.updateSettings(party.id, host.id, { enableConfidenceBetting: true });

        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData: SongSubmission = {
          soundcloudId: 123456,
          title: 'Max Confidence Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test/song',
          confidence: 5, // Max confidence
        };

        const song = await songService.submitSong(party.id, host.id, songData);

        // Cast votes that average to exactly 7
        await scoringService.castVote(song.id, player2.id, 7);
        await scoringService.castVote(song.id, player3.id, 7);

        const score = await scoringService.calculateSongScore(song.id);

        expect(score.rawAverage).toBe(7.0);
        expect(score.confidenceModifier).toBe(2);
      });

      it('should NOT add bonus when confidence < 4 even with high avg vote', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

        await partyService.updateSettings(party.id, host.id, { enableConfidenceBetting: true });

        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData: SongSubmission = {
          soundcloudId: 123456,
          title: 'Low Confidence Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test/song',
          confidence: 3, // Low confidence
        };

        const song = await songService.submitSong(party.id, host.id, songData);

        // Cast high votes
        await scoringService.castVote(song.id, player2.id, 9);
        await scoringService.castVote(song.id, player3.id, 9);

        const score = await scoringService.calculateSongScore(song.id);

        expect(score.rawAverage).toBe(9.0);
        expect(score.confidenceModifier).toBe(0); // No bonus because confidence < 4
      });

      it('should NOT add bonus when confidence betting is disabled', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

        // Explicitly disable confidence betting
        await partyService.updateSettings(party.id, host.id, { enableConfidenceBetting: false });

        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData: SongSubmission = {
          soundcloudId: 123456,
          title: 'High Confidence Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test/song',
          confidence: 5, // High confidence
        };

        const song = await songService.submitSong(party.id, host.id, songData);

        // Cast high votes
        await scoringService.castVote(song.id, player2.id, 9);
        await scoringService.castVote(song.id, player3.id, 9);

        const score = await scoringService.calculateSongScore(song.id);

        expect(score.rawAverage).toBe(9.0);
        expect(score.confidenceModifier).toBe(0); // No bonus because betting is disabled
      });
    });

    /**
     * Tests for Requirement 6.6:
     * WHERE confidence_betting is enabled AND Confidence is 4 or 5 AND average Vote is 4 or lower, 
     * THE Backend SHALL subtract 2 penalty points
     * 
     * **Property 29: Confidence Penalty**
     */
    describe('confidence penalty (Requirement 6.6, Property 29)', () => {
      it('should subtract -2 penalty when confidence >= 4 and avg vote <= 4', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

        await partyService.updateSettings(party.id, host.id, { enableConfidenceBetting: true });

        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData: SongSubmission = {
          soundcloudId: 123456,
          title: 'High Confidence Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test/song',
          confidence: 4, // High confidence
        };

        const song = await songService.submitSong(party.id, host.id, songData);

        // Cast low votes
        await scoringService.castVote(song.id, player2.id, 3);
        await scoringService.castVote(song.id, player3.id, 3);

        const score = await scoringService.calculateSongScore(song.id);

        expect(score.rawAverage).toBe(3.0);
        expect(score.confidenceModifier).toBe(-2);
        expect(score.finalScore).toBe(score.weightedScore - 2);
      });

      it('should subtract -2 penalty when confidence = 5 and avg vote = 4 exactly', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

        await partyService.updateSettings(party.id, host.id, { enableConfidenceBetting: true });

        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData: SongSubmission = {
          soundcloudId: 123456,
          title: 'Max Confidence Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test/song',
          confidence: 5, // Max confidence
        };

        const song = await songService.submitSong(party.id, host.id, songData);

        // Cast votes that average to exactly 4
        await scoringService.castVote(song.id, player2.id, 4);
        await scoringService.castVote(song.id, player3.id, 4);

        const score = await scoringService.calculateSongScore(song.id);

        expect(score.rawAverage).toBe(4.0);
        expect(score.confidenceModifier).toBe(-2);
      });

      it('should NOT subtract penalty when confidence < 4 even with low avg vote', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

        await partyService.updateSettings(party.id, host.id, { enableConfidenceBetting: true });

        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData: SongSubmission = {
          soundcloudId: 123456,
          title: 'Low Confidence Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test/song',
          confidence: 2, // Low confidence
        };

        const song = await songService.submitSong(party.id, host.id, songData);

        // Cast low votes
        await scoringService.castVote(song.id, player2.id, 2);
        await scoringService.castVote(song.id, player3.id, 2);

        const score = await scoringService.calculateSongScore(song.id);

        expect(score.rawAverage).toBe(2.0);
        expect(score.confidenceModifier).toBe(0); // No penalty because confidence < 4
      });

      it('should NOT subtract penalty when confidence betting is disabled', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

        // Explicitly disable confidence betting
        await partyService.updateSettings(party.id, host.id, { enableConfidenceBetting: false });

        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData: SongSubmission = {
          soundcloudId: 123456,
          title: 'High Confidence Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test/song',
          confidence: 5, // High confidence
        };

        const song = await songService.submitSong(party.id, host.id, songData);

        // Cast low votes
        await scoringService.castVote(song.id, player2.id, 2);
        await scoringService.castVote(song.id, player3.id, 2);

        const score = await scoringService.calculateSongScore(song.id);

        expect(score.rawAverage).toBe(2.0);
        expect(score.confidenceModifier).toBe(0); // No penalty because betting is disabled
      });
    });

    /**
     * Tests for no modifier scenarios
     */
    describe('no confidence modifier', () => {
      it('should NOT apply modifier when avg vote is between 4 and 7 (exclusive)', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

        await partyService.updateSettings(party.id, host.id, { enableConfidenceBetting: true });

        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData: SongSubmission = {
          soundcloudId: 123456,
          title: 'High Confidence Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test/song',
          confidence: 5, // High confidence
        };

        const song = await songService.submitSong(party.id, host.id, songData);

        // Cast votes that average to 5.5 (between 4 and 7)
        await scoringService.castVote(song.id, player2.id, 5);
        await scoringService.castVote(song.id, player3.id, 6);

        const score = await scoringService.calculateSongScore(song.id);

        expect(score.rawAverage).toBe(5.5);
        expect(score.confidenceModifier).toBe(0); // No modifier in the middle range
        expect(score.finalScore).toBe(score.weightedScore);
      });
    });
  });

  describe('getWeightMultiplier', () => {
    const service = new ScoringService();

    describe('1 song per player (Requirement 6.2, Property 25)', () => {
      it('should return 1.5 for round 1 when totalRounds is 1', () => {
        expect(service.getWeightMultiplier(1, 1)).toBe(1.5);
      });
    });

    describe('2 songs per player (Requirement 6.3, Property 26)', () => {
      it('should return 1.0 for round 1 when totalRounds is 2', () => {
        expect(service.getWeightMultiplier(1, 2)).toBe(1.0);
      });

      it('should return 2.0 for round 2 when totalRounds is 2', () => {
        expect(service.getWeightMultiplier(2, 2)).toBe(2.0);
      });
    });

    describe('3 songs per player (Requirement 6.4, Property 27)', () => {
      it('should return 1.0 for round 1 when totalRounds is 3', () => {
        expect(service.getWeightMultiplier(1, 3)).toBe(1.0);
      });

      it('should return 1.5 for round 2 when totalRounds is 3', () => {
        expect(service.getWeightMultiplier(2, 3)).toBe(1.5);
      });

      it('should return 2.0 for round 3 when totalRounds is 3', () => {
        expect(service.getWeightMultiplier(3, 3)).toBe(2.0);
      });
    });

    describe('edge cases', () => {
      it('should return 1.0 for invalid totalRounds', () => {
        expect(service.getWeightMultiplier(1, 0)).toBe(1.0);
        expect(service.getWeightMultiplier(1, 4)).toBe(1.0);
      });
    });
  });

  describe('applyConfidenceModifier', () => {
    const service = new ScoringService();

    /**
     * Tests for Requirement 6.5:
     * WHERE confidence_betting is enabled AND Confidence is 4 or 5 AND average Vote is 7 or higher, 
     * THE Backend SHALL add 2 bonus points
     * 
     * **Property 28: Confidence Bonus**
     */
    describe('confidence bonus (Requirement 6.5, Property 28)', () => {
      it('should return +2 when confidence = 4 and rawAverage = 7', () => {
        expect(service.applyConfidenceModifier(7, 4, true)).toBe(2);
      });

      it('should return +2 when confidence = 5 and rawAverage = 7', () => {
        expect(service.applyConfidenceModifier(7, 5, true)).toBe(2);
      });

      it('should return +2 when confidence = 4 and rawAverage = 10', () => {
        expect(service.applyConfidenceModifier(10, 4, true)).toBe(2);
      });

      it('should return +2 when confidence = 5 and rawAverage = 8.5', () => {
        expect(service.applyConfidenceModifier(8.5, 5, true)).toBe(2);
      });
    });

    /**
     * Tests for Requirement 6.6:
     * WHERE confidence_betting is enabled AND Confidence is 4 or 5 AND average Vote is 4 or lower, 
     * THE Backend SHALL subtract 2 penalty points
     * 
     * **Property 29: Confidence Penalty**
     */
    describe('confidence penalty (Requirement 6.6, Property 29)', () => {
      it('should return -2 when confidence = 4 and rawAverage = 4', () => {
        expect(service.applyConfidenceModifier(4, 4, true)).toBe(-2);
      });

      it('should return -2 when confidence = 5 and rawAverage = 4', () => {
        expect(service.applyConfidenceModifier(4, 5, true)).toBe(-2);
      });

      it('should return -2 when confidence = 4 and rawAverage = 1', () => {
        expect(service.applyConfidenceModifier(1, 4, true)).toBe(-2);
      });

      it('should return -2 when confidence = 5 and rawAverage = 2.5', () => {
        expect(service.applyConfidenceModifier(2.5, 5, true)).toBe(-2);
      });
    });

    describe('no modifier scenarios', () => {
      it('should return 0 when confidence betting is disabled', () => {
        expect(service.applyConfidenceModifier(10, 5, false)).toBe(0);
        expect(service.applyConfidenceModifier(1, 5, false)).toBe(0);
      });

      it('should return 0 when confidence < 4', () => {
        expect(service.applyConfidenceModifier(10, 3, true)).toBe(0);
        expect(service.applyConfidenceModifier(10, 2, true)).toBe(0);
        expect(service.applyConfidenceModifier(10, 1, true)).toBe(0);
        expect(service.applyConfidenceModifier(1, 3, true)).toBe(0);
      });

      it('should return 0 when rawAverage is between 4 and 7 (exclusive)', () => {
        expect(service.applyConfidenceModifier(4.1, 5, true)).toBe(0);
        expect(service.applyConfidenceModifier(5, 5, true)).toBe(0);
        expect(service.applyConfidenceModifier(6, 5, true)).toBe(0);
        expect(service.applyConfidenceModifier(6.9, 5, true)).toBe(0);
      });
    });

    describe('boundary conditions', () => {
      it('should return +2 at exactly rawAverage = 7 with high confidence', () => {
        expect(service.applyConfidenceModifier(7, 4, true)).toBe(2);
        expect(service.applyConfidenceModifier(7, 5, true)).toBe(2);
      });

      it('should return -2 at exactly rawAverage = 4 with high confidence', () => {
        expect(service.applyConfidenceModifier(4, 4, true)).toBe(-2);
        expect(service.applyConfidenceModifier(4, 5, true)).toBe(-2);
      });

      it('should return 0 at exactly confidence = 3 regardless of rawAverage', () => {
        expect(service.applyConfidenceModifier(10, 3, true)).toBe(0);
        expect(service.applyConfidenceModifier(1, 3, true)).toBe(0);
      });
    });
  });

  /**
   * Tests for calculatePlayerScore
   * 
   * **Validates: Requirements 6.7**
   * WHEN calculating a Player's total score, THE Backend SHALL sum all their songs' weighted scores including confidence modifiers
   * 
   * **Property 30: Player Score Summation**
   */
  describe('calculatePlayerScore', () => {
    /**
     * Tests for Requirement 6.7:
     * WHEN calculating a Player's total score, THE Backend SHALL sum all their songs' weighted scores including confidence modifiers
     * 
     * **Property 30: Player Score Summation**
     */
    describe('player score summation (Requirement 6.7, Property 30)', () => {
      it('should return 0 for player with no songs', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');

        // player2 has no songs
        const score = await scoringService.calculatePlayerScore(player2.id, party.id);

        expect(score).toBe(0);
      });

      it('should calculate score for player with single song', async () => {
        const { party, host, player2, player3, hostSong } = await createTestPartyWithSongs();

        // Cast votes on host's song
        await scoringService.castVote(hostSong.id, player2.id, 8);
        await scoringService.castVote(hostSong.id, player3.id, 6);

        // Calculate host's player score
        const playerScore = await scoringService.calculatePlayerScore(host.id, party.id);

        // Expected: rawAverage = 7.0, weightMultiplier = 1.0 (round 1, 2 songs per player)
        // weightedScore = 7.0, confidenceModifier = 0 (confidence = 3, betting disabled by default)
        // finalScore = 7.0
        expect(playerScore).toBe(7.0);
      });

      it('should sum scores for player with multiple songs', async () => {
        // Create party with 2 songs per player
        const { party, host } = await partyService.createParty('TestHost');
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData: SongSubmission = {
          soundcloudId: 123456,
          title: 'Test Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test/song',
          confidence: 3,
        };

        // Host submits 2 songs (round 1 and round 2)
        const hostSong1 = await songService.submitSong(party.id, host.id, {
          ...songData,
          soundcloudId: 111111,
          title: 'Host Song 1',
        });

        const hostSong2 = await songService.submitSong(party.id, host.id, {
          ...songData,
          soundcloudId: 222222,
          title: 'Host Song 2',
        });

        // Cast votes on both songs
        await scoringService.castVote(hostSong1.id, player2.id, 8);
        await scoringService.castVote(hostSong1.id, player3.id, 8);
        await scoringService.castVote(hostSong2.id, player2.id, 10);
        await scoringService.castVote(hostSong2.id, player3.id, 10);

        // Calculate host's player score
        const playerScore = await scoringService.calculatePlayerScore(host.id, party.id);

        // Song 1: rawAverage = 8.0, weightMultiplier = 1.0 (round 1), finalScore = 8.0
        // Song 2: rawAverage = 10.0, weightMultiplier = 2.0 (round 2), finalScore = 20.0
        // Total = 8.0 + 20.0 = 28.0
        expect(playerScore).toBe(28.0);
      });

      it('should include confidence modifiers in player score', async () => {
        // Create party with confidence betting enabled
        const { party, host } = await partyService.createParty('TestHost');
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

        // Enable confidence betting
        await partyService.updateSettings(party.id, host.id, { enableConfidenceBetting: true });

        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        // Host submits song with high confidence
        const songData: SongSubmission = {
          soundcloudId: 123456,
          title: 'High Confidence Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test/song',
          confidence: 5, // High confidence
        };

        const hostSong = await songService.submitSong(party.id, host.id, songData);

        // Cast high votes (avg >= 7 triggers +2 bonus)
        await scoringService.castVote(hostSong.id, player2.id, 8);
        await scoringService.castVote(hostSong.id, player3.id, 8);

        // Calculate host's player score
        const playerScore = await scoringService.calculatePlayerScore(host.id, party.id);

        // rawAverage = 8.0, weightMultiplier = 1.0 (round 1, 2 songs per player)
        // weightedScore = 8.0, confidenceModifier = +2 (confidence = 5, avg >= 7)
        // finalScore = 8.0 + 2 = 10.0
        expect(playerScore).toBe(10.0);
      });

      it('should include confidence penalty in player score', async () => {
        // Create party with confidence betting enabled
        const { party, host } = await partyService.createParty('TestHost');
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

        // Enable confidence betting
        await partyService.updateSettings(party.id, host.id, { enableConfidenceBetting: true });

        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        // Host submits song with high confidence
        const songData: SongSubmission = {
          soundcloudId: 123456,
          title: 'High Confidence Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test/song',
          confidence: 5, // High confidence
        };

        const hostSong = await songService.submitSong(party.id, host.id, songData);

        // Cast low votes (avg <= 4 triggers -2 penalty)
        await scoringService.castVote(hostSong.id, player2.id, 3);
        await scoringService.castVote(hostSong.id, player3.id, 3);

        // Calculate host's player score
        const playerScore = await scoringService.calculatePlayerScore(host.id, party.id);

        // rawAverage = 3.0, weightMultiplier = 1.0 (round 1, 2 songs per player)
        // weightedScore = 3.0, confidenceModifier = -2 (confidence = 5, avg <= 4)
        // finalScore = 3.0 - 2 = 1.0
        expect(playerScore).toBe(1.0);
      });

      it('should sum multiple songs with mixed confidence modifiers', async () => {
        // Create party with confidence betting enabled and 2 songs per player
        const { party, host } = await partyService.createParty('TestHost');
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

        // Enable confidence betting
        await partyService.updateSettings(party.id, host.id, { enableConfidenceBetting: true });

        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        // Host submits 2 songs with different confidence levels
        const hostSong1 = await songService.submitSong(party.id, host.id, {
          soundcloudId: 111111,
          title: 'High Confidence Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test/song1',
          confidence: 5, // High confidence
        });

        const hostSong2 = await songService.submitSong(party.id, host.id, {
          soundcloudId: 222222,
          title: 'Low Confidence Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test/song2',
          confidence: 2, // Low confidence - no modifier
        });

        // Cast votes
        // Song 1: high votes -> +2 bonus
        await scoringService.castVote(hostSong1.id, player2.id, 9);
        await scoringService.castVote(hostSong1.id, player3.id, 9);
        // Song 2: high votes but low confidence -> no modifier
        await scoringService.castVote(hostSong2.id, player2.id, 8);
        await scoringService.castVote(hostSong2.id, player3.id, 8);

        // Calculate host's player score
        const playerScore = await scoringService.calculatePlayerScore(host.id, party.id);

        // Song 1: rawAverage = 9.0, weightMultiplier = 1.0 (round 1), confidenceModifier = +2
        //         finalScore = 9.0 + 2 = 11.0
        // Song 2: rawAverage = 8.0, weightMultiplier = 2.0 (round 2), confidenceModifier = 0
        //         finalScore = 16.0
        // Total = 11.0 + 16.0 = 27.0
        expect(playerScore).toBe(27.0);
      });

      it('should use already calculated finalScore if available', async () => {
        const { party, host, player2, player3, hostSong } = await createTestPartyWithSongs();

        // Cast votes
        await scoringService.castVote(hostSong.id, player2.id, 8);
        await scoringService.castVote(hostSong.id, player3.id, 6);

        // Pre-calculate the song score
        const songScore = await scoringService.calculateSongScore(hostSong.id);

        // Calculate player score - should use the already calculated finalScore
        const playerScore = await scoringService.calculatePlayerScore(host.id, party.id);

        expect(playerScore).toBe(songScore.finalScore);
      });
    });

    /**
     * Tests for error handling
     */
    describe('error handling', () => {
      it('should throw PLAYER_NOT_FOUND when player does not exist', async () => {
        const { party } = await partyService.createParty('TestHost');

        try {
          await scoringService.calculatePlayerScore('non-existent-player-id', party.id);
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('PLAYER_NOT_FOUND');
        }
      });

      it('should throw PARTY_NOT_FOUND when party does not exist', async () => {
        const { host } = await partyService.createParty('TestHost');

        try {
          await scoringService.calculatePlayerScore(host.id, 'non-existent-party-id');
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('PARTY_NOT_FOUND');
        }
      });
    });

    /**
     * Tests for edge cases
     */
    describe('edge cases', () => {
      it('should handle player with songs but no votes', async () => {
        const { party, host } = await createTestPartyWithSongs();

        // No votes cast on host's song
        const playerScore = await scoringService.calculatePlayerScore(host.id, party.id);

        // rawAverage = 0 (no votes), weightedScore = 0, finalScore = 0
        expect(playerScore).toBe(0);
      });

      it('should only count songs from the specified party', async () => {
        // Create two parties
        const { party: party1, host: host1 } = await partyService.createParty('Host1');
        const { player: player2 } = await partyService.joinParty(party1.code, 'Player2');
        const { player: player3 } = await partyService.joinParty(party1.code, 'Player3');

        await prisma.party.update({
          where: { id: party1.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData: SongSubmission = {
          soundcloudId: 123456,
          title: 'Test Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test/song',
          confidence: 3,
        };

        // Host submits song in party1
        const hostSong = await songService.submitSong(party1.id, host1.id, {
          ...songData,
          soundcloudId: 111111,
        });

        // Cast votes
        await scoringService.castVote(hostSong.id, player2.id, 10);
        await scoringService.castVote(hostSong.id, player3.id, 10);

        // Create second party
        const { party: party2 } = await partyService.createParty('Host2');

        // Calculate host1's score in party2 (should be 0 since they have no songs there)
        const scoreInParty2 = await scoringService.calculatePlayerScore(host1.id, party2.id);
        expect(scoreInParty2).toBe(0);

        // Calculate host1's score in party1 (should have their song score)
        const scoreInParty1 = await scoringService.calculatePlayerScore(host1.id, party1.id);
        expect(scoreInParty1).toBe(10.0); // rawAverage = 10, weightMultiplier = 1.0
      });
    });
  });

  /**
   * Tests for Bonus Category Calculation Functions
   * 
   * **Validates: Requirements 7.2, 7.3, 7.4, 7.5**
   */
  describe('Bonus Category Calculations', () => {
    // Helper to create a mock song with specific properties
    function createMockSong(overrides: Partial<import('../../types').Song>): import('../../types').Song {
      return {
        id: 'song-' + Math.random().toString(36).substr(2, 9),
        partyId: 'party-1',
        submitterId: 'player-1',
        soundcloudId: 123456,
        title: 'Test Song',
        artist: 'Test Artist',
        artworkUrl: 'https://example.com/art.jpg',
        duration: 180000,
        permalinkUrl: 'https://soundcloud.com/test/song',
        confidence: 3 as 1 | 2 | 3 | 4 | 5,
        roundNumber: 1,
        queuePosition: 1,
        rawAverage: null,
        weightedScore: null,
        confidenceModifier: null,
        finalScore: null,
        voteDistribution: null,
        submittedAt: new Date(),
        ...overrides,
      };
    }

    /**
     * Tests for calculateVoteVariance
     */
    describe('calculateVoteVariance', () => {
      it('should return 0 for empty votes array', () => {
        const variance = scoringService.calculateVoteVariance([]);
        expect(variance).toBe(0);
      });

      it('should return 0 for single vote', () => {
        const variance = scoringService.calculateVoteVariance([5]);
        expect(variance).toBe(0);
      });

      it('should return 0 for identical votes', () => {
        const variance = scoringService.calculateVoteVariance([5, 5, 5, 5]);
        expect(variance).toBe(0);
      });

      it('should calculate correct variance for varied votes', () => {
        // Votes: [2, 4, 6, 8]
        // Mean: (2 + 4 + 6 + 8) / 4 = 5
        // Variance: ((2-5)^2 + (4-5)^2 + (6-5)^2 + (8-5)^2) / 4
        //         = (9 + 1 + 1 + 9) / 4 = 20 / 4 = 5
        const variance = scoringService.calculateVoteVariance([2, 4, 6, 8]);
        expect(variance).toBe(5);
      });

      it('should calculate higher variance for more polarizing votes', () => {
        // Polarizing: [1, 10, 1, 10] - mean = 5.5
        // Variance: ((1-5.5)^2 + (10-5.5)^2 + (1-5.5)^2 + (10-5.5)^2) / 4
        //         = (20.25 + 20.25 + 20.25 + 20.25) / 4 = 81 / 4 = 20.25
        const polarizingVariance = scoringService.calculateVoteVariance([1, 10, 1, 10]);
        
        // Consistent: [5, 5, 6, 6] - mean = 5.5
        // Variance: ((5-5.5)^2 + (5-5.5)^2 + (6-5.5)^2 + (6-5.5)^2) / 4
        //         = (0.25 + 0.25 + 0.25 + 0.25) / 4 = 1 / 4 = 0.25
        const consistentVariance = scoringService.calculateVoteVariance([5, 5, 6, 6]);

        expect(polarizingVariance).toBeGreaterThan(consistentVariance);
        expect(polarizingVariance).toBe(20.25);
        expect(consistentVariance).toBe(0.25);
      });
    });

    /**
     * Tests for Requirement 7.2:
     * WHEN calculating "Crowd Favorite", THE Backend SHALL award it to the song with the highest weighted score
     * 
     * **Property 32: Crowd Favorite Winner**
     */
    describe('calculateCrowdFavorite (Requirement 7.2, Property 32)', () => {
      it('should return null for empty songs array', () => {
        const winner = scoringService.calculateCrowdFavorite([]);
        expect(winner).toBeNull();
      });

      it('should return null when no songs have weighted scores', () => {
        const songs = [
          createMockSong({ id: 'song-1', weightedScore: null }),
          createMockSong({ id: 'song-2', weightedScore: null }),
        ];

        const winner = scoringService.calculateCrowdFavorite(songs);
        expect(winner).toBeNull();
      });

      it('should return the song with highest weighted score', () => {
        const songs = [
          createMockSong({ id: 'song-1', weightedScore: 15.0 }),
          createMockSong({ id: 'song-2', weightedScore: 20.0 }),
          createMockSong({ id: 'song-3', weightedScore: 12.0 }),
        ];

        const winner = scoringService.calculateCrowdFavorite(songs);
        expect(winner).not.toBeNull();
        expect(winner!.id).toBe('song-2');
        expect(winner!.weightedScore).toBe(20.0);
      });

      it('should handle single song', () => {
        const songs = [
          createMockSong({ id: 'song-1', weightedScore: 10.0 }),
        ];

        const winner = scoringService.calculateCrowdFavorite(songs);
        expect(winner).not.toBeNull();
        expect(winner!.id).toBe('song-1');
      });

      it('should return first song when multiple have same highest score', () => {
        const songs = [
          createMockSong({ id: 'song-1', weightedScore: 20.0 }),
          createMockSong({ id: 'song-2', weightedScore: 20.0 }),
          createMockSong({ id: 'song-3', weightedScore: 15.0 }),
        ];

        const winner = scoringService.calculateCrowdFavorite(songs);
        expect(winner).not.toBeNull();
        expect(winner!.id).toBe('song-1');
      });

      it('should ignore songs without weighted scores', () => {
        const songs = [
          createMockSong({ id: 'song-1', weightedScore: null }),
          createMockSong({ id: 'song-2', weightedScore: 15.0 }),
          createMockSong({ id: 'song-3', weightedScore: null }),
        ];

        const winner = scoringService.calculateCrowdFavorite(songs);
        expect(winner).not.toBeNull();
        expect(winner!.id).toBe('song-2');
      });
    });

    /**
     * Tests for Requirement 7.3:
     * WHEN calculating "Cult Classic", THE Backend SHALL award it to the song with the highest vote variance
     * 
     * **Property 33: Cult Classic Winner**
     */
    describe('calculateCultClassic (Requirement 7.3, Property 33)', () => {
      it('should return null for empty songs array', () => {
        const winner = scoringService.calculateCultClassic([]);
        expect(winner).toBeNull();
      });

      it('should return null when no songs have vote distributions', () => {
        const songs = [
          createMockSong({ id: 'song-1', voteDistribution: null }),
          createMockSong({ id: 'song-2', voteDistribution: null }),
        ];

        const winner = scoringService.calculateCultClassic(songs);
        expect(winner).toBeNull();
      });

      it('should return null when vote distributions are empty', () => {
        const songs = [
          createMockSong({ id: 'song-1', voteDistribution: [] }),
          createMockSong({ id: 'song-2', voteDistribution: [] }),
        ];

        const winner = scoringService.calculateCultClassic(songs);
        expect(winner).toBeNull();
      });

      it('should return the song with highest vote variance', () => {
        // Song 1: votes [5, 5, 5] - variance = 0
        // Song 2: votes [1, 10] - variance = 20.25
        // Song 3: votes [4, 6] - variance = 1
        const songs = [
          createMockSong({ 
            id: 'song-1', 
            voteDistribution: [0, 0, 0, 0, 3, 0, 0, 0, 0, 0] // 3 votes of 5
          }),
          createMockSong({ 
            id: 'song-2', 
            voteDistribution: [1, 0, 0, 0, 0, 0, 0, 0, 0, 1] // 1 vote of 1, 1 vote of 10
          }),
          createMockSong({ 
            id: 'song-3', 
            voteDistribution: [0, 0, 0, 1, 0, 1, 0, 0, 0, 0] // 1 vote of 4, 1 vote of 6
          }),
        ];

        const winner = scoringService.calculateCultClassic(songs);
        expect(winner).not.toBeNull();
        expect(winner!.id).toBe('song-2');
      });

      it('should handle single song with votes', () => {
        const songs = [
          createMockSong({ 
            id: 'song-1', 
            voteDistribution: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0] // 2 votes of 5
          }),
        ];

        const winner = scoringService.calculateCultClassic(songs);
        expect(winner).not.toBeNull();
        expect(winner!.id).toBe('song-1');
      });

      it('should ignore songs without vote distributions', () => {
        const songs = [
          createMockSong({ id: 'song-1', voteDistribution: null }),
          createMockSong({ 
            id: 'song-2', 
            voteDistribution: [1, 0, 0, 0, 0, 0, 0, 0, 0, 1] // polarizing
          }),
        ];

        const winner = scoringService.calculateCultClassic(songs);
        expect(winner).not.toBeNull();
        expect(winner!.id).toBe('song-2');
      });
    });

    /**
     * Tests for Requirement 7.4:
     * WHEN calculating "Hidden Gem", THE Backend SHALL award it to the highest-scoring song with Confidence level 2 or lower
     * 
     * **Property 34: Hidden Gem Winner**
     */
    describe('calculateHiddenGem (Requirement 7.4, Property 34)', () => {
      it('should return null for empty songs array', () => {
        const winner = scoringService.calculateHiddenGem([]);
        expect(winner).toBeNull();
      });

      it('should return null when no songs have confidence <= 2', () => {
        const songs = [
          createMockSong({ id: 'song-1', confidence: 3, weightedScore: 20.0 }),
          createMockSong({ id: 'song-2', confidence: 4, weightedScore: 25.0 }),
          createMockSong({ id: 'song-3', confidence: 5, weightedScore: 30.0 }),
        ];

        const winner = scoringService.calculateHiddenGem(songs);
        expect(winner).toBeNull();
      });

      it('should return null when qualifying songs have no weighted scores', () => {
        const songs = [
          createMockSong({ id: 'song-1', confidence: 1, weightedScore: null }),
          createMockSong({ id: 'song-2', confidence: 2, weightedScore: null }),
        ];

        const winner = scoringService.calculateHiddenGem(songs);
        expect(winner).toBeNull();
      });

      it('should return highest-scoring song with confidence = 1', () => {
        const songs = [
          createMockSong({ id: 'song-1', confidence: 1, weightedScore: 15.0 }),
          createMockSong({ id: 'song-2', confidence: 1, weightedScore: 20.0 }),
          createMockSong({ id: 'song-3', confidence: 3, weightedScore: 25.0 }),
        ];

        const winner = scoringService.calculateHiddenGem(songs);
        expect(winner).not.toBeNull();
        expect(winner!.id).toBe('song-2');
        expect(winner!.confidence).toBe(1);
      });

      it('should return highest-scoring song with confidence = 2', () => {
        const songs = [
          createMockSong({ id: 'song-1', confidence: 2, weightedScore: 18.0 }),
          createMockSong({ id: 'song-2', confidence: 2, weightedScore: 12.0 }),
          createMockSong({ id: 'song-3', confidence: 4, weightedScore: 30.0 }),
        ];

        const winner = scoringService.calculateHiddenGem(songs);
        expect(winner).not.toBeNull();
        expect(winner!.id).toBe('song-1');
        expect(winner!.confidence).toBe(2);
      });

      it('should consider both confidence 1 and 2 songs', () => {
        const songs = [
          createMockSong({ id: 'song-1', confidence: 1, weightedScore: 10.0 }),
          createMockSong({ id: 'song-2', confidence: 2, weightedScore: 22.0 }),
          createMockSong({ id: 'song-3', confidence: 3, weightedScore: 30.0 }),
        ];

        const winner = scoringService.calculateHiddenGem(songs);
        expect(winner).not.toBeNull();
        expect(winner!.id).toBe('song-2');
        expect(winner!.weightedScore).toBe(22.0);
      });

      it('should ignore high confidence songs even with higher scores', () => {
        const songs = [
          createMockSong({ id: 'song-1', confidence: 2, weightedScore: 15.0 }),
          createMockSong({ id: 'song-2', confidence: 5, weightedScore: 50.0 }),
        ];

        const winner = scoringService.calculateHiddenGem(songs);
        expect(winner).not.toBeNull();
        expect(winner!.id).toBe('song-1');
      });
    });

    /**
     * Tests for Requirement 7.5:
     * WHEN calculating "Bold Move", THE Backend SHALL award it to the highest-scoring song with Confidence level 5
     * 
     * **Property 35: Bold Move Winner**
     */
    describe('calculateBoldMove (Requirement 7.5, Property 35)', () => {
      it('should return null for empty songs array', () => {
        const winner = scoringService.calculateBoldMove([]);
        expect(winner).toBeNull();
      });

      it('should return null when no songs have confidence = 5', () => {
        const songs = [
          createMockSong({ id: 'song-1', confidence: 1, weightedScore: 20.0 }),
          createMockSong({ id: 'song-2', confidence: 3, weightedScore: 25.0 }),
          createMockSong({ id: 'song-3', confidence: 4, weightedScore: 30.0 }),
        ];

        const winner = scoringService.calculateBoldMove(songs);
        expect(winner).toBeNull();
      });

      it('should return null when qualifying songs have no weighted scores', () => {
        const songs = [
          createMockSong({ id: 'song-1', confidence: 5, weightedScore: null }),
          createMockSong({ id: 'song-2', confidence: 5, weightedScore: null }),
        ];

        const winner = scoringService.calculateBoldMove(songs);
        expect(winner).toBeNull();
      });

      it('should return highest-scoring song with confidence = 5', () => {
        const songs = [
          createMockSong({ id: 'song-1', confidence: 5, weightedScore: 15.0 }),
          createMockSong({ id: 'song-2', confidence: 5, weightedScore: 25.0 }),
          createMockSong({ id: 'song-3', confidence: 5, weightedScore: 20.0 }),
        ];

        const winner = scoringService.calculateBoldMove(songs);
        expect(winner).not.toBeNull();
        expect(winner!.id).toBe('song-2');
        expect(winner!.weightedScore).toBe(25.0);
      });

      it('should only consider confidence = 5 songs (not 4)', () => {
        const songs = [
          createMockSong({ id: 'song-1', confidence: 4, weightedScore: 50.0 }),
          createMockSong({ id: 'song-2', confidence: 5, weightedScore: 20.0 }),
        ];

        const winner = scoringService.calculateBoldMove(songs);
        expect(winner).not.toBeNull();
        expect(winner!.id).toBe('song-2');
        expect(winner!.confidence).toBe(5);
      });

      it('should handle single qualifying song', () => {
        const songs = [
          createMockSong({ id: 'song-1', confidence: 3, weightedScore: 30.0 }),
          createMockSong({ id: 'song-2', confidence: 5, weightedScore: 15.0 }),
        ];

        const winner = scoringService.calculateBoldMove(songs);
        expect(winner).not.toBeNull();
        expect(winner!.id).toBe('song-2');
      });

      it('should return first song when multiple have same highest score', () => {
        const songs = [
          createMockSong({ id: 'song-1', confidence: 5, weightedScore: 20.0 }),
          createMockSong({ id: 'song-2', confidence: 5, weightedScore: 20.0 }),
        ];

        const winner = scoringService.calculateBoldMove(songs);
        expect(winner).not.toBeNull();
        expect(winner!.id).toBe('song-1');
      });
    });

    /**
     * Tests for BONUS_CATEGORIES constant
     */
    describe('BONUS_CATEGORIES', () => {
      it('should have exactly 4 bonus categories', () => {
        expect(BONUS_CATEGORIES).toHaveLength(4);
      });

      it('should have all required category IDs', () => {
        const ids = BONUS_CATEGORIES.map(c => c.id);
        expect(ids).toContain('crowd-favorite');
        expect(ids).toContain('cult-classic');
        expect(ids).toContain('hidden-gem');
        expect(ids).toContain('bold-move');
      });

      it('should have 10 points for each category', () => {
        for (const category of BONUS_CATEGORIES) {
          expect(category.points).toBe(10);
        }
      });

      it('should have calculate functions that work correctly', () => {
        const songs = [
          createMockSong({ id: 'song-1', confidence: 2, weightedScore: 15.0, voteDistribution: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0] }),
          createMockSong({ id: 'song-2', confidence: 5, weightedScore: 25.0, voteDistribution: [1, 0, 0, 0, 0, 0, 0, 0, 0, 1] }),
          createMockSong({ id: 'song-3', confidence: 3, weightedScore: 20.0, voteDistribution: [0, 0, 0, 1, 0, 1, 0, 0, 0, 0] }),
        ];

        // Crowd Favorite: highest weighted score = song-2 (25.0)
        const crowdFavorite = BONUS_CATEGORIES.find(c => c.id === 'crowd-favorite');
        expect(crowdFavorite!.calculate(songs)?.id).toBe('song-2');

        // Cult Classic: highest variance = song-2 (polarizing votes 1 and 10)
        const cultClassic = BONUS_CATEGORIES.find(c => c.id === 'cult-classic');
        expect(cultClassic!.calculate(songs)?.id).toBe('song-2');

        // Hidden Gem: highest score with confidence <= 2 = song-1
        const hiddenGem = BONUS_CATEGORIES.find(c => c.id === 'hidden-gem');
        expect(hiddenGem!.calculate(songs)?.id).toBe('song-1');

        // Bold Move: highest score with confidence = 5 = song-2
        const boldMove = BONUS_CATEGORIES.find(c => c.id === 'bold-move');
        expect(boldMove!.calculate(songs)?.id).toBe('song-2');
      });

      it('should have icons for each category', () => {
        for (const category of BONUS_CATEGORIES) {
          expect(category.icon).toBeTruthy();
          expect(category.icon.length).toBeGreaterThan(0);
        }
      });

      it('should have descriptions for each category', () => {
        for (const category of BONUS_CATEGORIES) {
          expect(category.description).toBeTruthy();
          expect(category.description.length).toBeGreaterThan(0);
        }
      });

      it('should have names for each category', () => {
        const names = BONUS_CATEGORIES.map(c => c.name);
        expect(names).toContain('Crowd Favorite');
        expect(names).toContain('Cult Classic');
        expect(names).toContain('Hidden Gem');
        expect(names).toContain('Bold Move');
      });
    });
  });

  /**
   * Tests for selectBonusCategories
   * 
   * **Validates: Requirements 7.1**
   * - 7.1: WHEN the Party enters FINALE state, THE Backend SHALL select N random Bonus_Categories where N is the bonusCategoryCount setting
   */
  describe('selectBonusCategories', () => {
    it('should return empty array when count is 0', async () => {
      const { party } = await partyService.createParty('TestHost');

      const categories = await scoringService.selectBonusCategories(party.id, 0);

      expect(categories).toHaveLength(0);
    });

    it('should return empty array when count is negative', async () => {
      const { party } = await partyService.createParty('TestHost');

      const categories = await scoringService.selectBonusCategories(party.id, -1);

      expect(categories).toHaveLength(0);
    });

    it('should return 1 category when count is 1', async () => {
      const { party } = await partyService.createParty('TestHost');

      const categories = await scoringService.selectBonusCategories(party.id, 1);

      expect(categories).toHaveLength(1);
      expect(BONUS_CATEGORIES.map(c => c.id)).toContain(categories[0].id);
    });

    it('should return 2 categories when count is 2', async () => {
      const { party } = await partyService.createParty('TestHost');

      const categories = await scoringService.selectBonusCategories(party.id, 2);

      expect(categories).toHaveLength(2);
      // All returned categories should be from BONUS_CATEGORIES
      for (const category of categories) {
        expect(BONUS_CATEGORIES.map(c => c.id)).toContain(category.id);
      }
      // Categories should be unique
      const ids = categories.map(c => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should return 3 categories when count is 3', async () => {
      const { party } = await partyService.createParty('TestHost');

      const categories = await scoringService.selectBonusCategories(party.id, 3);

      expect(categories).toHaveLength(3);
      // All returned categories should be from BONUS_CATEGORIES
      for (const category of categories) {
        expect(BONUS_CATEGORIES.map(c => c.id)).toContain(category.id);
      }
      // Categories should be unique
      const ids = categories.map(c => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should return all 4 categories when count is 4 or more', async () => {
      const { party } = await partyService.createParty('TestHost');

      const categories = await scoringService.selectBonusCategories(party.id, 4);

      expect(categories).toHaveLength(4);
      // Should contain all bonus categories
      const ids = categories.map(c => c.id);
      expect(ids).toContain('crowd-favorite');
      expect(ids).toContain('cult-classic');
      expect(ids).toContain('hidden-gem');
      expect(ids).toContain('bold-move');
    });

    it('should return all categories when count exceeds available categories', async () => {
      const { party } = await partyService.createParty('TestHost');

      const categories = await scoringService.selectBonusCategories(party.id, 10);

      expect(categories).toHaveLength(4);
    });

    it('should throw PARTY_NOT_FOUND when party does not exist', async () => {
      try {
        await scoringService.selectBonusCategories('non-existent-party-id', 2);
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.code).toBe('PARTY_NOT_FOUND');
      }
    });

    it('should return categories with valid calculate functions', async () => {
      const { party } = await partyService.createParty('TestHost');

      const categories = await scoringService.selectBonusCategories(party.id, 2);

      for (const category of categories) {
        expect(typeof category.calculate).toBe('function');
        expect(category.points).toBe(10);
      }
    });
  });

  /**
   * Tests for calculateBonusWinners
   * 
   * **Validates: Requirements 7.1, 7.6, 7.7**
   * - 7.1: WHEN the Party enters FINALE state, THE Backend SHALL select N random Bonus_Categories where N is the bonusCategoryCount setting
   * - 7.6: WHEN a Bonus_Category winner is determined, THE Backend SHALL award 10 bonus points to the winning Player
   * - 7.7: WHEN a Bonus_Category has no qualifying songs, THE Backend SHALL skip that category
   * 
   * **Property 36: Bonus Points Award**
   */
  describe('calculateBonusWinners', () => {
    // Helper to create a party with songs and votes
    async function createPartyWithVotedSongs(bonusCategoryCount: 0 | 1 | 2 | 3 = 2) {
      const { party, host } = await partyService.createParty('TestHost');
      const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
      const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

      // Update settings
      await partyService.updateSettings(party.id, host.id, { 
        bonusCategoryCount,
        songsPerPlayer: 1,
      });

      // Transition to SUBMITTING state
      await prisma.party.update({
        where: { id: party.id },
        data: { status: PartyStatus.SUBMITTING },
      });

      const songData: SongSubmission = {
        soundcloudId: 123456,
        title: 'Test Song',
        artist: 'Test Artist',
        artworkUrl: 'https://example.com/art.jpg',
        duration: 180000,
        permalinkUrl: 'https://soundcloud.com/test/song',
        confidence: 3,
      };

      // Submit songs with different confidence levels
      const hostSong = await songService.submitSong(party.id, host.id, {
        ...songData,
        title: 'Host Song',
        soundcloudId: 111111,
        confidence: 5, // Bold Move candidate
      });

      const player2Song = await songService.submitSong(party.id, player2.id, {
        ...songData,
        title: 'Player2 Song',
        soundcloudId: 222222,
        confidence: 2, // Hidden Gem candidate
      });

      const player3Song = await songService.submitSong(party.id, player3.id, {
        ...songData,
        title: 'Player3 Song',
        soundcloudId: 333333,
        confidence: 3,
      });

      // Cast votes to create scores
      // Host song gets high votes (8, 9) - avg 8.5
      await scoringService.castVote(hostSong.id, player2.id, 8);
      await scoringService.castVote(hostSong.id, player3.id, 9);

      // Player2 song gets medium votes (6, 7) - avg 6.5
      await scoringService.castVote(player2Song.id, host.id, 6);
      await scoringService.castVote(player2Song.id, player3.id, 7);

      // Player3 song gets polarizing votes (2, 10) - avg 6, high variance
      await scoringService.castVote(player3Song.id, host.id, 2);
      await scoringService.castVote(player3Song.id, player2.id, 10);

      // Calculate scores for all songs
      await scoringService.calculateSongScore(hostSong.id);
      await scoringService.calculateSongScore(player2Song.id);
      await scoringService.calculateSongScore(player3Song.id);

      return {
        party,
        host,
        player2,
        player3,
        hostSong,
        player2Song,
        player3Song,
      };
    }

    it('should return empty array when bonusCategoryCount is 0', async () => {
      const { party } = await createPartyWithVotedSongs(0);

      const results = await scoringService.calculateBonusWinners(party.id);

      expect(results).toHaveLength(0);
    });

    it('should return bonus results when bonusCategoryCount is 1', async () => {
      const { party } = await createPartyWithVotedSongs(1);

      const results = await scoringService.calculateBonusWinners(party.id);

      expect(results.length).toBeGreaterThanOrEqual(0);
      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('should return bonus results when bonusCategoryCount is 2', async () => {
      const { party } = await createPartyWithVotedSongs(2);

      const results = await scoringService.calculateBonusWinners(party.id);

      expect(results.length).toBeGreaterThanOrEqual(0);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should award exactly 10 points for each bonus category (Requirement 7.6, Property 36)', async () => {
      const { party } = await createPartyWithVotedSongs(3);

      const results = await scoringService.calculateBonusWinners(party.id);

      for (const result of results) {
        expect(result.points).toBe(10);
      }
    });

    it('should store BonusResult records in database', async () => {
      const { party } = await createPartyWithVotedSongs(2);

      const results = await scoringService.calculateBonusWinners(party.id);

      // Verify records are in database
      const dbResults = await prisma.bonusResult.findMany({
        where: { partyId: party.id },
      });

      expect(dbResults.length).toBe(results.length);
      for (const result of results) {
        const dbResult = dbResults.find(r => r.id === result.id);
        expect(dbResult).toBeDefined();
        expect(dbResult?.points).toBe(10);
      }
    });

    it('should set correct revealOrder for each result', async () => {
      const { party } = await createPartyWithVotedSongs(3);

      const results = await scoringService.calculateBonusWinners(party.id);

      // Verify reveal orders are sequential starting from 1
      const revealOrders = results.map(r => r.revealOrder).sort((a, b) => a - b);
      for (let i = 0; i < revealOrders.length; i++) {
        expect(revealOrders[i]).toBe(i + 1);
      }
    });

    it('should include winningSongId and winnerPlayerId in results', async () => {
      const { party, host, player2, player3, hostSong, player2Song, player3Song } = await createPartyWithVotedSongs(2);

      const results = await scoringService.calculateBonusWinners(party.id);

      const validSongIds = [hostSong.id, player2Song.id, player3Song.id];
      const validPlayerIds = [host.id, player2.id, player3.id];

      for (const result of results) {
        expect(validSongIds).toContain(result.winningSongId);
        expect(validPlayerIds).toContain(result.winnerPlayerId);
      }
    });

    it('should throw PARTY_NOT_FOUND when party does not exist', async () => {
      try {
        await scoringService.calculateBonusWinners('non-existent-party-id');
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.code).toBe('PARTY_NOT_FOUND');
      }
    });

    it('should skip categories with no qualifying songs (Requirement 7.7)', async () => {
      // Create a party where no songs qualify for certain categories
      const { party, host } = await partyService.createParty('TestHost');
      const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
      const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

      // Set bonusCategoryCount to 3 (will try to select 3 categories)
      await partyService.updateSettings(party.id, host.id, { 
        bonusCategoryCount: 3,
        songsPerPlayer: 1,
      });

      await prisma.party.update({
        where: { id: party.id },
        data: { status: PartyStatus.SUBMITTING },
      });

      const songData: SongSubmission = {
        soundcloudId: 123456,
        title: 'Test Song',
        artist: 'Test Artist',
        artworkUrl: 'https://example.com/art.jpg',
        duration: 180000,
        permalinkUrl: 'https://soundcloud.com/test/song',
        confidence: 3, // Middle confidence - won't qualify for Hidden Gem or Bold Move
      };

      // All songs have confidence 3 - won't qualify for Hidden Gem (needs <=2) or Bold Move (needs =5)
      const hostSong = await songService.submitSong(party.id, host.id, {
        ...songData,
        soundcloudId: 111111,
        confidence: 3,
      });

      const player2Song = await songService.submitSong(party.id, player2.id, {
        ...songData,
        soundcloudId: 222222,
        confidence: 3,
      });

      const player3Song = await songService.submitSong(party.id, player3.id, {
        ...songData,
        soundcloudId: 333333,
        confidence: 3,
      });

      // Cast votes
      await scoringService.castVote(hostSong.id, player2.id, 8);
      await scoringService.castVote(hostSong.id, player3.id, 7);
      await scoringService.castVote(player2Song.id, host.id, 6);
      await scoringService.castVote(player2Song.id, player3.id, 5);
      await scoringService.castVote(player3Song.id, host.id, 4);
      await scoringService.castVote(player3Song.id, player2.id, 3);

      // Calculate scores
      await scoringService.calculateSongScore(hostSong.id);
      await scoringService.calculateSongScore(player2Song.id);
      await scoringService.calculateSongScore(player3Song.id);

      const results = await scoringService.calculateBonusWinners(party.id);

      // Should have fewer results than bonusCategoryCount because some categories have no qualifying songs
      // Crowd Favorite and Cult Classic should work, but Hidden Gem and Bold Move won't
      // The actual number depends on which categories were randomly selected
      expect(results.length).toBeLessThanOrEqual(3);
      
      // Verify no Hidden Gem or Bold Move winners (since no songs qualify)
      const hiddenGemResult = results.find(r => r.categoryId === 'hidden-gem');
      const boldMoveResult = results.find(r => r.categoryId === 'bold-move');
      expect(hiddenGemResult).toBeUndefined();
      expect(boldMoveResult).toBeUndefined();
    });

    it('should include categoryId and categoryName in results', async () => {
      const { party } = await createPartyWithVotedSongs(2);

      const results = await scoringService.calculateBonusWinners(party.id);

      const validCategoryIds = BONUS_CATEGORIES.map(c => c.id);
      const validCategoryNames = BONUS_CATEGORIES.map(c => c.name);

      for (const result of results) {
        expect(validCategoryIds).toContain(result.categoryId);
        expect(validCategoryNames).toContain(result.categoryName);
      }
    });
  });

  /**
   * Tests for getBonusResults
   */
  describe('getBonusResults', () => {
    it('should return empty array when no bonus results exist', async () => {
      const { party } = await partyService.createParty('TestHost');

      const results = await scoringService.getBonusResults(party.id);

      expect(results).toHaveLength(0);
    });

    it('should return bonus results ordered by revealOrder', async () => {
      const { party, host } = await partyService.createParty('TestHost');
      const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
      const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

      await partyService.updateSettings(party.id, host.id, { 
        bonusCategoryCount: 3,
        songsPerPlayer: 1,
      });

      await prisma.party.update({
        where: { id: party.id },
        data: { status: PartyStatus.SUBMITTING },
      });

      const songData: SongSubmission = {
        soundcloudId: 123456,
        title: 'Test Song',
        artist: 'Test Artist',
        artworkUrl: 'https://example.com/art.jpg',
        duration: 180000,
        permalinkUrl: 'https://soundcloud.com/test/song',
        confidence: 5,
      };

      const hostSong = await songService.submitSong(party.id, host.id, {
        ...songData,
        soundcloudId: 111111,
        confidence: 5,
      });

      const player2Song = await songService.submitSong(party.id, player2.id, {
        ...songData,
        soundcloudId: 222222,
        confidence: 2,
      });

      const player3Song = await songService.submitSong(party.id, player3.id, {
        ...songData,
        soundcloudId: 333333,
        confidence: 3,
      });

      await scoringService.castVote(hostSong.id, player2.id, 9);
      await scoringService.castVote(hostSong.id, player3.id, 8);
      await scoringService.castVote(player2Song.id, host.id, 7);
      await scoringService.castVote(player2Song.id, player3.id, 6);
      await scoringService.castVote(player3Song.id, host.id, 2);
      await scoringService.castVote(player3Song.id, player2.id, 10);

      await scoringService.calculateSongScore(hostSong.id);
      await scoringService.calculateSongScore(player2Song.id);
      await scoringService.calculateSongScore(player3Song.id);

      // Calculate bonus winners
      await scoringService.calculateBonusWinners(party.id);

      // Get results
      const results = await scoringService.getBonusResults(party.id);

      // Verify results are ordered by revealOrder
      for (let i = 1; i < results.length; i++) {
        expect(results[i].revealOrder).toBeGreaterThan(results[i - 1].revealOrder);
      }
    });
  });

  /**
   * Tests for calculatePlayerBonusPoints
   * 
   * **Validates: Requirements 7.6**
   * - 7.6: WHEN a Bonus_Category winner is determined, THE Backend SHALL award 10 bonus points to the winning Player
   */
  describe('calculatePlayerBonusPoints', () => {
    it('should return 0 when player has no bonus wins', async () => {
      const { party, host } = await partyService.createParty('TestHost');
      const { player: player2 } = await partyService.joinParty(party.code, 'Player2');

      const bonusPoints = await scoringService.calculatePlayerBonusPoints(player2.id, party.id);

      expect(bonusPoints).toBe(0);
    });

    it('should return 10 when player has 1 bonus win', async () => {
      const { party, host } = await partyService.createParty('TestHost');
      const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
      const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

      await partyService.updateSettings(party.id, host.id, { 
        bonusCategoryCount: 1,
        songsPerPlayer: 1,
      });

      await prisma.party.update({
        where: { id: party.id },
        data: { status: PartyStatus.SUBMITTING },
      });

      const songData: SongSubmission = {
        soundcloudId: 123456,
        title: 'Test Song',
        artist: 'Test Artist',
        artworkUrl: 'https://example.com/art.jpg',
        duration: 180000,
        permalinkUrl: 'https://soundcloud.com/test/song',
        confidence: 3,
      };

      // Host submits a song that will win
      const hostSong = await songService.submitSong(party.id, host.id, {
        ...songData,
        soundcloudId: 111111,
        confidence: 5,
      });

      const player2Song = await songService.submitSong(party.id, player2.id, {
        ...songData,
        soundcloudId: 222222,
        confidence: 2,
      });

      const player3Song = await songService.submitSong(party.id, player3.id, {
        ...songData,
        soundcloudId: 333333,
        confidence: 3,
      });

      // Give host's song the highest score
      await scoringService.castVote(hostSong.id, player2.id, 10);
      await scoringService.castVote(hostSong.id, player3.id, 10);
      await scoringService.castVote(player2Song.id, host.id, 5);
      await scoringService.castVote(player2Song.id, player3.id, 5);
      await scoringService.castVote(player3Song.id, host.id, 3);
      await scoringService.castVote(player3Song.id, player2.id, 3);

      await scoringService.calculateSongScore(hostSong.id);
      await scoringService.calculateSongScore(player2Song.id);
      await scoringService.calculateSongScore(player3Song.id);

      // Calculate bonus winners
      const results = await scoringService.calculateBonusWinners(party.id);

      if (results.length > 0) {
        // Find the winner
        const winnerId = results[0].winnerPlayerId;
        const bonusPoints = await scoringService.calculatePlayerBonusPoints(winnerId, party.id);
        expect(bonusPoints).toBe(10);
      }
    });

    it('should return 20 when player has 2 bonus wins', async () => {
      const { party, host } = await partyService.createParty('TestHost');
      const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
      const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

      await prisma.party.update({
        where: { id: party.id },
        data: { status: PartyStatus.SUBMITTING },
      });

      const songData: SongSubmission = {
        soundcloudId: 123456,
        title: 'Test Song',
        artist: 'Test Artist',
        artworkUrl: 'https://example.com/art.jpg',
        duration: 180000,
        permalinkUrl: 'https://soundcloud.com/test/song',
        confidence: 3,
      };

      // Create a real song for the bonus results
      const hostSong = await songService.submitSong(party.id, host.id, {
        ...songData,
        soundcloudId: 111111,
      });

      // Create bonus results directly for testing
      await prisma.bonusResult.create({
        data: {
          id: 'bonus-1',
          partyId: party.id,
          categoryId: 'crowd-favorite',
          categoryName: 'Crowd Favorite',
          winningSongId: hostSong.id,
          winnerPlayerId: host.id,
          points: 10,
          revealOrder: 1,
        },
      });

      await prisma.bonusResult.create({
        data: {
          id: 'bonus-2',
          partyId: party.id,
          categoryId: 'bold-move',
          categoryName: 'Bold Move',
          winningSongId: hostSong.id,
          winnerPlayerId: host.id,
          points: 10,
          revealOrder: 2,
        },
      });

      const bonusPoints = await scoringService.calculatePlayerBonusPoints(host.id, party.id);

      expect(bonusPoints).toBe(20);
    });
  });

  /**
   * Tests for calculateFinalStandings
   * 
   * **Validates: Requirements 8.1**
   * - 8.1: WHEN the Party enters FINALE state, THE Backend SHALL calculate final standings by summing base scores, confidence modifiers, and bonus points
   * 
   * **Property 37: Final Score Composition**
   * For any player in finale, their final score should equal (sum of weighted song scores) + (confidence modifiers) + (bonus points).
   */
  describe('calculateFinalStandings', () => {
    describe('basic functionality', () => {
      it('should return empty array when party has no players', async () => {
        const { party } = await partyService.createParty('TestHost');
        
        // Remove all players
        await prisma.player.deleteMany({ where: { partyId: party.id } });

        const standings = await scoringService.calculateFinalStandings(party.id);

        expect(standings).toHaveLength(0);
      });

      it('should throw PARTY_NOT_FOUND when party does not exist', async () => {
        try {
          await scoringService.calculateFinalStandings('non-existent-party-id');
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('PARTY_NOT_FOUND');
        }
      });

      it('should return standings for all players in the party', async () => {
        const { party, host, player2, player3 } = await createTestPartyWithSongs();

        // Cast votes
        await scoringService.castVote((await prisma.song.findFirst({ where: { submitterId: host.id } }))!.id, player2.id, 8);
        await scoringService.castVote((await prisma.song.findFirst({ where: { submitterId: host.id } }))!.id, player3.id, 7);
        await scoringService.castVote((await prisma.song.findFirst({ where: { submitterId: player2.id } }))!.id, host.id, 6);
        await scoringService.castVote((await prisma.song.findFirst({ where: { submitterId: player2.id } }))!.id, player3.id, 5);
        await scoringService.castVote((await prisma.song.findFirst({ where: { submitterId: player3.id } }))!.id, host.id, 4);
        await scoringService.castVote((await prisma.song.findFirst({ where: { submitterId: player3.id } }))!.id, player2.id, 3);

        const standings = await scoringService.calculateFinalStandings(party.id);

        expect(standings).toHaveLength(3);
        expect(standings.map(s => s.playerId).sort()).toEqual([host.id, player2.id, player3.id].sort());
      });
    });

    describe('score composition (Requirement 8.1, Property 37)', () => {
      it('should calculate finalScore as sum of totalBaseScore + confidenceModifiers + bonusPoints', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

        // Enable confidence betting
        await partyService.updateSettings(party.id, host.id, { 
          enableConfidenceBetting: true,
          songsPerPlayer: 1,
        });

        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData: SongSubmission = {
          soundcloudId: 123456,
          title: 'Test Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test/song',
          confidence: 5, // High confidence for bonus
        };

        // Host submits a song with high confidence
        const hostSong = await songService.submitSong(party.id, host.id, {
          ...songData,
          soundcloudId: 111111,
          confidence: 5,
        });

        const player2Song = await songService.submitSong(party.id, player2.id, {
          ...songData,
          soundcloudId: 222222,
          confidence: 2,
        });

        const player3Song = await songService.submitSong(party.id, player3.id, {
          ...songData,
          soundcloudId: 333333,
          confidence: 3,
        });

        // Give host's song high votes (avg >= 7 for confidence bonus)
        await scoringService.castVote(hostSong.id, player2.id, 9);
        await scoringService.castVote(hostSong.id, player3.id, 9);
        await scoringService.castVote(player2Song.id, host.id, 5);
        await scoringService.castVote(player2Song.id, player3.id, 5);
        await scoringService.castVote(player3Song.id, host.id, 4);
        await scoringService.castVote(player3Song.id, player2.id, 4);

        const standings = await scoringService.calculateFinalStandings(party.id);

        // Find host's standing
        const hostStanding = standings.find(s => s.playerId === host.id);
        expect(hostStanding).toBeDefined();

        // Verify finalScore = totalBaseScore + confidenceModifiers + bonusPoints
        expect(hostStanding!.finalScore).toBe(
          hostStanding!.totalBaseScore + hostStanding!.confidenceModifiers + hostStanding!.bonusPoints
        );

        // Host should have confidence bonus (+2) because confidence=5 and avg=9
        expect(hostStanding!.confidenceModifiers).toBe(2);
      });

      it('should include bonus points in final score', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData: SongSubmission = {
          soundcloudId: 123456,
          title: 'Test Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test/song',
          confidence: 3,
        };

        const hostSong = await songService.submitSong(party.id, host.id, {
          ...songData,
          soundcloudId: 111111,
        });

        const player2Song = await songService.submitSong(party.id, player2.id, {
          ...songData,
          soundcloudId: 222222,
        });

        const player3Song = await songService.submitSong(party.id, player3.id, {
          ...songData,
          soundcloudId: 333333,
        });

        // Cast votes
        await scoringService.castVote(hostSong.id, player2.id, 8);
        await scoringService.castVote(hostSong.id, player3.id, 8);
        await scoringService.castVote(player2Song.id, host.id, 5);
        await scoringService.castVote(player2Song.id, player3.id, 5);
        await scoringService.castVote(player3Song.id, host.id, 3);
        await scoringService.castVote(player3Song.id, player2.id, 3);

        // Calculate song scores
        await scoringService.calculateSongScore(hostSong.id);
        await scoringService.calculateSongScore(player2Song.id);
        await scoringService.calculateSongScore(player3Song.id);

        // Create a bonus result for the host
        await prisma.bonusResult.create({
          data: {
            id: 'bonus-test-1',
            partyId: party.id,
            categoryId: 'crowd-favorite',
            categoryName: 'Crowd Favorite',
            winningSongId: hostSong.id,
            winnerPlayerId: host.id,
            points: 10,
            revealOrder: 1,
          },
        });

        const standings = await scoringService.calculateFinalStandings(party.id);

        const hostStanding = standings.find(s => s.playerId === host.id);
        expect(hostStanding).toBeDefined();
        expect(hostStanding!.bonusPoints).toBe(10);
        expect(hostStanding!.bonusCategories).toContain('Crowd Favorite');
      });
    });

    describe('ranking and sorting', () => {
      it('should sort standings by finalScore descending', async () => {
        const { party, host, player2, player3 } = await createTestPartyWithSongs();

        // Get songs
        const hostSong = (await prisma.song.findFirst({ where: { submitterId: host.id } }))!;
        const player2Song = (await prisma.song.findFirst({ where: { submitterId: player2.id } }))!;
        const player3Song = (await prisma.song.findFirst({ where: { submitterId: player3.id } }))!;

        // Give different scores to each player
        await scoringService.castVote(hostSong.id, player2.id, 10);
        await scoringService.castVote(hostSong.id, player3.id, 10);
        await scoringService.castVote(player2Song.id, host.id, 5);
        await scoringService.castVote(player2Song.id, player3.id, 5);
        await scoringService.castVote(player3Song.id, host.id, 2);
        await scoringService.castVote(player3Song.id, player2.id, 2);

        const standings = await scoringService.calculateFinalStandings(party.id);

        // Verify sorted by finalScore descending
        for (let i = 1; i < standings.length; i++) {
          expect(standings[i - 1].finalScore).toBeGreaterThanOrEqual(standings[i].finalScore);
        }

        // Host should be first (highest score)
        expect(standings[0].playerId).toBe(host.id);
        expect(standings[0].rank).toBe(1);
      });

      it('should assign rank 1 to the player with highest score', async () => {
        const { party, host, player2, player3 } = await createTestPartyWithSongs();

        const hostSong = (await prisma.song.findFirst({ where: { submitterId: host.id } }))!;
        const player2Song = (await prisma.song.findFirst({ where: { submitterId: player2.id } }))!;
        const player3Song = (await prisma.song.findFirst({ where: { submitterId: player3.id } }))!;

        await scoringService.castVote(hostSong.id, player2.id, 10);
        await scoringService.castVote(hostSong.id, player3.id, 10);
        await scoringService.castVote(player2Song.id, host.id, 5);
        await scoringService.castVote(player2Song.id, player3.id, 5);
        await scoringService.castVote(player3Song.id, host.id, 2);
        await scoringService.castVote(player3Song.id, player2.id, 2);

        const standings = await scoringService.calculateFinalStandings(party.id);

        expect(standings[0].rank).toBe(1);
        expect(standings[1].rank).toBe(2);
        expect(standings[2].rank).toBe(3);
      });
    });

    describe('tiebreaker logic', () => {
      it('should assign same rank to players with same finalScore', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData: SongSubmission = {
          soundcloudId: 123456,
          title: 'Test Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test/song',
          confidence: 3,
        };

        const hostSong = await songService.submitSong(party.id, host.id, {
          ...songData,
          soundcloudId: 111111,
        });

        const player2Song = await songService.submitSong(party.id, player2.id, {
          ...songData,
          soundcloudId: 222222,
        });

        const player3Song = await songService.submitSong(party.id, player3.id, {
          ...songData,
          soundcloudId: 333333,
        });

        // Give host and player2 the same score, player3 lower
        await scoringService.castVote(hostSong.id, player2.id, 8);
        await scoringService.castVote(hostSong.id, player3.id, 8);
        await scoringService.castVote(player2Song.id, host.id, 8);
        await scoringService.castVote(player2Song.id, player3.id, 8);
        await scoringService.castVote(player3Song.id, host.id, 4);
        await scoringService.castVote(player3Song.id, player2.id, 4);

        const standings = await scoringService.calculateFinalStandings(party.id);

        // Host and player2 should have same score and same rank
        const hostStanding = standings.find(s => s.playerId === host.id)!;
        const player2Standing = standings.find(s => s.playerId === player2.id)!;
        const player3Standing = standings.find(s => s.playerId === player3.id)!;

        expect(hostStanding.finalScore).toBe(player2Standing.finalScore);
        expect(hostStanding.rank).toBe(player2Standing.rank);
        expect(hostStanding.rank).toBe(1);
      });

      it('should skip ranks after ties (e.g., two 1st place, next is 3rd)', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData: SongSubmission = {
          soundcloudId: 123456,
          title: 'Test Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test/song',
          confidence: 3,
        };

        const hostSong = await songService.submitSong(party.id, host.id, {
          ...songData,
          soundcloudId: 111111,
        });

        const player2Song = await songService.submitSong(party.id, player2.id, {
          ...songData,
          soundcloudId: 222222,
        });

        const player3Song = await songService.submitSong(party.id, player3.id, {
          ...songData,
          soundcloudId: 333333,
        });

        // Give host and player2 the same high score, player3 lower
        await scoringService.castVote(hostSong.id, player2.id, 10);
        await scoringService.castVote(hostSong.id, player3.id, 10);
        await scoringService.castVote(player2Song.id, host.id, 10);
        await scoringService.castVote(player2Song.id, player3.id, 10);
        await scoringService.castVote(player3Song.id, host.id, 2);
        await scoringService.castVote(player3Song.id, player2.id, 2);

        const standings = await scoringService.calculateFinalStandings(party.id);

        // Find standings by player
        const hostStanding = standings.find(s => s.playerId === host.id)!;
        const player2Standing = standings.find(s => s.playerId === player2.id)!;
        const player3Standing = standings.find(s => s.playerId === player3.id)!;

        // Two players tied for 1st, so next rank should be 3rd
        expect(hostStanding.rank).toBe(1);
        expect(player2Standing.rank).toBe(1);
        expect(player3Standing.rank).toBe(3); // Skips 2nd place
      });
    });

    describe('song information', () => {
      it('should include all player songs in standing', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

        // Set to 2 songs per player
        await partyService.updateSettings(party.id, host.id, { songsPerPlayer: 2 });

        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData: SongSubmission = {
          soundcloudId: 123456,
          title: 'Test Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test/song',
          confidence: 3,
        };

        // Submit 2 songs for host
        const hostSong1 = await songService.submitSong(party.id, host.id, {
          ...songData,
          soundcloudId: 111111,
          title: 'Host Song 1',
        });

        const hostSong2 = await songService.submitSong(party.id, host.id, {
          ...songData,
          soundcloudId: 111112,
          title: 'Host Song 2',
        });

        // Submit songs for other players
        await songService.submitSong(party.id, player2.id, { ...songData, soundcloudId: 222221 });
        await songService.submitSong(party.id, player2.id, { ...songData, soundcloudId: 222222 });
        await songService.submitSong(party.id, player3.id, { ...songData, soundcloudId: 333331 });
        await songService.submitSong(party.id, player3.id, { ...songData, soundcloudId: 333332 });

        // Cast some votes
        await scoringService.castVote(hostSong1.id, player2.id, 8);
        await scoringService.castVote(hostSong2.id, player2.id, 6);

        const standings = await scoringService.calculateFinalStandings(party.id);

        const hostStanding = standings.find(s => s.playerId === host.id)!;
        expect(hostStanding.songs).toHaveLength(2);
        expect(hostStanding.songs.map(s => s.id).sort()).toEqual([hostSong1.id, hostSong2.id].sort());
      });

      it('should identify highest and lowest scoring songs', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

        // Set to 2 songs per player
        await partyService.updateSettings(party.id, host.id, { songsPerPlayer: 2 });

        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData: SongSubmission = {
          soundcloudId: 123456,
          title: 'Test Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test/song',
          confidence: 3,
        };

        // Submit 2 songs for host
        const hostSong1 = await songService.submitSong(party.id, host.id, {
          ...songData,
          soundcloudId: 111111,
          title: 'Host Song 1 - High',
        });

        const hostSong2 = await songService.submitSong(party.id, host.id, {
          ...songData,
          soundcloudId: 111112,
          title: 'Host Song 2 - Low',
        });

        // Submit songs for other players
        await songService.submitSong(party.id, player2.id, { ...songData, soundcloudId: 222221 });
        await songService.submitSong(party.id, player2.id, { ...songData, soundcloudId: 222222 });
        await songService.submitSong(party.id, player3.id, { ...songData, soundcloudId: 333331 });
        await songService.submitSong(party.id, player3.id, { ...songData, soundcloudId: 333332 });

        // Give hostSong1 high score, hostSong2 low score
        await scoringService.castVote(hostSong1.id, player2.id, 10);
        await scoringService.castVote(hostSong1.id, player3.id, 10);
        await scoringService.castVote(hostSong2.id, player2.id, 2);
        await scoringService.castVote(hostSong2.id, player3.id, 2);

        const standings = await scoringService.calculateFinalStandings(party.id);

        const hostStanding = standings.find(s => s.playerId === host.id)!;
        expect(hostStanding.highestSong.id).toBe(hostSong1.id);
        expect(hostStanding.lowestSong.id).toBe(hostSong2.id);
      });
    });

    describe('player information', () => {
      it('should include player alias from identity', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

        // Assign identities
        const { identityService } = await import('../identity.service');
        await identityService.assignIdentities(party.id, [host, player2, player3]);

        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData: SongSubmission = {
          soundcloudId: 123456,
          title: 'Test Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test/song',
          confidence: 3,
        };

        await songService.submitSong(party.id, host.id, { ...songData, soundcloudId: 111111 });
        await songService.submitSong(party.id, player2.id, { ...songData, soundcloudId: 222222 });
        await songService.submitSong(party.id, player3.id, { ...songData, soundcloudId: 333333 });

        const standings = await scoringService.calculateFinalStandings(party.id);

        // All standings should have aliases
        for (const standing of standings) {
          expect(standing.alias).toBeDefined();
          expect(standing.alias).not.toBe('Unknown');
        }
      });

      it('should include player real name', async () => {
        const { party, host, player2, player3 } = await createTestPartyWithSongs();

        const standings = await scoringService.calculateFinalStandings(party.id);

        const hostStanding = standings.find(s => s.playerId === host.id)!;
        expect(hostStanding.realName).toBe('TestHost');

        const player2Standing = standings.find(s => s.playerId === player2.id)!;
        expect(player2Standing.realName).toBe('Player2');
      });
    });

    describe('bonus categories', () => {
      it('should include bonus categories won by player', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData: SongSubmission = {
          soundcloudId: 123456,
          title: 'Test Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test/song',
          confidence: 3,
        };

        const hostSong = await songService.submitSong(party.id, host.id, {
          ...songData,
          soundcloudId: 111111,
        });

        await songService.submitSong(party.id, player2.id, { ...songData, soundcloudId: 222222 });
        await songService.submitSong(party.id, player3.id, { ...songData, soundcloudId: 333333 });

        // Create bonus results for host
        await prisma.bonusResult.create({
          data: {
            id: 'bonus-cat-1',
            partyId: party.id,
            categoryId: 'crowd-favorite',
            categoryName: 'Crowd Favorite',
            winningSongId: hostSong.id,
            winnerPlayerId: host.id,
            points: 10,
            revealOrder: 1,
          },
        });

        await prisma.bonusResult.create({
          data: {
            id: 'bonus-cat-2',
            partyId: party.id,
            categoryId: 'bold-move',
            categoryName: 'Bold Move',
            winningSongId: hostSong.id,
            winnerPlayerId: host.id,
            points: 10,
            revealOrder: 2,
          },
        });

        const standings = await scoringService.calculateFinalStandings(party.id);

        const hostStanding = standings.find(s => s.playerId === host.id)!;
        expect(hostStanding.bonusCategories).toHaveLength(2);
        expect(hostStanding.bonusCategories).toContain('Crowd Favorite');
        expect(hostStanding.bonusCategories).toContain('Bold Move');
      });

      it('should return empty bonusCategories array when player has no wins', async () => {
        const { party, host, player2, player3 } = await createTestPartyWithSongs();

        const standings = await scoringService.calculateFinalStandings(party.id);

        // All players should have empty bonusCategories (no bonus results created)
        for (const standing of standings) {
          expect(standing.bonusCategories).toEqual([]);
        }
      });
    });
  });
});
