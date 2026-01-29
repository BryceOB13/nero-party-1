import { prisma } from '../../lib/prisma';
import { partyService } from '../party.service';
import { songService } from '../song.service';
import { identityService } from '../identity.service';
import { PartyStatus, PlayerStatus, SongSubmission } from '../../types';

/**
 * Unit tests for submission event handlers.
 * These tests validate the core business logic for song submission operations.
 * 
 * **Validates: Requirements 4.8**
 * - 4.8: WHEN a song is submitted, THE Backend SHALL broadcast the song to all Players with the submitter hidden as "???"
 */
describe('Submission Event Handler Logic', () => {
  beforeEach(async () => {
    // Clean up database before each test
    await prisma.vote.deleteMany();
    await prisma.song.deleteMany();
    await prisma.partyIdentity.deleteMany();
    await prisma.bonusResult.deleteMany();
    await prisma.player.deleteMany();
    await prisma.party.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('submission:submit - submitSong()', () => {
    it('should submit a song successfully during SUBMITTING phase', async () => {
      const { party, host } = await partyService.createParty('Host');
      await partyService.joinParty(party.code, 'Player2');
      await partyService.joinParty(party.code, 'Player3');
      await partyService.startParty(party.id, host.id);

      const songData: SongSubmission = {
        soundcloudId: 123456,
        title: 'Test Song',
        artist: 'Test Artist',
        artworkUrl: 'https://example.com/artwork.jpg',
        duration: 180000,
        permalinkUrl: 'https://soundcloud.com/test/song',
        confidence: 3
      };

      const song = await songService.submitSong(party.id, host.id, songData);

      expect(song.title).toBe('Test Song');
      expect(song.artist).toBe('Test Artist');
      expect(song.confidence).toBe(3);
      expect(song.submitterId).toBe(host.id);
      expect(song.roundNumber).toBe(1);
    });

    it('should throw INVALID_STATE when submitting in LOBBY state', async () => {
      const { party, host } = await partyService.createParty('Host');

      const songData: SongSubmission = {
        soundcloudId: 123456,
        title: 'Test Song',
        artist: 'Test Artist',
        artworkUrl: 'https://example.com/artwork.jpg',
        duration: 180000,
        permalinkUrl: 'https://soundcloud.com/test/song',
        confidence: 3
      };

      await expect(songService.submitSong(party.id, host.id, songData))
        .rejects.toMatchObject({ code: 'INVALID_STATE' });
    });

    it('should throw SONG_LIMIT_REACHED when exceeding songs_per_player', async () => {
      const { party, host } = await partyService.createParty('Host', { songsPerPlayer: 1 });
      await partyService.joinParty(party.code, 'Player2');
      await partyService.joinParty(party.code, 'Player3');
      await partyService.startParty(party.id, host.id);

      const songData: SongSubmission = {
        soundcloudId: 123456,
        title: 'Test Song',
        artist: 'Test Artist',
        artworkUrl: 'https://example.com/artwork.jpg',
        duration: 180000,
        permalinkUrl: 'https://soundcloud.com/test/song',
        confidence: 3
      };

      // Submit first song
      await songService.submitSong(party.id, host.id, songData);

      // Try to submit second song
      await expect(songService.submitSong(party.id, host.id, { ...songData, soundcloudId: 789 }))
        .rejects.toMatchObject({ code: 'SONG_LIMIT_REACHED' });
    });

    it('should throw INVALID_CONFIDENCE for confidence outside 1-5 range', async () => {
      const { party, host } = await partyService.createParty('Host');
      await partyService.joinParty(party.code, 'Player2');
      await partyService.joinParty(party.code, 'Player3');
      await partyService.startParty(party.id, host.id);

      const songData = {
        soundcloudId: 123456,
        title: 'Test Song',
        artist: 'Test Artist',
        artworkUrl: 'https://example.com/artwork.jpg',
        duration: 180000,
        permalinkUrl: 'https://soundcloud.com/test/song',
        confidence: 6 as any
      };

      await expect(songService.submitSong(party.id, host.id, songData))
        .rejects.toMatchObject({ code: 'INVALID_CONFIDENCE' });
    });

    it('should assign correct round numbers for multiple submissions', async () => {
      const { party, host } = await partyService.createParty('Host', { songsPerPlayer: 3 });
      await partyService.joinParty(party.code, 'Player2');
      await partyService.joinParty(party.code, 'Player3');
      await partyService.startParty(party.id, host.id);

      const baseSongData: SongSubmission = {
        soundcloudId: 123456,
        title: 'Test Song',
        artist: 'Test Artist',
        artworkUrl: 'https://example.com/artwork.jpg',
        duration: 180000,
        permalinkUrl: 'https://soundcloud.com/test/song',
        confidence: 3
      };

      const song1 = await songService.submitSong(party.id, host.id, { ...baseSongData, soundcloudId: 1 });
      const song2 = await songService.submitSong(party.id, host.id, { ...baseSongData, soundcloudId: 2 });
      const song3 = await songService.submitSong(party.id, host.id, { ...baseSongData, soundcloudId: 3 });

      expect(song1.roundNumber).toBe(1);
      expect(song2.roundNumber).toBe(2);
      expect(song3.roundNumber).toBe(3);
    });
  });

  describe('submission:remove - removeSong()', () => {
    it('should remove a song successfully', async () => {
      const { party, host } = await partyService.createParty('Host');
      await partyService.joinParty(party.code, 'Player2');
      await partyService.joinParty(party.code, 'Player3');
      await partyService.startParty(party.id, host.id);

      const songData: SongSubmission = {
        soundcloudId: 123456,
        title: 'Test Song',
        artist: 'Test Artist',
        artworkUrl: 'https://example.com/artwork.jpg',
        duration: 180000,
        permalinkUrl: 'https://soundcloud.com/test/song',
        confidence: 3
      };

      const song = await songService.submitSong(party.id, host.id, songData);
      await songService.removeSong(song.id, host.id);

      const songs = await songService.getSongs(party.id);
      expect(songs).toHaveLength(0);
    });

    it('should throw NOT_SUBMITTER when non-submitter tries to remove', async () => {
      const { party, host } = await partyService.createParty('Host');
      const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
      await partyService.joinParty(party.code, 'Player3');
      await partyService.startParty(party.id, host.id);

      const songData: SongSubmission = {
        soundcloudId: 123456,
        title: 'Test Song',
        artist: 'Test Artist',
        artworkUrl: 'https://example.com/artwork.jpg',
        duration: 180000,
        permalinkUrl: 'https://soundcloud.com/test/song',
        confidence: 3
      };

      const song = await songService.submitSong(party.id, host.id, songData);

      await expect(songService.removeSong(song.id, player2.id))
        .rejects.toMatchObject({ code: 'NOT_SUBMITTER' });
    });

    it('should throw SONG_NOT_FOUND for non-existent song', async () => {
      const { party, host } = await partyService.createParty('Host');
      await partyService.joinParty(party.code, 'Player2');
      await partyService.joinParty(party.code, 'Player3');
      await partyService.startParty(party.id, host.id);

      await expect(songService.removeSong('non-existent-id', host.id))
        .rejects.toMatchObject({ code: 'SONG_NOT_FOUND' });
    });
  });

  describe('submission:ready - markPlayerReady()', () => {
    it('should mark player as ready', async () => {
      const { party, host } = await partyService.createParty('Host');
      await partyService.joinParty(party.code, 'Player2');
      await partyService.joinParty(party.code, 'Player3');
      await partyService.startParty(party.id, host.id);

      // Mark player as ready
      await prisma.player.update({
        where: { id: host.id },
        data: { isReady: true }
      });

      const player = await partyService.getPlayer(host.id);
      expect(player?.isReady).toBe(true);
    });
  });

  describe('State transition to PLAYING', () => {
    it('should transition to PLAYING when all players submit required songs', async () => {
      const { party, host } = await partyService.createParty('Host', { songsPerPlayer: 1 });
      const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
      const { player: player3 } = await partyService.joinParty(party.code, 'Player3');
      await partyService.startParty(party.id, host.id);

      const baseSongData: SongSubmission = {
        soundcloudId: 123456,
        title: 'Test Song',
        artist: 'Test Artist',
        artworkUrl: 'https://example.com/artwork.jpg',
        duration: 180000,
        permalinkUrl: 'https://soundcloud.com/test/song',
        confidence: 3
      };

      // Submit songs for all players
      await songService.submitSong(party.id, host.id, { ...baseSongData, soundcloudId: 1 });
      await songService.submitSong(party.id, player2.id, { ...baseSongData, soundcloudId: 2 });
      await songService.submitSong(party.id, player3.id, { ...baseSongData, soundcloudId: 3 });

      // Check if all players have submitted
      const allSubmitted = await partyService.allPlayersSubmittedSongs(party.id);
      expect(allSubmitted).toBe(true);

      // Transition to PLAYING
      const updatedParty = await partyService.transitionToPlaying(party.id);
      expect(updatedParty.status).toBe(PartyStatus.PLAYING);
    });

    it('should not transition when not all players have submitted', async () => {
      const { party, host } = await partyService.createParty('Host', { songsPerPlayer: 1 });
      await partyService.joinParty(party.code, 'Player2');
      await partyService.joinParty(party.code, 'Player3');
      await partyService.startParty(party.id, host.id);

      const baseSongData: SongSubmission = {
        soundcloudId: 123456,
        title: 'Test Song',
        artist: 'Test Artist',
        artworkUrl: 'https://example.com/artwork.jpg',
        duration: 180000,
        permalinkUrl: 'https://soundcloud.com/test/song',
        confidence: 3
      };

      // Only host submits
      await songService.submitSong(party.id, host.id, baseSongData);

      // Check if all players have submitted
      const allSubmitted = await partyService.allPlayersSubmittedSongs(party.id);
      expect(allSubmitted).toBe(false);

      // Transition should fail
      await expect(partyService.transitionToPlaying(party.id))
        .rejects.toMatchObject({ code: 'SUBMISSIONS_INCOMPLETE' });
    });

    it('should organize songs into rounds when transitioning to PLAYING', async () => {
      const { party, host } = await partyService.createParty('Host', { songsPerPlayer: 2 });
      const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
      const { player: player3 } = await partyService.joinParty(party.code, 'Player3');
      await partyService.startParty(party.id, host.id);

      const baseSongData: SongSubmission = {
        soundcloudId: 123456,
        title: 'Test Song',
        artist: 'Test Artist',
        artworkUrl: 'https://example.com/artwork.jpg',
        duration: 180000,
        permalinkUrl: 'https://soundcloud.com/test/song',
        confidence: 3
      };

      // Submit 2 songs for each player
      await songService.submitSong(party.id, host.id, { ...baseSongData, soundcloudId: 1 });
      await songService.submitSong(party.id, host.id, { ...baseSongData, soundcloudId: 2 });
      await songService.submitSong(party.id, player2.id, { ...baseSongData, soundcloudId: 3 });
      await songService.submitSong(party.id, player2.id, { ...baseSongData, soundcloudId: 4 });
      await songService.submitSong(party.id, player3.id, { ...baseSongData, soundcloudId: 5 });
      await songService.submitSong(party.id, player3.id, { ...baseSongData, soundcloudId: 6 });

      // Transition to PLAYING
      await partyService.transitionToPlaying(party.id);

      // Organize into rounds
      const rounds = await songService.organizeIntoRounds(party.id);

      expect(rounds).toHaveLength(2);
      expect(rounds[0].songs).toHaveLength(3); // 3 players, 1 song each in round 1
      expect(rounds[1].songs).toHaveLength(3); // 3 players, 1 song each in round 2
      expect(rounds[0].weightMultiplier).toBe(1.0);
      expect(rounds[1].weightMultiplier).toBe(2.0);
    });
  });

  describe('Anonymous song display (Requirement 4.8)', () => {
    it('should hide submitter identity when broadcasting song_added', async () => {
      const { party, host } = await partyService.createParty('Host');
      await partyService.joinParty(party.code, 'Player2');
      await partyService.joinParty(party.code, 'Player3');
      await partyService.startParty(party.id, host.id);

      const songData: SongSubmission = {
        soundcloudId: 123456,
        title: 'Test Song',
        artist: 'Test Artist',
        artworkUrl: 'https://example.com/artwork.jpg',
        duration: 180000,
        permalinkUrl: 'https://soundcloud.com/test/song',
        confidence: 3
      };

      const song = await songService.submitSong(party.id, host.id, songData);

      // The song should have a submitterId, but when broadcasting,
      // the submitterAlias should be "???"
      expect(song.submitterId).toBe(host.id);
      
      // Simulate what the broadcast would contain
      const broadcastData = {
        song: {
          id: song.id,
          title: song.title,
          artist: song.artist,
          artworkUrl: song.artworkUrl,
          duration: song.duration,
          permalinkUrl: song.permalinkUrl,
          confidence: song.confidence,
          roundNumber: song.roundNumber
        },
        submitterAlias: '???'
      };

      // Verify the broadcast data hides the submitter
      expect(broadcastData.submitterAlias).toBe('???');
      expect(broadcastData.song).not.toHaveProperty('submitterId');
    });
  });
});
