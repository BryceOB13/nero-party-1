import { PrismaClient } from '@prisma/client';
import { SongService, songService } from '../song.service';
import { partyService } from '../party.service';
import { PartyStatus, SongSubmission } from '../../types';

// Create a test database client
const prisma = new PrismaClient();

// Helper function to create a valid song submission
const createValidSongSubmission = (overrides?: Partial<SongSubmission>): SongSubmission => ({
  soundcloudId: Math.floor(Math.random() * 1000000),
  title: 'Test Song',
  artist: 'Test Artist',
  artworkUrl: 'https://example.com/artwork.jpg',
  duration: 180000,
  permalinkUrl: 'https://soundcloud.com/test/song',
  confidence: 3,
  ...overrides,
});

describe('SongService', () => {
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

  describe('submitSong', () => {
    /**
     * Tests for Requirement 4.3:
     * WHEN a Player submits a song, THE Backend SHALL validate they have not exceeded the songs_per_player limit
     */
    describe('song limit validation (Requirement 4.3)', () => {
      it('should allow first song submission', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData = createValidSongSubmission();
        const song = await songService.submitSong(party.id, host.id, songData);

        expect(song).toBeDefined();
        expect(song.title).toBe(songData.title);
      });

      it('should allow submissions up to songs_per_player limit', async () => {
        const { party, host } = await partyService.createParty('TestHost', {
          songsPerPlayer: 2,
        });
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        // Submit first song
        const song1 = await songService.submitSong(party.id, host.id, createValidSongSubmission());
        expect(song1).toBeDefined();

        // Submit second song
        const song2 = await songService.submitSong(party.id, host.id, createValidSongSubmission());
        expect(song2).toBeDefined();
      });

      it('should reject submission when songs_per_player limit is reached', async () => {
        const { party, host } = await partyService.createParty('TestHost', {
          songsPerPlayer: 1,
        });
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        // Submit first song (should succeed)
        await songService.submitSong(party.id, host.id, createValidSongSubmission());

        // Submit second song (should fail)
        await expect(
          songService.submitSong(party.id, host.id, createValidSongSubmission())
        ).rejects.toThrow('Song limit reached');
      });

      it('should throw error with SONG_LIMIT_REACHED code when limit exceeded', async () => {
        const { party, host } = await partyService.createParty('TestHost', {
          songsPerPlayer: 1,
        });
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        await songService.submitSong(party.id, host.id, createValidSongSubmission());

        try {
          await songService.submitSong(party.id, host.id, createValidSongSubmission());
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('SONG_LIMIT_REACHED');
        }
      });

      it('should enforce limit of 3 songs when songsPerPlayer is 3', async () => {
        const { party, host } = await partyService.createParty('TestHost', {
          songsPerPlayer: 3,
        });
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        // Submit 3 songs (should all succeed)
        await songService.submitSong(party.id, host.id, createValidSongSubmission());
        await songService.submitSong(party.id, host.id, createValidSongSubmission());
        await songService.submitSong(party.id, host.id, createValidSongSubmission());

        // Fourth submission should fail
        await expect(
          songService.submitSong(party.id, host.id, createValidSongSubmission())
        ).rejects.toThrow('Song limit reached');
      });

      it('should track song count per player independently', async () => {
        const { party, host } = await partyService.createParty('TestHost', {
          songsPerPlayer: 1,
        });
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        // Host submits their song
        await songService.submitSong(party.id, host.id, createValidSongSubmission());

        // Player2 should still be able to submit
        const song = await songService.submitSong(party.id, player2.id, createValidSongSubmission());
        expect(song).toBeDefined();
      });
    });

    /**
     * Tests for Requirement 4.4:
     * WHEN a Player submits a song, THE Backend SHALL require them to set a Confidence level between 1 and 5
     */
    describe('confidence validation (Requirement 4.4)', () => {
      it('should accept confidence = 1', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const song = await songService.submitSong(
          party.id,
          host.id,
          createValidSongSubmission({ confidence: 1 })
        );

        expect(song.confidence).toBe(1);
      });

      it('should accept confidence = 2', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const song = await songService.submitSong(
          party.id,
          host.id,
          createValidSongSubmission({ confidence: 2 })
        );

        expect(song.confidence).toBe(2);
      });

      it('should accept confidence = 3', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const song = await songService.submitSong(
          party.id,
          host.id,
          createValidSongSubmission({ confidence: 3 })
        );

        expect(song.confidence).toBe(3);
      });

      it('should accept confidence = 4', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const song = await songService.submitSong(
          party.id,
          host.id,
          createValidSongSubmission({ confidence: 4 })
        );

        expect(song.confidence).toBe(4);
      });

      it('should accept confidence = 5', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const song = await songService.submitSong(
          party.id,
          host.id,
          createValidSongSubmission({ confidence: 5 })
        );

        expect(song.confidence).toBe(5);
      });

      it('should reject confidence = 0', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        await expect(
          songService.submitSong(
            party.id,
            host.id,
            createValidSongSubmission({ confidence: 0 as any })
          )
        ).rejects.toThrow('Confidence must be between 1 and 5');
      });

      it('should reject confidence = 6', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        await expect(
          songService.submitSong(
            party.id,
            host.id,
            createValidSongSubmission({ confidence: 6 as any })
          )
        ).rejects.toThrow('Confidence must be between 1 and 5');
      });

      it('should reject negative confidence', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        await expect(
          songService.submitSong(
            party.id,
            host.id,
            createValidSongSubmission({ confidence: -1 as any })
          )
        ).rejects.toThrow('Confidence must be between 1 and 5');
      });

      it('should throw error with INVALID_CONFIDENCE code for invalid confidence', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        try {
          await songService.submitSong(
            party.id,
            host.id,
            createValidSongSubmission({ confidence: 10 as any })
          );
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('INVALID_CONFIDENCE');
          expect(error.field).toBe('confidence');
        }
      });
    });

    /**
     * Tests for Requirement 4.5:
     * WHEN a song is submitted, THE Backend SHALL store the SoundCloud track_id, title, artist, submitter_id, confidence, and round_assignment
     */
    describe('song data persistence (Requirement 4.5)', () => {
      it('should store soundcloudId', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData = createValidSongSubmission({ soundcloudId: 123456 });
        const song = await songService.submitSong(party.id, host.id, songData);

        expect(Number(song.soundcloudId)).toBe(123456);

        // Verify in database
        const dbSong = await prisma.song.findUnique({ where: { id: song.id } });
        expect(Number(dbSong?.soundcloudId)).toBe(123456);
      });

      it('should store title', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData = createValidSongSubmission({ title: 'My Awesome Song' });
        const song = await songService.submitSong(party.id, host.id, songData);

        expect(song.title).toBe('My Awesome Song');

        // Verify in database
        const dbSong = await prisma.song.findUnique({ where: { id: song.id } });
        expect(dbSong?.title).toBe('My Awesome Song');
      });

      it('should store artist', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData = createValidSongSubmission({ artist: 'Famous Artist' });
        const song = await songService.submitSong(party.id, host.id, songData);

        expect(song.artist).toBe('Famous Artist');

        // Verify in database
        const dbSong = await prisma.song.findUnique({ where: { id: song.id } });
        expect(dbSong?.artist).toBe('Famous Artist');
      });

      it('should store submitterId', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const song = await songService.submitSong(party.id, host.id, createValidSongSubmission());

        expect(song.submitterId).toBe(host.id);

        // Verify in database
        const dbSong = await prisma.song.findUnique({ where: { id: song.id } });
        expect(dbSong?.submitterId).toBe(host.id);
      });

      it('should store confidence', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData = createValidSongSubmission({ confidence: 4 });
        const song = await songService.submitSong(party.id, host.id, songData);

        expect(song.confidence).toBe(4);

        // Verify in database
        const dbSong = await prisma.song.findUnique({ where: { id: song.id } });
        expect(dbSong?.confidence).toBe(4);
      });

      it('should store roundNumber (round_assignment)', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const song = await songService.submitSong(party.id, host.id, createValidSongSubmission());

        expect(song.roundNumber).toBeDefined();

        // Verify in database
        const dbSong = await prisma.song.findUnique({ where: { id: song.id } });
        expect(dbSong?.roundNumber).toBeDefined();
      });

      it('should store partyId', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const song = await songService.submitSong(party.id, host.id, createValidSongSubmission());

        expect(song.partyId).toBe(party.id);

        // Verify in database
        const dbSong = await prisma.song.findUnique({ where: { id: song.id } });
        expect(dbSong?.partyId).toBe(party.id);
      });

      it('should store artworkUrl', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData = createValidSongSubmission({ artworkUrl: 'https://example.com/art.jpg' });
        const song = await songService.submitSong(party.id, host.id, songData);

        expect(song.artworkUrl).toBe('https://example.com/art.jpg');
      });

      it('should store duration', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData = createValidSongSubmission({ duration: 240000 });
        const song = await songService.submitSong(party.id, host.id, songData);

        expect(song.duration).toBe(240000);
      });

      it('should store permalinkUrl', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const songData = createValidSongSubmission({ permalinkUrl: 'https://soundcloud.com/test' });
        const song = await songService.submitSong(party.id, host.id, songData);

        expect(song.permalinkUrl).toBe('https://soundcloud.com/test');
      });
    });

    /**
     * Tests for Requirement 4.6:
     * WHEN a Player submits song N, THE Backend SHALL assign it to Round N
     */
    describe('round assignment (Requirement 4.6)', () => {
      it('should assign first song to round 1', async () => {
        const { party, host } = await partyService.createParty('TestHost', {
          songsPerPlayer: 3,
        });
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const song = await songService.submitSong(party.id, host.id, createValidSongSubmission());

        expect(song.roundNumber).toBe(1);
      });

      it('should assign second song to round 2', async () => {
        const { party, host } = await partyService.createParty('TestHost', {
          songsPerPlayer: 3,
        });
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        await songService.submitSong(party.id, host.id, createValidSongSubmission());
        const song2 = await songService.submitSong(party.id, host.id, createValidSongSubmission());

        expect(song2.roundNumber).toBe(2);
      });

      it('should assign third song to round 3', async () => {
        const { party, host } = await partyService.createParty('TestHost', {
          songsPerPlayer: 3,
        });
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        await songService.submitSong(party.id, host.id, createValidSongSubmission());
        await songService.submitSong(party.id, host.id, createValidSongSubmission());
        const song3 = await songService.submitSong(party.id, host.id, createValidSongSubmission());

        expect(song3.roundNumber).toBe(3);
      });

      it('should assign rounds independently per player', async () => {
        const { party, host } = await partyService.createParty('TestHost', {
          songsPerPlayer: 2,
        });
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        // Host submits first song (round 1)
        const hostSong1 = await songService.submitSong(party.id, host.id, createValidSongSubmission());
        expect(hostSong1.roundNumber).toBe(1);

        // Player2 submits first song (should also be round 1)
        const player2Song1 = await songService.submitSong(party.id, player2.id, createValidSongSubmission());
        expect(player2Song1.roundNumber).toBe(1);

        // Host submits second song (round 2)
        const hostSong2 = await songService.submitSong(party.id, host.id, createValidSongSubmission());
        expect(hostSong2.roundNumber).toBe(2);

        // Player2 submits second song (should also be round 2)
        const player2Song2 = await songService.submitSong(party.id, player2.id, createValidSongSubmission());
        expect(player2Song2.roundNumber).toBe(2);
      });

      it('should persist round assignment to database', async () => {
        const { party, host } = await partyService.createParty('TestHost', {
          songsPerPlayer: 2,
        });
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        const song1 = await songService.submitSong(party.id, host.id, createValidSongSubmission());
        const song2 = await songService.submitSong(party.id, host.id, createValidSongSubmission());

        const dbSong1 = await prisma.song.findUnique({ where: { id: song1.id } });
        const dbSong2 = await prisma.song.findUnique({ where: { id: song2.id } });

        expect(dbSong1?.roundNumber).toBe(1);
        expect(dbSong2?.roundNumber).toBe(2);
      });
    });

    /**
     * Tests for state validation
     */
    describe('state validation', () => {
      it('should reject submission when party is in LOBBY state', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        // Party is in LOBBY state by default

        await expect(
          songService.submitSong(party.id, host.id, createValidSongSubmission())
        ).rejects.toThrow('Songs can only be submitted during SUBMITTING phase');
      });

      it('should reject submission when party is in PLAYING state', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.PLAYING },
        });

        await expect(
          songService.submitSong(party.id, host.id, createValidSongSubmission())
        ).rejects.toThrow('Songs can only be submitted during SUBMITTING phase');
      });

      it('should reject submission when party is in FINALE state', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.FINALE },
        });

        await expect(
          songService.submitSong(party.id, host.id, createValidSongSubmission())
        ).rejects.toThrow('Songs can only be submitted during SUBMITTING phase');
      });

      it('should reject submission when party is in COMPLETE state', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.COMPLETE },
        });

        await expect(
          songService.submitSong(party.id, host.id, createValidSongSubmission())
        ).rejects.toThrow('Songs can only be submitted during SUBMITTING phase');
      });

      it('should throw error with INVALID_STATE code for wrong state', async () => {
        const { party, host } = await partyService.createParty('TestHost');

        try {
          await songService.submitSong(party.id, host.id, createValidSongSubmission());
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('INVALID_STATE');
        }
      });
    });

    /**
     * Tests for party and player validation
     */
    describe('party and player validation', () => {
      it('should reject submission for non-existent party', async () => {
        const { host } = await partyService.createParty('TestHost');

        await expect(
          songService.submitSong('non-existent-party-id', host.id, createValidSongSubmission())
        ).rejects.toThrow('Party does not exist');
      });

      it('should throw error with PARTY_NOT_FOUND code for non-existent party', async () => {
        const { host } = await partyService.createParty('TestHost');

        try {
          await songService.submitSong('non-existent-party-id', host.id, createValidSongSubmission());
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('PARTY_NOT_FOUND');
        }
      });

      it('should reject submission for non-existent player', async () => {
        const { party } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        await expect(
          songService.submitSong(party.id, 'non-existent-player-id', createValidSongSubmission())
        ).rejects.toThrow('Player does not exist');
      });

      it('should throw error with PLAYER_NOT_FOUND code for non-existent player', async () => {
        const { party } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        try {
          await songService.submitSong(party.id, 'non-existent-player-id', createValidSongSubmission());
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('PLAYER_NOT_FOUND');
        }
      });

      it('should reject submission from player not in the party', async () => {
        const { party } = await partyService.createParty('TestHost');
        const { host: otherHost } = await partyService.createParty('OtherHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        await expect(
          songService.submitSong(party.id, otherHost.id, createValidSongSubmission())
        ).rejects.toThrow('Player does not belong to this party');
      });

      it('should throw error with PLAYER_NOT_IN_PARTY code for player in different party', async () => {
        const { party } = await partyService.createParty('TestHost');
        const { host: otherHost } = await partyService.createParty('OtherHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        try {
          await songService.submitSong(party.id, otherHost.id, createValidSongSubmission());
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('PLAYER_NOT_IN_PARTY');
        }
      });
    });
  });

  describe('getSongs', () => {
    it('should return all songs for a party', async () => {
      const { party, host } = await partyService.createParty('TestHost', {
        songsPerPlayer: 2,
      });
      const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
      await prisma.party.update({
        where: { id: party.id },
        data: { status: PartyStatus.SUBMITTING },
      });

      await songService.submitSong(party.id, host.id, createValidSongSubmission());
      await songService.submitSong(party.id, player2.id, createValidSongSubmission());

      const songs = await songService.getSongs(party.id);

      expect(songs).toHaveLength(2);
    });

    it('should return empty array for party with no songs', async () => {
      const { party } = await partyService.createParty('TestHost');

      const songs = await songService.getSongs(party.id);

      expect(songs).toHaveLength(0);
    });

    it('should order songs by round number', async () => {
      const { party, host } = await partyService.createParty('TestHost', {
        songsPerPlayer: 3,
      });
      await prisma.party.update({
        where: { id: party.id },
        data: { status: PartyStatus.SUBMITTING },
      });

      await songService.submitSong(party.id, host.id, createValidSongSubmission());
      await songService.submitSong(party.id, host.id, createValidSongSubmission());
      await songService.submitSong(party.id, host.id, createValidSongSubmission());

      const songs = await songService.getSongs(party.id);

      expect(songs[0].roundNumber).toBe(1);
      expect(songs[1].roundNumber).toBe(2);
      expect(songs[2].roundNumber).toBe(3);
    });
  });

  describe('getPlayerSongs', () => {
    it('should return only songs from specified player', async () => {
      const { party, host } = await partyService.createParty('TestHost', {
        songsPerPlayer: 2,
      });
      const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
      await prisma.party.update({
        where: { id: party.id },
        data: { status: PartyStatus.SUBMITTING },
      });

      await songService.submitSong(party.id, host.id, createValidSongSubmission({ title: 'Host Song 1' }));
      await songService.submitSong(party.id, host.id, createValidSongSubmission({ title: 'Host Song 2' }));
      await songService.submitSong(party.id, player2.id, createValidSongSubmission({ title: 'Player2 Song' }));

      const hostSongs = await songService.getPlayerSongs(party.id, host.id);

      expect(hostSongs).toHaveLength(2);
      expect(hostSongs.every(s => s.submitterId === host.id)).toBe(true);
    });
  });

  describe('getPlayerSongCount', () => {
    it('should return correct count of player songs', async () => {
      const { party, host } = await partyService.createParty('TestHost', {
        songsPerPlayer: 3,
      });
      await prisma.party.update({
        where: { id: party.id },
        data: { status: PartyStatus.SUBMITTING },
      });

      expect(await songService.getPlayerSongCount(party.id, host.id)).toBe(0);

      await songService.submitSong(party.id, host.id, createValidSongSubmission());
      expect(await songService.getPlayerSongCount(party.id, host.id)).toBe(1);

      await songService.submitSong(party.id, host.id, createValidSongSubmission());
      expect(await songService.getPlayerSongCount(party.id, host.id)).toBe(2);
    });
  });

  describe('removeSong', () => {
    it('should remove song from database', async () => {
      const { party, host } = await partyService.createParty('TestHost');
      await prisma.party.update({
        where: { id: party.id },
        data: { status: PartyStatus.SUBMITTING },
      });

      const song = await songService.submitSong(party.id, host.id, createValidSongSubmission());
      await songService.removeSong(song.id, host.id);

      const dbSong = await prisma.song.findUnique({ where: { id: song.id } });
      expect(dbSong).toBeNull();
    });

    it('should reject removal by non-submitter', async () => {
      const { party, host } = await partyService.createParty('TestHost');
      const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
      await prisma.party.update({
        where: { id: party.id },
        data: { status: PartyStatus.SUBMITTING },
      });

      const song = await songService.submitSong(party.id, host.id, createValidSongSubmission());

      await expect(
        songService.removeSong(song.id, player2.id)
      ).rejects.toThrow('Only the submitter can remove this song');
    });

    it('should reject removal of non-existent song', async () => {
      const { host } = await partyService.createParty('TestHost');

      await expect(
        songService.removeSong('non-existent-song-id', host.id)
      ).rejects.toThrow('Song does not exist');
    });
  });

  /**
   * Tests for getWeightMultiplier
   * 
   * **Validates: Requirements 6.2, 6.3, 6.4**
   * - Property 25: For songs_per_player = 1, all songs have 1.5x multiplier
   * - Property 26: For songs_per_player = 2, round 1 = 1.0x, round 2 = 2.0x
   * - Property 27: For songs_per_player = 3, round 1 = 1.0x, round 2 = 1.5x, round 3 = 2.0x
   */
  describe('getWeightMultiplier', () => {
    describe('Property 25: songs_per_player = 1', () => {
      it('should return 1.5x multiplier for round 1 when totalRounds is 1', () => {
        const multiplier = songService.getWeightMultiplier(1, 1);
        expect(multiplier).toBe(1.5);
      });
    });

    describe('Property 26: songs_per_player = 2', () => {
      it('should return 1.0x multiplier for round 1 when totalRounds is 2', () => {
        const multiplier = songService.getWeightMultiplier(1, 2);
        expect(multiplier).toBe(1.0);
      });

      it('should return 2.0x multiplier for round 2 when totalRounds is 2', () => {
        const multiplier = songService.getWeightMultiplier(2, 2);
        expect(multiplier).toBe(2.0);
      });
    });

    describe('Property 27: songs_per_player = 3', () => {
      it('should return 1.0x multiplier for round 1 when totalRounds is 3', () => {
        const multiplier = songService.getWeightMultiplier(1, 3);
        expect(multiplier).toBe(1.0);
      });

      it('should return 1.5x multiplier for round 2 when totalRounds is 3', () => {
        const multiplier = songService.getWeightMultiplier(2, 3);
        expect(multiplier).toBe(1.5);
      });

      it('should return 2.0x multiplier for round 3 when totalRounds is 3', () => {
        const multiplier = songService.getWeightMultiplier(3, 3);
        expect(multiplier).toBe(2.0);
      });
    });

    describe('edge cases', () => {
      it('should return 1.0x for unexpected totalRounds value', () => {
        const multiplier = songService.getWeightMultiplier(1, 5);
        expect(multiplier).toBe(1.0);
      });
    });
  });

  /**
   * Tests for organizeIntoRounds
   * 
   * **Validates: Requirements 5.1, 5.2**
   * - 5.1: WHEN the Party transitions to PLAYING, THE Backend SHALL organize songs into Rounds 
   *        where each Round contains one song from each Player
   * - 5.2: WHEN a Round is created, THE Backend SHALL shuffle the song order within that Round
   */
  describe('organizeIntoRounds', () => {
    describe('Requirement 5.1: Round structure', () => {
      it('should group songs by round number', async () => {
        const { party, host } = await partyService.createParty('TestHost', {
          songsPerPlayer: 2,
        });
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        // Submit songs for both players
        await songService.submitSong(party.id, host.id, createValidSongSubmission({ title: 'Host Song 1' }));
        await songService.submitSong(party.id, host.id, createValidSongSubmission({ title: 'Host Song 2' }));
        await songService.submitSong(party.id, player2.id, createValidSongSubmission({ title: 'Player2 Song 1' }));
        await songService.submitSong(party.id, player2.id, createValidSongSubmission({ title: 'Player2 Song 2' }));

        const rounds = await songService.organizeIntoRounds(party.id);

        expect(rounds).toHaveLength(2);
        expect(rounds[0].roundNumber).toBe(1);
        expect(rounds[1].roundNumber).toBe(2);
      });

      it('should have one song per player in each round', async () => {
        const { party, host } = await partyService.createParty('TestHost', {
          songsPerPlayer: 2,
        });
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        const { player: player3 } = await partyService.joinParty(party.code, 'Player3');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        // Submit songs for all players
        await songService.submitSong(party.id, host.id, createValidSongSubmission());
        await songService.submitSong(party.id, host.id, createValidSongSubmission());
        await songService.submitSong(party.id, player2.id, createValidSongSubmission());
        await songService.submitSong(party.id, player2.id, createValidSongSubmission());
        await songService.submitSong(party.id, player3.id, createValidSongSubmission());
        await songService.submitSong(party.id, player3.id, createValidSongSubmission());

        const rounds = await songService.organizeIntoRounds(party.id);

        // Each round should have 3 songs (one per player)
        expect(rounds[0].songs).toHaveLength(3);
        expect(rounds[1].songs).toHaveLength(3);

        // Verify each round has one song from each player
        const round1Submitters = rounds[0].songs.map(s => s.submitterId);
        expect(new Set(round1Submitters).size).toBe(3);

        const round2Submitters = rounds[1].songs.map(s => s.submitterId);
        expect(new Set(round2Submitters).size).toBe(3);
      });

      it('should create correct number of rounds based on songsPerPlayer', async () => {
        const { party, host } = await partyService.createParty('TestHost', {
          songsPerPlayer: 3,
        });
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        await songService.submitSong(party.id, host.id, createValidSongSubmission());
        await songService.submitSong(party.id, host.id, createValidSongSubmission());
        await songService.submitSong(party.id, host.id, createValidSongSubmission());

        const rounds = await songService.organizeIntoRounds(party.id);

        expect(rounds).toHaveLength(3);
        expect(rounds[0].roundNumber).toBe(1);
        expect(rounds[1].roundNumber).toBe(2);
        expect(rounds[2].roundNumber).toBe(3);
      });
    });

    describe('Requirement 5.2: Round shuffling', () => {
      it('should assign queue positions to songs', async () => {
        const { party, host } = await partyService.createParty('TestHost', {
          songsPerPlayer: 2,
        });
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        await songService.submitSong(party.id, host.id, createValidSongSubmission());
        await songService.submitSong(party.id, host.id, createValidSongSubmission());
        await songService.submitSong(party.id, player2.id, createValidSongSubmission());
        await songService.submitSong(party.id, player2.id, createValidSongSubmission());

        const rounds = await songService.organizeIntoRounds(party.id);

        // All songs should have unique queue positions
        const allPositions = rounds.flatMap(r => r.songs.map(s => s.queuePosition));
        expect(new Set(allPositions).size).toBe(4);

        // Queue positions should be sequential starting from 1
        const sortedPositions = [...allPositions].sort((a, b) => a - b);
        expect(sortedPositions).toEqual([1, 2, 3, 4]);
      });

      it('should persist queue positions to database', async () => {
        const { party, host } = await partyService.createParty('TestHost', {
          songsPerPlayer: 1,
        });
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        await songService.submitSong(party.id, host.id, createValidSongSubmission());
        await songService.submitSong(party.id, player2.id, createValidSongSubmission());

        await songService.organizeIntoRounds(party.id);

        // Verify queue positions are persisted
        const dbSongs = await prisma.song.findMany({
          where: { partyId: party.id },
          orderBy: { queuePosition: 'asc' },
        });

        expect(dbSongs[0].queuePosition).toBe(1);
        expect(dbSongs[1].queuePosition).toBe(2);
      });
    });

    describe('weight multiplier assignment', () => {
      it('should assign 1.5x multiplier for single round game', async () => {
        const { party, host } = await partyService.createParty('TestHost', {
          songsPerPlayer: 1,
        });
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        await songService.submitSong(party.id, host.id, createValidSongSubmission());

        const rounds = await songService.organizeIntoRounds(party.id);

        expect(rounds[0].weightMultiplier).toBe(1.5);
      });

      it('should assign correct multipliers for 2-round game', async () => {
        const { party, host } = await partyService.createParty('TestHost', {
          songsPerPlayer: 2,
        });
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        await songService.submitSong(party.id, host.id, createValidSongSubmission());
        await songService.submitSong(party.id, host.id, createValidSongSubmission());

        const rounds = await songService.organizeIntoRounds(party.id);

        expect(rounds[0].weightMultiplier).toBe(1.0);
        expect(rounds[1].weightMultiplier).toBe(2.0);
      });

      it('should assign correct multipliers for 3-round game', async () => {
        const { party, host } = await partyService.createParty('TestHost', {
          songsPerPlayer: 3,
        });
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        await songService.submitSong(party.id, host.id, createValidSongSubmission());
        await songService.submitSong(party.id, host.id, createValidSongSubmission());
        await songService.submitSong(party.id, host.id, createValidSongSubmission());

        const rounds = await songService.organizeIntoRounds(party.id);

        expect(rounds[0].weightMultiplier).toBe(1.0);
        expect(rounds[1].weightMultiplier).toBe(1.5);
        expect(rounds[2].weightMultiplier).toBe(2.0);
      });
    });

    describe('round completion status', () => {
      it('should initialize all rounds as not complete', async () => {
        const { party, host } = await partyService.createParty('TestHost', {
          songsPerPlayer: 2,
        });
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        await songService.submitSong(party.id, host.id, createValidSongSubmission());
        await songService.submitSong(party.id, host.id, createValidSongSubmission());

        const rounds = await songService.organizeIntoRounds(party.id);

        expect(rounds[0].isComplete).toBe(false);
        expect(rounds[1].isComplete).toBe(false);
      });
    });

    describe('error handling', () => {
      it('should throw PARTY_NOT_FOUND for non-existent party', async () => {
        try {
          await songService.organizeIntoRounds('non-existent-party-id');
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('PARTY_NOT_FOUND');
        }
      });

      it('should return empty array for party with no songs', async () => {
        const { party } = await partyService.createParty('TestHost');

        const rounds = await songService.organizeIntoRounds(party.id);

        expect(rounds).toHaveLength(0);
      });
    });
  });

  /**
   * Tests for shuffleRound
   */
  describe('shuffleRound', () => {
    it('should shuffle songs within a specific round', async () => {
      const { party, host } = await partyService.createParty('TestHost', {
        songsPerPlayer: 1,
      });
      const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
      const { player: player3 } = await partyService.joinParty(party.code, 'Player3');
      await prisma.party.update({
        where: { id: party.id },
        data: { status: PartyStatus.SUBMITTING },
      });

      await songService.submitSong(party.id, host.id, createValidSongSubmission());
      await songService.submitSong(party.id, player2.id, createValidSongSubmission());
      await songService.submitSong(party.id, player3.id, createValidSongSubmission());

      const shuffledSongs = await songService.shuffleRound(party.id, 1);

      expect(shuffledSongs).toHaveLength(3);
      // All songs should have queue positions
      expect(shuffledSongs.every(s => s.queuePosition > 0)).toBe(true);
    });

    it('should throw PARTY_NOT_FOUND for non-existent party', async () => {
      try {
        await songService.shuffleRound('non-existent-party-id', 1);
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.code).toBe('PARTY_NOT_FOUND');
      }
    });

    it('should return empty array for round with no songs', async () => {
      const { party } = await partyService.createParty('TestHost');

      const shuffledSongs = await songService.shuffleRound(party.id, 1);

      expect(shuffledSongs).toHaveLength(0);
    });
  });

  /**
   * Tests for getNextSong
   */
  describe('getNextSong', () => {
    it('should return the song with lowest queue position that has not been scored', async () => {
      const { party, host } = await partyService.createParty('TestHost', {
        songsPerPlayer: 2,
      });
      await prisma.party.update({
        where: { id: party.id },
        data: { status: PartyStatus.SUBMITTING },
      });

      await songService.submitSong(party.id, host.id, createValidSongSubmission({ title: 'Song 1' }));
      await songService.submitSong(party.id, host.id, createValidSongSubmission({ title: 'Song 2' }));

      // Organize into rounds to set queue positions
      await songService.organizeIntoRounds(party.id);

      const nextSong = await songService.getNextSong(party.id);

      expect(nextSong).not.toBeNull();
      expect(nextSong?.queuePosition).toBe(1);
    });

    it('should return null when all songs have been scored', async () => {
      const { party, host } = await partyService.createParty('TestHost', {
        songsPerPlayer: 1,
      });
      await prisma.party.update({
        where: { id: party.id },
        data: { status: PartyStatus.SUBMITTING },
      });

      const song = await songService.submitSong(party.id, host.id, createValidSongSubmission());
      await songService.organizeIntoRounds(party.id);

      // Mark the song as scored
      await prisma.song.update({
        where: { id: song.id },
        data: { finalScore: 7.5 },
      });

      const nextSong = await songService.getNextSong(party.id);

      expect(nextSong).toBeNull();
    });

    it('should return null for party with no songs', async () => {
      const { party } = await partyService.createParty('TestHost');

      const nextSong = await songService.getNextSong(party.id);

      expect(nextSong).toBeNull();
    });

    it('should skip scored songs and return next unscored song', async () => {
      const { party, host } = await partyService.createParty('TestHost', {
        songsPerPlayer: 2,
      });
      await prisma.party.update({
        where: { id: party.id },
        data: { status: PartyStatus.SUBMITTING },
      });

      const song1 = await songService.submitSong(party.id, host.id, createValidSongSubmission({ title: 'Song 1' }));
      await songService.submitSong(party.id, host.id, createValidSongSubmission({ title: 'Song 2' }));

      await songService.organizeIntoRounds(party.id);

      // Mark first song as scored
      await prisma.song.update({
        where: { id: song1.id },
        data: { finalScore: 8.0 },
      });

      const nextSong = await songService.getNextSong(party.id);

      expect(nextSong).not.toBeNull();
      expect(nextSong?.title).toBe('Song 2');
    });
  });
});
